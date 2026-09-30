// Shared validation and progress rules. Completion describes activity, not mastery.
export function validQuiz(quiz){
 return !!quiz && typeof quiz.version==='string' && /^[a-zA-Z0-9-]{1,80}$/.test(quiz.version) && Array.isArray(quiz.questions) && quiz.questions.length>=2 && quiz.questions.length<=8 && quiz.questions.every(q=>typeof q.prompt==='string'&&q.prompt.trim()&&Array.isArray(q.options)&&q.options.length===4&&q.options.every(s=>typeof s==='string'&&s.trim())&&new Set(q.options).size===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&typeof q.explanation==='string'&&q.explanation.trim());
}
export function gradeQuiz(quiz,answers){
 if(!validQuiz(quiz)||!Array.isArray(answers)||answers.length!==quiz.questions.length||answers.some(a=>!Number.isInteger(a)||a<0||a>3))throw Error('Answer every question before checking your round.');
 return {score:answers.reduce((n,a,i)=>n+Number(a===quiz.questions[i].answer),0),total:answers.length};
}
export function pathProgress(lessons,records){
 const completed=lessons.filter(l=>records[l.slug]?.version===l.version).length;
 return {completed,total:lessons.length,percent:lessons.length?Math.round(completed/lessons.length*100):0};
}
export function readyPaths(paths,articles){
 const bySlug=new Map(articles.map(a=>[a.slug,a]));
 return paths.filter(p=>Array.isArray(p.lessons)&&p.lessons.length>=2&&new Set(p.lessons.map(l=>l.slug)).size===p.lessons.length&&p.lessons.every(l=>bySlug.has(l.slug)&&validQuiz(bySlug.get(l.slug).quiz)));
}
