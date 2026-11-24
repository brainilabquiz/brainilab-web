/* Account-scoped receipts for an outstanding privacy request, including before cloud auth loads. */
window.BrainiGrowthWithdrawals=(()=>{
 if(window.BrainiGrowthWithdrawals)return window.BrainiGrowthWithdrawals;
 const prefix='brainilab_arrival_withdraw_v1:';
 const memory=new Set();
 function any(){
  if(memory.size)return true;
  try{return Object.keys(localStorage).some(key=>key.startsWith(prefix));}catch{return false;}
 }
 async function pending(userId,request=false){
  // Without Web Crypto the receipt may live only in this page's memory.
  let account=userId+':',persistent=false;
  if(globalThis.crypto?.subtle){
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(prefix+userId));
   account=prefix+Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')+':';
   persistent=true;
  }
  if(request){
   // Distinct keys let an older acknowledgement clear only the requests it actually sent.
   const key=account+crypto.getRandomValues(new Uint32Array(4)).join('-');
   memory.add(key);
   try{if(persistent){localStorage.setItem(key,'1');memory.delete(key);}}catch{/* Retry in memory. */}
  }
  const keys=[...memory].filter(key=>key.startsWith(account));
  try{if(persistent)keys.push(...Object.keys(localStorage).filter(key=>key.startsWith(account)));}catch{}
  return keys;
 }
 function acknowledge(keys){
  for(const key of keys){
   memory.delete(key);
   try{if(key.startsWith(prefix))localStorage.removeItem(key);}catch{/* A later retry is idempotent. */}
  }
 }
 return {any,pending,acknowledge};
})();
