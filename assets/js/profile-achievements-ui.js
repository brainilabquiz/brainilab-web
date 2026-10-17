/* Profile-only presentation. Evidence, selection and persistence belong to the store. */
window.BrainiAchievementUI=(function(){
  const views=new WeakMap();
  const icons=Object.freeze({
    first_game:'/assets/icons/product/play-now.svg',
    ten_games:'/assets/icons/product/medal-achievement.svg',
    fifty_games:'/assets/icons/product/ranking-trophy.svg',
    personal_bests_three:'/assets/icons/product/games.svg',
    daily_first:'/assets/icons/product/calendar-daily.svg',
    daily_seven:'/assets/icons/product/check-completed.svg',
    streak_three:'/assets/icons/product/streak.svg',
    streak_seven:'/assets/icons/product/streak.svg'
  });
  let sequence=0;
  const number=value=>Math.max(0,Math.min(Number.MAX_SAFE_INTEGER,Number.isFinite(Number(value))?Math.floor(Number(value)):0));
  const formatted=value=>number(value).toLocaleString('en-GB');
  const text=(node,value)=>{const next=String(value??'');if(node.textContent!==next)node.textContent=next;};
  const message=value=>typeof value==='string'?value.trim():'';
  const catalog=()=>Array.isArray(window.BrainiAchievementCatalog?.badges)?window.BrainiAchievementCatalog.badges.filter(b=>icons[b.id]):[];
  function clean(list,badges){
    const known=new Set(badges.map(b=>b.id));
    return [...new Set(Array.isArray(list)?list.filter(id=>typeof id==='string'&&known.has(id)):[])].slice(0,3);
  }
  function image(doc,id){
    const node=doc.createElement('img');node.src=icons[id];node.alt='';node.width=24;node.height=24;node.setAttribute('aria-hidden','true');return node;
  }
  function paintArt(art,id,tier){
    const signature=id+':'+tier;if(art.dataset.signature===signature)return;
    art.replaceChildren();
    if(id){
      if(window.BrainiAchievementDisplay)art.innerHTML=BrainiAchievementDisplay.emblemMarkup(id,tier);
      else art.append(image(art.ownerDocument,id));
    }
    art.dataset.badge=id;art.dataset.signature=signature;
  }
  function slots(doc,parent,label){
    const list=doc.createElement('ol');list.className='achievement-slots';list.setAttribute('aria-label',label);
    for(let i=0;i<3;i++){
      const item=doc.createElement('li');item.className='achievement-slot';
      const art=doc.createElement('span');art.className='achievement-slot-art';art.setAttribute('aria-hidden','true');
      const name=doc.createElement('span');name.className='achievement-slot-name';
      const tier=doc.createElement('small');tier.className='achievement-slot-tier';
      item.append(art,name,tier);list.append(item);
    }
    parent.append(list);return list;
  }
  function renderSlots(list,ids,badges,metrics){
    const byId=new Map(badges.map(b=>[b.id,b]));
    [...list.children].forEach((item,index)=>{
      const badge=byId.get(ids[index]),art=item.firstElementChild,name=item.querySelector('.achievement-slot-name'),label=item.lastElementChild;
      item.classList.toggle('is-empty',!badge);
      const id=badge?.id||'';
      const tier=badge?BrainiAchievementCatalog.state(id,metrics)?.current:null;
      paintArt(art,id,tier?.level||1);
      text(name,badge?badge.name:'');
      text(label,tier?`${tier.material} · ${tier.level}/10`:'');
      item.setAttribute('aria-label',badge?`${badge.name}. ${tier?.material||''}, level ${tier?.level||1} of 10`:`Empty badge slot ${index+1}`);
    });
  }
  function mount(root){
    if(!root?.querySelector)return null;
    const panel=root.querySelector('[data-achievements-panel]'),featured=root.querySelector('[data-featured-achievements]');
    if(!panel||!featured)return null;
    const previous=views.get(root);
    if(previous?.panel===panel&&previous?.featured===featured)return previous;
    const doc=root.ownerDocument,id=++sequence,badges=catalog();
    featured.classList.add('profile-featured-achievements');
    featured.innerHTML='<div class="achievement-featured-heading"><strong>Featured badges</strong><button type="button" data-achievement-choose>Choose badges</button></div><p class="achievement-featured-note" data-achievement-featured-note></p>';
    const savedSlots=slots(doc,featured,'Saved featured badges');
    panel.classList.add('profile-achievements-panel');
    panel.innerHTML=`<div class="achievement-heading"><h3 id="achievement-heading-${id}" tabindex="-1" data-achievements-heading>Achievements</h3><p>Earn them as you play. Choose up to three to show with your profile in rankings, groups and friends.</p></div><p class="achievement-counter" data-achievement-counter></p><div class="achievement-draft-preview" data-achievement-draft-preview><strong data-achievement-preview-label>Saved badges</strong></div><div class="achievement-collection" role="group" aria-label="Choose featured badges" data-achievement-collection></div><div class="achievement-actions"><button class="btn" type="button" data-achievement-save>Save badges</button><button class="btn-light" type="button" data-achievement-cancel>Cancel</button><button class="btn-light" type="button" data-achievement-retry hidden>Try again</button><button class="btn" type="button" data-achievement-signin hidden>Sign in</button></div><p id="achievement-status-${id}" class="achievement-status" role="status" aria-live="polite" aria-atomic="true" data-achievement-status></p>`;
    const draftPreview=panel.querySelector('[data-achievement-draft-preview]');draftPreview.hidden=true;
    const draftSlots=slots(doc,draftPreview,'Badge selection preview');
    const guide=doc.createElement('details');guide.className='achievement-level-guide';
    const summary=doc.createElement('summary');text(summary,'The 10 badge levels');guide.append(summary);
    const scale=doc.createElement('ol');
    for(const material of BrainiAchievementCatalog.materials){
      const item=doc.createElement('li'),art=doc.createElement('span'),label=doc.createElement('span');
      if(window.BrainiAchievementDisplay)art.innerHTML=BrainiAchievementDisplay.emblemMarkup('first_game',material.level);
      text(label,`${material.level}. ${material.name}`);item.append(art,label);scale.append(item);
    }
    const explanation=doc.createElement('p');text(explanation,'Each step takes more effort. Every badge has its own milestones, and your chosen badges improve automatically. Streak badges use your best streak, so a break does not lower their level.');
    guide.append(scale,explanation);panel.querySelector('.achievement-heading').after(guide);
    const collection=panel.querySelector('[data-achievement-collection]'),choices=new Map();
    for(const badge of badges){
      const button=doc.createElement('button');button.type='button';button.className='achievement-choice';button.dataset.achievementId=badge.id;button.setAttribute('aria-pressed','false');
      const art=doc.createElement('span');art.className='achievement-choice-art';art.setAttribute('aria-hidden','true');art.append(image(doc,badge.id));
      const copy=doc.createElement('span');copy.className='achievement-choice-copy';
      const name=doc.createElement('strong');text(name,badge.name);
      const description=doc.createElement('span');description.className='achievement-description';text(description,badge.description);
      const material=doc.createElement('span');material.className='achievement-material';material.dataset.achievementMaterial='';
      const details=doc.createElement('span');details.className='achievement-choice-details';
      const progress=doc.createElement('span');progress.className='achievement-progress';progress.dataset.achievementProgress='';
      const state=doc.createElement('span');state.className='achievement-choice-state';state.dataset.achievementState='';
      const bar=doc.createElement('progress');bar.className='achievement-tier-progress';bar.max=100;
      details.append(progress,state);copy.append(name,material,description,details,bar);button.append(art,copy);collection.append(button);
      choices.set(badge.id,{button,progress,state,material,art,bar});
    }
    const view={panel,featured,badges,savedSlots,draftSlots,choices,
      featuredNote:featured.querySelector('[data-achievement-featured-note]'),
      counter:panel.querySelector('[data-achievement-counter]'),
      previewLabel:panel.querySelector('[data-achievement-preview-label]'),
      save:panel.querySelector('[data-achievement-save]'),cancel:panel.querySelector('[data-achievement-cancel]'),
      retry:panel.querySelector('[data-achievement-retry]'),signin:panel.querySelector('[data-achievement-signin]'),
      status:panel.querySelector('[data-achievement-status]')};
    views.set(root,view);return view;
  }
  function render(root,{state={},draft=[],dirty=false,feedback=''}={}){
    const view=mount(root);if(!view)return;
    const {badges}=view,earned=new Set(Array.isArray(state.earned)?state.earned:[]);
    const available=state.available===true,loading=state.loading===true,saving=state.saving===true,busy=loading||saving,waiting=!available&&state.waitingForProgress===true;
    const saved=clean(state.selected,badges).filter(id=>available&&earned.has(id));
    const selected=clean(draft,badges).filter(id=>available&&earned.has(id));
    const earnedCount=badges.filter(badge=>available&&earned.has(badge.id)).length;
    const error=message(state.error),notice=message(feedback)||message(state.notice);
    view.panel.setAttribute('aria-busy',String(busy));
    renderSlots(view.savedSlots,saved,badges,state.evidence);renderSlots(view.draftSlots,selected,badges,state.evidence);
    text(view.featuredNote,waiting?'Waiting for saved progress…':loading&&!available?'Checking saved badges…':!available?'Saved badges are not available yet.':saved.length?'Shown with your profile in rankings, groups and friends.':'Choose up to 3 earned badges.');
    text(view.previewLabel,'Preview — not saved');
    const preview=view.panel.querySelector('[data-achievement-draft-preview]');
    preview.hidden=!dirty;preview.classList.toggle('is-dirty',!!dirty);
    text(view.counter,available?`${earnedCount} of ${badges.length} earned · ${selected.length} of 3 selected${selected.length===3?' · Remove one to choose another.':''}`:waiting?'Waiting for saved progress…':loading?'Checking saved achievements…':state.cloud?'Saved progress could not be checked.':'Sign in to check your saved achievements.');
    for(const badge of badges){
      const choice=view.choices.get(badge.id),isEarned=available&&earned.has(badge.id),isSelected=selected.includes(badge.id);
      const capped=selected.length===3&&!isSelected,tier=BrainiAchievementCatalog.state(badge.id,available?state.evidence:null),current=tier?.current,next=tier?.next;
      choice.button.disabled=busy||!!error||!available||!isEarned||capped;
      choice.button.setAttribute('aria-pressed',String(isSelected));
      choice.button.dataset.state=!available?'unknown':isSelected?'selected':isEarned?'earned':'locked';
      const units={totalGames:'saved games',fullDailyCount:'Daily completions',bestStreak:'best streak days',personalBestGames:'games with a personal best'};
      const conditions=tier?.progress.conditions.filter(({target})=>target>0).map(({metric,value,target})=>`${formatted(Math.min(value,target))} of ${formatted(target)} ${units[metric]}`).join(' · ');
      const detail=!available?'Progress unavailable':next?`${current?'Next: '+next.material:'Unlock Paper'} · ${conditions}`:'Highest level reached';
      const status=!available?'':isSelected?'Selected':!isEarned?'Not earned yet':capped?'Choose up to 3':'Earned';
      const levelLabel=current?`${current.material} · Level ${current.level} of 10`:available?'Paper · Level 1 of 10':'10 levels';
      text(choice.material,levelLabel);paintArt(choice.art,badge.id,current?.level||1);
      text(choice.progress,detail);text(choice.state,status);
      choice.bar.hidden=!available;choice.bar.value=Math.round((tier?.progress.ratio||0)*100);
      choice.bar.setAttribute('aria-label',`${badge.name}. ${next?'Progress toward '+next.material:'Highest level reached'}. ${conditions||''}`);
      choice.button.setAttribute('aria-label',`${badge.name}. ${levelLabel}. ${badge.description} ${detail}.${status?' '+status+'.':''}`);
    }
    view.save.disabled=!dirty||busy||!!error||!available||!state.cloud;
    view.cancel.disabled=!dirty||saving;
    view.save.hidden=view.cancel.hidden=!state.cloud;
    text(view.save,saving?'Saving…':'Save badges');
    view.signin.hidden=!!state.cloud||loading;
    view.retry.hidden=!state.cloud||busy||(!error&&available);
    const status=saving?'Saving your badges…':loading?'Checking saved achievements…':waiting?'Waiting for your saved progress. Your badges will load when it arrives.':error||notice||(dirty?'Preview only. Save badges to update your profile.':available&&!earnedCount?'No badges earned yet. Finish a game to reach your first milestone.':'');
    text(view.status,status);view.status.classList.toggle('is-error',!busy&&!waiting&&!!error);
  }
  return Object.freeze({mount,render});
})();
