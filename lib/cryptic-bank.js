// Private setter's catalogue. Never import this file from browser code.
// Familiar dictionary words; clue wording and explanations are BrainiLab's.
export const CRYPTIC_START = '2026-10-29';
const DAY = 86400000;
const make = (answer, type, clue, definition, indicator, fodder, explanation) => {
  const parts = Object.fromEntries(Object.entries({definition, indicator, fodder}).map(([kind, text]) => {
    const start = clue.indexOf(text);
    if (start < 0 || clue.indexOf(text, start + 1) !== -1) throw Error('Ambiguous cryptic annotation');
    return [kind, {start, end: start + text.length, text}];
  }));
  return Object.freeze({id: 'cryptic-v1-' + answer.toLowerCase(), answer, type, clue, parts, explanation});
};
// Fixed season order: adding a future season must not change an existing day's clue.
export const CRYPTIC_SEASONS = Object.freeze([{start: CRYPTIC_START, puzzles: Object.freeze([
  make('NOTES', 'anagram', 'Broken stone produces musical sounds', 'musical sounds', 'Broken', 'stone', 'Rearrange STONE to make NOTES: musical sounds. Every letter is used once.'),
  make('OWL', 'hidden', 'Bird spotted in snow leopard habitat', 'Bird', 'spotted in', 'snow leopard habitat', 'Look inside snOW Leopard habitat. The consecutive letters OWL name a bird.'),
  make('WARD', 'reversal', 'Draw back for a hospital section', 'a hospital section', 'back', 'Draw', 'Read DRAW backwards: WARD, a section of a hospital.'),
  make('SILENT', 'anagram', 'Quiet, with listen rearranged', 'Quiet', 'rearranged', 'listen', 'Rearrange LISTEN to make SILENT, meaning quiet. Use all six letters.'),
  make('CAT', 'hidden', 'Pet concealed in duplicate report', 'Pet', 'concealed in', 'duplicate report', 'The answer sits inside dupliCATe report: CAT, a pet.'),
  make('REED', 'reversal', 'Deer returning as a waterside plant', 'a waterside plant', 'returning', 'Deer', 'Reverse DEER to get REED, a plant that grows beside water.'),
  make('SPEAR', 'anagram', 'Mashed pears make a pointed weapon', 'a pointed weapon', 'Mashed', 'pears', 'Mix the letters of PEARS to get SPEAR, a weapon with a pointed end.'),
  make('ANT', 'hidden', 'Tiny worker hiding in elephant enclosure', 'Tiny worker', 'hiding in', 'elephant enclosure', 'Look inside elephANT enclosure. ANT is a tiny worker in an ant colony.'),
  make('DESSERTS', 'reversal', 'Stressed, looking back at sweet courses', 'sweet courses', 'looking back', 'Stressed', 'Read STRESSED backwards to make DESSERTS: the sweet courses at the end of meals.'),
  make('STALE', 'anagram', 'Old tales, retold', 'Old', 'retold', 'tales', 'Retell the letters of TALES in a new order: STALE, meaning old or no longer fresh.'),
  make('EAR', 'hidden', 'Hearing organ hidden in research notes', 'Hearing organ', 'hidden in', 'research notes', 'The consecutive letters in resEARch spell EAR, a hearing organ.'),
  make('STOP', 'reversal', 'Halt as pots return', 'Halt', 'return', 'pots', 'Reverse POTS to make STOP, meaning halt.'),
  make('CANOE', 'anagram', 'Ocean churning produces a small boat', 'a small boat', 'churning', 'Ocean', 'Churn the letters of OCEAN into CANOE, a small boat moved with a paddle.'),
  make('TEA', 'hidden', 'Drink found in steam room', 'Drink', 'found in', 'steam room', 'Look inside sTEAm room for TEA, a drink.'),
  make('STEP', 'reversal', 'Staircase unit, pets returning', 'Staircase unit', 'returning', 'pets', 'PETS backwards is STEP: one unit of a staircase.'),
  make('HEART', 'anagram', 'Earth disturbed reveals a vital organ', 'a vital organ', 'disturbed', 'Earth', 'Rearrange EARTH into HEART, the organ that pumps blood.'),
  make('LION', 'hidden', "Big cat hiding in millionaire's garden", 'Big cat', 'hiding in', "millionaire's garden", 'The answer is hidden in milLIONaire: LION, a big cat.'),
  make('POOL', 'reversal', 'Loop back for a swimming place', 'a swimming place', 'back', 'Loop', 'LOOP read backwards becomes POOL, a place to swim.'),
  make('BELOW', 'anagram', 'Elbow twisted underneath', 'underneath', 'twisted', 'Elbow', 'Twist the letters of ELBOW into BELOW, meaning underneath.'),
  make('ROSE', 'hidden', 'Flower hidden in hero selection', 'Flower', 'hidden in', 'hero selection', 'Look across the words heRO SElection. ROSE is a flower.'),
  make('SNIP', 'reversal', 'Cut as pins turn back', 'Cut', 'turn back', 'pins', 'Turn PINS backwards to get SNIP, meaning cut with scissors.'),
  make('ANGER', 'anagram', 'Rage from range in turmoil', 'Rage', 'in turmoil', 'range', 'Put the letters of RANGE in a new order to make ANGER: rage.'),
  make('IRON', 'hidden', 'Metal found in environmental report', 'Metal', 'found in', 'environmental report', 'Look inside envIRONmental report. IRON is a metal.'),
  make('PARTS', 'reversal', 'Components from strap turned around', 'Components', 'turned around', 'strap', 'Turn STRAP around to make PARTS, meaning components.'),
  make('ALERT', 'anagram', 'Wide awake, later unsettled', 'Wide awake', 'unsettled', 'later', 'Unsettle the letters of LATER to form ALERT, meaning wide awake and attentive.'),
  make('HEN', 'hidden', 'Bird seen in the notebook', 'Bird', 'seen in', 'the notebook', 'Look across tHE Notebook to find HEN, a bird.'),
  make('VASE', 'anagram', 'Save, rearranged, for a flower holder', 'a flower holder', 'rearranged', 'Save', 'Rearrange SAVE to make VASE, a container used for flowers.'),
  make('ELM', 'hidden', 'Tree concealed in helmet storage', 'Tree', 'concealed in', 'helmet storage', 'Look inside hELMet storage. ELM is a type of tree.')
])}]);

export function crypticForTime(now = Date.now()) {
  const date = new Date(now).toISOString().slice(0, 10);
  const season = [...CRYPTIC_SEASONS].reverse().find(item => item.start <= date);
  if (!season) return null;
  const offset = Math.floor((Date.parse(date) - Date.parse(season.start)) / DAY);
  return {date, number: Math.floor((Date.parse(date) - Date.parse(CRYPTIC_START)) / DAY) + 1,
    expiresAt: new Date(Date.parse(date) + DAY).toISOString(), puzzle: season.puzzles[offset % season.puzzles.length]};
}
