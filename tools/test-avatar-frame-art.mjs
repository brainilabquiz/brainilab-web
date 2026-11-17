import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const folder='assets/icons/avatar-frames-v2',files=readdirSync(folder).filter(f=>f.endsWith('.svg'));
assert.equal(files.length,18);const hashes=new Set(),css=readFileSync('assets/css/site.css','utf8');
for(const file of files){
 const text=readFileSync(folder+'/'+file,'utf8'),d=new JSDOM(text,{contentType:'image/svg+xml'}).window.document;
 assert.equal(d.documentElement.getAttribute('viewBox'),'0 0 100 100',file);assert.ok(text.length<5000,file);
 assert.equal(d.querySelectorAll('script,style,image,foreignObject,filter,animate,animateTransform,a').length,0,file);
 assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(text),file);
 assert.ok([...d.querySelectorAll('circle')].some(c=>Number(c.getAttribute('r'))>=41&&c.getAttribute('fill')==='none'),'transparent portrait centre: '+file);
 assert.ok(css.includes('../icons/avatar-frames-v2/'+file),file);hashes.add(createHash('sha256').update(text).digest('hex'));d.defaultView.close();
}
assert.equal(hashes.size,18,'every tier and equipped style has its own artwork');
assert.ok(!css.includes('.rank-avatar[data-social-frame]::after{display:none}'),'social drawings are visible');
assert.ok(!readFileSync('assets/css/profile-rewards.css','utf8').includes('var(--frame-color)'),'profile no longer replaces drawings with thick colour borders');
for(const id of ['blue','green','copper','gold','orbit','prism','aurora','nova'])assert.ok(css.includes(`[data-profile-frame=${id}],[data-social-frame=${id}]`),'shared equipped appearance: '+id);
const dom=new JSDOM('',{runScripts:'outside-only',url:'https://brainilabgames.com/profile/'}),w=dom.window;
w.eval(readFileSync('assets/js/avatar-design.js','utf8'));w.eval(readFileSync('assets/js/profile-rewards-model.js','utf8'));
w.eval(readFileSync('assets/js/avatar-studio-art.js','utf8'));
const thresholds={level:0,blue:100,green:500,copper:1500,prism:2500,gold:3000,aurora:4750,orbit:6000,nova:8500};
const catalogue=Object.fromEntries(w.BrainiRewardCatalog.frames.map(({id,xp})=>[id,xp]));
assert.deepEqual(catalogue,thresholds);
const totals=[...Object.values(thresholds),...Object.values(thresholds).filter(Boolean).map(xp=>xp-1)];
for(const xp of totals)for(const [frame,min] of Object.entries(thresholds)){
  const expected=xp>=min?frame:'level';
  assert.equal(w.BrainiRewardCatalog.available({frame},xp).frame,expected);
  assert.equal(w.BrainiAvatarDesign.fromPublicStyle({frame,render_xp:xp}).avatarFrame,expected);
}
for(const frame of Object.keys(thresholds)){
  const art=w.BrainiAvatarStudioArt.frameOverlay(frame);
  assert.match(art,/avatar-frame-spin/,'motion layer missing: '+frame);
  assert.match(art,/aria-hidden="true"/);
}
assert.equal(w.BrainiAvatarStudioArt.frameOverlay('__proto__'),'');
dom.window.close();console.log('PASS 18 lightweight static frames, shared social and profile art, and all Studio frames with cosmetic XP gates and motion artwork.');
