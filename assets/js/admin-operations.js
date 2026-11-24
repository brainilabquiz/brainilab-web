/* Read-only operational summaries. Unknown data never becomes a failing zero. */
window.BrainiAdminOperations=(()=>{
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function count(value){
  if(typeof value!=='number' && !(typeof value==='string' && /^\d+$/.test(value)))return null;
  const parsed=Number(value);
  return Number.isSafeInteger(parsed)&&parsed>=0?parsed:null;
 }
 const pools=[['brainiword','BrainiWord',61],['topicrush','Topic Rush',15],['orderup','Order Up',30],['connections','Connections',20],['oddoneout','Odd One Out',20],['higherlower','Higher or Lower',20],['numberroute','Number Route',20],['sequence','Sequence',20]];
 const sources={dashboard:'admin_get_dashboard',system:'admin_get_system_health',daily:'admin_get_daily_health',operations:'admin_get_operations_overview'};
 async function load(rpc,{timeoutMs=12000,previous=null}={}){
  const keys=Object.keys(sources).filter(key=>!previous||previous.errors[key]);
  const bounded=name=>{let timer;return Promise.race([Promise.resolve().then(()=>rpc(name)),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Check timed out.')),timeoutMs);})]).finally(()=>clearTimeout(timer));};
  const responses=await Promise.allSettled(keys.map(key=>bounded(sources[key])));
  const result={...previous,errors:{}};
  responses.forEach((response,i)=>{
   const value=response.status==='fulfilled'?response.value:null;
   if(value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length){
    result[keys[i]]=value;
   }else{
    result.errors[keys[i]]=true;
   }
  });
  if(Object.keys(sources).every(key=>result.errors[key]))throw Error('The dashboard could not be loaded. Refresh to try again.');
  return result;
 }
 function verifiedRate(operations){
  const today=operations?.results?.today;
  const eligible=count(today?.eligible),verified=count(today?.verified);
  return eligible>0 && verified!==null && verified<=eligible?Math.round(verified/eligible*1000)/10:null;
 }
 function poolRows(operations){return pools.map(([id,name,minimum])=>{const total=count(operations?.pools?.[id]);return {id,name,minimum,count:total,ready:total===null?null:total>=minimum};});}
 function resultHTML(operations,labels={}){
  const s=operations?.results,pending=count(s?.pending),checking=count(s?.checking);
  if(pending===null || (pending===0 && checking===null))return '<section class="admin-panel admin-result-status"><h2>Result checks unavailable</h2><p>Refresh this view to check saved games.</p></section>';
  const practice=count(s.practice),rows=Array.isArray(operations.pending_rows)?operations.pending_rows:[];
  const practiceNote=practice===null?'':`${practice} practice or local ${practice===1?'result':'results'} kept separate. `;
  const title=pending?`${pending} saved ${pending===1?'game needs':'games need'} a check`:checking?'Recent games are being checked':'Saved ranked games are verified';
  const description=pending?'Open a result to see what is missing. Players’ original answers must pass the normal verifier.':checking?'New results can take a moment to finish verification. Refresh to check again.':'No pending ranked results were found in the last seven days.';
  return `<section class="admin-panel admin-result-status" aria-label="Saved game checks"><div class="admin-panel-head"><div><h2>${esc(title)}</h2><p>${esc(description)}</p></div><span class="admin-result-indicator" data-state="${pending?'check':checking?'pending':'ok'}">${pending?'Review':checking?'Checking':'Up to date'}</span></div><p class="admin-result-scope">${practiceNote}Checks cover games received by the server.</p>${rows.length?`<details ${pending?'open':''}><summary>Review saved games · ${rows.length}</summary><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th scope="col">Game</th><th scope="col">Saved</th><th scope="col">What to check</th><th scope="col">Action</th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${esc(labels[row.game_id]||row.game_id)}</th><td>${esc(new Date(row.created_at).toLocaleString('en-GB',{timeZone:'UTC'}))} UTC</td><td>${row.reason==='missing_evidence'?'Original answers unavailable':'Answer verification pending'}</td><td><button type="button" class="admin-button" data-result-diagnostic="${esc(row.result_id)}">View result</button></td></tr>`).join('')}</tbody></table></div></details>`:''}</section>`;
 }
 return Object.freeze({load,count,verifiedRate,poolRows,resultHTML});
})();
