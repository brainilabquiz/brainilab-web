import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const source=readFileSync('assets/js/site-analytics.js','utf8'),meta=readFileSync('assets/js/meta-pixel.js','utf8');
function page(url='https://brainilabgames.com/learn/moon/?email=private@example.com',saved=null){const d=new JSDOM('<title>Moon</title><article class="article-body"></article><aside class="article-practice"><a href="/science/science-quiz/">Play</a></aside><a href="https://www.youtube.com/watch?v=123">YouTube</a>',{url,runScripts:'outside-only'});if(saved)d.window.localStorage.setItem('brainilab_statistics_consent_v1',JSON.stringify(saved));d.window.eval(source);return d.window;}
let w=page('https://brainilabgames.com/learn/moon/');
assert.equal(w.document.scripts.length,0);assert.equal(w.gtag,undefined);assert.equal(w.BrainiSiteAnalytics.needsConsent(),true);
w.BrainiSiteAnalytics.setConsent(false);assert.equal(w.document.scripts.length,0);
w.BrainiSiteAnalytics.setConsent(true);assert.equal(w.document.scripts.length,1);assert.ok(w.document.scripts[0].src.includes('G-97WN37VLHV'));
let events=()=>w.dataLayer.filter(x=>x[0]==='event');assert.deepEqual(Array.from(events(),x=>x[1]),['page_view','article_view']);
w.document.querySelector('.article-practice a').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(events().at(-1)[1],'article_game_click');
const result={clientResultId:'dedupe-local-only',score:999,email:'secret@example.com',dailyNumber:1};
w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',gameId:'brainmix',result}}));
w.dispatchEvent(new w.CustomEvent('brainilab:datachange',{detail:{type:'game_result',gameId:'brainmix',result}}));
assert.equal(events().filter(x=>x[1]==='game_complete').length,1);assert.ok(!JSON.stringify(w.dataLayer).includes('secret@example.com'));assert.ok(!JSON.stringify(w.dataLayer).includes('dedupe-local-only'));
w.BrainiSiteAnalytics.setConsent(false);assert.equal(w['ga-disable-G-97WN37VLHV'],true);const n=events().length;w.document.querySelector('a').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(events().length,n);w.close();
for(const url of ['https://brainilabgames.com/admin/','https://brainilabgames.com/auth/','https://brainilabgames.com/?code=secret','http://localhost:8000/']){w=page(url,{allowed:true,at:Date.now()});assert.equal(w.document.scripts.length,0);w.close();}
w=page('https://brainilabgames.com/');w.eval(meta);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));assert.ok(w.document.querySelector('[data-statistics-choice]'));w.document.querySelector('[data-statistics-choice]').checked=true;w.document.querySelector('[data-ad-choice]').checked=false;w.document.querySelector('[data-save-cookie-choices]').click();assert.equal(w.BrainiSiteAnalytics.isAllowed(),true);assert.equal(w.fbq,undefined);w.close();
const socialQuery='?utm_source=youtube&utm_medium=social&utm_campaign=learn_discovery&utm_content=flags_video';
w=page('https://brainilabgames.com/learn/moon/'+socialQuery);
assert.equal(w.document.scripts.length,0);assert.equal(w.dataLayer,undefined);
w.BrainiSiteAnalytics.setConsent(true);
let config=w.dataLayer.find(x=>x[0]==='config')[2];
assert.equal(config.campaign_source,'youtube');assert.equal(config.campaign_content,'flags_video');
assert.equal(config.page_location,'https://brainilabgames.com/learn/moon/');
w.close();
for(const query of [socialQuery.replace('youtube','private@example.com'),socialQuery+'&utm_source=tiktok',socialQuery.replace('learn_discovery','private@example.com')]){
 w=page('https://brainilabgames.com/'+query,{allowed:true,at:Date.now()});
 config=w.dataLayer.find(x=>x[0]==='config')[2];assert.equal(config.campaign_source,undefined);assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));w.close();
}
w=page('https://brainilabgames.com/'+socialQuery.replace('flags_video','private@example.com'),{allowed:true,at:Date.now()});
config=w.dataLayer.find(x=>x[0]==='config')[2];assert.equal(config.campaign_content,undefined);assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));w.close();
console.log('GA4 consent, sanitized events, result deduplication, withdrawal, independent choices and allowlisted social attribution passed.');

