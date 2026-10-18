// Public identity only. Keep publisher and site-name signals consistent without
// adding visible copy or changing page-specific titles, canonicals or indexing.
export const BRAND_NAME='BrainiLab';
const BASE='https://brainilabgames.com';
export const organization=Object.freeze({
 '@type':'Organization','@id':BASE+'/#organization',name:BRAND_NAME,
 alternateName:Object.freeze(['BrainiLab Games','Braini Lab']),url:BASE+'/',
 logo:Object.freeze({'@type':'ImageObject',url:BASE+'/assets/brand/brainilab-logo.png',contentUrl:BASE+'/assets/brand/brainilab-logo.png',width:450,height:153}),
 image:BASE+'/assets/brand/og-card.png',
 description:'BrainiLab creates free quiz games and knowledge challenges across web, video and social platforms.',
 sameAs:Object.freeze(['https://www.youtube.com/@BrainiLab','https://www.instagram.com/brainilab/','https://www.tiktok.com/@brainilabquiz'])
});
export const pageTitle=title=>String(title).includes(BRAND_NAME)?String(title):String(title)+' | '+BRAND_NAME;

// Used by the static build and CMS renderers. Work only inside the head; body,
// structured data, scripts, noindex and canonical directives remain untouched.
export function brandPage(html){
 let inHead=false;
 return html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<\/?head\b[^>]*>|<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi,token=>{
  if(/^<head\b/i.test(token)){inHead=true;return token;}
  if(/^<\/head\b/i.test(token)&&inHead){inHead=false;return '<meta property="og:site_name" content="'+BRAND_NAME+'"/>'+token;}
  return inHead&&/^<meta\b/i.test(token)&&/\bproperty\s*=\s*(?:"og:site_name"|'og:site_name'|og:site_name(?=[\s/>]))/i.test(token)?'':token;
 });
}
