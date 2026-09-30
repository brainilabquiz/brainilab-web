/* A single, server-backed view of Daily continuity and earned rewards. */
window.BrainiContinuity=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count=value=>Math.max(0,Math.floor(Number(value)||0));
  const milestones=[3,7,14,30,60,100,180,365];
  function displaySummary(now=new Date()){
    const state=window.BrainiData?.getState?.(),owner=state?.auth?.user?.id||state?.auth?.guestUserId;
    const current=window.BrainiProgression?.getCached?.();
    const saved=state?.cloudProgression?.streakSnapshot;
    const known=[current,saved].find(s=>s?.progression?.user_id===owner&&owner);
    const today=now.toISOString().slice(0,10);
    if(known?.continuity?.today===today)return known;
    const p=window.BrainiData?.player?.()||{};
    const yesterday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-1)).toISOString().slice(0,10);
    const active=p.lastStreakDate>=yesterday&&p.lastStreakDate<=today?count(p.currentStreak):0;
    const days=Array.from({length:7},(_,i)=>{
      const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-6+i)).toISOString().slice(0,10);
      return {date,completed:!!known?.continuity?.days?.find(d=>d.date===date)?.completed};
    });
    return {progression:{current_streak:active,best_streak:p.bestStreak||0,xp:p.xp||0},continuity:{today,reset_at:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)).toISOString(),completed_today:p.lastStreakDate===today&&active>0,days}};
  }
  function markup({summary=displaySummary(),now=new Date(),compact=false}={}){
    const continuity=summary?.continuity,p=summary?.progression;
    // Do not present stale cached dates or browser-only scores as a secured day.
    if(!continuity||!p||continuity.today!==now.toISOString().slice(0,10))return '';
    const streak=count(p.current_streak),best=count(p.best_streak),secured=!!continuity.completed_today;
    const next=milestones.find(n=>n>streak)||Math.ceil((streak+1)/100)*100;
    const remaining=Math.max(0,new Date(continuity.reset_at)-now),hours=Math.floor(remaining/3600000),minutes=Math.floor(remaining%3600000/60000);
    const heading=secured?'Streak secured for today':streak?'Keep your streak going':'Start a new streak';
    const detail=secured?`${streak} ${streak===1?'day':'days'} and counting. Next milestone: ${next} days.`:streak?`The main Daily keeps it going. Today ends in ${hours}h ${minutes}m.`:'Complete the main Daily to start your streak.';
    const days=(continuity.days||[]).map(d=>{const date=new Date(d.date+'T12:00:00Z'),today=d.date===continuity.today;return `<li class="${d.completed?'complete':''} ${today?'today':''}" aria-label="${esc(date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}))}: ${d.completed?'completed':today?'not completed yet':'no Daily game'}"><span>${esc(date.toLocaleDateString('en-GB',{weekday:'narrow',timeZone:'UTC'}))}</span><b aria-hidden="true">${d.completed?'✓':today?'•':'–'}</b></li>`;}).join('');
    return `<section class="continuity-card ${secured?'is-secured':''} ${compact?'is-compact':''}" aria-label="Your Daily streak"><div class="continuity-main"><span class="continuity-count" aria-label="${streak} day streak">${BrainiIcons.product('streak','continuity-flame')}<b>${streak}</b></span><div><h2>${heading}</h2>${compact?'':`<p>${detail}</p>`}${best||compact?`<small>Personal best: ${best} ${best===1?'day':'days'}</small>`:''}</div></div><ol class="continuity-week" aria-label="Last seven UTC days">${days}</ol>${secured?'<a class="continuity-action" href="/profile/?section=progress">See your progress →</a>':'<a class="continuity-action" href="/daily-quiz/">Play today’s Daily →</a>'}<span class="continuity-timezone">Daily reset: 00:00 UTC</span></section>`;
  }
  const changes=new Map(),animated=new Set();let previous=null;
  function observeRewards(){
    const summary=window.BrainiProgression?.getCached?.();if(!summary?.progression)return;
    const owner=summary.progression.user_id;
    if(previous&&previous.progression.user_id!==owner){changes.clear();animated.clear();}
    if(previous&&owner&&previous.progression.user_id===owner){
      const known=new Set((previous.recent_rewards||[]).filter(r=>r.verified).map(r=>r.client_result_id));
      const fresh=(summary.recent_rewards||[]).filter(r=>r.verified&&!known.has(r.client_result_id));
      if(fresh.length===1&&Number(summary.progression.xp)>Number(previous.progression.xp))changes.set(fresh[0].client_result_id,{before:Number(previous.progression.xp),after:Number(summary.progression.xp)});
    }
    previous=summary;
  }
  function rewardMarkup(result){
    if(result?.practice||result?.tryFirst)return '<p class="post-reward-note">Practice round · no XP or streak changes</p>';
    if(!result?.clientResultId)return '';
    const auth=window.BrainiData?.getState?.()?.auth||window.BrainiData?.authState?.()||{},owner=auth.user?.id||auth.guestUserId;
    const summary=window.BrainiProgression?.getCached?.();
    const validOwner=!summary?.progression?.user_id||owner===summary.progression.user_id;
    const reward=validOwner&&summary?.recent_rewards?.find(r=>r.client_result_id===result.clientResultId);
    if(!reward?.verified)return auth.status==='authenticated'?'<p class="post-reward-note" role="status">Checking your XP. Your result is saved on this device.</p>':'<p class="post-reward-note">Playing as a guest. <a data-post-action="progress" href="/profile/?section=progress">Sign in to keep your progress across devices</a>.</p>';
    const p=summary.progression,progress=BrainiProgressUI.xpProgress(p.level,p.xp),change=changes.get(result.clientResultId),before=change&&BrainiProgressUI.xpProgress(1,change.before),up=before&&progress.level>before.level;
    const player=window.BrainiData?.player?.()||{};let photo='';try{const u=new URL(player.avatarUrl);if(u.protocol==='https:')photo=esc(u.href);}catch{}
    const avatar=`<span class="rank-avatar ${BrainiProgressUI.avatarClass(progress.level)}">${photo?`<img src="${photo}" alt="">`:BrainiProgressUI.defaultAvatarMarkup()}</span>`;
    const today=new Date().toISOString().slice(0,10),model=window.BrainiDailyRules?.model(today);
    const main=Number(result.dailyNumber)>0&&window.BrainiData?.dateForDailyNumber?.(Number(result.dailyNumber))===today&&model?.primary===result.gameId;
    const secured=main&&summary.continuity?.today===today&&summary.continuity.completed_today;
    return `<a class="post-reward ${up?'is-level-up':''}" href="/profile/?section=progress" data-reward-id="${esc(result.clientResultId)}"><span class="post-reward-identity">${avatar}<span><span class="post-reward-label">${up?'New level!':'Your progress'}</span><strong>Level ${progress.level}</strong><small>${esc(BrainiProgressUI.tier(progress.level).name)}</small></span><b class="post-earned">${reward.daily_limit_reached?'XP complete':'+'+count(reward.xp)+' XP'}</b></span><span class="post-xp-label"><b>${Number(p.xp).toLocaleString()} XP</b><span>${esc(progress.label)}</span></span><i class="post-xp-track" role="progressbar" aria-label="Progress to level ${progress.nextLevel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.percent)}"><i style="width:${progress.percent}%;--xp-from:${before&&before.level===progress.level?before.percent:progress.percent}%"></i></i>${secured?`<span class="post-streak-earned">${BrainiIcons.product('streak','post-streak-flame')}<strong>${count(p.current_streak)} ${count(p.current_streak)===1?'day':'days'}</strong><span>Daily complete</span></span>`:''}${reward.daily_limit_reached?'<small>You can still improve your score. Try another game for more XP.</small>':''}</a>`;
  }
  function animateReward(root){
    const card=root?.querySelector('[data-reward-id]');if(!card)return;
    const id=card.dataset.rewardId;if(animated.has(id)||!changes.has(id))return;
    animated.add(id);card.classList.add('is-fresh');
  }
  function render(){
    observeRewards();
    window.BrainiUI?.hydrate?.();
    document.querySelectorAll('[data-braini-continuity]').forEach(el=>{el.innerHTML=markup({compact:el.dataset.brainiContinuity==='compact'});el.hidden=!el.innerHTML;});
    document.querySelectorAll('[data-result-reward]').forEach(el=>{if(el.dataset.resultReward){const html=rewardMarkup({clientResultId:el.dataset.resultReward,gameId:el.dataset.resultGame,dailyNumber:Number(el.dataset.resultDaily)});if(el.dataset.rewardHtml!==html){el.innerHTML=html;el.dataset.rewardHtml=html;animateReward(el);}}});
  }
  render(); // Deferred shell runs after HTML parsing, before cloud requests complete.
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('brainilab:authchange',render);
  window.addEventListener('brainilab:progressionchange',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();const cached=window.BrainiProgression?.getCached?.();if(cached?.continuity?.today!==new Date().toISOString().slice(0,10))window.BrainiProgression?.sync?.();}});
  function scheduleReset(){
    const now=new Date(),next=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
    setTimeout(()=>{render();window.dispatchEvent(new CustomEvent('brainilab:daychange'));window.BrainiProgression?.sync?.();scheduleReset();},next-now+1000);
  }
  scheduleReset();
  return {markup,rewardMarkup,render,displaySummary,animateReward};
})();
