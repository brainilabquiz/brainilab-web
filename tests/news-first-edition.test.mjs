import test from 'node:test';
import assert from 'node:assert/strict';
import {firstEdition,selectNewsEdition} from '../lib/news-first-edition.js';
import {freshNews,newsStoryProblem} from '../lib/breaking-news.js';
const now=Date.parse(firstEdition.generatedAt)+60000;
test('manual edition is real dated content and keeps automation failure visible',()=>{
  const edition=selectNewsEdition({serviceStatus:'invalid-key'},now);
  assert.equal(edition.stories.length,firstEdition.stories.length);assert.equal(edition.serviceStatus,'manual-edition');assert.equal(edition.automationStatus,'invalid-key');
  // One report per available publisher before a second one from the same publisher.
  assert.ok(new Set(edition.stories.map(s=>s.sourceName)).size>=4);
  for(const story of firstEdition.stories)assert.equal(newsStoryProblem(story,Date.parse(firstEdition.generatedAt),now),null,story.title);
});
test('new successful edition replaces manual content',()=>{
  const live={...firstEdition,generatedAt:new Date(now+60000).toISOString(),serviceStatus:'updated'};
  assert.equal(selectNewsEdition(live,now+120000),live);
});
test('manual stories expire individually and dates never reset',()=>{
  const reported=firstEdition.stories.map(s=>Date.parse(s.reportedAt)).sort((a,b)=>a-b);
  const afterOldest=reported[0]+48*60*60*1000;
  assert.equal(freshNews(selectNewsEdition(null,afterOldest),afterOldest).length,firstEdition.stories.length-1);
  const expires=Math.max(...reported,Date.parse(firstEdition.generatedAt))+48*60*60*1000;
  assert.equal(selectNewsEdition(null,expires),null);
});
