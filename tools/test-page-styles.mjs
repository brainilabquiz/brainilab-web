import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pageStyles} from '../lib/page-styles.js';
import {assetVersion,versionAssets} from '../lib/asset-versions.js';
const page='<head><meta name="keep" content="unchanged"><link href="assets/css/editorial.css?v=old" rel="stylesheet"><script defer src="/assets/js/consent.bundle.js"></script><link rel="stylesheet" href="/assets/css/home.css"><link rel="stylesheet" href="https://elsewhere.test/x.css"><link rel="stylesheet" href="/assets/css/print.css" media="print"><link rel="stylesheet" href="/assets/css/off.css" disabled></head><body><main>Unchanged</main></body>';
const result=pageStyles(page,'index.html');
assert.deepEqual(result.files,['assets/css/editorial.css','assets/css/home.css'],'retain exact stylesheet order and original relative URL base');
assert.equal(result.asset,'assets/css/home-page.css');
assert.match(result.html,/<link rel="stylesheet" href="\/assets\/css\/home-page.css">?/);
assert.ok(result.html.includes('<script defer src="/assets/js/consent.bundle.js"></script>'));
assert.ok(result.html.includes('https://elsewhere.test/x.css'));
assert.ok(result.html.includes('href="/assets/css/print.css" media="print"'));
assert.ok(result.html.includes('href="/assets/css/off.css" disabled'));
assert.ok(result.html.endsWith('<body><main>Unchanged</main></body>'));
assert.equal(pageStyles(page,'games/index.html'),null,'leave other routes on their existing shared stylesheets');
for(const middle of ['<link rel="stylesheet" href="https://elsewhere.test/x.css">','<link rel="stylesheet" href="/assets/css/print.css" media="print">','<link rel="stylesheet" href="/assets/css/secure.css" integrity="sha256-example">'])assert.equal(pageStyles('<head><link rel="stylesheet" href="/assets/css/editorial.css">'+middle+'<link rel="stylesheet" href="/assets/css/home.css"></head>','index.html'),null,'never move local styles across an excluded stylesheet');
assert.equal(pageStyles('<head><link rel="stylesheet" href="/assets/css/editorial.css"><style>.x{color:red}</style><link rel="stylesheet" href="/assets/css/home.css"></head>','index.html'),null,'do not move a stylesheet across an intervening inline style');
const digest=assetVersion(Buffer.from('body{color:red}'));
const versions=new Map([result.asset,'assets/js/consent.bundle.js','assets/css/print.css','assets/css/off.css'].map(file=>[file,digest]));
assert.ok(versionAssets(result.html,'index.html',versions).includes('home-page.css?v='+digest),'new combined stylesheet has exact byte-based cache invalidation');
for(const [file,asset] of [['index.html','home-page'],['profile/index.html','profile-page'],['games/number-route/index.html','number-route-page'],['games/math-rush/index.html','math-rush-page'],['games/sequence/index.html','sequence-page'],['games/odd-one-out/index.html','odd-one-out-page'],['learn/index.html','learn-page']]){
 const actual=readFileSync(file,'utf8'),plan=pageStyles(actual,file);
 assert.equal(plan.asset,'assets/css/'+asset+'.css');assert.ok(plan.files.length>=2);
 assert.ok(!plan.files.some(css=>/\/(site|mobile|stats)\.css$/.test(css)),'core sheets retain cross-route browser cache reuse');
 assert.ok(/assets\/css\/site\.css/.test(plan.html)&&/assets\/css\/mobile\.css/.test(plan.html));
 for(const css of plan.files){const body=readFileSync(css,'utf8');assert.doesNotMatch(body,/@import\b|@charset\b/,'concatenation must not change import/charset precedence');}
 assert.equal(plan.html.slice(plan.html.indexOf('</head>')),actual.slice(actual.indexOf('</head>')),'body, scripts and UI content remain unchanged');
}
const routeFile='games/number-route/index.html',route=readFileSync(routeFile,'utf8'),routePlan=pageStyles(route,routeFile);
assert.deepEqual(routePlan.files,['game-entry','post-game','puzzle-results','continuity','visual-system','number-route-demo'].map(name=>'assets/css/'+name+'.css'),'retain all six Number Route sheets, including post-game and result states, in their exact cascade order');
const links=html=>Array.from(html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi),match=>match[0]);
assert.equal(links(route).length,8);assert.equal(links(routePlan.html).length,3,'eight blocking stylesheet links become two shared core links and one page bundle');
assert.equal(pageStyles(routePlan.html,routeFile),null,'a second transform must not add a second page bundle');
assert.deepEqual(Array.from(routePlan.html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi),match=>match[0]),Array.from(route.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi),match=>match[0]),'consent, analytics, structured data and gameplay scripts retain their exact bytes');
for(const file of ['geography/world-flags-quiz/index.html','science/science-quiz/index.html','games/connections/index.html','learn/why-2100-is-not-a-leap-year/index.html'])assert.equal(pageStyles(readFileSync(file,'utf8'),file),null,'do not create additional page bundles outside the measured games and shared Learn template');
for(const middle of ['<link rel="stylesheet" href="/assets/css/mobile.css">','<style>.nr{display:none}</style>','<link rel="stylesheet" href="/assets/css/print.css" media="print">'])assert.equal(pageStyles('<head><link rel="stylesheet" href="/assets/css/game-entry.css">'+middle+'<link rel="stylesheet" href="/assets/css/post-game.css"></head>',routeFile),null,'Number Route must use the same cascade barriers as other measured routes');
for(const [file,names,count] of [
 ['games/math-rush/index.html',['game-entry','post-game','continuity','visual-system'],3],
 ['games/sequence/index.html',['post-game','continuity','visual-system','game-entry'],3],
 ['games/odd-one-out/index.html',['post-game','continuity','visual-system','game-entry'],3],
 ['learn/index.html',['discovery-system','editorial','game-entry','visual-system'],4]
]){
 const input=readFileSync(file,'utf8'),plan=pageStyles(input,file);
 assert.deepEqual(plan.files,names.map(n=>'assets/css/'+n+'.css'),'preserve every original sheet and its exact order on '+file);
 assert.equal(links(plan.html).length,count);assert.equal(pageStyles(plan.html,file),null,'do not duplicate the combined sheet');
 assert.deepEqual(Array.from(plan.html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi),m=>m[0]),Array.from(input.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi),m=>m[0]),'preserve game, consent, analytics and Academy scripts');
}
assert.equal(pageStyles('<head><link rel="stylesheet" href="/assets/css/editorial.css"><link rel="stylesheet" href="/assets/css/learning-paths.css"><link rel="stylesheet" href="/assets/css/visual-system.css"></head>','learn/index.html'),null,'an intervening Academy sheet remains a cascade barrier');
console.log('PASS page CSS: cascade order, relative assets, unrelated routes, external/print/disabled sheets, inline-style safety, exact cache versions and unchanged page bodies.');

