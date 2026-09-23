import {prepareArticle,renderPage,card,esc,BASE} from './learn-content.js';
const DATABASE='https://wvgcdlxebbybthyuajgb.supabase.co';
const KEY='sb_publishable_8spWjgOq3d5KJsynwrx71Q_h1OJ34b7';
export async function publishedArticles(request,ctx,cache,fetcher=fetch){
 const key=new Request(new URL('/_learn-publications-v1',request.url));
 const cached=await cache.match(key);if(cached)return cached.json();
 const response=await fetcher(DATABASE+'/rest/v1/learn_publications?select=document&order=published_at.desc&limit=1000',{headers:{apikey:KEY},signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw Error('Article service unavailable');
 const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid article response');
 const articles=rows.map(row=>prepareArticle(row.document)).sort((a,b)=>(Number(a.order)||999)-(Number(b.order)||999));
 ctx.waitUntil(cache.put(key,new Response(JSON.stringify(articles),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=60'}})));
 return articles;
}
export async function serveLearn(request,env,ctx,cache,fetcher=fetch){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const canonical=path.replace(/index\.html$/,'');
 if(path.startsWith('/learn')&&(!canonical.endsWith('/')||canonical!==path))return Response.redirect(url.origin+canonical.replace(/\/?$/,'/'),308);
 try{
  const articles=await publishedArticles(request,ctx,cache,fetcher);
  if(path==='/sitemap.xml'){
   const original=await (await env.ASSETS.fetch(new Request(new URL('/sitemap.xml',url)))).text();
   const xml=original.replace(/<url>\s*<loc>https:\/\/brainilabgames\.com\/learn\/[\s\S]*?<\/url>/g,'').replace('</urlset>',()=>'<url><loc>'+BASE+'/learn/</loc></url>'+articles.map(a=>`<url><loc>${BASE}/learn/${a.slug}/</loc>${a.updatedAt?'<lastmod>'+esc(a.updatedAt)+'</lastmod>':''}</url>`).join('')+'</urlset>');
   return new Response(request.method==='HEAD'?null:xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=60'}});
  }
  if(path==='/'||path==='/index.html'){
   const original=await env.ASSETS.fetch(new Request(new URL('/index.html',url)));
   const html=(await original.text()).replace(/<!-- learn-preview:start -->[\s\S]*?<!-- learn-preview:end -->/,()=>'<!-- learn-preview:start -->'+articles.slice(0,2).map(a=>card(a)).join('')+'<!-- learn-preview:end -->');
   return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60'}});
  }
  const slug=path.slice('/learn/'.length).replace(/\/$/,''),article=slug?articles.find(a=>a.slug===slug):null;
  if(slug&&!article){const missing=await env.ASSETS.fetch(new Request(new URL('/404.html',url)));return new Response(request.method==='HEAD'?null:missing.body,{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
  const template=await (await env.ASSETS.fetch(new Request(new URL('/learn/index.html',url)))).text();
  return new Response(request.method==='HEAD'?null:renderPage(template,articles,article),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60','X-Content-Type-Options':'nosniff'}});
 }catch{
  // Never resurrect a withdrawn static article when the database is unavailable.
  if(path==='/'||path==='/index.html'){
   const original=await env.ASSETS.fetch(request);const html=(await original.text()).replace(/<!-- learn-preview:start -->[\s\S]*?<!-- learn-preview:end -->/,'<p><a href="/learn/">Explore Learn →</a></p>');
   return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
  return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Back shortly | BrainiLab</title><main style="max-width:600px;margin:15vh auto;padding:24px;font:18px system-ui"><h1>We’ll be back shortly.</h1><p>The library is taking a moment to load. Please try again.</p><a href="/games/">Play a game in the meantime →</a></main></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Retry-After':'30','Cache-Control':'no-store'}});
 }
}
