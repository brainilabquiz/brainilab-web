import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {visitPath,visitDay,countVisit,visitStore,adminVisits,VISIT_STORE,VISIT_RETENTION_DAYS} from '../lib/visit-counter.js';
import {visitsHTML,visitsBody} from '../editor/growth-visits.js';

// Our own page counter (Nov 2026): every public page request is counted on our server, as an aggregate of path and
// UTC day. No cookies, no IP, no user agent or device data is stored. Bots, prefetches and private areas are left out.
const CHROME='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';
const req=(path,{method='GET',host='brainilabgames.com',headers={},cf}={})=>{
  const r=new Request(`https://${host}${path}`,{method,headers:{'User-Agent':CHROME,'Sec-Fetch-Dest':'document',...headers}});
  if(cf)Object.defineProperty(r,'cf',{value:cf});
  return r;
};
const html=(status=200,type='text/html; charset=utf-8')=>new Response(status===304?null:'<!doctype html>',{status,headers:type?{'Content-Type':type}:{}});

// 1. What counts.
assert.equal(visitPath(req('/games/'),html()),'/games/');
assert.equal(visitPath(req('/'),html()),'/');
assert.equal(visitPath(req('/learn/what-is-irony/index.html'),html()),'/learn/what-is-irony/');
assert.equal(visitPath(req('/games/?type=quizzes'),html()),'/games/','query strings are never stored');
assert.equal(visitPath(req('/daily-quiz/'),html(304,null)),'/daily-quiz/','a revalidated page view still counts');
assert.equal(visitPath(req('/games/',{headers:{'Sec-Fetch-Dest':''}}),html()),'/games/','older browsers without fetch metadata still count');
// What does not.
const none=(why,r,res=html())=>assert.equal(visitPath(r,res),null,why);
none('HEAD',req('/games/',{method:'HEAD'}));
none('POST',req('/games/',{method:'POST'}));
none('preview hosts',req('/games/',{host:'codex-learn-render-store-oct28-brainilab-web.brainilabquiz.workers.dev'}));
none('hover prefetch',req('/games/',{headers:{'Sec-Purpose':'prefetch'}}));
none('prerender',req('/games/',{headers:{'Sec-Purpose':'prefetch;prerender'}}));
none('legacy prefetch',req('/games/',{headers:{Purpose:'prefetch'}}));
none('fetch() of a page',req('/games/',{headers:{'Sec-Fetch-Dest':'empty'}}));
none('iframes',req('/games/',{headers:{'Sec-Fetch-Dest':'iframe'}}));
for(const agent of ['Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)','Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0)','curl/8.6.0','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36','Mozilla/5.0 (compatible; AhrefsBot/7.0)','facebookexternalhit/1.1','WhatsApp/2.23','Mozilla/5.0 (Linux) Chrome-Lighthouse','python-requests/2.31','GPTBot/1.2','ClaudeBot/1.0',''])none('bot '+agent,req('/games/',{headers:{'User-Agent':agent}}));
none('Cloudflare verified bots',req('/games/',{cf:{botManagement:{verifiedBot:true}}}));
none('Cloudflare verified bot category',req('/games/',{cf:{verifiedBotCategory:'Search Engine Crawler'}}));
for(const path of ['/admin/','/admin/growth/','/auth/reset-password/','/profile/','/profile/?section=stats','/api/breaking-news','/assets/css/site.css','/sitemap.xml','/robots.txt'])none('private or not a page: '+path,req(path));
none('missing pages',req('/games/'),html(404));
none('server errors',req('/games/'),html(503));
none('redirects',req('/games'),new Response(null,{status:308,headers:{Location:'/games/'}}));
none('JSON',req('/games/'),html(200,'application/json'));
none('304 without a document navigation',req('/games/',{headers:{'Sec-Fetch-Dest':''}}),html(304,null));
none('odd characters',req('/games/%3Cscript%3E/'));
assert.equal(visitDay(Date.parse('2026-11-27T23:59:59Z')),'2026-11-27');

