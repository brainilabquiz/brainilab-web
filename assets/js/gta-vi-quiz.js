const questions = [
  {
    prompt: 'Where is most of GTA V set?',
    options: ['Liberty City and Alderney', 'Los Santos and Blaine County', 'Vice City and Leonida', 'San Fierro and Las Venturas'],
    correct: 1,
    explanation: 'GTA V moves between the city of Los Santos and the countryside of Blaine County.',
    source: 'https://www.rockstargames.com/newswire/article/o349k552525a57/Grand-Theft-Auto-V-Coming-this-Fall-to-PlayStation-4-Xbox',
  },
  {
    prompt: 'Who are the central duo in GTA VI?',
    options: ['Niko and Roman', 'Johnny and Luis', 'Franklin and Lamar', 'Jason and Lucia'],
    correct: 3,
    explanation: 'Jason and Lucia are at the centre of the story Rockstar introduces in its launch trailer.',
    source: 'https://www.rockstargames.com/VI',
  },
  {
    prompt: 'In which year did GTA V first launch?',
    options: ['2013', '2012', '2014', '2015'],
    correct: 0,
    explanation: 'GTA V first arrived in September 2013, before the subsequent versions for other platforms.',
    source: 'https://www.rockstargames.com/newswire/article/ak14o88385oo81/grand-theft-auto-v-is-coming-9172013.html',
  },
  {
    prompt: 'Which fictional state is home to Vice City in GTA VI?',
    options: ['San Andreas', 'North Yankton', 'Leonida', 'Alderney'],
    correct: 2,
    explanation: 'Rockstar places Vice City within the state of Leonida.',
    source: 'https://www.rockstargames.com/VI',
  },
  {
    prompt: 'Which of these is a playable lead in GTA V’s main story?',
    options: ['Lamar Davis', 'Trevor Philips', 'Jimmy De Santa', 'Lester Crest'],
    correct: 1,
    explanation: 'Trevor is playable alongside Michael and Franklin in the main story.',
    source: 'https://www.rockstargames.com/newswire/article/o349k552514927/worldwide-grand-theft-auto-v-previews.html',
  },
  {
    prompt: 'Which act composed the original score for GTA VI?',
    options: ['Daft Punk', 'The Chemical Brothers', 'Tangerine Dream', 'Justice'],
    correct: 3,
    explanation: 'Rockstar brought in the French electronic duo Justice to compose the adaptive score.',
    source: 'https://www.rockstargames.com/newswire/article/39ak8a12395591/grand-theft-auto-vi-original-score-by-justice',
  },
  {
    prompt: 'What is the name of Franklin’s dog?',
    options: ['Chop', 'Rufus', 'Buddy', 'Rex'],
    correct: 0,
    explanation: 'Chop is Franklin’s companion and appears in both GTA V and GTA Online.',
    source: 'https://www.rockstargames.com/newswire/article/ak759k91592728/gta-online-the-contract-out-now',
  },
  {
    prompt: 'What is inside the PS5 code-in-box edition of GTA VI?',
    options: ['Two game discs', 'A single game disc', 'A game download code', 'A game cartridge'],
    correct: 2,
    explanation: 'This boxed edition contains a code to redeem through PlayStation, so it can be pre-loaded after redemption.',
    source: 'https://www.playstation.com/en-gb/support/games/gta-vi-support/',
  },
  {
    prompt: 'Which GTA Online update brings Franklin back as a partner in the Agency?',
    options: ['The Diamond Casino Heist', 'The Contract', 'Los Santos Tuners', 'The Cayo Perico Heist'],
    correct: 1,
    explanation: 'The Contract brings Franklin, Lamar and Chop into the GTA Online story.',
    source: 'https://www.rockstargames.com/newswire/article/ak759k91592728/gta-online-the-contract-out-now',
  },
  {
    prompt: 'Which real city hosts Rockstar’s GTA VI launch festival?',
    options: ['Los Angeles', 'New York', 'Atlanta', 'Miami'],
    correct: 3,
    explanation: 'Rockstar and PlayStation scheduled the festival for Mana Wynwood in Miami.',
    source: 'https://www.rockstargames.com/VI/gtavi-thefestival',
  },
];

const quiz = document.querySelector('#gta-quiz');
const start = quiz.querySelector('[data-quiz-start]');
const round = quiz.querySelector('[data-quiz-round]');
const count = quiz.querySelector('[data-quiz-count]');
const progress = quiz.querySelector('[data-quiz-progress]');
const prompt = quiz.querySelector('[data-quiz-question]');
const options = quiz.querySelector('[data-quiz-options]');
const feedback = quiz.querySelector('[data-quiz-feedback]');
const source = quiz.querySelector('[data-quiz-source]');
const next = quiz.querySelector('[data-quiz-next]');
const result = quiz.querySelector('[data-quiz-result]');
const scoreLabel = quiz.querySelector('[data-quiz-score]');
const replay = quiz.querySelector('[data-quiz-replay]');

let index = 0;
let score = 0;
let answered = false;
progress.max = questions.length;

function answer(choice) {
  if (answered) return;
  answered = true;
  const question = questions[index];
  const isCorrect = choice === question.correct;
  score += Number(isCorrect);
  progress.value = index + 1;

  Array.from(options.children).forEach((button, position) => {
    button.setAttribute('aria-disabled', 'true');
    button.tabIndex = position === choice ? 0 : -1;
    if (position === question.correct) {
      button.dataset.answer = 'correct';
      button.append(' ✓');
    } else if (position === choice) {
      button.dataset.answer = 'incorrect';
      button.append(' ✕');
    }
  });

  const verdict = isCorrect ? 'Correct.' : 'The answer is ' + question.options[question.correct] + '.';
  feedback.textContent = verdict + ' ' + question.explanation;
  source.href = question.source;
  source.hidden = false;
  next.textContent = index === questions.length - 1 ? 'See my score' : 'Next question';
  next.hidden = false;
}

function showQuestion() {
  answered = false;
  const question = questions[index];
  count.textContent = 'Question ' + (index + 1) + ' of ' + questions.length;
  prompt.textContent = question.prompt;
  feedback.textContent = '';
  source.hidden = true;
  next.hidden = true;
  options.replaceChildren(...question.options.map((label, position) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => answer(position));
    return button;
  }));
  prompt.focus();
}

function begin() {
  index = 0;
  score = 0;
  progress.value = 0;
  start.hidden = true;
  result.hidden = true;
  round.hidden = false;
  showQuestion();
}

start.addEventListener('click', begin);
replay.addEventListener('click', begin);
next.addEventListener('click', () => {
  if (!answered) return;
  index += 1;
  if (index < questions.length) {
    showQuestion();
    return;
  }

  answered = false;
  round.hidden = true;
  result.hidden = false;
  scoreLabel.textContent = 'You scored ' + score + ' out of ' + questions.length;
  scoreLabel.focus();
});
start.hidden = false;
