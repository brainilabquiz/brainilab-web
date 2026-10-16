/* ===== profile-rewards-model.js ===== */

/* Cosmetic rewards only. Never used for scores, permissions or XP awards. */
window.BrainiRewardCatalog=(function(){
  const frames=Object.freeze([
    {id:'level',name:'Your level',xp:0},
    {id:'blue',name:'Blue sky',xp:100},
    {id:'green',name:'Fresh green',xp:500},
    {id:'copper',name:'Copper glow',xp:1500},
    {id:'gold',name:'Golden hour',xp:3000},
    {id:'orbit',name:'Orbit',xp:6000}
  ].map(Object.freeze));
  const titles=Object.freeze([
    {id:'none',name:'No title',xp:0},
    {id:'explorer',name:'Explorer',xp:250},
    {id:'curious',name:'Curious Mind',xp:750},
    {id:'detective',name:'Puzzle Detective',xp:2000},
    {id:'thinker',name:'Deep Thinker',xp:4500},
    {id:'sage',name:'BrainiLab Sage',xp:10000}
  ].map(Object.freeze));
  const xp=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
  function clean(value={}){
    return {frame:frames.some(r=>r.id===value?.frame)?value.frame:'level',
      title:titles.some(r=>r.id===value?.title)?value.title:'none'};
  }
  function available(value,earned){
    const result=clean(value),total=xp(earned);
    if(frames.find(r=>r.id===result.frame).xp>total)result.frame='level';
    if(titles.find(r=>r.id===result.title).xp>total)result.title='none';
    return result;
  }
  function next(earned){
    const total=xp(earned);
    return [...frames.map(r=>({...r,kind:'frame'})),...titles.map(r=>({...r,kind:'title'}))]
      .filter(r=>r.xp>total).sort((a,b)=>a.xp-b.xp)[0]||null;
  }
  return Object.freeze({frames,titles,xp,clean,available,next});
})();

/* ===== profile-rewards-store.js ===== */

window.BrainiRewardStore=(function(){
  const catalog=BrainiRewardCatalog;
  const prefix='brainilab-profile-style-v1:';
  // Separate top-level metadata keys avoid overwriting unrelated settings or
  // a frame/title saved independently in a second tab. These are not claims.
  const keys={frame:'brainilab_avatar_frame_v1',title:'brainilab_profile_title_v1'};
  let owner=null,saved=catalog.clean(),loading=false,saving=false,error='',notice='',generation=0;
  function identity(){
    const auth=BrainiData.authState();
    return auth.status==='authenticated'&&auth.user?.id
      ? {id:'account:'+auth.user.id,uid:auth.user.id,cloud:true}
      : {id:'guest:'+(auth.guestUserId||auth.anonymousPlayerId||'browser'),cloud:false};
  }
  const total=()=>catalog.xp(BrainiData.player().xp);
  const emit=()=>window.dispatchEvent(new CustomEvent('brainilab:stylechange'));
  function bounded(request){
    let timer;
    return Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Style request timed out')),12000);})])
      .finally(()=>clearTimeout(timer));
  }
  function cached(id){
    try{return catalog.clean(JSON.parse(localStorage.getItem(prefix+id)||'{}'));}catch{return catalog.clean();}
  }
  function cache(id,value){
    try{localStorage.setItem(prefix+id,JSON.stringify(value));return true;}catch{return false;}
  }
  function snapshot(){return {owner:owner?.id,style:catalog.available(saved,total()),loading,saving,error,notice,cloud:!!owner?.cloud};}
  async function load(){
    const current=identity();
    if(owner?.id===current.id&&(loading||saving))return;
    const run=++generation;owner=current;saved=cached(current.id);error='';notice='';
    loading=current.cloud;emit();
    if(!current.cloud)return;
    try{
      const sb=window.BrainiBackendAuth?.getClient?.();
      if(!sb)throw Error('Profile connection unavailable');
      const {data,error:readError}=await bounded(sb.auth.getUser());
      if(readError)throw readError;
      if(run!==generation||identity().id!==current.id)return;
      if(data?.user?.id!==current.uid)throw Error('Account changed');
      const meta=data.user.user_metadata||{};
      saved=catalog.clean({frame:meta[keys.frame],title:meta[keys.title]});
      cache(current.id,saved);
    }catch{
      if(run===generation)error='Your saved style could not be checked. Try again before changing it.';
    }finally{
      if(run===generation){loading=false;emit();}
    }
  }
  async function save(value){
    if(saving||loading||error)return false;
    const current=identity(),run=generation;
    if(current.id!==owner?.id){await load();return false;}
    const requested=catalog.clean(value),allowed=catalog.available(requested,total());
    if(requested.frame!==allowed.frame||requested.title!==allowed.title){
      error='That reward is still locked. Your XP has not changed.';emit();return false;
    }
    const changed=Object.keys(keys).filter(key=>allowed[key]!==catalog.available(saved,total())[key]);
    if(!changed.length)return true;
    saving=true;notice='';emit();
    try{
      if(current.cloud){
        const sb=window.BrainiBackendAuth?.getClient?.();
        if(!sb)throw Error('Profile connection unavailable');
        const {data:before,error:readError}=await bounded(sb.auth.getUser());
        if(readError)throw readError;
        if(run!==generation||identity().id!==current.id)return false;
        if(before?.user?.id!==current.uid)throw Error('Account changed');
        const currentAllowed=catalog.available(allowed,total());
        if(currentAllowed.frame!==allowed.frame||currentAllowed.title!==allowed.title)throw Error('XP changed');
        const patch=Object.fromEntries(changed.map(key=>[keys[key],allowed[key]]));
        const {data,error:writeError}=await bounded(sb.auth.updateUser({data:patch}));
        if(writeError)throw writeError;
        if(run!==generation||identity().id!==current.id)return false;
        if(data?.user?.id!==current.uid)throw Error('Account changed');
        const meta=data.user.user_metadata||{};
        for(const key of changed)if(meta[keys[key]]!==allowed[key])throw Error('Style not confirmed');
        saved=catalog.clean({frame:meta[keys.frame],title:meta[keys.title]});
        cache(current.id,saved);
        notice='Style saved to your account.';
      }else{
        if(!cache(current.id,allowed))throw Error('Browser storage unavailable');
        saved=allowed;notice='Style saved on this browser.';
      }
      return true;
    }catch{
      if(run===generation)error='Your changes could not be confirmed. Your previous style is still shown. Try again.';
      return false;
    }finally{
      if(run===generation){saving=false;emit();}
    }
  }
  function changedOwner(){
    if(identity().id===owner?.id)return;
    generation++;loading=false;saving=false;owner=null;load();
  }
  window.addEventListener('brainilab:authchange',changedOwner);
  window.addEventListener('storage',event=>{
    if(owner&&!owner.cloud&&event.key===prefix+owner.id){saved=cached(owner.id);emit();}
  });
  window.addEventListener('online',()=>{if(owner?.cloud)load();});
  return {load,save,snapshot};
})();

