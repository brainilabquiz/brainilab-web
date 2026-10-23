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

export function renderEmptyNews() {
  return '<section class="breaking-news wrap" aria-labelledby="breaking-news-title"><div class="breaking-news__card breaking-news__card--empty"><span class="breaking-news__label">World, in brief</span><h1 id="breaking-news-title">Breaking News</h1><p>No fresh stories to show right now.</p><a href="/learn/">Find something interesting to read <span aria-hidden="true">→</span></a></div></section>';
}

const SITE = 'https://brainilabgames.com';
const utcTime = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const utcDay = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
const listNames = names => names.length < 2 ? names.join('') : names.slice(0,-1).join(', ') + ' and ' + names.at(-1);

export function renderNews(edition, now = Date.now()) {
  const stories = freshNews(edition, now);
  if (!stories.length) return '';
  const updated = new Date(edition.generatedAt).toISOString();
  const display = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(updated));
  const items = stories.map((story, i) => `<li id="story-${i+1}"><div><h2>${escape(story.title)}</h2><p>${escape(story.summary)}</p><p class="breaking-news__meta">${escape(story.sourceName)} · <time datetime="${new Date(story.reportedAt).toISOString()}">${escape(utcTime.format(new Date(story.reportedAt)))} UTC</time></p></div><a href="${escape(story.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(story.sourceName)} <span aria-hidden="true">↗</span><span class="breaking-news__sr"> — source for ${escape(story.title)} (opens in a new tab)</span></a></li>`).join('');
  // Visible method note: readers and answer engines can see where each brief comes from and how it is made.
  const about = `<section class="breaking-news__about" aria-labelledby="breaking-news-about"><h2 id="breaking-news-about">How this page works</h2><p>Twice a day, at 00:00 and 12:00 UTC, we read the latest reports from BBC News, The Guardian, Al Jazeera, WHO South-East Asia and NASA, and pick up to five different stories. Each summary is written with AI assistance from that report’s own headline, description and opening paragraphs. Automatic checks reject links, dates and figures that do not match the source.</p><p>Stories leave the page 48 hours after they were published. A short summary can miss context or contain a mistake, so read the original report before relying on it. <a href="/suggestions/">Report a problem</a>.</p></section>`;
  return `<section class="breaking-news wrap" aria-labelledby="breaking-news-title"><div class="breaking-news__card"><header class="breaking-news__header"><div><span class="breaking-news__label">World, in brief</span><h1 id="breaking-news-title">Breaking News</h1></div><p>Selected stories from the last 48 hours.<br><small>Updated <time datetime="${updated}">${escape(display)} UTC</time></small></p></header><ol class="breaking-news__list">${items}</ol><p class="breaking-news__note">Brief summaries. Follow the source for the full story.</p>${about}</div></section>`;
}

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
  const url = SITE + '/breaking-news/';
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':url+'#page',url,name:title,description,inLanguage:'en',dateModified:new Date(edition.generatedAt).toISOString(),isPartOf:{'@id':SITE+'/#website'},publisher:{'@id':SITE+'/#organization'},
      mainEntity:{'@type':'ItemList',numberOfItems:stories.length,itemListElement:stories.map((s,i)=>({'@type':'ListItem',position:i+1,name:s.title,url:s.sourceUrl}))}},
    {'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE+'/'},{'@type':'ListItem',position:2,name:'Breaking News',item:url}]}]};
  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escape(title)} | BrainiLab</title>`);
  for (const [attr,key,value] of [['name','description',description],['property','og:title',title+' | BrainiLab'],['property','og:description',description],['name','twitter:title',title+' | BrainiLab'],['name','twitter:description',description],['name','robots','index,follow,max-image-preview:large,max-snippet:-1']]) html = setMeta(html, attr, key, value);
  return html.replace('</head>', () => `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script></head>`);
}
