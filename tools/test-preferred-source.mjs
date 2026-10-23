import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {preferredSourceFooter,PREFERRED_SOURCE_URL} from '../lib/preferred-source.js';
import {newTabLinks} from '../lib/link-policy.js';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
import {renderLearningPage} from '../lib/learning-render.js';

const url=new URL(PREFERRED_SOURCE_URL);
assert.equal(url.origin,'https://www.google.com');
assert.equal(url.pathname,'/preferences/source');
assert.deepEqual([...url.searchParams],[['q','brainilabgames.com']]);
const template=await readFile('learn/index.html','utf8');
const article=prepareArticle({slug:'preference-test',title:'A curious question',description:'An example.',topic:'Curiosity',sections:[],sources:[],related:[],cover:{src:'/assets/images/learn/daily-or-anytime.webp'},game:{name:'Games',url:'/games/'}});
const pages=[await readFile('index.html','utf8'),await readFile('breaking-news/index.html','utf8'),await readFile('rankings/index.html','utf8'),await readFile('groups/index.html','utf8'),await readFile('profile/index.html','utf8'),renderPage(template,[],null),renderPage(template,[article],article),renderPage(template,[],null,[],{view:'topics'}),renderLearningPage(template,{})];
for(const original of pages){
 const html=newTabLinks(original);
 assert.equal((html.match(/data-preferred-source(?:\s|=|>)/g)||[]).length,1);
 assert.equal(newTabLinks(html),html,'Repeated static/CMS rendering must not duplicate the preference');
 const link=html.match(/<a\b[^>]*class="preferred-source__link"[^>]*>/)?.[0];
 assert.ok(link);assert.ok(link.includes(`href="${PREFERRED_SOURCE_URL}"`));
 assert.match(link,/target="_blank"/);assert.match(link,/rel="noopener noreferrer"/);
 assert.match(link,/aria-describedby="preferred-source-note"/);
 assert.equal((html.match(/id="preferred-source-note"/g)||[]).length,1);
 const footer=html.match(/<footer class="footer">[\s\S]*?<\/footer>/)?.[0];
 assert.ok(footer?.includes('data-preferred-source'),'Only the shared footer contains the promotion');
 assert.doesNotMatch(html,/<script[^>]*src="https:\/\/(?:news|www)\.google\.com/);
}
const fragment='<article><footer class="article-end"><p>Read more</p></footer></article>';
assert.equal(preferredSourceFooter(fragment),fragment);
const embedded='<script>const footer=`<footer class="footer"><div class="socials"></div></footer>`;</script>';
assert.equal(preferredSourceFooter(embedded),embedded,'Inline templates are code, not rendered page footers');
assert.ok(preferredSourceFooter(embedded+template).startsWith(embedded));
const files=(await readdir('content/articles')).filter(name=>name.endsWith('.json'));
for(const name of files){
 const original=await readFile('learn/'+name.slice(0,-5)+'/index.html','utf8').catch(()=>null);
 if(!original)continue;
 const html=preferredSourceFooter(original);
 assert.equal(html.match(/<main\b[\s\S]*?<\/main>/)?.[0],original.match(/<main\b[\s\S]*?<\/main>/)?.[0],name+': article text and its links must not change');
 assert.equal((html.match(/data-preferred-source(?:\s|=|>)/g)||[]).length,1);
}
console.log('PASS preferred source: real static/CMS templates, one explicit domain deeplink, safe new tab, no external SDK and unchanged reading content.');
