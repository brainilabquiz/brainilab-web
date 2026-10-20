import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

const modelSource = readFileSync('assets/js/halloween-game-model.js', 'utf8');
const uiSource = readFileSync('assets/js/halloween-games.js', 'utf8');
const ctx = vm.createContext({}); vm.runInContext(modelSource, ctx);
const m = ctx.BrainiHalloweenGameModel;
const plain = value => JSON.parse(JSON.stringify(value));
const quiz = m.game('trick-or-think'), words = m.game('spooky-connections');
const fullAnswers = quiz.questions.map(q => ({ id: q.id, answer: q.answer }));
assert.equal(quiz.questions.length, 10);
assert.equal(new Set(quiz.questions.map(q => q.id)).size, 10);
for (const q of quiz.questions) {
  assert.equal(q.options.length, 4); assert.equal(new Set(q.options.map(o => o.label)).size, 4);
  assert.equal(q.options.filter(o => o.id === q.answer).length, 1);
  assert.ok(q.source.title && q.source.url.startsWith('https://')); assert.ok(q.explanation.length > 20);
}
assert.equal(words.words.length, 16); assert.equal(new Set(words.words.map(w => w.label)).size, 16);
assert.equal(new Set(words.groups.flatMap(g => g.wordIds)).size, 16);
assert.deepEqual(plain(m.summary(quiz.id, { answers: fullAnswers })), { completed: true, correct: 10, total: 10, score: 100, maxScore: 100 });
const wrongAnswers = quiz.questions.map(q => ({ id: q.id, answer: q.options.find(o => o.id !== q.answer).id }));
assert.equal(m.summary(quiz.id, { answers: wrongAnswers }).score, 0);
for (let correct = 0; correct <= 10; correct++) {
  const answers = fullAnswers.map((a, i) => i < correct ? a : wrongAnswers[i]);
  assert.equal(m.summary(quiz.id, { answers }).score, correct * 10);
}
assert.throws(() => m.summary(quiz.id, { answers: [] }), /Finish/);
assert.throws(() => m.quizFromSubmission({ answers: [fullAnswers[0], fullAnswers[0]] }), /current question/);
assert.throws(() => m.quizFromSubmission({ answers: [{ id: 'q01', answer: 'spoof' }] }), /Choose/);
assert.throws(() => m.quizFromSubmission({ answers: fullAnswers, score: 100 }), /Invalid/);
assert.throws(() => m.quizFromSubmission({ answers: [...fullAnswers, fullAnswers[0]] }), /Too many/);
const first = m.answerQuiz(m.initialQuiz(), 'q01', 'b');
assert.equal(first.answers.length, 1); assert.equal(m.initialQuiz().answers.length, 0);
assert.throws(() => m.answerQuiz(first, 'q01', 'a'), /current question/);
const wrongSets = [['w00', 'w01', 'w04', 'w08'], ['w00', 'w02', 'w05', 'w09'], ['w01', 'w03', 'w06', 'w10'], ['w02', 'w03', 'w07', 'w11']];
const correctSets = words.groups.map(g => plain(g.wordIds));
for (let mistakes = 0; mistakes < 4; mistakes++) {
  const result = m.summary(words.id, { attempts: [...wrongSets.slice(0, mistakes), ...correctSets] });
  assert.equal(result.correct, 4); assert.equal(result.mistakes, mistakes); assert.equal(result.score, 100 - mistakes * 10);
}
assert.deepEqual(plain(m.summary(words.id, { attempts: wrongSets })), { completed: true, correct: 0, total: 4, mistakes: 4, score: 0, maxScore: 100 });
assert.equal(m.summary(words.id, { attempts: [correctSets[3], ...wrongSets] }).score, 0);
assert.equal(m.summary(words.id, { attempts: [...correctSets.slice(0, 2), ['w08', 'w09', 'w12', 'w13'], ['w08', 'w10', 'w12', 'w14'], ['w09', 'w11', 'w13', 'w15'], ['w10', 'w11', 'w14', 'w15']] }).score, 10);
let c = m.submitConnections(m.initialConnections(), wrongSets[0]);
assert.throws(() => m.submitConnections(c, wrongSets[0].slice().reverse()), /already tried/);
assert.throws(() => m.submitConnections(c, ['w00', 'w00', 'w01', 'w02']), /different/);
assert.throws(() => m.submitConnections(c, ['w00', 'w01', 'w02', 'unknown']), /Unknown/);
c = m.submitConnections(c, correctSets[0]);
assert.throws(() => m.submitConnections(c, ['w00', 'w04', 'w05', 'w06']), /already been found/);
const completeConnections = m.connectionsFromSubmission({ attempts: correctSets });
assert.throws(() => m.submitConnections(completeConnections, wrongSets[0]), /already complete/);
assert.throws(() => m.summary(words.id, { attempts: correctSets.slice(0, 2) }), /Finish/);
assert.throws(() => m.connectionsFromSubmission({ attempts: [...wrongSets, correctSets[0]] }), /already complete/);
for (const order of [[3, 2, 1, 0], [1, 3, 0, 2], [2, 0, 3, 1]]) assert.equal(m.summary(words.id, { attempts: order.map(i => correctSets[i]) }).score, 100);
for (const gameId of [quiz.id, words.id]) {
  const pack = plain(m.publicPack(gameId));
  assert.equal(m.acceptsPack(gameId, pack), true);
  assert.equal(m.acceptsPack(gameId, { ...pack, version: 'old' }), false);
  const reordered = gameId === quiz.id ? { ...pack, questions: pack.questions.map(q => ({ options: q.options.map(o => ({ label: o.label, id: o.id })), prompt: q.prompt, id: q.id })) } : { ...pack, words: pack.words.map(w => ({ label: w.label, id: w.id })) };
  assert.equal(m.acceptsPack(gameId, reordered), true);
  assert.ok(!JSON.stringify(pack).includes('"answer":')); assert.ok(!Object.hasOwn(pack, 'groups'));
  const invite = m.share(gameId, { score: 70 });
  assert.equal(new URL(invite.url).search, ''); assert.equal(new URL(invite.url).hash, '#challenge=70');
  assert.match(invite.text, /Think you can beat me/); assert.ok(!/w00|q01|Turnips|FEMUR/.test(JSON.stringify(invite)));
}
assert.deepEqual(plain(m.shuffle([1, 2, 3], () => 0)), [2, 3, 1]);
assert.throws(() => m.shuffle([1, 2], () => 1), /shuffle/);

