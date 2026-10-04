import {labBundle,labMarkup} from './academy-lab-fixture.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const manifest=JSON.parse(readFileSync('tools/academy-new-manifest.json','utf8'));
for(const {slug,kind} of manifest){
 const dom=new JSDOM(labMarkup(slug),{url:`https://brainilabgames.com/learn/${slug}/`,runScripts:'outside-only'}),w=dom.window;
 w.eval(labBundle);const lab=w.document.querySelector('[data-academy-lab]'),out=lab.querySelector('[data-lab-output]'),inputs=[...lab.querySelectorAll('input,select')];
 const set=(i,value)=>{inputs[i].value=value;inputs[i].dispatchEvent(new w.Event('input',{bubbles:true}));};
 assert.equal(lab.dataset.academyLab,kind);assert.ok(out.textContent.length>25,slug);
 if(kind==='sharing'){assert.match(out.textContent,/4 in each bowl, with 1 left over/);set(0,0);assert.match(out.textContent,/0 in each bowl, with 0 left over/);}
 if(kind==='place'){set(0,20);assert.match(out.textContent,/2 tens and 0 ones/);assert.equal(lab.querySelectorAll('.lab-rods>span').length,2);}
 if(kind==='make-ten'){set(0,9);set(1,4);assert.match(out.textContent,/10 \+ 3 = 13/);set(0,1);set(1,1);assert.match(out.textContent,/does not reach ten/);}
 if(kind==='double-half'){assert.match(out.textContent,/3 × 10 = 30/);}
 if(kind==='weekday'){set(0,8);assert.match(out.textContent,/Tuesday/);}
 if(kind==='day-night'){set(0,0);assert.match(out.textContent,/night/);set(0,180);assert.match(out.textContent,/daytime/);set(0,90);assert.match(out.textContent,/boundary/);}
 if(kind==='fraction-reading'){set(1,5);set(0,2);assert.equal(inputs[1].value,'2');assert.match(out.textContent,/2\/2/);}
 if(kind==='fraction-equivalent'){set(0,3);assert.match(out.textContent,/1\/2 = 3\/6/);}
 if(kind==='fraction-compare'){assert.match(out.textContent,/1\/2 is greater than 1\/4/);set(3,2);assert.match(out.textContent,/equal to/);}
 if(kind==='fraction-add'){assert.match(out.textContent,/5\/4/);assert.match(out.textContent,/1 whole and 1\/4/);set(1,4);set(2,4);assert.match(out.textContent,/2 wholes and 0\/4/);}
 if(kind==='repeat'||kind==='sequence-rule'){for(let i=0;i<5;i++)lab.querySelector('[data-reveal]').click();assert.equal(lab.querySelector('[data-reveal]').disabled,true);set(0,1);assert.equal(lab.querySelector('[data-reveal]').disabled,false);}
 if(kind==='transform'){for(let i=0;i<4;i++)lab.querySelector('[data-turn]').click();assert.match(out.textContent,/0 quarter/);lab.querySelector('[data-mirror]').click();assert.match(out.textContent,/reflected/);lab.querySelector('[data-reset]').click();assert.ok(!out.textContent.includes('then reflected'));}
 if(kind==='sorting'){assert.equal(lab.querySelectorAll('.is-selected').length,1);set(0,1);assert.equal(lab.querySelectorAll('.is-selected').length,3);}
 if(kind==='deduction'){set(0,1);assert.match(out.textContent,/counterexample/);set(1,1);assert.match(out.textContent,/does not guarantee/);}
 inputs.filter(i=>i.type==='range').forEach(input=>{for(const v of [input.min,input.max]){input.value=v;input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.ok(!/NaN|undefined/.test(out.textContent),slug);}});
 dom.window.close();
}
console.log('PASS 17 foundation activities: arithmetic boundaries, fraction invariants, turn/flip controls, rule changes and counterexamples.');
