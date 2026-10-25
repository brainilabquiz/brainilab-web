/*
  BrainiLab Supabase Auth adapter — Step 1 backend
  ------------------------------------------------
  Real responsibilities in this step:
  - Supabase session
  - Google OAuth
  - email/password sign-up
  - email/password sign-in
  - sign-out
  - password reset

  Player/profile/game data remains in BrainiData/localStorage until Step 2.
*/
window.BrainiBackendAuth = (function(){
  let client=null;
  let initialized=false;
  let listenerSubscription=null;
  let playerSessionPromise=null;
  let claimPromise=null;
  let claimOwner=null;
  let analyticsAccountRevision=0;
  const guestClaimKey="brainilab_guest_claim_v1";

  function readGuestClaim(){
    try{return JSON.parse(localStorage.getItem(guestClaimKey)||"null");}catch{return null;}
  }

  async function prepareGuestClaim(){
    const sb=getClient();
    const {data,error}=await sb.auth.getSession();
    if(error) throw error;
    const user=data?.session?.user;
    if(!user?.is_anonymous) return;
    let claim=readGuestClaim();
    if(claim?.guestId!==user.id){
      const bytes=crypto.getRandomValues(new Uint8Array(32));
      claim={guestId:user.id,token:Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("")};
    }
    claim.style=window.BrainiGuestStyle?.capture?.()||claim.style||null;
    const oldHalloween=window.BrainiHalloweenLegacy?.capture?.();
    if(oldHalloween?.length)claim.halloween=oldHalloween;
    // Persist BEFORE leaving this origin for OAuth/email confirmation.
    localStorage.setItem(guestClaimKey,JSON.stringify(claim));
    const result=await sb.rpc("prepare_brainilab_guest_claim",{p_token:claim.token});
    if(result.error) throw result.error;
  }

  async function claimGuestProgress(session){
    if(!session?.user || session.user.is_anonymous || !readGuestClaim()) return;
    if(claimPromise){if(claimOwner!==session.user.id)throw Error('Account changed during guest transfer.');return claimPromise;}
    claimOwner=session.user.id;
    claimPromise=(async()=>{
      const claim=readGuestClaim();
      const {data,error}=await getClient().rpc("claim_brainilab_guest_results",{p_token:claim.token});
      if(error) throw error;
      const check=await getClient().auth.getSession();
      if(check.error||check.data?.session?.user?.id!==session.user.id)throw Error('Account changed during guest transfer.');
      await BrainiData.api.completeGuestClaim?.({...data,fromUserId:claim.guestId,toUserId:session.user.id});
      let user=session.user;
      try{
        await window.BrainiHalloweenLegacy?.recover?.(session.user,claim.halloween);
        user=await window.BrainiGuestStyle?.restore?.(session.user,claim.style)||user;
      }
      catch(error){console.warn('BrainiLab appearance transfer pending:',error.message||error);return user;}
      localStorage.removeItem(guestClaimKey);
      return user;
    })();
    try{return await claimPromise;}finally{claimPromise=null;claimOwner=null;}
  }

  async function ensurePlayerSession(){
    if(playerSessionPromise) return playerSessionPromise;
    const create=async()=>{
      const existing=await getSession();
      if(existing?.user) return existing;
      const {data,error}=await getClient().auth.signInAnonymously();
      if(error) throw error;
      await syncSession(data?.session);
      return data?.session||null;
    };
    // Two tabs completing a first game must share one guest identity.
    playerSessionPromise=globalThis.navigator?.locks?.request
      ? navigator.locks.request("brainilab-guest-session",create)
      : create();
    try{return await playerSessionPromise;}finally{playerSessionPromise=null;}
  }

  function hasPlayerSession(){
    const auth=BrainiData.authState();
    return !!(auth.guestUserId || (auth.status==="authenticated" && auth.user));
  }

  function config(){
    return window.BRAINI_SUPABASE || {};
  }

  function isConfigured(){
    const c=config();
    return /^https:\/\/.+\.supabase\.co$/i.test((c.url||"").trim())
      && (c.publishableKey||"").trim().length>20;
  }

  function getClient(){
    if(client) return client;
    if(!isConfigured()) return null;
    if(!window.supabase || typeof window.supabase.createClient!=="function"){
      throw new Error("Supabase JS did not load. Check your internet connection or the CDN script.");
    }

    const c=config();
    client=window.supabase.createClient(c.url,c.publishableKey,{
      auth:{
        persistSession:true,
        autoRefreshToken:true,
        detectSessionInUrl:true
      }
    });
    return client;
  }

  function sameOriginUrl(value,fallbackPath){
    try{
      if(value){
        const candidate=new URL(value,location.origin);

        // Never let a local/dev build jump to a different local origin.
        // This prevents OAuth from returning into an older BrainiLab copy
        // running on another localhost/port.
        if(candidate.origin===location.origin){
          return candidate.href;
        }

        if(!["localhost","127.0.0.1"].includes(location.hostname)){
          return candidate.href;
        }
      }
    }catch(err){}

    return new URL(fallbackPath,location.origin+"/").href;
  }

  function profileRedirectUrl(){
    const c=config();

    if(c.authRedirectUrl){
      return sameOriginUrl(
        c.authRedirectUrl,
        "profile/index.html"
      );
    }

    const profileLink=document.querySelector(
      'a[href*="profile/index.html"],a[href*="/profile/"]'
    );

    if(profileLink){
      const href=new URL(
        profileLink.getAttribute("href"),
        location.href
      );

      // The page that initiated OAuth owns the origin.
      href.protocol=location.protocol;
      href.host=location.host;
      return href.href;
    }

    return new URL(
      "profile/index.html",
      location.origin+"/"
    ).href;
  }

  function passwordResetRedirectUrl(){
    const c=config();

    return sameOriginUrl(
      c.passwordResetRedirectUrl,
      "auth/reset-password/index.html"
    );
  }

  function providerFromUser(user){
    return user?.app_metadata?.provider
      || user?.identities?.[0]?.provider
      || "email";
  }

  async function syncAnalyticsAccount(session){
    const analytics=window.BrainiSiteAnalytics;
    if(!analytics?.setAccountState)return;
    const revision=++analyticsAccountRevision;
    const user=session?.user;
    if(!user||user.is_anonymous){analytics.setAccountState('included');return;}
    analytics.setAccountState('pending');
    try{
      // Existing sessions can contain old metadata. A read from Auth also applies
      // an account exclusion on devices whose token has not refreshed yet.
      const {data,error}=await getClient().auth.getUser();
      if(revision!==analyticsAccountRevision)return;
      if(error||data?.user?.id!==user.id)return;
      analytics.setAccountState(data.user.app_metadata?.analytics_excluded===true?'excluded':'included');
    }catch{
      // Keep statistics paused on lookup failure; account and game sync continue.
    }
  }

  async function syncSession(session){
    // Privacy reads must not delay or change player/profile/progress sync.
    void syncAnalyticsAccount(session);
    if(session?.user?.is_anonymous){
      window.BrainiGuestStyle?.bindGuest?.(BrainiData.authState(),session.user.id);
      await BrainiData.api.syncExternalGuestUser(session.user);
    }else if(session?.user){
      const user=await claimGuestProgress(session)||session.user;
      await BrainiData.api.syncExternalAuthUser(user,providerFromUser(user));
    }else{
      const local=BrainiData.authState();
      if(local?.status==="authenticated" || local?.guestUserId){
        await BrainiData.api.clearExternalAuthUser();
      }
    }
  }

  async function init(){
    if(initialized) return {configured:isConfigured(),client};
    initialized=true;
    if(!isConfigured()) return {configured:false,client:null};

    const sb=getClient();
    const {data,error}=await sb.auth.getSession();
    if(error) console.warn("BrainiLab Supabase getSession:",error.message);
    await syncSession(data?.session||null);

    const listener=sb.auth.onAuthStateChange((event,session)=>{
      setTimeout(async()=>{
        try{
          await syncSession(session);
          window.dispatchEvent(new CustomEvent("brainilab:backend-auth",{detail:{event,session}}));
        }catch(err){
          console.error("BrainiLab auth sync:",err);
        }
      },0);
    });
    listenerSubscription=listener?.data?.subscription||null;
    return {configured:true,client:sb,session:data?.session||null};
  }

  async function signInWithGoogle(){
    const sb=getClient();
    if(!sb) throw new Error("Supabase is not configured yet.");
    await prepareGuestClaim();

    try{
      sessionStorage.setItem(
        "brainilab_oauth_origin",
        location.origin
      );
      sessionStorage.setItem(
        "brainilab_oauth_build",
        window.BRAINI_BUILD||"33"
      );
    }catch(err){}

    const {data,error}=await sb.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:profileRedirectUrl()}
    });

    if(error) throw error;
    return data;
  }

  async function signUpWithEmail(email,password){
    const sb=getClient();
    if(!sb) throw new Error("Supabase is not configured yet.");
    await prepareGuestClaim();
    const {data,error}=await sb.auth.signUp({
      email:(email||"").trim().toLowerCase(),
      password,
      options:{emailRedirectTo:profileRedirectUrl()}
    });
    if(error) throw error;
    if(data?.session) await syncSession(data.session);
    return data;
  }

  async function signInWithEmail(email,password){
    const sb=getClient();
    if(!sb) throw new Error("Supabase is not configured yet.");
    await prepareGuestClaim();
    const {data,error}=await sb.auth.signInWithPassword({
      email:(email||"").trim().toLowerCase(),
      password
    });
    if(error) throw error;
    if(data?.session) await syncSession(data.session);
    return data;
  }

  async function requestPasswordReset(email){
    const sb=getClient();
    if(!sb) throw new Error("Supabase is not configured yet.");
    const {data,error}=await sb.auth.resetPasswordForEmail(
      (email||"").trim().toLowerCase(),
      {redirectTo:passwordResetRedirectUrl()}
    );
    if(error) throw error;
    return data;
  }

  async function updatePassword(password){
    const sb=getClient();
    if(!sb) throw new Error("Supabase is not configured yet.");
    const {data,error}=await sb.auth.updateUser({password});
    if(error) throw error;
    return data;
  }

  async function signOut(){
    const sb=getClient();
    if(!sb){
      await BrainiData.api.clearExternalAuthUser();
      return;
    }
    // The profile action says "This browser"; keep phone and other sessions.
    const {error}=await sb.auth.signOut({scope:'local'});
    if(error) throw error;
    localStorage.removeItem(guestClaimKey);
    await BrainiData.api.clearExternalAuthUser();
  }

  async function getSession(){
    const sb=getClient();
    if(!sb) return null;
    const {data,error}=await sb.auth.getSession();
    if(error) throw error;
    await claimGuestProgress(data?.session);
    return data?.session||null;
  }

  function destroy(){
    analyticsAccountRevision++;
    listenerSubscription?.unsubscribe?.();
    listenerSubscription=null;
    client=null;
    initialized=false;
  }

  return {
    init,isConfigured,getClient,getSession,ensurePlayerSession,hasPlayerSession,
    signInWithGoogle,signUpWithEmail,signInWithEmail,
    requestPasswordReset,updatePassword,signOut,
    profileRedirectUrl,passwordResetRedirectUrl,destroy
  };
})();
