import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Each game page shows its questions and the FAQPage data says exactly the same.
const cards=JSON.parse(readFileSync('content/game-cards.json','utf8')),faqs=JSON.parse(readFileSync('content/game-faqs.json','utf8'));
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&amp;/g,'&');
for(const card of cards){
 const html=readFileSync(card.page+'index.html','utf8');
 assert.equal((html.match(/<!-- game-faq:start -->/g)||[]).length,1,card.page);
 const block=html.match(/<!-- game-faq:start -->([\s\S]*?)<!-- game-faq:end -->/)[1];
 assert.ok(html.indexOf('<!-- game-faq:end -->')<html.indexOf('</main>'),card.page+' inside main');
 const visible=[...block.matchAll(/<summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p>/g)].map(m=>[decode(m[1]),decode(m[2])]);
 assert.deepEqual(visible.slice(0,-1),faqs[card.slug],card.page);
 assert.equal(visible.at(-1)[0],`Is ${card.title} free?`);
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 const faq=data['@graph'].filter(n=>n['@type']==='FAQPage');assert.equal(faq.length,1,card.page);
 assert.deepEqual(faq[0].mainEntity.map(q=>[q.name,q.acceptedAnswer.text]),visible,card.page+' schema matches visible text');
 assert.ok(data['@graph'].some(n=>n.image==='https://brainilabgames.com/assets/images/games/'+card.slug+'.png'),card.page+' keeps the game card');
}
console.log(`PASS game FAQs: ${cards.length} pages show their questions once, inside main, with FAQPage data identical to the visible text.`);
