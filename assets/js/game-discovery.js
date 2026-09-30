/* A small, shareable filter over the existing catalogue; every card stays in HTML. */
document.addEventListener('DOMContentLoaded',()=>{
 const controls=document.querySelector('[data-game-filters]');
 if(!controls)return;
 const groups={all:null,quizzes:['brainmix','orderup','topicrush','generalknowledge','survival','higherlower','worldflags','worldcapitals','science','history','sports'],words:['brainiword','connections','oddoneout'],numbers:['mathrush','numberroute','sequence']};
 const cards=[...document.querySelectorAll('[data-anytime-game]')];
 const count=document.querySelector('[data-game-filter-count]');
 function apply(type,update=false){
  if(!Object.hasOwn(groups,type))type='all';
  let visible=0;
  cards.forEach(card=>{card.hidden=!!groups[type]&&!groups[type].includes(card.dataset.anytimeGame);if(!card.hidden)visible++;});
  controls.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gameFilter===type)));
  if(count){count.hidden=false;count.textContent=`${visible} ${visible===1?'game':'games'}`;}
  if(update){
   const url=new URL(location.href);if(type==='all')url.searchParams.delete('type');else url.searchParams.set('type',type);
   // A filter is a view, not a new page or a new history entry.
   try{history.replaceState(history.state,'',url);}catch{}
   window.dispatchEvent(new CustomEvent('brainilab:discovery',{detail:{type}}));
  }
 }
 controls.hidden=false;
 const read=()=>{const q=new URLSearchParams(location.search);apply(q.getAll('type').length===1?q.get('type'):'all');};
 controls.addEventListener('click',event=>{const button=event.target.closest('button[data-game-filter]');if(button)apply(button.dataset.gameFilter,true);});
 window.addEventListener('popstate',read);read();
});
