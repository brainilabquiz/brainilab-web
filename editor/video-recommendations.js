import {videoCard,VIDEO_GAMES,cleanVideo} from '../lib/video-card.js';
const pending=new Map(),requests=new WeakMap();
function load(game){
 if(!pending.has(game))pending.set(game,fetch('/api/related-video?game='+encodeURIComponent(game),{credentials:'omit',signal:AbortSignal.timeout(6000)}).then(async response=>{
  if(!response.ok)throw Error('Video unavailable');return cleanVideo((await response.json()).video);
 }).catch(()=>{pending.delete(game);return null;}));
 return pending.get(game);
}
async function mount(slot,{gameId}={}){
 if(!slot)return;
 const request={};requests.set(slot,request);slot.hidden=true;slot.replaceChildren();
 if(!Object.hasOwn(VIDEO_GAMES,gameId))return;
 const video=await load(gameId);
 if(!video||!slot.isConnected||requests.get(slot)!==request)return;
 slot.innerHTML=videoCard(video,'post_game');slot.hidden=false;
}
// Same-origin thumbnails only. A missing image leaves the brand-coloured play tile.
document.addEventListener('error',event=>{const image=event.target;if(image?.matches?.('.related-video-art img'))image.hidden=true;},true);
window.BrainiRelatedVideo={mount};
