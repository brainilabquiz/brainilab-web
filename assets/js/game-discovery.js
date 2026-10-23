/* Local catalogue search. Static game links remain available without JavaScript. */
document.addEventListener('DOMContentLoaded',()=>{
 const finder=document.querySelector('[data-game-finder]'),controls=document.querySelector('[data-game-filters]'),topics=document.querySelector('[data-game-topics]'),search=document.querySelector('[data-game-search]');
 if(!finder||!controls||!topics||!search)return;
 const cards=[...document.querySelectorAll('[data-anytime-game]')],count=document.querySelector('[data-game-filter-count]'),empty=document.querySelector('[data-game-empty]'),clear=document.querySelector('[data-game-clear]'),reset=document.querySelector('[data-game-reset]'),starters=document.querySelector('.game-starters');
 const options=[...topics.options];
 const normalise=value=>String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
 const aliases={numbers:'math maths mathematics arithmetic',words:'word words puzzle logic'};
 const haystacks=new Map(cards.map(card=>[card,normalise([card.querySelector('.anytime-game-head')?.textContent||'',options.find(option=>option.value===card.dataset.gameTopic)?.textContent||'',aliases[card.dataset.gameTopic]||''].join(' '))]));
 let type='all',topic='all',query='';
 const inType=card=>type==='all'||card.dataset.gameKind===type;
 function apply(){
  if(!['all','games','quizzes'].includes(type))type='all';
  const available=new Set(cards.filter(inType).map(card=>card.dataset.gameTopic));
  if(topic!=='all'&&!available.has(topic))topic='all';
  const tokens=normalise(query).split(' ').filter(Boolean);
  cards.forEach(card=>card.hidden=!inType(card)||(topic!=='all'&&card.dataset.gameTopic!==topic)||!tokens.every(token=>haystacks.get(card).includes(token)));
  controls.querySelectorAll('[data-game-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gameFilter===type)));
  options.forEach(option=>{option.hidden=option.value!=='all'&&!available.has(option.value);option.disabled=option.hidden;});
  topics.value=topic;search.value=query;clear.hidden=!query;
  const visible=cards.filter(card=>!card.hidden),games=visible.filter(card=>card.dataset.gameKind==='games').length,quizzes=visible.length-games;
  if(starters)starters.hidden=type!=='all'||topic!=='all'||!!normalise(query);
  if(empty)empty.hidden=visible.length!==0;
  count.hidden=false;count.textContent=[games?games+' '+(games===1?'game':'games'):'',quizzes?quizzes+' '+(quizzes===1?'quiz':'quizzes'):''].filter(Boolean).join(' · ')||'0 results';
 }
 function write(mode){
  const url=new URL(location.href);
  for(const [key,value] of [['type',type],['topic',topic],['q',query.trim()]]){if((value==='all'&&key!=='q')||!value)url.searchParams.delete(key);else url.searchParams.set(key,value);}
  if(url.href!==location.href)try{history[mode==='push'?'pushState':'replaceState'](history.state,'',url);}catch{}
 }
 function announce(){window.dispatchEvent(new CustomEvent('brainilab:discovery',{detail:{type,topic}}));}
 function read(){const params=new URLSearchParams(location.search);type=params.getAll('type').length===1?params.get('type'):'all';topic=params.getAll('topic').length===1?params.get('topic'):'all';query=params.getAll('q').length===1?params.get('q').slice(0,80):'';if(['words','numbers'].includes(type)){topic=type;type='games';}apply();}
 controls.addEventListener('click',e=>{const b=e.target.closest('[data-game-filter]');if(b){type=b.dataset.gameFilter;topic='all';apply();write('push');announce();}});
 topics.addEventListener('change',()=>{topic=topics.value;apply();write('push');announce();});
 search.addEventListener('input',()=>{query=search.value.slice(0,80);apply();write('replace');});
 const clearSearch=()=>{query='';apply();write('replace');search.focus();};
 clear.addEventListener('click',clearSearch);
 search.addEventListener('keydown',e=>{if(e.key==='Escape'&&query){e.preventDefault();clearSearch();}});
 reset?.addEventListener('click',()=>{type=topic='all';query='';apply();write('push');search.focus();});
 window.addEventListener('popstate',read);window.addEventListener('pageshow',read);
 read();finder.hidden=false;
});
