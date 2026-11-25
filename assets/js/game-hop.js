// Game pages (Nov 2026): a row of other games under the game, so players can hop to the next one without going
// back to the library. Phones have no tab bar on game pages, so this row is their quickest way across.
(function(){
  if(typeof window==="undefined"||typeof document==="undefined"||window.BrainiGameHop)return;
  // Anytime games and topic quizzes. The Daily-only games (Brain Mix, BrainiWord, Order Up, Topic Rush) are reached through
  // "Today's Daily", because outside their day their pages only point back to the Daily.
  const GAMES=[
    ["connections","Connections","/games/connections/"],
    ["oddoneout","Odd One Out","/games/odd-one-out/"],
    ["higherlower","Higher or Lower","/games/higher-lower/"],
    ["mathrush","Math Rush","/games/math-rush/"],
    ["numberroute","Number Route","/games/number-route/"],
    ["sequence","Sequence","/games/sequence/"],
    ["survival","Survival","/games/survival/"],
    ["cryptic","Cryptic","/games/cryptic/"],
    ["worldflags","World Flags","/geography/world-flags-quiz/"],
    ["geography","World Capitals","/geography/world-capitals-quiz/"],
    ["generalknowledge","General Knowledge","/general-knowledge/general-knowledge-quiz/"],
    ["science","Science Quiz","/science/science-quiz/"],
    ["history","History Quiz","/history/history-quiz/"],
    ["sports","Sports Quiz","/sports/sports-quiz/"]
  ];
  const SHELLS="section.labgame-page,section.connections-page,section.daily-mechanic-page,section.brainiword-page,section.cryptic-card,section.challenge-wrap";
  const DAILY_ICON='<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="M9 15l2 2 4-4"/></svg>';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const clean=path=>String(path||"/").replace(/index\.html$/,"").replace(/\/?$/,"/");

  function anchor(){
    if(clean(location.pathname)==="/")return null;
    if(/^\/(admin|auth)(\/|$)/.test(location.pathname))return null;
    const shell=document.querySelector("main "+SHELLS.split(",").join(",main "));
    if(!shell)return null;
    let node=shell;
    while(node.parentElement&&node.parentElement.tagName!=="MAIN")node=node.parentElement;
    if(node.matches(".cryptic-card"))node=document.querySelector("main>nav.cryptic-below")||node;
    return node;
  }

  function markup(here){
    const art=(id,name)=>(window.BrainiIcons?.world?.(id,"game-hop-art")||"").replace("<img ","<img loading=\"lazy\" decoding=\"async\" width=\"72\" height=\"72\" ")||`<span class="game-hop-art game-hop-letter" aria-hidden="true">${esc(name[0])}</span>`;
    const items=GAMES.filter(([, ,href])=>href!==here).map(([id,name,href])=>`<li><a href="${href}">${art(id,name)}<span class="game-hop-name">${esc(name)}</span></a></li>`).join("");
    return `<div class="game-hop-head"><h2 id="game-hop-title">Play another game</h2><a class="game-hop-all" href="/games/">All games <span aria-hidden="true">→</span></a></div>`+
      `<ul class="game-hop-list"><li><a class="game-hop-daily" href="/daily-quiz/"><span class="game-hop-art game-hop-icon">${DAILY_ICON}</span><span class="game-hop-name">Today’s Daily</span></a></li>${items}</ul>`;
  }

  function boot(){
    if(document.querySelector(".game-hop"))return;
    const target=anchor();
    if(!target)return;
    const nav=document.createElement("nav");
    nav.className="game-hop wrap";
    nav.setAttribute("aria-labelledby","game-hop-title");
    nav.innerHTML=markup(clean(location.pathname));
    target.after(nav);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.BrainiGameHop={boot,GAMES};
})();
