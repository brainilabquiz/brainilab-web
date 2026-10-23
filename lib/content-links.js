// Link straight to the public content routes already used by their canonicals.
// Keep editable/file-preview sources, queries, fragments and account routes intact.
const contentPaths=new Set([
 '/', '/games/', '/daily-quiz/', '/reasoning/',
 '/general-knowledge/', '/science/', '/history/', '/sports/', '/geography/', '/geography/flags/',
 ...['brain-mix','brainiword','connections','higher-lower','math-rush','number-route','odd-one-out','order-up','sequence','survival','topic-rush'].map(s=>`/games/${s}/`),
 '/general-knowledge/general-knowledge-quiz/', '/science/science-quiz/', '/history/history-quiz/',
 '/sports/sports-quiz/', '/geography/world-capitals-quiz/', '/geography/world-flags-quiz/', '/geography/europe-flags-quiz/'
]);
const protectedParts=/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi;
const attribute=(tag,name)=>tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`,'i'))?.[2];
const publicURL=value=>{
 try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='brainilabgames.com'&&!u.port&&!u.username&&!u.password?u:null;}catch{return null;}
};
export function canonicalContentLinks(html){
 const parts=html.split(protectedParts);
 const markup=parts.filter((_,i)=>i%2===0).join('');
 if(/<base\b[^>]*\shref\s*=/i.test(markup))return html;
 const canonicals=[...markup.matchAll(/<link\b[^>]*>/gi)].filter(m=>attribute(m[0],'rel')?.toLowerCase()==='canonical');
 if(canonicals.length!==1)return html;
 const base=publicURL(attribute(canonicals[0][0],'href'));
 if(!base)return html;
 return parts.map((part,i)=>i%2?part:part.replace(/<a\b(?:"[^"]*"|'[^']*'|[^'">])*?>/gi,tag=>{
  if(/\sdownload(?:\s|=|>)/i.test(tag))return tag;
  const href=attribute(tag,'href');
  if(!href||href.startsWith('#')||!/(?:^|\/)index\.html(?:[?#]|$)/.test(href))return tag;
  let url;try{url=new URL(href,base);}catch{return tag;}
  if(!publicURL(url.href)||!url.pathname.endsWith('/index.html'))return tag;
  const target=url.pathname.slice(0,-'index.html'.length);
  const learn=/^\/learn\/(?:[a-z0-9-]+\/)?$/.test(target)||/^\/learn\/paths\/(?:[a-z0-9-]+\/)?$/.test(target);
  if(!contentPaths.has(target)&&!learn)return tag;
  // Replace only the actual href. Never edit data-href or reserialise parameters.
  return tag.replace(/(\shref\s*=\s*)(["'])(.*?)\2/i,(_,space,quote,value)=>{
   let direct=value.replace(/index\.html(?=[?#]|$)/,'');
   if(!direct||direct.startsWith('?')||direct.startsWith('#'))direct='./'+direct;
   return space+quote+direct+quote;
  });
 })).join('');
}
