/*
  BrainiLab My BrainiLab Sections — V27
*/
window.BrainiProfileSections=(function(){
  const valid=["progress","stats","profile","social","settings"];

  function selected(){
    const params=new URLSearchParams(location.search);
    const s=params.get("section")||"progress";
    return valid.includes(s)?s:"progress";
  }

  function show(section,{push=false}={}){
    if(!valid.includes(section)) section="progress";

    document.querySelectorAll("[data-profile-section]").forEach(el=>{
      el.hidden=el.dataset.profileSection!==section;
    });

    document.querySelectorAll("[data-profile-tab]").forEach(btn=>{
      btn.classList.toggle("active",btn.dataset.profileTab===section);
      btn.setAttribute(
        "aria-current",
        btn.dataset.profileTab===section?"page":"false"
      );
    });

    if(push){
      const url=new URL(location.href);
      url.searchParams.set("section",section);
      history.pushState({},document.title,url.pathname+url.search);
    }

    if(section==="progress"){
      hydrateRankHero();
    }

    if(section==="stats" && window.BrainiStatsUI){
      BrainiStatsUI.render();
    }
  }

  let recentRequest=0;
  async function hydrateRecentGames(){
    const request=++recentRequest,root=document.getElementById('recentResults');
    if(!root||!window.BrainiAnalytics?.fetchStats)return;
    try{
      const snapshot=await BrainiAnalytics.fetchStats(0);
      if(request!==recentRequest||!Array.isArray(snapshot?.recent_results))return;
      const rows=snapshot.recent_results.map(r=>({gameId:r.game_id,playedAt:r.completed_at,score:r.score,correct:r.correct_answers,won:r.special?.won,attempts:r.special?.attempts}));
      BrainiUI.renderRecentResults(root,5,rows);
    }catch(error){
      if(request===recentRequest&&!BrainiData.recentResults().length)root.textContent='Recent games could not be loaded. Please try again.';
    }
  }

  function hydrateRankHero(){
    const root=document.querySelector("[data-profile-rank-hero]");
    if(!root || !window.BrainiProgressUI) return;

    const p=BrainiData.player();
    const progress=BrainiProgressUI.xpProgress(p.level||1,p.xp||0);
    const tier=BrainiProgressUI.tier(progress.level);
    let photo="";try{const url=new URL(p.avatarUrl);if(url.protocol==="https:")photo=url.href.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;",'\'':"&#39;"}[c]));}catch{}

    root.innerHTML=`
      <span class="rank-avatar profile-progress-avatar ${BrainiProgressUI.avatarClass(progress.level)}" aria-hidden="true">${photo?`<img src="${photo}" alt="">`:BrainiProgressUI.defaultAvatarMarkup()}</span>
      <div class="profile-rank-main"><span>Your level</span><h2>Level ${progress.level} <small>${tier.name}</small></h2>
        <p>${Number(p.xp||0).toLocaleString()} XP earned</p>
        <div class="profile-rank-progress" role="progressbar" aria-label="Progress to level ${progress.nextLevel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.percent)}"><span style="width:${progress.percent}%"></span></div>
        <small>${progress.label}</small>
      </div>
      <a href="/rankings/" class="profile-rank-link">Your rankings →</a>`;
    const journey=document.querySelector('[data-profile-milestones]');
    if(journey){
      const best=Math.max(0,Number(p.bestStreak)||0);
      journey.innerHTML=[3,7,14,30].map(days=>`<div class="profile-milestone ${best>=days?'earned':''}"><span aria-hidden="true">${best>=days?'✓':'○'}</span><strong>${days} days</strong><small>${best>=days?'Reached':'Streak milestone'}</small></div>`).join('');
    }
    window.BrainiContinuity?.render?.();
    hydrateRecentGames();
  }


  function renderSecurity(){
    const root=document.querySelector("[data-profile-security-root]");
    if(!root) return;

    const auth=BrainiData.authState();
    const p=BrainiData.player();

    if(auth.status!=="authenticated"){
      root.innerHTML=`
        <div class="profile-security-card">
          <h2>Account & Security</h2>
          <p>You are currently playing as a guest on this browser.</p>
          <button class="btn" type="button" data-security-signin>Save my progress</button>
        </div>`;
      root.querySelector("[data-security-signin]")?.addEventListener(
        "click",
        ()=>BrainiAuth.open({source:"profile_security"})
      );
      return;
    }

    root.innerHTML=`
      <div class="profile-security-grid">
        <section class="profile-security-card">
          <span class="profile-settings-kicker">Account</span>
          <h2>Sign-in & security</h2>
          <dl>
            <dt>Email</dt><dd>${auth.user?.email||"—"}</dd>
            <dt>Provider</dt><dd>${auth.provider||"Account"}</dd>
            <dt>Account ID</dt><dd>${auth.user?.id ? auth.user.id.slice(0,8)+"…" : "—"}</dd>
          </dl>
          ${auth.provider==="email"
            ? `<button class="btn-light" type="button" data-security-password>Send password reset email</button>`
            : `<p class="profile-security-note">Password and sign-in security are managed by ${auth.provider==="google"?"Google":"your authentication provider"}.</p>`
          }
        </section>

        <section class="profile-security-card">
          <span class="profile-settings-kicker">Privacy</span>
          <h2>Public identity</h2>
          <p>
            Public rankings are ${auth.leaderboard?.enabled
              ? `<strong>enabled</strong> as ${auth.leaderboard.displayName||p.displayName}`
              : "<strong>private</strong>"
            }.
          </p>
          <a class="btn-light" href="?section=profile">Edit ranking privacy</a>
        </section>

        <section class="profile-security-card">
          <span class="profile-settings-kicker">Session</span>
          <h2>This browser</h2>
          <p>Signing out removes this account session from the browser. Synced progress stays in BrainiLab.</p>
          <button class="auth-signout" type="button" data-security-signout>Sign out</button>
        </section>
      </div>`;

    root.querySelector("[data-security-password]")?.addEventListener(
      "click",
      async()=>{
        try{
          await BrainiBackendAuth.requestPasswordReset(auth.user.email);
          if(typeof showToast==="function") showToast("Password reset email sent");
        }catch(err){
          if(typeof showToast==="function") showToast(err.message||"Could not send reset email");
        }
      }
    );

    root.querySelector("[data-security-signout]")?.addEventListener(
      "click",
      async()=>{
        if(!confirm("Sign out of BrainiLab on this browser?")) return;
        if(window.BrainiBackendAuth?.isConfigured?.()){
          await BrainiBackendAuth.signOut();
        }else{
          await BrainiData.api.signOut();
        }
        location.href="/";
      }
    );
  }

  function bind(){
    document.querySelectorAll("[data-profile-tab]").forEach(btn=>{
      btn.onclick=()=>show(btn.dataset.profileTab,{push:true});
    });

    window.addEventListener("popstate",()=>show(selected()));
    window.addEventListener("brainilab:progressionchange",hydrateRankHero);
    window.addEventListener("brainilab:daychange",hydrateRankHero);
    window.addEventListener("brainilab:authchange",renderSecurity);

    show(selected());
    hydrateRankHero();
    renderSecurity();
  }

  document.addEventListener("DOMContentLoaded",bind);

  return {show,hydrateRankHero};
})();
