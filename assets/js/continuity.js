/* A single, server-backed view of Daily continuity and earned rewards. */
window.BrainiContinuity=(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count=value=>Math.max(0,Math.floor(Number(value)||0));
  const milestones=[3,7,14,30,60,100,180,365];
  function markup({summary=window.BrainiProgression?.getCached?.(),now=new Date(),compact=false}={}){
    const continuity=summary?.continuity,p=summary?.progression;
    // Do not present stale cached dates or browser-only scores as a secured day.
    if(!continuity||!p||continuity.today!==now.toISOString().slice(0,10))return '';
    const streak=count(p.current_streak),best=count(p.best_streak),secured=!!continuity.completed_today;
    if(compact&&!streak&&!best&&!count(p.xp))return '';
    const next=milestones.find(n=>n>streak)||Math.ceil((streak+1)/100)*100;
    const remaining=Math.max(0,new Date(continuity.reset_at)-now),hours=Math.floor(remaining/3600000),minutes=Math.floor(remaining%3600000/60000);
    const heading=secured?'Streak secured for today':streak?'Keep your streak going':'Start a new streak';
    const detail=secured?`${streak} ${streak===1?'day':'days'} and counting. Next milestone: ${next} days.`:streak?`One Daily game keeps it going. Today ends in ${hours}h ${minutes}m.`:'Complete one Daily game. Your first day starts there.';
    const days=(continuity.days||[]).map(d=>{const date=new Date(d.date+'T12:00:00Z'),today=d.date===continuity.today;return `<li class="${d.completed?'complete':''} ${today?'today':''}" aria-label="${esc(date.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}))}: ${d.completed?'completed':today?'not completed yet':'no Daily game'}"><span>${esc(date.toLocaleDateString('en-GB',{weekday:'narrow',timeZone:'UTC'}))}</span><b aria-hidden="true">${d.completed?'✓':today?'•':'–'}</b></li>`;}).join('');
    return `<section class="continuity-card ${secured?'is-secured':''}" aria-label="Your Daily streak"><div class="continuity-main"><span class="continuity-count" aria-label="${streak} day streak">${BrainiIcons.product('streak','continuity-flame')}<b>${streak}</b></span><div><h2>${heading}</h2><p>${detail}</p>${best?`<small>Personal best: ${best} ${best===1?'day':'days'}</small>`:''}</div></div><ol class="continuity-week" aria-label="Last seven UTC days">${days}</ol>${secured?'<a class="continuity-action" href="/profile/?section=progress">See your progress →</a>':'<a class="continuity-action" href="/daily-quiz/">Play a Daily game →</a>'}<span class="continuity-timezone">Daily reset: 00:00 UTC</span></section>`;
  }
  function rewardMarkup(result){
    if(result?.practice||result?.tryFirst)return '<p class="post-reward-note">Practice round · no XP or streak changes</p>';
    if(!result?.clientResultId)return '';
    const summary=window.BrainiProgression?.getCached?.(),reward=summary?.recent_rewards?.find(r=>r.client_result_id===result.clientResultId);
    if(!reward?.verified)return '<p class="post-reward-note">Your progress will update after this result is verified.</p>';
    const p=summary.progression,progress=BrainiProgressUI.xpProgress(p.level,p.xp);
    return `<a class="post-reward" href="/profile/?section=progress"><strong>${reward.daily_limit_reached?'Today’s XP earned for this game':'+'+count(reward.xp)+' XP'}</strong><span>Level ${count(p.level)||1} · ${esc(progress.label)}</span><i class="post-xp-track"><i style="width:${progress.percent}%"></i></i>${reward.daily_limit_reached?'<small>You can still improve your score. New XP tomorrow, or try another game.</small>':''}</a>`;
  }
  function render(){
    window.BrainiUI?.hydrate?.();
    document.querySelectorAll('[data-braini-continuity]').forEach(el=>{el.innerHTML=markup({compact:el.dataset.brainiContinuity==='compact'});el.hidden=!el.innerHTML;});
    document.querySelectorAll('[data-result-reward]').forEach(el=>{if(el.dataset.resultReward)el.innerHTML=rewardMarkup({clientResultId:el.dataset.resultReward});});
  }
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('brainilab:progressionchange',render);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();const cached=window.BrainiProgression?.getCached?.();if(cached?.continuity?.today!==new Date().toISOString().slice(0,10))window.BrainiProgression?.sync?.();}});
  function scheduleReset(){
    const now=new Date(),next=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
    setTimeout(()=>{render();window.dispatchEvent(new CustomEvent('brainilab:daychange'));window.BrainiProgression?.sync?.();scheduleReset();},next-now+1000);
  }
  scheduleReset();
  return {markup,rewardMarkup,render};
})();
