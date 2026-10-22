import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
// Every game page shares its own card: same image in og:image, twitter:image and the game/quiz schema.
const BASE='https://brainilabgames.com',cards=JSON.parse(readFileSync('content/game-cards.json','utf8'));
const meta=(html,key)=>html.match(new RegExp(`<meta\\s+(?:(?:property|name)="${key}"\\s+content="([^"]*)"|content="([^"]*)"\\s+(?:property|name)="${key}")`))?.slice(1).find(Boolean);
const decode=s=>s.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&amp;/g,'&');
for(const card of cards){
 const file='assets/images/games/'+card.slug+'.png',url=BASE+'/'+file,html=readFileSync(card.page+'index.html','utf8');
 assert.ok(existsSync(file),file);
 const png=readFileSync(file);assert.equal(png.readUInt32BE(16),1200,file);assert.equal(png.readUInt32BE(20),630,file);assert.ok(png.length<120000,file+' stays light');
 assert.equal(meta(html,'og:image'),url,card.page);assert.equal(meta(html,'twitter:image'),url,card.page);
 assert.equal(decode(meta(html,'og:image:alt')),card.alt);assert.equal(decode(meta(html,'twitter:image:alt')),card.alt);
 assert.equal((html.match(/property="og:image"/g)||[]).length,1,card.page+' has one og:image');
 const data=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]),nodes=data['@graph']||[data];
 const game=nodes.find(n=>n.image===url);assert.ok(game&&['Quiz','Game','VideoGame','WebApplication'].includes(game['@type']),card.page+' schema image');
 assert.equal(game.url||BASE+'/'+card.page,BASE+'/'+card.page);
}
assert.equal(new Set(cards.map(c=>c.slug)).size,cards.length);
console.log(`PASS game cards: ${cards.length} pages share their own 1200×630 card in Open Graph, Twitter and game/quiz schema.`);
