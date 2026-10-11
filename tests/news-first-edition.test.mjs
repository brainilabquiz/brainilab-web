import test from 'node:test';
import assert from 'node:assert/strict';
import {firstEdition,selectNewsEdition} from '../lib/news-first-edition.js';
import {freshNews} from '../lib/breaking-news.js';
const now=Date.parse(firstEdition.generatedAt)+60000;
test('launch edition is real dated content and keeps automation failure visible',()=>{
  const edition=selectNewsEdition({serviceStatus:'api-error'},now);
  assert.equal(edition.stories.length,5);assert.equal(new Set(edition.stories.map(s=>s.sourceName)).size,5);assert.equal(edition.serviceStatus,'manual-edition');assert.equal(edition.automationStatus,'api-error');
});
test('new successful edition replaces launch content',()=>{
  const live={...firstEdition,generatedAt:new Date(now+60000).toISOString(),serviceStatus:'updated'};
  assert.equal(selectNewsEdition(live,now+120000),live);
});
test('launch stories expire individually and dates never reset',()=>{
  assert.equal(freshNews(selectNewsEdition(null,Date.parse('2026-10-12T04:30:00Z')),Date.parse('2026-10-12T04:30:00Z')).length,3);
  assert.equal(selectNewsEdition(null,Date.parse('2026-10-13T09:38:01Z')),null);
});
