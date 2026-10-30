// Compare editable copy independently of server-managed publication metadata
// and JSON object-key order. Array order remains meaningful.
export function articleDraftSignature(document){
 const {status,publishedAt,updatedAt,...copy}=document;
 const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
 return JSON.stringify(ordered(copy));
}

export function acknowledgedArticle(previous,result,submitted,action){
 if(result?.slug!==submitted.slug||!Number.isSafeInteger(result.revision)||result.revision!==previous.revision+1||!result.document||result.document.slug!==submitted.slug){
  throw Error('The save response is incomplete. Keep this draft open and reload the saved version before trying again.');
 }
 return {...previous,slug:result.slug,revision:result.revision,document:structuredClone(result.document),published_revision:action==='publish'?result.revision:action==='unpublish'?null:previous.published_revision};
}
