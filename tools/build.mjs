import {newTabLinks} from '../lib/link-policy.js';
import {brandPage} from '../lib/brand-identity.js';
import {assetVersion,versionAssets,lazyFeatureVersions} from '../lib/asset-versions.js';
import {pageStyles} from '../lib/page-styles.js';
import {homeConsent} from '../lib/home-consent.js';
import {homeFirstPaint,homeConsentFirstResponse,homeSeasonFirstPaint} from '../lib/home-first-paint.js';
import {brandLogoAVIF} from '../lib/brand-logo-images.js';
// Publish one clean directory; keep editable sources and historical notes out.
import {build} from 'esbuild';
import {mkdir,copyFile,rm,lstat,stat,readdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import './check-site-integrity.mjs';
import './test-asset-versions.mjs';
import './test-learning-cache.mjs';
import './test-sitemap-dates.mjs';
import './test-result-receipts.mjs';
import './test-result-cross-device.mjs';
import './test-guest-auth.mjs';
import './test-halloween-legacy.mjs';
import './test-admin-operations-model.mjs';
import './test-home-entry.mjs';
import './test-latest-video.mjs';
import './test-knowledge-video.mjs';
import './test-factual-revisions.mjs';
import './validate-game-batches.mjs';
import './test-brand-identity.mjs';
import './test-preferred-source.mjs';
import './test-content-links.mjs';
import './test-article-previews.mjs';
import './test-image-sitemap.mjs';
import './test-brand-logo-images.mjs';
import './test-page-styles.mjs';

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
const candidates=new Set(['assets/data/learn-game-links.json','learn/feed.xml','assets/js/admin-growth.bundle.js','assets/css/admin-growth.css','assets/js/admin-learning.bundle.js','assets/js/learning-paths.bundle.js','assets/js/admin-articles.bundle.js',...files.filter(file=>!file.startsWith('tools/')&&(file.startsWith('assets/')||file.endsWith('.html')||rootPublic.has(file))),...await generatedPages(path.join(root,'learn'))]);
const publicFiles=[];
for(const file of candidates){
  // The editorial generator can unpublish a previously tracked article.
  const info=await stat(path.join(root,file)).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});
  if(info?.isFile())publicFiles.push(file);
}
// Immutable CSS/JS URLs follow the actual published bytes, including generated bundles.
const assetVersions=new Map();
let original=0,compressed=0,count=0;
for(const file of publicFiles){
  const source=path.join(root,file),target=path.join(output,file);
  await mkdir(path.dirname(target),{recursive:true});
  if(/\.(js|css)$/.test(file)){
    await build({entryPoints:[source],outfile:target,bundle:false,minify:true,sourcemap:false,target:'es2020',legalComments:'none'});
    assetVersions.set(file,assetVersion(await readFile(target)));
    original+=(await stat(source)).size;compressed+=(await stat(target)).size;count++;
  }else if(!file.endsWith('.html')) await copyFile(source,target);
}
// A changed lazy feature must invalidate the loader even when its HTML entry
// point has no direct script tag for that feature (for example profile social).
const featureManifest=Buffer.from(`window.BrainiFeatureVersions=Object.freeze(${JSON.stringify(lazyFeatureVersions(assetVersions))});\n`);
for(const file of ['assets/js/shell.bundle.js','assets/js/perf-loader.js']){
  if(!assetVersions.has(file))continue;
  const target=path.join(output,file),bytes=Buffer.concat([featureManifest,await readFile(target)]);
  await writeFile(target,bytes);
  assetVersions.set(file,assetVersion(bytes));compressed+=featureManifest.length;
}
// Runtime-rendered seasonal pages need the same byte-based cache invalidation
// as static HTML. The Worker imports this generated map after the build.
const halloweenPaths=['assets/css/halloween.css','assets/js/halloween-game-model.js','assets/js/halloween-hub.js','assets/js/halloween-games.js'];
const halloweenAssets=Object.fromEntries(halloweenPaths.map(file=>{
  const version=assetVersions.get(file);
  if(!version)throw new Error(`Missing published Halloween asset: ${file}`);
  return [file,'/'+file+'?v='+version];
}));
await writeFile('lib/halloween-assets.js','// Generated by tools/build.mjs from the exact published bytes.\nexport const halloweenAssets=Object.freeze('+JSON.stringify(halloweenAssets)+');\n');
await import('./test-halloween-asset-cache.mjs');
const pageStyleBundles=[];
for(const file of publicFiles.filter(file=>file.endsWith('.html'))){
  let html=newTabLinks(brandPage(await readFile(path.join(root,file),'utf8')));
  if(file==='index.html')html=homeConsent(html,await readFile('assets/js/meta-pixel.js','utf8'));
  const styles=pageStyles(html,file);
  if(styles){
    const contents=(await Promise.all(styles.files.map(css=>readFile(path.join(output,css),'utf8')))).join('\n');
    const target=path.join(output,styles.asset);
    await build({stdin:{contents,loader:'css',sourcefile:styles.asset},outfile:target,bundle:false,minify:true,legalComments:'none',target:'es2020'});
    assetVersions.set(styles.asset,assetVersion(await readFile(target)));
    pageStyleBundles.push({page:file,asset:styles.asset,sheets:styles.files.length});html=styles.html;
  }
  html=brandLogoAVIF(versionAssets(html,file,assetVersions),file);
  html=await homeFirstPaint(html,file,css=>readFile(path.join(output,css),'utf8'));
  if(file==='index.html')html=homeConsentFirstResponse(html,file,await readFile(path.join(output,'assets/js/consent.bundle.js'),'utf8'));
  if(file==='index.html')html=homeSeasonFirstPaint(html,file,await readFile(path.join(output,'assets/css/halloween.css'),'utf8'),halloweenAssets['assets/css/halloween.css']);
  await writeFile(path.join(output,file),html);
}
console.log('Page CSS bundles: '+pageStyleBundles.map(item=>item.page+' '+item.sheets+' sheets → 1').join('; '));
for(const required of ['index.html','404.html','learn/index.html','assets/js/home.bundle.js','_headers']){
  await stat(path.join(output,required));
}
console.log(`Built ${publicFiles.length} public files in dist; ${count} JS/CSS files minified (${original} → ${compressed} bytes).`);
