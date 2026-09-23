/* GA4: basic consent mode. No Google request before an explicit statistics choice. */
window.BrainiSiteAnalytics=(()=>{
  const id='G-97WN37VLHV',key='brainilab_statistics_consent_v1',maxAge=180*86400000;
  let choice=read(),loaded=false,viewed=false,articleRead=false,activeSeconds=0;
  const completed=new Set();
  function read(){try{const c=JSON.parse(localStorage.getItem(key));return c&&typeof c.allowed==='boolean'&&c.at<=Date.now()&&Date.now()-c.at<maxAge?c.allowed:null;}catch{return null;}}
  function safe(){return ['brainilabgames.com','www.brainilabgames.com'].includes(location.hostname)&&!/^\/(admin|auth|profile)(\/|$)/.test(location.pathname)&&![...new URLSearchParams(location.search+'&'+location.hash.slice(1)).keys()].some(k=>/^(code|access_token|refresh_token|token_hash|error_description|email|password)$/.test(k));}
  function allowed(){return choice===true&&safe();}
  const path=()=>location.pathname.replace(/index\.html$/,'');
  function tag(){window.dataLayer.push(arguments);}
  function send(name,params={}){if(!allowed()||!loaded)return;tag('event',name,{send_to:id,page_location:location.origin+path(),page_title:document.title,page_referrer:referrer(),...params});}
  function referrer(){try{return document.referrer?new URL(document.referrer).origin:'';}catch{return '';}}
  function activate(){
    if(!allowed())return;
    window['ga-disable-'+id]=false;
    if(!loaded){
      window.dataLayer=window.dataLayer||[];window.gtag=tag;
      tag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      tag('consent','update',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      tag('js',new Date());tag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:location.origin+path(),page_referrer:referrer(),cookie_expires:180*86400});
      const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+id;script.dataset.brainilabAnalytics='1';document.head.appendChild(script);loaded=true;
    }else tag('consent','update',{analytics_storage:'granted'});
    if(!viewed){send('page_view');viewed=true;if(/^\/learn\/[^/]+\/$/.test(path()))send('article_view',{article_slug:path().split('/')[2]});}
  }
  function revoke(){
    window['ga-disable-'+id]=true;
    if(loaded){window.dataLayer=window.dataLayer.filter(item=>item[0]!=='event');tag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});}
    for(const cookie of document.cookie.split(';')){const name=cookie.split('=')[0].trim();if(!/^_ga(?:_|$)|^_gid$|^_gat/.test(name))continue;for(const domain of ['',location.hostname,'.brainilabgames.com'])document.cookie=name+'=; Max-Age=0; Path=/; SameSite=Lax'+(domain?'; Domain='+domain:'');}
  }
  function setConsent(allowedChoice){choice=allowedChoice===true;try{localStorage.setItem(key,JSON.stringify({allowed:choice,at:Date.now()}));}catch{}if(choice)activate();else revoke();}
  document.addEventListener('click',event=>{
    if(!allowed())return;const a=event.target.closest?.('a[href]');if(!a)return;
    let url;try{url=new URL(a.href);}catch{return;}
    const social={'www.youtube.com':'youtube','youtube.com':'youtube','www.instagram.com':'instagram','instagram.com':'instagram','www.tiktok.com':'tiktok','tiktok.com':'tiktok'}[url.hostname];
    if(social)send('social_click',{platform:social,placement:a.closest('[data-latest-video],.home-social-links')?'home':'footer'});
    if(url.origin===location.origin&&a.closest('.article-practice,.sidebar-game'))send('article_game_click',{article_slug:path().split('/')[2],game_path:url.pathname});
    if(url.origin===location.origin&&url.pathname.startsWith('/suggestions'))send('feedback_open',{source:path().startsWith('/learn/')?'learn':'site'});
  });
  window.addEventListener('brainilab:datachange',event=>{if(!allowed()||event.detail?.type!=='game_result')return;const {gameId,result}=event.detail;if(!result||result.practice||result.tryFirst||result.dailyReplayBlocked||!result.clientResultId||completed.has(result.clientResultId)||!/^[a-z0-9]{1,30}$/.test(gameId||''))return;completed.add(result.clientResultId);send('game_complete',{game_id:gameId,mode:result.dailyNumber!=null?'daily':'anytime'});});
  window.addEventListener('storage',event=>{if(event.key!==key&&event.key!==null)return;choice=read();if(choice)activate();else revoke();});
  // Reading signal = at least 30 seconds visible AND halfway through the article.
  const timer=setInterval(()=>{if(articleRead||!safe()){clearInterval(timer);return;}const article=document.querySelector('.article-body');if(!article){clearInterval(timer);return;}if(allowed()&&!document.hidden)activeSeconds++;if(activeSeconds>=30&&article.getBoundingClientRect().top+article.offsetHeight/2<=innerHeight){articleRead=true;send('article_read',{article_slug:path().split('/')[2]});clearInterval(timer);}},1000);
  if(choice===true)activate();else revoke();
  return {setConsent,needsConsent:()=>choice===null,isAllowed:()=>choice===true};
})();
