/* One compact invitation and comparison across the regular games. */
window.BrainiGameChallenge=(()=>{
 const M=window.BrainiGameChallengeModel,views=new Map();
 let target=M.incoming();
 const owner=()=>{const auth=window.BrainiData?.authState?.()||window.BrainiData?.getState?.()?.auth;return auth?.user?.id||auth?.guestUserId||auth?.anonymousPlayerId||'guest';};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function offer(gameId,result,options={}){
  const own=M.describe(gameId,result,options);if(!own)return null;
  return {own,target,rematch:!!target};
 }
 function ready(v){return v.options.challengeReady!==false&&v.owner===owner()&&v.root.isConnected;}
 function entry(){
  const c=target;let box=document.querySelector('[data-game-friend-entry]');
  document.documentElement.classList.toggle('friend-game-active',!!c);
  if(!c){box?.remove();return;}
  if(!box){
   const stage=document.querySelector('main .labgame-shell,main .connections-shell,main #leafQuiz,main .brainiword-shell,main [data-reasoning],main [data-order-up],main [data-topic-rush],main .daily-mechanic-shell');
   if(!stage)return;
   box=document.createElement('aside');box.className='game-friend-entry';box.dataset.gameFriendEntry='';box.setAttribute('aria-label','Friend challenge');stage.before(box);
  }
  box.innerHTML='<span class="game-friend-mark" aria-hidden="true">↗</span><div><span class="game-friend-kicker">A challenge from your friend</span><strong></strong><p></p></div>';
  box.querySelector('strong').textContent=c.s?'Can you '+(c.s===(c.g==='connections'&&c.d?3000:M.games[c.g].max)?'match ':'beat ')+M.points(c.s)+'?':'Your turn. Give it a go!';
  box.querySelector('p').textContent=M.rule(c)+' No account needed.';
  box.hidden=Array.from(views.values()).some(v=>v.root.isConnected&&v.options.gameId===c.g);
 }
 function status(v,text){v.slot.querySelector('[data-challenge-status]').textContent=text;}
 function controls(v){
  const enabled=ready(v)&&!v.busy&&!!v.slot.querySelector('textarea').value.trim();
  v.slot.querySelectorAll('[data-challenge-copy],[data-challenge-native]').forEach(b=>b.disabled=!enabled);
  const wa=v.slot.querySelector('[data-challenge-whatsapp]');
  wa.setAttribute('aria-disabled',String(!enabled));wa.tabIndex=enabled?0:-1;
  if(enabled)wa.href='https://wa.me/?text='+encodeURIComponent(v.slot.querySelector('textarea').value.trim());else wa.removeAttribute('href');
 }
 function render(root,options){
  const offered=offer(options.gameId,options.result,options);if(!offered)return;
  for(const [el]of views)if(!el.isConnected)views.delete(el);
  let v=views.get(root);
  if(!v||!root.contains(v.slot)){
   const slot=document.createElement('div');slot.className='post-friend';root.querySelector('.post-actions').before(slot);
   v={root,slot,options,owner:options.owner||owner(),busy:false,key:null};views.set(root,v);
  }
  v.options=options;
  const key=JSON.stringify([offered.own,offered.target]);
  if(v.key!==key){
   const comparison=offered.target&&M.compare(offered.own,offered.target);
   const comparisonHtml=offered.target?`<section class="game-friend-comparison" aria-label="Your result against your friend"><strong>${esc(comparison?.title||'Two rounds, two scores.')}</strong><dl><div class="${comparison?.kind==='win'?'is-winner':''}"><dt>You</dt><dd>${offered.own.s.toLocaleString('en-GB')}</dd></div><div class="${comparison?.kind==='loss'?'is-winner':''}"><dt>Your friend</dt><dd>${offered.target.s.toLocaleString('en-GB')}</dd></div></dl><p>${esc(comparison?.detail||'The challenge or question set changed, so these scores are not compared.')}</p></section>`:'';
   v.slot.innerHTML=comparisonHtml+'<section class="game-friend-composer" data-challenge-composer hidden aria-label="Your invitation"><div class="game-friend-composer-head"><strong>Your invitation</strong><button type="button" data-challenge-close aria-label="Close invitation">×</button></div><label>Your message<textarea rows="5" maxlength="3000"></textarea></label><div class="game-friend-send"><button type="button" data-challenge-copy>Copy invitation</button><button type="button" data-challenge-native hidden>Share…</button><a data-challenge-whatsapp target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></div><p role="status" aria-live="polite" data-challenge-status></p></section>';
   v.slot.querySelector('textarea').value=M.invitation(offered.own,offered.target).text;
   v.slot.querySelector('textarea').addEventListener('input',()=>controls(v));
   v.slot.querySelector('[data-challenge-close]').onclick=()=>{v.slot.querySelector('[data-challenge-composer]').hidden=true;root.querySelector('[data-post-action="challenge"],.post-share')?.focus();};
   v.slot.querySelector('[data-challenge-copy]').onclick=()=>send(v,'copy');
   v.slot.querySelector('[data-challenge-native]').onclick=()=>send(v,'native');
   v.slot.querySelector('[data-challenge-whatsapp]').onclick=e=>{controls(v);if(!ready(v)||v.busy||!v.slot.querySelector('textarea').value.trim())e.preventDefault();};
   v.key=key;
  }
  v.slot.querySelector('[data-challenge-native]').hidden=typeof navigator.share!=='function';
  const custom=root.querySelector('[data-gamechallenge-button]');if(custom){custom.textContent=target?'Send a rematch':'Challenge a friend';custom.disabled=!ready(v);}
  controls(v);entry();
 }
 function open(root,options,trigger){
  render(root,options);const v=views.get(root);if(!v||!ready(v))return false;
  v.trigger=trigger;v.slot.querySelector('[data-challenge-composer]').hidden=false;
  v.slot.querySelector('[data-challenge-composer]').scrollIntoView?.({block:'nearest',behavior:'instant'});
  v.slot.querySelector('textarea').focus({preventScroll:true});return true;
 }
 async function send(v,method){
  if(v.busy||!ready(v))return;
  const field=v.slot.querySelector('textarea'),message=field.value.trim();if(!message)return;
  const key=v.key,current=()=>v.key===key&&ready(v);
  v.busy=true;controls(v);status(v,'');
  try{
   if(method==='native')await navigator.share({title:'Your turn! '+M.games[v.options.gameId].name,text:message});
   else{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);}
   if(current())status(v,method==='copy'?'Copied. Paste it into your chat when you’re ready.':'Invitation ready to share.');
  }catch(error){
   if(error?.name!=='AbortError'&&current()){status(v,method==='copy'?'Select and copy your message above.':'Couldn’t open sharing. Try Copy invitation.');if(method==='copy'){field.focus();field.select();}}
  }finally{v.busy=false;controls(v);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',entry);else entry();
 window.addEventListener('hashchange',()=>{
  if(location.hash&&!location.hash.startsWith('#friend='))return;
  target=M.incoming();entry();window.BrainiPostGame?.refresh();for(const v of views.values())if(v.custom)render(v.root,v.options);
 });
 window.addEventListener('brainilab:authchange',()=>{for(const v of views.values())controls(v);});
 function mountCustom(root,options){
  if(!root||!offer(options.gameId,options.result,options))return;
  root.innerHTML='<div class="post-actions"><button class="post-share" type="button" data-gamechallenge-button>Challenge a friend</button></div>';
  render(root,options);views.get(root).custom=true;
  root.querySelector('button').onclick=e=>open(root,options,e.currentTarget);
 }
 return {offer,render,open,entry,mountCustom};
})();
