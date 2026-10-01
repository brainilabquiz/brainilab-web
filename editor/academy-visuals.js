// Small, local diagrams: no image downloads or third-party embeds.
export const equation = (left, answer) => `<div class="lab-sum"><span>${left}</span><span class="lab-equals">=</span><strong>${answer}</strong></div>`;
export function clockFace(hour){
 const angle=(hour%12)*Math.PI/6,x=50+23*Math.sin(angle),y=50-23*Math.cos(angle);
 return `<svg class="lab-clock-face" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="currentColor"/><g stroke="#2d296e" stroke-width="2">${Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return `<line x1="${50+39*Math.sin(a)}" y1="${50-39*Math.cos(a)}" x2="${50+43*Math.sin(a)}" y2="${50-43*Math.cos(a)}"/>`;}).join('')}</g><path d="M50 15V50L${x} ${y}" fill="none" stroke="#2d296e" stroke-width="4" stroke-linecap="round"/><circle cx="50" cy="50" r="4" fill="#2d296e"/></svg>`;
}
export function moonScene(n){
 return `<div class="lab-sky"><span class="lab-scene-label">Our view from Earth</span><div class="lab-moon phase-${n}"><i></i><i></i><i></i></div><strong>${['New Moon','First quarter','Full Moon','Last quarter'][n]}</strong><span>${['Mostly hidden','Half lit','Fully lit','Half lit'][n]}</span></div>`;
}
export function seasonsScene(n){
 return `<div class="lab-season-scene"><svg viewBox="0 0 340 170" aria-hidden="true"><circle cx="36" cy="85" r="26" fill="#ffdf00"/><g stroke="#d68f00" stroke-width="3" stroke-linecap="round"><path d="M36 45V36M36 125V134M76 85H85M5 56L11 62M64 57L70 51M64 113L70 119"/></g><g stroke="#d8b638" stroke-width="2"><path d="M93 59H178M93 85H169M93 111H178"/><path d="m170 55 8 4-8 4m-9 18 8 4-8 4m9 18 8 4-8 4" fill="none"/></g><g transform="translate(245 85) rotate(${n===0?-23.5:23.5})"><circle r="60" fill="#dbe9fa"/><path d="M-44-32  -20-46 0-30-5-12-25-8-35 9-49-2ZM12 9 33 3 48 26 26 47 15 29Z" fill="#47943a"/><ellipse rx="60" ry="18" fill="none" stroke="#6676a4" stroke-dasharray="4 4"/><path d="M0-74V74" stroke="#2d296e" stroke-width="2" stroke-dasharray="4 4"/><text y="-79" text-anchor="middle" fill="#2d296e" font-size="12" font-weight="700">N</text></g></svg><div class="lab-hemispheres"><div class="${n===0?'is-summer':'is-winter'}"><span>Northern hemisphere</span><strong>${n===0?'Summer':'Winter'}</strong><small>${n===0?'Longer days':'Shorter days'}</small></div><div class="${n===0?'is-winter':'is-summer'}"><span>Southern hemisphere</span><strong>${n===0?'Winter':'Summer'}</strong><small>${n===0?'Shorter days':'Longer days'}</small></div></div></div>`;
}
export function centuryScene(year){
 const century=Math.ceil(year/100),first=(century-1)*100+1,last=century*100;
 return `<div class="lab-century"><span class="lab-scene-label">A box of 100 years</span><strong>Century ${century}</strong><div class="lab-year-cells">${Array.from({length:100},(_,i)=>`<i class="${first+i===year?'is-current':''}"></i>`).join('')}</div><div class="lab-year-ends"><span>${first}</span><b>${year}</b><span>${last}</span></div></div>`;
}
export function leapScene(year){
 const four=year%4===0,hundred=year%100===0,fourhundred=year%400===0,leap=four&&(!hundred||fourhundred);
 return `<div class="lab-leap"><span class="lab-scene-label">February ${year}</span><strong class="lab-number">${leap?29:28}<small>days</small></strong><span class="lab-verdict">${leap?'Leap year':'Ordinary year'}</span><ol class="lab-checks"><li><span>Divisible by 4</span><b>${four?'Yes':'No'}</b></li><li class="${four?'':'is-skipped'}"><span>Divisible by 100</span><b>${four?(hundred?'Yes':'No'):'—'}</b></li><li class="${four&&hundred?'':'is-skipped'}"><span>Divisible by 400</span><b>${four&&hundred?(fourhundred?'Yes':'No'):'—'}</b></li></ol></div>`;
}
export function enhanceControls(controls,kind){
 const presets={percent:[0,25,50,75,100],century:[1900,1901,2000,2001],leap:[2000,2024,2100],clocks:[0,12,23]};
 const input=controls.querySelector('input');
 if(presets[kind]&&input){
  const box=document.createElement('div');box.className='lab-presets';box.setAttribute('role','group');box.setAttribute('aria-label','Try an example');
  box.innerHTML=presets[kind].map(n=>`<button type="button" data-preset="${n}" aria-pressed="false">${n}${kind==='percent'?'%':kind==='clocks'?':00':''}</button>`).join('');controls.append(box);
  box.addEventListener('click',e=>{const button=e.target.closest('[data-preset]');if(!button)return;input.value=button.dataset.preset;input.dispatchEvent(new Event('input',{bubbles:true}));});
 }
 const select=controls.querySelector('select');
 if(select){
  const box=document.createElement('div');box.className='lab-choices';box.setAttribute('role','group');box.setAttribute('aria-label',kind==='moon'?'Choose a phase':'Choose a month');
  box.innerHTML=[...select.options].map((o,i)=>`<button type="button" data-choice="${o.value}" aria-pressed="${o.selected}">${kind==='moon'?`<i class="lab-phase-icon phase-${i}" aria-hidden="true"></i>`:''}${o.textContent}</button>`).join('');
  select.closest('label').hidden=true;controls.append(box);
  box.addEventListener('click',e=>{const button=e.target.closest('[data-choice]');if(!button)return;select.value=button.dataset.choice;select.dispatchEvent(new Event('input',{bubbles:true}));});
 }
}
export function updateControls(controls){
 for(const input of controls.querySelectorAll('input[type=range]')){
  const value=input.closest('label').querySelector('[data-range-value]');if(value)value.textContent=input.value;
 }
 const input=controls.querySelector('input,select');
 for(const button of controls.querySelectorAll('[data-preset],[data-choice]'))button.setAttribute('aria-pressed',String(input.value===(button.dataset.preset??button.dataset.choice)));
}
