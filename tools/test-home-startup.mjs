import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const script = name => readFileSync(new URL(`../assets/js/${name}.js`,import.meta.url),'utf8');
const startup = script('home-startup');
const dailyHub = script('daily-hub');
const sessionKey = 'sb-fixture-auth-token';
const savedPlayerKey = 'brainilab.mock.v1';
const claimKey = 'brainilab_guest_claim_v1';

function fixture({ path = '/', keys = [], unavailable = false } = {}) {
  const dom = new JSDOM('', { url: 'https://brainilabgames.com' + path, runScripts: 'outside-only' });
  const w = dom.window;
  for (const key of keys) w.localStorage.setItem(key, 'fixture');
  if(unavailable) Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage unavailable');}});
  w.BRAINI_SUPABASE = { url: 'https://fixture.supabase.co', publishableKey: 'fixture-public-key' };
  const requests = [];
  w.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return { ok: true, json: async () => ({ games: ['mathrush'], rules_version: 'daily-choice-v1', bonus_choice: null }) };
  };
  const cloudLoads = [];
  w.BrainiPerf = { ensureCloud: () => cloudLoads.push('cloud'), loadFeature: async name => cloudLoads.push(name) };
  w.eval(startup);
  return { w, requests, cloudLoads };
}

{
  const {w, requests, cloudLoads} = fixture({path:'/?utm_source=youtube'});
  try {
    assert.equal(w.BrainiHomeStartup.requiresCloud(), false);
    w.localStorage.setItem(savedPlayerKey, 'new empty defaults');
    assert.equal(w.BrainiHomeStartup.requiresCloud(), false);
    await w.BrainiHomeStartup.runtimeFlags();
    await w.BrainiHomeStartup.dailyLineup('2026-11-15');
    assert.equal(cloudLoads.length, 0, 'the two public reads do not load the player client');
    assert.deepEqual(requests.map(r => [r.url, r.options.method, r.options.body]), [
      ['https://fixture.supabase.co/rest/v1/rpc/get_brainilab_runtime_flags','POST','{}'],
      ['https://fixture.supabase.co/rest/v1/rpc/get_brainilab_daily_lineup','POST','{"p_challenge_date":"2026-11-15"}'],
    ]);
    for(const {options} of requests) {
      assert.equal(options.credentials,'omit');
      assert.equal(options.headers.apikey,'fixture-public-key');
      assert.equal(options.headers.Authorization,undefined);
      assert.ok(options.signal);
    }
    w.localStorage.setItem(sessionKey, 'session from another tab');
    w.dispatchEvent(new w.StorageEvent('storage', {key: sessionKey}));
    assert.equal(w.BrainiHomeStartup.requiresCloud(), true);
    assert.deepEqual(cloudLoads, ['cloud']);
  } finally { w.close(); }
}

for (const options of [{keys:[savedPlayerKey]}, {keys:[sessionKey]}, {keys:[claimKey]}, {unavailable:true},
  {path:'/?code=callback'}, {path:'/#access_token=callback'}, {path:'/#error_description=denied'},
  {path:'/?token_hash=confirmation'}, {path:'/?friend=welcome'}, {path:'/?invite=welcome'}]) {
  const {w, cloudLoads} = fixture(options);
  try {
    assert.equal(w.BrainiHomeStartup.requiresCloud(),true,JSON.stringify(options));
    w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));
    assert.deepEqual(cloudLoads,['cloud']);
    w.BrainiAccountMenu={hydrate:()=>cloudLoads.push('hydrate')};
    await w.BrainiHomeStartup.ensureAvatar();
    assert.deepEqual(cloudLoads,['cloud','home-avatar.bundle.js','hydrate']);
  } finally { w.close(); }
}

{
  const {w} = fixture();
  try {
    let bonusChoice = 'sequence', playerReads = 0;
    const day = '2026-11-15';
    w.BrainiData = {
      daily: () => ({number:79, bonusChoice, completedGames:['mathrush']}),
      dailyGameIdsForNumber: () => ['mathrush'], dateForDailyNumber: () => day,
      recentResults: () => [{dailyNumber:79, answersVerified:true}], dailyPointsForResult: () => 688,
      setDailyBonusChoice: value => { bonusChoice = value; },
    };
    w.BrainiDailyRules = {active:()=>true,model:()=>({version:'daily-choice-v1'}),max:()=>2500};
    w.eval(dailyHub);
    const options = { forceCloud:true,publicLineup:w.BrainiHomeStartup.dailyLineup };
    const local = await w.BrainiDailyHub.resolve(79, options);
    assert.equal(local.games.mathrush.completed,true);
    assert.equal(local.games.mathrush.points,688);
    assert.equal(bonusChoice,'sequence','the public response cannot replace the player’s chosen extra');
    await assert.rejects(w.BrainiDailyHub.resolve(79,{publicLineup:async()=>({games:['sequence']})}),/Daily rules could not be checked/);
    w.BrainiBackendAuth={isConfigured:()=>true,getSession:async()=>({user:{id:'guest-fixture'}}),getClient:()=>({rpc:async()=>({data:{rules_version:'daily-choice-v1',games:['mathrush'],bonus_choice:'brainiword'}})})};
    w.BrainiCloudGames={getMyRecentResults:async()=>{playerReads++;return [];}};
    await w.BrainiDailyHub.resolve(79,{forceCloud:true,publicLineup:()=>assert.fail('a player’s request must use their session')});
    assert.equal(playerReads,1);
    assert.equal(bonusChoice,'brainiword');
  } finally { w.close(); }
}

console.log('PASS homepage startup: public reads for new visitors, existing sessions and callbacks, cross-tab restoration, saved progress and account-specific Daily choices.');
