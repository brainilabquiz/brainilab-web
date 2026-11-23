import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const repo=fileURLToPath(new URL('../',import.meta.url));
const home=path.resolve(process.env.BRAINILAB_TOOLKIT_HOME||path.join(repo,'..'));
const windows=process.platform==='win32';
const voicePython=path.join(home,'upstream-voice','.venv',windows?'Scripts/python.exe':'bin/python');
const voiceClient=path.join(home,'voice-env',windows?'Scripts/voicestudio.exe':'bin/voicestudio');
const command=process.argv[2]||'status',args=process.argv.slice(3);
if(args[0]==='--')args.shift();
const exists=async file=>{try{await fs.access(file);return true}catch{return false}};
async function status(url){try{const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(5000)});await r.body?.cancel();return r.status}catch{return null}}
async function run(executable,parameters,cwd,extra={}){
 if(!await exists(executable))throw Error('Tool is not installed at '+executable+'. Set BRAINILAB_TOOLKIT_HOME to the private installation folder.');
 const child=spawn(executable,parameters,{cwd,stdio:'inherit',windowsHide:true,env:{...process.env,...extra}});
 child.on('error',error=>{console.error(error.message);process.exitCode=2});
 child.on('exit',code=>{process.exitCode=code??2});
}
if(command==='status'){
 const sources=JSON.parse(await fs.readFile(new URL('./web-audit/sources.json',import.meta.url),'utf8'));
 const report={checkedAt:new Date().toISOString(),privateHome:home,
  guidance:await exists(path.join(repo,'node_modules/modern-web-guidance/package.json')),
  ryzeSkills:(await Promise.all((await fs.readdir(path.join(repo,'.agents/skills'))).filter(name=>name.startsWith('ryze-')).map(name=>exists(path.join(repo,'.agents/skills',name,'SKILL.md'))))).filter(Boolean).length,
  kit:await exists(path.join(repo,'tools/vendor/kit-audit-web/lib/inventaire.py')),
  linkChecker:await exists(path.join(repo,'tools/web-audit/node_modules/broken-link-checker/package.json')),
  openSeo:{installed:await exists(path.join(home,'upstream-open-seo/node_modules/vite/bin/vite.js')),localStatus:await status('http://127.0.0.1:3903/')},
  imageStudio:{installed:await exists(path.join(home,'upstream-higgsfield/node_modules/next/dist/bin/next')),state:'standby: user paused activation; generation is not configured'},
  voice:{client:await exists(voiceClient),backend:await exists(voicePython),localStatus:await status('http://127.0.0.1:3900/health')},sources};
 console.log(JSON.stringify(report,null,2));
}else if(command==='seo'){
 await run(process.execPath,[path.join(home,'upstream-open-seo/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','3903'],path.join(home,'upstream-open-seo'),{AUTH_MODE:'local_noauth',WRANGLER_SEND_METRICS:'false'});
}else if(command==='images'){
 await run(process.execPath,[path.join(home,'upstream-higgsfield/node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3902'],path.join(home,'upstream-higgsfield'),{NEXT_TELEMETRY_DISABLED:'1'});
}else if(command==='voice-server'){
 await run(voicePython,['-m','uvicorn','backend.main:app','--app-dir',path.join(home,'upstream-voice'),'--host','127.0.0.1','--port','3900'],home,
 {OMNIVOICE_DATA_DIR:path.join(home,'voice-data'),OMNIVOICE_CACHE_DIR:path.join(home,'voice-cache'),OMNIVOICE_PRELOAD_CAPTURE_ASR:'0',OMNIVOICE_PRELOAD_TTS_ASR:'0',OMNIVOICE_PRELOAD_WATERMARK:'0',PYTHONUTF8:'1'});
}else if(command==='voice'){
 await run(voiceClient,['--url','http://127.0.0.1:3900',...args],home);
}else throw Error('Choose status, seo, images, voice-server or voice');
