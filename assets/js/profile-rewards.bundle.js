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
  function surprise(style,earned,random=Math.random){
    const total=xp(earned),current=available(style,total),result={...current,mode:'built'};
    const kinds=['hair','hairColor','shirt','background','glasses','hat','prop'];
    // Skin tone, frame and title stay intentional. Extras stay absent in most draws.
    for(const kind of kinds){
      const unlocked=groups[kind].filter(item=>item.xp<=total);
      const roll=Math.min(1-Number.EPSILON,Math.max(0,Number(random())||0));
      const extra=['glasses','hat','prop'].includes(kind);
      const pool=extra?unlocked.filter(item=>item.id!=='none'):unlocked;
      result[kind]=extra&&(roll<.65||!pool.length)?'none':pool[Math.min(pool.length-1,Math.floor((extra?(roll-.65)/.35:roll)*pool.length))].id;
    }
    if(kinds.every(kind=>result[kind]===current[kind]))result.hair=groups.hair.find(item=>item.xp<=total&&item.id!==current.hair)?.id||current.hair;
    return result;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  return Object.freeze({frames,titles,groups,metadataKeys,xp,clean,available,next,surprise,fromMetadata});
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
  function group(kind,name){
    return `<fieldset class="avatar-option-group"><legend>${name}</legend><div class="reward-grid reward-grid-${kind}" data-style-${kind}s></div><p class="avatar-item-note" data-avatar-note="${kind}" hidden></p></fieldset>`;
  }
  function mount(root){
    root.innerHTML=`<div class="avatar-studio-heading"><div><span class="reward-kicker">MY AVATAR</span><h2>Make it yours.</h2><p>Try a new look. Add a little extra. Make it you.</p></div><a class="avatar-play-link" href="/games/">Play for more XP →</a></div>
      <div class="avatar-studio-layout"><aside class="avatar-studio-stage" aria-label="Avatar preview">
      <div class="avatar-stage-art"><span class="avatar-preview-label" data-style-preview-label>Your avatar</span><span class="rank-avatar avatar-studio-portrait" data-style-preview-avatar aria-hidden="true"></span></div>
      <div class="avatar-stage-identity" data-diploma-tier="rookie" aria-label="BrainiLab progress diploma"><span class="avatar-diploma-ornament" aria-hidden="true"><svg viewBox="0 0 280 130" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g class="diploma-etched-corners"><path d="M10 30V10H30M250 10H270V30M10 100V120H30M250 120H270V100"/><path d="m13 23 10-10M257 13l10 10M13 107l10 10M257 117l10-10" stroke-width=".7"/></g><g class="diploma-scroll-corners"><path d="M9 37V17Q9 9 17 9H37M243 9H263Q271 9 271 17V37M9 93V113Q9 121 17 121H37M243 121H263Q271 121 271 113V93"/><path d="M12 25Q25 25 25 12M255 12Q255 25 268 25M12 105Q25 105 25 118M255 118Q255 105 268 105"/><path d="m134 9 6-4 6 4-6 4ZM134 121l6-4 6 4-6 4Z" fill="currentColor" stroke-width=".7"/></g><g class="diploma-laurel-corners"><path d="M13 40Q10 18 34 12M246 12Q270 18 267 40M13 90Q10 112 34 118M246 118Q270 112 267 90"/><path d="m15 29-6-6 8 2m3-6-2-7 7 4m-9 85-7 6 8-2m3 6-2 7 7-4m240-85 6-6-8 2m-3-6 2-7-7 4m10 85 6 6-8-2m-3 6 2 7-7-4"/><path d="M126 9H135M145 9H154M126 121H135M145 121H154"/><path d="m140 5 4 4-4 4-4-4ZM140 117l4 4-4 4-4-4Z" fill="currentColor"/></g></svg></span><div class="avatar-diploma-name"><strong data-style-preview-name></strong><span class="avatar-diploma-seal" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g data-diploma-mark="rookie"><circle cx="24" cy="23" r="15"/><path d="m24 15 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g><g data-diploma-mark="elementary"><circle cx="24" cy="24" r="17"/><path d="M24 34V19M24 26Q12 27 13 15Q25 14 24 26ZM24 22Q24 11 36 13Q37 24 24 22Z" fill="currentColor" fill-opacity=".16"/></g><g data-diploma-mark="highschool"><path d="m24 4 5 5 8 1 1 8 5 6-5 6-1 8-8 1-5 5-5-5-8-1-1-8-5-6 5-6 1-8 8-1Z" fill="currentColor" fill-opacity=".12"/><path d="m24 13 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/></g><g data-diploma-mark="college"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M15 16Q20 14 24 18Q28 14 33 16V30Q28 28 24 32Q20 28 15 30ZM24 18V32"/><path d="M18 21H21M27 21H30M18 25H21M27 25H30" stroke-width="1.5"/></g><g data-diploma-mark="graduate"><path d="M14 38Q2 24 11 10M34 38Q46 24 37 10M10 16 5 14M8 23 3 22M9 30 4 31M12 35 8 39M38 16 43 14M40 23 45 22M39 30 44 31M36 35 40 39"/><circle cx="24" cy="23" r="12" fill="currentColor" fill-opacity=".14"/><path d="m24 14 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="phd"><path d="m24 3 18 10v22L24 45 6 35V13Z" fill="currentColor" fill-opacity=".13"/><path d="m24 9 13 7v16l-13 7-13-7V16Z" stroke-width="1"/><path d="m24 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="currentColor"/></g><g data-diploma-mark="researcher"><circle cx="24" cy="24" r="4" fill="currentColor"/><ellipse cx="24" cy="24" rx="20" ry="8"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)"/></g><g data-diploma-mark="professor"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M14 20Q20 17 24 22Q28 17 34 20V33Q28 30 24 35Q20 30 14 33ZM24 22V35"/><path d="m24 10 1 3 4 1-3 2v3l-2-2-3 2 1-3-3-2 4-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="dean"><path d="M24 3 42 11V29Q36 39 24 45Q12 39 6 29V11Z" fill="currentColor" fill-opacity=".18"/><path d="m13 18 6 5 5-10 5 10 6-5-3 15H16ZM17 37H31" fill="currentColor" fill-opacity=".25"/><circle cx="13" cy="16" r="2" fill="currentColor"/><circle cx="24" cy="11" r="2" fill="currentColor"/><circle cx="35" cy="16" r="2" fill="currentColor"/></g><g data-diploma-mark="nobel"><path d="m24 2 5 5 8-1 2 8 7 5-4 7 1 9-8 2-5 8-7-4-9 2-3-8-8-5 4-8-1-8 8-3 4-8Z" fill="currentColor" fill-opacity=".22"/><circle cx="24" cy="24" r="14"/><path d="m24 12 3 8 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1Z" fill="currentColor" stroke-width="1"/></g></svg></span></div><p data-style-preview-title></p><span data-avatar-level></span><small data-avatar-diploma-next></small></div>
      <div class="avatar-next-reward" data-next-reward></div>
      <div class="profile-style-actions"><button class="btn" type="button" data-style-save>Save my avatar</button><button class="btn-light" type="button" data-style-cancel>Cancel changes</button><button class="btn-light" type="button" data-style-retry hidden>Try again</button></div>
      <p class="profile-style-status" role="status" aria-live="polite" data-style-status></p><p class="avatar-storage-note" data-style-storage></p><p class="avatar-sharing-note" data-style-sharing></p></aside>
      <div class="avatar-studio-controls"><div class="avatar-mobile-preview"><span data-avatar-mini aria-hidden="true"></span><span data-avatar-mini-label></span><button class="btn" type="button" data-style-save>Save my avatar</button></div><div class="avatar-mode" role="group" aria-labelledby="avatar-start-label"><div class="avatar-mode-header"><span id="avatar-start-label">Start with</span><button type="button" class="avatar-surprise" data-avatar-surprise aria-label="Surprise me with unlocked avatar items" title="Try a new look using your unlocked items">Surprise me</button></div><div class="reward-mode-grid" data-style-modes></div></div>
      <div class="avatar-studio-tabs" role="tablist" aria-label="Avatar options">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${p.label}</button>`).join('')}</div>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='extras'?'<p class="avatar-pane-note">Try something on. Extras unlock with XP you’ve earned.</p>':''}${Object.entries(p.groups).map(([kind,name])=>group(kind,name)).join('')}</div>`).join('')}</div></div>`;
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
      const chosen=items.find(item=>item.id===draft[kind]),note=root.querySelector(`[data-avatar-note="${kind}"]`);
      if(note){const text=chosen?.description?`${chosen.name}. ${chosen.description}`:'';if(note.textContent!==text)note.textContent=text;note.hidden=!text;}
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
  let root,draft=C.clean(),baseline=C.clean(),owner=null,dirty=false,editing=false;
  function frame(el,id){if(el){if(id==='level')delete el.dataset.profileFrame;else el.dataset.profileFrame=id;}}
  function render(){
    root=root||document.querySelector('[data-profile-rewards]');if(!root?.querySelector('[data-style-status]'))return;
    const state=S.snapshot(),player=BrainiData.player(),total=C.xp(player.xp);
    if(owner!==state.owner){owner=state.owner;dirty=false;}
    // Reconnects can refresh fields edited in another tab. Keep only this draft's changes.
    const changes=dirty?Object.fromEntries(Object.keys(C.groups).filter(key=>draft[key]!==baseline[key]).map(key=>[key,draft[key]])):{};
    draft=C.available({...state.style,...changes},total);baseline={...state.style};
    dirty=Object.keys(C.groups).some(key=>draft[key]!==baseline[key]);
    const progress=BrainiProgressUI.xpProgress?.(player.level,total);
    const level=progress?.level||player.level||1,tier=BrainiProgressUI.tier?.(level),nextTier=BrainiProgressUI.nextTier?.(level);
    const equipped=state.style;
    for(const avatar of [document.querySelector('[data-profile-rank-hero] .rank-avatar'),document.querySelector('.nav-right .avatar'),document.querySelector('[data-profile-account-avatar]')]){
      if(avatar){frame(avatar,equipped.frame);avatar.innerHTML=BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:A.clean(equipped)});}
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
    preview.innerHTML=draft.mode==='built'?A.markup(draft,total):BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
    const mini=root.querySelector('[data-avatar-mini]');
    mini.className='rank-avatar avatar-mobile-portrait '+BrainiProgressUI.avatarClass(level);frame(mini,draft.frame);
    mini.innerHTML=preview.innerHTML;
    root.querySelector('[data-avatar-mini-label]').textContent=dirty?'Your preview':'Your avatar';
    root.querySelector('[data-style-preview-label]').textContent=dirty?'Preview · not saved':'Your avatar';
    root.querySelector('[data-style-preview-name]').textContent=player.displayName;
    const title=C.titles.find(t=>t.id===draft.title),titleRoot=root.querySelector('[data-style-preview-title]');
    titleRoot.textContent=title.id==='none'?'':title.name;titleRoot.hidden=title.id==='none';
    root.querySelector('.avatar-stage-identity').dataset.diplomaTier=tier?.key||'rookie';
    root.querySelector('[data-avatar-diploma-next]').textContent=nextTier?`Next diploma · Level ${nextTier.min}`:'Top diploma unlocked';
    root.querySelector('[data-avatar-level]').textContent=`Level ${level} · ${total.toLocaleString('en-GB')} XP`;
    U.next(root,total);U.choices(root,draft,total,state.loading||state.saving||!!state.error);
    root.querySelector('[data-style-storage]').textContent=state.cloud?'Saved with your account. XP are never spent.':'Saved on this browser. Sign in to sync. XP are never spent.';
    root.querySelector('[data-style-sharing]').textContent=state.cloud?'Your saved look and title appear with friends and groups, and in public rankings when you choose to be visible.':'Try things on here. Guest choices stay on this browser.';
    root.querySelectorAll('[data-style-save]').forEach(button=>{button.disabled=!dirty||state.loading||state.saving||!!state.error;button.textContent=state.saving?'Saving…':'Save my avatar';});
    root.querySelector('[data-avatar-surprise]').disabled=state.loading||state.saving||!!state.error;
    root.querySelector('[data-style-cancel]').disabled=!dirty||state.saving;
    root.querySelector('[data-style-retry]').hidden=!state.error;
    root.querySelector('[data-style-status]').textContent=state.loading?'Checking your saved avatar…':state.saving?'Saving your avatar…':state.error||state.notice||(dirty?'Preview only. Save when you’re happy with it.':'');
  }
  function bind(){
    root=document.querySelector('[data-profile-rewards]');if(!root)return;U.mount(root);
    root.addEventListener('click',async event=>{
      const surprise=event.target.closest('[data-avatar-surprise]');
      if(surprise&&!surprise.disabled){
        draft=C.surprise(draft,BrainiData.player().xp);
        dirty=Object.keys(C.groups).some(key=>draft[key]!==S.snapshot().style[key]);render();
        return;
      }
      const button=event.target.closest('[data-reward-kind]');
      if(button&&!button.disabled){
        const {rewardKind:kind,rewardId:id}=button.dataset;draft[kind]=id;
        if(kind!=='mode'&&kind!=='frame'&&kind!=='title')draft.mode='built';
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
