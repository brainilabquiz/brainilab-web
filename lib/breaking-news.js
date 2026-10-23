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

function newsHeading(metadata = '') {
  return `<header class="breaking-news__header"><p class="breaking-news__label">World, in brief</p><h1 id="breaking-news-title">Breaking News</h1><p class="breaking-news__intro">A quick read of selected world stories.</p>${metadata}</header>`;
}

export function renderEmptyNews() {
  return `<section class="breaking-news wrap" aria-labelledby="breaking-news-title">${newsHeading()}<div class="breaking-news__empty"><h2>The latest brief isn’t available just now.</h2><p>There are no fresh stories to show. Find a curious question and a short read in Learn.</p><a href="/learn/">Explore Learn <span aria-hidden="true">→</span></a></div></section>`;
}

export function renderNews(edition, now = Date.now()) {
  const stories = freshNews(edition, now);
  if (!stories.length) return '';
  const updated = new Date(edition.generatedAt).toISOString();
  const display = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(updated));
  const sourceCount = new Set(stories.map(story => story.sourceName.trim().toLowerCase())).size;
  const metadata = `<p class="breaking-news__edition"><span>${stories.length} ${stories.length === 1 ? 'story' : 'stories'} from ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}</span><span>Updated <time datetime="${updated}">${escape(display)} UTC</time></span></p>`;
  const sourceDate = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeZone:'UTC'});
  return `<section class="breaking-news wrap" aria-labelledby="breaking-news-title">${newsHeading(metadata)}<ol class="breaking-news__list" aria-label="Selected world stories">${stories.map(story => `<li><article class="breaking-news__story"><p class="breaking-news__source"><span>${escape(story.sourceName)}</span><time datetime="${new Date(story.reportedAt).toISOString()}"><span class="breaking-news__sr">Source date: </span>${escape(sourceDate.format(new Date(story.reportedAt)))}</time></p><h2><a href="${escape(story.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(story.title)}<span class="breaking-news__outbound" aria-hidden="true">↗</span><span class="breaking-news__sr"> (opens in a new tab)</span></a></h2><p class="breaking-news__summary">${escape(story.summary)}</p></article></li>`).join('')}</ol><footer class="breaking-news__note"><p>Selected reports from the past 48 hours. Open a headline for the full story at its source. Dates are shown in UTC.</p></footer></section>`;
}
