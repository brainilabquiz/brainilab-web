import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {unassignedFixture} from './fixtures/growth-unassigned.mjs';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom'),dom=new JSDOM('<main id="root"></main>',{url:'https://brainilabgames.com/admin/#growth'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,FormData:dom.window.FormData,Event:dom.window.Event,confirm:()=>false});
const {GrowthAdmin}=await import('../editor/admin-growth.js'),root=document.getElementById('root'),f=unassignedFixture(2),url=f.report.seoExplorer.pages[0].url,other=f.report.seoExplorer.pages[1].url;
const data={report:{id:'original',document:f.report},reports:[],opportunities:f.workspace.opportunities.map(o=>({...o,baseline_report:'original',proposal:{name:'Recorded decision'}})),events:[]},original=JSON.stringify(data);
const html='<title>Captured public title</title><main><h1>Captured public title</h1><p>Public content.</p></main>';
const response=()=>{const r=new Response(html,{headers:{'Content-Type':'text/html;charset=utf-8'}});Object.defineProperty(r,'url',{value:url});return r;};
const pause=()=>new Promise(r=>setTimeout(r,15));
const show=(target=url)=>{root.querySelector('[data-growth-area="seo"]').click();root.querySelector('[data-seo-view="review"]').click();const p=root.querySelector('[data-seo-selected-page]');p.value=target;p.dispatchEvent(new Event('change'));};
const status=()=>root.querySelector('[data-seo-current-status]').textContent,check=()=>root.querySelector('[data-seo-check-current]');
let requests,updates,imports,resolve,blob;
globalThis.URL.createObjectURL=b=>{blob=b;return 'blob:local-session';};globalThis.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){};
async function setup(mode='ready'){
 GrowthAdmin.reset();requests=updates=imports=0;resolve=null;let loaded=structuredClone(data);
 globalThis.fetch=async(target,options)=>{requests++;assert.equal(target,url);assert.equal(options.credentials,'omit');if(mode==='failed')throw Error('Private backend detail');if(mode==='pending')return new Promise(r=>resolve=()=>r(response()));return response();};
 await GrowthAdmin.render({root,rpc:async(name,args)=>{
  if(name==='admin_get_growth_workspace')return structuredClone(loaded);
  if(name==='admin_update_growth_opportunity'){updates++;assert.equal(args.p_revision,loaded.opportunities[0].revision);loaded.opportunities[0].revision++;return {};}
  assert.equal(name,'admin_import_growth_report');imports++;loaded.report.id='imported';return {};
 }});
}
async function save(){root.querySelector('[data-growth-area="decisions"]').click();const form=root.querySelector('[data-growth-form="10"]');form.elements.note.value='Explicit local QA save';form.dispatchEvent(new Event('input',{bubbles:true}));await form.onsubmit({preventDefault(){}});}
async function csv(){root.querySelector('[data-seo-export]').click();return blob.text();}

await setup();show();assert.equal(requests,0);check().click();await pause();const captured=status(),firstCSV=await csv();assert.match(captured,/Public HTML checked/);
await save();show();assert.equal(status(),captured);assert.equal(check().disabled,true);check().click();assert.equal(requests,1);assert.equal(await csv(),firstCSV);assert.equal(updates,1);
root.querySelector('[data-growth-area="sources"]').click();const importer=root.querySelector('[data-growth-import]');Object.defineProperty(importer.elements.report,'files',{value:[{size:2,text:async()=>'{}'}]});await importer.onsubmit({target:importer,preventDefault(){}});
show();assert.equal(status(),captured);assert.equal(requests,1);assert.equal(imports,1);assert.equal(check().disabled,true);

await setup('failed');show();check().click();await pause();const failed=status();assert.match(failed,/could not be read/);assert.doesNotMatch(failed,/Private backend/);
await save();show();assert.equal(status(),failed);check().click();assert.equal(requests,1,'A cached failure is not retried by a save or another click');

await setup('pending');show();check().click();assert.equal(requests,1);await save();show();assert.match(status(),/Reading/);assert.equal(check().disabled,true);resolve();await pause();assert.match(status(),/Public HTML checked/);assert.equal(check().disabled,true);assert.equal(requests,1,'The active replacement panel receives the in-flight result');

await setup('pending');show();check().click();await save();show(other);const chosen=root.querySelector('[data-seo-selected-page]');chosen.focus();resolve();await pause();assert.match(status(),/Not checked/);assert.equal(document.activeElement,chosen);show();assert.match(status(),/Public HTML checked/);assert.equal(requests,1);

await setup('pending');show();check().click();const reopeningResult=resolve,oldChoice=root.querySelector('[data-seo-selected-page]');oldChoice.focus();let deliverWorkspace;
const reopening=GrowthAdmin.render({root,rpc:()=>new Promise(r=>deliverWorkspace=r)});reopeningResult();await pause();assert.equal(document.activeElement,oldChoice,'A previous response cannot take focus while a new workspace is loading');deliverWorkspace(structuredClone(data));await reopening;show();assert.match(status(),/Not checked/);assert.equal(check().disabled,false);

await setup('pending');show();check().click();const oldResult=resolve;GrowthAdmin.reset();await GrowthAdmin.render({root,rpc:async()=>structuredClone(data)});show();const freshStatus=status(),focus=document.activeElement;oldResult();await pause();assert.equal(status(),freshStatus);assert.equal(check().disabled,false);assert.equal(document.activeElement,focus,'A previous Growth session cannot focus the new one');
globalThis.fetch=async()=>{requests++;return response();};check().click();await pause();assert.equal(requests,2,'A fresh workspace needs a new explicit check');assert.match(status(),/Public HTML checked/);
assert.equal(JSON.stringify(data),original);assert.equal(dom.window.location.hash,'#growth');GrowthAdmin.reset();dom.window.close();
console.log('PASS public-check session: ready/failed/in-flight evidence survives explicit save/import with original CSV/date, no duplicate read; active binding and URL receive only their response; reset isolates pending/completed observations and no automatic request or original-data mutation occurs.');
