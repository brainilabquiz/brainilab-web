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
  const scenes=Object.freeze([
    {id:'none',name:'Plain & simple',xp:0,description:'Your usual clean profile.'},
    {id:'library',name:'Booked in',xp:1500,description:'A quiet library corner for a curious mind.'},
    {id:'lab',name:'In your element',xp:3500,description:'A little laboratory for your bright ideas.'},
    {id:'stars',name:'Night thinker',xp:6000,description:'A calm sky full of possibilities.'}
  ].map(Object.freeze));
  const groups=Object.freeze({frame:frames,title:titles,...BrainiAvatarDesign.options,scene:scenes});
  const metadataKeys=Object.freeze({frame:'brainilab_avatar_frame_v1',title:'brainilab_profile_title_v1',...BrainiAvatarDesign.metadataKeys,scene:'brainilab_profile_scene_v1'});
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
  return Object.freeze({frames,titles,scenes,groups,metadataKeys,xp,clean,available,next,surprise,fromMetadata});
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
        if(changed.includes('scene')&&catalog.fromMetadata(before.user.user_metadata||{}).scene!==catalog.clean(saved).scene)throw Error('Background changed in another tab');
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

/* ===== profile-achievements-store.js ===== */

window.BrainiAchievementStore=(function(){
  const catalog=BrainiAchievementCatalog,key=catalog.metadataKey;
  let owner=null,confirmedOwner=null,selected=[],baseline=null,loading=false,saving=false,error='',notice='',generation=0,pending=null,waitingForProgress=false,progressResumeUsed=false;
  function identity(){
    const auth=window.BrainiData?.authState?.();
    return auth?.status==='authenticated'&&typeof auth.user?.id==='string'&&auth.user.id&&auth.user.is_anonymous!==true
      ? {id:'account:'+auth.user.id,uid:auth.user.id}:null;
  }
  const emit=()=>window.dispatchEvent(new CustomEvent('brainilab:achievementchange'));
  const current=(account,run)=>run===generation&&owner?.uid===account.uid&&identity()?.uid===account.uid;
  function evidence(account){
    try{return catalog.earned(window.BrainiProgression?.getCached?.(),account?.uid);}
    catch{return catalog.earned(null,account?.uid);}
  }
  const metadata=user=>user?.user_metadata&&typeof user.user_metadata==='object'&&!Array.isArray(user.user_metadata)?user.user_metadata:{};
  const fingerprint=meta=>JSON.stringify([Object.hasOwn(meta,key),meta[key]]);
  function fail(message,reason=''){const failure=new Error(message);failure.achievementMessage=message;failure.achievementReason=reason;throw failure;}
  function bounded(request){
    let timer;
    return Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Achievement request timed out')),12000);})])
      .finally(()=>clearTimeout(timer));
  }
  function snapshot(){
    const account=identity(),same=!!account&&account.uid===owner?.uid;
    const proof=same&&confirmedOwner===account.uid?evidence(account):{available:false,ids:[],metrics:null};
    return {owner:same?owner.id:null,selected:proof.available?catalog.clean(selected,proof.ids):[],
      earned:proof.ids.slice(),evidence:proof.metrics?{...proof.metrics}:null,available:proof.available,
      loading:same&&loading,saving:same&&saving,waitingForProgress:same&&waitingForProgress,
      error:same?error:'',notice:same?notice:'',cloud:!!account};
  }
  function load(){
    const account=identity();
    if(account?.uid===owner?.uid&&(loading||saving))return pending||Promise.resolve(false);
    const same=!!account&&account.uid===owner?.uid;
    const run=++generation;owner=account;if(!same){selected=[];baseline=null;confirmedOwner=null;progressResumeUsed=false;}waitingForProgress=false;error='';notice='';
    loading=!!account;saving=false;emit();
    if(!account)return Promise.resolve(false);
    const job=(async()=>{
      try{
        let proof=evidence(account);
        if(!proof.available){
          if(!window.BrainiProgression?.sync)fail('Your account progress could not be checked. Try again.','progress-unavailable');
          await bounded(BrainiProgression.sync());
          if(!current(account,run))return false;
          proof=evidence(account);
        }
        if(!proof.available)fail('Your account progress could not be checked. Try again.','progress-unavailable');
        const sb=window.BrainiBackendAuth?.getClient?.();
        if(!sb)fail('Your featured badges could not be loaded. Try again.');
        const {data,error:readError}=await bounded(sb.auth.getUser());
        if(!current(account,run))return false;
        if(data?.user&&data.user.id!==account.uid){confirmedOwner=null;selected=[];baseline=null;}
        if(readError||data?.user?.id!==account.uid)fail('Your featured badges could not be loaded. Try again.');
        proof=evidence(account);
        if(!proof.available)fail('Your account progress could not be checked. Try again.');
        const meta=metadata(data.user);
        selected=catalog.clean(meta[key],proof.ids);baseline=fingerprint(meta);confirmedOwner=account.uid;
        return true;
      }catch(caught){
        if(current(account,run)){
          error=caught.achievementMessage||'Your featured badges could not be loaded. Try again.';
          waitingForProgress=caught.achievementReason==='progress-unavailable'&&confirmedOwner!==account.uid&&!progressResumeUsed;
        }
        return false;
      }finally{
        if(current(account,run)){loading=false;pending=null;emit();}
      }
    })();
    pending=job;return job;
  }
  async function save(ids){
    if(loading||saving)return false;
    const account=identity(),run=generation;
    if(!account||account.uid!==owner?.uid){await load();return false;}
    if(error||baseline===null)return false;
    const requested=catalog.clean(ids),proof=evidence(account);
    if(!proof.available){error='Your account progress could not be checked. Try again.';emit();return false;}
    if(!Array.isArray(ids)||ids.length>3||requested.length!==ids.length||
      requested.some((id,i)=>id!==ids[i])||requested.some(id=>!proof.ids.includes(id))){
      error='Choose up to three different unlocked badges. Your progress has not changed.';emit();return false;
    }
    if(JSON.stringify(requested)===JSON.stringify(catalog.clean(selected,proof.ids)))return true;
    saving=true;notice='';emit();
    try{
      const sb=window.BrainiBackendAuth?.getClient?.();
      if(!sb)fail('Your featured badges could not be saved. Try again.');
      const {data:before,error:readError}=await bounded(sb.auth.getUser());
      if(!current(account,run))return false;
      if(before?.user&&before.user.id!==account.uid){confirmedOwner=null;selected=[];baseline=null;}
      if(readError||before?.user?.id!==account.uid)fail('Your featured badges could not be checked. Try again.');
      // Metadata offers no atomic compare-and-swap. Detect a changed selection
      // before writing, and patch only this field so other preferences survive.
      if(fingerprint(metadata(before.user))!==baseline)fail('Your featured badges changed on another device. Reload before saving.');
      let checked=evidence(account);
      if(!checked.available||requested.some(id=>!checked.ids.includes(id)))fail('Your account progress changed. Reload before saving.');
      const {data,error:writeError}=await bounded(sb.auth.updateUser({data:{[key]:requested.slice()}}));
      if(!current(account,run))return false;
      if(data?.user&&data.user.id!==account.uid){confirmedOwner=null;selected=[];baseline=null;}
      if(writeError||data?.user?.id!==account.uid||JSON.stringify(metadata(data.user)[key])!==JSON.stringify(requested))
        fail('Your changes could not be confirmed. Your previous selection is still shown. Reload to check it.');
      checked=evidence(account);
      if(!checked.available||requested.some(id=>!checked.ids.includes(id)))fail('Your account progress changed. Reload before saving.');
      selected=requested.slice();baseline=fingerprint(metadata(data.user));notice='Featured badges saved to your account.';
      return true;
    }catch(caught){
      if(current(account,run))error=caught.achievementMessage||'Your changes could not be confirmed. Your previous selection is still shown. Reload to check it.';
      return false;
    }finally{
      if(current(account,run)){saving=false;emit();}
    }
  }
  window.addEventListener('brainilab:authchange',()=>{
    if(identity()?.uid===owner?.uid)return;
    generation++;owner=null;confirmedOwner=null;selected=[];baseline=null;loading=false;saving=false;pending=null;waitingForProgress=false;progressResumeUsed=false;error='';notice='';
    void load();
  });
  window.addEventListener('brainilab:progressionchange',()=>{
    const account=identity();
    if(!account||account.uid!==owner?.uid)return;
    // Startup can precede the SDK/progression cache. Resume that read once when
    // the current account's proof arrives; metadata errors still need Try again.
    if(waitingForProgress&&!progressResumeUsed&&confirmedOwner!==account.uid&&!loading&&!saving&&evidence(account).available){
      waitingForProgress=false;progressResumeUsed=true;void load();return;
    }
    emit();
  });
  return {load,save,snapshot};
})();

