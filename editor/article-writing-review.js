import {esc} from '../lib/learn-content.js';

// Review controls never rewrite the draft or insert markup into its body.
export function writingReviewMarkup(review,checks){
 const targets=['article-title','article-add-section','article-cover-url','article-add-source','article-game-pick'];
 const required=checks.map((c,i)=>({message:c.label,field:targets[i],complete:c.ok}));
 required.push(...review.problems.filter(p=>!['title','description','section-content','source','sources','cover'].includes(p.code)));
 const missing=required.filter(x=>!x.complete).length,issues=[];
 const item=p=>{const index=issues.push(p)-1;return `<li class="${p.complete?'is-complete':'needs-review'}"><span aria-hidden="true">${p.complete?'✓':'○'}</span><div><button type="button" data-check-issue="${index}" data-check-target="${esc(p.field)}">${esc(p.message)}</button>${p.excerpt?`<q class="article-review-excerpt">${esc(p.excerpt)}</q>`:''}</div></li>`;};
 const warnings=review.warnings;
 return{issues,html:`<summary>Before publishing <span>${missing?missing+' to complete':'Required fields complete'}</span></summary><ul>${required.map(item).join('')}</ul>${warnings.length?`<h3>Writing suggestions <small>${warnings.length}</small></h3><ul>${warnings.slice(0,3).map(item).join('')}</ul>${warnings.length>3?`<details data-more-suggestions><summary>Show ${warnings.length-3} more</summary><ul>${warnings.slice(3).map(item).join('')}</ul></details>`:''}`:'<p class="article-help">No writing suggestions for this draft.</p>'}<p class="article-help">Click a suggestion to find its text. Suggestions are optional; check the facts, sources and both preview sizes before publishing.</p>`};
}

export function focusWritingIssue(root,issue,reveal,focusField){
 if(!issue)return;
 if(!issue.excerpt||issue.sectionIndex===undefined){focusField(issue.field);return;}
 reveal();
 const rich=root.querySelectorAll('[data-section]')[issue.sectionIndex]?.querySelector('[data-rich]');
 if(!rich){focusField(issue.field);return;}
 const document=root.ownerDocument,walker=document.createTreeWalker(rich,4),map=[];let text='',node;
 while((node=walker.nextNode()))for(let i=0;i<node.data.length;i++){
  const value=node.data[i];
  if(/\s/.test(value)){if(!text||text.endsWith(' '))continue;text+=' ';}
  else text+=value;
  map.push({node,offset:i});
 }
 const excerpt=issue.excerpt.replace(/\s+/g,' ').trim(),start=text.indexOf(excerpt);
 rich.focus();
 if(start>=0&&excerpt.length){
  const from=map[start],to=map[start+excerpt.length-1];
  if(from&&to){const range=document.createRange();range.setStart(from.node,from.offset);range.setEnd(to.node,to.offset+1);const selection=document.getSelection();selection?.removeAllRanges();selection?.addRange(range);}
 }
 rich.scrollIntoView?.({block:'center',behavior:'auto'});
}
