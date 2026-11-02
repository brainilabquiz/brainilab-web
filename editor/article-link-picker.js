import {esc,safeLink} from '../lib/learn-content.js';
import {catalogueMatches} from '../lib/article-discovery.js';
import {readyPaths} from '../lib/learning-model.js';

export function publishedCourseChoices(query,courses,articles,{topic=''}={}){
 const publishedArticles=(articles||[]).filter(r=>r.published_revision&&r.revision===r.published_revision).map(r=>r.document);
 const publishedCourses=(courses||[]).filter(r=>r.published_revision&&r.revision===r.published_revision&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)&&r.document?.slug===r.slug&&r.document?.title);
 const ready=new Set(readyPaths(publishedCourses.map(r=>r.document),publishedArticles).map(p=>p.slug));
 return catalogueMatches(query,publishedCourses,{topic,publishedOnly:true}).filter(r=>ready.has(r.slug)).map(r=>({name:r.document.title,url:'/learn/paths/'+r.slug+'/',detail:[r.document.topic,r.document.lessons.length+' lessons'].filter(Boolean).join(' · ')}));
}

export function validArticleLink(value){
 if(!safeLink(value)||/[\x00-\x20\\]/.test(value))return false;
 try{const u=new URL(value,'https://brainilabgames.com'),own=['brainilabgames.com','www.brainilabgames.com'].includes(u.hostname);return u.protocol==='https:'&&!u.username&&!u.password&&!(own&&(/^\/(?:admin|api|auth)(?:\/|$)/i.test(u.pathname)||(u.search&&!safeLink(u.pathname+u.search+u.hash))));}catch{return false;}
}
export function bindArticleLinkPicker({root,getArticle,getRows,getCourses=async()=>[],changed}){
 const document=root.ownerDocument,holder=document.createElement('div');holder.dataset.writingHelper='';
 holder.innerHTML=`<dialog class="article-link-dialog" id="article-link-dialog" aria-labelledby="article-link-heading"><form><header><h2 id="article-link-heading">Add a link</h2><button type="button" data-link-cancel aria-label="Close link editor">Close</button></header><label>Link text<input id="article-link-text" required maxlength="500"/></label><label>Choose from<select id="article-link-kind"><option value="website">Website address</option><option value="sources">Your sources</option><option value="learn">Learn articles</option><option value="academy">Academy courses</option></select></label><div id="article-link-search-panel" hidden><label>Find a source, article or course<input type="search" id="article-link-search" autocomplete="off"/></label><p id="article-link-count" class="article-help" role="status"></p><div id="article-link-results"></div><button type="button" id="article-link-more" hidden>Show more</button><button type="button" id="article-link-retry" hidden>Try loading courses again</button></div><label>Link address<input id="article-link-url" placeholder="https://… or /learn/…/" required/></label><p class="article-help">A link helps readers check a claim or explore a related idea. Listed sources still need an editorial check.</p><p id="article-link-error" role="alert"></p><footer><button type="button" data-link-cancel>Cancel</button><button type="submit" class="primary">Insert link</button></footer></form></dialog>`;
 root.querySelector('.article-editor').append(holder);
 const $=s=>holder.querySelector(s),dialog=$('dialog'),ranges=new WeakMap();let rich=null,range=null,cancelRange=null,committed=false,limit=8,courses=null,coursesLoading=false,coursesError=false;
 const remember=el=>{const selection=document.getSelection();if(selection?.rangeCount){const r=selection.getRangeAt(0);if(el.contains(r.commonAncestorContainer))ranges.set(el,r.cloneRange());}};
 const restore=(cancel=false)=>{if(!rich?.isConnected)return;rich.focus();const target=cancel?cancelRange:range;if(target&&rich.contains(target.commonAncestorContainer)){const s=document.getSelection();s.removeAllRanges();s.addRange(target);}};
 const render=()=>{
  const kind=$('#article-link-kind').value,query=$('#article-link-search').value.trim(),a=getArticle();
  $('#article-link-search-panel').hidden=kind==='website';if(kind==='website')return;
  $('#article-link-retry').hidden=kind!=='academy'||!coursesError;
  if(kind==='academy'&&(coursesLoading||coursesError||courses===null)){
   $('#article-link-count').textContent=coursesError?'Courses could not be loaded. Try again or use a website address.':'Loading published courses…';
   $('#article-link-results').replaceChildren();$('#article-link-more').hidden=true;return;
  }
  let results=kind==='sources'?(a.sources||[]).filter(s=>validArticleLink(s.url)&&s.name).filter(s=>(s.name+' '+s.url).toLowerCase().includes(query.toLowerCase())).map(s=>({name:s.name,url:s.url,detail:s.url})):kind==='academy'?publishedCourseChoices(query,courses,getRows(),{topic:a.topic}):catalogueMatches(query,getRows(),{excludeSlug:a.slug,topic:a.topic,publishedOnly:true}).map(r=>({name:r.document.title,url:'/learn/'+r.slug+'/',detail:r.document.topic}));
  $('#article-link-count').textContent=results.length?Math.min(limit,results.length)+' of '+results.length+' '+(kind==='sources'?'sources':kind==='academy'?'published courses':'published articles'):'No matches. '+(kind==='sources'?'Add a named source to this draft or use a website address.':kind==='academy'?'Only published courses and lessons without draft changes appear. Try another word or use a website address.':'Try another word or use a website address.');
  $('#article-link-results').innerHTML=results.slice(0,limit).map((r,i)=>`<button type="button" data-link-choice="${i}"><strong>${esc(r.name)}</strong><small>${esc(r.detail)}</small></button>`).join('');$('#article-link-more').hidden=results.length<=limit;
  holder.querySelectorAll('[data-link-choice]').forEach(b=>b.onclick=()=>{const r=results[Number(b.dataset.linkChoice)];$('#article-link-url').value=r.url;if(!$('#article-link-text').value.trim())$('#article-link-text').value=r.name;$('#article-link-error').textContent='';});
 };
 const loadCourses=async()=>{
  if(coursesLoading||courses!==null&&!coursesError)return;
  coursesLoading=true;coursesError=false;render();
  try{const result=await getCourses();if(!Array.isArray(result))throw Error('Invalid course list');courses=result;}
  catch{coursesError=true;}
  finally{coursesLoading=false;if(holder.isConnected&&dialog.open&&$('#article-link-kind').value==='academy')render();}
 };
 $('#article-link-kind').onchange=()=>{limit=8;$('#article-link-search').value='';render();if($('#article-link-kind').value==='academy')void loadCourses();};$('#article-link-search').oninput=()=>{limit=8;render();};$('#article-link-more').onclick=()=>{limit+=8;render();};$('#article-link-retry').onclick=()=>void loadCourses();
 holder.querySelectorAll('[data-link-cancel]').forEach(b=>b.onclick=()=>dialog.close());dialog.addEventListener('close',()=>{if(dialog.open)return;if(!committed)restore(true);else rich?.focus();});
 $('form').onsubmit=event=>{
  event.preventDefault();const url=$('#article-link-url').value.trim(),text=$('#article-link-text').value.trim();
  if(!text||!validArticleLink(url)){$('#article-link-error').textContent='Add readable link text and a safe HTTPS or public page address.';return;}
  if(!rich?.isConnected){dialog.close();return;}
  // A modal makes the article inert. Close it before restoring its editing range.
  committed=true;dialog.close();restore();let ok=false;
  // Existing formatting commands preserve the browser’s normal undo history.
  if(range&&!range.collapsed&&range.toString().trim()===text)ok=document.execCommand('createLink',false,url);
  else ok=document.execCommand('insertHTML',false,`<a href="${esc(url)}">${esc(text)}</a>`);
  if(!ok){committed=false;dialog.showModal();$('#article-link-error').textContent='The link could not be inserted. Close this panel, select the text and try again.';return;}
  changed(rich);
 };
 return{remember,open(el){
  rich=el;remember(el);range=ranges.get(el)?.cloneRange()||document.createRange();if(!ranges.has(el)){range.selectNodeContents(el);range.collapse(false);}
  cancelRange=range.cloneRange();const node=range.commonAncestorContainer,anchor=(node.nodeType===1?node:node.parentElement)?.closest('a'),editing=anchor&&el.contains(anchor);if(editing)range.selectNodeContents(anchor);
  committed=false;limit=8;$('#article-link-heading').textContent=editing?'Edit link':'Add a link';$('button[type=submit]').textContent=editing?'Update link':'Insert link';$('#article-link-text').value=range.toString();$('#article-link-url').value=editing?anchor.getAttribute('href'):'';$('#article-link-kind').value='website';$('#article-link-search').value='';$('#article-link-error').textContent='';render();dialog.showModal();$('#article-link-text').focus();
 }};
}
