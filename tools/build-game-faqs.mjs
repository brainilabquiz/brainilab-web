// Visible "Questions about …" section on each game page, plus a matching FAQPage
// node in the page's JSON-LD. Answers restate facts already shown on the page
// (rounds, scoring, rules); edit content/game-faqs.json, then run again.
// Run: node tools/build-game-faqs.mjs
import {readFile,writeFile} from 'node:fs/promises';
const BASE='https://brainilabgames.com';
const cards=JSON.parse(await readFile('content/game-cards.json','utf8'));
const faqs=JSON.parse(await readFile('content/game-faqs.json','utf8'));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const START='<!-- game-faq:start -->',END='<!-- game-faq:end -->';
// Every game is free and playable without an account (content/PUBLIC_COPY.md).
export const freeQuestion=title=>[`Is ${title} free?`,`Yes. ${title} is free to play in your browser, and you don’t need an account.`];
export function faqItems(card){return [...faqs[card.slug],freeQuestion(card.title)];}
function section(card,items){
 return `${START}<section class="section game-faq" aria-labelledby="game-faq-title"><div class="wrap"><h2 id="game-faq-title">Questions about ${esc(card.title)}</h2>${items.map(([q,a])=>`<details class="game-faq__item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div></section>${END}`;
}
function withSchema(html,card,items){
 return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,(_,open,body,close)=>{
  const data=JSON.parse(body),url=BASE+'/'+card.page,id=url+'#faq';
  const node={'@type':'FAQPage','@id':id,url,mainEntity:items.map(([q,a])=>({'@type':'Question',name:q,acceptedAnswer:{'@type':'Answer',text:a}}))};
  const graph=data['@graph']?data:{'@context':data['@context']||'https://schema.org','@graph':[(({'@context':_c,...rest})=>rest)(data)]};
  graph['@graph']=graph['@graph'].filter(n=>n['@id']!==id).concat(node);
  return open+JSON.stringify(graph).replace(/</g,'\\u003c')+close;
 });
}
for(const card of cards){
 if(!faqs[card.slug])throw new Error('missing FAQ for '+card.slug);
 const file=card.page+'index.html',items=faqItems(card);
 let html=await readFile(file,'utf8');
 html=html.includes(START)?html.replace(new RegExp(START+'[\\s\\S]*?'+END),()=>section(card,items)):html.replace('</main>',()=>section(card,items)+'</main>');
 await writeFile(file,withSchema(html,card,items));
 console.log(`${file}: ${items.length} questions`);
}
