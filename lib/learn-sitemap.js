import {sitemapLastmod} from './sitemap-date.js';

const BASE='https://brainilabgames.com';
const IMAGE_NS='http://www.google.com/schemas/sitemap-image/1.1';
const slug=value=>typeof value==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

// Include the actual reading cover, not a logo, a thumbnail or an inferred file.
// Other hosts need independent Search Console ownership verification first.
export function articleSitemapImage(article){
 const src=article?.cover?.src;
 if(typeof src!=='string'||!/^\/assets\/images\/learn\/[a-z0-9-]+\.webp$/.test(src))return '';
 // prepareArticle uses this cover as a safe fallback for malformed input.
 if(src==='/assets/images/learn/daily-or-anytime.webp'&&article.slug!=='daily-or-anytime')return '';
 return `<image:image><image:loc>${BASE+src}</image:loc></image:image>`;
}

export function articleSitemapEntry(article){
 if(!slug(article?.slug))throw Error('Invalid article sitemap slug');
 return `<url><loc>${BASE}/learn/${article.slug}/</loc>${sitemapLastmod(article.updatedAt)}${articleSitemapImage(article)}</url>`;
}

export function imageSitemapNamespace(xml){
 if(!/<urlset\b[^>]*>/.test(xml))throw Error('Missing sitemap root');
 return xml.replace(/<urlset\b([^>]*)>/, (root,attributes)=>{
  const declared=attributes.match(/\bxmlns:image\s*=\s*(["'])(.*?)\1/);
  if(declared){if(declared[2]!==IMAGE_NS)throw Error('Unexpected image sitemap namespace');return root;}
  return `<urlset${attributes} xmlns:image="${IMAGE_NS}">`;
 });
}

// Both the static build and the live publication route use the same entries.
// Rebuild only Learn URLs from the currently published catalogue; keep all other
// sitemap entries and their stored timestamps intact. Never invent a fresh date.
export function refreshLearnSitemap(original,articles,paths=[]){
 const xml=original.replace(/<url>\s*<loc>https:\/\/brainilabgames\.com\/learn\/[\s\S]*?<\/url>/g,'');
 if(!xml.includes('</urlset>'))throw Error('Missing sitemap closing root');
 const directories=['/learn/','/learn/topics/'];
 const entries=directories.map(path=>`<url><loc>${BASE+path}</loc></url>`).join('')+
  articles.map(articleSitemapEntry).join('')+
  '<url><loc>'+BASE+'/learn/paths/</loc></url>'+paths.map(path=>{
   if(!slug(path?.slug))throw Error('Invalid learning path sitemap slug');
   return `<url><loc>${BASE}/learn/paths/${path.slug}/</loc></url>`;
  }).join('');
 return imageSitemapNamespace(xml.replace('</urlset>',()=>entries+'</urlset>'));
}
