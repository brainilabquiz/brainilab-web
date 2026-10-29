import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {CRYPTIC_SEASONS, CRYPTIC_START, crypticForTime} from '../lib/cryptic-bank.js';
import {crypticAPI} from '../lib/cryptic-api.js';
import {mountCryptic} from '../editor/cryptic.js';
import {CRYPTIC_KEY, restoreState, shareCryptic} from '../editor/cryptic-state.js';

const launch = Date.parse(CRYPTIC_START + 'T12:00:00Z');
const letters = text => text.replace(/[^a-z]/gi, '').toUpperCase();
const sorted = text => [...letters(text)].sort().join('');
const catalogue = CRYPTIC_SEASONS[0].puzzles;
assert.equal(catalogue.length, 28);
assert.equal(new Set(catalogue.map(p => p.answer)).size, catalogue.length);
for (const puzzle of catalogue) {
  assert.match(puzzle.answer, /^[A-Z]{3,12}$/);
  const parts = Object.values(puzzle.parts).sort((a, b) => a.start - b.start);
  for (const [i, part] of parts.entries()) {
    assert.equal(puzzle.clue.slice(part.start, part.end), part.text);
    if (i) assert.ok(parts[i - 1].end <= part.start, puzzle.answer + ': annotations cannot overlap');
  }
  assert.ok(puzzle.parts.definition.start === 0 || puzzle.parts.definition.end === puzzle.clue.length);
  if (puzzle.type === 'anagram') assert.equal(sorted(puzzle.parts.fodder.text), sorted(puzzle.answer));
  else if (puzzle.type === 'reversal') assert.equal([...letters(puzzle.parts.fodder.text)].reverse().join(''), puzzle.answer);
  else { assert.equal(puzzle.type, 'hidden'); assert.ok(letters(puzzle.parts.fodder.text).includes(puzzle.answer)); }
}

async function call(body, {raw, now = launch, method = body || raw ? 'POST' : 'GET', headers = {}, search = ''} = {}) {
  const request = new Request('https://brainilabgames.com/api/cryptic' + search, {method,
    headers: body || raw ? {'Content-Type': 'application/json', ...headers} : headers,
    ...(body || raw ? {body: raw || JSON.stringify(body)} : {})});
  return crypticAPI(request, {now, random: array => { array[0] = 0; return array; }});
}
const daily = await (await call()).json();
assert.deepEqual(Object.keys(daily).sort(), ['clue', 'date', 'expiresAt', 'id', 'length', 'number', 'serverTime'].sort());
assert.equal(daily.id, 'cryptic-v1-1');
assert.ok(!daily.id.includes(catalogue[0].answer.toLowerCase()), 'Public IDs must not encode answers');
assert.equal((await (await call(null, {now: Date.parse('2026-10-30T00:59:59+01:00')})).json()).id, daily.id);
const tomorrow = await (await call(null, {now: Date.parse('2026-10-30T00:00:00Z')})).json();
assert.notEqual(tomorrow.id, daily.id);
assert.equal(crypticForTime(launch + 28 * 86400000).puzzle.id, catalogue[0].id, 'The fixed season remains deterministic after its first cycle');
assert.equal((await call(null, {method: 'HEAD'})).status, 200);
assert.equal((await call(null, {method: 'DELETE'})).status, 405);
assert.equal((await call(null, {search: '?date=2099-01-01'})).status, 400);
assert.equal((await call(null, {now: launch - 86400000})).status, 503);
const envelope = {date: daily.date, id: daily.id};
const correct = await (await call({...envelope, action: 'check', answer: catalogue[0].answer.toLowerCase()})).json();
assert.ok(correct.correct); assert.equal(correct.solution.answer, catalogue[0].answer);
const wrong = await (await call({...envelope, action: 'check', answer: 'WRONG'})).json();
assert.equal(wrong.correct, false); assert.ok(!('solution' in wrong));
assert.equal((await call({...envelope, action: 'check', answer: 'x'.repeat(1000)})).status, 400);
assert.equal((await call({...envelope, action: 'check', answer: 'NOTES'}, {now: launch + 86400000})).status, 409);
assert.equal((await call({...envelope, action: 'reveal'}, {headers: {Origin: 'https://other.example'}})).status, 403);
assert.equal((await call({...envelope, action: 'reveal'}, {headers: {'Sec-Fetch-Site': 'cross-site'}})).status, 403);
assert.equal((await call({...envelope, action: 'reveal'}, {headers: {'Content-Type': 'text/plain'}})).status, 415);
assert.equal((await call(null, {raw: '{broken'})).status, 400);
assert.equal((await call(null, {raw: '{' + 'x'.repeat(2100)})).status, 400);
assert.equal((await call({...envelope, action: 'letter', revealed: [-1]})).status, 400);
assert.equal((await call({...envelope, action: 'letter', revealed: [1, 1]})).status, 400);
assert.equal((await call({...envelope, action: 'letter', revealed: [daily.length]})).status, 400);
assert.equal((await call({...envelope, action: 'reveal', arbitrary: true})).status, 400);
const positions = [];
for (let i = 0; i < daily.length; i++) {
  const {letter} = await (await call({...envelope, action: 'letter', revealed: positions})).json();
  assert.ok(!positions.includes(letter.index)); assert.equal(letter.value, catalogue[0].answer[letter.index]); positions.push(letter.index);
}
assert.equal((await (await call({...envelope, action: 'letter', revealed: positions})).json()).letter, null);
for (const type of ['definition', 'indicator', 'fodder']) {
  const {hint} = await (await call({...envelope, action: 'hint', type})).json();
  assert.equal(daily.clue.slice(hint.start, hint.end), hint.text); assert.equal(hint.type, type);
}
for (let i = 0; i < catalogue.length; i++) {
  const day = await (await call(null, {now: launch + i * 86400000})).json();
  const result = await call({id: day.id, date: day.date, action: 'check', answer: catalogue[i].answer}, {now: launch + i * 86400000});
  assert.equal((await result.json()).correct, true);
}
assert.match((await call()).headers.get('cache-control'), /no-store/);

