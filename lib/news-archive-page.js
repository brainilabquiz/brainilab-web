import {newsCollectionHead, newsStoryHeadingId, renderNews} from './breaking-news.js';
import {ARCHIVE_PATH, NEWS_PATH, editionInstant, editionPath} from './news-archive.js';

const SITE = 'https://brainilabgames.com';
const day = new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'});
const shortDay = new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
const clock = new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'});
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const archiveTitle = 'Breaking News archive';
const archiveDescription = 'Browse headlines from earlier BrainiLab editions and open each story for its summary and original report.';
const archivePagePath = before => ARCHIVE_PATH + (before ? '?before=' + before : '');
const crumbs = [{name:'Breaking News',path:NEWS_PATH},{name:'Archive',path:ARCHIVE_PATH}];

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
