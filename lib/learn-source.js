import {publicJSON,CATALOGUE_BYTES} from './public-json.js';

export class LearnSourceError extends Error{
 constructor(code){super('Public Learn source unavailable');this.code=code;}
}
const transient=new Set([408,500,502,503,504,520,522,524]);
const transportCode=error=>['TimeoutError','AbortError'].includes(error?.name)?'source-timeout':error instanceof TypeError?'source-network':null;

// Anonymous GETs only. Keep the original six-second first attempt and permit
// one fresh attempt within eight seconds total, including reading the body.
// Invalid, oversized or forbidden data is never retried or replaced by stale data.
export async function learnSourceJSON(url,{headers,limit=CATALOGUE_BYTES,fetcher=fetch}={}){
 const deadline=Date.now()+8000;
 for(let attempt=0;attempt<2;attempt++){
  const remaining=deadline-Date.now();
  if(remaining<=0)throw new LearnSourceError('source-timeout');
  try{
   const response=await fetcher(url,{method:'GET',headers,redirect:'manual',signal:AbortSignal.timeout(Math.min(6000,remaining))});
   if(!response.ok){
    await response.body?.cancel().catch(()=>{});
    if(attempt===0&&transient.has(response.status))continue;
    throw new LearnSourceError('source-http-'+response.status);
   }
   return await publicJSON(response,limit);
  }catch(error){
   const code=transportCode(error);
   if(attempt===0&&code)continue;
   if(error instanceof LearnSourceError)throw error;
   throw new LearnSourceError(code||(error?.message==='Public response exceeds budget'?'source-too-large':'source-invalid'));
  }
 }
}
