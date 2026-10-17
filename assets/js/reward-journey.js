/* Read-only cosmetic previews. All awards still come from canonical XP. */
window.BrainiRewardJourney=(()=>{
  const labels={frame:'Avatar frame',title:'Profile title',glasses:'Glasses',hat:'Hat',prop:'Little extra',scene:'Profile background'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid=xp=>Number.isSafeInteger(xp)&&xp>=0;
  function milestones(){
    const cosmetics=Object.entries(window.BrainiRewardCatalog?.groups||{}).flatMap(([kind,items])=>items
      .filter(item=>!item.course&&valid(item.xp)&&item.xp>0).map(item=>({...item,kind,detail:labels[kind]||'Avatar extra'})));
    const ranks=BrainiProgressUI.TIERS.filter(t=>t.min>1).map(t=>({id:t.key,kind:'rank',name:t.name,level:t.min,xp:BrainiProgressUI.xpForLevel(t.min),detail:`Level ${t.min}`}));
    return [...cosmetics,...ranks].sort((a,b)=>a.xp-b.xp);
  }
  function next(xp){return valid(xp)?milestones().find(item=>item.xp>xp)||null:null;}
  function crossed(before,after){
    if(!valid(before)||!valid(after)||after<=before)return [];
    return milestones().filter(item=>item.xp>before&&item.xp<=after).sort((a,b)=>b.xp-a.xp);
  }
  function art(item,person={}){
    if(item.kind==='scene')return `<img class="profile-scene-sample" data-profile-scene="${item.id}" src="/assets/profile-scenes/${item.id}.svg" width="56" height="48" alt="">`;
    if(item.kind==='frame'||item.kind==='rank'){
      const level=item.level||BrainiProgressUI.xpProgress(1,person.xp).level;
      return `<span class="rank-avatar ${BrainiProgressUI.avatarClass(level)}" ${item.kind==='frame'?`data-profile-frame="${item.id}" data-social-frame="${item.id}"`:''}>${BrainiProgressUI.avatarImageMarkup(person)}</span>`;
    }
    if(['glasses','hat','prop'].includes(item.kind))return BrainiAvatarDesign.markup({...person.avatarDesign,mode:'built',[item.kind]:item.id},Math.max(item.xp,Number(person.xp)||0));
    return '<span class="profile-goal-letter">Aa</span>';
  }
  function nextGoal(person,earned){
    const item=next(earned);return item?{...item,art:art(item,person),remaining:item.xp-earned}:null;
  }
  function href(item){
    return '/profile/?section=progress'+(item?.kind&&item.kind!=='rank'?'&reward='+encodeURIComponent(item.kind+':'+item.id)+'#my-avatar':'');
  }
  function fromLink(value){
    return typeof value==='string'?milestones().find(item=>item.kind!== 'rank'&&value===item.kind+':'+item.id)||null:null;
  }
  function markup(person,xp,change){
    if(!valid(xp))return '';
    const earned=change?.after===xp?crossed(change.before,change.after):[];
    const item=earned.find(goal=>goal.kind!=='rank')||earned[0]||next(xp);
    if(!item)return '';
    const unlocked=earned.length>0,remaining=item.xp-xp;
    const detail=unlocked?`${item.detail}${earned.length>1?' · +'+(earned.length-1)+' more':''}`:`${remaining.toLocaleString('en-GB')} XP to go`;
    return `<span class="post-unlock ${unlocked?'is-unlocked':''}"><span class="post-unlock-art" aria-hidden="true">${art(item,person)}</span><span class="post-unlock-copy"><span>${unlocked?'Unlocked!':'Next unlock'}</span><strong>${esc(item.name)}</strong><small>${esc(detail)}</small></span><span class="post-unlock-arrow" aria-hidden="true">→</span></span>`;
  }
  function resultHref(xp,change){
    const earned=change?.after===xp?crossed(change.before,change.after):[];
    return href(earned.find(goal=>goal.kind!=='rank')||earned[0]||next(xp));
  }
  return Object.freeze({next,crossed,art,nextGoal,href,fromLink,markup,resultHref});
})();
