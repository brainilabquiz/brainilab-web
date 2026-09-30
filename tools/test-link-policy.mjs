import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {newTabLinks} from '../lib/link-policy.js';
const source=`<a rel="author noopener noreferrer" href="/about/" target="_blank">Author</a><a href='#part' target='_self'>Part</a><a href="https://brainilabgames.com/learn/">Absolute internal</a><a href="https://www.brainilabgames.com/games/">WWW internal</a><a href="https://science.nasa.gov/" rel="me">Source</a><a href="//example.org/">External</a><a href="mailto:hello@example.org">Email</a><script>const template='<a href="/example/">Example</a>';</script><style>a:after{content:'<a href="/x/">'}</style>`;
const transformed=newTabLinks(source);
assert.ok(transformed.includes('rel="author"'));
assert.ok(transformed.includes("<a href='#part'>"));
assert.ok(transformed.includes('rel="me noopener noreferrer"'));
assert.ok(transformed.includes(`<script>const template='<a href="/example/">Example</a>';</script>`));
assert.equal(newTabLinks(transformed),transformed);
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const dom=new JSDOM(transformed,{runScripts:'outside-only',url:'https://brainilabgames.com/'});
dom.window.eval(readFileSync('assets/js/link-policy.js','utf8'));
for(const a of dom.window.document.querySelectorAll('a[href]')){
 const external=['science.nasa.gov','example.org'].includes(a.hostname)&&/^https?:$/.test(a.protocol);
 assert.equal(a.target,external?'_blank':'');
 assert.equal(a.relList.contains('noopener'),external);
}
const link=dom.window.document.createElement('a');link.href='/learn/';dom.window.document.body.append(link);
await new Promise(r=>setTimeout(r,0));assert.equal(link.target,'');
link.href='https://example.org/';await new Promise(r=>setTimeout(r,0));assert.equal(link.target,'_blank');assert.ok(link.relList.contains('noopener'));
link.href='#chapter';await new Promise(r=>setTimeout(r,0));assert.equal(link.target,'');assert.equal(link.relList.contains('noopener'),false);
dom.window.close();
console.log('PASS: external-only new tabs; internal, fragment, absolute same-site, mail, semantic rel, inline code and dynamic href changes.');
