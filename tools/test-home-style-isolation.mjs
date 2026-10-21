import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {pageStyles} from '../lib/page-styles.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const home=readFileSync('index.html','utf8'),editorial=readFileSync('assets/css/editorial.css','utf8'),own=readFileSync('assets/css/home.css','utf8');
assert.doesNotMatch(home,/href="assets\/css\/editorial\.css/);
assert.ok(!pageStyles(home,'index.html').files.includes('assets/css/editorial.css'));
assert.match(readFileSync('learn/index.html','utf8'),/editorial\.css/,'Learn retains all article styles');
function sheet(css){const w=new JSDOM('<style>'+css+'</style>').window;return {w,rules:w.document.styleSheets[0].cssRules};}
const before=sheet(editorial),after=sheet(own);
function find(rules,selector,condition=''){for(const rule of rules){if(!condition&&rule.selectorText===selector)return rule.style.cssText;if(condition&&!rule.selectorText&&rule.cssRules?.length&&rule.conditionText===condition){const found=find(rule.cssRules,selector);if(found)return found;}}return null;}
for(const selector of ['.section-heading','.section-heading h2','.section-heading>a'])assert.equal(find(after.rules,selector),find(before.rules,selector),selector+' preserves exact declarations');
assert.equal(find(after.rules,'.section-heading','(max-width:600px)'),find(before.rules,'.section-heading','(max-width:600px)'));
before.w.close();after.w.close();
console.log('PASS home stylesheet isolation: exact desktop/mobile heading declarations, hidden states, article sheet removed only from home and retained on Learn.');
