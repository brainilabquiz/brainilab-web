import {homeComponentCSS,homeClassNames} from './home-component-css.js';
// Keep the existing homepage component cascade in the first response. There is
// no asynchronous stylesheet switch, so navigation and signed-in UI never paint
// with a partial stylesheet. Other routes retain their shared cached sheets.
const styles=new Set(['assets/css/site.css','assets/css/mobile.css','assets/css/home-page.css']);
const attribute=(tag,name)=>tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1];
export function inlineCssURLs(css,file){
 if(/@import\b|@charset\b/i.test(css))throw Error('Inline home styles cannot contain imports or charset rules');
 return css.replace(/url\(\s*(?:"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|([^)]*))\s*\)/gi,(token,double,single,bare)=>{
  const value=(double??single??bare).trim();
  if(/^(?:data:|https?:|\/\/|#)/i.test(value))return token;
  if(value.includes('\\'))throw Error('Unexpected escaped relative CSS URL');
  const url=new URL(value,'https://brainilabgames.com/'+file);
  if(url.origin!=='https://brainilabgames.com')return token;
  return 'url("'+url.pathname+url.search+url.hash+'")';
 }).replace(/</g,'\\3c ');
}
export async function homeFirstPaint(html,file,readStyle){
 if(file!=='index.html')return html;
 const end=html.indexOf('</head>');if(end<0)return html;
 let head=html.slice(0,end);const protectedClasses=homeClassNames(html);
 for(const match of [...head.matchAll(/<link\b[^>]*>/gi)]){
  const tag=match[0];if(attribute(tag,'rel')?.toLowerCase()!=='stylesheet')continue;
  const href=attribute(tag,'href');if(!href||attribute(tag,'media')||attribute(tag,'integrity')||/\sdisabled(?:\s|=|\/?>)/i.test(tag))continue;
  const url=new URL(href,'https://brainilabgames.com/');
  const source=url.pathname.slice(1);
  if(url.origin!=='https://brainilabgames.com'||!styles.has(source))continue;
  const css=inlineCssURLs(homeComponentCSS(await readStyle(source),protectedClasses).css,source);
  head=head.replace(tag,()=>'<style data-home-first-paint="'+source+'">'+css+'</style>');
 }
 return head+html.slice(end);
}
export function homeConsentFirstResponse(html,file,bundle){
 if(file!=='index.html')return html;
 const scripts=[...html.matchAll(/<script\b[^>]*\bsrc=["']\/?assets\/js\/consent\.bundle\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi)];
 if(scripts.length!==1||/\bintegrity\s*=/i.test(scripts[0][0]))throw Error('Expected one existing home consent controller');
 const gate=/<script data-home-cookie-gate>[\s\S]*?<\/script>/;
 if(!gate.test(html))throw Error('Missing initial home consent gate');
 const code=bundle.replace(/<\/script/gi,'<\\/script');
 return html.replace(scripts[0][0],'').replace(gate,match=>match+'<script data-home-consent-controller>'+code+'</script>');
}
export function homeSeasonFirstPaint(html,file,css,asset){
 if(file!=='index.html')return html;
 if(!/^\/assets\/css\/halloween\.css\?v=[a-f0-9]{12}$/.test(asset))throw Error('Unexpected seasonal asset');
 return html.replace('</head>',()=>'<style data-home-season-css="'+asset+'">'+inlineCssURLs(css,'assets/css/halloween.css')+'</style></head>');
}
