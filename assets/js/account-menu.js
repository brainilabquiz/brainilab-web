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
          } account-menu-avatar">
            ${BrainiProgressUI.avatarImageMarkup(p)}
          </span>

          <div>
            <strong>${esc(p.displayName||"Braini Player")}</strong>
            <span class="account-level-label">Level ${progress?.level||1} <span class="account-tier">${tier?.name||"Rookie"}</span></span>
          </div>
        </div>

        <a role="menuitem" class="account-progress-link" href="${profileHref('progress')}">
          <span><strong>${Number(p.xp||0).toLocaleString()} XP</strong><small>${esc(progress?.label||'Start with a game')}</small></span>
          <i class="account-xp-track" role="progressbar" aria-label="Progress to level ${progress?.nextLevel||2}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress?.percent||0)}"><i style="width:${progress?.percent||0}%"></i></i>
          <span class="account-streak ${p.streakSecuredToday?'is-secured':''}"><span aria-hidden="true">🔥</span> ${streak} ${streak===1?'day':'days'} <small>${p.streakSecuredToday?'Done for today':'Daily not played today'}</small></span>
        </a>

        <a role="menuitem" class="account-popover-row account-popover-primary" href="${profileHref()}">
          <div>
            <strong>My BrainiLab</strong>
            <small>Overview, progress & stats</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("profile")}">
          <div>
            <strong>Edit Profile</strong>
            <small>Name, photo & public profile</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("social")}">
          <div>
            <strong>Groups & Friends</strong>
            <small>Your people, your teams</small>
          </div>
        </a>

        <a role="menuitem" class="account-popover-row" href="${profileHref("settings")}">
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
               <div>
                 <strong>Sign out</strong>
                 <small>Sign out of this browser while keeping your synced progress.</small>
               </div>
             </button>`
          : `
             <div class="account-popover-authbox" role="group" aria-label="Authentication actions">
               <button type="button" role="menuitem" class="account-popover-authbtn" data-account-login>
                 <div>
                   <strong>Log in</strong>
                   <small>Use your existing BrainiLab account.</small>
                 </div>
               </button>

               <button type="button" role="menuitem" class="account-popover-authbtn account-popover-authbtn-primary" data-account-signup>
                 <div>
                   <strong>Sign up</strong>
                   <small>Create an account and sync your progress.</small>
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

  function hydrate(){
    hydrateHeaderInvite();
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

      BrainiProgressUI.setAvatarMarkup(avatar,BrainiProgressUI.avatarImageMarkup(p));
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

  return {
    hydrate,
    close,
    openFor
  };
})();
