import {crypticForTime} from './cryptic-bank.js';
import {boundedText} from './public-json.js';

const TYPES = new Set(['indicator', 'fodder', 'definition']);
const instructions = {
  anagram: 'This tells you to rearrange the letters.',
  hidden: 'This tells you to look for consecutive letters inside the following words.',
  reversal: 'This tells you to read the letters backwards.'
};
const reply = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {status, headers: {
  'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff', ...extra
}});
const publicPuzzle = ({date, number, expiresAt, puzzle}) => ({date, number, expiresAt,
  id: puzzle.id.replace(/-[a-z]+$/, '') + '-' + number, clue: puzzle.clue, length: puzzle.answer.length});
const solution = puzzle => ({answer: puzzle.answer, type: puzzle.type, parts: puzzle.parts, explanation: puzzle.explanation});

// No credentials, player data, database binding, upstream calls or scoring writes.
export async function crypticAPI(request, {now = Date.now(), random = crypto.getRandomValues.bind(crypto)} = {}) {
  const url = new URL(request.url);
  if (!['GET', 'POST', 'HEAD'].includes(request.method)) return reply({error: 'Method not allowed.'}, 405, {Allow: 'GET, HEAD, POST'});
  if (url.search) return reply({error: 'Only today’s clue is available.'}, 400);
  const daily = crypticForTime(now);
  if (!daily) return reply({error: 'The first clue is not available yet.'}, 503);
  const today = publicPuzzle(daily), puzzle = daily.puzzle;
  today.serverTime = new Date(now).toISOString();
  if (request.method === 'HEAD') return new Response(null, {status: 200, headers: reply(today).headers});
  if (request.method === 'GET') return reply(today);
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== url.origin)) return reply({error: 'Open the game on this website.'}, 403);
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return reply({error: 'Send JSON.'}, 415);
  let body;
  try { body = JSON.parse(await boundedText(request, 2048)); }
  catch { return reply({error: 'The request could not be read.'}, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({error: 'Invalid request.'}, 400);
  const allowed = new Set(['date', 'id', 'action', 'answer', 'type', 'revealed']);
  if (Object.keys(body).some(key => !allowed.has(key))) return reply({error: 'Invalid request.'}, 400);
  if (body.date !== today.date || body.id !== today.id) return reply({error: 'A new daily clue is ready. Refresh to play it.', code: 'new-day'}, 409);
  const base = {date: today.date, id: today.id};
  if (body.action === 'check') {
    if (typeof body.answer !== 'string' || !/^[a-zA-Z]{3,15}$/.test(body.answer.trim())) return reply({error: 'Enter the letters of your answer.'}, 400);
    const correct = body.answer.trim().toUpperCase() === puzzle.answer;
    return reply({...base, correct, ...(correct ? {solution: solution(puzzle)} : {})});
  }
  if (body.action === 'hint' && TYPES.has(body.type)) {
    const text = body.type === 'indicator' ? instructions[puzzle.type] : body.type === 'fodder'
      ? 'These are the letters or words to work with.' : 'This part gives the meaning of the answer.';
    return reply({...base, hint: {type: body.type, ...puzzle.parts[body.type], explanation: text}});
  }
  if (body.action === 'letter') {
    if (!Array.isArray(body.revealed) || body.revealed.length > puzzle.answer.length ||
      body.revealed.some(index => !Number.isInteger(index) || index < 0 || index >= puzzle.answer.length) ||
      new Set(body.revealed).size !== body.revealed.length) return reply({error: 'Invalid letter positions.'}, 400);
    const remaining = Array.from({length: puzzle.answer.length}, (_, i) => i).filter(i => !body.revealed.includes(i));
    if (!remaining.length) return reply({...base, letter: null});
    // Rejection sampling avoids modulo bias for short answer lengths.
    const limit = Math.floor(0x100000000 / remaining.length) * remaining.length;
    let value;
    do { value = random(new Uint32Array(1))[0]; } while (value >= limit);
    const index = remaining[value % remaining.length];
    return reply({...base, letter: {index, value: puzzle.answer[index]}});
  }
  if (body.action === 'reveal') return reply({...base, solution: solution(puzzle)});
  return reply({error: 'Choose one of the available actions.'}, 400);
}
