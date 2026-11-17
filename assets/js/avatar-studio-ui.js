window.BrainiAvatarStudioUI=(function(){
  const C=BrainiRewardCatalog,A=BrainiAvatarDesign;
  const panes={
    look:{label:'Your look',groups:{skin:'Skin tone',hairColor:'Hair colour',shirt:'Shirt',background:'Background'}},
    hair:{label:'Hair',groups:{hair:'Hair'}},
    glasses:{label:'Glasses',groups:{glasses:'Glasses'}},
    hat:{label:'Hats',groups:{hat:'Hats'}},
    prop:{label:'Extras',groups:{prop:'Extras'}},
    frame:{label:'Frames',groups:{frame:'Avatar frame'}},
    title:{label:'Titles',groups:{title:'Profile title'}},
    scene:{label:'Backgrounds',groups:{scene:'Avatar scene'}},
    challenges:{label:'Challenges',groups:{}},academy:{label:'Academy',groups:{}}
  };
  const cosmeticPanes=['glasses','hat','prop','frame','title','scene'];
  const slotLabels={hat:'Hat',glasses:'Glasses',prop:'Extra',frame:'Frame'};
  const icons={
    hat:'<path d="M3 15h18M5 15l2-8h10l2 8"/>',
    glasses:'<circle cx="6.5" cy="12" r="4"/><circle cx="17.5" cy="12" r="4"/><path d="M10.5 12h3"/>',
    prop:'<path d="m12 3 2.7 5.7 6.3.8-4.6 4.5 1.1 6.3-5.5-3-5.5 3 1.1-6.3L3 9.5l6.3-.8z"/>',
    frame:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5"/>',
    dice:'<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 8h.01m4 4h.01m4 4h.01" stroke-width="3"/>',
    look:'<circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/>',
    hair:'<path d="M4 15V11a8 8 0 1 1 16 0v4M4 12c5 0 8-4 9-7 1 4 4 6 7 6"/>',
    title:'<rect x="3" y="6" width="18" height="12" rx="3"/><path d="M7 11h10m-10 3h6"/>',
    scene:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m3 16 5-5 4 4 3-3 6 6"/><circle cx="16" cy="9" r="1"/>',
    challenges:'<path d="M13 2 4 14h7l-1 8 10-12h-7l1-8Z"/>',
    academy:'<path d="M3 5c4-1 7 0 9 2 2-2 5-3 9-2v14c-4-1-7 0-9 2-2-2-5-3-9-2ZM12 7v14"/>',
    badges:'<circle cx="12" cy="8" r="5"/><path d="m8 12-2 9 6-3 6 3-2-9"/>',
    empty:'<circle cx="12" cy="12" r="8"/><path d="m6.5 17.5 11-11"/>',
    reset:'<path d="M3 11a9 9 0 1 1 2 7M3 5v6h6"/>'
  };
  function icon(name){
    return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  }
  if(window.BrainiAchievementCatalog)panes.badges={label:'Badges',groups:{}};
  let active='look',filter='all';
  const choiceViews=new WeakMap();
  const number=n=>n.toLocaleString('en-GB');
  const rarity=xp=>xp>=6000?'Legendary':xp>=3000?'Epic':xp>=1000?'Rare':xp>0?'Common':'Starter';
  function initialStatus(button,copy){if(!window.BrainiWardrobeUI)button.querySelector('small').textContent=copy;}
  function group(kind,name){
    const summary=cosmeticPanes.includes(kind)?`<small class="avatar-collection-summary" data-style-collection="${kind}"></small>`:'';
    return `<fieldset class="avatar-option-group"><legend><span class="avatar-option-heading"><span>${name}</span>${summary}</span></legend><div class="reward-grid reward-grid-${kind}" data-style-${kind}s></div><p class="avatar-item-note" data-avatar-note="${kind}" hidden></p></fieldset>`;
  }
  const escapeCopy=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function collectionSummary(root,total,options){
    for(const summary of root.querySelectorAll('[data-style-collection]')){
      const kind=summary.dataset.styleCollection,items=C.groups[kind].filter(item=>!item.course&&!item.challenge&&!item.days);
      const available=items.filter(item=>C.isUnlocked(item,total)).length;
      summary.textContent=options.loading?'Checking…':options.error?'Unavailable':`${available} of ${items.length} unlocked`;
      const count=options.loading||options.error?'':`${available}/${items.length}`;
      root.querySelector(`[data-avatar-tab="${kind}"] [data-studio-tab-count]`).textContent=count;
      const option=root.querySelector(`[data-avatar-category] option[value="${kind}"]`),label=panes[kind].label;
      option.textContent=count?`${label} · ${count}`:label;
      option.setAttribute('aria-label',count?`${label}, ${available} of ${items.length} unlocked`:label);
    }
  }
  function mount(root){
    choiceViews.delete(root);
    active='look';filter='all';
    root.classList.add('avatar-studio-redesign');
    const resetLook=`<button class="btn-light" type="button" data-style-cancel aria-label="Reset to saved look" title="Reset to saved look">${icon('reset')}<span>Reset</span></button>`;
    root.innerHTML=`<div class="avatar-studio-layout">
      <div class="avatar-studio-sidebar">
        <section class="avatar-studio-stage" aria-label="Avatar preview">
          <div class="avatar-stage-heading"><h2 tabindex="-1" data-avatar-preview-heading>Avatar studio</h2><span data-avatar-level></span></div>
          <div class="avatar-stage-art">
            <img class="avatar-stage-scene" data-avatar-stage-scene width="512" height="768" alt="" hidden>
            <button type="button" class="avatar-surprise" data-avatar-surprise aria-label="Surprise me with unlocked avatar items" title="Surprise me with unlocked avatar items">${icon('dice')}<span>Surprise me</span></button>
            <span class="avatar-preview-label" data-style-preview-label>Your avatar</span>
            <span class="rank-avatar avatar-studio-portrait" data-style-preview-avatar aria-hidden="true"></span>
            <div class="avatar-equipped" role="group" aria-label="Equipped">
              ${Object.entries(slotLabels).map(([kind,label])=>`<button type="button" data-studio-slot="${kind}">${icon(kind)}<span><small>${label}</small><strong></strong></span></button>`).join('')}
            </div>
            <button type="button" class="avatar-motion-toggle" data-avatar-motion aria-pressed="false">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 4v8m4-8v8"/></svg>
              Pause avatar motion
            </button>
          </div>
      <div class="avatar-stage-identity" data-diploma-tier="rookie" aria-label="BrainiLab progress diploma"><span class="avatar-diploma-seal" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g data-diploma-mark="rookie"><circle cx="24" cy="23" r="15"/><path d="m24 15 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g><g data-diploma-mark="elementary"><circle cx="24" cy="24" r="17"/><path d="M24 34V19M24 26Q12 27 13 15Q25 14 24 26ZM24 22Q24 11 36 13Q37 24 24 22Z" fill="currentColor" fill-opacity=".16"/></g><g data-diploma-mark="highschool"><path d="m24 4 5 5 8 1 1 8 5 6-5 6-1 8-8 1-5 5-5-5-8-1-1-8-5-6 5-6 1-8 8-1Z" fill="currentColor" fill-opacity=".12"/><path d="m24 13 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z"/></g><g data-diploma-mark="college"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M15 16Q20 14 24 18Q28 14 33 16V30Q28 28 24 32Q20 28 15 30ZM24 18V32"/><path d="M18 21H21M27 21H30M18 25H21M27 25H30" stroke-width="1.5"/></g><g data-diploma-mark="graduate"><path d="M14 38Q2 24 11 10M34 38Q46 24 37 10M10 16 5 14M8 23 3 22M9 30 4 31M12 35 8 39M38 16 43 14M40 23 45 22M39 30 44 31M36 35 40 39"/><circle cx="24" cy="23" r="12" fill="currentColor" fill-opacity=".14"/><path d="m24 14 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="phd"><path d="m24 3 18 10v22L24 45 6 35V13Z" fill="currentColor" fill-opacity=".13"/><path d="m24 9 13 7v16l-13 7-13-7V16Z" stroke-width="1"/><path d="m24 14 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="currentColor"/></g><g data-diploma-mark="researcher"><circle cx="24" cy="24" r="4" fill="currentColor"/><ellipse cx="24" cy="24" rx="20" ry="8"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="20" ry="8" transform="rotate(120 24 24)"/></g><g data-diploma-mark="professor"><path d="M24 4 41 12V28Q37 38 24 44Q11 38 7 28V12Z" fill="currentColor" fill-opacity=".14"/><path d="M14 20Q20 17 24 22Q28 17 34 20V33Q28 30 24 35Q20 30 14 33ZM24 22V35"/><path d="m24 10 1 3 4 1-3 2v3l-2-2-3 2 1-3-3-2 4-1Z" fill="currentColor" stroke-width="1"/></g><g data-diploma-mark="dean"><path d="M24 3 42 11V29Q36 39 24 45Q12 39 6 29V11Z" fill="currentColor" fill-opacity=".18"/><path d="m13 18 6 5 5-10 5 10 6-5-3 15H16ZM17 37H31" fill="currentColor" fill-opacity=".25"/><circle cx="13" cy="16" r="2" fill="currentColor"/><circle cx="24" cy="11" r="2" fill="currentColor"/><circle cx="35" cy="16" r="2" fill="currentColor"/></g><g data-diploma-mark="nobel"><path d="m24 2 5 5 8-1 2 8 7 5-4 7 1 9-8 2-5 8-7-4-9 2-3-8-8-5 4-8-1-8 8-3 4-8Z" fill="currentColor" fill-opacity=".22"/><circle cx="24" cy="24" r="14"/><path d="m24 12 3 8 9 1-7 6 2 9-7-5-7 5 2-9-7-6 9-1Z" fill="currentColor" stroke-width="1"/></g></svg></span><div class="avatar-diploma-copy"><span class="avatar-diploma-tier" data-avatar-diploma-tier></span><strong data-style-preview-name></strong><p data-style-preview-title></p><small data-avatar-diploma-next></small></div></div>
          ${panes.badges?'<div data-featured-achievements></div>':''}
          <details class="avatar-help"><summary>About your look</summary><p class="avatar-storage-note" data-style-storage></p><p class="avatar-sharing-note" data-style-sharing></p></details>
        </section>
        <div class="avatar-mobile-preview avatar-apply-bar">
          <button type="button" data-avatar-mini aria-label="See your avatar preview"></button>
          <div class="avatar-apply-copy"><span data-avatar-mini-label></span><p class="profile-style-status" role="status" aria-live="polite" data-style-status></p></div>
          <div class="profile-style-actions">
            ${resetLook}
            <button class="btn" type="button" data-style-save>Save look</button>
            <button class="btn-light" type="button" data-style-retry hidden>Try again</button>
          </div>
        </div>
      </div>
      <section class="avatar-studio-controls" aria-label="Locker">
        <div class="avatar-locker-toolbar">
          <div class="avatar-locker-header">
            <h3>Locker</h3>
            <div class="avatar-locker-actions">
              ${resetLook}
              <button class="btn avatar-locker-save" type="button" data-style-save>Save look</button>
              <a class="avatar-play-link" href="/games/">Earn XP <span aria-hidden="true">→</span></a>
            </div>
          </div>
          <label class="avatar-locker-category">
            <span>Category</span>
            <select data-avatar-category>
              ${Object.entries(panes).map(([key,p])=>`<option value="${key}">${p.label}</option>`).join('')}
            </select>
          </label>
          <div class="avatar-studio-tabs" role="tablist" aria-label="Locker categories">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${icon(key)}<span class="avatar-tab-label">${p.label}</span>${cosmeticPanes.includes(key)?'<span data-studio-tab-count></span>':''}</button>`).join('')}</div>
        </div>
        <div class="avatar-next-reward" data-next-reward></div>
        <div class="avatar-locker-content">
          <div class="avatar-filter" data-studio-filters hidden>
            <div role="group" aria-label="Filter items">${[['all','All'],['unlocked','Unlocked'],['locked','Locked']].map(([key,label])=>`<button type="button" data-studio-filter="${key}">${label} <span></span></button>`).join('')}</div>
            <label class="avatar-filter-mobile"><input type="checkbox" data-studio-unlocked> Unlocked only</label>
          </div>
          <p class="avatar-filter-empty" data-studio-empty hidden>No items match this filter.</p>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='badges'?'<div data-achievements-panel></div>':''}${key==='challenges'?'<section class="avatar-day-collection" aria-labelledby="avatar-days-title"><h3 id="avatar-days-title" class="avatar-collection-heading">Days played</h3><p class="avatar-pane-note">A little time to play, whenever it suits you. Finish a saved game on different days to unlock these extras. Breaks never reset your progress. Earlier qualifying games count. Each date counts once, using UTC.</p><p class="avatar-academy-count" data-active-days-count></p><div class="avatar-challenge-grid" data-day-rewards></div></section><p class="avatar-pane-note">Try different games to earn a little extra. Completed rounds saved to your account count.</p><div class="avatar-challenge-grid" data-discovery-rewards></div>':''}${key==='academy'?'<p class="avatar-pane-note">Complete all lesson quizzes in a course while signed in. Earned extras stay yours.</p><p class="avatar-academy-count" data-academy-count></p><div class="avatar-academy-grid" data-academy-rewards></div>':''}${key==='look'?'<div class="avatar-mode" role="group" aria-labelledby="avatar-start-label"><h3 id="avatar-start-label">Start with</h3><div class="reward-mode-grid" data-style-modes></div></div>':''}${Object.entries(p.groups).map(([kind,name])=>group(kind,name)).join('')}</div>`).join('')}
        </div>
      </section></div>
      <section class="avatar-unlock-road" aria-label="Unlock road" data-studio-road hidden></section>`;
    showPane(root,active);
    root.querySelector('[data-avatar-category]').addEventListener('change',event=>{
      showPane(root,event.currentTarget.value,{reveal:true});
    });
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{
      tab.addEventListener('click',()=>showPane(root,tab.dataset.avatarTab,{reveal:true}));
      tab.addEventListener('keydown',event=>{
        if(event.altKey||event.ctrlKey||event.metaKey)return;
        const keys=Object.keys(panes),index=keys.indexOf(tab.dataset.avatarTab);
        const next=event.key==='ArrowRight'?keys[(index+1)%keys.length]:event.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:event.key==='Home'?keys[0]:event.key==='End'?keys.at(-1):null;
        if(next){event.preventDefault();showPane(root,next,{reveal:true,focus:true});}
      });
    });
    root.querySelectorAll('[data-studio-filter]').forEach(button=>button.addEventListener('click',()=>{
      filter=button.dataset.studioFilter;
      applyFilter(root);
    }));
    root.querySelector('[data-studio-unlocked]').addEventListener('change',event=>{
      filter=event.target.checked?'unlocked':'all';
      applyFilter(root);
    });
    root.querySelectorAll('[data-studio-slot]').forEach(button=>button.addEventListener('click',()=>{
      showPane(root,button.dataset.studioSlot,{reveal:true,focus:true});
    }));
  }
  function applyFilter(root){
    const group=root.querySelector('[data-studio-filters]'),empty=root.querySelector('[data-studio-empty]');
    const enabled=cosmeticPanes.includes(active),panel=root.querySelector(`[data-avatar-pane="${active}"]`);
    group.hidden=!enabled;
    empty.hidden=true;
    if(!enabled)return;
    const cards=[...panel.querySelectorAll('[data-studio-locked]')];
    const locked=cards.filter(card=>card.dataset.studioLocked==='true').length;
    const counts={all:cards.length,unlocked:cards.length-locked,locked};
    for(const button of group.querySelectorAll('[data-studio-filter]')){
      const key=button.dataset.studioFilter;
      button.setAttribute('aria-pressed',String(key===filter));
      button.querySelector('span').textContent=counts[key];
    }
    group.querySelector('[data-studio-unlocked]').checked=filter==='unlocked';
    for(const card of cards){
      card.hidden=filter!=='all'&&card.dataset.studioLocked!==String(filter==='locked');
      if(card.hidden&&card===document.activeElement)focusCategory(root);
    }
    empty.hidden=counts[filter]>0;
  }
  function focusCategory(root){
    const picker=root.querySelector('[data-avatar-category]');
    const control=picker.getClientRects().length?picker:root.querySelector(`[data-avatar-tab="${active}"]`);
    control.focus({preventScroll:true});
  }
  function showPane(root,key,{reveal=false,focus=false}={}){
    const next=Object.hasOwn(panes,key)?key:'look';
    if(next!==active)filter='all';
    active=next;
    root.dataset.studioPane=active;
    const picker=root.querySelector('[data-avatar-category]');
    picker.value=active;
    picker.setAttribute('aria-controls',`avatar-panel-${active}`);
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{const selected=tab.dataset.avatarTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-avatar-pane]').forEach(panel=>panel.hidden=panel.dataset.avatarPane!==active);
    root.querySelector('.avatar-apply-bar').hidden=active==='badges';
    for(const button of root.querySelectorAll('[data-studio-slot]'))button.classList.toggle('is-current',button.dataset.studioSlot===active);
    applyFilter(root);
    if(reveal)root.querySelector('.avatar-studio-controls').scrollIntoView?.({block:'start',behavior:'instant'});
    if(focus)focusCategory(root);
    root.dispatchEvent(new CustomEvent('brainilab:avatarpanechange',{detail:{pane:active}}));
  }
  function equippedSlots(root,look,locked){
    for(const button of root.querySelectorAll('[data-studio-slot]')){
      const kind=button.dataset.studioSlot,item=C.item(kind,look[kind]);
      const blocked=locked?.kind===kind;
      const name=look.mode==='picture'&&kind!=='frame'?'None':item.name;
      button.querySelector('strong').textContent=name+(blocked?' · locked':'');
      button.setAttribute('aria-label',`${slotLabels[kind]}: ${name}${blocked?' (locked)':''}`);
      button.classList.toggle('is-locked-preview',blocked);
    }
  }
  function sceneForeground(player){
    const people=window.BrainiPeople;
    if(!people)return '';
    let person=people.resolve(player);
    if(player.avatarUrl){
      try{
        const url=new URL(player.avatarUrl,location.origin);
        if(url.origin!==location.origin&&url.origin!=='https://brainilabgames.com')return '';
        person=people.PEOPLE.find(entry=>entry.avatar===url.pathname);
      }catch{return '';}
    }
    return person?`<img class="avatar-scene-foreground" src="/assets/avatars/knowledge-foreground/${person.id}.svg" width="128" height="128" alt="" title="Illustration inspired by ${escapeCopy(person.name)}">`:'';
  }
  function portrait(look,player,total,instance,cropHair=false){
    const progress=BrainiProgressUI.xpProgress?.(player.level,total);
    const studioArt=window.BrainiAvatarStudioArt;
    const sceneUrl=studioArt?.sceneSource?.(look.scene),inStage=instance==='stage';
    if(look.mode==='built'){
      return studioArt?.markup(look,{instance,level:progress?.level||player.level||1,levelPct:(progress?.percent||0)/100,cropHair,
        scene:look.scene,transparentBackdrop:inStage&&!!sceneUrl})||A.markup(look,total);
    }
    const foreground=sceneUrl&&sceneForeground(player);
    const picture=foreground||BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
    if(inStage)return picture+(studioArt?.frameOverlay(look.frame)||'');
    return foreground?`<span class="avatar-scene-picture"><img class="avatar-scene-picture-art" src="${sceneUrl}" width="512" height="768" alt="">${foreground}</span>`:picture;
  }
  function sample(kind,item,draft,total){
    if(['glasses','hat','prop'].includes(kind))return item.id==='none'?
      '<span class="avatar-empty-art">'+icon('empty')+'</span>':A.preview(kind,item.id,draft);
    if(kind==='scene'){
      const sceneUrl=window.BrainiAvatarStudioArt?.sceneSource?.(item.id);
      return sceneUrl?`<img class="profile-scene-sample" src="${sceneUrl}" width="512" height="768" loading="lazy" decoding="async" alt="">`:
        `<span class="profile-scene-sample" data-profile-scene="${item.id}"></span>`;
    }
    if(kind==='title'){
      if(item.id==='none')return '<span class="avatar-empty-art">'+icon('empty')+'</span>';
      return BrainiProgressUI.profileTitleArt?.(item.id)??escapeCopy(item.name);
    }
    if(kind==='background')return '<svg class="avatar-backdrop-sample" viewBox="0 0 200 200" aria-hidden="true">'+A.backdrop(item.id)+'</svg>';
    if(item.color)return '<span class="avatar-swatch" style="--swatch:'+A.swatch(kind,item.id)+'"></span>';
    if(kind==='mode'&&item.id==='picture')return BrainiProgressUI.avatarImageMarkup({...BrainiData.player(),avatarDesign:null});
    if(kind==='frame'){
      const player=BrainiData.player(),level=BrainiProgressUI.xpProgress?.(player.level,total)?.level||player.level||1;
      const portrait=draft.mode==='built'?A.markup({...draft,hat:'none',prop:'none'},total):BrainiProgressUI.avatarImageMarkup({...player,avatarDesign:null});
      return `<span class="rank-avatar reward-frame-sample ${BrainiProgressUI.avatarClass(level)}"${item.id==='level'?'':` data-profile-frame="${item.id}"`}>${portrait}</span>`;
    }
    return A.markup({...draft,mode:'built',[kind]:item.id},Number.MAX_SAFE_INTEGER);
  }
  function choices(root,draft,total,busy,academy=[],discovery=[],equipped=draft,options={}){
    // Cloud/profile events often repeat the same snapshot. Keep the existing
    // expanded controls and decoded artwork instead of repainting every choice.
    const player=BrainiData.player(),groups=C.groups;
    const signature=JSON.stringify([draft,equipped,total,!!busy,academy,discovery,
      options.loading,options.error,options.activeDays,options.locked,player.id,player.displayName,
      player.avatarUrl,player.level,player.identityName,player.name,player.defaultSeed,
      Object.entries(groups).map(([kind,items])=>[kind,items.map(item=>item.id)]),
      window.BrainiHalloweenEntitlements?.snapshot?.().entitlements||[]]);
    if(choiceViews.get(root)===signature)return;
    collectionSummary(root,total,options);
    for(const [kind,items] of Object.entries(groups)){
      const grid=root.querySelector(`[data-style-${kind}s]`);if(!grid)continue;
      const visible=new Set(items.filter(item=>!item.course&&!item.challenge&&!item.days).map(item=>item.id));
      for(const button of grid.querySelectorAll('[data-reward-id]'))if(!visible.has(button.dataset.rewardId))button.remove();
      for(const item of items){
        if(item.course||item.challenge||item.days)continue;
        let button=grid.querySelector(`[data-reward-id="${item.id}"]`);
        if(!button){
          button=document.createElement('button');button.type='button';button.className='reward-choice';button.dataset.rewardKind=kind;button.dataset.rewardId=item.id;
          button.innerHTML='<span class="reward-choice-art" aria-hidden="true"></span><strong></strong>'+ (cosmeticPanes.includes(kind)?'<span class="avatar-rarity"></span>':'') +'<small></small>';grid.append(button);
        }
        const itemLook={...draft,[kind]:item.id,mode:kind==='frame'?draft.mode:'built'};
        const fittingLook={...itemLook,glasses:'none',hat:'none',prop:'none'};
        const usePortrait=window.BrainiAvatarStudioArt&&
          (kind==='hair'||(kind==='frame'&&draft.mode==='built'&&item.id!=='midnight'));
        const art=usePortrait?portrait(fittingLook,player,total,'card-'+kind+'-'+item.id,kind==='hair'):
          sample(kind,item,draft,total);
        const artRoot=button.querySelector('.reward-choice-art');
        BrainiProgressUI.setAvatarMarkup(artRoot,art);
        artRoot.hidden=!art;
        const selected=draft[kind]===item.id,locked=item.event?!C.isUnlocked(item,total):item.xp>total;
        button.disabled=busy||(locked&&item.event);button.setAttribute('aria-pressed',String(selected));
        button.dataset.studioLocked=String(locked);
        if(cosmeticPanes.includes(kind)){
          const tier=item.event?'Event':rarity(item.xp);
          button.dataset.rarity=tier.toLowerCase();
          button.querySelector('.avatar-rarity').textContent=tier;
        }
        button.querySelector('strong').textContent=item.name;
        initialStatus(button,locked?item.event?item.requirement:`${selected?'Preview only · ':''}${number(item.xp-total)} XP to go`:selected?'Selected':item.xp?'Unlocked':kind==='mode'?'Choose':'Free');
        button.title=item.description||item.name;
        button.setAttribute('aria-label',`${item.name}, ${locked?item.event?item.requirement:(selected?'preview only, ':'try on only, ')+'unlocks at '+number(item.xp)+' XP':selected?'selected':item.xp?'unlocked':'available'}${item.description?'. '+item.description:''}`);
      }
      const chosen=items.find(item=>item.id===draft[kind]),note=root.querySelector(`[data-avatar-note="${kind}"]`);
      if(note){
        const sceneCoversColour=kind==='background'&&window.BrainiAvatarStudioArt?.sceneSource?.(draft.scene);
        const text=sceneCoversColour?'This colour shows when you choose Plain & simple in Backgrounds.':
          chosen?.description?`${chosen.name}. ${chosen.description}`:'';
        if(note.textContent!==text)note.textContent=text;
        note.hidden=!text;
      }
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
    applyFilter(root);
    renderRoad(root,draft,total);
    choiceViews.set(root,signature);
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
    const heading=goal?.type==='days'?'Days played':goal?.type==='discovery'?'Try something new':goal?.type==='academy'?'Learn something new':'Next unlock';
    const detail=!goal?'':goal.type==='xp'?`${number(goal.remaining)} XP to go · ${labels[reward.kind]}`:goal.type==='days'?`${number(goal.value)} of ${number(goal.max)} days played`:goal.type==='discovery'?`${number(goal.value)} of ${number(goal.max)} games tried`:'Finish '+reward.courseTitle;
    const markup=goal?`<a class="avatar-goal-link" href="#avatar-panel-${goalPane(goal.type,reward.kind)}" data-collection-goal="${goal.type}" data-goal-kind="${reward.kind}" data-goal-id="${reward.id}"><span class="avatar-goal-art" aria-hidden="true">${art}</span><span><span class="reward-kicker">${heading}</span><strong>${escapeCopy(reward.name)}</strong><small>${escapeCopy(detail)}</small></span><span class="avatar-goal-arrow" aria-hidden="true">→</span></a><progress></progress>${goal.type==='days'?'<small class="avatar-goal-note">Days add up, even with breaks.</small>':''}`:'<span class="reward-kicker">YOUR COLLECTION</span><strong>Every XP reward is unlocked</strong>';
    if(target.dataset.goalMarkup!==markup){target.innerHTML=markup;target.dataset.goalMarkup=markup;if(focus)target.querySelector('a')?.focus({preventScroll:true});}
    const progress=target.querySelector('progress');
    if(progress){progress.max=goal.max;progress.value=goal.value;progress.setAttribute('aria-label',`${reward.name}: ${number(goal.value)} of ${number(goal.max)} ${goal.type==='xp'?'XP since your last avatar extra':goal.type==='days'?'days played':goal.type==='discovery'?'games tried':'course completed'}`);}
  }
  function goalPane(type,kind){
    return ['days','discovery'].includes(type)?'challenges':type==='academy'?'academy':kind;
  }
  function openGoal(root,link){
    const type=link.dataset.collectionGoal,kind=link.dataset.goalKind,id=link.dataset.goalId;
    const pane=goalPane(type,kind);
    filter='all';
    showPane(root,pane);
    const choice=root.querySelector(`[data-avatar-pane="${pane}"] [data-reward-kind="${kind}"][data-reward-id="${id}"]`);
    if(type==='xp'&&choice&&!choice.disabled){
      choice.focus();
      choice.click();
      return;
    }
    const card=type==='days'?root.querySelector(`[data-day-card="${id}"]`):type==='discovery'?root.querySelector(`[data-discovery-card="${id}"]`):choice?.closest('.avatar-option-group,.avatar-academy-card');
    const target=card||root.querySelector(`[data-avatar-pane="${pane}"]`);if(target){target.tabIndex=-1;target.focus({preventScroll:true});target.scrollIntoView?.({block:'nearest'});}
  }
  function renderRoad(root,draft,total){
    const road=root.querySelector('[data-studio-road]');
    const items=cosmeticPanes.flatMap(kind=>C.groups[kind]
      .filter(item=>item.xp>total).map(item=>({...item,kind}))).sort((a,b)=>a.xp-b.xp).slice(0,6);
    road.hidden=!items.length;
    if(!items.length)return;
    const markup=`<h3>Coming up</h3><div class="avatar-road-track">
      <div class="avatar-road-current"><strong>You are here</strong><small>${number(total)} XP</small></div>
      ${items.map(item=>`<a href="#avatar-panel-${item.kind}" data-collection-goal="xp" data-goal-kind="${item.kind}" data-goal-id="${item.id}">
        <span class="avatar-road-art" aria-hidden="true">${sample(item.kind,item,draft,total)}</span>
        <strong>${escapeCopy(item.name)}</strong><small>${number(item.xp)} XP</small></a>`).join('')}
      </div>`;
    if(road.dataset.markup!==markup){road.innerHTML=markup;road.dataset.markup=markup;}
  }
  return {mount,showPane,choices,next,openGoal,equippedSlots,portrait,activePane:()=>active};
})();
