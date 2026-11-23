/* ===== share.js ===== */


/*
 BrainiLab Share Layer
 ---------------------
 Shared modal + text/image generation for all game types.
 Depends on BrainiData.
*/
window.BrainiShare = (function(){
  let modal;

  function bindEscCloser(node){
    if(node.__escBound) return;
    node.__escBound = true;
    node.addEventListener("keydown", e=>{
      if(e.key === "Escape"){
        node.classList.remove("show");
      }
    });
  }

  function ensureModal(){
    if(modal) return modal;
    modal=document.createElement("div");
    modal.className="share-modal";
    modal.tabIndex=-1;
    modal.innerHTML=`
      <div class="share-sheet share-sheet-compact" role="dialog" aria-modal="true" aria-label="Share result">
        <button class="share-close" type="button" aria-label="Close share options">×</button>
        <div class="share-preview" data-share-preview></div>
        <div class="share-icon-actions" aria-label="Share result options">
          <button class="share-icon-btn whatsapp" data-channel="whatsapp" type="button" aria-label="Share on WhatsApp" title="WhatsApp">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.5-1.7a11.8 11.8 0 0 0 5.4 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.1-1.2-6-3.5-8.4Zm-8.4 18.2h-.1a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.9 1 1-3.8-.2-.4a9.8 9.8 0 1 1 8.6 4.8Zm5.4-7.3c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-1.7-.8-2.8-1.5-3.9-3.4-.3-.5.3-.5.8-1.6.1-.2 0-.4 0-.5 0-.2-.7-1.8-1-2.4-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.3 3.4 1.5 3.6c.2.2 2.5 3.8 6 5.3.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.4Z"/></svg>
          </button>
          <button class="share-icon-btn telegram" data-channel="telegram" type="button" aria-label="Share on Telegram" title="Telegram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22.9 2.3 19.5 21c-.3 1.3-1 1.6-2 1l-5.2-3.8-2.5 2.4c-.3.3-.5.5-1 .5l.4-5.3 9.6-8.7c.4-.4-.1-.6-.6-.2L6.3 14.4 1.2 12.8c-1.1-.3-1.1-1.1.2-1.6L21.3 1.5c.9-.3 1.8.2 1.6.8Z"/></svg>
          </button>
          <button class="share-icon-btn x" data-channel="x" type="button" aria-label="Share on X" title="X">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.2 2H22l-8.3 9.5L23.5 22h-7.7l-6-7.8L3 22H-.8l8.9-10.2L-1.3 2h7.9l5.4 7.1L18.2 2Zm-1.4 18h2.1L5.4 3.9H3.1L16.8 20Z"/></svg>
          </button>
          <button class="share-icon-btn facebook" data-channel="facebook" type="button" aria-label="Share on Facebook" title="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1v-3.5h3V9.5c0-3 1.8-4.7 4.6-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9v2.2h3.4l-.5 3.5h-2.9V24C19.6 23.1 24 18.1 24 12.1Z"/></svg>
          </button>
          <button class="share-icon-btn copy" data-action="copy" type="button" aria-label="Copy result" title="Copy result">
            ${BrainiIcons.product("copy-result","share-system-icon")}
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".share-close").onclick=()=>modal.classList.remove("show");
    modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.remove("show")});
    bindEscCloser(modal);
    return modal;
  }

  function emojiGrid(result){
    if(result.gameId==="topicrush") return "";
    if(result.gameId==="brainiword"){
      if(Array.isArray(result.evaluations)){
        return result.evaluations.map(row=>row.map(s=>s==="correct"?"🟩":s==="present"?"🟨":"⬛").join("")).join("\n");
      }
      if(Array.isArray(result.pattern)){
        const rows=[];
        for(let i=0;i<result.pattern.length;i+=5){
          rows.push(result.pattern.slice(i,i+5).map(s=>s==="correct"?"🟩":s==="present"?"🟨":"⬛").join(""));
        }
        return rows.join("\n");
      }
    }
    if(Number.isFinite(result.correct) && Number.isFinite(result.total) && result.total<=20){
      const cells=[];
      for(let i=0;i<result.total;i++) cells.push(i<result.correct?"🟩":"🟥");
      const rows=[];
      for(let i=0;i<cells.length;i+=5) rows.push(cells.slice(i,i+5).join(""));
      return rows.join("\n");
    }
    return "";
  }

  function resultHeadline(gameId,result){
    if(gameId==="brainiword") return result.won ? `${result.attempts}/5` : "X/5";
    if(gameId==="flagdash") return `${result.correct||0} flags`;
    if(gameId==="orderup") return `${Number(result.score||0).toLocaleString()} / 2,500`;
    if(gameId==="topicrush") return `${result.correct||0} answers`;
    if(gameId==="connections") return `${Number(result.score||0).toLocaleString()} / 3,000`;
    if(gameId==="maphunt") return `${(result.score||0).toLocaleString()} pts`;
    if(Number.isFinite(result.correct)&&Number.isFinite(result.total)) return `${result.correct}/${result.total}`;
    if(Number.isFinite(result.score)) return `${result.score.toLocaleString()} pts`;
    return "Completed";
  }

  function extraLines(gameId,result){
    const lines=[];
    if(gameId==="flagdash"){
      if(result.accuracy!=null) lines.push(`${result.accuracy}% accuracy`);
      if(result.bestCombo!=null) lines.push(`🔥 Best combo: ${result.bestCombo}`);
    } else if(gameId==="orderup"){
      if(result.accuracy!=null) lines.push(`${Math.round(Number(result.accuracy))}% order accuracy`);
      if(result.correct!=null) lines.push(`${Number(result.correct)} / 20 exact positions`);
    } else if(gameId==="topicrush"){
      if(result.topicTitle) lines.push(result.topicTitle);
      if(result.score!=null) lines.push(`${Number(result.score).toLocaleString()} Topic Rush points`);
    } else if(gameId==="connections"){
      if(result.attempts!=null) lines.push(`${Number(result.attempts)} total attempts`);
      if(result.score!=null) lines.push(`${Number(result.score).toLocaleString()} Connections points`);
    } else if(gameId==="maphunt"){
      if(result.avgDistanceKm!=null) lines.push(`Average distance: ${result.avgDistanceKm} km`);
      if(result.accuracy!=null) lines.push(`${result.accuracy}% accuracy`);
    } else if(gameId!=="brainiword"){
      if(result.accuracy!=null) lines.push(`${result.accuracy}% accuracy`);
      if(result.score!=null && Number.isFinite(result.correct)) lines.push(`${result.score.toLocaleString()} pts`);
    }
    if(result.percentile!=null) lines.push(`🏆 Top ${result.percentile}%`);
    if(result.streakAfter!=null) lines.push(`🔥 ${result.streakAfter} day streak`);
    return lines;
  }

  async function buildText(gameId,result,channel="native"){
    const def=BrainiData.game(gameId);
    const daily=result.dailyNumber ? ` #${result.dailyNumber}` : "";
    const url=await BrainiData.api.getShareUrl(gameId,channel);
    const grid=emojiGrid(result);
    const parts=[
      `${def?.name||"BrainiLab"}${daily} ${def?.icon||"🧠"}`,
      "",
      resultHeadline(gameId,result)
    ];
    const extras=extraLines(gameId,result);
    if(extras.length) parts.push(...extras);
    if(grid) parts.push("",grid);
    parts.push("","Can you beat me?",url);
    return parts.join("\n");
  }

  function previewHtml(gameId,result){
    const def=BrainiData.game(gameId);
    const daily=result.dailyNumber ? ` #${result.dailyNumber}` : "";
    const grid=emojiGrid(result);
    const extras=extraLines(gameId,result).map(x=>`<div>${x}</div>`).join("");
    return `
      <div class="share-card">
        <div class="share-card-brand">BrainiLab</div>
        <div class="share-card-game">${def?.icon||"🧠"} ${def?.name||"Game"}${daily}</div>
        <div class="share-card-score">${resultHeadline(gameId,result)}</div>
        <div class="share-card-extra">${extras}</div>
        ${grid?`<pre class="share-card-grid">${grid}</pre>`:""}
        <div class="share-card-cta">Can you beat me?</div>
      </div>`;
  }

  function canvasCard(gameId,result,format="square"){
    const w=1080;
    const h=format==="story"?1920:1080;
    const c=document.createElement("canvas");
    c.width=w;c.height=h;
    const ctx=c.getContext("2d");
    const navy="#2D296E", yellow="#FFD813", green="#40AB34", white="#FFFFFF", muted="#D9D7F4";
    ctx.fillStyle=navy;ctx.fillRect(0,0,w,h);

    const colors=["#E6680C","#FFD813","#E52720","#40AB34","#2D296E"];
    colors.forEach((col,i)=>{ctx.fillStyle=col;ctx.fillRect(i*w/5,0,w/5,18)});

    ctx.textAlign="center";
    ctx.fillStyle=white;ctx.font="900 54px Montserrat, Arial";
    ctx.fillText("BrainiLab",w/2,format==="story"?260:150);

    const def=BrainiData.game(gameId);
    ctx.font="800 42px Montserrat, Arial";ctx.fillStyle=muted;
    ctx.fillText(`${def?.name||"Game"}${result.dailyNumber?" #"+result.dailyNumber:""}`,w/2,format==="story"?365:250);

    ctx.fillStyle=yellow;ctx.font="900 118px Montserrat, Arial";
    ctx.fillText(resultHeadline(gameId,result),w/2,format==="story"?650:475);

    let y=format==="story"?770:585;
    ctx.fillStyle=white;ctx.font="800 35px Montserrat, Arial";
    extraLines(gameId,result).forEach(line=>{ctx.fillText(line.replace(/[🏆🔥]/g,""),w/2,y);y+=55});

    const grid=emojiGrid(result);
    if(grid){
      y+=35;
      ctx.font="44px Arial";
      grid.split("\n").forEach(row=>{ctx.fillText(row,w/2,y);y+=62});
    }

    ctx.fillStyle=white;ctx.font="900 38px Montserrat, Arial";
    ctx.fillText("CAN YOU BEAT ME?",w/2,format==="story"?1680:930);
    ctx.fillStyle=green;ctx.fillRect(w/2-190,(format==="story"?1735:965),380,8);
    return c;
  }

  async function nativeShare(gameId,result){
    const text=await buildText(gameId,result,"native");
    if(navigator.share){
      try{
        await navigator.share({title:"BrainiLab result",text});
        await BrainiData.api.recordShare(gameId,"native",{resultId:result.id});
        return true;
      }catch(e){}
    }
    return false;
  }

  async function copyResult(gameId,result){
    const text=await buildText(gameId,result,"copy");
    try{
      await navigator.clipboard.writeText(text);
      showToast("Result copied");
      await BrainiData.api.recordShare(gameId,"copy",{resultId:result.id});
      return true;
    }catch(e){
      showToast("Copy failed");
      return false;
    }
  }

  async function copyLink(gameId,result){
    const url=await BrainiData.api.getShareUrl(gameId,"copy_link");
    try{
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
      await BrainiData.api.recordShare(gameId,"copy_link",{resultId:result?.id});
      return true;
    }catch(e){
      showToast("Copy failed");
      return false;
    }
  }

  async function shareImage(gameId,result){
    const c=canvasCard(gameId,result,window.innerHeight>window.innerWidth?"story":"square");
    const blob=await new Promise(r=>c.toBlob(r,"image/png",.95));
    const file=new File([blob],`brainilab-${gameId}-result.png`,{type:"image/png"});
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file],title:"BrainiLab result"});
        await BrainiData.api.recordShare(gameId,"image",{resultId:result.id});
        return true;
      }catch(e){}
    }
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=file.name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
    await BrainiData.api.recordShare(gameId,"image_download",{resultId:result.id});
    showToast("Image downloaded");
    return true;
  }

  async function channelShare(channel,gameId,result){
    const text=await buildText(gameId,result,channel);
    const url=await BrainiData.api.getShareUrl(gameId,channel);
    const encText=encodeURIComponent(text);
    const encUrl=encodeURIComponent(url);
    let href="";
    if(channel==="whatsapp") href=`https://wa.me/?text=${encText}`;
    if(channel==="telegram") href=`https://t.me/share/url?url=${encUrl}&text=${encodeURIComponent(text.replace(url,"").trim())}`;
    if(channel==="x") href=`https://twitter.com/intent/tweet?text=${encText}`;
    if(channel==="facebook") href=`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`;
    if(href) window.open(href,"_blank","noopener,noreferrer");
    await BrainiData.api.recordShare(gameId,channel,{resultId:result.id});
    return true;
  }

  async function open(gameId,result){
    const m=ensureModal();
    m.querySelector("[data-share-preview]").innerHTML=previewHtml(gameId,result);
    m.classList.add("show");
    m.focus();

    const copy=m.querySelector("[data-action='copy']");

    copy.onclick=()=>copyResult(gameId,result);
    m.querySelectorAll("[data-channel]").forEach(
      b=>b.onclick=()=>channelShare(b.dataset.channel,gameId,result)
    );
  }

  return {
    open, buildText, canvasCard,
    nativeShare, copyResult, copyLink, shareImage, channelShare
  };
})();