/* ===== avatar-studio-ui.js ===== */

window.BrainiAvatarStudioUI=(function(){
  const C=BrainiRewardCatalog,A=BrainiAvatarDesign;
  const panes={look:{label:'Your look',groups:{skin:'Skin tone',hair:'Hair',hairColor:'Hair colour',shirt:'Shirt',background:'Background'}},
    extras:{label:'Little extras',groups:{glasses:'Glasses',hat:'Hats',prop:'A little personality'}},
    rewards:{label:'Frames & titles',groups:{frame:'Avatar frame',title:'Profile title',scene:'Profile background'}}};
  if(window.BrainiAchievementCatalog)panes.badges={label:'Badges',groups:{}};
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
      ${panes.badges?'<div data-featured-achievements></div>':''}
      <div class="avatar-next-reward" data-next-reward></div>
      <div class="profile-style-actions"><button class="btn" type="button" data-style-save>Save my avatar</button><button class="btn-light" type="button" data-style-cancel>Cancel changes</button><button class="btn-light" type="button" data-style-retry hidden>Try again</button></div>
      <p class="profile-style-status" role="status" aria-live="polite" data-style-status></p><p class="avatar-storage-note" data-style-storage></p><p class="avatar-sharing-note" data-style-sharing></p></aside>
      <div class="avatar-studio-controls"><div class="avatar-mobile-preview"><span data-avatar-mini aria-hidden="true"></span><span data-avatar-mini-label></span><button class="btn" type="button" data-style-save>Save my avatar</button></div><div class="avatar-mode" role="group" aria-labelledby="avatar-start-label"><div class="avatar-mode-header"><span id="avatar-start-label">Start with</span><button type="button" class="avatar-surprise" data-avatar-surprise aria-label="Surprise me with unlocked avatar items" title="Try a new look using your unlocked items">Surprise me</button></div><div class="reward-mode-grid" data-style-modes></div></div>
      <div class="avatar-studio-tabs" role="tablist" aria-label="Avatar options">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${p.label}</button>`).join('')}</div>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='badges'?'<div data-achievements-panel></div>':''}${key==='extras'?'<p class="avatar-pane-note">Try something on. Extras unlock with XP you’ve earned.</p>':''}${Object.entries(p.groups).map(([kind,name])=>group(kind,name)).join('')}</div>`).join('')}</div></div>`;
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
    root.dataset.studioPane=active;
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{const selected=tab.dataset.avatarTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-avatar-pane]').forEach(panel=>panel.hidden=panel.dataset.avatarPane!==active);
    for(const selector of ['.avatar-mode','.avatar-mobile-preview','.profile-style-actions','[data-style-status]','[data-style-storage]','[data-style-sharing]']){
      const element=root.querySelector(selector);if(element)element.hidden=active==='badges';
    }
    root.dispatchEvent(new CustomEvent('brainilab:avatarpanechange',{detail:{pane:active}}));
  }
  function sample(kind,item,draft){
    if(kind==='scene')return `<span class="profile-scene-sample" data-profile-scene="${item.id}"></span>`;
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
    const labels={frame:'avatar frame',title:'profile title',glasses:'glasses',hat:'hat',prop:'little extra',scene:'profile background'};
    target.innerHTML='<span class="reward-kicker"></span><strong></strong><p></p><progress></progress>';
    target.querySelector('span').textContent=reward?'UP NEXT':'YOUR COLLECTION';
    target.querySelector('strong').textContent=reward?reward.name:'Every reward is unlocked';
    target.querySelector('p').textContent=reward?`${number(reward.xp-total)} XP to go · ${labels[reward.kind]}`:'Pick your favourites and make them yours.';
    const progress=target.querySelector('progress');progress.hidden=!reward;
    if(reward){progress.max=reward.xp;progress.value=total;progress.setAttribute('aria-label',`${reward.name}: ${number(total)} of ${number(reward.xp)} XP`);}
  }
  return {mount,showPane,choices,next,activePane:()=>active};
})();

/* ===== profile-achievements-ui.js ===== */

/* Profile-only presentation. Evidence, selection and persistence belong to the store. */
window.BrainiAchievementUI=(function(){
  const views=new WeakMap();
  const icons=Object.freeze({
    first_game:'/assets/icons/product/play-now.svg',
    ten_games:'/assets/icons/product/medal-achievement.svg',
    fifty_games:'/assets/icons/product/ranking-trophy.svg',
    personal_bests_three:'/assets/icons/product/games.svg',
    daily_first:'/assets/icons/product/calendar-daily.svg',
    daily_seven:'/assets/icons/product/check-completed.svg',
    streak_three:'/assets/icons/product/streak.svg',
    streak_seven:'/assets/icons/product/streak.svg'
  });
  let sequence=0;
  const number=value=>Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number.isFinite(Number(value))?Math.floor(Number(value)):0));
  const formatted=value=>number(value).toLocaleString('en-GB');
  const text=(node,value)=>{const next=String(value??'');if(node.textContent!==next)node.textContent=next;};
  const message=value=>typeof value==='string'?value.trim():'';
  const catalog=()=>Array.isArray(window.BrainiAchievementCatalog?.badges)?window.BrainiAchievementCatalog.badges.filter(b=>icons[b.id]):[];
  function clean(list,badges){
    const known=new Set(badges.map(b=>b.id));
    return [...new Set(Array.isArray(list)?list.filter(id=>typeof id==='string'&&known.has(id)):[])].slice(0,3);
  }
  function image(doc,id){
    const node=doc.createElement('img');node.src=icons[id];node.alt='';node.width=24;node.height=24;node.setAttribute('aria-hidden','true');return node;
  }
  function paintArt(art,id,tier){
    const signature=id+':'+tier;if(art.dataset.signature===signature)return;
    art.replaceChildren();
    if(id){
      if(window.BrainiAchievementDisplay)art.innerHTML=BrainiAchievementDisplay.emblemMarkup(id,tier);
      else art.append(image(art.ownerDocument,id));
    }
    art.dataset.badge=id;art.dataset.signature=signature;
  }
  function slots(doc,parent,label){
    const list=doc.createElement('ol');list.className='achievement-slots';list.setAttribute('aria-label',label);
    for(let i=0;i<3;i++){
      const item=doc.createElement('li');item.className='achievement-slot';
      const art=doc.createElement('span');art.className='achievement-slot-art';art.setAttribute('aria-hidden','true');
      const name=doc.createElement('span');name.className='achievement-slot-name';
      const tier=doc.createElement('small');tier.className='achievement-slot-tier';
      item.append(art,name,tier);list.append(item);
    }
    parent.append(list);return list;
  }
  function renderSlots(list,ids,badges,metrics){
    const byId=new Map(badges.map(b=>[b.id,b]));
    [...list.children].forEach((item,index)=>{
      const badge=byId.get(ids[index]),art=item.firstElementChild,name=item.querySelector('.achievement-slot-name'),label=item.lastElementChild;
      item.classList.toggle('is-empty',!badge);
      const id=badge?.id||'';
      const tier=badge?BrainiAchievementCatalog.state(id,metrics)?.current:null;
      paintArt(art,id,tier?.level||1);
      text(name,badge?badge.name:'');
      text(label,tier?`${tier.material} · ${tier.level}/10`:'');
      item.setAttribute('aria-label',badge?`${badge.name}. ${tier?.material||''}, level ${tier?.level||1} of 10`:`Empty badge slot ${index+1}`);
    });
  }
  function mount(root){
    if(!root?.querySelector)return null;
    const panel=root.querySelector('[data-achievements-panel]'),featured=root.querySelector('[data-featured-achievements]');
    if(!panel||!featured)return null;
    const previous=views.get(root);
    if(previous?.panel===panel&&previous?.featured===featured)return previous;
    const doc=root.ownerDocument,id=++sequence,badges=catalog();
    featured.classList.add('profile-featured-achievements');
    featured.innerHTML='<div class="achievement-featured-heading"><strong>Featured badges</strong><button type="button" data-achievement-choose>Choose badges</button></div><p class="achievement-featured-note" data-achievement-featured-note></p>';
    const savedSlots=slots(doc,featured,'Saved featured badges');
    panel.classList.add('profile-achievements-panel');
    panel.innerHTML=`<div class="achievement-heading"><h3 id="achievement-heading-${id}" tabindex="-1" data-achievements-heading>Achievements</h3><p>Earn them as you play. Choose up to three to show with your profile in rankings, groups and friends.</p></div><p class="achievement-counter" data-achievement-counter></p><div class="achievement-draft-preview" data-achievement-draft-preview><strong data-achievement-preview-label>Saved badges</strong></div><div class="achievement-collection" role="group" aria-label="Choose featured badges" data-achievement-collection></div><div class="achievement-actions"><button class="btn" type="button" data-achievement-save>Save badges</button><button class="btn-light" type="button" data-achievement-cancel>Cancel</button><button class="btn-light" type="button" data-achievement-retry hidden>Try again</button><button class="btn" type="button" data-achievement-signin hidden>Sign in</button></div><p id="achievement-status-${id}" class="achievement-status" role="status" aria-live="polite" aria-atomic="true" data-achievement-status></p>`;
    const draftPreview=panel.querySelector('[data-achievement-draft-preview]');draftPreview.hidden=true;
    const draftSlots=slots(doc,draftPreview,'Badge selection preview');
    const guide=doc.createElement('details');guide.className='achievement-level-guide';
    const summary=doc.createElement('summary');text(summary,'The 10 badge levels');guide.append(summary);
    const scale=doc.createElement('ol');
    for(const material of BrainiAchievementCatalog.materials){
      const item=doc.createElement('li'),art=doc.createElement('span'),label=doc.createElement('span');
      if(window.BrainiAchievementDisplay)art.innerHTML=BrainiAchievementDisplay.emblemMarkup('first_game',material.level);
      text(label,`${material.level}. ${material.name}`);item.append(art,label);scale.append(item);
    }
    const explanation=doc.createElement('p');text(explanation,'Each step takes more effort. Every badge has its own milestones, and your chosen badges improve automatically. Streak badges use your best streak, so a break does not lower their level.');
    guide.append(scale,explanation);panel.querySelector('.achievement-heading').after(guide);
    const collection=panel.querySelector('[data-achievement-collection]'),choices=new Map();
    for(const badge of badges){
      const button=doc.createElement('button');button.type='button';button.className='achievement-choice';button.dataset.achievementId=badge.id;button.setAttribute('aria-pressed','false');
      const art=doc.createElement('span');art.className='achievement-choice-art';art.setAttribute('aria-hidden','true');art.append(image(doc,badge.id));
      const copy=doc.createElement('span');copy.className='achievement-choice-copy';
      const name=doc.createElement('strong');text(name,badge.name);
      const description=doc.createElement('span');description.className='achievement-description';text(description,badge.description);
      const material=doc.createElement('span');material.className='achievement-material';material.dataset.achievementMaterial='';
      const details=doc.createElement('span');details.className='achievement-choice-details';
      const progress=doc.createElement('span');progress.className='achievement-progress';progress.dataset.achievementProgress='';
      const state=doc.createElement('span');state.className='achievement-choice-state';state.dataset.achievementState='';
      const bar=doc.createElement('progress');bar.className='achievement-tier-progress';bar.max=100;
      details.append(progress,state);copy.append(name,material,description,details,bar);button.append(art,copy);collection.append(button);
      choices.set(badge.id,{button,progress,state,material,art,bar});
    }
    const view={panel,featured,badges,savedSlots,draftSlots,choices,
      featuredNote:featured.querySelector('[data-achievement-featured-note]'),
      counter:panel.querySelector('[data-achievement-counter]'),
      previewLabel:panel.querySelector('[data-achievement-preview-label]'),
      save:panel.querySelector('[data-achievement-save]'),cancel:panel.querySelector('[data-achievement-cancel]'),
      retry:panel.querySelector('[data-achievement-retry]'),signin:panel.querySelector('[data-achievement-signin]'),
      status:panel.querySelector('[data-achievement-status]')};
    views.set(root,view);return view;
  }
  function render(root,{state={},draft=[],dirty=false,feedback=''}={}){
    const view=mount(root);if(!view)return;
    const {badges}=view,earned=new Set(Array.isArray(state.earned)?state.earned:[]);
    const available=state.available===true,loading=state.loading===true,saving=state.saving===true,busy=loading||saving,waiting=!available&&state.waitingForProgress===true;
    const saved=clean(state.selected,badges).filter(id=>available&&earned.has(id));
    const selected=clean(draft,badges).filter(id=>available&&earned.has(id));
    const earnedCount=badges.filter(badge=>available&&earned.has(badge.id)).length;
    const error=message(state.error),notice=message(feedback)||message(state.notice);
    view.panel.setAttribute('aria-busy',String(busy));
    renderSlots(view.savedSlots,saved,badges,state.evidence);renderSlots(view.draftSlots,selected,badges,state.evidence);
    text(view.featuredNote,waiting?'Waiting for saved progress…':loading&&!available?'Checking saved badges…':!available?'Saved badges are not available yet.':saved.length?'Shown with your profile in rankings, groups and friends.':'Choose up to 3 earned badges.');
    text(view.previewLabel,'Preview — not saved');
    const preview=view.panel.querySelector('[data-achievement-draft-preview]');
    preview.hidden=!dirty;preview.classList.toggle('is-dirty',!!dirty);
    text(view.counter,available?`${earnedCount} of ${badges.length} earned · ${selected.length} of 3 selected${selected.length===3?' · Remove one to choose another.':''}`:waiting?'Waiting for saved progress…':loading?'Checking saved achievements…':state.cloud?'Saved progress could not be checked.':'Sign in to check your saved achievements.');
    for(const badge of badges){
      const choice=view.choices.get(badge.id),isEarned=available&&earned.has(badge.id),isSelected=selected.includes(badge.id);
      const capped=selected.length===3&&!isSelected,tier=BrainiAchievementCatalog.state(badge.id,available?state.evidence:null),current=tier?.current,next=tier?.next;
      choice.button.disabled=busy||!!error||!available||!isEarned||capped;
      choice.button.setAttribute('aria-pressed',String(isSelected));
      choice.button.dataset.state=!available?'unknown':isSelected?'selected':isEarned?'earned':'locked';
      const units={totalGames:'saved games',fullDailyCount:'Daily completions',bestStreak:'best streak days',personalBestGames:'games with a personal best'};
      const conditions=tier?.progress.conditions.filter(({target})=>target>0).map(({metric,value,target})=>`${formatted(Math.min(value,target))} of ${formatted(target)} ${units[metric]}`).join(' · ');
      const detail=!available?'Progress unavailable':next?`${current?'Next: '+next.material:'Unlock Paper'} · ${conditions}`:'Highest level reached';
      const status=!available?'':isSelected?'Selected':!isEarned?'Not earned yet':capped?'Choose up to 3':'Earned';
      const levelLabel=current?`${current.material} · Level ${current.level} of 10`:available?'Paper · Level 1 of 10':'10 levels';
      text(choice.material,levelLabel);paintArt(choice.art,badge.id,current?.level||1);
      text(choice.progress,detail);text(choice.state,status);
      choice.bar.hidden=!available;choice.bar.value=Math.round((tier?.progress.ratio||0)*100);
      choice.bar.setAttribute('aria-label',`${badge.name}. ${next?'Progress toward '+next.material:'Highest level reached'}. ${conditions||''}`);
      choice.button.setAttribute('aria-label',`${badge.name}. ${levelLabel}. ${badge.description} ${detail}.${status?' '+status+'.':''}`);
    }
    view.save.disabled=!dirty||busy||!!error||!available||!state.cloud;
    view.cancel.disabled=!dirty||saving;
    view.save.hidden=view.cancel.hidden=!state.cloud;
    text(view.save,saving?'Saving…':'Save badges');
    view.signin.hidden=!!state.cloud||loading;
    view.retry.hidden=!state.cloud||busy||(!error&&available);
    const status=saving?'Saving your badges…':loading?'Checking saved achievements…':waiting?'Waiting for your saved progress. Your badges will load when it arrives.':error||notice||(dirty?'Preview only. Save badges to update your profile.':available&&!earnedCount?'No badges earned yet. Finish a game to reach your first milestone.':'');
    text(view.status,status);view.status.classList.toggle('is-error',!busy&&!waiting&&!!error);
  }
  return Object.freeze({mount,render});
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

/* ===== profile-achievements.js ===== */

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
