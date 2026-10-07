// Read-only catalogue audit. Run after build-editorial.py. No Google ranking claims.
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
const articles=readdirSync('content/articles').filter(p=>p.endsWith('.json')).map(p=>JSON.parse(readFileSync('content/articles/'+p,'utf8'))).filter(a=>a.status==='published').map(prepareArticle);
const known=new Set(articles.map(a=>a.slug)),incoming=new Map(articles.map(a=>[a.slug,0]));
const template=readFileSync('learn/index.html','utf8'),errors=[],warnings=[],seenTitles=new Map(),seenDescriptions=new Map();
const stale=/quarter-turn button|mirror button|hundredths mode|grid you can change|counters below|Choose a number below|press “Take one away”|the activity (?:displays|shows|gives|fills)|Choose a rule below|simplified Earth below/i;
for(const a of articles){
 const html=renderPage(template,articles,a),url='https://brainilabgames.com/learn/'+a.slug+'/';
 const body=a.sections.map(s=>s.html).join(' ');
 for(const [value,map,label] of [[a.title,seenTitles,'title'],[a.description,seenDescriptions,'description']]){
  const key=value.trim().toLowerCase();if(map.has(key))errors.push(a.slug+': duplicate '+label+' with '+map.get(key));map.set(key,a.slug);
 }
 if(!a.title.trim()||!a.description.trim()||!a.cover.alt?.trim())errors.push(a.slug+': missing title, description or image alt');
 if((html.match(/<h1\b/g)||[]).length!==1)errors.push(a.slug+': H1 count');
 if((html.match(/rel="canonical"/g)||[]).length!==1||!html.includes('rel="canonical" href="'+url+'"'))errors.push(a.slug+': canonical');
 if((html.match(/type="application\/rss\+xml"/g)||[]).length!==1)errors.push(a.slug+': duplicate or missing RSS discovery');
 if(!html.includes('index,follow,max-image-preview:large'))errors.push(a.slug+': indexing directive');
 const graph=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
 const schema=graph.find(n=>n['@type']==='Article');
 if(schema.headline!==a.title||schema.url!==url||schema.mainEntityOfPage!==url)errors.push(a.slug+': schema/page mismatch');
 if(schema.citation.some(u=>!u.startsWith('https://')))errors.push(a.slug+': non-absolute citation');
 const modified=a.updatedAt||a.publishedAt;
 if(!Number.isFinite(Date.parse(a.publishedAt))||!Number.isFinite(Date.parse(modified))||Date.parse(modified)<Date.parse(a.publishedAt))errors.push(a.slug+': invalid publication dates');
 if(!a.sources.length)warnings.push(a.slug+': source review needed');
 if(stale.test(body+' '+a.description))warnings.push(a.slug+': possible retired widget instruction');
 for(const target of a.related){if(!known.has(target))errors.push(a.slug+': missing related article '+target);else incoming.set(target,incoming.get(target)+1);}
 for(const match of body.matchAll(/href="\/learn\/([a-z0-9-]+)\//g)){if(known.has(match[1]))incoming.set(match[1],incoming.get(match[1])+1);}
 for(const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)){
  const dest=match[1].endsWith('/')?match[1]+'index.html':match[1];
  if(!existsSync(resolve('.'+dest)))errors.push(a.slug+': broken local destination '+match[1]);
 }
}
const withoutArticleLinks=[...incoming].filter(([,n])=>n===0).map(([slug])=>slug);
const report={articles:articles.length,errors:[...new Set(errors)],warnings,withoutArticleLinks,note:'Article links exclude library, course and game links. A missing article link is not proof of an orphan or an indexing problem.'};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
