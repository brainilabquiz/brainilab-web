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
  if(status?.model?.version==='daily-choice-v1')return {href:'/daily-quiz/',label:status.games?.[status.model.primary]?.completed?'See today’s Daily':'Play the main Daily'};
  const id=(status?.dailyIds||[]).find(id=>id!=='brainmix'&&!status.games?.[id]?.completed);
  const meta=window.BrainiDailyJourney?.META?.[id];
  if(meta)return {href:'/'+meta.href+(meta.dailyQuery?'?daily='+new Date().toISOString().slice(0,10):''),label:'Play '+meta.name};
  return status?.completedCount>=4?{href:'/games/',label:'Find another game'}:{href:'/daily-quiz/',label:'Continue Daily'};
 }
 const guides={worldflags:{slug:'how-to-learn-world-flags',title:'Spot the clues in a flag'},generalknowledge:{slug:'why-2100-is-not-a-leap-year',title:'The leap-year rule with a twist'},mathrush:{slug:'multiply-by-11-in-your-head',title:'Try a mental-maths shortcut'}};
 const localHref=(href,fallback='/games/')=>typeof href==='string'&&/^\/(?!\/)/.test(href)&&!/[\\<>]/.test(href)?href:fallback;
 function mount(container,{result={},gameId='brainmix',name='Brain Mix',status=null,difficulty='',next=null,ads=false,focus=true,timed=false,metrics=[]}={}){
  if(!container)return;
  const correct=number(result.correct),total=number(result.total),points=number(result.score??result.points);
  const primary=next||(status?nextDaily(status):{href:'/games/',label:'Find another game'});
  const message=timed?(correct?'Time’s up. Here’s how your run went.':'Time’s up. Try another round at your own pace.'):total&&correct===total?'Every answer right. Nicely done.':correct===0?'A fresh set of things to discover.':correct>=total*.8?'Nicely done. Take a look at the ones that surprised you.':'A few familiar facts, a few new discoveries.';
  const guide=guides[gameId];
  const feedbackId=/^[a-z]{1,30}$/.test(gameId)?gameId:'';
  const stats=metrics.length?`<dl class="post-metrics">${metrics.slice(0,3).map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join('')}</dl>`:'';
  const practice=result.practice||result.tryFirst;
  const friendInvite=!practice&&status&&window.BrainiFriendChallenge?.buildInvite(status);
  container.innerHTML=`<section class="post-game" aria-label="Quiz result"><p class="post-kicker">${esc(name)}${difficulty?' · '+esc(difficulty):''} · ${practice?'Practice complete':'Complete'}</p><h2 tabindex="-1" class="post-score">${timed?correct:total?`${correct}<span> / ${total}</span>`:'Round complete'}</h2>${total||timed?'<p class="post-score-label">correct answers</p>':''}<p class="post-message">${message}</p><p class="post-points">${points.toLocaleString()} Quiz Points${Number.isFinite(result.timeSec)?' · '+Math.floor(result.timeSec/60)+':'+String(result.timeSec%60).padStart(2,'0'):''}</p>${stats}<div data-result-reward="${esc(practice?'':result.clientResultId||'')}">${window.BrainiContinuity?.rewardMarkup?.(result)||''}</div><div class="post-actions"><a class="post-primary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(primary.label)} →</a><button type="button" class="post-share">${friendInvite?'Challenge a friend':'Share result'}</button></div>${status?`<p class="post-daily">${status.model?.version==='daily-choice-v1'?(status.games?.[status.model.primary]?.completed?'Daily complete':'Daily in progress'):'Daily · '+number(status.completedCount)+' of 4 complete'} <a href="/daily-quiz/">See today’s games</a></p>`:''}${review(result.answerDetails)}${guide?`<a class="post-guide" data-post-action="guide" href="/learn/${guide.slug}/"><span>A little reading</span><strong>${esc(guide.title)} →</strong></a>`:''}<a class="post-browse" data-post-action="browse" href="/games/">Browse all games</a><p class="post-feedback"><a data-post-action="feedback" href="/suggestions/?context=post-game&amp;game=${esc(feedbackId)}">How was that game?</a></p>${ads?'<div class="brainilab-ad-slot brainilab-ad-slot-result" data-ad-slot="quiz_result" hidden></div>':''}</section>`;
  container.querySelector('.post-share').addEventListener('click',event=>friendInvite?window.BrainiFriendChallenge.open(status,event.currentTarget):window.BrainiShare?.open(gameId,result));
  if(focus)container.querySelector('.post-score').focus({preventScroll:true});
 }
 return {mount,review,nextDaily};
})();
