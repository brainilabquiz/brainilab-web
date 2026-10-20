/* A shared score target, never a saved result. No identities, answers or contacts in links. */
window.BrainiGameChallengeModel=(()=>{
 const games=Object.freeze({
  brainmix:{name:'Brain Mix',path:'/games/brain-mix/',max:10000,daily:true,n:10},
  brainiword:{name:'BrainiWord',path:'/games/brainiword/',max:2500,daily:true,n:1},
  orderup:{name:'Order Up',path:'/games/order-up/',max:2500,daily:true,n:20},
  topicrush:{name:'Topic Rush',path:'/games/topic-rush/',max:2500,daily:true,n:0},
  connections:{name:'Connections',path:'/games/connections/',max:20000,n:20},
  oddoneout:{name:'Odd One Out',path:'/games/odd-one-out/',max:1000,n:10},
  higherlower:{name:'Higher or Lower',path:'/games/higher-lower/',max:1700,n:10},
  mathrush:{name:'Math Rush',path:'/games/math-rush/',max:6000,n:60},
  numberroute:{name:'Number Route',path:'/games/number-route/',max:2500,n:10},
  sequence:{name:'Sequence',path:'/games/sequence/',max:2500,n:10},
  survival:{name:'Survival',path:'/games/survival/',max:12000,n:30},
  reasoning:{name:'Reasoning Challenge',path:'/reasoning/',max:12,n:12},
  worldflags:{name:'World Flags',path:'/geography/world-flags-quiz/',max:10000,quiz:true,n:20},
  worldcapitals:{name:'World Capitals',path:'/geography/world-capitals-quiz/',max:10000,quiz:true,n:20},
  generalknowledge:{name:'General Knowledge',path:'/general-knowledge/general-knowledge-quiz/',max:10000,quiz:true,n:20},
  science:{name:'Science',path:'/science/science-quiz/',max:10000,quiz:true,n:20},
  history:{name:'History',path:'/history/history-quiz/',max:10000,quiz:true,n:20},
  sports:{name:'Sports',path:'/sports/sports-quiz/',max:10000,quiz:true,n:20}
 });
 const today=()=>new Date().toISOString().slice(0,10);
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2026-08-29'&&v<=today()&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const integer=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
 const cleanPath=p=>p.replace(/index\.html$/,'').replace(/\/?$/,'/');
 const gameAt=p=>Object.keys(games).find(id=>games[id].path===cleanPath(p))||null;
 function hash(value){let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
 function valid(c){
  const g=games[c?.g];
  if(!g||![1,2].includes(c.v)||!integer(c.s,g.max)||!integer(c.n,60))return false;
  if(c.d!==null&&!date(c.d))return false;
  if(g.daily&&!c.d)return false;
  if(g.quiz?!['easy','medium','hard'].includes(c.l):c.l!==null)return false;
  const n=c.d&&['connections','numberroute'].includes(c.g)?3:g.n;
  if(n&&c.n!==n)return false;
  if(c.g==='topicrush'&&!(c.n>=1&&c.n<=60))return false;
  if(c.g==='connections'&&c.d&&c.s>3000)return false;
  return (c.k===null||typeof c.k==='string'&&/^[0-9a-f]{8}$/.test(c.k))&&(c.v===1||c.p===null||typeof c.p==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.p));
 }
 function describe(gameId,result={},options={}){
  const g=games[gameId];if(!g)return null;
  const s=Number(result.score??result.points);if(!integer(s,g.max))return null;
  const params=new URLSearchParams(location.search);
  const dailyNumber=result.archiveDailyNumber||result.dailyNumber;
  const rawDay=result.challengeDate||(dailyNumber&&window.BrainiData?.dateForDailyNumber?.(dailyNumber))||((g.daily||params.has('daily')||params.has('archive'))&&(params.get('archive')||params.get('daily')||today()));
  const d=rawDay&&date(rawDay)?rawDay:null;if(rawDay&&!d)return null;
  const n=d&&['connections','numberroute'].includes(gameId)?3:gameId==='topicrush'?Number(result.targetCount||result.total):g.n;
  if(!['survival','mathrush','topicrush'].includes(gameId)&&Number(result.total)!==n)return null;
  const l=g.quiz?(options.difficulty||result.difficulty||params.get('difficulty')||'easy'):null;
  const rows=gameId==='orderup'?result.orderUpRounds:gameId==='brainmix'||g.quiz?result.answerDetails:result.roundDetails;
  const ids=gameId==='mathrush'?[result.seed]:(rows||[]).map(r=>r.puzzleId||r.pairId||r.questionVersionId||r.questionId||r.round_id);
  const source=result.contentSource||result.dailyContentSource||'';
  const k=d?hash(JSON.stringify([source,ids.filter(Boolean),result.topicId||null,result.contentRef||null])):gameId==='reasoning'?hash(String(result.challengeVersion||'')):null;
  const c={v:2,g:gameId,s,d,l,n,k,p:window.BrainiReplay?.packId(gameId)||null};return valid(c)?c:null;
 }
 function parse(fragment=location.hash){
  const m=/^#friend=([A-Za-z0-9_-]{40,500})$/.exec(fragment);if(!m)return null;
  try{const c=JSON.parse(atob(m[1].replace(/-/g,'+').replace(/_/g,'/')));return valid(c)?{v:c.v,g:c.g,s:c.s,d:c.d,l:c.l,n:c.n,k:c.k,...(c.v===2?{p:c.p}:{})}:null;}catch{return null;}
 }
 function url(c){
  if(!valid(c)||c.v!==2||!c.p)return null;
  const u=new URL(games[c.g].path,'https://brainilabgames.com');u.searchParams.set('try','1');
  if(c.d)u.searchParams.set('archive',c.d);
  if(c.l)u.searchParams.set('difficulty',c.l);
  u.hash='friend='+btoa(JSON.stringify(c)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');return u.href;
 }
 function incoming(){
  const c=parse(),p=new URLSearchParams(location.search);
  if(!c||c.v===2&&!c.p||gameAt(location.pathname)!==c.g||p.get('try')!=='1')return null;
  if(c.d&&(p.get('archive')!==c.d||p.has('daily')))return null;
  if(!c.d&&(p.has('archive')||p.has('daily')))return null;
  if(c.l&&(p.get('difficulty')||'easy')!==c.l)return null;
  return c;
 }
 const points=s=>s.toLocaleString('en-GB')+' '+(s===1?'point':'points');
 const max=c=>c.g==='connections'&&c.d?3000:games[c.g].max;
 const rule=c=>c.v===1?'Ask your friend for a new invitation.':(c.l?c.l[0].toUpperCase()+c.l.slice(1)+' · ':'')+'Same questions. Same rules. Just for fun.';
 function compare(own,target){
  if(!valid(own)||!valid(target)||own.v!==2||target.v!==2||!own.p||own.p!==target.p||own.g!==target.g||own.d!==target.d||own.l!==target.l||own.n!==target.n)return null;
  const difference=own.s-target.s;
  return {kind:difference>0?'win':difference<0?'loss':'tie',title:difference>0?'You beat your friend!':difference<0?'Your friend wins this round.':'It’s a tie!',detail:difference?points(Math.abs(difference))+(difference>0?' ahead.':' behind. Fancy a rematch?'):points(own.s)+' each. Nicely matched.'};
 }
 function invitation(own,target=null){
  if(!valid(own)||!url(own))return null;
  const name=games[own.g].name,comparison=target&&compare(own,target);
  const opener=comparison?.kind==='win'?`I got ${points(own.s)} in ${name} — I beat your ${points(target.s)}! 😄 Your move!`:comparison?.kind==='tie'?`We both got ${points(own.s)} in ${name}! 😄 Fancy a rematch?`:comparison?.kind==='loss'?`You got me this time! I got ${points(own.s)} in ${name}, to your ${points(target.s)}. 😄 Fancy a rematch?`:`I got ${points(own.s)} in ${name}! 😄 ${own.s===max(own)?'Can you match that?':own.s?'Think you can beat me? Your turn!':'Fancy giving it a go? Your turn!'}`;
  return {url:url(own),title:'Your turn! '+name,text:opener+'\n'+rule(own)+'\n\n'+url(own)};
 }
 return {games,gameAt,describe,parse,url,incoming,points,rule,compare,invitation};
})();
