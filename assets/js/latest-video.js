(()=>{
 const playlist='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4',knowledge='UCcqUq1aWcDoKyGT9QYCPqIA';
 for(const card of document.querySelectorAll('[data-latest-video]')){
  const isKnowledge=card.dataset.videoSource==='knowledge';
  const label=isKnowledge?'BrainiLab Knowledge':'BrainiLab';
  const image=card.querySelector('img');
  const fallback=()=>{image.onerror=null;image.src='/assets/brand/iso-multicolor.webp';card.classList.remove('has-video');};
  image.onerror=fallback;if(image.complete&&!image.naturalWidth)fallback();
  fetch('/api/latest-video?'+(isKnowledge?'channel=knowledge':'playlist='+playlist),{signal:AbortSignal.timeout(9000),credentials:'omit'})
   .then(response=>{if(!response.ok)throw Error('Unavailable');return response.json();})
   .then(video=>{
    if(video.unavailable||(isKnowledge?video.channelId!==knowledge:video.playlistId!==playlist)||!/^[-\w]{11}$/.test(video.id||'')||typeof video.title!=='string'||!video.title.trim()||video.title.length>250||!Number.isFinite(Date.parse(video.published))||Date.parse(video.published)>Date.now())return;
    // A stale but valid record is still useful. The label names the channel,
    // rather than making a freshness promise when an upstream request fails.
    const old=Date.parse(card.dataset.videoPublished);
    if(Number.isFinite(old)&&Date.parse(video.published)<old)return;
    card.href='https://www.youtube.com/watch?v='+video.id+(isKnowledge?'':'&list='+playlist);
    card.querySelector('[data-video-title]').textContent=video.title;
    card.querySelector('[data-video-label]').textContent=label;
    card.dataset.videoPublished=video.published;card.dataset.videoId=video.id;
    card.title=video.title;
    card.setAttribute('aria-label','Watch '+video.title+' on '+label+' (opens in a new tab)');
    image.onerror=fallback;image.src='/api/youtube-thumbnail/'+video.id+'?v=2';image.alt='';card.classList.add('has-video');
   }).catch(()=>{}); // Each card keeps its known working video independently.
 }
})();
