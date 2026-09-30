/* Optional feedback, sent only after the player explicitly submits the form. */
document.addEventListener('DOMContentLoaded',()=>{
 const form=document.getElementById('suggestionsForm');if(!form)return;
 const error=document.getElementById('suggestionsError'),success=document.getElementById('suggestionsSuccess');
 const button=form.querySelector('[type="submit"]'),message=form.elements.message;
 const games={brainmix:'Brain Mix',brainiword:'BrainiWord',generalknowledge:'General Knowledge',worldflags:'World Flags',worldcapitals:'World Capitals',science:'Science',history:'History',sports:'Sports',mathrush:'Math Rush',connections:'Connections',numberroute:'Number Route',sequence:'Sequence',orderup:'Order Up',topicrush:'Topic Rush',survival:'Survival',oddoneout:'Odd One Out',higherlower:'Higher or Lower'};
 const params=new URLSearchParams(location.search);
 const context=params.getAll('context').length===1&&params.get('context')==='post-game'?'post-game':'site';
 const id=params.getAll('game').length===1&&Object.hasOwn(games,params.get('game'))?params.get('game'):null;
 const routes={brainmix:'/games/brain-mix/',brainiword:'/games/brainiword/',generalknowledge:'/general-knowledge/general-knowledge-quiz/',worldflags:'/geography/world-flags-quiz/',worldcapitals:'/geography/world-capitals-quiz/',science:'/science/science-quiz/',history:'/history/history-quiz/',sports:'/sports/sports-quiz/',mathrush:'/games/math-rush/',connections:'/games/connections/',numberroute:'/games/number-route/',sequence:'/games/sequence/',orderup:'/games/order-up/',topicrush:'/games/topic-rush/',survival:'/games/survival/',oddoneout:'/games/odd-one-out/',higherlower:'/games/higher-lower/'};
 if(context==='post-game'){
  document.querySelector('.suggestions-copy h1').textContent='How was your game?';
  document.querySelector('.suggestions-copy p').textContent='What worked for you, and what could feel better? A sentence or two is plenty.';
  form.elements.type.value='improvement';
  if(id){document.getElementById('feedbackGame').hidden=false;document.getElementById('feedbackGame').textContent='About '+games[id];}
  if(id)document.querySelectorAll('[data-feedback-return]').forEach(link=>{link.href=routes[id];link.textContent='Back to '+games[id]+' →';});
  message.placeholder='Was anything confusing, missing or especially enjoyable?';
 }
 const reply=form.querySelector('.suggestions-reply');
 form.elements.email.addEventListener('invalid',()=>{reply.open=true;});
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
   const receipt=await window.BrainiFeedback.submit({type:form.elements.type.value,message:(context==='post-game'&&id?'[After playing '+games[id]+']\n':'')+text,email:form.elements.email.value.trim()});
   if(receipt?.ok!==true)throw new Error('unconfirmed');
   form.hidden=true;success.hidden=false;success.focus();
   window.dispatchEvent(new CustomEvent('brainilab:feedbacksent',{detail:{source:context}}));
  }catch{
   error.textContent='Your message could not be sent. Your text is still here; please try again.';error.focus();
  }finally{pending=false;button.disabled=false;button.textContent='Send message';form.removeAttribute('aria-busy');}
 });
 document.getElementById('suggestAnother').addEventListener('click',()=>{
  form.reset();reply.open=false;if(context==='post-game')form.elements.type.value='improvement';error.textContent='';success.hidden=true;form.hidden=false;message.focus();
 });
});
