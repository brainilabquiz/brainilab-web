import test from 'node:test';
import assert from 'node:assert/strict';
import {firstEdition,selectNewsEdition} from '../lib/news-first-edition.js';
import {freshNews} from '../lib/breaking-news.js';
const now=Date.parse('2026-10-09T17:25:00Z');
test('launch edition is real dated content and keeps automation failure visible',()=>{
  const edition=selectNewsEdition({serviceStatus:'api-error'},now);
  assert.equal(edition.stories.length,5);assert.equal(edition.serviceStatus,'manual-edition');assert.equal(edition.automationStatus,'api-error');
});
test('new successful edition replaces launch content',()=>{
  const live={...firstEdition,generatedAt:'2026-10-09T18:00:00Z',serviceStatus:'updated'};
  assert.equal(selectNewsEdition(live,Date.parse('2026-10-09T18:01:00Z')),live);
});
test('launch stories expire individually and dates never reset',()=>{
  assert.equal(freshNews(selectNewsEdition(null,Date.parse('2026-10-10T00:00:00Z')),Date.parse('2026-10-10T00:00:00Z')).length,4);
  assert.equal(selectNewsEdition(null,Date.parse('2026-10-11T00:00:00Z')),null);
});
