// One quiet next step after reading, using the existing game illustrations.
const games = new Map([
 ['/games/math-rush/', ['Math Rush', 'math-rush', 'A quick round of mental maths.']],
 ['/games/connections/', ['Connections', 'connections', 'Find the idea that links the clues.']],
 ['/games/sequence/', ['Sequence', 'sequence', 'Find the pattern. What comes next?']],
 ['/games/odd-one-out/', ['Odd One Out', 'odd-one-out', 'Which one does not belong?']],
 ['/games/number-route/', ['Number Route', 'number-route', 'Find your way through the numbers.']],
 ['/games/brainiword/', ['BrainiWord', 'brainiword', 'Find the word, one clue at a time.']],
 ['/geography/world-flags-quiz/', ['World Flags', 'world-flags', 'Look for a clue. Can you name the flag?']],
 ['/geography/world-capitals-quiz/', ['World Capitals', 'world-capitals', 'How well do you know the world’s capitals?']],
 ['/science/science-quiz/', ['Science Quiz', 'science', 'See what you know about the natural world.']],
 ['/history/history-quiz/', ['History Quiz', 'history', 'Take a quick trip through the past.']],
 ['/sports/sports-quiz/', ['Sports Quiz', 'sports', 'Put your sporting knowledge to the test.']],
 ['/general-knowledge/general-knowledge-quiz/', ['General Knowledge', 'mixed-general-knowledge', 'A little bit of everything. What will you know?']],
 ['/reasoning/', ['Reasoning Challenge', 'sequence', 'Spot patterns and put your logic to the test.']],
 ['/daily-quiz/', ['Today’s Daily', 'brain-mix', 'One new challenge to try today.']]
]);
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function articleGame(game) {
 const route = String(game?.url || '').split(/[?#]/)[0];
 const known = games.get(route);
 const [name, art, description] = known || ['Find a game', 'brain-mix', 'Pick a quiz, a word puzzle or a number game.'];
 const href = known ? game.url : '/games/';
 const action = known ? `Play ${name}` : 'Explore games';
 return `<a class="article-game-link" data-article-game href="${escape(href)}"><img src="/assets/illustrations/games/${art}.svg" alt="" width="80" height="60" loading="lazy" decoding="async"/><span class="article-game-copy"><strong>${escape(name)}</strong><span>${escape(description)}</span></span><span class="article-game-action">${escape(action)} <span aria-hidden="true">→</span></span></a>`;
}
