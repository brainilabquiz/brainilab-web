import {gradeQuiz,pathProgress} from '../lib/learning-model.js';
// Each account gets its own local cache. Anonymous reading never signs a user in.
let records={},account='guest',sb=null,epoch=0,pending=null,identified=false;
const key=()=>`brainilab_learning_v1:${account}`;
const blocks=[...document.querySelectorAll('[data-quiz-slug]')];
const versions=new Map([...document.querySelectorAll('[data-path-progress]')].flatMap(el=>JSON.parse(el.dataset.lessons).map(l=>[l.slug,l.version])));
for(const el of blocks)versions.set(el.dataset.quizSlug,JSON.parse(el.querySelector('[data-quiz-data]').textContent).version);
function load(){try{const v=JSON.parse(localStorage.getItem(key())||'{}');records=v&&typeof v==='object'&&!Array.isArray(v)?v:{};}catch{records={};}}
function save(){try{localStorage.setItem(key(),JSON.stringify(records));return true;}catch{return false;}}
function paint(){
 document.querySelectorAll('[data-path-progress]').forEach(el=>{const p=pathProgress(JSON.parse(el.dataset.lessons),records);el.querySelector('[data-progress-label]').textContent=`${p.completed} of ${p.total} lessons completed · ${p.percent}%`;el.querySelector('progress').value=p.percent;});
 document.querySelectorAll('[data-lesson]').forEach(el=>{const done=records[el.dataset.lesson]?.version===el.dataset.version,n=el.querySelector('[data-lesson-number]');n.textContent=done?'✓':n.dataset.lessonNumber;n.setAttribute('aria-label',done?'Completed':'Lesson '+n.dataset.lessonNumber);el.classList.toggle('is-complete',done);el.querySelector('[data-lesson-status]').textContent=done?'Completed · revisit anytime':'Ready when you are';});
 document.querySelectorAll('[data-continue]').forEach(el=>{const lessons=JSON.parse(el.dataset.lessons),next=lessons.find(l=>records[l.slug]?.version!==l.version);el.href=next?'/learn/'+next.slug+'/':'/learn/'+lessons[0].slug+'/';el.textContent=next?(lessons[0]===next?'Start learning →':'Continue learning →'):'Revisit the lessons →';});
}
function note(text){document.querySelectorAll('[data-progress-storage]').forEach(el=>el.textContent=text);}
async function identify(session){
 const next=session?.user&&!session.user.is_anonymous?session.user.id:'guest';if(identified&&next===account)return;identified=true;
 const token=++epoch;account=next;pending=null;load();paint();
 blocks.forEach(el=>{const form=el.querySelector('form');form.reset();form.querySelectorAll('input,button').forEach(e=>e.disabled=false);form.querySelector('[type=submit]').hidden=false;form.querySelector('[data-quiz-retry]').hidden=true;el.querySelectorAll('[data-explanation]').forEach(e=>e.hidden=true);el.querySelector('[data-sync-retry]').hidden=true;el.querySelector('[data-quiz-result]').textContent='';});
 if(account==='guest'){note('Progress is saved on this browser. Completion counts finished lessons, not a measure of everything you know.');return;}
 try{
  const result=await sb.from('learn_progress').select('article_slug,quiz_version,score,total').eq('user_id',account);
  if(result.error)throw result.error;if(token!==epoch)return;
  for(const r of result.data){const expected=versions.get(r.article_slug),local=records[r.article_slug];if(expected&&r.quiz_version!==expected)continue;records[r.article_slug]={version:r.quiz_version,score:local?.version===r.quiz_version?Math.max(local.score||0,r.score):r.score,total:r.total};}save();paint();note('Your completed lessons are saved to your account. Completion counts finished lessons, not a measure of everything you know.');
 }catch{if(token===epoch)note('Account progress could not be loaded. Local progress is still available; reload to try again.');}
}
async function sync(el,quiz,answers,token){
 let error;try{({error}=await sb.rpc('complete_learn_lesson',{p_slug:el.dataset.quizSlug,p_version:quiz.version,p_answers:answers}));}catch(e){error=e;}
 if(token!==epoch)return;
 if(error){pending={el,quiz,answers,token};el.querySelector('[data-sync-retry]').hidden=false;el.querySelector('[data-quiz-result]').append(document.createTextNode(' Saved on this browser only. Account sync failed; use Retry saving.'));}
 else{pending=null;el.querySelector('[data-sync-retry]').hidden=true;el.querySelector('[data-quiz-result]').append(document.createTextNode(' Saved to your account.'));}
}
for(const el of blocks){
 const quiz=JSON.parse(el.querySelector('[data-quiz-data]').textContent),form=el.querySelector('form'),result=el.querySelector('[data-quiz-result]');form.hidden=false;
 form.addEventListener('submit',async event=>{
  event.preventDefault();await sessionReady;const submit=form.querySelector('[type=submit]');if(submit.disabled)return;
  const answers=quiz.questions.map((_,i)=>Number(new FormData(form).get('question-'+i))),token=epoch;
  if(!form.reportValidity())return;
  const score=gradeQuiz(quiz,answers);records[el.dataset.quizSlug]={version:quiz.version,...score};const persisted=save();paint();
  form.querySelectorAll('input').forEach(input=>input.disabled=true);submit.disabled=true;submit.hidden=true;form.querySelector('[data-quiz-retry]').hidden=false;
  quiz.questions.forEach((q,i)=>{const out=el.querySelector(`[data-explanation="${i}"]`);out.hidden=false;out.textContent=`${answers[i]===q.answer?'Correct.':'Answer: '+ 'ABCD'[q.answer]+'.'} ${q.explanation}`;});
  result.textContent=`${score.score} of ${score.total} correct. Round completed ✓. Read the explanations and revisit any answer you want to practise.${persisted?'':' Browser storage is unavailable; progress lasts only for this page visit.'}`;result.focus();
  if(account!=='guest'&&sb)await sync(el,quiz,answers,token);
 });
 form.querySelector('[data-quiz-retry]').onclick=()=>{form.reset();form.querySelectorAll('input,button').forEach(e=>e.disabled=false);form.querySelector('[type=submit]').hidden=false;form.querySelector('[data-quiz-retry]').hidden=true;el.querySelectorAll('[data-explanation]').forEach(e=>e.hidden=true);result.textContent='Your completed lesson stays saved while you practise again.';form.querySelector('input').focus();};
 el.querySelector('[data-sync-retry]').onclick=async()=>{if(!pending||pending.el!==el)return;const button=el.querySelector('[data-sync-retry]');button.disabled=true;try{await sync(el,pending.quiz,pending.answers,pending.token);}finally{button.disabled=false;}};
}
load();paint();
window.addEventListener('storage',e=>{if(e.key===key()){load();paint();}});
window.addEventListener('brainilab:backend-auth',e=>{sb=window.BrainiBackendAuth?.getClient();void identify(e.detail.session);});
// Resolve the existing session without creating anonymous auth users.
async function initSession(){
 try{if(window.BrainiPerf?.ensureCloud)await window.BrainiPerf.ensureCloud();sb=window.BrainiBackendAuth?.getClient();if(!sb)return;const {data}=await sb.auth.getSession();await identify(data?.session);}catch{note('Progress is saved on this browser. Sign-in is unavailable right now.');}
}
const sessionReady=initSession();
