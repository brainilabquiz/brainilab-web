import postcss from 'postcss';
// Only omit positive namespaces belonging to other page surfaces. This is not a
// general purge: quiz, auth, account, avatar/frame/badge, rewards and popup rules
// remain, including mixed selectors and all functional/negated alternatives.
const otherPage=/^(?:profile-|ranking-|rankings-|stats-|social-|group-|groups-|friends-)/;
const shared=new Set(['profile-title-context','profile-ranks','profile-rank-journey','social-avatar','group-player-avatar']);
export function homeClassNames(html){return new Set([...html.matchAll(/\bclass=["']([^"']*)["']/gi)].flatMap(([,value])=>value.split(/\s+/)).filter(Boolean));}
export function otherPageSelector(selector,protectedClasses=new Set()){
 if(selector.includes('\\'))return false;
 let top='',paren=0,bracket=0,quote='';
 for(const char of selector){
  if(quote){if(char===quote)quote='';continue;}
  if(char==='"'||char==="'"){quote=char;continue;}
  if(char==='['){bracket++;continue;}if(char===']'){bracket--;continue;}if(bracket)continue;
  if(char==='('){paren++;continue;}if(char===')'){paren--;continue;}if(paren)continue;
  top+=char;
 }
 return [...top.matchAll(/\.([a-zA-Z_][\w-]*)/g)].some(([,name])=>otherPage.test(name)&&!shared.has(name)&&!protectedClasses.has(name));
}
export function homeComponentCSS(css,protectedClasses=new Set()){
 const root=postcss.parse(css),removed=[];
 root.walkRules(rule=>{if(rule.selectors.length&&rule.selectors.every(selector=>otherPageSelector(selector,protectedClasses))){removed.push(rule.selector);rule.remove();}});
 root.walkAtRules(rule=>{if(['media','supports','container'].includes(rule.name)&&rule.nodes?.length===0)rule.remove();});
 return {css:root.toString(),removed};
}
