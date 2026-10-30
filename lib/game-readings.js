import {coverImage} from './cover-images.js';
import {topicAnchor} from './learn-topic-index.js';
import {readyPaths} from './learning-model.js';
const choices=new Map([
 ['games/connections/index.html',['connections-puzzles-find-the-hidden-link','words-that-mean-their-own-opposite']],
 ['games/math-rush/index.html',['multiply-by-11-in-your-head','mental-math-round-and-adjust']],
 ['games/number-route/index.html',['how-to-play-number-route','five-number-puzzles-printable']],
 ['general-knowledge/general-knowledge-quiz/index.html',['why-2100-is-not-a-leap-year','remember-quiz-answers-tomorrow']],
 ['geography/world-flags-quiz/index.html',['how-to-learn-world-flags','nepal-flag-shape']],
 ['geography/world-capitals-quiz/index.html',["why-canberra-is-australias-capital","why-time-zones-get-messy"]],
 ['science/science-quiz/index.html',["why-is-the-sky-blue","why-does-ice-float"]],
 ['history/history-quiz/index.html',["which-century-is-that-year","cleopatra-pyramids-moon-landing"]],
 ['sports/sports-quiz/index.html',["how-to-read-a-tennis-score","why-golf-balls-have-dimples"]],
 ['games/brainiword/index.html',["repeated-letters-in-five-letter-word-games","palindromes-words-that-read-both-ways"]],
 ['games/sequence/index.html',["number-sequences-look-at-the-gaps","number-patterns-check-every-step"]],
 ['games/odd-one-out/index.html',["sorting-with-two-rules","venn-diagram-examples-pizza-night"]],
 ['games/order-up/index.html',["which-century-is-that-year","cleopatra-pyramids-moon-landing"]],
 ['games/topic-rush/index.html',["chunking-memory-familiar-groups","remember-quiz-answers-tomorrow"]],
 ['games/higher-lower/index.html',["why-greenland-looks-so-big","cleopatra-pyramids-moon-landing"]],
 ['games/survival/index.html',["remember-quiz-answers-tomorrow","confidence-is-not-a-memory-test"]],
 ['games/brain-mix/index.html',["why-2100-is-not-a-leap-year","remember-quiz-answers-tomorrow"]],
 ['geography/europe-flags-quiz/index.html',["how-to-learn-world-flags"]],
 ['reasoning/index.html',["spotting-repeating-patterns","rotation-or-reflection"]]
]);
export const readingPages=[...choices.keys()];
// Cryptic keeps a compact help disclosure; the catalogue still offers a relevant read.
const publishedReadings=(articles,file)=>(file==='games/cryptic/index.html'?['anagrams-rearrange-the-same-letters']:choices.get(file)||[]).map(slug=>articles.find(a=>a.slug===slug&&a.status==='published')).filter(Boolean);
// Keep the established illustrated picks; offer one relevant text-only discovery.
const extraReadings=new Map([
 ['sports/sports-quiz/index.html',['what-is-pickleball','What is pickleball?']],
 ['science/science-quiz/index.html',['how-does-a-compass-work','How does a compass work?']],
 ['geography/world-capitals-quiz/index.html',['what-is-an-estuary','What is an estuary?']]
]);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function refreshGameReadings(html,articles,file,paths=[]){
 if(!choices.has(file))return html;
 const selected=publishedReadings(articles,file);
 if(!selected.length)throw Error('No published readings for '+file);
 const cards=selected.map(a=>`<a class="game-reading-card" href="/learn/${esc(a.slug)}/"><img src="${esc(coverImage(a.cover,'thumbnail'))}" alt="" width="96" height="72" style="object-position:center ${a.cover.position}%" loading="lazy" decoding="async"/><span class="game-reading-copy"><span>${esc(a.topic)} · ${a.minutes} min read</span><strong>${esc(a.title)}</strong><span class="game-reading-action">Read article <span aria-hidden="true">→</span></span></span></a>`).join('');
 const extra=extraReadings.get(file),available=extra&&articles.some(a=>a.slug===extra[0]&&a.status==='published');
 const more=available?`<p class="game-reading-extra">One more curious question: <a href="/learn/${esc(extra[0])}/">${esc(extra[1])} <span aria-hidden="true">→</span></a></p>`:'';
 const topic=selected[0].topic,course=readyPaths(paths.filter(p=>p.status!=='draft'&&p.status!=='unpublished'),articles).find(p=>p.lessons.some(l=>l.slug===selected[0].slug));
 const explore=`<nav class="game-reading-paths" aria-label="More ${esc(topic)}"><a href="/learn/topics/#${topicAnchor(topic)}">Browse ${esc(topic)} articles →</a>${course?`<a href="/learn/paths/${esc(course.slug)}/">${esc(course.title)} →</a>`:''}</nav>`;
 const block=/(<(?:section|div)\b[^>]*\bdata-game-guides(?:="")?[^>]*>)<h2>[^<]*<\/h2><div>[\s\S]*?<\/div>(?:<p class="game-reading-extra">[\s\S]*?<\/p>)?(?:<nav class="game-reading-paths"[\s\S]*?<\/nav>)?(<\/(?:section|div)>)/g;
 let count=0;
 const result=html.replace(block,(_,open,close)=>{count++;return open+'<h2>A little more to discover</h2><div>'+cards+'</div>'+more+explore+close;});
 if(count!==1)throw Error('Expected one existing game reading section: '+file);
 // Retire only the old duplicated promotional box, keeping ordinary inline links.
 return result.replace(/<!-- related-reading:20260928 -->\s*<aside\b[^>]*aria-label="Related reading"[^>]*>[\s\S]*?<\/aside>/g,'');
}

// Reuse the game's curated reading, without another image request or a client fetch.
export function refreshCatalogueReadings(html,articles){
 return html.replace(/(<article\b[^>]*\bdata-anytime-game="[^"]+"[^>]*>)([\s\S]*?)(<\/article>)/g,(_,open,body,close)=>{
  const status=/<div class="anytime-status" data-anytime-status(?:="")?><\/div>/;
  const clean=body.replace(/<!-- catalogue-reading:start --><div class="game-card-context">([\s\S]*?)<a class="catalogue-reading"[\s\S]*?<\/a><\/div><!-- catalogue-reading:end -->/g,'$1');
  const href=clean.match(/<div class="difficulty-actions(?: single-action)?">\s*<a\b[^>]*\bhref="([^"]+)"/)?.[1];
  let file;
  try{const url=new URL(href||'','https://brainilabgames.com/games/');if(url.origin==='https://brainilabgames.com')file=url.pathname.replace(/index\.html$/,'').replace(/^\//,'')+'index.html';}catch{}
  const article=publishedReadings(articles,file)[0];
  const anchor=clean.match(status)?.[0]||clean.match(/<div class="game-card-footer">(<p class="anytime-difficulty-label">[\s\S]*?<\/p>)/)?.[1];
  if(!article||!anchor)return open+clean+close;
  const link=`<a class="catalogue-reading" href="/learn/${esc(article.slug)}/" aria-label="Quick read: ${esc(article.title)}">Quick read <span aria-hidden="true">→</span></a>`;
  return open+clean.replace(anchor,()=> '<!-- catalogue-reading:start --><div class="game-card-context">'+anchor+link+'</div><!-- catalogue-reading:end -->')+close;
 });
}
