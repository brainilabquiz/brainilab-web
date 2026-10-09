/*
  BrainiLab Mobile UI — V40
  Accessible navigation behavior shared by every public page.
*/
window.BrainiMobileUI=(function(){
  function closeMenu(nav,button){
    nav?.classList.remove('mobile-open');
    button?.setAttribute('aria-expanded','false');
  }

  function bootNav(){
    if(!document.querySelector('[data-news-nav-style]')){
      const style=document.createElement('style');style.dataset.newsNavStyle='';
      style.textContent='.topbar .links .news-nav-link{color:#ae201b!important;border:1px solid #e52720!important;border-radius:999px;padding:7px 11px;white-space:nowrap;animation:news-nav-aura 4s ease-in-out infinite}@keyframes news-nav-aura{0%,100%{box-shadow:0 0 0 2px #e5272008}50%{box-shadow:0 0 0 4px #e5272018}}@media(prefers-reduced-motion:reduce){.topbar .links .news-nav-link{animation:none}}';
      document.head.append(style);
    }
    document.querySelectorAll('.topbar .nav').forEach(shell=>{
      const nav=shell.querySelector('.links');
      const button=shell.querySelector('[data-mobile-menu]');
      if(nav&&!nav.querySelector('.news-nav-link')){
        const link=document.createElement('a');link.href='/breaking-news/';link.className='news-nav-link';link.textContent='Breaking News';link.target='_blank';link.rel='noopener noreferrer';
        if(location.pathname.startsWith('/breaking-news'))link.setAttribute('aria-current','page');
        nav.append(link);
      }
      if(!nav||!button) return;

      if(!nav.id) nav.id='mainNav';
      button.setAttribute('aria-controls',nav.id);
      button.setAttribute('aria-expanded','false');

      button.addEventListener('click',event=>{
        event.stopPropagation();
        const open=!nav.classList.contains('mobile-open');
        nav.classList.toggle('mobile-open',open);
        button.setAttribute('aria-expanded',String(open));
      });

      nav.addEventListener('click',event=>{
        if(event.target.closest('a')) closeMenu(nav,button);
      });

      document.addEventListener('pointerdown',event=>{
        if(!nav.classList.contains('mobile-open')) return;
        if(shell.contains(event.target)) return;
        closeMenu(nav,button);
      },{passive:true});

      document.addEventListener('keydown',event=>{
        if(event.key==='Escape') closeMenu(nav,button);
      });

      window.addEventListener('resize',()=>{
        if(window.innerWidth>920) closeMenu(nav,button);
      },{passive:true});
    });
  }

  function centerActiveTabs(){
    document.querySelectorAll('.profile-tabs').forEach(tabs=>{
      const active=tabs.querySelector('.active');
      if(active){
        requestAnimationFrame(()=>{
          active.scrollIntoView({
            block:'nearest',
            inline:'center'
          });
        });
      }

      tabs.addEventListener('click',event=>{
        const button=event.target.closest('button');
        if(!button) return;
        requestAnimationFrame(()=>{
          button.scrollIntoView({
            behavior:'smooth',
            block:'nearest',
            inline:'center'
          });
        });
      });
    });
  }

  function boot(){
    bootNav();
    centerActiveTabs();
    document.documentElement.classList.add('brainilab-mobile-ready');
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot,{once:true});
  }else{
    queueMicrotask(boot);
  }

  return {boot};
})();
