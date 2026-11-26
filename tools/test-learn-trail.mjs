// One breadcrumb trail across Learn ("Home › Learn › …", like the game and quiz pages) and a 404 page that keeps
// the site's header, footer and ways back in. Run: JSDOM_MODULE=<abs path to jsdom/lib/api.js> node tools/test-learn-trail.mjs
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {prepareArticle,libraryBody,articleBody} from '../lib/learn-content.js';
import {topicAnchor,topicIndexBody} from '../lib/learn-topic-index.js';
import {pathBody,enrichAuthors} from '../lib/learning-render.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const authors=read('content/authors.json');
const all=enrichAuthors(readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>prepareArticle(read('content/articles/'+f))),authors);
const published=all.filter(a=>a.status==='published');
const paths=readdirSync('content/paths').filter(f=>f.endsWith('.json')).map(f=>read('content/paths/'+f));
let checks=0;

function expectTrail(html,expected,what){
 const nav=new JSDOM(html).window.document.querySelector('nav.breadcrumb[aria-label="Breadcrumb"]');
 assert.ok(nav,what+': breadcrumb present');
 const parts=[...nav.children],separators=parts.filter(el=>el.getAttribute('aria-hidden')==='true');
 assert.deepEqual(parts.filter(el=>!separators.includes(el)).map(el=>el.textContent.trim()),expected,what+': trail');
 assert.equal(separators.length,expected.length-1,what+': one separator between steps');
 assert.ok(separators.every(el=>el.textContent==='›'),what+': › separators hidden from screen readers');
 assert.equal(nav.querySelector('a').getAttribute('href'),'/',what+': starts at Home');
 checks++;
 return nav;
}

assert.ok(published.length>100,'published articles loaded');
for(const a of published){
 const nav=expectTrail(articleBody(a,published,paths),['Home','Learn',a.topic],a.slug);
 // The topic link stays last: the topic index test and the article band styles rely on it.
 assert.equal(nav.querySelector('a:last-child').getAttribute('href'),'/learn/topics/#'+topicAnchor(a.topic),a.slug+': topic link');
}
expectTrail(libraryBody(published,paths),['Home','Learn'],'Learn library');
expectTrail(libraryBody(published,paths,{view:'opinion'}),['Home','Learn','Opinion'],'Opinion library');
expectTrail(topicIndexBody(published,paths),['Home','Learn','All topics'],'All topics');
for(const p of paths)expectTrail(pathBody(p,all,authors),['Home','Learn','BrainiLab Academy'],'course '+p.slug);

// The 404 page can be served at any depth, so every internal link is root-relative.
const page=new JSDOM(readFileSync('404.html','utf8')).window.document;
assert.match(page.querySelector('meta[name=robots]').content,/noindex/,'404 stays out of search results');
assert.deepEqual([...page.querySelectorAll('body > header.topbar #mainNav a')].map(a=>a.textContent.trim()),['Games','Daily','Learn','Rankings','Groups'],'404 uses the standard header links');
for(const script of ['/assets/js/consent.bundle.js','/assets/js/shell.bundle.js'])assert.ok(page.querySelector(`script[src^="${script}"]`),'404 loads '+script);
const ways=[...page.querySelectorAll('main a')].map(a=>a.getAttribute('href'));
for(const href of ['/','/daily-quiz/','/games/','/learn/','/suggestions/'])assert.ok(ways.includes(href),'404 offers '+href);
assert.ok(page.querySelector('footer.footer .footer-links a[href="/about/"]'),'404 uses the standard footer');
const relative=[...page.querySelectorAll('[href],[src],source[srcset]')].flatMap(el=>[el.getAttribute('href'),el.getAttribute('src'),...(el.getAttribute('srcset')||'').split(',').map(s=>s.trim().split(' ')[0])]).filter(u=>u&&!/^(\/|https?:|#|mailto:)/.test(u));
assert.deepEqual(relative,[],'404 has no relative links');
checks++;
console.log(`PASS Learn trail: ${checks} pages (${published.length} articles, ${paths.length} courses, library, opinion, topics, 404).`);
