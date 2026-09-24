const BASE='https://brainilabgames.com';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const organization={'@type':'Organization','@id':BASE+'/#organization',name:'BrainiLab',url:BASE+'/',logo:{'@type':'ImageObject',url:BASE+'/assets/brand/brainilab-logo.png'},sameAs:['https://www.youtube.com/@BrainiLab','https://www.instagram.com/brainilab/','https://www.tiktok.com/@brainilabquiz']};
export function articleByline(a){
 const stamp=Date.parse(a.publishedAt);
 const date=Number.isFinite(stamp)?` · Published <time datetime="${escape(a.publishedAt)}">${new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(stamp)}</time>`:'';
 return `<p class="article-byline">By <a rel="author" href="/about/#editorial">BrainiLab</a>${date} · <a href="/suggestions/">Suggest a correction</a></p>`;
}
export function learnSchema(articles,article){
 const url=BASE+(article?'/learn/'+article.slug+'/':'/learn/');
 const crumbs=[{name:'Home',item:BASE+'/'},{name:'Learn',item:BASE+'/learn/'}];
 if(article)crumbs.push({name:article.title,item:url});
 const page=article?{'@type':'Article','@id':url+'#article',headline:article.title,description:article.description,image:article.cover.src.startsWith('/')?BASE+article.cover.src:article.cover.src,datePublished:article.publishedAt,dateModified:article.updatedAt||article.publishedAt,author:{'@type':'Organization',name:'BrainiLab',url:BASE+'/about/#editorial'},publisher:{'@id':organization['@id']},mainEntityOfPage:url,inLanguage:'en',isAccessibleForFree:true,articleSection:article.topic,citation:article.sources.map(s=>s.url)}:{'@type':'CollectionPage','@id':url,name:'BrainiLab Learn',url,inLanguage:'en',publisher:{'@id':organization['@id']},hasPart:articles.map(a=>({'@type':'Article',headline:a.title,url:BASE+'/learn/'+a.slug+'/'}))};
 return {'@context':'https://schema.org','@graph':[organization,page,{'@type':'BreadcrumbList',itemListElement:crumbs.map((c,i)=>({'@type':'ListItem',position:i+1,...c}))}]};
}
export function learnFeed(articles){
 const ordered=[...articles].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||a.slug.localeCompare(b.slug));
 const items=ordered.map(a=>`<item><title>${escape(a.title)}</title><link>${BASE}/learn/${a.slug}/</link><guid isPermaLink="true">${BASE}/learn/${a.slug}/</guid><description>${escape(a.description)}</description><category>${escape(a.topic)}</category>${Number.isFinite(Date.parse(a.publishedAt))?'<pubDate>'+new Date(a.publishedAt).toUTCString()+'</pubDate>':''}</item>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>BrainiLab Learn</title><link>${BASE}/learn/</link><description>Curious questions, clear answers and games to try.</description><language>en</language><atom:link href="${BASE}/learn/feed.xml" rel="self" type="application/rss+xml"/>${items}</channel></rss>`;
}
