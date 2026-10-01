/* A local, unranked practice quiz using the same answer UI as World Flags. */
document.addEventListener('DOMContentLoaded',()=>{
 const root=document.querySelector('#europeQuiz');if(!root)return;
 const intro=root.querySelector('[data-europe-intro]'),stage=root.querySelector('[data-europe-stage]'),result=root.querySelector('[data-europe-result]'),start=root.querySelector('[data-europe-start]');
 const shuffle=items=>{const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
 const emoji=code=>[...code.toUpperCase()].map(c=>String.fromCodePoint(0x1f1e6+c.charCodeAt(0)-65)).join('');
 start.addEventListener('click',async()=>{
  if(start.disabled)return;start.disabled=true;start.textContent='Getting the flags…';root.querySelector('[data-europe-error]').hidden=true;
  try{
   const response=await fetch('/assets/data/europe-flags.json');if(!response.ok)throw Error('Flags unavailable');const flags=await response.json();
   if(flags.length!==20||new Set(flags.map(f=>f.code)).size!==20)throw Error('Incomplete set');
   const questions=shuffle(flags).map(flag=>{const choices=shuffle([flag,...shuffle(flags.filter(f=>f.code!==flag.code)).slice(0,3)]);return {q:`Which country uses this flag? ${emoji(flag.code)}`,a:choices.map(f=>f.name),c:choices.findIndex(f=>f.code===flag.code),f:flag.clue};});
   const round={};window.BrainiSiteAnalytics?.gameStart('europeflags',round,'practice');
   intro.hidden=true;stage.hidden=false;
   BrainiQuiz.mount(root,questions,{practice:true,onComplete:r=>{
    stage.hidden=true;result.hidden=false;result.replaceChildren();
    const h=document.createElement('h2');h.textContent=`You recognised ${r.correct} of ${r.total} flags.`;
    const p=document.createElement('p');p.textContent=r.correct===r.total?'Every flag found its country. Ready to go around the world?':'A few useful clues for next time. Have a look at the flags you missed.';
    const note=document.createElement('p');note.textContent='Practice result · No ranking points or XP';
    const list=document.createElement('ol');list.className='europe-review';
    r.answerDetails.filter(a=>!a.isCorrect).forEach(a=>{const li=document.createElement('li'),flag=flags.find(f=>f.name===a.correctAnswer),copy=document.createElement('div'),name=document.createElement('strong'),clue=document.createElement('p'),chosen=document.createElement('small');if(flag){const image=document.createElement('img');image.src=`/assets/flags/emoji/${flag.code}.png`;image.alt='';image.width=64;image.height=48;li.append(image);}name.textContent=a.correctAnswer;clue.textContent=a.explanation;chosen.textContent=a.skipped?'Skipped this time':`You chose ${a.selectedAnswer}.`;copy.append(name,clue,chosen);li.append(copy);list.append(li);});
    const again=document.createElement('a');again.className='btn';again.href=location.pathname;again.target='_blank';again.rel='noopener noreferrer';again.textContent='Try another round →';
    const next=document.createElement('a');next.href='/geography/world-flags-quiz/';next.target='_blank';next.rel='noopener noreferrer';next.textContent='Explore World Flags →';
    result.append(h,p,note,list,again,document.createTextNode(' '),next);result.focus();
    const invitation=document.createElement('div');invitation.dataset.accountInvite='';note.after(invitation);window.BrainiPostGame?.inviteAccount(invitation,{practice:true,gameId:'europeflags'});
    window.BrainiSiteAnalytics?.practiceComplete('europeflags',round);
   }});
   root.querySelector('[data-q]').setAttribute('tabindex','-1');root.querySelector('[data-q]').focus();
  }catch{intro.hidden=false;stage.hidden=true;start.disabled=false;start.textContent='Let’s play →';root.querySelector('[data-europe-error]').hidden=false;}
 });
});
