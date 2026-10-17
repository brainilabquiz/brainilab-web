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
  function academyIds(value){return Array.isArray(value)?[...new Set(value.filter(id=>academyRewards.some(item=>item.id===id)))]:[];}
  const unlocked=(item,earned,academy=[])=>item.course?academyIds(academy).includes(item.id):item.xp<=xp(earned);
  function available(value,earned,academy=[]){
    const result=clean(value),total=xp(earned);
    for(const [key,list] of Object.entries(groups))if(!unlocked(list.find(item=>item.id===result[key]),total,academy))result[key]=list[0].id;
    return result;
  }
  function next(earned){
    const total=xp(earned);
    return Object.entries(groups).flatMap(([kind,list])=>list.map(item=>({...item,kind})))
      .filter(r=>!r.course&&r.xp>total).sort((a,b)=>a.xp-b.xp)[0]||null;
  }
  function surprise(style,earned,random=Math.random,academy=[]){
    const total=xp(earned),current=available(style,total,academy),result={...current,mode:'built'};
    const kinds=['hair','hairColor','shirt','background','glasses','hat','prop'];
    // Skin tone, frame and title stay intentional. Extras stay absent in most draws.
    for(const kind of kinds){
      const earnedItems=groups[kind].filter(item=>unlocked(item,total,academy));
      const roll=Math.min(1-Number.EPSILON,Math.max(0,Number(random())||0));
      const extra=['glasses','hat','prop'].includes(kind);
      const pool=extra?earnedItems.filter(item=>item.id!=='none'):earnedItems;
      result[kind]=extra&&(roll<.65||!pool.length)?'none':pool[Math.min(pool.length-1,Math.floor((extra?(roll-.65)/.35:roll)*pool.length))].id;
    }
    if(kinds.every(kind=>result[kind]===current[kind]))result.hair=groups.hair.find(item=>item.xp<=total&&item.id!==current.hair)?.id||current.hair;
    return result;
  }
  function fromMetadata(meta={}){return clean(Object.fromEntries(Object.entries(metadataKeys).map(([key,name])=>[key,meta?.[name]])));}
  return Object.freeze({frames,titles,scenes,groups,academyRewards,academyIds,unlocked,metadataKeys,xp,clean,available,next,surprise,fromMetadata});
})();
