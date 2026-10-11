export const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function publicPath(p){return typeof p==='string'&&/^\/(?:[a-z0-9-]+\/)*$/.test(p)&&!/^\/(admin|account|profile)(\/|$)/.test(p);}
export function organisation(value){
 const host=String(value||'').trim().toLowerCase().replace(/^www\./,'');
 return /^(?=.{3,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)?host:null;
}
export function listingURL(value){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&organisation(u.hostname)&&!u.search&&!u.hash?u.href:null;}catch{return null;}
}
const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function snapshot(report){
 const s=report?.distribution;
 if(s?.schemaVersion!==1||!stamp(s.observedAt)||!stamp(s.catalogCollectedAt)||!Array.isArray(s.resources)||!Array.isArray(s.directories)||!Array.isArray(s.contactedDomains))return null;
 return {...s,resources:s.resources.filter(r=>r&&publicPath(r.path)&&typeof r.title==='string'&&r.title.length<=200&&['game','quiz','article','lesson','course','library'].includes(r.kind)),directories:s.directories.filter(r=>r&&organisation(r.domain)&&typeof r.name==='string'&&['published','pending','uncertain','review'].includes(r.state)&&(r.state!=='published'||listingURL(r.listingUrl)&&stamp(r.listingVerifiedAt))),contactedDomains:s.contactedDomains.filter(organisation)};
}
export function campaignLink(resource,source,medium,campaign,content){
 if(!resource||!publicPath(resource.path))throw Error('Choose a published BrainiLab resource.');
 const clean=v=>String(v||'').trim().toLowerCase();
 [source,campaign,content]=[source,campaign,content].map(clean);
 if(![source,campaign,content].every(v=>/^[a-z0-9][a-z0-9._-]{0,79}$/.test(v)))throw Error('Use short public labels: letters, numbers, dots, underscores or hyphens. No email addresses.');
 if(!['referral','social','email'].includes(medium))throw Error('Choose directory, social or email.');
 if(medium==='referral'&&!organisation(source))throw Error('For a directory, use its domain, such as example.com.');
 const url=new URL(resource.path,'https://brainilabgames.com');
 for(const [key,value] of Object.entries({utm_source:source,utm_medium:medium,utm_campaign:campaign,utm_content:content}))url.searchParams.set(key,value);
 return url.href;
}
export function publisherKit(resource,url,question){
 const description=['game','quiz'].includes(resource.kind)?'Play this free BrainiLab '+(resource.kind==='quiz'?'quiz':'game')+' in your browser. No account needed to play.':resource.kind==='course'?'Explore this BrainiLab Academy course through its ordered lessons.':resource.kind==='library'?'Explore BrainiLab’s articles and learning resources.':'Read this explanation on BrainiLab.';
 return `${resource.title}\n\n${description}\n\n${url}\n\nFeedback: ${question.trim()}\n\nWe are the team behind BrainiLab.\n`;
}
export function knownContact(source,s){
 const host=organisation(source);return !!host&&s.contactedDomains.some(d=>host===d||host.endsWith('.'+d)||d.endsWith('.'+host));
}
export function referralObservation(domain,m){
 if(m?.mode!=='api_snapshot'||m.source!=='GA4 Data API'||m.property!=='555562532'||!stamp(m.observedAt)||!Array.isArray(m.sources))return null;
 const rows=m.sources.filter(r=>{const parts=String(r.label||'').split(' / ');const host=organisation(parts[0]);return parts.length===2&&parts[1]==='referral'&&host&&(host===domain||host.endsWith('.'+domain))&&Number.isFinite(r.sessions)&&r.sessions>=0&&Number.isFinite(r.engagedSessions)&&r.engagedSessions>=0;});
 if(!rows.length)return null;
 return {sessions:rows.reduce((n,r)=>n+r.sessions,0),engaged:rows.reduce((n,r)=>n+r.engagedSessions,0)};
}
export async function copyText(text,field,status){
 try{await navigator.clipboard.writeText(text);status.textContent='Copied. Review before sharing.';}
 catch{field.value=text;field.focus();field.select();status.textContent='Clipboard unavailable. The text is selected; copy it manually.';}
}
export function downloadText(text,name){
 const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
