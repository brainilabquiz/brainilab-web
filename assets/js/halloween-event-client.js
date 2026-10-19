/* Same-origin event coordinator. Private previews never contact account RPCs. */
(function(){
 'use strict';
 let config={},baseTick=performance.now();
 try{config=JSON.parse(document.querySelector('script[data-halloween-config]')?.textContent||'{}');}catch{}
 const local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
 if(config.preview&&!local)config={active:false};
 const preview=config.preview===true&&local;
 const model=()=>window.BrainiHalloweenGuestModel;
 const eventStore=()=>window.BrainiHalloweenEntitlements;
 const emit=()=>window.dispatchEvent(new CustomEvent('brainilab:halloween-progress'));
 const terminalError=(message,code)=>Object.assign(Error(message),{code});
 const windowError=()=>terminalError(availability().message,'HALLOWEEN_CLOSED');
 function accountError(error,session){
  if(/Halloween (?:session is not open|games are not open)/.test(error?.message||'')){
   const now=Number(config.serverNow)+(performance.now()-baseTick);
   const day=Number.isFinite(now)?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(now):config.day;
   if(session?.day&&session.day!==day&&now<Date.parse(config.end))return terminalError('A new Halloween day has begun. Start a fresh game to save today’s progress.','HALLOWEEN_DAY_CHANGED');
   return terminalError('This Halloween special is not open. Your last result has not been added to your collection.','HALLOWEEN_CLOSED');
  }
  return error;
 }
 function who(){
  const a=window.BrainiData?.authState?.()||{};
  if(!preview&&a.status==='authenticated'&&a.user?.id)return {key:'account:'+a.user.id,cloud:true};
  let id=a.guestUserId||a.anonymousPlayerId;
  if(!id){try{id=localStorage.getItem('brainilab-halloween-guest-id');if(!id){id=crypto.randomUUID();localStorage.setItem('brainilab-halloween-guest-id',id);}}catch{id='this-browser';}}
  return {key:(preview?'preview:':'guest:')+id,cloud:false};
 }
 function availability(){
  const now=Number(config.serverNow)+(performance.now()-baseTick);
  const allowed=config.active===true&&config.enabled===true&&(preview||Number.isFinite(now)&&now>=Date.parse(config.start)&&now<Date.parse(config.end));
  const day=preview?config.day:Number.isFinite(now)?new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(now):config.day;
  return {allowed,preview,day,message:allowed?'':config.status==='closed'||Number.isFinite(now)&&now>=Date.parse(config.end)?'This Halloween special has finished.':'This special is not open yet.'};
 }
 async function refresh(){
  if(preview)return availability();
  const r=await fetch('/api/halloween/config',{cache:'no-store',credentials:'same-origin',signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('Halloween could not be checked. Please try again.');
  config=await r.json();baseTick=performance.now();return availability();
 }
 const ledgerKey=()=>`brainilab-halloween-2026:${who().key}`;
 function read(){try{return model().clean(JSON.parse(localStorage.getItem(ledgerKey())||'null'));}catch{return model().clean();}}
 function guestState(){return model()?.state(read())||{entitlements:[],progress:{games_completed:0,distinct_games:0,days_played:0}};}
 function guestEntitlements(){return who().cloud?[]:guestState().entitlements;}
 function snapshot(){
  const day=availability().day;
  if(who().cloud)return {...(eventStore()?.snapshot?.()||{error:'Checking your collection…',entitlements:[],progress:{}}),cloud:true,activity:{day,known:false}};
  const ledger=read();
  return {...model().state(ledger),cloud:false,preview,activity:{day,known:true,completedGames:[...new Set(ledger.records.map(r=>r.game))],resultsToday:ledger.records.filter(r=>r.day===day)}};
 }
 async function startGame(game){
  if(!['trick-or-think','spooky-connections'].includes(game))throw Error('Unknown Halloween game.');
  if(!(await refresh()).allowed)throw windowError();
  const current=who();
  if(current.cloud){const r=await eventStore().startGame(game);if(who().key!==current.key)throw Error('Your account changed. Please start again.');return {...r,day:r.day||availability().day,ownerKey:current.key,preview:false,guest:false};}
  const day=availability().day,prior=read().records.find(r=>r.game===game&&r.day===day);
  return {session_id:prior?.id||crypto.randomUUID(),game,day,ownerKey:current.key,preview,guest:true,completed:!!prior,result:prior?{score:prior.score,maxScore:100}:null,pack:window.BrainiHalloweenGameModel.publicPack(game)};
 }
 async function completeGame(payload){
  const current=who(),session=payload.sessionId;
  // The controller passes the complete start response, never an arbitrary score.
  const s=typeof session==='object'?session:payload.session;
  if(!s||s.ownerKey!==current.key||s.preview!==preview||s.game!==payload.gameId)throw Error('This game belongs to another session. Please start again.');
  const verifiedSummary=window.BrainiHalloweenGameModel.summary(payload.gameId,payload.submission,true);
  if(current.cloud){
   const before=eventStore().snapshot().entitlements||[];
   let result;try{result=await eventStore().completeGame(s.session_id,payload.submission);}catch(error){throw accountError(error,s);}
   if(who().key!==current.key)throw Error('Your account changed. Please check your collection.');emit();
   return {...result,saved:true,unlocks:result.replayed?[]:(result.state?.entitlements||[]).filter(id=>!before.includes(id)),verifiedSummary:result.result?{...result.result,maxScore:100}:verifiedSummary};
  }
  // Already-saved sessions are safe to read back even after the earning window.
  const key=ledgerKey(),previous=read(),already=previous.records.find(r=>r.id===s.session_id);
  if(!already&&!(await refresh()).allowed)throw windowError();
  if(who().key!==current.key)throw Error('Your account changed. Please start again.');
  if(!already&&s.day!==config.day)throw terminalError('A new Halloween day has begun. Start a fresh game to save today’s progress.','HALLOWEEN_DAY_CHANGED');
  const commit=()=>{
   if(who().key!==current.key)throw Error('Your account changed. Please start again.');
   const latest=read(),prior=latest.records.find(r=>r.id===s.session_id||r.game===payload.gameId&&r.day===s.day);
   if(prior)return {saved:true,preview,replayed:true,result:{score:prior.score,maxScore:100},unlocks:[],verifiedSummary:{...verifiedSummary,score:prior.score},state:model().state(latest)};
   const access=availability();
   if(!access.allowed)throw windowError();
   if(s.day!==access.day)throw terminalError('A new Halloween day has begun. Start a fresh game to save today’s progress.','HALLOWEEN_DAY_CHANGED');
   const record={id:s.session_id,game:payload.gameId,day:access.day,score:verifiedSummary.score};
   const next=model().complete(latest,record),before=model().state(latest),after=model().state(next);
   try{localStorage.setItem(key,JSON.stringify(next));if(localStorage.getItem(key)!==JSON.stringify(next))throw Error('Unconfirmed save');}
   catch{throw Error('Your browser could not save this collection. Keep this page open and try again.');}
   window.dispatchEvent(new CustomEvent('brainilab:halloween-entitlements'));emit();
   return {saved:true,preview,unlocks:after.entitlements.filter(id=>!before.entitlements.includes(id)),verifiedSummary,state:after};
  };
  return navigator.locks?.request?navigator.locks.request(key,{mode:'exclusive',signal:AbortSignal.timeout(8000)},commit):commit();
 }
 window.BrainiLabHalloween=Object.freeze({availability,refresh,startGame,completeGame,guestEntitlements,snapshot,identityKey:()=>who().key});
 window.addEventListener('brainilab:authchange',()=>{if(!preview&&who().cloud)eventStore()?.load?.();emit();});
 window.addEventListener('storage',event=>{if(event.key===ledgerKey())emit();});
 if(!preview&&who().cloud)eventStore()?.load?.();
})();
