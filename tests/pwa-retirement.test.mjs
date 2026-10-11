import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('withdrawn app retires its worker and caches without intercepting requests or touching unrelated data',async()=>{
  const events={},deleted=[];let skipped=0,claimed=0,unregistered=0;
  const self={addEventListener:(name,handler)=>events[name]=handler,skipWaiting:async()=>skipped++,clients:{claim:async()=>claimed++},registration:{unregister:async()=>unregistered++}};
  const caches={keys:async()=>['brainilab-pwa-version','brainilab-static-v41','unrelated-cache'],delete:async name=>deleted.push(name)};
  runInNewContext(readFileSync('sw.js','utf8'),{self,caches});
  let installed;events.install({waitUntil:promise=>installed=promise});await installed;
  let activated;events.activate({waitUntil:promise=>activated=promise});await activated;
  assert.equal(skipped,1);assert.equal(claimed,1);assert.equal(unregistered,1);
  assert.deepEqual(deleted,['brainilab-pwa-version','brainilab-static-v41']);assert.equal(events.fetch,undefined);
});

test('public app entry, identity and registration are withdrawn',()=>{
  for(const path of ['install/index.html','offline/index.html','manifest.webmanifest','lib/pwa.js','assets/js/pwa.js','assets/css/pwa.css'])assert.equal(existsSync(path),false,path);
  assert.ok(!readFileSync('tools/build.mjs','utf8').includes('pwaHtml'));
  assert.ok(!readFileSync('assets/js/shell.bundle.js','utf8').includes('window.BrainiPWA'));
  assert.ok(!readFileSync('_headers','utf8').includes('/manifest.webmanifest'));
});
