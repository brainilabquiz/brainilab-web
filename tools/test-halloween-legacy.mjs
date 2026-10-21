import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await Promise.all(['halloween-guest-model','halloween-legacy-recovery'].map(x=>readFile(new URL('../assets/js/'+x+'.js',import.meta.url),'utf8')));
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;console.log('PASS',label);};
const record=(id,day='2026-10-19',game='trick-or-think')=>({id,day,game,score:50});
function harness(){
 const storage=new Map(),calls=[],events=[];let user={id:'account-a',is_anonymous:false},auth={status:'authenticated',user,anonymousPlayerId:'browser-a'},offline=false,hold=null,badAck=false;
 const w=vm.createContext({console,Date,Math,JSON,setTimeout,clearTimeout,location:{hostname:'brainilabgames.com'},CustomEvent:class{constructor(type){this.type=type;}},
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},dispatchEvent:e=>events.push(e.type),
 BrainiData:{authState:()=>auth},BrainiBackendAuth:{getClient:()=>({auth:{getSession:async()=>({data:{session:{user}}})},rpc:async(name,args)=>{calls.push({name,args});if(hold){const wait=hold;hold=null;await wait;}if(offline)return {error:Error('Offline')};return {data:{recovered:true,owner:user.id,accepted_ids:badAck?[]:args.p_records.map(r=>r.id)}};}})}});
 w.window=w;source.forEach(s=>vm.runInContext(s,w));
 return {w,storage,calls,events,api:w.BrainiHalloweenLegacy,save:(id,records)=>storage.set('brainilab-halloween-2026:guest:'+id,JSON.stringify({version:1,records})),
 setUser:u=>{user=u;auth={...auth,user,status:u.is_anonymous?'guest':'authenticated'};},setAuth:a=>auth=a,setOffline:v=>offline=v,setBadAck:v=>badAck=v,
 hold:()=>{let release;hold=new Promise(r=>release=r);return release;}};
}
{
 const h=harness();h.save('browser-a',[record('old-a'),record('old-b','2026-10-20','spooky-connections'),record('old-c','2026-10-21')]);
 h.save('other-browser',[record('not-mine')]);h.storage.set('brainilab-halloween-2026:preview:browser-a',JSON.stringify({records:[record('preview')]}));
 check(h.api.capture().length===1,'only current browser identities are collected, not other users or preview ledgers');
 await h.api.recover();check(h.calls.length===1&&h.calls[0].name==='halloween_recover_legacy_cosmetics'&&h.calls[0].args.p_records.length===3,'three legacy days use the cosmetic-only account RPC');
 check(h.calls[0].args.p_records.every(r=>r.owner==='account-a'),'each imported record is bound to the initiating account before sending');
 check(h.api.snapshot().notice.includes('saved with your account'),'success is shown only after account-bound confirmation');
 await h.api.recover();check(h.calls.length===1,'confirmed recovery is not resent on reload');
 check(h.storage.get('brainilab-halloween-2026:guest:browser-a').includes('old-a'),'original browser ledger is retained after success');
 h.save('browser-a',[record('old-a'),record('old-d','2026-10-20')]);await h.api.recover();check(h.calls.length===2,'an additional old record is recovered without deleting prior receipts');
 h.setUser({id:'account-b',is_anonymous:false});check(!h.api.snapshot().notice&&!h.api.snapshot().error,'another account cannot see a prior account recovery notice');
 await h.api.recover();check(h.calls.length===2,'the same browser source is not assigned to a second account');
}
{
 const h=harness();h.save('browser-a',[record('a')]);h.setAuth({status:'guest',anonymousPlayerId:'browser-a'});h.setUser({id:'anonymous-a',is_anonymous:true});await h.api.recover();
 check(!h.calls.length,'guest visits never create or import account rewards');
 h.setUser({id:'account-a',is_anonymous:false});h.w.location.hostname='127.0.0.1';await h.api.recover();check(!h.calls.length,'local previews cannot recover production cosmetics');
}
{
 const h=harness();h.save('browser-a',[record('a'),record('future','2026-10-22'),record('outside','2026-10-18'),record('unknown','2026-10-19','unknown'),{...record('invalid'),score:NaN}]);
 const carried=h.api.capture();await h.api.recover(undefined,[...carried,...carried]);
 check(h.calls.length===1&&h.calls[0].args.p_records.length===1,'invalid, future, duplicate and out-of-event records are excluded');
 h.w.location.hostname='brainilabgames.com';
 const empty=harness();await empty.api.recover();check(!empty.calls.length,'accounts without a legacy ledger make no recovery writes');
}
{
 const h=harness();h.save('old-guest',[record('oauth')]);
 const carried=[{id:'old-guest',records:[record('oauth')]}];await h.api.recover({id:'account-a'},carried);
 check(h.calls.length===1,'OAuth carries the old guest identity across the redirect');
 const wrong=harness();wrong.save('browser-a',[record('wrong')]);await wrong.api.recover({id:'different-account'});
 check(!wrong.calls.length,'an outdated OAuth actor cannot import into the current account');
}
{
 const h=harness();h.save('browser-a',[record('offline')]);h.setOffline(true);
 await assert.rejects(()=>h.api.recover());check(h.api.snapshot().error&&h.storage.get('brainilab-halloween-2026:guest:browser-a'),'failed save keeps the original data and offers retry');
 const receipt=JSON.parse(h.storage.get('brainilab-halloween-recovery-v1:browser-a'));check(!receipt.confirmed,'a failed import is never acknowledged locally');
 h.setOffline(false);await h.api.recover();check(h.calls.length===2&&h.api.snapshot().notice,'reconnecting retries the same original records successfully');
}
{
 const h=harness();h.save('browser-a',[record('ack')]);h.setBadAck(true);await assert.rejects(()=>h.api.recover());
 check(!JSON.parse(h.storage.get('brainilab-halloween-recovery-v1:browser-a')).confirmed,'an incomplete server receipt cannot discard pending recovery');
}
{
 const h=harness();h.save('browser-a',[record('race')]);const release=h.hold();const first=h.api.recover();
 while(!h.calls.length)await new Promise(r=>setTimeout(r,0));const second=h.api.recover();release();await Promise.all([first,second]);
 check(h.calls.length===1,'concurrent profile loads share one recovery request');
}
{
 const h=harness();h.save('browser-a',[record('switch')]);const release=h.hold(),first=h.api.recover();
 while(!h.calls.length)await new Promise(r=>setTimeout(r,0));h.setUser({id:'account-b',is_anonymous:false});release();await assert.rejects(()=>first,/Account changed/);
 check(!JSON.parse(h.storage.get('brainilab-halloween-recovery-v1:browser-a')).confirmed,'switching account during import cannot confirm a receipt for the new account');
 check(!h.api.snapshot().notice&&!h.api.snapshot().error,'old request errors are isolated from the next account');
}
console.log(`${checks} legacy cosmetic browser checks passed.`);
