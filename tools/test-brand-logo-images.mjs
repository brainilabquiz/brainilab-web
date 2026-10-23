import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {brandLogoAVIF} from '../lib/brand-logo-images.js';
import {homeLogoAVIF} from '../lib/home-images.js';
import {prepareArticle,renderPage} from '../lib/learn-content.js';
const strip=html=>html.replace(/<source\b[^>]*type=(?:"image\/avif"|'image\/avif')[^>]*>/g,'');
const source=(prefix='../../',quote='"')=>`<source srcset=${quote}${prefix}assets/brand/brainilab-logo-200.webp 200w, ${prefix}assets/brand/brainilab-logo.webp 450w${quote} sizes=${quote}(max-width: 600px) 100px, 160px${quote} type=${quote}image/webp${quote}/>`;
const picture=(prefix='../../',quote='"')=>`<picture>${source(prefix,quote)}<img src=${quote}${prefix}assets/brand/brainilab-logo.png${quote} width="450" height="153" loading="lazy" decoding="async" alt="BrainiLab"/></picture>`;
for(const [file,prefix] of [['games/number-route/index.html','../../'],['learn/index.html','../'],['learn/a/index.html','/'],['geography/world-flags-quiz/index.html','../../']])for(const quote of ['"',"'"]){
 const original='<header>'+picture(prefix,quote)+'</header><main>Same game and content</main><footer>'+picture(prefix,quote)+'</footer>';
 const changed=brandLogoAVIF(original,file);
 assert.equal((changed.match(/image\/avif/g)||[]).length,2);
 assert.equal(strip(changed),original,'Only add source alternatives; keep fallback/loading/sizes/alt/layout');
 assert.equal(brandLogoAVIF(changed,file),changed,'Idempotent');
 assert.ok(changed.includes(prefix+'assets/brand/brainilab-logo-200-home.avif 200w'));
 assert.ok(changed.includes(prefix+'assets/brand/brainilab-logo-450-home.avif 450w'));
}
for(const original of [
 picture().replace('brainilab-logo.png','replacement.png'),
 picture().replaceAll('brainilab-logo-200.webp','new-logo-200.webp'),
 picture().replaceAll('brainilab-logo.webp','new-logo.webp'),
 picture().replaceAll('.webp ','.webp?changed=1 '),
 picture().replaceAll('../../assets/','https://external.test/assets/'),
 picture().replace('srcset=','data-srcset='),
 picture().replace('200w','200x'),
 '<picture><source type="image/avif" srcset="replacement.avif"/>'+source()+'<img src="../../assets/brand/brainilab-logo.png"/></picture>',
 '<script>const example='+JSON.stringify(picture())+'</script>',
 '<style>.a{content:'+JSON.stringify(picture())+'}</style>',
 '<!-- '+picture()+' -->'
])assert.equal(brandLogoAVIF(original,'games/number-route/index.html'),original,'Unknown/replacement/code images stay untouched');
for(const file of ['profile/index.html','admin/index.html','account/index.html','privacy/index.html','preview/index.html'])assert.equal(brandLogoAVIF(picture('../'),file),picture('../'));
const home=readFileSync('index.html','utf8');assert.equal(brandLogoAVIF(home,'index.html'),homeLogoAVIF(home,'index.html'),'Keep existing homepage behaviour');

const hashes=JSON.parse(readFileSync('tools/fixtures/brand-logo-images.json','utf8'));
for(const [file,expected] of Object.entries(hashes))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),expected,'Logo source/derivative changed: review their visual identity together');
assert.ok(readFileSync('assets/brand/brainilab-logo-200-home.avif').length<readFileSync('assets/brand/brainilab-logo-200.webp').length);
assert.ok(readFileSync('assets/brand/brainilab-logo-450-home.avif').length<readFileSync('assets/brand/brainilab-logo.webp').length);
let pages=0,logos=0;
function walk(directory){for(const f of readdirSync(directory,{withFileTypes:true})){const path=directory+'/'+f.name;if(f.isDirectory())walk(path);else if(f.name.endsWith('.html')){const html=readFileSync(path,'utf8'),changed=brandLogoAVIF(html,path);assert.equal(strip(changed),strip(html),path);if(changed!==html){pages++;logos+=(changed.match(/image\/avif/g)||[]).length-(html.match(/image\/avif/g)||[]).length;}}}}
for(const directory of ['games','learn','daily-quiz','geography','science','history','sports','general-knowledge','reasoning','breaking-news'])walk(directory);
if(existsSync('halloween'))walk('halloween'); // Seasonal pages may be generated only by the Worker.
assert.ok(pages>10&&logos>20);
const article=prepareArticle(JSON.parse(readFileSync('content/articles/why-is-the-sky-blue.json','utf8'))),template=readFileSync('learn/index.html','utf8');
const original=renderPage(template,[article],article),runtime=renderPage(brandLogoAVIF(template,'learn/index.html'),[article],article);
assert.equal(strip(runtime),strip(original),'CMS rendering must retain the optimized header/footer without changing article/quiz content');
assert.ok(runtime.includes('brainilab-logo-200-home.avif'));
console.log(`PASS public logo AVIF: ${pages} source pages/${logos} logo alternatives; original HTML/fallbacks preserved, exact asset pairs, root/nested paths, replacement/code safeguards and CMS rendering.`);
