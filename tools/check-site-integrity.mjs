/* Build-time tripwire: syntax, unresolved merges, unsafe publication and Daily contract. */
import {readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import './test-daily-choice.mjs';
let scripts=0,pages=0;
async function scan(dir){
 for(const entry of await readdir(dir,{withFileTypes:true})){
  if(['.git','node_modules','dist','tools','supabase','content'].includes(entry.name))continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory()){await scan(file);continue;}
  if(!/\.(js|html|css)$/.test(file)||file.startsWith('editor'+path.sep)||file.startsWith('lib'+path.sep))continue;
  const text=await readFile(file,'utf8');
  if(/^(?:<{7} |={7}$|>{7} )/m.test(text))throw Error('Unresolved merge markers: '+file);
  if(file.endsWith('.js')&&file!=='worker.js'){new vm.Script(text,{filename:file});scripts++;}
  if(file.endsWith('.html')){
   pages++;
   for(const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/application\/(?:ld\+)?json/.test(match[1]))JSON.parse(match[2]);
    else if(!/\bsrc=|type=["']module/.test(match[1])&&match[2].trim())new vm.Script(match[2],{filename:file});
   }
  }
 }
}
await scan('.');
const shell=(await readFile('assets/js/shell.bundle.js','utf8')).replaceAll('\r\n','\n');
if(shell.indexOf('window.BrainiDailyRules=')>shell.indexOf('window.BrainiData'))throw Error('Daily rules must load before data');
for(const file of ['daily-rules.js','daily-choice-guard.js','data.js']){
 const source=(await readFile('assets/js/'+file,'utf8')).replaceAll('\r\n','\n').trim();if(!shell.includes(source))throw Error('Stale shell bundle: '+file);
}
console.log(`PASS site integrity: ${scripts} scripts, ${pages} HTML pages, inline JS/JSON, merge conflicts and shell consistency.`);
