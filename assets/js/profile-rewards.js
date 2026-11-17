window.BrainiProfileRewards=(function(){
  const C=BrainiRewardCatalog,S=BrainiRewardStore,A=BrainiAvatarDesign,U=BrainiAvatarStudioUI;
  let root,draft=C.clean(),baseline=C.clean(),owner=null,dirty=false,editing=false,lockedPreview=null;
  function frame(el,id){if(el){if(id==='level')delete el.dataset.profileFrame;else el.dataset.profileFrame=id;}}
  function showTitle(el,id){
    if(!el)return;
    const markup=BrainiProgressUI.profileTitleArt?.(id)??(A.profileTitles[id]||'');
    if(el.dataset.paintedTitle!==id){
      el.innerHTML=markup;
      el.dataset.paintedTitle=id;
    }
    el.hidden=!markup;
  }
  function render(){
    root=root||document.querySelector('[data-profile-rewards]');if(!root?.querySelector('[data-style-status]'))return;
    const state=S.snapshot(),player=BrainiData.player(),total=C.xp(player.xp);
    if(owner!==state.owner){owner=state.owner;dirty=false;lockedPreview=null;}
    // Reconnects can refresh fields edited in another tab. Keep only this draft's changes.
    const changes=dirty?Object.fromEntries(Object.keys(C.groups).filter(key=>draft[key]!==baseline[key]).map(key=>[key,draft[key]])):{};
    draft=C.available({...state.style,...changes},total,state.academy,state.discovery,state.activeDays);baseline={...state.style};
    dirty=Object.keys(C.groups).some(key=>draft[key]!==baseline[key]);
    const lockedItem=lockedPreview&&C.item(lockedPreview.kind,lockedPreview.id);
    if(lockedItem&&C.unlocked(lockedItem,total,state.academy,state.discovery,state.activeDays))lockedPreview=null;
    // Try-ons never enter the savable draft. Refresh or sign-in may change eligibility.
    const shown=lockedPreview?{...draft,[lockedPreview.kind]:lockedPreview.id,
      mode:['hat','glasses','prop','hair'].includes(lockedPreview.kind)?'built':draft.mode}:draft;
    const progress=BrainiProgressUI.xpProgress?.(player.level,total);
    const level=progress?.level||player.level||1,tier=BrainiProgressUI.tier?.(level),nextTier=BrainiProgressUI.nextTier?.(level);
    const equipped=state.style;
    // Header uses the confirmed choice. Only the studio artwork previews drafts.
    document.body.dataset.profileScene=equipped.scene;
    root.dataset.profileScene=shown.scene;
    const stageScene=root.querySelector('[data-avatar-stage-scene]');
    const sceneUrl=window.BrainiAvatarStudioArt?.sceneSource?.(shown.scene);
    stageScene.hidden=!sceneUrl;
    if(sceneUrl&&stageScene.getAttribute('src')!==sceneUrl)stageScene.src=sceneUrl;
    if(!sceneUrl)stageScene.removeAttribute('src');
    for(const avatar of [document.querySelector('[data-profile-rank-hero] .rank-avatar'),document.querySelector('.nav-right .avatar'),document.querySelector('[data-profile-account-avatar]')]){
      if(avatar){
        frame(avatar,equipped.frame);
        BrainiProgressUI.setAvatarMarkup(avatar,BrainiProgressUI.avatarImageMarkup(
          {...player,avatarDesign:A.clean(equipped),avatarFrame:equipped.frame},{compact:avatar.matches('.nav-right .avatar')}));
      }
    }
    const hero=document.querySelector('.profile-rank-main');
    if(hero){
      let title=hero.querySelector('[data-equipped-title]');
      if(!title){title=document.createElement('p');title.dataset.equippedTitle='';hero.querySelector('h2')?.after(title);}
      showTitle(title,equipped.title);
    }
    const accountTitle=document.querySelector('[data-profile-account-title]');
    showTitle(accountTitle,equipped.title);
    const preview=root.querySelector('[data-style-preview-avatar]');
    preview.className='rank-avatar avatar-studio-portrait '+BrainiProgressUI.avatarClass(level);frame(preview,shown.frame);
    BrainiProgressUI.setAvatarMarkup(preview,U.portrait(shown,player,total,'stage'));
    const mini=root.querySelector('[data-avatar-mini]');
    mini.className='rank-avatar avatar-mobile-portrait '+BrainiProgressUI.avatarClass(level);frame(mini,shown.frame);
    BrainiProgressUI.setAvatarMarkup(mini,U.portrait(shown,player,total,'mini'));
    const changeCount=Object.keys(C.groups).filter(key=>draft[key]!==baseline[key]).length;
    const confirmed=!dirty&&!lockedPreview&&!state.loading&&!state.saving&&!state.error&&!!state.notice;
    root.querySelector('[data-avatar-mini-label]').textContent=lockedPreview?'Locked item':dirty?`Preview · ${changeCount} ${changeCount===1?'change':'changes'}`:confirmed?'Look saved':'Your saved look';
    root.querySelector('[data-style-preview-label]').textContent=lockedPreview?'Preview only':dirty?'Preview · not saved':'Your avatar';
    root.querySelector('[data-style-preview-name]').textContent=player.displayName;
    showTitle(root.querySelector('[data-style-preview-title]'),shown.title);
    root.querySelector('.avatar-stage-identity').dataset.diplomaTier=tier?.key||'rookie';
    root.querySelector('[data-avatar-diploma-tier]').textContent=tier?.name||'Rookie';
    root.querySelector('[data-avatar-diploma-next]').textContent=nextTier?`Next diploma · Level ${nextTier.min}`:'Top diploma unlocked';
    root.querySelector('[data-avatar-level]').textContent=`Level ${level} · ${total.toLocaleString('en-GB')} XP`;
    U.equippedSlots(root,shown,lockedPreview);
    U.next(root,total,state);U.choices(root,shown,total,state.loading||state.saving||!!state.error,state.academy,state.discovery,equipped,{loading:state.loading,error:state.error,activeDays:state.activeDays,locked:lockedPreview});
    root.querySelector('[data-style-storage]').textContent=state.cloud?'Saved with your account. XP are never spent.':'Saved on this browser. Sign in to sync. XP are never spent.';
    root.querySelector('[data-style-sharing]').textContent=state.cloud?'Your saved look and title appear with friends and groups, and in public rankings when you choose to be visible.':'Try things on here. Guest choices stay on this browser.';
    const saveDisabled=!dirty||!!lockedPreview||state.loading||state.saving||!!state.error;
    const saveLabel=state.saving?'Saving…':confirmed?'Saved':'Save look';
    const saveState=state.saving?'saving':confirmed?'saved':dirty?'preview':'idle';
    for(const save of root.querySelectorAll('[data-style-save]')){
      save.disabled=saveDisabled;
      save.textContent=saveLabel;
      save.dataset.saveState=saveState;
    }
    root.querySelector('[data-avatar-surprise]').disabled=state.loading||state.saving||!!state.error;
    root.querySelector('[data-style-cancel]').disabled=(!dirty&&!lockedPreview)||state.saving;
    root.querySelector('[data-style-retry]').hidden=!state.error;
    root.querySelector('[data-style-status]').textContent=state.loading?'Checking your saved avatar…':state.saving?'Saving your avatar…':
      state.error||(lockedPreview?`${lockedItem.name} unlocks at ${lockedItem.xp.toLocaleString('en-GB')} XP.`:dirty?'Save to use this look.':state.notice||'');
    const recovery=window.BrainiHalloweenLegacy?.snapshot?.();
    let recoveryRow=root.querySelector('[data-halloween-recovery]');
    if(recovery?.error||recovery?.notice){
      if(!recoveryRow){recoveryRow=document.createElement('p');recoveryRow.dataset.halloweenRecovery='';recoveryRow.className='small';recoveryRow.setAttribute('role','status');root.querySelector('[data-style-status]').after(recoveryRow);}
      recoveryRow.replaceChildren(document.createTextNode(recovery.error||recovery.notice));
      if(recovery.error){const retry=document.createElement('button');retry.type='button';retry.className='btn btn-ghost';retry.dataset.halloweenRecover='';retry.disabled=recovery.loading;retry.textContent=recovery.loading?'Saving…':'Save Halloween extras';recoveryRow.append(' ',retry);}
    }else recoveryRow?.remove();
  }
  function bind(){
    root=document.querySelector('[data-profile-rewards]');if(!root)return;U.mount(root);
    root.addEventListener('click',async event=>{
      if(event.target.closest('[data-halloween-recover]')){await window.BrainiHalloweenEntitlements?.load?.();render();return;}
      if(event.target.closest('[data-avatar-mini]')){
        root.querySelector('.avatar-studio-stage').scrollIntoView({block:'start',behavior:'instant'});
        root.querySelector('[data-avatar-preview-heading]').focus({preventScroll:true});
        return;
      }
      const motion=event.target.closest('[data-avatar-motion]');
      if(motion){
        const paused=root.toggleAttribute('data-avatar-motion-paused');
        motion.setAttribute('aria-pressed',String(paused));
        return;
      }
      const goal=event.target.closest('[data-collection-goal]');
      if(goal){event.preventDefault();U.openGoal(root,goal);return;}
      const surprise=event.target.closest('[data-avatar-surprise]');
      if(surprise&&!surprise.disabled){
        lockedPreview=null;
        draft=C.surprise(draft,BrainiData.player().xp,Math.random,S.snapshot().academy,S.snapshot().discovery,S.snapshot().activeDays);
        dirty=Object.keys(C.groups).some(key=>draft[key]!==S.snapshot().style[key]);render();
        return;
      }
      const button=event.target.closest('[data-reward-kind]');
      if(button&&!button.disabled){
        const {rewardKind:kind,rewardId:id}=button.dataset,state=S.snapshot(),item=C.item(kind,id);
        if(!item||state.loading||state.saving||state.error)return;
        if(!C.unlocked(item,BrainiData.player().xp,state.academy,state.discovery,state.activeDays)){
          if(button.dataset.studioLocked==='true'&&!item.event)lockedPreview=lockedPreview?.kind===kind&&lockedPreview.id===id?null:{kind,id};
          render();
          return;
        }
        lockedPreview=null;
        draft[kind]=id;
        if(!['mode','frame','title','scene'].includes(kind))draft.mode='built';
        dirty=Object.keys(C.groups).some(key=>draft[key]!==S.snapshot().style[key]);render();
      }
      if(event.target.closest('[data-style-cancel]')){dirty=false;lockedPreview=null;render();}
      if(event.target.closest('[data-style-retry]'))await S.load();
      const save=event.target.closest('[data-style-save]');
      if(save&&!save.disabled&&!lockedPreview){editing=true;const ok=await S.save(draft);editing=false;if(ok)dirty=false;render();}
    });
    window.addEventListener('brainilab:stylechange',render);
    window.addEventListener('brainilab:halloween-recovery',render);
    window.addEventListener('brainilab:datachange',()=>{if(!editing)render();});
    S.load();render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  return {render};
})();
