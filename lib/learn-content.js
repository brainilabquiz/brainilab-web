import sanitizeHtml from 'sanitize-html';

export const BASE='https://brainilabgames.com';
export const STORAGE='https://wvgcdlxebbybthyuajgb.supabase.co/storage/v1/object/public/learn-covers/';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cleanHtml(value){return sanitizeHtml(String(value??''),{
 allowedTags:['p','br','strong','b','em','i','ul','ol','li','h3','h4','blockquote','a','details','summary','div'],
 allowedAttributes:{a:['href'],div:['class'],details:['class']},
 allowedClasses:{div:['flag-example','number-example','italy-flag'],details:['practice-answer']},
 allowedSchemes:['https'],allowProtocolRelative:false,
 transformTags:{a:(tag,attrs)=>({tagName:'a',attribs:safeLink(attrs.href)?{href:attrs.href}:{}})},
 disallowedTagsMode:'discard',enforceHtmlBoundary:true
});}
export function safeLink(value){return typeof value==='string'&&(/^\/[a-z0-9][a-z0-9/._-]*(?:#[a-z0-9-]+)?$/i.test(value)||/^https:\/\/[^\s<>"\\]+$/i.test(value));}
export function safeCover(value){return typeof value==='string'&&(/^\/assets\/images\/learn\/[a-z0-9-]+\.webp$/.test(value)||value.startsWith(STORAGE)&&/^[a-zA-Z0-9_./-]+\.(webp|png|jpe?g)$/.test(value.slice(STORAGE.length)));}
export function prepareArticle(raw){
 const a=structuredClone(raw); if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug))throw Error('Invalid slug');
 a.sections=(Array.isArray(a.sections)?a.sections:[]).filter(s=>/^[a-z0-9-]+$/.test(s.id)).map(s=>({...s,html:cleanHtml(s.html)}));
 a.sources=(Array.isArray(a.sources)?a.sources:[]).filter(s=>safeLink(s.url));
 a.related=Array.isArray(a.related)?a.related:[];
 a.cover=a.cover||{}; if(!safeCover(a.cover.src))a.cover.src='/assets/images/learn/daily-or-anytime.webp';
 a.cover.position=Math.max(0,Math.min(100,Number(a.cover.position??(a.slug.includes('moon')?20:45))||0));
 for(const key of ['game','hub']){a[key]=a[key]||{};if(!safeLink(a[key].url)||!a[key].url.startsWith('/'))a[key].url='/games/';}
 a.minutes=Math.max(1,Math.ceil(a.sections.reduce((sum,s)=>sum+s.html.replace(/<[^>]+>/g,' ').split(/\s+/).length,0)/200));
 return a;
}
export function card(a,{latest=false,hidden=false,eager=false}={}){
 const small=a.cover.src.startsWith('/assets/')?a.cover.src.replace('.webp','-small.webp'):a.cover.src;
 return `<article class="learn-card" data-topic="${esc(a.topic)}"${latest?' data-latest-topic':''}${hidden?' hidden':''}><div class="learn-card-art"><img src="${esc(small)}" alt="${esc(a.cover.alt)}" style="object-position:center ${a.cover.position}%" width="480" height="320" loading="${eager?'eager':'lazy'}" decoding="async"/></div><div class="learn-card-copy"><p class="eyebrow">${esc(a.topic)} <span>· ${a.minutes} min read</span></p><h3><a href="/learn/${a.slug}/">${esc(a.title)}</a></h3><p>${esc(a.description)}</p><span class="learn-card-label" aria-hidden="true">Read the guide ↗</span></div></article>`;
}
export function libraryBody(articles){
 const topics=[...new Set(articles.map(a=>a.topic))].sort(),latest=new Map();
 [...articles].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).forEach(a=>{if(!latest.has(a.topic))latest.set(a.topic,a.slug);});
 return `<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Learn</span></nav><header class="learn-hero"><div><h1>A little more to discover.</h1><p>Curious questions, clear answers and a few things to try.</p></div><label class="learn-search" hidden>Find an article<input type="search" id="learn-search" placeholder="Try Moon, flags, numbers…" autocomplete="off" aria-controls="learn-articles"/></label></header><nav class="topic-nav" aria-label="Filter articles by topic" hidden><button type="button" data-topic-filter="__latest" aria-pressed="true">Latest by topic</button><button type="button" data-topic-filter="" aria-pressed="false">All articles</button>${topics.map(t=>`<button type="button" data-topic-filter="${esc(t)}" aria-pressed="false">${esc(t)}</button>`).join('')}</nav><p class="learn-count" role="status" aria-live="polite" id="learn-count">${topics.length} articles · latest in each topic</p><noscript><style>.library-grid .learn-card[hidden]{display:flex!important}</style><p>All articles are shown below.</p></noscript><div class="learn-grid library-grid" id="learn-articles">${articles.map((a,i)=>card(a,{latest:latest.get(a.topic)===a.slug,hidden:latest.get(a.topic)!==a.slug,eager:i<3})).join('')}</div><div class="learn-empty" hidden><h2>No articles found</h2><p>Try another word or browse all topics.</p><button type="button" data-clear-filters>Show all articles</button></div><p class="learn-footer-link">In the mood to play? <a href="/games/">Browse the games →</a></p></div>`;
}
export function articleBody(a,articles=[]){
 const related=a.related.map(slug=>articles.find(item=>item.slug===slug)).filter(Boolean);
 return `<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/learn/">Learn</a><span aria-hidden="true">/</span><span aria-current="page">${esc(a.topic)}</span></nav><header class="article-header"><p class="eyebrow">${esc(a.topic)} · ${a.minutes} min read</p><h1>${esc(a.title)}</h1><p>${esc(a.description)}</p></header><div class="article-layout"><aside class="article-sidebar"><details><summary>In this article</summary><nav aria-label="In this article"><ol>${a.sections.map(s=>`<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join('')}</ol></nav></details><a class="sidebar-game" href="${esc(a.game.url)}">Related game<strong>${esc(a.game.name)} →</strong></a></aside><article class="article-body"><figure class="article-cover"><img src="${esc(a.cover.src)}" alt="${esc(a.cover.alt)}" style="object-position:center ${a.cover.position}%" width="960" height="640" fetchpriority="high"/><figcaption>${esc(a.cover.credit)}</figcaption></figure>${a.sections.map(s=>`<section id="${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.html}</section>`).join('')}<section id="sources"><h2>Sources &amp; further reading</h2><ul>${a.sources.map(s=>`<li><a href="${esc(s.url)}">${esc(s.name)}</a></li>`).join('')}</ul></section><aside class="article-practice"><h2>Fancy a round?</h2><p>${esc(a.practice)}</p><a class="btn" href="${esc(a.game.url)}">Play ${esc(a.game.name)} →</a><a class="article-hub-link" href="${esc(a.hub.url)}">Explore ${esc(a.hub.name)}</a></aside></article></div>${related.length?`<section class="learn-related"><div class="section-heading"><h2>Keep exploring</h2><a href="/learn/">All guides →</a></div><div class="learn-grid">${related.map(a=>card(a)).join('')}</div></section>`:''}</div>`;
}
export function renderPage(template,articles,article){
 const path=article?'/learn/'+article.slug+'/':'/learn/',url=BASE+path;
 const title=article?.title||'Learn: curious questions, clear answers',description=article?.description||'Short reads on science, geography, history and puzzles.';
 const cover=article?.cover||{src:'/assets/brand/og-card.png',alt:'BrainiLab quiz and brain games'};
 const image=cover.src.startsWith('/')?BASE+cover.src:cover.src;
 const schema=article?{'@type':'Article',headline:title,description,image,datePublished:article.publishedAt,dateModified:article.updatedAt||article.publishedAt,publisher:{'@type':'Organization',name:'BrainiLab',url:BASE},mainEntityOfPage:url}:{'@type':'CollectionPage',name:'BrainiLab Learn',url,hasPart:articles.map(a=>({'@type':'Article',headline:a.title,url:BASE+'/learn/'+a.slug+'/'}))};
 let html=template.replace(/<main id="main-content">[\s\S]*?<\/main>/,()=>`<main id="main-content">${article?articleBody(article,articles):libraryBody(articles)}</main>`)
 .replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(title)} | BrainiLab</title>`)
 .replace(/<meta name="description"[^>]*>/,()=>`<meta name="description" content="${esc(description)}"/>`)
 .replace(/<link rel="canonical"[^>]*>/,()=>`<link rel="canonical" href="${url}"/>`)
 .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,()=>`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org',...schema}).replace(/</g,'\\u003c')}</script>`);
 const tags={'og:type':article?'article':'website','og:title':title,'og:description':description,'og:url':url,'og:image':image,'og:image:alt':cover.alt};
 for(const [key,value] of Object.entries(tags))html=html.replace(new RegExp('<meta property="'+key+'"[^>]*>'),()=>`<meta property="${key}" content="${esc(value)}"/>`);
 if(article)html=html.replace(/<script defer src="\/assets\/js\/learn-library[^>]*><\/script>/,'');
 return html;
}
