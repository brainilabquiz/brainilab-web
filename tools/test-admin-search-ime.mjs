import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const dom=new JSDOM(readFileSync('admin/index.html','utf8'),{url:'https://brainilabgames.com/admin/',runScripts:'outside-only'}),w=dom.window,d=w.document;
w.eval(readFileSync('assets/js/admin.js','utf8').replace('document.addEventListener("DOMContentLoaded",boot);',''));
const app=w.BrainiAdmin,calls=[];
const pack={pack_id:'fixture-pack',title:'Fixture pack',topic_name:'General knowledge',topic_slug:'general-knowledge',difficulty:'easy',status:'draft',set_number:1,version:1,questions:[{position:1,question_version_id:'fixture-question',prompt:'Fixture question',topic_slug:'general-knowledge',difficulty:'easy'}]};
app.state.admin={role:'owner',permissions:['questions','content']};app.state.topics=[{slug:'general-knowledge',name:'General knowledge'}];
app.state.sb={async rpc(name,args){
 calls.push({name,args});
 if(name==='admin_list_questions')return{data:{rows:[],total:0}};
 if(name==='admin_question_quality_overview'||name==='admin_content_health_overview')return{data:{rows:[]}};
 if(name==='admin_list_quiz_packs')return{data:[pack]};
 if(name==='admin_get_quiz_pack')return{data:pack};
 throw Error('Unexpected operation: '+name);
}};
const settle=async check=>{for(let n=0;n<40;n++){if(check())return;await new Promise(r=>setTimeout(r,2));}assert.fail('Expected admin search state was not rendered');};
const reads=()=>calls.filter(c=>c.name==='admin_list_questions');
async function checkSearch(input,button){
 const start=reads().length;input.value='地理';
 input.dispatchEvent(new w.CompositionEvent('compositionstart',{bubbles:true}));
 for(const options of [{isComposing:true,keyCode:13},{isComposing:false,keyCode:229}]){
  const e=new w.KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true,cancelable:true,...options});
  input.dispatchEvent(e);await new Promise(r=>setTimeout(r,0));
  assert.equal(reads().length,start,'Confirming an IME candidate must not run a search');
  assert.equal(input.value,'地理','Composition text must remain intact');assert.equal(e.defaultPrevented,false,'The composing key is left to the input method');
 }
 input.dispatchEvent(new w.CompositionEvent('compositionend',{data:'地理',bubbles:true}));
 const enter=new w.KeyboardEvent('keydown',{key:'Enter',code:'Enter',keyCode:13,bubbles:true,cancelable:true});input.dispatchEvent(enter);
 await settle(()=>reads().length===start+1);assert.equal(enter.defaultPrevented,true);assert.equal(reads().at(-1).args.p_search,'地理');
 button.click();await settle(()=>reads().length===start+2);assert.equal(reads().at(-1).args.p_search,'地理','The explicit Search/Filter button stays available');
}
await app.navigate('questions');await settle(()=>!app.state.rendering&&d.querySelector('#qSearch'));
await checkSearch(d.querySelector('#qSearch'),d.querySelector('#qFilter'));
d.querySelector('#qPacks').click();await settle(()=>d.querySelector('[data-pack="fixture-pack"]'));
d.querySelector('[data-pack="fixture-pack"]').click();await settle(()=>d.querySelector('[data-pack-replace="1"]'));
d.querySelector('[data-pack-replace="1"]').click();await settle(()=>d.querySelector('#packCandidateSearch')&&reads().at(-1).args.p_limit===100);
await checkSearch(d.querySelector('#packCandidateSearch'),d.querySelector('#loadPackCandidates'));
assert(calls.every(c=>/^admin_(?:list_|get_|question_quality_overview$|content_health_overview$)/.test(c.name)),'Only mocked read operations are exercised');
dom.window.close();console.log('PASS admin search: IME confirmation and Safari keyCode 229 retain text without requests; committed Enter and explicit buttons search exactly once in both question and pack-candidate views. No writes.');
