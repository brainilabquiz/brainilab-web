// Phone bottom navigation (Nov 2026): Home, Daily, Games, Learn and Me stay within thumb reach.
// Shown by CSS on narrow screens only, and never on game or quiz pages, where the bottom of the
// screen belongs to the answer buttons.
(function(){
  if(typeof window==="undefined"||typeof document==="undefined"||window.BrainiTabBar)return;
  const ICONS={
    home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
    daily:'<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    games:'<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
    learn:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    me:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'
  };
  const TABS=[["home","/","Home"],["daily","/daily-quiz/","Daily"],["games","/games/","Games"],["learn","/learn/","Learn"],["me","/profile/","Me"]];
  const PLAYING=".labgame-shell,.connections-shell,.daily-mechanic-shell,.brainiword-shell,.cryptic-card,.challenge:not(#homeQuiz)";

  function eligible(){
    const body=document.body;
    if(!body||!body.classList.contains("braini-visual"))return false;
    if(body.classList.contains("play-page")||body.hasAttribute("data-world"))return false;
    if(/^\/(admin|auth)(\/|$)/.test(location.pathname))return false;
    return !document.querySelector(PLAYING);
  }

  function current(path){
    if(path==="/"||path==="/index.html")return "home";
    if(/^\/daily-quiz(\/|$)/.test(path))return "daily";
    if(/^\/(games|geography|general-knowledge|science|history|sports|reasoning)(\/|$)/.test(path))return "games";
    if(/^\/learn(\/|$)/.test(path))return "learn";
    if(/^\/profile(\/|$)/.test(path))return "me";
    return "";
  }

  function boot(){
    if(document.querySelector(".braini-tabbar")||!eligible())return;
    const active=current(location.pathname);
    const nav=document.createElement("nav");
    nav.className="braini-tabbar";
    nav.setAttribute("aria-label","Quick navigation");
    nav.innerHTML=TABS.map(([id,href,label])=>`<a href="${href}"${id===active?' aria-current="page"':""}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[id]}</svg><span>${label}</span></a>`).join("");
    document.body.appendChild(nav);
    document.documentElement.classList.add("has-tabbar");
    menuExtra();
  }

  // Nov 2026: with the tab bar on screen the phone header keeps only the logo, streak and menu (CSS). The header's
  // "?" is hidden there, so the menu gains a Suggestions link; CSS shows it only in that phone layout.
  function menuExtra(){
    const links=document.getElementById("mainNav");
    if(!links||links.querySelector("a.menu-extra"))return;
    const a=document.createElement("a");
    a.className="menu-extra";
    a.href="/suggestions/";
    a.innerHTML='<svg class="menu-extra-icon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.5"/><path d="M12 17h.01"/></svg><span>Suggestions</span>';
    links.appendChild(a);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  window.BrainiTabBar={boot,current};
})();
