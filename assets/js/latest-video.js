(()=>{
  const card=document.querySelector('[data-latest-video]');
  if(!card)return;
  const playlist='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4';
  fetch('/api/latest-video?playlist='+playlist,{signal:AbortSignal.timeout(9000),credentials:'omit'})
    .then(response=>{if(!response.ok)throw new Error('Unavailable');return response.json();})
    .then(video=>{
      if(video.playlistId!==playlist||!/^[-\w]{11}$/.test(video.id||'')||typeof video.title!=='string')return;
      card.href='https://www.youtube.com/watch?v='+video.id+'&list='+playlist;
      card.querySelector('[data-video-title]').textContent=video.title;
      card.querySelector('[data-video-label]').textContent=video.stale?'General Knowledge on YouTube':'Latest General Knowledge quiz';
      const image=card.querySelector('img');
      const original=image.src;
      image.onerror=()=>{image.onerror=null;image.src=original;card.classList.remove('has-video');};
      image.src='/api/youtube-thumbnail/'+video.id;
      image.alt='';
      card.classList.add('has-video');
    }).catch(()=>{}); // The playlist link remains useful when the feed is unavailable.
})();
