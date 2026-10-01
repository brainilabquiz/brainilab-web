import {equation,updateControls} from './academy-visuals.js';
const range=(label,min,max,value,step=1)=>`<label class="lab-range"><span class="lab-control-label">${label}<b data-range-value aria-hidden="true">${value}</b></span><input type="range" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
const select=(label,items)=>`<label>${label}<select aria-label="${label}">${items.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select></label>`;
const counters=n=>Array.from({length:n},(_,i)=>`<span class="lab-counter">${i+1}</span>`).join('');
const strip=(n,d,label)=>`<div class="lab-fraction"><strong>${label||`${n}/${d}`}</strong><div class="lab-fraction-strip" style="--parts:${d}">${Array.from({length:d},(_,i)=>`<span class="${i<n?'is-filled':''}"></span>`).join('')}</div></div>`;
const config={
 count:range('Counters',0,12,5),place:range('Number',0,99,23),sharing:range('Counters to share',0,24,13)+range('Bowls',1,6,3),
 'make-ten':range('First pile',1,9,8)+range('Add this many',1,9,5),'double-half':range('Number of groups',2,8,6,2)+range('Counters in each',1,6,5),
 weekday:range('Days after Monday',0,21,0),'day-night':range('Turn around Earth',0,360,180,15),
 'fraction-parts':range('Equal parts in the whole',2,8,4)+range('Selected parts',0,4,1),'fraction-reading':range('Denominator',2,8,5)+range('Numerator',0,5,3),
 'fraction-equivalent':range('Cut each half into',1,6,2),
 'fraction-compare':range('First denominator',2,8,2)+range('First numerator',0,2,1)+range('Second denominator',2,8,4)+range('Second numerator',0,4,1),
 'fraction-add':range('Equal pieces in a whole',2,8,4)+range('First numerator',0,4,3)+range('Second numerator',0,4,2),
 repeat:select('Repeating unit',['Circle · square','Circle · square · triangle'])+'<button type="button" data-reveal>Reveal the next shape</button>',
 'sequence-rule':select('Rule',['Add 3 each time','Double each time','Alternate +2, then +5'])+'<button type="button" data-reveal>Reveal the next number</button>',
 transform:'<button type="button" data-turn>Turn a quarter clockwise</button><button type="button" data-mirror>Reflect left to right</button><button type="button" data-reset>Start again</button>',
 sorting:select('Select objects that are…',['Red and round','Red or round','Round but not red']),
 deduction:select('Conclusion to test',['All circles are red','Some red objects are not circles'])+select('Possible arrangement',['Two red circles','Two red circles and a red square'])
};
export function foundationLab(kind,controls,visual,out){
 if(!config[kind])return false;
 controls.innerHTML=config[kind];controls.hidden=false;
 let step=0,turn=0,mirror=1;
 const inputs=[...controls.querySelectorAll('input,select')];
 function paint(){
  if(['fraction-parts','fraction-reading','fraction-add','fraction-compare'].includes(kind)){
   const pairs=kind==='fraction-compare'?[[0,1],[2,3]]:kind==='fraction-add'?[[0,1],[0,2]]:[[0,1]];
   for(const [den,num] of pairs){inputs[num].max=inputs[den].value;inputs[num].value=Math.min(Number(inputs[num].value),Number(inputs[den].value));}
  }
  updateControls(controls);
  const [a,b,c,d]=inputs.map(i=>Number(i.value));
  if(kind==='count'){
   visual.innerHTML=`<div class="lab-pile"><div class="lab-countable">${counters(a)}</div>${!a?'<span class="lab-empty">An empty pile</span>':''}</div>${equation('How many?',a)}`;
   out.textContent=a?`Count each counter once. The last number is ${a}, so there are ${a} counters altogether.`:'There are no counters in the pile. Zero is the number for none.';
  }else if(kind==='place'){
   const tens=Math.floor(a/10),ones=a%10;
   visual.innerHTML=`<div class="lab-place"><div><strong>${tens} tens</strong><div class="lab-rods">${Array.from({length:tens},()=>'<span>'+('<i></i>'.repeat(10))+'</span>').join('')}</div></div><div><strong>${ones} ones</strong><div class="lab-countable">${counters(ones)}</div></div></div>${equation(`${tens*10} + ${ones}`,a)}`;
   out.textContent=`${a} has ${tens} tens and ${ones} ones. ${tens} bundles of ten make ${tens*10}; add ${ones} loose units to make ${a}.`;
  }else if(kind==='sharing'){
   const each=Math.floor(a/b),left=a%b;
   visual.innerHTML=`<div class="lab-equal-groups">${Array.from({length:b},(_,i)=>`<div class="lab-pile"><strong>Bowl ${i+1}</strong><div class="lab-countable">${counters(each)}</div><span>${each} each</span></div>`).join('')}</div><div class="lab-pile"><strong>${left} left over</strong><div class="lab-countable">${counters(left)}</div></div>`;
   out.textContent=`Share ${a} whole counters between ${b} bowls: ${each} in each bowl, with ${left} left over. Check: ${b} × ${each} + ${left} = ${a}.`;
  }else if(kind==='make-ten'){
   const total=a+b,used=Math.min(b,10-a),rest=b-used;
   visual.innerHTML=`${strip(Math.min(10,total),10,'Ten-frame')}${rest?`<div class="lab-countable">${counters(rest)}</div>`:''}${equation(`${a} + ${b}`,total)}`;
   out.textContent=total>=10?`Use ${used} of the ${b} new counters to complete ten. ${rest} remain. ${a} + ${b} = 10 + ${rest} = ${total}.`:`${a} + ${b} = ${total}. This pile does not reach ten yet; ${10-total} spaces remain empty.`;
  }else if(kind==='double-half'){
   visual.innerHTML=`<div class="lab-pack"><strong>${a} groups of ${b}</strong><div class="lab-groups">${Array.from({length:a},()=>`<span>${b}</span>`).join('')}</div><span class="lab-join">=</span><strong>${a/2} groups of ${b*2}</strong><div class="lab-groups">${Array.from({length:a/2},()=>`<span>${b*2}</span>`).join('')}</div></div>${equation('Same total',a*b)}`;
   out.textContent=`${a} × ${b} = ${a*b}. Pair the groups: half as many groups, each twice as full. ${a/2} × ${b*2} = ${a*b}. Nothing was added or removed.`;
  }else if(kind==='weekday'){
   const days=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
   visual.innerHTML=`<div class="lab-date-trail">${days.map((s,i)=>`<span class="${i===a%7?'is-active':''}">${s.slice(0,3)}</span>`).join('')}</div><div class="lab-calendar"><span>${a} days later</span><strong>${days[a%7].slice(0,3)}</strong><span>${Math.floor(a/7)} complete weeks</span></div>`;
   out.textContent=`Start on Monday. After ${a} elapsed days it is ${days[a%7]}. ${Math.floor(a/7)} complete seven-day weeks and ${a%7} extra days have passed.`;
  }else if(kind==='day-night'){
   const x=180+65*Math.cos(a*Math.PI/180),y=105+65*Math.sin(a*Math.PI/180),lit=x<180,boundary=Math.abs(x-180)<.01;
   visual.innerHTML=`<svg viewBox="0 0 360 220" class="lab-earth"><circle cx="35" cy="105" r="24" fill="#ffe016"/><path d="M70 75H99M70 105H99M70 135H99" stroke="#c39100" stroke-width="3"/><circle cx="180" cy="105" r="78" fill="#302970"/><path d="M180 27A78 78 0 0 0 180 183Z" fill="#a5d9e1"/><circle cx="${x}" cy="${y}" r="9" fill="#ef5429" stroke="white" stroke-width="3"/><text x="180" y="208" text-anchor="middle" fill="currentColor">${boundary?'At the day–night boundary':lit?'In daylight':'In darkness'}</text></svg>`;
   out.textContent=`Light arrives from the left. The marker is ${boundary?'on the boundary between light and dark':lit?'in the lit half: daytime':'in the dark half: night'}. Moving the marker models Earth turning, not the Sun orbiting Earth.`;
  }else if(kind==='fraction-parts'||kind==='fraction-reading'){
   visual.innerHTML=strip(b,a)+equation('Selected parts',`${b}/${a}`);
   out.textContent=`The whole has ${a} equal parts. ${b} are selected, so the fraction is ${b}/${a}. The denominator names the pieces; the numerator counts the selected pieces.${b===a?' All the parts make one whole.':b===0?' None is selected.':''}`;
  }else if(kind==='fraction-equivalent'){
   visual.innerHTML=strip(1,2)+strip(a,2*a)+equation('Same amount',`1/2 = ${a}/${2*a}`);
   out.textContent=`Cut each half into ${a} equal pieces. There are now ${2*a} pieces in the whole and ${a} selected. 1/2 = ${a}/${2*a}; the shaded length has not changed.`;
  }else if(kind==='fraction-compare'){
   const sign=b*c===d*a?'=':b*c>d*a?'>':'<';
   visual.innerHTML=strip(b,a)+strip(d,c)+equation('Compare',`${b}/${a} ${sign} ${d}/${c}`);
   out.textContent=`Both strips represent the same-sized whole. ${b}/${a} is ${sign==='='?'equal to':sign==='>'?'greater than':'less than'} ${d}/${c}. Compare the shaded length, not just the numbers.`;
  }else if(kind==='fraction-add'){
   const total=b+c,whole=Math.floor(total/a),remain=total%a;
   visual.innerHTML=strip(b,a)+strip(c,a)+`<div class="lab-fraction-total">${strip(Math.min(a,total),a,'Total: first whole')}${total>a?strip(total-a,a,'Remaining parts'):''}</div>`;
   out.textContent=`${b}/${a} + ${c}/${a} = ${total}/${a}. Count ${total} pieces of size 1/${a}; the denominator stays ${a}. That makes ${whole} whole${whole===1?'':'s'} and ${remain}/${a} left over.`;
  }else if(kind==='repeat'){
   const shapes=['●','■','▲'],names=['circle','square','triangle'],len=a?3:2,count=6+step;
   visual.innerHTML=`<div class="lab-pattern">${Array.from({length:count},(_,i)=>`<span class="lab-pattern-unit">${shapes[i%len]}<small>${names[i%len]}</small></span>`).join('')}</div>`;
   out.textContent=`The unit is ${names.slice(0,len).join(', ')}. It repeats in that order. ${count} shapes are shown; the next is a ${names[count%len]}.`;
  }else if(kind==='sequence-rule'){
   const nums=[1];for(let i=0;i<4+step;i++)nums.push(a===0?nums.at(-1)+3:a===1?nums.at(-1)*2:nums.at(-1)+(i%2===0?2:5));
   visual.innerHTML=`<div class="lab-pattern">${nums.map(n=>`<span class="lab-pattern-unit">${n}</span>`).join('')}</div>`;
   out.textContent=`Rule: ${['add three each time','double each time','alternate adding two, then five'][a]}. Terms: ${nums.join(', ')}. Check every jump against that stated rule.`;
  }else if(kind==='transform'){
   visual.innerHTML=`<svg viewBox="0 0 240 220" class="lab-earth"><path d="M120 15V190" stroke="#9b98b8" stroke-dasharray="5 5"/><g transform="translate(120 100) scale(${mirror} 1) rotate(${turn*90})"><path d="M-40-50H-10V20H40V50H-40Z" fill="#302970"/><circle cx="-25" cy="-32" r="7" fill="#ffe016"/></g><text x="120" y="215" text-anchor="middle" fill="currentColor">${turn*90}° ${mirror===-1?'· reflected':''}</text></svg>`;
   out.textContent=`The L has turned ${turn} quarter-turn${turn===1?'':'s'} clockwise from its starting orientation${mirror===-1?', then reflected left to right':''}. Follow the yellow dot attached to the shape. Four quarter-turns return to the same orientation.`;
  }else if(kind==='sorting'){
   const objs=[['Red circle',true,true],['Red square',true,false],['Blue circle',false,true],['Blue square',false,false]];
   const chosen=objs.filter(([,red,round])=>a===0?red&&round:a===1?red||round:round&&!red);
   visual.innerHTML=`<div class="lab-sort">${objs.map(([name,red,round])=>`<div class="${chosen.some(o=>o[0]===name)?'is-selected':''}"><span style="color:${red?'#b73624':'#302970'}">${round?'●':'■'}</span><strong>${name}</strong><small>${chosen.some(o=>o[0]===name)?'Selected':'Not selected'}</small></div>`).join('')}</div>`;
   out.textContent=`Rule: ${['red and round','red or round (including both)','round but not red'][a]}. Selected: ${chosen.map(o=>o[0].toLowerCase()).join(', ')}. ${a===0?'Both conditions must hold.':a===1?'At least one condition must hold.':'A red circle does not qualify.'}`;
  }else if(kind==='deduction'){
   visual.innerHTML=`<div class="lab-deduction"><strong>Rule: all circles are red.</strong><div class="lab-pattern" style="color:#b73624"><span class="lab-pattern-unit">●<small>red circle</small></span><span class="lab-pattern-unit">●<small>red circle</small></span>${b?'<span class="lab-pattern-unit">■<small>red square</small></span>':''}</div><strong>${a===0?'Conclusion follows':b?'True here, but not guaranteed':'Counterexample found'}</strong></div>`;
   out.textContent=a===0?'All circles are red in both allowed arrangements. This conclusion is guaranteed by the starting rule.':b?'This collection has a red square, so some red objects are not circles. But choose the other arrangement: the rule does not guarantee a square.':'This collection contains only red circles. It obeys the rule, but no red object is a non-circle. This counterexample means the conclusion is not guaranteed.';
  }
  const reveal=controls.querySelector('[data-reveal]');if(reveal)reveal.disabled=step>=4;
 }
 controls.addEventListener('input',()=>{step=0;paint();});controls.addEventListener('change',()=>{step=0;paint();});
 controls.querySelector('[data-reveal]')?.addEventListener('click',()=>{step=Math.min(4,step+1);paint();});
 controls.querySelector('[data-turn]')?.addEventListener('click',()=>{turn=(turn+mirror+4)%4;paint();});
 controls.querySelector('[data-mirror]')?.addEventListener('click',()=>{mirror*=-1;paint();});
 controls.querySelector('[data-reset]')?.addEventListener('click',()=>{turn=0;mirror=1;paint();});
 paint();return true;
}
