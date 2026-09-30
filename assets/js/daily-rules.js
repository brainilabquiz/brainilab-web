/* Shared Daily contract. Configuration is generated from content/daily-rules.json. */
window.BrainiDailyRules=(()=>{
 const config={version:'daily-choice-v1',startsOn:'2026-10-01',primaryMax:2500,bonusMax:1000,completionXP:250,rotation:['brainmix','connections','mathrush','brainiword','numberroute','orderup','oddoneout','topicrush','sequence','higherlower']};
 const date=()=>new Date().toISOString().slice(0,10);
 function active(day=date()){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&day>=config.startsOn;}
 function lineup(day=date()){
  if(!active(day))return null;
  const offset=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse(config.startsOn+'T00:00:00Z'))/86400000);
  if(!Number.isFinite(offset))return null;
  const rotation=config.rotation,n=rotation.length,index=offset%n;
  // Coprime day steps rotate each role; offsets always produce three distinct games.
  return [rotation[index],rotation[(index+3+Math.floor(offset/n)%3)%n],rotation[(index+7+Math.floor(offset/n)%2)%n]];
 }
 function max(game,day=date()){const ids=lineup(day);return ids?(game===ids[0]?config.primaryMax:ids.slice(1).includes(game)?config.bonusMax:0):2500;}
 function points(raw,game,day=date()){return Math.round(Math.min(2500,Math.max(0,Number(raw)||0))*max(game,day)/2500);}
 function model(day=date()){const ids=lineup(day);return ids?{version:config.version,primary:ids[0],choices:ids.slice(1),maxScore:config.primaryMax+config.bonusMax,maxGames:2,completionXP:config.completionXP}:{version:'legacy',primary:'brainmix',choices:[],maxScore:10000,maxGames:4,completionXP:250};}
 return {config,active,lineup,max,points,model};
})();
