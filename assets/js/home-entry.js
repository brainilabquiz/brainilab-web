/* Home: load the Daily in advance, but start timing only after an explicit click. */
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("homeQuiz");
  const stage = root?.querySelector(".challenge-inner");
  const template = document.getElementById("homeQuizTemplate");
  if (!stage || !template) return;
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
      await BrainiHomeDaily.render(stage, previousStatus);
      return;
    }
    const questions = daily.questions;
    const usingCloud = daily.source === "supabase";
    const button = stage.querySelector("[data-home-start]");
    stage.querySelector("[data-home-ready]").textContent = `Daily #${daily.dailyNumber} is ready. Your timer starts when you do.`;
    button.textContent = "Start today’s quiz";
    button.disabled = false;
    button.addEventListener("click", () => {
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
          challengeDate:daily.challengeDate
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
            stage.querySelector(".home-daily-state"),
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
    stage.innerHTML = `<div class="daily-load-error" role="status">
      <h2>Today’s challenge is taking longer to load.</h2>
      <p>Try again, or choose another game while we reconnect.</p>
      <button class="btn" type="button" data-daily-retry>Retry Daily</button>
      <a class="btn-light" href="/games/">Browse games</a>
    </div>`;
    stage.querySelector("[data-daily-retry]").addEventListener("click", () => location.reload());
  }
}, {once:true});
