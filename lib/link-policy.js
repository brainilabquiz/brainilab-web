// All navigational links open a fresh tab. Preserve existing semantic rel tokens.
export function newTabLinks(html){
 return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi).map((part,i)=>i%2?part:part.replace(/<a\b([^>]*\bhref\s*=\s*(?:"[^"]*"|'[^']*')[^>]*)>/gi,(_,attrs)=>{
  const rel=attrs.match(/\srel\s*=\s*["']([^"']*)["']/i)?.[1]||'';
  attrs=attrs.replace(/\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'');
  return `<a${attrs} target="_blank" rel="${[...new Set([...rel.split(/\s+/).filter(Boolean),'noopener','noreferrer'])].join(' ')}">`;
 })).join('');
}
