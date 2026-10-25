// Synthetic observations only. Never copy a private Growth report into fixtures.
export function unassignedFixture(size=3){
 const at='2026-10-25T18:00:00Z',prefix='https://brainilabgames.com';
 const checks=Object.fromEntries(['https','available','title','description','heading','canonical','indexable','structuredData'].map(k=>[k,true]));
 const pages=Array.from({length:size},(_,i)=>({url:`${prefix}/learn/sample-${i}/`,finalUrl:`${prefix}/learn/sample-${i}/`,status:200,trust:100,checks:{...checks},checkedAt:at}));
 const rows=pages.flatMap((p,i)=>[{path:new URL(p.url).pathname,query:`sample question ${i}`,clicks:i===0?2:0,impressions:100-i,position:12+i},{path:new URL(p.url).pathname,query:`second sample ${i}`,clicks:0,impressions:3,position:20}]);
 const source={schemaVersion:1,property:'sc-domain:brainilabgames.com',source:'google_search_console_api',dataState:'final',observedAt:at,timezone:'America/Los_Angeles',period:{start:'2026-07-25',end:'2026-10-22'},images:{searchType:'image',aggregation:'byProperty',rows:[],rowsWithheld:0},webPages:{searchType:'web',aggregation:'byPage',rows,rowsWithheld:0}};
 return {
  report:{seoExplorer:{schemaVersion:1,domain:'brainilabgames.com',observedAt:at,pages,sources:[],backlinks:[],searchSources:source},searchPerformance:{schemaVersion:1,property:'sc-domain:brainilabgames.com',analyticsProperty:'555562532',observedAt:at,current:{period:{start:'2026-09-26',end:'2026-10-23'},analyticsTimezone:'Europe/Madrid',analyticsQuality:{thresholded:false,sampled:false,otherRow:false},landingPages:[{path:'/learn/sample-0/',sessions:3,engagedSessions:2,events:{game_start:0,practice_start:null}}]}}},
  workspace:{opportunities:[{id:10,url:`${prefix}/games/saved/`,state:'pending',revision:1,updated_at:at}]}
 };
}
