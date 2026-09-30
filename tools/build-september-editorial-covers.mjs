// Six original vector diagrams for the 30 September editorial collection.
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE||'sharp');
const ink='#2d296e',yellow='#fddd29',green='#459942',paper='#faf8f3';
const label=(x,y,t,size=28,colour=ink)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" fill="${colour}">${t}</text>`;
const rect=(x,y,w,h,fill='#fffdf9')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="${fill}" stroke="${ink}" stroke-width="3"/>`;
const arrow=(x,y,end)=>`<path d="M${x} ${y}H${end}m-16-13 16 13-16 13" fill="none" stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
const art=[
 ['words-that-mean-their-own-opposite','The word DUST between two cards: remove particles from a shelf, or add a dusting to dough',()=>{
  let s=rect(100,185,300,265,'#edf5e8')+rect(560,185,300,265,'#fff4c0')+label(250,233,'TAKE AWAY')+label(710,233,'ADD')+label(480,330,'DUST',36)+arrow(410,365,550);
  s+='<path d="M150 390H350" stroke="#2d296e" stroke-width="9"/><path d="M180 348l75-53 27 39-75 53Z" fill="#fddd29" stroke="#2d296e" stroke-width="3"/><path d="M255 295l45-35" stroke="#2d296e" stroke-width="13"/>';
  s+='<ellipse cx="710" cy="375" rx="92" ry="30" fill="#dbb77b"/>';
  for(let i=0;i<12;i++)s+=`<circle cx="${650+(i%4)*38}" cy="${275+Math.floor(i/4)*27}" r="5" fill="${ink}"/>`;
  return s;
 }],
 ['can-a-wrong-guess-help-you-learn','A question card followed by an open book and a corrected answer, showing guess then check',()=>rect(110,205,220,235,'#fff4c0')+label(220,255,'GUESS',24)+label(220,365,'?',94)+arrow(345,325,395)+rect(410,205,220,235)+label(520,255,'READ',24)+'<path d="M460 300q30-20 60 0 30-20 60 0v95q-30-20-60 0-30-20-60 0Z" fill="#eeeafa" stroke="#2d296e" stroke-width="4"/><path d="M520 302v92" stroke="#2d296e" stroke-width="3"/>'+arrow(645,325,695)+rect(710,205,140,235,'#edf5e8')+label(780,255,'CHECK',22)+'<path d="M740 345l25 25 49-58" fill="none" stroke="#459942" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>'],
 ['why-tennis-balls-are-yellow','A white tennis ball beside a television showing a yellow ball; timeline labels 1972 ITF and 1986 Wimbledon',()=>{
  let s='<circle cx="250" cy="305" r="94" fill="#fff" stroke="#b8b6ad" stroke-width="4"/><path d="M184 238q110 70 0 134M316 238q-110 70 0 134" fill="none" stroke="#d4d0c4" stroke-width="7"/>';
  s+=arrow(380,305,450)+rect(490,175,335,245,ink)+rect(510,195,270,200,'#dcead1')+'<circle cx="645" cy="295" r="64" fill="#dcf334"/><path d="M600 250q75 45 0 90M690 250q-75 45 0 90" fill="none" stroke="#fff" stroke-width="5"/><path d="M570 450h180M655 420v30" stroke="#2d296e" stroke-width="9"/>';
  return s+label(250,460,'Earlier white balls',23)+label(480,515,'1972 · ITF     /     1986 · Wimbledon',27);
 }],
 ['why-britain-skipped-eleven-days-in-1752','Two September 1752 calendar pages showing the second followed by the fourteenth the next day',()=>label(480,160,'BRITAIN · SEPTEMBER 1752',30)+rect(130,210,255,250)+rect(575,210,255,250,'#fff4c0')+label(258,270,'SEPTEMBER',22)+label(703,270,'SEPTEMBER',22)+label(258,399,'2',115)+label(703,399,'14',115)+arrow(420,335,540)+label(480,500,'The next day',27)],
 ['how-hook-and-loop-fasteners-work','Enlarged purple hooks facing green loops on two fabric strips, a schematic of a hook-and-loop fastener',()=>{
  let s=label(250,180,'HOOKS',28)+label(710,180,'LOOPS',28)+rect(125,385,250,35,'#eeeafa')+rect(585,385,250,35,'#edf5e8');
  for(let i=0;i<4;i++){let x=153+i*57;s+=`<path d="M${x} 385V288q0-35 16-35t16 35v25" fill="none" stroke="${ink}" stroke-width="12" stroke-linecap="round"/>`;let xx=610+i*58;s+=`<path d="M${xx} 385V295q0-50 19-50t19 50v90" fill="none" stroke="${green}" stroke-width="10"/>`;}
  return s+arrow(405,330,550)+label(480,485,'Different shapes. A reusable grip.',26);
 }],
 ['why-ballpoint-pens-have-a-tiny-ball','An enlarged ballpoint tip with an ink reservoir, a ball held in its socket, and a line on paper; schematic not to scale',()=>{
  let s='<path d="M365 145v165l50 100h130l50-100V145" fill="#e2dfeb" stroke="#2d296e" stroke-width="5"/><path d="M430 145v160l22 60h56l22-60V145" fill="#2d296e"/><circle cx="480" cy="402" r="55" fill="#b8bac8" stroke="#2d296e" stroke-width="5"/><path d="M340 459h330" stroke="#2d296e" stroke-width="8" stroke-linecap="round"/><path d="M535 375q35 35 2 65m-2-19 2 19 18-5" fill="none" stroke="#459942" stroke-width="6"/>';
  s+=label(735,210,'INK',27)+'<path d="M690 205H543" stroke="#2d296e" stroke-width="3"/>'+label(215,317,'SOCKET',27)+'<path d="M295 315H392" stroke="#2d296e" stroke-width="3"/>'+label(730,409,'BALL',27)+'<path d="M679 403H557" stroke="#2d296e" stroke-width="3"/>'+label(480,515,'A rolling surface carries ink to paper',26);
  return s;
 }]
];
for(const [slug,alt,draw] of art){
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640"><rect width="960" height="640" fill="${paper}"/>${draw()}</svg>`;
 await writeFile(`assets/illustrations/learn/${slug}.svg`,svg);
 for(const [suffix,width] of [['',960],['-small',480],['-thumb',240]])await sharp(Buffer.from(svg)).resize(width).webp({quality:88}).toFile(`assets/images/learn/${slug}${suffix}.webp`);
 const path=`content/articles/${slug}.json`,a=JSON.parse(await readFile(path,'utf8'));a.cover.alt=alt;await writeFile(path,JSON.stringify(a,null,2)+'\n');
}
console.log('Built six original covers, each with three WebP sizes.');
