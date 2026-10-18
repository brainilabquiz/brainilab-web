// Original transparent SVG frame artwork. Portraits, levels and entitlements are unchanged.
import {mkdir,writeFile} from 'node:fs/promises';
const folder='assets/icons/avatar-frames-v2';await mkdir(folder,{recursive:true});
const circle=(r=43,width=2.6,color='currentColor',extra='')=>`<circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="${width}" ${extra}/>`;
const diamond=(x,y,r=2.8,color='currentColor')=>`<path d="m${x} ${y-r} ${r} ${r}-${r} ${r}-${r}-${r}Z" fill="${color}"/>`;
const star=(x,y,r=4,color='currentColor')=>{const pts=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4-Math.PI/2,n=i%2?r*.36:r;return `${(x+Math.cos(a)*n).toFixed(2)},${(y+Math.sin(a)*n).toFixed(2)}`;});return `<path d="M${pts.join(' ')}Z" fill="${color}"/>`;};
function laurel(color='currentColor',full=false){
 let art=`<path d="M22 88Q-1 69 7 36M78 88Q101 69 93 36" fill="none" stroke="${color}" stroke-width="1.7"/>`;
 for(const side of [-1,1])for(let i=0;i<(full?6:4);i++){
  const y=39+i*7.5,x=side<0?6+(i*i)*.39:94-(i*i)*.39,angle=side<0?-34-i*4:34+i*4;
  art+=`<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="2.3" ry="4.8" fill="${color}" transform="rotate(${angle} ${x.toFixed(2)} ${y.toFixed(2)})"/>`;
 }
 return art;
}
const tiers={
 rookie:['#667481',circle(43,2.2)+circle(47,1,'currentColor','stroke-dasharray="23 271" transform="rotate(-105 50 50)"')],
 elementary:['#3d8835',circle(43,2.5)+circle(47,1,'currentColor','stroke-dasharray="82 214" transform="rotate(-139 50 50)"')+'<path d="M17 80Q8 78 7 68Q17 69 17 80ZM83 80Q92 78 93 68Q83 69 83 80Z" fill="currentColor"/>'],
 highschool:['#297eaa',circle(43,2.5)+circle(47,1.1,'currentColor','stroke-dasharray="53 21" transform="rotate(-12 50 50)"')+diamond(50,3)+diamond(97,50)+diamond(50,97)+diamond(3,50)],
 college:['#64609a',circle(43,2.5)+circle(47,1,'currentColor','stroke-dasharray="46 28" transform="rotate(-10 50 50)"')+[[17,17],[83,17],[17,83],[83,83]].map(([x,y])=>`<rect x="${x-3}" y="${y-3}" width="6" height="6" rx="1" fill="currentColor" transform="rotate(45 ${x} ${y})"/>`).join('')],
 graduate:['#b17632',circle(42,2.8)+circle(46,1)+laurel('currentColor')+star(50,4,4)],
 phd:['#8862a4',circle(42,2.5)+'<path d="M50 2 91.6 26V74L50 98 8.4 74V26Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'+diamond(50,3,3.2)+diamond(50,97,3.2)],
 researcher:['#248384',circle(42,2.4)+'<ellipse cx="50" cy="50" rx="48" ry="43" transform="rotate(-28 50 50)" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="86" cy="16" r="3" fill="currentColor"/>'+diamond(13,83,3)],
 professor:['#65509b',circle(42,2.8)+circle(46,1)+laurel('currentColor',true)+star(50,3,4)+diamond(50,97,3)],
 dean:['#a37622',circle(42,2.8)+circle(46,1)+laurel('currentColor',true)+'<path d="m39 8 2-6 5 5 4-6 4 6 5-5 2 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>'+diamond(50,97,3)],
 nobel:['#a7801d',circle(41.5,3)+circle(45.5,1.3)+laurel('currentColor',true)+star(50,4,4.5)+[18,36,54,126,144,162,198,216,234,306,324,342].map(a=>{const t=a*Math.PI/180,x=50+48*Math.cos(t),y=50+48*Math.sin(t);return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="1.3" fill="currentColor"/>`;}).join('')]
};
const cosmetics={
 blue:['#2478ab',circle(43,3)+circle(47,1,'#83bdd6','stroke-dasharray="110 185" transform="rotate(28 50 50)"')+'<path d="M75 14Q74 10 78 9Q81 5 84 9Q89 7 91 12Q95 13 94 17H77Q73 17 75 14Z" fill="#fffefa" stroke="#2478ab" stroke-width="1.7"/>'+star(13,80,3.2,'#2478ab')],
 green:['#3b832f',circle(43,2.8)+circle(47,1,'#9dbc75','stroke-dasharray="102 194" transform="rotate(-135 50 50)"')+'<path d="M14 30Q2 28 4 17Q15 18 14 30ZM17 23Q15 12 25 9Q30 20 17 23ZM86 70Q98 72 96 83Q85 82 86 70ZM83 77Q85 88 75 91Q70 80 83 77Z" fill="#89b861" stroke="#3b832f" stroke-width="1.2"/>'],
 copper:['#9c572f',circle(43,3.1)+circle(47,1.2,'#d7a375')+[[17,17],[83,17],[83,83],[17,83]].map(([x,y])=>`<path d="m${x} ${y-4} 4 4-4 4-4-4Z" fill="#d7a375" stroke="#9c572f" stroke-width="1.4"/>`).join('')],
 gold:['#a67b16',circle(43,3.2)+circle(47,1,'#d4ad44')+star(50,3,4.3,'#a67b16')+star(97,50,3.3,'#d4ad44')+star(3,50,3.3,'#d4ad44')+diamond(50,97,3,'#a67b16')+'<path d="M24 9 22 5M76 9 78 5M24 91 22 95M76 91 78 95" fill="none" stroke="#d4ad44" stroke-width="1.6" stroke-linecap="round"/>'],
 orbit:['#2d296e',circle(42,2.8)+[24,-24].map(a=>`<ellipse cx="50" cy="50" rx="48" ry="43" transform="rotate(${a} 50 50)" fill="none" stroke="${a>0?'#a89acb':'#2d296e'}" stroke-width="1.6"/>`).join('')+'<circle cx="87" cy="18" r="3.8" fill="#fdd81c" stroke="#2d296e" stroke-width="1.2"/><circle cx="13" cy="82" r="2.8" fill="#a89acb" stroke="#2d296e" stroke-width="1"/>'+star(50,3,2.8,'#2d296e')]
};
for(const [prefix,items]of [['level',tiers],['cosmetic',cosmetics]])for(const [id,[color,art]]of Object.entries(items))await writeFile(`${folder}/${prefix}-${id}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" color="${color}" aria-hidden="true">${art}</svg>\n`);
console.log('Original avatar frames: ten level silhouettes and five equipped styles.');
