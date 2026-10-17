import assert from 'node:assert/strict';
import {outreachSnapshot,outreachHTML} from '../editor/growth-outreach.js';
const now=Date.parse('2026-10-15T22:30:00Z');
const s={schemaVersion:1,timezone:'Europe/Madrid',asOfLocalDate:'2026-10-16',dailyLimit:20,undatedSends:0,days:Array.from({length:14},(_,n)=>({localDate:new Date(Date.parse('2026-10-16T00:00:00Z')-n*86400000).toISOString().slice(0,10),verifiedSends:0,unresolvedSends:0,permanentFailures:0,humanReplies:0,automaticAcknowledgements:0}))};
const html=v=>outreachHTML(v,'2026-10-15T22:20:00Z',now);
assert.match(html(s),/20 slots remain/);
s.days[0].verifiedSends=20;s.days[0].permanentFailures=1;
assert.match(html(s),/Daily limit reached/);assert.match(html(s),/Bounces still count/);
s.days[0].verifiedSends=19;s.days[0].unresolvedSends=1;
assert.match(html(s),/Check Sent for unresolved/);
s.days[0].unresolvedSends=0;s.days[0].permanentFailures=2;
assert.match(html(s),/Repeated permanent failures/);
s.days[0].permanentFailures=0;s.undatedSends=1;
assert.match(html(s),/no usable date/);
s.undatedSends=0;
assert.match(outreachHTML(s,'2026-10-15T22:20:00Z',now+86400000),/Refresh the private register/);
assert.match(html(null),/No valid email summary/);
const bad=structuredClone(s);bad.days[0].verifiedSends=true;assert.equal(outreachSnapshot(bad),null);
const badDate=structuredClone(s);badDate.asOfLocalDate='2026-02-30';assert.equal(outreachSnapshot(badDate),null);
s.secret='private@example.org';s.days[0].messageUrl='https://mail.google.com/private';
assert.doesNotMatch(JSON.stringify(outreachSnapshot(s)),/secret|private|messageUrl/);
assert.doesNotMatch(html(s),/<button|mailto:|mail.google.com/);
assert.match(html(s),/not a live Gmail connection/);assert.match(html(s),/sending cohort/);

const uncapped=structuredClone(s);
uncapped.dailyLimit=null;
uncapped.days[0].verifiedSends=27;
uncapped.policyAuthorization={effectiveLocalDate:'2026-10-16',dailyLimit:null,providerLimitsApply:true,humanAuthorization:'PRIVATE QUOTE',authorizedAtUTC:'PRIVATE TIMESTAMP'};
const clean=outreachSnapshot(uncapped);
assert.equal(clean.dailyLimit,null);
assert.deepEqual(clean.policyAuthorization,{effectiveLocalDate:'2026-10-16',dailyLimit:null,providerLimitsApply:true});
assert.match(html(uncapped),/No internal daily cap/);
assert.match(html(uncapped),/Provider limits still apply/);
assert.match(html(uncapped),/Verified sends<\/dt><dd>27<\/dd>/);
assert.doesNotMatch(html(uncapped),/\/ 20|slots remain|Daily limit reached|PRIVATE/);
assert.doesNotMatch(JSON.stringify(clean),/humanAuthorization|authorizedAtUTC|PRIVATE|private@example/);
assert.doesNotMatch(html(uncapped),/<button|mailto:|mail.google.com/);

// Removing the internal cap must never remove reconciliation or quality stops.
for(const base of [s,uncapped]){
 const v=structuredClone(base);v.days[0].verifiedSends=27;v.days[0].permanentFailures=0;
 v.days[0].unresolvedSends=1;assert.match(html(v),/Check Sent for unresolved/);
 v.days[0].unresolvedSends=0;v.undatedSends=1;assert.match(html(v),/no usable date/);
 v.undatedSends=0;v.days[0].permanentFailures=2;assert.match(html(v),/Repeated permanent failures/);
 v.days[0].permanentFailures=0;
 assert.match(outreachHTML(v,'invalid',now),/Refresh the private register/);
 assert.match(outreachHTML(v,'2026-10-15T22:20:00Z',now+86400000),/Refresh the private register/);
}

// Unknown, absent or unverified policy data never implies unlimited capacity.
for(const value of [undefined,true,false,'20','unlimited',0,21]){
 const v=structuredClone(uncapped);v.dailyLimit=value;assert.equal(outreachSnapshot(v),null);
}
for(const missing of ['dailyLimit','policyAuthorization']){
 const v=structuredClone(uncapped);delete v[missing];assert.equal(outreachSnapshot(v),null);
}
for(const [key,value] of [['dailyLimit',20],['providerLimitsApply',false],['providerLimitsApply','true'],['effectiveLocalDate','2026-02-30'],['effectiveLocalDate','2026-10-17'],['effectiveLocalDate','0000-01-01']]){
 const v=structuredClone(uncapped);v.policyAuthorization[key]=value;assert.equal(outreachSnapshot(v),null);
}
for(const key of ['effectiveLocalDate','dailyLimit','providerLimitsApply']){
 const v=structuredClone(uncapped);delete v.policyAuthorization[key];assert.equal(outreachSnapshot(v),null);
}
console.log('Outreach summary: legacy cap, explicitly authorized uncapped policy, real counts, reconciliation/quality stops, privacy and no-send UI passed.');