/* ===== profile-rewards.js ===== */

window.BrainiProfileRewards=(function(){
  const catalog=BrainiRewardCatalog,store=BrainiRewardStore;
  let root,draft=catalog.clean(),draftOwner=null,dirty=false,lastGrid='',editing=false;
  const number=value=>value.toLocaleString('en-US');
  function status(text){root.querySelector('[data-style-status]').textContent=text;}
  function avatar(el,frame){
    if(!el)return;
    if(frame==='level')delete el.dataset.profileFrame;
    else el.dataset.profileFrame=frame;
  }
  function renderNext(total){
    const next=catalog.next(total),target=root.querySelector('[data-next-reward]');
    target.replaceChildren();
    const label=document.createElement('span'),name=document.createElement('strong'),hint=document.createElement('p');
    label.className='reward-kicker';label.textContent=next?'Your next reward':'Your collection';
    name.textContent=next?`${next.name} · ${next.kind==='frame'?'avatar frame':'profile title'}`:'Every reward is unlocked';
    hint.textContent=next?`${number(next.xp-total)} XP to go · Unlocks at ${number(next.xp)} XP`:'Choose a frame and title you love. More discoveries await in the games.';
    target.append(label,name,hint);
    if(next){
      const progress=document.createElement('progress');progress.max=next.xp;progress.value=total;
      progress.setAttribute('aria-label',`Progress to ${next.name}: ${number(total)} of ${number(next.xp)} XP`);target.append(progress);
    }
  }
  function renderGrid(kind,items,total,busy){
    const grid=root.querySelector(`[data-style-${kind}s]`);grid.replaceChildren();
    for(const item of items){
      const button=document.createElement('button'),name=document.createElement('strong'),hint=document.createElement('small');
      button.type='button';button.className='reward-choice';button.dataset.rewardKind=kind;button.dataset.rewardId=item.id;
      button.disabled=busy||item.xp>total;button.setAttribute('aria-pressed',String(draft[kind]===item.id));
      if(kind==='frame'){
        const sample=document.createElement('span');sample.className='reward-frame-sample';sample.setAttribute('aria-hidden','true');
        sample.dataset.profileFrame=item.id;sample.textContent='B';button.append(sample);
      }
      name.textContent=item.name;hint.textContent=item.xp>total?`Locked · ${number(item.xp)} XP`:item.xp===0?'Always available':'Unlocked';
      button.append(name,hint);grid.append(button);
    }
  }
  function render(){
    root=root||document.querySelector('[data-profile-rewards]');if(!root)return;
    const state=store.snapshot(),total=catalog.xp(BrainiData.player().xp);
    if(draftOwner!==state.owner){draftOwner=state.owner;dirty=false;lastGrid='';}
    if(!dirty)draft={...state.style};
    draft=catalog.available(draft,total);
    const title=catalog.titles.find(r=>r.id===state.style.title);
    avatar(document.querySelector('[data-profile-rank-hero] .rank-avatar'),state.style.frame);
    avatar(document.querySelector('.nav-right .avatar'),state.style.frame);
    const hero=document.querySelector('.profile-rank-main');
    if(hero){
      let tag=hero.querySelector('[data-equipped-title]');
      if(!tag){tag=document.createElement('p');tag.dataset.equippedTitle='';hero.querySelector('h2')?.after(tag);}
      tag.hidden=title.id==='none';tag.textContent=title.id==='none'?'':title.name;
    }
    renderNext(total);
    const gridKey=JSON.stringify([total,state.loading,state.saving,state.error]);
    if(lastGrid!==gridKey){
      renderGrid('frame',catalog.frames,total,state.loading||state.saving||!!state.error);
      renderGrid('title',catalog.titles,total,state.loading||state.saving||!!state.error);lastGrid=gridKey;
    }
    root.querySelectorAll('[data-reward-kind]').forEach(button=>button.setAttribute('aria-pressed',String(draft[button.dataset.rewardKind]===button.dataset.rewardId)));
    const preview=root.querySelector('[data-style-preview-avatar]');
    preview.className='rank-avatar '+BrainiProgressUI.avatarClass(BrainiData.player().level||1);avatar(preview,draft.frame);
    preview.innerHTML=BrainiProgressUI.avatarImageMarkup(BrainiData.player());
    root.querySelector('[data-style-preview-name]').textContent=BrainiData.player().displayName;
    const previewTitle=catalog.titles.find(r=>r.id===draft.title);
    root.querySelector('[data-style-preview-title]').textContent=previewTitle.id==='none'?'No title selected':previewTitle.name;
    root.querySelector('[data-style-storage]').textContent=state.cloud?'Saved with your account. Your XP are never spent.':'Saved on this browser. Sign in to keep your style across devices. Your XP are never spent.';
    const save=root.querySelector('[data-style-save]');save.disabled=!dirty||state.loading||state.saving||!!state.error;
    save.textContent=state.saving?'Saving…':'Save my style';
    root.querySelector('[data-style-cancel]').disabled=!dirty||state.saving;
    root.querySelector('[data-style-retry]').hidden=!state.error;
    status(state.loading?'Checking your saved style…':state.saving?'Saving your style…':state.error||state.notice||(dirty?'Preview only. Save to apply your choices.':''));
  }
  function bind(){
    root=document.querySelector('[data-profile-rewards]');if(!root)return;
    root.innerHTML=`<div class="profile-reward-intro"><div data-next-reward></div><a class="btn-light" href="#profile-style" data-style-open>Personalize your profile →</a></div>
      <details id="profile-style"><summary>Frames &amp; titles</summary><div class="profile-style-editor">
      <div class="profile-style-preview"><span class="rank-avatar" data-style-preview-avatar aria-hidden="true"></span><div><span class="reward-kicker">Preview</span><strong data-style-preview-name></strong><p data-style-preview-title></p></div></div>
      <p class="profile-reward-help">Make it yours. Rewards unlock automatically with the XP you already earn.</p>
      <fieldset><legend>Avatar frame</legend><div class="reward-grid" data-style-frames></div></fieldset>
      <fieldset><legend>Profile title</legend><div class="reward-grid reward-title-grid" data-style-titles></div></fieldset>
      <p class="profile-reward-help" data-style-storage></p><div class="profile-style-actions"><button class="btn" type="button" data-style-save>Save my style</button><button class="btn-light" type="button" data-style-cancel>Cancel changes</button><button class="btn-light" type="button" data-style-retry hidden>Try again</button></div>
      <p class="profile-style-status" role="status" aria-live="polite" data-style-status></p></div></details>`;
    root.querySelector('[data-style-open]').addEventListener('click',event=>{
      event.preventDefault();root.querySelector('details').open=true;root.querySelector('summary').focus();
    });
    root.addEventListener('click',async event=>{
      const choice=event.target.closest('[data-reward-kind]');
      if(choice&&!choice.disabled){draft[choice.dataset.rewardKind]=choice.dataset.rewardId;dirty=true;render();}
      if(event.target.closest('[data-style-cancel]')){dirty=false;render();}
      if(event.target.closest('[data-style-retry]')){dirty=false;await store.load();}
      if(event.target.closest('[data-style-save]')){editing=true;const ok=await store.save(draft);editing=false;if(ok)dirty=false;render();}
    });
    window.addEventListener('brainilab:stylechange',render);
    window.addEventListener('brainilab:datachange',()=>{if(!editing)render();});
    store.load();render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  return {render};
})();
