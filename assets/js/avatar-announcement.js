/* A dismissible invitation on browsing pages. No tracking or gameplay writes. */
window.BrainiAvatarAnnouncement=(()=>{
  const key='brainilab_avatar_announcement_seen_v1',cooldown=30*86400000;
  const browsing=new Set(['/','/index.html','/games/','/games/index.html','/daily-quiz/','/daily-quiz/index.html']);
  let card=null,timer=null,finished=false;
  const signedIn=()=>window.BrainiData?.authState?.()?.status==='authenticated';
  const visible=el=>!!el?.getClientRects().length;
  function blocked(){
    return document.hidden||signedIn()||[...document.querySelectorAll('.marketing-consent,.auth-modal.show,.modal.show,.quiz-modal.show,.account-popover,dialog[open],[role="dialog"][aria-modal="true"]')].some(visible);
  }
  function seen(){
    try{const at=Number(localStorage.getItem(key));return Number.isFinite(at)&&at>0&&Date.now()-at<cooldown;}catch{return true;}
  }
  function dismiss(){
    clearTimeout(timer);timer=null;
    const focused=!!card?.contains(document.activeElement);
    card?.remove();card=null;
    if(focused)document.querySelector('.nav-right .avatar')?.focus({preventScroll:true});
  }
  async function join(){
    const button=card?.querySelector('[data-avatar-join]'),error=card?.querySelector('[data-avatar-invite-error]');
    if(!button||button.disabled)return;
    button.disabled=true;error.hidden=true;
    try{
      if(!window.BrainiAuth?.open)await window.BrainiPerf?.ensureCloud?.();
      if(signedIn()){dismiss();return;}
      if(!window.BrainiAuth?.open)throw Error('Sign-in unavailable');
      if(!card?.isConnected)return;
      dismiss();window.BrainiAuth.open({source:'avatar_announcement',mode:'signup'});
    }catch{
      if(error.isConnected){error.hidden=false;error.textContent='Sign-in could not open. Please try again.';}
    }finally{if(button.isConnected)button.disabled=false;}
  }
  function show(){
    timer=null;
    if(finished||card||!browsing.has(location.pathname)||blocked()||seen())return;
    // Remember the invitation before showing it, including across tabs/navigation.
    try{const at=String(Date.now());localStorage.setItem(key,at);if(localStorage.getItem(key)!==at)return;}catch{return;}
    finished=true;card=document.createElement('aside');card.className='avatar-announcement';card.setAttribute('aria-labelledby','avatar-announcement-title');
    card.innerHTML=`<button class="avatar-announcement-close" type="button" aria-label="Dismiss avatar invitation">×</button><div class="avatar-announcement-heading"><span class="avatar-announcement-art" aria-hidden="true">${BrainiAvatarDesign.markup({mode:'built',skin:'honey',hair:'curls',shirt:'green',background:'sunshine',hat:'corn',glasses:'round',prop:'icepop'},2200)}</span><div><span class="avatar-announcement-kicker">A little more you</span><h2 id="avatar-announcement-title">Meet your avatar.</h2></div></div><p>Create a free account to save your look across devices. Play to unlock fun extras with XP.</p><button class="btn" type="button" data-avatar-join>Create my avatar <span aria-hidden="true">→</span></button><p class="avatar-announcement-error" role="status" data-avatar-invite-error hidden></p>`;
    card.querySelector('.avatar-announcement-close').onclick=dismiss;
    card.querySelector('[data-avatar-join]').onclick=join;
    document.body.append(card);
  }
  function schedule(){if(!finished&&!timer&&browsing.has(location.pathname)&&!signedIn()&&!seen())timer=setTimeout(show,15000);}
  function boot(){
    schedule();
    window.addEventListener('brainilab:authchange',()=>{if(signedIn())dismiss();});
    window.addEventListener('brainilab:statistics-consent',schedule);
    window.addEventListener('storage',event=>{if(event.key===key&&card)dismiss();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)dismiss();else schedule();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&card)dismiss();});
    document.addEventListener('click',()=>{if(card)queueMicrotask(()=>{if(card&&blocked())dismiss();});});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  return {dismiss};
})();
