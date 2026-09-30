import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
let response,payload;
const context={window:null,BrainiData:{authState:()=>({anonymousPlayerId:'local-test'})}};
context.window=context;
context.BrainiBackendAuth={isConfigured:()=>true,getClient:()=>({rpc:async(name,args)=>{assert.equal(name,'submit_brainilab_suggestion');payload=args;return response;}})};
vm.runInNewContext(readFileSync('assets/js/supabase-feedback.js','utf8'),context);
for(const data of [null,{},[],{ok:false},{ok:true},{ok:true,suggestion_id:''}]){
 response={data,error:null};await assert.rejects(()=>context.BrainiFeedback.submit({message:'Useful feedback.'}));
}
response={data:null,error:new Error('offline')};await assert.rejects(()=>context.BrainiFeedback.submit({}));
response={data:{ok:true,suggestion_id:'confirmed-receipt'},error:null};
assert.equal((await context.BrainiFeedback.submit({type:'bug',message:'The button does not respond.'})).suggestion_id,'confirmed-receipt');
assert.equal(payload.p_email,null);assert.equal(payload.p_client_id,'local-test');
console.log('PASS: missing, invalid and failed server receipts cannot confirm delivery; a confirmed receipt preserves the existing RPC contract.');
