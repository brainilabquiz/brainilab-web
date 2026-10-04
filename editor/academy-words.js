// Small, code-owned practice scenes. Practice does not award XP or ranking points.
const scenes={
 'word-sounds':[
  {prompt:'She put the ___ in a vase of water.',clues:['vase','water'],options:['flour','flower'],answer:1,why:'A vase of water is a place for a flower. Flour is the baking ingredient.'},
  {prompt:'He stirred the ___ into the bowl to make dough.',clues:['bowl','dough'],options:['flour','flower'],answer:0,why:'Dough is made with flour. The sentence changes the meaning you need, even though the two words sound alike.'},
  {prompt:'I have one biscuit. Please give me another so I have ___.',clues:['one','another'],options:['two','too'],answer:0,why:'We are counting: one biscuit and another make two. Too can mean also.'}
 ],
 'word-meaning':[
  {prompt:'Dust the bookshelf before putting the books back. Which action fits?',clues:['dust','bookshelf'],options:['Remove the particles','Add a light coating'],answer:0,why:'This is a cleaning job. Here, dust means removing particles from the shelf.'},
  {prompt:'Dust the biscuits with sugar. Which action fits?',clues:['dust','with sugar'],options:['Remove the particles','Add a light coating'],answer:1,why:'Here, dust means sprinkling something on. With sugar is the clue that changes the job.'},
  {prompt:'The gate is held fast by a bolt. What does fast tell you?',clues:['held fast','bolt'],options:['It moves quickly','It is firmly fixed'],answer:1,why:'Held fast means firmly fixed. The gate is not moving quickly.'}
 ],
 'word-links':[
  {prompt:'Bark, trunk, leaf, root. Which link explains every clue in the tree example?',clues:['bark','trunk','leaf','root'],options:['Parts of a tree','Sounds a dog makes'],answer:0,why:'Bark covers the tree, the trunk supports it, leaves grow on it and roots anchor it. The dog sound explains only one clue.'},
  {prompt:'Shift, space, return. Which link fits these words in a computer context?',clues:['shift','space','return'],options:['Places in a garden','Keyboard keys'],answer:1,why:'All three name keyboard keys. The computer context helps you choose the meanings that belong together.'},
  {prompt:'Flour, sugar, butter, eggs. Which link fits the whole set?',clues:['flour','sugar','butter','eggs'],options:['Words with the same sound','Baking ingredients'],answer:1,why:'All four can be baking ingredients. Their shared feature is a use, not a sound.'}
 ]
};

export function wordLab(kind,controls,visual,out){
 const examples=scenes[kind];if(!examples)return false;
 let step=0;
 controls.hidden=false;controls.classList.add('word-lab-controls');
 controls.innerHTML='<p class="word-lab-counter"></p><fieldset><legend tabindex="-1"></legend><div class="lab-choices"></div></fieldset><button type="button" data-word-next>Try another clue</button>';
 const counter=controls.querySelector('.word-lab-counter'),legend=controls.querySelector('legend'),choices=controls.querySelector('.lab-choices'),next=controls.querySelector('[data-word-next]');
 function paint(moveFocus=false){
  const scene=examples[step];counter.textContent=`Clue ${step+1} of ${examples.length}`;legend.textContent=scene.prompt;
  choices.replaceChildren();
  for(const [index,label] of scene.options.entries()){
   const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed','false');
   button.addEventListener('click',()=>{
    for(const b of choices.children)b.setAttribute('aria-pressed',String(b===button));
    const correct=index===scene.answer;
    out.textContent=(correct?'That fits. ':'Not quite. ')+scene.why;
    visual.dataset.solved=String(correct);
   });choices.append(button);
  }
  visual.replaceChildren();visual.classList.add('word-lab-scene');delete visual.dataset.solved;
  for(const word of scene.clues){const chip=document.createElement('span');chip.textContent=word;visual.append(chip);}
  out.textContent='Choose an answer, then check the explanation. You can try either option.';
  next.textContent=step===examples.length-1?'Try the clues again':'Try another clue';
  if(moveFocus)legend.focus();
 }
 next.addEventListener('click',()=>{step=(step+1)%examples.length;paint(true);});paint();return true;
}
