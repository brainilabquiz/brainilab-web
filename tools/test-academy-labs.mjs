import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {activityFor} from '../lib/academy-labs.js';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const cases=[['mental-percentages-without-a-calculator','meaning','percent'],['which-century-is-that-year','boundary','century'],['why-2100-is-not-a-leap-year','three-checks','leap'],['why-the-moon-changes-shape','quarter','moon'],['what-really-causes-seasons','light-and-time','seasons'],['why-time-zones-get-messy','clock-arithmetic','clocks'],['why-britain-skipped-eleven-days-in-1752','count-the-days','calendar'],['mental-math-round-and-adjust','addition','round'],['multiplication-equal-groups','build-groups','groups-basics']];
for(const [slug,section,kind] of cases){
 const dom=new JSDOM(activityFor(slug,section),{url:'https://brainilabgames.com/learn/'+slug+'/',runScripts:'outside-only'}),w=dom.window;
 w.eval(readFileSync('assets/js/learning-paths.bundle.js','utf8'));
 const lab=w.document.querySelector('.academy-lab'),input=lab.querySelector('input,select'),out=lab.querySelector('[data-lab-output]'),visual=lab.querySelector('[data-lab-visual]');
 const set=value=>{input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const click=selector=>lab.querySelector(selector).click();
 if(kind==='percent'){
  click('[data-preset="50"]');assert.equal(lab.querySelectorAll('.is-filled').length,50);assert.match(out.textContent,/Half of the grid/);assert.equal(lab.querySelector('[data-range-value]').textContent,'50');assert.equal(lab.querySelector('[data-preset="50"]').getAttribute('aria-pressed'),'true');
  set(0);assert.equal(lab.querySelectorAll('.is-filled').length,0);set(100);assert.equal(lab.querySelectorAll('.is-filled').length,100);
 }else if(kind==='century'){
  click('[data-preset="2000"]');assert.match(visual.textContent,/Century 20/);click('[data-preset="2001"]');assert.match(visual.textContent,/Century 21/);assert.equal(visual.querySelectorAll('.is-current').length,1);
  set('');assert.equal(input.getAttribute('aria-invalid'),'true');assert.match(out.textContent,/whole year/);set(9999);assert.equal(input.hasAttribute('aria-invalid'),false);assert.match(visual.textContent,/Century 100/);
 }else if(kind==='leap'){
  for(const [year,days] of [[2000,29],[2024,29],[2100,28],[2023,28]]){set(year);assert.match(visual.querySelector('.lab-number').textContent,new RegExp(String(days)));}
  set(2023);assert.equal(visual.querySelectorAll('.is-skipped').length,2);set(2024);assert.equal(visual.querySelectorAll('.is-skipped').length,1);
 }else if(kind==='moon'||kind==='seasons'){
  for(const b of lab.querySelectorAll('[data-choice]')){b.click();assert.equal(b.getAttribute('aria-pressed'),'true');assert.equal(lab.querySelectorAll('[data-choice][aria-pressed=true]').length,1);assert.ok(out.textContent.length>30);}
  if(kind==='moon'){assert.ok(visual.querySelector('.phase-3'));assert.match(out.textContent,/Last quarter/);}else{assert.match(out.textContent,/southern half tilts/);assert.equal(visual.querySelectorAll('.is-summer').length,1);}
 }else if(kind==='clocks'){
  click('[data-preset="0"]');assert.match(visual.textContent,/19:00Previous day/);click('[data-preset="23"]');assert.match(visual.textContent,/02:00Next day/);assert.equal(visual.querySelectorAll('svg').length,3);
 }else if(kind==='calendar'){
  set(2);assert.match(out.textContent,/only one day passed overnight/);assert.equal(visual.querySelector('.lab-date-trail .is-active').textContent,'14');
 }else if(kind==='round'){
  for(let i=0;i<4;i++)click('[data-step]');assert.equal(lab.querySelector('[data-step]').disabled,true);assert.match(out.textContent,/65 real stickers/);click('[data-reset]');assert.equal(lab.querySelector('[data-step]').disabled,false);assert.match(out.textContent,/Start with 38/);
 }else{
  const details=lab.querySelector('.lab-times-table');assert.equal(details.open,false);details.open=true;
  for(const [r,c,key] of [[1,0,'ArrowLeft'],[1,12,'ArrowRight'],[0,4,'ArrowUp'],[12,4,'ArrowDown']]){const cell=lab.querySelector(`[data-r="${r}"][data-c="${c}"]`);cell.focus();cell.dispatchEvent(new w.KeyboardEvent('keydown',{key,bubbles:true}));assert.equal(w.document.activeElement,cell);}
 }
 assert.equal(out.getAttribute('aria-live'),'polite');dom.window.close();
}
console.log('PASS Academy labs: presets, visible values, invalid years, century/leap boundaries, all phase/month choices, midnight, 1752 skip, reset and table keyboard edges.');
