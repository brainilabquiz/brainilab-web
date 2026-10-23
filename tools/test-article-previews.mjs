import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {articlePreviews,articlePreviewImage} from '../lib/article-preview-images.js';
import {prepareArticle,renderPage,articleBody} from '../lib/learn-content.js';
import {coverImage} from '../lib/cover-images.js';
const template=readFileSync('learn/index.html','utf8');
const articles=readdirSync('content/articles').filter(f=>f.endsWith('.json')).map(f=>prepareArticle(JSON.parse(readFileSync('content/articles/'+f,'utf8'))));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const meta=(html,key)=>html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1];
const graph=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1])['@graph'];
const urls=new Set();
for(const [source,preview] of Object.entries(articlePreviews)){
 const article=articles.find(a=>a.cover.src===source);
 assert.ok(article,'Preview must belong to a current article cover');
 const originalDocument=JSON.stringify(article),body=articleBody(article,articles);
 assert.equal(sha(readFileSync('.'+source)),preview.coverSha256,'Changed artwork requires preview review');
 assert.match(preview.src,/^\/assets\/images\/learn\/[a-z0-9-]+-preview-[a-f0-9]{12}\.png$/);
 assert.ok(!urls.has(preview.src));urls.add(preview.src);
 const image=readFileSync('.'+preview.src);
 assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 assert.equal(image.readUInt32BE(16),preview.width);assert.equal(image.readUInt32BE(20),preview.height);
 assert.ok(preview.width>=1200&&preview.width*preview.height>300000);
 assert.equal(preview.type,'image/png');assert.equal(sha(image),preview.previewSha256);
 assert.ok(preview.src.includes(preview.previewSha256.slice(0,12)));
 const html=renderPage(template,articles,article),twice=renderPage(html,articles,article);
 for(const page of [html,twice]){
  for(const key of ['og:image','twitter:image'])assert.equal(meta(page,key),'https://brainilabgames.com'+preview.src);
  assert.equal(graph(page).find(n=>n['@type']==='Article').image,meta(page,'og:image'));
  for(const key of ['width','height','type']){
   assert.equal(meta(page,'og:image:'+key),String(preview[key]));
   assert.equal((page.match(new RegExp(`property="og:image:${key}"`,'g'))||[]).length,1);
  }
  assert.equal(meta(page,'og:image:alt'),meta(page,'twitter:image:alt'));
  assert.match(meta(page,'robots'),/max-image-preview:large/);
  assert.equal(page.match(/<body[\s\S]*<\/body>/)[0].includes(preview.src),false,'Large original must not be an on-page download');
  assert.ok(page.includes(`src="${source}"`));
 }
 assert.ok(!body.includes(preview.src));
 assert.ok(!coverImage(article.cover).includes('-preview-'));
 assert.equal(JSON.stringify(article),originalDocument,'Rendering must not mutate content/progress identifiers');
 const changed={...article,cover:{...article.cover,src:'/assets/images/learn/replacement.webp'}};
 assert.equal(articlePreviewImage(changed.cover),null);
 const replaced=renderPage(twice,articles,changed);
 assert.equal(meta(replaced,'og:image'),'https://brainilabgames.com/assets/images/learn/replacement.webp');
 assert.equal(meta(replaced,'og:image:width'),undefined);
 assert.ok(!replaced.includes(preview.src));
 const library=renderPage(twice,articles,null);
 assert.equal(meta(library,'og:image'),'https://brainilabgames.com/assets/brand/og-card.png');
 assert.equal(meta(library,'og:image:width'),undefined);
}
for(const src of [undefined,'__proto__','constructor','/assets/images/learn/missing.webp','https://example.com/cover.webp'])assert.equal(articlePreviewImage({src}),null);
const fallback=articles.find(a=>!articlePreviewImage(a.cover));
assert.equal(meta(renderPage(template,articles,fallback),'og:image'),new URL(fallback.cover.src,'https://brainilabgames.com').href);
console.log(`PASS: ${urls.size} original preview identities, dimensions/hashes, metadata/schema agreement, rerender/replacement fallback and unchanged on-page image requests.`);
