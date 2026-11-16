import {freshNews} from './breaking-news.js';
import {firstEdition} from './news-first-edition.js';

export const NEWS_PATH = '/breaking-news/';
export const ARCHIVE_PATH = NEWS_PATH + 'archive/';
export const ARCHIVE_PAGE_SIZE = 20;

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

export async function readNewsArchive(storage, {id,before,recent}, {now,slotMs,reviewIds}) {
  const requested = id || before;
  const instant = requested ? editionInstant(requested) : Infinity;
  if (requested && (!Number.isFinite(instant) || instant > now)) return null;

  const exactKey = requested && 'audit:' + Math.floor(instant / slotMs);
  const keys = ['edition', ...reviewIds.map(review => 'audit:review:' + review), ...(exactKey ? [exactKey] : [])];
  const records = await storage.get(keys);
  const known = [records.get('edition'), ...keys.slice(1).map(key => records.get(key)?.edition), firstEdition]
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
