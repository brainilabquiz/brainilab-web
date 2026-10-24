/* Home: load the Daily in advance, but start timing only after an explicit click. */
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("homeQuiz");
  const stage = root?.querySelector(".challenge-inner");
  const template = document.getElementById("homeQuizTemplate");
  if (!stage || !template) return;
  let playing=false;
  let modernRequest=0,modernContext='',modernPaintedContext='',lastMarkup='';
  const currentOwner=()=>{const auth=window.BrainiData?.authState?.()||window.BrainiData?.getState?.()?.auth;return auth?.user?.id||auth?.guestUserId||'guest';};
  function paintModern(markup){
    if(lastMarkup===markup)return;
    const focused=document.activeElement,inside=stage.contains?.(focused),action=inside?focused?.dataset?.homeAction:null;
    stage.innerHTML=markup;lastMarkup=markup;
    if(inside)(stage.querySelector(`[data-home-action="${action==='games'?'games':'daily'}"]`))?.focus({preventScroll:true});
  }
  const dailyDescriptions={brainmix:'Ten questions. A little of everything. What will surprise you?',brainiword:'Five letters, five tries. Follow the clues to the word.',orderup:'Put the clues in order. Which one belongs first?',topicrush:'One topic, a ticking clock. How many answers can you find?',connections:'Different clues, one hidden link. Can you see it?',oddoneout:'Four possibilities. Find the one that does not belong.',higherlower:'Trust your knowledge: is the next answer higher or lower?',mathrush:'A minute of mental maths. How far can you go?',numberroute:'Four numbers, one target. Find a route between them.',sequence:'Look at the gaps. What comes next?'};
  async function modernEntry(){
    const request=++modernRequest,owner=currentOwner();
    const day=BrainiData.todayKey(),ids=BrainiDailyRules.lineup(day),meta=BrainiDailyJourney.META[ids[0]];
    const href=BrainiDailyJourney.gameHref(ids[0],day);
    const context=day+':'+owner;
    const start=`${BrainiIcons.game(ids[0],"standard","home-daily-icon","")}<span class="challenge-pill">Today’s Daily</span><h2>${meta.name}</h2><p>${dailyDescriptions[ids[0]]}</p><div class="home-start-actions"><a class="btn" data-home-action="daily" href="${href}">Play today’s Daily</a><a class="btn-light" data-home-action="games" href="/games/">Explore all games</a></div><p class="home-ready">Up to 2,500 points · No account needed</p>`;
    const current=()=>request===modernRequest&&day===BrainiData.todayKey()&&owner===currentOwner()&&stage.isConnected;
    const reveal=markup=>{
      if(!current())return;
      paintModern(markup);modernPaintedContext=context;
      root.removeAttribute('data-home-loading');root.setAttribute('aria-busy','false');
    };
    if(context!==modernContext){
      // Never leave another account's or yesterday's completed result in the DOM.
      // Reads for the same account/day retain their confirmed UI and focus.
      if(modernContext){paintModern('');modernPaintedContext='';}
      modernContext=context;
      root.setAttribute('data-home-loading','');root.setAttribute('aria-busy','true');
    }
    // An unchecked result is neither a new game nor a completed game. Keep the
    // neutral first paint until the existing progress service has answered.
    const fallback=`${BrainiIcons.game(ids[0],"standard","home-daily-icon","")}<span class="challenge-pill">Today’s Daily</span><h2>${meta.name}</h2><p>${dailyDescriptions[ids[0]]}</p><div class="home-start-actions"><a class="btn" data-home-action="daily" href="/daily-quiz/">Open today’s Daily</a><a class="btn-light" data-home-action="games" href="/games/">Explore all games</a></div>`;
    const timer=setTimeout(()=>{if(modernPaintedContext!==context)reveal(fallback);},8000);
    try{const status=await BrainiDailyHub.resolve(undefined,{forceCloud:true});
      reveal(status?.games?.[ids[0]]?.completed?`<span class="challenge-pill">Daily complete ✓</span><h2>Nicely done.</h2><p>${Number(status.games[ids[0]].points).toLocaleString()} points in today’s ${meta.name}.</p><div class="home-start-actions"><a class="btn" data-home-action="daily" href="/daily-quiz/">${status.bonusChoice?'See today’s progress':'Fancy an extra?'}</a><a class="btn-light" data-home-action="games" href="/games/">Explore all games</a></div>`:start);
    }catch(error){
      if(modernPaintedContext!==context)reveal(fallback);
      console.warn('Daily status unavailable',error);
    }finally{clearTimeout(timer);}
  }
  window.addEventListener('brainilab:daychange',()=>{if(!playing&&window.BrainiDailyRules?.active())modernEntry();});
  for(const event of ['brainilab:authchange','brainilab:progressionchange'])window.addEventListener(event,()=>{if(!playing&&window.BrainiDailyRules?.active())modernEntry();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!playing&&window.BrainiDailyRules?.active())modernEntry();});
  if(window.BrainiDailyRules?.active()){
    await modernEntry();
    return;
  }
  let timeout;
  try {
    const [daily, previousStatus] = await Promise.race([
      (async () => {
        const daily = await BrainiDaily.loadToday();
        if (!BrainiDaily.validDaily(daily)) throw new Error("Daily payload is not playable.");
        const status = await BrainiDailyHub.resolve(daily.dailyNumber, {forceCloud:true});
        return [daily, status];
      })(),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Daily loading timed out.")), 12000);
      })
    ]);
    clearTimeout(timeout);
    // Runtime availability controls may have replaced this stage while loading.
    if (!stage.isConnected) return;
    root.dataset.contentSource = daily.source;
    root.dataset.challengeNumber = daily.dailyNumber;
    if (previousStatus.games.brainmix.completed) {
      await BrainiHomeDaily.render(stage, previousStatus, {compact:true});
      root.removeAttribute('data-home-loading');
      root.setAttribute('aria-busy','false');
      return;
    }
    const questions = daily.questions;
    const usingCloud = daily.source === "supabase";
    const button = stage.querySelector("[data-home-start]");
    button.textContent = "Start today’s quiz";
    button.disabled = false;
    root.removeAttribute('data-home-loading');
    root.setAttribute('aria-busy','false');
    button.addEventListener("click", () => {
      if(daily.dailyNumber!==BrainiData.daily().number){location.href='/daily-quiz/';return;}
      playing=true;
      stage.replaceChildren(template.content.cloneNode(true));
      stage.querySelector("[data-home-title]").textContent = `Daily Brain Challenge · #${daily.dailyNumber}`;
    BrainiQuiz.mount(root,questions,{
      gameId:"brainmix",
      dailyNumber:daily.dailyNumber,
      checkAnswer:usingCloud
        ? (item,choice,context)=>BrainiContent.checkAnswer(item,choice,context)
        : null,

      onComplete:async r=>{
        const result=await BrainiData.api.submitGameResult("brainmix",{
          score:r.points,
          correct:r.correct,
          total:r.total,
          accuracy:Math.round(r.correct/r.total*100),
          timeSec:r.timeSec,
          results:r.results,
          answerDetails:r.answerDetails,
          contentSource:daily.source,
          dailyChallengeId:daily.dailyChallengeId,
          dailyNumber:daily.dailyNumber,
          challengeDate:daily.challengeDate,
          practice:!usingCloud
        });

        if(usingCloud){
          try{
            await BrainiDaily.verifyDailyResult(result,daily,r.answerDetails);
          }catch(err){
            console.warn("BrainiLab Home Daily verification pending:",err.message||err);
          }
        }

        const completedStatus=await BrainiDailyHub.resolve(daily.dailyNumber,{forceCloud:true});
        await BrainiHomeDaily.render(
          stage,
          completedStatus,
          {result}
        );

        if(window.BrainiAuth && BrainiAuth.addSavePrompt){
          BrainiAuth.addSavePrompt(
            stage.querySelector(".post-game, .home-daily-state"),
            "home_daily_result"
          );
        }
      }
    });

      stage.querySelector("[data-q]").focus({preventScroll:true});
    }, {once:true});
  } catch (error) {
    clearTimeout(timeout);
    console.error("BrainiLab Home Daily:", error);
    if (!stage.isConnected) return;
    root.removeAttribute('data-home-loading');
    root.setAttribute('aria-busy','false');
    stage.innerHTML = `<div class="daily-load-error" role="status">
      <h2>Today’s challenge is taking longer to load.</h2>
      <p>Try again, or choose another game while we reconnect.</p>
      <button class="btn" type="button" data-daily-retry>Retry Daily</button>
      <a class="btn-light" href="/games/">Browse games</a>
    </div>`;
    stage.querySelector("[data-daily-retry]").addEventListener("click", () => location.reload());
  }
}, {once:true});
