import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {pathToFileURL} from 'node:url';
import {pwaHtml,pwaWorker} from '../lib/pwa.js';

const manifest=JSON.parse(readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.id,'/');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
assert.equal(manifest.prefer_related_applications,false);
for(const icon of manifest.icons){
  const bytes=readFileSync('.'+icon.src);assert.equal(bytes.subarray(1,4).toString(),'PNG');
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,icon.sizes);
}
assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'&&icon.purpose==='any'));
assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'&&icon.purpose==='any'));
assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
const input='<head><meta content="old" name="theme-color"/><link href="old.png" rel="apple-touch-icon"/></head><footer><div class="footer-links"><a href="/learn/">Learn</a></div></footer>';
const html=pwaHtml(input);assert.equal(pwaHtml(html),html);assert.equal((html.match(/rel="manifest"/g)||[]).length,1);assert.equal((html.match(/name="theme-color"/g)||[]).length,1);assert.ok(html.includes('Install BrainiLab'));
const redirect='<head><meta http-equiv="refresh" content="0;url=/games/"/></head>';assert.equal(pwaHtml(redirect),redirect);
const versions=new Map([['assets/css/pwa.css','123'],['assets/js/offline.js','456'],['assets/brand/app/icon-192.png','abc']]);
const source=readFileSync('sw.js','utf8');const worker=pwaWorker(source,'<h1>Offline</h1>',versions);
assert.ok(!worker.includes('__BRAINI_PWA_VERSION__'));assert.ok(!worker.includes('/* pwa-precache */ []'));
assert.notEqual(worker,pwaWorker(source,'Changed offline page',versions));assert.notEqual(worker,pwaWorker(source,'<h1>Offline</h1>',new Map([...versions,['assets/brand/app/icon-192.png','changed']])));
assert.throws(()=>pwaWorker(source,'',new Map()),/Missing offline asset/);

const events={},stores=new Map(),deleted=[],fetched=[];let skipped=0,claimed=0,failInstall=false;
const storage={open:async name=>{if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return {addAll:async urls=>{if(failInstall)throw Error('Asset failed');for(const url of urls)map.set(url,new Response(url.includes('offline/index')?'<h1>Let’s reconnect.</h1>':'asset'));},match:async key=>map.get(typeof key==='string'?key:new URL(key.url).pathname+new URL(key.url).search)?.clone()};},keys:async()=>[...stores.keys()],delete:async name=>{deleted.push(name);return stores.delete(name);}};
let fetcher=async request=>{fetched.push(request.url);return new Response('online');};
const self={location:{origin:'https://brainilabgames.com'},addEventListener:(name,fn)=>events[name]=fn,skipWaiting:()=>{skipped++;},clients:{claim:()=>{claimed++;}}};
runInNewContext(worker,{self,caches:storage,URL,Response,fetch:r=>fetcher(r)});
await events.install({waitUntil:promise=>self.install=promise});await self.install;assert.equal(skipped,1);
const current=[...stores.keys()][0];assert.equal(stores.get(current).size,7);
stores.set('brainilab-static-old',new Map([['/profile/',new Response('private')]]));stores.set('brainilab-pwa-old',new Map());stores.set('unrelated-app',new Map());
events.activate({waitUntil:promise=>self.activation=promise});await self.activation;assert.deepEqual(deleted.sort(),['brainilab-pwa-old','brainilab-static-old']);assert.ok(stores.has('unrelated-app'));assert.equal(claimed,1);
function request(url,mode='navigate',method='GET'){let intercepted=false,promise;events.fetch({request:{url,mode,method},respondWith:p=>{intercepted=true;promise=p;}});return {intercepted,promise};}
let result=request('https://brainilabgames.com/profile/?code=secret');assert.equal(await (await result.promise).text(),'online');assert.equal(stores.get(current).size,7);
assert.equal(request('https://brainilabgames.com/api/results','cors','POST').intercepted,false);
assert.equal(request('https://brainilabgames.com/api/breaking-news','cors').intercepted,false);
assert.equal(request('https://wvgcdlxebbybthyuajgb.supabase.co/auth/v1/token','cors').intercepted,false);
assert.equal(request('https://brainilabgames.com/assets/js/cloud.bundle.js?v=abc','cors').intercepted,false);
fetcher=async()=>new Response('missing',{status:404});assert.equal((await request('https://brainilabgames.com/missing/').promise).status,404);
fetcher=async()=>{throw Error('Disconnected');};
const offline=await request('https://brainilabgames.com/daily-quiz/').promise;assert.equal(offline.status,503);assert.equal(offline.headers.get('Cache-Control'),'no-store');assert.equal(offline.headers.get('X-Frame-Options'),'DENY');assert.match(await offline.text(),/reconnect/);
assert.equal(await (await request('https://brainilabgames.com/assets/css/pwa.css?v=123','cors').promise).text(),'asset');
fetcher=async()=>new Response('Origin unavailable',{status:503});assert.match(await (await request('https://brainilabgames.com/learn/').promise).text(),/reconnect/);
stores.delete(current);fetcher=async()=>{throw Error('Disconnected');};assert.match(await (await request('https://brainilabgames.com/').promise).text(),/try again/);
failInstall=true;events.install({waitUntil:promise=>self.failedInstall=promise});await assert.rejects(self.failedInstall,/Asset failed/);assert.equal(skipped,1);

