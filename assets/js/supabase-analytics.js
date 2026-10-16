/*
  BrainiLab Player Analytics — Step 17
  Private cloud adapter for My BrainiLab → My Stats.
*/
window.BrainiAnalytics=(function(){
  const cache=new Map();
  const pending=new Map();
  let lastError=null;
  let generation=0;
  let ownerId=null;

  function configured(){
    return !!window.BrainiBackendAuth?.isConfigured?.();
  }

  function client(){
    return window.BrainiBackendAuth?.getClient?.()||null;
  }

  async function session(){
    if(!configured()) return null;
    return BrainiBackendAuth.getSession();
  }

  function normalizeDays(days){
    const n=Number(days);
    if(n===0) return 0;
    if(n===7 || n===30 || n===90) return n;
    return 30;
  }

  async function fetchStats(days=30,{force=false}={}){
    const range=normalizeDays(days);

    if(!configured()){
      return null;
    }

    const startedGeneration=generation;
    const current=await session();
    if(startedGeneration!==generation)return null;
    if(!current?.user){
      return null;
    }
    if(ownerId && ownerId!==current.user.id)invalidate();
    ownerId=current.user.id;

    if(!force && cache.has(range)){
      return structuredClone(cache.get(range));
    }

    if(pending.has(range))return pending.get(range).promise;

    lastError=null;

    const job={owner:ownerId,generation,promise:null};
    job.promise=(async()=>{
      try{
        const sb=client();

        let timeout;
        const response=sb.rpc("get_my_brainilab_stats",{p_days:range});
        const {data,error}=await Promise.race([
          response,
          new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Stats update timed out. Please try again.')),12000);})
        ]).finally(()=>clearTimeout(timeout));

        if(job.generation!==generation || job.owner!==ownerId)return null;
        if(error)throw error;

        const snapshot=data||{};
        cache.set(range,snapshot);

        window.dispatchEvent(
          new CustomEvent(
            "brainilab:analyticschange",
            {
              detail:{
                range,
                snapshot
              }
            }
          )
        );

        return structuredClone(snapshot);
      }catch(error){
        if(job.generation!==generation || job.owner!==ownerId)return null;
        lastError=error;
        throw error;
      }
    })();

    pending.set(range,job);

    try{
      return await job.promise;
    }finally{
      if(pending.get(range)===job)pending.delete(range);
    }
  }

  function getCached(days=30){
    const auth=window.BrainiData?.authState?.();
    if(auth && (auth.user?.id||auth.guestUserId||null)!==ownerId)return null;
    const range=normalizeDays(days);
    const value=cache.get(range);
    return value?structuredClone(value):null;
  }

  function invalidate(){
    generation++;
    ownerId=null;
    cache.clear();
    pending.clear();
    lastError=null;
  }

  function getLastError(){
    return lastError;
  }

  window.addEventListener(
    "brainilab:authchange",
    invalidate
  );

  window.addEventListener(
    "brainilab:cloudgame",
    invalidate
  );

  window.addEventListener(
    "brainilab:progressionchange",
    invalidate
  );

  return {
    configured,
    fetchStats,
    getCached,
    invalidate,
    getLastError
  };
})();
