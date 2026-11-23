/* Home: load the Daily in advance, but start timing only after an explicit click. */
const homeStartup=window.BrainiHomeStartup;
if(homeStartup?.requiresCloud())void window.BrainiPerf.ensureCloud();

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("homeQuiz");
  const stage = root?.querySelector(".challenge-inner");
  const template = document.getElementById("homeQuizTemplate");
  if (!stage || !template) return;
  root.setAttribute('aria-busy','true');
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
    // Home v2 (Nov 2026): the card's head wears today's game world, a ring shows the day's
    // points, and the body lists the optional extras and the next Daily countdown.
    const fmt=n=>Math.max(0,Number(n)||0).toLocaleString('en-GB');
    const maxFor=id=>{const v=Number(window.BrainiDailyRules?.max?.(id,day));return Number.isFinite(v)&&v>0?v:null;};
    const ring=status=>{
      const max=Number(status?.model?.maxScore)||0,score=Math.max(0,Number(status?.brainScore)||0);
      if(!max)return '';
      const pct=Math.min(100,Math.round(score/max*100));
      return `<div class="home-daily-ring" role="img" aria-label="${fmt(score)} of ${fmt(max)} Daily points today"><svg viewBox="0 0 110 110" aria-hidden="true" focusable="false"><circle class="home-ring-track" cx="55" cy="55" r="48"/><circle class="home-ring-fill" cx="55" cy="55" r="48" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100-pct}"/></svg><span class="home-ring-value" aria-hidden="true"><strong>${fmt(score)}</strong><span>of ${fmt(max)}</span></span></div>`;
    };
    const head=(status,pill,title,copy)=>`<div class="home-daily-head">${BrainiIcons.world?.(ids[0],"home-daily-icon is-world-art")||BrainiIcons.game(ids[0],"standard","home-daily-icon","")}<div class="home-daily-title"><span class="challenge-pill">${pill}</span><h2>${title}</h2><p>${copy}</p></div>${ring(status)}</div>`;
    const dailyLabel=status=>`Today’s Daily${status?.dailyNumber?` · #${Number(status.dailyNumber)}`:''}`;
    const extras=()=>{
      const items=ids.slice(1).map(id=>{const m=BrainiDailyJourney.META[id];return m?`<li>${BrainiIcons.world?.(id,"home-extra-icon is-world-art")||BrainiIcons.game(id,"standard","home-extra-icon","")}<span><strong>${m.name}</strong>${maxFor(id)?`<span>Up to ${fmt(maxFor(id))} points</span>`:''}</span></li>`:'';}).join('');
      return items?`<div class="home-daily-extras"><p>Fancy one more? After the main game, pick an optional extra.</p><ul>${items}</ul></div>`:'';
    };
    const nextDaily=`<p class="home-daily-next" data-home-countdown></p>`;
    const start=status=>`${head(status,dailyLabel(status),meta.name,dailyDescriptions[ids[0]])}<div class="home-daily-body"><div class="home-start-actions"><a class="btn" data-home-action="daily" href="${href}">Play today’s Daily</a><a class="btn-light" data-home-action="games" href="/games/">Explore all games</a></div><p class="home-ready">Up to ${fmt(maxFor(ids[0])??2500)} points · No account needed</p>${extras()}${nextDaily}</div>`;
    const completed=status=>`${head(status,'Daily complete ✓','Nicely done.',`${fmt(status.games[ids[0]].points)} points in today’s ${meta.name}.`)}<div class="home-daily-body"><div class="home-start-actions"><a class="btn" data-home-action="daily" href="/daily-quiz/">${status.bonusChoice?'See today’s progress':'Fancy an extra?'}</a><a class="btn-light" data-home-action="games" href="/games/">Explore all games</a></div>${status.bonusChoice?'':extras()}${nextDaily}</div>`;
    const current=()=>request===modernRequest&&day===BrainiData.todayKey()&&owner===currentOwner()&&stage.isConnected;
    const reveal=markup=>{
      if(!current())return;
      paintModern(markup);modernPaintedContext=context;
      root.removeAttribute('data-home-loading');root.setAttribute('aria-busy','false');
      const countdown=stage.querySelector?.('[data-home-countdown]');
      if(countdown&&!countdown.childElementCount)window.BrainiDailyCountdown?.mount(countdown);
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
    const fallback=`${head(null,'Today’s Daily',meta.name,dailyDescriptions[ids[0]])}<div class="home-daily-body"><div class="home-start-actions"><a class="btn" data-home-action="daily" href="/daily-quiz/">Open today’s Daily</a><a class="btn-light" data-home-action="games" href="/games/">Explore all games</a></div>${nextDaily}</div>`;
    const timer=setTimeout(()=>{if(modernPaintedContext!==context)reveal(fallback);},8000);
    try{
      const returning=homeStartup?.requiresCloud();
      if(returning && !await window.BrainiPerf.ensureCloud())throw new Error('Player status unavailable');
      if(!current())return;
      const status=await BrainiDailyHub.resolve(undefined,{forceCloud:true,publicLineup:returning?null:homeStartup?.dailyLineup});
      reveal(status?.games?.[ids[0]]?.completed?completed(status):start(status));
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
        if(homeStartup){
          await Promise.all([window.BrainiPerf.ensureCloud(),window.BrainiPerf.loadFeature('home-legacy.bundle.js')]);
        }
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