const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
function ui({ios=false,standalone=false,embedded=false,local=false,insecure=false,rejected=false}={}){
  const dom=new JSDOM('<html><body><p data-pwa-status>Choose your phone below to get started.</p><button data-pwa-install hidden>Install</button><a data-pwa-install-link>Install BrainiLab</a></body></html>');
  const doc=dom.window.document;Object.defineProperty(doc,'readyState',{value:'complete'});
  const handlers={},registered=[];const media={matches:standalone,addEventListener:(n,fn)=>handlers.modechange=fn};
  const nav={userAgent:ios?'iPhone':'Android',platform:'',maxTouchPoints:0,serviceWorker:{register:async(...args)=>{registered.push(args);if(rejected)throw Error('Unavailable');return {};},ready:Promise.resolve({})}};
  const win={isSecureContext:!insecure,matchMedia:()=>media,addEventListener:(n,fn)=>handlers[n]=fn};win.top=embedded?{}:win;
  runInNewContext(readFileSync('assets/js/pwa.js','utf8'),{window:win,navigator:nav,document:doc,location:{hostname:local?'localhost':'brainilabgames.com'}});
  return {dom,doc,win,handlers,registered,nav,media,button:doc.querySelector('button'),status:()=>doc.querySelector('p').textContent};
}
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
let test=ui();await flush();assert.equal(test.registered.length,1);assert.equal(test.registered[0][0],'/sw.js');assert.equal(test.registered[0][1].updateViaCache,'none');assert.equal(test.doc.documentElement.dataset.pwaWorker,'ready');assert.equal(test.button.hidden,true);
let prompts=0,prevented=0;test.handlers.beforeinstallprompt({preventDefault:()=>prevented++,prompt:async()=>prompts++,userChoice:Promise.resolve({outcome:'accepted'})});assert.equal(test.button.hidden,false);assert.equal(prompts,0);test.button.click();await flush();assert.equal(prompts,1);assert.equal(prevented,1);assert.equal(test.button.hidden,true);assert.match(test.status(),/Finish installation/);test.button.click();assert.equal(prompts,1);test.handlers.appinstalled();assert.match(test.status(),/has been installed/);test.dom.window.close();
test=ui();test.handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'dismissed'})});test.button.click();await flush();assert.match(test.status(),/whenever you like/);test.dom.window.close();
test=ui();test.handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{throw Error('Failed');},userChoice:Promise.resolve({})});test.button.click();await flush();assert.match(test.status(),/did not finish/);test.dom.window.close();
test=ui({ios:true});assert.match(test.status(),/Safari/);assert.equal(test.button.hidden,true);test.dom.window.close();
test=ui({standalone:true});assert.match(test.status(),/already open/);test.handlers.beforeinstallprompt({preventDefault(){throw Error('Should ignore');}});assert.equal(test.button.hidden,true);test.dom.window.close();
for(const opts of [{embedded:true},{local:true},{insecure:true}]){test=ui(opts);await flush();assert.equal(test.registered.length,0);if(opts.embedded)assert.equal(test.doc.querySelector('a').hidden,true);test.dom.window.close();}
test=ui({rejected:true});await flush();assert.equal(test.doc.documentElement.dataset.pwaWorker,'unavailable');test.dom.window.close();
console.log('PASS PWA: manifest/icons, CMS template identity, versioned recovery assets, safe updates, network-only accounts/results, offline recovery, install/decline/error/iPhone/standalone/embedded flows.');
