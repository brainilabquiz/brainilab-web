export const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text = (value, max) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max && !/[<>\u0000-\u001f]/.test(value);
const sourceURL = value => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.hash) return null;
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname) || /(^|\.)(localhost|local|internal)$/.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
};

// Expiry is checked at rendering time, independently of the scheduled refresh.
export function newsStoryProblem(story, generated, now) {
  for(const [field,max] of [['title',110],['summary',350],['sourceName',80]]) {
    const value=story?.[field];
    if(typeof value!=='string'||!value.trim()) return 'missing-'+field;
    if(value.trim().length>max) return 'long-'+field;
    if(!text(value,max)) return 'unsafe-'+field;
  }
  if(!sourceURL(story.sourceUrl)) return 'invalid-source-url';
  const reported=Date.parse(story.reportedAt);
  if(!Number.isFinite(reported)) return 'invalid-source-date';
  if(reported>generated) return 'future-source-date';
  if(now-reported>=NEWS_WINDOW_MS) return 'expired-source-date';
  return null;
}
export function freshNews(edition, now = Date.now()) {
  if (!edition || !Array.isArray(edition.stories) || !Number.isFinite(now)) return [];
  const generated = Date.parse(edition.generatedAt);
  if (!Number.isFinite(generated) || generated > now || now - generated >= NEWS_WINDOW_MS) return [];
  const seen = new Set();
  return edition.stories.filter(story => {
    if(newsStoryProblem(story,generated,now)) return false;
    const url=sourceURL(story.sourceUrl);
    const key = story.title.trim().toLowerCase();
    if (seen.has(key) || seen.has(url)) return false;
    seen.add(key); seen.add(url);
    return true;
  }).slice(0, 5);
}

// A small content fingerprint, not an authentication or security token.
export function newsEditionRevision(edition, now = Date.now()) {
  const stories = freshNews(edition, now);
  if (!stories.length) return '';
  const content = JSON.stringify([new Date(edition.generatedAt).toISOString(), stories.map(s => [s.title,s.summary,s.sourceName,s.sourceUrl,new Date(s.reportedAt).toISOString()])]);
  let a = 2166136261, b = 5381;
  for (let i=0; i<content.length; i++) { const c=content.charCodeAt(i); a=Math.imul(a^c,16777619); b=Math.imul(b,33)^c; }
  return [a,b].map(n=>(n>>>0).toString(16).padStart(8,'0')).join('');
}

