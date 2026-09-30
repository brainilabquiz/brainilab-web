/* ===== supabase-content.js ===== */

/*
  BrainiLab Cloud Content — Step 4 backend
  ----------------------------------------
  Loads finite 20-question packs from PostgreSQL through controlled RPCs.

  Initial pack payload contains:
  - question version ID
  - prompt
  - option IDs + text

  It does NOT contain:
  - correct option
  - explanation

  Correctness is requested only after the player answers/skips.
*/
window.BrainiContent = (function(){
  const TOPIC_SLUGS={
    generalknowledge:"general-knowledge",
    science:"science",
    history:"history",
    sports:"sports",
    worldcapitals:"world-capitals",
    worldflags:"world-flags"
  };

  const scriptBase=(function(){
    const src=document.currentScript?.src;
    return src ? new URL("./",src) : null;
  })();

  let fallbackLoading=null;

  function configured(){
    return !!window.BrainiBackendAuth?.isConfigured?.();
  }

  function client(){
    return window.BrainiBackendAuth?.getClient?.() || null;
  }

  function slugFor(topicKey){
    return TOPIC_SLUGS[topicKey] || topicKey;
  }

  async function ensureFallbackPacks(){
    if(window.BrainiQuizPacks) return window.BrainiQuizPacks;
    if(fallbackLoading) return fallbackLoading;

    fallbackLoading=new Promise((resolve,reject)=>{
      const s=document.createElement("script");
      s.src=scriptBase
        ? new URL("quiz-packs.js",scriptBase).href
        : "assets/js/quiz-packs.js";
      s.onload=()=>resolve(window.BrainiQuizPacks);
      s.onerror=()=>reject(new Error("Could not load local quiz fallback."));
      document.head.appendChild(s);
    });

    return fallbackLoading;
  }

  function normalizeDifficulty(value){
    const d=(value||"easy").toLowerCase();
    return ["easy","medium","hard"].includes(d)?d:"easy";
  }

  function anytimeHistoryScope(topicKey,difficulty){
    return `quiz:${String(topicKey||"").toLowerCase()}:${normalizeDifficulty(difficulty)}`;
  }

  function localPlayedQuestionIds(topicKey,difficulty){
    const scope=anytimeHistoryScope(topicKey,difficulty);
    try{
      return (window.BrainiData?.anytimePlayedIds?.(scope)||[])
        .filter(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
        .slice(0,1000);
    }catch(err){
      return [];
    }
  }

  function recordAnytimeHistory(pack,answerDetails=[]){
    if(!pack || pack.selectionMode!=="history_aware") return {};
    const ids=(answerDetails||[])
      .map(answer=>String(answer?.questionVersionId||""))
      .filter(Boolean);
    if(!ids.length) return {};
    try{
      return window.BrainiData?.recordAnytimeHistory?.(
        anytimeHistoryScope(pack.topicKey,pack.difficulty),
        ids
      )||{};
    }catch(err){
      console.warn("BrainiLab local Play Anytime history:",err?.message||err);
      return {};
    }
  }

  function mapAnytimePack(data,topicKey,difficulty){
    const questions=(data?.questions||[]).map(item=>{
      const options=item.options||[];
      return {
        q:item.prompt,
        a:options.map(o=>o.text),
        optionIds:options.map(o=>o.id),
        questionVersionId:item.question_version_id,
        cloudContent:true
      };
    });

    return {
      source:"supabase",
      selectionMode:"history_aware",
      topicKey,
      topicSlug:slugFor(topicKey),
      topicId:data?.topic_id||null,
      packId:null,
      externalKey:null,
      title:data?.title||null,
      difficulty,
      setNumber:1,
      version:1,
      totalQuestions:questions.length,
      questions
    };
  }

  function mapCloudPack(data,topicKey){
    const questions=(data?.questions||[]).map(item=>{
      const options=item.options||[];
      return {
        q:item.prompt,
        a:options.map(o=>o.text),
        optionIds:options.map(o=>o.id),
        questionVersionId:item.question_version_id,
        packPosition:item.position,
        cloudContent:true
      };
    });

    return {
      source:"supabase",
      topicKey,
      topicSlug:slugFor(topicKey),
      packId:data.pack_id,
      externalKey:data.external_key,
      title:data.title,
      difficulty:data.difficulty,
      setNumber:data.set_number,
      version:data.version,
      totalQuestions:data.total_questions,
      questions
    };
  }

  async function loadQuizPack(topicKey,difficulty="easy",setNumber=1){
    difficulty=normalizeDifficulty(difficulty);
    setNumber=Math.max(1,parseInt(setNumber,10)||1);

    if(configured()){
      const sb=client();

      // V41.4: Play Anytime is history-aware. The selector prioritises the
      // least-played published questions for this user/device, so a question
      // does not repeat until the available pool has been cycled through.
      try{
        const {data,error}=await sb.rpc("get_brainilab_anytime_quiz",{
          p_topic_slug:slugFor(topicKey),
          p_difficulty:difficulty,
          p_limit:20,
          p_exclude_question_ids:localPlayedQuestionIds(topicKey,difficulty)
        });
        if(error) throw error;
        if(data?.questions?.length===20){
          return mapAnytimePack(data,topicKey,difficulty);
        }
      }catch(err){
        console.warn("BrainiLab history-aware quiz selector unavailable; trying the fixed cloud pack:",err.message||err);
      }

      // Backwards-compatible cloud fallback if Step 22 has not been installed.
      try{
        const {data,error}=await sb.rpc("get_brainilab_quiz_pack",{
          p_topic_slug:slugFor(topicKey),
          p_difficulty:difficulty,
          p_set_number:setNumber
        });
        if(error) throw error;
        if(data?.questions?.length===20){
          return mapCloudPack(data,topicKey);
        }
      }catch(err){
        console.warn("BrainiLab cloud question pack unavailable; using local fallback:",err.message||err);
      }
    }

    const fallback=await ensureFallbackPacks();
    const questions=fallback.get(topicKey,difficulty,String(setNumber));

    return {
      source:"local",
      selectionMode:"fixed_local",
      topicKey,
      topicSlug:slugFor(topicKey),
      packId:null,
      externalKey:null,
      title:null,
      difficulty,
      setNumber,
      version:1,
      totalQuestions:questions.length,
      questions
    };
  }

  async function checkAnswer(item,choice,context={}){
    if(!item?.cloudContent){
      throw new Error("Cloud answer check requires a cloud question.");
    }

    const sb=client();
    if(!sb) throw new Error("Supabase content client unavailable.");

    const selectedOptionId=choice===null || choice===undefined
      ? null
      : item.optionIds?.[choice]||null;

    const {data,error}=await sb.rpc("check_brainilab_quiz_answer",{
      p_question_version_id:item.questionVersionId,
      p_selected_option_id:selectedOptionId
    });

    if(error) throw error;

    const correctIndex=item.optionIds.indexOf(data.correct_option_id);

    return {
      isCorrect:!!data.is_correct,
      correctOptionId:data.correct_option_id,
      correctIndex,
      correctAnswer:data.correct_answer,
      selectedAnswer:data.selected_answer,
      explanation:data.explanation,
      responseTimeMs:context.responseTimeMs||null
    };
  }


  function verificationPayload(answerDetails=[]){
    return answerDetails.map(item=>({
      question_version_id:item.questionVersionId,
      selected_option_id:item.selectedOptionId||null,
      response_time_ms:Number.isFinite(Number(item.responseTimeMs))
        ? Math.max(0,Math.round(Number(item.responseTimeMs)))
        : null
    }));
  }

  async function verifyQuizResult(result,pack,answerDetails=[]){
    if(!configured()) return {verified:false,reason:"not_configured"};
    if(!result?.clientResultId) return {verified:false,reason:"missing_result_id"};

    const session=await BrainiBackendAuth.getSession();
    if(!session?.user) return {verified:false,reason:"not_authenticated"};
    if(result.cloudSyncStatus!=="synced") return {verified:false,reason:"result_not_synced"};
    if(!Array.isArray(answerDetails) || !answerDetails.length){
      return {verified:false,reason:"incomplete_answers"};
    }

    const sb=client();
    let data;

    if(pack?.selectionMode==="history_aware"){
      const response=await sb.rpc("verify_brainilab_anytime_quiz_result",{
        p_client_result_id:result.clientResultId,
        p_topic_slug:pack.topicSlug,
        p_difficulty:pack.difficulty,
        p_answers:verificationPayload(answerDetails)
      });
      if(response.error) throw response.error;
      data=response.data;
    }else{
      if(!pack?.packId) return {verified:false,reason:"missing_pack_id"};
      const response=await sb.rpc("verify_brainilab_quiz_result",{
        p_client_result_id:result.clientResultId,
        p_quiz_pack_id:pack.packId,
        p_answers:verificationPayload(answerDetails)
      });
      if(response.error) throw response.error;
      data=response.data;

      // Fixed packs keep the Step 11 analytics recorder. History-aware packs
      // are recorded atomically by verify_brainilab_anytime_quiz_result.
      try{
        await sb.rpc("record_brainilab_verified_question_answers",{
          p_client_result_id:result.clientResultId,
          p_context_type:"quiz_pack",
          p_context_id:pack.packId,
          p_answers:verificationPayload(answerDetails)
        });
      }catch(analyticsError){
        console.warn("BrainiLab question analytics:",analyticsError?.message||analyticsError);
      }
    }

    await BrainiData.api.markResultAnswerVerified(result.clientResultId,data||{});

    window.dispatchEvent(new CustomEvent("brainilab:cloudgame",{
      detail:{type:"answers_verified",clientResultId:result.clientResultId,verification:data}
    }));

    return {verified:true,...(data||{})};
  }

  async function syncPendingVerifications(){
    if(!configured()) return {verified:0,failed:0};

    const session=await BrainiBackendAuth.getSession();
    if(!session?.user) return {verified:0,failed:0};

    const pending=await BrainiData.api.getPendingAnswerVerifications();
    let verified=0;
    let failed=0;

    for(const result of pending){
      try{
        const pack=result.quizPackId
          ? {packId:result.quizPackId,selectionMode:"fixed_pack"}
          : {
              selectionMode:"history_aware",
              topicKey:result.gameId,
              topicSlug:slugFor(result.gameId),
              difficulty:normalizeDifficulty(result.difficulty||"easy")
            };
        const response=await verifyQuizResult(result,pack,result.answerDetails);
        if(response.verified) verified++;
      }catch(err){
        failed++;
        console.warn("BrainiLab pending answer verification:",err.message||err);
      }
    }

    return {verified,failed};
  }

  function reviewMarkup(answerDetails=[]){
    return answerDetails.map((item,i)=>{
      const safeQuestion=item.questionText||"";
      return `<article class="qa">
        <h3>${i+1}. ${safeQuestion}</h3>
        <p><strong>${item.correctAnswer||""}.</strong> ${item.explanation||""}</p>
      </article>`;
    }).join("");
  }

  return {
    configured,
    slugFor,
    normalizeDifficulty,
    loadQuizPack,
    checkAnswer,
    recordAnytimeHistory,
    verifyQuizResult,
    syncPendingVerifications,
    reviewMarkup
  };
})();

/* ===== quiz.js ===== */


window.BrainiQuiz = (function(){
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
    function trackStart(){
      const params=new URLSearchParams(location.search);
      if(opts.practice||opts.tryFirst||params.has('archive')||params.get('try')==='1')return;
      const gameId=opts.gameId||inferGameId();
      window.BrainiSiteAnalytics?.gameStart(gameId,analyticsRound,opts.dailyNumber!=null||gameId==='brainmix'?'daily':'anytime');
    }
    let index=0, correct=0, points=0, locked=false, readyForNext=false, renderToken=0, results=[], answerDetails=[], started=performance.now(), completed=false, questionStarted=performance.now();
    const healthIds=(questions||[]).map(x=>x.questionVersionId||x.questionId).filter(Boolean);
    const healthTracker=window.BrainiContentHealth&&healthIds.length
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

    const fmt=(ms)=>{
      const s=Math.floor(ms/1000);
      return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");
    };

    if(timer){
      setInterval(()=>timer.textContent=fmt(performance.now()-started),300);
    }

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
      if(score) score.textContent=points.toLocaleString()+" pts";
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

      if(score) score.textContent=points.toLocaleString()+" pts";
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

    next?.addEventListener("click",advance);
    skip?.addEventListener("click",doSkip);

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
    });

    render();

    return {
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

  return {mount};
})();

window.showToast=function(msg){
  const t=document.querySelector(".toast");
  if(!t)return;
  t.textContent=msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"),1700);
}
