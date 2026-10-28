import {serveLearn,publishedArticles} from './learn-worker.js';
import {relatedVideo,VIDEO_GAMES} from './video-card.js';

const page=path=>path==='/learn'||path.startsWith('/learn/')||['/','/index.html','/sitemap.xml','/llms.txt','/about/','/about/index.html','/profile/','/profile/index.html'].includes(path);
const anonymous=request=>{const url=new URL(request.url);url.search='';return new Request(url,{method:request.method});};
function store(request,env){return env.LEARN_PAGES.get(env.LEARN_PAGES.idFromName('public-learn-v1:'+new URL(request.url).hostname));}
const routed=request=>{const clean=anonymous(request),url=new URL(clean.url);url.pathname='/_learn-render'+url.pathname;return new Request(url,{method:clean.method});};

// Forward public page work through a binding, never a caller-supplied backend.
// Cookies, bearer tokens and tracking/query parameters are not needed to render
// the public catalogue and do not enter the shared object.
export async function servePublicLearn(request,env,ctx,cache,fetcher=fetch){
 if(!env.LEARN_PAGES)return serveLearn(request,env,ctx,cache,fetcher); // local fixtures
 return store(request,env).fetch(routed(request));
}
export async function learnRelatedVideo(request,env,ctx,cache,game,fetcher=fetch){
 if(!Object.hasOwn(VIDEO_GAMES,game))throw Error('Unknown game');
 if(!env.LEARN_PAGES)return relatedVideo(await publishedArticles(request,ctx,cache,fetcher,{summaryOnly:true}),game);
 const url=new URL('/_learn-video/'+game,request.url);
 const response=await store(request,env).fetch(routed(new Request(url)));
 if(!response.ok)throw Error('Reading recommendations unavailable');
 return (await response.json()).video;
}

// Only plain strings and header pairs survive between calls. Response streams
// belong to the current invocation and must never be retained across requests.
class PublicMemoryCache{
 constructor(){this.entries=new Map();}
 async match(request){const entry=this.entries.get(request.url);if(!entry)return;if(Date.now()>=entry.expires){this.entries.delete(request.url);return;}return new Response(entry.body,{headers:entry.headers});}
 async put(request,response){const body=await response.text();this.entries.set(request.url,{body,headers:[...response.headers],expires:Date.now()+60000});}
}

// Named object in the existing SQLite namespace; no persistent storage,
// alarms, account data or player progress are read or written by this object.
// Rendering belongs here rather than in the entry Worker's small CPU budget.
export class LearnPageStore{
 constructor(state,env,fetcher=fetch){this.state=state;this.env={ASSETS:env.ASSETS};this.fetcher=fetcher;this.cache=new PublicMemoryCache();}
 async fetch(request){
  const url=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
  const match=url.pathname.match(/^\/_learn-video\/([a-z0-9-]+)$/);
  if(match&&Object.hasOwn(VIDEO_GAMES,match[1])){
   try{const articles=await publishedArticles(anonymous(request),this.state,this.cache,this.fetcher,{summaryOnly:true});return new Response(request.method==='HEAD'?null:JSON.stringify({video:relatedVideo(articles,match[1])}),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=60'}});}catch{return new Response(null,{status:503,headers:{'Cache-Control':'no-store'}});}
  }
  if(!page(url.pathname))return new Response(null,{status:404});
  return serveLearn(anonymous(request),this.env,this.state,this.cache,this.fetcher);
 }
}