w=page('https://brainilabgames.com/games/');
w.dispatchEvent(new w.CustomEvent('brainilab:discovery',{detail:{type:'numbers'}}));assert.equal(w.dataLayer,undefined);
w.BrainiSiteAnalytics.setConsent(true);
w.dispatchEvent(new w.CustomEvent('brainilab:discovery',{detail:{type:'numbers',message:'private@example.com'}}));
assert.equal(w.dataLayer.filter(x=>x[0]==='event').at(-1)[1],'game_filter');
w.dispatchEvent(new w.CustomEvent('brainilab:feedbacksent',{detail:{source:'post-game',message:'private@example.com'}}));
assert.equal(w.dataLayer.filter(x=>x[0]==='event').at(-1)[1],'feedback_submit');
const before=w.dataLayer.length;
w.dispatchEvent(new w.CustomEvent('brainilab:feedbacksent',{detail:{source:'private@example.com'}}));
w.dispatchEvent(new w.CustomEvent('brainilab:discovery',{detail:{type:'private@example.com'}}));
assert.equal(w.dataLayer.length,before);assert.ok(!JSON.stringify(w.dataLayer).includes('private@example.com'));w.close();
console.log('PASS: discovery and feedback analytics require consent and omit message/email/arbitrary values.');
for(const placement of ['article','post_game','home']){
 w=page('https://brainilabgames.com/learn/moon/');
 const link=w.document.createElement('a');link.href='https://www.youtube.com/watch?v=1ISNNEhgCPw&private=do-not-send';
 if(placement==='home')link.dataset.latestVideo='';else link.dataset.relatedVideo=placement;
 w.document.body.append(link);const click=()=>link.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 click();assert.equal(w.dataLayer,undefined);w.BrainiSiteAnalytics.setConsent(true);click();
 const events=w.dataLayer.filter(x=>x[0]==='event'&&x[1]==='video_click');
 assert.equal(events.length,1);assert.equal(events[0][2].placement,placement);assert.equal(events[0][2].video_id,'1ISNNEhgCPw');
 assert.ok(!JSON.stringify(w.dataLayer).includes('do-not-send'));
 w.BrainiSiteAnalytics.setConsent(false);click();assert.equal(w.dataLayer.filter(x=>x[0]==='event'&&x[1]==='video_click').length,0);w.close();
}
console.log('PASS video clicks: consent required, three precise placements, no arbitrary URL parameters, withdrawal respected.');
{
 const w=page('https://brainilabgames.com/history/');
 w.document.body.innerHTML='<main class="topic-discovery"><a class="topic-level" href="/history/history-quiz/?difficulty=easy&email=do-not-send">Play</a><div class="topic-reading"><a href="/learn/which-century-is-that-year/">Read</a></div></main>';
 const links=[...w.document.querySelectorAll('a')];
 const click=()=>links.forEach(a=>a.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));
 click();assert.equal(w.dataLayer,undefined);
 w.BrainiSiteAnalytics.setConsent(true);click();
 const events=w.dataLayer.filter(x=>x[0]==='event'&&x[1].startsWith('topic_'));
 assert.deepEqual(Array.from(events,x=>x[1]),['topic_game_click','topic_article_click']);
 assert.equal(events[0][2].difficulty,'easy');assert.equal(events[1][2].article_slug,'which-century-is-that-year');
 assert.ok(!JSON.stringify(events).includes('do-not-send'));
 w.BrainiSiteAnalytics.setConsent(false);click();assert.equal(w.dataLayer.filter(x=>x[0]==='event'&&x[1].startsWith('topic_')).length,0);
 w.close();
}
console.log('PASS topic discovery measurement: consent, approved fields, no query data, withdrawal.');
