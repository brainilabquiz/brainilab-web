import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const folder='assets/icons/avatar-frames-v2',files=readdirSync(folder).filter(f=>f.endsWith('.svg'));
assert.equal(files.length,15);const hashes=new Set(),css=readFileSync('assets/css/site.css','utf8');
for(const file of files){
 const text=readFileSync(folder+'/'+file,'utf8'),d=new JSDOM(text,{contentType:'image/svg+xml'}).window.document;
 assert.equal(d.documentElement.getAttribute('viewBox'),'0 0 100 100',file);assert.ok(text.length<5000,file);
 assert.equal(d.querySelectorAll('script,style,image,foreignObject,filter,animate,animateTransform,a').length,0,file);
 assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(text),file);
 assert.ok([...d.querySelectorAll('circle')].some(c=>Number(c.getAttribute('r'))>=41&&c.getAttribute('fill')==='none'),'transparent portrait centre: '+file);
 assert.ok(css.includes('../icons/avatar-frames-v2/'+file),file);hashes.add(createHash('sha256').update(text).digest('hex'));d.defaultView.close();
}
assert.equal(hashes.size,15,'every tier and equipped style has its own artwork');
assert.ok(!css.includes('.rank-avatar[data-social-frame]::after{display:none}'),'social drawings are visible');
assert.ok(!readFileSync('assets/css/profile-rewards.css','utf8').includes('var(--frame-color)'),'profile no longer replaces drawings with thick colour borders');
for(const id of ['blue','green','copper','gold','orbit'])assert.ok(css.includes(`[data-profile-frame=${id}],[data-social-frame=${id}]`),'shared equipped appearance: '+id);
const dom=new JSDOM('',{runScripts:'outside-only',url:'https://brainilabgames.com/profile/'}),w=dom.window;
w.eval(readFileSync('assets/js/avatar-design.js','utf8'));w.eval(readFileSync('assets/js/profile-rewards-model.js','utf8'));
assert.deepEqual(JSON.parse(JSON.stringify(w.BrainiRewardCatalog.frames.map(({id,xp})=>({id,xp})))),[{id:'level',xp:0},{id:'blue',xp:100},{id:'green',xp:500},{id:'copper',xp:1500},{id:'gold',xp:3000},{id:'orbit',xp:6000}]);
for(const total of [0,99,100,499,500,1499,1500,2999,3000,5999,6000])for(const frame of w.BrainiRewardCatalog.frames){const style=w.BrainiRewardCatalog.available({frame:frame.id},total);assert.equal(style.frame,frame.xp<=total?frame.id:'level');}
dom.window.close();console.log('PASS15 original transparent lightweight SVGs, shared profile/social art, distinct silhouettes, no scripts/remote assets/animation and unchanged six-frame IDs/XP thresholds.');
