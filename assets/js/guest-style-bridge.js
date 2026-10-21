/* Carry explicit guest appearance choices; unlocks still require server evidence. */
window.BrainiGuestStyle=(function(){
  const prefix='brainilab-profile-style-v1:';
  function capture(){
    const auth=BrainiData.authState();if(auth.status==='authenticated')return null;
    for(const id of [auth.guestUserId,auth.anonymousPlayerId].filter(Boolean)){
      try{const raw=localStorage.getItem(prefix+'guest:'+id);if(raw)return BrainiRewardCatalog.clean(JSON.parse(raw));}catch{}
    }
    return null;
  }
  function bindGuest(previous,id){
    if(!previous||previous.status==='authenticated'||!id)return;
    const old=previous.guestUserId||previous.anonymousPlayerId;
    if(!old||old===id)return;
    for(const [before,after] of [[prefix+'guest:'+old,prefix+'guest:'+id],['brainilab-halloween-2026:guest:'+old,'brainilab-halloween-2026:guest:'+id]]){
      try{const raw=localStorage.getItem(before);if(raw&&!localStorage.getItem(after))localStorage.setItem(after,raw);}catch{}
    }
  }
  async function restore(user,style){
    if(!style||!window.BrainiRewardCatalog)return user;
    const sb=BrainiBackendAuth.getClient(),uid=user.id;
    const bounded=async request=>{let timer;try{return await Promise.race([request,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Appearance transfer timed out.')),12000);})]);}finally{clearTimeout(timer);}};
    const current=async()=>{const r=await bounded(sb.auth.getSession());if(r.error||r.data?.session?.user?.id!==uid)throw Error('Account changed.');};
    await current();
    const response=await bounded(sb.auth.getUser());if(response.error||response.data?.user?.id!==uid)throw Error('Account changed.');
    const meta=response.data.user.user_metadata||{},catalog=BrainiRewardCatalog,clean=catalog.clean(style),patch={};
    const progress=await bounded(sb.rpc('get_my_brainilab_progression'));
    if(progress.error||progress.data?.progression?.user_id!==uid)throw Error('Progress transfer is still pending.');
    const xp=catalog.xp(progress.data.progression.xp);
    let events=[],games=[],days=0,academy=[];
    if(Object.entries(clean).some(([kind,value])=>catalog.item(kind,value)?.event)){
      const r=await bounded(sb.rpc('halloween_event_state'));if(r.error)throw r.error;events=r.data?.entitlements||[];
    }
    if(Object.entries(clean).some(([kind,value])=>{const i=catalog.item(kind,value);return i?.days||i?.challenge;})){
      const r=await bounded(sb.rpc('get_my_brainilab_discoveries'));if(r.error||r.data?.owner!==uid)throw Error('Collection transfer is still pending.');games=r.data.games||[];days=r.data.activeDays||0;
    }
    if(Object.entries(clean).some(([kind,value])=>catalog.item(kind,value)?.course)){
      const r=await bounded(sb.from('learn_avatar_unlocks').select('reward_id').eq('user_id',uid));if(r.error)throw r.error;academy=(r.data||[]).map(x=>x.reward_id);
    }
    for(const [kind,value] of Object.entries(clean)){
      const key=catalog.metadataKeys[kind],item=catalog.item(kind,value);
      if(!key||!item||Object.hasOwn(meta,key))continue;
      const allowed=item.event?events.includes(value):item.course?academy.includes(value):item.challenge?catalog.discoveryProgress(item,games).earned:item.days?days>=item.days:(item.xp||0)<=xp;
      if(allowed)patch[key]=value;
    }
    await current();
    if(!Object.keys(patch).length)return response.data.user;
    const saved=await bounded(sb.auth.updateUser({data:patch}));await current();
    if(saved.error||saved.data?.user?.id!==uid||Object.entries(patch).some(([key,value])=>saved.data.user.user_metadata?.[key]!==value))throw Error('Appearance transfer could not be confirmed.');
    return saved.data.user;
  }
  return {capture,bindGuest,restore};
})();
