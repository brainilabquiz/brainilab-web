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
  const heading=document.querySelector('#library-heading');
  const more=document.querySelector('[data-show-more]');
  const topicButtons=[...document.querySelectorAll('[data-browse-topic]')];
  let topic='__latest',format='article',limit=12;
  function render(){
    const terms=normalize(input.value).split(/\s+/).filter(Boolean);
    const matches=cards.filter((card,i)=>{
      const inTopic=topic==='__latest'?(format==='academy'||terms.length>0||card.hasAttribute('data-latest-topic')):(!topic||card.dataset.topic===topic);
      return inTopic&&card.dataset.format===format&&terms.every(term=>texts[i].includes(term));
    });
    const shown=matches.slice(0,limit),active=new Set(shown);
    cards.forEach(card=>{card.hidden=!active.has(card);});
    grid.dataset.view=format;
    const overview=format==='article'&&topic==='__latest'&&!terms.length;
    grid.classList.toggle('is-topic-overview',overview);
    grid.classList.toggle('is-specific-topic',Boolean(topic&&topic!=='__latest'));
    topicButtons.forEach(button=>{button.hidden=!overview;});
    select.value=topic;
    clearSearch.hidden=!input.value;
    const noun=format==='academy'?'course':'article';
    count.textContent=overview?`${matches.length} topics · ${articlePaths.length} articles`:`${shown.length} of ${matches.length} ${noun}${matches.length===1?'':'s'}`;
    heading.textContent=terms.length?'Search results':format==='academy'?(topic&&topic!=='__latest'?topic+' courses':'BrainiLab Academy'):(topic==='__latest'?'Latest by topic':topic||'All articles');
    formatButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.formatFilter===format)));
    empty.hidden=matches.length!==0;
    more.parentElement.hidden=shown.length>=matches.length;
    more.textContent=`Show more ${noun}s`;
  }
  function reset(){limit=12;render();}
  input.closest('.learn-search').hidden=false;
  const formats=document.querySelector('.learn-format-filters');if(formats)formats.hidden=false;
  formatButtons.forEach(button=>button.addEventListener('click',()=>{format=button.dataset.formatFilter;topic='__latest';reset();}));
  topicButtons.forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.browseTopic;input.value='';reset();select.focus();}));
  select.closest('label').hidden=false;
  input.addEventListener('input',reset);
  select.addEventListener('change',()=>{topic=select.value;reset();});
  clearSearch.addEventListener('click',()=>{input.value='';reset();input.focus();});
  more.addEventListener('click',()=>{
    const previouslyVisible=new Set(cards.filter(card=>!card.hidden));
    limit+=12;render();
    cards.find(card=>!card.hidden&&!previouslyVisible.has(card))?.querySelector('h3 a')?.focus();
  });
  document.querySelector('[data-clear-filters]').addEventListener('click',()=>{topic='';input.value='';reset();input.focus();});
  render();
})();
