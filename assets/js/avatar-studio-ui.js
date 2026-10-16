window.BrainiAvatarStudioUI=(function(){
  const C=BrainiRewardCatalog,A=BrainiAvatarDesign;
  const panes={look:{label:'Your look',groups:{skin:'Skin tone',hair:'Hair',hairColor:'Hair colour',shirt:'Shirt',background:'Background'}},
    extras:{label:'Little extras',groups:{glasses:'Glasses',hat:'Hats',prop:'A little personality'}},
    rewards:{label:'Frames & titles',groups:{frame:'Avatar frame',title:'Profile title'}}};
  let active='look';
  const number=n=>n.toLocaleString('en-GB');
  function mount(root){
    root.innerHTML=`<div class="avatar-studio-heading"><div><span class="reward-kicker">MY AVATAR</span><h2>Make it yours.</h2><p>A look, a little personality, and a few things to earn.</p></div><a class="avatar-play-link" href="/games/">Play for more XP →</a></div>
      <div class="avatar-studio-layout"><aside class="avatar-studio-stage" aria-label="Avatar preview">
      <div class="avatar-stage-art"><span class="avatar-preview-label" data-style-preview-label>Your avatar</span><span class="rank-avatar avatar-studio-portrait" data-style-preview-avatar aria-hidden="true"></span></div>
      <div class="avatar-stage-identity"><strong data-style-preview-name></strong><p data-style-preview-title></p><span data-avatar-level></span></div>
      <div class="avatar-next-reward" data-next-reward></div>
      <div class="profile-style-actions"><button class="btn" type="button" data-style-save>Save my avatar</button><button class="btn-light" type="button" data-style-cancel>Cancel changes</button><button class="btn-light" type="button" data-style-retry hidden>Try again</button></div>
      <p class="profile-style-status" role="status" aria-live="polite" data-style-status></p><p class="avatar-storage-note" data-style-storage></p></aside>
      <div class="avatar-studio-controls"><div class="avatar-mobile-preview"><span data-avatar-mini aria-hidden="true"></span><span data-avatar-mini-label></span><button class="btn" type="button" data-style-save>Save my avatar</button></div><fieldset class="avatar-mode"><legend>Start with</legend><div class="reward-mode-grid" data-style-modes></div></fieldset>
      <div class="avatar-studio-tabs" role="tablist" aria-label="Avatar options">${Object.entries(panes).map(([key,p])=>`<button id="avatar-tab-${key}" role="tab" aria-controls="avatar-panel-${key}" data-avatar-tab="${key}" type="button">${p.label}</button>`).join('')}</div>
      ${Object.entries(panes).map(([key,p])=>`<div id="avatar-panel-${key}" role="tabpanel" aria-labelledby="avatar-tab-${key}" data-avatar-pane="${key}" ${key==='look'?'':'hidden'}>${key==='extras'?'<p class="avatar-pane-note">Little extras for your illustrated avatar. Pick one to try it on.</p>':''}${Object.entries(p.groups).map(([kind,name])=>`<fieldset class="avatar-option-group"><legend>${name}</legend><div class="reward-grid reward-grid-${kind}" data-style-${kind}s></div></fieldset>`).join('')}</div>`).join('')}</div></div>`;
    showPane(root,active);
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{
      tab.addEventListener('click',()=>showPane(root,tab.dataset.avatarTab));
      tab.addEventListener('keydown',event=>{
        const keys=Object.keys(panes),index=keys.indexOf(tab.dataset.avatarTab);
        const next=event.key==='ArrowRight'?keys[(index+1)%keys.length]:event.key==='ArrowLeft'?keys[(index+keys.length-1)%keys.length]:event.key==='Home'?keys[0]:event.key==='End'?keys.at(-1):null;
        if(next){event.preventDefault();showPane(root,next);root.querySelector(`[data-avatar-tab="${next}"]`).focus();}
      });
    });
  }
  function showPane(root,key){
    active=key in panes?key:'look';
    root.querySelectorAll('[data-avatar-tab]').forEach(tab=>{const selected=tab.dataset.avatarTab===active;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;});
    root.querySelectorAll('[data-avatar-pane]').forEach(panel=>panel.hidden=panel.dataset.avatarPane!==active);
  }
  function sample(kind,item,draft){
    if(kind==='title')return '';
    if(item.color)return `<span class="avatar-swatch" style="--swatch:${item.color}"></span>`;
    if(kind==='mode'&&item.id==='picture')return BrainiProgressUI.avatarImageMarkup({...BrainiData.player(),avatarDesign:null});
    if(kind==='frame')return `<span class="reward-frame-sample" data-profile-frame="${item.id}">B</span>`;
    return A.markup({...draft,mode:'built',[kind]:item.id},Number.MAX_SAFE_INTEGER);
  }
  function choices(root,draft,total,busy){
    for(const [kind,items] of Object.entries(C.groups)){
      const grid=root.querySelector(`[data-style-${kind}s]`);if(!grid)continue;
      for(const item of items){
        let button=grid.querySelector(`[data-reward-id="${item.id}"]`);
        if(!button){
          button=document.createElement('button');button.type='button';button.className='reward-choice';button.dataset.rewardKind=kind;button.dataset.rewardId=item.id;
          button.innerHTML='<span class="reward-choice-art" aria-hidden="true"></span><strong></strong><small></small>';grid.append(button);
        }
        const art=sample(kind,item,draft),artRoot=button.querySelector('.reward-choice-art');
        if(artRoot.innerHTML!==art)artRoot.innerHTML=art;
        artRoot.hidden=!art;
        const selected=draft[kind]===item.id,locked=item.xp>total;
        button.disabled=busy||locked;button.setAttribute('aria-pressed',String(selected));
        button.querySelector('strong').textContent=item.name;
        button.querySelector('small').textContent=locked?`Locked · ${number(item.xp)} XP`:selected?'Selected':item.xp?'Unlocked':kind==='mode'?'Choose':'Free';
        button.title=item.description||item.name;
        button.setAttribute('aria-label',`${item.name}, ${locked?'unlocks at '+number(item.xp)+' XP':selected?'selected':item.xp?'unlocked':'available'}${item.description?'. '+item.description:''}`);
      }
    }
  }
  function next(root,total){
    const reward=C.next(total),target=root.querySelector('[data-next-reward]');
    const labels={frame:'avatar frame',title:'profile title',glasses:'glasses',hat:'hat',prop:'little extra'};
    target.innerHTML='<span class="reward-kicker"></span><strong></strong><p></p><progress></progress>';
    target.querySelector('span').textContent=reward?'UP NEXT':'YOUR COLLECTION';
    target.querySelector('strong').textContent=reward?reward.name:'Every reward is unlocked';
    target.querySelector('p').textContent=reward?`${number(reward.xp-total)} XP to go · ${labels[reward.kind]}`:'Pick your favourites and make them yours.';
    const progress=target.querySelector('progress');progress.hidden=!reward;
    if(reward){progress.max=reward.xp;progress.value=total;progress.setAttribute('aria-label',`${reward.name}: ${number(total)} of ${number(reward.xp)} XP`);}
  }
  return {mount,showPane,choices,next};
})();
