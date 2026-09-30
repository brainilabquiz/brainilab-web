/* Voluntary, spoiler-free invitations to the same UTC Daily. No contacts or player IDs. */
window.BrainiFriendChallenge=(()=>{
 const today=()=>new Date().toISOString().slice(0,10);
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const label=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
 const dateFor=status=>window.BrainiData?.dateForDailyNumber?.(status?.dailyNumber);
 function buildInvite(status,day=today()){
  const date=dateFor(status);
  if(!validDate(date)||date!==day||!Number.isInteger(status?.dailyNumber)||status.dailyNumber<1)return null;
  const model=window.BrainiDailyRules?.model(date);
  if(model?.version==='daily-choice-v1'){
    const primary=status.games?.[model.primary],name=window.BrainiDailyJourney?.META?.[model.primary]?.name||'Daily',score=Math.max(0,Math.min(2500,Number(primary?.points)||0));
    const url='https://brainilabgames.com/daily-quiz/?friend='+date;
    const text=(primary?.completed?`I got ${score.toLocaleString('en-GB')} points in today’s ${name} 😄\nThink you can beat me? Your turn!`:'Fancy a quick challenge? 😄\nTry today’s BrainiLab Daily with me — let’s see who gets the higher score.')+'\n\n'+url;
    return {date,url,text,title:'Your turn! Try today’s Daily'};
  }
  const completed=Math.max(0,Math.min(4,Math.floor(Number(status.completedCount)||0)));
  const score=Math.max(0,Math.min(completed*2500,Math.floor(Number(status.brainScore)||0)));
  const url='https://brainilabgames.com/daily-quiz/?friend='+date;
  const progress=completed===4?`Just finished today’s BrainiLab Daily — ${score.toLocaleString('en-GB')} points 😄\nYour turn! Think you can beat me?`:completed?`I’m trying today’s BrainiLab Daily — ${completed} ${completed===1?'game':'games'} down, ${4-completed} to go 😄\nFancy joining me? Let’s finish all four and compare scores.`:'Fancy a little challenge? 😄\nLet’s try today’s BrainiLab Daily and see who gets the higher score.';
  const text=`${progress}\n\n${url}`;
  return {date,url,text,title:'Try the BrainiLab Daily with me'};
 }
 function invitationState(search=location.search,day=today()){
  const params=new URLSearchParams(search);if(!params.has('friend'))return null;
  const date=params.get('friend');
  if(params.getAll('friend').length!==1||!validDate(date)||date>day)return {kind:'invalid',title:'Let’s play today’s Daily',text:'This invitation is not valid, but today’s challenge is ready below.'};
  if(date<day)return {kind:'expired',title:'A new Daily is ready',text:`That invitation was for ${label(date)}. Today has a different set of games, so compare results from the same day.`};
  return {kind:'current',title:'You’ve been challenged!',text:'Play the same main Daily as your friend, then compare your main-game points. No account needed. Today ends at 00:00 UTC.'};
 }
 function renderInvitation(){
  const root=document.querySelector('[data-friend-invitation]');if(!root)return;
  const state=invitationState();root.hidden=!state;
  if(!state){root.replaceChildren();return;}
  const title=document.createElement('strong'),copy=document.createElement('p');title.textContent=state.title;copy.textContent=state.text;
  root.replaceChildren(title,copy);root.dataset.invitationState=state.kind;
 }
 let modal,opener;
 function ensureModal(){
  if(modal)return modal;
  modal=document.createElement('dialog');modal.className='friend-dialog';modal.setAttribute('aria-labelledby','friend-dialog-title');
  modal.innerHTML='<div class="friend-dialog-head"><h2 id="friend-dialog-title">Challenge a friend</h2><button type="button" data-friend-close aria-label="Close invitation">×</button></div><p>Add their name or a line of your own.</p><label for="friend-invitation-text">Your message</label><textarea id="friend-invitation-text" rows="7" maxlength="3000"></textarea><div class="friend-dialog-actions"><button type="button" data-friend-copy>Copy invitation</button><button type="button" data-friend-share hidden>Share…</button></div><p class="friend-dialog-status" role="status" aria-live="polite"></p><p class="friend-dialog-note">The same Daily is available until 00:00 UTC.</p>';
  document.body.append(modal);
  modal.querySelector('[data-friend-close]').onclick=()=>modal.close();
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
  modal.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
  return modal;
 }
 function open(status,trigger=document.activeElement){
  const invite=buildInvite(status);if(!invite)return false;
  const dialog=ensureModal(),copy=dialog.querySelector('[data-friend-copy]'),share=dialog.querySelector('[data-friend-share]'),feedback=dialog.querySelector('[role="status"]');
  const field=dialog.querySelector('textarea');field.value=invite.text;feedback.textContent='';copy.textContent='Copy invitation';copy.disabled=false;share.disabled=false;share.hidden=typeof navigator.share!=='function';opener=trigger;
  async function send(method){
   if(invite.date!==today()){feedback.textContent='That Daily has ended. Open today’s Daily to send a fresh invitation.';copy.disabled=true;share.disabled=true;return;}
   const message=field.value.trim();if(!message){feedback.textContent='Write your message first.';field.focus();return;}
   copy.disabled=true;share.disabled=true;
   try{
    if(method==='copy'){if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);feedback.textContent='Copied. Paste it into your chat when you’re ready.';copy.textContent='Copied ✓';}
    else{await navigator.share({title:invite.title,text:message});feedback.textContent='Invitation ready to share.';}
    window.dispatchEvent(new CustomEvent('brainilab:friendchallenge',{detail:{method}}));
   }catch(error){
    if(error?.name!=='AbortError'){feedback.textContent='Couldn’t share automatically. Select and copy the invitation above.';field.focus();field.select();}
   }finally{copy.disabled=false;share.disabled=false;}
  }
  copy.onclick=()=>send('copy');share.onclick=()=>send('share');if(!dialog.open)dialog.showModal();copy.focus();return true;
 }
 function mount(container,status){
  if(!container||!buildInvite(status))return;
  container.querySelector('[data-friend-challenge]')?.remove();
  const box=document.createElement('div');box.className='friend-challenge';box.dataset.friendChallenge='';
  const button=document.createElement('button'),note=document.createElement('span');button.type='button';button.textContent='Challenge a friend';note.textContent='Same Daily. No spoilers.';
  button.onclick=()=>{if(!open(status,button)){note.textContent='A new Daily has started.';button.disabled=true;}};
  box.append(button,note);container.append(box);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderInvitation);else renderInvitation();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderInvitation();});
 if(new URLSearchParams(location.search).has('friend'))setInterval(renderInvitation,60000);
 return {buildInvite,invitationState,renderInvitation,open,mount};
})();
