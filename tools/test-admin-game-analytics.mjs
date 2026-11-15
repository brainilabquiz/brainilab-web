import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const library = read('../games/index.html');
const migration = read('../supabase/migrations/20261115183000_admin_game_analytics_activity.sql');
const libraryIds = [...library.matchAll(/data-anytime-game="([^"]+)"/g)].map(([, id]) => id);
const catalog = migration.split('with catalog(game_id, cloud_tracking) as (values')[1].split('),\n  starts_raw')[0];
const catalogIds = [...catalog.matchAll(/\('([^']+)', (?:true|false)\)/g)].map(([, id]) => id);
assert.deepEqual(catalogIds.toSorted(), [...libraryIds, 'gtavi'].toSorted());

const html = read('../admin/index.html');
const dom = new JSDOM(html, {url:'https://brainilabgames.com/admin/#analytics',runScripts:'outside-only'});
const {window} = dom;
await new Promise(resolve => window.addEventListener('load', resolve, {once:true}));
window.eval(read('../assets/js/admin.js'));
const app = window.BrainiAdmin;
const document = window.document;
const calls = [];
const summary = {winning_players:1,active_players:52,avg_plays_per_winner:4,avg_active_days:1.12};
const game = game_id => ({
  game_id, coverage:game_id==='sports'?'observed':'local_only',
  plays:game_id==='sports'?1:0, starts:game_id==='sports'?11:0,
  health_score:game_id==='sports'?14:null, sample_state:'established',
  exits:game_id==='sports'?10:0, exits_first_checkpoint:9, tracked_completions:1, exit_rate:90.9,
  in_catalog:true, unique_players:1
});
app.state.admin = {role:'owner',permissions:['results']};
app.state.sb = {async rpc(name, args) {
  calls.push([name,args]);
  if(name==='admin_get_game_analytics') return {data:{summary:{total_plays:1},games:catalogIds.map(game)}};
  if(name==='admin_question_quality_overview') return {data:{summary:{},rows:[]}};
  assert.equal(name,'admin_get_player_activity');
  const total = args.p_winners_only?1:52;
  const rows = Array.from({length:Math.min(total-args.p_offset,50)},(_,index)=>({
    user_id:String(args.p_offset+index),display_name:'<img src=x>',completed_plays:4,active_days:2,wins:1
  }));
  return {data:{summary,rows,total,offset:args.p_offset,page_size:50}};
}};
const query = selector => document.querySelector(selector);
async function until(check) {
  for(let tick=0;tick<30;tick++){
    if(check())return;
    await new Promise(resolve=>setTimeout(resolve,5));
  }
  assert.fail('The admin view did not reach the expected state');
}

app.navigate('analytics');
await until(()=>query('.admin-game-health-table'));
assert.equal(document.querySelectorAll('.admin-game-health-table tbody tr').length,catalogIds.length);
const gameRows = [...document.querySelectorAll('.admin-game-health-table tbody tr')];
assert.match(gameRows[0].textContent,/Sports[\s\S]*90\.9%[\s\S]*9 at first checkpoint/);
for(const label of ['Europe Flags','Cryptic','GTA VI Quiz']){
  const row = gameRows.find(item=>item.querySelector('strong').textContent===label);
  assert.match(row.textContent,/No cloud tracking/);
  assert.equal(row.cells[2].textContent,'—');
  assert.equal(row.cells[3].textContent,'—');
}

assert.equal(calls.length,2,'Player activity loads on request');
query('#analyticsPlayerActivity').open=true;
await until(()=>query('.admin-player-activity-table'));
assert.deepEqual(JSON.parse(JSON.stringify(calls.at(-1)[1])),{p_days:30,p_winners_only:true,p_offset:0});
assert.match(query('#analyticsPlayerRows').textContent,/Plays per winner[\s\S]*Active days per player/);
assert.equal(query('[data-analytics-player]').textContent,'<img src=x>');
assert.equal(query('#analyticsPlayerRows img'),null,'Profile labels are escaped');

const select = query('#analyticsPlayerFilter');
select.value='all';
select.dispatchEvent(new window.Event('change'));
await until(()=>query('[data-activity-range]')?.textContent==='1–50 of 52');
query('[data-activity-page="next"]').click();
await until(()=>query('[data-activity-range]')?.textContent==='51–52 of 52');
assert.equal(document.activeElement,query('[data-activity-range]'));
const days = query('#analyticsDays');
days.value='7';
days.dispatchEvent(new window.Event('change'));
await until(()=>calls.some(([name,args])=>name==='admin_get_player_activity' && args.p_days===7));
assert.equal(query('#analyticsPlayerFilter').value,'all');
window.close();
console.log('PASS admin catalogue coverage, missing data, player activity filters and keyboard pagination.');
