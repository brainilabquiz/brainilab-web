// Prepared release. This switch stays OFF until the checked launch on 19 October.
export const HALLOWEEN = Object.freeze({id:'halloween-2026',enabled:false,start:'2026-10-18T22:00:00Z',end:'2026-11-01T23:00:00Z',zone:'Europe/Madrid'});
export const HALLOWEEN_ARTICLES=Object.freeze(['why-carve-pumpkins-halloween','are-bats-blind','trick-or-treat-meaning-origin']);
const start=Date.parse(HALLOWEEN.start),end=Date.parse(HALLOWEEN.end);
export function halloweenState(now=Date.now(),enabled=HALLOWEEN.enabled){
 const time=Number(now),valid=Number.isFinite(time),active=enabled===true&&valid&&time>=start&&time<end;
 const day=valid?new Intl.DateTimeFormat('en-CA',{timeZone:HALLOWEEN.zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(time):null;
 return {id:HALLOWEEN.id,enabled:enabled===true,active,preview:false,status:enabled!==true?'disabled':!valid||time<start?'upcoming':time>=end?'closed':'active',serverNow:valid?time:null,day,start:HALLOWEEN.start,end:HALLOWEEN.end};
}
export function isHalloweenPath(path){return path==='/halloween'||path.startsWith('/halloween/');}
export function hiddenHalloweenArticle(path){return HALLOWEEN_ARTICLES.some(s=>['/learn/'+s,'/learn/'+s+'/','/learn/'+s+'/index.html'].includes(path));}
export function halloweenPublicConfig(state){return state.active?state:{active:false,enabled:false,status:'unavailable'};}
export function privatePreviewState(day='2026-10-19'){
 if(!/^2026-(10-(?:19|2\d|3[01])|11-01)$/.test(day))throw Error('Invalid private preview day');
 // Noon local avoids the UTC/day and DST boundaries; boundary tests exercise both.
 const now=Date.parse(day+'T12:00:00+01:00');return {...halloweenState(now,true),day,preview:true};
}