/* ===== friend-challenge.js ===== */

/* Voluntary, spoiler-free invitations to the same UTC Daily. No contacts or player IDs. */
window.BrainiFriendChallenge=(()=>{
 const today=()=>new Date().toISOString().slice(0,10);
 const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
 const label=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
 const dateFor=status=>window.BrainiData?.dateForDailyNumber?.(status?.dailyNumber);
 function buildInvite(status,day=today()){
  const date=dateFor(status);
  if(!validDate(date)||date!==day||!Number.isInteger(status?.dailyNumber)||status.dailyNumber<1)return null;
  const model=window.BrainiDailyRules?.model(date);
  if(model?.version==='daily-choice-v1'){
    const primary=status.games?.[model.primary],name=window.BrainiDailyJourney?.META?.[model.primary]?.name||'Daily',score=Math.max(0,Math.min(2500,Number(primary?.points)||0));
    const url='https://brainilabgames.com/daily-quiz/?friend='+date;
    const text=(primary?.completed?`I got ${score.toLocaleString('en-GB')} points in today’s ${name} 😄\nThink you can beat me? Your turn!`:'Fancy a quick challenge? 😄\nTry today’s BrainiLab Daily with me — let’s see who gets the higher score.')+'\n\n'+url;
    return {date,url,text,title:'Your turn! Try today’s Daily',gameId:model.primary,gameName:name,score:primary?.completed?score:null};
  }
  const completed=Math.max(0,Math.min(4,Math.floor(Number(status.completedCount)||0)));
  const score=Math.max(0,Math.min(completed*2500,Math.floor(Number(status.brainScore)||0)));
  const url='https://brainilabgames.com/daily-quiz/?friend='+date;
  const progress=completed===4?`Just finished today’s BrainiLab Daily — ${score.toLocaleString('en-GB')} points 😄\nYour turn! Think you can beat me?`:completed?`I’m trying today’s BrainiLab Daily — ${completed} ${completed===1?'game':'games'} down, ${4-completed} to go 😄\nFancy joining me? Let’s finish all four and compare scores.`:'Fancy a little challenge? 😄\nLet’s try today’s BrainiLab Daily and see who gets the higher score.';
  const text=`${progress}\n\n${url}`;
  return {date,url,text,title:'Try the BrainiLab Daily with me'};
 }
 function invitationState(search=location.search,day=today()){
  const params=new URLSearchParams(search);if(!params.has('friend'))return null;
  const date=params.get('friend');
  if(params.getAll('friend').length!==1||!validDate(date)||date>day)return {kind:'invalid',title:'Let’s play today’s Daily',text:'This invitation is not valid, but today’s challenge is ready below.'};
  if(date<day)return {kind:'expired',title:'A new Daily is ready',text:`That invitation was for ${label(date)}. Today has a different set of games, so compare results from the same day.`};
  return {kind:'current',title:'You’ve been challenged!',text:'Play the same main Daily as your friend, then compare your main-game points. No account needed. Today ends at 00:00 UTC.'};
 }
 function renderInvitation(){
  const root=document.querySelector('[data-friend-invitation]');if(!root)return;
  const state=invitationState();root.hidden=!state;
  if(!state){root.replaceChildren();return;}
  const title=document.createElement('strong'),copy=document.createElement('p');title.textContent=state.title;copy.textContent=state.text;
  root.replaceChildren(title,copy);root.dataset.invitationState=state.kind;
 }
 let modal,opener;
 function ensureModal(){
  if(modal)return modal;
  modal=document.createElement('dialog');modal.className='friend-dialog';modal.setAttribute('aria-labelledby','friend-dialog-title');
  modal.innerHTML='<div class="friend-dialog-head"><h2 id="friend-dialog-title">Challenge a friend</h2><button type="button" data-friend-close aria-label="Close invitation">×</button></div><div class="friend-preview" hidden></div><p>Add their name or a line of your own.</p><label for="friend-invitation-text">Your message</label><textarea id="friend-invitation-text" rows="7" maxlength="3000"></textarea><div class="friend-dialog-actions"><button type="button" data-friend-copy>Copy invitation</button><button type="button" data-friend-share hidden>Share…</button></div><p class="friend-dialog-status" role="status" aria-live="polite"></p><p class="friend-dialog-note">The same Daily is available until 00:00 UTC.</p>';
  document.body.append(modal);
  modal.querySelector('[data-friend-close]').onclick=()=>modal.close();
  modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)modal.close();}});
  modal.addEventListener('close',()=>{if(opener?.isConnected)opener.focus();});
  return modal;
 }
 function open(status,trigger=document.activeElement){
  const invite=buildInvite(status);if(!invite)return false;
  const dialog=ensureModal(),copy=dialog.querySelector('[data-friend-copy]'),share=dialog.querySelector('[data-friend-share]'),feedback=dialog.querySelector('[role="status"]');
  const preview=dialog.querySelector('.friend-preview');preview.replaceChildren();preview.hidden=!invite.gameId;
  if(invite.gameId){const art=document.createElement('span'),detail=document.createElement('div'),game=document.createElement('strong'),target=document.createElement('span');art.className='friend-preview-art';art.innerHTML=window.BrainiIcons?.game?.(invite.gameId,'mini')||'';game.textContent=invite.gameName;target.textContent=invite.score===null?'Same game. Your turn.':invite.score.toLocaleString('en-GB')+' points to beat';detail.append(game,target);preview.append(art,detail);}
  const field=dialog.querySelector('textarea');field.value=invite.text;feedback.textContent='';copy.textContent='Copy invitation';copy.disabled=false;share.disabled=false;share.hidden=typeof navigator.share!=='function';opener=trigger;
  async function send(method){
   if(invite.date!==today()){feedback.textContent='That Daily has ended. Open today’s Daily to send a fresh invitation.';copy.disabled=true;share.disabled=true;return;}
   const message=field.value.trim();if(!message){feedback.textContent='Write your message first.';field.focus();return;}
   copy.disabled=true;share.disabled=true;
   try{
    if(method==='copy'){if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);feedback.textContent='Copied. Paste it into your chat when you’re ready.';copy.textContent='Copied ✓';}
    else{await navigator.share({title:invite.title,text:message});feedback.textContent='Invitation ready to share.';}
    window.dispatchEvent(new CustomEvent('brainilab:friendchallenge',{detail:{method}}));
   }catch(error){
    if(error?.name!=='AbortError'){feedback.textContent='Couldn’t share automatically. Select and copy the invitation above.';field.focus();field.select();}
   }finally{copy.disabled=false;share.disabled=false;}
  }
  copy.onclick=()=>send('copy');share.onclick=()=>send('share');if(!dialog.open)dialog.showModal();copy.focus();return true;
 }
 function mount(container,status){
  if(!container||!buildInvite(status))return;
  container.querySelector('[data-friend-challenge]')?.remove();
  const box=document.createElement('div');box.className='friend-challenge';box.dataset.friendChallenge='';
  const button=document.createElement('button'),note=document.createElement('span');button.type='button';button.textContent='Challenge a friend';note.textContent='Same Daily. No spoilers.';
  button.onclick=()=>{if(!open(status,button)){note.textContent='A new Daily has started.';button.disabled=true;}};
  box.append(button,note);container.append(box);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderInvitation);else renderInvitation();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)renderInvitation();});
 if(new URLSearchParams(location.search).has('friend'))setInterval(renderInvitation,60000);
 return {buildInvite,invitationState,renderInvitation,open,mount};
})();

/* ===== friend-replay-contract.js ===== */

/* Public content only: a stable contract for the exact questions and their displayed order. */
window.BrainiReplayContract=(()=>{
 const quizzes=new Set(['brainmix','worldflags','worldcapitals','generalknowledge','science','history','sports']);
 const quizLike=g=>quizzes.has(g)||g==='survival';
 const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,'0');};
 const quizKey=q=>'q:'+hash(q.q+'\0'+q.a.join('\0'));
 const family=g=>quizzes.has(g)?'quiz':g;
 const clean=v=>JSON.parse(JSON.stringify(v));
 function project(g,p){
  if(quizLike(g))return (p.questions||[]).map(q=>({id:String(q.questionVersionId||q.id||quizKey(q)),q:q.q,a:q.a,options:q.optionIds||null,...(p.source==='local'?{answer:q.c}:{}),...(g==='survival'?{difficulty:q.difficulty,topic:q.topic}: {})}));
  if(g==='connections')return p.rounds.map(q=>({id:String(q.id),prompt:q.prompt||'What connects these?',clues:q.clues,choices:q.choices.map(c=>({id:String(c.id),text:c.text})),...(p.source==='local'?{answer:q.correct}: {})}));
  if(g==='sequence')return p.rounds.map(q=>({id:String(q.id),sequence:q.sequence,options:q.options,...(p.source==='local'?{answer:q.answer}: {})}));
  if(g==='oddoneout')return p.rounds.map(q=>({id:String(q.id),prompt:q.prompt||'Which one does not belong?',items:q.items,...(p.source==='local'?{answer:q.odd}: {})}));
  if(g==='higherlower')return p.rounds.map(q=>({id:String(q.id),type:q.type||q.comparisonType||'higher_lower',metric:q.metric,left:q.left,leftValue:q.leftValue,right:q.right,unit:q.unit||'',...(p.source==='local'?{answer:q.rightValue}: {})}));
  if(g==='numberroute')return p.rounds.map(q=>({id:String(q.id),numbers:q.numbers,target:q.target,...(p.source==='local'?{answer:q.solution}: {})}));
  if(g==='mathrush')return {seed:p.seed,operations:p.operations.map(q=>({position:q.position,a:q.a,b:q.b,op:q.op,display:q.display}))};
  if(g==='orderup')return p.rounds.map(q=>({id:String(q.roundId),title:q.title,prompt:q.prompt,directionLabel:q.directionLabel,items:q.items,...(p.source==='local'?{answer:q.canonicalItems}: {})}));
  if(g==='topicrush')return {id:String(p.topicId),title:p.title,prompt:p.prompt,targetCount:p.targetCount,durationSeconds:p.durationSeconds,...(p.source==='local'?{answer:p.localAnswers}: {})};
  if(g==='brainiword')return {id:String(p.contentRef||'word:'+hash(p.fallbackAnswer)),letters:p.letters,attempts:p.attempts,...(p.source==='local'?{answer:p.fallbackAnswer}: {})};
  if(g==='reasoning')return p.questions;
  throw Error('Unsupported game');
 }
 const canonical=value=>JSON.stringify((function sort(v){return Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;})(value));
 function spec(g,p,settings=null){
  const source=p.source==='supabase'?'supabase':'local',rows=quizLike(g)?p.questions:g==='orderup'?p.rounds:g==='reasoning'?p.questions:p.rounds||[];
  const ids=rows.map(q=>String(quizLike(g)?q.questionVersionId||q.id||quizKey(q):g==='orderup'?q.roundId:q.id));
  const choices=rows.map(q=>quizLike(g)?q.optionIds||[]:g==='connections'?q.choices.map(c=>c.id):g==='sequence'?q.options:g==='orderup'?q.items.map(c=>c.itemId):[]);
  const keys=['dailyChallengeId','challengeDate','dailyNumber','generationVersion','totalQuestions','topicKey','topicSlug','topicId','difficulty','setNumber','version','selectionMode','totalRounds','itemsPerRound'];
  const meta=Object.fromEntries(keys.filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));
  settings=settings||p.friendSettings||{date:p.challengeDate||null,difficulty:quizzes.has(g)&&g!=='brainmix'?p.difficulty||'easy':null,rounds:({brainmix:10,brainiword:1,orderup:20,topicrush:p.targetCount,mathrush:60,survival:30,reasoning:12,connections:20}[g]|| (quizzes.has(g)?20:10))};
  return {source,ids,choices,seed:p.seed||null,topicId:p.topicId||null,wordId:p.contentRef||p.fallbackAnswer&&'word:'+hash(p.fallbackAnswer)||null,meta,settings};
 }
 return {quizzes,family,hash,quizKey,project,canonical,spec,clean};
})();

