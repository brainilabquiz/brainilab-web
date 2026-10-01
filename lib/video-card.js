// Shared presentation. Construct every destination ourselves; never render pasted HTML.
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function youtubeId(value){
 if(typeof value!=='string')return null;
 const text=value.trim();if(/^[\w-]{11}$/.test(text))return text;
 try{
  const url=new URL(text);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  let id=null;
  if(url.hostname==='youtu.be')id=url.pathname.slice(1);
  if(['youtube.com','www.youtube.com','m.youtube.com'].includes(url.hostname)){
   id=url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]{11})\/?$/)?.[1];
  }
  return typeof id==='string'&&/^[\w-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function cleanVideo(raw){
 const id=youtubeId(raw?.id),title=typeof raw?.title==='string'?raw.title.trim().slice(0,180):'';
 return id&&title?{id,title,showAfterGame:raw.showAfterGame===true}:null;
}
export function videoCard(raw,placement='article'){
 const video=cleanVideo(raw);if(!video)return '';
 const place=placement==='post_game'?'post_game':'article';
 return `<a class="related-video" data-related-video="${place}" data-video-id="${video.id}" href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener"><span class="related-video-art"><img src="/api/youtube-thumbnail/${video.id}" width="320" height="180" loading="lazy" decoding="async" alt=""/><span class="related-video-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M9 5v14l11-7z"/></svg></span></span><span class="related-video-copy"><span class="related-video-label">${place==='post_game'?'Fancy a video quiz?':'Play along on YouTube'}</span><strong>${escape(video.title)}</strong><span class="related-video-link">Watch on YouTube <span aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></span></span></a>`;
}
export const VIDEO_GAMES=Object.freeze({brainmix:'/games/brain-mix/',worldflags:'/geography/world-flags-quiz/',worldcapitals:'/geography/world-capitals-quiz/',generalknowledge:'/general-knowledge/general-knowledge-quiz/',science:'/science/science-quiz/',history:'/history/history-quiz/',sports:'/sports/sports-quiz/',connections:'/games/connections/',mathrush:'/games/math-rush/',sequence:'/games/sequence/',brainiword:'/games/brainiword/',numberroute:'/games/number-route/',orderup:'/games/order-up/',topicrush:'/games/topic-rush/',oddoneout:'/games/odd-one-out/',higherlower:'/games/higher-lower/',survival:'/games/survival/'});
export function relatedVideo(articles,game){
 if(!Object.hasOwn(VIDEO_GAMES,game))return null;
 const date=a=>Date.parse(a.updatedAt||a.publishedAt)||0;
 return [...articles].filter(a=>a.game?.url===VIDEO_GAMES[game]&&cleanVideo(a.video)?.showAfterGame).sort((a,b)=>date(b)-date(a)||String(a.slug).localeCompare(String(b.slug))).map(a=>cleanVideo(a.video))[0]||null;
}
