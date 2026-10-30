import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {GrowthAdmin} from '../editor/admin-growth.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom'),dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/#growth'}),d=dom.window.document;
globalThis.document=d;globalThis.Event=dom.window.Event;globalThis.FormData=dom.window.FormData;globalThis.confirm=()=>false;
const at='2026-10-20T20:00:00Z',url='https://brainilabgames.com/games/number-route/';
const records=['pending','approved','published','monitoring','dismissed'].map((state,i)=>({id:i+1,url,state,revision:3,updated_at:at,baseline_report:'original',published_at:['published','monitoring'].includes(state)?at:null,change_reference:null,proposal:{name:'Recorded page',pageEvidence:{value:url,clicks:0,impressions:10},queryEvidence:[]}}));
const report={id:'saved',importedAt:at,document:{property:'sc-domain:brainilabgames.com',availablePeriod:{start:'2026-10-01',end:'2026-10-14',timezone:'America/Los_Angeles'},filters:{searchType:'Web'},opportunities:[],seoExplorer:{schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages:[{url,finalUrl:url,status:200,trust:100,checks:{},checkedAt:at}],sources:[],backlinks:[]}}};
const workspace={report,reports:[{id:'original',period:report.document.availablePeriod,filters:report.document.filters}],opportunities:records,events:[]},original=JSON.stringify(workspace),root=d.querySelector('main');let reads=0,writes=0,requests=0;globalThis.fetch=()=>{requests++;throw Error('No network');};
await GrowthAdmin.render({root,rpc:async name=>{if(name!=='admin_get_growth_workspace'){writes++;throw Error('No writes');}reads++;return structuredClone(workspace);}});
root.querySelector('[data-growth-area="seo"]').click();root.querySelector('[data-seo-view="review"]').click();const select=root.querySelector('[data-seo-selected-page]');select.value=url;select.dispatchEvent(new Event('change'));
for(const record of records){
 const card=root.querySelector('[data-opportunity="'+record.id+'"]'),sections=card.querySelectorAll(':scope > details'),note=card.querySelector('textarea');note.value='Keep this unsaved note';note.setSelectionRange(2,8);
 // Preserve the opposite disclosure if the user had already opened it.
 const followup=['published','monitoring'].includes(record.state),target=sections[followup?1:0],other=sections[followup?0:1];other.open=true;target.open=false;
 const filter=root.querySelector('[data-growth-filter]');filter.value=record.state==='pending'?'published':'pending';filter.dispatchEvent(new Event('change'));assert.equal(card.hidden,true);
 root.querySelector('[data-growth-area="seo"]').click();root.querySelector('.growth-page-review [data-seo-open-decision="'+record.id+'"]').click();
 assert.equal(root.querySelector('[data-growth-active-area]').dataset.growthActiveArea,'decisions');assert.equal(d.activeElement,card);assert.equal(target.open,true,record.state);assert.equal(other.open,true);assert.equal(card.hidden,false);assert.equal(filter.value,'all');assert.equal(note.value,'Keep this unsaved note');assert.equal(note.selectionStart,2);assert.equal(note.selectionEnd,8);assert.equal(card.querySelector('[data-growth-form]').elements.state.value,record.state,'Opening never changes the recorded state');
}
// Invalid or ambiguous loaded records cannot authorize opening another card.
GrowthAdmin.reset();const duplicate=structuredClone(workspace);duplicate.opportunities[1].id=duplicate.opportunities[0].id;
await GrowthAdmin.render({root,rpc:async()=>structuredClone(duplicate)});root.querySelector('[data-growth-area="seo"]').click();root.querySelector('[data-seo-view="review"]').click();const chosen=root.querySelector('[data-seo-selected-page]');chosen.value=url;chosen.dispatchEvent(new Event('change'));assert.equal(root.querySelector('.growth-page-review [data-seo-open-decision]'),null);
assert.equal(writes,0);assert.equal(requests,0);assert.equal(reads,1);assert.equal(JSON.stringify(workspace),original);assert.equal(dom.window.location.hash,'#growth');GrowthAdmin.reset();dom.window.close();
console.log('PASS recorded decision opening: loaded states reveal proposal or follow-up, protected decisions remain unchanged, other disclosures/unsaved selection retained, hidden-card navigation, invalid-ID guard and zero writes or requests.');
