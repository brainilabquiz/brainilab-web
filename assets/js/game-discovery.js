/* Separate format and topic filters. All cards stay in crawlable HTML. */
document.addEventListener('DOMContentLoaded',()=>{
 const controls=document.querySelector('[data-game-filters]'),topics=document.querySelector('[data-game-topics]');
 if(!controls||!topics)return;
 const cards=[...document.querySelectorAll('[data-anytime-game]')],count=document.querySelector('[data-game-filter-count]');
 const topicButtons=[...topics.querySelectorAll('[data-game-topic]')];
 let type='all',topic='all';
 const inType=card=>type==='all'||card.dataset.gameKind===type;
 function apply(update=false){
  if(!['all','games','quizzes'].includes(type))type='all';
  const available=new Set(cards.filter(inType).map(card=>card.dataset.gameTopic));
  if(topic!=='all'&&!available.has(topic))topic='all';
  cards.forEach(card=>card.hidden=!inType(card)||(topic!=='all'&&card.dataset.gameTopic!==topic));
  controls.querySelectorAll('[data-game-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gameFilter===type)));
  topicButtons.forEach(b=>{b.hidden=b.dataset.gameTopic!=='all'&&!available.has(b.dataset.gameTopic);b.setAttribute('aria-pressed',String(b.dataset.gameTopic===topic));});
  const visible=cards.filter(card=>!card.hidden),games=visible.filter(card=>card.dataset.gameKind==='games').length,quizzes=visible.length-games;
  const starters=document.querySelector('.game-starters');if(starters)starters.hidden=type!=='all'||topic!=='all';
  count.hidden=false;count.textContent=[games?games+' '+(games===1?'game':'games'):'',quizzes?quizzes+' '+(quizzes===1?'quiz':'quizzes'):''].filter(Boolean).join(' · ')||'Nothing here yet. Try another topic.';
  if(update){
   const url=new URL(location.href);for(const [key,value] of [['type',type],['topic',topic]]){if(value==='all')url.searchParams.delete(key);else url.searchParams.set(key,value);}
   try{history.replaceState(history.state,'',url);}catch{}
   window.dispatchEvent(new CustomEvent('brainilab:discovery',{detail:{type,topic}}));
  }
 }
 function read(){const q=new URLSearchParams(location.search);type=q.getAll('type').length===1?q.get('type'):'all';topic=q.getAll('topic').length===1?q.get('topic'):'all';if(['words','numbers'].includes(type)){topic=type;type='games';}apply();}
 controls.hidden=false;topics.hidden=false;
 controls.addEventListener('click',e=>{const b=e.target.closest('[data-game-filter]');if(b){type=b.dataset.gameFilter;topic='all';apply(true);}});
 topics.addEventListener('click',e=>{const b=e.target.closest('[data-game-topic]');if(b){topic=b.dataset.gameTopic;apply(true);}});
 window.addEventListener('popstate',read);read();
});
