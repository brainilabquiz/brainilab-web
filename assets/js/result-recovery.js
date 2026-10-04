/* Replays saved evidence through the existing server verifiers, on any page. */
window.BrainiResultRecovery = (function(){
  const running=new Map();
  const uuid=value=>/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(String(value||''));
  const quizTopics={worldflags:'world-flags',europeflags:'europeflags',worldcapitals:'world-capitals',generalknowledge:'general-knowledge',science:'science',history:'history',sports:'sports'};
  const list=(value,min,max)=>Array.isArray(value)&&value.length>=min&&value.length<=max;

  function request(r){
    const args={p_client_result_id:r.clientResultId};
    let rpc,field='answerVerificationStatus',mark='markResultAnswerVerified';
    const rounds=r.roundDetails;
    if(r.gameId==='mathrush' && r.contentSource==='supabase' && r.seed && list(r.mathAnswers,1,60)){
      rpc='verify_brainilab_math_rush_result';Object.assign(args,{p_seed:r.seed,p_answers:r.mathAnswers});
    }else if(r.gameId==='survival' && list(r.survivalAnswers,1,30) && r.survivalAnswers.every(x=>uuid(x.questionId))){
      rpc='verify_brainilab_survival_result';args.p_answers=r.survivalAnswers.map(x=>({question_version_id:x.questionId,selected_option_id:x.selectedOptionId,response_time_ms:x.responseTimeMs}));
    }else if(['connections','oddoneout','higherlower','sequence','numberroute'].includes(r.gameId)){
      const count=r.gameId==='connections'?(r.dailyNumber?3:20):r.gameId==='numberroute'?3:10;
      if(!list(rounds,count,count)||!rounds.every(x=>uuid(r.gameId==='higherlower'?x.pairId:x.puzzleId)))return null;
      const names={connections:'connections',oddoneout:'odd_one_out',higherlower:'higher_lower',sequence:'sequence',numberroute:'number_route'};
      rpc='verify_brainilab_'+names[r.gameId]+'_result';
      args.p_rounds=rounds.map(x=>{
        if(r.gameId==='connections')return {puzzle_id:x.puzzleId,attempted_choice_ids:x.attemptedChoiceIds,attempts:x.attempts};
        if(r.gameId==='oddoneout')return {puzzle_id:x.puzzleId,selected_index:x.selectedIndex};
        if(r.gameId==='higherlower')return {pair_id:x.pairId,choice:x.choice};
        if(r.gameId==='sequence')return {puzzle_id:x.puzzleId,answer:x.answer};
        return {puzzle_id:x.puzzleId,operators:x.operators,attempts:x.attempts,skipped:!!x.skipped,response_time_ms:x.responseTimeMs};
      });
    }else if(['orderup','topicrush','brainiword'].includes(r.gameId)&&uuid(r.dailyChallengeId)){
      field='dailyGameVerificationStatus';mark='markDailyGameVerified';args.p_daily_challenge_id=r.dailyChallengeId;
      if(r.gameId==='orderup'&&list(r.orderUpRounds,1,10)){rpc='verify_brainilab_order_up_result';args.p_rounds=r.orderUpRounds;}
      if(r.gameId==='topicrush'&&list(r.topicRushAnswers,0,100)){rpc='verify_brainilab_topic_rush_result';args.p_answers=r.topicRushAnswers;}
      if(r.gameId==='brainiword'&&list(r.brainiwordGuesses,1,5)){rpc='verify_brainilab_brainiword_result';args.p_guesses=r.brainiwordGuesses;}
    }else if(list(r.answerDetails,1,100)&&r.answerDetails.every(x=>uuid(x.questionVersionId))){
      args.p_answers=r.answerDetails.map(x=>({question_version_id:x.questionVersionId,selected_option_id:x.selectedOptionId||null,response_time_ms:Number.isFinite(Number(x.responseTimeMs))?Math.max(0,Math.round(Number(x.responseTimeMs))):null}));
      if(r.gameId==='brainmix'&&uuid(r.dailyChallengeId)&&r.answerDetails.length===10){
        rpc='verify_brainilab_daily_result';args.p_daily_challenge_id=r.dailyChallengeId;field='dailyAnswerVerificationStatus';mark='markResultDailyVerified';
      }else if(quizTopics[r.gameId]){
        if(uuid(r.quizPackId)){rpc='verify_brainilab_quiz_result';args.p_quiz_pack_id=r.quizPackId;}
        else if(r.contentSource==='supabase'){rpc='verify_brainilab_anytime_quiz_result';args.p_topic_slug=quizTopics[r.gameId];args.p_difficulty=['easy','medium','hard'].includes(r.difficulty)?r.difficulty:'easy';}
      }
    }
    return rpc&&r[field]!=='verified'?{rpc,args,mark}:null;
  }

  async function verify(result){
    if(!result?.clientResultId||result.practice||result.tryFirst||result.cloudSyncStatus!=='synced')return false;
    const latest=window.BrainiData?.recentResults?.().find(r=>r.clientResultId===result.clientResultId);
    if(!latest)return false;
    const spec=request(latest);if(!spec)return false;
    const key=latest.clientResultId;
    if(running.has(key))return running.get(key);
    const work=(async()=>{
      const user=(await BrainiBackendAuth.getSession())?.user;
      if(!user||!BrainiCloudGames.ownsResult(latest,user.id))return false;
      const {data,error}=await BrainiCloudGames.resultRpc(spec.rpc,spec.args,user.id);
      if(error)throw error;
      if(!data||data.verified===false||data.answers_verified===false)throw new Error('Result could not be verified.');
      if(!BrainiCloudGames.ownsResult(latest,user.id))return false;
      await BrainiData.api[spec.mark](key,data);
      // Fixed question packs retain their existing question-health analytics.
      const context=spec.args.p_quiz_pack_id||spec.args.p_daily_challenge_id;
      if(context&&spec.args.p_answers&&['brainmix',...Object.keys(quizTopics)].includes(latest.gameId)){
        void BrainiCloudGames.resultRpc('record_brainilab_verified_question_answers',{
          p_client_result_id:key,p_context_type:latest.gameId==='brainmix'?'daily':'quiz_pack',p_context_id:context,p_answers:spec.args.p_answers
        },user.id).catch(()=>{});
      }
      return true;
    })();
    running.set(key,work);
    try{return await work;}finally{if(running.get(key)===work)running.delete(key);}
  }

  async function sync(){
    let verified=0,failed=0;
    for(const result of window.BrainiData?.recentResults?.()||[]){
      if(navigator.onLine===false)break;
      try{if(await verify(result))verified++;}catch(error){failed++;console.warn('BrainiLab result verification pending:',error.message||error);}
    }
    return {verified,failed};
  }
  return {sync,verify};
})();
