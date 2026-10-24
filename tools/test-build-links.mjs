import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const run=spawnSync(process.env.PYTHON||'python',['tools/test-build-links.py'],{encoding:'utf8',timeout:30000});
assert.equal(run.status,0,run.error?.message||run.stdout+run.stderr);
console.log('PASS build links: exact dynamic thumbnail route, missing/static/malformed URL rejection, and private-file exclusions.');
