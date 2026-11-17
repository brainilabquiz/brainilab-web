import {newsCollectionHead, newsStoryHeadingId, renderNews} from './breaking-news.js';
import {ARCHIVE_PATH, NEWS_PATH, NEWS_QUERY_LIMIT, editionInstant, editionPath} from './news-archive.js';

const SITE = 'https://brainilabgames.com';
const day = new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'});
const shortDay = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
const clock = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const archiveTitle = 'Breaking News archive';
const archiveDescription = 'Browse headlines from earlier BrainiLab editions and open each story for its summary and original report.';
const archivePagePath = before => ARCHIVE_PATH + (before ? '?before=' + before : '');
const crumbs = [{name:'Breaking News',path:NEWS_PATH},{name:'Archive',path:ARCHIVE_PATH}];
function sourcePath(id, page = 1, q = '') {
  const params = new URLSearchParams();
  if (id) params.set('source',id);
  if (q) params.set('q',q);
  if (page > 1) params.set('page',String(page));
  return `${NEWS_PATH}${params.size ? '?' + escape(params.toString()) : ''}#bn-source-filter`;
}
const storyCount = count => `${count} ${count === 1 ? 'story' : 'stories'}`;

function editionLabel(edition) {
  const date = new Date(edition.generatedAt);
  return `${day.format(date)} · ${clock.format(date)} UTC`;
}

function archiveCrumbs(current = '') {
  const archive = current ? `<a href="${ARCHIVE_PATH}">Archive</a>` : '<span aria-current="page">Archive</span>';
  const label = current ? `<span aria-current="page">${escape(current)}</span>` : '';
  return `<nav class="bn-archive-crumbs" aria-label="Breadcrumb"><a href="/">Home</a><a href="${NEWS_PATH}">Breaking News</a>${archive}${label}</nav>`;
}

export function newsEditionNav(current, previous) {
  const when = current ? ` <time datetime="${current.generatedAt}">${clock.format(new Date(current.generatedAt))} UTC</time>` : '';
  const links = previous.map(edition=>{
    const date = new Date(edition.generatedAt);
    return `<a href="${editionPath(edition)}"><time datetime="${edition.generatedAt}">${shortDay.format(date)} · ${clock.format(date)} UTC</time></a>`;
  });
  return `<nav class="bn-edition-nav" aria-label="Editions"><a aria-current="page" href="${NEWS_PATH}">Latest${when}</a>${links.join('')}<a href="${ARCHIVE_PATH}">Archive</a></nav>`;
}

function editionHeadlineLinks(edition) {
  const path = editionPath(edition);
  const links = edition.stories.map((story, index) =>
    `<li><a href="${path}#${newsStoryHeadingId(index)}">${escape(story.title)}</a></li>`);
  return `<ul class="bn-headline-links">${links.join('')}</ul>`;
}

export function newsSearchForm(source, q) {
  return `<form class="bn-wrap bn-news-search" role="search" aria-label="Search Breaking News" action="${NEWS_PATH}#bn-source-filter">
    ${source ? `<input type="hidden" name="source" value="${escape(source)}">` : ''}
    <label for="bn-news-query">Search news</label>
    <input type="search" name="q" id="bn-news-query" value="${escape(q)}" maxlength="${NEWS_QUERY_LIMIT}" placeholder="Search headlines and summaries">
    <button type="submit" class="bn-chip">Search</button>
    ${q ? `<a href="${sourcePath(source)}">Clear search</a>` : ''}
  </form>`;
}

export function newsSourceFilters(filters, selected, q = '') {
  const chips = filters.map(({id,name,count}) => count
    ? `<a class="bn-chip" data-news-source="${escape(id)}" href="${sourcePath(id, 1, q)}"${id === selected ? ' aria-current="page"' : ''}>${escape(name)} <span>${count}</span></a>`
    : `<span class="bn-chip bn-chip-empty" data-news-source="${escape(id)}"${id === selected ? ' aria-current="page"' : ''}>${escape(name)} <span>0</span></span>`);
  return `<nav class="bn-filter-sources bn-source-options" aria-label="Filter by source"><span class="bn-filter-label" aria-hidden="true">Sources</span>${chips.join('')}</nav>`;
}

