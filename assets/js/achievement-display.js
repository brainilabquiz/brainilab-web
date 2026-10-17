/* Shared cosmetic rendering. Public choices are server-derived, never owner-cache fallbacks. */
window.BrainiAchievementDisplay=(function(){
  const icons=Object.freeze({first_game:'play-now',ten_games:'medal-achievement',fifty_games:'ranking-trophy',
    personal_bests_three:'games',daily_first:'calendar-daily',daily_seven:'check-completed',streak_three:'streak',streak_seven:'streak'});
  const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const catalog=()=>window.BrainiAchievementCatalog;
  const publicChoices=value=>catalog()?.normalizePublic(value)||[];
  function describe(id,tier){
    const badge=catalog()?.badges.find(b=>b.id===id);
    const material=Number.isInteger(tier)&&tier>=1&&tier<=10?badge?.tiers[tier-1]:null;
    return badge&&material?{id,name:badge.name,...material}:null;
  }
  function requirementsText(requirements={}){
    const count=n=>n.toLocaleString('en-GB');
    return Object.entries(requirements).filter(([,n])=>n>0).map(([metric,n])=>{
      if(metric==='totalGames')return `${count(n)} saved game${n===1?'':'s'}`;
      if(metric==='fullDailyCount')return `${count(n)} completed Dail${n===1?'y':'ies'}`;
      if(metric==='bestStreak')return `a best Daily streak of ${count(n)} day${n===1?'':'s'}`;
      if(metric==='personalBestGames')return `personal-best records in ${count(n)} different games`;
      return '';
    }).filter(Boolean).join(' and ');
  }
  function emblemMarkup(id,tier){
    const badge=describe(id,tier);if(!badge)return '';
    return `<span class="achievement-emblem" data-material="${badge.key}" data-tier="${tier}" aria-hidden="true"><img src="/assets/icons/product/${icons[id]}.svg" alt="" width="24" height="24"><span class="achievement-emblem-level">${tier}</span></span>`;
  }
  function markup(value,{interactive=true}={}){
    const choices=publicChoices(value);if(!choices.length)return '';
    const labels=choices.map(({id,tier})=>{const b=describe(id,tier);return `${b.name}: ${b.material}, level ${tier} of 10`;});
    const label=escape('Featured badges. '+labels.join('. '));
    const art=choices.map(({id,tier})=>emblemMarkup(id,tier)).join('');
    if(!interactive)return `<span class="player-achievements is-static" role="img" aria-label="${label}" title="${label}">${art}</span>`;
    const payload=choices.map(({id,tier})=>`${id}:${tier}`).join(',');
    return `<button class="player-achievements" type="button" data-achievement-details="${payload}" aria-haspopup="dialog" aria-label="${label}. Open badge details." title="${label}">${art}</button>`;
  }
  let dialog=null,trigger=null;
  function close(){
    if(!dialog)return;
    if(typeof dialog.close==='function'&&dialog.open)dialog.close();else dialog.removeAttribute('open');
    if(trigger?.isConnected)trigger.focus();trigger=null;
  }
  function show(value,button){
    const choices=publicChoices(value);if(!choices.length)return;
    if(!dialog){
      dialog=document.createElement('dialog');dialog.className='achievement-details-dialog';
      dialog.setAttribute('aria-labelledby','achievement-details-title');
      dialog.innerHTML='<div class="achievement-details-head"><h2 id="achievement-details-title">Featured badges</h2><button type="button" data-close-achievement-details aria-label="Close badge details">×</button></div><p class="achievement-details-note">Badge levels grow as you play. They never add or spend XP or ranking points.</p><ol></ol>';
      document.body.append(dialog);
      dialog.querySelector('[data-close-achievement-details]').addEventListener('click',close);
      dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
      dialog.addEventListener('close',()=>{if(trigger?.isConnected)trigger.focus();trigger=null;});
      dialog.addEventListener('keydown',event=>{
        if(event.key==='Escape'){event.preventDefault();close();}
        if(event.key==='Tab'){event.preventDefault();dialog.querySelector('button').focus();}
      });
    }
    const list=dialog.querySelector('ol');list.replaceChildren();
    for(const {id,tier} of choices){
      const badge=describe(id,tier),item=document.createElement('li'),art=document.createElement('span'),copy=document.createElement('div');
      art.innerHTML=emblemMarkup(id,tier);
      const name=document.createElement('h3'),level=document.createElement('p'),requirement=document.createElement('small');
      name.textContent=badge.name;level.textContent=`${badge.material} · Level ${tier} of 10`;
      requirement.textContent='Reached: '+requirementsText(badge.requirements)+'.';
      copy.append(name,level,requirement);item.append(art,copy);list.append(item);
    }
    trigger=button;
    if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else{dialog.setAttribute('open','');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');}}
    dialog.querySelector('button').focus();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('button[data-achievement-details]');if(!button)return;
    const choices=button.dataset.achievementDetails.split(',').map(part=>{const [id,n]=part.split(':');return {id,tier:Number(n)};});
    if(!publicChoices(choices).length)return;
    event.preventDefault();event.stopPropagation();show(choices,button);
  },true);
  return Object.freeze({icons,publicChoices,describe,requirementsText,emblemMarkup,markup});
})();
