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
  const groups=Object.freeze({frame:frames,title:titles,...BrainiAvatarDesign.options});
  const metadataKeys=Object.freeze({frame:'brainilab_avatar_frame_v1',title:'brainilab_profile_title_v1',...BrainiAvatarDesign.metadataKeys});
  const xp=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
  function clean(value={}){
    return Object.fromEntries(Object.entries(groups).map(([key,list])=>[key,list.some(item=>item.id===value?.[key])?value[key]:list[0].id]));
  }
  function available(value,earned){
    const result=clean(value),total=xp(earned);
    for(const [key,list] of Object.entries(groups))if(list.find(item=>item.id===result[key]).xp>total)result[key]=list[0].id;
    return result;
  }
  function next(earned){
    const total=xp(earned);
    return Object.entries(groups).flatMap(([kind,list])=>list.map(item=>({...item,kind})))
      .filter(r=>r.xp>total).sort((a,b)=>a.xp-b.xp)[0]||null;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  return Object.freeze({frames,titles,groups,metadataKeys,xp,clean,available,next,fromMetadata});
})();

/* ===== profile-rewards-store.js ===== */

window.BrainiRewardStore=(function(){
  const catalog=BrainiRewardCatalog;
  const prefix='brainilab-profile-style-v1:';
  // Separate top-level metadata keys avoid overwriting unrelated settings or
  // a frame/title saved independently in a second tab. These are not claims.
  const keys=catalog.metadataKeys;
  let owner=null,saved=catalog.clean(),loading=false,saving=false,error='',notice='',generation=0;
  function identity(){
    const auth=BrainiData.authState();
    return auth.status==='authenticated'&&auth.user?.id
      ? {id:'account:'+auth.user.id,uid:auth.user.id,cloud:true}
      : {id:'guest:'+(auth.guestUserId||auth.anonymousPlayerId||'browser'),cloud:false};
  }
  const total=()=>catalog.xp(BrainiData.player().xp);
  const emit=()=>window.dispatchEvent(new CustomEvent('brainilab:stylechange'));
  const applyDesign=()=>BrainiData.api?.setAvatarDesign?.(saved);
  function bounded(request){
    let timer;
    return Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Style request timed out')),12000);})])
      .finally(()=>clearTimeout(timer));
  }
  function cached(id){
    try{
      const raw=localStorage.getItem(prefix+id);
      return catalog.clean(raw?JSON.parse(raw):BrainiData.player().avatarDesign||{});
    }catch{return catalog.clean();}
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
    if(!current.cloud){applyDesign();return;}
    try{
      const sb=window.BrainiBackendAuth?.getClient?.();
      if(!sb)throw Error('Profile connection unavailable');
      const {data,error:readError}=await bounded(sb.auth.getUser());
      if(readError)throw readError;
      if(run!==generation||identity().id!==current.id)return;
      if(data?.user?.id!==current.uid)throw Error('Account changed');
      const meta=data.user.user_metadata||{};
      saved=catalog.fromMetadata(meta);
      cache(current.id,saved);
      applyDesign();
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
    if(Object.keys(keys).some(key=>requested[key]!==allowed[key])){
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
        if(Object.keys(keys).some(key=>currentAllowed[key]!==allowed[key]))throw Error('XP changed');
        const patch=Object.fromEntries(changed.map(key=>[keys[key],allowed[key]]));
        const {data,error:writeError}=await bounded(sb.auth.updateUser({data:patch}));
        if(writeError)throw writeError;
        if(run!==generation||identity().id!==current.id)return false;
        if(data?.user?.id!==current.uid)throw Error('Account changed');
        const meta=data.user.user_metadata||{};
        for(const key of changed)if(meta[keys[key]]!==allowed[key])throw Error('Style not confirmed');
        saved=catalog.fromMetadata(meta);
        cache(current.id,saved);
        notice='Style saved to your account.';
      }else{
        if(!cache(current.id,allowed))throw Error('Browser storage unavailable');
        saved=allowed;notice='Style saved on this browser.';
      }
      applyDesign();return true;
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
    if(owner&&!owner.cloud&&event.key===prefix+owner.id){saved=cached(owner.id);applyDesign();emit();}
  });
  window.addEventListener('online',()=>{if(owner?.cloud)load();});
  return {load,save,snapshot};
})();

/* ===== avatar-studio-ui.js ===== */

