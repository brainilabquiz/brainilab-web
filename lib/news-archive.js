import {freshNews} from './breaking-news.js';
import {manualNewsArchive} from './news-first-edition.js';

export const NEWS_PATH = '/breaking-news/';
export const ARCHIVE_PATH = NEWS_PATH + 'archive/';
export const ARCHIVE_PAGE_SIZE = 20;
const SOURCE_PAGE_SIZE = 25;
const ARCHIVE_BATCH_SIZE = 128;
export const NEWS_QUERY_LIMIT = 120;
const searchWords = text => text.normalize('NFKD').toLowerCase().replace(/\p{M}/gu,'').match(/[\p{L}\p{N}]+/gu) || [];

export function editionId(iso) {
  return iso.replace(/T(\d\d):(\d\d):(\d\d)\.(\d{3})Z$/, '-$1$2$3$4');
}

export function editionInstant(id) {
  const parts = /^(\d{4}-\d\d-\d\d)-(\d\d)(\d\d)(\d\d)(\d{3})$/.exec(id);
  if (!parts) return NaN;
  const [, date, hours, minutes, seconds, ms] = parts;
  const instant = Date.parse(`${date}T${hours}:${minutes}:${seconds}.${ms}Z`);
  return Number.isFinite(instant) && editionId(new Date(instant).toISOString()) === id ? instant : NaN;
}

export function editionPath(edition) {
  return ARCHIVE_PATH + editionId(edition.generatedAt) + '/';
}

function publicEdition(edition, now) {
  const published = Date.parse(edition?.generatedAt);
  if (!Number.isFinite(published) || published > now) return null;
  // Validate against the edition's original clock, so a valid historical
  // source does not have to be recent today. Export only the published fields.
  const stories = freshNews(edition, published);
  if (!stories.length) return null;
  return {generatedAt:new Date(published).toISOString(), stories:stories.map(({title,summary,sourceName,sourceUrl,reportedAt}) =>
    ({title,summary,sourceName,sourceUrl,reportedAt:new Date(reportedAt).toISOString()}))};
}

export function sourceArchiveQuery(params) {
  const source = params.get('source');
  const page = params.get('page') ?? '1';
  const q = (params.get('q') || '').trim().replace(/\s+/g,' ');
  if ((!source && (params.has('source') || (!q && params.has('page')))) ||
      (source && !/^[a-z0-9][a-z0-9.-]{0,79}$/.test(source)) ||
      q.length > NEWS_QUERY_LIMIT || !/^[1-9]\d{0,7}$/.test(page)) return null;
  return {source, page:Number(page), q};
}

export async function readNewsSourceIndex(storage, {edition:current, now, reviewIds, publishers, articleKey}) {
  const reviewKeys = reviewIds.map(review => 'audit:review:' + review);
  const reviews = await storage.get(reviewKeys);
  const editions = new Map();
  function remember(raw) {
    const edition = publicEdition(raw, now);
    if (edition) editions.set(edition.generatedAt, edition);
  }
  for (const edition of manualNewsArchive) remember(edition);
  for (const review of reviews.values()) remember(review?.edition);
  let end = 'audit::';
  while (true) {
    const audits = await storage.list({start:'audit:0',end,reverse:true,limit:ARCHIVE_BATCH_SIZE,noCache:true});
    for (const audit of audits.values()) remember(audit?.edition);
    if (audits.size < ARCHIVE_BATCH_SIZE) break;
    end = [...audits.keys()].at(-1);
  }
  remember(current);

  const knownHosts = new Map(publishers.flatMap(publisher => publisher.hosts.map(host => [host,publisher.id])));
  const filters = new Map(publishers.map(({id,name}) => [id,{id,name,count:0}]));
  const articles = new Map();
  const ordered = [...editions.values()].sort((a,b) => b.generatedAt.localeCompare(a.generatedAt));
  for (const edition of ordered) {
    edition.stories.forEach((story,index) => {
      const key = articleKey(story.sourceUrl) || story.sourceUrl;
      if (articles.has(key)) return;
      const host = new URL(story.sourceUrl).hostname;
      const source = knownHosts.get(host) || knownHosts.get('www.' + host) || 'other-' + host.replace(/^www\./,'');
      if (!filters.has(source)) filters.set(source,{id:source,name:story.sourceName,count:0});
      filters.get(source).count++;
      articles.set(key,{source,title:story.title,reportedAt:story.reportedAt,editionId:editionId(edition.generatedAt),index,
        words:searchWords(story.title+' '+story.summary)});
    });
  }
  const rows = [...articles].sort(([,a],[,b]) => b.reportedAt.localeCompare(a.reportedAt));
  return {filters:[{id:'all',name:'All',count:rows.length},...filters.values()], rows, articles};
}

