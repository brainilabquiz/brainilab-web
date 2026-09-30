// Original explanatory vector artwork; no third-party photographs or fonts.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.SHARP_MODULE||'sharp');
const dir='assets/illustrations/learn';await mkdir(dir,{recursive:true});
const navy='#2d296e',yellow='#fdd81c',green='#3fab34',paper='#faf8f3';
const text=(x,y,t,size=32,color=navy)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" text-anchor="middle">${t}</text>`;
const box=(x,y,w,h,fill='#fffdf9')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${fill}" stroke="${navy}" stroke-width="3"/>`;
const line=(x,y,x2,y2,color=navy)=>`<path d="M${x} ${y}L${x2} ${y2}" stroke="${color}" stroke-width="5" stroke-linecap="round"/>`;
const defs=[
 ['connections-puzzles-find-the-hidden-link','Four word cards, robin, eagle, owl and swan, connected to one shared question mark',()=>{
  let s='';[['ROBIN',220,205],['EAGLE',550,205],['OWL',220,365],['SWAN',550,365]].forEach(([t,x,y])=>{s+=line(x+95,y+45,480,320)+box(x,y,190,90)+text(x+95,y+57,t,28)});return s+`<circle cx="480" cy="320" r="48" fill="${yellow}" stroke="${navy}" stroke-width="3"/>`+text(480,338,'?',50);
 }],
 ['remember-quiz-answers-tomorrow','A question card, a recall arrow and a checked answer card illustrating quiz practice',()=>box(175,205,245,215)+text(298,258,'QUESTION',23)+text(298,348,'?',86)+line(450,315,510,315)+`<path d="M495 300l15 15-15 15" fill="none" stroke="${navy}" stroke-width="5"/>`+box(540,205,245,215,'#edf5e8')+text(663,258,'RECALL',23)+`<path d="M615 325l32 32 62-68" fill="none" stroke="${green}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`+text(480,470,'Try it. Check it. Come back later.',24)],
 ['daily-or-anytime','A calendar marked Today beside three different puzzle tiles marked Anytime',()=>box(130,205,280,245)+`<path d="M130 266H410" stroke="${navy}" stroke-width="3"/>`+text(270,248,'TODAY',25)+`<circle cx="270" cy="345" r="48" fill="${yellow}"/>`+text(270,362,'?',48)+text(675,248,'ANYTIME',25)+box(525,280,88,112,'#edf5e8')+text(569,350,'A',44)+box(630,280,88,112,'#fff4c0')+text(674,350,'7',44)+box(735,280,88,112,'#eeeafa')+text(779,350,'+',44)],
 ['mental-percentages-without-a-calculator','A grid of one hundred squares with twenty-five highlighted, beside 25 percent equals one quarter',()=>{
  let s='';for(let i=0;i<100;i++){const x=195+(i%10)*24,y=195+Math.floor(i/10)*24;s+=`<rect x="${x}" y="${y}" width="19" height="19" rx="3" fill="${i<25?green:'#e3dfd5'}"/>`;}return s+text(635,295,'25%',74)+text(635,355,'= one quarter',30)+text(635,405,'25 out of 100',25);
 }],
 ['which-century-is-that-year','A timeline showing the nineteenth century from 1801 to 1900 and the twentieth starting in 1901',()=>box(120,235,405,150,'#fff3b5')+box(535,235,305,150,'#eeeafa')+text(323,290,'19th century',34)+text(323,345,'1801–1900',29)+text(688,290,'20th century',34)+text(688,345,'1901–2000',29)+line(170,430,790,430)+line(525,415,525,445)+text(525,485,'A new century starts at 01',25)],
 ['why-canberra-is-australias-capital','A schematic connecting Sydney, Canberra and Melbourne, with Canberra highlighted as the capital',()=>{
  let s=line(230,380,490,280,'#b2abbf')+line(490,280,745,205,'#b2abbf');
  [[230,380,'MELBOURNE',440],[745,205,'SYDNEY',155]].forEach(([x,y,label,ty])=>{s+=`<circle cx="${x}" cy="${y}" r="14" fill="${navy}"/>`+text(x,ty,label,25)});
  return s+`<circle cx="490" cy="280" r="44" fill="${yellow}" stroke="${navy}" stroke-width="3"/>`+text(490,293,'★',37)+text(490,370,'CANBERRA',33)+text(490,409,'Australia’s capital',24)+text(480,505,'Schematic · not to scale',19,'#635e69');
 }],
 ['what-olympic-rings-mean','Five overlapping Olympic rings: blue, black and red above yellow and green, on white',()=>{
  return [[300,275,'#0085c7'],[480,275,'#171717'],[660,275,'#df0024'],[390,365,'#f4c300'],[570,365,'#009f3d']].map(([x,y,c])=>`<circle cx="${x}" cy="${y}" r="82" fill="none" stroke="${c}" stroke-width="15"/>`).join('');
 }]
];
for(const [slug,alt,draw] of defs){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="${slug==='what-olympic-rings-mean'?'#fff':paper}"/>${draw()}</svg>`;
 await writeFile(`${dir}/${slug}-diagram.svg`,svg);
 const base=`/assets/images/learn/${slug}-diagram`;
 for(const [suffix,width] of [['',960],['-small',480],['-thumb',240]])await sharp(Buffer.from(svg)).resize(width).webp({quality:86}).toFile('.'+base+suffix+'.webp');
 const file=`content/articles/${slug}.json`,a=JSON.parse(await readFile(file,'utf8'));
 a.cover={src:base+'.webp',small:base+'-small.webp',thumbnail:base+'-thumb.webp',alt,credit:'Original explanatory illustration by BrainiLab.',position:50};
 await writeFile(file,JSON.stringify(a,null,2)+'\n');
}
console.log(`Built ${defs.length} concept illustrations with three WebP sizes each.`);
