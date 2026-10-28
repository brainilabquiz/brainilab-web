export function healthAlert(previous,result,now=Date.now()){
 const failures=result.checks.filter(c=>!c.ok);
 const incident=result.ok?'':JSON.stringify(failures.map(c=>({path:c.path,status:c.status||null,code:c.code||null})));
 const newIncident=!!incident&&incident!==previous?.incident;
 const serverErrorAt=result.lastServerError?.checkedAt||null;
 const missedIncident=result.ok&&!!serverErrorAt&&Date.parse(serverErrorAt)>Date.parse(previous?.checkedAt||new Date(now-10*60000).toISOString());
 return {incident,newIncident,missedIncident,serverErrorAt,notify:newIncident||missedIncident};
}
