import {newTabLinks} from './link-policy.js';
import {activityFor} from './academy-labs.js';
import {learningAssets,academyCard,lessonExtras} from './learning-render.js';
import {readyPaths} from './learning-model.js';
import sanitizeHtml from 'sanitize-html';
import {articleByline,learnSchema} from './learn-seo.js';
import {coverImage} from './cover-images.js';

export const BASE='https://brainilabgames.com';
export const STORAGE='https://wvgcdlxebbybthyuajgb.supabase.co/storage/v1/object/public/learn-covers/';
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cleanHtml(value){return sanitizeHtml(String(value??''),{
 allowedTags:['p','br','strong','b','em','i','ul','ol','li','h3','h4','blockquote','a','details','summary','div','table','caption','thead','tbody','tr','th','td','dl','dt','dd','figure','figcaption'],
 allowedAttributes:{a:['href'],div:['class'],details:['class'],th:['scope','colspan'],td:['colspan'],table:['class']},
 allowedClasses:{div:['flag-example','number-example','italy-flag','table-scroll'],details:['practice-answer']},
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
export function card(a,{latest=false,hidden=false,eager=false,catalog=false}={}){
 const small=coverImage(a.cover);
 return `<article class="learn-card" data-format="article" data-topic="${esc(a.topic)}"${latest?' data-latest-topic':''}${hidden?' hidden':''}><div class="learn-card-art"><img src="${esc(small)}" alt="${esc(a.cover.alt)}" style="object-position:center ${a.cover.position}%" width="480" height="320" loading="${eager?'eager':'lazy'}" decoding="async"/></div><div class="learn-card-copy">${catalog?'<p class="learn-format-label">Article</p>':''}<p class="eyebrow">${esc(a.topic)} <span>· ${a.minutes} min read</span></p><h3><a href="/learn/${a.slug}/">${esc(a.title)}</a></h3><p>${esc(a.description)}</p><span class="learn-card-label" aria-hidden="true">Read the guide ↗</span></div></article>`;
}
export function latestArticle(articles){
 return [...articles].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||a.slug.localeCompare(b.slug))[0];
}
export function homeArticle(a){
 if(!a)return '<a class="home-article-empty" href="/learn/">Explore the library →</a>';
 const image=coverImage(a.cover,'thumbnail');
 return `<a class="home-article" href="/learn/${a.slug}/"><img src="${esc(image)}" alt="" style="object-position:center ${a.cover.position}%" width="480" height="320" decoding="async"/><span class="home-article-copy"><span class="home-article-label">Latest in Learn · ${a.minutes} min read</span><strong>${esc(a.title)}</strong><span class="home-article-action">Read the article →</span></span></a>`;
}
export function libraryBody(articles,paths=[]){
 articles=[...articles].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||(Number(a.order)||0)-(Number(b.order)||0)||a.slug.localeCompare(b.slug));
 const topics=[...new Set(articles.map(a=>a.topic))].sort(),latest=new Map();
 [...articles].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)).forEach(a=>{if(!latest.has(a.topic))latest.set(a.topic,a.slug);});
 const available=readyPaths(paths,articles),mixed=[];
 const featured=articles.filter(a=>latest.get(a.topic)===a.slug),older=articles.filter(a=>latest.get(a.topic)!==a.slug);
 for(let i=0;i<Math.max(featured.length,available.length);i++){
  if(featured[i])mixed.push(card(featured[i],{latest:true,eager:i<2,catalog:true}));
  if(available[i])mixed.push(academyCard(available[i],articles));
 }
 mixed.push(...older.map(a=>card(a,{hidden:true,catalog:true})));
 return `<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Learn</span></nav><header class="learn-hero"><div><h1>A little more to discover.</h1><p>Curious questions, clear answers and a few things to try.</p></div><div class="learn-search" hidden><label for="learn-search">Search Learn</label><div class="learn-search-field"><input type="search" id="learn-search" placeholder="Try Moon, flags, numbers…" autocomplete="off" aria-controls="learn-articles"/><button type="button" class="learn-search-clear" aria-label="Clear search" hidden>Clear</button></div></div></header><div class="learn-format-filters" role="group" aria-label="Choose what to explore" hidden><button type="button" data-format-filter="all" aria-pressed="true" aria-controls="learn-articles">Explore all</button><button type="button" data-format-filter="article" aria-pressed="false" aria-controls="learn-articles">Articles</button><button type="button" data-format-filter="academy" aria-pressed="false" aria-controls="learn-articles">BrainiLab Academy</button></div><div class="learn-toolbar"><div class="learn-surprise" hidden><a class="learn-surprise-button" data-random-article href="/learn/" aria-label="Surprise me — read a random article">Surprise me <span aria-hidden="true">→</span></a></div><label class="learn-topic-select" hidden><span>Browse</span><select aria-label="Browse topics" id="learn-topic" aria-controls="learn-articles"><option value="__latest">Latest by topic</option><option value="">All topics</option>${topics.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></label></div><p class="learn-count" role="status" aria-live="polite" id="learn-count">${topics.length} articles · ${available.length} Academy courses</p><noscript><style>.library-grid .learn-card[hidden]{display:flex!important}</style><p>All articles and Academy courses are shown below.</p></noscript><h2 class="library-heading">Articles &amp; BrainiLab Academy</h2><div class="learn-grid library-grid" id="learn-articles">${mixed.join('')}</div><div class="learn-empty" hidden><h2>Nothing found yet</h2><p>Try another word or browse all topics.</p><button type="button" data-clear-filters>Show everything</button></div><p class="learn-footer-link">In the mood to play? <a href="/games/">Browse the games →</a></p></div>`;
}
export function articleBody(a,articles=[],paths=[]){
 const extras=lessonExtras(a,paths,articles);
 const download=a.sections.some(s=>s.html.includes('href="/assets/resources/five-number-puzzles.pdf"'))?'<p class="article-download"><a href="/assets/resources/five-number-puzzles.pdf">Download free PDF →</a><span>2 pages · puzzles and explained answers</span></p>':'';
 const related=a.related.map(slug=>articles.find(item=>item.slug===slug)).filter(Boolean);
 return `<div class="wrap"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/learn/">Learn</a><span aria-hidden="true">/</span><span aria-current="page">${esc(a.topic)}</span></nav><header class="article-header"><p class="eyebrow">${esc(a.topic)} · ${a.minutes} min read</p><h1>${esc(a.title)}</h1><p class="article-description">${esc(a.description)}</p>${download}</header><div class="article-layout"><aside class="article-sidebar${extras.sidebar?' has-chapters':''}">${extras.sidebar}<details><summary>In this article</summary><nav aria-label="In this article"><ol>${a.sections.map(s=>`<li><a href="#${esc(s.id)}">${esc(s.title)}</a></li>`).join('')}</ol></nav></details><a class="sidebar-game" href="${esc(a.game.url)}">Related game<strong>${esc(a.game.name)} →</strong></a></aside><article class="article-body"><figure class="article-cover"><img src="${esc(a.cover.src)}" alt="${esc(a.cover.alt)}" style="object-position:center ${a.cover.position}%" width="960" height="640" fetchpriority="high"/><figcaption>${esc(a.cover.credit)}</figcaption></figure>${a.sections.map(s=>`<section id="${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.html}${extras.sidebar?activityFor(a.slug,s.id):''}</section>`).join('')}<section id="sources"><h2>Sources &amp; further reading</h2><ul>${a.sources.map(s=>`<li><a href="${esc(s.url)}">${esc(s.name)}</a></li>`).join('')}</ul></section>${extras.quiz}${extras.nav}<aside class="article-practice"><h2>Fancy a round?</h2><p>${esc(a.practice)}</p><a class="btn" href="${esc(a.game.url)}">Play ${esc(a.game.name)} →</a><a class="article-hub-link" href="${esc(a.hub.url)}">Explore ${esc(a.hub.name)}</a></aside></article></div>${related.length?`<section class="learn-related"><div class="section-heading"><h2>Keep exploring</h2><a href="/learn/">All guides →</a></div><div class="learn-grid">${related.map(a=>card(a)).join('')}</div></section>`:''}</div>`;
}
export function renderPage(template,articles,article,paths=[]){
 template=template.replace(/<link rel="stylesheet" href="\/assets\/css\/learning-paths\.css[^"]*"\/>/g,'').replace(/<script defer src="\/assets\/js\/learning-paths\.bundle\.js[^"]*"><\/script>/g,'').replace(/<meta name="twitter:(?:title|description|image|image:alt)"[^>]*>/g,'');
 const path=article?'/learn/'+article.slug+'/':'/learn/',url=BASE+path;
 const title=article?.title||'Learn: curious questions, clear answers',description=article?.description||'Explore curious articles and beginner-friendly BrainiLab Academy courses. Read, try interactive examples and test what you learn in a quick quiz.';
 const cover=article?.cover||{src:'/assets/brand/og-card.png',alt:'BrainiLab quiz and brain games'};
 const image=cover.src.startsWith('/')?BASE+cover.src:cover.src;
 const schema=learnSchema(articles,article,readyPaths(paths,articles));
 let html=template.replace(/<main id="main-content">[\s\S]*?<\/main>/,()=>`<main id="main-content">${article?articleBody(article,articles,paths):libraryBody(articles,paths)}</main>`)
 .replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${esc(title)} | BrainiLab</title>`)
 .replace(/<meta name="description"[^>]*>/,()=>`<meta name="description" content="${esc(description)}"/>`)
 .replace(/<link rel="canonical"[^>]*>/,()=>`<link rel="canonical" href="${url}"/>`)
 .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,()=>`<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>`);
 const tags={'og:type':article?'article':'website','og:title':title,'og:description':description,'og:url':url,'og:image':image,'og:image:alt':cover.alt};
 for(const [key,value] of Object.entries(tags))html=html.replace(new RegExp('<meta property="'+key+'"[^>]*>'),()=>`<meta property="${key}" content="${esc(value)}"/>`);
 html=html.replace(/<meta name="robots"[^>]*>/,'<meta name="robots" content="index,follow,max-image-preview:large"/>');
 html=html.replace('</head>',()=>`<meta name="twitter:title" content="${esc(title)}"/><meta name="twitter:description" content="${esc(description)}"/><meta name="twitter:image" content="${esc(image)}"/><meta name="twitter:image:alt" content="${esc(cover.alt)}"/><link rel="alternate" type="application/rss+xml" title="BrainiLab Learn" href="${BASE}/learn/feed.xml"/></head>`);
 if(article)html=html.replace(/<script defer src="\/assets\/js\/learn-library[^>]*><\/script>/,'').replace('</header><div class="article-layout">',()=>articleByline(article)+'</header><div class="article-layout">');
 else html=html.replace('<p class="learn-footer-link">','<p class="learn-feed-link"><a href="/learn/feed.xml">Follow new articles with RSS</a></p><p class="learn-footer-link">');
 return newTabLinks(html.replace('</head>',learningAssets+'</head>'));
}
