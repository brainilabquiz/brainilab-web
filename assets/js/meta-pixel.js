/* BrainiLab Meta Pixel: explicit marketing consent, no account/score data. */
window.BrainiMarketing = (function(){
  if(window.BrainiMarketing) return window.BrainiMarketing;
  const pixelId="2674204419702933";
  const consentKey="brainilab_marketing_consent_v1";
  const maxAge=180*86400000;
  let choice=readChoice(), initialized=false, pageViewed=false, panel=null;
  const completed=new Set();

  function readChoice(){
    try{
      const saved=JSON.parse(localStorage.getItem(consentKey)||"null");
      return saved && typeof saved.allowed==="boolean" && saved.at<=Date.now()
        && Date.now()-saved.at<maxAge ? saved.allowed : null;
    }catch{return null;}
  }

  function safePage(){
    if(!["brainilabgames.com","www.brainilabgames.com"].includes(location.hostname)) return false;
    if(/^\/(admin|auth)(\/|$)/.test(location.pathname)) return false;
    const params=new URLSearchParams(location.search+"&"+location.hash.slice(1));
    return !["code","access_token","refresh_token","token_hash","error_description","email","password"].some(k=>params.has(k));
  }

  function enabled(){return choice===true && safePage();}

  function activate(){
    if(!enabled()) return;
    if(!initialized){
      if(!window.fbq){
        const fbq=function(){fbq.callMethod ? fbq.callMethod.apply(fbq,arguments) : fbq.queue.push(arguments);};
        fbq.push=fbq; fbq.loaded=true; fbq.version="2.0"; fbq.queue=[];
        window.fbq=fbq; window._fbq=fbq;
      }
      // Explicit events only; never enable automatic advanced matching or CAPI.
      window.fbq.disablePushState=true;
      window.fbq("consent","grant");
      window.fbq("set","autoConfig",false,pixelId);
      window.fbq("init",pixelId);
      initialized=true;
      if(!document.querySelector('script[data-brainilab-meta]')){
        const script=document.createElement("script");
        script.async=true; script.src="https://connect.facebook.net/en_US/fbevents.js";
        script.dataset.brainilabMeta="1";
        document.head.appendChild(script);
      }
    }else window.fbq("consent","grant");
    if(!pageViewed){
      window.fbq("trackSingle",pixelId,"PageView");
      pageViewed=true;
    }
  }

  function revoke(){
    if(initialized){
      // If the SDK has not arrived, discard queued events before revoking.
      if(!window.fbq.callMethod) window.fbq.queue=window.fbq.queue.filter(args=>!/^track/.test(args[0]));
      window.fbq("consent","revoke");
    }
    for(const name of ["_fbp","_fbc"]){
      for(const domain of ["",location.hostname,".brainilabgames.com"]){
        document.cookie=name+"=; Max-Age=0; Path=/; SameSite=Lax"+(domain?"; Domain="+domain:"");
      }
    }
  }

  function choose(allowed,statistics=allowed){
    choice=allowed===true;
    window.BrainiSiteAnalytics?.setConsent(statistics===true);
    try{localStorage.setItem(consentKey,JSON.stringify({allowed:choice,at:Date.now()}));}catch{}
    if(choice) activate(); else revoke();
    if(panel){panel.remove();panel=null;}
  }

  function showPreferences(){
    if(panel) return;
    panel=document.createElement("aside");
    panel.className="marketing-consent";
    panel.setAttribute("aria-label","Optional cookie choices");
    panel.innerHTML='<div><strong>Your cookie choices</strong><p>Optional cookies help us understand which articles and games people enjoy (Google Analytics) and measure visits from our ads (Meta). You can play either way. <a href="/cookies/#privacy-choices">Cookie details</a></p><details class="cookie-settings"><summary>Choose by purpose</summary><label><input type="checkbox" data-statistics-choice/> Usage statistics · Google Analytics</label><label><input type="checkbox" data-ad-choice/> Ad measurement · Meta</label><button type="button" data-save-cookie-choices>Save my choices</button></details></div><div class="marketing-consent-actions"><button type="button" data-marketing-reject>Reject optional cookies</button><button type="button" data-marketing-accept>Accept optional cookies</button></div>';
    panel.querySelector('[data-statistics-choice]').checked=window.BrainiSiteAnalytics?.isAllowed()===true;
    panel.querySelector('[data-ad-choice]').checked=choice===true;
    panel.querySelector('[data-save-cookie-choices]').onclick=()=>choose(panel.querySelector('[data-ad-choice]').checked,panel.querySelector('[data-statistics-choice]').checked);
    panel.querySelector("[data-marketing-reject]").onclick=()=>choose(false);
    panel.querySelector("[data-marketing-accept]").onclick=()=>choose(true);
    document.body.appendChild(panel);
  }

  window.addEventListener("brainilab:datachange",event=>{
    if(!enabled() || event.detail?.type!=="game_result") return;
    const {gameId,result}=event.detail;
    if(!result || result.practice || result.tryFirst || result.dailyReplayBlocked) return;
    const id=result.clientResultId;
    if(!id || completed.has(id) || !/^[a-z0-9]{1,30}$/.test(gameId||"")) return;
    completed.add(id);
    activate();
    window.fbq("trackSingleCustom",pixelId,"GameCompleted",{
      game_id:gameId,
      mode:result.dailyNumber!=null?"daily":"anytime"
    });
  });

  window.addEventListener("storage",event=>{
    if(event.key!==consentKey && event.key!==null) return;
    choice=readChoice();
    if(choice===true) activate(); else revoke();
    if(choice!==null && panel){panel.remove();panel=null;}
  });

  function boot(){
    document.addEventListener("click",event=>{
      if(!event.target.closest?.("[data-manage-privacy]")) return;
      event.preventDefault(); showPreferences();
    });
    if(choice===true) activate();
    if((choice===null || window.BrainiSiteAnalytics?.needsConsent()) && safePage()) showPreferences();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot,{once:true});
  else boot();
  return {pixelId,showPreferences};
})();
