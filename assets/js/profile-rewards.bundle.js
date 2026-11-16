/* ===== profile-rewards-store.js ===== */

window.BrainiRewardStore=(function(){
  const catalog=BrainiRewardCatalog;
  const prefix='brainilab-profile-style-v1:';
  // Separate top-level metadata keys avoid overwriting unrelated settings or
  // a frame/title saved independently in a second tab. These are not claims.
  const keys=catalog.metadataKeys;
  let owner=null,saved=catalog.clean(),loading=false,saving=false,error='',notice='',generation=0;
  let academy=[],discovery=[],activeDays=0;
  function identity(){
    const auth=BrainiData.authState();
    return auth.status==='authenticated'&&auth.user?.id
      ? {id:'account:'+auth.user.id,uid:auth.user.id,cloud:true}
      : {id:'guest:'+(auth.guestUserId||auth.anonymousPlayerId||'browser'),cloud:false};
  }
  const total=()=>catalog.xp(BrainiData.player().xp);
  const entitlements=()=>window.BrainiHalloweenEntitlements?.snapshot?.().entitlements||[];
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
  function snapshot(){return {owner:owner?.id,style:catalog.available(saved,total(),academy,discovery,activeDays),academy:academy.slice(),discovery:discovery.slice(),activeDays,entitlements:entitlements(),loading,saving,error,notice,cloud:!!owner?.cloud};}
  async function readDiscovery(sb,uid){
    const result=await bounded(sb.rpc('get_my_brainilab_discoveries'));
    if(result.error||result.data?.owner!==uid||!Array.isArray(result.data?.games)||!Number.isSafeInteger(result.data?.activeDays)||result.data.activeDays<0)throw Error('Discovery progress unavailable');
    return {games:catalog.gameIds(result.data.games),activeDays:result.data.activeDays};
  }
  async function readAcademy(sb,uid){
    // SELECT only. RLS binds this collection to the signed-in owner; metadata,
    // local reading progress and XP cannot grant course rewards.
    const result=await bounded(sb.from('learn_avatar_unlocks').select('reward_id').eq('user_id',uid));
    if(result.error||!Array.isArray(result.data))throw Error('Academy rewards unavailable');
    return catalog.academyIds(result.data.map(row=>row.reward_id));
  }
  async function load(){
    const current=identity();
    if(owner?.id===current.id&&(loading||saving))return;
    const same=owner?.id===current.id;
    const run=++generation;owner=current;if(!same){academy=[];discovery=[];activeDays=0;}saved=cached(current.id);error='';notice='';
    loading=current.cloud;emit();
    if(!current.cloud){await window.BrainiHalloweenEntitlements?.load?.();if(run!==generation||identity().id!==current.id)return;applyDesign();return;}
    try{
      const sb=window.BrainiBackendAuth?.getClient?.();
      if(!sb)throw Error('Profile connection unavailable');
      const {data,error:readError}=await bounded(sb.auth.getUser());
      if(readError)throw readError;
      if(run!==generation||identity().id!==current.id)return;
      if(data?.user?.id!==current.uid)throw Error('Account changed');
      const [collection,played]=await Promise.all([readAcademy(sb,current.uid),readDiscovery(sb,current.uid),window.BrainiHalloweenEntitlements?.load?.()]);
      if(run!==generation||identity().id!==current.id)return;
      academy=collection;
      discovery=played.games;activeDays=played.activeDays;
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
    const requested=catalog.clean(value),allowed=catalog.available(requested,total(),academy,discovery,activeDays);
    if(Object.keys(keys).some(key=>requested[key]!==allowed[key])){
      error='That extra is still locked. Check its course, challenge or XP requirement. Nothing has been spent.';emit();return false;
    }
    const changed=Object.keys(keys).filter(key=>allowed[key]!==catalog.available(saved,total(),academy,discovery,activeDays)[key]);
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
        if(changed.some(key=>catalog.groups[key].find(item=>item.id===allowed[key])?.course)){
          const collection=await readAcademy(sb,current.uid);
          if(run!==generation||identity().id!==current.id)return false;
          academy=collection;
        }
        if(changed.some(key=>{const item=catalog.groups[key].find(item=>item.id===allowed[key]);return item?.challenge||item?.days;})){
          const played=await readDiscovery(sb,current.uid);
          if(run!==generation||identity().id!==current.id)return false;
          discovery=played.games;activeDays=played.activeDays;
        }
        if(changed.some(key=>['pumpkin-thinker','midnight','little-bat'].includes(allowed[key])))await window.BrainiHalloweenEntitlements?.load?.();
        if(run!==generation||identity().id!==current.id)return false;
        const currentAllowed=catalog.available(allowed,total(),academy,discovery,activeDays);
        if(Object.keys(keys).some(key=>currentAllowed[key]!==allowed[key]))throw Error('Reward eligibility changed');
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
  window.addEventListener('brainilab:halloween-entitlements',()=>{if(identity().id===owner?.id){applyDesign();emit();}});
  window.addEventListener('storage',event=>{
    if(owner&&!owner.cloud&&event.key===prefix+owner.id){saved=cached(owner.id);applyDesign();emit();}
  });
  window.addEventListener('online',()=>{if(owner?.cloud)load();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&owner?.cloud)load();});
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

/* ===== avatar-studio-art.js ===== */

/* Layered Avatar Studio artwork from the BrainiLab design handoff. */
window.BrainiAvatarStudioArt=(()=>{
  const A=BrainiAvatarDesign,C=BrainiRewardCatalog;
  const glasses={
    round: `<g fill="#FFFFFF" fill-opacity=".18" stroke="#181729" stroke-width="3"><circle cx="84" cy="96" r="13"></circle><circle cx="116" cy="96" r="13"></circle></g><path d="M97 94 Q100 90 103 94 M71 94 L60 92 M129 94 L140 92" stroke="#181729" stroke-width="3" fill="none" stroke-linecap="round"></path>`,
    square: `<g fill="#FFFFFF" fill-opacity=".18" stroke="#2D296E" stroke-width="3.5"><rect x="69" y="86" width="30" height="21" rx="6"></rect><rect x="101" y="86" width="30" height="21" rx="6"></rect></g><path d="M69 92 L60 90 M131 92 L140 90" stroke="#2D296E" stroke-width="3.5" stroke-linecap="round"></path>`,
    heart: `<g fill="#F0607A" fill-opacity=".42" stroke="#E52720" stroke-width="3" stroke-linejoin="round"><path d="M84 109 C71 101 68 92 73 87 C77 83 83 85 84 90 C85 85 91 83 95 87 C100 92 97 101 84 109 Z"></path><path d="M116 109 C103 101 100 92 105 87 C109 83 115 85 116 90 C117 85 123 83 127 87 C132 92 129 101 116 109 Z"></path></g><path d="M96 91 Q100 88 104 91 M70 91 L60 90 M130 91 L140 90" stroke="#E52720" stroke-width="3" fill="none" stroke-linecap="round"></path>`,
    star: `<g fill="#FFD813" fill-opacity=".5" stroke="#E6680C" stroke-width="2.6" stroke-linejoin="round"><path d="M84 81 L88.1 90.3 L98.3 91.4 L90.7 98.2 L92.8 108.1 L84 103 L75.2 108.1 L77.3 98.2 L69.7 91.4 L79.9 90.3 Z"></path><path d="M116 81 L120.1 90.3 L130.3 91.4 L122.7 98.2 L124.8 108.1 L116 103 L107.2 108.1 L109.3 98.2 L101.7 91.4 L111.9 90.3 Z"></path></g><path d="M98.3 91.4 L101.7 91.4 M69.7 91.4 L60 90 M130.3 91.4 L140 90" stroke="#E6680C" stroke-width="2.6" stroke-linecap="round"></path>`,
    monocle: `<circle cx="116" cy="96" r="14" fill="#FFFFFF" fill-opacity=".2" stroke="#C79A2B" stroke-width="3.5"></circle><path d="M128 104 Q142 130 128 156" stroke="#C79A2B" stroke-width="2" fill="none" stroke-dasharray="2 3" stroke-linecap="round"></path>`,
    doughnut: `<g fill="none"><circle cx="84" cy="96" r="12.5" stroke="#D9A06B" stroke-width="8"></circle><circle cx="116" cy="96" r="12.5" stroke="#D9A06B" stroke-width="8"></circle><circle cx="84" cy="96" r="12.5" stroke="#F08BB0" stroke-width="5.5"></circle><circle cx="116" cy="96" r="12.5" stroke="#F08BB0" stroke-width="5.5"></circle></g><g stroke-width="1.8" stroke-linecap="round"><path d="M76 86 L78.5 84.5 M108 86 L110.5 84.5" stroke="#FFD813"></path><path d="M91 85 L93 87 M123 85 L125 87" stroke="#2F7FE0"></path><path d="M72.5 99 L72.5 102 M104.5 99 L104.5 102" stroke="#40AB34"></path><path d="M94 103 L92 105 M126 103 L124 105" stroke="#FFFFFF"></path></g><path d="M96 94 Q100 90 104 94" stroke="#D9A06B" stroke-width="3" fill="none" stroke-linecap="round"></path>`
  };
  const hats={
    beanie: `<path d="M54 72 C54 38 76 24 100 24 C124 24 146 38 146 72 Z" fill="#E52720"></path><path d="M74 34 Q86 28 98 28" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".3"></path><rect x="50" y="60" width="100" height="20" rx="10" fill="#B31E19"></rect><path d="M62 62 V78 M74 62 V78 M86 62 V78 M98 62 V78 M110 62 V78 M122 62 V78 M134 62 V78" stroke="#000000" stroke-opacity=".15" stroke-width="2"></path><circle cx="100" cy="22" r="11" fill="#FFF8D2"></circle>`,
    corn: `<path d="M86 62 C72 48 72 26 80 12 C84 30 90 42 98 52 Z" fill="#40AB34"></path><path d="M114 62 C128 48 128 26 120 12 C116 30 110 42 102 52 Z" fill="#2E8A26"></path><ellipse cx="100" cy="32" rx="15" ry="27" fill="#FFD813" stroke="#E6A100" stroke-width="2"></ellipse><path d="M87 20 H113 M85 30 H115 M86 40 H114 M90 50 H110 M95 7 V58 M105 7 V58" stroke="#E6A100" stroke-width="1.6" opacity=".75"></path><path d="M82 66 C86 54 94 50 100 57 C106 50 114 54 118 66 Z" fill="#7FCB4F"></path>`,
    cloud: `<path d="M78 46 L75 53 M124 46 L121 53 M88 50 L86 55" stroke="#2F7FE0" stroke-width="2.5" stroke-linecap="round"></path><g fill="#B7B4DE"><circle cx="80" cy="26" r="14"></circle><circle cx="100" cy="18" r="18"></circle><circle cx="122" cy="26" r="14"></circle><rect x="66" y="24" width="70" height="18" rx="9"></rect></g><rect x="66" y="32" width="70" height="10" rx="5" fill="#8C88C9" opacity=".6"></rect><path d="M104 38 L94 56 L102 56 L96 72 L114 50 L105 50 L111 38 Z" fill="#FFD813" stroke="#E6A100" stroke-width="1.5" stroke-linejoin="round"></path>`,
    coffee: `<path d="M90 20 C86 14 94 10 90 4 M110 20 C106 14 114 10 110 4" stroke="#B9BCC8" stroke-width="2.5" fill="none" stroke-linecap="round"></path><path d="M124 38 C140 38 140 58 124 58" stroke="#DCDAEB" stroke-width="9" fill="none"></path><path d="M124 38 C140 38 140 58 124 58" stroke="#FFFFFF" stroke-width="5" fill="none"></path><path d="M72 30 L128 30 L122 68 L78 68 Z" fill="#FFFFFF" stroke="#DCDAEB" stroke-width="2" stroke-linejoin="round"></path><path d="M75 50 L125 50 L124 57 L76 57 Z" fill="#E6680C"></path><ellipse cx="100" cy="30" rx="28" ry="6" fill="#8A5A3B"></ellipse><path d="M100 34 C96 31 95 28 97 27 C98.5 26 100 27 100 28.5 C100 27 101.5 26 103 27 C105 28 104 31 100 34 Z" fill="#FFF1DD"></path>`,
    wizard: `<path d="M110 -18 C104 10 92 30 62 62 L138 62 C126 40 118 16 110 -18 Z" fill="#5B55D6"></path><path d="M64 52 L136 52 L139 60 L61 60 Z" fill="#FFD813"></path><ellipse cx="100" cy="63" rx="58" ry="11" fill="#2D296E"></ellipse><path d="M96 22 L97.8 27.2 L103 29 L97.8 30.8 L96 36 L94.2 30.8 L89 29 L94.2 27.2 Z" fill="#FFD813"></path><path d="M112 4 L113.2 7.8 L117 9 L113.2 10.2 L112 14 L110.8 10.2 L107 9 L110.8 7.8 Z" fill="#FFFFFF"></path><circle cx="84" cy="44" r="2.2" fill="#FFFFFF"></circle>`,
    graduate: `<path d="M62 62 C62 44 138 44 138 62 L138 70 C122 64 78 64 62 70 Z" fill="#181729"></path><path d="M100 20 L164 42 L100 64 L36 42 Z" fill="#2D296E"></path><path d="M100 20 L164 42 L100 52 L36 42 Z" fill="#FFFFFF" opacity=".08"></path><path d="M100 42 L150 48 L150 72" stroke="#FFD813" stroke-width="3" fill="none" stroke-linecap="round"></path><path d="M146 72 L154 72 L156 84 L144 84 Z" fill="#FFD813"></path><circle cx="100" cy="42" r="4.5" fill="#FFD813"></circle>`
  };
  const extras={
    cookie: `<circle cx="170" cy="170" r="14" fill="#D9A06B"></circle><circle cx="170" cy="170" r="14" fill="none" stroke="#A86B45" stroke-width="2"></circle><g fill="#5B3A26"><circle cx="164" cy="164" r="2.6"></circle><circle cx="175" cy="166" r="2.2"></circle><circle cx="167" cy="176" r="2.6"></circle><circle cx="177" cy="176" r="1.8"></circle></g>`,
    peas: `<path d="M153 177 C157 160 178 155 188 161 C184 176 165 185 153 177 Z" fill="#40AB34"></path><g fill="#9BDB5E"><circle cx="162" cy="173" r="4.6"></circle><circle cx="171" cy="168.5" r="4.6"></circle><circle cx="180" cy="164" r="4.6"></circle></g><path d="M188 161 L192 156" stroke="#2E8A26" stroke-width="2.2" stroke-linecap="round"></path>`,
    train: `<circle cx="161" cy="151" r="3" fill="#B9BCC8"></circle><circle cx="156" cy="146" r="2.3" fill="#B9BCC8"></circle><rect x="159" y="157" width="5" height="9" rx="1" fill="#181729"></rect><rect x="156" y="165" width="27" height="14" rx="3" fill="#2D296E"></rect><rect x="171" y="155" width="13" height="13" rx="2" fill="#E52720"></rect><rect x="174" y="158" width="7" height="5" rx="1" fill="#D8EEFF"></rect><path d="M156 172 L151 181 L156 181 Z" fill="#FFD813"></path><circle cx="162" cy="181" r="3.6" fill="#181729"></circle><circle cx="177" cy="181" r="3.6" fill="#181729"></circle>`,
    owl: `<path d="M157 161 L159 152 L165 158 Z M183 161 L181 152 L175 158 Z" fill="#A86B45"></path><ellipse cx="170" cy="172" rx="14" ry="15" fill="#A86B45"></ellipse><ellipse cx="170" cy="178" rx="8.5" ry="8" fill="#F2C29E"></ellipse><circle cx="164" cy="166" r="5.2" fill="#FFFFFF"></circle><circle cx="176" cy="166" r="5.2" fill="#FFFFFF"></circle><circle cx="164.6" cy="166.4" r="2.5" fill="#181729"></circle><circle cx="176.6" cy="166.4" r="2.5" fill="#181729"></circle><path d="M168 171 L172 171 L170 175 Z" fill="#E6680C"></path>`,
    pencil: `<g transform="rotate(40 170 170)"><rect x="163" y="151" width="14" height="6" rx="2" fill="#F08BB0"></rect><rect x="163" y="156" width="14" height="3.5" fill="#B9BCC8"></rect><rect x="163" y="159" width="14" height="21" fill="#FFD813"></rect><path d="M170 159 V180" stroke="#E6A100" stroke-width="1.5"></path><path d="M163 180 L177 180 L170 191 Z" fill="#F2C29E"></path><path d="M168 187 L172 187 L170 191 Z" fill="#181729"></path></g>`,
    nacho: `<path d="M170 153 L187 182 L153 182 Z" fill="#FFC23D" stroke="#E6A100" stroke-width="2" stroke-linejoin="round"></path><path d="M160 171 C164 167 176 167 180 171 C178 175 176 173 174 177 C172 173 168 175 166 173 C164 176 162 175 160 171 Z" fill="#FFE36E"></path><g fill="#E6680C"><circle cx="168" cy="163" r="1.5"></circle><circle cx="176" cy="178" r="1.5"></circle><circle cx="162" cy="178" r="1.3"></circle><circle cx="171" cy="179" r="1.1"></circle></g>`,
    rocket: `<path d="M170 149 C179 155 181 168 176 181 L164 181 C159 168 161 155 170 149 Z" fill="#E52720"></path><circle cx="170" cy="164" r="3.8" fill="#D8EEFF" stroke="#2D296E" stroke-width="1.5"></circle><path d="M164 172 L157 183 L164 181 Z M176 172 L183 183 L176 181 Z" fill="#2D296E"></path><path d="M165 182 Q170 193 175 182 Z" fill="#FFD813"></path>`,
    book: `<path d="M155 160 L170 164 L185 160 L185 180 L170 184 L155 180 Z" fill="#40AB34"></path><path d="M170 164 V184" stroke="#FFFFFF" stroke-width="2"></path><path d="M159 166 L166 168 M159 171 L166 173 M174 168 L181 166 M174 173 L181 171" stroke="#FFFFFF" stroke-width="1.5" opacity=".7"></path><circle cx="181" cy="157" r="3.5" fill="#7FCB4F"></circle><circle cx="186" cy="154" r="3.5" fill="#7FCB4F"></circle><circle cx="187.5" cy="153" r="1" fill="#181729"></circle>`,
    bulb: `<path d="M161 151 L157 147 M179 151 L183 147 M170 147 V142" stroke="#E6680C" stroke-width="2.5" stroke-linecap="round"></path><circle cx="170" cy="164" r="11" fill="#FFD813" stroke="#E6A100" stroke-width="2"></circle><rect x="164.5" y="173" width="11" height="9" rx="2.5" fill="#737286"></rect><path d="M165 177 H175" stroke="#FFFFFF" stroke-width="1.5"></path>`
  };
  function paletteFor(look){
    return Object.fromEntries(['skin','hairColor','shirt','background'].map(kind=>[kind,C.item(kind,look[kind]).color]));
  }
  function markup(look,{instance,level=1,levelPct=0,stickerScale=1}){
    const id='avatar-art-'+instance,palette=paletteFor(look),arc=Math.round(1000*levelPct)+' 1000';
    const backHair={waves:'longBack',bob:'bobBack',braids:'braids',ponytail:'pony',curls:'curlsBack'}[look.hair];
    const frontHair={sweep:'sweep',crop:'crop',curls:'curls',bald:'none',bob:'part',waves:'part',braids:'part',ponytail:'part'}[look.hair];
    const hairArt={
      curlsBack: `<g fill="${palette.hairColor}"><circle cx="56" cy="94" r="14"></circle><circle cx="144" cy="94" r="14"></circle><circle cx="58" cy="72" r="16"></circle><circle cx="142" cy="72" r="16"></circle></g>`,
      longBack: `<path d="M50 92 C46 46 76 30 100 30 C124 30 154 46 150 92 L156 156 C144 166 126 164 118 156 L82 156 C74 164 56 166 44 156 Z" fill="${palette.hairColor}"></path>`,
      bobBack: `<path d="M52 92 C50 48 76 32 100 32 C124 32 150 48 148 92 L150 128 C140 136 126 136 120 128 L80 128 C74 136 60 136 50 128 Z" fill="${palette.hairColor}"></path>`,
      braids: `<g fill="${palette.hairColor}"><path d="M54 92 C52 50 76 34 100 34 C124 34 148 50 146 92 L146 112 L54 112 Z"></path><circle cx="55" cy="114" r="10"></circle><circle cx="55" cy="131" r="9"></circle><circle cx="55" cy="147" r="8"></circle><circle cx="145" cy="114" r="10"></circle><circle cx="145" cy="131" r="9"></circle><circle cx="145" cy="147" r="8"></circle></g><circle cx="55" cy="159" r="4.5" fill="#FFD813"></circle><circle cx="145" cy="159" r="4.5" fill="#FFD813"></circle>`,
      pony: `<path d="M134 52 C170 52 180 100 164 140 C158 118 150 100 138 90 Z" fill="${palette.hairColor}"></path><circle cx="140" cy="58" r="6" fill="#FFD813"></circle>`,
      curls: `<g fill="${palette.hairColor}"><circle cx="64" cy="74" r="15"></circle><circle cx="76" cy="57" r="16"></circle><circle cx="94" cy="48" r="17"></circle><circle cx="112" cy="48" r="17"></circle><circle cx="128" cy="57" r="16"></circle><circle cx="138" cy="74" r="15"></circle><circle cx="84" cy="66" r="10"></circle><circle cx="118" cy="66" r="10"></circle><circle cx="100" cy="62" r="11"></circle></g><g fill="#FFFFFF" opacity=".22"><circle cx="90" cy="42" r="4"></circle><circle cx="110" cy="42" r="4"></circle><circle cx="72" cy="52" r="3.5"></circle></g>`,
      sweep: `<path d="M56 90 C52 50 80 34 106 36 C134 38 150 60 144 92 C140 78 132 70 122 66 C108 74 84 74 66 70 C60 76 57 82 56 90 Z" fill="${palette.hairColor}"></path><path d="M84 47 Q104 40 124 48" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".25"></path>`,
      crop: `<path d="M58 86 C56 52 80 40 100 40 C122 40 144 52 142 86 C138 74 128 64 100 62 C74 64 62 74 58 86 Z" fill="${palette.hairColor}"></path><path d="M86 48 Q100 44 114 48" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".22"></path>`,
      part: `<path d="M56 94 C52 52 78 36 100 36 C122 36 148 52 144 94 C140 76 130 64 112 58 C108 66 100 70 100 70 C100 70 92 64 88 58 C70 64 60 76 56 94 Z" fill="${palette.hairColor}"></path><path d="M70 56 Q80 46 92 44" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" opacity=".22"></path>`,
      none: `<ellipse cx="86" cy="58" rx="14" ry="6" fill="#FFFFFF" opacity=".28" transform="rotate(-18 86 58)"></ellipse>`,
    };
    const hair={
      [backHair]:hairArt[backHair],
      [frontHair]:hairArt[frontHair]
    };
    const sticker='translate(170 170) scale('+stickerScale+') translate(-170 -170)';
    const frame=look.frame==='midnight'?'level':look.frame;
  const frames={
    level: `<circle cx="100" cy="100" r="104" fill="none" stroke="#2D296E" stroke-width="10"></circle><circle cx="100" cy="100" r="104" fill="none" stroke="#FFD813" stroke-width="10" stroke-linecap="round" pathLength="1000" stroke-dasharray="${arc}" transform="rotate(-90 100 100)"></circle><circle cx="100" cy="206" r="15" fill="#FFD813" stroke="#2D296E" stroke-width="3.5"></circle><text x="100" y="211.5" text-anchor="middle" font-size="15" font-weight="700" fill="#2D296E">${level}</text>`,
    blue: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-sky)" stroke-width="10"></circle><circle cx="100" cy="100" r="99" fill="none" stroke="#FFFFFF" stroke-width="2" opacity=".8"></circle><g fill="#FFFFFF" stroke="#2F7FE0" stroke-width="2"><path d="M14 52 a9 9 0 0 1 17 -2 a7 7 0 0 1 4 13 h-19 a6 6 0 0 1 -2 -11 z"></path><path d="M172 150 a8 8 0 0 1 15 -2 a6 6 0 0 1 3 11 h-17 a5 5 0 0 1 -1 -9 z"></path></g>`,
    green: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-green)" stroke-width="10"></circle><g fill="#40AB34"><ellipse cx="22" cy="44" rx="11" ry="5.5" transform="rotate(-45 22 44)"></ellipse><ellipse cx="36" cy="28" rx="9" ry="4.5" transform="rotate(-20 36 28)" fill="#7FCB4F"></ellipse><ellipse cx="184" cy="160" rx="11" ry="5.5" transform="rotate(-45 184 160)"></ellipse><ellipse cx="170" cy="178" rx="9" ry="4.5" transform="rotate(-70 170 178)" fill="#7FCB4F"></ellipse></g>`,
    copper: `<circle cx="100" cy="100" r="115" fill="none" stroke="#C8693A" stroke-width="3" stroke-dasharray="1.5 7"></circle><circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-copper)" stroke-width="11"></circle><circle cx="100" cy="100" r="98.5" fill="none" stroke="#5A260F" stroke-width="1.5" opacity=".5"></circle>`,
    gold: `<circle cx="100" cy="100" r="104" fill="none" stroke="url(#${id}-g-gold)" stroke-width="12"></circle><circle cx="100" cy="100" r="98" fill="none" stroke="#FFF6C4" stroke-width="1.5"></circle><g fill="#FFD813" stroke="#D99200" stroke-width="1.5"><path d="M18 40 L21 49 L30 52 L21 55 L18 64 L15 55 L6 52 L15 49 Z"></path><path d="M186 30 L188 36 L194 38 L188 40 L186 46 L184 40 L178 38 L184 36 Z"></path><path d="M190 146 L192.5 153.5 L200 156 L192.5 158.5 L190 166 L187.5 158.5 L180 156 L187.5 153.5 Z"></path></g>`,
    orbit: `<circle cx="100" cy="100" r="104" fill="none" stroke="#2D296E" stroke-width="5"></circle><circle cx="100" cy="100" r="113" fill="none" stroke="#5B55D6" stroke-width="1.5" stroke-dasharray="3 5" opacity=".7"></circle><g class="avatar-orbit"><circle cx="100" cy="-13" r="7" fill="#FFD813" stroke="#2D296E" stroke-width="2"></circle><circle cx="2" cy="156" r="5.5" fill="#E6680C" stroke="#2D296E" stroke-width="2"></circle><circle cx="198" cy="156" r="4.5" fill="#40AB34" stroke="#2D296E" stroke-width="2"></circle></g>`
  };
    return `<svg class="avatar-studio-drawing" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" aria-hidden="true" focusable="false">
    <defs>
    <clipPath id="${id}-disc"><circle cx="100" cy="100" r="98"></circle></clipPath>
    <linearGradient id="${id}-g-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F7FE0"></stop><stop offset="1" stop-color="#9AD6FF"></stop></linearGradient>
    <linearGradient id="${id}-g-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E8A26"></stop><stop offset="1" stop-color="#A6E06A"></stop></linearGradient>
    <linearGradient id="${id}-g-copper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E3F1D"></stop><stop offset=".5" stop-color="#E08A55"></stop><stop offset="1" stop-color="#9A4521"></stop></linearGradient>
    <linearGradient id="${id}-g-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D99200"></stop><stop offset=".45" stop-color="#FFE36E"></stop><stop offset="1" stop-color="#E6A100"></stop></linearGradient>
    </defs>
    <g transform="translate(20 20)">
    <g clip-path="url(#${id}-disc)">
    <circle cx="100" cy="100" r="98" fill="${palette.background}"></circle>
    <circle cx="38" cy="46" r="26" fill="#FFFFFF" opacity=".4"></circle>
    <circle cx="170" cy="58" r="13" fill="#FFFFFF" opacity=".35"></circle>
    <circle cx="168" cy="150" r="44" fill="#181729" opacity=".04"></circle>

    ${hair.longBack||''}
    ${hair.bobBack||''}
    ${hair.braids||''}
    ${hair.pony||''}
    ${hair.curlsBack||''}

    <path d="M28 206 C30 166 60 148 100 148 C140 148 170 166 172 206 Z" fill="${palette.shirt}"></path>
    <path d="M100 148 C88 148 78 150 70 154 L100 182 L130 154 C122 150 112 148 100 148 Z" fill="#000000" opacity=".16"></path>
    <rect x="87" y="118" width="26" height="42" rx="12" fill="${palette.skin}"></rect>
    <path d="M87 128 L113 128 L113 138 Q100 148 87 138 Z" fill="#000000" opacity=".12"></path>
    <path d="M80 152 L100 172 L120 152" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"></path>
    <path d="M44 176 C52 166 60 162 66 162" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity=".18"></path>

    <circle cx="58" cy="98" r="10" fill="${palette.skin}"></circle>
    <circle cx="142" cy="98" r="10" fill="${palette.skin}"></circle>
    <circle cx="58" cy="98" r="4.5" fill="#000000" opacity=".1"></circle>
    <circle cx="142" cy="98" r="4.5" fill="#000000" opacity=".1"></circle>
    <ellipse cx="100" cy="92" rx="42" ry="46" fill="${palette.skin}"></ellipse>
    <path d="M62 104 C66 126 82 138 100 138 C118 138 134 126 138 104 C132 122 118 132 100 132 C82 132 68 122 62 104 Z" fill="#000000" opacity=".07"></path>
    <path d="M76 84 Q84 79 92 83" stroke="${palette.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"></path>
    <path d="M108 83 Q116 79 124 84" stroke="${palette.hairColor}" stroke-width="3.5" fill="none" stroke-linecap="round"></path>
    <ellipse cx="84" cy="96" rx="5" ry="6.2" fill="#181729"></ellipse>
    <ellipse cx="116" cy="96" rx="5" ry="6.2" fill="#181729"></ellipse>
    <circle cx="86" cy="93.6" r="1.8" fill="#FFFFFF"></circle>
    <circle cx="118" cy="93.6" r="1.8" fill="#FFFFFF"></circle>
    <ellipse cx="73" cy="110" rx="7" ry="4.5" fill="#F0607A" opacity=".24"></ellipse>
    <ellipse cx="127" cy="110" rx="7" ry="4.5" fill="#F0607A" opacity=".24"></ellipse>
    <path d="M100 100 Q96 108 101 110" stroke="#000000" stroke-opacity=".22" stroke-width="2.5" fill="none" stroke-linecap="round"></path>
    <path d="M89 117 Q100 127 111 117" stroke="#181729" stroke-width="3" fill="none" stroke-linecap="round"></path>

    ${hair.sweep||''}
    ${hair.crop||''}
    ${hair.part||''}
    ${hair.curls||''}
    ${hair.none||''}
    ${glasses[look.glasses]||A.accessory('glasses',look.glasses)}
    </g>
    ${frames[frame]}
    ${hats[look.hat]||A.accessory('hat',look.hat)}
    ${look.prop==='none'?'':`<g transform="${sticker}">
      <circle cx="172" cy="174" r="23" fill="#181729" opacity=".18"></circle>
      <circle cx="170" cy="170" r="23" fill="#fff" stroke="#e7e6f0" stroke-width="2"></circle>
      ${extras[look.prop]||`<svg x="153" y="150" width="35" height="37" viewBox="105 56 110 141">${A.accessory('prop',look.prop)}</svg>`}
    </g>`}
    </g>
    </svg>`;
  }
  return Object.freeze({markup});
})();

/* ===== avatar-studio-ui.js ===== */

window.BrainiAvatarStudioUI=(function(){
  const C=BrainiRewardCatalog,A=BrainiAvatarDesign;
  const panes={
    look:{label:'Your look',groups:{skin:'Skin tone',hairColor:'Hair colour',shirt:'Shirt',background:'Background'}},
    hair:{label:'Hair',groups:{hair:'Hair'}},
    glasses:{label:'Glasses',groups:{glasses:'Glasses'}},
    hat:{label:'Hats',groups:{hat:'Hats'}},
    prop:{label:'Extras',groups:{prop:'Extras'}},
    frame:{label:'Frames',groups:{frame:'Avatar frame'}},
    title:{label:'Titles',groups:{title:'Profile title'}},
    scene:{label:'Backgrounds',groups:{scene:'Profile background'}},
    challenges:{label:'Challenges',groups:{}},academy:{label:'Academy',groups:{}}
  };
  const cosmeticPanes=['glasses','hat','prop','frame','title','scene'];
  const slotLabels={hat:'Hat',glasses:'Glasses',prop:'Extra',frame:'Frame'};
  const icons={
    hat:'<path d="M3 15h18M5 15l2-8h10l2 8"/>',
    glasses:'<circle cx="6.5" cy="12" r="4"/><circle cx="17.5" cy="12" r="4"/><path d="M10.5 12h3"/>',
    prop:'<path d="m12 3 2.7 5.7 6.3.8-4.6 4.5 1.1 6.3-5.5-3-5.5 3 1.1-6.3L3 9.5l6.3-.8z"/>',
    frame:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/>',
    dice:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h.01m4 4h.01m4 4h.01" stroke-width="3"/>',
    reset:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6"/>'
  };
  function icon(name){
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  }
  if(window.BrainiAchievementCatalog)panes.badges={label:'Badges',groups:{}};
  let active='look',filter='all';
  const choiceViews=new WeakMap();
  const number=n=>n.toLocaleString('en-GB');
  const rarity=xp=>xp>=6000?'Legendary':xp>=3000?'Epic':xp>=1000?'Rare':xp>0?'Common':'Starter';
  function initialStatus(button,copy){if(!window.BrainiWardrobeUI)button.querySelector('small').textContent=copy;}
  function group(kind,name){
    const summary=cosmeticPanes.includes(kind)?`<small class="avatar-collection-summary" data-style-collection="${kind}"></small>`:'';
    return `<fieldset class="avatar-option-group"><legend><span class="avatar-option-heading"><span>${name}</span>${summary}</span></legend><div class="reward-grid reward-grid-${kind}" data-style-${kind}s></div><p class="avatar-item-note" data-avatar-note="${kind}" hidden></p></fieldset>`;
  }
  const escapeCopy=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function collectionSummary(root,total,options){
    for(const summary of root.querySelectorAll('[data-style-collection]')){
      const kind=summary.dataset.styleCollection,items=C.groups[kind].filter(item=>!item.course&&!item.challenge&&!item.days);
      const available=items.filter(item=>C.isUnlocked(item,total)).length;
      summary.textContent=options.loading?'Checking…':options.error?'Unavailable':`${available} of ${items.length} unlocked`;
      const count=root.querySelector(`[data-avatar-tab="${kind}"] [data-studio-tab-count]`);
      count.textContent=options.loading||options.error?'':`${available}/${items.length}`;
    }
  }
  function mount(root){
    choiceViews.delete(root);
    active='look';filter='all';
    root.classList.add('avatar-studio-redesign');
    root.innerHTML=`<div class="avatar-studio-layout">
      <div class="avatar-studio-sidebar">
        <section class="avatar-studio-stage" aria-label="Avatar preview">
          <div class="avatar-stage-heading"><h2>Avatar studio</h2><span data-avatar-level></span></div>
          <div class="avatar-stage-art">
            <button type="button" class="avatar-surprise" data-avatar-surprise aria-label="Surprise me with unlocked avatar items" title="Surprise me with unlocked avatar items">${icon('dice')}<span>Surprise me</span></button>
            <span class="avatar-preview-label" data-style-preview-label>Your avatar</span>
            <span class="rank-avatar avatar-studio-portrait" data-style-preview-avatar aria-hidden="true"></span>
            <div class="avatar-equipped" role="group" aria-label="Equipped">
              ${Object.entries(slotLabels).map(([kind,label])=>`<button type="button" data-studio-slot="${kind}">${icon(kind)}<span><small>${label}</small><strong></strong></span></button>`).join('')}
            </div>
          </div>
      <div class="avatar-stage-identity" data-diploma-tier="rookie" aria-label="BrainiLab progress diploma"><span class="avatar-diploma-ornament" aria-hidden="true"><svg viewBox="0 0 280 130" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g class="diploma-etched-corners"><path d="M10 30V10H30M250 10H270V30M10 100V120H30M250 120H270V100"/><path d="m13 23 10-10M257 13l10 10M13 107l10 10M257 117l10-10" stroke-width=".7"/></g><g class="diploma-scroll-corners"><path d="M9 37V17Q9 9 17 9H37M243 9H263Q271 9 271 17V37M9 93V113Q9 121 17 121H37M243 121H263Q271 121 271 113V93"/><path d="M12 25Q25 25 25 12M255 12Q255 25 268 25M12 105Q25 105 25 118M255 118Q255 105 268 105"/><path d="m134 9 6-4 6 4-6 4ZM134 121l6-4 6 4-6 4Z" fill="currentColor" stroke-width=".7"/></g><g class="diploma-laurel-corners"><path d="M13 40Q10 18 34 12M246 12Q270 18 267 40M13 90Q10 112 34 118M246 118Q270 112 267 90"/><path d="m15 29-6-6 8 2m3-6-2-7 7 4m-9 85-7 6 8-2m3 6-2 7 7-4m240-85 6-6-8 2m-3-6 2-7-7 4m10 85 6 6-8-2m-3 6 2 7-7-4"/><path d="M126 9H135M145 9H154M126 121H135M145 121H154"/><path d="m140 5 4 4-4 4-4-4ZM140 117l4 4-4 4-4-4Z" fill="currentColor"/></g></svg></span><div class="avatar-diploma-name"><strong data-style-preview-name></strong><span class="avatar-diploma-seal" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g data-diploma-mark="rookie"><circle cx="24" cy="23" r="15"/><path d="m24 15 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g><g data-diploma-mark="elementary"><circle cx="24" cy="24" r="17"/><path d="M24 34V19M24 26Q12 27 13 15Q25 14 24 26ZM24 22Q24 11 36 13Q37 24 24 22Z" fill="currentColor" fill-opacity=".16"/></g><g data-diploma-mark="highschool"><path d="m24 4 5 5 8 1 1 8 5 6-5 6-1 8-8 1-5 5-5-5-8-1-1-8-5-6 5-6 1-8 8-1Z" fill="currentColor" fill-opacity=".12"/><path d="m24 13 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/></g><g data-diploma-mark="college"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M15 16Q20 14 24 18Q28 14 33 16V30Q28 28 24 32Q20 28 15 30ZM24 18V32"/><path d="M18 21H21M27 21H30M18 25H21M27 25H30" stroke-width="1.5"/></g><g data-diploma-mark="graduate"><path d="M14 38Q2 24 11 10M34 38Q46 24 37 10M10 16 5 14M8 23 3 22M9 30 4 31M12 35 8 39M38 16 43 14M40 23 45 22M39 30 44 31M36 35 40 39"/><circle cx="24" cy="23" r="12" fill="currentColor" fill-opacity=".14"/><path d="m24 14 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="phd"><path d="m24 3 18 10v22L24 45 6 35V13Z" fill="currentColor" fill-opacity=".13"/><path d="m24 9 13 7v16l-13 7-13-7V16Z" stroke-width="1"/><path d="m24 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="currentColor"/></g><g data-diploma-mark="researcher"><circle cx="24" cy="24" r="4" fill="currentColor"/><ellipse cx="24" cy="24" rx="20" ry="8"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)"/></g><g data-diploma-mark="professor"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M14 20Q20 17 24 22Q28 17 34 20V33Q28 30 24 35Q20 30 14 33ZM24 22V35"/><path d="m24 10 1 3 4 1-3 2v3l-2-2-3 2 1-3-3-2 4-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="dean"><path d="M24 3 42 11V29Q36 39 24 45Q12 39 6 29V11Z" fill="currentColor" fill-opacity=".18"/><path d="m13 18 6 5 5-10 5 10 6-5-3 15H16ZM17 37H31" fill="currentColor" fill-opacity=".25"/><circle cx="13" cy="16" r="2" fill="currentColor"/><circle cx="24" cy="11" r="2" fill="currentColor"/><circle cx="35" cy="16" r="2" fill="currentColor"/></g><g data-diploma-mark="nobel"><path d="m24 2 5 5 8-1 2 8 7 5-4 7 1 9-8 2-5 8-7-4-9 2-3-8-8-5 4-8-1-8 8-3 4-8Z" fill="currentColor" fill-opacity=".22"/><circle cx="24" cy="24" r="14"/><path d="m24 12 3 8 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1Z" fill="currentColor" stroke-width="1"/></g></svg></span></div><p data-style-preview-title></p><small data-avatar-diploma-next></small></div>
          ${panes.badges?'<div data-featured-achievements></div>':''}
          <details class="avatar-help"><summary>About your look</summary><p class="avatar-storage-note" data-style-storage></p><p class="avatar-sharing-note" data-style-sharing></p></details>
        </section>
        <div class="avatar-mobile-preview avatar-apply-bar">
          <span data-avatar-mini aria-hidden="true"></span>
          <div class="avatar-apply-copy"><span data-avatar-mini-label></span><p class="profile-style-status" role="status" aria-live="polite" data-style-status></p></div>
          <div class="profile-style-actions">
            <button class="btn-light" type="button" data-style-cancel aria-label="Reset to saved look">${icon('reset')}<span>Reset</span></button>
            <button class="btn" type="button" data-style-save>Save look</button>
            <button class="btn-light" type="button" data-style-retry hidden>Try again</button>
          </div>
        </div>
      </div>
      <section class="avatar-studio-controls" aria-label="Locker">
        <div class="avatar-locker-header"><h3>Locker</h3><a class="avatar-play-link" href="/games/">Play for more XP →</a></div>
        <div class="avatar-studio-tabs" role="tablist" aria-label="Locker categories">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${p.label}${cosmeticPanes.includes(key)?'<span data-studio-tab-count></span>':''}</button>`).join('')}</div>
        <div class="avatar-next-reward" data-next-reward></div>
        <div class="avatar-locker-content">
          <div class="avatar-filter" data-studio-filters hidden>
            <div role="group" aria-label="Filter items">${[['all','All'],['unlocked','Unlocked'],['locked','Locked']].map(([key,label])=>`<button type="button" data-studio-filter="${key}">${label} <span></span></button>`).join('')}</div>
            <label class="avatar-filter-mobile"><input type="checkbox" data-studio-unlocked> Unlocked only</label>
          </div>
          <p class="avatar-filter-empty" data-studio-empty hidden>No items match this filter.</p>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='badges'?'<div data-achievements-panel></div>':''}${key==='challenges'?'<section class="avatar-day-collection" aria-labelledby="avatar-days-title"><h3 id="avatar-days-title" class="avatar-collection-heading">Days played</h3><p class="avatar-pane-note">A little time to play, whenever it suits you. Finish a saved game on different days to unlock these extras. Breaks never reset your progress. Earlier qualifying games count. Each date counts once, using UTC.</p><p class="avatar-academy-count" data-active-days-count></p><div class="avatar-challenge-grid" data-day-rewards></div></section><p class="avatar-pane-note">Try different games to earn a little extra. Completed rounds saved to your account count.</p><div class="avatar-challenge-grid" data-discovery-rewards></div>':''}${key==='academy'?'<p class="avatar-pane-note">Complete all lesson quizzes in a course while signed in. Earned extras stay yours.</p><p class="avatar-academy-count" data-academy-count></p><div class="avatar-academy-grid" data-academy-rewards></div>':''}${key==='look'?'<div class="avatar-mode" role="group" aria-labelledby="avatar-start-label"><h3 id="avatar-start-label">Start with</h3><div class="reward-mode-grid" data-style-modes></div></div>':''}${Object.entries(p.groups).map(([kind,name])=>group(kind,name)).join('')}</div>`).join('')}
        </div>
      </section></div>
      <section class="avatar-unlock-road" aria-label="Unlock road" data-studio-road hidden></section>`;
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
    root.querySelectorAll('[data-studio-filter]').forEach(button=>button.addEventListener('click',()=>{
      filter=button.dataset.studioFilter;
      applyFilter(root);
    }));
    root.querySelector('[data-studio-unlocked]').addEventListener('change',event=>{
      filter=event.target.checked?'unlocked':'all';
      applyFilter(root);
    });
    root.querySelectorAll('[data-studio-slot]').forEach(button=>button.addEventListener('click',()=>{
      showPane(root,button.dataset.studioSlot);
      root.querySelector(`[data-avatar-tab="${active}"]`).focus();
    }));
  }
  function applyFilter(root){
    const group=root.querySelector('[data-studio-filters]'),empty=root.querySelector('[data-studio-empty]');
    const enabled=cosmeticPanes.includes(active),panel=root.querySelector(`[data-avatar-pane="${active}"]`);
    group.hidden=!enabled;
    empty.hidden=true;
    if(!enabled)return;
    const cards=[...panel.querySelectorAll('[data-studio-locked]')];
    const locked=cards.filter(card=>card.dataset.studioLocked==='true').length;
    const counts={all:cards.length,unlocked:cards.length-locked,locked};
    for(const button of group.querySelectorAll('[data-studio-filter]')){
      const key=button.dataset.studioFilter;
      button.setAttribute('aria-pressed',String(key===filter));
      button.querySelector('span').textContent=counts[key];
    }
    group.querySelector('[data-studio-unlocked]').checked=filter==='unlocked';
    for(const card of cards){
      card.hidden=filter!=='all'&&card.dataset.studioLocked!==String(filter==='locked');
      if(card.hidden&&card===document.activeElement)root.querySelector(`[data-avatar-tab="${active}"]`).focus();
    }
    empty.hidden=counts[filter]>0;
  }
  function showPane(root,key){
    const next=Object.hasOwn(panes,key)?key:'look';
    if(next!==active)filter='all';
    active=next;
    root.dataset.studioPane=active;
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{const selected=tab.dataset.avatarTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-avatar-pane]').forEach(panel=>panel.hidden=panel.dataset.avatarPane!==active);
    root.querySelector('.avatar-apply-bar').hidden=active==='badges';
    for(const button of root.querySelectorAll('[data-studio-slot]'))button.classList.toggle('is-current',button.dataset.studioSlot===active);
    applyFilter(root);
    root.dispatchEvent(new CustomEvent('brainilab:avatarpanechange',{detail:{pane:active}}));
  }
  function equippedSlots(root,look,locked){
    for(const button of root.querySelectorAll('[data-studio-slot]')){
      const kind=button.dataset.studioSlot,item=C.item(kind,look[kind]);
      const blocked=locked?.kind===kind;
      const name=look.mode==='picture'&&kind!=='frame'?'None':item.name;
      button.querySelector('strong').textContent=name+(blocked?' · locked':'');
      button.setAttribute('aria-label',`${slotLabels[kind]}: ${name}${blocked?' (locked)':''}`);
      button.classList.toggle('is-locked-preview',blocked);
    }
  }
  function portrait(look,player,total,instance,stickerScale=1){
    const progress=BrainiProgressUI.xpProgress?.(player.level,total);
    return look.mode==='built'?
      window.BrainiAvatarStudioArt?.markup(look,{instance,level:progress?.level||player.level||1,levelPct:(progress?.percent||0)/100,stickerScale})||A.markup(look,total):
      BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
  }
  function sample(kind,item,draft,total){
    if(['glasses','hat','prop'].includes(kind))return A.preview(kind,item.id,draft);
    if(kind==='scene')return `<span class="profile-scene-sample" data-profile-scene="${item.id}"></span>`;
    if(kind==='title')return `<span class="reward-title-name">${escapeCopy(BrainiData.player().displayName||'Your name')}</span>`;
    if(item.color)return `<span class="avatar-swatch" style="--swatch:${item.color}"></span>`;
    if(kind==='mode'&&item.id==='picture')return BrainiProgressUI.avatarImageMarkup({...BrainiData.player(),avatarDesign:null});
    if(kind==='frame'){
      const player=BrainiData.player(),level=BrainiProgressUI.xpProgress?.(player.level,total)?.level||player.level||1;
      const portrait=draft.mode==='built'?A.markup(draft,total):BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
      return `<span class="rank-avatar reward-frame-sample ${BrainiProgressUI.avatarClass(level)}"${item.id==='level'?'':` data-profile-frame="${item.id}"`}>${portrait}</span>`;
    }
    return A.markup({...draft,mode:'built',[kind]:item.id},Number.MAX_SAFE_INTEGER);
  }
  function choices(root,draft,total,busy,academy=[],discovery=[],equipped=draft,options={}){
    // Cloud/profile events often repeat the same snapshot. Keep the existing
    // expanded controls and decoded artwork instead of repainting every choice.
    const player=BrainiData.player(),groups=C.groups;
    const signature=JSON.stringify([draft,equipped,total,!!busy,academy,discovery,
      options.loading,options.error,options.activeDays,options.locked,player.id,player.displayName,
      player.avatarUrl,player.level,player.identityName,player.name,player.defaultSeed,
      Object.entries(groups).map(([kind,items])=>[kind,items.map(item=>item.id)]),
      window.BrainiHalloweenEntitlements?.snapshot?.().entitlements||[]]);
    if(choiceViews.get(root)===signature)return;
    collectionSummary(root,total,options);
    for(const [kind,items] of Object.entries(groups)){
      const grid=root.querySelector(`[data-style-${kind}s]`);if(!grid)continue;
      const visible=new Set(items.filter(item=>!item.course&&!item.challenge&&!item.days).map(item=>item.id));
      for(const button of grid.querySelectorAll('[data-reward-id]'))if(!visible.has(button.dataset.rewardId))button.remove();
      for(const item of items){
        if(item.course||item.challenge||item.days)continue;
        let button=grid.querySelector(`[data-reward-id="${item.id}"]`);
        if(!button){
          button=document.createElement('button');button.type='button';button.className='reward-choice';button.dataset.rewardKind=kind;button.dataset.rewardId=item.id;
          button.innerHTML='<span class="reward-choice-art" aria-hidden="true"></span><strong></strong>'+ (cosmeticPanes.includes(kind)?'<span class="avatar-rarity"></span>':'') +'<small></small>';grid.append(button);
        }
        const usePortrait=window.BrainiAvatarStudioArt&&['hair','glasses','hat','prop','frame'].includes(kind);
        const itemLook={...draft,[kind]:item.id,mode:kind==='frame'?draft.mode:'built'};
        const art=usePortrait?portrait(itemLook,player,total,`card-${kind}-${item.id}`,kind==='prop'?1.55:1):sample(kind,item,draft,total);
        const artRoot=button.querySelector('.reward-choice-art');
        BrainiProgressUI.setAvatarMarkup(artRoot,art);
        artRoot.hidden=!art;
        const selected=draft[kind]===item.id,locked=item.event?!C.isUnlocked(item,total):item.xp>total;
        button.disabled=busy||(locked&&item.event);button.setAttribute('aria-pressed',String(selected));
        button.dataset.studioLocked=String(locked);
        if(cosmeticPanes.includes(kind)){
          const tier=item.event?'Event':rarity(item.xp);
          button.dataset.rarity=tier.toLowerCase();
          button.querySelector('.avatar-rarity').textContent=tier;
        }
        button.querySelector('strong').textContent=item.name;
        initialStatus(button,locked?item.event?item.requirement:`${selected?'Preview only · ':''}${number(item.xp-total)} XP to go`:selected?'Selected':item.xp?'Unlocked':kind==='mode'?'Choose':'Free');
        button.title=item.description||item.name;
        button.setAttribute('aria-label',`${item.name}, ${locked?item.event?item.requirement:(selected?'preview only, ':'try on only, ')+'unlocks at '+number(item.xp)+' XP':selected?'selected':item.xp?'unlocked':'available'}${item.description?'. '+item.description:''}`);
      }
      const chosen=items.find(item=>item.id===draft[kind]),note=root.querySelector(`[data-avatar-note="${kind}"]`);
      if(note){const text=chosen?.description?`${chosen.name}. ${chosen.description}`:'';if(note.textContent!==text)note.textContent=text;note.hidden=!text;}
    }
    const grid=root.querySelector('[data-academy-rewards]');
    for(const item of C.academyRewards){
      let card=grid.querySelector(`[data-academy-card="${item.id}"]`);
      if(!card){
        card=document.createElement('div');card.className='avatar-academy-card';card.dataset.academyCard=item.id;
        card.innerHTML='<button class="reward-choice" type="button"><span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small></button><a></a>';
        const link=card.querySelector('a');link.href='/learn/paths/'+item.course+'/';link.textContent=item.courseTitle+' →';
        link.setAttribute('aria-label','Open course: '+item.courseTitle);
        const button=card.querySelector('button');button.dataset.rewardKind=item.kind;button.dataset.rewardId=item.id;grid.append(card);
      }
      const button=card.querySelector('button'),selected=draft[item.kind]===item.id,earned=C.unlocked(item,total,academy);
      const artRoot=button.querySelector('.reward-choice-art'),art=sample(item.kind,item,draft,total);
      if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
      button.disabled=busy||!earned;button.setAttribute('aria-pressed',String(selected));
      button.querySelector('strong').textContent=item.name;
      initialStatus(button,selected?'Selected':earned?'Unlocked':'Complete the course');
      button.setAttribute('aria-label',`${item.name}, ${selected?'selected':earned?'unlocked':'complete '+item.courseTitle+' to unlock'}. ${item.description}`);
      button.title=item.description;
    }
    const count=C.academyIds(academy).length;
    root.querySelector('[data-academy-count]').textContent=options.loading?'Checking your course rewards…':options.error?'Course rewards could not be checked.':`${count} of ${C.academyRewards.length} extras unlocked · no XP needed`;
    challengeChoices(root,draft,total,busy,discovery);
    dayChoices(root,draft,total,busy,options.activeDays);
    window.BrainiWardrobeUI?.render(root,{draft,equipped,total,busy,academy,discovery,...options});
    applyFilter(root);
    renderRoad(root,draft,total,player);
    choiceViews.set(root,signature);
  }
  function challengeChoices(root,draft,total,busy,discovery){
    const grid=root.querySelector('[data-discovery-rewards]');if(!grid)return;
    for(const item of C.discoveryRewards){
      let card=grid.querySelector(`[data-discovery-card="${item.id}"]`);
      if(!card){
        card=document.createElement('section');card.className='avatar-challenge-card';card.dataset.discoveryCard=item.id;
        card.innerHTML='<button class="reward-choice" type="button"><span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small></button><div class="avatar-challenge-progress"><h3></h3><p data-challenge-rule></p><p data-challenge-status></p><progress></progress><p class="avatar-challenge-missing" data-challenge-missing></p><a></a></div>';
        const button=card.querySelector('button');button.dataset.rewardKind=item.kind;button.dataset.rewardId=item.id;grid.append(card);
      }
      const proof=C.discoveryProgress(item,discovery),selected=draft[item.kind]===item.id,button=card.querySelector('button');
      const art=sample(item.kind,item,draft,total),artRoot=button.querySelector('.reward-choice-art');if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
      button.disabled=busy||!proof.earned;button.setAttribute('aria-pressed',String(selected));
      button.querySelector('strong').textContent=item.name;initialStatus(button,selected?'Selected':proof.earned?'Unlocked':'Finish the challenge');
      button.setAttribute('aria-label',`${item.name}, ${selected?'selected':proof.earned?'unlocked':'finish '+item.challenge+' to unlock'}. ${item.description}`);button.title=item.description;
      card.querySelector('h3').textContent=item.challenge;
      card.querySelector('[data-challenge-rule]').textContent=item.target?`Complete ${item.target} different games.`:'Complete '+item.games.map(id=>C.discoveryGames.find(g=>g.id===id).name).join(', ')+'.';
      card.querySelector('[data-challenge-status]').textContent=busy?'Checking saved progress…':`${proof.completed} of ${proof.target} games completed`;
      const progress=card.querySelector('progress');progress.max=proof.target;progress.value=proof.completed;progress.setAttribute('aria-label',`${item.challenge}: ${proof.completed} of ${proof.target} games`);
      const missing=card.querySelector('[data-challenge-missing]');missing.textContent=item.games&&!proof.earned?'Still to try: '+proof.missing.map(id=>C.discoveryGames.find(g=>g.id===id).name).join(', ')+'.':'';missing.hidden=!missing.textContent;
      const next=C.discoveryGames.find(g=>g.id===proof.missing[0]),link=card.querySelector('a');
      link.href=proof.earned||item.target?'/games/':next?.path||'/games/';link.textContent=proof.earned?'Explore more games →':item.target?'Find a different game →':`Play ${next?.name||'a game'} →`;
    }
  }
  function dayChoices(root,draft,total,busy,activeDays){
    const grid=root.querySelector('[data-day-rewards]');if(!grid)return;
    const days=C.dayCount(activeDays);
    root.querySelector('[data-active-days-count]').textContent=busy?'Checking saved days…':`${number(days)} ${days===1?'day':'days'} played · no streak needed`;
    for(const item of C.dayRewards){
      let card=grid.querySelector(`[data-day-card="${item.id}"]`);
      if(!card){
        card=document.createElement('section');card.className='avatar-challenge-card avatar-day-card';card.dataset.dayCard=item.id;
        card.innerHTML='<button class="reward-choice" type="button"><span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small></button><div class="avatar-challenge-progress"><h4></h4><p data-day-status></p><progress></progress><a href="/games/">Find a game →</a></div>';
        const button=card.querySelector('button');button.dataset.rewardKind=item.kind;button.dataset.rewardId=item.id;grid.append(card);
      }
      const earned=days>=item.days,selected=draft[item.kind]===item.id,button=card.querySelector('button');
      const art=sample(item.kind,item,draft,total),artRoot=button.querySelector('.reward-choice-art');if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
      button.disabled=busy||!earned;button.setAttribute('aria-pressed',String(selected));
      button.querySelector('strong').textContent=item.name;initialStatus(button,selected?'Selected':earned?'Unlocked':`${number(item.days)} days to unlock`);
      button.setAttribute('aria-label',`${item.name}, ${selected?'selected':earned?'unlocked':'play on '+item.days+' different days to unlock'}. ${item.description}`);button.title=item.description;
      card.querySelector('h4').textContent=`Play on ${number(item.days)} different days`;
      card.querySelector('[data-day-status]').textContent=busy?'Checking saved progress…':`${number(Math.min(days,item.days))} of ${number(item.days)} days played`;
      const progress=card.querySelector('progress');progress.max=item.days;progress.value=Math.min(days,item.days);progress.setAttribute('aria-label',`${item.name}: ${number(Math.min(days,item.days))} of ${number(item.days)} days played`);
    }
  }
  function next(root,total,state={}){
    const goal=C.collectionGoal(total,state),reward=goal?.item,target=root.querySelector('[data-next-reward]');
    const labels={frame:'avatar frame',title:'profile title',glasses:'glasses',hat:'hat',prop:'little extra',scene:'profile background'};
    const focus=target.contains(document.activeElement),player=BrainiData.player();
    const art=reward?['glasses','hat','prop'].includes(reward.kind)?A.preview(reward.kind,reward.id,player.avatarDesign):window.BrainiRewardJourney?.art(reward,player)||'':'';
    const heading=goal?.type==='days'?'Days played':goal?.type==='discovery'?'Try something new':goal?.type==='academy'?'Learn something new':'Next avatar extra';
    const detail=!goal?'':goal.type==='xp'?`${number(goal.remaining)} XP to go · ${labels[reward.kind]}`:goal.type==='days'?`${number(goal.value)} of ${number(goal.max)} days played`:goal.type==='discovery'?`${number(goal.value)} of ${number(goal.max)} games tried`:'Finish '+reward.courseTitle;
    const markup=goal?`<a class="avatar-goal-link" href="#avatar-panel-${goalPane(goal.type,reward.kind)}" data-collection-goal="${goal.type}" data-goal-kind="${reward.kind}" data-goal-id="${reward.id}"><span class="avatar-goal-art" aria-hidden="true">${art}</span><span><span class="reward-kicker">${heading}</span><strong>${escapeCopy(reward.name)}</strong><small>${escapeCopy(detail)}</small></span><span class="avatar-goal-arrow" aria-hidden="true">→</span></a><progress></progress>${goal.type==='days'?'<small class="avatar-goal-note">Days add up, even with breaks.</small>':''}`:'<span class="reward-kicker">YOUR COLLECTION</span><strong>Every XP reward is unlocked</strong>';
    if(target.dataset.goalMarkup!==markup){target.innerHTML=markup;target.dataset.goalMarkup=markup;if(focus)target.querySelector('a')?.focus({preventScroll:true});}
    const progress=target.querySelector('progress');
    if(progress){progress.max=goal.max;progress.value=goal.value;progress.setAttribute('aria-label',`${reward.name}: ${number(goal.value)} of ${number(goal.max)} ${goal.type==='xp'?'XP since your last avatar extra':goal.type==='days'?'days played':goal.type==='discovery'?'games tried':'course completed'}`);}
  }
  function goalPane(type,kind){
    return ['days','discovery'].includes(type)?'challenges':type==='academy'?'academy':kind;
  }
  function openGoal(root,link){
    const type=link.dataset.collectionGoal,kind=link.dataset.goalKind,id=link.dataset.goalId;
    const pane=goalPane(type,kind);
    filter='all';
    showPane(root,pane);
    const choice=root.querySelector(`[data-avatar-pane="${pane}"] [data-reward-kind="${kind}"][data-reward-id="${id}"]`);
    if(type==='xp'&&choice&&!choice.disabled){
      choice.focus();
      choice.click();
      return;
    }
    const card=type==='days'?root.querySelector(`[data-day-card="${id}"]`):type==='discovery'?root.querySelector(`[data-discovery-card="${id}"]`):choice?.closest('.avatar-option-group,.avatar-academy-card');
    const target=card||root.querySelector(`[data-avatar-pane="${pane}"]`);if(target){target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest'});}
  }
  function renderRoad(root,draft,total,player){
    const road=root.querySelector('[data-studio-road]');
    const items=['glasses','hat','prop','frame'].flatMap(kind=>C.groups[kind]
      .filter(item=>item.xp>total).map(item=>({...item,kind}))).sort((a,b)=>a.xp-b.xp).slice(0,6);
    road.hidden=!items.length;
    if(!items.length)return;
    const markup=`<h3>Unlock road</h3><div class="avatar-road-track">
      <div class="avatar-road-current"><strong>You are here</strong><small>${number(total)} XP</small></div>
      ${items.map(item=>`<a href="#avatar-panel-${item.kind}" data-collection-goal="xp" data-goal-kind="${item.kind}" data-goal-id="${item.id}">
        <span class="avatar-road-art" aria-hidden="true">${portrait({...draft,mode:'built',[item.kind]:item.id},player,total,'road-'+item.id,1.45)}</span>
        <strong>${escapeCopy(item.name)}</strong><small>${number(item.xp)} XP</small></a>`).join('')}
      </div>`;
    if(road.dataset.markup!==markup){road.innerHTML=markup;road.dataset.markup=markup;}
  }
  return {mount,showPane,choices,next,openGoal,equippedSlots,portrait,activePane:()=>active};
})();

