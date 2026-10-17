import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=resolve(process.env.SDK_SOURCE_ROOT||'.');
const source=readFileSync(resolve(sourceRoot,'assets/js/perf-loader.js'),'utf8');
const sdkUrl='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const summary=[];

function fixture(){
  const dom=new JSDOM('<script id="loader" src="/assets/js/perf-loader.js?v=current"></script><button class="avatar">Account</button>',{
    url:'https://brainilabgames.com/learn/',runScripts:'outside-only'
  });
  const w=dom.window,requests=[],warnings=[];
  Object.defineProperty(w.document,'currentScript',{get:()=>w.document.querySelector('#loader')});
  const append=w.document.head.appendChild.bind(w.document.head);
  w.document.head.appendChild=node=>{
    const result=append(node);
    if(node.tagName==='SCRIPT')requests.push(node);
    return result;
  };
  w.console.warn=(...args)=>warnings.push(args.join(' '));
  w.BrainiFeatureVersions=Object.freeze({'cloud.bundle.js':'fixture-current-cloud'});
  w.eval(source);
  const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
  const fail=node=>node.dispatchEvent(new w.Event('error'));
  const loaded=(node,kind)=>{
    if(kind==='sdk')w.supabase={createClient(){throw Error('This fixture must not create a client');}};
    if(kind==='cloud'){
      w.BrainiBackendAuth={};
      w.BrainiAuth={};
    }
    node.dispatchEvent(new w.Event('load'));
  };
  const settle=promise=>Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(Error('Loader remained pending after a completed script event')),200))
  ]);
  return {dom,w,requests,warnings,tick,fail,loaded,settle};
}

// A pointer interaction and multiple account consumers share one failed attempt.
// Every ensureCloud caller must receive false, with no automatic request loop.
{
  const f=fixture();
  try{
    const player={id:'fixture-player',xp:3015,score:1237};
    f.w.BrainiData={player};
    const before=JSON.stringify(player);
    let ready=0;
    f.w.addEventListener('brainilab:cloudready',()=>ready++);
    const waiting=Array.from({length:5},()=>f.w.BrainiPerf.ensureCloud());
    const first=Promise.allSettled(waiting);
    assert.equal(f.requests.length,1,'concurrent consumers request one SDK');
    assert.equal(f.requests[0].src,sdkUrl);
    assert.equal(f.requests[0].getAttribute('crossorigin'),'anonymous');
    f.fail(f.requests[0]);
    const failed=await f.settle(first);
    assert.ok(failed.every(r=>r.status==='fulfilled'&&r.value===false),'all cloud consumers receive the same recoverable false result');
    assert.equal(f.requests[0].isConnected,false,'failed SDK tag is removed');
    assert.equal(f.warnings.length,1,'one warning per failed attempt');
    await f.tick();
    assert.equal(f.requests.length,1,'failure does not start a background retry');
    assert.equal(ready,0);

    f.w.document.querySelector('.avatar').dispatchEvent(new f.w.Event('pointerdown',{bubbles:true}));
    const recovery=Promise.all(Array.from({length:5},()=>f.w.BrainiPerf.ensureCloud()));
    assert.equal(f.requests.length,2,'explicit next interaction makes one fresh SDK request');
    f.loaded(f.requests[1],'sdk');
    await f.tick();
    assert.equal(f.requests.length,3,'cloud loads only after the SDK succeeds');
    const cloud=new URL(f.requests[2].src);
    assert.equal(cloud.origin,'https://brainilabgames.com');
    assert.equal(cloud.pathname,'/assets/js/cloud.bundle.js');
    assert.equal(cloud.searchParams.get('v'),f.w.BrainiFeatureVersions['cloud.bundle.js']);
    f.loaded(f.requests[2],'cloud');
    assert.ok((await f.settle(recovery)).every(Boolean));
    assert.equal(ready,1,'one ready event after shared successful bootstrap');
    assert.equal(await f.w.BrainiPerf.ensureCloud(),true);
    assert.equal(f.requests.length,3,'successful client readiness is reused');
    assert.equal(JSON.stringify(player),before,'player XP and scores are untouched');
    summary.push({scenario:'concurrent SDK failure then explicit account retry',sdkRequests:2,cloudRequests:1,readyEvents:ready,playerWrites:0});
  }finally{f.dom.window.close();}
}

// Direct SDK callers retain the existing rejection contract and can retry.
{
  const f=fixture();
  try{
    const first=f.w.BrainiPerf.ensureSupabase(),same=f.w.BrainiPerf.ensureSupabase();
    assert.equal(first,same,'one shared pending SDK promise');
    const rejection=assert.rejects(first,/Could not load/);
    f.fail(f.requests[0]);
    await f.settle(rejection);
    const retry=f.w.BrainiPerf.ensureSupabase('https://untrusted.invalid/other-sdk.js');
    assert.equal(f.requests.length,2);
    assert.ok(f.requests.every(node=>node.src===sdkUrl),'the fixed existing SDK URL is the only remote script requested');
    f.loaded(f.requests[1],'sdk');
    await f.settle(retry);
    await f.w.BrainiPerf.ensureSupabase();
    assert.equal(f.requests.length,2);
    summary.push({scenario:'direct SDK caller rejects then retries',sdkRequests:2,arbitraryScriptRequests:0});
  }finally{f.dom.window.close();}
}

// Cloud transport can fail after the SDK is available. Recovery reuses that SDK,
// never creates a second client or changes any session/auth APIs.
{
  const f=fixture();
  try{
    f.w.supabase={createClient(){throw Error('No client creation expected');}};
    const first=Promise.allSettled([f.w.BrainiPerf.ensureCloud(),f.w.BrainiPerf.ensureCloud()]);
    await f.tick();
    assert.equal(f.requests.length,1);
    f.fail(f.requests[0]);
    assert.ok((await f.settle(first)).every(r=>r.status==='fulfilled'&&r.value===false));
    const retry=Promise.all([f.w.BrainiPerf.ensureCloud(),f.w.BrainiPerf.ensureCloud()]);
    await f.tick();
    assert.equal(f.requests.length,2);
    assert.ok(f.requests.every(node=>new URL(node.src).pathname==='/assets/js/cloud.bundle.js'));
    f.loaded(f.requests[1],'cloud');
    assert.ok((await f.settle(retry)).every(Boolean));
    summary.push({scenario:'cloud failure after existing SDK',sdkRequests:0,cloudRequests:2});
  }finally{f.dom.window.close();}
}

console.log('PASS SDK retry: '+JSON.stringify(summary));
