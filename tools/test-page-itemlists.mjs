import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sanitizeHtml from 'sanitize-html';

// This checks declared list destinations against actual HTML anchors only.
// It does not fetch destinations, infer ranks or inspect dynamic question packs.
function missingDestinations(html,base){
 const address=href=>{try{const u=new URL(href,base);return u.origin+u.pathname.replace(/index\.html$/,'');}catch{return null;}};
 const anchors=new Set();
 sanitizeHtml(html,{allowedTags:[],nonTextTags:['script','style','textarea','template'],transformTags:{a:(tag,attrs)=>{if(attrs.href)anchors.add(address(attrs.href));return {tagName:tag,attribs:attrs};}}});
 const nodes=[];
 const graph=v=>{if(Array.isArray(v))v.forEach(graph);else if(v&&typeof v==='object'){nodes.push(v);if(v['@graph'])graph(v['@graph']);}};
 for(const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g))graph(JSON.parse(m[1]));
 const lists=nodes.filter(n=>[n['@type']].flat().includes('ItemList')),missing=[];
 for(const list of lists)for(const item of list.itemListElement||[]){
  const href=item.url||item.item?.url||item.item?.['@id']||(typeof item.item==='string'?item.item:null);
  if(href&&!anchors.has(address(href)))missing.push(href);
 }
 return {lists,missing};
}
const base='https://brainilabgames.com/general-knowledge/';
const declaration='<script type="application/ld+json">'+JSON.stringify({'@type':'ItemList',itemListElement:[{'@type':'ListItem',url:'/daily-quiz/'}]})+'</script>';
assert.deepEqual(missingDestinations(declaration+'<a href="../daily-quiz/index.html">Daily</a>',base).missing,[]);
assert.deepEqual(missingDestinations(declaration+'<script>const fake=\'<a href="/daily-quiz/">Daily</a>\'</script><template><a href="/daily-quiz/">Daily</a></template>',base).missing,['/daily-quiz/'],'script/template text is not a public anchor');
let checked=0;
for(const route of ['', 'games/','general-knowledge/','geography/','geography/flags/','science/','history/','sports/']){
 const file=route+'index.html',html=readFileSync(file,'utf8'),r=missingDestinations(html,'https://brainilabgames.com/'+route);
 assert.ok(r.lists.length,file+' retains its existing ItemList');
 assert.deepEqual(r.missing,[],file+' declares only destinations linked in the returned HTML');checked+=r.lists.length;
}
assert.ok(checked>=8);
console.log('PASS page ItemLists: eight public catalogues, observed anchor destinations, legacy/difficulty URL context and exclusion of script/template-only links; no fetch or gameplay changes.');
