import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const scripts = ['halloween-game-model.js', 'halloween-guest-model.js', 'halloween-event-client.js'].map(name => readFileSync('assets/js/' + name, 'utf8'));
const plain = value => JSON.parse(JSON.stringify(value));
const START = '2026-10-18T22:00:00.000Z', END = '2026-11-01T23:00:00.000Z';
function config(day = '2026-10-19', options = {}) {
  return { enabled: true, active: true, preview: false, status: 'active', start: START, end: END, day, serverNow: Date.parse(day + 'T12:00:00.000Z'), ...options };
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
async function harness(options = {}) {
  let settings = config('2026-10-19', options.config), auth = options.auth || { status: 'guest' }, ticks = 0, sequence = 0, pendingFetch = null, pendingStart = null, pendingComplete = null, pendingLock = null;
  const dom = new JSDOM(`<script type="application/json" data-halloween-config>${JSON.stringify(settings)}</script>`, { url: options.url || 'https://brainilabgames.com/halloween/', runScripts: 'outside-only' });
  const w = dom.window, calls = { fetch: [], rpc: [], xp: [], events: [], locks: [] };
  Object.defineProperty(w.performance, 'now', { value: () => ticks });
  if (options.fastDeadline) {
    const original = w.setTimeout.bind(w); w.setTimeout = (callback, delay, ...args) => original(callback, delay >= 7900 ? 0 : delay, ...args);
    Object.defineProperty(w.AbortSignal, 'timeout', { value: delay => { const controller = new w.AbortController(); w.setTimeout(() => controller.abort(new w.DOMException('The operation timed out', 'TimeoutError')), delay); return controller.signal; } });
  }
  Object.defineProperty(w.crypto, 'randomUUID', { value: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}` });
  if (options.locks) Object.defineProperty(w.navigator, 'locks', { value: { request: async (key, lockOptions, callback) => {
    calls.locks.push({ key, mode: lockOptions.mode });
    if (pendingLock) { const wait = pendingLock; pendingLock = null; await wait.promise; }
    return callback();
  } } });
  for (const [key, value] of Object.entries(options.storage || {})) w.localStorage.setItem(key, value);
  const noMainWrites = name => () => { calls.xp.push(name); throw Error('Main player data must not be changed'); };
  w.BrainiData = { authState: () => auth, api: { submitGameResult: noMainWrites('submitGameResult'), grantXP: noMainWrites('grantXP'), updateStreak: noMainWrites('updateStreak') } };
  w.fetch = async (url, request) => {
    calls.fetch.push({ url, request: plain(request || {}) });
    assert.equal(url, '/api/halloween/config'); assert.equal(request.cache, 'no-store'); assert.equal(request.credentials, 'same-origin');
    if (options.hangFetch) return await new Promise((resolve, reject) => request.signal?.addEventListener('abort', () => reject(request.signal.reason || new Error('The operation timed out')), { once: true }));
    if (pendingFetch) { const wait = pendingFetch; pendingFetch = null; await wait.promise; }
    if (options.fetchFail) return { ok: false, json: async () => ({}) };
    return { ok: true, json: async () => plain(settings) };
  };
  w.BrainiHalloweenEntitlements = {
    load: async () => { calls.rpc.push({ name: 'load' }); return {}; },
    snapshot: () => ({ entitlements: ['pumpkin-thinker'], progress: { games_completed: 1 } }),
    startGame: async game => {
      calls.rpc.push({ name: 'startGame', game });
      if (pendingStart) { const wait = pendingStart; pendingStart = null; await wait.promise; }
      return { session_id: 'account-session', game, pack: w.BrainiHalloweenGameModel.publicPack(game) };
    },
    completeGame: async (id, submission) => {
      calls.rpc.push({ name: 'completeGame', id, submission: plain(submission) });
      if (pendingComplete) { const wait = pendingComplete; pendingComplete = null; await wait.promise; }
      if (options.cloudError) throw Error(options.cloudError);
      if (options.cloudCompleteFail) throw Error('This Halloween special has finished.');
      const result = options.cloudResult || w.BrainiHalloweenGameModel.summary('trick-or-think', submission);
      return { result: plain(result), state: {}, unlocked: [] };
    }
  };
  for (const event of ['brainilab:halloween-progress', 'brainilab:halloween-entitlements']) w.addEventListener(event, () => calls.events.push(event));
  scripts.forEach(source => w.eval(source));
  const api = w.BrainiLabHalloween, model = w.BrainiHalloweenGameModel;
  const quiz = model.game('trick-or-think');
  const answers = correct => ({ answers: quiz.questions.map(q => ({ id: q.id, answer: correct ? q.answer : q.options.find(o => o.id !== q.answer).id })) });
  const connections = () => ({ attempts: model.game('spooky-connections').groups.map(g => plain(g.wordIds)) });
  const payload = (session, submission) => ({ gameId: session.game, version: 'halloween-2026-v1', sessionId: session, submission, localSummary: model.summary(session.game, submission) });
  return {
    w, dom, calls, api, model, answers, connections, payload,
    setAuth(value) { auth = value; },
    setConfig(value) { settings = value; },
    advance(value) { ticks += value; },
    deferFetch() { pendingFetch = deferred(); return pendingFetch; },
    deferStart() { pendingStart = deferred(); return pendingStart; },
    deferComplete() { pendingComplete = deferred(); return pendingComplete; },
    deferLock() { pendingLock = deferred(); return pendingLock; },
    storage() { const out = {}; for (let i = 0; i < w.localStorage.length; i++) { const key = w.localStorage.key(i); out[key] = w.localStorage.getItem(key); } return out; },
    ledger() { return JSON.parse(w.localStorage.getItem('brainilab-halloween-2026:' + api.identityKey()) || '{"records":[]}'); },
    blockStorage() { w.Storage.prototype.setItem = () => { throw Error('Storage denied'); }; },
    close() { assert.equal(calls.xp.length, 0, 'Never change the main player progression'); dom.window.close(); }
  };
}

let passed = 0;
const failures = [];
async function test(name, work) { try { await work(); passed++; console.log('PASS ' + name); } catch (error) { failures.push({ name, error }); console.error('FAIL ' + name + ': ' + error.message); } }

await test('loopback private preview never calls account RPCs or config fetch, even when signed in', async () => {
  const u = await harness({ url: 'http://localhost:8808/halloween/', config: { preview: true, serverNow: Date.parse('2026-10-16T12:00Z') }, auth: { status: 'authenticated', user: { id: 'user-a' } } });
  assert.equal(u.api.availability().allowed, true); assert.equal(u.api.availability().preview, true); assert.match(u.api.identityKey(), /^preview:/);
  const session = await u.api.startGame('trick-or-think');
  const result = await u.api.completeGame(u.payload(session, u.answers(true)));
  assert.equal(result.saved, true); assert.equal(result.preview, true); assert.equal(result.verifiedSummary.score, 100);
  assert.equal(u.calls.rpc.length, 0); assert.equal(u.calls.fetch.length, 0);
  assert.ok(Object.keys(u.storage()).every(key => !key.startsWith('brainilab-halloween-2026:account:')));
  u.close();
});

await test('a public hostname cannot enable preview using an injected preview flag', async () => {
  const u = await harness({ config: { preview: true } });
  assert.equal(u.api.availability().allowed, false); assert.equal(u.api.availability().preview, false); u.close();
});

await test('a browser guest identity survives reload and is not based on IP', async () => {
  const u = await harness(); const first = u.api.identityKey();
  assert.equal(u.api.identityKey(), first); const storage = u.storage(); u.close();
  const reload = await harness({ storage }); assert.equal(reload.api.identityKey(), first); assert.equal(reload.calls.rpc.length, 0); reload.close();
});

await test('existing anonymous identity is reused without creating a new main player', async () => {
  const u = await harness({ auth: { status: 'guest', guestUserId: 'existing-anon' } });
  assert.equal(u.api.identityKey(), 'guest:existing-anon');
  await u.api.startGame('trick-or-think'); assert.equal(u.calls.rpc.length, 0); u.close();
});

await test('guest collection awards one game, both games and three distinct Madrid dates', async () => {
  const u = await harness();
  let session = await u.api.startGame('trick-or-think');
  let result = await u.api.completeGame(u.payload(session, u.answers(false)));
  assert.equal(result.verifiedSummary.score, 0); assert.deepEqual(plain(result.unlocks), ['pumpkin-thinker']);
  session = await u.api.startGame('spooky-connections'); result = await u.api.completeGame(u.payload(session, u.connections()));
  assert.deepEqual(plain(result.unlocks), ['midnight']); assert.equal(result.state.progress.days_played, 1);
  u.setConfig(config('2026-10-20')); session = await u.api.startGame('trick-or-think'); result = await u.api.completeGame(u.payload(session, u.answers(true)));
  assert.deepEqual(plain(result.unlocks), []); assert.equal(result.state.progress.days_played, 2);
  u.setConfig(config('2026-10-21')); session = await u.api.startGame('trick-or-think'); result = await u.api.completeGame(u.payload(session, u.answers(true)));
  assert.deepEqual(plain(result.unlocks), ['little-bat']); assert.deepEqual(plain(result.state.progress), { games_completed: 4, distinct_games: 2, days_played: 3 });
  assert.deepEqual(plain(u.api.guestEntitlements()), ['pumpkin-thinker', 'midnight', 'little-bat']); assert.equal(u.calls.rpc.length, 0); u.close();
});

await test('same saved guest session is idempotent and start exposes its first score', async () => {
  const u = await harness(); const first = await u.api.startGame('trick-or-think');
  const payload = u.payload(first, u.answers(false)); await u.api.completeGame(payload); const before = u.storage();
  const repeat = await u.api.completeGame(payload); assert.deepEqual(plain(repeat.unlocks), []); assert.deepEqual(u.storage(), before);
  const practice = await u.api.startGame('trick-or-think'); assert.equal(practice.completed, true); assert.equal(practice.result.score, 0); assert.equal(practice.session_id, first.session_id); u.close();
});

await test('two guest tabs cannot overwrite the first game/day score or claim a newer score was saved', async () => {
  const u = await harness(); const first = await u.api.startGame('trick-or-think'), second = await u.api.startGame('trick-or-think');
  assert.notEqual(first.session_id, second.session_id);
  await u.api.completeGame(u.payload(first, u.answers(false)));
  const result = await u.api.completeGame(u.payload(second, u.answers(true)));
  assert.equal(u.ledger().records.length, 1); assert.equal(u.ledger().records[0].score, 0);
  assert.equal(result.replayed, true); assert.equal(result.result.score, 0); assert.deepEqual(plain(result.unlocks), []); u.close();
});

await test('changed answers on a saved session return the saved result without another unlock', async () => {
  const u = await harness(); const first = await u.api.startGame('trick-or-think'); await u.api.completeGame(u.payload(first, u.answers(false)));
  const result = await u.api.completeGame(u.payload(first, u.answers(true)));
  assert.equal(result.replayed, true); assert.equal(result.result.score, 0); assert.equal(u.ledger().records[0].score, 0); assert.deepEqual(plain(result.unlocks), []); u.close();
});

await test('a guest completion rereads a result saved by another tab during its config request', async () => {
  const u = await harness(); const first = await u.api.startGame('trick-or-think'), second = await u.api.startGame('trick-or-think');
  const wait = u.deferFetch(), completingSecond = u.api.completeGame(u.payload(second, u.answers(true)));
  await u.api.completeGame(u.payload(first, u.answers(false))); wait.resolve(); const replay = await completingSecond;
  assert.equal(u.ledger().records.length, 1); assert.equal(u.ledger().records[0].id, first.session_id); assert.equal(u.ledger().records[0].score, 0);
  assert.equal(replay.replayed, true); assert.equal(replay.result.score, 0); assert.deepEqual(plain(replay.unlocks), []); u.close();
});

await test('a session owned by another identity cannot start completion', async () => {
  const u = await harness({ auth: { status: 'guest', guestUserId: 'guest-a' } }); const session = await u.api.startGame('trick-or-think');
  u.setAuth({ status: 'guest', guestUserId: 'guest-b' });
  await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), /another session|account changed/); assert.equal(u.ledger().records.length, 0); u.close();
});

await test('identity switch while guest completion awaits config cannot contaminate the new ledger', async () => {
  const u = await harness({ auth: { status: 'guest', guestUserId: 'guest-a' } }); const session = await u.api.startGame('trick-or-think');
  const wait = u.deferFetch(), completing = u.api.completeGame(u.payload(session, u.answers(true)));
  u.setAuth({ status: 'guest', guestUserId: 'guest-b' }); wait.resolve();
  await assert.rejects(completing, /account changed|another session/); assert.equal(u.ledger().records.length, 0);
  assert.ok(!Object.keys(u.storage()).includes('brainilab-halloween-2026:guest:guest-b')); u.close();
});

await test('identity switch during an account start discards the returned session', async () => {
  const u = await harness({ auth: { status: 'authenticated', user: { id: 'user-a' } } });
  const wait = u.deferStart(), starting = u.api.startGame('trick-or-think');
  await new Promise(resolve => setTimeout(resolve, 0)); u.setAuth({ status: 'authenticated', user: { id: 'user-b' } }); wait.resolve();
  await assert.rejects(starting, /account changed/); assert.equal(Object.keys(u.storage()).filter(k => k.startsWith('brainilab-halloween-2026:')).length, 0); u.close();
});

await test('identity switch during an account completion discards the response', async () => {
  const u = await harness({ auth: { status: 'authenticated', user: { id: 'user-a' } } }); const session = await u.api.startGame('trick-or-think');
  const wait = u.deferComplete(), completing = u.api.completeGame(u.payload(session, u.answers(true)));
  u.setAuth({ status: 'authenticated', user: { id: 'user-b' } }); wait.resolve(); await assert.rejects(completing, /account changed/);
  assert.equal(Object.keys(u.storage()).filter(k => k.startsWith('brainilab-halloween-2026:')).length, 0); u.close();
});

await test('storage rejection does not claim a saved collection or dispatch unlock notifications', async () => {
  const u = await harness({ auth: { status: 'guest', guestUserId: 'stable-guest' } }); const session = await u.api.startGame('trick-or-think');
  u.blockStorage(); await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), /could not save/);
  assert.equal(u.api.snapshot().progress.games_completed, 0); assert.equal(u.calls.events.length, 0); u.close();
});

await test('monotonic elapsed time closes the earning window without trusting a changed device date', async () => {
  const end = Date.parse(END), u = await harness({ config: { serverNow: end - 500 } });
  assert.equal(u.api.availability().allowed, true); u.advance(500); assert.equal(u.api.availability().allowed, false); u.close();
});

await test('server refresh refuses a new guest reward once the window has closed', async () => {
  const u = await harness({ config: { day: '2026-11-01', serverNow: Date.parse(END) - 500 } }); const session = await u.api.startGame('trick-or-think');
  u.setConfig(config('2026-11-02', { active: false, status: 'closed', serverNow: Date.parse(END) }));
  await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), error => error.code === 'HALLOWEEN_CLOSED' && /finished|not open/.test(error.message)); assert.equal(u.ledger().records.length, 0); assert.equal(u.calls.events.length, 0); u.close();
});

await test('a saved guest result can be read after expiry without granting another day', async () => {
  const u = await harness({ config: { day: '2026-11-01', serverNow: Date.parse(END) - 500 } }); const session = await u.api.startGame('trick-or-think'); const payload = u.payload(session, u.answers(true));
  await u.api.completeGame(payload); const before = u.storage(); u.setConfig(config('2026-11-02', { active: false, status: 'closed', serverNow: Date.parse(END) })); u.advance(500);
  const repeated = await u.api.completeGame(payload); assert.equal(repeated.saved, true); assert.deepEqual(plain(repeated.unlocks), []); assert.deepEqual(u.storage(), before); u.close();
});

await test('an unfinished guest session cannot cross into a different Madrid earning day', async () => {
  const u = await harness(); const session = await u.api.startGame('trick-or-think'); u.setConfig(config('2026-10-20'));
  await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), error => error.code === 'HALLOWEEN_DAY_CHANGED' && /day|date|start again/.test(error.message));
  assert.equal(u.ledger().records.length, 0); u.close();
});

await test('failed config refresh does not start a game or issue an account RPC', async () => {
  const u = await harness({ fetchFail: true }); await assert.rejects(u.api.startGame('trick-or-think'), /could not be checked/); assert.equal(u.calls.rpc.length, 0); assert.equal(u.ledger().records.length, 0); u.close();
});

await test('a stalled config request has a bounded deadline and cannot leave start hanging', async () => {
  const u = await harness({ hangFetch: true, fastDeadline: true });
  let watchdog;
  const outer = new Promise((resolve, reject) => { watchdog = setTimeout(() => reject(Error('Coordinator failed the request deadline')), 1000); });
  try { await assert.rejects(Promise.race([u.api.startGame('trick-or-think'), outer]), /try again|could not|timed|too long/i); }
  finally { clearTimeout(watchdog); }
  assert.equal(u.calls.rpc.length, 0); assert.equal(u.ledger().records.length, 0); u.close();
});

await test('incomplete, forged and cross-game payloads never reach account completion', async () => {
  const u = await harness({ auth: { status: 'authenticated', user: { id: 'user-a' } } }); const session = await u.api.startGame('trick-or-think');
  await assert.rejects(u.api.completeGame({ ...u.payload(session, u.answers(true)), submission: { answers: [] } }), /Finish/);
  await assert.rejects(u.api.completeGame({ ...u.payload(session, u.answers(true)), gameId: 'spooky-connections' }), /another session/);
  await assert.rejects(u.api.completeGame({ ...u.payload(session, u.answers(true)), sessionId: { ...session, preview: true } }), /another session/);
  assert.equal(u.calls.rpc.filter(c => c.name === 'completeGame').length, 0); u.close();
});

await test('account completion uses server result and does not claim a mismatched local score was verified', async () => {
  const u = await harness({ auth: { status: 'authenticated', user: { id: 'user-a' } }, cloudResult: { completed: true, score: 40, correct: 4, total: 10, maxScore: 100 } });
  const session = await u.api.startGame('trick-or-think'); const result = await u.api.completeGame(u.payload(session, u.answers(true)));
  assert.equal(result.result.score, 40); assert.equal(result.verifiedSummary.score, 40); assert.equal(u.api.guestEntitlements().length, 0); u.close();
});

await test('account session expiry after Madrid midnight maps to the fresh-day UI code', async () => {
  const u = await harness({ auth: { status: 'authenticated', user: { id: 'user-a' } }, cloudError: 'Halloween session is not open' });
  const session = await u.api.startGame('trick-or-think'); u.advance(24 * 60 * 60 * 1000);
  await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), error => error.code === 'HALLOWEEN_DAY_CHANGED');
  assert.equal(u.calls.events.length, 0); u.close();
});

await test('account session expiry at the event end maps to the closed UI code', async () => {
  const u = await harness({ config: { day: '2026-11-01', serverNow: Date.parse(END) - 500 }, auth: { status: 'authenticated', user: { id: 'user-a' } }, cloudError: 'Halloween session is not open' });
  const session = await u.api.startGame('trick-or-think'); u.advance(500);
  await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), error => error.code === 'HALLOWEEN_CLOSED');
  assert.equal(u.calls.events.length, 0); u.close();
});

await test('a temporary account error keeps its retryable meaning instead of becoming a terminal expiry', async () => {
  const u = await harness({ auth: { status: 'authenticated', user: { id: 'user-a' } }, cloudError: 'Temporary connection problem' });
  const session = await u.api.startGame('trick-or-think');
  await assert.rejects(u.api.completeGame(u.payload(session, u.answers(true))), error => error.code === undefined && error.message === 'Temporary connection problem'); u.close();
});

await test('a guest waiting for the browser lock cannot earn after the event end', async () => {
  const u = await harness({ locks: true, config: { day: '2026-11-01', serverNow: Date.parse(END) - 500 } }); const session = await u.api.startGame('trick-or-think');
  const wait = u.deferLock(), completing = u.api.completeGame(u.payload(session, u.answers(true))); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(u.calls.locks.length, 1); u.advance(500); wait.resolve();
  await assert.rejects(completing, error => error.code === 'HALLOWEEN_CLOSED'); assert.equal(u.ledger().records.length, 0); u.close();
});

await test('a guest waiting for the browser lock cannot earn for the day that just ended', async () => {
  const u = await harness({ locks: true, config: { day: '2026-10-19', serverNow: Date.parse('2026-10-19T21:59:59.500Z') } }); const session = await u.api.startGame('trick-or-think');
  const wait = u.deferLock(), completing = u.api.completeGame(u.payload(session, u.answers(true))); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(u.calls.locks.length, 1); u.advance(1000); wait.resolve();
  await assert.rejects(completing, error => error.code === 'HALLOWEEN_DAY_CHANGED'); assert.equal(u.ledger().records.length, 0); u.close();
});

await test('the real coordinator day contract gives a fresh game intro after a saved prior-day result', async () => {
  const controller = readFileSync('assets/js/halloween-games.js', 'utf8');
  async function mount(u) { const section = u.w.document.createElement('section'); section.dataset.halloweenGame = 'trick-or-think'; u.w.document.body.append(section); u.w.eval(controller); await new Promise(resolve => setTimeout(resolve, 0)); return section; }
  const first = await harness({ url: 'http://localhost/halloween/', config: { preview: true } }), root = await mount(first);
  root.querySelector('[data-hg-start]').click(); await new Promise(resolve => setTimeout(resolve, 0));
  for (const q of first.model.game('trick-or-think').questions) { root.querySelector(`[data-hg-answer="${q.answer}"]`).click(); root.querySelector('[data-hg-next]').click(); await new Promise(resolve => setTimeout(resolve, 0)); }
  assert.match(root.querySelector('[data-hg-status]').textContent, /Preview complete/); const storage = first.storage(); first.close();
  const second = await harness({ url: 'http://localhost/halloween/', config: { preview: true, day: '2026-10-20', serverNow: Date.parse('2026-10-20T12:00Z') }, storage });
  const next = await mount(second); assert.equal(second.api.availability().day, '2026-10-20');
  assert.ok(next.querySelector('[data-hg-start]')); assert.equal(next.querySelector('[data-hg-replay]'), null); assert.match(next.querySelector('[data-hg-start]').textContent, /Let’s play/);
  assert.equal(second.calls.rpc.length, 0); assert.equal(second.calls.fetch.length, 0); second.close();
});

await test('every factual question has its own checked source row and canonical seed matches', async () => {
  const u = await harness();
  const seed = JSON.parse(readFileSync('../release/halloween-games.json', 'utf8'));
  assert.deepEqual(plain(u.model.catalog), seed);
  const audit = readFileSync('docs/HALLOWEEN_GAMES.md', 'utf8');
  for (const q of seed.games['trick-or-think'].questions) { assert.ok(audit.includes('| ' + q.id + ' |')); assert.ok(audit.includes(q.source.url)); }
  assert.ok(!seed.games['trick-or-think'].questions.some(q => q.source.url.includes('headlinesandheroes'))); u.close();
});

console.log(`Halloween coordinator integration: ${passed} passed, ${failures.length} failed.`);
if (failures.length) { for (const f of failures) console.error(f.name + '\n' + f.error.stack); process.exitCode = 1; }
