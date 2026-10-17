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
    // Click, keyboard activation, deep links and browser history share one loader.
    if(section==="social")window.BrainiPerf?.loadFeature?.("profile-social.bundle.js");
  }

  let recentRequest=0,recentOwner=null;
  const activityOwner=()=>{
    const auth=BrainiData.authState();
    return auth.user?.id||auth.guestUserId||auth.anonymousPlayerId||'local';
  };
  async function hydrateRecentGames(){
    const request=++recentRequest,root=document.getElementById('recentResults');
    if(!root||!window.BrainiAnalytics?.fetchStats)return;
    const folded=root.closest('[data-profile-activity]');
    if(folded&&!folded.open)return;
    const owner=activityOwner();
    if(recentOwner!==null && recentOwner!==owner)root.replaceChildren();
    recentOwner=owner;
    const hasRows=!!root.querySelector('.data-row');
    root.setAttribute('aria-busy','true');
    if(!hasRows && !BrainiData.recentResults().length)root.textContent='Loading recent games…';
    try{
      const snapshot=await BrainiAnalytics.fetchStats(0);
      if(request!==recentRequest||owner!==activityOwner())return;
      if(!Array.isArray(snapshot?.recent_results)){BrainiUI.renderRecentResults(root,5);return;}
      const rows=snapshot.recent_results.map(r=>({gameId:r.game_id,playedAt:r.completed_at,score:r.score,correct:r.correct_answers,won:r.special?.won,attempts:r.special?.attempts}));
      BrainiUI.renderRecentResults(root,5,rows);
    }catch(error){
      if(request===recentRequest&&owner===activityOwner()&&!hasRows&&!BrainiData.recentResults().length)root.textContent='Recent games could not be loaded. Please try again.';
    }finally{if(request===recentRequest)root.removeAttribute('aria-busy');}
  }

  function dailyProgress(daily){
    const day=daily.key||BrainiData.dateForDailyNumber(daily.number),model=BrainiDailyRules.model(day);
    const completed=new Set(daily.completedGames||[]);
    if(model.version!=='daily-choice-v1')return {legacy:true,text:`${completed.size} of ${model.maxGames} games completed`,label:'Open today’s games',href:'/daily-quiz/'};
    const main=completed.has(model.primary),bonus=model.choices.includes(daily.bonusChoice)?daily.bonusChoice:null,extra=!!bonus&&completed.has(bonus);
    return {main,extra,mainText:main?'Complete':'Ready to play',extraText:extra?'Complete':bonus?'Ready to continue':'Optional',
      label:!main?'Play today’s Daily':extra?'See today’s results':bonus?'Continue your extra':'Choose an optional extra',href:main&&!extra?'/daily-quiz/#daily-extras':'/daily-quiz/'};
  }
  function hydrateDailyProgress(){
    const root=document.querySelector('[data-profile-daily-summary]');if(!root)return;
    const state=dailyProgress(BrainiData.daily());root.replaceChildren();
    if(state.legacy){root.textContent=state.text;}else{
      for(const [label,value,done] of [['Main Daily',state.mainText,state.main],['Extra game',state.extraText,state.extra]]){
        const row=document.createElement('div'),name=document.createElement('strong'),status=document.createElement('span');
        name.textContent=label;status.textContent=value;row.className=done?'is-complete':'';row.append(name,status);root.append(row);
      }
    }
    const action=document.querySelector('[data-profile-daily-action]');if(action){action.textContent=state.label+' →';action.href=state.href;}
  }

  // A single nearby goal, selected from the real cosmetic catalogue and ranks.
  // These are previews only: this function never equips items or grants XP.
  function nextGoal(person,progress){
    const rank=BrainiProgressUI.nextTier(progress.level),reward=window.BrainiRewardCatalog?.next(progress.currentXp);
    const rankXp=rank&&BrainiProgressUI.xpForLevel(rank.min);
    if(reward&&(!rank||reward.xp<=rankXp)){
      const labels={frame:'Avatar frame',title:'Profile title',glasses:'Glasses',hat:'Hat',prop:'Little extra',scene:'Profile background'};
      let art='';
      if(reward.kind==='scene')art=`<span class="profile-scene-sample" data-profile-scene="${reward.id}"></span>`;
      else if(reward.kind==='frame')art=`<span class="rank-avatar ${BrainiProgressUI.avatarClass(progress.level)}" data-profile-frame="${reward.id}">${BrainiProgressUI.avatarImageMarkup(person)}</span>`;
      else if(['glasses','hat','prop'].includes(reward.kind))art=BrainiAvatarDesign.markup({...person.avatarDesign,mode:'built',[reward.kind]:reward.id},reward.xp);
      else art='<span class="profile-goal-letter">Aa</span>';
      return {art,name:reward.name,detail:labels[reward.kind]||'Avatar extra',remaining:reward.xp-progress.currentXp,kind:reward.kind};
    }
    return rank?{art:`<span class="rank-avatar ${BrainiProgressUI.avatarClass(rank.min)}">${BrainiProgressUI.avatarImageMarkup(person)}</span>`,name:rank.name,detail:`Level ${rank.min}`,remaining:rankXp-progress.currentXp}:null;
  }
  function earningGuide(){
    return `<details class="profile-xp-guide"><summary data-xp-guide-toggle>How to earn XP <span aria-hidden="true">+</span></summary>
      <dl><div><dt><a href="/games/" data-progress-focus="guide-games">Finish a game</a><b>50 XP + answers</b></dt><dd>Add 5 XP per correct answer, up to 300 XP per round. Your first three completed rounds of each game earn XP each day.</dd></div>
      <div><dt><a href="/daily-quiz/" data-progress-focus="guide-daily">Main Daily</a><b>+250 XP bonus</b></dt><dd>Once a day, on top of your game XP. The extra game is optional.</dd></div>
      <div><dt><a href="/learn/paths/" data-progress-focus="guide-academy">Academy lessons</a><b>+40 XP</b></dt><dd>Sign in and finish a new lesson’s quiz. Each lesson earns XP once.</dd></div></dl>
      <p>XP builds your level and is never spent. Game scores decide your ranking. Practice rounds earn no XP. New XP rounds are available at 00:00 UTC.</p></details>`;
  }

  function hydrateRankHero(){
    const root=document.querySelector("[data-profile-rank-hero]");
    if(!root || !window.BrainiProgressUI) return;

    const p=BrainiData.player();
    const progress=BrainiProgressUI.xpProgress(p.level||1,p.xp||0);
    const tier=BrainiProgressUI.tier(progress.level);

    const goal=nextGoal(p,progress),format=n=>Number(n).toLocaleString('en-GB');
    const ranksOpen=!!root.querySelector('.profile-ranks[open]');
    const guideOpen=!!root.querySelector('.profile-xp-guide[open]');
    const focusKey=document.activeElement?.closest('[data-profile-rank-hero]')===root
      ? document.activeElement.dataset.progressFocus||(['ranks-toggle','xp-guide-toggle'].find(key=>document.activeElement.hasAttribute('data-'+key))) : null;
    root.innerHTML=`
      <span class="rank-avatar profile-progress-avatar ${BrainiProgressUI.avatarClass(progress.level)}" aria-hidden="true">${BrainiProgressUI.avatarImageMarkup(p)}</span>
      <div class="profile-rank-main"><span>Your level</span><h2>Level ${progress.level} <small>${tier.name}</small></h2>
        <p class="profile-level-goal">${progress.label}</p>
        <div class="profile-rank-progress" role="progressbar" aria-label="Progress to level ${progress.nextLevel}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progress.percent)}" aria-valuetext="${format(progress.earnedInLevel)} of ${format(progress.neededInLevel)} XP towards level ${progress.nextLevel}"><span style="width:${progress.percent}%"></span></div>
        <div class="profile-level-numbers"><strong>${format(progress.earnedInLevel)} <span>/ ${format(progress.neededInLevel)} XP</span></strong><small>${format(progress.currentXp)} total XP</small></div>
      </div>
      <div class="profile-next-rank">${goal?`<span class="profile-goal-art" aria-hidden="true">${goal.art}</span><span><small>Next unlock · ${goal.detail}</small><strong>${goal.name}</strong><span>${format(goal.remaining)} XP to go</span>${goal.kind?`<a href="#my-avatar" data-progress-goal-kind="${goal.kind}" data-progress-focus="reward">Take a look →</a>`:''}</span>`:`<span class="profile-top-rank">${BrainiIcons.rankHalo(tier.halo,'brain-rank-halo')}</span><span><small>Highest level rank</small><strong>${tier.name}</strong><span>Keep building your XP</span></span>`}</div>
      <div class="profile-level-footer">${earningGuide()}<a href="${p.streakSecuredToday?'/learn/paths/':'/daily-quiz/'}" class="profile-earn-action" data-progress-focus="earn">${p.streakSecuredToday?'Explore Academy':'Play today’s Daily'} <span aria-hidden="true">→</span></a></div>
      <div class="profile-optional-ranks">${BrainiProgressUI.ranksMarkup(p,{open:ranksOpen})}<a href="/rankings/" class="profile-rank-link" data-progress-focus="rankings">Your rankings →</a></div>`;
    root.querySelector('.profile-xp-guide').open=guideOpen;
    if(focusKey){
      const target=['ranks-toggle','xp-guide-toggle'].includes(focusKey)?`[data-${focusKey}]`:`[data-progress-focus="${focusKey}"]`;
      root.querySelector(target)?.focus({preventScroll:true});
    }
    const journey=document.querySelector('[data-profile-milestones]');
    if(journey){
      const best=Math.max(0,Number(p.bestStreak)||0);
      journey.innerHTML=[3,7,14,30].map(days=>`<div class="profile-milestone ${best>=days?'earned':''}"><span aria-hidden="true">${best>=days?'✓':'○'}</span><strong>${days} days</strong><small>${best>=days?'Reached':'Streak milestone'}</small></div>`).join('');
    }
    window.BrainiContinuity?.render?.();
    hydrateRecentGames();
    hydrateDailyProgress();
    window.BrainiProfileRewards?.render?.();
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
    document.querySelector('[data-profile-rank-hero]')?.addEventListener('click',event=>{
      const goal=event.target.closest('[data-progress-goal-kind]'),studio=document.querySelector('[data-profile-rewards]');
      if(!goal||!studio||!window.BrainiAvatarStudioUI)return;
      const pane=['glasses','hat','prop'].includes(goal.dataset.progressGoalKind)?'extras':'rewards';
      BrainiAvatarStudioUI.showPane(studio,pane);
      studio.querySelector(`[data-avatar-tab="${pane}"]`)?.focus({preventScroll:true});
    });
    document.querySelector('[data-profile-activity]')?.addEventListener('toggle',event=>{
      if(event.currentTarget.open){hydrateRankHero();}
    });
    document.querySelectorAll("[data-profile-tab]").forEach(btn=>{
      btn.onclick=()=>show(btn.dataset.profileTab,{push:true});
    });

    window.addEventListener("popstate",()=>show(selected()));
    window.addEventListener("brainilab:progressionchange",hydrateRankHero);
    window.addEventListener("brainilab:stylechange",hydrateRankHero);
    window.addEventListener("brainilab:daychange",hydrateRankHero);
    window.addEventListener("brainilab:authchange",()=>{renderSecurity();hydrateRankHero();});

    show(selected());
    hydrateRankHero();
    renderSecurity();
  }

  document.addEventListener("DOMContentLoaded",bind);

  return {show,hydrateRankHero,dailyProgress,hydrateDailyProgress};
})();
