"""Trusted GitHub-hosted controller for offline dependency validation.

Run with python3 -I. Review this controller and plan.json independently before
placing them on the dedicated validation branch. This file must never import
application modules, run package hooks on the host, or promote target files.
"""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import selectors
import shutil
import signal
import stat
import subprocess
import sys
import tempfile
import time


BRANCH = 'refs/heads/codex/security-deps-isolation-nov23'
REPOSITORY = 'brainilabquiz/brainilab-web'
NODE_IMAGE = 'docker.io/library/node@sha256:aca79828f8a4afc627f189387c965625bcc419233946210a3b9522d90a59b5c6'
MAX_LOG = 2 * 1024 * 1024
MAX_FILE = 64 * 1024 * 1024
MAX_SOURCE = 384 * 1024 * 1024
MAX_FILES = 25000
MAX_PLAN = 65536
CASE_NAMES = ('baseline', 'patched')
SAFE_EXECUTABLES = {'node', 'python3', 'pnpm'}
DOCKER = '/usr/bin/docker'
GIT = '/usr/bin/git'
CONTAINER_ENV = {
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


def require(condition, description):
    if not condition:
        raise RuntimeError(description)


def emit(kind, details):
    # Every line has a fixed non-command prefix. Even a target stdout string
    # containing :: commands/newlines cannot become a GitHub workflow command.
    print('ISOLATION ' + json.dumps({'kind': kind, **details}, sort_keys=True), flush=True)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def bounded_file(path, maximum=MAX_FILE):
    metadata = path.lstat()
    require(stat.S_ISREG(metadata.st_mode) and not path.is_symlink(),
            'Expected an ordinary file')
    require(metadata.st_size <= maximum, 'Input file exceeds size limit')
    return path.read_bytes()


def assert_tree(root):
    require(root.is_dir() and not root.is_symlink(), 'Expected an ordinary source directory')
    total = 0
    count = 0
    for parent, directories, files in os.walk(root, followlinks=False):
        for name in directories + files:
            current = Path(parent) / name
            metadata = current.lstat()
            require(not stat.S_ISLNK(metadata.st_mode), 'Source symlinks are forbidden')
            require(stat.S_ISDIR(metadata.st_mode) or stat.S_ISREG(metadata.st_mode),
                    'Source special files are forbidden')
            if stat.S_ISREG(metadata.st_mode):
                require(metadata.st_size <= MAX_FILE, 'Source file exceeds size limit')
                total += metadata.st_size
                count += 1
                require(total <= MAX_SOURCE and count <= MAX_FILES, 'Source tree exceeds limit')
    return {'bytes': total, 'files': count}


def validate_plan(plan):
    required_fields = {
        'schemaVersion', 'baselineCommit', 'patchedCommit', 'nodeImage',
        'harnessFiles', 'steps',
    }
    require(isinstance(plan, dict) and required_fields <= set(plan)
            and set(plan) <= required_fields | {'metadataPatch'},
            'Unexpected validation plan fields')
    require(plan['schemaVersion'] == 1, 'Unsupported validation plan')
    require(re.fullmatch(r'[0-9a-f]{40}', plan['baselineCommit']) is not None,
            'Baseline must be a full reviewed commit SHA')
    require(plan['patchedCommit'] == 'HEAD', 'Patched commit must be the checked-out HEAD')
    require(plan['nodeImage'] == NODE_IMAGE,
            'Node image must match the independently verified official Node 24 bookworm digest')
    require(isinstance(plan['harnessFiles'], dict), 'Harness hashes are required')
    if 'metadataPatch' in plan:
        require(plan['metadataPatch'] == 'metadata-patch.json'
                and 'metadata-patch.json' in plan['harnessFiles'],
                'Reviewed metadata patch must be a hashed fixed-name input')
    for required in ('runner.py', 'bootstrap.py', 'toolchain.Dockerfile'):
        require(required in plan['harnessFiles'], 'Missing trusted harness hash')
    require(len(plan['harnessFiles']) <= 12, 'Too many harness files')
    for name, digest in plan['harnessFiles'].items():
        require(re.fullmatch(r'[a-zA-Z0-9][a-zA-Z0-9_.-]{0,79}', name) is not None,
                'Harness files must be immediate ordinary files')
        require(re.fullmatch(r'[0-9a-f]{64}', digest) is not None, 'Invalid harness checksum')
    require(isinstance(plan['steps'], dict) and set(plan['steps']) == set(CASE_NAMES),
            'Baseline and patched steps are both required')
    for case in CASE_NAMES:
        steps = plan['steps'][case]
        require(isinstance(steps, list) and 1 <= len(steps) <= 40, 'Invalid step count')
        identifiers = set()
        for step in steps:
            require(isinstance(step, dict) and set(step) == {'id', 'argv', 'timeout'},
                    'Unexpected step configuration')
            require(re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}', step['id']) is not None,
                    'Invalid step identifier')
            require(step['id'] not in identifiers, 'Duplicate step identifier')
            identifiers.add(step['id'])
            arguments = step['argv']
            require(isinstance(arguments, list) and 2 <= len(arguments) <= 20,
                    'A static argv array is required')
            require(arguments[0] in SAFE_EXECUTABLES, 'Unapproved target executable')
            for argument in arguments:
                require(isinstance(argument, str) and 0 < len(argument) <= 512
                        and '\0' not in argument and '\n' not in argument and '\r' not in argument,
                        'Invalid target argument')
            require(isinstance(step['timeout'], int) and not isinstance(step['timeout'], bool)
                    and 1 <= step['timeout'] <= 600, 'Invalid step timeout')
            if step['timeout'] > 120:
                require(step['id'] == 'full-build' and step['argv'] == ['node', 'tools/build.mjs'],
                        'Only the reviewed full build may exceed 120 seconds')
    baseline = plan['steps']['baseline']
    patched = plan['steps']['patched']
    require(patched[:len(baseline)] == baseline,
            'Patched graph must run the same existing steps as baseline first')