/* ===== game-challenge-model.js ===== */

/* A shared score target, never a saved result. No identities, answers or contacts in links. */
window.BrainiGameChallengeModel=(()=>{
 const games=Object.freeze({
  brainmix:{name:'Brain Mix',path:'/games/brain-mix/',max:10000,daily:true,n:10},
  brainiword:{name:'BrainiWord',path:'/games/brainiword/',max:2500,daily:true,n:1},
  orderup:{name:'Order Up',path:'/games/order-up/',max:2500,daily:true,n:20},
  topicrush:{name:'Topic Rush',path:'/games/topic-rush/',max:2500,daily:true,n:0},
  connections:{name:'Connections',path:'/games/connections/',max:20000,n:20},
  oddoneout:{name:'Odd One Out',path:'/games/odd-one-out/',max:1000,n:10},
  higherlower:{name:'Higher or Lower',path:'/games/higher-lower/',max:1700,n:10},
  mathrush:{name:'Math Rush',path:'/games/math-rush/',max:6000,n:60},
  numberroute:{name:'Number Route',path:'/games/number-route/',max:2500,n:10},
  sequence:{name:'Sequence',path:'/games/sequence/',max:2500,n:10},
  survival:{name:'Survival',path:'/games/survival/',max:12000,n:30},
  reasoning:{name:'Reasoning Challenge',path:'/reasoning/',max:12,n:12},
  worldflags:{name:'World Flags',path:'/geography/world-flags-quiz/',max:10000,quiz:true,n:20},
  worldcapitals:{name:'World Capitals',path:'/geography/world-capitals-quiz/',max:10000,quiz:true,n:20},
  generalknowledge:{name:'General Knowledge',path:'/general-knowledge/general-knowledge-quiz/',max:10000,quiz:true,n:20},
  science:{name:'Science',path:'/science/science-quiz/',max:10000,quiz:true,n:20},
  history:{name:'History',path:'/history/history-quiz/',max:10000,quiz:true,n:20},
  sports:{name:'Sports',path:'/sports/sports-quiz/',max:10000,quiz:true,n:20}
 });
 const today=()=>new Date().toISOString().slice(0,10);
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&v>='2026-08-29'&&v<=today()&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 const integer=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
 const cleanPath=p=>p.replace(/index\.html$/,'').replace(/\/?$/,'/');
 const gameAt=p=>Object.keys(games).find(id=>games[id].path===cleanPath(p))||null;
 function hash(value){let h=2166136261;for(const c of value){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
 function valid(c){
  const g=games[c?.g];
  if(!g||![1,2].includes(c.v)||!integer(c.s,g.max)||!integer(c.n,60))return false;
  if(c.d!==null&&!date(c.d))return false;
  if(g.daily&&!c.d)return false;
  if(g.quiz?!['easy','medium','hard'].includes(c.l):c.l!==null)return false;
  const n=c.d&&['connections','numberroute'].includes(c.g)?3:g.n;
  if(n&&c.n!==n)return false;
  if(c.g==='topicrush'&&!(c.n>=1&&c.n<=60))return false;
  if(c.g==='connections'&&c.d&&c.s>3000)return false;
  return (c.k===null||typeof c.k==='string'&&/^[0-9a-f]{8}$/.test(c.k))&&(c.v===1||c.p===null||typeof c.p==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.p));
 }
 function describe(gameId,result={},options={}){
  const g=games[gameId];if(!g)return null;
  const s=Number(result.score??result.points);if(!integer(s,g.max))return null;
  const params=new URLSearchParams(location.search);
  const dailyNumber=result.archiveDailyNumber||result.dailyNumber;
  const rawDay=result.challengeDate||(dailyNumber&&window.BrainiData?.dateForDailyNumber?.(dailyNumber))||((g.daily||params.has('daily')||params.has('archive'))&&(params.get('archive')||params.get('daily')||today()));
  const d=rawDay&&date(rawDay)?rawDay:null;if(rawDay&&!d)return null;
  const n=d&&['connections','numberroute'].includes(gameId)?3:gameId==='topicrush'?Number(result.targetCount||result.total):g.n;
  if(!['survival','mathrush','topicrush'].includes(gameId)&&Number(result.total)!==n)return null;
  const l=g.quiz?(options.difficulty||result.difficulty||params.get('difficulty')||'easy'):null;
  const rows=gameId==='orderup'?result.orderUpRounds:gameId==='brainmix'||g.quiz?result.answerDetails:result.roundDetails;
  const ids=gameId==='mathrush'?[result.seed]:(rows||[]).map(r=>r.puzzleId||r.pairId||r.questionVersionId||r.questionId||r.round_id);
  const source=result.contentSource||result.dailyContentSource||'';
  const k=d?hash(JSON.stringify([source,ids.filter(Boolean),result.topicId||null,result.contentRef||null])):gameId==='reasoning'?hash(String(result.challengeVersion||'')):null;
  const c={v:2,g:gameId,s,d,l,n,k,p:window.BrainiReplay?.packId(gameId)||null};return valid(c)?c:null;
 }
 function parse(fragment=location.hash){
  const m=/^#friend=([A-Za-z0-9_-]{40,500})$/.exec(fragment);if(!m)return null;
  try{const c=JSON.parse(atob(m[1].replace(/-/g,'+').replace(/_/g,'/')));return valid(c)?{v:c.v,g:c.g,s:c.s,d:c.d,l:c.l,n:c.n,k:c.k,...(c.v===2?{p:c.p}:{})}:null;}catch{return null;}
 }
 function url(c){
  if(!valid(c)||c.v!==2||!c.p)return null;
  const u=new URL(games[c.g].path,'https://brainilabgames.com');u.searchParams.set('try','1');
  if(c.d)u.searchParams.set('archive',c.d);
  if(c.l)u.searchParams.set('difficulty',c.l);
  u.hash='friend='+btoa(JSON.stringify(c)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');return u.href;
 }
 function incoming(){
  const c=parse(),p=new URLSearchParams(location.search);
  if(!c||c.v===2&&!c.p||gameAt(location.pathname)!==c.g||p.get('try')!=='1')return null;
  if(c.d&&(p.get('archive')!==c.d||p.has('daily')))return null;
  if(!c.d&&(p.has('archive')||p.has('daily')))return null;
  if(c.l&&(p.get('difficulty')||'easy')!==c.l)return null;
  return c;
 }
 const points=s=>s.toLocaleString('en-GB')+' '+(s===1?'point':'points');
 const max=c=>c.g==='connections'&&c.d?3000:games[c.g].max;
 const rule=c=>c.v===1?'Ask your friend for a new invitation.':(c.l?c.l[0].toUpperCase()+c.l.slice(1)+' · ':'')+'Same questions. Same rules. Just for fun.';
 function compare(own,target){
  if(!valid(own)||!valid(target)||own.v!==2||target.v!==2||!own.p||own.p!==target.p||own.g!==target.g||own.d!==target.d||own.l!==target.l||own.n!==target.n)return null;
  const difference=own.s-target.s;
  return {kind:difference>0?'win':difference<0?'loss':'tie',title:difference>0?'You beat your friend!':difference<0?'Your friend wins this round.':'It’s a tie!',detail:difference?points(Math.abs(difference))+(difference>0?' ahead.':' behind. Fancy a rematch?'):points(own.s)+' each. Nicely matched.'};
 }
 function invitation(own,target=null){
  if(!valid(own)||!url(own))return null;
  const name=games[own.g].name,comparison=target&&compare(own,target);
  const opener=comparison?.kind==='win'?`I got ${points(own.s)} in ${name} — I beat your ${points(target.s)}! 😄 Your move!`:comparison?.kind==='tie'?`We both got ${points(own.s)} in ${name}! 😄 Fancy a rematch?`:comparison?.kind==='loss'?`You got me this time! I got ${points(own.s)} in ${name}, to your ${points(target.s)}. 😄 Fancy a rematch?`:`I got ${points(own.s)} in ${name}! 😄 ${own.s===max(own)?'Can you match that?':own.s?'Think you can beat me? Your turn!':'Fancy giving it a go? Your turn!'}`;
  return {url:url(own),title:'Your turn! '+name,text:opener+'\n'+rule(own)+'\n\n'+url(own)};
 }
 return {games,gameAt,describe,parse,url,incoming,points,rule,compare,invitation};
})();

/* ===== friend-replay.js ===== */

/* Freeze the loaded set, not the selector that happened to choose it. */
window.BrainiReplay=(()=>{
 const C=window.BrainiReplayContract,M=window.BrainiGameChallengeModel,incoming=M.incoming(),captured=new Map(),packs=new Map(),publishing=new Map();
 const checkers=new Set(['check_brainilab_quiz_answer','check_brainilab_connections_guess','check_brainilab_sequence_answer','check_brainilab_odd_one_out_answer','check_brainilab_higher_lower_answer','check_brainilab_number_route_answer','reveal_brainilab_number_route_solution','check_brainilab_order_up_round','check_brainilab_topic_rush_answer','check_brainilab_brainiword_guess']);
 let pending=null,resolvePending=null,fetching=false,loaded=null,errorText='';
 const emit=()=>window.dispatchEvent(new Event('brainilab:friendpack'));
 const timeout=promise=>{let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Connection timed out. Please try again.')),10000))]).finally(()=>clearTimeout(timer));};
 async function rpc(name,args){
  const auth=window.BrainiBackendAuth;if(!auth?.isConfigured?.())throw Error('Couldn’t connect. Please try again.');
  await timeout(auth.ensurePlayerSession());
  const {data,error}=await timeout(auth.getClient().rpc(name,args));if(error)throw Error(error.message||'Couldn’t open this invitation.');return data;
 }
 function status(){return {legacy:incoming?.v===1,loading:!!pending&&!loaded&&!errorText,error:errorText,ready:!!loaded};}
 async function retry(){
  if(fetching||loaded||!incoming||incoming.v!==2)return;fetching=true;errorText='';emit();
  try{
   const result=await rpc('get_brainilab_friend_pack',{p_pack_id:incoming.p,p_game_id:incoming.g});
   if(result?.id!==incoming.p||result.gameId!==incoming.g||result.payload?.replayRules!=='friend-replay-v1'||C.canonical(result.payload?.friendSettings)!==C.canonical({date:incoming.d,difficulty:incoming.l,rounds:incoming.n})||!validPack(incoming.g,result.payload))throw Error('This invitation is unavailable. Ask your friend for a new one.');
   loaded=result;packs.set(incoming.g,result.id);captured.set(incoming.g,C.clean(result.payload));resolvePending?.(C.clean(result.payload));
  }catch(error){errorText=/expired|unavailable/i.test(error.message)?'This invitation is unavailable. Ask your friend for a new one.':'Couldn’t load your friend’s questions. Please try again.';}
  finally{fetching=false;emit();}
 }
 function validPack(g,p){
  try{const value=C.project(g,p);return !!value&&(Array.isArray(value)?value.length>0:true)&&['local','supabase'].includes(p.source);}catch{return false;}
 }
 async function run(g,base){
  if(incoming?.g===g){
   if(incoming.v===1){emit();return new Promise(()=>{});}
   if(loaded)return C.clean(loaded.payload);
   if(!pending){pending=new Promise(resolve=>resolvePending=resolve);void retry();}
   return pending.then(C.clean);
  }
  const result=await base();if(validPack(g,result)){captured.set(g,C.clean(result));packs.delete(g);}return result;
 }
 async function publish(g){
  if(packs.has(g))return packs.get(g);
  if(publishing.has(g))return publishing.get(g);
  const original=captured.get(g);if(!original)throw Error('Play a new round to create an invitation.');
  const task=(async()=>{
   const params=new URLSearchParams(location.search),config=M.games[g],date=config.daily?original.challengeDate:params.get('daily')||params.get('archive')||null;
   const settings={date,difficulty:config.quiz?original.difficulty||params.get('difficulty')||'easy':null,rounds:date&&['connections','numberroute'].includes(g)?3:config.n||original.targetCount};
   const result=await rpc('create_brainilab_friend_pack',{p_game_id:g,p_spec:C.spec(g,original,settings)});
   if(result?.gameId!==g||!/^[0-9a-f-]{36}$/i.test(result?.id||'')||C.canonical(C.project(g,result.payload))!==C.canonical(C.project(g,original)))throw Error('The questions changed while you were playing. Play a new round to invite your friend.');
   if(captured.get(g)!==original)throw Error('A new round has started. Finish it before sharing.');
   packs.set(g,result.id);return result.id;
  })();publishing.set(g,task);try{return await task;}finally{publishing.delete(g);}
 }
 function client(sb){
  if(!sb||!incoming||incoming.v!==2)return sb;
  return {rpc(name,args){
   if(!checkers.has(name))return sb.rpc(name,args);
   if(!loaded)return Promise.resolve({data:null,error:{message:'Your friend’s questions are not ready yet.'}});
   return rpc('check_brainilab_friend_pack',{p_pack_id:incoming.p,p_method:name,p_args:args}).then(data=>({data,error:null}),error=>({data:null,error}));
  }};
 }
 return {run,publish,client,status,retry,packId:g=>packs.get(g)||null,storageSuffix:()=>incoming?.p?':friend:'+incoming.p:''};
})();

/* ===== game-challenge.js ===== */

/* One compact invitation and comparison across the regular games. */
window.BrainiGameChallenge=(()=>{
 const M=window.BrainiGameChallengeModel,views=new Map();
 let target=M.incoming();
 const owner=()=>{const auth=window.BrainiData?.authState?.()||window.BrainiData?.getState?.()?.auth;return auth?.user?.id||auth?.anonymousPlayerId||auth?.guestUserId||'guest';};
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function offer(gameId,result,options={}){
  const own=M.describe(gameId,result,options);if(!own)return null;
  return {own,target,rematch:!!target};
 }
 function ready(v){return v.options.challengeReady!==false&&v.owner===owner()&&v.root.isConnected;}
 function entry(){
  const c=target;let box=document.querySelector('[data-game-friend-entry]');
  document.documentElement.classList.toggle('friend-game-active',!!c);
  if(!c){box?.remove();return;}
  if(!box){
   const stage=document.querySelector('main .labgame-shell,main .connections-shell,main #leafQuiz,main .brainiword-shell,main [data-reasoning],main [data-order-up],main [data-topic-rush],main .daily-mechanic-shell');
   if(!stage)return;
   box=document.createElement('aside');box.className='game-friend-entry';box.dataset.gameFriendEntry='';box.setAttribute('aria-label','Friend challenge');stage.before(box);
  }
  box.innerHTML='<span class="game-friend-mark" aria-hidden="true">↗</span><div><span class="game-friend-kicker">A challenge from your friend</span><strong></strong><p></p></div>';
  box.querySelector('strong').textContent=c.s?'Can you '+(c.s===(c.g==='connections'&&c.d?3000:M.games[c.g].max)?'match ':'beat ')+M.points(c.s)+'?':'Your turn. Give it a go!';
  box.querySelector('p').textContent=M.rule(c)+' No account needed.';
  const state=window.BrainiReplay?.status?.();
  if(state?.legacy){
   box.querySelector('strong').textContent='This invitation needs an update.';
   box.querySelector('p').textContent='Ask your friend to share a new link so you both get the same questions.';
   const link=document.createElement('a');link.href=location.pathname+'?try=1'+(c.l?'&difficulty='+c.l:'');link.textContent='Play for fun →';box.querySelector('div').append(link);
  }else if(state?.error){
   box.querySelector('p').textContent=state.error;
   const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>window.BrainiReplay.retry();box.querySelector('div').append(retry);
  }
  box.hidden=Array.from(views.values()).some(v=>v.root.isConnected&&v.options.gameId===c.g);
 }
 function status(v,text){v.slot.querySelector('[data-challenge-status]').textContent=text;}
 function controls(v){
  const enabled=ready(v)&&v.prepared&&!v.busy&&!!v.slot.querySelector('textarea').value.trim();
  v.slot.querySelectorAll('[data-challenge-copy],[data-challenge-native]').forEach(b=>b.disabled=!enabled);
  const wa=v.slot.querySelector('[data-challenge-whatsapp]');
  wa.setAttribute('aria-disabled',String(!enabled));wa.tabIndex=enabled?0:-1;
  if(enabled)wa.href='https://wa.me/?text='+encodeURIComponent(v.slot.querySelector('textarea').value.trim());else wa.removeAttribute('href');
 }
 function render(root,options){
  const offered=offer(options.gameId,options.result,options);if(!offered)return;
  for(const [el]of views)if(!el.isConnected)views.delete(el);
  let v=views.get(root);
  if(!v||!root.contains(v.slot)){
   const slot=document.createElement('div');slot.className='post-friend';root.querySelector('.post-actions').before(slot);
   v={root,slot,options,owner:options.owner||owner(),busy:false,key:null};views.set(root,v);
  }
  v.options=options;
  const key=JSON.stringify([offered.own,offered.target]);
  if(v.key!==key){
   const comparison=offered.target&&M.compare(offered.own,offered.target);
   const comparisonHtml=offered.target?`<section class="game-friend-comparison" aria-label="Your result against your friend"><strong>${esc(comparison?.title||'Two rounds, two scores.')}</strong><dl><div class="${comparison?.kind==='win'?'is-winner':''}"><dt>You</dt><dd>${offered.own.s.toLocaleString('en-GB')}</dd></div><div class="${comparison?.kind==='loss'?'is-winner':''}"><dt>Your friend</dt><dd>${offered.target.s.toLocaleString('en-GB')}</dd></div></dl><p>${esc(comparison?.detail||'The challenge or question set changed, so these scores are not compared.')}</p></section>`:'';
   v.slot.innerHTML=comparisonHtml+'<section class="game-friend-composer" data-challenge-composer hidden aria-label="Your invitation"><div class="game-friend-composer-head"><strong>Your invitation</strong><button type="button" data-challenge-close aria-label="Close invitation">×</button></div><label>Your message<textarea rows="5" maxlength="3000"></textarea></label><div class="game-friend-send"><button type="button" data-challenge-copy>Copy invitation</button><button type="button" data-challenge-native hidden>Share…</button><a data-challenge-whatsapp target="_blank" rel="noopener noreferrer">WhatsApp ↗</a></div><p role="status" aria-live="polite" data-challenge-status></p></section>';
   const invitation=M.invitation(offered.own,offered.target);v.prepared=!!invitation;
   v.slot.querySelector('textarea').value=invitation?.text||'';
   v.slot.querySelector('textarea').disabled=!v.prepared;
   v.slot.querySelector('textarea').addEventListener('input',()=>controls(v));
   v.slot.querySelector('[data-challenge-close]').onclick=()=>{v.slot.querySelector('[data-challenge-composer]').hidden=true;root.querySelector('[data-post-action="challenge"],.post-share')?.focus();};
   v.slot.querySelector('[data-challenge-copy]').onclick=()=>send(v,'copy');
   v.slot.querySelector('[data-challenge-native]').onclick=()=>send(v,'native');
   v.slot.querySelector('[data-challenge-whatsapp]').onclick=e=>{controls(v);if(!ready(v)||!v.prepared||v.busy||!v.slot.querySelector('textarea').value.trim())e.preventDefault();};
   v.key=key;
  }
  v.slot.querySelector('[data-challenge-native]').hidden=typeof navigator.share!=='function';
  const custom=root.querySelector('[data-gamechallenge-button]');if(custom){custom.textContent=target?'Send a rematch':'Challenge a friend';custom.disabled=!ready(v);}
  controls(v);entry();
 }
 function open(root,options,trigger){
  render(root,options);const v=views.get(root);if(!v||!ready(v))return false;
  v.trigger=trigger;v.slot.querySelector('[data-challenge-composer]').hidden=false;
  v.slot.querySelector('[data-challenge-composer]').scrollIntoView?.({block:'nearest',behavior:'instant'});
  if(v.prepared)v.slot.querySelector('textarea').focus({preventScroll:true});
  else void prepare(v);
  return true;
 }
 async function prepare(v){
  if(v.busy||!ready(v))return;
  const key=v.key;v.busy=true;controls(v);status(v,'Preparing your friend’s questions…');
  try{
   await window.BrainiReplay.publish(v.options.gameId);
   if(v.key!==key||!ready(v))return;
   const offered=offer(v.options.gameId,v.options.result,v.options),invitation=M.invitation(offered.own,offered.target);
   if(!invitation)throw Error('Couldn’t prepare this invitation. Please try again.');
   const field=v.slot.querySelector('textarea');field.value=invitation.text;field.disabled=false;v.prepared=true;status(v,'Ready. Make the message your own.');field.focus({preventScroll:true});
  }catch(error){
   if(v.key===key&&ready(v)){
    status(v,error.message||'Couldn’t prepare this invitation. Please try again.');
    const retry=document.createElement('button');retry.type='button';retry.textContent='Try again';retry.onclick=()=>prepare(v);v.slot.querySelector('[data-challenge-status]').append(' ',retry);
   }
  }finally{v.busy=false;controls(v);}
 }
 async function send(v,method){
  if(v.busy||!v.prepared||!ready(v))return;
  const field=v.slot.querySelector('textarea'),message=field.value.trim();if(!message)return;
  const key=v.key,current=()=>v.key===key&&ready(v);
  v.busy=true;controls(v);status(v,'');
  try{
   if(method==='native')await navigator.share({title:'Your turn! '+M.games[v.options.gameId].name,text:message});
   else{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');await navigator.clipboard.writeText(message);}
   if(current())status(v,method==='copy'?'Copied. Paste it into your chat when you’re ready.':'Invitation ready to share.');
  }catch(error){
   if(error?.name!=='AbortError'&&current()){status(v,method==='copy'?'Select and copy your message above.':'Couldn’t open sharing. Try Copy invitation.');if(method==='copy'){field.focus();field.select();}}
  }finally{v.busy=false;controls(v);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',entry);else entry();
 window.addEventListener('hashchange',()=>{
  if(location.hash&&!location.hash.startsWith('#friend='))return;
  if(M.incoming()?.p!==target?.p){location.reload();return;}
  target=M.incoming();entry();window.BrainiPostGame?.refresh();for(const v of views.values())if(v.custom)render(v.root,v.options);
 });
 window.addEventListener('brainilab:authchange',()=>{for(const v of views.values())controls(v);});
 window.addEventListener('brainilab:friendpack',entry);
 function mountCustom(root,options){
  if(!root||!offer(options.gameId,options.result,options))return;
  root.innerHTML='<div class="post-actions"><button class="post-share" type="button" data-gamechallenge-button>Challenge a friend</button></div>';
  render(root,options);views.get(root).custom=true;
  root.querySelector('button').onclick=e=>open(root,options,e.currentTarget);
 }
 return {offer,render,open,entry,mountCustom};
})();

/* ===== try-first-runtime.js ===== */

/* BrainiLab Try First runtime — V41.8.0 */
window.BrainiTryFirstRuntime=(function(){
  const P=new URLSearchParams(location.search);
  const active=P.get("try")==="1";
  const today=P.get("today")||BrainiData.todayKey?.()||new Date().toISOString().slice(0,10);
  const ROTATING=new Set(["connections","oddoneout","higherlower","mathrush","numberroute","sequence"]);
  const PATH_TO_GAME={"brain-mix":"brainmix","brainiword":"brainiword","order-up":"orderup","topic-rush":"topicrush","connections":"connections","odd-one-out":"oddoneout","higher-lower":"higherlower","math-rush":"mathrush","number-route":"numberroute","sequence":"sequence"};
  function gameId(){const parts=location.pathname.split("/").filter(Boolean);for(const [slug,id] of Object.entries(PATH_TO_GAME))if(parts.includes(slug))return id;return null}
  function todayHref(){const u=new URL(location.href);u.search="";const id=gameId();if(id&&ROTATING.has(id))u.searchParams.set("daily",today);return u.href}
  function decorate(){
    if(!active) return;
    if(window.BrainiGameChallengeModel?.incoming())return;
    document.documentElement.classList.add("try-first-active");
    if(!document.querySelector("[data-try-first-banner]")){
      const banner=document.createElement("div");banner.dataset.tryFirstBanner="1";banner.className="try-first-global-banner";
      banner.innerHTML='<strong>Practice round</strong><span>Try the game. Your score, XP and streak stay unchanged.</span>';
      document.body.prepend(banner);
    }
    document.querySelectorAll(".inline-quiz-result-actions,.simple-result-actions").forEach(box=>{
      if(box.querySelector("[data-play-real-daily]"))return;
      const first=box.querySelector("a");
      if(first){first.href=todayHref();first.textContent="Play today’s scored challenge";first.dataset.playRealDaily="1";}
      const back=[...box.querySelectorAll("a")].find(a=>a!==first&&/Choose another|Back to Daily|Continue Daily/i.test(a.textContent||""));
      if(back){back.href="../../daily-quiz/";back.textContent="Back to Daily";}
    });
  }
  if(active){document.addEventListener("DOMContentLoaded",decorate);new MutationObserver(decorate).observe(document.documentElement,{subtree:true,childList:true});}
  return {active,decorate};
})();

/* ===== daily-choice-guard.js ===== */

/* Authoritative eligibility/extra selection before mounting a scored game. */
window.BrainiDailyChoiceGuard=(()=>{
 const paths={brainmix:'brain-mix',brainiword:'brainiword',orderup:'order-up',topicrush:'topic-rush',connections:'connections',oddoneout:'odd-one-out',higherlower:'higher-lower',mathrush:'math-rush',numberroute:'number-route',sequence:'sequence'};
 const params=new URLSearchParams(location.search);
 const game=Object.keys(paths).find(id=>location.pathname.split('/').includes(paths[id]));
 const day=params.get('daily')||new Date().toISOString().slice(0,10);
 const dailyOnly=['brainmix','brainiword','orderup','topicrush'].includes(game);
 const active=!!game&&(params.has('daily')||dailyOnly)&&!params.has('archive')&&params.get('try')!=='1'&&window.BrainiDailyRules?.active(day);
 let pending;
 async function rpc(client,name,args){let timer;try{return await Promise.race([client.rpc(name,args),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Connection timed out')),8000);})]);}finally{clearTimeout(timer);}}
 async function validate(){
  if(!active)return {allowed:true};
  if(day!==new Date().toISOString().slice(0,10))return {allowed:false,retryable:false,message:'That link is for a different Daily. Choose today’s Daily or browse all games.'};
  const ids=BrainiDailyRules.lineup(day);
  if(!ids.includes(game))return {allowed:false,retryable:false,message:'This game is not in today’s Daily. Choose today’s Daily or browse all games.'};
  try{
   const client=window.BrainiBackendAuth?.getClient?.();
   if(!client)throw new Error('Connection unavailable');
   const {data,error}=await rpc(client,'get_brainilab_daily_lineup',{p_challenge_date:day});
   if(error)throw error;
   if(data?.rules_version!=='daily-choice-v1'||JSON.stringify(data.games)!==JSON.stringify(ids)||data.max_score!==3500||data.extra_max!==1000)throw new Error('Daily rules are updating');
   if(game!==ids[0]){
    let sessionTimer;
    try{await Promise.race([BrainiBackendAuth.ensurePlayerSession(),new Promise((_,reject)=>{sessionTimer=setTimeout(()=>reject(new Error('Connection timed out')),8000);})]);}finally{clearTimeout(sessionTimer);}
    const chosen=await rpc(client,'choose_brainilab_daily_extra',{p_game_id:game,p_challenge_date:day});
    if(chosen.error)throw chosen.error;
    BrainiData.setDailyBonusChoice(chosen.data.game_id);
   }
   return {allowed:true};
  }catch(error){
   const text=String(error?.message||'');
   return {allowed:false,message:text.includes('already chosen')?'You have already chosen your extra for today.':text.includes('main Daily first')?'Complete the main Daily first. If you just finished, wait for your result to sync.':'Your Daily could not be checked. Please reconnect and try again.'};
  }
 }
 async function check(root){
  if(!active)return false;
  pending ||=validate();
  const result=await pending;
  if(result.allowed)return false;
  const target=root||document.querySelector('.labgame-shell');
  if(target){
   target.innerHTML='<section class="daily-load-error" role="status"><h2>Let’s get you to the right game</h2><p></p><a class="btn" href="/daily-quiz/">Today’s Daily</a> <a class="btn-light" href="/games/">All games</a> <button class="btn-light" type="button">Retry</button></section>';
   target.querySelector('p').textContent=result.message;
   const retry=target.querySelector('button');
   if(result.retryable===false)retry.remove();
   else retry.onclick=()=>location.reload();
  }
  return true;
 }
 return {active,check};
})();

/* ===== daily-completion-guard.js ===== */

/* BrainiLab Daily completion guard — V41.8.0
   Prevents a completed rotating Daily challenge being mounted/replayed from a direct URL.
   Server submission is also idempotent/locked by Step 27.
*/
window.BrainiDailyCompletionGuard=(function(){
  const P=new URLSearchParams(location.search);
  const date=P.get("daily");
  if(!date || P.get("archive") || P.get("try")==="1") return {active:false};
  const PATHS={connections:"connections",oddoneout:"odd-one-out",higherlower:"higher-lower",mathrush:"math-rush",numberroute:"number-route",sequence:"sequence"};
  const gameId=Object.entries(PATHS).find(([,slug])=>location.pathname.split("/").includes(slug))?.[0]||null;
  if(!gameId) return {active:false};
  const dailyNumber=BrainiData.dailyNumberForDate?.(date);
  let locked=false;
  function localComplete(){return (BrainiData.recentResults?.(gameId)||[]).some(r=>!r.practice&&Number(r.dailyNumber)===Number(dailyNumber))}
  function showLock(){
    if(locked)return;locked=true;
    const shell=document.querySelector(".labgame-shell");if(!shell)return;
    shell.innerHTML=`<div class="daily-completed-state simple-daily-result"><div class="daily-completed-kicker simple-result-kicker-row"><span>Daily #${Number(dailyNumber)||""}</span><strong>Completed ✓</strong></div><h1>Already played today</h1><p class="daily-completed-lead">This Daily result is locked. Each scored Daily game can only be completed once.</p><div class="simple-result-actions"><a class="simple-result-play" href="../../daily-quiz/">Back to Daily</a><a class="simple-result-progress" href="../index.html">Play Anytime</a></div></div>`;
  }
  async function check(){
    if(await window.BrainiDailyChoiceGuard?.check?.())return true;
    if(localComplete()){showLock();return true}
    if(window.BrainiCloudGames&&window.BrainiBackendAuth?.isConfigured?.()){
      try{const session=await BrainiBackendAuth.getSession?.();if(session?.user){const rows=await BrainiCloudGames.getMyRecentResults(80);if((rows||[]).some(r=>r.game_id===gameId&&Number(r.daily_number)===Number(dailyNumber))){showLock();return true}}}catch(err){console.warn("BrainiLab Daily completion guard:",err?.message||err)}
    }
    return false;
  }
  return {active:true,gameId,dailyNumber,check,isLocked:()=>locked};
})();

/* ===== reward-journey.js ===== */

/* Read-only cosmetic previews. Award eligibility stays with its canonical source. */
window.BrainiRewardJourney=(()=>{
  const labels={frame:'Avatar frame',title:'Profile title',glasses:'Glasses',hat:'Hat',prop:'Little extra',scene:'Profile background'};
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid=xp=>Number.isSafeInteger(xp)&&xp>=0;
  function milestones(){
    const cosmetics=Object.entries(window.BrainiRewardCatalog?.groups||{}).flatMap(([kind,items])=>items
      .filter(item=>!item.course&&valid(item.xp)&&item.xp>0).map(item=>({...item,kind,detail:labels[kind]||'Avatar extra'})));
    const ranks=BrainiProgressUI.TIERS.filter(t=>t.min>1).map(t=>({id:t.key,kind:'rank',name:t.name,level:t.min,xp:BrainiProgressUI.xpForLevel(t.min),detail:`Level ${t.min}`}));
    return [...cosmetics,...ranks].sort((a,b)=>a.xp-b.xp);
  }
  function next(xp){return valid(xp)?milestones().find(item=>item.xp>xp)||null:null;}
  function crossed(before,after){
    if(!valid(before)||!valid(after)||after<=before)return [];
    return milestones().filter(item=>item.xp>before&&item.xp<=after).sort((a,b)=>b.xp-a.xp);
  }
  function art(item,person={}){
    if(item.kind==='scene')return `<img class="profile-scene-sample" data-profile-scene="${item.id}" src="/assets/profile-scenes/${item.id}.webp" width="56" height="48" alt="">`;
    if(item.kind==='frame'||item.kind==='rank'){
      const level=item.level||BrainiProgressUI.xpProgress(1,person.xp).level;
      return `<span class="rank-avatar ${BrainiProgressUI.avatarClass(level)}" ${item.kind==='frame'?`data-profile-frame="${item.id}" data-social-frame="${item.id}"`:''}>${BrainiProgressUI.avatarImageMarkup(person)}</span>`;
    }
    if(['glasses','hat','prop'].includes(item.kind))return BrainiAvatarDesign.preview(item.kind,item.id,person.avatarDesign);
    if(item.kind==='title'&&BrainiProgressUI.profileTitleArt)return BrainiProgressUI.profileTitleArt(item.id,{symbolOnly:true});
    return '<span class="profile-goal-letter">Aa</span>';
  }
  function nextGoal(person,earned){
    const item=next(earned);return item?{...item,art:art(item,person),remaining:item.xp-earned}:null;
  }
  function href(item){
    return '/profile/?section=progress'+(item?.kind&&item.kind!=='rank'?'&reward='+encodeURIComponent(item.kind+':'+item.id)+'#my-avatar':'');
  }
  function fromLink(value){
    if(typeof value!=='string')return null;
    const ordinary=milestones().find(item=>item.kind!=='rank'&&value===item.kind+':'+item.id);
    if(ordinary)return ordinary;
    // Seasonal items have no XP price. Linking to one never grants or equips it.
    return Object.entries(window.BrainiRewardCatalog?.groups||{}).flatMap(([kind,items])=>items.filter(item=>item.event&&value===kind+':'+item.id).map(item=>({...item,kind,detail:labels[kind]||'Avatar extra'})))[0]||null;
  }
  function resultGoal(xp,change){
    if(!valid(xp))return {item:null,earned:[]};
    const earned=change?.after===xp?crossed(change.before,change.after):[];
    const cosmetics=earned.filter(item=>item.kind!=='rank'),rewards=cosmetics.length?cosmetics:earned;
    // The level bar already shows the next level. Give the reward slot to an
    // actual avatar extra when one remains; earned diplomas still get a turn.
    const item=rewards[0]||milestones().find(goal=>goal.kind!=='rank'&&goal.xp>xp)||next(xp);
    return {item,earned:rewards};
  }
  function markup(person,xp,change){
    const {item,earned}=resultGoal(xp,change);
    if(!item)return '';
    const unlocked=earned.length>0,remaining=item.xp-xp;
    const detail=unlocked?`${item.detail} · ${item.kind==='rank'?'View progress':'Try it on'}`:`${remaining.toLocaleString('en-GB')} XP to go`;
    const heading=unlocked?item.kind==='rank'?'New diploma':'Unlocked!':item.kind==='rank'?'Next diploma':'Next avatar extra';
    return `<span class="post-unlock ${unlocked?'is-unlocked':''}" data-reward-art="${esc(item.kind)}"><span class="post-unlock-art" aria-hidden="true">${art(item,person)}</span><span class="post-unlock-copy"><span>${heading}</span><strong>${esc(item.name)}</strong><small>${esc(detail)}</small></span><span class="post-unlock-arrow" aria-hidden="true">→</span></span>`;
  }
  function moreMarkup(person,xp,change){
    const {earned}=resultGoal(xp,change),more=earned.slice(1);if(!more.length)return '';
    return `<details class="post-unlock-more"><summary>${more.length} more unlocked</summary><ul>${more.map(item=>`<li><a href="${esc(href(item))}" data-unlocked-reward="${esc(item.kind+':'+item.id)}"><span class="post-unlock-mini" aria-hidden="true">${art(item,person)}</span><span><strong>${esc(item.name)}</strong><small>${esc(item.detail)} · Try it on</small></span><span aria-hidden="true">→</span></a></li>`).join('')}</ul></details>`;
  }
  function resultHref(xp,change){
    return href(resultGoal(xp,change).item);
  }
  return Object.freeze({next,crossed,art,nextGoal,href,fromLink,resultGoal,markup,moreMarkup,resultHref});
})();

/* ===== post-game.js ===== */

/* Shared result presentation. Game saves and scoring stay with their existing owners. */
window.BrainiPostGame=(()=>{
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const localHref=(href,fallback='/games/')=>typeof href==='string'&&/^\/(?!\/)/.test(href)&&!/[\\<>]/.test(href)?href:fallback;
 const mounted=new Map();
 let readingDirectory;
 const readingPath=()=>location.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/');
 function readingContext(){
  const match=/^#learn-([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(location.hash),slug=match?.[1];
  return slug&&slug.length<=100?{slug,hash:location.hash,path:readingPath()}:null;
 }
 function getReadingDirectory(){
  if(!readingDirectory)readingDirectory=(async()=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4000);
   try{
    const response=await fetch('/assets/data/learn-game-links.json',{credentials:'omit',cache:'no-cache',signal:controller.signal});
    if(!response.ok)return [];
    const data=await response.json();return data?.version===1&&Array.isArray(data.articles)&&data.articles.length<=1000?data.articles:[];
   }catch{return [];}finally{clearTimeout(timer);}
  })();
  return readingDirectory;
 }
 const findReading=(directory,context,gameId)=>directory.find(a=>a&&a.slug===context.slug&&(!gameId||a.gameId===gameId)&&a.gamePath===context.path&&typeof a.title==='string'&&a.title.trim()&&a.title.length<=220);
 async function returnToReading(container,options){
  const context=readingContext();if(!context)return;
  const link=container.querySelector('[data-post-action="guide"]');
  const title=link?.querySelector('strong,[data-reading-title]');if(!title)return;
  const readingOwner=owner(),directory=await getReadingDirectory();
  if(!container.isConnected||!container.contains(link)||!link.isConnected||readingOwner!==owner()||location.hash!==context.hash||readingPath()!==context.path)return;
  const article=findReading(directory,context,options.gameId);
  if(!article)return;
  link.setAttribute('href','/learn/'+context.slug+'/');
  const kind=link.querySelector('[data-reading-kind],:scope>span:not([data-reading-title])');
  if(kind)kind.textContent='Back to your reading';
  title.textContent=article.title+' →';
 }
 let readingNavigation,navigationVersion=0;
 function resetReadingNavigation(){
  if(!readingNavigation)return;
  const {nav,link,children,navChildren,attributes,difficulties}=readingNavigation;
  if(nav.isConnected&&link.isConnected&&nav.contains(link)){
   link.replaceChildren(...children);link.classList.remove('reading-return-link');nav.removeAttribute('data-reading-context');
   for(const [name,value]of attributes){if(value===null)link.removeAttribute(name);else link.setAttribute(name,value);}
   if(navChildren)nav.replaceChildren(...navChildren);
  }
  for(const [tab,href]of difficulties)if(tab.isConnected)tab.setAttribute('href',href);
  readingNavigation=null;
 }
 async function readingNavigationReady(){
  const version=++navigationVersion;resetReadingNavigation();
  const context=readingContext();
  if(!context||!document.querySelector('main [data-game-guides]'))return;
  const nav=document.querySelector('main .breadcrumb,main .reason-header'),link=nav?.querySelector(':scope>a[href]');
  if(!link)return;
  const article=findReading(await getReadingDirectory(),context);
  if(!article||version!==navigationVersion||location.hash!==context.hash||readingPath()!==context.path||!nav.isConnected||!link.isConnected||!nav.contains(link))return;
  if(nav.contains(document.activeElement)&&document.activeElement!==link)return;
  const difficulties=[...document.querySelectorAll('.quiz-difficulty-tabs a[data-difficulty][href]')].map(tab=>[tab,tab.getAttribute('href')]);
  const navChildren=nav.matches('.breadcrumb')?[...nav.childNodes]:null;
  readingNavigation={nav,link,children:[...link.childNodes],navChildren,attributes:['href','aria-label','title','class'].map(name=>[name,link.getAttribute(name)]),difficulties};
  link.setAttribute('href','/learn/'+context.slug+'/');link.setAttribute('aria-label','Back to article: '+article.title);link.setAttribute('title',article.title);
  link.textContent='← Back to article';link.classList.add('reading-return-link');nav.setAttribute('data-reading-context','');
  if(navChildren)nav.replaceChildren(link);
  for(const [tab,href]of difficulties){
   try{const url=new URL(href,location.href);if(url.origin===location.origin&&url.pathname.replace(/index\.html$/,'').replace(/\/?$/,'/')===context.path&&!href.includes('#'))tab.setAttribute('href',href+context.hash);}catch{}
  }
 }
 const invitations=new Map(),dismissed=new WeakSet(),dismissKey='brainilab_account_invite_dismissed_v1';
 let visitDismissed=false;
 function accountInviteDismissed(){
  try{visitDismissed=visitDismissed||sessionStorage.getItem(dismissKey)==='1';}catch{}
  return visitDismissed;
 }
 function inviteAccount(container,{practice=false,gameId='brainmix'}={}){
  if(!container)return;
  for(const root of invitations.keys())if(!root.isConnected)invitations.delete(root);
  invitations.set(container,{practice,gameId});
  const signedIn=window.BrainiData?.authState?.()?.status==='authenticated';
  if(signedIn||accountInviteDismissed()||dismissed.has(container)){container.replaceChildren();container.hidden=true;return;}
  if(container.querySelector('[data-join-account]'))return;
  container.hidden=false;
  container.innerHTML=`<aside class="post-account-invite" aria-label="Free BrainiLab account"><div><p class="post-account-kicker">Free account</p><h3>Keep your progress.</h3><p>${practice?'Save your next scores across devices.':'Your scores, streak and avatar, together on any device.'}</p>${practice?'<small>This practice round stays on this page.</small>':''}</div><div class="post-account-actions"><button type="button" data-join-account aria-label="Create a free account to save your progress">${practice?'Create free account':'Save my progress'} <span aria-hidden="true">→</span></button><button type="button" data-dismiss-account>Not now</button></div><p role="status" data-account-error hidden></p></aside>`;
  try{window.BrainiSiteAnalytics?.accountPrompt?.('render',practice?'practice_result':'game_result',gameId);}catch{}
  container.querySelector('[data-dismiss-account]').onclick=()=>{
   dismissed.add(container);visitDismissed=true;
   try{sessionStorage.setItem(dismissKey,'1');}catch{}
   try{window.BrainiSiteAnalytics?.accountPrompt?.('dismiss',practice?'practice_result':'game_result',gameId);}catch{}
   const fallback=container.closest('.post-game')?.querySelector('.post-primary')||container.parentElement.querySelector('a');
   refreshInvitations();fallback?.focus();
  };
  container.querySelector('[data-join-account]').onclick=async event=>{
   const button=event.currentTarget,error=container.querySelector('[data-account-error]');
   button.disabled=true;error.hidden=true;
   try{window.BrainiSiteAnalytics?.accountPrompt?.('click',practice?'practice_result':'game_result',gameId);}catch{}
   try{
    if(!window.BrainiAuth?.open)await window.BrainiPerf?.ensureCloud?.();
    if(!window.BrainiAuth?.open)throw Error('Sign-in unavailable');
    await window.BrainiAuth.open({source:practice?'practice_result':'game_result',mode:'signup'});
    try{window.BrainiSiteAnalytics?.accountPrompt?.('open',practice?'practice_result':'game_result',gameId);}catch{}
   }catch{error.hidden=false;error.textContent='We couldn’t open sign-in. Please try again. Your result is still here.';}
   finally{button.disabled=false;}
  };
 }
 function refreshInvitations(){for(const [root,options]of invitations){if(!root.isConnected){invitations.delete(root);continue;}inviteAccount(root,options);}}
 window.addEventListener('brainilab:authchange',refreshInvitations);
 const guides={worldflags:{slug:'how-to-learn-world-flags',title:'Spot the clues in a flag'},generalknowledge:{slug:'why-2100-is-not-a-leap-year',title:'The leap-year rule with a twist'},mathrush:{slug:'multiply-by-11-in-your-head',title:'Try a mental-maths shortcut'}};
 function review(answers=[]){
  if(!answers.length)return '';
  const rows=answers.map((a,i)=>({...a,position:a.position||i+1}));
  const missed=rows.filter(a=>!a.isCorrect),correct=rows.filter(a=>a.isCorrect);
  const items=list=>list.map(a=>`<article class="post-answer"><h4>${number(a.position)}. ${esc(a.questionText)}</h4><p class="post-answer-choice">${a.isCorrect?'Correct':a.skipped?'Skipped':'Your answer: '+esc(a.selectedAnswer??'No answer')}</p><p><strong>${esc(a.correctAnswer||'Answer unavailable')}</strong></p>${a.explanation?`<p>${esc(a.explanation)}</p>`:''}</article>`).join('');
  return `<div class="post-review">${missed.length?`<details data-post-missed><summary>Review ${missed.length} ${missed.length===1?'answer':'answers'} to revisit</summary>${items(missed)}</details>`:''}${correct.length?`<details><summary>${missed.length?'Your correct answers':'Review your answers'} · ${correct.length}</summary>${items(correct)}</details>`:''}</div>`;
 }
 const owner=()=>{const auth=window.BrainiData?.authState?.()||window.BrainiData?.getState?.()?.auth;return auth?.user?.id||auth?.anonymousPlayerId||auth?.guestUserId||'guest';};
 const verified=r=>r?.answersVerified===true||r?.answerVerificationStatus==='verified'||r?.dailyGameVerificationStatus==='verified'||r?.dailyAnswerVerificationStatus==='verified';
 function localStatus(result){
  if(!result.dailyNumber||result.practice||result.tryFirst)return null;
  const d=window.BrainiData?.daily?.(),day=window.BrainiData?.dateForDailyNumber?.(result.dailyNumber);
  if(!d||Number(d.number)!==Number(result.dailyNumber)||day!==new Date().toISOString().slice(0,10))return null;
  const model=window.BrainiDailyRules?.model(day),ids=window.BrainiData.dailyGameIdsForNumber?.(d.number)||[];
  const games=Object.fromEntries(ids.map(id=>{
   const recent=window.BrainiData.recentResults?.(id)?.find(r=>!r.practice&&Number(r.dailyNumber)===Number(d.number));
   const completed=!!d.completedGames?.includes(id)&&(!recent||verified(recent));
   return [id,{completed,points:d.dailyBreakdown?.[id]?.points||0}];
  }));
  return {dailyNumber:d.number,model,bonusChoice:d.bonusChoice,brainScore:d.brainScore,completedCount:Object.values(games).filter(g=>g.completed).length,dailyIds:ids,games};
 }
 function nextDaily(status){
  if(status?.model?.version==='daily-choice-v1'){
   if(!status.games?.[status.model.primary]?.completed)return {href:'/daily-quiz/',label:'Play the main Daily'};
   if(!status.bonusChoice)return {href:'/daily-quiz/#daily-extras',label:'Choose an optional extra'};
   if(!status.games?.[status.bonusChoice]?.completed)return {href:'/daily-quiz/#daily-extras',label:'Continue your extra'};
   return {href:'/games/',label:'Find another game',complete:true};
  }
  const id=(status?.dailyIds||[]).find(id=>id!=='brainmix'&&!status.games?.[id]?.completed),meta=window.BrainiDailyJourney?.META?.[id];
  if(meta)return {href:'/'+meta.href+(meta.dailyQuery?'?daily='+new Date().toISOString().slice(0,10):''),label:'Play '+meta.name};
  return status?.completedCount>=4?{href:'/games/',label:'Find another game'}:{href:'/daily-quiz/',label:'Continue Daily'};
 }
 function actionMarkup(container,options){
  const {result={},gameId,status:provided,next}=options,practice=result.practice||result.tryFirst;
  const providedDay=provided?.dailyNumber&&window.BrainiData?.dateForDailyNumber?.(provided.dailyNumber);
  const today=new Date().toISOString().slice(0,10),sameOwner=options.owner===owner();
  const resultDay=result.dailyNumber&&window.BrainiData?.dateForDailyNumber?.(result.dailyNumber);
  let status=practice||!sameOwner?null:localStatus(result);
  // A resolved cloud status can be newer than the local cache; only merge the same Daily/account.
  if(!practice&&sameOwner&&providedDay===today&&Number(provided.dailyNumber)===Number(result.dailyNumber)){
   const games={...provided.games,...status?.games};
   for(const [id,g]of Object.entries(provided.games||{}))if(g.completed)games[id]={...games[id],...g};
   status={...provided,...status,games,bonusChoice:status?.bonusChoice||provided.bonusChoice};
  }
  const pending=!practice&&resultDay===today&&(!sameOwner||!status?.games?.[gameId]?.completed);
  const gameChallenge=window.BrainiGameChallenge?.offer(gameId,result,options);
  const invite=gameChallenge||(!practice&&!pending&&status&&window.BrainiFriendChallenge?.buildInvite(status));
  const primary=pending?{href:'/daily-quiz/',label:'Back to Daily'}:status&&!practice?nextDaily(status):result.dailyNumber&&!practice?{href:'/daily-quiz/',label:'See today’s Daily'}:next||{href:'/games/',label:'Find another game'};
  const missed=(result.answerDetails||[]).filter(a=>!a.isCorrect).length;
  const reviewFirst=!gameChallenge&&!pending&&!status&&missed>=2&&number(result.correct)<number(result.total)*.6;
  const challengeFirst=gameChallenge?.rematch||primary.complete&&invite;
  const label=challengeFirst?(gameChallenge?.rematch?'Send a rematch':'Challenge a friend'):reviewFirst?'Review your answers':primary.label;
  const root=container.querySelector('.post-actions');
  const focused=document.activeElement,restoreFocus=root.contains(focused);
  const focusedAction=restoreFocus?focused.dataset.postAction:null;
  root.innerHTML=`${reviewFirst||challengeFirst?`<button type="button" class="post-primary" data-post-action="${challengeFirst?'challenge':'review'}">${label} <span aria-hidden="true">→</span></button>`:`<a class="post-primary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(label)} <span aria-hidden="true">→</span></a>`}${reviewFirst||challengeFirst?`<a class="post-secondary" data-post-action="next" href="${esc(localHref(primary.href))}">${esc(primary.label)}</a>`:`<button type="button" class="post-share">${gameChallenge?.rematch?'Send a rematch':invite?'Challenge a friend':'Share result'}</button>`}`;
  root.querySelector('[data-post-action="review"]')?.addEventListener('click',()=>{const d=container.querySelector('[data-post-missed]');if(d){d.open=true;d.querySelector('summary').focus();d.scrollIntoView?.({block:'nearest',behavior:'instant'});}});
  const share=event=>gameChallenge?window.BrainiGameChallenge.open(container,options,event.currentTarget):invite?window.BrainiFriendChallenge.open(status,event.currentTarget):window.BrainiShare?.open(gameId,result);
  root.querySelector('.post-share')?.addEventListener('click',share);root.querySelector('[data-post-action="challenge"]')?.addEventListener('click',share);
  if(gameChallenge){
   window.BrainiGameChallenge.render(container,options);
   if(options.challengeReady===false||!sameOwner)root.querySelectorAll('.post-share,[data-post-action="challenge"]').forEach(b=>b.disabled=true);
  }
  const note=container.querySelector('.post-next-note');
  note.textContent=!pending&&status?.model?.version==='daily-choice-v1'&&status.games?.[status.model.primary]?.completed&&!primary.complete?'Your Daily is done. The extra is up to you.':'';
  note.hidden=!note.textContent;
  if(restoreFocus){const target=focusedAction?Array.from(root.querySelectorAll('[data-post-action]')).find(el=>el.dataset.postAction===focusedAction):root.querySelector('.post-share');(target||root.querySelector('.post-primary'))?.focus({preventScroll:true});}
 }
 const presentation=(value,result)=>typeof value==='function'?value(result):value;
 function scorePresentation(gameId,result){
  const raw=number(result.score??result.points),daily=!!(!result.practice&&!result.tryFirst&&result.dailyNumber);
  const converted=daily&&typeof window.BrainiData?.dailyPointsForResult==='function';
  const points=converted?number(BrainiData.dailyPointsForResult(gameId,result)):raw;
  return {points,label:daily?'Daily points':'Game points',context:converted&&raw!==points?`From ${raw.toLocaleString('en-GB')} game points.`:''};
 }
 // Nov 2026: the score sits in a ring showing how much of the round went right. Word results
 // ("Solved in 3") keep their plain heading; a percentage headline fills the ring with that value.
 function ringPercent(result,headline,timed){
  const text=headline==null?'':String(headline).trim();
  if(text){const m=/^(\d{1,3})%$/.exec(text);return m?Math.min(100,Number(m[1])):null;}
  const correct=number(result.correct),total=number(result.total),accuracy=Number(result.accuracy);
  if(total>0)return Math.round(Math.min(1,Math.max(0,correct/total))*100);
  if(timed&&Number.isFinite(accuracy)&&accuracy>=0)return Math.round(Math.min(100,accuracy));
  return null;
 }
 function ringSvg(pct){return `<svg class="post-ring" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="post-ring-track" cx="60" cy="60" r="53"/>${pct>0?`<circle class="post-ring-fill" cx="60" cy="60" r="53" pathLength="100" stroke-dasharray="100" stroke-dashoffset="${100-pct}"/>`:''}</svg>`;}
 function ringClasses(pct){return pct==null?'':` has-ring${pct>=80?' is-great':''}${pct===100?' is-perfect':''}`;}
 function updateRing(root,result,headline,timed){
  const panel=root.querySelector('.post-score-panel.has-ring'),pct=ringPercent(result,headline,timed);
  if(!panel||pct==null||String(pct)===panel.dataset.ringPercent)return;
  panel.dataset.ringPercent=String(pct);panel.classList.toggle('is-great',pct>=80);panel.classList.toggle('is-perfect',pct===100);
  const old=panel.querySelector('.post-ring'),holder=document.createElement('div');holder.innerHTML=ringSvg(pct);
  if(old&&holder.firstElementChild)old.replaceWith(holder.firstElementChild);
 }
 function updatePresentation(root,options){
  const result=options.result,headline=presentation(options.headline,result),summary=presentation(options.summary,result);
  const score=root.querySelector('.post-score');
  if(headline!=null)score.textContent=headline;
  else score.innerHTML=options.timed?String(number(result.correct)):result.total?`${number(result.correct)}<span> / ${number(result.total)}</span>`:'Round complete';
  if(summary!=null)root.querySelector('.post-message').textContent=summary;
  const scoring=scorePresentation(options.gameId,result);
  root.querySelector('.post-points strong').textContent=scoring.points.toLocaleString('en-GB');
  root.querySelector('[data-points-label]').textContent=scoring.label;
  const context=root.querySelector('[data-score-context]');
  context.textContent=scoring.context;context.hidden=!scoring.context;
  updateRing(root,result,headline,options.timed);
  root.querySelectorAll('.post-metrics div').forEach(stat=>{if(stat.querySelector('dt')?.textContent==='Accuracy')stat.querySelector('dd').textContent=number(result.accuracy)+'%';});
 }
 function resolveStatus(container,options){
  if(!options.resolveDaily||options.result.practice||!options.result.dailyNumber)return;
  Promise.resolve().then(()=>window.BrainiDailyHub?.resolve(options.result.dailyNumber)).then(status=>{
   if(!status||mounted.get(container)!==options||options.owner!==owner()||!container.isConnected)return;
   options.status=status;actionMarkup(container,options);
  }).catch(()=>{/* Keep the local result and navigation when the cloud is unavailable. */});
 }
 function mount(container,options={}){
  if(!container)return;
  const {result={},gameId='brainmix',name='Brain Mix',difficulty='',ads=false,focus=true,timed=false,metrics=[],scoreLabel=null}=options;
  const headline=presentation(options.headline,result),summary=presentation(options.summary,result);
  const correct=number(result.correct),total=number(result.total),practice=result.practice||result.tryFirst;
  const scoring=scorePresentation(gameId,result),ring=ringPercent(result,headline,timed);
  const message=summary||(timed?(correct?'Time’s up. Here’s how your run went.':'Time’s up. Ready for another go?'):total&&correct===total?'Every answer right. Nicely done.':correct===0?'A fresh set of things to discover.':correct>=total*.8?'Nicely done. A few new discoveries, too.':'There’s always something new to learn.');
  const art=window.BrainiIcons?.world?.(gameId,'post-game-art is-world-art')||window.BrainiIcons?.game?.(gameId,'mini','post-game-art')||'';
  const guide=options.guide||guides[gameId]||({numberroute:{href:'/learn/paths/mental-maths-foundations/',title:'Build your mental-maths toolkit',kind:'Academy · Start with the basics'},connections:{href:'/learn/connections-puzzles-find-the-hidden-link/',title:'Find a link that fits every clue'},brainiword:{href:'/learn/repeated-letters-in-five-letter-word-games/',title:'When the same letter appears twice'},sequence:{href:'/learn/paths/patterns-and-reasoning/',title:'Find the pattern, then test it',kind:'Academy · Short lessons'},oddoneout:{href:'/learn/sorting-with-two-rules/',title:'Try sorting with two rules'},science:{href:'/learn/paths/sun-moon-and-time/',title:'Make sense of the sky',kind:'Academy · Start with the basics'},history:{href:'/learn/paths/calendars-explained/',title:'Calendars have some curious rules',kind:'Academy · Start with the basics'},sports:{href:'/learn/how-to-read-a-tennis-score/',title:'Why does tennis count 15, 30, 40?'},worldcapitals:{href:'/learn/why-canberra-is-australias-capital/',title:'Why Canberra, not Sydney?'},brainmix:{href:'/learn/remember-quiz-answers-tomorrow/',title:'Make a quiz answer stick'},higherlower:{href:'/learn/why-greenland-looks-so-big/',title:'Why maps can fool your eyes'},orderup:{href:'/learn/which-century-is-that-year/',title:'The century dates that trip us up'},topicrush:{href:'/learn/chunking-memory-familiar-groups/',title:'Give your memory a useful starting point'},survival:{href:'/learn/confidence-is-not-a-memory-test/',title:'How well do you really know an answer?'}})[gameId],feedbackId=/^[a-z]{1,30}$/.test(gameId)?gameId:'';
  const stats=metrics.length?`<dl class="post-metrics">${metrics.slice(0,3).map(m=>`<div><dt>${esc(m.label)}</dt><dd>${esc(m.value)}</dd></div>`).join('')}</dl>`:'';
  container.innerHTML=`<section class="post-game ${practice?'is-practice':''}" aria-label="Game result"><header class="post-heading"><span class="post-art" aria-hidden="true">${art}</span><div><p class="post-kicker">${esc(name)}${difficulty?' · '+esc(difficulty):''}</p><span class="post-complete">${practice?'Practice complete':'Round complete'} <span aria-hidden="true">✓</span></span></div></header><div class="post-score-panel${ringClasses(ring)}"${ring==null?'':` data-ring-percent="${ring}"`}>${ring==null?'':`<div class="post-ring-wrap">${ringSvg(ring)}${ring>=80?'<span class="post-burst" aria-hidden="true"></span>':''}`}<h2 tabindex="-1" class="post-score ${headline?'is-word-result':''}">${headline?esc(headline):timed?correct:total?`${correct}<span> / ${total}</span>`:'Round complete'}</h2><p class="post-score-label">${esc(scoreLabel??((total||timed)?'correct answers':''))}</p>${ring==null?'':'</div>'}<p class="post-message">${esc(message)}</p><p class="post-points"><strong>${scoring.points.toLocaleString('en-GB')}</strong> <span data-points-label>${scoring.label}</span>${Number.isFinite(result.timeSec)?'<span> · '+Math.floor(result.timeSec/60)+':'+String(result.timeSec%60).padStart(2,'0')+'</span>':''}</p><p class="post-score-context" data-score-context ${scoring.context?'':'hidden'}>${esc(scoring.context)}</p></div>${stats}<div role="status" aria-live="polite" data-result-reward="${esc(practice?'':result.clientResultId||'')}" data-result-game="${esc(gameId)}" data-result-daily="${number(result.dailyNumber)}">${window.BrainiContinuity?.rewardMarkup?.({...result,gameId})||''}</div><div class="post-actions"></div><p class="post-next-note" hidden></p>${review(result.answerDetails)}${guide?`<a class="post-guide" data-post-action="guide" href="${esc(localHref(guide.href||'/learn/'+guide.slug+'/'))}"><span>${esc(guide.kind||'A little reading')}</span><strong>${esc(guide.title)} →</strong></a>`:''}<div class="post-footer"><a class="post-browse" data-post-action="browse" href="/games/">All games</a><a data-post-action="progress" href="/profile/?section=progress">My progress</a><a data-post-action="feedback" href="/suggestions/?context=post-game&amp;game=${feedbackId}">Give feedback</a></div>${ads?'<div class="brainilab-ad-slot brainilab-ad-slot-result" data-ad-slot="quiz_result" hidden></div>':''}</section>`;
  const liveOptions={...options,owner:owner(),gameId,result};mounted.set(container,liveOptions);actionMarkup(container,liveOptions);resolveStatus(container,liveOptions);
  const invitation=document.createElement('div');invitation.dataset.accountInvite='';container.querySelector('.post-actions').after(invitation);inviteAccount(invitation,{practice:!!practice,gameId});
  void returnToReading(container,liveOptions);
  const videoSlot=document.createElement('div');videoSlot.hidden=true;videoSlot.dataset.resultVideo='';
  container.querySelector('.post-footer').before(videoSlot);
  window.BrainiRelatedVideo?.mount(videoSlot,{gameId});
  window.BrainiContinuity?.animateReward?.(container.querySelector('[data-result-reward]'));
  if(focus)container.querySelector('.post-score').focus({preventScroll:true});
 }
 function refresh(){for(const [root,options]of mounted){
  if(!root.isConnected||!root.querySelector('.post-actions')){mounted.delete(root);continue;}
  const result=options.result;
  if(options.owner===owner()&&!result.practice&&result.clientResultId){
   const canonical=window.BrainiData?.recentResults?.(options.gameId)?.find(r=>r.clientResultId===result.clientResultId);
   if(verified(canonical)){
    Object.assign(result,canonical);
    updatePresentation(root,options);
   }
  }
  actionMarkup(root,options);
 }}
 window.addEventListener('brainilab:progressionchange',refresh);window.addEventListener('brainilab:daychange',refresh);window.addEventListener('brainilab:datachange',refresh);window.addEventListener('brainilab:authchange',refresh);
 // Render first. Saving and verification must never hold the completed round on screen.
 async function complete(container,options,{save,verify}={}){
  const result=options.result;
  const practice=!!(result.practice||result.tryFirst||new URLSearchParams(location.search).get('try')==='1');
  result.practice=practice;
  mount(container,{...options,challengeReady:false});
  container.querySelector('.post-game').scrollIntoView?.({block:'start',behavior:'instant'});
  const reward=container.querySelector('[data-result-reward]');
  const current=()=>container.contains(reward);
  const renderReward=()=>{
   if(!current())return;
   reward.dataset.resultReward=practice?'':result.clientResultId||'';
   const html=window.BrainiContinuity?.rewardMarkup?.({...result,gameId:options.gameId,practice})||'';
   if(window.BrainiContinuity?.updateReward)BrainiContinuity.updateReward(reward,html);else reward.innerHTML=html;
   window.BrainiContinuity?.animateReward?.(reward);
  };
  if(!practice)reward.textContent='Saving your result…';
  const timer=!practice?setTimeout(()=>{if(current())reward.textContent='Saving is taking longer than usual. Your result is shown above.';},8000):null;
  let confirmed;
  try{
   confirmed=await save();
   if(!confirmed)throw Error('Result unavailable');
  }catch{
   if(current()&&!practice)reward.textContent='Your score is shown above. Progress could not be saved; please check your connection.';
   return null;
  }finally{clearTimeout(timer);}
  Object.assign(result,confirmed,{practice});
  confirm(container,result);
  renderReward();
  refresh();
  try{
   const verified=await verify?.(confirmed);
   if(verified){
    Object.assign(result,verified,{practice});
    if(current()){
     updatePresentation(container,options);
    }
   }
  }catch{/* Saved results stay visible when verification is temporarily unavailable. */}
  renderReward();
  refresh();
  return result;
 }
 function confirm(container,result){const options=mounted.get(container);if(!options||options.owner!==owner())return;Object.assign(options.result,result);options.challengeReady=true;updatePresentation(container,options);actionMarkup(container,options);}
 document.addEventListener('DOMContentLoaded',readingNavigationReady);
 window.addEventListener('pageshow',readingNavigationReady);window.addEventListener('hashchange',readingNavigationReady);
 if(document.readyState!=='loading')readingNavigationReady();
 return {mount,complete,confirm,review,nextDaily,localStatus,refresh,inviteAccount,returnToReading};
})();

/* ===== home-daily.js ===== */

/*
  BrainiLab Home Daily State — V28
  Once Brain Mix is complete, the Home hero becomes a full four-game Daily hub.
*/
window.BrainiHomeDaily=(function(){
  function resultFor(status,result){
    return result||status?.games?.brainmix?.result||null;
  }

  async function render(container,status,options={}){
    if(!container || !status) return;

    const result=resultFor(status,options.result);
    const complete=status.completedCount===4;
    const brainScore=Number(status.brainScore||0).toLocaleString();

    // Returning visitors keep the same homepage layout. The full result view
    // is only shown after a game they explicitly started in this visit.
    if(options.compact){
      container.classList.add('home-start');
      container.innerHTML=`
        <span class="challenge-pill">Daily #${Number(status.dailyNumber)} · ${Number(status.completedCount)}/4 complete</span>
        <h2>${complete?'You’re caught up for today!':'Brain Mix complete. What’s next?'}</h2>
        <p>${complete?'Come back tomorrow for a fresh Daily, or explore another game.':`Your Daily Brain Score is ${brainScore} / 10,000. Continue with today’s remaining challenges.`}</p>
        <div class="home-start-actions">
          <a class="btn" href="${complete?'/games/':'/daily-quiz/'}">${complete?'Explore all games':'Continue Daily'}</a>
          <a class="btn-light" href="/profile/?section=progress">See my progress</a>
        </div>
        <p class="home-ready">${complete?'Today’s four challenges are complete.':'Your completed Brain Mix is saved.'}</p>`;
      return;
    }

    if(result&&window.BrainiPostGame){
      container.classList.remove('home-start');
      BrainiPostGame.mount(container,{result,gameId:'brainmix',name:'Brain Mix',status});
      return;
    }

    container.innerHTML=`
      <div class="home-daily-state ${complete?"is-caught-up":""}">
        <div class="home-daily-state-top">
          <span>Daily #${status.dailyNumber}</span>
          <strong>${complete?"4/4 complete ✓":`${status.completedCount}/4 complete`}</strong>
        </div>

        <div class="home-daily-state-copy">
          <h2>${complete
            ? "You’re caught up for today!"
            : "Brain Mix complete. Keep your Daily going."
          }</h2>

          <p>${complete
            ? "All four Daily challenges are done. Want to keep testing yourself?"
            : `Your Daily Brain Score is ${brainScore} / 10,000. Finish the remaining ${4-status.completedCount} ${4-status.completedCount===1?"challenge":"challenges"} to complete today’s set.`
          }</p>
        </div>

        <div class="home-daily-state-actions">
          <a class="home-daily-primary" href="${complete?"games/index.html":"daily-quiz/index.html"}">
            ${complete?"Play more games":"Continue Daily"}
          </a>

          ${result
            ? `<button class="home-daily-secondary" type="button" data-home-share-brainmix>Share Brain Mix</button>`
            : ""
          }

          <a class="home-daily-tertiary" href="profile/index.html?section=progress">
            See my progress
          </a>
        </div>

        ${complete
          ? `<div class="next-daily-countdown" data-next-daily-countdown></div>`
          : ""
        }

        <div data-home-daily-journey></div>
      </div>
    `;

    container.querySelector("[data-home-share-brainmix]")?.addEventListener(
      "click",
      ()=>BrainiShare.open("brainmix",result)
    );

    if(complete && window.BrainiDailyCountdown){
      BrainiDailyCountdown.mount(
        container.querySelector("[data-next-daily-countdown]")
      );
    }

    if(window.BrainiDailyJourney){
      await BrainiDailyJourney.render(
        container.querySelector("[data-home-daily-journey]"),
        {
          status,
          currentGame:"brainmix"
        }
      );
    }

    // The full Daily status is now in the hero, so duplicate progress sections
    // further down the Home page are intentionally hidden.
    document.querySelector(".brain-score-section")?.setAttribute("hidden","");
    document.querySelector("[data-home-daily-cards]")?.setAttribute("hidden","");
  }

  return {render};
})();

/* ===== quiz.js ===== */


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
