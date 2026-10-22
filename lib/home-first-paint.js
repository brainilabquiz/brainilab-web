// Keep the complete, existing homepage cascade in the first response. There is
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
 let head=html.slice(0,end);
 for(const match of [...head.matchAll(/<link\b[^>]*>/gi)]){
  const tag=match[0];if(attribute(tag,'rel')?.toLowerCase()!=='stylesheet')continue;
  const href=attribute(tag,'href');if(!href||attribute(tag,'media')||attribute(tag,'integrity')||/\sdisabled(?:\s|=|\/?>)/i.test(tag))continue;
  const url=new URL(href,'https://brainilabgames.com/');
  const source=url.pathname.slice(1);
  if(url.origin!=='https://brainilabgames.com'||!styles.has(source))continue;
  const css=inlineCssURLs(await readStyle(source),source);
  head=head.replace(tag,()=>'<style data-home-first-paint="'+source+'">'+css+'</style>');
 }
 return head+html.slice(end);
}
