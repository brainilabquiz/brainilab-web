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
export function freshNews(edition, now = Date.now()) {
  if (!edition || !Array.isArray(edition.stories) || !Number.isFinite(now)) return [];
  const generated = Date.parse(edition.generatedAt);
  if (!Number.isFinite(generated) || generated > now || now - generated >= NEWS_WINDOW_MS) return [];
  const seen = new Set();
  return edition.stories.filter(story => {
    if (!story || !text(story.title, 110) || !text(story.summary, 350) || !text(story.sourceName, 80)) return false;
    const reported = Date.parse(story.reportedAt), url = sourceURL(story.sourceUrl);
    if (!url || !Number.isFinite(reported) || reported > generated || now - reported >= NEWS_WINDOW_MS) return false;
    const key = story.title.trim().toLowerCase();
    if (seen.has(key) || seen.has(url)) return false;
    seen.add(key); seen.add(url);
    return true;
  }).slice(0, 5);
}

export function renderNews(edition, now = Date.now()) {
  const stories = freshNews(edition, now);
  if (!stories.length) return '';
  const updated = new Date(edition.generatedAt).toISOString();
  const display = new Intl.DateTimeFormat('en-GB', {dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(updated));
  return `<section class="breaking-news wrap" aria-labelledby="breaking-news-title"><div class="breaking-news__card"><header class="breaking-news__header"><div><span class="breaking-news__label">World, in brief</span><h2 id="breaking-news-title">Breaking News</h2></div><p>Selected stories from the last 48 hours.<br><small>Updated <time datetime="${updated}">${escape(display)} UTC</time></small></p></header><ol class="breaking-news__list">${stories.map(story => `<li><div><h3>${escape(story.title)}</h3><p>${escape(story.summary)}</p></div><a href="${escape(story.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(story.sourceName)} <span aria-hidden="true">↗</span><span class="breaking-news__sr"> — source for ${escape(story.title)} (opens in a new tab)</span></a></li>`).join('')}</ol><p class="breaking-news__note">Brief summaries. Follow the source for the full story.</p></div></section>`;
}
