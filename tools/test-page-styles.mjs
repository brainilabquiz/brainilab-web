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
for(const middle of ['<link rel="stylesheet" href="https://elsewhere.test/x.css">','<link rel="stylesheet" href="/assets/css/print.css" media="print">','<link rel="stylesheet" href="/assets/css/secure.css" integrity="sha256-example">'])assert.equal(pageStyles('<head><link rel="stylesheet" href="/assets/css/site.css">'+middle+'<link rel="stylesheet" href="/assets/css/home.css"></head>','index.html'),null,'never move local styles across an excluded stylesheet');
assert.equal(pageStyles('<head><link rel="stylesheet" href="/assets/css/site.css"><style>.x{color:red}</style><link rel="stylesheet" href="/assets/css/home.css"></head>','index.html'),null,'do not move a stylesheet across an intervening inline style');
const digest=assetVersion(Buffer.from('body{color:red}'));
const versions=new Map([result.asset,'assets/js/consent.bundle.js','assets/css/print.css','assets/css/off.css'].map(file=>[file,digest]));
assert.ok(versionAssets(result.html,'index.html',versions).includes('home-page.css?v='+digest),'new combined stylesheet has exact byte-based cache invalidation');
for(const [file,asset] of [['index.html','home-page'],['profile/index.html','profile-page']]){
 const actual=readFileSync(file,'utf8'),plan=pageStyles(actual,file);
 assert.equal(plan.asset,'assets/css/'+asset+'.css');assert.ok(plan.files.length>=2);
 assert.ok(!plan.files.some(css=>/\/(site|mobile|stats)\.css$/.test(css)),'core sheets retain cross-route browser cache reuse');
 assert.ok(/assets\/css\/site\.css/.test(plan.html)&&/assets\/css\/mobile\.css/.test(plan.html));
 for(const css of plan.files){const body=readFileSync(css,'utf8');assert.doesNotMatch(body,/@import\b|@charset\b/,'concatenation must not change import/charset precedence');}
 assert.equal(plan.html.slice(plan.html.indexOf('</head>')),actual.slice(actual.indexOf('</head>')),'body, scripts and UI content remain unchanged');
}
console.log('PASS page CSS: cascade order, relative assets, unrelated routes, external/print/disabled sheets, inline-style safety, exact cache versions and unchanged page bodies.');

