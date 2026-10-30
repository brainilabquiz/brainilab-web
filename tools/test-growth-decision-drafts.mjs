import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<main id="root"></main>',{url:'https://brainilabgames.com/admin/#growth'});
let prompts=0,network=0;
Object.assign(globalThis,{window:dom.window,document:dom.window.document,FormData:dom.window.FormData,confirm:()=>{prompts++;return false;},fetch:async()=>{network++;throw Error('No network');}});
const {GrowthAdmin}=await import('../editor/admin-growth.js');
const root=document.getElementById('root'),url='https://brainilabgames.com/games/number-route/';
const report={id:'original',document:{property:'sc-domain:brainilabgames.com',availablePeriod:{start:'2026-09-01',end:'2026-09-02',timezone:'America/Los_Angeles'},filters:{searchType:'Web'}}};
const data={report,reports:[{id:'original',period:report.document.availablePeriod,filters:report.document.filters}],events:[],opportunities:[
 {id:1,url,state:'published',revision:4,baseline_report:'original',published_at:'2026-10-01T12:00:00Z',change_reference:'https://github.com/brainilabquiz/brainilab-web/pull/1',proposal:{name:'Number Route'}},
 {id:2,url:'https://brainilabgames.com/games/math-rush/',state:'pending',revision:7,baseline_report:'original',proposal:{name:'Math Rush'}}
]},original=JSON.stringify(data),form=id=>root.querySelector(`[data-growth-form="${id}"]`);
const edit=(f,text)=>{f.closest('details').open=true;f.elements.note.value=text;f.elements.note.setSelectionRange(3,9);f.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
const submit=f=>f.onsubmit({preventDefault(){}});
const setup=async(mode='normal')=>{
 GrowthAdmin.reset();let saved=new Map(),calls=[],reads=0;
 await GrowthAdmin.render({root,rpc:async(name,args)=>{
  if(name==='admin_get_growth_workspace'){
   reads++;if(mode==='reload-fails'&&saved.size)throw Error('Local reload unavailable');
   const loaded=structuredClone(data);
   for(const o of loaded.opportunities)if(saved.has(o.id)){o.revision++;o.state=saved.get(o.id).p_state;}
   if(saved.size&&mode==='concurrent'){loaded.opportunities[1].revision++;loaded.opportunities[1].state='dismissed';}
   if(saved.size&&mode==='removed')loaded.opportunities.pop();
   return loaded;
  }
  calls.push({name,args});assert.equal(name,'admin_update_growth_opportunity');
  if(mode==='save-fails')throw Error('Local revision conflict');
  saved.set(args.p_id,args);return {};
 }});
 root.querySelector('[data-growth-area="decisions"]').click();
 edit(form(1),'First reviewed local note');edit(form(2),'Second unsaved local note');
 form(2).elements.state.value='approved';form(2).elements.reference.value='https://brainilabgames.com/games/math-rush/';
 return {calls,reads:()=>reads,other:form(2)};
};
let run=await setup();await submit(form(1));
assert.equal(form(2),run.other);assert.equal(form(2).elements.note.value,'Second unsaved local note');
assert.equal(form(2).elements.reference.value,data.opportunities[1].url);assert.equal(form(2).elements.state.value,'approved');
assert.equal(form(2).closest('details').open,true);assert.equal(form(2).elements.note.selectionStart,3);assert.equal(form(2).elements.note.selectionEnd,9);
assert.equal(form(2).elements.note.disabled,false);assert.equal(form(2).elements.state.disabled,false);
assert.equal(GrowthAdmin.canLeave(),false);assert.equal(root.querySelector('[data-growth]').dataset.growthActiveArea,'decisions');
assert.match(root.querySelector('[data-growth-status]').textContent,/Other unsaved decisions were kept/);
const importer=root.querySelector('[data-growth-import]');Object.defineProperty(importer.elements.report,'files',{value:[{size:2,text:async()=>'{}'}]});
await importer.onsubmit({target:importer,preventDefault(){}});assert.equal(run.calls.length,1);assert.match(root.querySelector('[data-growth-status]').textContent,/Save your decision/);
await submit(form(2));assert.equal(run.calls.length,2);assert.equal(run.calls[1].args.p_revision,7);assert.equal(run.calls[1].args.p_state,'approved');
assert.equal(GrowthAdmin.canLeave(),true);assert.equal(run.reads(),3);

for(const mode of ['save-fails','reload-fails']){
 run=await setup(mode);await submit(form(1));assert.equal(form(2),run.other);assert.equal(form(2).elements.note.value,'Second unsaved local note');assert.equal(GrowthAdmin.canLeave(),false);
 assert.equal(run.calls.length,1);assert.match(root.querySelector('[data-growth-status]').textContent,mode==='save-fails'?/revision conflict/:/Saved, but/);
}
for(const mode of ['concurrent','removed']){
 run=await setup(mode);await submit(form(1));assert.equal(form(2),run.other);assert.equal(form(2).elements.note.value,'Second unsaved local note');
 assert.equal(form(2).dataset.growthRevision,'7');assert.ok(root.querySelector('[data-growth-draft-warning]'));assert.equal(GrowthAdmin.canLeave(),false);
 await submit(form(2));assert.equal(run.calls.length,1,'A kept draft cannot submit against another revision or recreate a missing record');assert.match(root.querySelector('[data-growth-status]').textContent,/draft is preserved/);
 if(mode==='concurrent')assert.equal(root.querySelector('[data-opportunity="2"] [data-state]').dataset.state,'dismissed');
}
GrowthAdmin.reset();await GrowthAdmin.render({root,rpc:async()=>({report:null,reports:[],opportunities:[],events:[]})});
assert.equal(root.querySelector('[data-growth-form]'),null);assert.equal(GrowthAdmin.canLeave(),true);assert.equal(network,0);assert.equal(JSON.stringify(data),original);assert.equal(dom.window.location.hash,'#growth');assert.ok(prompts>=5);
GrowthAdmin.reset();dom.window.close();
console.log('PASS decision drafts: another acknowledged save retains mounted fields, selection and leave/import guards; failures preserve drafts; concurrent or missing records cannot adopt or submit an old revision; reset isolates sessions and no network or fixture mutation occurs.');
