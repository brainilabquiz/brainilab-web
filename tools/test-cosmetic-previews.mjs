import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const context=vm.createContext({window:{}});vm.runInContext(readFileSync('assets/js/avatar-design.js','utf8'),context);
const A=context.window.BrainiAvatarDesign,draft={mode:'built',skin:'ebony',hair:'braids',glasses:'sun',hat:'wizard',prop:'owl'},before=JSON.stringify(draft);
let count=0;
for(const kind of ['glasses','hat','prop'])for(const item of A.options[kind]){
 const svg=A.preview(kind,item.id,draft),dom=new JSDOM(svg,{contentType:'image/svg+xml'}),root=dom.window.document.documentElement;
 assert.equal(root.tagName,'svg');assert.equal(root.querySelectorAll('script,foreignObject,image,use,style,[id]').length,0);
 assert.ok(!/https?:|javascript:|onload=/.test(svg.replace('http://www.w3.org/2000/svg','')));
 if(item.id==='none'){assert.ok(root.classList.contains('braini-built-avatar'));assert.equal(svg,A.markup({...draft,glasses:'none',hat:'none',prop:'none'},0));}
 else{
  count++;assert.ok(root.classList.contains('braini-cosmetic-preview'));assert.equal(root.getAttribute('aria-label'),item.name);
  assert.equal(root.dataset.cosmeticKind,kind);assert.equal(root.dataset.cosmeticId,item.id);
  const box=root.getAttribute('viewBox').split(' ').map(Number);assert.equal(box.length,4);assert.ok(box.every(Number.isFinite));assert.ok(box[2]>0&&box[3]>0);assert.ok(root.querySelector('path,circle,rect,ellipse,polygon'));
  assert.equal(svg,A.preview(kind,item.id,{...draft,skin:'sand',hair:'bald',glasses:'heart',hat:'cap',prop:'book'}),'catalogue artwork cannot be obscured by another equipped item or depend on skin/hair');
  assert.notEqual(svg,A.preview(kind,'none',draft));
 }
 assert.equal(svg,A.preview(kind,item.id,draft),'repeated renders are deterministic');dom.window.close();
}
assert.equal(count,47);assert.equal(JSON.stringify(draft),before,'preview cannot alter saved or draft metadata');
for(const input of [['hat','not-a-hat'],['__proto__','round'],['frame','round'],['prop','<script>']])assert.equal(A.preview(...input,draft),'');
const studio=readFileSync('assets/js/avatar-studio-ui.js','utf8');assert.match(studio,/A\.preview\(kind,item\.id,draft\)/);
console.log('PASS cosmetic previews:47 isolated valid SVGs,50 choices including none, deterministic framing, safe unknown IDs and unchanged draft.');