// 2. Counting runs after the response, on one named object, and never throws.
const calls=[],waits=[];
const env={LEARN_PAGES:{idFromName:name=>({name}),get:id=>({fetch:async(url,init)=>{calls.push({id,url,init});return new Response(null,{status:204});}})}};
const ctx={waitUntil:p=>waits.push(p)};
assert.equal(countVisit(req('/games/'),html(),env,ctx,Date.parse('2026-11-27T10:00:00Z')),true);
await Promise.all(waits);
assert.equal(calls.length,1);assert.equal(calls[0].id.name,VISIT_STORE);assert.equal(calls[0].url,'https://visits.internal/hit');
assert.deepEqual(JSON.parse(calls[0].init.body),{path:'/games/',day:'2026-11-27'},'only the path and the day leave the Worker');
assert.equal(countVisit(req('/admin/'),html(),env,ctx),false);
assert.equal(countVisit(req('/games/'),html(),{},ctx),false,'no store binding, no counting');
const failing={LEARN_PAGES:{idFromName:()=>({}),get:()=>({fetch:async()=>{throw Error('down');}})}};
const pending=[];assert.equal(countVisit(req('/games/'),html(),failing,{waitUntil:p=>pending.push(p)}),true);await Promise.all(pending);

// 3. The Durable Object keeps one total per day and path, and 90 days of them.
function memory(){const m=new Map();return {m,
  get:async k=>m.get(k),put:async(k,v)=>{m.set(k,v);},delete:async keys=>{for(const k of [].concat(keys))m.delete(k);},
  list:async({prefix='',start,end}={})=>new Map([...m].filter(([k])=>k.startsWith(prefix)&&(start===undefined||k>=start)&&(end===undefined||k<end)).sort(([a],[b])=>a<b?-1:a>b?1:0))};}
const storage=memory(),at=day=>Date.parse(day+'T12:00:00Z');
const hit=(path,day,now=at(day))=>visitStore(storage,new Request('https://visits.internal/hit',{method:'POST',body:JSON.stringify({path,day})}),now);
for(let i=0;i<3;i++)assert.equal((await hit('/games/','2026-11-27')).status,204);
await hit('/','2026-11-27');await hit('/','2026-11-26',at('2026-11-27'));await hit('/learn/','2026-11-20',at('2026-11-27'));
assert.equal(storage.m.get('visits:2026-11-27:/games/'),3);
for(const bad of [{path:'/games/',day:'27/11/2026'},{path:'games',day:'2026-11-27'},{path:'/<x>/',day:'2026-11-27'},{day:'2026-11-27'}])
  assert.equal((await visitStore(storage,new Request('https://visits.internal/hit',{method:'POST',body:JSON.stringify(bad)}),at('2026-11-27'))).status,400,JSON.stringify(bad));
assert.equal((await visitStore(storage,new Request('https://visits.internal/hit',{method:'POST',body:'{'}),at('2026-11-27'))).status,400);
const summary=async(days,day='2026-11-27')=>(await visitStore(storage,new Request('https://visits.internal/summary?days='+days),at(day))).json();
let s=await summary(7);
assert.equal(s.total,5);assert.equal(s.days.length,7);assert.equal(s.from,'2026-11-21');assert.equal(s.to,'2026-11-27');assert.equal(s.timezone,'UTC');
assert.deepEqual(s.days.at(-1),{day:'2026-11-27',count:4});assert.deepEqual(s.days.at(-2),{day:'2026-11-26',count:1});
assert.deepEqual(s.top[0],{path:'/games/',count:3});assert.deepEqual(s.top[1],{path:'/',count:2});assert.equal(s.pages,2,'the visit on 20 Nov is outside 7 days');
s=await summary(30);assert.equal(s.total,6);assert.equal(s.pages,3);
assert.equal((await summary(500)).days.length,VISIT_RETENTION_DAYS,'never more than the kept period');
// Old days are pruned on the first count of a new day.
await hit('/old/','2026-08-01',at('2026-08-01'));assert.ok(storage.m.has('visits:2026-08-01:/old/'));
await hit('/games/','2026-11-28',at('2026-11-28'));
assert.ok(!storage.m.has('visits:2026-08-01:/old/'),'older than 90 days is deleted');
assert.ok(storage.m.has('visits:2026-11-20:/learn/'));
assert.ok([...storage.m.keys()].every(k=>/^visits:\d{4}-\d{2}-\d{2}:\/[\w\-./]*$/.test(k)||k==='visits-pruned'),'nothing but day and path is stored');
assert.equal((await visitStore(storage,new Request('https://visits.internal/other'))).status,404);

