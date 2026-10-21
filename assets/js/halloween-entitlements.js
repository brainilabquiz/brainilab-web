/* Halloween account rewards. Server-verified IDs, never editable Auth claims. */
window.BrainiHalloweenEntitlements=(function(){
  const ids=['pumpkin-thinker','midnight','little-bat'];
  let owner=null,generation=0,loading=false,error='',state=null;
  const clean=value=>Array.isArray(value)?[...new Set(value.filter(id=>typeof id==='string'&&ids.includes(id)))]:[];
  function identity(){
    const auth=window.BrainiData?.authState?.()||{};
    let preview=false;try{preview=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)&&JSON.parse(document.querySelector('script[data-halloween-config]')?.textContent||'{}').preview===true;}catch{}
    if(preview)return {id:'preview:'+(auth.guestUserId||auth.anonymousPlayerId||'browser'),cloud:false};
    if(auth.status!=='authenticated'&&auth.guestUserId&&window.BrainiBackendAuth?.hasPlayerSession?.())return {id:'guest:'+auth.guestUserId,uid:auth.guestUserId,cloud:true};
    return auth.status==='authenticated'&&auth.user?.id?{id:'account:'+auth.user.id,uid:auth.user.id,cloud:true}
      :{id:'guest:'+(auth.guestUserId||auth.anonymousPlayerId||'browser'),cloud:false};
  }
  const emit=()=>window.dispatchEvent(new CustomEvent('brainilab:halloween-entitlements'));
  function snapshot(){
    const who=identity();
    // Guest ownership is already scoped by the event coordinator's browser
    // ledger. It must be readable on a fresh Home page without a profile load
    // or an account RPC; never reuse a previous account's in-memory state.
    if(!who.cloud){
      let earned=[];try{earned=window.BrainiLabHalloween?.guestEntitlements?.()||[];}catch{}
      return {owner:who.id,loading:false,error:'',cloud:false,enabled:false,status:'guest',visible:false,entitlements:clean(earned),progress:{games_completed:0,distinct_games:0,days_played:0}};
    }
    if(who.id!==owner?.id)return {owner:who.id,loading:false,error:'',enabled:false,status:'unavailable',visible:false,entitlements:[],progress:{games_completed:0,distinct_games:0,days_played:0}};
    const value=state||{};
    const entitlements=clean(value.entitlements);
    return {owner:who.id,loading,error,cloud:who.cloud,enabled:value.enabled===true,status:value.status||'unavailable',visible:value.enabled===true&&value.status==='active',
      entitlements,progress:{games_completed:Math.max(0,Number(value.progress?.games_completed)||0),distinct_games:Math.max(0,Number(value.progress?.distinct_games)||0),days_played:Math.max(0,Number(value.progress?.days_played)||0)}};
  }
  function clear(){generation++;owner=null;state=null;loading=false;error='';emit();}
  async function request(name,args={}){
    const current=identity();
    if(!current.cloud)throw Error('Sign in to save Halloween rewards to your account.');
    const sb=window.BrainiBackendAuth?.getClient?.();
    if(!sb?.rpc)throw Error('Halloween account connection is unavailable.');
    let timer;
    const {data,error:rpcError}=await Promise.race([sb.rpc(name,args),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Halloween request timed out. Please try again.')),12000);})]).finally(()=>clearTimeout(timer));
    if(rpcError)throw Error(rpcError.message||'Halloween could not be checked.');
    if(identity().id!==current.id)throw Error('Account changed. Please try again.');
    return data;
  }
  async function load(){
    const current=identity(),run=++generation;
    if(owner?.id!==current.id)state=null;
    owner=current;error='';loading=current.cloud;emit();
    if(!current.cloud){loading=false;emit();return snapshot();}
    try{
      const data=await request('halloween_event_state');
      if(run!==generation)return snapshot();
      state=data;
    }catch{if(run===generation){state=null;error='Halloween rewards could not be checked. Your saved XP rewards are unchanged.';}}
    finally{if(run===generation){loading=false;emit();}}
    return snapshot();
  }
  async function startGame(game){
    if(!['trick-or-think','spooky-connections'].includes(game))throw Error('Unknown Halloween game.');
    const run=generation,data=await request('halloween_start_game',{p_game:game});
    if(run!==generation)throw Error('Account changed. Please try again.');
    return data;
  }
  async function completeGame(sessionId,answers){
    const current=identity(),run=generation;
    const data=await request('halloween_complete_game',{p_session_id:sessionId,p_answers:answers});
    if(run===generation&&identity().id===current.id){owner=current;state=data.state;error='';emit();}
    return data;
  }
  window.addEventListener('brainilab:authchange',()=>{if(identity().id!==owner?.id){clear();load();}});
  window.addEventListener('online',()=>{if(identity().cloud)load();});
  return Object.freeze({load,snapshot,startGame,completeGame,clear});
})();
