(function(){
 'use strict';
 const games=['trick-or-think','spooky-connections'];
 function hasSavedView(api,game,result,preview){
  if(!result)return false;
  try{
   const model=window.BrainiHalloweenGameModel,owner=api.identityKey(),key='brainilab_halloween_game_v1:'+(preview?'preview:':'live:')+encodeURIComponent(owner)+':'+game;
   const stored=JSON.parse(localStorage.getItem(key)||'null'),session=stored?.session;
   return stored?.saved===true&&stored.preview===preview&&stored.version===model.game(game).version&&session?.ownerKey===owner&&session.preview===preview&&session.game===game&&session.day===result.day&&session.session_id===result.id&&model.acceptsPack(game,session.pack)&&model.summary(game,stored.submission,true).score===result.score;
  }catch{return false;}
 }
 function nextTreat(state){
  const earned=state.entitlements||[],activity=state.activity||{},played=activity.completedGames||[],today=activity.resultsToday||[];
  if(state.loading||state.error||state.cloud&&state.status==='unavailable')return {title:'Your collection',copy:state.error?'Your saved treats could not be checked.':'Checking your saved treats…',label:'Open my avatar',href:'/profile/?section=progress'};
  if(earned.length===3)return {title:'All three, all yours',copy:'Your Halloween treats are yours to keep.',label:'Try them on',href:'/profile/?section=progress'};
  if(!earned.includes('pumpkin-thinker'))return {title:'Next treat · Pumpkin thinker',copy:'Complete a Halloween game to make it yours.',label:'Choose a game',href:'#halloween-play'};
  if(!earned.includes('midnight')){
   const missing=activity.known&&games.find(game=>!played.includes(game));
   return {title:'Next treat · Midnight frame',copy:'Complete the other Halloween game.',label:missing==='spooky-connections'?'Play Spooky Connections':missing==='trick-or-think'?'Play Trick or Think?':'Choose a game',href:missing?'/halloween/'+missing+'/':'#halloween-play'};
  }
  return {title:'Next treat · Little bat',copy:today.length?'Come back on another day to keep collecting.':'Play on three different days to make it yours.',label:today.length?'Read a story':'Choose a game',href:today.length?'#halloween-read':'#halloween-play'};
 }
 function render(){
  const root=document.querySelector('.halloween-page');if(!root)return;
  const api=window.BrainiLabHalloween,state=api?.snapshot?.()||{},progress=state.progress||{},earned=state.entitlements||[],access=api?.availability?.()||{},activity=state.activity||{};
  for(const card of root.querySelectorAll('[data-halloween-game-card]')){
   const action=card.querySelector('[data-halloween-game-action]'),status=card.querySelector('[data-halloween-game-state]');if(!action)continue;
   const result=activity.resultsToday?.find(result=>result.game===card.dataset.halloweenGameCard),saved=hasSavedView(api,card.dataset.halloweenGameCard,result,access.preview===true);
   action.textContent=result?saved?'See result':'Play again':activity.known?'Play today':'Open game';
   status.hidden=!result;status.textContent=result?'Played today · '+result.score+'/100':'';
   card.classList.toggle('is-played',!!result);
  }
  const cue=root.querySelector('[data-halloween-next]');
  if(cue){
   cue.hidden=!access.allowed;
   if(access.allowed){const next=nextTreat(state);cue.querySelector('[data-halloween-next-title]').textContent=next.title;cue.querySelector('[data-halloween-next-copy]').textContent=next.copy;const link=cue.querySelector('[data-halloween-next-action]');link.href=next.href;link.textContent=next.label+' →';}
  }
  for(const node of root.querySelectorAll('[data-halloween-look]')){
   const id=node.dataset.halloweenLook;
   const demo={mode:'built',skin:'sand',hair:'curls',hairColor:'brown',shirt:'green',background:'lilac',hat:id==='pumpkin-thinker'?id:'none',prop:id==='little-bat'?id:'none'};
   if(window.BrainiAvatarDesign)node.innerHTML=BrainiAvatarDesign.markup(demo,0,['pumpkin-thinker','little-bat']);
   node.classList.toggle('halloween-midnight-preview',id==='midnight');
  }
  for(const card of root.querySelectorAll('[data-halloween-reward]')){
   const id=card.dataset.halloweenReward,max=id==='pumpkin-thinker'?1:id==='midnight'?2:3,value=Math.min(max,id==='pumpkin-thinker'?(progress.games_completed||0):id==='midnight'?(progress.distinct_games||0):(progress.days_played||0));
   card.classList.toggle('is-earned',earned.includes(id));card.querySelector('progress').value=earned.includes(id)?max:value;
   card.querySelector('[data-halloween-unlock]').textContent=earned.includes(id)?'✓ In your collection':value+' of '+max;
   let link=card.querySelector('[data-halloween-try]');
   const canTry=earned.includes(id)&&!state.loading&&!state.error;
   if(canTry&&!link){link=document.createElement('a');link.dataset.halloweenTry='';link.className='halloween-reward-action';link.textContent='Try it on →';card.append(link);}
   if(link){
    const kind=id==='midnight'?'frame':id==='pumpkin-thinker'?'hat':'prop';
    link.href='/profile/?section=progress&reward='+encodeURIComponent(kind+':'+id)+'#my-avatar';
    link.setAttribute('aria-label','Try on '+card.querySelector('h3').textContent);link.hidden=!canTry;
   }
  }
  const title=root.querySelector('[data-halloween-collection-title]'),status=root.querySelector('[data-halloween-collection-status]');
  if(title)title.textContent=earned.length?`${earned.length} of 3 treats in your collection.`:'Every treat starts with a little curiosity.';
  if(status)status.textContent=access.preview?'Private preview · progress here stays separate from your live account.':state.error||(state.cloud?'Your earned treats are saved with your account.':'Saved on this browser. Sign in before playing to keep new treats across devices.');
 }
 function bind(){
  const root=document.querySelector('.halloween-page');if(!root)return;
  root.addEventListener('click',event=>{
   const link=event.target.closest('a[href^="#halloween-"]');if(!link||event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
   const hash=link.getAttribute('href'),target=document.querySelector(hash),heading=target?.querySelector('h2');if(!heading)return;
   // Native fragment navigation can reset focus after the click handler. Own
   // this jump so keyboard focus stays on the destination, with normal Back.
   event.preventDefault();if(location.hash!==hash)history.pushState(null,'',hash);
   target.scrollIntoView?.({behavior:'instant',block:'start'});heading.focus({preventScroll:true});
  });
  render();
 }
 window.addEventListener('brainilab:halloween-progress',render);window.addEventListener('brainilab:halloween-entitlements',render);
 window.addEventListener('brainilab:authchange',render);window.addEventListener('pageshow',render);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
