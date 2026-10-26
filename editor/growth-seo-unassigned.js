import {publicPageURL} from './growth-seo-page.js';

const order=(a,b)=>b.impressions-a.impressions||b.clicks-a.clicks||a.query.localeCompare(b.query);

// Search observations are candidates for inspection, never new decisions. A
// missing/ambiguous crawl must not turn an old search URL into recommended work.
export function unassignedSearchPages(snapshot,decisions,sources,filter='',rank=order){
 if(!Array.isArray(decisions)||!sources||!Array.isArray(snapshot?.pages))return [];
 const assigned=new Set(decisions.map(d=>d.url)),matches=new Map(),q=filter.trim().toLowerCase();
 for(const row of sources.webPages.rows){
  const url='https://brainilabgames.com'+row.path;
  if(!publicPageURL(url)||assigned.has(url)||row.impressions<1||!(url+' '+row.query).toLowerCase().includes(q))continue;
  const old=matches.get(url);
  if(!old||rank(row,old)<0)matches.set(url,row);
 }
 return [...matches].flatMap(([url,query])=>{
  const inspections=snapshot.pages.filter(p=>p.url===url);
  if(inspections.length!==1)return [];
  const inspection=inspections[0];
  if(inspection.status!==200||inspection.finalUrl!==url||typeof inspection.checkedAt!=='string'||!Number.isFinite(Date.parse(inspection.checkedAt)))return [];
  return [{url,decision:null,query,inspection,protectedPage:false}];
 }).sort((a,b)=>rank(a.query,b.query)||a.url.localeCompare(b.url));
}
