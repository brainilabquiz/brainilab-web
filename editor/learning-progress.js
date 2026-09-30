import {gradeQuiz,pathProgress} from '../lib/learning-model.js';
import {initLabs} from './academy-labs.js';
initLabs();
const resetters=new Map();
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
 blocks.forEach(el=>resetters.get(el)?.());
 if(account==='guest'){note('Your progress is saved on this device. Finish a quick quiz to tick off a chapter.');return;}
 try{
  const result=await sb.from('learn_progress').select('article_slug,quiz_version,score,total').eq('user_id',account);
  if(result.error)throw result.error;if(token!==epoch)return;
  for(const r of result.data){const expected=versions.get(r.article_slug),local=records[r.article_slug];if(expected&&r.quiz_version!==expected)continue;records[r.article_slug]={version:r.quiz_version,score:local?.version===r.quiz_version?Math.max(local.score||0,r.score):r.score,total:r.total};}save();paint();note('Your progress follows your account. Finish a quick quiz to tick off a chapter.');
 }catch{if(token===epoch)note('Account progress could not be loaded. Local progress is still available; reload to try again.');}
}
async function sync(el,quiz,answers,token){
 let error,data;try{({error,data}=await sb.rpc('complete_learn_lesson',{p_slug:el.dataset.quizSlug,p_version:quiz.version,p_answers:answers}));}catch(e){error=e;}
 if(token!==epoch)return;
 if(error){pending={el,quiz,answers,token};el.querySelector('[data-sync-retry]').hidden=false;el.querySelector('[data-quiz-result]').append(document.createTextNode(' Saved on this browser only. Account sync failed; use Retry saving.'));}
 else{pending=null;el.querySelector('[data-sync-retry]').hidden=true;el.querySelector('[data-quiz-result]').append(document.createTextNode(data?.xp_awarded>0?` +${data.xp_awarded} XP added to your account. Ranking points stay unchanged.`:' Saved to your account. This lesson’s XP has already been collected.'));void window.BrainiProgression?.sync?.();}
}
for(const el of blocks){
 const quiz=JSON.parse(el.querySelector('[data-quiz-data]').textContent),form=el.querySelector('form'),result=el.querySelector('[data-quiz-result]');
 const fields=[...form.querySelectorAll('fieldset')],submit=form.querySelector('[type=submit]'),next=form.querySelector('[data-quiz-next]'),retry=form.querySelector('[data-quiz-retry]');
 let index=0,answers=[],checked=false,finished=false;
 form.hidden=false;
 function show(){
  fields.forEach((field,i)=>{field.hidden=i!==index;field.querySelectorAll('input').forEach(input=>input.disabled=i!==index||checked||finished);});
  form.querySelector('[data-question-counter]').textContent=finished?'Round complete':`Question ${index+1} of ${quiz.questions.length}`;
  form.querySelector('[data-round-progress]').value=answers.length;
  submit.hidden=checked||finished;submit.disabled=false;next.hidden=!checked||finished;next.textContent=index===fields.length-1?'Finish lesson ✓':'Next question →';retry.hidden=!finished;
 }
 function reset(){
  index=0;answers=[];checked=false;finished=false;pending=null;form.reset();form.querySelectorAll('button').forEach(b=>b.disabled=false);
  form.querySelectorAll('.answer').forEach(label=>label.classList.remove('correct','wrong'));
  el.querySelectorAll('[data-explanation]').forEach(e=>e.hidden=true);el.querySelector('[data-sync-retry]').hidden=true;result.textContent='';show();
 }
 resetters.set(el,reset);reset();
 form.addEventListener('submit',async event=>{
  event.preventDefault();const started=epoch;await sessionReady;if(started!==epoch||checked||finished)return;
  const selected=fields[index].querySelector('input:checked');if(!selected){form.reportValidity();return;}
  const answer=Number(selected.value),q=quiz.questions[index];answers.push(answer);checked=true;
  fields[index].querySelectorAll('label').forEach((label,j)=>{label.classList.toggle('correct',j===q.answer);label.classList.toggle('wrong',j===answer&&answer!==q.answer);});
  const explanation=el.querySelector(`[data-explanation="${index}"]`);explanation.hidden=false;explanation.textContent=`${answer===q.answer?'Correct!':'The answer is '+ 'ABCD'[q.answer]+'.'} ${q.explanation}`;show();next.focus();
 });
 next.onclick=async()=>{
  if(!checked||finished)return;
  if(index<fields.length-1){index++;checked=false;show();fields[index].querySelector('legend').focus();return;}
  finished=true;const token=epoch,score=gradeQuiz(quiz,answers);records[el.dataset.quizSlug]={version:quiz.version,...score};const persisted=save();paint();show();
  fields.forEach(field=>field.hidden=false);
  result.textContent=`${score.score} of ${score.total} correct. Lesson completed ✓. You can practise again whenever you like.${account==='guest'?' Sign in and complete the round to collect your 40 XP.':''}${persisted?'':' Browser storage is unavailable; progress lasts only for this page visit.'}`;result.focus();
  if(account!=='guest'&&sb)await sync(el,quiz,answers,token);
 };
 retry.onclick=()=>{reset();result.textContent='Your completed lesson stays saved while you practise again. Replays do not earn more XP.';fields[0].querySelector('legend').focus();};
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

// Compact chapter navigation keeps the article readable on small screens.
const chapterMedia=window.matchMedia?.("(max-width: 1000px)");
if(chapterMedia){const adapt=()=>document.querySelectorAll("[data-chapter-menu]").forEach(el=>el.open=!chapterMedia.matches);adapt();chapterMedia.addEventListener("change",adapt);}
