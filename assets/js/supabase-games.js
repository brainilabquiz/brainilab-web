/*
  BrainiLab Cloud Games — Step 3 backend
  --------------------------------------
  Persists completed game sessions/results through a controlled Supabase RPC.

  Guest/offline behavior:
  - BrainiData records the result locally first.
  - Results created in Step 3 carry a stable clientResultId.
  - A completed scored game lazily creates an anonymous Supabase player.
  - Offline results stay pending and retry idempotently; sign-in claims guest progress.
*/
window.BrainiCloudGames = (function(){
  let syncing=false;
  let syncJob=null;
  let retryWhenFinished=false;
  let lastError=null;
  const pendingSaves=new Map();

  function configured(){
    return !!window.BrainiBackendAuth?.isConfigured?.();
  }

  function client(){
    return window.BrainiBackendAuth?.getClient?.() || null;
  }

  function cleanNumber(value){
    return Number.isFinite(Number(value)) ? Number(value) : null;
  }

  function currentPackContext(){
    const params=new URLSearchParams(location.search);
    const difficulty=(params.get("difficulty")||"").toLowerCase();
    const set=Number(params.get("set")||"");

    return {
      difficulty:["easy","medium","hard"].includes(difficulty) ? difficulty : null,
      setNumber:Number.isInteger(set) && set>0 ? set : null
    };
  }

  function compactPayload(result={}){
    const blocked=new Set([
      "id","clientResultId","cloudSyncStatus","cloudSessionId",
      "cloudResultId","cloudSyncedAt","recordedAtStep","ownerUserId","results","answerDetails"
    ]);

    const payload={};
    Object.entries(result).forEach(([key,value])=>{
      if(blocked.has(key)) return;
      if(value===undefined) return;

      if(Array.isArray(value)){
        // Keep small game-specific arrays such as BrainiWord pattern.
        if(value.length<=(key==="mathAnswers"?60:40)) payload[key]=value;
        return;
      }

      if(value && typeof value==="object"){
        const txt=JSON.stringify(value);
        if(txt.length<=3000) payload[key]=value;
        return;
      }

      payload[key]=value;
    });

    return payload;
  }

  function correctnessArray(result={}){
    return Array.isArray(result.results)
      ? result.results.slice(0,100).map(v=>typeof v==="boolean"?v:null)
      : [];
  }

  async function currentUser(){
    if(!configured()) return null;
    const session=await BrainiBackendAuth.getSession();
    return session?.user||null;
  }

  function localUserId(){
    const auth=window.BrainiData?.authState?.();
    return auth?.user?.id||auth?.guestUserId||null;
  }

  function ownsResult(result,userId){
    const stored=window.BrainiData?.recentResults?.().find(r=>r.clientResultId===result.clientResultId);
    return !!stored&&localUserId()===userId&&stored.ownerUserId===userId;
  }

  async function resultRpc(name,args,userId){
    if(localUserId()!==userId)throw new Error('Player changed.');
    const controller=new AbortController();let timer;
    const changed=()=>{if(localUserId()!==userId)controller.abort();};
    window.addEventListener('brainilab:authchange',changed);
    try{
      let call=client().rpc(name,args);
      if(call.abortSignal)call=call.abortSignal(controller.signal);
      const response=await Promise.race([call,new Promise((_,reject)=>{
        timer=setTimeout(()=>{controller.abort();reject(new Error('Connection timed out. Your result is still saved.'));},12000);
      })]);
      if(localUserId()!==userId)throw new Error('Player changed.');
      return response;
    }finally{clearTimeout(timer);window.removeEventListener('brainilab:authchange',changed);}
  }

  async function saveCompletedResult(gameId,result){
    const key=result?.clientResultId;
    if(key && pendingSaves.has(key)) return pendingSaves.get(key);
    const saving=persistCompletedResult(gameId,result);
    if(key) pendingSaves.set(key,saving);
    try{return await saving;}finally{if(key) pendingSaves.delete(key);}
  }

  async function persistCompletedResult(gameId,result){
    lastError=null;

    if(!configured()) return {saved:false,reason:"not_configured"};
    if(result?.practice || result?.tryFirst){
      return {saved:false,reason:"practice"};
    }
    const ownerBefore=result?.ownerUserId||localUserId();
    const session=await BrainiBackendAuth.ensurePlayerSession();
    const user=session?.user;
    if(!user) return {saved:false,reason:"not_authenticated"};
    if(ownerBefore&&ownerBefore!==user.id)return {saved:false,reason:"player_changed"};
    const bound=await BrainiData.api.bindResultOwner(result.clientResultId,user.id);
    if(!bound||!ownsResult(bound,user.id))return {saved:false,reason:"player_changed"};
    result=bound;
    if(result.cloudSyncStatus==='synced')return {saved:true,alreadyExisted:true};

    if(!result?.clientResultId){
      throw new Error("Missing client result ID.");
    }

    const sb=client();
    const pack=currentPackContext();

    const durationMs=
      Number.isFinite(Number(result.timeSec))
        ? Math.max(0,Math.round(Number(result.timeSec)*1000))
        : Number.isFinite(Number(result.durationMs))
          ? Math.max(0,Math.round(Number(result.durationMs)))
          : null;

    const score=cleanNumber(result.score);
    const correct=cleanNumber(result.correct);
    const total=cleanNumber(result.total);
    const accuracy=cleanNumber(result.accuracy);
    const percentile=cleanNumber(result.percentile);

    const {data,error}=await resultRpc("submit_brainilab_game_result",{
      p_client_result_id:result.clientResultId,
      p_game_id:gameId,
      p_played_at:result.playedAt||new Date().toISOString(),
      p_score:score===null?null:Math.round(score),
      p_correct_answers:correct===null?null:Math.round(correct),
      p_total_questions:total===null?null:Math.round(total),
      p_accuracy:accuracy,
      p_duration_ms:durationMs,
      p_client_percentile:percentile===null?null:Math.round(percentile),
      p_daily_number:result.dailyNumber!=null&&Number(result.dailyNumber)>0?Math.round(Number(result.dailyNumber)):null,
      p_difficulty:result.difficulty||pack.difficulty,
      p_set_number:Number.isFinite(Number(result.setNumber))
        ? Math.round(Number(result.setNumber))
        : pack.setNumber,
      p_result_payload:compactPayload(result),
      p_answer_correctness:correctnessArray(result)
    },user.id);

    if(error){
      lastError=error;
      throw error;
    }

    const row=Array.isArray(data)?data[0]:data;
    if(!row?.session_id||!row?.result_id)throw new Error("Incomplete save response. Your result is still saved on this device.");
    if(!ownsResult(result,user.id))return {saved:false,reason:"player_changed"};
    const cloud={
      sessionId:row?.session_id||null,
      resultId:row?.result_id||null,
      alreadyExisted:!!row?.already_existed
    };

    await BrainiData.api.markResultCloudSynced(result.clientResultId,cloud);
    // Automatic enrollment may have just changed an older account's profile.
    void Promise.resolve(window.BrainiProfiles?.sync?.()).catch(()=>{});

    window.dispatchEvent(new CustomEvent("brainilab:cloudgame",{
      detail:{type:"result_synced",gameId,clientResultId:result.clientResultId,cloud}
    }));

    return {saved:true,...cloud};
  }

  function syncPendingResults(){
    if(syncJob)return syncJob;
    const job=runPendingResults();syncJob=job;
    void job.finally(()=>{
      if(syncJob===job)syncJob=null;
      if(retryWhenFinished){retryWhenFinished=false;void syncPendingResults().catch(error=>{lastError=error;});}
    }).catch(()=>{});
    return job;
  }

  async function runPendingResults(){
    if(!configured()||navigator.onLine===false)return {synced:0,failed:0};
    syncing=true;
    let synced=0;
    let failed=0;

    try{
      const pending=await BrainiData.api.getPendingCloudResults();

      for(const result of pending){
        if(navigator.onLine===false)break;
        try{
          const response=await saveCompletedResult(result.gameId,result);
          if(response.saved) synced++;
        }catch(err){
          failed++;
          lastError=err;
          // Keep the result pending. Continue syncing the rest.
          console.warn("BrainiLab pending result sync:",err.message||err);
        }
      }
    }finally{
      syncing=false;
    }

    if(synced){
      window.dispatchEvent(new CustomEvent("brainilab:cloudgame",{
        detail:{type:"pending_sync_complete",synced,failed}
      }));
    }

    const checked=await window.BrainiResultRecovery?.sync?.()||{verified:0,failed:0};
    return {synced,verified:checked.verified,failed:failed+checked.failed};
  }

  async function getMyRecentResults(limit=20){
    if(!configured()) return [];
    const user=await currentUser();
    if(!user) return [];

    const sb=client();
    const safeLimit=Math.min(100,Math.max(1,Number(limit)||20));

    const {data,error}=await sb
      .from("game_sessions")
      .select(`
        id,
        client_result_id,
        game_id,
        difficulty,
        set_number,
        daily_number,
        started_at,
        completed_at,
        game_results (
          id,
          score,
          correct_answers,
          total_questions,
          accuracy,
          duration_ms,
          client_percentile,
          server_verified,
          answers_verified,
          result_payload
        )
      `)
      .eq("user_id",user.id)
      .order("completed_at",{ascending:false})
      .limit(safeLimit);

    if(error){
      lastError=error;
      throw error;
    }

    return data||[];
  }

  function getLastError(){
    return lastError;
  }

  function isSyncing(){
    return syncing;
  }

  window.addEventListener('online',()=>{
    if(syncJob){retryWhenFinished=true;return;}
    void syncPendingResults().catch(error=>{lastError=error;});
  });

  return {
    ownsResult,
    resultRpc,
    configured,
    saveCompletedResult,
    syncPendingResults,
    getMyRecentResults,
    getLastError,
    isSyncing
  };
})();
