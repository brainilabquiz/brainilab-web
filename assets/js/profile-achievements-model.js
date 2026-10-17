window.BrainiAchievementCatalog=(function(){
  const metadataKey='brainilab_featured_achievements_v1';
  const badges=Object.freeze([
    {id:'first_game',name:'First spark',description:'Complete your first saved game.',metric:'totalGames',target:1},
    {id:'ten_games',name:'Double digits',description:'Complete 10 saved games.',metric:'totalGames',target:10},
    {id:'fifty_games',name:'Fifty nifty',description:'Complete 50 saved games.',metric:'totalGames',target:50},
    {id:'personal_bests_three',name:'Mix it up',description:'Record a personal best in three different games.',metric:'personalBestGames',target:3},
    {id:'daily_first',name:'Daily dose',description:'Complete your first Daily.',metric:'fullDailyCount',target:1},
    {id:'daily_seven',name:'Daily regular',description:'Complete the Daily on seven different days.',metric:'fullDailyCount',target:7},
    {id:'streak_three',name:'Three’s a charm',description:'Reach a best Daily streak of three days.',metric:'bestStreak',target:3},
    {id:'streak_seven',name:'Week streak',description:'Reach a best Daily streak of seven days.',metric:'bestStreak',target:7}
  ].map(Object.freeze));
  const known=new Set(badges.map(b=>b.id));
  // Canonical IDs from BrainiData's game catalogue, including saved legacy games.
  const gameIds=new Set(['brainmix','flagdash','orderup','maphunt','topicrush','brainiword',
    'worldflags','worldcapitals','science','history','sports','generalknowledge','connections',
    'survival','oddoneout','higherlower','mathrush','numberroute','sequence']);
  const resultId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)&&!/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(v);
  const count=v=>Number.isSafeInteger(v)&&v>=0;
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
    return {available:true,ids:badges.filter(b=>metrics[b.metric]>=b.target).map(b=>b.id),metrics};
  }
  return Object.freeze({metadataKey,badges,clean,earned});
})();
