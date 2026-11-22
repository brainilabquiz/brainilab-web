// Home page sections filled from live content (Nov 2026 home redesign).
// The Worker replaces the marked blocks in index.html on every request, so the
// counts and the reading list follow what is published, never drafts.
import {LLMS_GAMES} from './llms-text.js';
import {readyPaths} from './learning-model.js';
import {coverImage} from './cover-images.js';
import {esc} from './learn-content.js';

const byNewest=(a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||a.slug.localeCompare(b.slug);

// "19 games and quizzes · 340+ curious reads · 18 free beginner courses"
export function homeFacts(articles=[],paths=[]){
 const games=LLMS_GAMES.filter(([,path])=>path!=='/daily-quiz/').length;
 const reads=articles.length;
 const courses=readyPaths(paths,articles).length;
 const items=[[String(games),'games and quizzes']];
 if(reads)items.push([reads>=100?`${Math.floor(reads/10)*10}+`:String(reads),reads===1?'curious read':'curious reads']);
 if(courses)items.push([String(courses),courses===1?'free beginner course':'free beginner courses']);
 return `<ul class="home-facts" aria-label="What you will find on BrainiLab">${items.map(([n,label])=>`<li><strong>${esc(n)}</strong><span>${esc(label)}</span></li>`).join('')}</ul>`;
}

// The three articles published just before the featured latest one.
export function homeMoreReads(articles=[]){
 const next=[...articles].sort(byNewest).slice(1,4);
 return next.map(a=>{
  const image=coverImage(a.cover,'thumbnail');
  const position=Number.isFinite(Number(a.cover?.position))?Number(a.cover.position):45;
  const meta=[a.topic,a.minutes?`${a.minutes} min read`:''].filter(Boolean).join(' · ');
  return `<a class="home-read-row" href="/learn/${esc(a.slug)}/"><img src="${esc(image)}" alt="" style="object-position:center ${position}%" width="96" height="72" loading="lazy" decoding="async"/><span class="home-read-copy">${meta?`<span class="home-read-meta">${esc(meta)}</span>`:''}<strong>${esc(a.title)}</strong></span></a>`;
 }).join('');
}

export function replaceHomeSections(html,articles,paths){
 return html
  .replace(/<!-- home-facts:start -->[\s\S]*?<!-- home-facts:end -->/,()=>'<!-- home-facts:start -->'+homeFacts(articles,paths)+'<!-- home-facts:end -->')
  .replace(/<!-- learn-more:start -->[\s\S]*?<!-- learn-more:end -->/,()=>'<!-- learn-more:start -->'+homeMoreReads(articles)+'<!-- learn-more:end -->');
}
