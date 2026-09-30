import {readFile,writeFile,readdir,mkdir} from 'node:fs/promises';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
import {enrichAuthors,renderLearningPage,teamSection} from '../lib/learning-render.js';
import {readyPaths} from '../lib/learning-model.js';
import {learnFeed} from '../lib/learn-seo.js';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const authors=await read('content/authors.json'),raw=await Promise.all((await readdir('content/articles')).filter(f=>f.endsWith('.json')).map(f=>read('content/articles/'+f)));
const articles=enrichAuthors(raw.filter(a=>a.status==='published').map(prepareArticle),authors);
const paths=(await Promise.all((await readdir('content/paths')).filter(f=>f.endsWith('.json')).map(f=>read('content/paths/'+f)))).filter(p=>p.status==='published');
if(readyPaths(paths,articles).length!==paths.length)throw Error('Every published path must have distinct published lessons with valid quizzes.');
const template=await readFile('learn/index.html','utf8');
await writeFile('learn/index.html',renderPage(template,articles,null,paths));
await writeFile('learn/feed.xml',learnFeed(articles));
for(const a of articles)await writeFile(`learn/${a.slug}/index.html`,renderPage(template,articles,a,paths));
await mkdir('learn/paths',{recursive:true});await writeFile('learn/paths/index.html',renderLearningPage(template,{articles,paths,authors}));
for(const path of paths){await mkdir(`learn/paths/${path.slug}`,{recursive:true});await writeFile(`learn/paths/${path.slug}/index.html`,renderLearningPage(template,{articles,paths,authors,path}));}
let about=await readFile('about/index.html','utf8');about=about.replace(/<!-- team:start -->[\s\S]*?<!-- team:end -->/,()=>`<!-- team:start -->${teamSection(authors)}<!-- team:end -->`);await writeFile('about/index.html',about);
let sitemap=await readFile('sitemap.xml','utf8');sitemap=sitemap.replace('</urlset>',['/learn/paths/',...paths.map(p=>'/learn/paths/'+p.slug+'/')].map(p=>`<url><loc>https://brainilabgames.com${p}</loc></url>`).join('')+'</urlset>');await writeFile('sitemap.xml',sitemap);
console.log(`Rendered ${paths.length} learning paths and ${authors.length} author profiles using shared production templates.`);
