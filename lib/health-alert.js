export function healthAlert(previous,result,now=Date.now()){
 const failures=result.checks.filter(c=>!c.ok);
 const incident=result.ok?'':JSON.stringify(failures.map(c=>({path:c.path,status:c.status||null,code:c.code||null})));
 const newIncident=!!incident&&incident!==previous?.incident;
 const serverErrorAt=result.lastServerError?.checkedAt||null;
 const seenUntil=Math.max(Date.parse(previous?.checkedAt||new Date(now-10*60000).toISOString()),Date.parse(previous?.lastServerErrorAt||'1970-01-01'));
 const missedIncident=result.ok&&!!serverErrorAt&&Date.parse(serverErrorAt)>seenUntil;
 return {incident,newIncident,missedIncident,serverErrorAt,notify:newIncident||missedIncident};
}
