
window.BrainiQuiz = (function(){
  function loadPack(root,topic,difficulty="easy",setNumber=1,{focusOnReady=false}={}){
    const stage=root.querySelector('.challenge-inner');
    let status=root.querySelector('[data-quiz-pack-status]');
    if(!status){
      status=document.createElement('div');
      status.className='quiz-pack-status';
      status.dataset.quizPackStatus='';
      status.setAttribute('role','status');
      root.prepend(status);
    }
    status.innerHTML='<strong></strong><p></p><button class="btn-secondary" type="button" hidden>Try again</button>';
    const heading=status.querySelector('strong'),detail=status.querySelector('p'),retry=status.querySelector('button');
    let pending=false,ready=false,focusAfterRetry=false;
    return new Promise(resolve=>{
      async function load(){
        if(pending||ready)return;
        pending=true;retry.disabled=true;
        root.setAttribute('aria-busy','true');stage.hidden=true;status.hidden=false;
        heading.textContent='Getting your questions ready…';
        detail.textContent='You can read the guide below while the quiz loads.';
        try{
          const pack=await BrainiContent.loadQuizPack(topic,difficulty,setNumber);
          if(!Array.isArray(pack?.questions)||pack.questions.length!==20)throw Error('Incomplete quiz pack');
          ready=true;status.hidden=true;stage.hidden=false;
          root.setAttribute('aria-busy','false');resolve(pack);
          if(focusOnReady||focusAfterRetry)queueMicrotask(()=>{
            if(root.isConnected&&(status.contains(document.activeElement)||document.activeElement===document.body)){
              const question=root.querySelector('[data-q]');question.tabIndex=-1;question.focus();
            }
          });
        }catch{
          root.setAttribute('aria-busy','false');
          heading.textContent='Your questions couldn’t load.';
          detail.textContent='Check your connection and try again. Your progress hasn’t changed.';
          retry.hidden=false;retry.disabled=false;
          if(focusOnReady||focusAfterRetry)retry.focus();
        }finally{pending=false;}
      }
      retry.onclick=()=>{focusAfterRetry=document.activeElement===retry;void load();};
      void load();
    });
  }

  function mountEntry(root,{gameId,name,next}){
    const entry=root.querySelector('[data-quiz-entry]');
    const stage=root.querySelector('.challenge-inner');
    const resultBox=root.querySelector('[data-inline-quiz-result]');
    const starts=[...entry.querySelectorAll('[data-quiz-start]')];
    const params=new URLSearchParams(location.search);
    const difficulty=BrainiContent.normalizeDifficulty(params.get('difficulty')||'easy');
    const set=Math.max(1,parseInt(params.get('set')||'1',10)||1);
    const level=difficulty[0].toUpperCase()+difficulty.slice(1);
    const testMode=params.get('try')==='1';
    root.querySelector('[data-difficulty-label]').textContent=level;
    entry.querySelector('[data-quiz-level]').textContent=level;
    document.querySelectorAll('[data-difficulty]').forEach(link=>{
      const selected=link.dataset.difficulty===difficulty;
      link.classList.toggle('active',selected);
      if(selected)link.setAttribute('aria-current','true');
      if(testMode){
        const destination=new URL(link.href);
        destination.searchParams.set('try','1');
        link.href=destination.href;
      }
    });

    const replay=!!window.BrainiReplay?.storageSuffix();
    starts.forEach(button=>{
      const quick=button.dataset.quizStart==='quick';
      if(quick&&replay){button.hidden=true;return;}
      button.disabled=false;
      button.onclick=async()=>{
        if(entry.hidden)return;
        entry.hidden=true;
        const pack=await loadPack(root,gameId,difficulty,set,{focusOnReady:true});
        const usingCloud=pack.source==='supabase';
        const round={};
        if(quick){
          root.querySelector('[data-difficulty-label]').textContent=`${level} practice`;
        }
        if(!quick)root.querySelector('[data-difficulty-label]').textContent=level;
        if(quick&&!testMode)window.BrainiSiteAnalytics?.gameStart(gameId,round,'practice');
        const runner=mount(root,quick?pack.questions.slice(0,5):pack.questions,{
          gameId,
          practice:quick,
          recordContentHealth:!quick,
          checkAnswer:usingCloud?(item,choice,context)=>BrainiContent.checkAnswer(item,choice,context):null,
          onComplete:async result=>{
            if(quick){
              runner.dispose();
              if(!testMode)window.BrainiSiteAnalytics?.practiceComplete(gameId,round);
              showQuickResult(resultBox,result,starts.find(start=>start.dataset.quizStart==='full'));
              stage.hidden=true;
              resultBox.hidden=false;
              resultBox.querySelector('h2').focus();
            }else{
              BrainiContent.recordAnytimeHistory(pack,result.answerDetails);
              const saved=await BrainiData.api.submitGameResult(gameId,{
                score:result.points,correct:result.correct,total:result.total,
                accuracy:Math.round(result.correct/result.total*100),timeSec:result.timeSec,
                results:result.results,answerDetails:result.answerDetails,
                contentSource:pack.source,quizPackId:pack.packId,difficulty,setNumber:set
              });
              resultBox.__brainilabResult=saved;
              if(usingCloud){
                try{await BrainiContent.verifyQuizResult(saved,pack,result.answerDetails);}
                catch(err){console.warn('BrainiLab server answer verification pending:',err.message||err);}
              }
              stage.hidden=true;
              resultBox.hidden=false;
              BrainiPostGame.mount(resultBox,{
                result:{...saved,answerDetails:result.answerDetails},gameId,name,difficulty,ads:true,next
              });
            }
          }
        });
        if(root.isConnected){
          const question=stage.querySelector('[data-q]');
          question.tabIndex=-1;
          question.focus();
        }
      };
    });
  }

  function showQuickResult(box,result,fullStart){
    box.innerHTML='<div class="quiz-pack-status"><h2 tabindex="-1"></h2><p>Practice round complete.</p><div class="quiz-entry-actions"><button class="btn" type="button">Play 20 questions</button></div></div>';
    box.querySelector('h2').textContent=`${result.correct} of ${result.total} correct`;
    box.querySelector('button').onclick=()=>{
      box.hidden=true;
      const entry=fullStart.closest('[data-quiz-entry]');
      entry.hidden=false;
      fullStart.click();
    };
  }

  function inferGameId(){
    const p=location.pathname.toLowerCase();
    if(p.includes("/games/brain-mix/")) return "brainmix";
    if(p.includes("world-flags")) return "worldflags";
    if(p.includes("world-capitals")) return "worldcapitals";
    if(p.includes("/science/")) return "science";
    if(p.includes("/history/")) return "history";
    if(p.includes("/sports/")) return "sports";
    if(p.includes("general-knowledge")) return "generalknowledge";
    return "quiz";
  }

  function mount(el, questions, opts={}){
    const analyticsRound={};
    const listeners=new AbortController();
    function trackStart(){
      const params=new URLSearchParams(location.search);
      if(opts.practice||opts.tryFirst||params.has('archive')||params.get('try')==='1')return;
      const gameId=opts.gameId||inferGameId();
      window.BrainiSiteAnalytics?.gameStart(gameId,analyticsRound,opts.dailyNumber!=null||gameId==='brainmix'?'daily':'anytime');
    }
    let index=0, correct=0, points=0, locked=false, readyForNext=false, renderToken=0, results=[], answerDetails=[], started=performance.now(), completed=false, questionStarted=performance.now();
    const healthIds=(questions||[]).map(x=>x.questionVersionId||x.questionId).filter(Boolean);
    const healthTracker=opts.recordContentHealth!==false&&window.BrainiContentHealth&&healthIds.length
      ? BrainiContentHealth.create({gameId:opts.gameId||inferGameId(),contentType:"question",contentIds:healthIds,dailyNumber:opts.dailyNumber??null})
      : null;

    const q=el.querySelector("[data-q]");
    const answers=el.querySelector("[data-answers]");
    const feedback=el.querySelector("[data-feedback]");
    const pointsEl=el.querySelector("[data-points]");
    const next=el.querySelector("[data-next]");
    const skip=el.querySelector("[data-skip]");
    const label=el.querySelector("[data-label]");
    const count=el.querySelector("[data-count]");
    const score=el.querySelector("[data-score]");
    const bar=el.querySelector("[data-bar]");
    const timer=el.querySelector("[data-timer]");

    const pointLabel=el.querySelector('.quiz-tools>span:not([data-timer])');
    if(pointLabel)pointLabel.textContent=opts.recordContentHealth===false?'Practice points':'Game points · correct answers';
    const scoreDailyNumber=opts.dailyScoreNumber??opts.dailyNumber;
    const practice=opts.practice||opts.tryFirst||new URLSearchParams(location.search).has('archive')||new URLSearchParams(location.search).get('try')==='1';
    if(!practice&&scoreDailyNumber&&(opts.gameId||inferGameId())==='brainmix'&&typeof window.BrainiData?.dailyPointsForResult==='function'){
      const dailyPoints=BrainiData.dailyPointsForResult('brainmix',{score:1000,correct:1,total:questions.length,dailyNumber:scoreDailyNumber});
      const note=document.createElement('p');note.className='quiz-score-context';
      note.textContent=`Each correct answer adds ${Number(dailyPoints).toLocaleString('en-GB')} Daily points. The counter shows 1,000 game points per answer.`;
      el.querySelector('.quiz-tools')?.after(note);
    }

    const fmt=(ms)=>{
      const s=Math.floor(ms/1000);
      return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
    };

    const timerId=timer?setInterval(()=>timer.textContent=fmt(performance.now()-started),300):null;

    function render(){
      renderToken++;
      locked=false;
      readyForNext=false;
      questionStarted=performance.now();

      // Never carry keyboard focus from an old answer into the next question.
      if(document.activeElement instanceof HTMLElement){
        document.activeElement.blur();
      }

      pointsEl?.classList.remove("show");
      if(pointsEl) pointsEl.textContent="";
      if(feedback) feedback.innerHTML="";
      if(next){
        next.hidden=true;
        next.textContent=index===questions.length-1
          ? "See result"
          : "Next question";
      }

      const item=questions[index];
      healthTracker?.checkpoint(index+1);
      q.innerHTML="";
      const number=document.createElement("span");
      number.className="question-number";
      number.textContent=`${index+1}.`;
      q.append(number);

      const questionText=String(item.q||"");
      const flagMatch=questionText.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u);
      if(flagMatch){
        const flag=flagMatch[0];
        const code=Array.from(flag)
          .map(ch=>String.fromCharCode(ch.codePointAt(0)-0x1F1E6+65))
          .join("")
          .toLowerCase();
        const cleanText=(questionText.slice(0,flagMatch.index)+questionText.slice(flagMatch.index+flag.length))
          .replace(/\s+/g," ")
          .trim();

        const flagImg=document.createElement("img");
        flagImg.className="question-flag-emoji";
        flagImg.src=window.BrainiIcons?.flagEmojiAsset
          ? BrainiIcons.flagEmojiAsset(code)
          : `../../assets/flags/emoji/${code}.png`;
        flagImg.alt=flag;
        flagImg.decoding="async";
        flagImg.addEventListener("error",()=>{
          const fallback=document.createElement("span");
          fallback.className="question-flag-text";
          fallback.textContent=flag;
          flagImg.replaceWith(fallback);
        },{once:true});

        q.append(document.createTextNode(" "),flagImg,document.createTextNode(" "+cleanText));
      }else{
        q.append(document.createTextNode(" "+questionText));
      }
      q.classList.toggle("is-long",questionText.length>68 && questionText.length<=108);
      q.classList.toggle("is-very-long",questionText.length>108);

      if(label) label.textContent=`Question ${index+1} of ${questions.length}`;
      if(count) count.textContent=`${index+1} / ${questions.length}`;
      if(score) score.textContent=points.toLocaleString('en-GB')+" game pts";
      if(bar) bar.style.width=((index+1)/questions.length*100)+"%";

      answers.innerHTML="";
      item.a.forEach((txt,i)=>{
        const b=document.createElement("button");
        const buttonToken=renderToken;
        const buttonQuestionIndex=index;

        b.type="button";
        b.className="answer";
        b.innerHTML=`<span class="key">${i+1}</span><span>${txt}</span>`;
        b.addEventListener("click",e=>{
          e.currentTarget.blur();

          // Ignore a delayed/default click from a button belonging to the
          // previous question.
          if(
            buttonToken!==renderToken ||
            buttonQuestionIndex!==index ||
            !b.isConnected
          ){
            return;
          }

          choose(i,b);
        });
        answers.appendChild(b);
      });
    }

    function localEvaluation(item,choice,responseTimeMs,skipped=false){
      const correctIndex=item.c;
      const isCorrect=!skipped && choice===correctIndex;
      return {
        isCorrect,
        correctIndex,
        correctAnswer:item.a[correctIndex],
        selectedAnswer:choice===null?null:item.a[choice],
        explanation:item.f||"",
        responseTimeMs
      };
    }

    async function evaluate(item,choice,responseTimeMs,skipped=false){
      if(typeof opts.checkAnswer==="function"){
        return opts.checkAnswer(item,choice,{
          responseTimeMs,
          skipped,
          position:index+1
        });
      }
      return localEvaluation(item,choice,responseTimeMs,skipped);
    }

    function showChecking(){
      if(feedback){
        feedback.innerHTML=`<span class="quiz-checking">Checking answer…</span>`;
      }
    }

    function enableAnswers(){
      [...answers.children].forEach(b=>b.disabled=false);
    }

    async function choose(choice,button){
      if(locked) return;
      trackStart();
      locked=true;
      readyForNext=false;

      const questionIndex=index;
      const questionToken=renderToken;
      const item=questions[index];
      const responseTimeMs=Math.max(0,Math.round(performance.now()-questionStarted));

      [...answers.children].forEach(b=>b.disabled=true);
      showChecking();

      let evaluation;
      try{
        evaluation=await evaluate(item,choice,responseTimeMs,false);
      }catch(err){
        locked=false;
        enableAnswers();
        if(feedback){
          feedback.innerHTML=`<span class="quiz-check-error">Could not check that answer. Please try again.</span>`;
        }
        console.warn("BrainiQuiz answer check:",err);
        return;
      }

      // If navigation happened while the answer RPC was in flight,
      // this response belongs to an old question and must not paint the new DOM.
      if(questionIndex!==index || questionToken!==renderToken){
        return;
      }

      const correctIndex=Number.isInteger(evaluation.correctIndex)
        ? evaluation.correctIndex
        : item.optionIds && evaluation.correctOptionId
          ? item.optionIds.indexOf(evaluation.correctOptionId)
          : item.c;

      [...answers.children].forEach((b,i)=>{
        b.disabled=true;
        if(i===correctIndex) b.classList.add("correct");
      });

      const isCorrect=!!evaluation.isCorrect;
      let gained=0;

      if(isCorrect){
        correct++;
        results.push(true);
        gained=(opts.gameId||inferGameId())==="brainmix"?1000:500;
        points+=gained;

        const correctAnswer=evaluation.correctAnswer || item.a[correctIndex] || item.a[choice];
        feedback.innerHTML=`✓ <strong>${correctAnswer}</strong><small>${evaluation.explanation||item.f||""}</small>`;

        if(pointsEl){
          pointsEl.textContent="+"+gained;
          pointsEl.classList.add("show");
        }
      }else{
        results.push(false);
        button.classList.add("wrong");

        const selectedAnswer=evaluation.selectedAnswer || item.a[choice] || "";
        const correctAnswer=evaluation.correctAnswer || item.a[correctIndex] || "";

        feedback.innerHTML=`✕ <strong>${selectedAnswer}</strong><small>Correct answer: ${correctAnswer}. ${evaluation.explanation||item.f||""}</small>`;
      }

      answerDetails.push({
        position:index+1,
        questionId:item.questionId||item.questionVersionId||null,
        questionVersionId:item.questionVersionId||null,
        questionText:item.q,
        selectedOptionId:item.optionIds?.[choice]||null,
        correctOptionId:evaluation.correctOptionId||item.optionIds?.[correctIndex]||null,
        selectedAnswer:evaluation.selectedAnswer||item.a[choice]||null,
        correctAnswer:evaluation.correctAnswer||item.a[correctIndex]||null,
        explanation:evaluation.explanation||item.f||"",
        responseTimeMs,
        isCorrect,
        pointsAwarded:gained
      });

      if(score) score.textContent=points.toLocaleString('en-GB')+" game pts";
      readyForNext=true;
      if(next) next.hidden=false;
    }

    async function doSkip(){
      if(locked) return;
      trackStart();
      locked=true;
      readyForNext=false;

      const questionIndex=index;
      const questionToken=renderToken;
      const item=questions[index];
      const responseTimeMs=Math.max(0,Math.round(performance.now()-questionStarted));
      [...answers.children].forEach(b=>b.disabled=true);
      showChecking();

      let evaluation;
      try{
        evaluation=await evaluate(item,null,responseTimeMs,true);
      }catch(err){
        locked=false;
        enableAnswers();
        if(feedback){
          feedback.innerHTML=`<span class="quiz-check-error">Could not skip this question right now. Please try again.</span>`;
        }
        console.warn("BrainiQuiz skip check:",err);
        return;
      }

      if(questionIndex!==index || questionToken!==renderToken){
        return;
      }

      const correctIndex=Number.isInteger(evaluation.correctIndex)
        ? evaluation.correctIndex
        : item.optionIds && evaluation.correctOptionId
          ? item.optionIds.indexOf(evaluation.correctOptionId)
          : item.c;

      results.push(false);

      [...answers.children].forEach((b,i)=>{
        b.disabled=true;
        if(i===correctIndex) b.classList.add("correct");
      });

      const correctAnswer=evaluation.correctAnswer || item.a[correctIndex] || "";
      feedback.innerHTML=`Skipped<small>Correct answer: ${correctAnswer}. ${evaluation.explanation||item.f||""}</small>`;

      answerDetails.push({
        position:index+1,
        questionId:item.questionId||item.questionVersionId||null,
        questionVersionId:item.questionVersionId||null,
        questionText:item.q,
        selectedOptionId:null,
        correctOptionId:evaluation.correctOptionId||item.optionIds?.[correctIndex]||null,
        selectedAnswer:null,
        correctAnswer,
        explanation:evaluation.explanation||item.f||"",
        responseTimeMs,
        isCorrect:false,
        skipped:true,
        pointsAwarded:0
      });

      readyForNext=true;
      if(next) next.hidden=false;
    }

    function advance(){
      if(completed || !readyForNext) return;

      // Consume the advance state immediately so one key press/click can never
      // advance twice.
      readyForNext=false;

      if(index<questions.length-1){
        index++;
        render();
      }else if(opts.onComplete){
        completed=true;
        healthTracker?.complete(answerDetails.map((a,i)=>({
          contentId:a.questionVersionId||a.questionId||healthIds[i],
          position:a.position||i+1,
          attempts:1,
          isCorrect:!!a.isCorrect,
          skipped:!!a.skipped,
          score:a.pointsAwarded||0,
          responseTimeMs:a.responseTimeMs
        })));
        opts.onComplete({
          correct,
          total:questions.length,
          points,
          results,
          answerDetails,
          timeSec:Math.round((performance.now()-started)/1000)
        });
      }
    }

    const listenerOptions={signal:listeners.signal};
    next?.addEventListener("click",advance,listenerOptions);
    skip?.addEventListener("click",doSkip,listenerOptions);

    document.addEventListener("keydown",e=>{
      // Game shortcuts must not consume typing or navigation elsewhere on the page.
      if(completed || !el.isConnected) return;
      const target=e.target;
      if(target?.closest?.('input,textarea,select,[contenteditable="true"]')) return;
      if(target!==document.body && !el.contains(target)) return;
      if(["1","2","3","4"].includes(e.key)&&!locked){
        e.preventDefault();
        const b=answers.children[Number(e.key)-1];
        if(b) b.click();
        return;
      }

      if(e.key==="Enter" && readyForNext){
        // A focused <button> also treats Enter as a click by default. Preventing
        // that native activation avoids a stale answer click after render().
        e.preventDefault();

        if(readyForNext){
          if(document.activeElement instanceof HTMLElement){
            document.activeElement.blur();
          }
          advance();
        }
      }
    },listenerOptions);

    render();

    return {
      dispose(){
        listeners.abort();
        clearInterval(timerId);
      },
      restart(){
        index=0;
        correct=0;
        points=0;
        results=[];
        answerDetails=[];
        completed=false;
        readyForNext=false;
        started=performance.now();
        render();
      }
    };
  }

  return {mount,loadPack,mountEntry};
})();

window.showToast=function(msg){
  const t=document.querySelector(".toast");
  if(!t)return;
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1700);
}
