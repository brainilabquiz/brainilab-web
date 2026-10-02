/* Optional first-party attribution. Auth owns confirmation; this never infers a new account. */
window.BrainiGrowthConversions=(()=>{
 const key='brainilab_registration_arrival_v1',consentKey='brainilab_statistics_consent_v1',ttl=7*86400000;
 let busy=false,epoch=0;
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
 async function withdraw(){
  epoch++;clear();if(!production())return;
  try{const session=await window.BrainiBackendAuth?.getSession?.();if(session?.user&&!session.user.is_anonymous)await window.BrainiBackendAuth.getClient().rpc('withdraw_brainilab_account_arrival');}catch{}
 }
 async function flush(){
  if(busy||!production())return;
  if(!consent()){clear();return;}
  const pending=read();if(!pending)return;
  const run=epoch;busy=true;
  try{
   const session=await window.BrainiBackendAuth?.getSession?.();
   if(!session?.user||session.user.is_anonymous||!consent()||run!==epoch)return;
   const client=window.BrainiBackendAuth.getClient();
   const {data,error}=await client.rpc('record_brainilab_account_arrival',{p_channel:pending.channel,p_path:pending.path,p_started_at:new Date(pending.startedAt).toISOString(),p_requested_at:new Date(pending.requestedAt).toISOString()});
   if(!consent()||run!==epoch){await client.rpc('withdraw_brainilab_account_arrival');return;}
   if(!error&&['recorded','already_recorded','ineligible'].includes(data?.status))clear();
  }catch{/* Keep the short-lived context for a later authenticated visit; never interrupt sign-in. */}
  finally{busy=false;}
 }
 window.addEventListener('brainilab:backend-auth',()=>{void flush();});
 window.addEventListener('brainilab:cloudready',()=>{void flush();});
 window.addEventListener('brainilab:statistics-consent',()=>{if(!consent())void withdraw();else void flush();});
 window.addEventListener('storage',e=>{if(e.key===consentKey||e.key===null){if(!consent())void withdraw();else void flush();}});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{void flush();},{once:true});else queueMicrotask(()=>{void flush();});
 return {prepare,flush};
})();
