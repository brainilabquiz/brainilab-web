/* Recover old browser cosmetics only. No game results, score, XP or streak writes. */
window.BrainiHalloweenLegacy=(function(){
  const prefix='brainilab-halloween-2026:guest:',receipt='brainilab-halloween-recovery-v1:';
  let pending=null,pendingOwner=null,statusOwner=null,notice='',error='';
  const parse=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
  function preview(){return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);}
  function clean(value){
    return (window.BrainiHalloweenGuestModel?.clean?.(value)?.records||[]).filter(r=>r.id&&r.day<='2026-10-21').slice(0,64);
  }
  function capture(){
    if(preview())return [];
    const a=window.BrainiData?.authState?.()||{};
    const ids=[a.anonymousPlayerId,a.guestUserId];
    // This fallback exists only for event visitors predating the main player store.
    try{ids.push(localStorage.getItem('brainilab-halloween-guest-id'));}catch{}
    return [...new Set(ids.filter(id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)))].map(id=>({id,records:clean(parse(prefix+id))})).filter(x=>x.records.length);
  }
  function snapshot(){const a=window.BrainiData?.authState?.();return a?.status==='authenticated'&&a.user?.id===statusOwner?{loading:!!pending,notice,error}:{loading:false,notice:'',error:''};}
  const emit=()=>window.dispatchEvent(new CustomEvent('brainilab:halloween-recovery'));
  async function recover(user,carried=[]){
    if(preview())return;
    const sb=window.BrainiBackendAuth?.getClient?.();if(!sb)return;
    async function current(){
      let timer;
      const r=await Promise.race([sb.auth.getSession(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Recovery timed out.')),12000);})]).finally(()=>clearTimeout(timer));
      if(r.error)throw r.error;return r.data?.session?.user;
    }
    const actor=await current();
    if(!actor||actor.is_anonymous||user&&user.id!==actor.id)return;
    const uid=actor.id;
    if(pending){if(pendingOwner!==uid)throw Error('Account changed.');return pending;}
    pendingOwner=uid;statusOwner=uid;notice='';error='';
    pending=(async()=>{
      const sources=[...capture(),...(Array.isArray(carried)?carried:[])];
      const seen=new Set();let recovered=false;
      for(const source of sources){
        if(typeof source?.id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(source.id))continue;
        const records=clean({records:source.records}).filter(r=>{if(seen.has(r.id))return false;seen.add(r.id);return true;});
        if(!records.length)continue;
        const key=receipt+source.id,prior=parse(key),signature=JSON.stringify(records);
        // A browser source stays with the first account that started its recovery.
        if(prior?.owner&&prior.owner!==uid)continue;
        if(prior?.owner===uid&&prior.confirmed===signature)continue;
        if((await current())?.id!==uid)throw Error('Account changed.');
        localStorage.setItem(key,JSON.stringify({owner:uid,confirmed:prior?.confirmed||null}));
        let timer;
        const r=await Promise.race([sb.rpc('halloween_recover_legacy_cosmetics',{p_records:records}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Recovery timed out.')),12000);})]).finally(()=>clearTimeout(timer));
        if((await current())?.id!==uid)throw Error('Account changed.');
        if(r.error||r.data?.owner!==uid||r.data?.recovered!==true||!Array.isArray(r.data?.accepted_ids)||records.some(x=>!r.data.accepted_ids.includes(x.id)))throw Error('Recovery could not be confirmed.');
        localStorage.setItem(key,JSON.stringify({owner:uid,confirmed:signature}));
        recovered=true;
      }
      if(recovered)notice='Your Halloween extras are saved with your account.';
    })();
    emit();
    try{await pending;}catch(e){error='Your old Halloween extras are still on this browser. Try saving them again.';throw e;}
    finally{pending=null;pendingOwner=null;emit();}
  }
  return Object.freeze({capture,recover,snapshot});
})();