export function newsSourceResults({id,name,count,currentCount,olderCount,page,rows,hasOlder}, q = '') {
  const scope = id === 'all' ? '' : ` from ${escape(name)}`;
  const title = q ? `Results for “${escape(q)}”${scope}` : scope ? 'Stories'+scope : 'All stories';
  return {
    intro: `<div class="bn-source-results"><h2>${title}</h2><p>${storyCount(count)} · ${currentCount} in the latest edition · ${olderCount} from earlier editions</p></div>`,
    earlier: rows.length ? `<section class="bn-card bn-source-history" aria-labelledby="bn-older-stories">
      <h2 id="bn-older-stories">Earlier stories</h2>
      <ul class="bn-headline-links">${rows.map(story => `<li>
        <a href="${ARCHIVE_PATH}${story.editionId}/#${newsStoryHeadingId(story.index)}">${escape(story.title)}</a>
        <time datetime="${story.reportedAt}">${day.format(new Date(story.reportedAt))}</time>
      </li>`).join('')}</ul>
      ${page > 1 || hasOlder ? `<nav class="bn-archive-pagination" aria-label="Stories pages">
        ${page > 1 ? `<a href="${sourcePath(id, page - 1, q)}">Newer stories <span aria-hidden="true">←</span></a>` : ''}
        ${hasOlder ? `<a href="${sourcePath(id, page + 1, q)}">Older stories <span aria-hidden="true">→</span></a>` : ''}
      </nav>` : ''}
    </section>` : count ? '' : `<p>${q?'No stories match this search.':'No stories from this source are available yet.'}</p>`
  };
}

export function newsPastStories(editions) {
  if (!editions.length) return `<a class="bn-chip bn-past-stories" href="${ARCHIVE_PATH}">Past stories</a>`;
  return `<details class="bn-past-stories">
    <summary class="bn-chip">Past stories <span aria-hidden="true">▾</span></summary>
    <div class="bn-past-panel bn-card">
      <a class="bn-all-past" href="${ARCHIVE_PATH}">Browse all past stories <span aria-hidden="true">→</span></a>
      ${editions.map(edition=>`<div class="bn-past-edition">
        <p><time datetime="${edition.generatedAt}">${editionLabel(edition)}</time></p>
        ${editionHeadlineLinks(edition)}
      </div>`).join('')}
    </div>
  </details>`;
}

export function renderPreviousEditions(editions) {
  if (!editions.length) return '';
  return `<section class="bn-wrap bn-previous" aria-labelledby="bn-previous-title">
    <div class="bn-previous-heading"><h2 id="bn-previous-title">Previous editions</h2><a href="${ARCHIVE_PATH}">Browse the archive <span aria-hidden="true">→</span></a></div>
    <ol class="bn-edition-grid" role="list">${editions.map(edition=>`<li class="bn-card bn-edition-card"><h3><a data-edition-link href="${editionPath(edition)}"><time datetime="${edition.generatedAt}">${editionLabel(edition)}</time></a></h3>
      ${editionHeadlineLinks(edition)}
    </li>`).join('')}</ol>
  </section>`;
}

export function archivedEditionPage(html, edition) {
  const label = editionLabel(edition);
  const title = `World news in brief · ${label}`;
  const description = 'Short world news summaries from this edition, with dates, publishers and direct links to the original reports.';
  const path = editionPath(edition);
  return {
    head:newsCollectionHead(html,{path,title,description,items:edition.stories.map(s=>({name:s.title,url:s.sourceUrl})),
      breadcrumbs:[...crumbs,{name:label,path}],datePublished:edition.generatedAt}),
    content:renderNews(edition,Date.parse(edition.generatedAt),{archived:true,heading:title,navigation:archiveCrumbs(label)})
  };
}

export function newsArchivePage(html,{items,older},before) {
  const path = archivePagePath(before);
  const label = before ? 'Before ' + editionLabel({generatedAt:editionInstant(before)}) : '';
  const title = label ? archiveTitle + ' · ' + label : archiveTitle;
  const index = items.map(edition=>({name:editionLabel(edition),url:SITE+editionPath(edition)}));
  return {
    head:newsCollectionHead(html,{path,title,description:archiveDescription,items:index,breadcrumbs:label?[...crumbs,{name:label,path}]:crumbs}),
    content:`<section class="breaking-news" aria-labelledby="breaking-news-title">
      <header class="bn-masthead bn-archive-masthead"><div class="bn-wrap"><div class="bn-intro">${archiveCrumbs(label)}<h1 id="breaking-news-title">${escape(title)}</h1>
        <p class="bn-lede">${archiveDescription}</p></div></div></header>
      <div class="bn-wrap bn-archive-list">
        <ol role="list">${items.map((edition,i)=>`<li class="bn-card bn-archive-row"><h2><a data-edition-link href="${editionPath(edition)}"><time datetime="${edition.generatedAt}">${index[i].name}</time></a></h2>
          ${editionHeadlineLinks(edition)}</li>`).join('')}</ol>
        <nav class="bn-archive-pagination" aria-label="Archive pages">${before?`<a href="${ARCHIVE_PATH}">Newest editions</a>`:''}${older?`<a href="${archivePagePath(older)}">Older editions <span aria-hidden="true">→</span></a>`:''}</nav>
      </div>
    </section>`
  };
}
