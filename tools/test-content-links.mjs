import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {canonicalContentLinks} from '../lib/content-links.js';
import {newTabLinks} from '../lib/link-policy.js';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
import {renderLearningPage} from '../lib/learning-render.js';

const head='<link rel="canonical" href="https://brainilabgames.com/games/sequence/"/>';
const cases=[
 ['../../index.html','../../'], ['../index.html','../'],
 ['index.html','./'], ['index.html?daily=2026-10-23#round','./?daily=2026-10-23#round'],
 ['/games/brain-mix/index.html?try=1&amp;daily=2026-10-23#round','/games/brain-mix/?try=1&amp;daily=2026-10-23#round'],
 ['/geography/world-flags-quiz/index.html?difficulty=easy&amp;set=2','/geography/world-flags-quiz/?difficulty=easy&amp;set=2'],
 ['/learn/paths/word-detective/index.html#lesson-2','/learn/paths/word-detective/#lesson-2'],
 ['https://brainilabgames.com/learn/how-to-read-a-tennis-score/index.html#sources','https://brainilabgames.com/learn/how-to-read-a-tennis-score/#sources'],
 ['/profile/index.html?section=progress','/profile/index.html?section=progress'],
 ['/admin/index.html','/admin/index.html'], ['/rankings/index.html','/rankings/index.html'],
 ['/auth/index.html?next=/games/index.html','/auth/index.html?next=/games/index.html'],
 ['/assets/docs/index.html','/assets/docs/index.html'], ['/unknown/index.html','/unknown/index.html'],
 ['https://example.org/games/index.html','https://example.org/games/index.html'],
 ['https://brainilabgames.com.evil.test/games/index.html','https://brainilabgames.com.evil.test/games/index.html'],
 ['https://reader@brainilabgames.com/games/index.html','https://reader@brainilabgames.com/games/index.html'],
 ['#index.html','#index.html'], ['?next=/games/index.html','?next=/games/index.html'],
 ['mailto:hello@example.org','mailto:hello@example.org']
];
for(const [before,after] of cases){
 const input=`${head}<a data-href="/games/index.html" href='${before}' aria-label="Play > read">Link</a>`;
 const output=`${head}<a data-href="/games/index.html" href='${after}' aria-label="Play > read">Link</a>`;
 assert.equal(canonicalContentLinks(input),output,before);
 assert.equal(canonicalContentLinks(output),output,'idempotence '+before);
}
for(const prefix of ['', '<base href="https://other.example/">', '<link rel="canonical" href="https://preview.example/">', head+head]){
 const html=prefix+(prefix.includes('<base')?head:'')+'<a href="/games/index.html">Games</a>';
 assert.equal(canonicalContentLinks(html),html,'uncertain document base remains unchanged');
}
const protectedHTML=`<script>const x='<a href="/games/index.html">Games</a>';</script><style>x:after{content:'<a href="/games/index.html">'}</style><!-- <a href="/games/index.html">old</a> -->`;
const download='<a href="/games/index.html" download="index.html">Download</a>';
assert.equal(canonicalContentLinks(head+protectedHTML+download),head+protectedHTML+download);
assert.equal(canonicalContentLinks(head+'<a data-href="/games/index.html">No href</a>'),head+'<a data-href="/games/index.html">No href</a>');
assert.match(newTabLinks(head+'<a href="../index.html">Games</a>'),/<a href="\.\.\/">Games<\/a>/,'shared build and CMS policy applies it');

let pages=0,changed=0;
for(const file of execFileSync('git',['ls-files','-z','*.html'],{encoding:'utf8'}).split('\0').filter(Boolean)){
 const html=readFileSync(file,'utf8'),next=canonicalContentLinks(html);
 assert.equal(canonicalContentLinks(next),next,file+' idempotence');
 // Only quoted anchor href values may change, never metadata, forms or game code.
 const eraseHref=s=>s.replace(/<a\b(?:"[^"]*"|'[^']*'|[^'">])*?>/gi,tag=>tag.replace(/(\shref\s*=\s*)(["'])(.*?)\2/i,'$1$2$2'));
 assert.equal(eraseHref(next),eraseHref(html),file+' outside link destinations');
 pages++;changed+=Number(next!==html);
}
const template=readFileSync('learn/index.html','utf8');
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(readFileSync('content/articles/'+f,'utf8'))).filter(a=>a.status==='published').map(prepareArticle);
for(const a of articles){
 const html=renderPage(template,articles,a);
 assert.ok(!/<a\b[^>]*\shref="\/games\/index\.html"/.test(html),a.slug+' CMS shell uses direct Games link');
 assert.equal(canonicalContentLinks(html),html,a.slug+' CMS final output');
}
assert.equal(canonicalContentLinks(renderLearningPage(template,{})),renderLearningPage(template,{}),'Academy output is already normalised');
console.log(`PASS direct content links: ${cases.length} navigation cases, ${pages} source pages (${changed} improved), ${articles.length} CMS articles, Academy; queries/fragments, code and protected destinations preserved.`);
