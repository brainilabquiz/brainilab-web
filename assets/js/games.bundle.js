/* ===== games-library.js ===== */

/* BrainiLab Games library — V41.8.5 */
window.BrainiGamesLibrary=(function(){

  const DAILY_LAUNCH_DATE="2026-08-29";

  const RANDOM_PAST_META={
    brainmix:{
      name:"Brain Mix",
      route:"brain-mix/index.html"
    },
    brainiword:{
      name:"BrainiWord",
      route:"brainiword/index.html"
    },
    orderup:{
      name:"Order Up",
      route:"order-up/index.html"
    },
    topicrush:{
      name:"Topic Rush",
      route:"topic-rush/index.html"
    }
  };

  function yesterdayKey(){
    const d=new Date();
    d.setUTCDate(d.getUTCDate()-1);
    return d.toISOString().slice(0,10);
  }

  function addUtcDay(date){
    const d=new Date(`${date}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate()+1);
    return d.toISOString().slice(0,10);
  }

  function availablePastDates(gameId){
    const end=yesterdayKey();

    if(end<DAILY_LAUNCH_DATE) return [];

    const dates=[];

    for(
      let date=DAILY_LAUNCH_DATE;
      date<=end;
      date=addUtcDay(date)
    ){
      const ids=
        BrainiData.dailyGameIdsForDate?.(date)||[];

      if(ids.includes(gameId)){
        dates.push(date);
      }
    }

    return dates;
  }

  function playedPastDates(gameId){
    return new Set(
      (BrainiData.recentResults(gameId)||[])
        .filter(
          result =>
            result?.practice &&
            result?.challengeDate
        )
        .map(
          result =>
            String(result.challengeDate).slice(0,10)
        )
    );
  }

  function pickPastDate(gameId){
    const available=
      availablePastDates(gameId);

    if(!available.length){
      return null;
    }

    const played=
      playedPastDates(gameId);

    const unseen=
      available.filter(
        date => !played.has(date)
      );

    // Prefer unseen content.
    // Once everything has been played, choose randomly.
    const pool=
      unseen.length
        ? unseen
        : available;

    return pool[
      Math.floor(Math.random()*pool.length)
    ] || pool[0];
  }

  function hydrateRandomPastGames(){

    document
      .querySelectorAll("[data-random-past-game]")
      .forEach(link=>{

        const gameId=
          link.dataset.randomPastGame;

        const meta=
          RANDOM_PAST_META[gameId];

        if(!meta) return;

        const date=
          pickPastDate(gameId);

        if(!date){
          link.removeAttribute("href");
          link.setAttribute(
            "aria-disabled",
            "true"
          );
          link.textContent="Available soon";
          return;
        }

        link.href=
          `${meta.route}?archive=${encodeURIComponent(date)}`;

        link.removeAttribute("aria-disabled");
        link.textContent="Play";
        link.setAttribute("aria-label", `Play ${meta.name}`);
      });
  }

  function hydrate(){

    document
      .querySelectorAll("[data-anytime-game]")
      .forEach(card=>{

        const gameId=
          card.dataset.anytimeGame;

        const results=
          BrainiData.recentResults(gameId)||[];

        const best=
          BrainiData.personalBest(gameId);

        const status=
          card.querySelector(
            "[data-anytime-status]"
          );

        if(!status) return;

        if(!results.length){
          status.innerHTML=
            '';
          return;
        }

        let bestLabel="";

        if(best){

          if(
            [
              "connections",
              "survival",
              "oddoneout",
              "higherlower",
              "mathrush",
              "numberroute",
              "sequence"
            ].includes(gameId) &&
            Number.isFinite(Number(best.score))
          ){
            bestLabel=
              `Best ${Number(best.score).toLocaleString()} pts`;

          }else if(
            Number.isFinite(Number(best.correct)) &&
            Number.isFinite(Number(best.total))
          ){
            bestLabel=
              `Best ${Number(best.correct)}/${Number(best.total)}`;

          }else if(
            Number.isFinite(Number(best.score))
          ){
            bestLabel=
              `Best ${Number(best.score).toLocaleString()} pts`;
          }
        }

        status.innerHTML=
          `<span class="anytime-played">${
            BrainiIcons.product(
              "check-completed",
              "braini-inline-icon"
            )
          } Played</span><span>${
            bestLabel ||
            `${results.length} result${results.length===1?"":"s"}`
          }</span>`;
      });

    const player=
      BrainiData.player();

    document
      .querySelectorAll("[data-games-rank]")
      .forEach(el=>{
        if(window.BrainiProgressUI){
          el.innerHTML=
            BrainiProgressUI.badgeMarkup(
              player.level||1
            );
        }
      });

    hydrateRandomPastGames();
  }

  document.addEventListener(
    "DOMContentLoaded",
    hydrate
  );

  window.addEventListener(
    "brainilab:datachange",
    hydrate
  );

  window.addEventListener(
    "brainilab:progressionchange",
    hydrate
  );

  window.addEventListener(
    "pageshow",
    hydrateRandomPastGames
  );

  return {
    hydrate,
    hydrateRandomPastGames,
    pickPastDate
  };

})();

/* ===== game-discovery.js ===== */

/* Separate format and topic filters. All cards stay in crawlable HTML. */
document.addEventListener('DOMContentLoaded',()=>{
 const controls=document.querySelector('[data-game-filters]'),topics=document.querySelector('[data-game-topics]');
 if(!controls||!topics)return;
 const cards=[...document.querySelectorAll('[data-anytime-game]')],count=document.querySelector('[data-game-filter-count]');
 const topicButtons=[...topics.querySelectorAll('[data-game-topic]')];
 let type='all',topic='all';
 const inType=card=>type==='all'||card.dataset.gameKind===type;
 function apply(update=false){
  if(!['all','games','quizzes'].includes(type))type='all';
  const available=new Set(cards.filter(inType).map(card=>card.dataset.gameTopic));
  if(topic!=='all'&&!available.has(topic))topic='all';
  cards.forEach(card=>card.hidden=!inType(card)||(topic!=='all'&&card.dataset.gameTopic!==topic));
  controls.querySelectorAll('[data-game-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.gameFilter===type)));
  topicButtons.forEach(b=>{b.hidden=b.dataset.gameTopic!=='all'&&!available.has(b.dataset.gameTopic);b.setAttribute('aria-pressed',String(b.dataset.gameTopic===topic));});
  const visible=cards.filter(card=>!card.hidden),games=visible.filter(card=>card.dataset.gameKind==='games').length,quizzes=visible.length-games;
  const starters=document.querySelector('.game-starters');if(starters)starters.hidden=type!=='all'||topic!=='all';
  count.hidden=false;count.textContent=[games?games+' '+(games===1?'game':'games'):'',quizzes?quizzes+' '+(quizzes===1?'quiz':'quizzes'):''].filter(Boolean).join(' · ')||'Nothing here yet. Try another topic.';
  if(update){
   const url=new URL(location.href);for(const [key,value] of [['type',type],['topic',topic]]){if(value==='all')url.searchParams.delete(key);else url.searchParams.set(key,value);}
   try{history.replaceState(history.state,'',url);}catch{}
   window.dispatchEvent(new CustomEvent('brainilab:discovery',{detail:{type,topic}}));
  }
 }
 function read(){const q=new URLSearchParams(location.search);type=q.getAll('type').length===1?q.get('type'):'all';topic=q.getAll('topic').length===1?q.get('topic'):'all';if(['words','numbers'].includes(type)){topic=type;type='games';}apply();}
 controls.hidden=false;topics.hidden=false;
 controls.addEventListener('click',e=>{const b=e.target.closest('[data-game-filter]');if(b){type=b.dataset.gameFilter;topic='all';apply(true);}});
 topics.addEventListener('click',e=>{const b=e.target.closest('[data-game-topic]');if(b){topic=b.dataset.gameTopic;apply(true);}});
 window.addEventListener('popstate',read);read();
});
