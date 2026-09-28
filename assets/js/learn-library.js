/* Progressive enhancement: every published article is readable without JS. */
(()=>{
  const grid=document.querySelector('#learn-articles');
  if(!grid)return;
  const cards=[...grid.querySelectorAll('.learn-card')];
  const input=document.querySelector('#learn-search');
  const nav=document.querySelector('.topic-nav');
  const count=document.querySelector('#learn-count');
  const empty=document.querySelector('.learn-empty');
  const buttons=[...nav.querySelectorAll('[data-topic-filter]')];
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
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.topicFilter===topic)));
    count.textContent=`${visible} article${visible===1?'':'s'}${topic==='__latest'&&!terms.length?' · latest in each topic':topic&&topic!=='__latest'?' · '+topic:''}`;
    empty.hidden=visible!==0;
  }
  nav.hidden=false;
  input.closest('label').hidden=false;
  buttons.forEach(button=>button.addEventListener('click',()=>{topic=button.dataset.topicFilter;render();}));
  input.addEventListener('input',render);
  document.querySelector('[data-clear-filters]').addEventListener('click',()=>{topic='';input.value='';render();input.focus();});
  render();
})();
