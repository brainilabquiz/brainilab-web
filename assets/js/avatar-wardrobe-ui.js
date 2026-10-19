/* Read-only choice labels. Every cosmetic stays visible in its own tab. */
window.BrainiWardrobeUI=(()=>{
  const C=BrainiRewardCatalog,visualKinds=new Set(['skin','hair','hairColor','shirt','background','glasses','hat','prop']),cosmeticKinds=new Set(['frame','title','scene','glasses','hat','prop']);
  const marks={unlocked:'<path d="m4.5 10 3.5 3.5 7.5-7.5"/>',equipped:'<path d="m4.5 10 3.5 3.5 7.5-7.5"/>',saved:'<path d="m4.5 10 3.5 3.5 7.5-7.5"/>',preview:'<path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2"/>',locked:'<rect x="4.5" y="9" width="11" height="8" rx="2"/><path d="M6.5 9V6a3.5 3.5 0 0 1 7 0v3M10 12v2"/>'};
  function label(button,status,marker){
    const small=button.querySelector('small'),key=status+'|'+marker;
    if(small.dataset.wardrobeLabel===key)return;
    if(marker){small.innerHTML=`<svg class="wardrobe-status-icon" data-availability="${marker}" aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${marks[marker]}</svg><span></span>`;small.querySelector('span').textContent=status;}
    else small.textContent=status;
    small.classList.toggle('wardrobe-choice-status',!!marker);small.dataset.wardrobeLabel=key;
  }
  function render(root,{draft,equipped,total,academy,discovery,activeDays=0,loading,error}){
    const unknown=loading||!!error;
    for(const button of root.querySelectorAll('[data-reward-kind]')){
      const item=C.groups[button.dataset.rewardKind]?.find(item=>item.id===button.dataset.rewardId);if(!item)continue;
      const kind=button.dataset.rewardKind,unlocked=C.unlocked(item,total,academy,discovery,activeDays),picked=draft[kind]===item.id;
      const preview=picked&&(draft[kind]!==equipped[kind]||(visualKinds.has(kind)&&draft.mode!==equipped.mode))&&(!visualKinds.has(kind)||draft.mode==='built');
      const inUse=equipped[kind]===item.id&&(!visualKinds.has(kind)||equipped.mode==='built');
      const saved=equipped[kind]===item.id;
      button.dataset.wardrobeState=unknown?'unknown':preview?'preview':inUse?'equipped':saved?'saved':'available';
      button.dataset.wardrobeUnlocked=unknown?'unknown':String(unlocked);
      const daysLeft=item.days?Math.max(0,item.days-C.dayCount(activeDays)):0;
      const status=loading?'Checking…':error?'Unavailable':!unlocked?item.event?item.requirement:item.course?'Finish course':item.challenge?'Finish challenge':item.days?`${daysLeft.toLocaleString('en-GB')} ${daysLeft===1?'day':'days'} to go`:`${Math.max(0,item.xp-total).toLocaleString('en-GB')} XP to go`:preview?'Preview':inUse?'In use':saved?'Saved choice':kind==='mode'?'Choose':'Try on';
      const marker=cosmeticKinds.has(kind)&&!unknown?!unlocked?'locked':preview?'preview':inUse?'equipped':saved?'saved':'unlocked':'';
      label(button,status,marker);
      const requirement=item.event?item.requirement:item.days?'play on '+item.days+' different days to unlock':item.challenge?'finish '+item.challenge+' to unlock':item.course?'complete '+item.courseTitle+' to unlock':'unlocks at '+item.xp.toLocaleString('en-GB')+' XP';
      button.setAttribute('aria-label',`${item.name}, ${picked?'selected, ':''}${unknown?status:unlocked?(marker==='unlocked'?'unlocked, ':'')+status:'locked, '+requirement}${item.description?'. '+item.description:''}`);
    }
  }
  return Object.freeze({render});
})();
