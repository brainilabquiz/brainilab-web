window.BrainiAvatarStudioUI=(function(){
  const C=BrainiRewardCatalog,A=BrainiAvatarDesign;
  const panes={look:{label:'Your look',groups:{skin:'Skin tone',hair:'Hair',hairColor:'Hair colour',shirt:'Shirt',background:'Background'}},
    extras:{label:'Little extras',groups:{glasses:'Glasses',hat:'Hats',prop:'A little personality'}},
    rewards:{label:'Frames & titles',groups:{frame:'Avatar frame',title:'Profile title',scene:'Profile background'}},
    challenges:{label:'Challenges',groups:{}},academy:{label:'Academy',groups:{}}};
  if(window.BrainiAchievementCatalog)panes.badges={label:'Badges',groups:{}};
  let active='look';
  const number=n=>n.toLocaleString('en-GB');
  function initialStatus(button,copy){if(!window.BrainiWardrobeUI)button.querySelector('small').textContent=copy;}
  function group(kind,name){
    const summary=['frame','title','scene','glasses','hat','prop'].includes(kind)?`<small class="avatar-collection-summary" data-style-collection="${kind}"></small>`:'';
    return `<fieldset class="avatar-option-group"><legend><span class="avatar-option-heading"><span>${name}</span>${summary}</span></legend><div class="reward-grid reward-grid-${kind}" data-style-${kind}s></div><p class="avatar-item-note" data-avatar-note="${kind}" hidden></p></fieldset>`;
  }
  const escapeCopy=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function collectionSummary(root,total,options){
    for(const summary of root.querySelectorAll('[data-style-collection]')){
      const items=C.groups[summary.dataset.styleCollection].filter(item=>!item.course&&!item.challenge&&!item.days),available=items.filter(item=>C.isUnlocked(item,total)).length;
      summary.textContent=options.loading?'Checking…':options.error?'Unavailable':`${available} of ${items.length} unlocked`;
    }
  }
  function mount(root){
    root.innerHTML=`<div class="avatar-studio-heading"><div><span class="reward-kicker">MY AVATAR</span><h2>Make it yours.</h2><p>Try an unlocked item, then save your look.</p></div><a class="avatar-play-link" href="/games/">Play for more XP →</a></div>
      <div class="avatar-studio-layout"><aside class="avatar-studio-stage" aria-label="Avatar preview">
      <div class="avatar-stage-art"><span class="avatar-preview-label" data-style-preview-label>Your avatar</span><span class="rank-avatar avatar-studio-portrait" data-style-preview-avatar aria-hidden="true"></span></div>
      <div class="avatar-stage-identity" data-diploma-tier="rookie" aria-label="BrainiLab progress diploma"><span class="avatar-diploma-ornament" aria-hidden="true"><svg viewBox="0 0 280 130" preserveAspectRatio="none" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g class="diploma-etched-corners"><path d="M10 30V10H30M250 10H270V30M10 100V120H30M250 120H270V100"/><path d="m13 23 10-10M257 13l10 10M13 107l10 10M257 117l10-10" stroke-width=".7"/></g><g class="diploma-scroll-corners"><path d="M9 37V17Q9 9 17 9H37M243 9H263Q271 9 271 17V37M9 93V113Q9 121 17 121H37M243 121H263Q271 121 271 113V93"/><path d="M12 25Q25 25 25 12M255 12Q255 25 268 25M12 105Q25 105 25 118M255 118Q255 105 268 105"/><path d="m134 9 6-4 6 4-6 4ZM134 121l6-4 6 4-6 4Z" fill="currentColor" stroke-width=".7"/></g><g class="diploma-laurel-corners"><path d="M13 40Q10 18 34 12M246 12Q270 18 267 40M13 90Q10 112 34 118M246 118Q270 112 267 90"/><path d="m15 29-6-6 8 2m3-6-2-7 7 4m-9 85-7 6 8-2m3 6-2 7 7-4m240-85 6-6-8 2m-3-6 2-7-7 4m10 85 6 6-8-2m-3 6 2 7-7-4"/><path d="M126 9H135M145 9H154M126 121H135M145 121H154"/><path d="m140 5 4 4-4 4-4-4ZM140 117l4 4-4 4-4-4Z" fill="currentColor"/></g></svg></span><div class="avatar-diploma-name"><strong data-style-preview-name></strong><span class="avatar-diploma-seal" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g data-diploma-mark="rookie"><circle cx="24" cy="23" r="15"/><path d="m24 15 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g><g data-diploma-mark="elementary"><circle cx="24" cy="24" r="17"/><path d="M24 34V19M24 26Q12 27 13 15Q25 14 24 26ZM24 22Q24 11 36 13Q37 24 24 22Z" fill="currentColor" fill-opacity=".16"/></g><g data-diploma-mark="highschool"><path d="m24 4 5 5 8 1 1 8 5 6-5 6-1 8-8 1-5 5-5-5-8-1-1-8-5-6 5-6 1-8 8-1Z" fill="currentColor" fill-opacity=".12"/><path d="m24 13 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/></g><g data-diploma-mark="college"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M15 16Q20 14 24 18Q28 14 33 16V30Q28 28 24 32Q20 28 15 30ZM24 18V32"/><path d="M18 21H21M27 21H30M18 25H21M27 25H30" stroke-width="1.5"/></g><g data-diploma-mark="graduate"><path d="M14 38Q2 24 11 10M34 38Q46 24 37 10M10 16 5 14M8 23 3 22M9 30 4 31M12 35 8 39M38 16 43 14M40 23 45 22M39 30 44 31M36 35 40 39"/><circle cx="24" cy="23" r="12" fill="currentColor" fill-opacity=".14"/><path d="m24 14 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="phd"><path d="m24 3 18 10v22L24 45 6 35V13Z" fill="currentColor" fill-opacity=".13"/><path d="m24 9 13 7v16l-13 7-13-7V16Z" stroke-width="1"/><path d="m24 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="currentColor"/></g><g data-diploma-mark="researcher"><circle cx="24" cy="24" r="4" fill="currentColor"/><ellipse cx="24" cy="24" rx="20" ry="8"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)"/></g><g data-diploma-mark="professor"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M14 20Q20 17 24 22Q28 17 34 20V33Q28 30 24 35Q20 30 14 33ZM24 22V35"/><path d="m24 10 1 3 4 1-3 2v3l-2-2-3 2 1-3-3-2 4-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="dean"><path d="M24 3 42 11V29Q36 39 24 45Q12 39 6 29V11Z" fill="currentColor" fill-opacity=".18"/><path d="m13 18 6 5 5-10 5 10 6-5-3 15H16ZM17 37H31" fill="currentColor" fill-opacity=".25"/><circle cx="13" cy="16" r="2" fill="currentColor"/><circle cx="24" cy="11" r="2" fill="currentColor"/><circle cx="35" cy="16" r="2" fill="currentColor"/></g><g data-diploma-mark="nobel"><path d="m24 2 5 5 8-1 2 8 7 5-4 7 1 9-8 2-5 8-7-4-9 2-3-8-8-5 4-8-1-8 8-3 4-8Z" fill="currentColor" fill-opacity=".22"/><circle cx="24" cy="24" r="14"/><path d="m24 12 3 8 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1Z" fill="currentColor" stroke-width="1"/></g></svg></span></div><p data-style-preview-title></p><span data-avatar-level></span><small data-avatar-diploma-next></small></div>
      ${panes.badges?'<div data-featured-achievements></div>':''}
      <div class="avatar-next-reward" data-next-reward></div>
      <details class="avatar-help"><summary>About your look</summary><p class="avatar-storage-note" data-style-storage></p><p class="avatar-sharing-note" data-style-sharing></p></details></aside>
      <div class="avatar-studio-controls"><div class="avatar-mobile-preview avatar-apply-bar"><span data-avatar-mini aria-hidden="true"></span><span data-avatar-mini-label></span><div class="profile-style-actions"><button class="btn" type="button" data-style-save>Save look</button><button class="btn-light" type="button" data-style-cancel>Cancel</button><button class="btn-light" type="button" data-style-retry hidden>Try again</button></div></div><p class="profile-style-status" role="status" aria-live="polite" data-style-status></p><div class="avatar-mode" role="group" aria-labelledby="avatar-start-label"><div class="avatar-mode-header"><span id="avatar-start-label">Start with</span><button type="button" class="avatar-surprise" data-avatar-surprise aria-label="Surprise me with unlocked avatar items" title="Try a new look using your unlocked items">Surprise me</button></div><div class="reward-mode-grid" data-style-modes></div></div>
      <div class="avatar-studio-tabs" role="tablist" aria-label="Avatar options">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${p.label}</button>`).join('')}</div>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='badges'?'<div data-achievements-panel></div>':''}${key==='challenges'?'<section class="avatar-day-collection" aria-labelledby="avatar-days-title"><h3 id="avatar-days-title" class="avatar-collection-heading">Days played</h3><p class="avatar-pane-note">A little time to play, whenever it suits you. Finish a saved game on different days to unlock these extras. Breaks never reset your progress. Earlier qualifying games count. Each date counts once, using UTC.</p><p class="avatar-academy-count" data-active-days-count></p><div class="avatar-challenge-grid" data-day-rewards></div></section><p class="avatar-pane-note">Try different games to earn a little extra. Completed rounds saved to your account count.</p><div class="avatar-challenge-grid" data-discovery-rewards></div>':''}${key==='academy'?'<p class="avatar-pane-note">Complete all lesson quizzes in a course while signed in. Earned extras stay yours.</p><p class="avatar-academy-count" data-academy-count></p><div class="avatar-academy-grid" data-academy-rewards></div>':''}${key==='extras'?'<p class="avatar-pane-note">Choose an unlocked extra, then save your look.</p>':''}${Object.entries(p.groups).map(([kind,name])=>group(kind,name)).join('')}</div>`).join('')}</div></div>`;
    showPane(root,active);
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{
      tab.addEventListener('click',()=>showPane(root,tab.dataset.avatarTab));
      tab.addEventListener('keydown',event=>{
        if(event.altKey||event.ctrlKey||event.metaKey)return;
        const keys=Object.keys(panes),index=keys.indexOf(tab.dataset.avatarTab);
        const next=event.key==='ArrowRight'?keys[(index+1)%keys.length]:event.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:event.key==='Home'?keys[0]:event.key==='End'?keys.at(-1):null;
        if(next){event.preventDefault();showPane(root,next);root.querySelector(`[data-avatar-tab="${next}"]`).focus();}
      });
    });
  }
  function showPane(root,key){
    active=key in panes?key:'look';
    root.dataset.studioPane=active;
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{const selected=tab.dataset.avatarTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-avatar-pane]').forEach(panel=>panel.hidden=panel.dataset.avatarPane!==active);
    for(const selector of ['.avatar-mode','.avatar-mobile-preview','.avatar-help','.profile-style-actions','[data-style-status]','[data-style-storage]','[data-style-sharing]']){
      const element=root.querySelector(selector);if(element)element.hidden=active==='badges';
    }
    root.dispatchEvent(new CustomEvent('brainilab:avatarpanechange',{detail:{pane:active}}));
  }
  function sample(kind,item,draft,total){
    if(['glasses','hat','prop'].includes(kind))return A.preview(kind,item.id,draft);
    if(kind==='scene')return `<span class="profile-scene-sample" data-profile-scene="${item.id}"></span>`;
    if(kind==='title')return `<span class="reward-title-name">${escapeCopy(BrainiData.player().displayName||'Your name')}</span>`;
    if(item.color)return `<span class="avatar-swatch" style="--swatch:${item.color}"></span>`;
    if(kind==='mode'&&item.id==='picture')return BrainiProgressUI.avatarImageMarkup({...BrainiData.player(),avatarDesign:null});
    if(kind==='frame'){
      const player=BrainiData.player(),level=BrainiProgressUI.xpProgress?.(player.level,total)?.level||player.level||1;
      const portrait=draft.mode==='built'?A.markup(draft,total):BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
      return `<span class="rank-avatar reward-frame-sample ${BrainiProgressUI.avatarClass(level)}"${item.id==='level'?'':` data-profile-frame="${item.id}"`}>${portrait}</span>`;
    }
    return A.markup({...draft,mode:'built',[kind]:item.id},Number.MAX_SAFE_INTEGER);
  }
  function choices(root,draft,total,busy,academy=[],discovery=[],equipped=draft,options={}){
    collectionSummary(root,total,options);
    for(const [kind,items] of Object.entries(C.groups)){
      const grid=root.querySelector(`[data-style-${kind}s]`);if(!grid)continue;
      for(const item of items){
        if(item.course||item.challenge||item.days)continue;
        let button=grid.querySelector(`[data-reward-id="${item.id}"]`);
        if(!button){
          button=document.createElement('button');button.type='button';button.className='reward-choice';button.dataset.rewardKind=kind;button.dataset.rewardId=item.id;
          button.innerHTML='<span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small>';grid.append(button);
        }
        const art=sample(kind,item,draft,total),artRoot=button.querySelector('.reward-choice-art');
        if(kind==='frame')BrainiProgressUI.setAvatarMarkup(artRoot,art);else if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
        artRoot.hidden=!art;
        const selected=draft[kind]===item.id,locked=item.event?!C.isUnlocked(item,total):item.xp>total;
        button.disabled=busy||locked;button.setAttribute('aria-pressed',String(selected));
        button.querySelector('strong').textContent=item.name;
        initialStatus(button,locked?item.event?item.requirement:`Locked · ${number(item.xp)} XP`:selected?'Selected':item.xp?'Unlocked':kind==='mode'?'Choose':'Free');
        button.title=item.description||item.name;
        button.setAttribute('aria-label',`${item.name}, ${locked?item.event?item.requirement:'unlocks at '+number(item.xp)+' XP':selected?'selected':item.xp?'unlocked':'available'}${item.description?'. '+item.description:''}`);
      }
      const chosen=items.find(item=>item.id===draft[kind]),note=root.querySelector(`[data-avatar-note="${kind}"]`);
      if(note){const text=chosen?.description?`${chosen.name}. ${chosen.description}`:'';if(note.textContent!==text)note.textContent=text;note.hidden=!text;}
    }
    const grid=root.querySelector('[data-academy-rewards]');
    for(const item of C.academyRewards){
      let card=grid.querySelector(`[data-academy-card="${item.id}"]`);
      if(!card){
        card=document.createElement('div');card.className='avatar-academy-card';card.dataset.academyCard=item.id;
        card.innerHTML='<button class="reward-choice" type="button"><span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small></button><a></a>';
        const link=card.querySelector('a');link.href='/learn/paths/'+item.course+'/';link.textContent=item.courseTitle+' →';
        link.setAttribute('aria-label','Open course: '+item.courseTitle);
        const button=card.querySelector('button');button.dataset.rewardKind=item.kind;button.dataset.rewardId=item.id;grid.append(card);
      }
      const button=card.querySelector('button'),selected=draft[item.kind]===item.id,earned=C.unlocked(item,total,academy);
      const artRoot=button.querySelector('.reward-choice-art'),art=sample(item.kind,item,draft,total);
      if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
      button.disabled=busy||!earned;button.setAttribute('aria-pressed',String(selected));
      button.querySelector('strong').textContent=item.name;
      initialStatus(button,selected?'Selected':earned?'Unlocked':'Complete the course');
      button.setAttribute('aria-label',`${item.name}, ${selected?'selected':earned?'unlocked':'complete '+item.courseTitle+' to unlock'}. ${item.description}`);
      button.title=item.description;
    }
    const count=C.academyIds(academy).length;
    root.querySelector('[data-academy-count]').textContent=options.loading?'Checking your course rewards…':options.error?'Course rewards could not be checked.':`${count} of ${C.academyRewards.length} extras unlocked · no XP needed`;
    challengeChoices(root,draft,total,busy,discovery);
    dayChoices(root,draft,total,busy,options.activeDays);
    window.BrainiWardrobeUI?.render(root,{draft,equipped,total,busy,academy,discovery,...options});
  }
  function challengeChoices(root,draft,total,busy,discovery){
    const grid=root.querySelector('[data-discovery-rewards]');if(!grid)return;
    for(const item of C.discoveryRewards){
      let card=grid.querySelector(`[data-discovery-card="${item.id}"]`);
      if(!card){
        card=document.createElement('section');card.className='avatar-challenge-card';card.dataset.discoveryCard=item.id;
        card.innerHTML='<button class="reward-choice" type="button"><span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small></button><div class="avatar-challenge-progress"><h3></h3><p data-challenge-rule></p><p data-challenge-status></p><progress></progress><p class="avatar-challenge-missing" data-challenge-missing></p><a></a></div>';
        const button=card.querySelector('button');button.dataset.rewardKind=item.kind;button.dataset.rewardId=item.id;grid.append(card);
      }
      const proof=C.discoveryProgress(item,discovery),selected=draft[item.kind]===item.id,button=card.querySelector('button');
      const art=sample(item.kind,item,draft,total),artRoot=button.querySelector('.reward-choice-art');if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
      button.disabled=busy||!proof.earned;button.setAttribute('aria-pressed',String(selected));
      button.querySelector('strong').textContent=item.name;initialStatus(button,selected?'Selected':proof.earned?'Unlocked':'Finish the challenge');
      button.setAttribute('aria-label',`${item.name}, ${selected?'selected':proof.earned?'unlocked':'finish '+item.challenge+' to unlock'}. ${item.description}`);button.title=item.description;
      card.querySelector('h3').textContent=item.challenge;
      card.querySelector('[data-challenge-rule]').textContent=item.target?`Complete ${item.target} different games.`:'Complete '+item.games.map(id=>C.discoveryGames.find(g=>g.id===id).name).join(', ')+'.';
      card.querySelector('[data-challenge-status]').textContent=busy?'Checking saved progress…':`${proof.completed} of ${proof.target} games completed`;
      const progress=card.querySelector('progress');progress.max=proof.target;progress.value=proof.completed;progress.setAttribute('aria-label',`${item.challenge}: ${proof.completed} of ${proof.target} games`);
      const missing=card.querySelector('[data-challenge-missing]');missing.textContent=item.games&&!proof.earned?'Still to try: '+proof.missing.map(id=>C.discoveryGames.find(g=>g.id===id).name).join(', ')+'.':'';missing.hidden=!missing.textContent;
      const next=C.discoveryGames.find(g=>g.id===proof.missing[0]),link=card.querySelector('a');
      link.href=proof.earned||item.target?'/games/':next?.path||'/games/';link.textContent=proof.earned?'Explore more games →':item.target?'Find a different game →':`Play ${next?.name||'a game'} →`;
    }
  }
  function dayChoices(root,draft,total,busy,activeDays){
    const grid=root.querySelector('[data-day-rewards]');if(!grid)return;
    const days=C.dayCount(activeDays);
    root.querySelector('[data-active-days-count]').textContent=busy?'Checking saved days…':`${number(days)} ${days===1?'day':'days'} played · no streak needed`;
    for(const item of C.dayRewards){
      let card=grid.querySelector(`[data-day-card="${item.id}"]`);
      if(!card){
        card=document.createElement('section');card.className='avatar-challenge-card avatar-day-card';card.dataset.dayCard=item.id;
        card.innerHTML='<button class="reward-choice" type="button"><span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small></button><div class="avatar-challenge-progress"><h4></h4><p data-day-status></p><progress></progress><a href="/games/">Find a game →</a></div>';
        const button=card.querySelector('button');button.dataset.rewardKind=item.kind;button.dataset.rewardId=item.id;grid.append(card);
      }
      const earned=days>=item.days,selected=draft[item.kind]===item.id,button=card.querySelector('button');
      const art=sample(item.kind,item,draft,total),artRoot=button.querySelector('.reward-choice-art');if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
      button.disabled=busy||!earned;button.setAttribute('aria-pressed',String(selected));
      button.querySelector('strong').textContent=item.name;initialStatus(button,selected?'Selected':earned?'Unlocked':`${number(item.days)} days to unlock`);
      button.setAttribute('aria-label',`${item.name}, ${selected?'selected':earned?'unlocked':'play on '+item.days+' different days to unlock'}. ${item.description}`);button.title=item.description;
      card.querySelector('h4').textContent=`Play on ${number(item.days)} different days`;
      card.querySelector('[data-day-status]').textContent=busy?'Checking saved progress…':`${number(Math.min(days,item.days))} of ${number(item.days)} days played`;
      const progress=card.querySelector('progress');progress.max=item.days;progress.value=Math.min(days,item.days);progress.setAttribute('aria-label',`${item.name}: ${number(Math.min(days,item.days))} of ${number(item.days)} days played`);
    }
  }
  function next(root,total,state={}){
    const goal=C.collectionGoal(total,state),reward=goal?.item,target=root.querySelector('[data-next-reward]');
    const labels={frame:'avatar frame',title:'profile title',glasses:'glasses',hat:'hat',prop:'little extra',scene:'profile background'};
    const focus=target.contains(document.activeElement),player=BrainiData.player();
    const art=reward?['glasses','hat','prop'].includes(reward.kind)?A.preview(reward.kind,reward.id,player.avatarDesign):window.BrainiRewardJourney?.art(reward,player)||'':'';
    const heading=goal?.type==='days'?'Days played':goal?.type==='discovery'?'Try something new':goal?.type==='academy'?'Learn something new':'Next avatar extra';
    const detail=!goal?'':goal.type==='xp'?`${number(goal.remaining)} XP to go · ${labels[reward.kind]}`:goal.type==='days'?`${number(goal.value)} of ${number(goal.max)} days played`:goal.type==='discovery'?`${number(goal.value)} of ${number(goal.max)} games tried`:'Finish '+reward.courseTitle;
    const markup=goal?`<a class="avatar-goal-link" href="#avatar-panel-${['days','discovery'].includes(goal.type)?'challenges':goal.type==='academy'?'academy':['glasses','hat','prop'].includes(reward.kind)?'extras':'rewards'}" data-collection-goal="${goal.type}" data-goal-kind="${reward.kind}" data-goal-id="${reward.id}"><span class="avatar-goal-art" aria-hidden="true">${art}</span><span><span class="reward-kicker">${heading}</span><strong>${escapeCopy(reward.name)}</strong><small>${escapeCopy(detail)}</small></span><span class="avatar-goal-arrow" aria-hidden="true">→</span></a><progress></progress>${goal.type==='days'?'<small class="avatar-goal-note">Days add up, even with breaks.</small>':''}`:'<span class="reward-kicker">YOUR COLLECTION</span><strong>Every XP reward is unlocked</strong><p>Pick your favourites and make them yours.</p>';
    if(target.dataset.goalMarkup!==markup){target.innerHTML=markup;target.dataset.goalMarkup=markup;if(focus)target.querySelector('a')?.focus({preventScroll:true});}
    const progress=target.querySelector('progress');
    if(progress){progress.max=goal.max;progress.value=goal.value;progress.setAttribute('aria-label',`${reward.name}: ${number(goal.value)} of ${number(goal.max)} ${goal.type==='xp'?'XP since your last avatar extra':goal.type==='days'?'days played':goal.type==='discovery'?'games tried':'course completed'}`);}
  }
  function openGoal(root,link){
    const type=link.dataset.collectionGoal,kind=link.dataset.goalKind,id=link.dataset.goalId;
    const pane=['days','discovery'].includes(type)?'challenges':type==='academy'?'academy':['glasses','hat','prop'].includes(kind)?'extras':'rewards';
    showPane(root,pane);
    const card=type==='days'?root.querySelector(`[data-day-card="${id}"]`):type==='discovery'?root.querySelector(`[data-discovery-card="${id}"]`):root.querySelector(`[data-reward-kind="${kind}"][data-reward-id="${id}"]`)?.closest('.avatar-option-group,.avatar-academy-card');
    const target=card||root.querySelector(`[data-avatar-pane="${pane}"]`);if(target){target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest'});}
  }
  return {mount,showPane,choices,next,openGoal,activePane:()=>active};
})();
