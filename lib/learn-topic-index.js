const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Stable identifiers keep shared category links independent of article order.
export function topicAnchor(topic){
 const text=String(topic),name=text.normalize('NFKD').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'topic';
 let hash=2166136261;for(const char of text)hash=Math.imul(hash^char.codePointAt(0),16777619)>>>0;
 return name+'-'+hash.toString(36);
}
export function topicIndexBody(articles){
 const topics=[...new Set(articles.map(a=>a.topic))].sort((a,b)=>a.localeCompare(b,'en'));
 const ordered=[...articles].sort((a,b)=>(Date.parse(b.publishedAt)||0)-(Date.parse(a.publishedAt)||0)||a.slug.localeCompare(b.slug));
 const groups=topics.map(topic=>({topic,id:topicAnchor(topic),articles:ordered.filter(a=>a.topic===topic)}));
 const navigation=groups.map(g=>`<a href="#${g.id}"><span>${escape(g.topic)}</span><span>${g.articles.length}</span></a>`).join('');
 const sections=groups.map(g=>`<section class="topic-index-section" id="${g.id}" aria-labelledby="${g.id}-title"><header><h2 id="${g.id}-title">${escape(g.topic)}</h2><a href="#topics-top">All topics <span aria-hidden="true">↑</span></a></header><ul class="topic-index-list">${g.articles.map(a=>`<li><a href="/learn/${a.slug}/"><span>${escape(a.title)}</span><small>${a.minutes} min read <span aria-hidden="true">→</span></small></a></li>`).join('')}</ul></section>`).join('');
 return `<div class="wrap topic-index" id="topics-top"><nav class="breadcrumb" aria-label="Breadcrumb"><a href="/learn/">Learn</a><span aria-hidden="true">/</span><span aria-current="page">All topics</span></nav><header class="topic-index-header"><h1>Find your next read.</h1><p>Pick a topic. Follow your curiosity.</p><a href="/learn/">Back to the illustrated library <span aria-hidden="true">→</span></a></header>${groups.length?`<nav class="topic-index-nav" aria-label="Jump to a topic">${navigation}</nav>${sections}`:'<p>No articles are available right now. <a href="/games/">Browse the games →</a></p>'}<p class="topic-index-footer">Prefer to take it step by step? <a href="/learn/paths/">Explore BrainiLab Academy →</a></p></div>`;
}
