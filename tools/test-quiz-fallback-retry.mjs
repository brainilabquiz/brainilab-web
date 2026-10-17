import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {assetVersion} from '../lib/asset-versions.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.QUIZ_SOURCE_ROOT||'.';
const source=file=>readFileSync(path.join(sourceRoot,'assets/js',file),'utf8');
const packSource=source('quiz-packs.js'),version=assetVersion(Buffer.from(packSource));
const outcomes=[];

async function check(kinds,useLoader){
 const dom=new JSDOM('<script id="loader" src="/assets/js/perf-loader.js?v=current"></script>',{url:'https://brainilabgames.com/science/science-quiz/',runScripts:'outside-only'}),w=dom.window;
 Object.defineProperty(w.document,'currentScript',{get:()=>w.document.getElementById('loader')});
 w.BrainiBackendAuth={isConfigured:()=>false};
 w.BrainiData={dailyNumberForDate:()=>50};
 w.console.error=()=>{};w.console.warn=()=>{};
 let recovered=false;
 const requested=[],append=w.document.head.appendChild.bind(w.document.head);
 w.document.head.appendChild=node=>{
  const result=append(node);
  if(node.tagName==='SCRIPT'){
   requested.push(node.src);
   setTimeout(()=>{
    if(!recovered)node.dispatchEvent(new w.Event('error'));
    else{w.eval(packSource);node.dispatchEvent(new w.Event('load'));}
   },0);
  }
  return result;
 };
 if(useLoader){
  w.eval(source('perf-loader.js'));
  w.BrainiFeatureVersions={'quiz-packs.js':version};
 }
 for(const kind of kinds)w.eval(source('supabase-'+kind+'.js'));
 const load=kind=>kind==='content'?w.BrainiContent.loadQuizPack('science','medium',1):w.BrainiDaily.retryToday();
 const initial=await Promise.allSettled(kinds.map(load));
 assert.ok(initial.every(result=>result.status==='rejected'),'the first script transport failure is reported');
 assert.equal(requested.length,1,'concurrent fallback readers share one script request');
 assert.equal(w.document.querySelector('script[src*="quiz-packs.js"]'),null,'failed script is removed before retry');
 recovered=true;
 const retry=await Promise.all(kinds.flatMap(kind=>[load(kind),load(kind)]));
 assert.equal(requested.length,2,'the retry issues one fresh request, shared by concurrent readers');
 for(const [i,kind] of kinds.entries()){
  for(const result of retry.slice(i*2,i*2+2)){
   assert.equal(result.source,'local');
   assert.equal(result.questions.length,kind==='content'?20:10);
   assert.ok(result.questions.every(q=>q.q&&q.a.length===4&&Number.isInteger(q.c)),'real fallback question/answer contracts are unchanged');
  }
 }
 const questionsBefore=JSON.stringify(retry.map(result=>result.questions));
 const repeated=await Promise.all(kinds.flatMap(kind=>[load(kind),load(kind)]));
 assert.equal(requested.length,2,'loaded fallback is reused');
 assert.equal(JSON.stringify(repeated.map(result=>result.questions)),questionsBefore,'repeat loading preserves selection and seeded Daily order');
 const url=new URL(requested[1]);
 assert.equal(url.pathname,'/assets/js/quiz-packs.js');
 if(useLoader)assert.equal(url.searchParams.get('v'),version,'fallback URL follows the exact current content hash');
 outcomes.push({kinds,useLoader,requests:requested.length,questionCounts:retry.map(result=>result.questions.length)});
 w.close();
}
for(const kinds of [['content'],['daily'],['content','daily']])await check(kinds,true);
for(const kinds of [['content'],['daily']])await check(kinds,false);
console.log(JSON.stringify(outcomes));
console.log('PASS quiz fallback: reported failure, fresh concurrent retry, hashed transport, real question contracts, stable Daily order and standalone fallback.');
