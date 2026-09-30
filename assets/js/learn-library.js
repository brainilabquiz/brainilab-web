/* Progressive enhancement: every published article is readable without JS. */
(()=>{
  const grid=document.querySelector('#learn-articles');
  if(!grid)return;
  const cards=[...grid.querySelectorAll('.learn-card')];
  const surprise=document.querySelector('[data-random-article]');
  const articlePaths=[...new Set(cards.map(card=>card.querySelector('h3 a')?.getAttribute('href'))
    .filter(path=>/^\/learn\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(path||'')))];
  let lastArticle='';
  function randomArticle(){
    try{lastArticle=sessionStorage.getItem('brainilab:last-surprise-article')||lastArticle;}catch{}
    const choices=articlePaths.length>1?articlePaths.filter(path=>path!==lastArticle):articlePaths;
    return choices[Math.floor(Math.random()*choices.length)];
  }
  if(surprise&&articlePaths.length){
    surprise.href=randomArticle();
    surprise.parentElement.hidden=false;
    surprise.addEventListener('click',()=>{
      lastArticle=randomArticle();
      surprise.href=lastArticle;
      try{sessionStorage.setItem('brainilab:last-surprise-article',lastArticle);}catch{}
    });
    window.addEventListener('pageshow',()=>{surprise.href=randomArticle();});
  }
  const input=document.querySelector('#learn-search');
  const count=document.querySelector('#learn-count');
  const empty=document.querySelector('.learn-empty');
  const select=document.querySelector('#learn-topic');
  const clearSearch=document.querySelector('.learn-search-clear');
  const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const texts=cards.map(card=>normalize(card.textContent));
  let topic='__latest';
  function render(){
    const terms=normalize(input.value).split(/\s+/).filter(Boolean);
    let visible=0;
    cards.forEach((card,i)=>{
      const inTopic=topic==='__latest'?(terms.length>0||card.hasAttribute('data-latest-topic')):(!topic||card.dataset.topic===topic);
      const match=inTopic&&terms.every(term=>texts[i].includes(term));
      card.hidden=!match;
      if(match)visible++;
    });
    select.value=topic;
    clearSearch.hidden=!input.value;
    count.textContent=`${visible} article${visible===1?'':'s'}${topic==='__latest'&&!terms.length?' · latest in each topic':topic&&topic!=='__latest'?' · '+topic:''}`;
    empty.hidden=visible!==0;
  }
  input.closest('.learn-search').hidden=false;
  select.closest('label').hidden=false;
  input.addEventListener('input',render);
  select.addEventListener('change',()=>{topic=select.value;render();});
  clearSearch.addEventListener('click',()=>{input.value='';render();input.focus();});
  document.querySelector('[data-clear-filters]').addEventListener('click',()=>{topic='';input.value='';render();input.focus();});
  render();
})();