// 4. Only signed-in owners and editors (with MFA) can read it.
const summaryEnv={LEARN_PAGES:{idFromName:name=>({name}),get:()=>({fetch:async url=>visitStore(storage,new Request(url),at('2026-11-28'))})}};
const ask=(token,fetcher)=>adminVisits(new Request('https://brainilabgames.com/api/admin/visits?days=7',{headers:token?{Authorization:token}:{}}),summaryEnv,fetcher);
let r=await ask(null,async()=>{throw Error('must not be called');});assert.equal(r.status,401);assert.equal(r.headers.get('Cache-Control'),'no-store');
const session=body=>async(url,init)=>{assert.match(url,/\/rpc\/get_brainilab_admin_session$/);assert.equal(init.headers.Authorization,'Bearer '+'x'.repeat(40));return Response.json(body);};
r=await ask('Bearer '+'x'.repeat(40),session({admin:true,authenticated:true,role:'viewer',mfa_satisfied:true}));assert.equal(r.status,403);
r=await ask('Bearer '+'x'.repeat(40),session({admin:true,authenticated:true,role:'owner',mfa_satisfied:false}));assert.equal(r.status,403);
r=await ask('Bearer '+'x'.repeat(40),async()=>new Response('no',{status:401}));assert.equal(r.status,403);
r=await ask('Bearer '+'x'.repeat(40),session({admin:true,authenticated:true,role:'owner',mfa_satisfied:true}));assert.equal(r.status,200);
const data=await r.json();assert.equal(data.days.length,7);assert.equal(data.to,'2026-11-28');assert.equal(r.headers.get('X-Robots-Tag'),'noindex');

// 5. Wiring: the Worker counts after serving, the store routes the counter, all public pages reach the Worker.
const read=f=>readFileSync(f,'utf8').replace(/\r\n/g,'\n');
const worker=read('worker.js');
assert.match(worker,/async fetch\(request,env,ctx\)\{\n\s*const response=await serveSite\(request,env,ctx\);\n[^\n]*\n\s*try\{countVisit\(productionRequest\(request\),response,env,ctx\);\}catch\{\}\n\s*return response;/);
assert.match(worker,/if\(url\.pathname==='\/api\/admin\/visits'\)return adminVisits\(request,env\);/);
assert.match(read('lib/public-page-store.js'),/if\(url\.hostname==='visits\.internal'\)return visitStore\(this\.state\.storage,request,now\);/);
const first=JSON.parse(read('wrangler.jsonc').replace(/^\s*\/\/.*$/gm,'')).assets.run_worker_first;
for(const dir of ['cookies','privacy','suggestions','plus','gta-vi','games','learn','daily-quiz'])assert.ok(first.includes('/'+dir)&&first.includes('/'+dir+'/*'),dir+' pages reach the Worker');
const counter=read('lib/visit-counter.js');
const code=counter.replace(/^\s*\/\/.*$/gm,'');
assert.doesNotMatch(code,/CF-Connecting-IP|X-Forwarded-For|True-Client-IP|cf\.(?:country|city|region|asn|clientTcpRtt)|get\('Cookie'\)|Set-Cookie/i,'no IP, location or cookies are read or set');

// 6. Admin › Growth › Visits & play shows it next to GA4, and the policies say so.
assert.match(read('editor/admin-growth.js'),/measured\.insertAdjacentHTML\('afterend',visitsHTML\(\)\);if\(context\.sb\)bindVisits\(root,context\.sb\);/);
assert.match(read('editor/growth-navigation.js'),/\['play','Visits & play',.*growth-measurement-title"\]','#growth-own-visits','#growth-play-sessions'/);
assert.match(read('assets/js/admin.js'),/growth:\(\)=>window\.BrainiGrowth\.render\(\{sb:state\.sb,rpc,root:\$\('#adminContent'\)\}\)/);
assert.match(visitsHTML(),/id="growth-own-visits"[\s\S]*data-visits-days[\s\S]*data-visits-body/);
const body=visitsBody({from:'2026-11-21',to:'2026-11-27',total:1234,pages:2,days:[{day:'2026-11-26',count:0},{day:'2026-11-27',count:1234}],top:[{path:'/games/<x>',count:9}]});
assert.match(body,/1,234 page requests/);assert.match(body,/&lt;x&gt;/,'paths are escaped');assert.match(body,/counting started 2026-11-27/);
assert.match(body,/average 1,234 a day/,'the average only uses counted days');assert.doesNotMatch(body,/2026-11-26/,'days before the counter started are left out');
assert.match(visitsBody({from:'2026-11-21',to:'2026-11-27',total:0,pages:0,days:[{day:'2026-11-27',count:0}],top:[]}),/No pages counted between 2026-11-21 and 2026-11-27/);
for(const f of ['cookies/index.html','privacy/index.html']){
  const page=read(f);
  assert.match(page,/our own server counts page requests in aggregate\. It keeps only the page address and the day[^<]*counts every visit whatever you choose here\./,f);
  assert.match(page,/If you accept usage statistics, BrainiLab uses Google Analytics and Ahrefs Web Analytics\./,f+' keeps GA and Ahrefs behind consent');
}
console.log('Visit counter checks passed');
