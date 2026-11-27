import {BreakingNewsStore as NewsStore} from './news-refresh.js';
import {LearnPageStore} from './learn-store.js';
import {checkPublicPages,recordHealth,PRODUCTION_ORIGIN} from './site-health.js';
import {HomeFeaturedVideo} from './home-featured-video.js';
import {visitStore} from './visit-counter.js';

// Keep the existing exported class and namespace identity. Learn uses separate
// named object IDs, never the world-news-v1 singleton or its persistent ledger.
// The explicit internal prefix leaves every existing news route unchanged.
export class BreakingNewsStore extends NewsStore {
 constructor(state,env,fetcher=fetch){super(state,env);this.publicFetcher=fetcher;}
 async fetch(request,now=Date.now()){
  const url=new URL(request.url);
  if(url.hostname==='home-video.internal'&&url.pathname==='/latest'){
   this.homeVideo??=new HomeFeaturedVideo(this.state,this.env.YOUTUBE_API_KEY,this.publicFetcher);
   if(request.method==='GET')return Response.json(await this.homeVideo.read());
   if(request.method==='POST'){
    await this.homeVideo.refresh();
    return new Response(null,{status:204});
   }
   return new Response(null,{status:405,headers:{Allow:'GET, POST'}});
  }
  // Our own page counter keeps aggregates only (day + path) in its own named object.
  if(url.hostname==='visits.internal')return visitStore(this.state.storage,request,now);
  if(url.hostname==='health.internal'&&url.pathname==='/_site-health/status'&&request.method==='GET')return Response.json(await this.state.storage.get('site-health-v1')||{});
  if(url.hostname==='health.internal'&&url.pathname==='/_site-health/check'&&request.method==='POST'){
   const result=await checkPublicPages(PRODUCTION_ORIGIN,{fetcher:this.publicFetcher});
   await recordHealth(this.state.storage,result);return Response.json({ok:result.ok},{status:result.ok?200:503});
  }
  if(url.pathname.startsWith('/_learn-render/')){
   this.publicPages??=new LearnPageStore(this.state,{ASSETS:this.env.ASSETS},this.publicFetcher);
   url.pathname=url.pathname.slice('/_learn-render'.length);url.search='';
   return this.publicPages.fetch(new Request(url,{method:request.method}));
  }
  return super.fetch(request,now);
 }
}
