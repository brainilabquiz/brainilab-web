/*
  BrainiLab Home Daily State — V28
  Once Brain Mix is complete, the Home hero becomes a full four-game Daily hub.
*/
window.BrainiHomeDaily=(function(){
  function resultFor(status,result){
    return result||status?.games?.brainmix?.result||null;
  }

  async function render(container,status,options={}){
    if(!container || !status) return;

    const result=resultFor(status,options.result);
    const complete=status.completedCount===4;
    const brainScore=Number(status.brainScore||0).toLocaleString();

    // Returning visitors keep the same homepage layout. The full result view
    // is only shown after a game they explicitly started in this visit.
    if(options.compact){
      container.classList.add('home-start');
      container.innerHTML=`
        <span class="challenge-pill">Daily #${Number(status.dailyNumber)} · ${Number(status.completedCount)}/4 complete</span>
        <h2>${complete?'You’re caught up for today!':'Brain Mix complete. What’s next?'}</h2>
        <p>${complete?'Come back tomorrow for a fresh Daily, or explore another game.':`Your Daily Brain Score is ${brainScore} / 10,000. Continue with today’s remaining challenges.`}</p>
        <div class="home-start-actions">
          <a class="btn" href="${complete?'/games/':'/daily-quiz/'}">${complete?'Explore all games':'Continue Daily'}</a>
          <a class="btn-light" href="/profile/?section=progress">See my progress</a>
        </div>
        <p class="home-ready">${complete?'Today’s four challenges are complete.':'Your completed Brain Mix is saved.'}</p>`;
      return;
    }

    if(result&&window.BrainiPostGame){
      container.classList.remove('home-start');
      BrainiPostGame.mount(container,{result,gameId:'brainmix',name:'Brain Mix',status});
      return;
    }

    container.innerHTML=`
      <div class="home-daily-state ${complete?"is-caught-up":""}">
        <div class="home-daily-state-top">
          <span>Daily #${status.dailyNumber}</span>
          <strong>${complete?"4/4 complete ✓":`${status.completedCount}/4 complete`}</strong>
        </div>

        <div class="home-daily-state-copy">
          <h2>${complete
            ? "You’re caught up for today!"
            : "Brain Mix complete. Keep your Daily going."
          }</h2>

          <p>${complete
            ? "All four Daily challenges are done. Want to keep testing yourself?"
            : `Your Daily Brain Score is ${brainScore} / 10,000. Finish the remaining ${4-status.completedCount} ${4-status.completedCount===1?"challenge":"challenges"} to complete today’s set.`
          }</p>
        </div>

        <div class="home-daily-state-actions">
          <a class="home-daily-primary" href="${complete?"games/index.html":"daily-quiz/index.html"}">
            ${complete?"Play more games":"Continue Daily"}
          </a>

          ${result
            ? `<button class="home-daily-secondary" type="button" data-home-share-brainmix>Share Brain Mix</button>`
            : ""
          }

          <a class="home-daily-tertiary" href="profile/index.html?section=progress">
            See my progress
          </a>
        </div>

        ${complete
          ? `<div class="next-daily-countdown" data-next-daily-countdown></div>`
          : ""
        }

        <div data-home-daily-journey></div>
      </div>
    `;

    container.querySelector("[data-home-share-brainmix]")?.addEventListener(
      "click",
      ()=>BrainiShare.open("brainmix",result)
    );

    if(complete && window.BrainiDailyCountdown){
      BrainiDailyCountdown.mount(
        container.querySelector("[data-next-daily-countdown]")
      );
    }

    if(window.BrainiDailyJourney){
      await BrainiDailyJourney.render(
        container.querySelector("[data-home-daily-journey]"),
        {
          status,
          currentGame:"brainmix"
        }
      );
    }

    // The full Daily status is now in the hero, so duplicate progress sections
    // further down the Home page are intentionally hidden.
    document.querySelector(".brain-score-section")?.setAttribute("hidden","");
    document.querySelector("[data-home-daily-cards]")?.setAttribute("hidden","");
  }

  return {render};
})();
