/* Optional first-party attribution. Auth owns confirmation; this never infers a new account. */
window.BrainiGrowthConversions=(()=>{
 const key='brainilab_registration_arrival_v1',consentKey='brainilab_statistics_consent_v1',ttl=7*86400000;
 let busy=false,rerun=false,epoch=0;
 const production=()=>['brainilabgames.com','www.brainilabgames.com'].includes(location.hostname);
 function consent(){try{const c=JSON.parse(localStorage.getItem(consentKey));return c?.allowed===true&&c.at<=Date.now()&&Date.now()-c.at<180*86400000;}catch{return false;}}
 function clear(){try{localStorage.removeItem(key);}catch{}}
 function read(){try{const p=JSON.parse(localStorage.getItem(key));if(!p||!Number.isFinite(p.requestedAt)||Date.now()-p.requestedAt>ttl||p.requestedAt>Date.now()){clear();return null;}return p;}catch{clear();return null;}}
 function prepare(){
  if(!production()||!consent())return;
  const entry=window.BrainiSiteAnalytics?.registrationContext?.();if(!entry)return;
  const pending={channel:entry.channel,path:entry.path,startedAt:entry.startedAt,requestedAt:Date.now()};
  try{localStorage.setItem(key,JSON.stringify(pending));}catch{}
 }
 function accountRpc(session,name,args){
  // Pin this one request to the captured session even if the SDK switches accounts before sending.
  return window.BrainiBackendAuth.getClient().rpc(name,args).setHeader('Authorization','Bearer '+session.access_token);
 }
 async function withdraw(id,requested,session){
  try{
   const queue=window.BrainiGrowthWithdrawals;
   const markers=await queue.pending(id,requested);
   if(!markers.length)return true;
   session??=await window.BrainiBackendAuth?.getSession?.();
   if(!session?.access_token||session.user?.is_anonymous||session.user?.id!==id)return;
   const {error}=await accountRpc(session,'withdraw_brainilab_account_arrival');
   if(error)return;
   queue.acknowledge(markers);
   return true;
  }catch{/* Keep the account-bound request for the next authenticated visit or reconnect. */}
 }
 function consentChanged(){
  if(consent()){void flush();return;}
  epoch++;clear();
 }
 async function flush(){
  if(!production())return;
  if(busy){rerun=true;return;}
  if(!consent())clear();
  const pending=read(),retry=window.BrainiGrowthWithdrawals?.any();
  if(!pending&&!retry)return;
  const run=epoch;busy=true;
  try{
   const session=await window.BrainiBackendAuth?.getSession?.();
   if(!session?.access_token||!session.user?.id||session.user.is_anonymous)return;
   if(retry&&!await withdraw(session.user.id,false,session))return;
   if(!pending||!consent()||run!==epoch)return;
   try{
    const {data,error}=await accountRpc(session,'record_brainilab_account_arrival',{p_channel:pending.channel,p_path:pending.path,p_started_at:new Date(pending.startedAt).toISOString(),p_requested_at:new Date(pending.requestedAt).toISOString()});
    if(consent()&&run===epoch&&!error&&['recorded','already_recorded','ineligible'].includes(data?.status))clear();
   }finally{
    // A failed response can still follow a committed write. Remove it under the original account.
    if(!consent()||run!==epoch)await withdraw(session.user.id,true);
   }
  }catch{/* Keep the short-lived context for a later authenticated visit; never interrupt sign-in. */}
  finally{busy=false;if(rerun){rerun=false;queueMicrotask(()=>{void flush();});}}
 }
 window.addEventListener('brainilab:backend-auth',()=>{void flush();});
 window.addEventListener('brainilab:cloudready',()=>{void flush();});
 window.addEventListener('online',()=>{void flush();});
 window.addEventListener('brainilab:statistics-consent',consentChanged);
 window.addEventListener('storage',e=>{if(e.key===consentKey||e.key===null){if(!consent()){epoch++;clear();}void flush();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void flush();},{once:true});else queueMicrotask(()=>{void flush();});
 return {prepare,flush};
})();
