import {pathProgress} from '../lib/learning-model.js';

// Progress reflects finished lessons. XP is only confirmed by the server.
export function paintCompletion(el,records){
 const panel=el.querySelector('[data-completion-panel]');if(!panel)return;
 panel.hidden=false;
 for(const route of panel.querySelectorAll('[data-completion-route]')){
  const lessons=JSON.parse(route.dataset.lessons),p=pathProgress(lessons,records);
  route.querySelector('[data-completion-progress]').textContent=`${p.completed} of ${p.total} chapters completed · ${p.percent}%`;
  route.querySelector('progress').value=p.percent;
  const next=lessons.find(l=>records[l.slug]?.version!==l.version),link=route.querySelector('[data-completion-next]');
  link.href=next?`/learn/${next.slug}/`:route.dataset.course;
  link.textContent=next?`Continue: ${next.title}`:'Course complete — revisit your chapters';
  const follow=route.querySelector('[data-follow-course]');if(follow)follow.hidden=!!next;
 }
}
export function completionXP(el,text,state='pending'){
 const target=el.querySelector('[data-completion-xp]');if(!target)return;
 target.textContent=text;target.dataset.state=state;
}
