import {coverImage} from './cover-images.js';
const choices=new Map([
 ['games/connections/index.html',['connections-puzzles-find-the-hidden-link','words-that-mean-their-own-opposite']],
 ['games/math-rush/index.html',['multiply-by-11-in-your-head','mental-math-round-and-adjust']],
 ['games/number-route/index.html',['how-to-play-number-route','five-number-puzzles-printable']],
 ['general-knowledge/general-knowledge-quiz/index.html',['why-2100-is-not-a-leap-year','remember-quiz-answers-tomorrow']],
 ['geography/world-flags-quiz/index.html',['how-to-learn-world-flags','nepal-flag-shape']]
]);
export const readingPages=[...choices.keys()];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function refreshGameReadings(html,articles,file){
 const selected=(choices.get(file)||[]).map(slug=>articles.find(a=>a.slug===slug)).filter(Boolean);
 if(!selected.length)return html;
 const cards=selected.map(a=>`<a class="game-reading-card" href="/learn/${esc(a.slug)}/"><img src="${esc(coverImage(a.cover,'thumbnail'))}" alt="" width="96" height="72" style="object-position:center ${a.cover.position}%" loading="lazy" decoding="async"/><span class="game-reading-copy"><span>${esc(a.topic)} · ${a.minutes} min read</span><strong>${esc(a.title)}</strong><span class="game-reading-action">Read article <span aria-hidden="true">→</span></span></span></a>`).join('');
 const block=/(<(?:section|div)\b[^>]*\bdata-game-guides(?:="")?[^>]*>)<h2>[^<]*<\/h2><div>[\s\S]*?<\/div>(<\/(?:section|div)>)/g;
 let count=0;
 const result=html.replace(block,(_,open,close)=>{count++;return open+'<h2>A little more to discover</h2><div>'+cards+'</div>'+close;});
 if(count!==1)throw Error('Expected one existing game reading section: '+file);
 // Retire only the old duplicated promotional box, keeping ordinary inline links.
 return result.replace(/<!-- related-reading:20260928 -->\s*<aside\b[^>]*aria-label="Related reading"[^>]*>[\s\S]*?<\/aside>/g,'');
}
