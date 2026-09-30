/*
  BrainiLab Daily Overview — V27
*/
window.BrainiDailyOverview=(function(){
  async function render(){
    const root=document.querySelector("[data-daily-overview]");
    if(!root) return;

    root.innerHTML=`<div class="daily-overview-loading">Loading today's Daily…</div>`;

    try{
      const status=await BrainiDailyHub.resolve(undefined,{forceCloud:true});
      const p=BrainiData.player();
      if(status.model?.version==='daily-choice-v1'){
        const done=!!status.games[status.model.primary]?.completed;
        root.innerHTML=`<header class="daily-choice-intro"><h1>${done?'Daily complete. Nicely done.':"A little challenge for today."}</h1><p>${done?'Your main result is saved. The extra is entirely up to you.':'One game for your streak. A different challenge every day.'}</p></header><div data-daily-journey-hub></div><div data-braini-continuity>${window.BrainiContinuity?.markup?.()||''}</div><details class="daily-rules-compact"><summary>How points work</summary><p>Main Daily: up to 2,500 points and 250 completion XP. Optional extra: choose one of two, worth up to 1,000 points. Game XP is separate from your ranking score. Days reset at 00:00 UTC.</p></details>`;
        await BrainiDailyJourney.render(root.querySelector('[data-daily-journey-hub]'),{status});return;
      }

      if(status.completedCount===4){
        root.innerHTML=`
          <section class="daily-caught-up">
            <div class="home-daily-state is-caught-up">
              <div class="home-daily-state-top">
                <span>Daily #${status.dailyNumber}</span>
                <strong>4/4 complete ✓</strong>
              </div>

              <div class="home-daily-state-copy">
                <h1>You’re caught up for today!</h1>
                <p>
                  All four Daily challenges are done.
                  You scored ${Number(status.brainScore||0).toLocaleString()} / 10,000 today.
                  Want to keep testing yourself?
                </p>
              </div>

              <div class="home-daily-state-actions">
                <a class="home-daily-primary" href="../games/index.html">
                  Play more games
                </a>

                <a class="home-daily-tertiary" href="../profile/index.html?section=progress">
                  See my progress
                </a>
              </div>

              <div class="next-daily-countdown" data-next-daily-countdown></div>

              <div data-braini-continuity>${window.BrainiContinuity?.markup?.()||''}</div><div data-daily-journey-hub></div>
            </div>
          </section>
        `;

        if(window.BrainiDailyCountdown){
          BrainiDailyCountdown.mount(
            root.querySelector("[data-next-daily-countdown]")
          );
        }

        await BrainiDailyJourney.render(
          root.querySelector("[data-daily-journey-hub]"),
          {status}
        );

        return;
      }

      root.innerHTML=`
        <section class="daily-overview-hero">
          <div>
            <span class="daily-overview-kicker">Daily #${status.dailyNumber}</span>
            <h1>Today's Daily Challenge</h1>
            <p>Four different games. Up to 2,500 points each. Complete all four for the Full Daily bonus.</p>
          </div>

          <div class="daily-overview-summary">
            <div><strong>${status.completedCount}/4</strong><span>completed</span></div>
            <div><strong>${Number(status.brainScore||0).toLocaleString()}</strong><span>Brain Score</span></div>
            <div><strong>🔥 ${Number(p.currentStreak||0)}</strong><span>day streak</span></div>
          </div>
        </section>

        <div data-braini-continuity>${window.BrainiContinuity?.markup?.()||''}</div><div data-daily-journey-hub></div>

        <section class="daily-rules-compact">
          <div><strong>Daily Brain Score</strong><span>Only today's 4 Daily Games contribute to the 10,000-point Daily score.</span></div>
          <div><strong>XP</strong><span>Your first three verified games of each kind per UTC day earn XP. Finishing all four Daily Games adds +250 XP.</span></div>
          <a href="../profile/index.html?section=progress">See my progress →</a>
        </section>
      `;

      await BrainiDailyJourney.render(
        root.querySelector("[data-daily-journey-hub]"),
        {status}
      );
    }catch(err){
      console.error("Daily overview:",err);
      root.innerHTML=`
        <section class="daily-overview-error">
          <h1>Today's Daily could not load.</h1>
          <p>Your saved progress is safe. Check the connection and try again.</p>
          <button type="button" onclick="location.reload()">Retry</button>
        </section>`;
    }
  }

  document.addEventListener("DOMContentLoaded",render);
  window.addEventListener("brainilab:datachange",render);
  window.addEventListener("brainilab:progressionchange",render);
  window.addEventListener("brainilab:daychange",render);

  return {render};
})();
