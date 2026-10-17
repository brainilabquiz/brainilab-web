import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {assetVersion} from '../lib/asset-versions.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const dom=new JSDOM('<script id="loader" src="/assets/js/perf-loader.js?v=current"></script>',{url:'https://brainilabgames.com/profile/',runScripts:'outside-only'}),w=dom.window;
Object.defineProperty(w.document,'currentScript',{get:()=>w.document.querySelector('#loader')});
const added=[],append=w.document.head.appendChild.bind(w.document.head);
w.document.head.appendChild=node=>{
 const result=append(node);
 if(node.tagName==='SCRIPT'){
  added.push(node.src);queueMicrotask(()=>node.dispatchEvent(new w.Event('load')));
 }
 return result;
};
w.eval(readFileSync('dist/assets/js/perf-loader.js','utf8'));
const expected=assetVersion(readFileSync('dist/assets/js/profile-social.bundle.js'));
assert.equal(w.BrainiFeatureVersions['profile-social.bundle.js'],expected,'manifest follows exact minified bytes');
assert.equal(w.BrainiFeatureVersions['shell.bundle.js'],undefined,'no digest cycle');
assert.equal(w.BrainiFeatureVersions['perf-loader.js'],undefined);
await w.BrainiPerf.loadFeature('profile-social.bundle.js');
const first=new URL(added[0]);
assert.equal(first.pathname,'/assets/js/profile-social.bundle.js');assert.equal(first.searchParams.get('v'),expected);
await w.BrainiPerf.loadFeature('profile-social.bundle.js');assert.equal(added.length,1,'repeat load reuses completed script');
await w.BrainiPerf.loadFeature('profile-social.bundle.js?v=37&mode=friends#members');
const stale=new URL(added[1]);
assert.equal(stale.searchParams.get('v'),expected,'old cached version is replaced');
assert.equal(stale.searchParams.getAll('v').length,1);assert.equal(stale.searchParams.get('mode'),'friends');assert.equal(stale.hash,'#members');

// Static Learn pages bootstrap cloud lazily. A year-cached legacy URL must not
// bypass the current cloud renderer after an otherwise successful deployment.
const cloudExpected=assetVersion(readFileSync('dist/assets/js/cloud.bundle.js'));
assert.equal(w.BrainiFeatureVersions['cloud.bundle.js'],cloudExpected);
const oldCloud=w.document.createElement('script');oldCloud.src='/assets/js/cloud.bundle.js?v=41.54.0';oldCloud.dataset.loaded='1';append(oldCloud);
w.supabase={createClient(){}};let cloudReady=0;
w.addEventListener('brainilab:cloudready',()=>cloudReady++);
const beforeCloud=added.length;
await Promise.all([w.BrainiPerf.ensureCloud(),w.BrainiPerf.ensureCloud()]);
assert.equal(added.length,beforeCloud+1,'one new cloud load, even when the stale URL is present');
const loadedCloud=new URL(added.at(-1));
assert.equal(loadedCloud.pathname,'/assets/js/cloud.bundle.js');
assert.equal(loadedCloud.searchParams.get('v'),cloudExpected,'cloud uses the exact current published bytes');
assert.equal(cloudReady,1,'concurrent requests share one completed bootstrap');
await w.BrainiPerf.ensureCloud();assert.equal(added.length,beforeCloud+1);
delete w.BrainiFeatureVersions;
await w.BrainiPerf.loadFeature('legacy.js?v=legacy&mode=test');
assert.equal(new URL(added.at(-1)).searchParams.get('v'),'legacy','source/local fallback keeps explicit version');
await w.BrainiPerf.loadFeature('legacy-other.js');
assert.equal(new URL(added.at(-1)).searchParams.get('v'),'37','unbuilt legacy entry still loads');
dom.window.close();
console.log('PASS lazy feature cache: exact published-byte digest, cloud bootstrap replaces year-cached legacy URLs, concurrent reuse, query/hash preservation and legacy source fallback.');
