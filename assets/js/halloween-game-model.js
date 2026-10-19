/* BrainiLab Halloween 2026. Pure rules; no storage, network, Daily or XP writes. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.BrainiHalloweenGameModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CATALOG = /* HALLOWEEN_CATALOG */ {"version":"halloween-2026-v1","reviewedOn":"2026-10-16","games":{"trick-or-think":{"id":"trick-or-think","version":"halloween-2026-v1","title":"Trick or Think?","description":"Ten Halloween questions. A few familiar things might surprise you.","questions":[{"id":"q01","prompt":"Before pumpkins, what did people in Ireland carve into Halloween lanterns?","options":[{"id":"a","label":"Apples"},{"id":"b","label":"Turnips"},{"id":"c","label":"Cabbages"},{"id":"d","label":"Onions"}],"answer":"b","explanation":"Turnips made the spooky faces. The National Museum of Ireland keeps a model of a traditional turnip lantern.","source":{"title":"National Museum of Ireland: Ghost turnip","url":"https://source.museum.ie/en-IE/Collections-Research/Collection/Top-things-to-see-in-the-Irish-Folklife-Collection/Artefact/Ghost-turnip/b202e8ea-0728-4b3d-b0f1-82660fe45ce9"}},{"id":"q02","prompt":"The name Halloween is linked to which older name?","options":[{"id":"a","label":"Harvest Moon Evening"},{"id":"b","label":"Hall of Winter"},{"id":"c","label":"All Hallows' Eve"},{"id":"d","label":"Hollow Night"}],"answer":"c","explanation":"All Hallows' Eve is the evening before All Saints' Day, also called All Hallows, on 1 November.","source":{"title":"Library of Congress: Halloween resources","url":"https://guides.loc.gov/halloween"}},{"id":"q03","prompt":"A bat flaps past the window. What kind of animal is it?","options":[{"id":"a","label":"A mammal"},{"id":"b","label":"A bird"},{"id":"c","label":"A reptile"},{"id":"d","label":"An insect"}],"answer":"a","explanation":"Bats are mammals. They are the only mammals capable of sustained flight, rather than gliding.","source":{"title":"USGS: Species we study, bats","url":"https://www.usgs.gov/programs/species-management-research-program/science/species-we-study-bats"}},{"id":"q04","prompt":"'Blind as a bat' sounds convincing. Is it true?","options":[{"id":"a","label":"Yes, every bat is blind"},{"id":"b","label":"Only baby bats can see"},{"id":"c","label":"Bats have no eyes"},{"id":"d","label":"No, bats can see"}],"answer":"d","explanation":"Bats can see. Their vision varies, and many species also use echoes to find their way.","source":{"title":"USGS: Are bats blind?","url":"https://www.usgs.gov/faqs/are-bats-blind"}},{"id":"q05","prompt":"When a bat uses echolocation, what bounces back to its ears?","options":[{"id":"a","label":"Light"},{"id":"b","label":"Sound"},{"id":"c","label":"Heat"},{"id":"d","label":"Smell"}],"answer":"b","explanation":"The bat makes calls and listens for returning sound. Those echoes help it locate objects and prey.","source":{"title":"National Park Service: Echolocation","url":"https://www.nps.gov/subjects/bats/echolocation.htm"}},{"id":"q06","prompt":"Check that Halloween spider decoration. How many legs should an adult spider have?","options":[{"id":"a","label":"Four"},{"id":"b","label":"Six"},{"id":"c","label":"Eight"},{"id":"d","label":"Ten"}],"answer":"c","explanation":"Eight legs. Insects have six, so a spider is not an insect.","source":{"title":"Smithsonian: What is an insect?","url":"https://naturalhistory.si.edu/education/teaching-resources/life-science/what-insect"}},{"id":"q07","prompt":"Your pumpkin has a less spooky family connection. It belongs with which plants?","options":[{"id":"a","label":"Squashes and gourds"},{"id":"b","label":"Carrots and parsnips"},{"id":"c","label":"Apples and pears"},{"id":"d","label":"Peas and beans"}],"answer":"a","explanation":"Pumpkins, squashes and gourds are cucurbits. Some varieties even belong to the same species.","source":{"title":"Illinois Extension: Pumpkin","url":"https://extension.illinois.edu/gardening/pumpkin"}},{"id":"q08","prompt":"A pumpkin plant's first flowers often make no pumpkins. What is a common reason?","options":[{"id":"a","label":"Pumpkins grow without flowers"},{"id":"b","label":"Every flower needs moonlight"},{"id":"c","label":"The plant is always dying"},{"id":"d","label":"Those first flowers are male"}],"answer":"d","explanation":"The first flowers are usually male. The small developing fruit sits at the base of a female flower.","source":{"title":"Illinois Extension: Pumpkin","url":"https://extension.illinois.edu/gardening/pumpkin"}},{"id":"q09","prompt":"A calendar calls a full Moon a 'Blue Moon'. Must it look blue?","options":[{"id":"a","label":"Yes, bright blue all night"},{"id":"b","label":"No, the name describes timing"},{"id":"c","label":"Only during Halloween"},{"id":"d","label":"Only above the sea"}],"answer":"b","explanation":"No blue paint needed. In its common modern use, the name means the second full Moon in a calendar month.","source":{"title":"NASA: The Halloween Blue Moon","url":"https://science.nasa.gov/solar-system/moon/everything-you-need-to-know-about-the-halloween-boo-moon/"}},{"id":"q10","prompt":"An owl turns its head to look around. Why does that help?","options":[{"id":"a","label":"Its eyes are on its wings"},{"id":"b","label":"Its ears cannot hear behind it"},{"id":"c","label":"Its eyes cannot move in their sockets"},{"id":"d","label":"It is changing the colour of its eyes"}],"answer":"c","explanation":"Owl eyes stay fixed in their sockets. A flexible neck helps the bird look in different directions.","source":{"title":"Smithsonian Q?rius: About owls","url":"https://qrius.si.edu/taxonomy/term/12125"}}]},"spooky-connections":{"id":"spooky-connections","version":"halloween-2026-v1","title":"Spooky Connections","description":"Sixteen words. Four hidden groups. Can you untangle them?","words":[{"id":"w00","label":"SKULL"},{"id":"w01","label":"RIB"},{"id":"w02","label":"FEMUR"},{"id":"w03","label":"PELVIS"},{"id":"w04","label":"TOWN"},{"id":"w05","label":"WRITER"},{"id":"w06","label":"STORY"},{"id":"w07","label":"SHIP"},{"id":"w08","label":"HOOT"},{"id":"w09","label":"HOWL"},{"id":"w10","label":"RUSTLE"},{"id":"w11","label":"CREAK"},{"id":"w12","label":"FUDGE"},{"id":"w13","label":"TOFFEE"},{"id":"w14","label":"LIQUORICE"},{"id":"w15","label":"CHOCOLATE"}],"groups":[{"id":"g0","label":"Parts of a skeleton","wordIds":["w00","w01","w02","w03"],"explanation":"A skull, rib, femur and pelvis are all parts of a skeleton."},{"id":"g1","label":"Words after 'ghost'","wordIds":["w04","w05","w06","w07"],"explanation":"Ghost town, ghostwriter, ghost story and ghost ship."},{"id":"g2","label":"Sounds in a spooky night","wordIds":["w08","w09","w10","w11"],"explanation":"A hoot, a howl, a rustle and a creak: four sounds that can make a quiet night feel spooky."},{"id":"g3","label":"Something sweet","wordIds":["w12","w13","w14","w15"],"explanation":"Fudge, toffee, liquorice and chocolate are sweets. Treat yourself to that connection."}],"maxMistakes":4,"pointsPerGroup":25,"mistakePenalty":10}}};
  const copy = value => JSON.parse(JSON.stringify(value));
  function freeze(value) {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    return value;
  }
  function invariant(value, message) { if (!value) throw new Error(message); }
  function game(gameId) { invariant(CATALOG.games[gameId], 'Unknown Halloween game.'); return CATALOG.games[gameId]; }
  function shuffle(values, random = Math.random) {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const value = random();
      invariant(Number.isFinite(value) && value >= 0 && value < 1, 'Invalid shuffle source.');
      const j = Math.floor(value * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function initialQuiz() { return { answers: [], completed: false, correct: 0, score: 0, maxScore: 100 }; }
  function answerQuiz(state, questionId, answerId) {
    const pack = game('trick-or-think');
    invariant(!state.completed, 'This quiz is already complete.');
    const question = pack.questions[state.answers.length];
    invariant(question && question.id === questionId, 'Answer the current question once.');
    invariant(question.options.some(option => option.id === answerId), 'Choose one of the answers.');
    const answers = [...state.answers, { id: questionId, answer: answerId }];
    const correct = state.correct + Number(question.answer === answerId);
    return { answers, correct, score: correct * 10, maxScore: 100, completed: answers.length === pack.questions.length };
  }
  function quizFromSubmission(submission) {
    invariant(submission && Object.keys(submission).length === 1 && Array.isArray(submission.answers), 'Invalid quiz answers.');
    invariant(submission.answers.length <= 10, 'Too many quiz answers.');
    return submission.answers.reduce((state, item) => {
      invariant(item && Object.keys(item).length === 2 && typeof item.id === 'string' && typeof item.answer === 'string', 'Invalid quiz answer.');
      return answerQuiz(state, item.id, item.answer);
    }, initialQuiz());
  }
  function initialConnections() { return { attempts: [], solved: [], mistakes: 0, completed: false, score: 0, maxScore: 100 }; }
  function combination(ids) { return ids.slice().sort().join('|'); }
  function submitConnections(state, ids) {
    const pack = game('spooky-connections');
    invariant(!state.completed, 'This puzzle is already complete.');
    invariant(Array.isArray(ids) && ids.length === 4 && new Set(ids).size === 4, 'Choose four different words.');
    const validIds = new Set(pack.words.map(word => word.id));
    invariant(ids.every(id => typeof id === 'string' && validIds.has(id)), 'Unknown word.');
    const solvedWords = new Set(pack.groups.filter(group => state.solved.includes(group.id)).flatMap(group => group.wordIds));
    invariant(!ids.some(id => solvedWords.has(id)), 'That group has already been found.');
    const key = combination(ids);
    invariant(!state.attempts.some(attempt => combination(attempt) === key), 'You have already tried those four words.');
    const match = pack.groups.find(group => combination(group.wordIds) === key);
    const solved = match ? [...state.solved, match.id] : state.solved.slice();
    const mistakes = state.mistakes + Number(!match);
    return {
      attempts: [...state.attempts.map(attempt => attempt.slice()), ids.slice()], solved, mistakes,
      completed: solved.length === 4 || mistakes === pack.maxMistakes,
      score: Math.max(0, pack.pointsPerGroup * solved.length - pack.mistakePenalty * mistakes), maxScore: 100
    };
  }
  function connectionsFromSubmission(submission) {
    invariant(submission && Object.keys(submission).length === 1 && Array.isArray(submission.attempts), 'Invalid word groups.');
    invariant(submission.attempts.length <= 7, 'Too many word groups.');
    return submission.attempts.reduce(submitConnections, initialConnections());
  }
  function summary(gameId, submission, requireComplete = true) {
    const state = gameId === 'trick-or-think' ? quizFromSubmission(submission) :
      gameId === 'spooky-connections' ? connectionsFromSubmission(submission) : game(gameId);
    invariant(!requireComplete || state.completed, 'Finish the game before saving.');
    return gameId === 'trick-or-think'
      ? { completed: state.completed, correct: state.correct, total: 10, score: state.score, maxScore: 100 }
      : { completed: state.completed, correct: state.solved.length, total: 4, mistakes: state.mistakes, score: state.score, maxScore: 100 };
  }
  function publicPack(gameId) {
    const pack = copy(game(gameId));
    if (pack.questions) pack.questions = pack.questions.map(({ answer, explanation, source, ...question }) => question);
    delete pack.groups;
    return pack;
  }
  function acceptsPack(gameId, supplied) {
    if (!supplied || supplied.version !== game(gameId).version) return false;
    const expected = publicPack(gameId);
    // PostgreSQL jsonb may reorder object keys. Canonical question/word order and IDs matter;
    // property order and optional descriptive fields do not.
    const pick = pack => gameId === 'trick-or-think'
      ? pack.questions?.map(question => [question.id, question.prompt, question.options?.map(option => [option.id, option.label])])
      : pack.words?.map(word => [word.id, word.label]);
    return JSON.stringify(pick(expected)) === JSON.stringify(pick(supplied));
  }
  function share(gameId, result) {
    invariant(result && Number.isInteger(result.score) && result.score >= 0 && result.score <= 100, 'Invalid result.');
    const title = game(gameId).title;
    const url = `https://brainilabgames.com/halloween/${gameId}/`;
    const emoji = gameId === 'trick-or-think' ? '🎃' : '🦇';
    const hook = gameId === 'trick-or-think' ? 'Ten Halloween questions' : 'Four hidden groups';
    const challenge = result.score === 100 ? 'Can you match me?' : 'Think you can beat me?';
    const text = result.score === 0
      ? `Halloween won this round! I got 0/100 in ${title} ${emoji} Think you can do better? Your turn!`
      : `I got ${result.score}/100 in ${title} ${emoji} ${challenge} ${hook} — your turn!`;
    return { title: `${title} · BrainiLab`, text, url };
  }
  freeze(CATALOG);
  return Object.freeze({ catalog: CATALOG, game, shuffle, initialQuiz, answerQuiz, quizFromSubmission,
    initialConnections, submitConnections, connectionsFromSubmission, summary, publicPack, acceptsPack, share });
});
