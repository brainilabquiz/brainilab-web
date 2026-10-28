import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {productionPreflight,verifyRelease,PREVIEW_NAME,PREVIEW_ORIGIN} from './release-check.mjs';
const mode=process.argv[2];if(!['preview','production'].includes(mode))throw Error('Choose preview or production');
const npm=process.env.npm_execpath;if(!npm||!npm.endsWith('npm-cli.js'))throw Error('Run with npm run deploy:checked');
async function wrangler(command,extra=[]){return new Promise((resolve,reject)=>{let tail='';const child=spawn(process.execPath,[npm,'exec','--yes','--package=wrangler@4.155.0','--','wrangler',command,...extra],{stdio:['ignore','pipe','pipe'],shell:false});for(const [stream,target]of [[child.stdout,process.stdout],[child.stderr,process.stderr]])stream.on('data',data=>{target.write(data);tail=(tail+data.toString()).slice(-20000);});child.on('error',reject);child.on('close',code=>code===0?resolve(tail):reject(Error('Wrangler failed with exit '+code)));});}
if(mode==='production'){
 await productionPreflight(); // fail closed before any production upload
 await wrangler('deploy');
 console.log('PASS production publication followed matching availability and full Learn/Academy schema checks.');
}else{
 const output=await wrangler('preview',['--name',PREVIEW_NAME]),origin=output.match(/Preview URL:\s*(https:\/\/[a-z0-9-]+-brainilab-web\.brainilabquiz\.workers\.dev)\b/)?.[1];
 if(origin!==PREVIEW_ORIGIN)throw Error('No verified preview URL in deployment output');
 await verifyRelease(origin,JSON.parse(await readFile('dist/_release.json','utf8')),{onResult:r=>console.log(JSON.stringify({stage:'preview',checkedAt:r.checkedAt,ok:r.ok,checks:r.checks.length})),onSchema:r=>console.log(JSON.stringify({stage:'preview-schema',checkedAt:r.checkedAt,ok:r.ok,articles:r.articles,courses:r.courses,checked:r.checked,problems:r.problems}))});
 console.log('PASS preview availability through two cache expirations and full Learn/Academy schema audit.');
}
