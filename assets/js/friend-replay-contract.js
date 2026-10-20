/* Public content only: a stable contract for the exact questions and their displayed order. */
window.BrainiReplayContract=(()=>{
 const quizzes=new Set(['brainmix','worldflags','worldcapitals','generalknowledge','science','history','sports']);
 const quizLike=g=>quizzes.has(g)||g==='survival';
 const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');};
 const quizKey=q=>'q:'+hash(q.q+'\0'+q.a.join('\0'));
 const family=g=>quizzes.has(g)?'quiz':g;
 const clean=v=>JSON.parse(JSON.stringify(v));
 function project(g,p){
  if(quizLike(g))return (p.questions||[]).map(q=>({id:String(q.questionVersionId||q.id||quizKey(q)),q:q.q,a:q.a,options:q.optionIds||null,...(p.source==='local'?{answer:q.c}:{}),...(g==='survival'?{difficulty:q.difficulty,topic:q.topic}: {})}));
  if(g==='connections')return p.rounds.map(q=>({id:String(q.id),prompt:q.prompt||'What connects these?',clues:q.clues,choices:q.choices.map(c=>({id:String(c.id),text:c.text})),...(p.source==='local'?{answer:q.correct}: {})}));
  if(g==='sequence')return p.rounds.map(q=>({id:String(q.id),sequence:q.sequence,options:q.options,...(p.source==='local'?{answer:q.answer}: {})}));
  if(g==='oddoneout')return p.rounds.map(q=>({id:String(q.id),prompt:q.prompt||'Which one does not belong?',items:q.items,...(p.source==='local'?{answer:q.odd}: {})}));
  if(g==='higherlower')return p.rounds.map(q=>({id:String(q.id),type:q.type||q.comparisonType||'higher_lower',metric:q.metric,left:q.left,leftValue:q.leftValue,right:q.right,unit:q.unit||'',...(p.source==='local'?{answer:q.rightValue}: {})}));
  if(g==='numberroute')return p.rounds.map(q=>({id:String(q.id),numbers:q.numbers,target:q.target,...(p.source==='local'?{answer:q.solution}: {})}));
  if(g==='mathrush')return {seed:p.seed,operations:p.operations.map(q=>({position:q.position,a:q.a,b:q.b,op:q.op,display:q.display}))};
  if(g==='orderup')return p.rounds.map(q=>({id:String(q.roundId),title:q.title,prompt:q.prompt,directionLabel:q.directionLabel,items:q.items,...(p.source==='local'?{answer:q.canonicalItems}: {})}));
  if(g==='topicrush')return {id:String(p.topicId),title:p.title,prompt:p.prompt,targetCount:p.targetCount,durationSeconds:p.durationSeconds,...(p.source==='local'?{answer:p.localAnswers}: {})};
  if(g==='brainiword')return {id:String(p.contentRef||'word:'+hash(p.fallbackAnswer)),letters:p.letters,attempts:p.attempts,...(p.source==='local'?{answer:p.fallbackAnswer}: {})};
  if(g==='reasoning')return p.questions;
  throw Error('Unsupported game');
 }
 const canonical=value=>JSON.stringify((function sort(v){return Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;})(value));
 function spec(g,p,settings=null){
  const source=p.source==='supabase'?'supabase':'local',rows=quizLike(g)?p.questions:g==='orderup'?p.rounds:g==='reasoning'?p.questions:p.rounds||[];
  const ids=rows.map(q=>String(quizLike(g)?q.questionVersionId||q.id||quizKey(q):g==='orderup'?q.roundId:q.id));
  const choices=rows.map(q=>quizLike(g)?q.optionIds||[]:g==='connections'?q.choices.map(c=>c.id):g==='sequence'?q.options:g==='orderup'?q.items.map(c=>c.itemId):[]);
  const keys=['dailyChallengeId','challengeDate','dailyNumber','generationVersion','totalQuestions','topicKey','topicSlug','topicId','difficulty','setNumber','version','selectionMode','totalRounds','itemsPerRound'];
  const meta=Object.fromEntries(keys.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));
  settings=settings||p.friendSettings||{date:p.challengeDate||null,difficulty:quizzes.has(g)&&g!=='brainmix'?p.difficulty||'easy':null,rounds:({brainmix:10,brainiword:1,orderup:20,topicrush:p.targetCount,mathrush:60,survival:30,reasoning:12,connections:20}[g]|| (quizzes.has(g)?20:10))};
  return {source,ids,choices,seed:p.seed||null,topicId:p.topicId||null,wordId:p.contentRef||p.fallbackAnswer&&'word:'+hash(p.fallbackAnswer)||null,meta,settings};
 }
 return {quizzes,family,hash,quizKey,project,canonical,spec,clean};
})();
