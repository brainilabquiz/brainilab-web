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
