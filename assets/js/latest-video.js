(()=>{
  const card=document.querySelector('[data-latest-video]');
  if(!card)return;
  fetch('/api/latest-video',{signal:AbortSignal.timeout(9000),credentials:'omit'})
    .then(response=>{if(!response.ok)throw new Error('Unavailable');return response.json();})
    .then(video=>{
      if(!/^[-\w]{11}$/.test(video.id||'')||typeof video.title!=='string')return;
      card.href='https://www.youtube.com/watch?v='+video.id;
      card.querySelector('[data-video-title]').textContent=video.title;
      card.querySelector('[data-video-label]').textContent=video.stale?'From our YouTube channel':'Latest on YouTube';
      const image=card.querySelector('img');
      const original=image.src;
      image.onerror=()=>{image.onerror=null;image.src=original;card.classList.remove('has-video');};
      image.src='/api/youtube-thumbnail/'+video.id;
      image.alt='';
      card.classList.add('has-video');
    }).catch(()=>{}); // The channel link is useful even when the feed is unavailable.
})();
