(() => {
  const dailyPages=new Set(['/daily-quiz/','/games/brain-mix/','/games/connections/','/games/math-rush/','/games/brainiword/','/games/number-route/','/games/order-up/','/games/odd-one-out/','/games/topic-rush/','/games/sequence/','/games/higher-lower/']);
  const embedded=window.top!==window;
  function update(root){
    const links=root.matches?.('a[href]')?[root]:[];
    links.push(...(root.querySelectorAll?.('a[href]')||[]));
    for(const a of links){
      let newTab=false;
      try{const url=new URL(a.getAttribute('href'),document.baseURI),host=url.hostname.replace(/^www\./,'');const external=/^https?:$/.test(url.protocol)&&host!==location.hostname.replace(/^www\./,'')&&host!=='brainilabgames.com';const page=url.pathname.replace(/\/index\.html$/,'/').replace(/\/?$/,'/');newTab=external||(embedded&&/^https?:$/.test(url.protocol)&&!dailyPages.has(page));}catch{}
      if(newTab){a.target='_blank';a.relList.add('noopener','noreferrer');}
      else{a.removeAttribute('target');a.relList.remove('noopener','noreferrer');if(!a.rel)a.removeAttribute('rel');}
    }
  }
  update(document);
  new MutationObserver(records=>records.forEach(r=>r.type==='attributes'?update(r.target):r.addedNodes.forEach(update)))
    .observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
})();
