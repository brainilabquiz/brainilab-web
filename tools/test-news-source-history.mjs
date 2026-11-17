import assert from 'node:assert/strict';
import { BreakingNewsStore, REFRESH_MS } from '../lib/news-refresh.js';
import { editionId } from '../lib/news-archive.js';

const now = Date.parse('2026-11-17T18:00:00Z');
const latest = now - 60_000;
const bbcURL = 'https://www.bbc.com/news/articles/';
const story = (name, sourceName, sourceUrl, instant) => ({
  title:name, summary:'A short verified summary from the publisher.', sourceName, sourceUrl,
  reportedAt:new Date(instant - 6000).toISOString()
});
const edition = (instant, stories) => ({generatedAt:new Date(instant).toISOString(),stories});
const ledger = new Map();
for (let i = 1; i <= 130; i++) {
  const time = latest - i*REFRESH_MS;
  const stories = [story('BBC story '+i,'BBC News',bbcURL+'archive'+i,time)];
  if (i === 1) stories.push(story('Current report in a previous edition','BBC News',bbcURL+'current?utm_source=old',time));
  ledger.set('audit:'+Math.floor(time/REFRESH_MS),{edition:edition(time,stories),evidence:['private detail']});
}
ledger.set('edition',edition(latest,[story('Current BBC news','BBC News',bbcURL+'current',latest)]));
let lists = 0;
const storage = {
  async get(keys) {
    return Array.isArray(keys) ? new Map(keys.filter(key=>ledger.has(key)).map(key=>[key,ledger.get(key)])) : ledger.get(keys);
  },
  async list({start,end,limit,reverse}) {
    lists++;
    assert.equal(reverse,true);
    return new Map([...ledger].filter(([key])=>key>=start&&key<end)
      .sort(([a],[b])=>b.localeCompare(a)).slice(0,limit));
  }
};
const store = new BreakingNewsStore({storage},{});
const read = (query='',instant=now) =>
  store.fetch(new Request('https://news.internal/archive?sources=1'+query),instant);
const first = await (await read('&source=bbc')).json();
assert.equal(first.selected.current.length,1);
assert.equal(first.selected.currentCount,1);
assert.equal(first.selected.olderCount,132);
assert.equal(first.selected.count,133);
assert.equal(first.selected.rows.length,25);
assert.equal(first.selected.hasOlder,true);
assert.equal(first.filters.find(filter=>filter.id==='bbc').count,first.selected.count);
assert(!first.selected.rows.some(row=>row.title==='Current report in a previous edition'));
assert(first.selected.rows.every(row=>row.source==='bbc'));
assert(!JSON.stringify(first).includes('private detail'));
assert.equal(lists,2,'All audit batches are read, including beyond the first page');
const last = await (await read('&source=bbc&page=6')).json();
assert.equal(last.selected.current.length,0);
assert.equal(last.selected.rows.at(-1).title,'BBC story 130');
assert.equal(last.selected.rows.at(-1).editionId,editionId(new Date(latest-130*REFRESH_MS).toISOString()));
assert.equal(last.selected.hasOlder,false);
assert.equal(lists,2,'Pagers reuse the cached index');
assert.equal((await read('&source=bbc&page=7')).status,404);
assert.equal((await read('&source=bad')).status,404);
assert.equal((await read('&page=3')).status,404);
assert.equal((await (await read('&source=who')).json()).selected.count,0);
assert.equal((await (await read()).json()).selected,undefined);
const withoutFresh=await (await read('&source=bbc',now+5*REFRESH_MS)).json();
assert.equal(withoutFresh.edition,null);
assert.equal(withoutFresh.selected.currentCount,0);
assert.equal(withoutFresh.selected.olderCount,133);

const updated = latest+1000;
ledger.set('edition',edition(updated,[story('New BBC story','BBC News',bbcURL+'new',updated)]));
ledger.set('audit:'+Math.floor(latest/REFRESH_MS),{edition:edition(latest,[story('Current BBC news','BBC News',bbcURL+'current',latest)])});
const changed=await (await read('&source=bbc')).json();
assert.equal(changed.selected.count,134);
assert.equal(changed.selected.current[0].title,'New BBC story');
assert.equal(changed.selected.rows[0].title,'Current BBC news');
assert.equal(lists,6,'A new edition invalidates the index immediately');
console.log('PASS Breaking News source history: exact counts, expired editions, duplicates, paging, refreshed counts and read-only storage.');
