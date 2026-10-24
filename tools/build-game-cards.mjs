// Original vector share cards for each game page; no third-party photographs or fonts.
// Writes assets/images/games/<slug>.png (1200×630) and points the page's og:image,
// twitter:image and the game/quiz schema image at it. Safe to run again.
// Run: SHARP_MODULE=/path/to/sharp node tools/build-game-cards.mjs
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE||'sharp');
const BASE='https://brainilabgames.com',W=1200,H=630,dir='assets/images/games';
const navy='#2d296e',yellow='#fdd81c',green='#3fab34',red='#e51e20',paper='#faf8f3',grey='#8e8a9a',soft='#e3dfd5';
const cards=JSON.parse(await readFile('content/game-cards.json','utf8'));
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
const text=(x,y,t,size=30,color=navy,anchor='middle',weight=700)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(t)}</text>`;
const box=(x,y,w,h,fill='#fffdf9',stroke=navy,rx=14,sw=3)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const line=(x,y,x2,y2,color=navy,w=4)=>`<path d="M${x} ${y}L${x2} ${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const heart=(x,y,s=1)=>`<path transform="translate(${x} ${y}) scale(${s})" d="M0 12C0-4 22-8 26 8C30-8 52-4 52 12C52 30 26 44 26 48C26 44 0 30 0 12Z" fill="${red}"/>`;
// Four answer choices in a 2×2 grid; illustrations never mark a correct answer the game hides until the end.
const choices=(labels,y=330)=>labels.map((l,i)=>box(40+(i%2)*240,y+Math.floor(i/2)*78,220,62,'#fffdf9',navy,12,2)+text(150+(i%2)*240,y+41+Math.floor(i/2)*78,l,24)).join('');
// Each drawing uses a local 540×500 area inside the right-hand panel.
const art={
 'brain-mix':()=>text(270,60,'Question 3 of 10',30)+['Science','History','Geography'].map((t,i)=>box(28+i*165,95,150,46,['#edf5e8','#fff4c0','#eeeafa'][i],navy,23,2)+text(103+i*165,126,t,21)).join('')+box(40,170,460,120,'#fffdf9')+text(270,220,'?',58)+line(150,260,390,260,soft,8)+choices(['A','B','C','D']),
 'brainiword':()=>{const rows=[['CRANE',[grey,grey,grey,grey,green]],['SLOPE',[green,yellow,grey,grey,green]],['',[]],['',[]],['',[]]];let s='';
  rows.forEach(([w,c],r)=>{for(let i=0;i<5;i++){const x=85+i*76,y=25+r*92;s+=box(x,y,66,80,c[i]||'#fffdf9',c[i]?c[i]:navy,8,c[i]?0:2)+(w?text(x+33,y+55,w[i],38,c[i]===yellow?navy:'#ffffff'):'');}});return s;},
 'connections':()=>{let s='';[['ROBIN',40,70],['EAGLE',320,70],['OWL',40,330],['SWAN',320,330]].forEach(([t,x,y])=>{s+=line(x+90,y+45,270,250)+box(x,y,180,90)+text(x+90,y+56,t,28)});return s+`<circle cx="270" cy="250" r="50" fill="${yellow}" stroke="${navy}" stroke-width="3"/>`+text(270,268,'?',52);},
 'higher-lower':()=>box(30,40,225,250,'#eeeafa')+text(142,185,'?',90)+box(285,40,225,250,'#fff4c0')+text(397,185,'?',90)+box(30,330,480,66,green,green,14,0)+text(270,374,'▲  Higher',30,'#ffffff')+box(30,412,480,66,red,red,14,0)+text(270,456,'▼  Lower',30,'#ffffff'),
 'math-rush':()=>`<circle cx="270" cy="95" r="62" fill="${yellow}" stroke="${navy}" stroke-width="3"/>`+text(270,108,'60s',38)+box(40,190,460,110,'#fffdf9')+text(270,264,'7 × 8 = ?',56)+choices(['54','56','58','64'],330),
 'number-route':()=>{let s='',x=10;const parts=['6','×','3','−','4','+','2'];parts.forEach((p,i)=>{if(i%2){s+=box(x+2,95,52,70,yellow,navy,10,2)+text(x+28,145,p,38);x+=62;}else{s+=text(x+22,145,p,46);x+=44;}});
  s+=text(x+16,145,'=',42)+box(x+38,90,80,80,green,green,12,0)+text(x+78,145,'16',40,'#ffffff');
  return s+text(270,240,'Calculate left to right',24,grey,'middle',400)+['+','−','×','÷'].map((o,i)=>box(60+i*110,290,90,90,'#fffdf9',navy,14,2)+text(105+i*110,350,o,46)).join('')+text(270,450,'Target: 16',30);},
 'odd-one-out':()=>[['APPLE',40,50,false],['BANANA',290,50,false],['CARROT',40,250,true],['CHERRY',290,250,false]].map(([t,x,y,odd])=>box(x,y,210,150,odd?'#fdecec':'#fffdf9',odd?red:navy,16,odd?6:3)+text(x+105,y+86,t,30)).join('')+text(270,460,'Which one doesn’t belong?',26),
 'order-up':()=>text(270,50,'Smallest → Largest',30)+['Mercury','Mars','Venus','Earth'].map((p,i)=>box(60,85+i*100,420,80,'#fffdf9',navy,14,2)+`<circle cx="110" cy="${125+i*100}" r="26" fill="${yellow}" stroke="${navy}" stroke-width="2"/>`+text(110,135+i*100,String(i+1),28)+text(170,135+i*100,p,32,navy,'start')).join(''),
 'sequence':()=>{let s='<g transform="translate(0 50)">';[2,4,8,16].forEach((n,i)=>{s+=box(20+i*104,120,90,90,'#fffdf9')+text(65+i*104,180,String(n),40);if(i<3)s+=text(117+i*104,100,'×2',22,green);});
  return s+box(436,120,90,90,yellow,navy,14,3)+text(481,180,'?',48)+text(270,290,'What comes next?',28)+['24','32','30'].map((c,i)=>box(45+i*155,330,140,70,'#fffdf9',navy,12,2)+text(115+i*155,375,c,32)).join('')+'</g>';},
 'survival':()=>heart(150,30,1.3)+heart(236,30,1.3)+heart(322,30,1.3)+box(40,130,460,150,'#fffdf9')+text(270,180,'Question 7',26,grey,'middle',400)+text(270,245,'?',58)+choices(['A','B','C','D'],310),
 'topic-rush':()=>box(40,30,330,90,'#eeeafa')+text(205,88,'Topic: Fruits',34)+`<circle cx="445" cy="75" r="50" fill="${yellow}" stroke="${navy}" stroke-width="3"/>`+text(445,86,'60s',30)+box(40,160,460,76,'#fffdf9')+text(70,210,'mango|',32,navy,'start',400)+['apple','kiwi','pear','plum'].map((w,i)=>box(40+(i%2)*240,280+Math.floor(i/2)*84,220,64,'#edf5e8',green,32,2)+text(150+(i%2)*240,322+Math.floor(i/2)*84,'✓ '+w,26)).join(''),
 'europe-flags-quiz':()=>`<g transform="translate(120 30)"><rect width="100" height="200" fill="#009246"/><rect x="100" width="100" height="200" fill="#ffffff"/><rect x="200" width="100" height="200" fill="#ce2b37"/><rect width="300" height="200" fill="none" stroke="${navy}" stroke-width="3"/></g>`+text(270,280,'Which country?',26)+choices(['Italy','Ireland','Hungary','Bulgaria'],300),
 'world-flags-quiz':()=>`<g transform="translate(120 30)"><rect width="300" height="200" fill="#ffffff" stroke="${navy}" stroke-width="3"/><circle cx="150" cy="100" r="60" fill="#bc002d"/></g>`+text(270,280,'Which country?',26)+choices(['Japan','China','South Korea','Vietnam'],300),
 'world-capitals-quiz':()=>'<g transform="translate(0 70)">'+box(40,30,460,130,'#eeeafa')+text(270,95,'Australia',50)+text(270,138,'What is the capital?',24,navy,'middle',400)+choices(['Canberra','Sydney','Melbourne','Perth'],200)+'</g>',
 // Topic quizzes reuse their page's opening question; no answer is marked.
 'science-quiz':()=>question('Science · Question 1 of 20','What is the closest','star to Earth?',['The Sun','Proxima Centauri','Sirius','Polaris'],'#edf5e8'),
 'history-quiz':()=>question('History · Question 1 of 20','Who built the','pyramids of Giza?',['Egyptians','Romans','Greeks','Maya'],'#fff4c0'),
 'sports-quiz':()=>question('Sports · Question 1 of 20','How many players does a','soccer team have on the field?',['9','10','11','12'],'#eeeafa'),
 'general-knowledge-quiz':()=>['Easy','Medium','Hard'].map((t,i)=>box(55+i*150,20,130,46,['#edf5e8','#fff4c0','#fdecec'][i],navy,23,2)+text(120+i*150,51,t,22)).join('')+box(40,95,460,180,'#fffdf9')+text(270,140,'Question 1 of 20',24,grey,'middle',400)+text(270,215,'?',70)+choices(['A','B','C','D'],310)
};
function question(label,line1,line2,options,fill){
 return box(40,20,460,200,fill)+text(270,62,label,20,grey,'middle',400)+text(270,125,line1,30)+text(270,165,line2,30)+choices(options,250).replace(/font-size="24"/g,'font-size="21"');
}
function svg(card){
 const size=Math.min(64,Math.floor(500/(0.6*card.title.length)));
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${paper}"/>`+
  [navy,yellow,green,red].map((c,i)=>`<rect x="${i*W/4}" y="${H-14}" width="${W/4}" height="14" fill="${c}"/>`).join('')+
  text(60,300,card.title,size,navy,'start')+card.tagline.map((l,i)=>text(60,360+i*42,l,30,navy,'start',400)).join('')+text(60,540,'Play free at brainilabgames.com',24,grey,'start',700)+
  `<rect x="600" y="50" width="560" height="516" rx="28" fill="#ffffff" stroke="${navy}" stroke-width="3"/><g transform="translate(610 58)">${art[card.slug]()}</g></svg>`;
}
export const cardUrl=slug=>`${BASE}/${dir}/${slug}.png`;
function setMeta(html,attr,key,value){
 // Attributes appear in either order in the hand-written pages.
 const re=new RegExp(`<meta\\s+(?:${attr}="${key}"\\s+content="[^"]*"|content="[^"]*"\\s+${attr}="${key}")\\s*/?>`,'g');
 if(!re.test(html))throw new Error(`missing ${key}`);
 return html.replace(re,m=>m.replace(/content="[^"]*"/,`content="${esc(value)}"`));
}
function setSchemaImage(html,card){
 return html.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/,(_,open,body,close)=>{
  const data=JSON.parse(body),url=BASE+'/'+card.page,nodes=data['@graph']||[data];
  const main=nodes.find(n=>/#(game|quiz)$/.test(n['@id']||''))||nodes.find(n=>n.url===url&&['Quiz','Game','VideoGame','WebApplication'].includes(n['@type']));
  if(!main)throw new Error('no game schema in '+card.page);
  main.image=cardUrl(card.slug);
  return open+JSON.stringify(data).replace(/</g,'\\u003c')+close;
 });
}
await mkdir(dir,{recursive:true});
const logo=await sharp('assets/brand/brainilab-logo.png').resize({width:230}).toBuffer();
for(const card of cards){
 const png=await sharp(Buffer.from(svg(card))).composite([{input:logo,left:60,top:60}]).png({compressionLevel:9,palette:true}).toBuffer();
 await writeFile(`${dir}/${card.slug}.png`,png);
 const file=card.page+'index.html';let html=await readFile(file,'utf8');
 for(const [attr,key,value] of [['property','og:image',cardUrl(card.slug)],['name','twitter:image',cardUrl(card.slug)],['property','og:image:alt',card.alt],['name','twitter:image:alt',card.alt]])html=setMeta(html,attr,key,value);
 await writeFile(file,setSchemaImage(html,card));
 console.log(`${card.slug}.png ${png.length} bytes → ${file}`);
}
