// Category hubs share the card of the quiz they lead to, instead of the generic
// brand card: og/twitter image + alt and the CollectionPage image. Safe to rerun.
// Run after tools/build-game-cards.mjs: node tools/apply-hub-images.mjs
import {readFile,writeFile} from 'node:fs/promises';
const BASE='https://brainilabgames.com';
export const HUB_IMAGES=Object.freeze({
 'science/':'science-quiz','history/':'history-quiz','sports/':'sports-quiz','general-knowledge/':'general-knowledge-quiz',
 'geography/':'world-flags-quiz','geography/flags/':'world-flags-quiz'
});
const cards=Object.fromEntries(JSON.parse(await readFile('content/game-cards.json','utf8')).map(c=>[c.slug,c]));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function setMeta(html,attr,key,value){
 const re=new RegExp(`<meta\\s+(?:${attr}="${key}"\\s+content="[^"]*"|content="[^"]*"\\s+${attr}="${key}")\\s*/?>`,'g');
 if(!re.test(html))throw new Error(`missing ${key}`);
 return html.replace(re,m=>m.replace(/content="[^"]*"/,`content="${esc(value)}"`));
}
for(const [page,slug] of Object.entries(HUB_IMAGES)){
 const card=cards[slug],url=`${BASE}/assets/images/games/${slug}.png`,file=page+'index.html';
 if(!card)throw new Error('no card '+slug);
 let html=await readFile(file,'utf8');
 for(const [attr,key,value] of [['property','og:image',url],['name','twitter:image',url],['property','og:image:alt',card.alt],['name','twitter:image:alt',card.alt]])html=setMeta(html,attr,key,value);
 html=html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,(_,open,body,close)=>{
  const data=JSON.parse(body),nodes=data['@graph']||[data],hub=nodes.find(n=>n['@type']==='CollectionPage');
  if(!hub)throw new Error('no CollectionPage in '+file);
  hub.image=url;return open+JSON.stringify(data).replace(/</g,'\\u003c')+close;
 });
 await writeFile(file,html);console.log(`${file} → ${slug}.png`);
}