const editionDate = new Intl.DateTimeFormat('en-GB', {weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC'});
const sourceDate = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium', timeZone:'UTC'});
const editionTime = new Intl.DateTimeFormat('en-GB', {timeStyle:'short', timeZone:'UTC'});
const publisherMarks = {bbc:'BBC', guardian:'G', aljazeera:'AJ', who:'WHO', nasa:'NASA', 'un-geneva':'UN', usgs:'USGS'};
const sourceDirectory = [
  ['G1 Mundo','https://g1.globo.com/mundo/'],
  ['The New York Times World','https://www.nytimes.com/section/world'],
  ['CNN World','https://www.cnn.com/world'],
  ['Infobae Mundo','https://www.infobae.com/america/mundo/'],
  ['Reuters World','https://www.reuters.com/world/'],
  ['UN Geneva','https://www.ungeneva.org/en/news-media'],
  ['U.S. Geological Survey','https://earthquake.usgs.gov/earthquakes/map/'],
  ['World Meteorological Organization','https://wmo.int/news/media-centre/press-releases']
];
const sourceKey = name => name.trim().toLowerCase();

function newsSources(stories, publishers) {
  const sources = new Map(publishers.map(({id, name}) => [sourceKey(name), {id, name, count:0}]));
  for (const {sourceName} of stories) {
    const key = sourceKey(sourceName);
    if (!sources.has(key)) sources.set(key, {id:'other-' + sources.size, name:sourceName.trim(), count:0});
    sources.get(key).count++;
  }
  return sources;
}

function newsHeading(updated, storyCount, sourceCount, nextCheck, {heading='Breaking News',archived=false,navigation=''}={}) {
  const date = updated ? `<span class="bn-dot" aria-hidden="true"></span><time datetime="${updated.slice(0,10)}">${editionDate.format(new Date(updated))}</time>` : '';
  const status = updated ? `${archived?'Edition published':'<span class="bn-pulse" aria-hidden="true"></span>Edition'} <time datetime="${updated}">${editionTime.format(new Date(updated))} UTC</time>` : 'No current edition';
  const check = nextCheck ? `<time datetime="${nextCheck.toISOString()}">${editionTime.format(nextCheck)}</time>` : '—';
  return `<header class="bn-masthead">
    <div class="bn-wrap">
      <div class="bn-intro">
        <p class="bn-kicker"><span>World, in brief</span>${date}</p>
        <h1 id="breaking-news-title">${escape(heading)}</h1>
        <p class="bn-lede">${archived?'The stories as they appeared in this edition, with links to the original reports.':'The day’s key stories in two minutes. Every summary links straight to the original report.'}</p>
        ${navigation}
      </div>
      <div class="bn-status">
        <p class="bn-live">${status}</p>
        <dl class="breaking-news__edition">
          <div><dt>Stories</dt><dd>${storyCount}</dd></div>
          <div><dt>Sources</dt><dd>${sourceCount}</dd></div>
          ${archived?'':`<div><dt>Next check (UTC)</dt><dd>${check}</dd></div>`}
        </dl>
        ${archived?'<a class="breaking-news__refresh" href="/breaking-news/">Read the latest edition</a>':`<a class="breaking-news__refresh" data-news-refresh href="/breaking-news/"><span aria-hidden="true">↻</span><span data-news-refresh-label>Check latest</span></a>
        <span class="breaking-news__sr" data-news-update-status role="status"></span>`}
      </div>
    </div>
  </header>`;
}

function newsBadge(source) {
  const mark = publisherMarks[source.id] || source.name.split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();
  return `<span class="breaking-news__mark" data-news-badge="${escape(source.id)}" aria-hidden="true">${escape(mark)}</span>`;
}

function newsSidebar(sources, showDirectory = true) {
  const rows = [...sources.values()].map(source => `<li>${newsBadge(source)}<span class="bn-source-name">${escape(source.name)}</span><span class="bn-source-count">${source.count ? source.count + (source.count === 1 ? ' story' : ' stories') : 'Nothing new'}</span></li>`).join('');
  return `<aside class="bn-aside">
    <section class="bn-card" aria-labelledby="bn-how">
      <h2 id="bn-how">How this page works</h2>
      <ol class="bn-steps">
        <li><div><strong>We read the sources</strong><p>Twice a day, at 00:00 and 12:00 UTC.</p></div></li>
        <li><div><strong>AI drafts a short summary</strong><p>From the publisher’s reports or official data.</p></div></li>
        <li><div><strong>Automatic checks</strong><p>Links, dates and figures that don’t match the source are rejected.</p></div></li>
      </ol>
      <p class="bn-context">A short summary can miss context. Read the original before relying on it.</p>
    </section>
    ${rows ? `<section class="bn-card" aria-labelledby="bn-sources"><h2 id="bn-sources">Sources we follow</h2><ul class="bn-sources">${rows}</ul></section>` : ''}
    ${showDirectory ? `<section class="bn-card" aria-labelledby="bn-source-directory"><h2 id="bn-source-directory">Visit more news sources</h2><ul class="bn-headline-links">${sourceDirectory.map(([name,url])=>`<li><a href="${escape(url)}">${escape(name)}</a></li>`).join('')}</ul></section>` : ''}
    <a class="bn-report-link" href="/suggestions/"><span aria-hidden="true">⚑</span> Report a problem with a summary</a>
  </aside>`;
}

function newsFilter(sources, count) {
  const options = [{id:'all', name:'All', count}, ...sources.values()];
  const chips = options.map(source => `<button type="button" class="bn-chip" data-news-filter-value="${escape(source.id)}" aria-pressed="${source.id === 'all'}"${source.count ? '' : ' disabled'}>${escape(source.name)} <span>${source.count}</span></button>`).join('');
  return `<div class="bn-filter-sources" data-news-filter hidden><div class="bn-source-options" role="group" aria-label="Filter by source">
    <span class="bn-filter-label" aria-hidden="true">Sources</span>${chips}
  </div><p class="breaking-news__sr" data-news-filter-status role="status"></p></div>`;
}

function newsBar(sources, count, pastStories, sourceFilters, searchForm) {
  if (!count && !pastStories && !sourceFilters && !searchForm) return '';
  const filters = sourceFilters || (count ? newsFilter(sources, count) : '');
  return `<div class="bn-filter" id="bn-source-filter" tabindex="-1"><div class="bn-wrap bn-filter-bar">${filters}${pastStories}</div>${searchForm}</div>`;
}

export const newsStoryHeadingId = index => `news-story-${index+1}-title`;

function newsCard(story, index, source) {
  const titleId = newsStoryHeadingId(index), noteId = `news-story-${index+1}-note`;
  const reported = new Date(story.reportedAt);
  return `<li data-news-story="${escape(source.id)}"><article class="breaking-news__story">
    <p class="breaking-news__source">
      <span class="bn-top-tag">Top story</span>${newsBadge(source)}
      <span class="breaking-news__publisher">${escape(story.sourceName)}</span>
      <time datetime="${reported.toISOString()}"><span class="breaking-news__sr">Source date: </span>${sourceDate.format(reported)}</time>
    </p>
    <h2 id="${titleId}">${escape(story.title)}</h2>
    <p class="breaking-news__summary">${escape(story.summary)}</p>
    <a class="breaking-news__story-link" href="${escape(story.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-labelledby="${titleId} ${noteId}">
      <span class="bn-read-full">Read the full report on ${escape(story.sourceName)}</span><span class="bn-read-short">Read report</span>
      <span aria-hidden="true">↗</span><span id="${noteId}" class="breaking-news__sr">(opens in a new tab)</span>
    </a>
  </article></li>`;
}

export function renderEmptyNews({publishers = [], navigation = '', previous = '', pastStories = '', sourceFilters = '', searchForm = ''} = {}) {
  return `<section class="breaking-news" aria-labelledby="breaking-news-title" data-news-revision="" data-news-generated-at="">
    ${newsHeading('', 0, 0, null, {navigation})}
    ${newsBar(null, 0, pastStories, sourceFilters, searchForm)}
    <div class="bn-wrap bn-main">
      <div class="bn-stories"><div class="breaking-news__empty bn-card"><h2>The latest brief isn’t available just now.</h2><p>There are no fresh stories to show. Find a curious question and a short read in Learn.</p><a href="/learn/">Explore Learn <span aria-hidden="true">→</span></a></div></div>
      ${newsSidebar(newsSources([],publishers))}
    </div>
    ${previous}
  </section>`;
}

export function renderNews(edition, now = Date.now(), {publishers = [], nextCheck = null, navigation = '', previous = '', pastStories = '', archived = false, heading, permalink = '', sourceFilters = '', sourceResults = null, searchForm = ''} = {}) {
  const stories = freshNews(edition, archived ? Date.parse(edition?.generatedAt) : now);
  if (!stories.length && !sourceResults) return '';
  const updated = stories.length ? new Date(edition.generatedAt).toISOString() : '';
  const sources = newsSources(stories,publishers);
  const sourceCount = [...sources.values()].filter(source => source.count).length;
  const matchingURLs = sourceResults && new Set(sourceResults.current.map(story=>story.sourceUrl));
  const shown = matchingURLs ? stories.filter(story=>matchingURLs.has(story.sourceUrl)) : stories;
  const [lead, ...others] = shown.map((story,index) => newsCard(story,index,sources.get(sourceKey(story.sourceName))));
  return `<section class="breaking-news${archived?' bn-edition-archived':''}" aria-labelledby="breaking-news-title"${archived?'':` data-news-revision="${newsEditionRevision(edition,now)}" data-news-generated-at="${updated}"`}>
    ${newsHeading(updated, stories.length, sourceCount, nextCheck, {heading,archived,navigation})}
    ${archived?'':newsBar(sources, stories.length, pastStories, sourceFilters, searchForm)}
    <div class="bn-wrap bn-main">
      <div class="bn-stories">
        ${sourceResults?.intro || ''}
        ${lead ? `<ol class="bn-lead" data-news-lead aria-label="Top story">${lead}</ol>` : ''}
        <section class="bn-more" data-news-more aria-labelledby="bn-more-title"${others.length ? '' : ' hidden'}>
          <h2 id="bn-more-title">${archived?'Also in this edition':'Also today'}</h2>
          <ol start="2" data-news-others>${others.join('')}</ol>
        </section>
        ${sourceResults?.earlier || ''}
      </div>
      ${newsSidebar(sources, !archived)}
    </div>
    ${previous}
    <div class="bn-foot"><div class="bn-wrap"><p>${archived?'Selected reports from the 48 hours before this edition. ':sourceResults?'':'Selected reports from the past 48 hours. '}Dates are shown in UTC.</p>${permalink?`<a href="${escape(permalink)}">Permanent link to this edition</a>`:''}</div></div>
  </section>`;
}

// Search metadata for the standalone page.
const SITE = 'https://brainilabgames.com';
const utcDay = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const listNames = names => names.length < 2 ? names.join('') : names.slice(0,-1).join(', ') + ' and ' + names.at(-1);

function setMeta(html, attr, key, value) {
  const re = new RegExp(`<meta\\s+(?:content="[^"]*"\\s+${attr}="${key}"|${attr}="${key}"\\s+content="[^"]*")\\s*/?>`, 'g');
  return html.replace(re, `<meta content="${escape(value)}" ${attr}="${key}"/>`);
}
// Indexable only while it has current stories: a dated title, a description
// naming the publishers and an ItemList that matches the visible briefs.
export function newsHead(html, edition, now = Date.now()) {
  const stories = freshNews(edition, now);
  if (!stories.length) return setMeta(html, 'name', 'robots', 'noindex,follow');
  const names = [...new Set(stories.map(s => s.sourceName))];
  const title = `World news in brief, ${utcDay.format(new Date(edition.generatedAt))}`;
  let description = `Short summaries of the latest world news from ${listNames(names)}, with a link to every original report. Updated twice a day.`;
  if (description.length > 155) description = 'Short summaries of the latest world news, with a link to every original report. Updated twice a day.';
  return newsCollectionHead(html,{path:'/breaking-news/',title,description,items:stories.map(s=>({name:s.title,url:s.sourceUrl})),
    breadcrumbs:[{name:'Breaking News',path:'/breaking-news/'}],dateModified:new Date(edition.generatedAt).toISOString()});
}

export function newsCollectionHead(html, {path,title,description,items,breadcrumbs,datePublished,dateModified}) {
  const url = SITE + path;
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':url+'#page',url,name:title,description,inLanguage:'en',...(datePublished?{datePublished}:{}),...(dateModified?{dateModified}:{}),isPartOf:{'@id':SITE+'/#website'},publisher:{'@id':SITE+'/#organization'},
      mainEntity:{'@type':'ItemList',numberOfItems:items.length,itemListElement:items.map(({name,url},i)=>({'@type':'ListItem',position:i+1,name,url}))}},
    {'@type':'BreadcrumbList',itemListElement:[{name:'Home',path:'/'},...breadcrumbs].map(({name,path},i)=>({'@type':'ListItem',position:i+1,name,item:SITE+path}))}]};
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(title)} | BrainiLab</title>`);
  html=html.replace(/(<link href=")https:\/\/brainilabgames\.com\/breaking-news\/(" (?:rel="canonical"|hreflang=))/g,(_,start,end)=>start+escape(url)+end);
  for (const [attr,key,value] of [['name','description',description],['property','og:title',title+' | BrainiLab'],['property','og:url',url],['property','og:description',description],['name','twitter:title',title+' | BrainiLab'],['name','twitter:description',description],['name','robots','index,follow,max-image-preview:large,max-snippet:-1']]) html = setMeta(html, attr, key, value);
  return html.replace('</head>', () => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
}
