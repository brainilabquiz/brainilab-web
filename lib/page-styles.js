// Keep shared core sheets cacheable across routes; combine page-specific sheets
// in their original cascade order and relative asset base to avoid a chain of
// independent render-blocking requests on measured interactive entries.
const shared=new Set(['assets/css/site.css','assets/css/mobile.css','assets/css/stats.css']);
const pages=new Map([['index.html','home-page'],['profile/index.html','profile-page'],['games/number-route/index.html','number-route-page'],['games/math-rush/index.html','math-rush-page'],['games/sequence/index.html','sequence-page'],['learn/index.html','learn-page']]);
const attribute=(tag,name)=>tag.match(new RegExp('\\b'+name+'\\s*=\\s*["\']([^"\']*)["\']','i'))?.[1];
export function pageStyles(html,file){
 const name=pages.get(file);if(!name)return null;
 const end=html.indexOf('</head>');if(end<0)return null;
 const head=html.slice(0,end),styles=[],barriers=[];
 for(const match of head.matchAll(/<link\b[^>]*>/gi)){
  const tag=match[0];if(attribute(tag,'rel')?.toLowerCase()!=='stylesheet')continue;
  const href=attribute(tag,'href');if(!href)continue;
  const url=new URL(href,'https://brainilabgames.com/'+file);
  if(url.origin!=='https://brainilabgames.com'||!/^\/assets\/css\/[a-z0-9-]+\.css$/.test(url.pathname)
    ||attribute(tag,'media')||/\sdisabled(?:\s|=|\/?>)/i.test(tag)||attribute(tag,'integrity')){barriers.push(match.index);continue;}
  const cssFile=url.pathname.slice(1);
  // CMS renderers extract the standalone Academy URL from this template and
  // preserve its published cache version. Do not hide it inside a page bundle.
  if(shared.has(cssFile)||(file==='learn/index.html'&&cssFile==='assets/css/learning-paths.css')){barriers.push(match.index);continue;}
  styles.push({tag,file:cssFile,index:match.index});
 }
 if(styles.length<2)return null;
 if(barriers.some(index=>index>styles[0].index&&index<styles.at(-1).index))return null;
 // Moving sheets around an inline style would change source-order precedence.
 if(/<style\b/i.test(head.slice(styles[0].index,styles.at(-1).index)))return null;
 const asset='assets/css/'+name+'.css';
 let inserted=false;
 const transformed=head.replace(/<link\b[^>]*>/gi,tag=>{
  if(!styles.some(style=>style.tag===tag))return tag;
  if(inserted)return '';inserted=true;return '<link rel="stylesheet" href="/'+asset+'"/>';
 });
 return {html:transformed+html.slice(end),asset,files:styles.map(style=>style.file)};
}

