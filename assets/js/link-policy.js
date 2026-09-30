(() => {
  function update(root){
    const links=root.matches?.('a[href]')?[root]:[];
    links.push(...(root.querySelectorAll?.('a[href]')||[]));
    for(const a of links){
      let external=false;
      try{const url=new URL(a.getAttribute('href'),document.baseURI),host=url.hostname.replace(/^www\./,'');external=/^https?:$/.test(url.protocol)&&host!==location.hostname.replace(/^www\./,'')&&host!=='brainilabgames.com';}catch{}
      if(external){a.target='_blank';a.relList.add('noopener','noreferrer');}
      else{a.removeAttribute('target');a.relList.remove('noopener','noreferrer');if(!a.rel)a.removeAttribute('rel');}
    }
  }
  update(document);
  new MutationObserver(records=>records.forEach(r=>r.type==='attributes'?update(r.target):r.addedNodes.forEach(update)))
    .observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['href']});
})();
