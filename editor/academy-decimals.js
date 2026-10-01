export function decimalLab(controls,visual,out){
 controls.hidden=false;
 controls.innerHTML='<label>Count in<select aria-label="Count in"><option value="10">Tenths</option><option value="100">Hundredths</option></select></label><label class="lab-range"><span class="lab-control-label">Parts to colour<b data-range-value aria-hidden="true">5</b></span><input type="range" min="0" max="10" value="5" aria-label="Parts to colour"></label><button type="button" data-decimal-half>Show one half</button>';
 const mode=controls.querySelector('select'),input=controls.querySelector('input');let denominator=10;
 function paint(){
  const n=Number(input.value),squares=n*100/denominator,decimal=(n/denominator).toFixed(denominator===10?1:2);
  controls.querySelector('[data-range-value]').textContent=n;
  input.setAttribute('aria-valuetext',`${n} ${denominator===10?(n===1?'tenth':'tenths'):(n===1?'hundredth':'hundredths')}, ${decimal}`);
  visual.innerHTML=`<div class="lab-decimal-value"><strong>${decimal}</strong><span>${n} out of ${denominator} equal parts</span></div><div class="lab-hundred lab-decimal-grid">${Array.from({length:100},(_,i)=>`<span class="${i<squares?'is-filled':''}"></span>`).join('')}</div><div class="lab-decimal-place"><span>Whole<strong>${Math.floor(n/denominator)}</strong></span><b>.</b><span>Tenths<strong>${Math.floor(squares/10)%10}</strong></span><span>Hundredths<strong>${squares%10}</strong></span></div>`;
  out.textContent=`${n} ${denominator===10?(n===1?'tenth':'tenths'):(n===1?'hundredth':'hundredths')} of the whole square is ${decimal}. ${squares} of its 100 small squares ${squares===1?'is':'are'} coloured.${squares===50?' Half the square: 0.5 and 0.50 show the same amount.':squares===5?' Five hundredths: 0.05. This is smaller than 0.5.':squares===100?' All the pieces make one whole.':squares===0?' None of the pieces is coloured.':''}`;
 }
 input.addEventListener('input',paint);
 mode.addEventListener('change',()=>{
  const oldSquares=Number(input.value)*100/denominator;denominator=Number(mode.value);input.max=denominator;
  input.value=Math.round(oldSquares*denominator/100);paint();
  if(denominator===10&&oldSquares%10!==0)out.textContent+=' Tenths mode rounds to the nearest whole column; switch to hundredths for smaller steps.';
 });
 controls.querySelector('[data-decimal-half]').onclick=()=>{input.value=denominator/2;paint();};paint();
}
