// Editorial completeness checks, not a search-ranking score.
export function articleChecks(a){
 const text=html=>String(html||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').trim();
 const sections=Array.isArray(a.sections)?a.sections:[];
 return [
  {label:'Title and description',ok:!!(a.title?.trim()&&a.description?.trim())},
  {label:'Section headings and text',ok:!!sections.length&&sections.every(s=>s.title?.trim()&&text(s.html))},
  {label:'Cover, description and credit',ok:!!(a.cover?.src&&a.cover?.alt?.trim()&&a.cover?.credit?.trim())},
  {label:'Named sources',ok:!!a.sources?.length&&a.sources.every(s=>s.name?.trim()&&/^https:\/\//.test(s.url||''))},
  {label:'Related game and invitation',ok:!!(a.game?.name?.trim()&&/^\/(?!\/)/.test(a.game?.url||'')&&a.practice?.trim())}
 ];
}
