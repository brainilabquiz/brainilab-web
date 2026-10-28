import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {checkPublicPages,PRODUCTION_ORIGIN} from '../lib/site-health.js';
import {publicJSON} from '../lib/public-json.js';
const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--state')throw Error('Use --state with a private local state path');
const statePath=path.resolve(args[1]),result=await checkPublicPages(PRODUCTION_ORIGIN);
try{const r=await fetch(PRODUCTION_ORIGIN+'/api/site-health',{redirect:'manual',signal:AbortSignal.timeout(10000)}),state=await publicJSON(r,32768);if(r.status!==200||state.ok!==true||state.stale||Date.now()-Date.parse(state.latest?.checkedAt)>15*60000)throw Error('Scheduled monitor is unavailable or stale');result.scheduledAt=state.latest.checkedAt;result.lastServerError=state.lastError;}catch{result.ok=false;result.checks.push({path:'/api/site-health',kind:'schedule',ok:false,code:'monitor-unavailable'});}
let previous=null;try{previous=JSON.parse(await readFile(statePath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const incident=result.ok?'':JSON.stringify(result.checks.filter(c=>!c.ok).map(c=>({path:c.path,status:c.status||null,code:c.code||null}))),newIncident=!!incident&&incident!==previous?.incident;
const serverErrorAt=result.lastServerError?.checkedAt||null,missedIncident=result.ok&&!!serverErrorAt&&Date.parse(serverErrorAt)>Date.parse(previous?.checkedAt||new Date(Date.now()-10*60000).toISOString());
await mkdir(path.dirname(statePath),{recursive:true});await writeFile(statePath,JSON.stringify({checkedAt:result.checkedAt,incident,lastServerErrorAt:serverErrorAt,result},null,2));
console.log(JSON.stringify({ok:result.ok,newIncident,missedIncident,checkedAt:result.checkedAt,scheduledAt:result.scheduledAt,failures:result.checks.filter(c=>!c.ok),serverError:missedIncident?result.lastServerError:undefined}));
if(newIncident||missedIncident)process.exitCode=1;
