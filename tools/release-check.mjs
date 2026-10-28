import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {healthOrigin,checkPublicPages} from '../lib/site-health.js';
import {publicJSON} from '../lib/public-json.js';
export const RELEASE_WINDOW=130000;
export const REPO='brainilabquiz/brainilab-web';
export const PREVIEW_NAME='codex/learn-render-store-oct28';
export const PREVIEW_ORIGIN='https://codex-learn-render-store-oct28-brainilab-web.brainilabquiz.workers.dev';
export async function remoteManifest(origin,fetcher=fetch){const r=await fetcher(healthOrigin(origin)+'/_release.json',{redirect:'manual',signal:AbortSignal.timeout(10000)});if(r.status!==200)throw Error('Release manifest unavailable');const m=await publicJSON(r,2048);if(m.schemaVersion!==1||!/^[0-9a-f]{40}$/.test(m.commit)||!/^[0-9a-f]{64}$/.test(m.runtimeHash))throw Error('Invalid release manifest');return m;}
export async function verifyRelease(origin,expected,{fetcher=fetch,clock=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),onResult=()=>{}}={}){
 const start=clock(),results=[];
 for(const deadline of [0,65000,RELEASE_WINDOW]){
  const delay=start+deadline-clock();if(delay>0)await sleep(delay);
  const m=await remoteManifest(origin,fetcher);if(m.runtimeHash!==expected.runtimeHash||expected.commit&&m.commit!==expected.commit)throw Error('Preview build does not match release');
  const result=await checkPublicPages(origin,{fetcher,now:clock});results.push(result);onResult(result);
  if(!result.ok)throw Error('Public release check failed: '+result.checks.filter(c=>!c.ok).map(c=>c.path+' '+(c.status||c.code)).join(', '));
 }
 if(clock()-start<RELEASE_WINDOW)throw Error('Release check ended too early');
 return {ok:true,durationMs:clock()-start,results};
}
export async function successfulPreview(head,fetcher=fetch){
 if(!/^[0-9a-f]{40}$/.test(head))throw Error('Invalid revision');
 const r=await fetcher('https://api.github.com/repos/'+REPO+'/commits/'+head+'/check-runs',{headers:{Accept:'application/vnd.github+json','User-Agent':'BrainiLabReleaseGate'},signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('Could not verify preview build status');
 const checks=await publicJSON(r,1024*1024),run=checks.check_runs?.filter(c=>c.name==='Workers Builds: brainilab-web').sort((a,b)=>b.id-a.id)[0];
 if(run?.status!=='completed'||run.conclusion!=='success')throw Error('A successful current preview build is required');
 const u=new URL(run.details_url),match=u.pathname.match(/^\/e94344c3c4926a4c9031114fc7c36a57\/workers\/services\/view\/brainilab-web\/production\/previews\/([a-z0-9-]+)\/builds\/[a-z0-9-]+$/);
 if(u.origin!=='https://dash.cloudflare.com'||!match)throw Error('Preview identity is not verified');
 return PREVIEW_ORIGIN; // one existing staging slot; verify the exact commit/hash below
}
export async function productionPreflight({fetcher=fetch,run=execFileSync,read=readFile,verify=verifyRelease}={}){
 const local=JSON.parse(await read('dist/_release.json','utf8'));
 const header=run('git',['cat-file','-p',local.commit],{encoding:'utf8'}).split('\n\n')[0],parents=[...header.matchAll(/^parent ([0-9a-f]{40})$/gm)].map(m=>m[1]);
 if(parents.length!==2)throw Error('Production requires a reviewed merge with a verified preview');
 const origin=await successfulPreview(parents[1],fetcher);
 const proof=await verify(origin,{runtimeHash:local.runtimeHash,commit:parents[1]},{fetcher,onResult:r=>console.log(JSON.stringify({stage:'pre-publish',checkedAt:r.checkedAt,ok:r.ok,checks:r.checks.length}))});
 return {origin,proof};
}
