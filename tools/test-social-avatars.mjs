// Real pre-change RPCs + real migration, executed in isolated PostgreSQL (PGlite).
// Required: PGLITE_MODULE and JSDOM_MODULE pointing to installed modules.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE).href);
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const db=new PGlite();
const scalar=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const actor=id=>scalar("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
const ids=Array.from({length:7},(_,i)=>`10000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
const [me,peer,automatic,hidden,suspended,claimed,stranger]=ids;
const migration=readFileSync('supabase/migrations/20261016195312_shared_player_avatars.sql','utf8').replace(/\r\n/g,'\n');
const titleMigration=readFileSync('supabase/migrations/20261016201431_shared_player_titles.sql','utf8').replace(/\r\n/g,'\n');
const collectionMigration=readFileSync('supabase/migrations/20261016210748_avatar_wordplay_collection.sql','utf8').replace(/\r\n/g,'\n');
const moreWordplayMigration=readFileSync('supabase/migrations/20261017073754_avatar_more_wordplay.sql','utf8').replace(/\r\n/g,'\n');
const newWordplay=[['glasses','heart',2750],['glasses','camera',8250],['hat','toast',2800],['hat','coffee',4750],['prop','owl',3800],['prop','nacho',5750]];
const rpcNames=['get_brainilab_individual_rankings','get_my_brainilab_friends','get_my_brainilab_friends_ranking','get_my_brainilab_groups'];
const strip=value=>Array.isArray(value)?value.map(strip):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['avatar_style','generated_at'].includes(k)).map(([k,v])=>[k,strip(v)])):value;
const stripTitle=value=>Array.isArray(value)?value.map(stripTitle):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['title','generated_at'].includes(k)).map(([k,v])=>[k,stripTitle(v)])):value;
const snapshot=async()=>Object.fromEntries(await Promise.all(rpcNames.map(async name=>[name,await scalar(`select public.${name}()`)])));
const dom=new JSDOM('<div data-friends-root></div><div data-groups-root></div>',{url:'https://brainilabgames.com/profile/?section=social',runScripts:'outside-only'}),w=dom.window;
const load=f=>w.eval(readFileSync('assets/js/'+f+'.js','utf8'));
for(const f of ['player-personalities','avatar-design','data','progression-ui','profile-rewards-model','icon-system'])load(f);
const A=w.BrainiAvatarDesign,C=w.BrainiRewardCatalog;
for(const [kind,id,xp] of newWordplay)assert.equal(A.options[kind].find(item=>item.id===id)?.xp,xp,'exact new cosmetic threshold: '+kind+' '+id);
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table profiles(user_id uuid primary key,display_name text,leaderboard_display_name text,country_code text,avatar_url text,friend_code text,leaderboard_enabled boolean default true,leaderboard_visibility_explicit boolean default true,guest_claimed_by uuid);
 create table player_progression(user_id uuid primary key,xp bigint,level integer,current_streak integer,best_streak integer,last_streak_date date);
 create table admin_ranking_suspensions(entity_type text,entity_id uuid,active boolean,expires_at timestamptz);
 create table game_sessions(id uuid,user_id uuid,status text,completed_at timestamptz,game_id text,daily_number int);
 create table game_results(session_id uuid,result_payload jsonb,created_at timestamptz,answers_verified boolean);
 create table fixture_scores(user_id uuid,score bigint);
 create function brainilab_player_rank_value(uuid,text,text,text) returns bigint language sql stable as $$select score from fixture_scores where user_id=$1$$;
 create function brainilab_rewards_started_at() returns timestamptz language sql stable as $$select '2026-01-01'::timestamptz$$;
 create table friendships(user_a uuid,user_b uuid,created_at timestamptz default now());
 create table friend_requests(id uuid default gen_random_uuid(),sender_id uuid,receiver_id uuid,status text,created_at timestamptz default now());
 create table player_daily_stats(user_id uuid,stat_date date,daily_brain_score bigint,daily_games_completed int,full_daily boolean);
 create table player_period_stats(user_id uuid,period_type text,period_start date,daily_brain_score bigint);
 create table groups(id uuid primary key,owner_id uuid,name text,country_code text,crest_icon text,crest_color text,invite_code text,status text,created_at timestamptz default now());
 create table group_members(group_id uuid,user_id uuid,role text,joined_at timestamptz default now());
 create table group_invites(id uuid default gen_random_uuid(),group_id uuid,inviter_id uuid,target_user_id uuid,status text,created_at timestamptz default now());
 create table group_daily_stats(group_id uuid,stat_date date,group_score bigint,active_members int);
 create table group_period_stats(group_id uuid,period_type text,period_start date,group_score bigint);
 create function brainilab_group_current_streak(uuid) returns int language sql stable as $$select 3$$;`);
 // JSON escapes retain the actual mixed function-body line endings on any OS.
 const baseline=JSON.parse(readFileSync('tools/fixtures/social-avatars/rpcs-before.json','utf8'));
 await db.exec(baseline.map(f=>f.definition+';').join('\n'));
 for(const name of rpcNames){
  const signature=name==='get_brainilab_individual_rankings'?'text,text,text,text,text,integer':name==='get_my_brainilab_friends_ranking'?'text,text,text':'';
  await db.exec(`revoke all on function ${name}(${signature}) from public;grant execute on function ${name}(${signature}) to authenticated,service_role${name===rpcNames[0]?',anon':''};`);
 }
 const metadata={brainilab_avatar_mode_v1:'built',brainilab_avatar_glasses_v1:'round',brainilab_avatar_prop_v1:'icepop',brainilab_avatar_hat_v1:'egg',brainilab_avatar_frame_v1:'copper',brainilab_avatar_skin_v1:'cocoa',email:'secret@example.test',brainilab_profile_title_v1:'explorer',xp:999999};
 for(const [i,id] of ids.entries()){
  await db.query('insert into auth.users values($1,$2)',[id,JSON.stringify(i===0?{}:metadata)]);
  await db.query("insert into profiles(user_id,display_name,leaderboard_display_name,country_code,avatar_url,friend_code) values($1,$2,$2,'ES',$3,'BRN-TEST')",[id,'Test player '+i,'https://example.test/photo-'+i+'.jpg']);
  await db.query("insert into player_progression values($1,2700,12,4,5,current_date)",[id]);
  await db.query('insert into fixture_scores values($1,$2)',[id,100-i]);
 }
 await db.query('update profiles set leaderboard_visibility_explicit=false where user_id=$1',[automatic]);
 await db.query('update profiles set leaderboard_enabled=false where user_id=$1',[hidden]);
 await db.query("insert into admin_ranking_suspensions values('user',$1,true,null)",[suspended]);
 await db.query('update profiles set guest_claimed_by=$1 where user_id=$2',[me,claimed]);
 await db.query('insert into friendships(user_a,user_b) values($1,$2)',[me,peer]);
 await db.query("insert into friend_requests(sender_id,receiver_id,status) values($1,$2,'pending'),($2,$3,'pending')",[stranger,me,automatic]);
 const group='20000000-0000-4000-8000-000000000001';
 await db.query("insert into groups(id,owner_id,name,country_code,crest_icon,crest_color,invite_code,status) values($1,$2,'Test team','ES','⚡','#FFD813','GRP-TEST','active')",[group,me]);
 await db.query("insert into group_members(group_id,user_id,role) values($1,$2,'owner'),($1,$3,'member')",[group,me,peer]);
 await actor(me);
 const before=await snapshot(),acl=await scalar("select jsonb_object_agg(proname,proacl::text) from pg_proc where proname=any($1)",[rpcNames]);
 const progression=await scalar('select jsonb_agg(to_jsonb(p) order by user_id) from player_progression p');
 await db.exec(migration); // Includes production compare-and-swap guard.
 const avatarBaseline=await snapshot();
 const rpcDefinitions=await scalar("select jsonb_object_agg(proname,md5(pg_get_functiondef(oid))) from pg_proc where proname=any($1)",[rpcNames]);
 await db.exec(titleMigration);
 const priorCollection=await snapshot();
 await db.exec(collectionMigration);
 const withoutGenerated=value=>Array.isArray(value)?value.map(withoutGenerated):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>k!=='generated_at').map(([k,v])=>[k,withoutGenerated(v)])):value;
 const priorWordplay=await snapshot();
 const playerTables=['auth.users','public.profiles','public.player_progression','public.fixture_scores','public.game_sessions','public.game_results','public.friendships','public.friend_requests','public.player_daily_stats','public.player_period_stats','public.groups','public.group_members','public.group_invites','public.group_daily_stats','public.group_period_stats','public.admin_ranking_suspensions'];
 const tableSnapshot=async()=>Object.fromEntries(await Promise.all(playerTables.map(async name=>[name,await scalar(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) from ${name} t`)])));
 const beforeTables=await tableSnapshot();
 const helperState=async()=>await scalar("select jsonb_build_object('definition',pg_get_functiondef(oid),'md5',md5(pg_get_functiondef(oid)),'acl',proacl::text,'owner',proowner,'securityDefiner',prosecdef,'config',proconfig) from pg_proc where oid='brainilab_private.player_avatar(uuid)'::regprocedure");
 const helperBefore=await helperState();
 assert.equal(helperBefore.md5,'109bf55494bad27b1b4cb9dbafbeafd0','migration starts from the captured production definition');
 await db.exec(moreWordplayMigration);
 const helperAfter=await helperState();
 assert.equal(helperAfter.md5,'ef67f28d81589f0918465d679764a479');
 const catalogOnly=definition=>definition.replace(/(v_catalog constant jsonb := ')[^']+('::jsonb;)/,'$1CATALOG$2');
 assert.equal(catalogOnly(helperAfter.definition),catalogOnly(helperBefore.definition),'only the cosmetic allowlist changes in the private helper');
 for(const key of ['acl','owner','securityDefiner','config'])assert.deepEqual(helperAfter[key],helperBefore[key],key+' is preserved');
 assert.deepEqual(await tableSnapshot(),beforeTables,'all 16 existing identity, score, game and social tables are unchanged');
 assert.deepEqual(withoutGenerated(await snapshot()),withoutGenerated(priorWordplay),'six added choices preserve every previously equipped appearance and RPC payload');
 assert.deepEqual(withoutGenerated(await snapshot()),withoutGenerated(priorCollection),'new collection preserves every prior equipped appearance and response field');
 let after=await snapshot();
 assert.deepEqual(stripTitle(after),stripTitle(avatarBaseline),'title extension leaves every existing avatar and response field intact');
 assert.deepEqual(await scalar("select jsonb_object_agg(proname,md5(pg_get_functiondef(oid))) from pg_proc where proname=any($1)",[rpcNames]),rpcDefinitions,'all four public RPC definitions stay untouched');
 assert.deepEqual(strip(after),strip(before),'all prior fields, scores, order, permissions and counts are identical');
 assert.deepEqual(await scalar("select jsonb_object_agg(proname,proacl::text) from pg_proc where proname=any($1)",[rpcNames]),acl,'existing RPC ACLs unchanged');
 assert.deepEqual(await scalar('select jsonb_agg(to_jsonb(p) order by user_id) from player_progression p'),progression,'no XP/progression writes');
 assert.equal(after[rpcNames[0]].rows.find(r=>r.name==='Test player 2').avatar_style,null,'automatic public identity cannot expose cosmetics');
 assert.equal(after[rpcNames[0]].rows.length,4,'hidden, suspended and claimed players remain excluded');
 const style=after[rpcNames[0]].rows.find(r=>r.name==='Test player 1').avatar_style;
 assert.equal(style.design.prop,'icepop');assert.equal(style.render_xp,1500);assert.equal(style.frame,'copper');
 assert.equal(style.title,'explorer');
 assert.equal(JSON.stringify(style).includes('secret'),false);assert.equal(JSON.stringify(style).includes('2700'),false);
 assert.equal(after[rpcNames[1]].friends[0].avatar_style.design.prop,'icepop');
 assert.equal(after[rpcNames[1]].incoming[0].avatar_style.design.hat,'egg');
 assert.equal(after[rpcNames[1]].outgoing[0].avatar_style.design.glasses,'round');
 assert.equal(after[rpcNames[3]].groups[0].members[1].avatar_style.design.prop,'icepop');
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  await assert.rejects(()=>scalar('select brainilab_private.player_avatar($1)',[peer]),'helper inaccessible directly');
  if(role==='anon')await assert.rejects(()=>scalar('select get_my_brainilab_friends()'),'anonymous cannot read friend list');
  await db.exec('reset role');
 }
 await actor(stranger);assert.equal((await scalar('select get_my_brainilab_groups()')).groups.length,0,'nonmember cannot read member avatars');
 assert.equal((await scalar('select get_my_brainilab_friends()')).friends.length,0,'nonfriend cannot read accepted friends');
 await actor(null);
 for(const name of rpcNames.slice(1))await assert.rejects(()=>scalar('select '+name+'()'),'authentication remains required');
 await actor(me);
 // Real server unlock thresholds must match every current client option.
 for(const [kind,list] of Object.entries({...A.options,frame:C.frames,title:C.titles}))for(const item of list){
  const meta={brainilab_avatar_mode_v1:'built',[C.metadataKeys[kind]]:item.id};
  await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify(meta),peer]);
  for(const xp of new Set([Math.max(0,item.xp-1),item.xp])){
   await db.query('update player_progression set xp=$1 where user_id=$2',[xp,peer]);
   const result=await scalar('select brainilab_private.player_avatar($1)',[peer]);
   const selection=kind==='frame'?result?.frame:kind==='title'?result?.title:result?.design?.[kind];
   const expected=xp>=item.xp?item.id:list[0].id;
   assert.equal(selection??list[0].id,expected,kind+' '+item.id+' at '+xp);
   if(newWordplay.some(([newKind,newId])=>kind===newKind&&item.id===newId)){
    const adapted=A.fromPublicStyle(result);
    assert.equal(adapted.avatarDesign[kind],expected,'new server choice reaches renderer at the same threshold');
    assert.equal(A.markup(adapted.avatarDesign,adapted.avatarRenderXp),A.markup({[kind]:expected},xp),'server and local SVG match for '+kind+' '+item.id+' at '+xp);
    assert.equal(result.render_xp,xp>=item.xp?item.xp:0,'only the minimum cosmetic rendering threshold is exposed');
    assert.equal(Object.hasOwn(result,'xp'),false,'total earned XP stays private');
   }
  }
 }
 await db.query('update player_progression set xp=2700 where user_id=$1',[peer]);
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify({...metadata,brainilab_avatar_hat_v1:'wizard',brainilab_avatar_skin_v1:'<script>',brainilab_avatar_glasses_v1:['round'],brainilab_avatar_prop_v1:'book',brainilab_profile_title_v1:'sage'}),peer]);
 const bad=await scalar('select brainilab_private.player_avatar($1)',[peer]);
 assert.equal(bad.design.hat,'none');assert.equal(bad.design.prop,'none');assert.equal(bad.design.skin,'sand');assert.equal(bad.design.glasses,'none');
 assert.equal(bad.title,'none','metadata XP cannot unlock a title');
 for(const invalid of ['<img src=x onerror=alert(1)>','__proto__',['explorer'],null]){
  await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify({...metadata,brainilab_profile_title_v1:invalid}),peer]);
  assert.equal((await scalar('select brainilab_private.player_avatar($1)',[peer])).title,'none');
 }
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify({brainilab_profile_title_v1:'explorer'}),peer]);
 const titleOnly=await scalar('select brainilab_private.player_avatar($1)',[peer]);
 assert.equal(titleOnly.title,'explorer');assert.equal(titleOnly.design,null);assert.equal(titleOnly.render_xp,0,'title does not inflate avatar rendering threshold');
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify({brainilab_profile_title_v1:'none'}),peer]);
 assert.equal(await scalar('select brainilab_private.player_avatar($1)',[peer]),null,'no empty public title or avatar is invented');
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify({...metadata,brainilab_avatar_mode_v1:'picture',brainilab_avatar_prop_v1:'book'}),peer]);
 await db.query('update player_progression set xp=10000 where user_id=$1',[peer]);
 const picture=await scalar('select brainilab_private.player_avatar($1)',[peer]);
 assert.equal(picture.design,null);assert.equal(picture.render_xp,1500,'hidden illustration choices are not published in picture mode');
 await db.query('update auth.users set raw_user_meta_data=$1 where id=$2',[JSON.stringify(metadata),peer]);
 await db.query('update player_progression set xp=2700 where user_id=$1',[peer]);
 after=await snapshot();
 // Consume actual PostgreSQL results through each real adapter and actual views.
 await w.BrainiData.api.syncExternalAuthUser({id:me,user_metadata:{}});
 w.BrainiBackendAuth={init:async()=>{},isConfigured:()=>true,getSession:async()=>({user:{id:me}}),getClient:()=>({rpc:async name=>({data:after[name],error:null})})};
 for(const f of ['supabase-friends','supabase-groups','supabase-rankings','groups-view'])load(f);
 const friends=await w.BrainiFriends.refresh(),groups=await w.BrainiGroups.refresh(),ranking=await w.BrainiRankingsCloud.individual(),friendRanking=await w.BrainiFriends.ranking();
 assert.equal(friends.friends[0].xp,2700);assert.equal(friends.friends[0].dailyScore,0);
 assert.equal(friends.friends[0].avatarDesign.prop,'icepop');
 assert.equal(groups.groups[0].members[1].avatarDesign.hat,'egg');
 assert.equal(friendRanking.rows.find(r=>r.userId===peer).avatarDesign.prop,'icepop');
 const publicPeer=ranking.rows.find(r=>r.identityName==='Test player 1');
 assert.equal(publicPeer.xp,undefined,'public total XP is not added');assert.equal(publicPeer.score,99);
 const art=w.BrainiProgressUI.avatarImageMarkup(publicPeer);
 assert.match(art,/braini-built-avatar/);assert.match(art,/Illustrated BrainiLab avatar/);assert.doesNotMatch(art,/Your illustrated/);
 assert.equal(art,w.BrainiProgressUI.avatarImageMarkup(friends.friends[0]),'same rendering across ranking and friends despite absent public XP');
 assert.match(w.BrainiProgressUI.avatarImageMarkup(ranking.user),/photo-0/,'own photo is preserved');
 assert.match(w.BrainiProgressUI.avatarImageMarkup({name:'Legacy',avatarUrl:'https://example.test/legacy.jpg'}),/legacy.jpg/);
 assert.match(w.BrainiProgressUI.avatarImageMarkup({name:'Legacy'}),/default-player-avatar/);
 const unsafe=A.fromPublicStyle({frame:'gold\" onclick=bad',render_xp:Infinity,design:{mode:'built',prop:'book'}});
 assert.equal(unsafe.avatarFrame,'level');assert.equal(unsafe.avatarDesign.prop,'none');
 assert.equal(publicPeer.profileTitle,'explorer');
 assert.equal(w.BrainiProgressUI.profileTitleMarkup(publicPeer),w.BrainiProgressUI.profileTitleMarkup(friends.friends[0]));
 assert.match(w.BrainiProgressUI.profileTitleMarkup(publicPeer),/Profile title: <\/span>Explorer/);
 for(const invalid of ['none','<script>','__proto__',undefined,['explorer'],{}]){
  assert.equal(w.BrainiProgressUI.profileTitleMarkup({profileTitle:invalid}),'');
  assert.equal(A.fromPublicStyle({title:invalid}).profileTitle,'none');
 }
 for(const {id,name} of C.titles.filter(t=>t.id!=='none'))assert.equal(A.profileTitles[id],name,'public label matches existing reward catalog');
 assert.equal(A.options.mode.find(m=>m.id==='built').name,'My avatar');
 load('social');await new Promise(r=>setTimeout(r,0));await w.BrainiSocial.render();
 assert.equal(w.document.querySelectorAll('[data-friends-root] .braini-built-avatar').length,3,'friends and request avatars render');
 assert.equal(w.document.querySelectorAll('[data-groups-root] .braini-built-avatar').length,1,'group member renders their design');
 assert.equal(w.document.querySelectorAll('[data-social-frame="copper"]').length,4,'earned frame follows each peer');
 assert.equal(w.document.querySelectorAll('[data-friends-root] .player-profile-title').length,3,'equipped titles reach friends and requests');
 assert.equal(w.document.querySelectorAll('[data-groups-root] .player-profile-title').length,1,'equipped title reaches group members');
 assert.equal(w.document.querySelectorAll('script,[onclick],[onerror]').length,0,'metadata cannot introduce executable markup');
 // A later refresh replaces an older avatar rather than retaining another person's look.
 after[rpcNames[1]].friends[0].avatar_style=null;
 await w.BrainiFriends.refresh();await w.BrainiSocial.render();
 assert.equal(w.document.querySelectorAll('[data-friends-root] .braini-built-avatar').length,2);
 assert.equal(w.document.querySelectorAll('[data-friends-root] .player-profile-title').length,2,'unequipping removes the old title on refresh');
 await assert.rejects(()=>db.exec(moreWordplayMigration),/Concurrent avatar helper edit/,'new collection refuses to overwrite a changed helper or rerun blindly');
 await db.exec('rollback');
 await assert.rejects(()=>db.exec(titleMigration),/Concurrent avatar helper edit/,'title migration protects concurrent helper edits');
 await db.exec('rollback');
 await assert.rejects(()=>db.exec(migration),/Concurrent RPC edit/,'migration refuses to overwrite changed definitions');
 await db.exec('rollback');
 console.log('PASS: all 16 player tables unchanged by the six new cosmetics; exact client/server/render thresholds; real RPC/XP/score/ACL, invoker/search_path/owner/privacy and CAS; social views, fallback, refresh and My avatar label.');
}finally{dom.window.close();await db.close();}
