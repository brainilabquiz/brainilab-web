const origin='https://brainilabgames.com';
const text=value=>String(value??'').replace(/\s+/g,' ').trim();

// Catalogue membership is a publication fact, not a draft's current revision.
export const publishedRecord=row=>!Object.hasOwn(row||{},'published_revision')||Number.isInteger(row.published_revision)&&row.published_revision>0;

export function articleAddress(href,slug=''){
 if(typeof href!=='string'||!href||/[\x00-\x20\\]/.test(href)||href.startsWith('//'))return null;
 if(!href.startsWith('/')&&!href.startsWith('#')&&!href.startsWith('https://'))return null;
 try{
  const u=new URL(href,origin+'/learn/'+slug+'/');
  if(u.protocol!=='https:'||u.username||u.password)return null;
  const internal=['brainilabgames.com','www.brainilabgames.com'].includes(u.hostname)&&!u.port;
  return {kind:internal?'internal':'external',url:u.href,path:u.pathname,hash:u.hash,query:u.search};
 }catch{return null;}
}

export function articleLinks(article,document){
 const a=article||{},links=[];
 const add=(href,label,location,field,extra={})=>links.push({href:String(href??''),label:text(label),location,field,...extra,address:articleAddress(href,a.slug)});
 for(const [index,section]of(Array.isArray(a.sections)?a.sections:[]).entries()){
  const template=document.createElement('template');template.innerHTML=String(section.html??'');
  for(const el of template.content.querySelectorAll('a'))add(el.getAttribute('href')||'',el.textContent,'text','section-title-'+index,{sectionIndex:index,rel:[...new Set((el.getAttribute('rel')||'').toLowerCase().split(/\s+/).filter(Boolean))]});
 }
 for(const [i,s]of(Array.isArray(a.sources)?a.sources:[]).entries())add(s.url,s.name,'source','source-url-'+i);
 if(a.game?.url)add(a.game.url,a.game.name,'game','article-game-pick');
 if(a.hub?.url)add(a.hub.url,a.hub.name,'topic','article-hub-url');
 for(const slug of Array.isArray(a.related)?a.related:[])add('/learn/'+slug+'/',slug,'related reading','article-related-search');
 return links;
}
