import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<main id="root"></main>',{url:'https://brainilabgames.com/admin/'}),root=dom.window.document.getElementById('root');
globalThis.window=dom.window;globalThis.document=dom.window.document;globalThis.FormData=dom.window.FormData;
let requests=0,confirmations=0;globalThis.fetch=()=>{requests++;throw Error('No network in work-area navigation');};globalThis.confirm=()=>{confirmations++;return false;};
const {GrowthAdmin}=await import('../editor/admin-growth.js');
const opportunity={id:1,url:'https://brainilabgames.com/games/number-route/',state:'pending',revision:1,updated_at:'2026-10-01T12:00:00Z',baseline_report:'saved',proposal:{name:'Number Route',hypothesis:'Check the observed intent',pageEvidence:{value:'https://brainilabgames.com/games/number-route/',clicks:0,impressions:10,position:4},queryEvidence:[]}};
const report={id:'saved',importedAt:'2026-10-01T12:00:00Z',document:{property:'sc-domain:brainilabgames.com',availablePeriod:{start:'2026-09-01',end:'2026-09-02',timezone:'America/Los_Angeles'},filters:{searchType:'Web'},propertySummary:{clicks:0,impressions:10,ctr:0,queryRows:0,visibleQueryImpressions:0},discovery:[]}};
const data={report,reports:[{id:'saved',period:report.document.availablePeriod,filters:report.document.filters}],opportunities:[opportunity],events:[]},original=JSON.stringify(data);
let reads=0,writes=0;
await GrowthAdmin.render({root,rpc:async name=>{if(name!=='admin_get_growth_workspace'){writes++;throw Error('A separate editor changed this decision');}reads++;return structuredClone(data);}});
const surface=root.querySelector('[data-growth]'),buttons=[...root.querySelectorAll('[data-growth-area]')].filter(e=>e.tagName==='BUTTON');
const select=key=>root.querySelector(`[data-growth-area="${key}"]`).click(),panel=key=>root.querySelector(`[data-growth-area-panel="${key}"]`);
assert.equal(buttons.length,8);assert.equal(buttons.filter(b=>b.getAttribute('aria-pressed')==='true').length,1);assert.equal(panel('overview').hidden,false);
assert.equal(root.querySelectorAll('[data-growth-area-panel]:not([hidden])').length,1);
assert.ok(buttons.every(b=>b.type==='button'&&root.querySelector('#'+b.getAttribute('aria-controls'))));
const picker=root.querySelector('[data-growth-area-picker]');assert.equal(picker.labels[0].firstChild.textContent,'Work area');assert.equal(picker.options.length,8);picker.value='content';picker.dispatchEvent(new dom.window.Event('change'));assert.equal(panel('content').hidden,false);assert.equal(document.activeElement.id,'growth-area-content-title');select('overview');assert.equal(picker.value,'overview');
assert.ok([...surface.children].every(e=>e.matches('.growth-lead,[data-growth-areas],[data-growth-area-panel],[data-growth-status]')),'No unassigned legacy sections remain visible outside the selected area');
assert.ok(panel('search').contains(root.querySelector('#growth-indexing')));assert.ok(panel('play').contains(root.querySelector('[aria-labelledby="growth-measurement-title"]')));assert.ok(panel('sources').querySelector('.growth-tools-grid'));
select('decisions');assert.equal(document.activeElement.id,'growth-area-decisions-title');
const form=root.querySelector('[data-growth-form="1"]'),note=form.elements.note,details=form.closest('details');
details.open=true;note.value='A local note that has not been saved.';note.setSelectionRange(3,9);form.dispatchEvent(new dom.window.Event('input',{bubbles:true}));
select('sources');const filter=root.querySelector('[data-research-filter]');filter.value='remember this filter';filter.dispatchEvent(new dom.window.Event('input'));
select('distribution');select('decisions');
assert.equal(form,root.querySelector('[data-growth-form="1"]'));assert.equal(note.value,'A local note that has not been saved.');assert.equal(note.selectionStart,3);assert.equal(note.selectionEnd,9);assert.equal(details.open,true);
select('sources');assert.equal(root.querySelector('[data-research-filter]'),filter);assert.equal(filter.value,'remember this filter');assert.equal(confirmations,0,'Switching areas never invokes a leave-with-unsaved-changes prompt');assert.equal(GrowthAdmin.canLeave(),false);assert.equal(confirmations,1,'The existing leave guard still protects the unsaved note');
select('overview');root.querySelector('[data-workbench-open="1"]').click();assert.equal(panel('decisions').hidden,false);assert.equal(document.activeElement,root.querySelector('[data-opportunity="1"]'));assert.equal(note.value,'A local note that has not been saved.');
// Test the bridge before the independently tested SEO handlers run, including
// controls inserted by a later SEO table draw.
const seo=root.querySelector('#growth-seo-explorer'),open=document.createElement('button');open.dataset.seoOpenDecision='1';open.textContent='Open saved record';seo.append(open);
open.onclick=()=>{assert.equal(panel('decisions').hidden,false);root.querySelector('[data-opportunity="1"]').focus();};select('seo');open.click();assert.equal(document.activeElement,root.querySelector('[data-opportunity="1"]'));
const invalid=document.createElement('button');invalid.dataset.seoOpenDecision='not-an-id';seo.append(invalid);select('seo');invalid.click();assert.equal(panel('seo').hidden,false);
const keywords=document.createElement('button');keywords.dataset.seoKeywords='';seo.append(keywords);keywords.onclick=()=>assert.equal(panel('search').hidden,false);keywords.click();assert.equal(panel('search').hidden,false);
const anchor=document.createElement('a');anchor.href='#growth-search';anchor.textContent='Query/page details';seo.append(anchor);anchor.onclick=e=>{e.preventDefault();assert.equal(panel('search').hidden,false);};select('seo');anchor.click();
select('decisions');await form.onsubmit({preventDefault(){}});assert.equal(panel('decisions').hidden,false);assert.equal(note.value,'A local note that has not been saved.');assert.ok(buttons.every(b=>!b.disabled));assert.match(root.querySelector('[data-growth-status]').textContent,/changed/);
assert.equal(reads,1);assert.equal(writes,1,'Only the explicitly submitted form attempted a write');assert.equal(requests,0);assert.equal(JSON.stringify(data),original);
// A successful mutation keeps the selected work area, and a fresh Growth
// session deliberately starts again at Next moves without persistent storage.
let saved=false;
await GrowthAdmin.render({root,rpc:async name=>{if(name==='admin_update_growth_opportunity'){saved=true;return {};}return {...structuredClone(data),opportunities:[{...structuredClone(opportunity),revision:saved?2:1}]};}});
select('decisions');const savedForm=root.querySelector('[data-growth-form="1"]');savedForm.elements.note.value='Save this reviewed decision';await savedForm.onsubmit({preventDefault(){}});assert.equal(panel('decisions').hidden,false);assert.equal(root.querySelector('[data-growth-area="decisions"]').getAttribute('aria-pressed'),'true');
GrowthAdmin.reset();assert.equal(root.children.length,0);
await GrowthAdmin.render({root,rpc:async()=>({report:null,reports:[],opportunities:[],events:[]})});assert.equal(panel('overview').hidden,false);select('search');assert.ok(panel('search').querySelector('[data-growth-first-report]'));select('sources');assert.ok(panel('sources').querySelector('[data-growth-import]'));GrowthAdmin.reset();
dom.window.close();
console.log('PASS Growth work areas: eight reachable areas, one visible region, retained form identity/selection/notes/filters, working cross-area decision and search shortcuts, preserved save/leave guards, selected area after save, empty report and no navigation requests or writes.');
