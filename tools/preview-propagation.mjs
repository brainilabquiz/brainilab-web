// A newly uploaded preview can briefly return its preceding manifest. Wait for
// the exact uploaded identity before starting the unchanged release audit.
export async function waitForPreviewManifest(expected,{read,clock=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),timeoutMs=30000,pollMs=2000}={}){
 const deadline=clock()+timeoutMs;let actual=null;
 while(true){
  actual=await read();
  if(actual.commit===expected.commit&&actual.runtimeHash===expected.runtimeHash)return actual;
  if(clock()>=deadline)throw Error('Preview propagation timed out before the expected revision and content hash became visible.');
  await sleep(Math.min(pollMs,deadline-clock()));
 }
}
