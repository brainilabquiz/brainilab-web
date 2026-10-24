import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execSync} from 'node:child_process';
// Search results cut long descriptions: indexable static pages keep theirs within 155 characters.
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const files=execSync('git ls-files "*index.html"',{encoding:'utf8'}).split('\n').filter(f=>f&&!f.startsWith('learn/')&&!f.startsWith('infra/'));
let checked=0;
for(const file of files){
 const html=readFileSync(file,'utf8');
 const robots=(html.match(/<meta[^>]*name="robots"[^>]*>/)||[''])[0];
 if(/noindex/.test(robots)||/http-equiv="refresh"/.test(html))continue;
 const tag=(html.match(/<meta[^>]*name="description"[^>]*>/)||[''])[0];
 const description=decode((tag.match(/content="([^"]*)"/)||[])[1]||'');
 if(!description)continue;
 assert.ok(description.length<=155,`${file}: description is ${description.length} characters`);checked++;
}
assert.ok(checked>20);
console.log(`PASS description length: ${checked} indexable static pages keep descriptions within 155 characters.`);
