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

function newsHeading(metadata = '') {
  return `<header class="breaking-news__header"><div class="breaking-news__masthead"><div class="breaking-news__heading"><p class="breaking-news__label">World, in brief</p><h1 id="breaking-news-title">Breaking News</h1><p class="breaking-news__intro">Short updates. Straight to the source.</p></div><picture class="breaking-news__art" aria-hidden="true"><img src="/assets/images/news/world-in-brief-320.webp" srcset="/assets/images/news/world-in-brief-320.webp 320w, /assets/images/news/world-in-brief-640.webp 640w, /assets/images/news/world-in-brief-960.webp 960w" sizes="(max-width: 600px) 100vw, (max-width: 1240px) 65vw, 800px" width="640" height="427" alt="" decoding="async" loading="lazy"/></picture></div><div class="breaking-news__edition">${metadata}<a class="breaking-news__refresh" data-news-refresh title="Check latest brief" href="/breaking-news/"><span data-news-refresh-label>Check latest</span><span aria-hidden="true">↻</span></a><span class="breaking-news__sr" data-news-update-status role="status" aria-live="polite"></span></div></header>`;
}

export function renderEmptyNews() {
  return `<section class="breaking-news wrap" aria-labelledby="breaking-news-title" data-news-revision="" data-news-generated-at="">${newsHeading()}<div class="breaking-news__empty"><h2>The latest brief isn’t available just now.</h2><p>There are no fresh stories to show. Find a curious question and a short read in Learn.</p><a href="/learn/">Explore Learn <span aria-hidden="true">→</span></a></div></section>`;
}

// Initials identify the publisher; these are simple text marks, not official logos.
function publisherMark(name) {
  const known = {'bbc news':'BBC','the guardian':'G','al jazeera':'AJ','nasa':'NASA','world health organization':'WHO','who':'WHO'};
  return known[name.trim().toLowerCase()] || name.trim().split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
}

export function renderNews(edition, now = Date.now()) {
  const stories = freshNews(edition, now);
  if (!stories.length) return '';
  const updated = new Date(edition.generatedAt).toISOString();
  const display = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(updated));
  const sourceCount = new Set(stories.map(story => story.sourceName.trim().toLowerCase())).size;
  const metadata = `<p class="breaking-news__facts"><span>${stories.length} ${stories.length === 1 ? 'story' : 'stories'} from ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}</span><span>Updated <time datetime="${updated}">${escape(display)} UTC</time></span></p>`;
  const sourceDate = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeZone:'UTC'});
  const cards = stories.map((story,i) => {
    const titleId = `news-story-${i+1}-title`, noteId = `news-story-${i+1}-note`;
    return `<li><article class="breaking-news__story"><p class="breaking-news__source"><span class="breaking-news__mark" aria-hidden="true">${escape(publisherMark(story.sourceName))}</span><span class="breaking-news__identity"><span class="breaking-news__publisher">${escape(story.sourceName)}</span><time datetime="${new Date(story.reportedAt).toISOString()}"><span class="breaking-news__sr">Source date: </span>${escape(sourceDate.format(new Date(story.reportedAt)))}</time></span></p><a class="breaking-news__story-link" href="${escape(story.sourceUrl)}" target="_blank" rel="noopener noreferrer" aria-labelledby="${titleId} ${noteId}"><h2 id="${titleId}">${escape(story.title)}</h2><p class="breaking-news__summary">${escape(story.summary)}</p><span class="breaking-news__read" aria-hidden="true">Read report <span>↗</span></span><span id="${noteId}" class="breaking-news__sr">(opens in a new tab)</span></a></article></li>`;
  }).join('');
  return `<section class="breaking-news wrap" aria-labelledby="breaking-news-title" data-news-revision="${newsEditionRevision(edition,now)}" data-news-generated-at="${updated}">${newsHeading(metadata)}<ol class="breaking-news__list" aria-label="Selected world stories">${cards}</ol><footer class="breaking-news__note"><p>Selected reports from the past 48 hours. Open a headline for the full story at its source. Dates are shown in UTC.</p></footer></section>`;
}
