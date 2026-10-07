import {newTabLinks} from './link-policy.js';
import {learningAssets,academyCard,lessonExtras} from './learning-render.js';
import {readyPaths} from './learning-model.js';
import sanitizeHtml from 'sanitize-html';
import {articleByline,learnSchema} from './learn-seo.js';
import {coverImage} from './cover-images.js';
import {cleanVideo} from './video-card.js';

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
 a.video=cleanVideo(a.video);
 if(a.description==='Start with one ribbon and ten equal pieces. Discover tenths, hundredths and why 0.5 and 0.50 show the same amount, with a grid you can change.')a.description='Start with one ribbon and ten equal pieces. Discover tenths, hundredths and why 0.5 and 0.50 show the same amount.';
 a.sections=(Array.isArray(a.sections)?a.sections:[]).filter(s=>/^[a-z0-9-]+$/.test(s.id)).map(s=>({...s,html:cleanHtml(s.html)}));
 a.sources=(Array.isArray(a.sources)?a.sources:[]).filter(s=>safeLink(s.url));
 a.related=Array.isArray(a.related)?a.related:[];
 a.cover=a.cover||{}; if(!safeCover(a.cover.src))a.cover.src='/assets/images/learn/daily-or-anytime.webp';
 a.cover.position=Math.max(0,Math.min(100,Number(a.cover.position??(a.slug.includes('moon')?20:45))||0));
 for(const key of ['game','hub']){a[key]=a[key]||{};if(!safeLink(a[key].url)||!a[key].url.startsWith('/'))a[key].url='/games/';}
 a.minutes=Math.max(1,Math.ceil(a.sections.reduce((sum,s)=>sum+s.html.replace(/<[^>]+>/g,' ').split(/\s+/).length,0)/200));
 return a;
}
export function card(a,{latest=false,hidden=false,eager=false,catalog=false,topicCount=0}={}){
 const small=coverImage(a.cover);
 const art=`<div class="learn-card-art"><img src="${esc(small)}" alt="${esc(a.cover.alt)}" style="object-position:center ${a.cover.position}%" width="480" height="320" loading="${eager?'eager':'lazy'}" decoding="async"/></div>`;
 const topic=`<p class="eyebrow">${esc(a.topic)}</p>`;
 return `<article class="learn-card" data-format="article" data-topic="${esc(a.topic)}"${latest?' data-latest-topic':''}${hidden?' hidden':''}>${catalog?`<div class="learn-topic-heading">${topic}<button type="button" data-browse-topic="${esc(a.topic)}" aria-label="See all ${topicCount} article${topicCount===1?'':'s'} in ${esc(a.topic)}" hidden>${topicCount} article${topicCount===1?'':'s'} <span aria-hidden="true">→</span></button></div>`:''}${art}<div class="learn-card-copy">${catalog?`<p class="learn-read-time">${a.minutes} min read</p>`:`<p class="eyebrow">${esc(a.topic)} <span>· ${a.minutes} min read</span></p>`}<h3><a href="/learn/${a.slug}/">${esc(a.title)}</a></h3><p class="learn-card-description">${esc(a.description)}</p><span class="learn-card-label" aria-hidden="true">Read article →</span></div></article>`;
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
 const available=readyPaths(paths,articles);
 const totals=new Map(topics.map(t=>[t,articles.filter(a=>a.topic===t).length]));
 const cards=articles.map(a=>card(a,{latest:latest.get(a.topic)===a.slug,hidden:latest.get(a.topic)!==a.slug,eager:articles.indexOf(a)<2,catalog:true,topicCount:totals.get(a.topic)}));
 cards.push(...available.map(p=>academyCard(p,articles).replace('data-format="academy"','data-format="academy" hidden')));
 return `<div class="wrap learn-catalog"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span aria-current="page">Learn</span></nav><header class="learn-hero"><div><h1>A little more to discover.</h1><p>Find a curious question. Leave with a new idea.</p></div><div class="learn-surprise" hidden><a class="learn-surprise-button" data-random-article href="/learn/" aria-label="Surprise me — read a random article">Surprise me <span aria-hidden="true">→</span></a></div></header><div class="learn-controls"><div class="learn-format-filters" role="group" aria-label="Choose what to explore" hidden><button type="button" data-format-filter="article" aria-pressed="true" aria-controls="learn-articles">Articles</button><button type="button" data-format-filter="academy" aria-pressed="false" aria-controls="learn-articles">BrainiLab Academy</button></div><div class="learn-search" hidden><label for="learn-search" class="learn-control-label">Search Learn</label><div class="learn-search-field"><input type="search" id="learn-search" placeholder="Search a topic or a question…" autocomplete="off" aria-controls="learn-articles"/><button type="button" class="learn-search-clear" aria-label="Clear search" hidden>Clear</button></div></div></div><div class="learn-toolbar"><div><h2 class="library-heading" id="library-heading">Latest by topic</h2><p class="learn-count" role="status" aria-live="polite" id="learn-count">${topics.length} topics · ${articles.length} articles</p></div><label class="learn-topic-select" hidden><span>Browse</span><select aria-label="Browse topics" id="learn-topic" aria-controls="learn-articles"><option value="__latest">Latest picks</option><option value="">All topics</option>${topics.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></label></div><noscript><style>.library-grid .learn-card[hidden]{display:flex!important}.library-grid .learn-card[data-format=article][hidden]{display:grid!important}</style><p>All articles and Academy courses are shown below.</p></noscript><div class="learn-grid library-grid" id="learn-articles" data-view="article">${cards.join('')}</div><div class="learn-more" hidden><button type="button" data-show-more aria-controls="learn-articles">Show more articles</button></div><div class="learn-empty" hidden><h2>Nothing found yet</h2><p>Try another word or browse all topics.</p><button type="button" data-clear-filters>Show everything</button></div><p class="learn-footer-link">In the mood to play? <a href="/games/">Browse the games →</a></p></div>`;
}
export function articleBody(a,articles=[],paths=[]){
 const extras=lessonExtras(a,paths,articles);
 const related=a.related.map(slug=>articles.find(item=>item.slug===slug)).filter(Boolean).slice(0,2);
 // Old published documents can still describe retired widgets. Keep their
 // anchors and replace only the exact legacy copy, never newer editor text.
 const sections=a.sections.map(s=>({...s,html:s.html
  .replace('<p>Change the number of counters below. Count each one once, then compare your count with the number shown. Move all the way down to zero. The empty space is part of the activity: it means there are no counters.</p>','')
  .replace('<p>The square below represents <strong>one whole</strong>. It has ten equal columns. In tenths mode, each step colours one more column.</p>','<p>Imagine a square divided into ten equal columns. Five coloured columns cover half the square: <strong>0.5</strong>.</p>')
  .replace('<p>Try colouring five columns. Then switch to hundredths without moving the slider. The coloured amount stays the same, but now you can count the tiny squares inside it.</p>','<p>Divide each column into ten little squares. The same half now covers 50 of the 100 squares: <strong>0.50</strong>. The amount has not changed.</p>')}));
 return `<div class="wrap article-reading"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/learn/">Learn</a><span aria-hidden="true">/</span><span aria-current="page">${esc(a.topic)}</span></nav><header class="article-header"><p class="eyebrow">${esc(a.topic)} · ${a.minutes} min read</p><h1>${esc(a.title)}</h1><p class="article-description">${esc(a.description)}</p></header><div class="article-layout"><article class="article-body"><figure class="article-cover"><img src="${esc(a.cover.src)}" alt="${esc(a.cover.alt)}" style="object-position:center ${a.cover.position}%" width="960" height="640" fetchpriority="high"/><figcaption>${esc(a.cover.credit)}</figcaption></figure>${sections.map(s=>`<section id="${esc(s.id)}"><h2>${esc(s.title)}</h2>${s.html}</section>`).join('')}<footer class="article-end">${a.sources.length?`<details class="article-fold" id="sources"><summary>Sources &amp; further reading</summary><ul>${a.sources.map(s=>`<li><a href="${esc(s.url)}">${esc(s.name)}</a></li>`).join('')}</ul></details>`:''}${extras.quiz?`<details class="article-fold article-optional"><summary>Try a short quiz <span>Optional</span></summary>${extras.quiz}</details>`:''}${extras.nav?`<details class="article-fold article-course"><summary>Continue this course</summary>${extras.nav}</details>`:''}<p class="article-game-link"><span>In the mood to play?</span> <a href="${esc(a.game.url)}">${esc(a.game.name)} →</a></p>${a.video?`<p class="article-video-link"><a href="https://www.youtube.com/watch?v=${esc(a.video.id)}" data-related-video="article" data-video-id="${esc(a.video.id)}">Watch on YouTube: ${esc(a.video.title)} ↗</a></p>`:''}</footer></article></div><nav class="article-next" aria-label="More reading">${related.length?`<h2>A little more to discover</h2><ul>${related.map(r=>`<li><a href="/learn/${r.slug}/">${esc(r.title)} <span aria-hidden="true">→</span></a></li>`).join('')}</ul>`:''}<a class="article-back" href="/learn/">← Back to Learn</a></nav></div>`;
}
export function renderPage(template,articles,article,paths=[]){
 template=template.replace(/<link rel="stylesheet" href="\/assets\/css\/learning-paths\.css[^"]*"\/>/g,'').replace(/<script defer src="\/assets\/js\/learning-paths\.bundle\.js[^"]*"><\/script>/g,'').replace(/<meta name="twitter:(?:title|description|image|image:alt)"[^>]*>/g,'')
  .replace(/<link\b(?=[^>]*\btype="application\/rss\+xml")[^>]*>/g,'')
  .replace(/<meta property="article:(?:published_time|modified_time)"[^>]*>/g,'');
 const path=article?'/learn/'+article.slug+'/':'/learn/',url=BASE+path;
 const title=article?.title||'Learn: curious questions, clear answers',description=article?.description||'Explore curious articles and beginner-friendly BrainiLab Academy courses. Clear explanations, everyday examples and optional short quizzes.';
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
 const articleDates=article?[['published_time',article.publishedAt],['modified_time',article.updatedAt||article.publishedAt]].filter(([,value])=>Number.isFinite(Date.parse(value))).map(([key,value])=>`<meta property="article:${key}" content="${esc(value)}"/>`).join(''):'';
 html=html.replace('</head>',()=>`<meta name="twitter:title" content="${esc(title)}"/><meta name="twitter:description" content="${esc(description)}"/><meta name="twitter:image" content="${esc(image)}"/><meta name="twitter:image:alt" content="${esc(cover.alt)}"/>${articleDates}<link rel="alternate" type="application/rss+xml" title="BrainiLab Learn" href="${BASE}/learn/feed.xml"/></head>`);
 if(article)html=html.replace(/<script defer src="\/assets\/js\/learn-library[^>]*><\/script>/,'').replace('</header><div class="article-layout">',()=>articleByline(article)+'</header><div class="article-layout">');
 else html=html.replace('<p class="learn-footer-link">','<p class="learn-feed-link"><a href="/learn/feed.xml">Follow new articles with RSS</a></p><p class="learn-footer-link">');
 return newTabLinks(html.replace('</head>',learningAssets+'</head>'));
}
