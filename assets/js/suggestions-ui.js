/* Optional feedback, sent only after the player explicitly submits the form. */
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('suggestionsForm');if(!form)return;
 const error=document.getElementById('suggestionsError'),success=document.getElementById('suggestionsSuccess');
 const button=form.querySelector('[type="submit"]'),message=form.elements.message;
 const games={brainmix:'Brain Mix',brainiword:'BrainiWord',generalknowledge:'General Knowledge',worldflags:'World Flags',worldcapitals:'World Capitals',science:'Science',history:'History',sports:'Sports',mathrush:'Math Rush',connections:'Connections',numberroute:'Number Route',sequence:'Sequence',orderup:'Order Up',topicrush:'Topic Rush',survival:'Survival',oddoneout:'Odd One Out',higherlower:'Higher or Lower'};
 const params=new URLSearchParams(location.search);
 const context=params.getAll('context').length===1&&params.get('context')==='post-game'?'post-game':'site';
 const id=params.getAll('game').length===1&&Object.hasOwn(games,params.get('game'))?params.get('game'):null;
 if(context==='post-game'){
  document.querySelector('.suggestions-copy h1').textContent='How was your game?';
  document.querySelector('.suggestions-copy p').textContent='What worked for you, and what could feel better? A sentence or two is plenty.';
  form.elements.type.value='improvement';
  if(id){document.getElementById('feedbackGame').hidden=false;document.getElementById('feedbackGame').textContent='About '+games[id];}
  message.placeholder='Was anything confusing, missing or especially enjoyable?';
 }
 button.disabled=false;
 let pending=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(pending)return;error.textContent='';
  const text=message.value.trim();
  if(text.length<10){error.textContent='Please add a little more detail (at least 10 characters).';message.focus();return;}
  if(!form.reportValidity())return;
  pending=true;button.disabled=true;button.textContent='Sending…';form.setAttribute('aria-busy','true');
  try{
   if(!window.BrainiFeedback)throw new Error('unavailable');
   await window.BrainiFeedback.submit({type:form.elements.type.value,message:(context==='post-game'&&id?'[After playing '+games[id]+']\n':'')+text,email:form.elements.email.value.trim()});
   form.hidden=true;success.hidden=false;success.focus();
   window.dispatchEvent(new CustomEvent('brainilab:feedbacksent',{detail:{source:context}}));
  }catch{
   error.textContent='Your message could not be sent. Your text is still here; please try again.';error.focus();
  }finally{pending=false;button.disabled=false;button.textContent='Send message';form.removeAttribute('aria-busy');}
 });
 document.getElementById('suggestAnother').addEventListener('click',()=>{
  form.reset();if(context==='post-game')form.elements.type.value='improvement';error.textContent='';success.hidden=true;form.hidden=false;message.focus();
 });
});
