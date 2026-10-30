import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {seoHTML,bindSEO} from '../editor/growth-seo-explorer.js';
import {bindGrowthNavigation} from '../editor/growth-navigation.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom'),dom=new JSDOM('<main></main>',{url:'https://brainilabgames.com/admin/#growth'}),d=dom.window.document;
globalThis.document=d;let requests=0;globalThis.fetch=()=>{requests++;throw Error('Saved-list review must not fetch');};
let downloaded=null,filename='';globalThis.URL.createObjectURL=blob=>{downloaded=blob;return 'blob:local-review';};globalThis.URL.revokeObjectURL=()=>{};dom.window.HTMLAnchorElement.prototype.click=function(){filename=this.download;};
const at='2026-10-20T20:00:00Z',own=i=>'https://brainilabgames.com/learn/p-'+String(i).padStart(2,'0')+'/',checks={https:true,available:true,title:true,description:true,heading:true,canonical:true,indexable:true,structuredData:true};
const pages=Array.from({length:61},(_,i)=>({url:own(i),finalUrl:own(i),status:200,trust:100,checks:{...checks},checkedAt:at})),sources=pages.map((_,i)=>({url:'https://source-'+i+'.example/game/',state:'verified',status:200,checkedAt:at}));
const backlinks=sources.map((s,i)=>({sourceUrl:s.url,targetUrl:own(i%3),anchor:'Recorded link',rel:[],firstVerifiedAt:at,verifiedAt:at}));
const rows=pages.map((p,i)=>({query:'observed phrase '+i,path:new URL(p.url).pathname,clicks:0,impressions:100-i,position:4}));rows.push({...rows[1],query:'another phrase',impressions:90});
const searchSources={schemaVersion:1,property:'sc-domain:brainilabgames.com',source:'google_search_console_api',dataState:'final',observedAt:at,timezone:'America/Los_Angeles',period:{start:'2026-07-20',end:'2026-10-17'},images:{searchType:'image',aggregation:'byProperty',rows:[],rowsWithheld:0},webPages:{searchType:'web',aggregation:'byPage',rows,rowsWithheld:0}};
const report={seoExplorer:{schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages,sources,backlinks,searchSources}},workspace={opportunities:[{id:1,url:own(0),state:'published',revision:4,updated_at:at}]},before=JSON.stringify({report,workspace}),root=d.querySelector('main');let release=()=>{};
const controls=['filter','state','destination-state','source','window','decision-scope','focus','play-source','page-checks'];
const values=()=>controls.map(name=>root.querySelector('[data-seo-'+name+']').value),details=()=>[...root.querySelectorAll('[data-seo-results] details')].map(x=>[x.querySelector(':scope > summary')?.textContent,x.open]);
for(const [view,setting]of [['links',['state','verified']],['destinations',null],['pages',null],['actions',['decision-scope','unassigned']],['keywords',['source','webPages']]]){
 release();root.innerHTML='<div data-growth><header class="growth-lead"></header><section class="growth-workbench"></section>'+seoHTML(report)+'<div class="growth-toolbar"></div><div class="growth-proposals"><textarea>Unsaved note</textarea></div></div>';bindSEO(root,report,workspace);release=bindGrowthNavigation(root);
 root.querySelector('[data-growth-area="seo"]').click();root.querySelector('[data-seo-view="'+view+'"]').click();
 if(setting){const control=root.querySelector('[data-seo-'+setting[0]+']');control.value=setting[1];control.dispatchEvent(new dom.window.Event('change'));}
 const filter=root.querySelector('[data-seo-filter]');filter.value='learn/p-';filter.dispatchEvent(new dom.window.Event('input'));const next=root.querySelector('[data-seo-next]');if(!next.disabled)next.click();
 const buttons=[...root.querySelectorAll('[data-seo-results] [data-seo-review-url]')];assert.ok(buttons.length,view);
 const duplicate=buttons.find(b=>buttons.filter(x=>x.dataset.seoReviewUrl===b.dataset.seoReviewUrl).length>1),group=duplicate?buttons.filter(x=>x.dataset.seoReviewUrl===duplicate.dataset.seoReviewUrl):buttons,button=group.at(-1),index=buttons.indexOf(button),target=button.dataset.seoReviewUrl;
 const disclosure=root.querySelector('[data-seo-results] details');if(disclosure)disclosure.open=true;
 const oldDetails=details(),oldValues=values(),oldPage=root.querySelector('[data-seo-page]').textContent;
 root.querySelector('[data-seo-export]').click();const oldCSV=await downloaded.text();
 button.click();assert.equal(d.activeElement.id,'growth-page-review-title');assert.ok(root.querySelector('[data-seo-return-list]'));assert.equal(root.querySelector('[data-seo-return-schema]'),null);
 root.querySelector('[data-growth-area="decisions"]').click();const note=root.querySelector('textarea');note.value='Keep this unsaved note';root.querySelector('[data-growth-area="seo"]').click();assert.equal(note.value,'Keep this unsaved note');
 root.querySelector('[data-seo-return-list]').click();assert.equal(root.querySelector('[data-seo-page]').textContent,oldPage,view);assert.deepEqual(values(),oldValues,view);assert.deepEqual(details(),oldDetails,view);
 assert.equal([...root.querySelectorAll('[data-seo-results] [data-seo-review-url]')].indexOf(d.activeElement),index,'Return to the same source/query row, even for duplicate targets');assert.equal(d.activeElement.dataset.seoReviewUrl,target);
 root.querySelector('[data-seo-export]').click();assert.equal(await downloaded.text(),oldCSV,'The complete export scope and evidence remain unchanged');assert.equal(filename,'brainilab-seo-'+view+'.csv');
 d.activeElement.click();root.querySelector('[data-seo-view="'+view+'"]').click();assert.equal(root.querySelector('[data-seo-page]').textContent,oldPage);assert.equal(d.activeElement.dataset.seoReviewUrl,target);
 if(view==='actions')assert.ok(![...root.querySelectorAll('[data-seo-results] [data-seo-review-url]')].some(b=>b.dataset.seoReviewUrl===own(0)),'Protected decisions stay excluded');
}
root.querySelector('[data-seo-review-url]').click();root.querySelector('[data-seo-view="referrals"]').click();root.querySelector('[data-seo-view="review"]').click();assert.equal(root.querySelector('[data-seo-return-list]'),null,'A different Explorer view clears the return context');
assert.equal(dom.window.location.hash,'#growth');assert.equal(requests,0);assert.equal(JSON.stringify({report,workspace}),before);release();dom.window.close();
console.log('PASS evidence-list review return: five flows, duplicate source/query targets, exact row focus, filters/pages/disclosures, both return paths, mounted notes, unchanged complete CSV/evidence/decisions, context reset and zero requests.');
