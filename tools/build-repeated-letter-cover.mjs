import {writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE);
const slug='repeated-letters-in-five-letter-word-games';
const tiles=[['A','#27833b','#ffffff'],['L','#fdd81c','#2d296e'],['L','#6d7180','#ffffff'],['E','#fdd81c','#2d296e'],['Y','#6d7180','#ffffff']];
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 640"><rect width="960" height="640" fill="#faf8f3"/><circle cx="865" cy="85" r="135" fill="#edeaf7"/><circle cx="70" cy="650" r="150" fill="#f9edbd"/><text x="480" y="165" text-anchor="middle" font-family="Arial,sans-serif" font-size="36" fill="#2d296e">Example answer: APPLE</text>${tiles.map(([letter,bg,fg],i)=>`<rect x="${130+i*144}" y="236" width="124" height="142" rx="16" fill="${bg}"/><text x="${192+i*144}" y="331" text-anchor="middle" font-family="Arial,sans-serif" font-size="76" font-weight="700" fill="${fg}">${letter}</text>`).join('')}<path d="M336 402v28h144v-28" stroke="#2d296e" stroke-width="4" fill="none" stroke-linecap="round"/><text x="408" y="481" text-anchor="middle" font-family="Arial,sans-serif" font-size="32" font-weight="700" fill="#2d296e">One L in the answer.</text></svg>`;
await mkdir('assets/illustrations/learn',{recursive:true});await writeFile(`assets/illustrations/learn/${slug}.svg`,svg);
for(const [width,suffix] of [[960,''],[480,'-small'],[240,'-thumb']])await sharp(Buffer.from(svg)).resize(width).webp({quality:86}).toFile(`assets/images/learn/${slug}${suffix}.webp`);
console.log('Created three responsive covers.');
