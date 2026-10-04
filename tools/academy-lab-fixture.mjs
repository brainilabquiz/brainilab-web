import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {activityFor} from '../lib/academy-labs.js';
const result=await build({stdin:{contents:"import {initLabs} from './editor/academy-labs.js'; initLabs();",resolveDir:process.cwd()},write:false,bundle:true,format:'iife',platform:'browser'});
export const labBundle=result.outputFiles[0].text;
export function labMarkup(slug){
 const article=JSON.parse(readFileSync(`content/articles/${slug}.json`,'utf8'));
 return article.sections.map(s=>activityFor(slug,s.id)).join('');
}
