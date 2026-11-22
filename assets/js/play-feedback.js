// Play feedback (Nov 2026): a short celebration when the player gets an answer right.
// It only watches the classes and feedback text the games already write, so no game logic changes.
// Confetti and the floating points are decorative (aria-hidden); the games' own feedback text stays the accessible message.
(function(){
  if(typeof window==="undefined"||typeof document==="undefined"||!window.MutationObserver)return;
  if(window.BrainiPlayFeedback)return;

  const PLAY=".labgame-shell,.connections-shell,.daily-mechanic-shell,.challenge,.brainiword-shell,.cryptic-card";
  const CONTROL="button,[role=button],input[type=submit]";
  const FEEDBACK="[data-feedback],[data-connections-feedback],.labgame-feedback,.connections-feedback,.topic-rush-feedback,.feedback";
  const COLOURS=["#ffd813","#e6680c","#e52720","#40ab34","#6a64c9","#ffffff"];
  const reduced=window.matchMedia?window.matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
  let lastControl=null,lastAt=0,lastCelebration=0,streak=0,layer=null;

  function remember(target){
    const control=target&&target.closest?target.closest(CONTROL):null;
    if(control&&control.closest(PLAY)){lastControl=control;lastAt=Date.now();}
  }
  document.addEventListener("pointerdown",event=>remember(event.target),true);
  document.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" ")remember(document.activeElement);},true);
  document.addEventListener("submit",event=>remember(event.submitter||event.target.querySelector(CONTROL)),true);

  function fxLayer(){
    if(layer&&layer.isConnected)return layer;
    layer=document.createElement("div");
    layer.className="bl-fx";
    layer.setAttribute("aria-hidden","true");
    document.body.appendChild(layer);
    return layer;
  }

  function originOf(element){
    const box=element&&element.getBoundingClientRect?element.getBoundingClientRect():null;
    if(!box||(!box.width&&!box.height))return {x:window.innerWidth/2,y:window.innerHeight/2,top:window.innerHeight/2};
    return {x:box.left+box.width/2,y:box.top+box.height/2,top:box.top};
  }

  function confetti(point,count){
    const root=fxLayer();
    for(let i=0;i<count;i++){
      const piece=document.createElement("span");
      const angle=(Math.PI*2*i)/count+Math.random()*0.5;
      const distance=60+Math.random()*(count>16?140:90);
      piece.className="bl-confetti";
      piece.style.left=`${point.x}px`;
      piece.style.top=`${point.y}px`;
      piece.style.background=COLOURS[i%COLOURS.length];
      piece.style.setProperty("--dx",`${Math.cos(angle)*distance}px`);
      piece.style.setProperty("--dy",`${Math.sin(angle)*distance-40}px`);
      piece.style.setProperty("--r",`${Math.round(Math.random()*540-270)}deg`);
      root.appendChild(piece);
      setTimeout(()=>piece.remove(),1100);
    }
  }

  function float(point,text,extra){
    const root=fxLayer();
    const label=document.createElement("span");
    label.className=`bl-float${extra?" "+extra:""}`;
    label.textContent=text;
    label.style.left=`${point.x}px`;
    label.style.top=`${Math.max(12,point.top-8)}px`;
    root.appendChild(label);
    setTimeout(()=>label.remove(),1250);
  }

  function celebrate(element,points){
    const now=Date.now();
    if(now-lastCelebration<450)return;
    lastCelebration=now;
    streak+=1;
    if(reduced.matches)return;
    const point=originOf(element);
    confetti(point,streak>=3?24:12);
    if(points)float(point,`+${points}`);
    if(streak===3||streak===5||streak===10){
      setTimeout(()=>float({x:point.x,y:point.y,top:point.top-34},`${streak} in a row!`,"is-streak"),220);
    }
  }

  function missed(element){
    streak=0;
    if(reduced.matches||!element)return;
    element.classList.remove("bl-nudge");
    void element.offsetWidth;
    element.classList.add("bl-nudge");
    setTimeout(()=>element.classList.remove("bl-nudge"),500);
  }

  function recentControl(){
    return lastControl&&Date.now()-lastAt<4000&&lastControl.isConnected?lastControl:null;
  }

  function pointsIn(text){
    const match=String(text||"").match(/\+\s?([\d,]+)\s*(?:pts|points)?/i);
    return match?match[1]:"";
  }

  // Points shown in the feedback line, or in the quiz's separate points badge.
  function pointsNear(node){
    const fromText=pointsIn(node&&node.textContent);
    if(fromText)return fromText;
    const shell=node&&node.closest?node.closest(PLAY):null;
    const badge=shell&&shell.querySelector("[data-points]");
    return badge?pointsIn(badge.textContent):"";
  }

  function readFeedback(node){
    const text=(node.textContent||"").trim();
    if(!text||/^(checking|could not)/i.test(text))return;
    node.classList.remove("bl-feedback-in");
    void node.offsetWidth;
    node.classList.add("bl-feedback-in");
    const strong=node.querySelector("strong");
    const wrongColour=strong&&/ff9b96/i.test(strong.getAttribute("style")||"");
    // "Correct connection: …" and "Correct answer: …" are shown after a wrong pick.
    if(wrongColour||/^(correct (connection|answer)|not\b|wrong\b|✕|✗|incorrect\b|life lost)/i.test(text)){
      // Games that already shake the wrong answer button do not need the feedback line to shake too.
      const shell=node.closest(PLAY);
      if(shell&&shell.querySelector(".wrong,.is-wrong"))streak=0;
      else missed(node);
    }else if(/^(✓|correct\b)/i.test(text)){
      celebrate(recentControl()||node,pointsNear(node));
    }
  }

  const pending=new Set();
  let scheduled=false;
  function flush(){
    scheduled=false;
    pending.forEach(readFeedback);
    pending.clear();
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      const target=record.target.nodeType===1?record.target:record.target.parentElement;
      if(!target||!target.closest||!target.closest(PLAY))continue;
      if(record.type==="attributes"){
        const before=` ${record.oldValue||""} `;
        const list=target.classList;
        const gained=name=>list.contains(name)&&!before.includes(` ${name} `);
        if(gained("correct")||gained("is-correct")){
          // Only the answer the player picked celebrates; the revealed right answer after a miss does not.
          const control=recentControl();
          if(control&&(control===target||target.contains(control))){
            setTimeout(()=>{
              const shell=target.closest(PLAY);
              celebrate(target,pointsNear(shell&&shell.querySelector(FEEDBACK)));
            },40);
          }
        }else if(gained("wrong")||gained("is-wrong")){
          streak=0;
        }
        continue;
      }
      const feedback=target.closest(FEEDBACK);
      if(feedback){
        pending.add(feedback);
        if(!scheduled){scheduled=true;setTimeout(flush,0);}
      }
    }
  });

  function start(){
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"],attributeOldValue:true});
  }
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start,{once:true});

  window.BrainiPlayFeedback={streak:()=>streak};
})();