const { JSDOM } = await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function ui(gameId, options = {}) {
  const dom = new JSDOM(`<section data-halloween-game="${gameId}"></section>`, { url: 'http://localhost/halloween/' + gameId + '/', runScripts: 'outside-only' });
  const w = dom.window, calls = { start: [], save: [], network: [], share: [], owner: options.owner || 'guest:first', day: options.day || '2026-10-19' };
  w.fetch = (...args) => { calls.network.push(args); throw Error('Unexpected network'); };
  w.BrainiData = { api: { submitGameResult() { throw Error('Daily must not be called'); } } };
  const preview = options.preview !== false;
  w.BrainiLabHalloween = {
    identityKey: () => calls.owner,
    availability: () => ({ allowed: options.allowed !== false, preview, day: calls.day, message: 'Halloween opens on 19 October.' }),
    startGame: async id => { calls.start.push(id); if (options.startFail) throw Error('Try again.'); return { session_id: 'test-session-id-' + calls.start.length, game: id, day: calls.day, pack: plain(m.publicPack(id)), guest: true, preview, ownerKey: calls.owner, completed: !!options.completed, result: options.completed ? { score: 40 } : null }; },
    completeGame: async payload => { calls.save.push(plain(payload)); if (options.saveFail && calls.save.length === 1) throw Error('Offline'); if (options.terminalError && calls.save.length === 1) { const error = Error('The event day changed.'); error.code = options.terminalError; throw error; } return options.replayed ? { saved: true, replayed: true, result: { score: 40 }, verifiedSummary: { score: 40 } } : { saved: !preview, previewSaved: preview, verifiedSummary: plain(m.summary(gameId, payload.submission)) }; }
  };
  Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async text => calls.share.push(text) } });
  const key = 'brainilab_halloween_game_v1:' + (preview ? 'preview:' : 'live:') + encodeURIComponent(calls.owner) + ':' + gameId;
  if (options.stored) w.localStorage.setItem(options.storageKey || key, options.stored);
  if (options.storageBlocked) { w.Storage.prototype.getItem = () => { throw Error('blocked'); }; w.Storage.prototype.setItem = () => { throw Error('blocked'); }; }
  w.eval(modelSource); w.eval(uiSource); await tick();
  const root = w.document.querySelector('[data-halloween-game]');
  return { dom, w, root, calls, key };
}
async function start(u) { u.root.querySelector('[data-hg-start]').click(); await tick(); }
async function playQuiz(u, correct = true) {
  for (const q of quiz.questions) {
    const answer = correct ? q.answer : q.options.find(o => o.id !== q.answer).id;
    const button = u.root.querySelector(`[data-hg-answer="${answer}"]`); assert.ok(button);
    const order = [...u.root.querySelectorAll('[data-hg-answer]')].map(b => b.dataset.hgAnswer);
    button.click();
    assert.deepEqual([...u.root.querySelectorAll('[data-hg-answer]')].map(b => b.dataset.hgAnswer), order);
    assert.equal(u.root.querySelectorAll('[data-hg-answer]:not(:disabled)').length, 0);
    assert.equal(u.w.document.activeElement, u.root.querySelector('[data-hg-feedback]'));
    u.root.querySelector('[data-hg-next]').click(); await tick();
  }
}
async function choose(u, ids) { for (const id of ids) u.root.querySelector(`[data-hg-word="${id}"]`).click(); u.root.querySelector('[data-hg-check]').click(); await tick(); }
const closed = await ui(quiz.id, { allowed: false });
assert.equal(closed.root.querySelector('[data-hg-start]'), null); assert.equal(closed.calls.start.length, 0); closed.dom.window.close();
const failStart = await ui(quiz.id, { startFail: true }); await start(failStart);
assert.equal(failStart.root.querySelector('[data-hg-start]').disabled, false); assert.equal(failStart.root.querySelector('[data-hg-answer]'), null); failStart.dom.window.close();
const correctUI = await ui(quiz.id); await start(correctUI); await playQuiz(correctUI);
assert.equal(correctUI.calls.save.length, 1); assert.equal(correctUI.calls.save[0].localSummary.score, 100);
assert.match(correctUI.root.querySelector('[data-hg-status]').textContent, /live collection is unchanged/);
correctUI.root.querySelector('[data-hg-share]').click(); await tick(); assert.equal(correctUI.calls.share.length, 0);
assert.equal(correctUI.calls.network.length, 0);
const savedStorage = correctUI.w.localStorage.getItem(correctUI.key);
correctUI.dom.window.close();
const restoredResult = await ui(quiz.id, { stored: savedStorage });
assert.match(restoredResult.root.textContent, /100/); assert.equal(restoredResult.calls.save.length, 0); restoredResult.dom.window.close();
const nextDayResult = await ui(quiz.id, { stored: savedStorage, day: '2026-10-20' });
assert.ok(nextDayResult.root.querySelector('[data-hg-start]')); assert.equal(nextDayResult.root.querySelector('[data-hg-replay]'), null); assert.match(nextDayResult.root.querySelector('[data-hg-start]').textContent, /Let’s play/);
assert.equal(nextDayResult.calls.start.length, 0); assert.equal(nextDayResult.calls.save.length, 0); assert.equal(nextDayResult.w.localStorage.getItem(nextDayResult.key), savedStorage);
await start(nextDayResult); assert.equal(nextDayResult.calls.start.length, 1); assert.match(nextDayResult.root.textContent, /Question 1 of 10/); assert.equal(JSON.parse(nextDayResult.w.localStorage.getItem(nextDayResult.key)).session.day, '2026-10-20'); nextDayResult.dom.window.close();
const wrongUI = await ui(quiz.id, { preview: false, saveFail: true }); await start(wrongUI); await playQuiz(wrongUI, false);
assert.equal(wrongUI.calls.save.length, 1); assert.equal(wrongUI.calls.save[0].localSummary.score, 0);
assert.equal(wrongUI.root.querySelector('[data-hg-save]').hidden, false);
wrongUI.root.querySelector('[data-hg-save]').click(); wrongUI.root.querySelector('[data-hg-save]').click(); await tick();
assert.equal(wrongUI.calls.save.length, 2); assert.deepEqual(wrongUI.calls.save[1], wrongUI.calls.save[0]);
wrongUI.root.querySelector('[data-hg-share]').click(); await tick(); assert.equal(wrongUI.calls.share.length, 0,'Opening the invitation never sends or copies it');
wrongUI.root.querySelector('[data-hg-invite-copy]').click(); await tick(); assert.equal(wrongUI.calls.share.length, 1);
assert.ok(!/q01|w00|Turnips/.test(wrongUI.calls.share[0]));
wrongUI.root.querySelector('[data-hg-replay]').click(); await start(wrongUI); assert.equal(wrongUI.calls.start.length, 2); assert.equal(wrongUI.calls.save.length, 2); wrongUI.dom.window.close();
const interrupted = await ui(quiz.id); await start(interrupted); interrupted.root.querySelector('[data-hg-answer="b"]').click();
const interruptedStorage = interrupted.w.localStorage.getItem(interrupted.key); interrupted.dom.window.close();
const resume = await ui(quiz.id, { stored: interruptedStorage }); await start(resume);
assert.equal(resume.calls.start.length, 0); assert.equal(resume.root.querySelectorAll('[data-hg-answer]:not(:disabled)').length, 0);
resume.root.querySelector('[data-hg-next]').click(); assert.match(resume.root.textContent, /Question 2 of 10/); resume.dom.window.close();
const pendingNextDay = await ui(quiz.id, { stored: interruptedStorage, day: '2026-10-20' }); assert.match(pendingNextDay.root.querySelector('[data-hg-start]').textContent, /Continue game/); assert.equal(pendingNextDay.w.localStorage.getItem(pendingNextDay.key), interruptedStorage); await start(pendingNextDay); assert.equal(pendingNextDay.calls.start.length, 0); assert.equal(pendingNextDay.root.querySelectorAll('[data-hg-answer]:not(:disabled)').length, 0); pendingNextDay.dom.window.close();
const privateNotImported = await ui(quiz.id, { preview: false, stored: savedStorage }); assert.ok(privateNotImported.root.querySelector('[data-hg-start]')); privateNotImported.dom.window.close();
const otherAccount = await ui(quiz.id, { owner: 'user:second', stored: interruptedStorage, storageKey: 'brainilab_halloween_game_v1:preview:guest%3Afirst:' + quiz.id });
await start(otherAccount); assert.equal(otherAccount.calls.start.length, 1); assert.match(otherAccount.root.textContent, /Question 1 of 10/); otherAccount.dom.window.close();
const injectedOtherOwner = await ui(quiz.id, { owner: 'user:second', stored: interruptedStorage }); await start(injectedOtherOwner); assert.equal(injectedOtherOwner.calls.start.length, 1); assert.match(injectedOtherOwner.root.textContent, /Question 1 of 10/); injectedOtherOwner.dom.window.close();
const switched = await ui(quiz.id); await start(switched); switched.calls.owner = 'user:new'; switched.root.querySelector('[data-hg-answer]').click();
assert.match(switched.root.textContent, /account has changed/); assert.equal(switched.calls.save.length, 0); switched.dom.window.close();
const authEvent = await ui(words.id); await start(authEvent); authEvent.calls.owner = 'user:new'; authEvent.w.dispatchEvent(new authEvent.w.Event('brainilab:backend-auth')); assert.match(authEvent.root.textContent, /account has changed/); authEvent.dom.window.close();
const connectionUI = await ui(words.id); await start(connectionUI);
assert.equal(connectionUI.root.querySelector('[data-hg-check]').disabled, true);
await choose(connectionUI, wrongSets[0]); await choose(connectionUI, wrongSets[0].slice().reverse());
assert.match(connectionUI.root.textContent, /already tried/); assert.match(connectionUI.root.textContent, /3 mistakes left/);
connectionUI.root.querySelector('[data-hg-word="w00"]').click(); connectionUI.root.querySelector('[data-hg-shuffle]').click();
assert.equal(connectionUI.root.querySelector('[data-hg-word="w00"]').getAttribute('aria-pressed'), 'true'); connectionUI.root.querySelector('[data-hg-clear]').click();
for (const set of correctSets) await choose(connectionUI, set);
assert.equal(connectionUI.calls.save.length, 1); assert.equal(connectionUI.calls.save[0].localSummary.score, 90);
assert.equal(connectionUI.calls.save[0].submission.attempts.length, 5); assert.equal(connectionUI.calls.network.length, 0); connectionUI.dom.window.close();
const wrongConnectionUI = await ui(words.id); await start(wrongConnectionUI); for (const set of wrongSets) await choose(wrongConnectionUI, set);
assert.equal(wrongConnectionUI.calls.save[0].localSummary.score, 0); assert.equal(wrongConnectionUI.root.querySelectorAll('[data-hg-word]').length, 0); assert.equal(wrongConnectionUI.root.querySelectorAll('.halloween-result-answers .halloween-solved-group').length, 4); wrongConnectionUI.dom.window.close();
const blockedStorage = await ui(quiz.id, { storageBlocked: true }); await start(blockedStorage); await playQuiz(blockedStorage); assert.equal(blockedStorage.calls.save.length, 1); blockedStorage.dom.window.close();
const practice = await ui(quiz.id, { preview: false, completed: true }); await start(practice); await playQuiz(practice); assert.equal(practice.calls.save.length, 0); assert.match(practice.root.textContent, /saved result stays at 40/); assert.match(practice.root.textContent, /practice complete/); assert.equal(practice.root.querySelector('.halloween-game-score strong').textContent, '100'); practice.dom.window.close();
const race = await ui(quiz.id, { preview: false, replayed: true }); await start(race); await playQuiz(race); assert.equal(race.calls.save.length, 1); assert.match(race.root.textContent, /saved result stays at 40/); assert.equal(race.root.querySelector('[data-hg-save]').hidden, true); race.dom.window.close();
const midnight = await ui(quiz.id, { preview: false, terminalError: 'HALLOWEEN_DAY_CHANGED' });
midnight.w.localStorage.setItem('brainilab_halloween_game_v1:live:other-owner:trick-or-think', 'do-not-touch');
await start(midnight); await playQuiz(midnight);
assert.equal(midnight.calls.save.length, 1); assert.equal(midnight.calls.start.length, 1);
assert.match(midnight.root.querySelector('[data-hg-status]').textContent, /new Halloween day/); assert.match(midnight.root.textContent, /not added to your collection/);
assert.equal(midnight.root.querySelector('[data-hg-save]').hidden, true); assert.equal(midnight.root.querySelector('[data-hg-replay]').disabled, true);
const midnightStored = midnight.w.localStorage.getItem(midnight.key); assert.equal(JSON.parse(midnightStored).submission.answers.length, 10);
assert.equal(JSON.parse(midnightStored).terminalFailure, 'HALLOWEEN_DAY_CHANGED');
midnight.root.querySelector('[data-hg-fresh]').click(); await tick();
assert.equal(midnight.calls.start.length, 2); assert.equal(midnight.calls.save.length, 1); assert.match(midnight.root.textContent, /Question 1 of 10/);
assert.equal(JSON.parse(midnight.w.localStorage.getItem(midnight.key)).submission.answers.length, 0);
assert.equal(midnight.w.localStorage.getItem('brainilab_halloween_game_v1:live:other-owner:trick-or-think'), 'do-not-touch'); midnight.dom.window.close();
const midnightReload = await ui(quiz.id, { preview: false, stored: midnightStored }); assert.ok(midnightReload.root.querySelector('[data-hg-fresh]')); assert.equal(midnightReload.calls.save.length, 0); assert.equal(midnightReload.calls.start.length, 0); midnightReload.dom.window.close();
const ended = await ui(quiz.id, { preview: false, terminalError: 'HALLOWEEN_CLOSED' }); await start(ended); await playQuiz(ended);
assert.match(ended.root.querySelector('[data-hg-status]').textContent, /special has finished/); assert.match(ended.root.textContent, /not added to your collection/);
assert.equal(ended.root.querySelector('[data-hg-fresh]'), null); assert.equal(ended.root.querySelector('[data-hg-save]').hidden, true); assert.equal(ended.root.querySelector('[data-hg-share]').hidden, true);
assert.ok(ended.root.querySelector('a[href="/halloween/"]')); ended.root.querySelector('[data-hg-save]').click(); await tick(); assert.equal(ended.calls.save.length, 1); assert.equal(ended.calls.start.length, 1); ended.dom.window.close();
console.log('Halloween game model and UI: scoring, terminal states, answer locking, stable IDs, retry, reload, spoiler-free sharing, accessibility focus, storage failure and zero direct network calls passed.');
