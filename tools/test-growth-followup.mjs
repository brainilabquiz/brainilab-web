import assert from 'node:assert/strict';
import {comparison} from '../editor/growth-followup.js';
const url='https://brainilabgames.com/games/number-route/',zone='America/Los_Angeles',now=Date.parse('2026-11-07T12:00:00Z');
export function followupFixture(){
 const opportunity={id:1,url,state:'published',revision:2,updated_at:'2026-10-20T12:00:00Z',published_at:'2026-10-20T12:00:00Z',change_reference:'https://github.com/brainilabquiz/brainilab-web/pull/280',baseline_report:'baseline',proposal:{name:'Number Route',pageEvidence:{value:url,clicks:0,impressions:104,ctr:0,position:4.3}}};
 const reports=[{id:'baseline',period:{start:'2026-10-04',end:'2026-10-17',timezone:zone},filters:{searchType:'Web',requestedRange:'old range'}}];
 const report={id:'followup',document:{property:'sc-domain:brainilabgames.com',availablePeriod:{start:'2026-10-21',end:'2026-11-03',timezone:zone},filters:{requestedRange:'new range',searchType:'Web'},opportunities:[{url,pageEvidence:{value:url,clicks:2,impressions:110,ctr:2/110,position:4}}]}};
 return {opportunity,reports,report};
}
const f=followupFixture(),before=JSON.stringify(f),plan=comparison(f.opportunity,f.report,f.reports,now);
assert.equal(plan.ready,true);assert.equal(plan.before.clicks,0);assert.equal(plan.after.clicks,2);assert.match(plan.message,/does not prove/);
const waiting=comparison(f.opportunity,f.report,f.reports,Date.parse('2026-10-28T18:00:00Z'));
assert.equal(waiting.status,'waiting');assert.deepEqual(waiting.earliestPeriod,{start:'2026-10-21',end:'2026-11-03',timezone:zone});
assert.equal(comparison(f.opportunity,f.report,f.reports,Date.parse('2026-11-04T06:00:00Z')).status,'waiting','The last Pacific day must finish, including the DST boundary');
for(const [reason,change]of [
 ['publication_unverified',x=>x.opportunity.change_reference=null],
 ['publication_unverified',x=>x.opportunity.published_at='2026-02-30T12:00:00Z'],
 ['publication_unverified',x=>x.opportunity.published_at='2026-10-20T24:00:00Z'],
 ['publication_unverified',x=>x.opportunity.published_at='2027-01-01T12:00:00Z'],
 ['missing_baseline',x=>x.reports.push(structuredClone(x.reports[0]))],
 ['missing_baseline',x=>delete x.reports[0].period.timezone],
 ['baseline_overlaps',x=>x.reports[0].period.end='2026-10-20'],
 ['scope_mismatch',x=>x.report.document.filters.country='USA'],
 ['scope_mismatch',x=>{x.report.document.filters.page=url+'index.html';x.reports[0].filters.page=url+'index.html';}],
 ['scope_mismatch',x=>x.report.document.filters.searchType='Image'],
 ['missing_report',x=>x.report.document.availablePeriod.timezone='UTC'],
 ['missing_report',x=>x.report.document.property='sc-domain:another.example'],
 ['unfinished_report',x=>x.report.document.availablePeriod.end='2026-11-07'],
 ['window_mismatch',x=>x.report.document.availablePeriod.start='2026-10-04'],
 ['window_mismatch',x=>x.report.document.availablePeriod.end='2026-11-02'],
 ['missing_baseline_page',x=>x.opportunity.proposal.pageEvidence=null],
 ['missing_baseline_page',x=>x.opportunity.proposal.pageEvidence.value=url+'index.html'],
 ['missing_followup_page',x=>x.report.document.opportunities=[]],
 ['missing_followup_page',x=>x.report.document.opportunities.push(structuredClone(x.report.document.opportunities[0]))],
 ['missing_followup_page',x=>x.report.document.opportunities[0].pageEvidence.clicks=null],
 ['missing_followup_page',x=>x.report.document.opportunities[0].pageEvidence.impressions=-1],
 ['missing_followup_page',x=>x.report.document.opportunities[0].pageEvidence.value='https://brainilabgames.com/games/math-rush/']
]){const x=structuredClone(f);change(x);const c=comparison(x.opportunity,x.report,x.reports,now);assert.equal(c.ready,false,reason);assert.equal(c.reason,reason);assert.equal(c.after,undefined);}
const absent=structuredClone(f);absent.report.document.opportunities=[];absent.report.document.seoExplorer={searchSources:{webPages:{rows:[{path:'/games/number-route/',clicks:2,impressions:110}]}}};assert.equal(comparison(absent.opportunity,absent.report,absent.reports,now).ready,false,'Never substitute query aggregation for the missing page total');
const optional=structuredClone(f);delete optional.report.document.opportunities[0].pageEvidence.ctr;assert.equal(comparison(optional.opportunity,optional.report,optional.reports,now).after.ctr,null);
const dst=structuredClone(f);dst.opportunity.published_at='2026-11-01T06:30:00Z';assert.deepEqual(comparison(dst.opportunity,dst.report,dst.reports,now).earliestPeriod,{start:'2026-11-01',end:'2026-11-14',timezone:zone});
assert.equal(JSON.stringify(f),before,'Do not mutate original decisions or their baselines');
console.log('PASS follow-up planning: original 14-day baseline, Pacific/DST boundaries, full windows, verified publication, scope and exact-page evidence, explicit zero vs missing, no query sums or baseline mutations.');
