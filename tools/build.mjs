import {newTabLinks} from '../lib/link-policy.js';
// Publish one clean directory; keep editable sources and historical notes out.
import {build} from 'esbuild';
import {mkdir,copyFile,rm,lstat,stat,readdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import './check-site-integrity.mjs';

const root=path.resolve('.');
const videoBundle=await build({entryPoints:['editor/video-recommendations.js'],write:false,bundle:true,format:'iife',platform:'browser',minify:true,target:'es2020',legalComments:'none'});
const videoMarker='/* related-video bundle */';
const shellSource=await readFile('assets/js/shell.bundle.js','utf8');
await writeFile('assets/js/shell.bundle.js',shellSource.split(videoMarker)[0].trimEnd()+'\n'+videoMarker+'\n'+videoBundle.outputFiles[0].text);
await build({entryPoints:['editor/admin-growth.js'],outfile:'assets/js/admin-growth.bundle.js',bundle:true,format:'iife',platform:'browser',minify:true,target:'es2020',legalComments:'none'});
await build({entryPoints:['editor/reasoning.js'],outfile:'assets/js/reasoning.bundle.js',bundle:true,format:'iife',platform:'browser',minify:true,target:'es2020',legalComments:'none'});
await build({entryPoints:['editor/admin-articles.js'],outfile:'assets/js/admin-articles.bundle.js',bundle:true,format:'iife',platform:'browser',minify:true,target:'es2020',legalComments:'none'});
await build({entryPoints:['editor/admin-learning.js'],outfile:'assets/js/admin-learning.bundle.js',bundle:true,format:'iife',platform:'browser',minify:true,target:'es2020',legalComments:'none'});
await build({entryPoints:['editor/learning-progress.js'],outfile:'assets/js/learning-paths.bundle.js',bundle:true,format:'iife',platform:'browser',minify:true,target:'es2020',legalComments:'none'});
const output=path.resolve(root,'dist');
if(path.relative(root,output)!=='dist') throw new Error('Unsafe build output');
const previous=await lstat(output).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
if(previous?.isSymbolicLink()) throw new Error('Build output must not be a symlink');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const rootPublic=new Set(['ads.txt','robots.txt','sitemap.xml','sw.js','_headers','_redirects']);
async function generatedPages(directory){
  const pages=[];
  for(const entry of await readdir(directory,{withFileTypes:true})){
    const filename=path.join(directory,entry.name);
    if(entry.isDirectory()) pages.push(...await generatedPages(filename));
    else if(entry.name.endsWith('.html'))pages.push(path.relative(root,filename).replaceAll('\\','/'));
  }
  return pages;
}
const candidates=new Set(['learn/feed.xml','assets/js/admin-growth.bundle.js','assets/css/admin-growth.css','assets/js/admin-learning.bundle.js','assets/js/learning-paths.bundle.js','assets/js/admin-articles.bundle.js',...files.filter(file=>!file.startsWith('tools/')&&(file.startsWith('assets/')||file.endsWith('.html')||rootPublic.has(file))),...await generatedPages(path.join(root,'learn'))]);
const publicFiles=[];
for(const file of candidates){
  // The editorial generator can unpublish a previously tracked article.
  const info=await stat(path.join(root,file)).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
  if(info?.isFile())publicFiles.push(file);
}
let original=0,compressed=0,count=0;
for(const file of publicFiles){
  const source=path.join(root,file),target=path.join(output,file);
  await mkdir(path.dirname(target),{recursive:true});
  if(/\.(js|css)$/.test(file)){
    await build({entryPoints:[source],outfile:target,bundle:false,minify:true,sourcemap:false,target:'es2020',legalComments:'none'});
    original+=(await stat(source)).size;compressed+=(await stat(target)).size;count++;
  }else if(file.endsWith('.html')) await writeFile(target,newTabLinks(await readFile(source,'utf8')));
  else await copyFile(source,target);
}
for(const required of ['index.html','404.html','learn/index.html','assets/js/home.bundle.js','_headers']){
  await stat(path.join(output,required));
}
console.log(`Built ${publicFiles.length} public files in dist; ${count} JS/CSS files minified (${original} → ${compressed} bytes).`);
