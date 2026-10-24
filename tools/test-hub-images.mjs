import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
// Category hubs share the card of the quiz they lead to, in meta tags and CollectionPage.
const hubs={'science/':'science-quiz','history/':'history-quiz','sports/':'sports-quiz','general-knowledge/':'general-knowledge-quiz','geography/':'world-flags-quiz','geography/flags/':'world-flags-quiz'};
const cards=Object.fromEntries(JSON.parse(readFileSync('content/game-cards.json','utf8')).map(c=>[c.slug,c]));
const meta=(html,key)=>html.match(new RegExp(`<meta\s+(?:(?:property|name)="${key}"\s+content="([^"]*)"|content="([^"]*)"\s+(?:property|name)="${key}")`))?.slice(1).find(Boolean);
for(const [page,slug] of Object.entries(hubs)){
 const html=readFileSync(page+'index.html','utf8'),url='https://brainilabgames.com/assets/images/games/'+slug+'.png';
 assert.ok(existsSync('assets/images/games/'+slug+'.png'));
 assert.equal(meta(html,'og:image'),url,page);assert.equal(meta(html,'twitter:image'),url,page);
 assert.equal(meta(html,'og:image:alt').replace(/&quot;/g,'"').replace(/&amp;/g,'&'),cards[slug].alt,page);
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal((data['@graph']||[data]).find(n=>n['@type']==='CollectionPage').image,url,page);
}
console.log(`PASS hub images: ${Object.keys(hubs).length} category hubs share their quiz card in Open Graph, Twitter and CollectionPage.`);
