import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {renderHomeVideoCards} from '../lib/home-video-cards.js';
const template=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8');
const published='2026-10-31T02:30:00+03:00'; // The visible calendar date must use UTC.
const main={id:'newerVid002',title:'A title </script><img src=x> & "quotes"',published,channelId:'UCy35EdjSpdYufOLJBybevsA',durationSeconds:601};
const short={id:'newShort001',title:'A newer Knowledge Short',published,channelId:'UCcqUq1aWcDoKyGT9QYCPqIA',format:'short',source:'youtube-shorts-feed',shortsPlaylistId:'UUSHcqUq1aWcDoKyGT9QYCPqIA',url:'https://www.youtube.com/shorts/newShort001'};
function check(document){
 const cards=[...document.querySelectorAll('[data-latest-video]')];assert.equal(cards.length,2);assert.equal(document.querySelectorAll('[data-video-schema]').length,2);
 for(const [index,card]of cards.entries()){
  const schema=JSON.parse(card.querySelector('[data-video-schema]').textContent),frame=card.querySelector('iframe'),link=card.querySelector('[data-video-link]'),date=card.querySelector('time');
  assert.equal(card.tagName,'ARTICLE');assert.equal(frame.closest('a'),null);assert.equal(frame.title,'Play '+schema.name+' on '+schema.creator.name);
  assert.equal(schema['@type'],'VideoObject');assert.equal(schema.name,card.querySelector('[data-video-title]').textContent);assert.equal(schema.url,link.href);assert.equal(schema.uploadDate,date.dateTime);assert.equal(schema.embedUrl,frame.src);assert.ok(schema.thumbnailUrl.endsWith('/'+card.dataset.videoId+'?v=2'));
  assert.equal(schema.creator.name,index?'BrainiLab Knowledge':'BrainiLab');assert.equal(schema.creator.url,'https://www.youtube.com/@'+(index?'BrainiLabKnowledge':'BrainiLab'));
  assert.equal(frame.getAttribute('loading'),'lazy');assert.equal(new URL(frame.src).hostname,'www.youtube-nocookie.com');assert.equal(new URL(frame.src).searchParams.has('autoplay'),false);assert.equal(frame.getAttribute('referrerpolicy'),'strict-origin-when-cross-origin');
  assert.equal(schema.contentUrl,undefined,'A watch-page URL is not video bytes');assert.equal(schema.dateModified,undefined,'Do not invent modification dates');assert.equal(schema.interactionStatistic,undefined);
  if(index)assert.equal(schema.duration,undefined,'Shorts feed does not provide a verified duration');else assert.ok(schema.duration);
 }
 return cards;
}
// The returned HTML alone has functioning embeds and matching schema, including fallback.
let dom=new JSDOM(template,{url:'https://brainilabgames.com/'});check(dom.window.document);const baseline=dom.window.document.querySelector('.home-video-grid').outerHTML;dom.window.close();
const fresh=renderHomeVideoCards(template,{brainilab:main,knowledge:short});dom=new JSDOM(fresh,{url:'https://brainilabgames.com/'});let cards=check(dom.window.document);assert.equal(cards[0].querySelector('[data-video-title]').textContent,main.title);assert.equal(cards[0].querySelector('time').textContent,'30 Oct 2026');assert.equal(cards[0].querySelector('[data-video-duration]').textContent,'10 min 1 sec');assert.equal(cards[0].querySelector('img'),null);assert.equal(dom.window.document.querySelectorAll('script[src="x"]').length,0);dom.window.close();
assert.equal(renderHomeVideoCards(template,{}),template);
assert.equal(renderHomeVideoCards(template,{knowledge:{...short,channelId:'wrong'}}),template);
// Browser refresh updates both players and schema together. One failed source keeps a complete pair.
for(const fail of ['', 'knowledge']){
 dom=new JSDOM(template,{url:'https://brainilabgames.com/',runScripts:'outside-only'});const w=dom.window;w.AbortSignal.timeout=()=>undefined;w.fetch=async url=>{if(fail&&url.includes('channel='+fail))throw Error('offline');return{ok:true,json:async()=>url.includes('channel=knowledge')?short:main};};w.eval(script);await new Promise(resolve=>setImmediate(resolve));cards=check(w.document);assert.equal(cards[0].dataset.videoId,main.id);assert.equal(cards[0].querySelector('time').textContent,'30 Oct 2026');if(fail)assert.equal(cards[1].outerHTML,new JSDOM(baseline).window.document.querySelectorAll('[data-latest-video]')[1].outerHTML);else assert.equal(cards[1].dataset.videoId,short.id);w.close();
}
// A player that has focus is never replaced by a newly published video.
dom=new JSDOM(template,{url:'https://brainilabgames.com/',runScripts:'outside-only'});const w=dom.window,frame=w.document.querySelector('iframe'),before=frame.src;frame.focus();w.AbortSignal.timeout=()=>undefined;w.fetch=async url=>({ok:true,json:async()=>url.includes('channel=knowledge')?short:main});w.eval(script);await new Promise(resolve=>setImmediate(resolve));assert.equal(frame.src,before);check(w.document);w.close();
console.log('PASS home VideoObject: SSR/fallback and live players, visible UTC publication, exact title/creator/thumbnail/embed identity, no fabricated duration/dates/bytes, injection safety, source failure isolation and focused-player preservation.');
