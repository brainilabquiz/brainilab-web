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
