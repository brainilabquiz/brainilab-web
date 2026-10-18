/* Cosmetic rewards only. Never used for scores, permissions or XP awards. */
window.BrainiRewardCatalog=(function(){
  const frames=Object.freeze([
    {id:'level',name:'Your level',xp:0},
    {id:'blue',name:'Blue sky',xp:100},
    {id:'green',name:'Fresh green',xp:500},
    {id:'copper',name:'Copper glow',xp:1500},
    {id:'gold',name:'Golden hour',xp:3000},
    {id:'orbit',name:'Orbit',xp:6000}
  ].map(Object.freeze));
  const titles=Object.freeze([
    {id:'none',name:'No title',xp:0},
    {id:'explorer',name:'Explorer',xp:250},
    {id:'curious',name:'Curious Mind',xp:750},
    {id:'detective',name:'Puzzle Detective',xp:2000},
    {id:'thinker',name:'Deep Thinker',xp:4500},
    {id:'sage',name:'BrainiLab Sage',xp:10000}
  ].map(Object.freeze));
  const scenes=Object.freeze([
    {id:'none',name:'Plain & simple',xp:0,description:'Your usual clean profile.'},
    {id:'library',name:'Booked in',xp:1500,description:'A quiet library corner for a curious mind.'},
    {id:'lab',name:'In your element',xp:3500,description:'A little laboratory for your bright ideas.'},
    {id:'stars',name:'Night thinker',xp:6000,description:'A calm sky full of possibilities.'}
  ].map(Object.freeze));
  const groups=Object.freeze({frame:frames,title:titles,...BrainiAvatarDesign.options,scene:scenes});
  const metadataKeys=Object.freeze({frame:'brainilab_avatar_frame_v1',title:'brainilab_profile_title_v1',...BrainiAvatarDesign.metadataKeys,scene:'brainilab_profile_scene_v1'});
  const xp=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
  function clean(value={}){
    return Object.fromEntries(Object.entries(groups).map(([key,list])=>[key,list.some(item=>item.id===value?.[key])?value[key]:list[0].id]));
  }
  const academyRewards=BrainiAvatarDesign.academyRewards;
  const discoveryRewards=BrainiAvatarDesign.discoveryRewards,discoveryGames=BrainiAvatarDesign.discoveryGames,dayRewards=BrainiAvatarDesign.dayRewards;
  const dayCount=value=>Number.isSafeInteger(value)&&value>=0?value:0;
  function academyIds(value){return Array.isArray(value)?[...new Set(value.filter(id=>academyRewards.some(item=>item.id===id)))]:[];}
  function gameIds(value){return Array.isArray(value)?discoveryGames.map(g=>g.id).filter(id=>value.includes(id)):[];}
  function discoveryProgress(item,value=[]){
    const played=gameIds(value),required=item.games||discoveryGames.map(g=>g.id),target=item.target||required.length;
    const completed=Math.min(target,required.filter(id=>played.includes(id)).length);
    return {completed,target,earned:completed===target,missing:required.filter(id=>!played.includes(id))};
  }
  const unlocked=(item,earned,academy=[],discovery=[],activeDays=0)=>item.course?academyIds(academy).includes(item.id):item.challenge?discoveryProgress(item,discovery).earned:item.days?dayCount(activeDays)>=item.days:item.xp<=xp(earned);
  function available(value,earned,academy=[],discovery=[],activeDays=0){
    const result=clean(value),total=xp(earned);
    for(const [key,list] of Object.entries(groups))if(!unlocked(list.find(item=>item.id===result[key]),total,academy,discovery,activeDays))result[key]=list[0].id;
    return result;
  }
  function next(earned){
    const total=xp(earned);
    return Object.entries(groups).flatMap(([kind,list])=>list.map(item=>({...item,kind})))
      .filter(r=>!r.course&&!r.challenge&&!r.days&&r.xp>total).sort((a,b)=>a.xp-b.xp)[0]||null;
  }
  function xpStep(earned){
    const total=xp(earned),item=next(total);if(!item)return null;
    const thresholds=Object.values(groups).flat().filter(r=>!r.course&&!r.challenge&&!r.days&&r.xp>0&&r.xp<=total).map(r=>r.xp);
    const start=Math.max(0,...thresholds),max=item.xp-start,value=total-start;
    return {type:'xp',item,start,value,max,remaining:item.xp-total};
  }
  // One useful target, using the collection already checked for this account.
  // Days played are cumulative: they are never a claim about an unbroken streak.
  function collectionGoal(earned,state={}){
    const step=xpStep(earned),known=state.cloud&&state.owner&&!state.loading&&!state.error&&Number.isSafeInteger(state.activeDays)&&state.activeDays>=0;
    if(!known)return step;
    const days=dayCount(state.activeDays),day=dayRewards.find(r=>r.days>days);
    if(day&&(!step||day.days-days===1))return {type:'days',item:day,value:days,max:day.days,remaining:day.days-days};
    if(step)return step;
    const challenges=discoveryRewards.map(item=>({item,...discoveryProgress(item,state.discovery)})).filter(r=>!r.earned).sort((a,b)=>(a.target-a.completed)-(b.target-b.completed));
    if(challenges.length){const r=challenges[0];return {type:'discovery',item:r.item,value:r.completed,max:r.target,remaining:r.target-r.completed};}
    const courses=academyIds(state.academy),course=academyRewards.find(r=>!courses.includes(r.id));
    return course?{type:'academy',item:course,value:0,max:1,remaining:1}:null;
  }
  function surprise(style,earned,random=Math.random,academy=[],discovery=[],activeDays=0){
    const total=xp(earned),current=available(style,total,academy,discovery,activeDays),result={...current,mode:'built'};
    const kinds=['hair','hairColor','shirt','background','glasses','hat','prop'];
    // Skin tone, frame and title stay intentional. Extras stay absent in most draws.
    for(const kind of kinds){
      const earnedItems=groups[kind].filter(item=>unlocked(item,total,academy,discovery,activeDays));
      const roll=Math.min(1-Number.EPSILON,Math.max(0,Number(random())||0));
      const extra=['glasses','hat','prop'].includes(kind);
      const pool=extra?earnedItems.filter(item=>item.id!=='none'):earnedItems;
      result[kind]=extra&&(roll<.65||!pool.length)?'none':pool[Math.min(pool.length-1,Math.floor((extra?(roll-.65)/.35:roll)*pool.length))].id;
    }
    if(kinds.every(kind=>result[kind]===current[kind]))result.hair=groups.hair.find(item=>item.xp<=total&&item.id!==current.hair)?.id||current.hair;
    return result;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  return Object.freeze({frames,titles,scenes,groups,academyRewards,academyIds,discoveryGames,discoveryRewards,dayRewards,dayCount,gameIds,discoveryProgress,unlocked,metadataKeys,xp,clean,available,next,xpStep,collectionGoal,surprise,fromMetadata});
})();
