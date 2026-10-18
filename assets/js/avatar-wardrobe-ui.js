/* Read-only choice labels. Every cosmetic stays visible in its own tab. */
window.BrainiWardrobeUI=(()=>{
  const C=BrainiRewardCatalog,visualKinds=new Set(['skin','hair','hairColor','shirt','background','glasses','hat','prop']);
  function render(root,{draft,equipped,total,academy,discovery,activeDays=0,loading,error}){
    const unknown=loading||!!error;
    for(const button of root.querySelectorAll('[data-reward-kind]')){
      const item=C.groups[button.dataset.rewardKind]?.find(item=>item.id===button.dataset.rewardId);if(!item)continue;
      const kind=button.dataset.rewardKind,unlocked=C.unlocked(item,total,academy,discovery,activeDays),picked=draft[kind]===item.id;
      const preview=picked&&(draft[kind]!==equipped[kind]||(visualKinds.has(kind)&&draft.mode!==equipped.mode))&&(!visualKinds.has(kind)||draft.mode==='built');
      const inUse=equipped[kind]===item.id&&(!visualKinds.has(kind)||equipped.mode==='built');
      const saved=equipped[kind]===item.id;
      button.dataset.wardrobeState=preview?'preview':inUse?'equipped':saved?'saved':'available';
      button.dataset.wardrobeUnlocked=String(unlocked);
      const daysLeft=item.days?Math.max(0,item.days-C.dayCount(activeDays)):0;
      const status=loading?'Checking…':error?'Unavailable':!unlocked?item.course?'Finish course':item.challenge?'Finish challenge':item.days?`${daysLeft.toLocaleString('en-GB')} ${daysLeft===1?'day':'days'} to go`:`${Math.max(0,item.xp-total).toLocaleString('en-GB')} XP to go`:preview?'Preview':inUse?'In use':saved?'Saved choice':kind==='mode'?'Choose':'Try on';
      button.querySelector('small').textContent=status;
      const requirement=item.days?'play on '+item.days+' different days to unlock':item.challenge?'finish '+item.challenge+' to unlock':item.course?'complete '+item.courseTitle+' to unlock':'unlocks at '+item.xp.toLocaleString('en-GB')+' XP';
      button.setAttribute('aria-label',`${item.name}, ${picked?'selected, ':''}${unknown?status:unlocked?status:requirement}${item.description?'. '+item.description:''}`);
    }
  }
  return Object.freeze({render});
})();
