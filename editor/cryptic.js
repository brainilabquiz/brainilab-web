import {CRYPTIC_KEY, HINT_TYPES, emptyState, restoreState, shareCryptic} from './cryptic-state.js';

export async function mountCryptic(document, options = {}) {
  const root = document.querySelector('[data-cryptic]');
  if (!root) return;
  const win = document.defaultView;
  const request = options.fetch || win.fetch.bind(win);
  const $ = selector => root.querySelector(selector);
  const status = $('[data-status]'), form = $('form'), tiles = $('[data-letters]');
  let daily, state, solution, activeHint, busy = false, timer, expiresIn = 0, loadedAt = 0;
  let storageWarning = false, disposed = false, loading = false;
  const announce = text => { status.textContent = text; };
  function save() {
    try { (options.storage || win.localStorage).setItem(CRYPTIC_KEY, JSON.stringify(state)); }
    catch { storageWarning = true; }
    $('[data-save-note]').textContent = storageWarning ? 'Browser storage is unavailable. Keep this tab open to keep your progress.' : 'Progress saved in this browser.';
  }
  async function api(body) {
    const controller = new win.AbortController();
    const timeout = win.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await request('/api/cryptic', {signal: controller.signal,
        ...(body ? {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({date: daily.date, id: daily.id, ...body})} : {})});
      const data = await response.json();
      if (!response.ok) { const error = Error(data.error || 'The clue could not load. Try again.'); error.code = data.code; error.publicMessage = true; throw error; }
      if (body && (data.id !== daily.id || data.date !== daily.date)) throw Error('The daily clue changed. Refresh to continue.');
      return data;
    } finally { win.clearTimeout(timeout); }
  }
  function paintClue() {
    const clue = $('[data-clue]'); clue.replaceChildren();
    const hints = solution ? Object.entries(solution.parts).map(([type, part]) => ({...part, type})) : Object.values(state.hints);
    let cursor = 0;
    for (const hint of hints.sort((a, b) => a.start - b.start)) {
      clue.append(document.createTextNode(daily.clue.slice(cursor, hint.start)));
      const mark = document.createElement('mark'); mark.className = 'cryptic-' + hint.type;
      mark.textContent = daily.clue.slice(hint.start, hint.end); mark.title = hint.type;
      mark.setAttribute('aria-label', hint.type + ': ' + mark.textContent);
      clue.append(mark); cursor = hint.end;
    }
    clue.append(document.createTextNode(daily.clue.slice(cursor) + ` (${daily.length})`));
  }
  const fields = () => [...tiles.querySelectorAll('input')];
  function nextField(index) { return fields().find((input, i) => i >= index && !input.readOnly && !input.disabled) || null; }
  function setLetters() {
    for (const [i, input] of fields().entries()) {
      input.value = solution ? solution.answer[i] : state.letters[i] || state.draft[i].replace('_', '');
      input.readOnly = !!state.letters[i] || !!solution;
      input.tabIndex = input.readOnly ? -1 : 0;
      input.classList.toggle('is-revealed', !!state.letters[i]);
      input.setAttribute('aria-label', `Letter ${i + 1} of ${daily.length}${state.letters[i] ? ': ' + state.letters[i] + ', revealed' : ''}`);
    }
  }
  function update() {
    paintClue(); setLetters();
    $('.cryptic-hints').hidden = !!solution;
    for (const button of root.querySelectorAll('button[data-hint]')) {
      button.disabled = busy || !!solution;
      button.setAttribute('aria-pressed', String(!!state.hints[button.dataset.hint]));
    }
    $('[data-letter]').disabled = busy || !!solution || Object.keys(state.letters).length === daily.length;
    $('[data-check]').disabled = busy || !!solution;
    $('[data-reveal]').disabled = busy || !!solution;
    for (const input of fields()) input.disabled = busy || !!solution;
    form.hidden = !!solution;
    const hint = activeHint && state.hints[activeHint];
    $('[data-hint-note]').hidden = !hint || !!solution;
    if (hint) { $('[data-hint-name]').textContent = activeHint === 'fodder' ? 'Fodder · your starting letters' : activeHint; $('[data-hint-text]').textContent = `“${hint.text}” — ${hint.explanation}`; }
    $('[data-result]').hidden = !solution;
    $('[data-give-up]').hidden = !!solution;
    if (solution) {
      $('[data-result-title]').textContent = state.mode === 'solved' ? 'You cracked it.' : 'Here’s how it works.';
      $('[data-answer]').textContent = solution.answer;
      $('[data-explanation]').textContent = solution.explanation;
      const used = HINT_TYPES.filter(type => state.hints[type]).length + Object.keys(state.letters).length;
      $('[data-result-note]').textContent = state.mode === 'revealed' ? 'Answer revealed. A fresh clue arrives at 00:00 UTC.' : used ? 'Solved with a little help. A fresh clue arrives at 00:00 UTC.' : 'Solved without hints. A fresh clue arrives at 00:00 UTC.';
      $('[data-parse]').replaceChildren(...HINT_TYPES.map(type => {
        const item = document.createElement('li'); item.className = 'cryptic-' + type;
        const label = document.createElement('strong'); label.textContent = type === 'fodder' ? 'Fodder' : type[0].toUpperCase() + type.slice(1);
        item.append(label, document.createTextNode(': ' + solution.parts[type].text)); return item;
      }));
    }
  }
  function buildFields() {
    tiles.replaceChildren(); tiles.style.setProperty('--letters', daily.length);
    for (let i = 0; i < daily.length; i++) {
      const input = document.createElement('input'); input.type = 'text'; input.maxLength = 1;
      input.autocomplete = 'off'; input.setAttribute('autocapitalize', 'characters'); input.spellcheck = false;
      input.setAttribute('autocorrect', 'off'); input.setAttribute('enterkeyhint', 'done'); input.dataset.index = i;
      input.addEventListener('input', () => {
        const value = input.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
        const chars = state.draft.split(''); chars[i] = value || '_'; state.draft = chars.join('');
        input.value = value; save(); if (value) nextField(i + 1)?.focus();
      });
      input.addEventListener('keydown', event => {
        if (event.key === 'Backspace' && !input.value || event.key === 'ArrowLeft') {
          const previous = fields().slice(0, i).reverse().find(item => !item.readOnly && !item.disabled);
          if (previous) { event.preventDefault(); previous.focus(); previous.select(); }
        } else if (event.key === 'ArrowRight') { event.preventDefault(); nextField(i + 1)?.focus(); }
      });
      input.addEventListener('focus', () => input.select()); tiles.append(input);
    }
  }
  tiles.addEventListener('paste', event => {
    if (busy || solution) return;
    const value = event.clipboardData?.getData('text').replace(/[^a-z]/gi, '').toUpperCase(); if (!value) return;
    event.preventDefault(); const start = value.length === daily.length ? 0 : Number(event.target.dataset.index || 0);
    const chars = state.draft.split('');
    for (let i = start; i < daily.length && i - start < value.length; i++) if (!state.letters[i]) chars[i] = value[i - start];
    state.draft = chars.join(''); setLetters(); save(); nextField(Math.min(start + value.length, daily.length - 1))?.focus();
  });
  async function act(action) {
    if (busy || solution || !daily) return;
    busy = true; update();
    try { await action(); save(); }
    catch (error) {
      if (error.code === 'new-day') { await load(true); return; }
      announce(error.name === 'AbortError' ? 'That took too long. Your progress is still here. Try again.' : error.publicMessage ? error.message : 'Couldn’t connect. Your progress is still here. Try again.');
    } finally {
      busy = false; if (daily) update();
      if (!loading && expiresIn > 0 && win.performance.now() - loadedAt >= expiresIn) {
        win.clearTimeout(timer); timer = win.setTimeout(refreshWhenIdle, 250);
      }
    }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    act(async () => {
      const answer = fields().map(input => input.value).join('');
      if (answer.length !== daily.length) { announce(`Fill all ${daily.length} letters first.`); win.setTimeout(() => fields().find(input => !input.value)?.focus(), 0); return; }
      const response = await api({action: 'check', answer}); state.attempts++;
      if (!response.correct) { announce('Not quite. Try another word, or use a hint.'); return; }
      solution = response.solution; state.mode = Object.keys(state.letters).length === daily.length ? 'revealed' : 'solved'; state.answer = solution.answer;
      announce(state.mode === 'solved' ? 'Correct! The explanation is below.' : 'All letters revealed. The explanation is below.');
      update(); $('[data-result-title]').focus();
    });
  });
  for (const button of root.querySelectorAll('[data-hint]')) button.addEventListener('click', () => act(async () => {
    const type = button.dataset.hint;
    state.hints[type] ||= (await api({action: 'hint', type})).hint; activeHint = type;
    announce(`${type === 'fodder' ? 'Fodder' : type[0].toUpperCase() + type.slice(1)}: ${state.hints[type].text}. ${state.hints[type].explanation}`);
  }));
  $('[data-letter]').addEventListener('click', () => act(async () => {
    const response = await api({action: 'letter', revealed: Object.keys(state.letters).map(Number)});
    if (response.letter) { const {index, value} = response.letter; state.letters[index] = value; announce(`Letter ${index + 1} is ${value}.`); }
  }));
  $('[data-reveal]').addEventListener('click', () => act(async () => {
    solution = (await api({action: 'reveal'})).solution; state.mode = 'revealed'; state.answer = solution.answer;
    announce('Answer revealed. The explanation is below.'); update(); $('[data-result-title]').focus();
  }));
  $('[data-share]').addEventListener('click', async () => {
    const text = shareCryptic(daily, state);
    try {
      if (win.navigator.share) await win.navigator.share({title: 'BrainiLab Cryptic', text});
      else if (win.navigator.clipboard?.writeText) { await win.navigator.clipboard.writeText(text); announce('Copied! Send your challenge to a friend.'); }
      else throw Error('manual');
    } catch (error) { if (error.name === 'AbortError') return; $('[data-share-text]').hidden = false; $('[data-share-text]').value = text; $('[data-share-text]').focus(); $('[data-share-text]').select(); announce('Copy this message to share your result.'); }
  });
  async function load(changed = false) {
    if (loading || disposed) return;
    loading = true;
    let schedule = false;
    busy = true; root.setAttribute('aria-busy', 'true');
    $('[data-retry]').disabled = true;
    try {
      const incoming = await api();
      if (disposed) return;
      if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(incoming.date) || typeof incoming.clue !== 'string' || !Number.isInteger(incoming.length) || incoming.length < 3 || incoming.length > 12) throw Error('The clue could not load. Try again.');
      const previous = daily; daily = incoming;
      expiresIn = Date.parse(daily.expiresAt) - Date.parse(daily.serverTime); loadedAt = win.performance.now();
      schedule = true;
      if (previous?.id === daily.id && !changed) { busy = false; update(); return; }
      let raw = null; try { raw = (options.storage || win.localStorage).getItem(CRYPTIC_KEY); } catch { storageWarning = true; }
      state = restoreState(raw, daily); solution = null; activeHint = Object.keys(state.hints).at(-1);
      if (state.mode !== 'playing') {
        const verified = await api({action: 'check', answer: state.answer});
        if (verified.correct) solution = verified.solution; else state = emptyState(daily);
      }
      $('[data-date]').textContent = `#${daily.number} · ${new Date(daily.date + 'T12:00:00Z').toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'})}`;
      $('[data-count]').textContent = `Your answer · ${daily.length} letters`;
      buildFields(); $('[data-loading]').hidden = true; $('[data-board]').hidden = false; $('[data-retry]').hidden = true;
      if (changed || previous) announce('A new daily clue is ready. Everyone has this same word today.');
      else announce(solution ? 'Your finished clue is back.' : 'Today’s clue is ready.');
      save();
    } catch (error) { schedule = false; announce(error.message === 'The clue could not load. Try again.' ? error.message : 'Today’s clue could not load. Your saved progress is safe. Try again.'); $('[data-retry]').hidden = false; }
    finally {
      busy = false; loading = false; $('[data-retry]').disabled = false;
      root.setAttribute('aria-busy', 'false'); if (daily && state) update();
      win.clearTimeout(timer);
      if (schedule && !disposed && daily && Number.isFinite(expiresIn) && expiresIn > 0) timer = win.setTimeout(refreshWhenIdle, Math.max(1000, expiresIn - (win.performance.now() - loadedAt) + 250));
    }
  }
  function refreshWhenIdle() {
    if (disposed) return;
    if (busy) { timer = win.setTimeout(refreshWhenIdle, 500); return; }
    load(true);
  }
  $('[data-retry]').addEventListener('click', () => load(true));
  const onVisible = () => { if (document.visibilityState === 'visible' && !busy && win.performance.now() - loadedAt >= expiresIn) load(true); };
  document.addEventListener('visibilitychange', onVisible);
  await load();
  return {getState: () => ({daily, state, solution}), destroy: () => { disposed = true; win.clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); }};
}

if (typeof document !== 'undefined') mountCryptic(document);
