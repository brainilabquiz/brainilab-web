import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const dom=new JSDOM(readFileSync('admin/index.html','utf8'),{url:'https://brainilabgames.com/admin/',runScripts:'outside-only'}),w=dom.window;
w.eval(readFileSync('assets/js/admin.js','utf8').replace('document.addEventListener("DOMContentLoaded",boot);',''));
let requests=[],resolveAdd;
const admin=w.BrainiAdmin;admin.state.admin={role:'owner',permissions:['dashboard','daily','questions','content','rankings']};
admin.state.sb={rpc:async(name,args)=>{
 requests.push({name,args});
 if(name==='admin_add_brainiword_word')return new Promise(resolve=>resolveAdd=()=>resolve({data:{}}));
 if(name==='admin_get_content_pools')return {data:{brainiword:{rows:[]}}};
 if(name==='admin_content_health_overview')return {data:{rows:[]}};
 if(name==='admin_get_daily_health')return {data:{exists:true,healthy:true,date:'2026-10-02',daily_number:35,status:'ready',game_health:[{game_id:'connections',role:'Main Daily',count:3,expected:3,ready:true},{game_id:'numberroute',role:'Optional extra',count:3,expected:3,ready:true},{game_id:'sequence',role:'Optional extra',count:10,expected:10,ready:true}],daily_rules:{rules_version:'daily-choice-v1'}}};
 if(name.includes('rankings'))return {data:{rows:[],total_players:0}};
 if(name==='admin_list_questions')return {data:{rows:[],total:0}};
 return {data:[]};
}};
async function settle(){for(let i=0;i<40;i++){await new Promise(resolve=>setTimeout(resolve,2));if(!admin.state.rendering)break;}}
await admin.navigate('content');await settle();
assert.equal(w.document.querySelector('.admin-import-library').open,false);
w.document.querySelector('[data-pool=mathrush]').click();assert.ok(w.document.querySelector('#poolHealthSort').closest('.admin-toolbar').hidden);
w.document.querySelector('[data-pool=brainiword]').click();assert.equal(w.document.querySelector('#poolHealthSort').closest('.admin-toolbar').hidden,false);
w.document.querySelector('#newBrainiWord').value='CRANE';w.document.querySelector('#addBrainiWord').click();w.document.querySelector('#addBrainiWord').click();
assert.equal(requests.filter(r=>r.name==='admin_add_brainiword_word').length,1,'double-click submits one mutation');resolveAdd();await settle();
admin.navigate('rankings');await settle();
assert.equal(w.document.querySelectorAll('#aRankGame option').length,18,'all 17 active games available');
assert.equal(w.document.querySelector('#aRankCountry').disabled,true);
w.document.querySelector('#aRankMetric').value='streak';w.document.querySelector('#aRankMetric').dispatchEvent(new w.Event('change'));
assert.equal(w.document.querySelector('#aRankGame').disabled,true);assert.equal(w.document.querySelector('#aRankPeriod').disabled,true);
assert.ok(!w.document.querySelector('#adminContent').textContent.includes('Could not load'));
await admin.navigate('daily');await settle();
for(const title of ['Brain Mix','BrainiWord','Order Up','Topic Rush']){
 const heading=[...w.document.querySelectorAll('#dailyHealthBody h2')].find(e=>e.textContent===title);
 assert.ok(heading?.closest('[hidden]'),title+' must not be visible outside the selected Daily');
}
assert.equal(w.document.querySelectorAll('[data-daily-pool]').length,3);
w.document.querySelector('[data-daily-pool="numberroute"]').click();await settle();
assert.equal(admin.state.poolTab,'numberroute');assert.ok(w.document.querySelector('[data-pool="numberroute"]').classList.contains('active'));
dom.window.close();console.log('PASS: compact imports, pool controls, duplicate submits, ranking filters, scheduled Daily panels and working pool shortcuts.');
