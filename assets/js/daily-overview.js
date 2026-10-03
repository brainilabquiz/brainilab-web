/* Daily discovery. Rules and saved results remain in the shared Daily contract. */
window.BrainiDailyOverview=(function(){
  let revision=0,fragmentHandled=false;
  function revealExtra(){
    if(location.hash!=='#daily-extras'){fragmentHandled=false;return;}
    const target=document.getElementById('daily-extras');
    if(fragmentHandled||!target)return;
    fragmentHandled=true;target.tabIndex=-1;
    target.focus({preventScroll:true});target.scrollIntoView?.({block:'start',behavior:'instant'});
  }
  const descriptions={brainmix:'Ten questions. A little bit of everything.',orderup:'Put the clues in order, one list at a time.',topicrush:'One topic. How many answers can you find?',connections:'Look for the link hiding between the clues.',oddoneout:'Four possibilities. Which one does not belong?',higherlower:'Compare two facts. Trust your instincts, then find out.',mathrush:'Quick sums, small numbers, one minute on the clock.',numberroute:'Four numbers. Find a way to reach the target.',sequence:'Spot the pattern and find the missing number.',brainiword:'Five letters. Five tries. One word to discover.'};
  const points=n=>Math.max(0,Number(n)||0).toLocaleString('en-GB');
  function decorateJourney(container,status){
    const choice=status.model?.version==='daily-choice-v1';
    const ids=choice?[status.model.primary,...status.model.choices]:(status.dailyIds||BrainiData.dailyGameIdsForNumber?.(status.dailyNumber)||['brainmix','orderup','topicrush','brainiword']);
    const cards=[...container.querySelectorAll(choice?'.daily-choice-card':'.daily-journey-card-v2')];
    cards.forEach((card,i)=>{
      const id=ids[i],meta=BrainiDailyJourney.META[id];if(!meta)return;
      card.dataset.dailyGame=id;
      const copy=choice?card.querySelector('.daily-choice-role').parentElement:card.querySelector('.daily-journey-copy');
      if(!choice){const old=copy.querySelector('strong'),heading=document.createElement('h3');heading.textContent=old.textContent;old.replaceWith(heading);}
      const description=document.createElement('p');description.className='daily-game-description';description.textContent=descriptions[id]||'A fresh challenge to explore today.';
      copy.querySelector('h3').after(description);
      card.querySelectorAll('a').forEach(a=>a.setAttribute('aria-label',a.textContent.trim()+' · '+meta.name));
    });
    const oldHeading=container.querySelector('.daily-journey-head h3');
    if(oldHeading){const h2=document.createElement('h2');h2.textContent=status.completedCount===4?'All four, nicely done.':'Pick a challenge';oldHeading.replaceWith(h2);}
    const extraHeading=container.querySelector('.daily-choice-extra-heading h3');
    if(extraHeading){const h2=document.createElement('h2');h2.textContent=extraHeading.textContent;extraHeading.replaceWith(h2);}
    if(choice){const heading=document.createElement('h2');heading.className='daily-main-heading';heading.textContent='Your main challenge';container.querySelector('.daily-choice-heading').after(heading);}
  }
  function rules(choice){return choice?'<p>Finish the main Daily for up to <strong>2,500 ranking points</strong> and <strong>250 completion XP</strong>. It is the only game needed for your streak.</p><p>Afterwards, choose one of two extras for up to <strong>1,000 more points</strong>. Opening an extra fixes your choice for today.</p>':'<p>Today has four challenges, worth up to <strong>2,500 points each</strong>. Your Daily Brain Score adds them together, up to 10,000.</p><p>Finish all four for the <strong>250 XP Full Daily bonus</strong>. Your first three verified games of each kind per UTC day earn game XP.</p>';}
  function guide(choice){
    const el=document.querySelector('[data-daily-guide]');if(!el)return;
    el.innerHTML='<h2>A quick guide to the Daily</h2><div class="daily-faqs"><details><summary>What counts towards my Daily score?</summary>'+rules(choice)+'<p>Account XP and ranking points are different totals.</p></details><details><summary>Can I practise first?</summary><p>Yes. Use Try first when it is offered, or explore the games library. Rounds marked as practice do not change your Daily score, streak, XP or rankings.</p><p><a href="/learn/daily-or-anytime/">Daily and Anytime, explained →</a></p></details><details><summary>When does a new Daily arrive?</summary><p>Every day at 00:00 UTC. Everyone gets the same daily selection. Finished results stay locked for that day.</p></details></div>';
  }
  async function render(){
    const root=document.querySelector('[data-daily-overview]');if(!root)return;
    const request=++revision;root.setAttribute('aria-busy','true');
    try{
      const status=await BrainiDailyHub.resolve(undefined,{forceCloud:true});if(request!==revision)return;
      const choice=status.model?.version==='daily-choice-v1',primaryDone=choice&&!!status.games[status.model.primary]?.completed,done=choice?primaryDone:status.completedCount===4;
      const day=BrainiData.dateForDailyNumber?.(status.dailyNumber)||BrainiData.todayKey();
      const date=new Date(day+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'long',timeZone:'UTC'});
      const progress=choice?(primaryDone?'Daily complete':'Ready when you are'):(Number(status.completedCount)||0)+' of 4 complete';
      const title=done?'That’s today’s Daily done.':'Your daily brain break.';
      const intro=done?'Your result is saved. Stay for another game, or come back for tomorrow’s challenge.':choice?'One fresh challenge for your streak. An optional extra when you fancy more.':'Four fresh puzzles. Pick one, get curious, and see what you discover.';
      root.innerHTML='<header class="daily-discovery-header"><div><p class="daily-date">Daily #'+Number(status.dailyNumber)+' <span>·</span> <time datetime="'+day+'">'+date+'</time></p><h1>'+title+'</h1><p class="daily-intro">'+intro+'</p></div><a class="daily-progress-link" href="/profile/?section=progress">My progress ↗</a></header><div class="daily-dashboard"><div class="daily-play-panel" id="todays-games"><div data-daily-journey-hub></div></div><aside class="daily-side" aria-label="Your Daily progress"><section class="daily-score-summary"><h2>Your day so far</h2><p class="daily-score-value"><strong>'+points(status.brainScore)+'</strong><span> / '+points(choice?status.model.maxScore:10000)+'</span></p><p>Daily ranking points</p><p class="daily-completion '+(done?'is-complete':'')+'">'+(done?'✓ ':'')+progress+'</p><a href="/rankings/">View rankings →</a></section><div data-braini-continuity>'+(window.BrainiContinuity?.markup?.()||'')+'</div><details class="daily-points-guide"><summary>How points and XP work</summary>'+rules(choice)+'<p>New challenges arrive at 00:00 UTC.</p></details></aside></div>';
      await BrainiDailyJourney.render(root.querySelector('[data-daily-journey-hub]'),{status});if(request!==revision)return;
      decorateJourney(root,status);guide(choice);revealExtra();
    }catch(err){
      if(request!==revision)return;console.error('Daily overview:',err);
      root.innerHTML='<section class="daily-load-error"><h1>A small pause in today’s play.</h1><p>We could not load the Daily. Check your connection and try again.</p><button type="button" data-daily-retry>Try again</button><a href="/games/">Explore the games</a></section>';
      root.querySelector('[data-daily-retry]').addEventListener('click',render);
    }finally{if(request===revision)root.removeAttribute('aria-busy');}
  }
  document.addEventListener('DOMContentLoaded',render);
  window.addEventListener('hashchange',()=>{fragmentHandled=false;revealExtra();});
  for(const event of ['brainilab:datachange','brainilab:progressionchange','brainilab:daychange'])window.addEventListener(event,render);
  return {render};
})();