export function filterNewsSourceHistory(index, edition, now, {source:requested,page,q}, articleKey) {
  const current = publicEdition(edition, now);
  const stories = current ? freshNews(current, now) : [];
  const latest = stories.length ? {...current,stories} : null;
  const source = requested || (q ? 'all' : null);
  if (!source) return {filters:index.filters, edition:latest};
  const terms = q ? searchWords(q) : [];
  const matches = article => article && (!q || terms.length > 0 && terms.every(term =>
    article.words.some(word=>word.startsWith(term))));
  const rows = q ? index.rows.filter(([,article])=>matches(article)) : index.rows;
  const counts = new Map();
  if(q) for(const [,article] of rows) counts.set(article.source,(counts.get(article.source)||0)+1);
  const filters = q ? index.filters.map(filter=>({...filter,count:filter.id==='all'?rows.length:counts.get(filter.id)||0})) : index.filters;
  const option = filters.find(filter => filter.id === source);
  if (!option) return null;
  const includes = article => article && (source === 'all' || article.source === source);
  const currentByURL = new Map();
  for (const story of stories) {
    const key = articleKey(story.sourceUrl) || story.sourceUrl;
    if (!currentByURL.has(key)) currentByURL.set(key,story);
  }
  const currentStories = [...currentByURL].filter(([key]) => {
    const article = index.articles.get(key);
    return includes(article) && matches(article);
  }).map(([,story])=>story);
  const older = rows.filter(([key,article]) => includes(article) && !currentByURL.has(key));
  const offset = (page - 1) * SOURCE_PAGE_SIZE;
  if (page > 1 && offset >= older.length) return null;
  return {filters, edition:latest, selected:{...option,page,
    current:page === 1 ? currentStories : [], currentCount:currentStories.length, olderCount:older.length,
    rows:older.slice(offset,offset + SOURCE_PAGE_SIZE).map(([, {words, ...row}])=>row),
    hasOlder:offset + SOURCE_PAGE_SIZE < older.length}};
}

export async function readNewsArchive(storage, {id,before,recent}, {now,slotMs,reviewIds}) {
  const requested = id || before;
  const instant = requested ? editionInstant(requested) : Infinity;
  if (requested && (!Number.isFinite(instant) || instant > now)) return null;

  const exactKey = requested && 'audit:' + Math.floor(instant / slotMs);
  const keys = ['edition', ...reviewIds.map(review => 'audit:review:' + review), ...(exactKey ? [exactKey] : [])];
  const records = await storage.get(keys);
  const known = [records.get('edition'), ...keys.slice(1).map(key => records.get(key)?.edition), ...manualNewsArchive]
    .map(edition => publicEdition(edition, now)).filter(Boolean);
  if (requested && !known.some(edition => editionId(edition.generatedAt) === requested)) return null;
  if (id) return {edition:known.find(edition => editionId(edition.generatedAt) === id)};

  const limit = recent ? 4 : ARCHIVE_PAGE_SIZE;
  // Numeric slot keys predate the archive. Bound this read and exclude
  // review keys and every other private storage prefix.
  const end = exactKey ? 'audit:' + (Math.floor(instant / slotMs) + 1) : 'audit::';
  const audits = await storage.list({start:'audit:0',end,reverse:true,limit:limit+2});
  const editions = new Map(known.map(edition => [edition.generatedAt,edition]));
  for (const audit of audits.values()) {
    const edition = publicEdition(audit?.edition, now);
    if (edition) editions.set(edition.generatedAt,edition);
  }
  const eligible = [...editions.values()].filter(edition => Date.parse(edition.generatedAt) < instant)
    .sort((a,b) => b.generatedAt.localeCompare(a.generatedAt));
  const items = eligible.slice(0,limit);
  return {items, older:eligible.length > limit ? editionId(items.at(-1).generatedAt) : null};
}
