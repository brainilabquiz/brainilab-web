window.BrainiProfileRewards=(function(){
  const C=BrainiRewardCatalog,S=BrainiRewardStore,A=BrainiAvatarDesign,U=BrainiAvatarStudioUI;
  let root,draft=C.clean(),owner=null,dirty=false,editing=false;
  function frame(el,id){if(el){if(id==='level')delete el.dataset.profileFrame;else el.dataset.profileFrame=id;}}
  function render(){
    root=root||document.querySelector('[data-profile-rewards]');if(!root?.querySelector('[data-style-status]'))return;
    const state=S.snapshot(),player=BrainiData.player(),total=C.xp(player.xp);
    if(owner!==state.owner){owner=state.owner;dirty=false;}
    if(!dirty)draft={...state.style};draft=C.available(draft,total);
    const equipped=state.style;
    for(const avatar of [document.querySelector('[data-profile-rank-hero] .rank-avatar'),document.querySelector('.nav-right .avatar')]){
      if(avatar){frame(avatar,equipped.frame);avatar.innerHTML=BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:A.clean(equipped)});}
    }
    const hero=document.querySelector('.profile-rank-main');
    if(hero){
      let title=hero.querySelector('[data-equipped-title]');
      if(!title){title=document.createElement('p');title.dataset.equippedTitle='';hero.querySelector('h2')?.after(title);}
      title.hidden=equipped.title==='none';title.textContent=C.titles.find(t=>t.id===equipped.title).name;
    }
    const preview=root.querySelector('[data-style-preview-avatar]');
    preview.className='rank-avatar avatar-studio-portrait '+BrainiProgressUI.avatarClass(player.level||1);frame(preview,draft.frame);
    preview.innerHTML=draft.mode==='built'?A.markup(draft,total):BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
    root.querySelector('[data-avatar-mini]').innerHTML=preview.innerHTML;
    root.querySelector('[data-avatar-mini-label]').textContent=dirty?'Your preview':'Your avatar';
    root.querySelector('[data-style-preview-label]').textContent=dirty?'Preview · not saved':'Your avatar';
    root.querySelector('[data-style-preview-name]').textContent=player.displayName;
    const title=C.titles.find(t=>t.id===draft.title),titleRoot=root.querySelector('[data-style-preview-title]');
    titleRoot.textContent=title.id==='none'?'A little more you.':title.name;
    const progress=BrainiProgressUI.xpProgress?.(player.level,total);
    root.querySelector('[data-avatar-level]').textContent=`Level ${progress?.level||player.level||1} · ${total.toLocaleString('en-GB')} XP`;
    U.next(root,total);U.choices(root,draft,total,state.loading||state.saving||!!state.error);
    root.querySelector('[data-style-storage]').textContent=state.cloud?'Saved with your account. XP are never spent.':'Saved on this browser. Sign in to sync. XP are never spent.';
    root.querySelectorAll('[data-style-save]').forEach(button=>{button.disabled=!dirty||state.loading||state.saving||!!state.error;button.textContent=state.saving?'Saving…':'Save my avatar';});
    root.querySelector('[data-style-cancel]').disabled=!dirty||state.saving;
    root.querySelector('[data-style-retry]').hidden=!state.error;
    root.querySelector('[data-style-status]').textContent=state.loading?'Checking your saved avatar…':state.saving?'Saving your avatar…':state.error||state.notice||(dirty?'Preview only. Save when you’re happy with it.':'');
  }
  function bind(){
    root=document.querySelector('[data-profile-rewards]');if(!root)return;U.mount(root);
    root.addEventListener('click',async event=>{
      const button=event.target.closest('[data-reward-kind]');
      if(button&&!button.disabled){
        const {rewardKind:kind,rewardId:id}=button.dataset;draft[kind]=id;
        if(kind!=='mode'&&kind!=='frame'&&kind!=='title')draft.mode='built';
        dirty=Object.keys(C.groups).some(key=>draft[key]!==S.snapshot().style[key]);render();
      }
      if(event.target.closest('[data-style-cancel]')){dirty=false;render();}
      if(event.target.closest('[data-style-retry]')){dirty=false;await S.load();}
      if(event.target.closest('[data-style-save]')){editing=true;const ok=await S.save(draft);editing=false;if(ok)dirty=false;render();}
    });
    window.addEventListener('brainilab:stylechange',render);
    window.addEventListener('brainilab:datachange',()=>{if(!editing)render();});
    S.load();render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  return {render};
})();
