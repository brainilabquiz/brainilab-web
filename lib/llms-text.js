// /llms.txt: a plain Markdown map of the public site for AI assistants (GEO).
// Built from the same published articles and Academy paths as the sitemap, so it
// never lists drafts. Game descriptions match each page's meta description.
const BASE='https://brainilabgames.com';
export const LLMS_GAMES=Object.freeze([
 ['Daily quiz and puzzle','/daily-quiz/','Today’s shared quiz, word game or number puzzle; the main challenge keeps the streak.'],
 ['Brain Mix','/games/brain-mix/','Ten questions on a little of everything, with feedback on every answer.'],
 ['BrainiWord','/games/brainiword/','A daily five-letter word puzzle: five tries with colour clues.'],
 ['Connections','/games/connections/','Find one link across four to eight clues.'],
 ['Higher or Lower','/games/higher-lower/','Compare people, places, dates and sizes.'],
 ['Math Rush','/games/math-rush/','60 seconds of addition, subtraction, multiplication and division.'],
 ['Number Route','/games/number-route/','Keep four numbers in order and pick the signs that reach the target, left to right.'],
 ['Odd One Out','/games/odd-one-out/','Four items, one outsider; the connection is explained after each answer.'],
 ['Order Up','/games/order-up/','Put ten items in the correct order.'],
 ['Sequence','/games/sequence/','Spot the pattern and choose the next number.'],
 ['Survival','/games/survival/','Mixed questions with three lives and rising difficulty.'],
 ['Topic Rush','/games/topic-rush/','One topic and 60 seconds to type valid answers.'],
 ['World Flags Quiz','/geography/world-flags-quiz/','Identify the country from its national flag.'],
 ['Europe Flags Quiz','/geography/europe-flags-quiz/','Recognise 20 European flags.'],
 ['World Capitals Quiz','/geography/world-capitals-quiz/','Choose the capital city of each country.']
]);
const line=s=>String(s??'').replace(/[\r\n]+/g,' ').replace(/\s+/g,' ').trim();
export function llmsText(articles=[],paths=[]) {
 const out=['# BrainiLab','','> Free daily quizzes, word and number games, short explainer articles and beginner courses (BrainiLab Academy). In English. Playing and reading need no account.','',
  'Articles explain one curious question each, cite their sources and link a related game. Breaking News lists short, attributed summaries of other publishers’ reports for 48 hours.','',
  '## Games',...LLMS_GAMES.map(([name,path,text])=>`- [${name}](${BASE}${path}): ${text}`),''];
 if(paths.length)out.push('## BrainiLab Academy',`- [All courses](${BASE}/learn/paths/): Free beginner courses with short ordered lessons and optional quizzes.`,...paths.map(p=>`- [${line(p.title)}](${BASE}/learn/paths/${p.slug}/): ${line(p.description)}`),'');
 const topics=new Map();
 for(const a of articles){const t=line(a.topic)||'Other';if(!topics.has(t))topics.set(t,[]);topics.get(t).push(a);}
 for(const [topic,list] of [...topics].sort(([a],[b])=>a.localeCompare(b))){
  out.push(`## Articles: ${topic}`,...list.map(a=>`- [${line(a.title)}](${BASE}/learn/${a.slug}/): ${line(a.description)}`),'');
 }
 out.push('## More',`- [Learn library](${BASE}/learn/): All articles and courses.`,`- [Articles by topic](${BASE}/learn/topics/)`,`- [Breaking News](${BASE}/breaking-news/): World news in brief, updated twice a day.`,`- [About BrainiLab](${BASE}/about/): Who makes BrainiLab and how content is put together.`,`- [Sitemap](${BASE}/sitemap.xml)`,'');
 return out.join('\n');
}