window.BrainiAvatarStudioUI=(function(){
  const C=BrainiRewardCatalog,A=BrainiAvatarDesign;
  const panes={look:{label:'Your look',groups:{skin:'Skin tone',hair:'Hair',hairColor:'Hair colour',shirt:'Shirt',background:'Background'}},
    extras:{label:'Little extras',groups:{glasses:'Glasses',hat:'Hats',prop:'A little personality'}},
    rewards:{label:'Frames & titles',groups:{frame:'Avatar frame',title:'Profile title'}}};
  let active='look';
  const number=n=>n.toLocaleString('en-GB');
  function mount(root){
    root.innerHTML=`<div class="avatar-studio-heading"><div><span class="reward-kicker">MY AVATAR</span><h2>Make it yours.</h2><p>A look, a little personality, and a few things to earn.</p></div><a class="avatar-play-link" href="/games/">Play for more XP →</a></div>
      <div class="avatar-studio-layout"><aside class="avatar-studio-stage" aria-label="Avatar preview">
      <div class="avatar-stage-art"><span class="avatar-preview-label" data-style-preview-label>Your avatar</span><span class="rank-avatar avatar-studio-portrait" data-style-preview-avatar aria-hidden="true"></span></div>
      <div class="avatar-stage-identity"><strong data-style-preview-name></strong><p data-style-preview-title></p><span data-avatar-level></span></div>
      <div class="avatar-next-reward" data-next-reward></div>
      <div class="profile-style-actions"><button class="btn" type="button" data-style-save>Save my avatar</button><button class="btn-light" type="button" data-style-cancel>Cancel changes</button><button class="btn-light" type="button" data-style-retry hidden>Try again</button></div>
      <p class="profile-style-status" role="status" aria-live="polite" data-style-status></p><p class="avatar-storage-note" data-style-storage></p></aside>
      <div class="avatar-studio-controls"><div class="avatar-mobile-preview"><span data-avatar-mini aria-hidden="true"></span><span data-avatar-mini-label></span><button class="btn" type="button" data-style-save>Save my avatar</button></div><fieldset class="avatar-mode"><legend>Start with</legend><div class="reward-mode-grid" data-style-modes></div></fieldset>
      <div class="avatar-studio-tabs" role="tablist" aria-label="Avatar options">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${p.label}</button>`).join('')}</div>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='extras'?'<p class="avatar-pane-note">Little extras for your illustrated avatar. Pick one to try it on.</p>':''}${Object.entries(p.groups).map(([kind,name])=>`<fieldset class="avatar-option-group"><legend>${name}</legend><div class="reward-grid reward-grid-${kind}" data-style-${kind}s></div></fieldset>`).join('')}</div>`).join('')}</div></div>`;
    showPane(root,active);
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{
      tab.addEventListener('click',()=>showPane(root,tab.dataset.avatarTab));
      tab.addEventListener('keydown',event=>{
        if(event.altKey||event.ctrlKey||event.metaKey)return;
        const keys=Object.keys(panes),index=keys.indexOf(tab.dataset.avatarTab);
        const next=event.key==='ArrowRight'?keys[(index+1)%keys.length]:event.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:event.key==='Home'?keys[0]:event.key==='End'?keys.at(-1):null;
        if(next){event.preventDefault();showPane(root,next);root.querySelector(`[data-avatar-tab="${next}"]`).focus();}
      });
    });
  }
  function showPane(root,key){
    active=key in panes?key:'look';
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{const selected=tab.dataset.avatarTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-avatar-pane]').forEach(panel=>panel.hidden=panel.dataset.avatarPane!==active);
  }
  function sample(kind,item,draft){
    if(kind==='title')return '';
    if(item.color)return `<span class="avatar-swatch" style="--swatch:${item.color}"></span>`;
    if(kind==='mode'&&item.id==='picture')return BrainiProgressUI.avatarImageMarkup({...BrainiData.player(),avatarDesign:null});
    if(kind==='frame')return `<span class="reward-frame-sample" data-profile-frame="${item.id}">B</span>`;
    return A.markup({...draft,mode:'built',[kind]:item.id},Number.MAX_SAFE_INTEGER);
  }
  function choices(root,draft,total,busy){
    for(const [kind,items] of Object.entries(C.groups)){
      const grid=root.querySelector(`[data-style-${kind}s]`);if(!grid)continue;
      for(const item of items){
        let button=grid.querySelector(`[data-reward-id="${item.id}"]`);
        if(!button){
          button=document.createElement('button');button.type='button';button.className='reward-choice';button.dataset.rewardKind=kind;button.dataset.rewardId=item.id;
          button.innerHTML='<span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small>';grid.append(button);
        }
        const art=sample(kind,item,draft),artRoot=button.querySelector('.reward-choice-art');
        if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
        artRoot.hidden=!art;
        const selected=draft[kind]===item.id,locked=item.xp>total;
        button.disabled=busy||locked;button.setAttribute('aria-pressed',String(selected));
        button.querySelector('strong').textContent=item.name;
        button.querySelector('small').textContent=locked?`Locked · ${number(item.xp)} XP`:selected?'Selected':item.xp?'Unlocked':kind==='mode'?'Choose':'Free';
        button.title=item.description||item.name;
        button.setAttribute('aria-label',`${item.name}, ${locked?'unlocks at '+number(item.xp)+' XP':selected?'selected':item.xp?'unlocked':'available'}${item.description?'. '+item.description:''}`);
      }
    }
  }
  function next(root,total){
    const reward=C.next(total),target=root.querySelector('[data-next-reward]');
    const labels={frame:'avatar frame',title:'profile title',glasses:'glasses',hat:'hat',prop:'little extra'};
    target.innerHTML='<span class="reward-kicker"></span><strong></strong><p></p><progress></progress>';
    target.querySelector('span').textContent=reward?'UP NEXT':'YOUR COLLECTION';
    target.querySelector('strong').textContent=reward?reward.name:'Every reward is unlocked';
    target.querySelector('p').textContent=reward?`${number(reward.xp-total)} XP to go · ${labels[reward.kind]}`:'Pick your favourites and make them yours.';
    const progress=target.querySelector('progress');progress.hidden=!reward;
    if(reward){progress.max=reward.xp;progress.value=total;progress.setAttribute('aria-label',`${reward.name}: ${number(total)} of ${number(reward.xp)} XP`);}
  }
  return {mount,showPane,choices,next};
})();

/* ===== profile-rewards.js ===== */

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
