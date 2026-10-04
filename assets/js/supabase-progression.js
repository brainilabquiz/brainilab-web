/*
  BrainiLab Cloud Progression — Step 6 backend
  --------------------------------------------
  Reads authoritative progression aggregates from PostgreSQL.

  Cloud authority:
  - current/best streak
  - XP + level
  - total games/questions
  - Full Daily count
  - Daily Brain Score + 4-game breakdown
  - weekly/monthly aggregates
  - personal bests
*/
window.BrainiProgression = (function(){
  let cached=null;
  let lastError=null;
  let active=null;
  let generation=0;

  function configured(){
    return !!window.BrainiBackendAuth?.isConfigured?.();
  }

  function client(){
    return window.BrainiBackendAuth?.getClient?.() || null;
  }

  async function session(){
    if(!configured()) return null;
    return BrainiBackendAuth.getSession();
  }

  async function fetchSummary(){
    const current=await session();
    if(!current?.user) return null;

    const sb=client();
    // Bound this read so a stalled connection cannot hold the sync queue forever.
    let timeout;
    const response=sb.rpc("get_my_brainilab_progression");
    const {data,error}=await Promise.race([
      response,
      new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Progress update timed out')),12000);})
    ]).finally(()=>clearTimeout(timeout));

    if(error) throw error;
    if(data?.progression?.user_id!==current.user.id)return null;
    return data||null;
  }

  function sync({fresh=false}={}){
    if(!configured())return Promise.resolve(null);
    if(active){
      // Verification happened after the current read started: read again afterwards.
      if(fresh)active.dirty=true;
      return active.promise;
    }
    const job={generation,dirty:false,promise:null};active=job;lastError=null;
    job.promise=(async()=>{
      let summary=null;
      do{
        job.dirty=false;
        try{summary=await fetchSummary();}
        catch(error){if(active===job&&job.dirty)continue;throw error;}
        if(active!==job||job.generation!==generation)return null;
        if(job.dirty)continue;
        if(summary){
          cached=summary;
          await BrainiData.api.syncCloudProgression(summary);
          if(active!==job||job.generation!==generation)return null;
          window.dispatchEvent(new CustomEvent('brainilab:progressionchange',{detail:{summary}}));
        }
      }while(job.dirty);
      return summary;
    })().catch(err=>{
      if(active===job){lastError=err;console.warn('BrainiLab progression sync:',err.message||err);}
      return null;
    }).finally(()=>{
      if(active===job){active=null;window.dispatchEvent(new CustomEvent('brainilab:progressionsync'));}
    });
    return job.promise;
  }

  function getCached(){
    return cached ? JSON.parse(JSON.stringify(cached)) : null;
  }

  function getLastError(){
    return lastError;
  }

  function isSyncing(){
    return !!active;
  }

  window.addEventListener('brainilab:datachange',event=>{
    if(['answer_verification','daily_answer_verification','daily_game_verification'].includes(event.detail?.type))sync({fresh:true});
  });
  window.addEventListener('brainilab:authchange',()=>{
    generation++;active=null;cached=null;lastError=null;
  });
  window.addEventListener('online',()=>sync({fresh:true}));

  return {
    configured,
    fetchSummary,
    sync,
    getCached,
    getLastError,
    isSyncing
  };
})();
