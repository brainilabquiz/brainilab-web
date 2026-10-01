import {prepareArticle,renderPage,homeArticle,latestArticle,esc,BASE} from './learn-content.js';
import {enrichAuthors,renderLearningPage,teamSection,resumeSection,learningAssets} from './learning-render.js';
import {readyPaths} from './learning-model.js';
import {personSchema} from './learn-seo.js';
import {learnFeed} from './learn-seo.js';
const DATABASE='https://wvgcdlxebbybthyuajgb.supabase.co';
const KEY='sb_publishable_8spWjgOq3d5KJsynwrx71Q_h1OJ34b7';
export async function publishedArticles(request,ctx,cache,fetcher=fetch){
 const key=new Request(new URL('/_learn-publications-v1',request.url));
 const cached=await cache.match(key);if(cached)return cached.json();
 const response=await fetcher(DATABASE+'/rest/v1/learn_publications?select=document&order=published_at.desc&limit=1000',{headers:{apikey:KEY},signal:AbortSignal.timeout(6000)});
 if(!response.ok)throw Error('Article service unavailable');
 const rows=await response.json();if(!Array.isArray(rows))throw Error('Invalid article response');
 const order=a=>Number.isFinite(Number(a.order))?Number(a.order):999;
 const articles=rows.map(row=>prepareArticle(row.document)).sort((a,b)=>order(a)-order(b)||a.slug.localeCompare(b.slug));
 ctx.waitUntil(cache.put(key,new Response(JSON.stringify(articles),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=60'}})));
 return articles;
}
export async function learningDirectory(request,ctx,cache,fetcher=fetch){
 const key=new Request(new URL('/_learning-directory-v1',request.url));
 const hit=await cache.match(key);if(hit)return hit.json();
 const values=await Promise.all(['learn_paths','learn_authors'].map(async table=>{
  const r=await fetcher(DATABASE+'/rest/v1/'+table+'?select=document&order=slug',{headers:{apikey:KEY},signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error('Learning directory unavailable');const rows=await r.json();if(!Array.isArray(rows))throw Error('Invalid directory');return rows.map(r=>r.document);
 }));
 const data={paths:values[0],authors:values[1]};ctx.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public,max-age=60'}})));return data;
}
export async function serveLearn(request,env,ctx,cache,fetcher=fetch){
 const url=new URL(request.url),path=url.pathname;
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const canonical=path.replace(/index\.html$/,'');
 if(path!=='/learn/feed.xml'&&path.startsWith('/learn')&&(!canonical.endsWith('/')||canonical!==path))return Response.redirect(url.origin+canonical.replace(/\/?$/,'/'),308);
 try{
  const [raw,directory]=await Promise.all([publishedArticles(request,ctx,cache,fetcher),learningDirectory(request,ctx,cache,fetcher)]);
  const articles=enrichAuthors(raw,directory.authors),paths=readyPaths(directory.paths,articles);
  if(path==='/profile/'||path==='/profile/index.html'){
   const template=await (await env.ASSETS.fetch(new Request(new URL('/profile/index.html',url)))).text();
   const html=template.replace(/<!-- academy-resume:start -->[\s\S]*?<!-- academy-resume:end -->/,()=>`<!-- academy-resume:start -->${resumeSection(paths,articles)}<!-- academy-resume:end -->`);
   return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
  if(path==='/about/'||path==='/about/index.html'){
   const response=await env.ASSETS.fetch(new Request(new URL('/about/index.html',url)));
   let html=await response.text();
   html=html.replace(/<!-- team:start -->[\s\S]*?<!-- team:end -->/,()=>'<'+ '!-- team:start -->'+teamSection(directory.authors)+'<!-- team:end -->');
   const people=directory.authors.filter(a=>a.visible&&a.active!==false).map(personSchema);
   html=html.replace('</head>',()=>learningAssets+'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@graph':people}).replace(/</g,'\\u003c')+'</script></head>');
   return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60'}});
  }
  if(path==='/learn/paths/'||path.startsWith('/learn/paths/')){
   const slug=path.slice('/learn/paths/'.length).replace(/\/$/,''),pathDoc=slug?paths.find(p=>p.slug===slug):null;
   if(slug&&!pathDoc)return new Response('Learning path not found',{status:404,headers:{'Cache-Control':'no-store'}});
   const template=await (await env.ASSETS.fetch(new Request(new URL('/learn/index.html',url)))).text();
   return new Response(request.method==='HEAD'?null:renderLearningPage(template,{paths,articles,authors:directory.authors,path:pathDoc}),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60'}});
  }
  if(path==='/learn/feed.xml')return new Response(request.method==='HEAD'?null:learnFeed(articles),{headers:{'Content-Type':'application/rss+xml; charset=utf-8','Cache-Control':'public,max-age=60','X-Content-Type-Options':'nosniff'}});
  if(path==='/sitemap.xml'){
   const original=await (await env.ASSETS.fetch(new Request(new URL('/sitemap.xml',url)))).text();
   const xml=original.replace(/<url>\s*<loc>https:\/\/brainilabgames\.com\/learn\/[\s\S]*?<\/url>/g,'').replace('</urlset>',()=>'<url><loc>'+BASE+'/learn/</loc></url>'+articles.map(a=>`<url><loc>${BASE}/learn/${a.slug}/</loc>${a.updatedAt?'<lastmod>'+esc(a.updatedAt)+'</lastmod>':''}</url>`).join('')+'<url><loc>'+BASE+'/learn/paths/</loc></url>'+paths.map(p=>'<url><loc>'+BASE+'/learn/paths/'+p.slug+'/</loc></url>').join('')+'</urlset>');
   return new Response(request.method==='HEAD'?null:xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public,max-age=60'}});
  }
  if(path==='/'||path==='/index.html'){
   const original=await env.ASSETS.fetch(new Request(new URL('/index.html',url)));
   const html=(await original.text()).replace(/<!-- learn-preview:start -->[\s\S]*?<!-- learn-preview:end -->/,()=>'<!-- learn-preview:start -->'+homeArticle(latestArticle(articles))+'<!-- learn-preview:end -->');
   return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60'}});
  }
  const slug=path.slice('/learn/'.length).replace(/\/$/,''),article=slug?articles.find(a=>a.slug===slug):null;
  if(slug&&!article){const missing=await env.ASSETS.fetch(new Request(new URL('/404.html',url)));return new Response(request.method==='HEAD'?null:missing.body,{status:404,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
  const template=await (await env.ASSETS.fetch(new Request(new URL('/learn/index.html',url)))).text();
  return new Response(request.method==='HEAD'?null:renderPage(template,articles,article,paths),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public,max-age=60','X-Content-Type-Options':'nosniff'}});
 }catch{
  if(path==='/profile/'||path==='/profile/index.html'){
   const original=await env.ASSETS.fetch(request);
   const html=(await original.text()).replace(/<!-- academy-resume:start -->[\s\S]*?<!-- academy-resume:end -->/,'<section class="academy-resume"><h2>Your learning</h2><p>Courses could not be loaded just now. <a href="/learn/paths/">Try Academy again →</a></p></section>');
   return new Response(request.method==='HEAD'?null:html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
  // Never resurrect a withdrawn static article when the database is unavailable.
  if(path==='/'||path==='/index.html'){
   const original=await env.ASSETS.fetch(request);const html=(await original.text()).replace(/<!-- learn-preview:start -->[\s\S]*?<!-- learn-preview:end -->/,'<p><a href="/learn/">Explore Learn →</a></p>');
   return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
  return new Response('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Back shortly | BrainiLab</title><main style="max-width:600px;margin:15vh auto;padding:24px;font:18px system-ui"><h1>We’ll be back shortly.</h1><p>The library is taking a moment to load. Please try again.</p><a href="/games/">Play a game in the meantime →</a></main></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Retry-After':'30','Cache-Control':'no-store'}});
 }
}
