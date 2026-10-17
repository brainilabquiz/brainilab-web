window.BrainiAchievementCatalog=(function(){
  const metadataKey='brainilab_featured_achievements_v1';
  const materials=Object.freeze(['Paper','Bronze','Silver','Gold','Platinum','Diamond','Titanium','Emerald','Obsidian','Prismatic']
    .map((name,index)=>Object.freeze({level:index+1,key:name.toLowerCase(),name})));
  const thresholds=Object.freeze({
    first_game:Object.freeze([1,3,7,15,30,55,95,155,245,375]),
    ten_games:Object.freeze([10,20,40,75,135,230,375,590,900,1350]),
    fifty_games:Object.freeze([50,100,175,300,500,800,1250,1900,2800,4000]),
    personal_bests_three:Object.freeze([0,10,25,55,110,210,385,680,1150,1900]),
    daily_first:Object.freeze([1,3,7,15,30,55,95,155,245,375]),
    daily_seven:Object.freeze([7,14,28,50,85,140,225,355,550,840]),
    streak_three:Object.freeze([3,5,9,16,28,47,77,122,187,277]),
    streak_seven:Object.freeze([7,10,16,26,42,67,105,160,240,350])
  });
  const variety=Object.freeze([3,3,4,4,5,5,6,6,7,8]);
  const badges=Object.freeze([
    {id:'first_game',name:'First spark',description:'Complete your first saved game.',metric:'totalGames',target:1},
    {id:'ten_games',name:'Double digits',description:'Complete 10 saved games.',metric:'totalGames',target:10},
    {id:'fifty_games',name:'Fifty nifty',description:'Complete 50 saved games.',metric:'totalGames',target:50},
    {id:'personal_bests_three',name:'Mix it up',description:'Record a personal best in three different games.',metric:'personalBestGames',target:3},
    {id:'daily_first',name:'Daily dose',description:'Complete your first Daily.',metric:'fullDailyCount',target:1},
    {id:'daily_seven',name:'Daily regular',description:'Complete the Daily on seven different days.',metric:'fullDailyCount',target:7},
    {id:'streak_three',name:'Three’s a charm',description:'Reach a best Daily streak of three days.',metric:'bestStreak',target:3},
    {id:'streak_seven',name:'Week streak',description:'Reach a best Daily streak of seven days.',metric:'bestStreak',target:7}
  ].map(badge=>Object.freeze({...badge,tiers:Object.freeze(materials.map(material=>Object.freeze({
    level:material.level,key:material.key,material:material.name,
    requirements:Object.freeze(badge.id==='personal_bests_three'
      ? {totalGames:thresholds[badge.id][material.level-1],personalBestGames:variety[material.level-1]}
      : {[badge.metric]:thresholds[badge.id][material.level-1]})
  })))})));
  const known=new Set(badges.map(b=>b.id));
  const byId=new Map(badges.map(b=>[b.id,b]));
  // Canonical IDs from BrainiData's game catalogue, including saved legacy games.
  const gameIds=new Set(['brainmix','flagdash','orderup','maphunt','topicrush','brainiword',
    'worldflags','worldcapitals','science','history','sports','generalknowledge','connections',
    'survival','oddoneout','higherlower','mathrush','numberroute','sequence']);
  const resultId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)&&!/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(v);
  const count=v=>Number.isSafeInteger(v)&&v>=0;
  function state(id,metrics){
    const badge=byId.get(id);if(!badge)return null;
    if(!metrics||!['totalGames','bestStreak','fullDailyCount','personalBestGames'].every(key=>count(metrics[key])))
      return {id,available:false,level:null,current:null,next:null,progress:{ratio:0,conditions:[]}};
    const reached=badge.tiers.filter(tier=>Object.entries(tier.requirements).every(([metric,target])=>metrics[metric]>=target));
    const current=reached.at(-1)||null,next=badge.tiers[reached.length]||null;
    const conditions=Object.entries((next||current).requirements).map(([metric,target])=>({metric,value:metrics[metric],target,met:metrics[metric]>=target}));
    const ratio=Math.min(...conditions.map(({value,target})=>target===0?1:Math.min(1,value/target)));
    return {id,available:true,level:reached.length,current,next,progress:{ratio,conditions}};
  }
  function clean(ids,earnedIds){
    if(!Array.isArray(ids)||earnedIds!==undefined&&!Array.isArray(earnedIds))return [];
    const allowed=earnedIds===undefined?known:new Set(earnedIds.filter(id=>known.has(id)));
    return [...new Set(ids.filter(id=>typeof id==='string'&&known.has(id)&&allowed.has(id)))].slice(0,3);
  }
  function earned(summary,uid){
    const unavailable=()=>({available:false,ids:[],metrics:null});
    const p=summary?.progression;
    if(typeof uid!=='string'||!uid||p?.user_id!==uid||
      !['total_games','best_streak','full_daily_count'].every(key=>count(p[key]))||
      !Array.isArray(summary.personal_bests))return unavailable();
    const games=new Set(),results=new Set();
    for(const row of summary.personal_bests){
      if(!row||!gameIds.has(row.game_id)||!resultId(row.result_id)||results.has(row.result_id.toLowerCase())||games.has(row.game_id))continue;
      games.add(row.game_id);results.add(row.result_id.toLowerCase());
    }
    const metrics={totalGames:p.total_games,bestStreak:p.best_streak,
      fullDailyCount:p.full_daily_count,personalBestGames:games.size};
    return {available:true,ids:badges.filter(b=>state(b.id,metrics).level>=1).map(b=>b.id),metrics};
  }
  // Display normalization for server-issued public payloads. This does not
  // establish earning, and must never be used to validate account metadata.
  function normalizePublic(value){
    if(!Array.isArray(value)||value.length>3)return [];
    const result=[],seen=new Set();
    for(const entry of value){
      if(!entry||!known.has(entry.id)||seen.has(entry.id)||!Number.isInteger(entry.tier)||entry.tier<1||entry.tier>materials.length)continue;
      result.push({id:entry.id,tier:entry.tier});seen.add(entry.id);if(result.length===3)break;
    }
    return result;
  }
  return Object.freeze({metadataKey,materials,badges,clean,earned,state,normalizePublic});
})();
