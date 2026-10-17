// Exercise the real public parser, cloud adapters and seven social view call sites.
// No network or write RPC is permitted. Run with JSDOM_MODULE set to jsdom/lib/api.js.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const sourceRoot=process.env.AVATAR_SOURCE_ROOT||'.';
const plain=value=>JSON.parse(JSON.stringify(value));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const source=name=>readFileSync(path.join(sourceRoot,'assets/js',name+'.js'),'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
const dom=new JSDOM('<main><div id="rankingsRoot"></div><div data-friends-root></div><div data-groups-root></div></main>',{
  url:'https://brainilabgames.com/profile/?section=social',runScripts:'outside-only',virtualConsole:vc
});
const w=dom.window,doc=w.document,load=name=>w.eval(source(name));
const localNumber=value=>w.Number(value).toLocaleString();
let network=0;w.fetch=()=>{network++;throw Error('Real network is forbidden in this test');};
const owner='10000000-0000-4000-8000-000000000001';
const choices=[{id:'first_game',tier:10},{id:'daily_seven',tier:4},{id:'streak_three',tier:2}];
const style={render_xp:2700,frame:'copper',title:'explorer',design:{mode:'built',skin:'cocoa',glasses:'round',prop:'icepop'},achievements:choices};
const player=(id,name,extra={})=>({user_id:id,name,country:'ES',avatar:'B',xp:2700,level:12,
  score:1234,daily_score:1234,weekly_score:5678,monthly_score:9876,current_streak:4,best_streak:8,
  avatar_style:plain(style),...extra});
const built=player('20000000-0000-4000-8000-000000000001','Built peer');
const photo=player('20000000-0000-4000-8000-000000000002','Photo peer',{
  avatar_url:'https://example.test/photo.jpg',avatar_style:{render_xp:500,frame:'green',title:'curious',achievements:[{id:'ten_games',tier:6}]}
});
const legacy=player('20000000-0000-4000-8000-000000000003','Legacy peer',{avatar_style:null});
const malicious=player('20000000-0000-4000-8000-000000000004','Invalid peer',{
  avatar_style:{render_xp:100,frame:'blue',title:'detective',achievements:[{id:'<img src=x onerror=alert(1)>',tier:10},{id:'first_game',tier:'10'}]}
});
const individuals=[built,photo,legacy,malicious].map((p,index)=>({...plain(p),rank:index+1,is_me:false}));
const friendSnapshot={friend_code:'BRN-TEST',friends:[built,photo,legacy,malicious],friend_count:4,
  incoming:[{...plain(built),id:'incoming'}],outgoing:[{...plain(photo),id:'outgoing'}],incoming_count:1,outgoing_count:1};
const group={id:'30000000-0000-4000-8000-000000000001',name:'Test team',country:'ES',owner_id:owner,my_role:'owner',
  crest:{icon:'⚡',color:'#FFD813'},invite_code:'GRP-TEST',member_count:4,eligible:true,daily_score:2468,weekly_score:9100,monthly_score:15000,
  members:[built,photo,legacy,malicious].map(p=>({...plain(p),role:'member'})),pending_invites:[]};
const fixtures={
  get_my_brainilab_friends:friendSnapshot,
  get_my_brainilab_groups:{groups:[group],received_invites:[],group_count:1},
  get_brainilab_individual_rankings:{rows:individuals,total_players:4,leaderboard_enabled:true},
  get_my_brainilab_friends_ranking:{rows:individuals,total_players:4},
  get_brainilab_group_rankings:{rows:[{rank:1,group_id:group.id,name:'Test team',country:'ES',members:4,score:2468,
    crest:group.crest,avatar_style:style,profileAchievements:choices}],my_groups:[{group_id:group.id,members:4,eligible:true}],total_players:1}
};
const originalFixtures=JSON.stringify(fixtures),reads=[];
try{
  for(const name of ['player-personalities','profile-achievements-model','achievement-display','avatar-design','data','progression-ui','icon-system'])load(name);
  await w.BrainiData.api.syncExternalAuthUser({id:owner,user_metadata:{brainilab_featured_achievements_v1:['fifty_games']}});
  w.BrainiBackendAuth={init:async()=>{},isConfigured:()=>true,getSession:async()=>({user:{id:owner}}),getClient:()=>({
    rpc:async name=>{assert.ok(Object.hasOwn(fixtures,name),'Only existing read RPCs are allowed: '+name);reads.push(name);return {data:plain(fixtures[name]),error:null};}
  })};
  w.BrainiAuth={open:()=>{throw Error('No auth action is expected');}};
  for(const name of ['supabase-friends','supabase-groups','supabase-rankings','groups-view'])load(name);
  const friends=await w.BrainiFriends.refresh(),groups=await w.BrainiGroups.refresh();
  const rank=await w.BrainiRankingsCloud.individual(),friendRank=await w.BrainiFriends.ranking();
  for(const person of [friends.friends[0],friends.incoming[0],groups.groups[0].members[0],rank.rows[0],friendRank.rows[0]]){
    assert.deepEqual(plain(person.profileAchievements),choices,'All public adapters preserve only the validated saved display choices');
    assert.equal(person.profileTitle,'explorer');assert.equal(person.avatarFrame,'copper');
  }
  assert.equal(friends.friends[0].xp,2700);assert.equal(friends.friends[0].dailyScore,1234);
  assert.equal(groups.groups[0].members[0].xp,2700);assert.equal(groups.groups[0].members[0].dailyScore,1234);
  assert.equal(rank.rows[0].score,1234);assert.equal(friendRank.rows[0].score,1234);
  const P=w.BrainiProgressUI,A=w.BrainiAvatarDesign;
  for(const bad of [undefined,null,{},'first_game',[],[{id:'unknown',tier:1}],[{id:'first_game',tier:0}],
    [{id:'first_game',tier:11}],[{id:'first_game',tier:'1'}],[{id:'first_game',tier:Infinity}],
    Array.from({length:4},()=>({id:'first_game',tier:1}))]){
    assert.equal(P.profileAchievementsMarkup({profileAchievements:bad}),'','Missing or malformed public payload never borrows owner badges');
    assert.deepEqual(plain(A.fromPublicStyle({achievements:bad}).profileAchievements),[]);
  }
  assert.equal(P.profileAchievementsMarkup({isMe:true}),'','Even the own row requires its explicit server payload');
  assert.equal(P.profileAchievementsMarkup({user_metadata:{brainilab_featured_achievements_v1:['first_game']}}),'','Private metadata is not a public fallback');
  const duplicate=A.fromPublicStyle({achievements:[{id:'first_game',tier:3},{id:'first_game',tier:10}]}).profileAchievements;
  assert.deepEqual(plain(duplicate),[{id:'first_game',tier:3}]);
  for(const person of friends.friends){
    const container=doc.createElement('div');container.innerHTML=P.profileAchievementsMarkup(person);
    const strip=container.querySelector('.player-achievements');
    if(person.name==='Built peer'){
      assert.equal(strip.tagName,'BUTTON');assert.equal(strip.type,'button');assert.equal(strip.getAttribute('aria-haspopup'),'dialog');
      assert.equal(strip.querySelectorAll('.achievement-emblem').length,3);
      assert.match(strip.getAttribute('aria-label'),/First spark: Prismatic, level 10 of 10/);
      assert.match(strip.getAttribute('aria-label'),/Daily regular: Gold, level 4 of 10/);
      assert.equal(strip.querySelector('[data-material=prismatic]').textContent,'10');
    }else if(person.name==='Photo peer')assert.equal(strip.querySelectorAll('.achievement-emblem').length,1);
    else assert.equal(strip,null,'Legacy and invalid profiles do not gain another person’s badges');
  }

  load('rankings');load('social');await tick();await w.BrainiSocial.render();await w.BrainiRankings.render();
  const rankRoot=doc.querySelector('#rankingsRoot');
  assert.equal(rankRoot.querySelectorAll('.ranking-identity .player-achievements').length,2,'Individual ranking strips');
  assert.equal(rankRoot.querySelectorAll('[role=columnheader]').length,3,'No added ranking column');
  assert.equal(rankRoot.querySelector('.ranking-row-score').textContent,localNumber(1234));
  assert.match(rankRoot.querySelector('.ranking-identity .player-profile-title').textContent,/Explorer/);
  assert.equal(rankRoot.querySelector('.ranking-identity [data-social-frame]').dataset.socialFrame,'copper');
  assert.ok(rankRoot.querySelector('.ranking-row .braini-built-avatar'));
  assert.equal(rankRoot.querySelectorAll('.ranking-row .default-player-avatar').length,2);
  assert.equal(rankRoot.querySelector('.ranking-row img[src="https://example.test/photo.jpg"]').getAttribute('src'),'https://example.test/photo.jpg');
  const rowWithoutBadges=()=>[...rankRoot.querySelectorAll('.ranking-row')].map(row=>{const copy=row.cloneNode(true);copy.querySelectorAll('.player-achievements').forEach(n=>n.remove());return copy.outerHTML;});
  const withBadges=rowWithoutBadges(),renderer=P.profileAchievementsMarkup;
  P.profileAchievementsMarkup=()=>'';await w.BrainiRankings.render();
  assert.deepEqual(rowWithoutBadges(),withBadges,'Avatar, title, rank, score and existing row markup are unchanged by the strip');
  P.profileAchievementsMarkup=renderer;
  w.BrainiRankings.state.mode='friends';await w.BrainiRankings.render();
  assert.equal(rankRoot.querySelectorAll('.ranking-identity .player-achievements').length,2,'Friends ranking strips');
  w.BrainiRankings.state.mode='group';await w.BrainiRankings.render();
  assert.equal(rankRoot.querySelectorAll('.player-achievements').length,0,'Team identities never inherit individual badges');
  assert.equal(rankRoot.querySelector('.ranking-row-score').textContent,localNumber(2468));

  const friendRoot=doc.querySelector('[data-friends-root]'),groupRoot=doc.querySelector('[data-groups-root]');
  assert.equal(friendRoot.querySelectorAll('.friend-row:not(.friend-row-accepted) .player-achievements').length,2,'Incoming and outgoing request strips');
  assert.equal(friendRoot.querySelectorAll('.friend-row-accepted .player-achievements').length,2,'Accepted friend strips');
  assert.equal(friendRoot.querySelector('.friend-stat-xp strong').textContent,localNumber(2700));
  assert.equal(friendRoot.querySelectorAll('.friend-row-accepted .friend-stat strong')[1].textContent,localNumber(1234));
  assert.equal(groupRoot.querySelectorAll('.group-player .player-achievements').length,2,'Modern group member strips');
  assert.equal(groupRoot.querySelector('.group-player small').textContent,'Member · 1,234 today');
  const modern=w.BrainiGroupsView;w.BrainiGroupsView=null;await w.BrainiSocial.render();
  assert.equal(groupRoot.querySelectorAll('.group-member-real .player-achievements').length,2,'Legacy group member strips');
  assert.ok(groupRoot.querySelector('.group-member-real').textContent.includes(localNumber(1234)+' today'));
  w.BrainiGroupsView=modern;await w.BrainiSocial.render();

  w.BrainiSocial.openGroupModal();
  const picker=doc.querySelector('.social-friend-select'),label=picker.querySelector('label'),checkbox=label.querySelector('input');
  assert.equal(picker.querySelectorAll('.player-achievements.is-static').length,2,'Picker displays static badge art');
  assert.equal(label.querySelectorAll('button,a,[role=button]').length,0,'No nested interactive badge inside the selection label');
  assert.equal(label.querySelectorAll('input').length,1);
  label.querySelector('.player-achievements').click();assert.equal(checkbox.checked,true,'Clicking static badges retains the friend checkbox action');
  label.click();assert.equal(checkbox.checked,false);
  doc.querySelector('.social-modal-close').click();

  const button=friendRoot.querySelector('.player-achievements');button.focus();button.click();
  const dialog=doc.querySelector('.achievement-details-dialog');
  assert.ok(dialog?.hasAttribute('open'),'The shared badge details action is available from friends');
  assert.equal(dialog.querySelectorAll('li').length,3);assert.match(dialog.textContent,/Prismatic/);
  assert.doesNotMatch(dialog.textContent,/2,700|1,234|secret|brainilab_featured/,'Only public badge tiers and fixed requirements are disclosed');
  dialog.querySelector('[data-close-achievement-details]').click();assert.equal(doc.activeElement,button,'Close returns focus to the exact originating badge strip');
  assert.equal(friendRoot.querySelector('.friend-stat-xp strong').textContent,localNumber(2700));

  // A later server refresh must remove previously equipped peer badges and preserve their avatar/title.
  fixtures.get_my_brainilab_friends.friends[0].avatar_style.achievements=[];
  await w.BrainiFriends.refresh();await w.BrainiSocial.render();
  assert.equal(friendRoot.querySelector('.friend-row-accepted').querySelector('.player-achievements'),null);
  assert.ok(friendRoot.querySelector('.friend-row-accepted .braini-built-avatar'));
  assert.match(friendRoot.querySelector('.friend-row-accepted .player-profile-title').textContent,/Explorer/);
  fixtures.get_my_brainilab_friends.friends[0].avatar_style.achievements=plain(choices);
  assert.equal(JSON.stringify(fixtures),originalFixtures,'Display and adapter reads never alter score, XP, private data or public choices');
  assert.equal(network,0);assert.deepEqual(errors,[]);
  assert.ok(reads.length>0&&reads.every(name=>Object.hasOwn(fixtures,name)));
  assert.equal(doc.querySelectorAll('script,[onclick],[onerror]').length,0,'Public metadata cannot introduce executable markup');
  console.log('PASS social achievements: seven DOM call sites, all public adapters, three avatar styles, exact title/frame/score/XP preservation, no team badges, static picker checkbox, malformed/legacy safety, refresh removal and accessible read-only details.');
}finally{dom.window.close();}
