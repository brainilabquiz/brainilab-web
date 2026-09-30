/*
  BrainiLab Daily Journey — V41.8.0
  One reusable visual for today's four Daily Games.
*/
window.BrainiDailyJourney=(function(){
  const SCRIPT_URL=(()=>{
    const current=document.currentScript?.src;
    if(current) return current;

    const found=[...document.scripts]
      .map(s=>s.src)
      .find(src=>src && src.includes("/assets/js/daily-journey.js"));

    return found||location.href;
  })();

  const SITE_ROOT=new URL("../../",SCRIPT_URL);

  function siteUrl(path=""){
    const raw=String(path).replace(/^\/+/, "");
    const url=new URL(raw,SITE_ROOT);

    // Static local browsing has no web server to resolve directory routes
    // to index.html. Chrome otherwise shows a directory listing.
    if(
      url.protocol==="file:" &&
      url.pathname.endsWith("/")
    ){
      url.pathname+="index.html";
    }

    return url.href;
  }

  const META={
    brainmix:{name:"Brain Mix",icon:"brainmix",href:"games/brain-mix/"},
    orderup:{name:"Order Up",icon:"orderup",href:"games/order-up/"},
    topicrush:{name:"Topic Rush",icon:"topicrush",href:"games/topic-rush/"},
    connections:{name:"Connections",icon:"connections",href:"games/connections/",dailyQuery:true},
    oddoneout:{name:"Odd One Out",icon:"odd-one-out",href:"games/odd-one-out/",dailyQuery:true},
    higherlower:{name:"Higher or Lower",icon:"higher-lower",href:"games/higher-lower/",dailyQuery:true},
    mathrush:{name:"Math Rush",icon:"math-rush",href:"games/math-rush/",dailyQuery:true},
    numberroute:{name:"Number Route",icon:"number-route",href:"games/number-route/",dailyQuery:true},
    sequence:{name:"Sequence",icon:"sequence",href:"games/sequence/",dailyQuery:true},
    brainiword:{name:"BrainiWord",icon:"brainiword",href:"games/brainiword/"}
  };
  const ORDER=["brainmix","orderup","topicrush","connections","oddoneout","higherlower","mathrush","numberroute","sequence","brainiword"];

  function orderFor(status){
    return status?.dailyIds||BrainiData.dailyGameIdsForNumber?.(status?.dailyNumber)||["brainmix","orderup","topicrush","brainiword"];
  }

  function practiceDateFor(gameId,currentDate){
    const base=new Date(`${currentDate}T12:00:00Z`),d=new Date(base);
    for(let i=1;i<=90;i++){
      d.setUTCDate(d.getUTCDate()-1);
      const key=d.toISOString().slice(0,10);
      if((BrainiData.dailyGameIdsForDate?.(key)||[]).includes(gameId)) return key;
    }
    base.setUTCDate(base.getUTCDate()-1);
    return base.toISOString().slice(0,10);
  }

  function formatPoints(n){
    return Number(n||0).toLocaleString('en-GB');
  }

  async function markup(options={}){
    const status=options.status||await BrainiDailyHub.resolve(
      options.dailyNumber,
      {forceCloud:!!options.forceCloud}
    );
    const current=options.currentGame||"";
    if(status.model?.version==='daily-choice-v1')return choiceMarkup(status);

    return `
      <section class="daily-journey ${status.completedCount===4?"is-full":""}">
        <div class="daily-journey-head">
          <div>
            <span class="daily-journey-eyebrow">Today's Daily · #${status.dailyNumber}</span>
            <h3>${status.completedCount===4?"Full Daily complete ✓":"Finish today's 4 challenges"}</h3>
          </div>
          <div class="daily-journey-score">
            <strong>${formatPoints(status.brainScore)}</strong>
            <span>/ 10,000</span>
          </div>
        </div>

        <div class="daily-journey-progress">
          <span style="width:${Math.min(100,status.completedCount/4*100)}%"></span>
        </div>

        <div class="daily-journey-grid">
          ${orderFor(status).map(id=>{
            const meta=META[id];
            const game=status.games[id]||{};
            const complete=!!game.completed;
            const dailyDate=BrainiData.dateForDailyNumber?.(status.dailyNumber)||BrainiData.todayKey();
            const playHref=meta.dailyQuery
              ? `${siteUrl(meta.href)}?daily=${encodeURIComponent(dailyDate)}`
              : siteUrl(meta.href);
            const practiceDate=practiceDateFor(id,dailyDate);
            const tryHref=`${siteUrl(meta.href)}?archive=${encodeURIComponent(practiceDate)}&try=1&today=${encodeURIComponent(dailyDate)}`;
            return `
              <article class="daily-journey-card-v2 ${complete?"is-complete":"is-pending"} ${id===current?"is-current":""}">
                <div class="daily-journey-card-main">
                  <span class="daily-journey-icon">${BrainiIcons.game(meta.icon,"mini","braini-game-mini")}</span>
                  <span class="daily-journey-copy">
                    <strong>${meta.name}</strong>
                    <small>${complete
                      ? `${formatPoints(game.points)} / 2,500 points`
                      : "Up to 2,500 Daily points"
                    }</small>
                  </span>
                  <span class="daily-journey-state">${complete?BrainiIcons.product("check-completed","braini-inline-icon"):BrainiIcons.product("continue","braini-inline-icon")}</span>
                </div>
                ${complete
                  ? `<div class="daily-journey-completed-lock">Completed today · result locked ✓</div>`
                  : `<div class="daily-journey-actions">
                      <a class="daily-journey-try" href="${tryHref}">Try first</a>
                      <a class="daily-journey-play" href="${playHref}">Play Daily</a>
                    </div>`
                }
              </article>`;
          }).join("")}
        </div>

        <div class="daily-journey-foot">
          ${status.completedCount===4
            ? `<strong>+250 XP Full Daily bonus earned</strong><span>Come back tomorrow for a new four-game set.</span>`
            : `<strong>${4-status.completedCount} ${4-status.completedCount===1?"challenge":"challenges"} left</strong><span>Complete all four for +250 bonus XP.</span>`
          }
        </div>
      </section>`;
  }

  async function render(container,options={}){
    if(!container) return null;
    const status=options.status||await BrainiDailyHub.resolve(
      options.dailyNumber,
      {forceCloud:!!options.forceCloud}
    );
    container.innerHTML=await markup({...options,status});
    window.BrainiFriendChallenge?.mount(container,status);
    return status;
  }

  function gameHref(id,day){return siteUrl(META[id].href)+(META[id].dailyQuery?'?daily='+day:'');}
  function choiceMarkup(status){
    const model=status.model,day=BrainiData.dateForDailyNumber(status.dailyNumber),primary=status.games[model.primary]||{},bonus=status.bonusChoice;
    const done=primary.completed&&bonus&&status.games[bonus]?.completed;
    function card(id,isPrimary){
      const meta=META[id],game=status.games[id]||{},max=BrainiDailyRules.max(id,day);
      const unavailable=!isPrimary&&(!primary.completed||bonus&&bonus!==id);
      const href=gameHref(id,day);
      const message=game.completed?`${formatPoints(game.points)} / ${formatPoints(max)} points`:unavailable?(bonus?'You chose the other extra':'Available after your Daily'):`Up to ${formatPoints(max)} points`;
      return `<article class="daily-choice-card ${isPrimary?'is-primary':''} ${game.completed?'is-complete':''} ${unavailable?'is-unavailable':''}"><span class="daily-choice-art">${BrainiIcons.game(meta.icon,'mini','braini-game-mini')}</span><div><span class="daily-choice-role">${isPrimary?"Today’s Daily":bonus===id?'Your extra':'Optional extra'}</span><h3>${meta.name}</h3><p>${message}</p></div>${game.completed?'<strong class="daily-choice-done">Completed ✓</strong>':unavailable?'':`<a class="btn" href="${href}">${isPrimary?'Play today’s Daily':bonus===id?'Continue extra':'Choose '+meta.name}</a>`}</article>`;
    }
    return `<section class="daily-choice" aria-label="Today’s Daily games"><div class="daily-choice-heading"><span>Daily #${status.dailyNumber}</span><span>${formatPoints(status.brainScore)} / ${formatPoints(model.maxScore)} points</span></div>${card(model.primary,true)}<div class="daily-choice-extra-heading"><h3>${done?'All done for today':bonus?'Your extra':'Fancy one more?'}</h3><p>${done?'You’ve played your Daily and your extra.':bonus?'Up to 1,000 more points. Your streak is already safe.':'Choose one extra. Up to 1,000 points. Your streak only needs the main Daily.'}</p></div><div class="daily-choice-extras">${model.choices.map(id=>card(id,false)).join('')}</div><p class="daily-choice-note">${done?'A fresh challenge arrives tomorrow.':'Your extra is fixed when you open it. A new choice is available tomorrow.'}</p></section>`;
  }
  return {META,ORDER,markup,render,gameHref,choiceMarkup};
})();
