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
  // Match common British and American spellings without changing the reader's query.
  // Whole words keep unrelated names (such as Colorado) intact.
  const spellings={color:'colour',colors:'colours',colorful:'colourful',colored:'coloured',
    center:'centre',centers:'centres',gray:'grey',grays:'greys',
    favorite:'favourite',favorites:'favourites',behavior:'behaviour',behaviors:'behaviours'};
  const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\b[a-z]+\b/g,word=>Object.hasOwn(spellings,word)?spellings[word]:word).trim();
  const lessons=cards.map(card=>{
    try{
      const data=JSON.parse(card.dataset.searchLessons||'[]');
      return Array.isArray(data)?data.filter(l=>/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(l?.slug||'')&&typeof l.title==='string'):[];
    }catch{return [];}
  });
  const cardText=card=>{
    const nodes=document.createTreeWalker(card,NodeFilter.SHOW_TEXT),parts=[];
    while(nodes.nextNode())parts.push(nodes.currentNode.nodeValue);
    return parts.join(' ');
  };
  const texts=cards.map((card,i)=>normalize(cardText(card)+' '+lessons[i].map(l=>l.title).join(' ')));
  const formatButtons=[...document.querySelectorAll('[data-format-filter]')];
  const heading=document.querySelector('#library-heading');
  const more=document.querySelector('[data-show-more]');
  const topicButtons=[...document.querySelectorAll('[data-browse-topic]')];
  let topic='__latest',format='article',limit=12;
  let lastHash='';
  const searchLabel=document.querySelector('label[for="learn-search"]');
  const emptyReset=document.querySelector('[data-clear-filters]');
  const topicOptions=[...select.options];
  input.maxLength=120;
  function restore(){
    const [view,query='']=location.hash.slice(1).split('?');
    const params=new URLSearchParams(['academy','articles'].includes(view)?query:'');
    format=view==='academy'?'academy':'article';
    const available=new Set(cards.filter(c=>c.dataset.format===format).map(c=>c.dataset.topic));
    const requested=params.get('topic');
    topic=requested==='all'&&format==='article'?'':available.has(requested)?requested:'__latest';
    input.value=(params.get('q')||'').slice(0,120).replace(/[\u0000-\u001f\u007f]/g,'');
    const shown=Number(params.get('shown'));
    limit=Number.isInteger(shown)&&shown>=12?Math.min(shown,Math.max(12,cards.length)):12;
    lastHash=location.hash;
    render();
  }
  function save(replace=false){
    const params=new URLSearchParams();
    if(topic!=='__latest')params.set('topic',topic||'all');
    if(input.value)params.set('q',input.value.slice(0,120));
    if(limit>12)params.set('shown',String(limit));
    const hash=format==='article'&&!params.size?'':'#'+(format==='academy'?'academy':'articles')+(params.size?'?'+params:'');
    if(hash!==location.hash){
      try{history[replace?'replaceState':'pushState'](history.state,'',location.pathname+location.search+hash);}catch{}
    }
    lastHash=location.hash;
  }
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
    const available=new Set(cards.filter(c=>c.dataset.format===format).map(c=>c.dataset.topic));
    topicOptions.forEach(option=>{
      option.hidden=option.disabled=Boolean(option.value&&option.value!=='__latest'&&!available.has(option.value));
      if(option.value==='__latest')option.textContent=format==='academy'?'All courses':'Latest picks';
      if(option.value==='')option.hidden=option.disabled=format==='academy';
    });
    select.value=topic;
    input.placeholder=format==='academy'?'Search courses or lessons…':'Search a topic or a question…';
    if(searchLabel)searchLabel.textContent=format==='academy'?'Search Academy':'Search articles';
    cards.forEach((card,i)=>{
      const match=card.querySelector('[data-matched-lesson]');
      if(!match)return;
      const lesson=terms.length?lessons[i].find(l=>terms.every(t=>normalize(l.title).includes(t))):null;
      match.hidden=!lesson;
      if(lesson){match.textContent='Lesson: '+lesson.title+' →';match.href='/learn/'+lesson.slug+'/';}
      else{match.textContent='';match.removeAttribute('href');}
    });
    clearSearch.hidden=!input.value;
    const noun=format==='academy'?'course':'article';
    count.textContent=overview?`${matches.length} topics · ${articlePaths.length} articles`:`${shown.length} of ${matches.length} ${noun}${matches.length===1?'':'s'}`;
    heading.textContent=terms.length?'Search results':format==='academy'?(topic&&topic!=='__latest'?topic+' courses':'BrainiLab Academy'):(topic==='__latest'?'Latest by topic':topic||'All articles');
    formatButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.formatFilter===format)));
    empty.hidden=matches.length!==0;
    more.parentElement.hidden=shown.length>=matches.length;
    more.textContent=`Show more ${noun}s`;
    emptyReset.textContent=format==='academy'?'Show all courses':'Show all articles';
  }
  function reset(replace=false){limit=12;render();save(replace);}
  input.closest('.learn-search').hidden=false;
  const formats=document.querySelector('.learn-format-filters');if(formats)formats.hidden=false;
  formatButtons.forEach(button=>button.addEventListener('click',()=>{format=button.dataset.formatFilter;topic='__latest';reset();}));
  topicButtons.forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.browseTopic;input.value='';reset();select.focus();}));
  select.closest('label').hidden=false;
  input.addEventListener('input',()=>reset(true));
  select.addEventListener('change',()=>{topic=select.value;reset();});
  clearSearch.addEventListener('click',()=>{input.value='';reset();input.focus();});
  more.addEventListener('click',()=>{
    const previouslyVisible=new Set(cards.filter(card=>!card.hidden));
    limit+=12;render();save();
    cards.find(card=>!card.hidden&&!previouslyVisible.has(card))?.querySelector('h3 a')?.focus();
  });
  emptyReset.addEventListener('click',()=>{topic=format==='academy'?'__latest':'';input.value='';reset();input.focus();});
  const onNavigation=()=>{if(location.hash!==lastHash)restore();};
  window.addEventListener('popstate',onNavigation);
  window.addEventListener('hashchange',onNavigation);
  window.addEventListener('pageshow',restore);
  restore();
})();
