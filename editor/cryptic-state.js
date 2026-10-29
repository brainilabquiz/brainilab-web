export const CRYPTIC_KEY = 'brainilab-cryptic-v1';
export const HINT_TYPES = ['indicator', 'fodder', 'definition'];
export const emptyState = daily => ({id: daily.id, date: daily.date, draft: '_'.repeat(daily.length),
  hints: {}, letters: {}, attempts: 0, mode: 'playing', answer: ''});

export function restoreState(raw, daily) {
  const state = emptyState(daily);
  try {
    const saved = JSON.parse(raw);
    if (saved?.id !== daily.id || saved.date !== daily.date) return state;
    if (typeof saved.draft === 'string' && new RegExp('^[A-Z_]{' + daily.length + '}$').test(saved.draft)) state.draft = saved.draft;
    if (Number.isSafeInteger(saved.attempts) && saved.attempts >= 0) state.attempts = Math.min(saved.attempts, 9999);
    for (const kind of HINT_TYPES) {
      const hint = saved.hints?.[kind];
      if (hint && Number.isInteger(hint.start) && Number.isInteger(hint.end) && hint.start >= 0 && hint.end > hint.start &&
        hint.end <= daily.clue.length && daily.clue.slice(hint.start, hint.end) === hint.text && hint.type === kind &&
        typeof hint.explanation === 'string' && hint.explanation.length < 160) state.hints[kind] = hint;
    }
    for (const [key, value] of Object.entries(saved.letters || {})) {
      if (/^(0|[1-9]\d?)$/.test(key) && Number(key) < daily.length && /^[A-Z]$/.test(value)) state.letters[key] = value;
    }
    if (['solved', 'revealed'].includes(saved.mode) && new RegExp('^[A-Z]{' + daily.length + '}$').test(saved.answer)) {
      state.mode = saved.mode; state.answer = saved.answer;
    }
  } catch { /* Blocked, corrupt or expired browser storage starts a clean clue. */ }
  return state;
}

export function shareCryptic(daily, state) {
  const hints = HINT_TYPES.filter(type => state.hints[type]).length;
  const letters = Object.keys(state.letters).length;
  const help = [hints ? `${hints} clue hint${hints === 1 ? '' : 's'}` : '', letters ? `${letters} letter${letters === 1 ? '' : 's'}` : ''].filter(Boolean);
  const result = state.mode === 'revealed' ? 'I explored today’s clue.' : help.length ? `Cracked it with ${help.join(' and ')}.` : 'Cracked it without hints!';
  return `BrainiLab Cryptic #${daily.number} · ${daily.date}\n${result}\nOne clue. Can you crack it?\nhttps://brainilabgames.com/games/cryptic/`;
}
