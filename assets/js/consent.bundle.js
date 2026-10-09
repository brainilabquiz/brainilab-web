/* ===== site-analytics.js ===== */

/* GA4: basic consent mode. No Google request before an explicit statistics choice. */
window.BrainiSiteAnalytics=(()=>{
  if(window.BrainiSiteAnalytics)return window.BrainiSiteAnalytics;
  const id='G-97WN37VLHV',key='brainilab_statistics_consent_v1',maxAge=180*86400000;
  let choice=read(),loaded=false,viewed=false,articleRead=false,activeSeconds=0;
  const completed=new Set();
  // Game-owned round objects deduplicate starts without retaining player identifiers.
  const started=new WeakSet();
  const finishedPractice=new WeakSet(),entryKey='brainilab_growth_entry_v1';
  let entry=null;
  function entryContext(){
    const now=Date.now();let old=entry;try{old=JSON.parse(localStorage.getItem(entryKey))||entry;}catch{}
    const channels=['organic_search','paid','social','referral','direct','unknown'];
    if(old&&channels.includes(old.channel)&&typeof old.path==='string'&&old.path.length<180&&/^\/(?:[a-z0-9-]+\/)*$/.test(old.path)&&now>=old.startedAt&&now>=old.lastAt&&now-old.lastAt<1800000){entry={channel:old.channel,path:old.path,startedAt:old.startedAt,lastAt:now};}
    else{
      let host='';try{host=new URL(document.referrer).hostname;}catch{}
      const query=new URLSearchParams(location.search);
      const searchHosts=/^(?:(?:www|search)\.)?(?:google\.(?:com|es|co\.uk|fr|de|it|ca|com\.au)|bing\.com|duckduckgo\.com|search\.yahoo\.com|ecosia\.org|search\.brave\.com)$/;
      const channel=['gclid','dclid','msclkid'].some(k=>query.has(k))?'paid':campaign().campaign_source?'social':searchHosts.test(host)?'organic_search':host&&!['brainilabgames.com','www.brainilabgames.com'].includes(host)?'referral':host?'unknown':'direct';
      const landing=/^\/(?:[a-z0-9-]+\/)*$/.test(path())&&path().length<180?path():'/';
      entry={channel,path:landing,startedAt:now,lastAt:now};
    }
    try{localStorage.setItem(entryKey,JSON.stringify(entry));}catch{}
    return entry;
  }
  function practiceComplete(gameId,round){
    if(gameId!=='europeflags'||!allowed()||!round||typeof round!=='object'||!started.has(round)||finishedPractice.has(round))return;
    finishedPractice.add(round);send('practice_complete',{game_id:gameId});
  }
  const measuredGames=new Set(['brainmix','worldflags','worldcapitals','generalknowledge','science','history','sports','mathrush','numberroute','connections','brainiword']);
  function gameStart(gameId,round,mode='anytime'){
    if(gameId==='europeflags'&&mode==='practice'){
      if(!allowed()||!round||typeof round!=='object'||started.has(round))return;
      started.add(round);send('practice_start',{game_id:gameId});return;
    }
    if(!allowed()||!measuredGames.has(gameId)||!round||typeof round!=='object'||started.has(round)||!['daily','anytime'].includes(mode))return;
    started.add(round);send('game_start',{game_id:gameId,mode});
  }
  function read(){try{const c=JSON.parse(localStorage.getItem(key));return c&&typeof c.allowed==='boolean'&&c.at<=Date.now()&&Date.now()-c.at<maxAge?c.allowed:null;}catch{return null;}}
  function safe(){return ['brainilabgames.com','www.brainilabgames.com'].includes(location.hostname)&&!/^\/(admin|auth|profile)(\/|$)/.test(location.pathname)&&![...new URLSearchParams(location.search+'&'+location.hash.slice(1)).keys()].some(k=>/^(code|access_token|refresh_token|token_hash|error_description|email|password)$/.test(k));}
  function allowed(){return choice===true&&safe();}
  const path=()=>location.pathname.replace(/index\.html$/,'');
  // Only our public, predefined social links. Never forward arbitrary query values.
  function campaign(){
    const q=new URLSearchParams(location.search);
    const names=['utm_source','utm_medium','utm_campaign','utm_content'];
    if(names.some(name=>q.getAll(name).length>1)||q.get('utm_medium')!=='social'||q.get('utm_campaign')!=='learn_discovery')return {};
    const source=q.get('utm_source');
    if(!['youtube','instagram','tiktok'].includes(source))return {};
    const data={campaign_source:source,campaign_medium:'social',campaign_name:'learn_discovery'};
    const content=q.get('utm_content');
    if(['bio','flags_video','moon_short','general_quiz','geography_short'].includes(content))data.campaign_content=content;
    return data;
  }
  function tag(){window.dataLayer.push(arguments);}
  function send(name,params={}){if(!allowed()||!loaded)return;const context=entryContext();tag('event',name,{send_to:id,page_location:location.origin+path(),page_title:document.title,page_referrer:referrer(),growth_entry_channel:context.channel,growth_entry_path:context.path,...params});}
  function referrer(){try{return document.referrer?new URL(document.referrer).origin:'';}catch{return '';}}
  function activate(){
    if(!allowed())return;
    window['ga-disable-'+id]=false;
    if(!loaded){
      window.dataLayer=window.dataLayer||[];window.gtag=tag;
      tag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      tag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      tag('js',new Date());tag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+path(),page_referrer:referrer(),cookie_expires:180*86400,...campaign()});
      const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;script.dataset.brainilabAnalytics='1';document.head.appendChild(script);loaded=true;
    }else tag('consent','update',{analytics_storage:'granted'});
    if(!viewed){send('page_view');if(path()==='/games/number-route/'&&new URLSearchParams(location.search).get('from')==='number-break')send('resource_arrival',{resource_id:'five_number_puzzles'});if(path()==='/daily-quiz/'&&new URLSearchParams(location.search).getAll('friend').length===1&&new URLSearchParams(location.search).get('friend')===new Date().toISOString().slice(0,10))send('friend_challenge_open');viewed=true;if(/^\/learn\/[^/]+\/$/.test(path()))send('article_view',{article_slug:path().split('/')[2]});}
  }
  function revoke(){
    entry=null;try{localStorage.removeItem(entryKey);localStorage.removeItem('brainilab_registration_arrival_v1');}catch{}
    window['ga-disable-'+id]=true;
    if(loaded){window.dataLayer=window.dataLayer.filter(item=>item[0]!=='event');tag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}
    for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;for(const domain of ['',location.hostname,'.brainilabgames.com'])document.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'');}
  }
  function setConsent(allowedChoice){choice=allowedChoice===true;try{localStorage.setItem(key,JSON.stringify({allowed:choice,at:Date.now()}));}catch{}if(choice)activate();else revoke();window.dispatchEvent(new Event('brainilab:statistics-consent'));}
  document.addEventListener('click',event=>{
    if(!allowed())return;const a=event.target.closest?.('a[href]');if(!a)return;
    let url;try{url=new URL(a.href);}catch{return;}
    const social={'www.youtube.com':'youtube','youtube.com':'youtube','www.instagram.com':'instagram','instagram.com':'instagram','www.tiktok.com':'tiktok','tiktok.com':'tiktok'}[url.hostname];
    const videoPlace=a.matches('[data-related-video="article"]')?'article':a.matches('[data-related-video="post_game"]')?'post_game':a.closest('[data-latest-video],.home-social-links')?'home':null;
    if(social)send('social_click',{platform:social,placement:videoPlace||'footer'});
    const videoId=url.searchParams.get('v');
    if(social==='youtube'&&url.pathname==='/watch'&&videoPlace&&/^[\w-]{11}$/.test(videoId||''))send('video_click',{video_id:videoId,placement:videoPlace});
    if(url.origin===location.origin&&url.pathname==='/assets/resources/five-number-puzzles.pdf')send('resource_download',{resource_id:'five_number_puzzles'});
    if(url.origin===location.origin&&a.closest('.article-practice,.sidebar-game'))send('article_game_click',{article_slug:path().split('/')[2],game_path:url.pathname});
    if(url.origin===location.origin&&a.closest('[data-game-guides]')&&/^\/learn\/[a-z0-9-]+\/$/.test(url.pathname))send('game_guide_click',{article_slug:url.pathname.split('/')[2],game_path:path()});
    if(url.origin===location.origin&&a.closest('.topic-discovery')&&['/general-knowledge/','/history/','/sports/'].includes(path())){
      if(a.matches('.topic-level'))send('topic_game_click',{topic_path:path(),difficulty:['easy','medium','hard'].includes(url.searchParams.get('difficulty'))?url.searchParams.get('difficulty'):'unknown'});
      if(a.closest('.topic-reading')&&/^\/learn\/[a-z0-9-]+\/$/.test(url.pathname))send('topic_article_click',{topic_path:path(),article_slug:url.pathname.split('/')[2]});
    }
    if(url.origin===location.origin&&a.closest('.post-game')&&['next','guide','progress','browse','feedback'].includes(a.dataset.postAction))send('post_game_action',{action:a.dataset.postAction});
    if(url.origin===location.origin&&url.pathname.startsWith('/suggestions'))send('feedback_open',{source:a.closest('.post-game')?'post-game':path().startsWith('/learn/')?'learn':'site'});
  });
  window.addEventListener('brainilab:datachange',event=>{if(!allowed()||event.detail?.type!=='game_result')return;const {gameId,result}=event.detail;if(!result||result.practice||result.tryFirst||result.dailyReplayBlocked||!result.clientResultId||completed.has(result.clientResultId)||!/^[a-z0-9]{1,30}$/.test(gameId||''))return;completed.add(result.clientResultId);send('game_complete',{game_id:gameId,mode:result.dailyNumber!=null?'daily':'anytime'});});
  window.addEventListener('brainilab:friendchallenge',event=>{if(['copy','share'].includes(event.detail?.method))send('friend_challenge_share',{method:event.detail.method});});
  window.addEventListener('brainilab:discovery',event=>{if(['all','games','quizzes','words','numbers'].includes(event.detail?.type)){const params={game_type:event.detail.type};if(['all','words','numbers','knowledge','general','geography','science','history','sports'].includes(event.detail?.topic))params.game_topic=event.detail.topic;send('game_filter',params);}});
  window.addEventListener('brainilab:feedbacksent',event=>{if(['site','post-game'].includes(event.detail?.source))send('feedback_submit',{source:event.detail.source});});
  window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;choice=read();if(choice)activate();else revoke();});
  // Reading signal = at least 30 seconds visible AND halfway through the article.
  const timer=setInterval(()=>{if(articleRead||!safe()){clearInterval(timer);return;}const article=document.querySelector('.article-body');if(!article){clearInterval(timer);return;}if(allowed()&&!document.hidden)activeSeconds++;if(activeSeconds>=30&&article.getBoundingClientRect().top+article.offsetHeight/2<=innerHeight){articleRead=true;send('article_read',{article_slug:path().split('/')[2]});clearInterval(timer);}},1000);
  if(choice===true)activate();else revoke();
  function accountPrompt(action,placement,gameId){
    if(!['click','open'].includes(action)||!['game_result','practice_result'].includes(placement)||!['brainmix','brainiword','orderup','topicrush','generalknowledge','connections','survival','oddoneout','higherlower','mathrush','numberroute','sequence','worldflags','europeflags','worldcapitals','science','history','sports'].includes(gameId))return;
    send('account_prompt_'+action,{placement,game_id:gameId});
  }
  return {setConsent,gameStart,practiceComplete,accountPrompt,registrationContext:()=>allowed()?{...entryContext()}:null,registrationRequest:method=>{if(method==='email')send('registration_request',{method});},needsConsent:()=>choice===null,isAllowed:()=>choice===true};
})();

/* ===== meta-pixel.js ===== */

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
  // The early, deferred consent bundle runs once the document is parsed.
  // Do not wait for unrelated deferred account/game scripts or their network.
  if(document.body) boot();
  else document.addEventListener("DOMContentLoaded",boot,{once:true});
  return {pixelId,showPreferences};
})();
