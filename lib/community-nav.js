// Group the two existing destinations before the shared header reaches the browser.
// Native details keeps the links usable even when JavaScript is unavailable.
const hasClass=(attrs,name)=>(attrs.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1]||'').split(/\s+/).includes(name);
const label=html=>html.replace(/<[^>]*>/g,'').trim();
const described=(anchor,description)=>anchor.replace(/(<a\b[^>]*>)([\s\S]*?)(<\/a>)/i,(_,open,text,close)=>`${open}<span>${text}</span><small>${description}</small>${close}`);

export function groupCommunityLinks(html){
 return html.split(/(<script\b[^>]*>[\s\S]*?<\/script>|<style\b[^>]*>[\s\S]*?<\/style>|<!--[\s\S]*?-->)/gi).map((part,i)=>i%2?part:part.replace(/(<header\b([^>]*)>)([\s\S]*?)(<\/header>)/gi,(header,open,attrs,body,close)=>{
  if(!hasClass(attrs,'topbar'))return header;
  return open+body.replace(/(<nav\b([^>]*)>)([\s\S]*?)(<\/nav>)/gi,(nav,navOpen,navAttrs,links,navClose)=>{
   if(!hasClass(navAttrs,'links')||/<details\b[^>]*\bclass=["'][^"']*\bnav-community\b/i.test(links))return nav;
   const anchors=[...links.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)];
   const rankings=anchors.filter(a=>label(a[2])==='Rankings');
   const groups=anchors.filter(a=>label(a[2])==='Groups');
   if(rankings.length!==1||groups.length!==1)return nav;
   const pair=[rankings[0],groups[0]].sort((a,b)=>a.index-b.index);
   const current=pair.some(a=>/\baria-current\s*=\s*["']page["']/i.test(a[1]));
   const community=`<details class="nav-community${current?' is-current':''}"><summary>Community <span class="nav-community-chevron" aria-hidden="true"></span></summary><div class="nav-community-links">${described(rankings[0][0],'See how you compare')}${described(groups[0][0],'Play with friends')}</div></details>`;
   const updated=links.slice(0,pair[0].index)+community+links.slice(pair[0].index+pair[0][0].length,pair[1].index)+links.slice(pair[1].index+pair[1][0].length);
   return navOpen+updated+navClose;
  })+close;
 })).join('');
}
