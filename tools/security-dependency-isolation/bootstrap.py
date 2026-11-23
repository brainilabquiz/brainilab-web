"""Reviewed in-container setup. Never imported from application source.

The host first verifies Docker configuration, then calls `probe`, then
`prepare <actual Git SHA>`. No application module is imported by this file.
"""

import errno
import hashlib
import json
import os
from pathlib import Path
import re
import resource
import shutil
import socket
import stat
import subprocess
import sys


SCRATCH = Path('/scratch')
SOURCE = Path('/source')
HARNESS = Path('/harness')
APP = SCRATCH / 'app'
MAX_FILE = 64 * 1024 * 1024
MAX_SOURCE = 384 * 1024 * 1024
MAX_FILES = 25000
MEBIBYTE = 1024 * 1024


def require(condition, description):
    if not condition:
        raise RuntimeError(description)


def emit(kind, details):
    # The host parses this fixed-schema trusted output only before target runs.
    print(json.dumps({'kind': kind, **details}, sort_keys=True), flush=True)


def mounts():
    parsed = {}
    for line in Path('/proc/self/mountinfo').read_text().splitlines():
        left, right = line.split(' - ', 1)
        fields = left.split()
        parsed[fields[4]] = {
            'options': set(fields[5].split(',')),
            'type': right.split()[0],
        }
    return parsed