/* ===== avatar-wardrobe-ui.js ===== */

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
      const status=loading?'Checking…':error?'Unavailable':!unlocked?item.event?item.requirement:item.course?'Finish course':item.challenge?'Finish challenge':item.days?`${daysLeft.toLocaleString('en-GB')} ${daysLeft===1?'day':'days'} to go`:`${picked?'Preview only · ':''}${Math.max(0,item.xp-total).toLocaleString('en-GB')} XP to go`:preview?'Preview':inUse?'In use':saved?'Saved choice':kind==='mode'?'Choose':'Try on';
      const marker=cosmeticKinds.has(kind)&&!unknown?!unlocked?'locked':preview?'preview':inUse?'equipped':saved?'saved':'unlocked':'';
      label(button,status,marker);
      const requirement=item.event?item.requirement:item.days?'play on '+item.days+' different days to unlock':item.challenge?'finish '+item.challenge+' to unlock':item.course?'complete '+item.courseTitle+' to unlock':'unlocks at '+item.xp.toLocaleString('en-GB')+' XP';
      const lockedLabel=(picked?'preview only, ':button.disabled?'':'try on only, ')+'locked, '+requirement;
      button.setAttribute('aria-label',`${item.name}, ${picked&&unlocked?'selected, ':''}${unknown?status:unlocked?(marker==='unlocked'?'unlocked, ':'')+status:lockedLabel}${item.description?'. '+item.description:''}`);
    }
  }
  return Object.freeze({render});
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
  let root,draft=C.clean(),baseline=C.clean(),owner=null,dirty=false,editing=false,lockedPreview=null;
  function frame(el,id){if(el){if(id==='level')delete el.dataset.profileFrame;else el.dataset.profileFrame=id;}}
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
    const title=C.titles.find(t=>t.id===shown.title),titleRoot=root.querySelector('[data-style-preview-title]');
    titleRoot.textContent=title.id==='none'?'':title.name;titleRoot.hidden=title.id==='none';
    root.querySelector('.avatar-stage-identity').dataset.diplomaTier=tier?.key||'rookie';
    root.querySelector('[data-avatar-diploma-next]').textContent=nextTier?`Next diploma · Level ${nextTier.min}`:'Top diploma unlocked';
    root.querySelector('[data-avatar-level]').textContent=`Level ${level} · ${total.toLocaleString('en-GB')} XP`;
    U.equippedSlots(root,shown,lockedPreview);
    U.next(root,total,state);U.choices(root,shown,total,state.loading||state.saving||!!state.error,state.academy,state.discovery,equipped,{loading:state.loading,error:state.error,activeDays:state.activeDays,locked:lockedPreview});
    root.querySelector('[data-style-storage]').textContent=state.cloud?'Saved with your account. XP are never spent.':'Saved on this browser. Sign in to sync. XP are never spent.';
    root.querySelector('[data-style-sharing]').textContent=state.cloud?'Your saved look and title appear with friends and groups, and in public rankings when you choose to be visible.':'Try things on here. Guest choices stay on this browser.';
    const save=root.querySelector('[data-style-save]');
    save.disabled=!dirty||!!lockedPreview||state.loading||state.saving||!!state.error;
    save.textContent=state.saving?'Saving…':confirmed?'Saved':'Save look';
    save.dataset.saveState=state.saving?'saving':confirmed?'saved':dirty?'preview':'idle';
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
