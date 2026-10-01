/* A teaching example only: no scores, account writes or game events. */
(()=>{
 const root=document.querySelector('[data-route-demo]');if(!root)return;
 const steps=[{before:7,next:3,op:'−',after:4,hint:'Take 3 away from 7.'},{before:4,next:6,op:'×',after:24,hint:'Make 6 groups of 4.'},{before:24,next:4,op:'+',after:28,hint:'Add the last 4.'}];
 let index=0;
 const prompt=root.querySelector('[data-demo-prompt]'),feedback=root.querySelector('[data-demo-feedback]'),history=root.querySelector('[data-demo-history]'),buttons=[...root.querySelectorAll('[data-demo-op]')];
 function draw(){const step=steps[index];prompt.textContent=step?`Step ${index+1} of 3. Your total is ${step.before}. The next number is ${step.next}. ${step.hint}`:'You reached 28! That is how a route works.';buttons.forEach(b=>b.disabled=!step);}
 buttons.forEach(button=>button.addEventListener('click',()=>{const step=steps[index];if(!step)return;if(button.dataset.demoOp!==step.op){feedback.textContent=`Try again. ${step.hint} Choose ${step.op}.`;return;}const item=document.createElement('li');item.textContent=`${step.before} ${step.op} ${step.next} = ${step.after}`;history.append(item);index++;draw();feedback.textContent=index===3?'Practice complete. You can start the game whenever you are ready. No points were added.':`Now carry ${step.after} into the next step.`;}));
 root.querySelector('[data-demo-reset]').addEventListener('click',()=>{index=0;history.replaceChildren();feedback.textContent='Example reset. Start with 7.';draw();});
 draw();
})();
