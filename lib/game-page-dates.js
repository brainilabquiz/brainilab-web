import {articleTimestamp} from './article-date.js';
import {sitemapDate} from './sitemap-date.js';

// Last recorded page-source revisions on main, not build time or Daily puzzle dates.
// First publication is not recorded for these pages and must never be inferred here.
export const gamePageDateRecords=Object.freeze({
  "/games/brain-mix/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/brainiword/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/connections/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/higher-lower/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/math-rush/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/number-route/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/odd-one-out/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/order-up/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/sequence/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/survival/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/topic-rush/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/geography/europe-flags-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/geography/world-flags-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/geography/world-capitals-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/science/science-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/history/history-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/sports/sports-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/general-knowledge/general-knowledge-quiz/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/games/cryptic/": {
    "modifiedAt": "2026-10-29T09:59:21Z",
    "sourceRevision": "0f5bf74998deeafcbe1ffe0fc97c136466e40b3c"
  },
  "/reasoning/": {
    "modifiedAt": "2026-10-30T19:33:42Z",
    "sourceRevision": "299969aa89337db88cc19bfcdf7738d1610ca417"
  },
  "/halloween/trick-or-think/": {
    "modifiedAt": "2026-10-22T06:18:40Z",
    "sourceRevision": "0e8719b3bd1afa71bff0dfcef9cdcc8602456066"
  },
  "/halloween/spooky-connections/": {
    "modifiedAt": "2026-10-22T06:18:40Z",
    "sourceRevision": "0e8719b3bd1afa71bff0dfcef9cdcc8602456066"
  }
});

const BASE='https://brainilabgames.com',types=new Set(['WebPage','Game','Quiz','VideoGame','WebApplication','SoftwareApplication']);
const marker=/<p class="game-page-dates">[\s\S]*?<\/p>/g;
export function gamePageDates(html,path,records=gamePageDateRecords){
 const record=records[path];if(!record)return html;
 const date=articleTimestamp(record.modifiedAt);
 if(!date||!sitemapDate(date)||!/^\d{4}-\d\d-\d\dT/.test(date)||!/^[a-f0-9]{40}$/.test(record.sourceRevision))throw Error('Invalid recorded game page revision: '+path);
 const main=html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
 if(!main||(main[1].match(/<h1\b/gi)||[]).length!==1)throw Error('Ambiguous game page heading: '+path);
 let declarations=0;
 html=html.replace(/(<script\b[^>]*type="application\/ld\+json"[^>]*>)([\s\S]*?)(<\/script>)/gi,(_,open,body,close)=>{
  const graph=JSON.parse(body),nodes=Array.isArray(graph)?graph:graph['@graph']||[graph];let changed=false;
  for(const node of nodes){
   if(node.url!==BASE+path||![].concat(node['@type']).some(t=>types.has(t)))continue;
   if(node.dateModified!=null&&node.dateModified!==date)throw Error('Conflicting game page modification date: '+path);
   node.dateModified=date;declarations++;changed=true;
  }
  return changed?open+JSON.stringify(graph).replace(/</g,'\\u003c')+close:open+body+close;
 });
 if(!declarations)throw Error('Missing game page entity: '+path);
 const label=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(Date.parse(date));
 const line='<p class="game-page-dates">Page updated <time data-game-page-date="modified" datetime="'+date+'">'+label+'</time></p>';
 html=html.replace(/(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i,(_,open,body,close)=>open+body.replace(marker,'').replace(/(<\/h1>)/i,'$1'+line)+close);
 if(!html.includes('data-game-page-dates-style'))html=html.replace('</head>','<style data-game-page-dates-style>main p.game-page-dates{font:400 13px/1.5 system-ui,sans-serif;margin:8px 0 12px;color:inherit}</style></head>');
 return html;
}
