/* Browser-only event collection, isolated from the main player/progression store. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BrainiHalloweenGuestModel=api;})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const games=['trick-or-think','spooky-connections'];
 const validDay=day=>/^2026-(10-(?:19|2\d|3[01])|11-01)$/.test(day);
 function clean(input){
  const records=[];
  for(const r of Array.isArray(input?.records)?input.records:[]){
   if(!r||!games.includes(r.game)||!validDay(r.day)||typeof r.id!=='string'||r.id.length>100||records.some(x=>x.id===r.id))continue;
   if(!Number.isInteger(r.score)||r.score<0||r.score>100)continue;
   records.push({id:r.id,game:r.game,day:r.day,score:r.score});if(records.length>=1000)break;
  }
  return {version:1,records};
 }
 function state(input){
  const ledger=clean(input),distinct=new Set(ledger.records.map(r=>r.game)),days=new Set(ledger.records.map(r=>r.day));
  const entitlements=[];if(ledger.records.length)entitlements.push('pumpkin-thinker');if(distinct.size>=2)entitlements.push('midnight');if(days.size>=3)entitlements.push('little-bat');
  return {entitlements,progress:{games_completed:ledger.records.length,distinct_games:distinct.size,days_played:days.size}};
 }
 function complete(input,record){
  const ledger=clean(input);
  if(!record||!games.includes(record.game)||!validDay(record.day)||typeof record.id!=='string'||!record.id||!Number.isInteger(record.score)||record.score<0||record.score>100)throw Error('Invalid Halloween completion');
  const found=ledger.records.find(r=>r.id===record.id);
  if(found){if(found.game!==record.game||found.day!==record.day||found.score!==record.score)throw Error('Conflicting completion');return ledger;}
  if(ledger.records.some(r=>r.game===record.game&&r.day===record.day))return ledger;
  ledger.records.push({...record});return clean(ledger);
 }
 return Object.freeze({clean,state,complete,validDay});
});
