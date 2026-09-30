function slider(label,min,max,value){return `<label>${label}<input type="range" min="${min}" max="${max}" value="${value}" /></label>`;}
function options(label,values){return `<label>${label}<select>${values.map((v,i)=>`<option value="${i}">${v}</option>`).join('')}</select></label>`;}
export function initLabs(){
 for(const el of document.querySelectorAll('[data-academy-lab]')){
  const kind=el.dataset.academyLab,controls=el.querySelector('[data-lab-controls]'),visual=el.querySelector('[data-lab-visual]'),out=el.querySelector('[data-lab-output]');
  if(['add-basics','subtract-basics','groups-basics'].includes(kind)){beginnerLab(el,kind,controls,visual,out);continue;}
  let step=0;
  const config={round:'<button type="button" data-step>Show the next step</button><button type="button" data-reset>Start again</button>',multiply:slider('Stickers in each group',1,20,3),percent:slider('Squares to colour',0,100,25),century:'<label>Year (CE)<input type="number" min="1" max="9999" value="2000" step="1" /></label>',leap:'<label>Year (Gregorian calendar)<input type="number" min="1" max="9999" value="2100" step="1" /></label>',calendar:slider('Move forward one day at a time',0,4,0),moon:options('Choose a phase',['New Moon','First quarter','Full Moon','Last quarter']),seasons:options('Choose a month',['June','December']),clocks:slider('UTC hour',0,23,12)};
  if(!config[kind])continue;controls.innerHTML=config[kind];controls.hidden=false;
  function paint(){
   const input=controls.querySelector('input,select'),n=input?Number(input.value):step;
   if(input&&(!input.value||!Number.isInteger(n)||n<Number(input.min||0)||n>Number(input.max||9999))){visual.replaceChildren();out.textContent='Choose a whole year from 1 to 9999.';return;}
   if(kind==='round'){
    const totals=[38,40,60,67,65],texts=['Start with 38 stickers. You want to add 27.','Add 2 pretend stickers. You now have an easy starting number: 40.','Add the first 20 of your 27 real stickers. Now you have 60.','Add the other 7 real stickers. Now you have 67, including the 2 pretend ones.','Remove the 2 pretend stickers. You have 65 real stickers. So 38 + 27 is 65.'];
    visual.innerHTML=`<div class="lab-counters">${Array.from({length:totals[step]},(_,i)=>`<span class="${step>0&&step<4&&i>=totals[step]-2?'is-pretend':''}"></span>`).join('')}</div><strong class="lab-number">${totals[step]} stickers</strong>`;out.textContent=texts[step];controls.querySelector('[data-step]').disabled=step===4;
   }else if(kind==='percent'){
    visual.innerHTML=`<div class="lab-hundred">${Array.from({length:100},(_,i)=>`<span class="${i<n?'is-filled':''}"></span>`).join('')}</div>`;out.textContent=`${n} coloured squares out of 100. That is ${n}%. ${n===25?'One quarter of the grid.':n===50?'Half of the grid.':n===100?'The whole grid.':''}`;
   }else if(kind==='multiply'){
    visual.innerHTML=`<div class="lab-groups">${Array.from({length:11},(_,i)=>`<span class="${i===10?'extra-group':''}">${n}</span>`).join('')}</div>`;out.textContent=`Ten groups of ${n} give you ${n*10} stickers. One more group adds ${n}. Altogether, eleven groups give you ${n*11}.`;
   }else if(kind==='century'){
    const century=Math.ceil(n/100),first=(century-1)*100+1,last=century*100;visual.innerHTML=`<div class="lab-century"><span>${first}</span><strong>Century ${century}</strong><span>${last}</span></div>`;out.textContent=`The year ${n} belongs in century ${century}: the box from ${first} to ${last}, including both ends. ${n===last?'It is the last year in this century.':''}`;
   }else if(kind==='leap'){
    const four=n%4===0,hundred=n%100===0,fourhundred=n%400===0,leap=four&&(!hundred||fourhundred);
    const checks=[`Does ${n} divide into groups of 4 with nothing left over? ${four?'Yes.':'No. Stop here: an ordinary year.'}`];if(four)checks.push(`Does it also divide by 100? ${hundred?'Yes. Check 400 next.':'No. It is a leap year.'}`);if(four&&hundred)checks.push(`Does it divide by 400? ${fourhundred?'Yes. It is a leap year.':'No. It is an ordinary year.'}`);
    visual.innerHTML=`<strong class="lab-number">February has ${leap?29:28} days</strong>`;out.textContent=checks.join(' ');
   }else if(kind==='calendar'){
    const days=[1,2,14,15,16];visual.innerHTML=`<div class="lab-calendar"><span>September 1752</span><strong>${days[n]}</strong><span>Britain</span></div>`;out.textContent=`${n} ${n===1?'day has':'days have'} passed since 1 September. The calendar now says ${days[n]} September.${n===2?' Yesterday was 2 September. Eleven date labels were skipped, but only one day passed overnight.':''}`;
   }else if(kind==='moon'){
    const labels=['New Moon','First quarter','Full Moon','Last quarter'],descriptions=['The bright half mostly faces away from us, so the Moon is usually not visible.','We see half of the bright side. The Moon is about a quarter of the way around its cycle.','The bright half faces us. We see a full disc.','We again see half of the bright side, now later in the cycle.'];
    visual.innerHTML=`<div class="lab-moon phase-${n}"></div>`;out.textContent=`${labels[n]}: ${descriptions[n]} This is a simplified view; the apparent orientation depends on where you watch from.`;
   }else if(kind==='seasons'){
    visual.innerHTML=`<div class="lab-hemispheres"><div><span>Northern hemisphere</span><strong>${n===0?'Summer':'Winter'}</strong></div><div><span>Southern hemisphere</span><strong>${n===0?'Winter':'Summer'}</strong></div></div>`;out.textContent=`In ${n===0?'June':'December'}, the ${n===0?'northern':'southern'} half tilts towards the Sun. It gets more direct sunlight and longer days. The other half has winter. Tropical places often describe seasons by rainfall instead.`;
   }else if(kind==='clocks'){
    visual.innerHTML=`<div class="lab-clocks">${[0,3,-5].map(offset=>{const h=n+offset;return `<div><span>UTC${offset>0?'+'+offset:offset||''}</span><strong>${String((h+24)%24).padStart(2,'0')}:00</strong><small>${h<0?'Previous day':h>=24?'Next day':'Same day'}</small></div>`;}).join('')}</div>`;out.textContent=`At ${n}:00 UTC, add 3 hours for UTC+3 and take away 5 for UTC−5. Crossing midnight changes the calendar date.`;
   }
  }
  controls.addEventListener('input',paint);controls.addEventListener('change',paint);
  controls.querySelector('[data-step]')?.addEventListener('click',()=>{step=Math.min(4,step+1);paint();});controls.querySelector('[data-reset]')?.addEventListener('click',()=>{step=0;paint();});paint();
  if(kind==='multiply')multiplicationTable(el);
 }
}
function beginnerLab(el,kind,controls,visual,out){
 const adding=kind==='add-basics',subtracting=kind==='subtract-basics';
 let removed=0,revealed=false;
 controls.hidden=false;
 controls.innerHTML=subtracting?`${slider('Counters to start with',0,12,6)}<button type="button" data-take>Take one away</button><button type="button" data-back>Put one back</button>`:`${slider(adding?'First pile':'Number of groups',0,adding?10:6,adding?2:3)}${slider(adding?'Second pile':'Counters in each group',0,adding?10:6,adding?3:2)}<button type="button" data-reveal>Show the total</button>`;
 const inputs=[...controls.querySelectorAll('input')];
 function counters(n,shape='',start=0){return Array.from({length:n},(_,i)=>`<span class="lab-counter ${shape}">${i+1+start}</span>`).join('');}
 function paint(){
  const [a,b]=inputs.map(input=>Number(input.value));
  if(subtracting){
   removed=Math.min(removed,a);const left=a-removed;
   visual.innerHTML=`<div class="lab-pile"><strong>Started with ${a}</strong><div class="lab-countable">${counters(left)}${counters(removed,'is-removed',left)}</div><strong class="lab-number">${left} left</strong></div>`;
   out.textContent=`Start with ${a} counters. Take away ${removed}. ${left} remain. ${a} − ${removed} = ${left}. Check: ${left} + ${removed} = ${a}.`;
   controls.querySelector('[data-take]').disabled=left===0;controls.querySelector('[data-back]').disabled=removed===0;
  }else{
   const total=adding?a+b:a*b;
   visual.innerHTML=adding?`<div class="lab-two-piles"><div class="lab-pile"><strong>First pile: ${a}</strong><div class="lab-countable">${counters(a)}</div></div><div class="lab-pile second-pile"><strong>Second pile: ${b}</strong><div class="lab-countable">${counters(b,'is-square')}</div></div></div>`:`<div class="lab-equal-groups">${Array.from({length:a},(_,i)=>`<div class="lab-pile"><strong>Group ${i+1}</strong><div class="lab-countable">${counters(b)}</div>${b===0?'<span>Empty</span>':''}</div>`).join('')}</div>`;
   if(revealed)visual.insertAdjacentHTML('beforeend',`<strong class="lab-number">${total} altogether</strong>`);
   out.textContent=adding?`First pile: ${a} counters. Second pile: ${b} counters. ${revealed?`Put them together: ${a} + ${b} = ${total}. There are ${total} altogether.`:'Count both piles, then show the total to check.'}`:`${a} ${a===1?'group':'groups'}, with ${b} counters in each. ${revealed?`${a} × ${b} = ${total}. ${a===0?'No groups means no counters.':b===0?'All the groups are empty.':`Count by groups: ${Array.from({length:a},(_,i)=>(i+1)*b).join(', ')}.`}`:'Count what you have, then show the total to check.'}`;
   controls.querySelector('[data-reveal]').disabled=revealed;
  }
  inputs.forEach(input=>input.setAttribute('aria-valuetext',`${input.value} ${adding?'counters':subtracting?'starting counters':input===inputs[0]?'groups':'counters per group'}`));
 }
 controls.addEventListener('input',()=>{removed=0;revealed=false;paint();});
 controls.querySelector('[data-take]')?.addEventListener('click',()=>{removed++;paint();});
 controls.querySelector('[data-back]')?.addEventListener('click',()=>{removed--;paint();});
 controls.querySelector('[data-reveal]')?.addEventListener('click',()=>{revealed=true;paint();});
 paint();if(kind==='groups-basics')multiplicationTable(el);
}
function multiplicationTable(el){
 const box=document.createElement('div');box.className='lab-times-table';
 box.innerHTML=`<h4>Explore the multiplication table</h4><p>Hover, tap or focus a number. Its row and column show the two numbers being multiplied. Use the arrow keys to move between cells.</p><div class="table-scroll"><table><caption>Multiplication from 0 to 12</caption><thead><tr><th scope="col">×</th>${Array.from({length:13},(_,c)=>`<th scope="col" data-col="${c}">${c}</th>`).join('')}</tr></thead><tbody>${Array.from({length:13},(_,r)=>`<tr><th scope="row" data-row="${r}">${r}</th>${Array.from({length:13},(_,c)=>`<td><button type="button" tabindex="${r===8&&c===2?0:-1}" data-r="${r}" data-c="${c}" aria-label="${r} times ${c} equals ${r*c}">${r*c}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="lab-equation" role="status" aria-live="polite">8 × 2 = 16</p>`;
 el.append(box);const cells=[...box.querySelectorAll('button')],result=box.querySelector('.lab-equation');
 function highlight(button){const r=Number(button.dataset.r),c=Number(button.dataset.c);for(const cell of cells){const active=cell===button;cell.classList.toggle('is-row',Number(cell.dataset.r)===r);cell.classList.toggle('is-col',Number(cell.dataset.c)===c);cell.classList.toggle('is-product',active);cell.tabIndex=active?0:-1;}box.querySelectorAll('th').forEach(th=>th.classList.toggle('is-factor',Number(th.dataset.row)===r||Number(th.dataset.col)===c));result.textContent=`${r} × ${c} = ${r*c}. ${r} groups of ${c} make ${r*c}.`;}
 for(const button of cells){for(const event of ['pointerover','focus','click'])button.addEventListener(event,()=>highlight(button));button.addEventListener('keydown',e=>{const move={ArrowUp:-13,ArrowDown:13,ArrowLeft:-1,ArrowRight:1}[e.key];if(move){e.preventDefault();cells[Math.max(0,Math.min(168,cells.indexOf(button)+move))].focus();}});}highlight(cells[8*13+2]);
}
