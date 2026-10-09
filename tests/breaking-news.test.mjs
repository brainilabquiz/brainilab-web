import test from 'node:test';
import assert from 'node:assert/strict';
import {freshNews, renderNews, NEWS_WINDOW_MS} from '../lib/breaking-news.js';
const now = Date.parse('2026-10-09T18:00:00Z');
const story = {title:'A test headline',summary:'A short test summary.',sourceName:'Official source',sourceUrl:'https://example.org/news',reportedAt:'2026-10-09T16:00:00Z'};
const edition = stories => ({generatedAt:'2026-10-09T17:00:00Z',stories});
test('expired stories disappear exactly at 48 hours', () => {
  const item={...story,reportedAt:new Date(now-NEWS_WINDOW_MS).toISOString()};
  assert.equal(freshNews(edition([item]),now).length,0);
  item.reportedAt=new Date(now-NEWS_WINDOW_MS+1).toISOString();
  assert.equal(freshNews(edition([item]),now).length,1);
});
test('future stories and future or stale editions cannot render', () => {
  assert.equal(freshNews(edition([{...story,reportedAt:'2026-10-09T19:00:00Z'}]),now).length,0);
  assert.equal(renderNews({generatedAt:'2026-10-09T19:00:00Z',stories:[story]},now),'');
  assert.equal(renderNews(edition([story]),now+NEWS_WINDOW_MS),'');
});
test('maximum five distinct stories and source links', () => {
  const items=Array.from({length:7},(_,i)=>({...story,title:`Headline ${i}`,sourceUrl:`https://example.org/${i}`}));
  assert.equal(freshNews(edition([items[0],items[0],...items]),now).length,5);
});
test('unsafe links and markup are rejected', () => {
  for(const sourceUrl of ['javascript:alert(1)','http://example.org/','https://user:pass@example.org/','https://127.0.0.1/','https://localhost/']) assert.equal(freshNews(edition([{...story,sourceUrl}]),now).length,0);
  assert.equal(freshNews(edition([{...story,summary:'<script>alert(1)</script>'}]),now).length,0);
});
test('sources open separately and empty editions have no attention treatment', () => {
  assert.match(renderNews(edition([story]),now),/target="_blank" rel="noopener noreferrer"/);
  assert.equal(renderNews(edition([]),now),'');
  assert.equal(renderNews(null,now),'');
});