const html = readFileSync('games/cryptic/index.html', 'utf8');
const turn = () => new Promise(resolve => setTimeout(resolve, 15));
async function fixture({saved = null, failFirst = false, blockedStorage = false} = {}) {
  const dom = new JSDOM(html, {url: 'https://brainilabgames.com/games/cryptic/', pretendToBeVisual: true});
  const w = dom.window; w.AbortController = globalThis.AbortController;
  if (saved) w.localStorage.setItem(CRYPTIC_KEY, saved);
  let now = launch, fail = failFirst;
  const mockFetch = async (path, init = {}) => {
    if (fail) { fail = false; throw Error('network'); }
    return crypticAPI(new Request(new URL(path, w.location.href), init), {now, random: array => { array[0] = 0; return array; }});
  };
  const game = await mountCryptic(w.document, {fetch: mockFetch, ...(blockedStorage ? {storage: {getItem() {throw Error('blocked');}, setItem() {throw Error('blocked');}}} : {})});
  const $ = selector => w.document.querySelector(selector);
  const input = answer => { [...w.document.querySelectorAll('[data-letters] input')].forEach((field, i) => { if (!field.readOnly) { field.value = answer[i] || ''; field.dispatchEvent(new w.Event('input', {bubbles: true})); } }); };
  const submit = async () => { $('form').dispatchEvent(new w.Event('submit', {bubbles: true, cancelable: true})); await turn(); };
  return {dom, w, $, game, input, submit, tick: value => now = value, breakNetwork: () => fail = true, close() {game.destroy(); w.close();}};
}
const f = await fixture();
assert.equal(f.$('[data-board]').hidden, false);
assert.equal(f.$('[data-letters] input').getAttribute('aria-label'), 'Letter 1 of 5');
await f.submit(); assert.match(f.$('[data-status]').textContent, /Fill all/);
assert.equal(f.w.document.activeElement, f.$('[data-letters] input'));
f.input('WRONG'); await f.submit(); assert.equal(f.game.getState().state.mode, 'playing'); assert.equal(f.$('[data-result]').hidden, true);
for (const type of ['fodder', 'definition', 'indicator']) { f.$(`[data-hint="${type}"]`).click(); await turn(); assert.equal(f.$(`[data-hint="${type}"]`).getAttribute('aria-pressed'), 'true'); }
assert.equal(f.w.document.querySelectorAll('[data-clue] mark').length, 3);
const requestsBefore = f.game.getState().state.attempts;
f.$('[data-letter]').click(); f.$('[data-letter]').click(); await turn();
assert.equal(Object.keys(f.game.getState().state.letters).length, 1, 'Double taps do not reveal two letters');
assert.equal(f.$('[data-letters] input').value, 'N');
assert.equal(f.$('[data-letters] input').readOnly, true);
const saved = f.w.localStorage.getItem(CRYPTIC_KEY);
const resumed = await fixture({saved}); assert.equal(resumed.$('[data-letters] input').value, 'N');
assert.equal(resumed.w.document.querySelectorAll('[data-clue] mark').length, 3);
resumed.input('NOTES'); await resumed.submit();
assert.equal(resumed.game.getState().state.mode, 'solved'); assert.equal(resumed.$('[data-answer]').textContent, 'NOTES');
assert.equal(resumed.w.document.activeElement, resumed.$('[data-result-title]'));
assert.match(shareCryptic(daily, resumed.game.getState().state), /3 clue hints and 1 letter/);
assert.ok(!shareCryptic(daily, resumed.game.getState().state).includes('NOTES'));
resumed.$('[data-share]').click(); await turn(); assert.equal(resumed.$('[data-share-text]').hidden, false);
const completed = await fixture({saved: resumed.w.localStorage.getItem(CRYPTIC_KEY)});
assert.equal(completed.game.getState().state.mode, 'solved'); assert.equal(completed.$('[data-result]').hidden, false);
assert.equal(f.game.getState().state.attempts, requestsBefore);
const revealed = await fixture(); revealed.$('[data-reveal]').click(); await turn();
assert.equal(revealed.game.getState().state.mode, 'revealed'); assert.match(shareCryptic(daily, revealed.game.getState().state), /explored/);
const failed = await fixture({failFirst: true}); assert.equal(failed.$('[data-retry]').hidden, false);
failed.$('[data-retry]').click(); await turn(); assert.equal(failed.$('[data-board]').hidden, false);
const blocked = await fixture({blockedStorage: true}); blocked.input('NOTES'); await blocked.submit();
assert.equal(blocked.game.getState().state.mode, 'solved'); assert.match(blocked.$('[data-save-note]').textContent, /unavailable/);
const allLetters = await fixture();
for (let i = 0; i < daily.length; i++) { allLetters.$('[data-letter]').click(); await turn(); }
await allLetters.submit(); assert.equal(allLetters.game.getState().state.mode, 'revealed', 'Revealing every letter must not claim a solve');
const lostConnection = await fixture(); lostConnection.input('NOTES'); lostConnection.breakNetwork(); await lostConnection.submit();
assert.equal(lostConnection.game.getState().state.mode, 'playing'); assert.match(lostConnection.$('[data-status]').textContent, /Couldn’t connect/);
assert.ok(lostConnection.w.localStorage.getItem(CRYPTIC_KEY).includes('NOTES'));
await lostConnection.submit(); assert.equal(lostConnection.game.getState().state.mode, 'solved');
const midnight = await fixture(); midnight.input('NOTES'); midnight.tick(launch + 86400000); await midnight.submit(); await turn();
assert.equal(midnight.game.getState().daily.date, '2026-10-30'); assert.equal(midnight.game.getState().state.mode, 'playing');
assert.equal(midnight.$('[data-letters]').children.length, 3);
assert.match(midnight.$('[data-status]').textContent, /new daily clue/);
assert.equal(restoreState('{bad', daily).mode, 'playing');
assert.equal(restoreState(JSON.stringify({id: daily.id, date: '2026-10-28', mode: 'solved', answer: 'NOTES'}), daily).mode, 'playing');
for (const item of [f, resumed, completed, revealed, failed, blocked, midnight, allLetters, lostConnection]) item.close();
console.log('PASS Cryptic: 28 parsed clues; UTC schedule; private solutions; bounded same-origin API; four hints; no repeat letters; attempts, reveal, reload, blocked storage, keyboard focus, sharing and midnight rollover.');
