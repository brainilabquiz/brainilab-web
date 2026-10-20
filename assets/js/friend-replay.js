/* Freeze the loaded set, not the selector that happened to choose it. */
window.BrainiReplay=(()=>{
 const C=window.BrainiReplayContract,M=window.BrainiGameChallengeModel,incoming=M.incoming(),captured=new Map(),packs=new Map(),publishing=new Map();
 const checkers=new Set(['check_brainilab_quiz_answer','check_brainilab_connections_guess','check_brainilab_sequence_answer','check_brainilab_odd_one_out_answer','check_brainilab_higher_lower_answer','check_brainilab_number_route_answer','reveal_brainilab_number_route_solution','check_brainilab_order_up_round','check_brainilab_topic_rush_answer','check_brainilab_brainiword_guess']);
 let pending=null,resolvePending=null,fetching=false,loaded=null,errorText='';
 const emit=()=>window.dispatchEvent(new Event('brainilab:friendpack'));
 const timeout=promise=>{let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Connection timed out. Please try again.')),10000))]).finally(()=>clearTimeout(timer));};
 async function rpc(name,args){
  const auth=window.BrainiBackendAuth;if(!auth?.isConfigured?.())throw Error('Couldn’t connect. Please try again.');
  await timeout(auth.ensurePlayerSession());
  const {data,error}=await timeout(auth.getClient().rpc(name,args));if(error)throw Error(error.message||'Couldn’t open this invitation.');return data;
 }
 function status(){return {legacy:incoming?.v===1,loading:!!pending&&!loaded&&!errorText,error:errorText,ready:!!loaded};}
 async function retry(){
  if(fetching||loaded||!incoming||incoming.v!==2)return;fetching=true;errorText='';emit();
  try{
   const result=await rpc('get_brainilab_friend_pack',{p_pack_id:incoming.p,p_game_id:incoming.g});
   if(result?.id!==incoming.p||result.gameId!==incoming.g||result.payload?.replayRules!=='friend-replay-v1'||C.canonical(result.payload?.friendSettings)!==C.canonical({date:incoming.d,difficulty:incoming.l,rounds:incoming.n})||!validPack(incoming.g,result.payload))throw Error('This invitation is unavailable. Ask your friend for a new one.');
   loaded=result;packs.set(incoming.g,result.id);captured.set(incoming.g,C.clean(result.payload));resolvePending?.(C.clean(result.payload));
  }catch(error){errorText=/expired|unavailable/i.test(error.message)?'This invitation is unavailable. Ask your friend for a new one.':'Couldn’t load your friend’s questions. Please try again.';}
  finally{fetching=false;emit();}
 }
 function validPack(g,p){
  try{const value=C.project(g,p);return !!value&&(Array.isArray(value)?value.length>0:true)&&['local','supabase'].includes(p.source);}catch{return false;}
 }
 async function run(g,base){
  if(incoming?.g===g){
   if(incoming.v===1){emit();return new Promise(()=>{});}
   if(loaded)return C.clean(loaded.payload);
   if(!pending){pending=new Promise(resolve=>resolvePending=resolve);void retry();}
   return pending.then(C.clean);
  }
  const result=await base();if(validPack(g,result)){captured.set(g,C.clean(result));packs.delete(g);}return result;
 }
 async function publish(g){
  if(packs.has(g))return packs.get(g);
  if(publishing.has(g))return publishing.get(g);
  const original=captured.get(g);if(!original)throw Error('Play a new round to create an invitation.');
  const task=(async()=>{
   const params=new URLSearchParams(location.search),config=M.games[g],date=config.daily?original.challengeDate:params.get('daily')||params.get('archive')||null;
   const settings={date,difficulty:config.quiz?original.difficulty||params.get('difficulty')||'easy':null,rounds:date&&['connections','numberroute'].includes(g)?3:config.n||original.targetCount};
   const result=await rpc('create_brainilab_friend_pack',{p_game_id:g,p_spec:C.spec(g,original,settings)});
   if(result?.gameId!==g||!/^[0-9a-f-]{36}$/i.test(result?.id||'')||C.canonical(C.project(g,result.payload))!==C.canonical(C.project(g,original)))throw Error('The questions changed while you were playing. Play a new round to invite your friend.');
   if(captured.get(g)!==original)throw Error('A new round has started. Finish it before sharing.');
   packs.set(g,result.id);return result.id;
  })();publishing.set(g,task);try{return await task;}finally{publishing.delete(g);}
 }
 function client(sb){
  if(!sb||!incoming||incoming.v!==2)return sb;
  return {rpc(name,args){
   if(!checkers.has(name))return sb.rpc(name,args);
   if(!loaded)return Promise.resolve({data:null,error:{message:'Your friend’s questions are not ready yet.'}});
   return rpc('check_brainilab_friend_pack',{p_pack_id:incoming.p,p_method:name,p_args:args}).then(data=>({data,error:null}),error=>({data:null,error}));
  }};
 }
 return {run,publish,client,status,retry,packId:g=>packs.get(g)||null,storageSuffix:()=>incoming?.p?':friend:'+incoming.p:''};
})();
