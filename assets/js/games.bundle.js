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
            '<span class="anytime-new">Not played yet</span>';
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

/* A small, shareable filter over the existing catalogue; every card stays in HTML. */
document.addEventListener('DOMContentLoaded',()=>{
 const controls=document.querySelector('[data-game-filters]');
 if(!controls)return;
 const groups={all:null,quizzes:['brainmix','orderup','topicrush','generalknowledge','survival','higherlower','worldflags','worldcapitals','science','history','sports'],words:['brainiword','connections','oddoneout'],numbers:['mathrush','numberroute','sequence']};
 const cards=[...document.querySelectorAll('[data-anytime-game]')];
 const count=document.querySelector('[data-game-filter-count]');
 function apply(type,update=false){
  if(!Object.hasOwn(groups,type))type='all';
  let visible=0;
  cards.forEach(card=>{card.hidden=!!groups[type]&&!groups[type].includes(card.dataset.anytimeGame);if(!card.hidden)visible++;});
  controls.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.gameFilter===type)));
  if(count){count.hidden=false;count.textContent=`${visible} ${visible===1?'game':'games'}`;}
  if(update){
   const url=new URL(location.href);if(type==='all')url.searchParams.delete('type');else url.searchParams.set('type',type);
   // A filter is a view, not a new page or a new history entry.
   try{history.replaceState(history.state,'',url);}catch{}
   window.dispatchEvent(new CustomEvent('brainilab:discovery',{detail:{type}}));
  }
 }
 controls.hidden=false;
 const read=()=>{const q=new URLSearchParams(location.search);apply(q.getAll('type').length===1?q.get('type'):'all');};
 controls.addEventListener('click',event=>{const button=event.target.closest('button[data-game-filter]');if(button)apply(button.dataset.gameFilter,true);});
 window.addEventListener('popstate',read);read();
});
