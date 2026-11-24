/*
  BrainiLab Account Menu — V28
  Capture-phase delegation guarantees that clicking the avatar opens the menu
  instead of navigating away first.
*/
window.BrainiAccountMenu=(function(){
  let openMenu=null;
  const headerInvites=new WeakMap();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function close(){
    if(openMenu){
      openMenu.remove();
      openMenu=null;
    }
  }

  function profileHref(section=null){
    const existing=document.querySelector('a.avatar[href*="profile"]');
    const href=existing?.getAttribute("href")||"/profile/";
    const base=href.split("?")[0].split("#")[0];
    return section ? `${base}?section=${section}` : base;
  }

  async function signOut(){
    close();

    if(!confirm("Sign out of BrainiLab on this browser?")) return;

    try{
      if(!window.BrainiBackendAuth && window.BrainiPerf?.ensureCloud){
        await BrainiPerf.ensureCloud();
      }

      if(window.BrainiBackendAuth?.isConfigured?.()){
        await BrainiBackendAuth.signOut();
      }else{
        await BrainiData.api.signOut();
      }
      location.href="/";
    }catch(err){
      if(typeof showToast==="function"){
        showToast(err.message||"Could not sign out");
      }
    }
  }

  // Nov 2026: each row carries a small pictogram in a tinted tile, like the header navigation.
  const ROW_ICONS={
    home:'<rect x="3.5" y="3.5" width="7" height="9" rx="2"/><rect x="13.5" y="3.5" width="7" height="5" rx="2"/><rect x="13.5" y="11.5" width="7" height="9" rx="2"/><rect x="3.5" y="15.5" width="7" height="5" rx="2"/>',
    edit:'<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
    shield:'<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    star:'<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z"/>',
    out:'<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l5-5-5-5"/><path d="M15 12H4"/>',
    login:'<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M14 17l5-5-5-5"/><path d="M19 12H8"/>',
    join:'<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 14 0"/><path d="M19 8v6M16 11h6"/>'
  };
  const rowIcon=name=>`<span class="account-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" focusable="false">${ROW_ICONS[name]}</svg></span>`;

  function menuMarkup(auth,p){
    const logged=auth.status==="authenticated";
    const progress=window.BrainiProgressUI?.xpProgress?.(p.level,p.xp);
    const tier=window.BrainiProgressUI?.tier?.(progress?.level||1);
    const streak=Math.max(0,Number(p.currentStreak)||0);

    return `
      <div class="account-popover" role="menu" aria-label="BrainiLab account menu">
        <div class="account-popover-head">
          <span class="rank-avatar ${window.BrainiProgressUI
            ? BrainiProgressUI.avatarClass(progress.level)
            : ""
          } account-menu-avatar" ${BrainiProgressUI.avatarFrameAttribute(p)}>
            ${BrainiProgressUI.avatarImageMarkup(p,{compact:true})}
          </span>

          <div>
            <strong>${esc(p.displayName||"Braini Player")}</strong>
            <span class="account-level-label">Level ${progress?.level||1} <span class="account-tier">${tier?.name||"Rookie"}</span></span>
          </div>
        </div>

        <a role="menuitem" class="account-progress-link" href="${profileHref('progress')}">
          <span><strong>${Number(p.xp||0).toLocaleString('en-GB')} XP</strong><small>${esc(progress?.label||'Start with a game')}</small></span>
          <i class="account-xp-track" role="progressbar" aria-label="Progress to level ${progress?.nextLevel||2}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress?.percent||0)}"><i style="width:${progress?.percent||0}%"></i></i>
          <span class="account-streak ${p.streakSecuredToday?'is-secured':''}"><span aria-hidden="true">🔥</span> ${streak} ${streak===1?'day':'days'} <small>${p.streakSecuredToday?'Done for today':'Daily not played today'}</small></span>
        </a>

        <a role="menuitem" class="account-popover-row account-popover-primary" href="${profileHref()}">
          ${rowIcon("home")}
          <div>
            <strong>My BrainiLab</strong>
            <small>Overview, progress & stats</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("profile")}">
          ${rowIcon("edit")}
          <div>
            <strong>Edit Profile</strong>
            <small>Name, photo & public profile</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("social")}">
          ${rowIcon("people")}
          <div>
            <strong>Groups & Friends</strong>
            <small>Your people, your teams</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("settings")}">
          ${rowIcon("shield")}
          <div>
            <strong>Account & Security</strong>
            <small>Account, privacy and sign-in</small>
          </div>
        </a>

        ${
          (
            window.BrainiMonetization?.plusEnabled?.()
            || window.BrainiMonetization?.hasPlus?.()
          )
            ? `<a
                 role="menuitem"
                 class="account-popover-row account-popover-plus"
                 href="${
                   window.BrainiMonetization?.plusHref?.()
                   || "/plus/"
                 }"
               >
                 ${rowIcon("star")}
                 <div>
                   <strong>BrainiLab+</strong>
                   <small>${
                     window.BrainiMonetization?.hasPlus?.()
                       ? "Active · No ads"
                       : "Play without ads"
                   }</small>
                 </div>
               </a>`
            : ""
        }

        ${logged
          ? `<button type="button" role="menuitem" class="account-popover-row account-popover-danger" data-account-signout>
               ${rowIcon("out")}
               <div>
                 <strong>Sign out</strong>
                 <small>Sign out of this browser while keeping your synced progress.</small>
               </div>
             </button>`
          : `
             <div class="account-popover-authbox" role="group" aria-label="Authentication actions">
               <p class="account-popover-pitch">A free account keeps your streak, XP and avatar on every device. Playing stays free either way.</p>
               <button type="button" role="menuitem" class="account-popover-authbtn account-popover-authbtn-primary" data-account-signup>
                 ${rowIcon("join")}
                 <div>
                   <strong>Sign up</strong>
                   <small>Create a free account and sync your progress.</small>
                 </div>
               </button>

               <button type="button" role="menuitem" class="account-popover-authbtn" data-account-login>
                 ${rowIcon("login")}
                 <div>
                   <strong>Log in</strong>
                   <small>Use your existing BrainiLab account.</small>
                 </div>
               </button>
             </div>`
        }
      </div>`;
  }

  function positionMenu(avatar){
    const rect=avatar.getBoundingClientRect();
    const viewportWidth=document.documentElement.clientWidth||window.innerWidth;

    openMenu.style.position="fixed";
    openMenu.style.maxWidth=`${Math.max(0,viewportWidth-24)}px`;
    openMenu.style.visibility="hidden";

    document.body.appendChild(openMenu);
    openMenu.style.right=`${Math.min(Math.max(12,viewportWidth-rect.right),Math.max(12,viewportWidth-openMenu.offsetWidth-12))}px`;

    const maxTop=Math.max(
      12,
      window.innerHeight-openMenu.offsetHeight-12
    );

    openMenu.style.top=`${Math.min(rect.bottom+10,maxTop)}px`;
    openMenu.style.visibility="visible";
  }

  function openFor(avatar){
    close();

    const auth=BrainiData.authState();
    const p=BrainiData.player();

    const wrap=document.createElement("div");
    wrap.innerHTML=menuMarkup(auth,p);
    openMenu=wrap.firstElementChild;

    positionMenu(avatar);

    openMenu.querySelector("[data-account-signout]")?.addEventListener(
      "click",
      signOut
    );

    const openAuthModal=async(mode)=>{
      close();

      if(!window.BrainiAuth?.open && window.BrainiPerf?.ensureCloud){
        await BrainiPerf.ensureCloud();
      }

      if(window.BrainiAuth?.open){
        BrainiAuth.open({
          source:"account_menu",
          mode
        });
      }
    };

    openMenu.querySelector("[data-account-login]")?.addEventListener(
      "click",
      ()=>openAuthModal("signin")
    );

    openMenu.querySelector("[data-account-signup]")?.addEventListener(
      "click",
      ()=>openAuthModal("signup")
    );
  }

  function toggleFor(avatar){
    if(openMenu){
      close();
      return;
    }
    openFor(avatar);
  }

  function isGuest(){
    const auth=BrainiData.authState();
    return auth.status==="guest" || (auth.status==="authenticated" && auth.user?.is_anonymous===true);
  }

  function hydrateHeaderInvite(){
    if(/^\/(admin|auth)(\/|$)/.test(location.pathname)) return;
    document.querySelectorAll(".topbar .nav").forEach(nav=>{
      const right=nav.querySelector(".nav-right");
      if(!right) return;
      let entry=headerInvites.get(nav);
      if(!entry){
        const slot=document.createElement("div");
        slot.className="header-account-invite";
        const button=document.createElement("button");
        button.type="button";
        button.className="header-account-button";
        button.dataset.headerSignup="";
        button.title="Keep your scores and progress across devices";
        const status=document.createElement("span");
        status.className="header-account-status";
        status.setAttribute("role","status");
        status.hidden=true;
        slot.append(button,status);
        right.prepend(slot);
        entry={slot,button,status,pending:false};
        headerInvites.set(nav,entry);
        button.addEventListener("click",async()=>{
          if(entry.pending || !isGuest()) return;
          close();
          entry.pending=true;
          status.hidden=true;
          hydrateHeaderInvite();
          try{
            if(!window.BrainiAuth?.open && window.BrainiPerf?.ensureCloud) await BrainiPerf.ensureCloud();
            if(!isGuest()) return;
            if(!window.BrainiAuth?.open) throw Error("Sign-up unavailable");
            await BrainiAuth.open({source:"header",mode:"signup"});
          }catch{
            if(isGuest()){
              status.textContent="Sign-up is unavailable right now. Please try again.";
              status.hidden=false;
            }
          }finally{
            entry.pending=false;
            hydrateHeaderInvite();
          }
        });
      }
      const visible=isGuest();
      entry.slot.hidden=!visible;
      nav.classList.toggle("has-header-account-invite",visible);
      entry.button.disabled=entry.pending;
      entry.button.setAttribute("aria-busy",String(entry.pending));
      entry.button.textContent=entry.pending?"Opening…":"Create free account";
      if(!visible){entry.status.hidden=true;entry.status.textContent="";}
    });
  }

  // Nov 2026: the home page invites guests to a free account under the hero. It stays hidden until the
  // visitor is known to be a guest, opens sign-up only on click and a dismissal lasts 30 days.
  const HOME_INVITE_KEY="brainilab:home-account-invite-dismissed";
  function homeInviteDismissed(){
    try{const at=Number(localStorage.getItem(HOME_INVITE_KEY));return at>0&&Date.now()-at<30*864e5;}catch{return false;}
  }
  function hydrateHomeInvite(){
    const box=document.querySelector("[data-home-account-invite]");
    if(!box) return;
    if(!box.dataset.ready){
      box.dataset.ready="1";
      const join=box.querySelector("[data-home-account-join]"),status=box.querySelector("[role=status]");
      join?.addEventListener("click",async()=>{
        if(join.disabled||!isGuest()) return;
        join.disabled=true;
        if(status) status.hidden=true;
        try{
          if(!window.BrainiAuth?.open && window.BrainiPerf?.ensureCloud) await BrainiPerf.ensureCloud();
          if(!isGuest()) return;
          if(!window.BrainiAuth?.open) throw Error("Sign-up unavailable");
          await BrainiAuth.open({source:"home_invite",mode:"signup"});
        }catch{
          if(isGuest()&&status){status.textContent="Sign-up is unavailable right now. Please try again.";status.hidden=false;}
        }finally{
          join.disabled=false;
        }
      });
      box.querySelector("[data-home-account-dismiss]")?.addEventListener("click",()=>{
        try{localStorage.setItem(HOME_INVITE_KEY,String(Date.now()));}catch{}
        box.hidden=true;
        document.querySelector(".home-hero-primary")?.focus({preventScroll:true});
      });
    }
    box.hidden=!isGuest()||homeInviteDismissed();
  }

  function hydrate(){
    hydrateHeaderInvite();
    hydrateHomeInvite();
    const p=BrainiData.player();

    document.querySelectorAll(".avatar").forEach(avatar=>{
      if(window.BrainiProgressUI){
        const level=BrainiProgressUI.xpProgress(p.level,p.xp).level;
        const t=BrainiProgressUI.tier(level);
        const classes=new Set(["rank-header-avatar",...BrainiProgressUI.avatarClass(level).split(" ")]);
        for(const name of [...avatar.classList]){
          if(name.startsWith("rank-")&&!classes.has(name))avatar.classList.remove(name);
        }
        for(const name of classes)if(!avatar.classList.contains(name))avatar.classList.add(name);
        const title=`${p.displayName||"My BrainiLab"} · ${t.name} · Level ${level}`;
        if(avatar.title!==title)avatar.title=title;
      }

      BrainiProgressUI.setAvatarMarkup(avatar,BrainiProgressUI.avatarImageMarkup(p,{compact:true}));
      if(['blue','green','copper','gold','orbit'].includes(p.avatarFrame)||p.avatarFrame==='midnight'&&p.avatarEntitlements?.includes('midnight'))avatar.dataset.socialFrame=p.avatarFrame;else delete avatar.dataset.socialFrame;
    });
  }

  // Capture-phase interception prevents the anchor's normal navigation from
  // winning before the menu has a chance to open.
  document.addEventListener(
    "click",
    e=>{
      const avatar=e.target.closest?.(".avatar");

      if(avatar){
        e.preventDefault();
        e.stopPropagation();
        toggleFor(avatar);
        return;
      }

      if(openMenu && !openMenu.contains(e.target)){
        close();
      }
    },
    true
  );

  document.addEventListener("keydown",e=>{
    if(e.key==="Escape") close();
  });

  window.addEventListener("resize",close);
  window.addEventListener("scroll",close,{passive:true});

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",hydrate,{once:true});
  else hydrate();
  window.addEventListener("brainilab:authchange",hydrate);
  window.addEventListener("brainilab:profilechange",hydrate);
  window.addEventListener("brainilab:progressionchange",hydrate);
  window.addEventListener("brainilab:daychange",close);
  window.addEventListener("brainilab:datachange",hydrate);
  window.addEventListener('brainilab:halloween-entitlements',()=>{
    hydrate();
    // Replace only artwork: an open menu keeps its links, focus and handlers.
    const portrait=openMenu?.querySelector('.account-menu-avatar');
    if(portrait){
      const player=BrainiData.player();
      BrainiProgressUI.setAvatarMarkup(portrait,BrainiProgressUI.avatarImageMarkup(player,{compact:true}));
      if(BrainiProgressUI.avatarFrameAttribute(player))portrait.dataset.socialFrame=player.avatarFrame;
      else delete portrait.dataset.socialFrame;
    }
  });

  return {
    hydrate,
    close,
    openFor
  };
})();