class Controller:
    def __init__(self, output):
        self.output = output
        self.deadline = time.monotonic() + 1350
        self.containers = set()
        self.host_home = output / 'host-home'
        self.host_home.mkdir(mode=0o700)
        self.host_env = {
            'PATH': '/usr/local/bin:/usr/bin:/bin',
            'HOME': str(self.host_home),
            'TMPDIR': str(output),
            'XDG_CACHE_HOME': str(output / 'host-cache'),
            'LANG': 'C.UTF-8',
            'LC_ALL': 'C.UTF-8',
            'TZ': 'UTC',
            'GIT_CONFIG_NOSYSTEM': '1',
            'GIT_CONFIG_GLOBAL': '/dev/null',
            'GIT_CONFIG_SYSTEM': '/dev/null',
            'GIT_TERMINAL_PROMPT': '0',
            'DOCKER_CONFIG': str(output / 'empty-docker-config'),
        }
        (output / 'empty-docker-config').mkdir(mode=0o700)
        self.report = {
            'schemaVersion': 1,
            'repository': REPOSITORY,
            'validationBranch': BRANCH,
            'runtimeFilesRetained': False,
            'cases': [],
            'passed': False,
        }

    def remaining(self, seconds):
        value = min(seconds, self.deadline - time.monotonic())
        require(value > 0, 'Overall controller deadline exceeded')
        return value

    def command(self, argv, timeout=60, cwd=None, announce=False, cleanup=False):
        """Bounded stdout, no shell, no ambient environment or workflow commands."""
        duration = timeout if cleanup else self.remaining(timeout)
        process = subprocess.Popen(
            argv, cwd=cwd, env=self.host_env, stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, start_new_session=True,
        )
        captured = bytearray()
        selector = selectors.DefaultSelector()
        selector.register(process.stdout, selectors.EVENT_READ)
        started = time.monotonic()
        timed_out = False
        overflow = False
        try:
            while selector.get_map():
                if time.monotonic() - started > duration:
                    timed_out = True
                    break
                events = selector.select(timeout=min(0.2, duration))
                for key, _ in events:
                    chunk = os.read(key.fileobj.fileno(), 65536)
                    if not chunk:
                        selector.unregister(key.fileobj)
                        continue
                    if len(captured) + len(chunk) > MAX_LOG:
                        overflow = True
                        break
                    captured.extend(chunk)
                    if announce:
                        emit('bounded-output', {'text': chunk.decode('utf-8', errors='replace')})
                if overflow:
                    break
            if timed_out or overflow:
                os.killpg(process.pid, signal.SIGKILL)
            try:
                code = process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                code = process.wait(timeout=5)
        finally:
            selector.close()
            process.stdout.close()
            if process.poll() is None:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait(timeout=5)
        result = {
            'exitCode': code,
            'timedOut': timed_out,
            'outputLimitExceeded': overflow,
            'logBytes': len(captured),
            'logSha256': sha256(captured),
            'durationSeconds': round(time.monotonic() - started, 3),
        }
        return result, bytes(captured)

    def checked(self, argv, timeout=60, cwd=None, announce=False):
        result, output = self.command(argv, timeout=timeout, cwd=cwd, announce=announce)
        require(result['exitCode'] == 0 and not result['timedOut']
                and not result['outputLimitExceeded'], 'Trusted preparation command failed')
        return output

    def git(self, source, *arguments):
        return self.checked([GIT, '-c', 'core.hooksPath=/dev/null',
                             '-c', 'core.fsmonitor=false', '-C', str(source), *arguments])

    def clean_source(self, source, destination):
        metadata = assert_tree(source)
        require((source / '.git').is_dir() and not (source / '.git').is_symlink(),
                'A normal fresh Git checkout is required')
        require(not (source / '.git' / 'commondir').exists(), 'Shared worktree Git metadata forbidden')
        require(not (source / '.git' / 'objects' / 'info' / 'alternates').exists(),
                'Alternate Git object storage forbidden')
        shutil.copytree(source, destination, symlinks=False)
        git_dir = destination / '.git'
        hooks = git_dir / 'hooks'
        if hooks.exists():
            shutil.rmtree(hooks)
        hooks.mkdir(mode=0o755)
        # Never copy remotes, credential helpers, includeIf, filters, or config
        # commands into the container. Real objects/index/HEAD remain untouched.
        (git_dir / 'config').write_text(
            '[core]\nrepositoryformatversion = 0\nfilemode = true\nbare = false\n'
            'logallrefupdates = false\nhooksPath = /scratch/empty-hooks\n'
            'fsmonitor = false\n[credential]\nhelper =\n', encoding='utf-8')
        for name in ('config.worktree', 'FETCH_HEAD', 'ORIG_HEAD'):
            candidate = git_dir / name
            if candidate.exists():
                candidate.unlink()
        return metadata

    def validate_revision(self, source, revision):
        self.git(source, 'cat-file', '-e', revision + '^{commit}')
        entries = self.git(source, 'ls-tree', '-r', '-z', revision)
        count = 0
        for entry in entries.split(b'\0'):
            if not entry:
                continue
            metadata, name = entry.split(b'\t', 1)
            mode, kind, _ = metadata.split(b' ')
            require(mode in (b'100644', b'100755') and kind == b'blob',
                    'Revision contains a symlink, submodule, or special file')
            require(not name.startswith(b'/') and b'..' not in name.split(b'/')
                    and b'\n' not in name and b'\r' not in name,
                    'Revision contains an unsafe filename')
            count += 1
        require(1 <= count <= MAX_FILES, 'Invalid source revision size')
        return self.git(source, 'rev-parse', revision + '^{tree}').decode('ascii').strip()

    def construct_metadata_patch(self, source, raw_data, baseline, workflow_commit):
        """Create the reviewed two-file commit as Git data, never target code.

        The workflow checkout retains the previously validated application
        graph. New dependency bytes are supplied only to this trusted parent,
        then intentionally executed later inside the unchanged OS container.
        """
        require(len(raw_data) <= 256 * 1024, 'Metadata patch input exceeds bound')
        data = json.loads(raw_data)
        require(isinstance(data, dict) and set(data) == {
            'schemaVersion', 'baseCommit', 'expectedCommit', 'expectedTree',
            'commitObjectBase64', 'files',
        }, 'Unexpected metadata patch fields')
        require(data['schemaVersion'] == 1 and data['baseCommit'] == baseline,
                'Metadata patch baseline differs from the reviewed plan')
        for field in ('baseCommit', 'expectedCommit', 'expectedTree'):
            require(isinstance(data[field], str)
                    and re.fullmatch(r'[0-9a-f]{40}', data[field]) is not None,
                    'Invalid metadata patch Git identity')
        require(data['expectedCommit'] != baseline, 'Metadata patch has no distinct commit')
        self.git(source, 'cat-file', '-e', baseline + '^{commit}')
        self.validate_revision(source, baseline)

        # A harness-only push must not introduce unvalidated application bytes
        # into a connected Cloudflare build. The parent checks this before
        # pushing as well; this is a second fixed-path assertion.
        workflow_changes = self.git(source, 'diff', '--name-only', '-z',
                                    baseline, workflow_commit).split(b'\0')
        require(all(not name
                    or name == b'.github/workflows/security-dependency-isolation.yml'
                    or name.startswith(b'tools/security-dependency-isolation/')
                    for name in workflow_changes),
                'Workflow checkout changes application files beyond the reviewed baseline')

        def decode(value, maximum, description):
            require(isinstance(value, str) and len(value) <= 4 * maximum // 3 + 8,
                    description + ' base64 input exceeds bound')
            try:
                content = base64.b64decode(value, validate=True)
            except (ValueError, UnicodeError):
                raise RuntimeError(description + ' is not valid base64') from None
            require(len(content) <= maximum, description + ' exceeds decoded bound')
            return content

        def git_object_sha(kind, content):
            header = kind.encode('ascii') + b' ' + str(len(content)).encode('ascii') + b'\0'
            return hashlib.sha1(header + content).hexdigest()

        raw_commit = decode(data['commitObjectBase64'], 8192, 'Reviewed commit')
        require(b'\0' not in raw_commit and b'\n\n' in raw_commit,
                'Invalid reviewed commit structure')
        header, message = raw_commit.split(b'\n\n', 1)
        header_lines = header.split(b'\n')
        require(len(header_lines) == 4 and message
                and header_lines[0] == ('tree ' + data['expectedTree']).encode('ascii')
                and header_lines[1] == ('parent ' + baseline).encode('ascii')
                and re.fullmatch(rb'author [^\n<>]{1,120} <[^\n<>]{1,160}> [0-9]{1,12} [+-][0-9]{4}',
                                 header_lines[2]) is not None
                and re.fullmatch(rb'committer [^\n<>]{1,120} <[^\n<>]{1,160}> [0-9]{1,12} [+-][0-9]{4}',
                                 header_lines[3]) is not None,
                'Reviewed commit must have exactly the declared tree and one baseline parent')
        require(git_object_sha('commit', raw_commit) == data['expectedCommit'],
                'Reviewed raw commit does not match its declared identity')

        entries = data['files']
        required_paths = {'package.json', 'pnpm-lock.yaml'}
        require(isinstance(entries, list) and len(entries) == 2
                and all(isinstance(entry, dict) and set(entry) == {
                    'path', 'contentBase64', 'sha256', 'blobSha',
                } for entry in entries)
                and {entry['path'] for entry in entries} == required_paths,
                'Metadata patch must contain exactly the two dependency files')
        prepared = []
        for entry in entries:
            require(re.fullmatch(r'[0-9a-f]{64}', entry['sha256']) is not None
                    and re.fullmatch(r'[0-9a-f]{40}', entry['blobSha']) is not None,
                    'Invalid reviewed dependency checksum')
            maximum = 65536 if entry['path'] == 'package.json' else 1024 * 1024
            content = decode(entry['contentBase64'], maximum, 'Dependency metadata')
            require(sha256(content) == entry['sha256']
                    and git_object_sha('blob', content) == entry['blobSha'],
                    'Dependency metadata differs from its reviewed hashes')
            destination = source / entry['path']
            metadata = destination.lstat()
            require(stat.S_ISREG(metadata.st_mode) and not destination.is_symlink(),
                    'Dependency destination must be an ordinary file')
            prepared.append((entry, content, destination))

        self.git(source, 'read-tree', baseline)
        for entry, content, destination in prepared:
            destination.write_bytes(content)
            blob = self.git(source, 'hash-object', '--no-filters', '-w',
                            str(destination)).decode('ascii').strip()
            require(blob == entry['blobSha'], 'Written dependency blob differs')
            self.git(source, 'update-index', '--add', '--cacheinfo',
                     '100644,' + blob + ',' + entry['path'])
        actual_tree = self.git(source, 'write-tree').decode('ascii').strip()
        require(actual_tree == data['expectedTree'], 'Constructed dependency tree differs')
        raw_commit_path = self.output / 'reviewed-metadata-commit'
        with raw_commit_path.open('xb') as destination:
            destination.write(raw_commit)
        actual_commit = self.git(source, 'hash-object', '-t', 'commit', '-w',
                                str(raw_commit_path)).decode('ascii').strip()
        require(actual_commit == data['expectedCommit'], 'Constructed dependency commit differs')
        changed = self.git(source, 'diff', '--name-only', '-z', baseline,
                           actual_commit).split(b'\0')
        require({name.decode('ascii') for name in changed if name} == required_paths,
                'Constructed commit changes files outside dependency metadata')
        self.validate_revision(source, actual_commit)
        self.git(source, 'checkout', '--force', '--detach', actual_commit)
        require(self.git(source, 'rev-parse', 'HEAD').decode('ascii').strip() == actual_commit,
                'Prepared checkout does not match the reviewed commit')
        for entry, content, destination in prepared:
            require(destination.read_bytes() == content,
                    'Checked-out dependency metadata differs from the reviewed bytes')
        self.report['metadataPatch'] = {
            'sha256': sha256(raw_data), 'baseCommit': baseline,
            'expectedCommit': actual_commit, 'expectedTree': actual_tree,
            'files': [{key: entry[key] for key in ('path', 'sha256', 'blobSha')}
                      for entry in entries],
        }
        return actual_commit

    def build_image(self, source, revision, context, dockerfile, node_image, case):
        context.mkdir(mode=0o700)
        (context / 'Dockerfile').write_bytes(dockerfile)
        manifest = self.git(source, 'show', revision + ':package.json')
        lock = self.git(source, 'show', revision + ':pnpm-lock.yaml')
        require(len(manifest) <= 65536 and len(lock) <= 1024 * 1024,
                'Dependency inputs exceed reviewed bounds')
        data = json.loads(manifest)
        require(data.get('name') == 'brainilab-web' and data.get('private') is True,
                'Wrong dependency manifest')
        require('packageManager' not in data and 'pnpm' not in data,
                'Unreviewed package-manager execution configuration')
        for key in ('dependencies', 'devDependencies', 'optionalDependencies'):
            for version in data.get(key, {}).values():
                require(isinstance(version, str) and
                        re.fullmatch(r'[\^~]?[0-9]+\.[0-9]+\.[0-9]+', version) is not None,
                        'Only reviewed registry semver dependencies may be provisioned')
        require(re.search(rb'(?:^|[\s"\x27{])(?:git\+https:|git\+ssh:|file:|link:|tarball:)',
                          lock, flags=re.MULTILINE) is None,
                'Unreviewed non-registry dependency source')
        (context / 'package.json').write_bytes(manifest)
        (context / 'pnpm-lock.yaml').write_bytes(lock)
        # Context is exactly these three files. No target hooks or source are
        # available during the network-enabled trusted package-byte preparation.
        require(sorted(path.name for path in context.iterdir()) ==
                ['Dockerfile', 'package.json', 'pnpm-lock.yaml'], 'Unexpected build context')
        iid = context.parent / (case + '-image-id')
        result, _ = self.command(
            [DOCKER, 'build', '--platform', 'linux/amd64', '--pull', '--progress=plain', '--iidfile', str(iid),
             '--build-arg', 'NODE_IMAGE=' + node_image, str(context)],
            timeout=420, announce=True,
        )
        require(result['exitCode'] == 0 and not result['timedOut']
                and not result['outputLimitExceeded'], 'Trusted image provisioning failed')
        image = bounded_file(iid, 128).decode('ascii').strip()
        require(re.fullmatch(r'sha256:[0-9a-f]{64}', image) is not None, 'Invalid built image ID')
        return image, {'packageSha256': sha256(manifest), 'lockSha256': sha256(lock),
                       'dockerfileSha256': sha256(dockerfile), 'provision': result}

    def create_container(self, image, source, harness, name):
        for path in (source, harness):
            require(',' not in str(path) and '\n' not in str(path), 'Unsafe mount path')
        arguments = [
            DOCKER, 'run', '--detach', '--name', name,
            '--network', 'none', '--read-only', '--user', '65534:65534',
            '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges:true',
            '--ipc', 'none', '--pids-limit', '96', '--cpus', '1',
            '--memory', '2g', '--memory-swap', '2g',
            '--ulimit', 'fsize=67108864:67108864',
            '--ulimit', 'nofile=1024:1024',
            '--tmpfs', '/scratch:rw,size=1g,mode=1777,nosuid,nodev',
            '--mount', 'type=bind,source=' + str(source) + ',target=/source,readonly',
            '--mount', 'type=bind,source=' + str(harness) + ',target=/harness,readonly',
            '--log-driver', 'none', '--workdir', '/scratch',
            image,
        ]
        # Add before creation so a partial/error response still triggers cleanup.
        self.containers.add(name)
        self.checked(arguments, timeout=45)
        return name

    def inspect_container(self, name, image, source, harness):
        inspection = json.loads(self.checked([DOCKER, 'inspect', name], timeout=20))[0]
        config = inspection['HostConfig']
        require(inspection['Image'] == image and inspection['State']['Running'], 'Wrong running image')
        require(inspection['Config']['User'] == '65534:65534', 'Wrong Docker user')
        require(config['ReadonlyRootfs'] is True and config['NetworkMode'] == 'none',
                'Wrong readonly/network configuration')
        require(config['Privileged'] is False and not config.get('CapAdd'), 'Privileged container')
        require({value.upper() for value in config['CapDrop']} == {'ALL'}, 'Incomplete capability drop')
        require('no-new-privileges:true' in config['SecurityOpt'], 'Missing privilege restriction')
        require(config['IpcMode'] == 'none' and config.get('PidMode', '') == '', 'Shared namespace')
        require(config['PidsLimit'] == 96 and config['NanoCpus'] == 1000000000,
                'Wrong process/CPU limit')
        require(config['Memory'] == 2147483648 and config['MemorySwap'] == 2147483648,
                'Wrong memory/swap limit')
        ulimits = {item['Name']: (item['Soft'], item['Hard']) for item in config['Ulimits']}
        require(ulimits.get('fsize') == (MAX_FILE, MAX_FILE)
                and ulimits.get('nofile') == (1024, 1024), 'Wrong Docker file limits')
        require(config['LogConfig']['Type'] == 'none', 'Unbounded Docker log driver')
        require(set(config['Tmpfs']) == {'/scratch'}, 'Unexpected writable tmpfs')
        scratch_options = set(config['Tmpfs']['/scratch'].split(','))
        require({'rw', 'size=1g', 'mode=1777', 'nosuid', 'nodev'} <= scratch_options,
                'Wrong Docker scratch options')
        bind_mounts = {item['Destination']: item for item in inspection['Mounts']
                       if item['Type'] == 'bind'}
        require(set(bind_mounts) == {'/source', '/harness'}, 'Unexpected host mount')
        require(bind_mounts['/source']['Source'] == str(source)
                and bind_mounts['/harness']['Source'] == str(harness), 'Wrong input mount source')
        require(all(item['RW'] is False for item in bind_mounts.values()), 'Writable host input')
        require(not config.get('Devices') and not config.get('DeviceRequests')
                and not config.get('PortBindings') and not config.get('Links')
                and not config.get('VolumesFrom'), 'Unexpected device/service exposure')
        return {'network': 'none', 'rootReadonly': True, 'user': '65534:65534',
                'capabilities': [], 'noNewPrivileges': True, 'ipc': 'none',
                'pids': 96, 'cpus': 1, 'memoryBytes': 2147483648,
                'swapExtraBytes': 0, 'scratchBytes': 1073741824,
                'fileBytes': MAX_FILE, 'openFiles': 1024, 'hostInputsReadonly': True}

    def container_command(self, name, argv, timeout, cwd='/scratch', announce=False):
        environment = [key + '=' + value for key, value in CONTAINER_ENV.items()]
        return self.command([DOCKER, 'exec', '--workdir', cwd, '--user', '65534:65534', name,
                             '/usr/bin/env', '-i', *environment, *argv],
                            timeout=timeout, announce=announce)

    def stop_container(self, name):
        result, _ = self.command([DOCKER, 'rm', '--force', name], timeout=20, cleanup=True)
        if result['exitCode'] == 0:
            self.containers.discard(name)
        require(result['exitCode'] == 0, 'Could not remove isolated container')

    def run_case(self, case, revision, tree, image, inputs, source, harness, steps):
        name = 'brainilab-deps-' + case + '-' + os.urandom(6).hex()
        record = {'case': case, 'commit': revision, 'tree': tree, 'imageId': image,
                  'inputs': inputs, 'steps': [], 'passed': False}
        self.report['cases'].append(record)
        try:
            self.create_container(image, source, harness, name)
            record['enforcedLimits'] = self.inspect_container(name, image, source, harness)
            for mode in (['probe'], ['prepare', revision]):
                result, raw = self.container_command(
                    name, ['/usr/local/bin/python3', '-I', '/harness/bootstrap.py', *mode], timeout=90)
                if result['exitCode'] != 0 or result['timedOut'] or result['outputLimitExceeded']:
                    emit('setup-failed', {'case': case, 'mode': mode[0], **result,
                                          'text': raw.decode('utf-8', errors='replace')})
                require(result['exitCode'] == 0 and not result['timedOut']
                        and not result['outputLimitExceeded'], 'Isolation probe/setup failed')
                # Trusted bootstrap emits one line and no application code has
                # run yet. Never parse a target-generated file as attestation.
                attestation = json.loads(raw)
                require(attestation.get('passed') is True, 'Invalid setup attestation')
                record[mode[0]] = attestation
            require(record['prepare']['commit'] == revision
                    and record['prepare']['packageSha256'] == inputs['packageSha256']
                    and record['prepare']['lockSha256'] == inputs['lockSha256'],
                    'Prepared source does not match reviewed dependency inputs')
            for step in steps:
                emit('step-start', {'case': case, 'id': step['id']})
                result, _ = self.container_command(name, step['argv'], timeout=step['timeout'],
                                                  cwd='/scratch/app', announce=True)
                record['steps'].append({'id': step['id'], **result})
                emit('step-end', {'case': case, 'id': step['id'], **result})
                # Ordinary test failures remain recorded and make this case
                # fail, while later tests and the other graph can still provide
                # diagnostics. Resource/output/deadline failures abort at once.
                require(result['exitCode'] >= 0 and not result['timedOut']
                        and not result['outputLimitExceeded'],
                        'Target validation terminated outside normal exit bounds')
            record['passed'] = bool(record['steps']) and all(
                step_result['exitCode'] == 0 and not step_result['timedOut']
                and not step_result['outputLimitExceeded']
                for step_result in record['steps']
            )
        finally:
            self.stop_container(name)

    def cleanup(self):
        for name in list(self.containers):
            try:
                self.stop_container(name)
            except Exception:
                self.report['cleanupFailed'] = True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', required=True, type=Path)
    parser.add_argument('--harness', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    arguments = parser.parse_args()
    require(sys.platform == 'linux', 'This controller requires the approved Linux runner')
    require(os.environ.get('GITHUB_ACTIONS') == 'true'
            and os.environ.get('GITHUB_REPOSITORY') == REPOSITORY
            and os.environ.get('GITHUB_REF') == BRANCH, 'Wrong execution context')
    source = arguments.source.resolve(strict=True)
    harness = arguments.harness.resolve(strict=True)
    require(harness.is_relative_to(source), 'Harness must be in the reviewed checkout')
    temporary_root = Path(os.environ['RUNNER_TEMP']).resolve(strict=True)
    output = arguments.output.resolve()
    require(output.parent == temporary_root
            and output.name == 'brainilab-security-isolation', 'Unexpected output location')
    output.mkdir(mode=0o700, exist_ok=False)
    controller = Controller(output)
    def interrupted(_signum, _frame):
        raise KeyboardInterrupt('Runner interrupted; removing isolated containers')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    exit_code = 1
    try:
        plan_bytes = bounded_file(harness / 'plan.json', MAX_PLAN)
        plan = json.loads(plan_bytes)
        validate_plan(plan)
        controller.report['planSha256'] = sha256(plan_bytes)
        controller.report['nodeImage'] = plan['nodeImage']
        for name, digest in plan['harnessFiles'].items():
            require(sha256(bounded_file(harness / name, 256 * 1024)) == digest,
                    'Trusted harness checksum mismatch')
        require(Path(__file__).resolve() == harness / 'runner.py', 'Wrong controller location')
        with tempfile.TemporaryDirectory(prefix='inputs-', dir=output) as scratch_inputs:
            staging = Path(scratch_inputs)
            staged_source = staging / 'source'
            controller.report['sourceInput'] = controller.clean_source(source, staged_source)
            workflow_commit = controller.git(staged_source, 'rev-parse', 'HEAD').decode('ascii').strip()
            require(re.fullmatch(r'[0-9a-f]{40}', workflow_commit) is not None,
                    'Invalid checked-out workflow SHA')
            require(workflow_commit == os.environ.get('GITHUB_SHA'),
                    'Checkout and workflow identity differ')
            controller.report['workflowCommit'] = workflow_commit
            patched = workflow_commit
            if 'metadataPatch' in plan:
                patched = controller.construct_metadata_patch(
                    staged_source, bounded_file(harness / plan['metadataPatch'], 256 * 1024),
                    plan['baselineCommit'], workflow_commit)
            require(patched != plan['baselineCommit'], 'Baseline and patch must be distinct commits')
            revisions = {'baseline': plan['baselineCommit'], 'patched': patched}
            trees = {case: controller.validate_revision(staged_source, revision)
                     for case, revision in revisions.items()}
            staged_harness = staging / 'harness'
            staged_harness.mkdir(mode=0o755)
            for name in plan['harnessFiles']:
                (staged_harness / name).write_bytes(bounded_file(harness / name, 256 * 1024))
            # The container cannot read plan.json or the original checkout path;
            # its only inputs are this hashed harness and the scrubbed source.
            dockerfile = bounded_file(staged_harness / 'toolchain.Dockerfile', 65536)
            for case in CASE_NAMES:
                image, inputs = controller.build_image(
                    staged_source, revisions[case], staging / (case + '-context'),
                    dockerfile, plan['nodeImage'], case)
                controller.run_case(case, revisions[case], trees[case], image, inputs,
                                    staged_source, staged_harness, plan['steps'][case])
            controller.report['passed'] = all(record['passed'] for record in controller.report['cases'])
            exit_code = 0 if controller.report['passed'] else 1
    except Exception as error:
        # Controller exceptions contain fixed labels, never target stdout or
        # credentials. A failed preparation is not reported as a passing test.
        controller.report['errorType'] = type(error).__name__
        controller.report['error'] = str(error)[:240]
        emit('controller-failed', {'errorType': type(error).__name__, 'error': str(error)[:240]})
    finally:
        controller.cleanup()
        if controller.report.get('cleanupFailed'):
            controller.report['passed'] = False
            exit_code = 1
        (output / 'summary.json').write_text(
            json.dumps(controller.report, indent=2, sort_keys=True) + '\n', encoding='utf-8')
        emit('completed', {'passed': controller.report['passed'], 'summary': 'summary.json'})
    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
