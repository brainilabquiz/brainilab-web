// Local proof completeness only. The management publisher separately checks
// the matching approval registered in its private database table.
export const opinionExceptionType='owner-opinion-exception';
export const firstPartyExceptionType='owner-first-party-exception';
export const firstPartyReleaseId='own-data-hub-refresh-2026-11-22';
export function validFirstPartyException(approval,document,documentSha256,releaseId,now=Date.now()){
 if(approval?.version!==1||approval.type!==firstPartyExceptionType||approval.approved!==true||
  releaseId!==firstPartyReleaseId||approval.id!==releaseId||!approval.approvalText?.trim()||
  !Number.isFinite(Date.parse(approval.recordedAt))||Date.parse(approval.recordedAt)>now+300000||
  now-Date.parse(approval.recordedAt)>86400000||document?.slug!=='brainilab-quiz-data'||
  document.authorId!=='biel-sarda'||document.articleKind==='opinion'||
  document.publishedAt!=='2026-11-10T17:50:55.861352+00:00'||
  !/^[a-f0-9]{64}$/.test(documentSha256)||!Array.isArray(approval.entries)||approval.entries.length!==1)return false;
 const e=approval.entries[0];
 return e.slug===document.slug&&e.authorId===document.authorId&&e.documentSha256===documentSha256&&
  e.expectedRevision===3&&e.expectedPublishedRevision===3;
}
export function validOwnerDemandException(...args){return validOpinionException(...args)||validFirstPartyException(...args);}
export function validOpinionException(approval,document,documentSha256,releaseId,now=Date.now()){
 if(approval?.version!==1||approval.type!==opinionExceptionType||approval.approved!==true||
  approval.id!==releaseId||!approval.approvalText?.trim()||
  !Number.isFinite(Date.parse(approval.recordedAt))||Date.parse(approval.recordedAt)>now+300000||
  document?.articleKind!=='opinion'||!document.authorId||!/^[a-f0-9]{64}$/.test(documentSha256)||
  !Array.isArray(approval.entries)||!approval.entries.length||
  new Set(approval.entries.map(e=>e.slug)).size!==approval.entries.length)return false;
 return approval.entries.some(e=>e.slug===document.slug&&e.authorId===document.authorId&&e.documentSha256===documentSha256);
}