def readonly_probe(directory):
    # Exclusive creation cannot replace an existing file. A successful creation
    # is an isolation failure, even if permissions rather than a readonly mount
    # were expected to stop it. Remove only our exact sentinel before failing.
    sentinel = Path(directory) / '.brainilab-isolation-write-probe'
    try:
        descriptor = os.open(sentinel, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except OSError as error:
        require(error.errno in (errno.EROFS, errno.EACCES, errno.EPERM, errno.ENOENT),
                'Unexpected readonly probe result')
        return
    os.close(descriptor)
    sentinel.unlink()
    raise RuntimeError('Writable directory outside scratch: ' + str(directory))


def readonly_file_probe(filename):
    try:
        descriptor = os.open(filename, os.O_WRONLY)
    except OSError as error:
        require(error.errno in (errno.EROFS, errno.EACCES, errno.EPERM, errno.ENOENT),
                'Unexpected readonly file probe result')
        return
    os.close(descriptor)
    raise RuntimeError('Writable protected file: ' + filename)


def probe():
    require(os.getuid() == 65534 and os.getgid() == 65534, 'Wrong container identity')
    status = {}
    for line in Path('/proc/self/status').read_text().splitlines():
        if ':' in line:
            key, value = line.split(':', 1)
            status[key] = value.strip()
    for field in ('CapInh', 'CapPrm', 'CapEff', 'CapBnd', 'CapAmb'):
        require(int(status[field], 16) == 0, 'Capabilities are not fully dropped')
    require(status['NoNewPrivs'] == '1', 'NoNewPrivs is not enforced')
    require(status['Seccomp'] == '2', 'Seccomp filtering is not active')

    expected_environment = {
        'PATH': '/usr/local/bin:/usr/bin:/bin',
        'HOME': '/scratch/home',
        'TMPDIR': '/scratch/tmp',
        'XDG_CACHE_HOME': '/scratch/cache',
        'PYTHONPYCACHEPREFIX': '/scratch/cache/pycache',
        'CI': '1',
        'TZ': 'UTC',
        'LANG': 'C.UTF-8',
        'LC_ALL': 'C.UTF-8',
        'GIT_CONFIG_NOSYSTEM': '1',
        'GIT_CONFIG_GLOBAL': '/dev/null',
        'GIT_CONFIG_SYSTEM': '/dev/null',
        'GIT_TERMINAL_PROMPT': '0',
        'GIT_CONFIG_COUNT': '2',
        'GIT_CONFIG_KEY_0': 'core.hooksPath',
        'GIT_CONFIG_VALUE_0': '/scratch/empty-hooks',
        'GIT_CONFIG_KEY_1': 'core.fsmonitor',
        'GIT_CONFIG_VALUE_1': 'false',
        'JSDOM_MODULE': '/opt/seed/node_modules/jsdom/lib/api.js',
        'SDK_SOURCE_ROOT': '/scratch/app',
    }
    require(dict(os.environ) == expected_environment, 'Unexpected container environment')

    limits = {
        'memory.max': str(2 * 1024 ** 3),
        'memory.swap.max': '0',
        'pids.max': '96',
        'cpu.max': '100000 100000',
    }
    for name, expected in limits.items():
        require((Path('/sys/fs/cgroup') / name).read_text().strip() == expected,
                'Wrong cgroup limit: ' + name)
    require(resource.getrlimit(resource.RLIMIT_FSIZE) == (MAX_FILE, MAX_FILE),
            'Wrong maximum file size')
    require(resource.getrlimit(resource.RLIMIT_NOFILE) == (1024, 1024),
            'Wrong descriptor limit')
    mount_table = mounts()
    require('ro' in mount_table['/']['options'], 'Root is not readonly')
    for directory in ('/source', '/harness'):
        require('ro' in mount_table[directory]['options'], 'Input is not readonly')
    scratch_mount = mount_table['/scratch']
    require(scratch_mount['type'] == 'tmpfs', 'Scratch is not tmpfs')
    require({'rw', 'nosuid', 'nodev'} <= scratch_mount['options'], 'Wrong scratch mount options')
    scratch_fs = os.statvfs(SCRATCH)
    require(scratch_fs.f_blocks * scratch_fs.f_frsize == 1024 ** 3,
            'Scratch disk limit is not one GiB')
    require('/dev/shm' not in mount_table, 'IPC shared-memory mount is present')
    require(not Path('/var/run/docker.sock').exists(), 'Docker socket is exposed')
    require(not Path('/run/docker.sock').exists(), 'Docker socket is exposed')
    for directory in ('/', '/source', '/harness', '/tmp', '/opt/seed',
                      '/usr/local/bin', '/usr/bin', '/run', '/home/node', '/dev', '/dev/shm'):
        readonly_probe(directory)
    for filename in ('/etc/hosts', '/etc/hostname', '/etc/resolv.conf'):
        readonly_file_probe(filename)
    sentinel = SCRATCH / '.brainilab-scratch-probe'
    sentinel.write_bytes(b'scratch-only\n')
    require(sentinel.read_bytes() == b'scratch-only\n', 'Scratch is not writable')
    sentinel.unlink()

    interfaces = sorted(path.name for path in Path('/sys/class/net').iterdir())
    require(interfaces == ['lo'], 'Unexpected external network interface')
    routes = Path('/proc/net/route').read_text().splitlines()
    require(len([line for line in routes[1:] if line.strip()]) == 0,
            'External route is present')
    # This documentation-only address is not a service probe: after interface
    # and route assertions, the kernel must reject it locally as unreachable.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
        client.settimeout(0.3)
        try:
            client.connect(('192.0.2.1', 9))
        except OSError as error:
            require(error.errno == errno.ENETUNREACH,
                    'Network attempt did not fail locally with ENETUNREACH')
        else:
            raise RuntimeError('External network unexpectedly reachable')
    emit('isolation-probe', {'passed': True, 'uid': os.getuid(),
                            'interfaces': interfaces, 'cgroups': limits,
                            'scratchBytes': 1024 ** 3, 'fileBytes': MAX_FILE})


def check_source_tree(root):
    total = 0
    count = 0
    for parent, directories, files in os.walk(root, followlinks=False):
        for name in directories + files:
            current = Path(parent) / name
            metadata = current.lstat()
            require(not stat.S_ISLNK(metadata.st_mode), 'Source contains a symlink')
            require(stat.S_ISREG(metadata.st_mode) or stat.S_ISDIR(metadata.st_mode),
                    'Source contains a special file')
            if stat.S_ISREG(metadata.st_mode):
                require(metadata.st_size <= MAX_FILE, 'Input file is too large')
                total += metadata.st_size
                count += 1
    require(total <= MAX_SOURCE and count <= MAX_FILES, 'Input tree is too large')
    return total, count


def git(*arguments):
    return subprocess.check_output(
        ['/usr/bin/git', '-c', 'core.hooksPath=/scratch/empty-hooks',
         '-c', 'core.fsmonitor=false', '-c', 'submodule.recurse=false', *arguments],
        cwd=APP, env=dict(os.environ), timeout=45, stderr=subprocess.STDOUT,
    )


def prepare(commit):
    require(re.fullmatch(r'[0-9a-f]{40}', commit) is not None, 'Invalid source revision')
    require(not APP.exists(), 'Scratch source already exists')
    require((SOURCE / '.git').is_dir() and not (SOURCE / '.git').is_symlink(),
            'Source Git directory must be an ordinary directory')
    require(not (SOURCE / '.git' / 'commondir').exists(), 'Shared Git directory is forbidden')
    require(not (SOURCE / '.git' / 'objects' / 'info' / 'alternates').exists(),
            'Alternate Git object directory is forbidden')
    total, count = check_source_tree(SOURCE)
    for directory in ('home', 'tmp', 'cache', 'empty-hooks'):
        (SCRATCH / directory).mkdir(mode=0o700, exist_ok=False)
    shutil.copytree(SOURCE, APP, symlinks=False)
    git('checkout', '--force', '--detach', commit)
    actual = git('rev-parse', 'HEAD').decode('ascii').strip()
    require(actual == commit, 'Git checked out a different revision')
    require(not (APP / 'node_modules').exists(), 'Tracked node_modules are forbidden')
    (APP / 'node_modules').symlink_to('/opt/seed/node_modules', target_is_directory=True)
    tracked = git('ls-files', '-z')
    require(tracked and b'package.json\0' in tracked, 'Missing real Git index')
    source_package_hash = hashlib.sha256((APP / 'package.json').read_bytes()).hexdigest()
    seed_package_hash = hashlib.sha256(Path('/opt/seed/package.json').read_bytes()).hexdigest()
    require(source_package_hash == seed_package_hash, 'Dependencies and source manifest differ')
    source_lock_hash = hashlib.sha256((APP / 'pnpm-lock.yaml').read_bytes()).hexdigest()
    seed_lock_hash = hashlib.sha256(Path('/opt/seed/pnpm-lock.yaml').read_bytes()).hexdigest()
    require(source_lock_hash == seed_lock_hash, 'Dependencies and source lock differ')
    emit('prepared-source', {'passed': True, 'commit': actual, 'sourceBytes': total,
                             'sourceFiles': count, 'packageSha256': source_package_hash,
                             'lockSha256': source_lock_hash})


def main():
    if sys.argv[1:] == ['probe']:
        probe()
    elif len(sys.argv) == 3 and sys.argv[1] == 'prepare':
        prepare(sys.argv[2])
    else:
        raise RuntimeError('Only probe and prepare modes are permitted')


if __name__ == '__main__':
    main()
