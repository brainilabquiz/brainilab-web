import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execSync} from 'node:child_process';

// Speed round (Nov 2026): supabase-js is served from our own origin at a pinned version, and the world art is
// offered at 256 px wherever it is shown small.
const read=f=>readFileSync(f,'utf8');
const pages=execSync('git ls-files "*.html"').toString().split('\n').filter(f=>f&&!/^(dist|tools|docs)\//.test(f));

// 1. One pinned, self-hosted copy of supabase-js 2.119.2 (byte-identical to the npm package's dist/umd/supabase.js).
const SDK='assets/js/vendor/supabase-js-2.119.2.js';
assert.equal(createHash('sha256').update(readFileSync(SDK)).digest('hex'),'8816af04d9915dbba1882d6f84f0b402dc40268063a63d9c66d24f52f371c263',SDK+' is the reviewed 2.119.2 build');
assert.ok(existsSync('assets/js/vendor/supabase-js-LICENSE.txt'),'the MIT licence travels with the copy');
let tags=0;
for(const f of pages){
  const html=read(f);
  assert.doesNotMatch(html,/cdn\.jsdelivr\.net/,f+' no longer talks to the CDN');
  for(const m of html.matchAll(/<script[^>]*supabase-js[^>]*><\/script>/g)){tags++;assert.match(m[0],/^<script defer(?:="")? src="\/assets\/js\/vendor\/supabase-js-2\.119\.2\.js"><\/script>$/,f);}
}
assert.ok(tags>=29,`${tags} pages load the SDK from our origin`);
const loader=read('assets/js/perf-loader.js');
assert.match(loader,/loadScript\(new URL\("vendor\/supabase-js-2\.119\.2\.js",jsBase\)\.href\)/);
assert.match(loader,/path\(s\.src\)===path\(src\)/,'the lazy loader reuses a page tag that carries a ?v= hash');
assert.doesNotMatch(loader,/jsdelivr/);
assert.doesNotMatch(read('_headers'),/jsdelivr/,'the admin CSP no longer allows the CDN');

// 2. Every world illustration has a 256 px copy, and every place that shows one offers it.
const dims=buf=>{const kind=buf.toString('ascii',12,16);
  if(kind==='VP8X')return [1+buf.readUIntLE(24,3),1+buf.readUIntLE(27,3)];
  if(kind==='VP8L'){const b=buf.readUInt32LE(21);return [1+(b&0x3fff),1+((b>>14)&0x3fff)];}
  return [buf.readUInt16LE(26)&0x3fff,buf.readUInt16LE(28)&0x3fff];};
const dir='assets/illustrations/worlds/';
const worlds=readdirSync(dir).filter(f=>/^[a-z-]+\.webp$/.test(f)&&!/-256\.webp$/.test(f));
assert.ok(worlds.length>=18);
for(const f of worlds){
  const small=f.replace('.webp','-256.webp');
  assert.deepEqual(dims(readFileSync(dir+small)),[256,256],small);
  assert.ok(readFileSync(dir+small).length<readFileSync(dir+f).length*.6,small+' is much lighter');
}
const icons=read('assets/js/icon-system.js');
assert.match(icons,/function world\(id,className="braini-world-art",alt="",sizes="112px"\)/);
assert.match(icons,/srcset="\$\{esc\(small\)\} 256w, \$\{esc\(src\)\} 512w" sizes="\$\{esc\(sizes\)\}"/);
assert.match(read('assets/js/post-game.js'),/world\?\.\(gameId,'post-game-art is-world-art','','184px'\)/,'the results art asks for its larger size');
let statics=0;
for(const f of pages){
  for(const m of read(f).matchAll(/<img [^>]*illustrations\/worlds\/[a-z-]+\.webp[^>]*>/g)){
    statics++;
    assert.match(m[0],/ src="[^"]*\/worlds\/([a-z-]+)-256\.webp" srcset="[^"]*\/worlds\/\1-256\.webp 256w, [^"]*\/worlds\/\1\.webp 512w" sizes="[^"]+"/,f+': '+m[0].slice(0,90));
  }
}
assert.ok(statics>=47,`${statics} static world images offer the 256 px copy`);

// 3. The dash in the weekly dots passes 4.5:1 on white.
assert.match(read('assets/css/visual-system.css'),/\.continuity-week b\{box-sizing:border-box;background:#fff;border:2px solid #f3d6a6;color:#946f2c\}/);
console.log(`Speed assets checks passed (${tags} SDK tags, ${worlds.length} world images, ${statics} static uses)`);
