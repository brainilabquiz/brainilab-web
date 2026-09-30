(() => {
  function update(root){
    const links=root.matches?.('a[href]')?[root]:[];
    links.push(...(root.querySelectorAll?.('a[href]')||[]));
    for(const a of links){a.target='_blank';a.relList.add('noopener','noreferrer');}
  }
  update(document);
  new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(update)))
    .observe(document.documentElement,{childList:true,subtree:true});
})();
