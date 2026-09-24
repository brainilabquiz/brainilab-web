/* Shared, local result presentation. Scoring and result persistence stay with the game. */
window.BrainiPostGame=(()=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>Math.max(0,Number(value)||0);
 function review(answers=[]){
  if(!answers.length)return '';
  const rows=answers.map((a,i)=>({...a,position:a.position||i+1}));
  const missed=rows.filter(a=>!a.isCorrect),correct=rows.filter(a=>a.isCorrect);
  const items=list=>list.map(a=>`<article class="post-answer"><h4>${number(a.position)}. ${esc(a.questionText)}</h4><p class="post-answer-choice">${a.isCorrect?'Correct':a.skipped?'Skipped':'Your answer: '+esc(a.selectedAnswer||'No answer')}</p><p><strong>${esc(a.correctAnswer||'Answer unavailable')}</strong></p>${a.explanation?`<p>${esc(a.explanation)}</p>`:''}</article>`).join('');
  return `<div class="post-review">${missed.length?`<details><summary>Review ${missed.length} ${missed.length===1?'answer':'answers'} to revisit</summary>${items(missed)}</details>`:''}${correct.length?`<details><summary>${missed.length?'Your correct answers':'Review your answers'} · ${correct.length}</summary>${items(correct)}</details>`:''}</div>`;
 }
 function nextDaily(status){
  const id=(status?.dailyIds||[]).find(id=>id!=='brainmix'&&!status.games?.[id]?.completed);
  const meta=window.BrainiDailyJourney?.META?.[id];
  if(meta)return {href:'/'+meta.href+(meta.dailyQuery?'?daily='+new Date().toISOString().slice(0,10):''),label:'Play '+meta.name};
  return status?.completedCount>=4?{href:'/games/',label:'Find another game'}:{href:'/daily-quiz/',label:'Continue Daily'};
 }
 function mount(container,{result={},gameId='brainmix',name='Brain Mix',status=null,difficulty='',next=null,ads=false,focus=true}={}){
  if(!container)return;
  const correct=number(result.correct),total=number(result.total),points=number(result.score??result.points);
  const primary=next||(status?nextDaily(status):{href:'/games/',label:'Find another game'});
  const message=total&&correct===total?'Every answer right. Nicely done.':correct===0?'A fresh set of things to discover.':correct>=total*.8?'Nicely done. Take a look at the ones that surprised you.':'A few familiar facts, a few new discoveries.';
  container.innerHTML=`<section class="post-game" aria-label="Quiz result"><p class="post-kicker">${esc(name)}${difficulty?' · '+esc(difficulty):''} · Complete</p><h2 tabindex="-1" class="post-score">${total?`${correct}<span> / ${total}</span>`:'Round complete'}</h2>${total?'<p class="post-score-label">correct answers</p>':''}<p class="post-message">${message}</p><p class="post-points">${points.toLocaleString()} Quiz Points${Number.isFinite(result.timeSec)?' · '+Math.floor(result.timeSec/60)+':'+String(result.timeSec%60).padStart(2,'0'):''}</p>${review(result.answerDetails)}<div class="post-actions"><a class="post-primary" href="${esc(primary.href)}">${esc(primary.label)} →</a><button type="button" class="post-share">Share result</button></div>${status?`<p class="post-daily">Daily · ${number(status.completedCount)} of 4 complete <a href="/daily-quiz/">See today’s games</a></p>`:'<a class="post-browse" href="/games/">Browse all games</a>'}${ads?'<div class="brainilab-ad-slot brainilab-ad-slot-result" data-ad-slot="quiz_result" hidden></div>':''}</section>`;
  container.querySelector('.post-share').addEventListener('click',()=>window.BrainiShare?.open(gameId,result));
  if(focus)container.querySelector('.post-score').focus({preventScroll:true});
 }
 return {mount,review,nextDaily};
})();
