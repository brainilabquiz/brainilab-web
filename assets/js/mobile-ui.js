/*
  BrainiLab Mobile UI — V40
  Accessible navigation behavior shared by every public page.
*/
window.BrainiMobileUI=(function(){
  const readyNav=new WeakSet();
  const readyCommunity=new WeakSet();
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
        const link=document.createElement('a');link.href='/breaking-news/';link.className='news-nav-link';link.textContent='Breaking News';
        if(location.pathname.startsWith('/breaking-news'))link.setAttribute('aria-current','page');
        nav.append(link);
      }
      if(!nav||!button||readyNav.has(nav)) return;
      readyNav.add(nav);

      if(!nav.id) nav.id='mainNav';
      button.setAttribute('aria-controls',nav.id);
      button.setAttribute('aria-expanded','false');

      button.addEventListener('click',event=>{
        event.stopPropagation();
        const open=!nav.classList.contains('mobile-open');
        nav.classList.toggle('mobile-open',open);
        button.setAttribute('aria-expanded',String(open));
      });

      // The dropdown sits before its toggle in the shared header DOM.
      // Enter its links on Tab, then leave it after the last link.
      button.addEventListener('keydown',event=>{
        if(event.key==='Tab'&&!event.shiftKey&&nav.classList.contains('mobile-open')){
          const first=nav.querySelector('a[href]');
          if(first){event.preventDefault();first.focus();}
        }
      });
      nav.addEventListener('keydown',event=>{
        const links=nav.querySelectorAll('a[href]');
        if(event.key==='Tab'&&!event.shiftKey&&event.target===links[links.length-1]&&nav.classList.contains('mobile-open')){
          closeMenu(nav,button);
          button.focus();
        }
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
        if(event.key==='Escape'&&nav.classList.contains('mobile-open')){
          const restoreFocus=nav.contains(document.activeElement);
          closeMenu(nav,button);
          if(restoreFocus)button.focus();
        }
      });

      window.addEventListener('resize',()=>{
        if(window.innerWidth>920) closeMenu(nav,button);
      },{passive:true});
    });
  }

  function bootCommunity(){
    document.querySelectorAll('.topbar .nav-community').forEach(group=>{
      if(readyCommunity.has(group))return;
      const summary=group.querySelector('summary');
      if(!summary)return;
      readyCommunity.add(group);
      let mobile=window.innerWidth<=920;
      let openedOnHover=false;
      group.open=mobile;
      const current=location.pathname.match(/^\/(rankings|groups)(?:\/|$)/)?.[1];
      group.classList.toggle('is-current',Boolean(current));
      group.querySelectorAll('a[href]').forEach(link=>{
        if(current&&new URL(link.href,location.href).pathname.match(new RegExp('^/'+current+'(?:/|$)')))link.setAttribute('aria-current','page');
        else link.removeAttribute('aria-current');
      });
      const close=()=>{group.open=false;openedOnHover=false;};
      const open=()=>{group.open=true;window.BrainiAccountMenu?.close?.();};
      // On a narrow screen both links are already visible when Menu opens.
      // On desktop a mouse, touch, or keyboard can open the same disclosure.
      group.addEventListener('pointerenter',event=>{
        if(mobile||event.pointerType==='touch'||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
        if(!group.open){open();openedOnHover=true;}
      });
      group.addEventListener('pointerleave',()=>{
        if(!mobile&&!group.contains(document.activeElement))close();
      });
      summary.addEventListener('click',event=>{
        if(mobile)return;
        event.preventDefault();
        if(openedOnHover&&event.detail>0)open();
        else if(group.open)close();
        else open();
        openedOnHover=false;
      });
      summary.addEventListener('keydown',event=>{
        if(!mobile&&(event.key==='ArrowDown'||event.key==='ArrowUp')){
          event.preventDefault();open();
          const links=group.querySelectorAll('a[href]');
          (event.key==='ArrowUp'?links[links.length-1]:links[0])?.focus();
        }
      });
      group.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&!mobile&&group.open){
          event.preventDefault();event.stopPropagation();close();summary.focus();
        }
      });
      group.addEventListener('focusout',event=>{
        if(!mobile&&!group.contains(event.relatedTarget))close();
      });
      group.addEventListener('click',event=>{
        if(!mobile&&event.target.closest('a'))close();
      });
      document.addEventListener('pointerdown',event=>{
        if(!mobile&&!group.contains(event.target))close();
      },{capture:true,passive:true});
      window.addEventListener('resize',()=>{
        const next=window.innerWidth<=920;
        if(next===mobile)return;
        mobile=next;openedOnHover=false;group.open=mobile;
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
    bootCommunity();
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
