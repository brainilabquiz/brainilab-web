// Home "Pick your world" filter (Nov 2026). Without JavaScript the first eight games show
// and the filter stays hidden; with it, Words / Numbers / Knowledge show up to eight matches.
(function(){
  if(typeof document==="undefined")return;
  const LIMIT=8;
  function boot(){
    const grid=document.querySelector("[data-world-grid]");
    const filter=document.querySelector("[data-world-filter]");
    if(!grid||!filter||filter.dataset.ready)return;
    filter.dataset.ready="true";
    const cards=[...grid.querySelectorAll(".home-game-card")];
    function apply(name){
      let shown=0;
      cards.forEach(card=>{
        const tags=(card.dataset.tags||"").split(/\s+/);
        const show=(name==="all"||tags.includes(name))&&shown<LIMIT;
        if(show)shown+=1;
        card.hidden=!show;
      });
      grid.dataset.filtered=name;
      filter.querySelectorAll("[data-filter]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.filter===name)));
    }
    filter.addEventListener("click",event=>{
      const button=event.target.closest("[data-filter]");
      if(button)apply(button.dataset.filter);
    });
    filter.hidden=false;
    apply("all");
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
})();
