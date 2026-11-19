// Local proof completeness only. The management publisher separately checks
// the matching approval registered in its private database table.
export const opinionExceptionType='owner-opinion-exception';
export function validOpinionException(approval,document,documentSha256,releaseId,now=Date.now()){
 if(approval?.version!==1||approval.type!==opinionExceptionType||approval.approved!==true||
  approval.id!==releaseId||!approval.approvalText?.trim()||
  !Number.isFinite(Date.parse(approval.recordedAt))||Date.parse(approval.recordedAt)>now+300000||
  document?.articleKind!=='opinion'||!document.authorId||!/^[a-f0-9]{64}$/.test(documentSha256)||
  !Array.isArray(approval.entries)||!approval.entries.length||
  new Set(approval.entries.map(e=>e.slug)).size!==approval.entries.length)return false;
 return approval.entries.some(e=>e.slug===document.slug&&e.authorId===document.authorId&&e.documentSha256===documentSha256);
}
