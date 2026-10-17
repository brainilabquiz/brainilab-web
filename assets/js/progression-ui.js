/*
  BrainiLab Progression UX — V27
  Academic-style ranks derived from the canonical player level.
*/
window.BrainiProgressUI=(function(){
  const TIERS=[
    {min:1, max:4,  key:"rookie",     name:"Rookie",      icon:"●", halo:"starter"},
    {min:5, max:9,  key:"elementary", name:"Elementary",  icon:"✦", halo:"learner"},
    {min:10,max:14, key:"highschool", name:"High School", icon:"◆", halo:"scholar"},
    {min:15,max:19, key:"college",    name:"College",     icon:"⬟", halo:"graduate"},
    {min:20,max:24, key:"graduate",   name:"Graduate",    icon:"✧", halo:"doctorate"},
    {min:25,max:29, key:"phd",        name:"PhD",         icon:"⬢", halo:"doctorate"},
    {min:30,max:39, key:"researcher", name:"Researcher",  icon:"⌁", halo:"professor"},
    {min:40,max:49, key:"professor",  name:"Professor",   icon:"★", halo:"professor"},
    {min:50,max:59, key:"dean",       name:"Dean",        icon:"♛", halo:"dean"},
    {min:60,max:999,key:"nobel",      name:"Nobel Mind",  icon:"🏅", halo:"laureate"}
  ];

  function tier(level){
    const n=Math.max(1,Number(level||1));
    return TIERS.find(t=>n>=t.min && n<=t.max)||(n>999?TIERS.at(-1):TIERS[0]);
  }

  function nextTier(level){
    const current=tier(level);
    const index=TIERS.indexOf(current);
    return TIERS[index+1]||null;
  }

  function xpForLevel(level){
    const n=Math.max(1,Number(level||1));
    return Math.max(0,Math.ceil(20*Math.pow(n-1,2)));
  }

  function xpProgress(level,xp){
    const value=Number.isFinite(Number(xp))?Math.max(0,Math.floor(Number(xp))):0;
    const n=Math.max(1,Math.floor(Math.sqrt(value/20))+1);
    const start=xpForLevel(n),end=xpForLevel(n+1);
    return {percent:Math.max(0,Math.min(100,(value-start)/(end-start)*100)),
      currentXp:value,nextXp:end,level:n,nextLevel:n+1,
      startXp:start,earnedInLevel:value-start,neededInLevel:end-start,remainingXp:end-value,
      label:`${Math.max(0,end-value).toLocaleString()} XP to level ${n+1}`};
  }

  function avatarClass(level){
    const t=tier(level),n=Math.max(t.min,Math.min(t.max,Number(level)||1));
    const step=Math.min(9,Math.floor((n-t.min)/Math.min(10,t.max-t.min+1)*10));
    return `rank-ring rank-${t.key} rank-step-${step}`;
  }

  function avatarMarkup(initial,level,extraClass=""){
    const t=tier(level);
    return `<span class="rank-avatar ${avatarClass(level)} ${extraClass}" title="${t.name} · Level ${Number(level||1)}">
      ${defaultAvatarMarkup(typeof initial==="object"?initial:undefined)}
    </span>`;
  }

  const escapeAvatar=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function defaultAvatarMarkup(person){
    const identity=BrainiPeople.resolve(person||window.BrainiData?.player?.()||{});
    return `<img class="default-player-avatar" src="${identity.avatar}" width="48" height="48" alt="" title="Illustration inspired by ${escapeAvatar(identity.name)}">`;
  }

  function avatarImageMarkup(person){
    person=person||window.BrainiData?.player?.()||{};
    if(person.avatarDesign?.mode==='built'&&window.BrainiAvatarDesign){
      return BrainiAvatarDesign.markup(person.avatarDesign,person.avatarRenderXp??person.xp).replace('Your illustrated BrainiLab avatar','Illustrated BrainiLab avatar');
    }
    const identity=BrainiPeople.resolve(person);
    try{
      if(person.avatarUrl){
        const url=new URL(person.avatarUrl,location.origin);
        if(['https:','http:'].includes(url.protocol)){
          return `<img src="${escapeAvatar(url.href)}" data-fallback-avatar="${identity.id}" width="48" height="48" alt="">`;
        }
      }
    }catch{}
    return defaultAvatarMarkup(person);
  }

  const paintedAvatars=new WeakMap();
  // Startup, cloud sync and cosmetic events can repeat the same portrait. Keep
  // its decoded image/SVG (including a failed photo's fallback) until it changes.
  function setAvatarMarkup(element,markup){
    const previous=paintedAvatars.get(element);
    if(previous?.markup===markup && previous.child===element.firstChild &&
      previous.count===element.childNodes.length)return false;
    element.innerHTML=markup;
    paintedAvatars.set(element,{markup,child:element.firstChild,count:element.childNodes.length});
    return true;
  }

  function avatarFrameAttribute(person){
    const frame=person?.avatarFrame;
    if(['blue','green','copper','gold','orbit'].includes(frame))return `data-social-frame="${frame}"`;
    // Automatic nicknames keep one recognizable palette everywhere. This is
    // default portrait decoration, never an equipped reward or a profile write.
    const raw=String(person?.identityName||person?.name||person?.displayName||'').trim();
    if(person?.avatarUrl||person?.avatarDesign?.mode==='built'||
      ![BrainiPeople.isLegacy(raw),BrainiPeople.isPreset(raw)].some(Boolean))return '';
    let seed=2166136261;
    for(const letter of BrainiPeople.resolve(person).displayName){seed^=letter.charCodeAt(0);seed=Math.imul(seed,16777619);}
    return `data-default-palette="${(seed>>>0)%8}"`;
  }

  function profileTitleMarkup(person){
    const titles=window.BrainiAvatarDesign?.profileTitles,id=person?.profileTitle;
    const label=titles&&typeof id==='string'&&Object.hasOwn(titles,id)?titles[id]:'';
    return label?`<span class="player-profile-title"><span class="profile-title-context">Profile title: </span>${label}</span>`:'';
  }

  function profileAchievementsMarkup(person,options){
    return window.BrainiAchievementDisplay?.markup(person?.profileAchievements,options)||'';
  }

  // Failed custom photos retain the same portrait throughout the interface.
  document.addEventListener('error',event=>{
    const image=event.target;
    if(image?.tagName==='IMG' && image.dataset.fallbackAvatar){
      const person=BrainiPeople.PEOPLE.find(p=>p.id===image.dataset.fallbackAvatar);
      delete image.dataset.fallbackAvatar;
      if(person){image.classList.add('default-player-avatar');image.src=person.avatar;}
    }
  },true);

  function ranksMarkup(person,{open=false}={}){
    const progress=xpProgress(person.level,person.xp),current=tier(progress.level);
    return `<details class="profile-ranks" ${open?'open':''}><summary data-ranks-toggle>Level ranks <span aria-hidden="true">+</span></summary>
      <p>Your level unlocks these ranks. Choose your avatar frame and profile title in My Avatar.</p>
      <ol class="profile-rank-journey">${TIERS.map(t=>{
        const reached=progress.level>=t.min,active=t.key===current.key;
        return `<li class="${active?'is-current':reached?'is-reached':'is-ahead'}" ${active?'aria-current="step"':''}>
          <span class="rank-avatar ${avatarClass(active?progress.level:t.min)}" aria-hidden="true">${avatarImageMarkup(person)}</span>
          <span><strong>${t.name}</strong><small>Level ${t.min}</small></span>
          <b>${active?'Your rank':reached?'Reached':'Ahead'}</b></li>`;
      }).join('')}</ol></details>`;
  }

  function badgeMarkup(level){
    const t=tier(level);
    return `<span class="brain-rank-badge rank-${t.key}">
      <span class="brain-rank-icon">${BrainiIcons.rankHalo(t.halo,"brain-rank-halo")}</span>
      ${t.name}
      <small>Lv ${Number(level||1)}</small>
    </span>`;
  }

  function xpEarned(correct){
    return 50+Math.min(50,Math.max(0,Number(correct||0)))*5;
  }

  // A celebration is feedback for an action on this page, never for loading
  // an old account, claiming guest history or refreshing another device's XP.
  let owner=null,previousXp=null,lessonAward=null,toast=null,toastTimer=null,returnFocus=null;
  const resultChanges=new Map();
  const pendingResults=new Set(),knownRewards=new Set(),knownLessons=new Set(),announced=new Map();
  function currentOwner(){
    const auth=window.BrainiData?.getState?.()?.auth||window.BrainiData?.authState?.();
    return auth?.user?.id||auth?.guestUserId||null;
  }
  function closeCelebration(){
    clearTimeout(toastTimer);toastTimer=null;
    const restore=toast?.contains(document.activeElement);
    toast?.remove();toast=null;
    if(restore&&returnFocus?.isConnected)returnFocus.focus?.({preventScroll:true});
    returnFocus=null;
  }
  function resetCelebration(){
    owner=currentOwner();previousXp=null;resultChanges.clear();pendingResults.clear();knownRewards.clear();knownLessons.clear();lessonAward=null;
    closeCelebration();
  }
  function activeOwner(){
    if(currentOwner()!==owner)resetCelebration();
    return owner;
  }
  function showLevelUp(level){
    if(document.hidden||!document.body)return;
    const key=`brainilab_level_celebration_v1:${owner}`;
    let seen=announced.get(owner)||0;
    try{seen=Math.max(seen,Number(localStorage.getItem(key))||0);}catch{}
    if(level<=seen)return;
    announced.set(owner,level);
    try{localStorage.setItem(key,String(level));}catch{}
    closeCelebration();
    returnFocus=document.activeElement;
    toast=document.createElement('aside');toast.className='level-up-toast';
    toast.setAttribute('aria-label','Level celebration');
    const current=tier(level),person=window.BrainiData?.player?.()||{};
    toast.innerHTML=`<span class="level-up-emblem" aria-hidden="true"><span class="rank-avatar ${avatarClass(level)}">${avatarImageMarkup(person)}</span><b>${level}</b><i></i><i></i><i></i></span><span class="level-up-message" role="status" aria-live="polite" aria-atomic="true"><span>Level up!</span><strong>Level ${level}</strong><small>${current.name}</small></span><button type="button" class="level-up-close" aria-label="Dismiss level celebration">×</button>`;
    const card=toast;
    const pause=()=>{clearTimeout(toastTimer);toastTimer=null;};
    const resume=()=>{if(toast!==card)return;pause();if(!card.contains(document.activeElement)&&!card.matches(':hover'))toastTimer=setTimeout(closeCelebration,5000);};
    card.querySelector('button').addEventListener('click',closeCelebration);
    card.addEventListener('pointerenter',pause);card.addEventListener('pointerleave',resume);
    card.addEventListener('focusin',pause);card.addEventListener('focusout',()=>queueMicrotask(resume));
    document.body.appendChild(card);resume();
  }
  function observeProgression(summary){
    const id=activeOwner(),p=summary?.progression;
    if(!id||p?.user_id!==id||!Number.isSafeInteger(p.xp)||p.xp<0)return;
    const rewards=(Array.isArray(summary.recent_rewards)?summary.recent_rewards:[]).filter(r=>r?.verified===true&&typeof r.client_result_id==='string');
    const verified=rewards.filter(r=>pendingResults.has(r.client_result_id)&&!knownRewards.has(r.client_result_id));
    const lessonReady=lessonAward&&p.xp>=lessonAward.targetXp;
    const before=lessonReady?Math.min(previousXp??p.xp,lessonAward.beforeXp):previousXp;
    const earned=verified.length>0||lessonReady;
    // Tie feedback to one result actively played on this page. Passive cloud
    // history, ambiguous batches and simultaneous lesson awards are not receipts.
    if(before!==null&&verified.length===1&&!lessonReady&&p.xp>before){
      if(resultChanges.size>=20)resultChanges.delete(resultChanges.keys().next().value);
      resultChanges.set(verified[0].client_result_id,Object.freeze({before,after:p.xp}));
    }
    const level=xpProgress(1,p.xp).level;
    if(before!==null&&earned&&p.xp>before&&level>xpProgress(1,before).level)showLevelUp(level);
    rewards.forEach(r=>{pendingResults.delete(r.client_result_id);knownRewards.add(r.client_result_id);});
    if(lessonReady)lessonAward=null;
    previousXp=p.xp;
  }
  window.addEventListener('brainilab:datachange',event=>{
    if(event.detail?.type!=='game_result'||document.hidden||!activeOwner())return;
    const result=event.detail.result;
    if(typeof result?.clientResultId!=='string'||!result.clientResultId||result.practice||result.tryFirst||result.dailyReplayBlocked||result.ownerUserId!==owner||knownRewards.has(result.clientResultId))return;
    // Bound UI-only pending state; this never grants or changes XP.
    if(pendingResults.size>=20)pendingResults.delete(pendingResults.values().next().value);
    pendingResults.add(result.clientResultId);
  });
  window.addEventListener('brainilab:lessonreward',event=>{
    const award=event.detail;
    if(document.hidden||!activeOwner()||award?.userId!==owner||!award.slug||!award.version||!Number.isSafeInteger(award.xpAwarded)||award.xpAwarded<=0)return;
    const key=JSON.stringify([award.slug,award.version]);
    if(previousXp===null||knownLessons.has(key))return;
    knownLessons.add(key);lessonAward={beforeXp:previousXp,targetXp:previousXp+award.xpAwarded};
  });
  window.addEventListener('brainilab:progressionchange',event=>observeProgression(event.detail?.summary||window.BrainiProgression?.getCached?.()));
  window.addEventListener('brainilab:authchange',()=>{activeOwner();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)resetCelebration();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!event.defaultPrevented)closeCelebration();});
  resetCelebration();

  function resultProgress(id){
    return currentOwner()===owner?resultChanges.get(id)||null:null;
  }
  return {
    resultProgress,TIERS,tier,nextTier,xpForLevel,xpProgress,
    avatarClass,avatarMarkup,defaultAvatarMarkup,avatarImageMarkup,setAvatarMarkup,avatarFrameAttribute,profileTitleMarkup,profileAchievementsMarkup,ranksMarkup,badgeMarkup,xpEarned,
  };
})();
