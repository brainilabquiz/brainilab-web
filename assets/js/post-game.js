/* Shared result presentation. Game saves and scoring stay with their existing owners. */
window.BrainiPostGame=(()=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const localHref=(href,fallback='/games/')=>typeof href==='string'&&/^\/(?!\/)/.test(href)&&!/[\\<>]/.test(href)?href:fallback;
 const mounted=new Map();
 const invitations=new Map(),dismissed=new WeakSet();
 function inviteAccount(container,{practice=false,gameId='brainmix'}={}){
  if(!container)return;
  for(const root of invitations.keys())if(!root.isConnected)invitations.delete(root);
  invitations.set(container,{practice,gameId});
  const signedIn=window.BrainiData?.authState?.()?.status==='authenticated';
  if(signedIn||dismissed.has(container)){container.replaceChildren();container.hidden=true;return;}
  if(container.querySelector('[data-join-account]'))return;
  container.hidden=false;
  container.innerHTML=`<aside class="post-account-invite" aria-label="Free BrainiLab account"><div><p class="post-account-kicker">Make it your BrainiLab</p><h3>Your progress, wherever you play.</h3><p>Keep your game progress across devices and come back to your Academy lessons with a free account.</p>${practice?'<small>This practice round stays on this page.</small>':''}</div><div class="post-account-actions"><button type="button" data-join-account>Create free account <span aria-hidden="true">→</span></button><button type="button" data-dismiss-account>Not now</button></div><p role="status" data-account-error hidden></p></aside>`;
  container.querySelector('[data-dismiss-account]').onclick=()=>{dismissed.add(container);container.hidden=true;const fallback=container.closest('.post-game')?.querySelector('.post-primary')||container.parentElement.querySelector('a');fallback?.focus();};
  container.querySelector('[data-join-account]').onclick=async event=>{
   const button=event.currentTarget,error=container.querySelector('[data-account-error]');
   button.disabled=true;error.hidden=true;
   window.BrainiSiteAnalytics?.accountPrompt?.('click',practice?'practice_result':'game_result',gameId);
   try{
    if(!window.BrainiAuth?.open)await window.BrainiPerf?.ensureCloud?.();
    if(!window.BrainiAuth?.open)throw Error('Sign-in unavailable');
    window.BrainiAuth.open({source:practice?'practice_result':'game_result',mode:'signup'});
    window.BrainiSiteAnalytics?.accountPrompt?.('open',practice?'practice_result':'game_result',gameId);
   }catch{error.hidden=false;error.textContent='We couldn’t open sign-in. Please try again. Your result is still here.';}
   finally{button.disabled=false;}
  };
 }
 function refreshInvitations(){for(const [root,options]of invitations){if(!root.isConnected){invitations.delete(root);continue;}inviteAccount(root,options);}}
 window.addEventListener('brainilab:authchange',refreshInvitations);
 const guides={worldflags:{slug:'how-to-learn-world-flags',title:'Spot the clues in a flag'},generalknowledge:{slug:'why-2100-is-not-a-leap-year',title:'The leap-year rule with a twist'},mathrush:{slug:'multiply-by-11-in-your-head',title:'Try a mental-maths shortcut'}};
 function review(answers=[]){
  if(!answers.length)return '';
  const rows=answers.map((a,i)=>({...a,position:a.position||i+1}));
  const missed=rows.filter(a=>!a.isCorrect),correct=rows.filter(a=>a.isCorrect);
  const items=list=>list.map(a=>`<article class="post-answer"><h4>${number(a.position)}. ${esc(a.questionText)}</h4><p class="post-answer-choice">${a.isCorrect?'Correct':a.skipped?'Skipped':'Your answer: '+esc(a.selectedAnswer??'No answer')}</p><p><strong>${esc(a.correctAnswer||'Answer unavailable')}</strong></p>${a.explanation?`<p>${esc(a.explanation)}</p>`:''}</article>`).join('');
  return `<div class="post-review">${missed.length?`<details data-post-missed><summary>Review ${missed.length} ${missed.length===1?'answer':'answers'} to revisit</summary>${items(missed)}</details>`:''}${correct.length?`<details><summary>${missed.length?'Your correct answers':'Review your answers'} · ${correct.length}</summary>${items(correct)}</details>`:''}</div>`;
 }
 function localStatus(result){
  if(!result.dailyNumber||result.practice||result.tryFirst)return null;
  const d=window.BrainiData?.daily?.(),day=window.BrainiData?.dateForDailyNumber?.(result.dailyNumber);
  if(!d||Number(d.number)!==Number(result.dailyNumber)||day!==new Date().toISOString().slice(0,10))return null;
  const model=window.BrainiDailyRules?.model(day),ids=window.BrainiData.dailyGameIdsForNumber?.(d.number)||[];
  return {dailyNumber:d.number,model,bonusChoice:d.bonusChoice,brainScore:d.brainScore,completedCount:d.completedGames?.length||0,dailyIds:ids,games:Object.fromEntries(ids.map(id=>[id,{completed:d.completedGames?.includes(id),points:d.dailyBreakdown?.[id]?.points||0}]))};
 }
 function nextDaily(status){
  if(status?.model?.version==='daily-choice-v1'){
   if(!status.games?.[status.model.primary]?.completed)return {href:'/daily-quiz/',label:'Play the main Daily'};
   if(!status.bonusChoice)return {href:'/daily-quiz/#daily-extras',label:'Choose an optional extra'};
   if(!status.games?.[status.bonusChoice]?.completed)return {href:'/daily-quiz/#daily-extras',label:'Continue your extra'};
   return {href:'/games/',label:'Find another game',complete:true};
  }
  const id=(status?.dailyIds||[]).find(id=>id!=='brainmix'&&!status.games?.[id]?.completed),meta=window.BrainiDailyJourney?.META?.[id];
  if(meta)return {href:'/'+meta.href+(meta.dailyQuery?'?daily='+new Date().toISOString().slice(0,10):''),label:'Play '+meta.name};
  return status?.completedCount>=4?{href:'/games/',label:'Find another game'}:{href:'/daily-quiz/',label:'Continue Daily'};
 }
 function actionMarkup(container,options){
  const {result={},gameId,status:provided,next}=options,practice=result.practice||result.tryFirst;
  const providedDay=provided?.dailyNumber&&window.BrainiData?.dateForDailyNumber?.(provided.dailyNumber);
  const status=practice?null:localStatus(result)||(providedDay&&providedDay!==new Date().toISOString().slice(0,10)?null:provided);
  const invite=!practice&&status&&window.BrainiFriendChallenge?.buildInvite(status);
  const primary=status&&!practice?nextDaily(status):next||{href:'/games/',label:'Find another game'};
  const missed=(result.answerDetails||[]).filter(a=>!a.isCorrect).length;
  const reviewFirst=!status&&missed>=2&&number(result.correct)<number(result.total)*.6;
  const challengeFirst=primary.complete&&invite;
  const label=reviewFirst?'Review your answers':challengeFirst?'Challenge a friend':primary.label;
  const root=container.querySelector('.post-actions');
  const focused=document.activeElement,restoreFocus=root.contains(focused);
  const focusedAction=restoreFocus?focused.dataset.postAction:null;
  root.innerHTML=`${reviewFirst||challengeFirst?`<button type="button" class="post-primary" data-post-action="${reviewFirst?'review':'challenge'}">${label} <span aria-hidden="true">→</span></button>`:`<a class="post-primary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(label)} <span aria-hidden="true">→</span></a>`}${reviewFirst||challengeFirst?`<a class="post-secondary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(primary.label)}</a>`:`<button type="button" class="post-share">${invite?'Challenge a friend':'Share result'}</button>`}`;
  root.querySelector('[data-post-action="review"]')?.addEventListener('click',()=>{const d=container.querySelector('[data-post-missed]');if(d){d.open=true;d.querySelector('summary').focus();d.scrollIntoView?.({block:'nearest',behavior:'instant'});}});
  const share=event=>invite?window.BrainiFriendChallenge.open(status,event.currentTarget):window.BrainiShare?.open(gameId,result);
  root.querySelector('.post-share')?.addEventListener('click',share);root.querySelector('[data-post-action="challenge"]')?.addEventListener('click',share);
  const note=container.querySelector('.post-next-note');
  note.textContent=status?.model?.version==='daily-choice-v1'&&status.games?.[status.model.primary]?.completed&&!primary.complete?'Your Daily is done. The extra is up to you.':'';
  note.hidden=!note.textContent;
  if(restoreFocus){const target=focusedAction?Array.from(root.querySelectorAll('[data-post-action]')).find(el=>el.dataset.postAction===focusedAction):root.querySelector('.post-share');(target||root.querySelector('.post-primary'))?.focus({preventScroll:true});}
 }
 function mount(container,options={}){
  if(!container)return;
  const {result={},gameId='brainmix',name='Brain Mix',difficulty='',ads=false,focus=true,timed=false,metrics=[],headline=null,scoreLabel=null,summary=null}=options;
  const correct=number(result.correct),total=number(result.total),practice=result.practice||result.tryFirst;
  const points=!practice&&result.dailyNumber&&window.BrainiData?.dailyPointsForResult?BrainiData.dailyPointsForResult(gameId,result):number(result.score??result.points);
  const message=summary||(timed?(correct?'Time’s up. Here’s how your run went.':'Time’s up. Ready for another go?'):total&&correct===total?'Every answer right. Nicely done.':correct===0?'A fresh set of things to discover.':correct>=total*.8?'Nicely done. A few new discoveries, too.':'There’s always something new to learn.');
  const art=window.BrainiIcons?.game?.(gameId,'mini','post-game-art')||'';
  const guide=options.guide||guides[gameId]||({numberroute:{href:'/learn/paths/mental-maths-foundations/',title:'Build your mental-maths toolkit',kind:'Academy · Start with the basics'},connections:{href:'/learn/connections-puzzles-find-the-hidden-link/',title:'Find a link that fits every clue'},brainiword:{href:'/learn/repeated-letters-in-five-letter-word-games/',title:'When the same letter appears twice'},sequence:{href:'/learn/paths/patterns-and-reasoning/',title:'Find the pattern, then test it',kind:'Academy · Five short lessons'},oddoneout:{href:'/learn/sorting-with-two-rules/',title:'Try sorting with two rules'},science:{href:'/learn/paths/sun-moon-and-time/',title:'Make sense of the sky',kind:'Academy · Start with the basics'},history:{href:'/learn/paths/calendars-explained/',title:'Calendars have some curious rules',kind:'Academy · Start with the basics'},sports:{href:'/learn/how-to-read-a-tennis-score/',title:'Why does tennis count 15, 30, 40?'},worldcapitals:{href:'/learn/why-canberra-is-australias-capital/',title:'Why Canberra, not Sydney?'},brainmix:{href:'/learn/paths/',title:'Find your next small discovery',kind:'Explore BrainiLab Academy'}})[gameId],feedbackId=/^[a-z]{1,30}$/.test(gameId)?gameId:'';
  const stats=metrics.length?`<dl class="post-metrics">${metrics.slice(0,3).map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join('')}</dl>`:'';
  container.innerHTML=`<section class="post-game ${practice?'is-practice':''}" aria-label="Game result"><header class="post-heading"><span class="post-art" aria-hidden="true">${art}</span><div><p class="post-kicker">${esc(name)}${difficulty?' · '+esc(difficulty):''}</p><span class="post-complete">${practice?'Practice complete':'Round complete'} <span aria-hidden="true">✓</span></span></div></header><div class="post-score-panel"><h2 tabindex="-1" class="post-score ${headline?'is-word-result':''}">${headline?esc(headline):timed?correct:total?`${correct}<span> / ${total}</span>`:'Round complete'}</h2><p class="post-score-label">${esc(scoreLabel||((total||timed)?'correct answers':''))}</p><p class="post-message">${esc(message)}</p><p class="post-points"><strong>${number(points).toLocaleString('en-GB')}</strong> ${!practice&&result.dailyNumber?'Daily points':'Quiz Points'}${Number.isFinite(result.timeSec)?'<span> · '+Math.floor(result.timeSec/60)+':'+String(result.timeSec%60).padStart(2,'0')+'</span>':''}</p></div>${stats}<div role="status" aria-live="polite" data-result-reward="${esc(practice?'':result.clientResultId||'')}" data-result-game="${esc(gameId)}" data-result-daily="${number(result.dailyNumber)}">${window.BrainiContinuity?.rewardMarkup?.({...result,gameId})||''}</div><div class="post-actions"></div><p class="post-next-note" hidden></p>${review(result.answerDetails)}${guide?`<a class="post-guide" data-post-action="guide" href="${esc(localHref(guide.href||'/learn/'+guide.slug+'/'))}"><span>${esc(guide.kind||'A little reading')}</span><strong>${esc(guide.title)} →</strong></a>`:''}<div class="post-footer"><a class="post-browse" data-post-action="browse" href="/games/">All games</a><a data-post-action="progress" href="/profile/?section=progress">My progress</a><a data-post-action="feedback" href="/suggestions/?context=post-game&amp;game=${feedbackId}">Give feedback</a></div>${ads?'<div class="brainilab-ad-slot brainilab-ad-slot-result" data-ad-slot="quiz_result" hidden></div>':''}</section>`;
  const liveOptions={...options,gameId,result};mounted.set(container,liveOptions);actionMarkup(container,liveOptions);
  const invitation=document.createElement('div');invitation.dataset.accountInvite='';container.querySelector('.post-actions').after(invitation);inviteAccount(invitation,{practice:!!practice,gameId});
  const videoSlot=document.createElement('div');videoSlot.hidden=true;videoSlot.dataset.resultVideo='';
  container.querySelector('.post-footer').before(videoSlot);
  window.BrainiRelatedVideo?.mount(videoSlot,{gameId});
  window.BrainiContinuity?.animateReward?.(container.querySelector('[data-result-reward]'));
  if(focus)container.querySelector('.post-score').focus({preventScroll:true});
 }
 function refresh(){for(const [root,options]of mounted){if(!root.isConnected||!root.querySelector('.post-actions')){mounted.delete(root);continue;}actionMarkup(root,options);}}
 window.addEventListener('brainilab:progressionchange',refresh);window.addEventListener('brainilab:daychange',refresh);
 // Render first. Saving and verification must never hold the completed round on screen.
 async function complete(container,options,{save,verify}={}){
  const result=options.result;
  const practice=!!(result.practice||result.tryFirst||new URLSearchParams(location.search).get('try')==='1');
  result.practice=practice;
  mount(container,options);
  container.scrollIntoView?.({block:'start',behavior:'instant'});
  const reward=container.querySelector('[data-result-reward]');
  const current=()=>container.contains(reward);
  const renderReward=()=>{
   if(!current())return;
   reward.dataset.resultReward=practice?'':result.clientResultId||'';
   reward.innerHTML=window.BrainiContinuity?.rewardMarkup?.({...result,gameId:options.gameId,practice})||'';
   window.BrainiContinuity?.animateReward?.(reward);
  };
  if(!practice)reward.textContent='Saving your result…';
  const timer=!practice?setTimeout(()=>{if(current())reward.textContent='Saving is taking longer than usual. Your result is shown above.';},8000):null;
  let confirmed;
  try{
   confirmed=await save();
   if(!confirmed)throw Error('Result unavailable');
  }catch{
   if(current()&&!practice)reward.textContent='Your score is shown above. Progress could not be saved; please check your connection.';
   return null;
  }finally{clearTimeout(timer);}
  Object.assign(result,confirmed,{practice});
  renderReward();
  refresh();
  try{
   const verified=await verify?.(confirmed);
   if(verified){
    Object.assign(result,verified,{practice});
    if(current()){
     const score=container.querySelector('.post-score');
     score.innerHTML=`${number(result.correct)}<span> / ${number(result.total)}</span>`;
     const points=!practice&&result.dailyNumber&&window.BrainiData?.dailyPointsForResult?BrainiData.dailyPointsForResult(options.gameId,result):number(result.score);
     container.querySelector('.post-points strong').textContent=number(points).toLocaleString('en-GB');
     container.querySelectorAll('.post-metrics div').forEach(stat=>{if(stat.querySelector('dt')?.textContent==='Accuracy')stat.querySelector('dd').textContent=number(result.accuracy)+'%';});
    }
   }
  }catch{/* Saved results stay visible when verification is temporarily unavailable. */}
  renderReward();
  refresh();
  return result;
 }
 return {mount,complete,review,nextDaily,localStatus,refresh,inviteAccount};
})();
