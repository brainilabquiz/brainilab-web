import {publicPageURL} from './growth-seo-page.js';

const ZONE='America/Los_Angeles',DAY=86400000;
const day=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\d$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const period=p=>p&&day(p.start)&&day(p.end)&&p.start<=p.end&&p.timezone===ZONE;
const length=p=>(Date.parse(p.end)-Date.parse(p.start))/DAY+1;
const shift=(d,n)=>new Date(Date.parse(d)+n*DAY).toISOString().slice(0,10);
const pacific=value=>{
 if(!Number.isFinite(new Date(value).getTime()))return null;
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(value));
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
};
const filters=v=>v&&typeof v==='object'&&!Array.isArray(v)&&v.searchType==='Web'&&Object.values(v).every(x=>['string','boolean','number'].includes(typeof x))?JSON.stringify(Object.entries(v).filter(([k])=>k!=='requestedRange').sort(([a],[b])=>a.localeCompare(b))):null;
const reference=v=>{try{const u=new URL(v);return u.protocol==='https:'&&['brainilabgames.com','github.com'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.search;}catch{return false;}};
const scopeLabel=f=>{
 if(!f||typeof f!=='object')return 'Unknown';
 const labels=[];for(const k of ['searchType','country','device'])if(typeof f[k]==='string'&&/^[A-Za-z0-9 _-]{1,30}$/.test(f[k]))labels.push(k+': '+f[k]);
 if(f.page)labels.push(publicPageURL(f.page)===f.page?'page: '+f.page:'Unknown page filter');
 if(Object.keys(f).some(k=>!['searchType','country','device','page','requestedRange'].includes(k)))labels.push('Additional recorded filters');
 return labels.join('; ')||'Unknown';
};
const metricRow=(r,url)=>{
 if(!r||r.value!==url||!['clicks','impressions'].every(k=>Number.isSafeInteger(r[k])&&r[k]>=0)||r.clicks>r.impressions)return null;
 return {clicks:r.clicks,impressions:r.impressions,ctr:typeof r.ctr==='number'&&Number.isFinite(r.ctr)&&r.ctr>=0&&r.ctr<=1?r.ctr:null,position:typeof r.position==='number'&&Number.isFinite(r.position)&&r.position>=0?r.position:null};
};

// Uses only the original decision baseline and the currently loaded report.
// A required window is a read-only plan, never an instruction to collect data.
export function comparison(opportunity,report,reports,now=Date.now()){
 const result={ready:false,status:'needs_data',reason:'missing_baseline',baseline:null,currentPeriod:report?.document?.availablePeriod||null,currentScope:scopeLabel(report?.document?.filters),baselineScope:'Unknown',earliestPeriod:null,publishedDay:null,days:null};
 const stop=(reason,message,status='needs_data')=>({...result,reason,message,status});
 if(!opportunity?.published_at)return stop('unpublished','Record the verified publication first. Your original baseline stays attached to this proposal.','unpublished');
 if(publicPageURL(opportunity.url)!==opportunity.url||!reference(opportunity.change_reference)||typeof opportunity.published_at!=='string'||!/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(opportunity.published_at)||!day(opportunity.published_at.slice(0,10))||!Number.isFinite(Date.parse(opportunity.published_at))||Date.parse(opportunity.published_at)>now+300000)return stop('publication_unverified','Review the recorded publication date and reference before comparing. No baseline is changed.');
 result.publicationReference=opportunity.change_reference;
 const baselines=Array.isArray(reports)?reports.filter(r=>r?.id===opportunity.baseline_report):[];
 if(baselines.length!==1||!period(baselines[0].period)||length(baselines[0].period)>366)return stop('missing_baseline','A single dated baseline with Search Console Pacific boundaries is needed. Preserve the original baseline.');
 const saved=baselines[0],baseline=saved.period,publishedDay=pacific(opportunity.published_at),days=length(baseline);
 Object.assign(result,{baseline,publishedDay,days,baselineScope:scopeLabel(saved.filters)});
 if(baseline.end>=publishedDay)return stop('baseline_overlaps','The original baseline includes or follows the publication day. Review its history; it is not replaced automatically.');
 // Known original counts remain useful while follow-up evidence is unavailable.
 // Keep them separate: retaining a baseline must never make a comparison ready.
 const scope=filters(saved.filters),before=scope&&(!saved.filters.page||saved.filters.page===opportunity.url)?metricRow(opportunity.proposal?.pageEvidence,opportunity.url):null;
 if(before)result.before=before;
 const start=shift(publishedDay,1),end=shift(start,days-1);result.earliestPeriod={start,end,timezone:ZONE};
 const today=pacific(now),current=report?.document;
 if(!today)return stop('unknown_clock','The current date is unavailable. No readiness date is inferred.');
 if(today<=end)return stop('window_incomplete',`Wait for a full ${days}-day observation after publication. The earliest window is ${start} to ${end}, in Search Console Pacific dates.`,'waiting');
 if(!period(current?.availablePeriod)||current?.property!=='sc-domain:brainilabgames.com')return stop('missing_report','Load a dated BrainiLab Web Search report with matching Pacific day boundaries.');
 if(!scope||scope!==filters(current.filters)||[saved.filters,current.filters].some(f=>f.page&&f.page!==opportunity.url))return stop('scope_mismatch','The reports use different or unknown filters. Load a matching scope before comparing.');
 const p=current.availablePeriod;
 if(p.end>=today)return stop('unfinished_report','The loaded report includes an unfinished or future Pacific day. Wait for complete final data.');
 if(p.start<=publishedDay||p.start<=baseline.end||length(p)!==days)return stop('window_mismatch',`Load a complete ${days}-day report after publication. The earliest eligible window is ${start} to ${end}; overlapping or unequal periods are not compared.`);
 const matches=Array.isArray(current.opportunities)?current.opportunities.filter(o=>o.url===opportunity.url):[];
 if(!before)return stop('missing_baseline_page','The original baseline lacks usable exact-page counts. Missing values remain unknown; the baseline is preserved.');
 const after=matches.length===1?metricRow(matches[0].pageEvidence,opportunity.url):null;
 if(!after)return stop('missing_followup_page','The follow-up report has no single usable exact-page observation. Missing data is not zero traffic; query rows are not summed to fill it.');
 return {...result,ready:true,status:'ready',reason:'comparable',before,after,message:'Descriptive before/after comparison. It does not prove that the change caused the difference.'};
}
