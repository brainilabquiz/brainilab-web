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
  const xp=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
  function clean(value={}){
    return {frame:frames.some(r=>r.id===value?.frame)?value.frame:'level',
      title:titles.some(r=>r.id===value?.title)?value.title:'none'};
  }
  function available(value,earned){
    const result=clean(value),total=xp(earned);
    if(frames.find(r=>r.id===result.frame).xp>total)result.frame='level';
    if(titles.find(r=>r.id===result.title).xp>total)result.title='none';
    return result;
  }
  function next(earned){
    const total=xp(earned);
    return [...frames.map(r=>({...r,kind:'frame'})),...titles.map(r=>({...r,kind:'title'}))]
      .filter(r=>r.xp>total).sort((a,b)=>a.xp-b.xp)[0]||null;
  }
  return Object.freeze({frames,titles,xp,clean,available,next});
})();
