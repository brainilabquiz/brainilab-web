/* Two self-contained Halloween games. Their results never enter Daily, XP or rankings. */
(function () {
  'use strict';
  const model = window.BrainiHalloweenGameModel;
  const pendingPrefix = 'brainilab_halloween_game_v1:';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const treats = [
    { id: 'pumpkin-thinker', kind: 'hat', name: 'Pumpkin thinker', label: 'Hat' },
    { id: 'midnight', kind: 'frame', name: 'Midnight frame', label: 'Frame' },
    { id: 'little-bat', kind: 'prop', name: 'Little bat', label: 'Companion' }
  ];
  const cleanTreats = ids => treats.filter(item => Array.isArray(ids) && ids.includes(item.id)).map(item => item.id);
  function treatArt(item) {
    try {
      const design = window.BrainiAvatarDesign;
      if (!design) return '';
      return item.kind === 'frame' ? design.markup({ mode: 'built', skin: 'sand', hair: 'curls', hairColor: 'brown', shirt: 'green', background: 'lilac' }, 0, []) : design.preview(item.kind, item.id);
    } catch { return ''; }
  }
  const storage = {
    get(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    remove(key) { try { localStorage.removeItem(key); } catch {} }
  };
  function mount(root) {
    if (!model || root.dataset.halloweenMounted) return;
    root.dataset.halloweenMounted = 'true';
    const gameId = root.dataset.halloweenGame;
    let pack;
    try { pack = model.game(gameId); } catch { root.textContent = 'This Halloween game could not be found.'; return; }
    const api = window.BrainiLabHalloween;
    let access;
    try { access = api?.availability?.(); } catch { access = null; }
    if (!access?.allowed) {
      root.innerHTML = `<div class="halloween-game-card"><h2>Something spooky is on its way</h2><p>${esc(access?.message || 'This special is not open yet.')}</p><a href="/games/">Explore the games</a></div>`;
      return;
    }
    function identity() { try { const value = api?.identityKey?.(); return typeof value === 'string' && value.length > 0 && value.length <= 200 ? value : null; } catch { return null; } }
    const ownerKey = identity();
    if (!ownerKey) { root.innerHTML = '<div class="halloween-game-card"><h2>Getting your game ready</h2><p>Please refresh this page to continue.</p></div>'; return; }
    const key = pendingPrefix + (access.preview ? 'preview:' : 'live:') + encodeURIComponent(ownerKey) + ':' + gameId;
    let state = gameId === 'trick-or-think' ? model.initialQuiz() : model.initialConnections();
    let session = null, screen = 'intro', chosen = [], wordOrder = model.shuffle(pack.words || []), optionOrders = new Map();
    let answered = false, saving = false, saved = false, disposed = false, storageAvailable = true, lastMessage = '', terminalFailure = null;
    let rewardIds = [], freshRewards = false;
    const previous = storage.get(key);
    function ensureOwner() {
      if (disposed) return false;
      if (identity() === ownerKey) return true;
      disposed = true; session = null;
      root.innerHTML = '<div class="halloween-game-card"><h2>Your account has changed</h2><p>Refresh this page before continuing your Halloween game.</p></div>';
      return false;
    }
    function submission() { return gameId === 'trick-or-think' ? { answers: state.answers } : { attempts: state.attempts }; }
    function persist() {
      storageAvailable = storage.set(key, { version: pack.version, preview: !!access.preview, session, submission: submission(), screen, answered, saved, terminalFailure, rewardIds });
    }
    function focus(selector, preventScroll = false) { const node = root.querySelector(selector); if (node) { try { node.focus({ preventScroll }); } catch { node.focus(); } } }
    function shell(body) {
      root.innerHTML = `<div class="halloween-game-card">${access.preview ? '<p class="halloween-preview-note" role="note">Private preview · progress here is only for testing.</p>' : ''}${session?.practice ? `<p class="halloween-practice-note" role="note">Practice round · your saved result stays at ${session.savedResultScore}/100.</p>` : ''}${body}</div>`;
    }
    function status(message, error = false) {
      const node = root.querySelector('[data-hg-status]');
      if (node) { node.textContent = message; node.classList.toggle('is-error', error); }
    }
    function intro(message = '') {
      screen = 'intro';
      const rules = gameId === 'trick-or-think'
        ? 'Ten questions, one answer each. See the explanation after every choice. No timer.'
        : 'Find four groups of four words. Each mistake lowers your score; four mistakes end the puzzle. No timer.';
      shell(`<div class="halloween-game-intro"><p class="halloween-eyebrow">Halloween special</p><h2 tabindex="-1" data-hg-heading>${esc(pack.title)}</h2><p>${esc(pack.description)}</p><p class="halloween-game-rules">${rules}</p><button type="button" class="btn btn-primary halloween-button" data-hg-start>${session ? 'Continue game' : 'Let’s play'}</button><p class="halloween-game-status" data-hg-status role="status">${esc(message)}</p><a class="halloween-quiet-link" href="/halloween/">Back to Halloween</a></div>`);
      root.querySelector('[data-hg-start]').addEventListener('click', begin);
    }
    function restore() {
      if (!previous || previous.version !== pack.version || previous.preview !== !!access.preview || !previous.session) return;
      try {
        const restored = gameId === 'trick-or-think' ? model.quizFromSubmission(previous.submission) : model.connectionsFromSubmission(previous.submission);
        if (typeof previous.session !== 'object' || previous.session.preview !== !!access.preview || previous.session.ownerKey !== ownerKey || previous.session.game !== gameId || !model.acceptsPack(gameId, previous.session.pack)) return;
        // A finished result belongs to its earning day. Keep the record untouched,
        // but let today's first visit start a fresh round rather than yesterday's result.
        if (previous.saved && typeof access.day === 'string' && previous.session.day !== access.day) return;
        state = restored; session = previous.session; screen = previous.screen === 'result' || state.completed ? 'result' : 'play';
        answered = gameId === 'trick-or-think' && !!previous.answered; saved = !!previous.saved;
        rewardIds = cleanTreats(previous.rewardIds);
        terminalFailure = ['HALLOWEEN_DAY_CHANGED', 'HALLOWEEN_CLOSED'].includes(previous.terminalFailure) ? previous.terminalFailure : null;
      } catch { storage.remove(key); }
    }
    async function begin() {
      const button = root.querySelector('[data-hg-start]');
      if (!button || button.disabled || !ensureOwner()) return;
      button.disabled = true; status('Getting your game ready…');
      try {
        // The coordinator alone owns authenticated, guest and private-preview persistence.
        // No fetch, Supabase, Daily or XP API is called by this controller.
        if (!session) {
          const started = await api.startGame(gameId);
          if (!ensureOwner()) return;
          if (!started || started.game !== gameId || started.ownerKey !== ownerKey || !!started.preview !== !!access.preview || !model.acceptsPack(gameId, started.pack)) throw new Error('The game has changed. Refresh the page to try again.');
          const practice = started.completed === true;
          if (practice && (!Number.isInteger(started.result?.score) || started.result.score < 0 || started.result.score > 100)) throw new Error('Your saved game could not be checked. Please refresh the page.');
          session = { ...started, session_id: started.session_id || null, game: gameId, guest: !!started.guest, preview: !!started.preview, ownerKey, pack: started.pack, practice, savedResultScore: practice ? started.result.score : null };
        }
        if (disposed) return;
        screen = state.completed ? 'result' : 'play'; persist(); render();
      } catch (error) {
        if (disposed) return;
        if (error?.code === 'HALLOWEEN_CLOSED') {
          shell('<h2 data-hg-heading tabindex="-1">The Halloween special has finished</h2><p>You can still enjoy the rest of BrainiLab.</p><a class="btn btn-primary halloween-button" href="/halloween/">Back to Halloween</a>'); focus('[data-hg-heading]'); return;
        }
        button.disabled = false; status(error?.message || 'The game could not start. Please try again.', true);
      }
    }
    function quiz() {
      const index = state.answers.length - Number(answered);
      const question = pack.questions[index];
      if (!question) { finish(); return; }
      const selectedAnswer = answered ? state.answers[index].answer : null;
      if (!optionOrders.has(question.id)) optionOrders.set(question.id, model.shuffle(question.options));
      const options = optionOrders.get(question.id);
      shell(`<div class="halloween-game-toolbar"><span>Question ${index + 1} of 10</span><span>${state.score}/100</span></div><progress class="halloween-game-progress" max="10" value="${state.answers.length}" aria-label="Questions answered">${state.answers.length} of 10</progress><h2 class="halloween-question" data-hg-heading tabindex="-1">${esc(question.prompt)}</h2><div class="halloween-answer-grid" role="group" aria-label="Choose one answer">${options.map(option => `<button type="button" data-hg-answer="${option.id}" class="halloween-answer${answered && option.id === question.answer ? ' is-correct' : ''}${answered && option.id === selectedAnswer && option.id !== question.answer ? ' is-wrong' : ''}"${answered ? ' disabled' : ''}>${esc(option.label)}${answered && option.id === question.answer ? '<span class="halloween-answer-mark">✓ Correct answer</span>' : answered && option.id === selectedAnswer ? '<span class="halloween-answer-mark">Your choice</span>' : ''}</button>`).join('')}</div><div class="halloween-game-feedback" data-hg-feedback tabindex="-1" role="status" aria-live="polite">${answered ? `<strong>${selectedAnswer === question.answer ? 'That’s right!' : 'A little surprise.'}</strong><p>${esc(question.explanation)}</p><a href="${esc(question.source.url)}" target="_blank" rel="noopener noreferrer">${esc(question.source.title)} ↗</a>` : ''}</div><button type="button" class="btn btn-primary halloween-button" data-hg-next${answered ? '' : ' hidden'}>${index === 9 ? 'See my result' : 'Next question'} <span aria-hidden="true">→</span></button>`);
      root.querySelectorAll('[data-hg-answer]').forEach(button => button.addEventListener('click', () => {
        if (answered || state.completed || !ensureOwner()) return;
        state = model.answerQuiz(state, question.id, button.dataset.hgAnswer); answered = true; persist(); quiz(); focus('[data-hg-feedback]');
      }));
      root.querySelector('[data-hg-next]').addEventListener('click', () => {
        if (!answered || !ensureOwner()) return;
        answered = false; persist();
        state.completed ? finish() : (quiz(), focus('[data-hg-heading]'));
      });
    }
    function connections(message = '') {
      const solved = pack.groups.filter(group => state.solved.includes(group.id));
      const used = new Set(solved.flatMap(group => group.wordIds));
      wordOrder = wordOrder.filter(word => !used.has(word.id));
      shell(`<div class="halloween-game-toolbar"><span>${state.solved.length} of 4 groups</span><span>${4 - state.mistakes} ${4 - state.mistakes === 1 ? 'mistake' : 'mistakes'} left</span></div><h2 class="halloween-question" data-hg-heading tabindex="-1">What goes together?</h2><p class="halloween-game-hint">Choose four words that share a connection.</p><div class="halloween-solved-groups">${solved.map(group => `<div class="halloween-solved-group" data-hg-group="${group.id}"><strong>${esc(group.label)}</strong><span>${esc(group.wordIds.map(id => pack.words.find(word => word.id === id).label).join(' · '))}</span></div>`).join('')}</div><div class="halloween-word-grid" role="group" aria-label="Choose four words">${wordOrder.map(word => `<button type="button" class="halloween-word${chosen.includes(word.id) ? ' is-selected' : ''}" data-hg-word="${word.id}" aria-pressed="${chosen.includes(word.id)}">${esc(word.label)}</button>`).join('')}</div><div class="halloween-game-controls"><button type="button" class="btn btn-primary halloween-button" data-hg-check${chosen.length === 4 ? '' : ' disabled'}>Check group <span aria-hidden="true">→</span></button><button type="button" class="halloween-quiet-button" data-hg-clear${chosen.length ? '' : ' disabled'}>Clear</button><button type="button" class="halloween-quiet-button" data-hg-shuffle>Shuffle</button></div><p class="halloween-game-feedback" data-hg-feedback role="status" aria-live="polite">${esc(message)}</p>`);
      root.querySelectorAll('[data-hg-word]').forEach(button => button.addEventListener('click', () => {
        if (!ensureOwner()) return;
        const id = button.dataset.hgWord;
        if (chosen.includes(id)) chosen = chosen.filter(value => value !== id);
        else if (chosen.length < 4) chosen.push(id);
        root.querySelectorAll('[data-hg-word]').forEach(tile => { const selected = chosen.includes(tile.dataset.hgWord); tile.classList.toggle('is-selected', selected); tile.setAttribute('aria-pressed', String(selected)); tile.disabled = chosen.length === 4 && !selected; });
        root.querySelector('[data-hg-check]').disabled = chosen.length !== 4;
        root.querySelector('[data-hg-clear]').disabled = !chosen.length;
      }));
      root.querySelector('[data-hg-clear]').addEventListener('click', () => { if (!ensureOwner()) return; chosen = []; connections(); focus('[data-hg-word]'); });
      root.querySelector('[data-hg-shuffle]').addEventListener('click', () => { if (!ensureOwner()) return; wordOrder = model.shuffle(wordOrder); connections(message); focus('[data-hg-word]'); });
      root.querySelector('[data-hg-check]').addEventListener('click', () => {
        if (chosen.length !== 4 || state.completed || !ensureOwner()) return;
        try {
          const before = state.solved.length; state = model.submitConnections(state, chosen); chosen = []; persist();
          lastMessage = state.solved.length > before ? 'You found a group!' : `Not a group. ${4 - state.mistakes} ${4 - state.mistakes === 1 ? 'mistake' : 'mistakes'} left.`;
          state.completed ? finish() : (connections(lastMessage), focus('[data-hg-heading]'));
        } catch (error) {
          chosen = []; connections(error.message); focus('[data-hg-word]');
        }
      });
    }
    function showTreats() {
      const node = root.querySelector('[data-hg-rewards]');
      if (!node || !ensureOwner()) return;
      let collection;
      try { collection = api.snapshot?.(); } catch {}
      const ready = saved && !terminalFailure && collection && !collection.loading && !collection.error && (!collection.cloud || collection.status && collection.status !== 'unavailable');
      const owned = ready ? cleanTreats(collection.entitlements) : [];
      let shown = session?.practice ? [] : rewardIds.filter(id => owned.includes(id));
      // Old saved rounds and practice may show an owned treat, never a new award.
      if (!shown.length && owned.length) shown = owned.slice(-1);
      if (!shown.length) { node.hidden = true; node.replaceChildren(); delete node.dataset.receipt; return; }
      const isNew = freshRewards && !session?.practice && shown.every(id => rewardIds.includes(id));
      const receipt = JSON.stringify([shown, isNew]);
      if (node.dataset.receipt === receipt) return;
      node.dataset.receipt = receipt;
      node.innerHTML = `<p class="halloween-treat-heading">${isNew ? shown.length > 1 ? 'You unlocked two treats' : 'You unlocked a treat' : 'In your collection'}</p><ul class="halloween-result-treats">${shown.map(id => {
        const item = treats.find(treat => treat.id === id);
        const href = '/profile/?section=progress&reward=' + encodeURIComponent(item.kind + ':' + id) + '#my-avatar';
        return `<li data-hg-treat="${id}"><span class="halloween-result-treat-art${item.kind === 'frame' ? ' is-midnight' : ''}" aria-hidden="true">${treatArt(item)}</span><span class="halloween-result-treat-name"><small>${item.label}</small><strong>${item.name}</strong></span><a href="${href}" aria-label="Try on ${item.name}">Try it on <span aria-hidden="true">→</span></a></li>`;
      }).join('')}</ul>`;
      node.hidden = false;
    }
    function bindSharing(graded) {
      const trigger = root.querySelector('[data-hg-share]'), statusNode = root.querySelector('[data-hg-share-status]');
      const options = trigger.closest('.halloween-result-options'), panel = document.createElement('div');
      const base = model.share(gameId, graded);
      let busy = false, prepared = false;
      panel.id = 'halloween-invitation-' + gameId; panel.className = 'halloween-invitation'; panel.hidden = true;
      trigger.closest('.halloween-game-controls').after(panel);
      trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', 'false'); trigger.disabled = !saved;
      const allowed = () => {
        if (!ensureOwner() || !saved) return false;
        if (access.preview) { statusNode.textContent = 'Preview only. Sending is available on the live site.'; return false; }
        if (!api.availability()?.allowed) { statusNode.textContent = 'The Halloween games have finished. Try another BrainiLab game with your friend.'; return false; }
        return true;
      };
      function prepare() {
        if (prepared) return; prepared = true;
        const native = typeof navigator.share === 'function';
        panel.innerHTML = `<label for="${panel.id}-message">Your message</label><textarea id="${panel.id}-message" data-hg-invite-message rows="4" maxlength="600">${esc(base.text)}</textarea><p class="halloween-invitation-note">Edit it if you like. The game link is included.</p><div class="halloween-invitation-actions">${native ? '<button type="button" class="halloween-invitation-primary" data-hg-invite-send>Share invitation</button>' : ''}<button type="button" class="${native ? 'halloween-quiet-button' : 'halloween-invitation-primary'}" data-hg-invite-copy>Copy invitation</button><a class="halloween-quiet-link" data-hg-invite-whatsapp target="_blank" rel="noopener noreferrer">WhatsApp <span aria-hidden="true">↗</span></a></div><div data-hg-manual-copy></div>`;
        const field = panel.querySelector('[data-hg-invite-message]'), copy = panel.querySelector('[data-hg-invite-copy]'), send = panel.querySelector('[data-hg-invite-send]'), whatsapp = panel.querySelector('[data-hg-invite-whatsapp]'), manual = panel.querySelector('[data-hg-manual-copy]');
        const payload = () => ({ title: base.title, text: field.value.trim(), url: base.url });
        const fullText = () => `${payload().text}\n${base.url}`;
        function refresh() {
          const enabled = !access.preview && !!field.value.trim() && !busy;
          panel.setAttribute('aria-busy', String(busy));
          copy.disabled = !enabled; if (send) send.disabled = !enabled;
          if (enabled) whatsapp.href = 'https://wa.me/?text=' + encodeURIComponent(fullText()); else whatsapp.removeAttribute('href');
          whatsapp.setAttribute('aria-disabled', String(!enabled)); whatsapp.tabIndex = enabled ? 0 : -1;
        }
        function manualCopy() {
          const text = document.createElement('textarea'); text.readOnly = true; text.rows = 4; text.value = fullText(); text.setAttribute('aria-label', 'Invitation to copy');
          manual.replaceChildren(text); statusNode.textContent = 'Copy the invitation below and send it to your friend.';
          text.focus(); text.select();
        }
        field.addEventListener('input', () => { manual.replaceChildren(); statusNode.textContent = field.value.trim() ? '' : 'Write a short message to go with your link.'; refresh(); });
        copy.addEventListener('click', async () => {
          if (busy || !allowed() || !field.value.trim()) return;
          busy = true; refresh(); statusNode.textContent = '';
          try {
            if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
            await navigator.clipboard.writeText(fullText());
            if (ensureOwner() && panel.isConnected) statusNode.textContent = 'Invitation copied. Pick your friend and paste it into your chat.';
          } catch { if (ensureOwner() && panel.isConnected) manualCopy(); }
          finally { busy = false; if (panel.isConnected) { refresh(); if (!panel.hidden && !manual.firstChild) copy.focus(); } }
        });
        send?.addEventListener('click', async () => {
          if (busy || !allowed() || !field.value.trim()) return;
          const data = payload(); let offerCopy = false; busy = true; refresh(); statusNode.textContent = '';
          try {
            if (navigator.canShare && !navigator.canShare(data)) throw Error('Sharing unavailable');
            await navigator.share(data);
          } catch (error) {
            if (error?.name !== 'AbortError' && ensureOwner() && panel.isConnected) { statusNode.textContent = 'Sharing is not available here. You can copy the invitation instead.'; offerCopy = true; }
          } finally { busy = false; if (panel.isConnected) { refresh(); if (!panel.hidden) (offerCopy ? copy : send).focus(); } }
        });
        whatsapp.addEventListener('click', event => { if (busy || !allowed() || !field.value.trim()) event.preventDefault(); });
        refresh();
      }
      trigger.addEventListener('click', () => {
        if (!ensureOwner() || !saved) return;
        prepare(); panel.hidden = !panel.hidden; options.classList.toggle('is-sharing', !panel.hidden);
        trigger.setAttribute('aria-expanded', String(!panel.hidden)); trigger.textContent = panel.hidden ? 'Challenge a friend' : 'Close invitation';
        if (!panel.hidden) {
          if (access.preview) statusNode.textContent = 'Preview only. Sending is available on the live site.';
          panel.querySelector('[data-hg-invite-message]').focus();
        } else { statusNode.textContent = ''; trigger.focus(); }
      });
    }
    function result() {
      const graded = model.summary(gameId, submission());
      const title = graded.score === 100 ? 'A frightfully good result!' : graded.score >= 60 ? 'A few good surprises!' : 'A little wiser. Still a little spooky.';
      const detail = gameId === 'trick-or-think' ? `${graded.correct} of 10 correct answers` : `${graded.correct} of 4 groups found · ${graded.mistakes} ${graded.mistakes === 1 ? 'mistake' : 'mistakes'}`;
      shell(`<div class="halloween-game-result"><p class="halloween-eyebrow">${esc(pack.title)} · ${session?.practice ? 'practice complete' : 'complete'}</p><h2 data-hg-heading tabindex="-1">${title}</h2><p class="halloween-game-score"><strong>${graded.score}</strong><span>/100</span></p><p class="halloween-result-detail">${detail}</p><p class="halloween-game-status" data-hg-status role="status">${saved ? (session?.practice ? 'Practice complete. Your saved Halloween progress is unchanged.' : access.preview ? 'Preview complete. Your live collection is unchanged.' : 'Your Halloween progress is saved.') : 'Saving your Halloween progress…'}</p><button type="button" class="halloween-quiet-button" data-hg-save hidden>Try saving again</button><div data-hg-rewards class="halloween-result-rewards" role="status" aria-live="polite" hidden></div><div class="halloween-result-actions"><a class="halloween-quiet-link" href="/halloween/">Back to Halloween <span aria-hidden="true">→</span></a><details class="halloween-result-options"><summary>Play again or share</summary><div class="halloween-game-controls"><button type="button" class="halloween-quiet-button" data-hg-share>Challenge a friend</button><button type="button" class="halloween-quiet-button" data-hg-replay${saved ? '' : ' disabled'}>Play again</button></div><p class="halloween-game-status" data-hg-share-status role="status"></p></details></div>${gameId === 'spooky-connections' ? `<details class="halloween-result-answers"><summary>See the four connections</summary>${pack.groups.map(group => `<div class="halloween-solved-group"><strong>${esc(group.label)}</strong><span>${esc(group.wordIds.map(id => pack.words.find(word => word.id === id).label).join(' · '))}</span><p>${esc(group.explanation)}</p></div>`).join('')}</details>` : ''}</div>`);
      showTreats();
      root.querySelector('[data-hg-save]').addEventListener('click', save);
      if (terminalFailure) {
        const closed = terminalFailure === 'HALLOWEEN_CLOSED';
        status(closed ? 'The Halloween special has finished. This round was not added to your collection.' : 'A new Halloween day has begun. This round was not added to your collection. Start a fresh game for today.', true);
        root.querySelector('[data-hg-status]').tabIndex = -1;
        if (closed) root.querySelector('[data-hg-share]').hidden = true;
        else {
          const fresh = document.createElement('button'); fresh.type = 'button'; fresh.className = 'btn btn-primary halloween-button'; fresh.dataset.hgFresh = ''; fresh.textContent = 'Start today’s game';
          fresh.addEventListener('click', () => { if (saving || !ensureOwner()) return; reset(); intro(); void begin(); });
          root.querySelector('[data-hg-save]').after(fresh);
        }
      }
      root.querySelector('[data-hg-replay]').addEventListener('click', () => {
        if (saving || !saved || !ensureOwner()) return;
        reset(); intro(); focus('[data-hg-heading]');
      });
      bindSharing(graded);
      if (saved && !session?.practice) root.dispatchEvent(new CustomEvent('brainilab:halloween-game-saved', { bubbles: true, detail: { gameId, preview: !!access.preview } }));
    }
    function reset() {
      state = gameId === 'trick-or-think' ? model.initialQuiz() : model.initialConnections();
      session = null; answered = false; chosen = []; saved = false; terminalFailure = null;
      wordOrder = model.shuffle(pack.words || []); optionOrders = new Map(); rewardIds = []; freshRewards = false; storage.remove(key);
    }
    async function save() {
      if (saving || saved || terminalFailure || !state.completed || !session || !ensureOwner()) return;
      if (session.practice) { saved = true; persist(); result(); return; }
      saving = true;
      const retry = root.querySelector('[data-hg-save]');
      if (retry) { retry.disabled = true; retry.hidden = true; }
      status('Saving your Halloween progress…');
      const frozenSubmission = JSON.parse(JSON.stringify(submission()));
      let before;
      try { before = api.snapshot?.(); } catch {}
      try {
        const response = await api.completeGame({ gameId, version: pack.version, submission: frozenSubmission, localSummary: model.summary(gameId, frozenSubmission), sessionId: session });
        if (!ensureOwner()) return;
        if (!(response?.saved || (access.preview && response?.previewSaved))) throw new Error('Your result is not saved yet.');
        if (response.replayed === true && Number.isInteger(response.result?.score)) {
          session.practice = true; session.savedResultScore = response.result.score; saved = true; persist(); result(); return;
        }
        if (response?.verifiedSummary && response.verifiedSummary.score !== model.summary(gameId, frozenSubmission).score) throw new Error('This result needs another check. Your answers are kept.');
        const beforeKnown = before && !before.loading && !before.error && Array.isArray(before.entitlements) && (!before.cloud || before.status && before.status !== 'unavailable');
        rewardIds = cleanTreats(response.unlocks);
        freshRewards = !!beforeKnown;
        if (beforeKnown) rewardIds = rewardIds.filter(id => !before.entitlements.includes(id));
        saved = true; persist(); showTreats();
        status(access.preview ? 'Preview complete. Your live collection is unchanged.' : session.guest ? 'Your Halloween progress is saved on this browser.' : 'Your Halloween progress is saved.');
        root.dispatchEvent(new CustomEvent('brainilab:halloween-game-saved', { bubbles: true, detail: { gameId, preview: !!access.preview } }));
      } catch (error) {
        if (disposed) return;
        if (['HALLOWEEN_DAY_CHANGED', 'HALLOWEEN_CLOSED'].includes(error?.code)) {
          terminalFailure = error.code; persist(); result(); focus('[data-hg-status]');
        } else {
          status(storageAvailable ? 'Your result is not saved yet. Your answers are kept on this browser.' : 'Your result is not saved yet. Keep this page open and try again.', true);
          if (retry) { retry.hidden = false; retry.disabled = false; }
        }
      } finally { saving = false; for (const action of root.querySelectorAll('[data-hg-replay],[data-hg-share]')) action.disabled = !saved; }
    }
    function finish() {
      screen = 'result'; answered = false; if (session?.practice) saved = true; persist(); result();
      try { root.querySelector('.halloween-game-result')?.scrollIntoView?.({block:'start',behavior:'auto'}); } catch {}
      focus('[data-hg-heading]', true); if (!saved) void save();
    }
    function render() { screen === 'result' ? (result(), !saved && !terminalFailure && void save()) : gameId === 'trick-or-think' ? quiz() : connections(); }
    restore();
    if (state.completed && screen === 'result') render(); else intro(session ? 'Your unfinished game is ready to continue.' : '');
    window.addEventListener('pagehide', () => { disposed = true; }, { once: true });
    window.addEventListener('pageshow', event => { if (event.persisted && identity() === ownerKey) disposed = false; });
    window.addEventListener('brainilab:auth-changed', ensureOwner);
    window.addEventListener('brainilab:authchange', ensureOwner);
    window.addEventListener('brainilab:backend-auth', ensureOwner);
    window.addEventListener('brainilab:halloween-progress', showTreats);
    window.addEventListener('brainilab:halloween-entitlements', showTreats);
  }
  function ready() { document.querySelectorAll('[data-halloween-game]').forEach(mount); }
  window.BrainiHalloweenGames = Object.freeze({ mount });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
})();
