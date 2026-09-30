/* Authoritative eligibility/extra selection before mounting a scored game. */
window.BrainiDailyChoiceGuard=(()=>{
 const paths={brainmix:'brain-mix',brainiword:'brainiword',orderup:'order-up',topicrush:'topic-rush',connections:'connections',oddoneout:'odd-one-out',higherlower:'higher-lower',mathrush:'math-rush',numberroute:'number-route',sequence:'sequence'};
 const params=new URLSearchParams(location.search);
 const game=Object.keys(paths).find(id=>location.pathname.split('/').includes(paths[id]));
 const day=params.get('daily')||new Date().toISOString().slice(0,10);
 const dailyOnly=['brainmix','brainiword','orderup','topicrush'].includes(game);
 const active=!!game&&(params.has('daily')||dailyOnly)&&!params.has('archive')&&params.get('try')!=='1'&&window.BrainiDailyRules?.active(day);
 let pending;
 async function rpc(client,name,args){let timer;try{return await Promise.race([client.rpc(name,args),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Connection timed out')),8000);})]);}finally{clearTimeout(timer);}}
 async function validate(){
  if(!active)return {allowed:true};
  if(day!==new Date().toISOString().slice(0,10))return {allowed:false,message:'That Daily has ended. Pick today’s challenge or play for practice.'};
  const ids=BrainiDailyRules.lineup(day);
  if(!ids.includes(game))return {allowed:false,message:'This game is not in today’s Daily. You can still play another round for practice.'};
  try{
   const client=window.BrainiBackendAuth?.getClient?.();
   if(!client)throw new Error('Connection unavailable');
   const {data,error}=await rpc(client,'get_brainilab_daily_lineup',{p_challenge_date:day});
   if(error)throw error;
   if(data?.rules_version!=='daily-choice-v1'||JSON.stringify(data.games)!==JSON.stringify(ids)||data.max_score!==3500||data.extra_max!==1000)throw new Error('Daily rules are updating');
   if(game!==ids[0]){
    let sessionTimer;
    try{await Promise.race([BrainiBackendAuth.ensurePlayerSession(),new Promise((_,reject)=>{sessionTimer=setTimeout(()=>reject(new Error('Connection timed out')),8000);})]);}finally{clearTimeout(sessionTimer);}
    const chosen=await rpc(client,'choose_brainilab_daily_extra',{p_game_id:game,p_challenge_date:day});
    if(chosen.error)throw chosen.error;
    BrainiData.setDailyBonusChoice(chosen.data.game_id);
   }
   return {allowed:true};
  }catch(error){
   const text=String(error?.message||'');
   return {allowed:false,message:text.includes('already chosen')?'You have already chosen your extra for today.':text.includes('main Daily first')?'Complete the main Daily first. If you just finished, wait for your result to sync.':'Your Daily could not be checked. Please reconnect and try again.'};
  }
 }
 async function check(root){
  if(!active)return false;
  pending ||=validate();
  const result=await pending;
  if(result.allowed)return false;
  const target=root||document.querySelector('.labgame-shell');
  if(target){
   target.innerHTML='<section class="daily-load-error" role="status"><h2>Let’s get you to the right game</h2><p></p><a class="btn" href="/daily-quiz/">Today’s Daily</a> <a class="btn-light" href="/games/">All games</a> <button class="btn-light" type="button">Retry</button></section>';
   target.querySelector('p').textContent=result.message;
   target.querySelector('button').onclick=()=>location.reload();
  }
  return true;
 }
 return {active,check};
})();
