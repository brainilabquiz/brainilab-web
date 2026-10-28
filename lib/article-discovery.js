// Local catalogue suggestions only; word overlap does not establish shared intent.
const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=value=>fold(value).match(/[a-z0-9]+/g)||[];
const stop=new Set('a an the what why how when where who is are was were do does did can could would should it its in on of to for and or if with from your you our their this that than have has more explained explain meet'.split(' '));
const terms=value=>new Set(words(value).filter(w=>!stop.has(w)).map(w=>w.length>4&&w.endsWith('s')?w.slice(0,-1):w));
export function catalogueMatches(query,rows,{excludeSlug='',topic='',publishedOnly=false}={}){
 const tokens=words(query);
 return (rows||[]).map(row=>({row,document:row.document||row})).filter(({row,document:d})=>d.slug!==excludeSlug&&(!publishedOnly||!!row.published_revision)).map(({row,document:d})=>{
  const title=fold(d.title),category=fold(d.topic),text=title+' '+category;
  const match=tokens.every(t=>text.includes(t));
  return{row,document:d,match,score:(d.topic===topic?4:0)+tokens.reduce((n,t)=>n+(title.includes(t)?3:category.includes(t)?1:0),0)};
 }).filter(x=>x.match).sort((a,b)=>b.score-a.score||String(a.document.title).localeCompare(String(b.document.title),'en')).map(x=>x.row);
}
export function nearbyArticleTitles(article,rows){
 const wanted=terms(article.title);if(wanted.size<2)return[];
 return(rows||[]).map(row=>row.document?{...row.document,slug:row.slug||row.document.slug}:row).filter(d=>d.slug!==article.slug&&d.title!==article.title).map(d=>{
  const other=terms(d.title),shared=[...wanted].filter(t=>other.has(t));
  return{slug:d.slug,title:d.title,sharedTerms:shared,overlap:shared.length/Math.max(1,Math.min(wanted.size,other.size))};
 }).filter(x=>x.sharedTerms.length>=2&&x.overlap>=0.85).sort((a,b)=>b.overlap-a.overlap||b.sharedTerms.length-a.sharedTerms.length||a.slug.localeCompare(b.slug)).slice(0,3);
}
