// Only links to other websites open a fresh tab. Keep internal navigation in place.
export function newTabLinks(html){
 return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi).map((part,i)=>i%2?part:part.replace(/<a\b([^>]*\bhref\s*=\s*(?:"[^"]*"|'[^']*')[^>]*)>/gi,(_,attrs)=>{
  const href=attrs.match(/\bhref\s*=\s*["']([^"']*)["']/i)?.[1]||'';
  let external=false;
  try{const url=new URL(href,'https://brainilabgames.com/');external=/^https?:$/.test(url.protocol)&&url.hostname.replace(/^www\./,'')!=='brainilabgames.com';}catch{}
  const rel=attrs.match(/\srel\s*=\s*["']([^"']*)["']/i)?.[1]||'';
  attrs=attrs.replace(/\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
  const tokens=rel.split(/\s+/).filter(t=>t&&!['noopener','noreferrer'].includes(t.toLowerCase()));
  if(external)tokens.push('noopener','noreferrer');
  return `<a${attrs}${external?' target="_blank"':''}${tokens.length?' rel="'+[...new Set(tokens)].join(' ')+'"':''}>`;
 })).join('');
}
