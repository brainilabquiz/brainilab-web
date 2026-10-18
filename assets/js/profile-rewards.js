window.BrainiProfileRewards=(function(){
  const C=BrainiRewardCatalog,S=BrainiRewardStore,A=BrainiAvatarDesign,U=BrainiAvatarStudioUI;
  let root,draft=C.clean(),baseline=C.clean(),owner=null,dirty=false,editing=false;
  function frame(el,id){if(el){if(id==='level')delete el.dataset.profileFrame;else el.dataset.profileFrame=id;}}
  function render(){
    root=root||document.querySelector('[data-profile-rewards]');if(!root?.querySelector('[data-style-status]'))return;
    const state=S.snapshot(),player=BrainiData.player(),total=C.xp(player.xp);
    if(owner!==state.owner){owner=state.owner;dirty=false;}
    // Reconnects can refresh fields edited in another tab. Keep only this draft's changes.
    const changes=dirty?Object.fromEntries(Object.keys(C.groups).filter(key=>draft[key]!==baseline[key]).map(key=>[key,draft[key]])):{};
    draft=C.available({...state.style,...changes},total,state.academy,state.discovery,state.activeDays);baseline={...state.style};
    dirty=Object.keys(C.groups).some(key=>draft[key]!==baseline[key]);
    const progress=BrainiProgressUI.xpProgress?.(player.level,total);
    const level=progress?.level||player.level||1,tier=BrainiProgressUI.tier?.(level),nextTier=BrainiProgressUI.nextTier?.(level);
    const equipped=state.style;
    // Header uses the confirmed choice. Only the studio artwork previews drafts.
    document.body.dataset.profileScene=equipped.scene;
    root.dataset.profileScene=draft.scene;
    for(const avatar of [document.querySelector('[data-profile-rank-hero] .rank-avatar'),document.querySelector('.nav-right .avatar'),document.querySelector('[data-profile-account-avatar]')]){
      if(avatar){frame(avatar,equipped.frame);BrainiProgressUI.setAvatarMarkup(avatar,BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:A.clean(equipped)}));}
    }
    const hero=document.querySelector('.profile-rank-main');
    if(hero){
      let title=hero.querySelector('[data-equipped-title]');
      if(!title){title=document.createElement('p');title.dataset.equippedTitle='';hero.querySelector('h2')?.after(title);}
      title.hidden=equipped.title==='none';title.textContent=C.titles.find(t=>t.id===equipped.title).name;
    }
    const accountTitle=document.querySelector('[data-profile-account-title]');
    if(accountTitle){accountTitle.hidden=equipped.title==='none';accountTitle.textContent=C.titles.find(t=>t.id===equipped.title).name;}
    const preview=root.querySelector('[data-style-preview-avatar]');
    preview.className='rank-avatar avatar-studio-portrait '+BrainiProgressUI.avatarClass(level);frame(preview,draft.frame);
    BrainiProgressUI.setAvatarMarkup(preview,draft.mode==='built'?A.markup(draft,total):BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null}));
    const mini=root.querySelector('[data-avatar-mini]');
    mini.className='rank-avatar avatar-mobile-portrait '+BrainiProgressUI.avatarClass(level);frame(mini,draft.frame);
    BrainiProgressUI.setAvatarMarkup(mini,preview.innerHTML);
    const changeCount=Object.keys(C.groups).filter(key=>draft[key]!==baseline[key]).length;
    root.querySelector('[data-avatar-mini-label]').textContent=dirty?`Preview · ${changeCount} ${changeCount===1?'change':'changes'}`:'Your saved look';
    root.querySelector('[data-style-preview-label]').textContent=dirty?'Preview · not saved':'Your avatar';
    root.querySelector('[data-style-preview-name]').textContent=player.displayName;
    const title=C.titles.find(t=>t.id===draft.title),titleRoot=root.querySelector('[data-style-preview-title]');
    titleRoot.textContent=title.id==='none'?'':title.name;titleRoot.hidden=title.id==='none';
    root.querySelector('.avatar-stage-identity').dataset.diplomaTier=tier?.key||'rookie';
    root.querySelector('[data-avatar-diploma-next]').textContent=nextTier?`Next diploma · Level ${nextTier.min}`:'Top diploma unlocked';
    root.querySelector('[data-avatar-level]').textContent=`Level ${level} · ${total.toLocaleString('en-GB')} XP`;
    U.next(root,total,state);U.choices(root,draft,total,state.loading||state.saving||!!state.error,state.academy,state.discovery,equipped,{loading:state.loading,error:state.error,activeDays:state.activeDays});
    root.querySelector('[data-style-storage]').textContent=state.cloud?'Saved with your account. XP are never spent.':'Saved on this browser. Sign in to sync. XP are never spent.';
    root.querySelector('[data-style-sharing]').textContent=state.cloud?'Your saved look and title appear with friends and groups, and in public rankings when you choose to be visible.':'Try things on here. Guest choices stay on this browser.';
    root.querySelectorAll('[data-style-save]').forEach(button=>{button.disabled=!dirty||state.loading||state.saving||!!state.error;button.textContent=state.saving?'Saving…':'Save look';});
    root.querySelector('[data-avatar-surprise]').disabled=state.loading||state.saving||!!state.error;
    root.querySelector('[data-style-cancel]').disabled=!dirty||state.saving;
    root.querySelector('[data-style-retry]').hidden=!state.error;
    root.querySelector('[data-style-status]').textContent=state.loading?'Checking your saved avatar…':state.saving?'Saving your avatar…':state.error||state.notice||(dirty?'Preview only. Save when you’re happy with it.':'');
  }
  function bind(){
    root=document.querySelector('[data-profile-rewards]');if(!root)return;U.mount(root);
    root.addEventListener('click',async event=>{
      const goal=event.target.closest('[data-collection-goal]');
      if(goal){event.preventDefault();U.openGoal(root,goal);return;}
      const surprise=event.target.closest('[data-avatar-surprise]');
      if(surprise&&!surprise.disabled){
        draft=C.surprise(draft,BrainiData.player().xp,Math.random,S.snapshot().academy,S.snapshot().discovery,S.snapshot().activeDays);
        dirty=Object.keys(C.groups).some(key=>draft[key]!==S.snapshot().style[key]);render();
        return;
      }
      const button=event.target.closest('[data-reward-kind]');
      if(button&&!button.disabled){
        const {rewardKind:kind,rewardId:id}=button.dataset;draft[kind]=id;
        if(!['mode','frame','title','scene'].includes(kind))draft.mode='built';
        dirty=Object.keys(C.groups).some(key=>draft[key]!==S.snapshot().style[key]);render();
      }
      if(event.target.closest('[data-style-cancel]')){dirty=false;render();}
      if(event.target.closest('[data-style-retry]'))await S.load();
      if(event.target.closest('[data-style-save]')){editing=true;const ok=await S.save(draft);editing=false;if(ok)dirty=false;render();}
    });
    window.addEventListener('brainilab:stylechange',render);
    window.addEventListener('brainilab:datachange',()=>{if(!editing)render();});
    S.load();render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  return {render};
})();
