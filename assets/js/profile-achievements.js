/* Profile cosmetics only. Milestone evidence is read from the existing account summary. */
window.BrainiProfileAchievements=(function(){
  let root,owner=null,draft=[],baseline=[],dirty=false,feedback='',committing=false;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function render(){
    if(!root||!window.BrainiAchievementStore||!window.BrainiAchievementUI)return;
    const state=BrainiAchievementStore.snapshot();
    if(owner!==state.owner){owner=state.owner;draft=[...state.selected];baseline=[...state.selected];dirty=false;feedback='';}
    else if(state.available&&!same(state.selected,baseline)){
      if(dirty&&!committing)feedback='Your featured badges changed elsewhere. Your selection has been refreshed.';
      draft=[...state.selected];baseline=[...state.selected];dirty=false;
    }else if(state.available&&!dirty)draft=[...state.selected];
    if(state.available){
      draft=BrainiAchievementCatalog.clean(draft,state.earned);
      dirty=!same(draft,baseline);
    }
    BrainiAchievementUI.render(root,{state,draft,dirty,feedback});
  }
  function open(){
    if(!root)return;
    BrainiAvatarStudioUI.showPane(root,'badges');
    root.querySelector('[data-avatar-tab="badges"]')?.focus();
  }
  function bind(){
    root=document.querySelector('[data-profile-rewards]');
    if(!root?.querySelector('[data-achievements-panel]')||!window.BrainiAchievementUI)return;
    BrainiAchievementUI.mount(root);
    root.addEventListener('click',async event=>{
      const button=event.target.closest('button');if(!button||button.disabled)return;
      if(button.hasAttribute('data-achievement-choose')){open();return;}
      if(button.hasAttribute('data-achievement-signin')){window.BrainiAuth?.open?.({source:'profile_achievements'});return;}
      const store=BrainiAchievementStore,state=store.snapshot();
      if(button.hasAttribute('data-achievement-retry')){feedback='';await store.load();render();return;}
      if(button.hasAttribute('data-achievement-cancel')){draft=[...state.selected];baseline=[...state.selected];dirty=false;feedback='';render();return;}
      if(button.hasAttribute('data-achievement-id')){
        if(!state.available||state.loading||state.saving||state.error)return;
        const id=button.dataset.achievementId;if(!state.earned.includes(id))return;
        if(draft.includes(id))draft=draft.filter(value=>value!==id);
        else if(draft.length<3)draft=[...draft,id];
        else{feedback='Choose up to three. Remove a badge before adding another.';render();return;}
        dirty=!same(draft,baseline);feedback='';render();return;
      }
      if(button.hasAttribute('data-achievement-save')){
        if(!dirty||state.loading||state.saving||!state.available||state.error)return;
        const requestedOwner=state.owner;
        committing=true;feedback='';
        try{
          const ok=await store.save([...draft]);
          if(ok&&store.snapshot().owner===requestedOwner){draft=[...store.snapshot().selected];baseline=[...draft];dirty=false;}
        }finally{committing=false;render();}
      }
    });
    window.addEventListener('brainilab:achievementchange',render);
    root.addEventListener('brainilab:avatarpanechange',render);
    BrainiAchievementStore.load();render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  return {render,open};
})();
