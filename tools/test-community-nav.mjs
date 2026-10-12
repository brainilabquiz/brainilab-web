import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {groupCommunityLinks} from '../lib/community-nav.js';
import {newTabLinks} from '../lib/link-policy.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const fixture=(rankings='/rankings/',groups='/groups/',active='')=>`<header class="topbar"><div class="nav"><nav class="links" id="mainNav"><a href="/games/">Games</a><a href="/daily-quiz/">Daily</a><a href="/learn/">Learn</a><a href="${rankings}"${active==='rankings'?' aria-current="page"':''}>Rankings</a><a href="${groups}"${active==='groups'?' aria-current="page"':''}>Groups</a><a class="news-nav-link" href="/breaking-news/">Breaking News</a></nav><div class="nav-right"><button data-mobile-menu>Menu</button><a href="/profile/">Profile</a></div></div></header><main><button id="outside">Outside</button></main>`;
for(const [rankings,groups,active] of [['/rankings/','/groups/',''],['../rankings/index.html','index.html','groups'],['index.html','../groups/index.html','rankings']]){
 const html=newTabLinks(fixture(rankings,groups,active));
 const d=new JSDOM(html).window.document;
 assert.equal(d.querySelectorAll('.links > *').length,5);
 const group=d.querySelector('.nav-community');assert.ok(group);assert.equal(group.open,false);
 assert.deepEqual([...group.querySelectorAll('a')].map(a=>a.getAttribute('href')),[rankings,groups]);
 assert.equal(group.querySelector('summary').textContent.trim(),'Community');
 assert.equal(group.classList.contains('is-current'),Boolean(active));
 assert.equal(group.querySelectorAll('[aria-current="page"]').length,active?1:0);
 assert.equal(group.querySelectorAll('small').length,2);
 assert.equal(newTabLinks(html),html,'grouping and link policy are idempotent');
}
const header=fixture();
const untouched=`<script>const header=${JSON.stringify(header)};</script><style>/* ${header} */</style><!-- ${header} --><footer><nav class="links"><a href="/rankings/">Rankings</a><a href="/groups/">Groups</a></nav></footer><header class="other"><nav class="links"><a>Rankings</a><a>Groups</a></nav></header>`;
assert.equal(groupCommunityLinks(untouched),untouched);
assert.equal(groupCommunityLinks(header+untouched),groupCommunityLinks(header)+untouched);
assert.equal(groupCommunityLinks(header.replace('<a href="/groups/">Groups</a>','')),header.replace('<a href="/groups/">Groups</a>',''));
assert.equal(groupCommunityLinks(header.replace('class="links"','class="footer-links"')),header.replace('class="links"','class="footer-links"'));
assert.equal(groupCommunityLinks(header.replace('>Groups</a>','>Groups</a><a href="/groups/">Groups</a>')),header.replace('>Groups</a>','>Groups</a><a href="/groups/">Groups</a>'));
const source=readFileSync('assets/js/mobile-ui.js','utf8');
function page(width=1280,path='/'){
 const dom=new JSDOM(newTabLinks(fixture()),{url:'https://brainilabgames.com'+path,runScripts:'outside-only'}),w=dom.window;
 w.innerWidth=width;w.matchMedia=()=>({matches:true});w.requestAnimationFrame=fn=>fn();w.closedAccounts=0;w.BrainiAccountMenu={close:()=>w.closedAccounts++};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return w;
}
const key=(w,target,k)=>target.dispatchEvent(new w.KeyboardEvent('keydown',{key:k,bubbles:true,cancelable:true}));
const click=(w,target,detail=1)=>target.dispatchEvent(new w.MouseEvent('click',{detail,bubbles:true,cancelable:true}));
const pointer=(w,target,type,pointerType='mouse')=>{const event=new w.Event(type,{bubbles:type==='pointerdown'});Object.defineProperty(event,'pointerType',{value:pointerType});target.dispatchEvent(event);};
let w=page(),d=w.document,g=d.querySelector('.nav-community'),s=g.querySelector('summary');
assert.equal(g.open,false);click(w,s);assert.equal(g.open,true);assert.equal(w.closedAccounts,1);click(w,s);assert.equal(g.open,false);
pointer(w,g,'pointerenter');assert.equal(g.open,true);click(w,s);assert.equal(g.open,true,'first mouse click keeps hover-open menu open');pointer(w,g,'pointerleave');assert.equal(g.open,false);
pointer(w,g,'pointerenter','touch');assert.equal(g.open,false,'touch does not trigger a hover-open');
click(w,s,0);assert.equal(g.open,true,'keyboard native click opens');click(w,s,0);assert.equal(g.open,false);
s.focus();key(w,s,'ArrowDown');assert.equal(g.open,true);assert.equal(d.activeElement,g.querySelector('a'));
key(w,d.activeElement,'Escape');assert.equal(g.open,false);assert.equal(d.activeElement,s);
key(w,s,'ArrowUp');assert.equal(d.activeElement,g.querySelectorAll('a')[1]);
d.querySelector('#outside').focus();assert.equal(g.open,false,'Tab/focus leaving disclosure closes it');
click(w,s);pointer(w,d.querySelector('#outside'),'pointerdown');assert.equal(g.open,false);
click(w,s);click(w,g.querySelector('a'));assert.equal(g.open,false,'link click closes disclosure');
w.BrainiMobileUI.boot();w.BrainiMobileUI.boot();click(w,s);assert.equal(g.open,true,'repeated boot binds one handler');w.close();
for(const path of ['/rankings/','/groups/index.html']){
 w=page(1280,path);g=w.document.querySelector('.nav-community');assert.equal(g.classList.contains('is-current'),true);assert.equal(g.querySelectorAll('[aria-current="page"]').length,1);w.close();
}
w=page(390);d=w.document;g=d.querySelector('.nav-community');s=g.querySelector('summary');const nav=d.querySelector('.links'),menu=d.querySelector('[data-mobile-menu]');
assert.equal(g.open,true,'both destinations visible when mobile Menu opens');
click(w,menu);assert.equal(nav.classList.contains('mobile-open'),true);assert.equal(menu.getAttribute('aria-expanded'),'true');
g.querySelector('a').focus();key(w,d.activeElement,'Escape');assert.equal(nav.classList.contains('mobile-open'),false);assert.equal(d.activeElement,menu);
click(w,menu);click(w,g.querySelector('a'));assert.equal(nav.classList.contains('mobile-open'),false);
w.innerWidth=1280;w.dispatchEvent(new w.Event('resize'));assert.equal(g.open,false);
w.innerWidth=768;w.dispatchEvent(new w.Event('resize'));assert.equal(g.open,true);w.BrainiMobileUI.boot();click(w,menu);assert.equal(nav.classList.contains('mobile-open'),true);w.close();
const routes=['index.html','games/index.html','daily-quiz/index.html','learn/index.html','learn/coin-flip-probability-five-heads/index.html','rankings/index.html','groups/index.html','profile/index.html','about/index.html','breaking-news/index.html'];
for(const route of routes){
 const root=existsSync('dist/index.html')?'dist/':'';
 const d=new JSDOM(root?readFileSync(root+route,'utf8'):newTabLinks(readFileSync(route,'utf8'))).window.document;
 assert.equal(d.querySelectorAll('.topbar .links > .nav-community').length,1,route);
 assert.equal(d.querySelectorAll('.nav-community a').length,2,route);
 assert.equal([...d.querySelectorAll('.topbar .links > a')].some(a=>['Rankings','Groups'].includes(a.textContent)),false,route);
}
console.log('PASS Community navigation: server grouping, preserved URLs/current page, protected content, idempotence, native disclosure, desktop mouse/touch/keyboard, outside close, mobile direct links, resize and 10 public surfaces.');
