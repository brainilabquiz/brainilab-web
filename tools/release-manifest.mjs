import {createHash} from 'node:crypto';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
async function files(directory){const out=[];for(const e of await readdir(directory,{withFileTypes:true})){const p=path.join(directory,e.name);if(e.isDirectory())out.push(...await files(p));else if(e.isFile())out.push(p);}return out.sort();}
export async function releaseManifest(root='.'){
 const hash=createHash('sha256'),paths=['worker.js','wrangler.jsonc',...await files(path.join(root,'lib')),...await files(path.join(root,'dist'))];
 for(const name of paths){const full=path.isAbsolute(name)?name:path.resolve(root,name),relative=path.relative(root,full).replaceAll('\\','/');if(relative==='dist/_release.json')continue;hash.update(relative+'\0');hash.update(await readFile(full));hash.update('\0');}
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();if(!/^[0-9a-f]{40}$/.test(commit))throw Error('Invalid build revision');
 const result={schemaVersion:1,commit,runtimeHash:hash.digest('hex')};await writeFile(path.join(root,'dist/_release.json'),JSON.stringify(result));return result;
}
