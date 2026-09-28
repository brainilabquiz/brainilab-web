/* Client-side feedback mirrors the existing admin_save_question requirements. */
window.BrainiQuestionForm = (() => {
  function validate(payload) {
    const errors=[];
    const add=(field,message)=>errors.push({field,message});
    const prompt=String(payload.p_prompt||'').trim();
    const explanation=String(payload.p_explanation||'').trim();
    if(prompt.length<4 || prompt.length>1000)add('qePrompt','Write a question between 4 and 1,000 characters.');
    if(explanation.length>3000)add('qeExplanation','Keep the explanation under 3,001 characters.');
    if(payload.p_status==='published' && explanation.length<4)add('qeExplanation','Add an explanation before publishing.');
    if(!['draft','review','published'].includes(payload.p_status))add('qeStatus','Choose draft, review or published.');
    if(!['easy','medium','hard'].includes(payload.p_difficulty))add('qeDifficulty','Choose a difficulty.');
    if(!payload.p_topic_slug)add('qeTopic','Choose an active topic.');
    const options=payload.p_options||[];
    if(options.length!==4 || options.some(o=>!String(o.text||'').trim()))add('qeOptions','Fill in all four answer options.');
    if(new Set(options.map(o=>String(o.text||'').trim().toLowerCase())).size!==4)add('qeOptions','Each answer option must be different.');
    if(options.filter(o=>o.is_correct===true).length!==1)add('qeOptions','Select exactly one correct answer.');
    const key=String(payload.p_external_key||'').trim();
    if(!payload.p_question_version_id && key && (key.length<4||key.length>160))add('qeExternal','Use an external key between 4 and 160 characters, or leave it blank.');
    const source=String(payload.p_source_url||'').trim();
    if(source){try{if(!['https:','http:'].includes(new URL(source).protocol))throw Error();}catch{add('qeSource','Use a full http or https source URL.');}}
    return errors;
  }
  return {validate};
})();
