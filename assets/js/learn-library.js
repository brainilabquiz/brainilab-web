/* Progressive enhancement: every published article is readable without JS. */
(()=>{
  const grid=document.querySelector('#learn-articles');
  if(!grid)return;
  const cards=[...grid.querySelectorAll('.learn-card')];
  const surprise=document.querySelector('[data-random-article]');
  const articlePaths=[...new Set(cards.filter(card=>card.dataset.format!=='academy').map(card=>card.querySelector('h3 a')?.getAttribute('href'))
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
  const formatButtons=[...document.querySelectorAll('[data-format-filter]')];
  let topic='__latest',format='all';
  function render(){
    const terms=normalize(input.value).split(/\s+/).filter(Boolean);
    let visible=0,articleCount=0,courseCount=0;
    cards.forEach((card,i)=>{
      const inTopic=topic==='__latest'?(terms.length>0||card.hasAttribute('data-latest-topic')):(!topic||card.dataset.topic===topic);
      const match=inTopic&&(format==='all'||card.dataset.format===format)&&terms.every(term=>texts[i].includes(term));
      card.hidden=!match;
      if(match){visible++;if(card.dataset.format==='academy')courseCount++;else articleCount++;}
    });
    select.value=topic;
    clearSearch.hidden=!input.value;
    count.textContent=[...(format!=='academy'?[`${articleCount} article${articleCount===1?'':'s'}`]:[]),...(format!=='article'?[`${courseCount} Academy course${courseCount===1?'':'s'}`]:[])].join(' · ')+(topic&&topic!=='__latest'?' · '+topic:'');
    formatButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.formatFilter===format)));
    empty.hidden=visible!==0;
  }
  input.closest('.learn-search').hidden=false;
  const formats=document.querySelector('.learn-format-filters');if(formats)formats.hidden=false;
  formatButtons.forEach(button=>button.addEventListener('click',()=>{format=button.dataset.formatFilter;render();}));
  select.closest('label').hidden=false;
  input.addEventListener('input',render);
  select.addEventListener('change',()=>{topic=select.value;render();});
  clearSearch.addEventListener('click',()=>{input.value='';render();input.focus();});
  document.querySelector('[data-clear-filters]').addEventListener('click',()=>{topic='';format='all';input.value='';render();input.focus();});
  render();
})();
