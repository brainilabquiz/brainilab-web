import {youtubeId,cleanVideo,videoCard} from '../lib/video-card.js';
export function videoEditor(raw){
 const video=cleanVideo(raw);
 return `<details class="admin-panel article-settings"${video?' open':''}><summary>Related video</summary><p class="article-help">Add a BrainiLab video that fits this article. It appears below the invitation to play.</p><label class="article-field">YouTube video link<input id="article-video-url" type="url" placeholder="https://www.youtube.com/watch?v=…" value="${video?'https://www.youtube.com/watch?v='+video.id:''}"/></label><button type="button" class="admin-button" id="article-video-check">Load video</button><button type="button" class="admin-button" id="article-video-remove"${video?'':' hidden'}>Remove video</button><p id="article-video-status" class="article-help" role="status">${video?'Video selected.':''}</p><label class="article-field"><span><input id="article-video-game" type="checkbox"${video?.showAfterGame?' checked':''}/> Also suggest after the related game</span></label><p class="article-help">If several articles suggest a video for the same game, the most recently updated one is used.</p><div id="article-video-preview">${videoCard(video)}</div></details>`;
}
export function bindVideoEditor(context,raw,onChange){
 const $=s=>context.root.querySelector(s),input=$('#article-video-url'),button=$('#article-video-check'),status=$('#article-video-status'),preview=$('#article-video-preview'),remove=$('#article-video-remove');
 let selected=cleanVideo(raw),sequence=0;
 const draw=()=>{preview.innerHTML=videoCard(selected);remove.hidden=!selected;const image=preview.querySelector('img');if(image)image.onerror=()=>{image.hidden=true;};};
 input.addEventListener('input',()=>{sequence++;button.disabled=false;status.textContent=input.value.trim()?'Press Load video to check this link.':'No video selected.';});
 remove.onclick=()=>{sequence++;button.disabled=false;input.value='';selected=null;$('#article-video-game').checked=false;draw();status.textContent='Video removed. Save the article to keep this change.';onChange();};
 button.onclick=async()=>{
  const id=youtubeId(input.value);if(!id){status.textContent='Paste a link to one YouTube video, not a playlist.';return;}
  const current=++sequence;button.disabled=true;status.textContent='Checking the video…';
  try{
   const {data,error}=await context.sb.auth.getSession();if(error||!data.session)throw Error('Sign in to the admin again.');
   const response=await fetch('/api/admin/video-info?id='+id,{headers:{Authorization:'Bearer '+data.session.access_token},signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'The video could not be checked.');
   if(current!==sequence||!input.isConnected)return;
   selected=cleanVideo(result.video);if(!selected)throw Error('The video could not be checked.');
   input.value='https://www.youtube.com/watch?v='+selected.id;draw();status.textContent='Video ready. Save draft or Publish to keep it.';onChange();
  }catch(error){if(current===sequence&&input.isConnected)status.textContent=error.message||'Try again later.';}
  finally{if(current===sequence)button.disabled=false;}
 };
 draw();
 return {
  collect(){return input.value.trim()&&selected?{...selected,showAfterGame:$('#article-video-game').checked}:null;},
  validate(){if(input.value.trim()&&(!selected||youtubeId(input.value)!==selected.id))throw Error('Load and check the related video before saving, or remove its link.');}
 };
}
