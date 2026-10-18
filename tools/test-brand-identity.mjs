import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {brandPage,pageTitle,organization} from '../lib/brand-identity.js';

const fixture='<html><head><title>A puzzle | BrainiLab</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://brainilabgames.com/profile/"><meta content="Old name" property="og:site_name"><META PROPERTY=\'og:site_name\' CONTENT=\'Duplicate\'><meta property="og:title" content="A puzzle"><script type="application/ld+json">{"@type":"Organization","name":"A source"}</script><script>const title="Keep this";</script></head><body><h1>A puzzle</h1><p>Keep the words and links.</p></body></html>';
const result=brandPage(fixture);
assert.equal((result.match(/property="og:site_name"/g)||[]).length,1);
assert.ok(result.includes('content="BrainiLab"'));
assert.equal(brandPage(result),result,'Rendering twice must not duplicate metadata or whitespace');
assert.equal(result.slice(result.indexOf('<body>')),fixture.slice(fixture.indexOf('<body>')));
for(const item of ['<title>A puzzle | BrainiLab</title>','name="robots" content="noindex,follow"','rel="canonical" href="https://brainilabgames.com/profile/"','property="og:title" content="A puzzle"','{"@type":"Organization","name":"A source"}','const title="Keep this";'])assert.ok(result.includes(item),item);
assert.equal(brandPage('<p>No page head</p>'),'<p>No page head</p>');
const scriptText='<script>const example=\'<meta property="og:site_name" content="An example">\'; const closing="</head>";</script>';
const protectedHtml='<html><head>'+scriptText+'<!-- <meta property="og:site_name" content="A comment"> --><meta content="A > B" property=og:site_name></head><body>Same body</body></html>';
const protectedResult=brandPage(protectedHtml);
assert.ok(protectedResult.includes(scriptText),'Never rewrite metadata examples or closing-head strings inside scripts');
assert.ok(protectedResult.includes('<!-- <meta property="og:site_name" content="A comment"> -->'));
assert.ok(!protectedResult.includes('content="A > B"'));
assert.equal(brandPage(protectedResult),protectedResult);
assert.equal(pageTitle('A puzzle'),'A puzzle | BrainiLab');
assert.equal(pageTitle('BrainiLab Academy'),'BrainiLab Academy');
assert.equal(pageTitle('Find your first BrainiLab game'),'Find your first BrainiLab game');
assert.equal(pageTitle('A puzzle | BrainiLab'),'A puzzle | BrainiLab');
// The existing homepage/About remain the authoritative identity. A future
// change there must deliberately update the shared publisher as well.
for(const file of ['index.html','about/index.html']){
 const html=readFileSync(file,'utf8');
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
 assert.deepEqual(graph.find(n=>n['@type']==='Organization'),JSON.parse(JSON.stringify(organization)),file);
 assert.equal(graph.filter(n=>n['@type']==='WebSite').length,1,file);
 assert.equal(graph.find(n=>n['@type']==='WebSite').name,'BrainiLab',file);
}
console.log('PASS brand identity: shared publisher matches Home/About; one site-name tag; repeat rendering; unrelated schema, scripts, noindex, canonical and body preserved; no repeated brand in titles.');
