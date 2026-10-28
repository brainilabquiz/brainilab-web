// Shared, deterministic writing review. It cannot verify facts or search demand.
const normal=value=>String(value??'').replace(/\s+/g,' ').trim();
const count=text=>normal(text).split(' ').filter(Boolean).length;
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/[\x00-\x20\\]/.test(value);}catch{return false;}};
export function isSourceAddress(value){
 if(typeof value!=='string'||/[\x00-\x20\\]/.test(value))return false;
 if(https(value))return true;
 if(!value.startsWith('/')||value.startsWith('//')||value.includes('?'))return false;
 try{const u=new URL(value,'https://brainilabgames.com');return u.origin==='https://brainilabgames.com'&&/^\/(?:learn|games|daily-quiz|general-knowledge|geography|history|science|sports|plus|about)(?:\/|$)/.test(u.pathname);}catch{return false;}
}
const readableText=(node,document)=>{
 const copy=node.cloneNode(true);
 for(const el of copy.querySelectorAll('p,br,li,h3,h4,blockquote,td,th,dt,dd,figcaption,summary'))el.after(document.createTextNode(' '));
 return normal(copy.textContent);
};

export function inspectArticle(article,{document,articles=null,paths=null,mode='revision'}={}){
 if(!document?.createElement)throw new Error('Writing review needs an inert HTML document.');
 const a=article||{},issues=[],sections=Array.isArray(a.sections)?a.sections:[];
 const add=(level,code,field,message,sectionIndex,detail={})=>issues.push({level,code,field,message,...(sectionIndex===undefined?{}:{sectionIndex}),...detail});
 const error=(...args)=>add('error',...args),advice=(...args)=>add('advice',...args);
 const records=Array.isArray(articles)?articles.map(x=>x.document?{...x.document,slug:x.slug??x.document.slug}:x):null;
 const known=records?new Set(records.map(x=>x.slug)):null;
 const knownPaths=Array.isArray(paths)?new Set(paths.map(x=>x.slug)):null;
 const slug=normal(a.slug),title=normal(a.title),description=normal(a.description);
 if(!slugPattern.test(slug)||slug.length>100)error('url','article-slug','Use a short URL with lowercase letters, numbers and hyphens.');
 if(mode==='new'&&known?.has(slug))error('existing-url','article-slug','This URL already exists. Open that article to revise it.');
 if(!title)error('title','article-title','Add an article title.');
 if(!description)error('description','article-description','Add a short description.');
 if(!normal(a.topic))error('topic','article-topic','Choose the category that fits the question.');
 if(!normal(a.game?.name)||!/^\/(?!\/)[^\s\\]*$/.test(a.game?.url||'')||!normal(a.practice))error('game','article-game-pick','Choose a related game and write a short invitation to play.');
 if(title.length>90)advice('long-title','article-title','This title is long. Check its wrapping in the mobile preview.');
 if(description.length>180)advice('long-description','article-description','Consider shortening the description so the article starts sooner.');
 if(records?.some(x=>x.slug!==slug&&normal(x.title).toLowerCase()===title.toLowerCase()))advice('same-title','article-title','Another article has the same title. Check whether it answers a different question.');
 const sourceList=Array.isArray(a.sources)?a.sources:[],sourceUrls=new Set();
 for(const [i,s]of sourceList.entries()){
  const url=normal(s.url);
  if(!normal(s.name)||!isSourceAddress(url))error('source','source-url-'+i,'Give this source a name and a valid HTTPS address or public BrainiLab page.');
  if(sourceUrls.has(url))error('duplicate-source','source-url-'+i,'This source address is listed twice.');
  sourceUrls.add(url);
 }
 if(!sourceList.length)error('sources','article-add-source','Add the sources you actually checked.');
 const ids=new Set(),headings=new Set(),allParagraphs=[],allText=[],links=[],cited=new Set();
 if(!sections.length)error('sections','article-add-section','Add a section with a heading and text.');
 for(const [index,s]of sections.entries()){
  const id=normal(s.id),heading=normal(s.title),template=document.createElement('template');
  template.innerHTML=String(s.html??'');
  const body=template.content,text=readableText(body,document),field='section-title-'+index;
  if(!id||!slugPattern.test(id)||ids.has(id))error('section-id',field,'Give each section a unique identifier using lowercase letters, numbers and hyphens.',index);
  ids.add(id);
  if(!heading||!text)error('section-content',field,'This section needs a heading and some text.',index);
  if(heading&&headings.has(heading.toLowerCase()))advice('repeated-heading',field,'This heading is repeated. Make the sections easier to tell apart.',index);
  headings.add(heading.toLowerCase());
  if(body.querySelector('script,style,iframe,object,embed,form,button,input,select,textarea,svg,math,[data-interactive-resource]'))error('active-content',field,'Remove embedded scripts, forms or large interactive resources from the article text.',index);
  if([...body.querySelectorAll('*')].some(el=>[...el.attributes].some(x=>/^on/i.test(x.name))))error('event-handler',field,'Remove inline event handlers from this section.',index);
  const paragraphs=[...body.querySelectorAll('p')].map(p=>readableText(p,document));
  allParagraphs.push(...paragraphs);allText.push(text);
  const longParagraph=paragraphs.find(p=>count(p)>70);
  if(longParagraph)advice('long-paragraph',field,'This paragraph has '+count(longParagraph)+' words. Consider splitting it.',index,{excerpt:longParagraph.slice(0,180)});
  const sentences=text.match(/[^.!?]+[.!?]?(?:\s|$)/g)||[];
  const longSentence=sentences.find(s=>count(s)>35);
  if(longSentence)advice('long-sentence',field,'This sentence has '+count(longSentence)+' words. Read it aloud and see whether it can be simpler.',index,{excerpt:normal(longSentence).slice(0,180)});
  const repeated=text.match(/\b([A-Za-z]{2,})\s+\1\b/i);
  if(repeated)advice('repeated-word',field,'Check the repeated word “'+repeated[0]+'”. It may be intentional.',index,{excerpt:repeated[0]});
  const seenParagraphs=new Set((paragraphs.length?allParagraphs.slice(0,-paragraphs.length):allParagraphs).map(p=>p.toLowerCase()));
  for(const paragraph of paragraphs){const key=paragraph.toLowerCase();if(count(paragraph)>=12&&seenParagraphs.has(key))advice('repeated-paragraph',field,'This paragraph repeats text elsewhere in the article. Keep it only if it helps.',index,{excerpt:paragraph.slice(0,180)});seenParagraphs.add(key);}
  for(const link of body.querySelectorAll('a')){
   const href=link.getAttribute('href')||'';
   if(!normal(link.textContent))advice('empty-link',field,'Give this link readable text.',index);
   if(!href){error('empty-link-url',field,'A link has no destination.',index);continue;}
   if(/[\x00-\x20\\]/.test(href)||href.startsWith('//')||(!href.startsWith('/')&&!href.startsWith('#')&&!https(href)))error('unsafe-link',field,'Use a safe HTTPS address or an internal page link.',index);
   if(sourceUrls.has(href))cited.add(href);
   links.push({href,sectionIndex:index,field});
  }
 }
 for(const link of links){
  const{href,field,sectionIndex}=link;
  if(href.startsWith('#')&&!ids.has(href.slice(1)))error('missing-anchor',field,'This section link points to a heading that does not exist: '+href,sectionIndex);
  const match=href.match(/^\/learn\/([^/?#]+)(?:\/|[?#]|$)/);
  if(!match)continue;
  const target=match[1];
  if(target==='paths'){
   const path=href.match(/^\/learn\/paths\/([^/?#]+)(?:\/|[?#]|$)/)?.[1];
   if(path&&knownPaths&&!knownPaths.has(path))error('missing-course',field,'This course link does not match the current catalogue: '+href,sectionIndex);
  }else if(!['topics','academy','authors','feed.xml','index.html'].includes(target)&&known&&target!==slug&&!known.has(target))error('missing-article',field,'This article link does not match the current catalogue: '+href,sectionIndex);
  if(target===slug&&!href.includes('#'))advice('self-link',field,'This link returns to the same article.',sectionIndex);
 }
 const related=Array.isArray(a.related)?a.related:[];
 if(new Set(related).size!==related.length)error('duplicate-related','article-related-search','A related article is selected more than once.');
 if(related.some(s=>s===slug||(known&&!known.has(s))))error('missing-related','article-related-search','Choose related readings that exist, excluding this article.');
 if(related.length>2)advice('many-related','article-related-search','Two useful next readings are usually enough. Keep more only if they help.');
 if(sourceUrls.size>cited.size)advice('uncited-source','article-add-source','Some listed sources have no link in the text. Add a citation where it helps the reader.');
 const cover=a.cover||{};
 if(!normal(cover.src)||!normal(cover.alt)||!normal(cover.credit))error('cover','article-cover-url','Add a cover, a useful image description and an honest credit.');
 const variants=[cover.src,cover.small,cover.thumbnail].filter(Boolean);
 if(cover.src&&variants.length<3)advice('cover-sizes','article-cover-url','Check that the cover has small and thumbnail versions before release.');
 for(const [field,value]of [['article-title',title],['article-description',description]])if(/\b(?:SEO|AEO|GEO|conversion funnel|acquisition strategy|retention objective)\b/.test(value))advice('internal-copy',field,'Check whether internal growth or SEO wording has slipped into public copy.');
 const text=allText.join(' '),words=count(text);
 if(words>350)advice('long-reading','article-title','This is longer than the usual short read. Keep the detail only if it helps.');
 if(/\b(?:SEO|AEO|GEO|conversion funnel|acquisition strategy|retention objective)\b/.test(text))advice('internal-copy','article-title','Check whether internal growth or SEO wording has slipped into public copy.');
 return{passed:!issues.some(x=>x.level==='error'),problems:issues.filter(x=>x.level==='error'),warnings:issues.filter(x=>x.level==='advice'),metrics:{words,minutes:Math.max(1,Math.ceil(words/180)),sections:sections.length,paragraphs:allParagraphs.length,longestParagraph:Math.max(0,...allParagraphs.map(count)),titleCharacters:title.length,descriptionCharacters:description.length,citedSources:cited.size,listedSources:sourceList.length,internalLinks:links.filter(x=>x.href.startsWith('/')).map(x=>x.href)},limits:'Structure and readability checks only. Facts, source quality, search demand, rights and natural English still require editorial review.'};
}
