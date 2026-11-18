(()=>{
 const channels={knowledge:{id:'UCcqUq1aWcDoKyGT9QYCPqIA',name:'BrainiLab Knowledge',url:'https://www.youtube.com/@BrainiLabKnowledge'},brainilab:{id:'UCy35EdjSpdYufOLJBybevsA',name:'BrainiLab',url:'https://www.youtube.com/@BrainiLab'}};
 for(const card of document.querySelectorAll('[data-latest-video]')){
  const source=card.dataset.videoSource;if(!Object.hasOwn(channels,source))continue;
  const channel=channels[source],short=source==='knowledge'&&card.dataset.videoFormat==='short',label=channel.name+(short?' · Short':'');
  const poster=card.querySelector('[data-video-play]');
  if(!poster)continue;
  const schemaElement=card.querySelector('[data-video-schema]');
  let refreshing=false;
  function refresh(){
   if(refreshing)return;
   refreshing=true;
   fetch('/api/latest-video?channel='+source+(short?'&format=short':''),{signal:AbortSignal.timeout(9000),credentials:'omit'})
   .then(response=>{if(!response.ok)throw Error('Unavailable');return response.json();})
   .then(video=>{
    const validFormat=short?video.format==='short'&&video.source==='youtube-shorts-feed'&&video.shortsPlaylistId==='UUSHcqUq1aWcDoKyGT9QYCPqIA'&&video.url==='https://www.youtube.com/shorts/'+video.id:video.format!=='short'&&Number.isFinite(video.durationSeconds)&&video.durationSeconds>180;
    if(video.unavailable||!validFormat||video.channelId!==channel.id||!/^[-\w]{11}$/.test(video.id||'')||typeof video.title!=='string'||!video.title.trim()||video.title.length>250||!Number.isFinite(Date.parse(video.published))||Date.parse(video.published)>Date.now())return;
    const old=Date.parse(card.dataset.videoPublished);
    if(Number.isFinite(old)&&Date.parse(video.published)<old)return;
    if(!poster.isConnected)return;
    const title=video.title.trim(),url='https://www.youtube.com/'+(short?'shorts/':'watch?v=')+video.id;
    const description=typeof video.description==='string'&&video.description.trim()
     ?video.description.trim().slice(0,220):'Watch “'+title+'” from '+channel.name+'.';
    const thumbnail='/api/youtube-thumbnail/'+video.id+'?v=2';
    const schema={'@context':'https://schema.org','@type':'VideoObject','@id':url+'#video',name:title,description,url,thumbnailUrl:'https://brainilabgames.com'+thumbnail,uploadDate:video.published,creator:{'@type':'Organization',name:channel.name,url:channel.url}};
    const seconds=Number.isFinite(video.durationSeconds)&&video.durationSeconds>0?video.durationSeconds:null;
    if(seconds)schema.duration='PT'+seconds+'S';
    // Update the visible content and its schema together, from one verified record.
    card.querySelector('[data-video-title]').textContent=title;
    card.querySelector('[data-video-label]').textContent=label;
    card.querySelector('[data-video-description]').textContent=description;
    const date=card.querySelector('[data-video-date]');date.dateTime=video.published;date.textContent=new Date(video.published).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
    let duration=card.querySelector('[data-video-duration]');
    if(seconds){if(!duration){duration=document.createElement('span');duration.dataset.videoDuration='';date.parentElement.append(duration);}duration.textContent=Math.floor(seconds/60)+' min '+Math.floor(seconds%60)+' sec';}else duration?.remove();
    poster.href=url;
    poster.setAttribute('aria-label',(short?'Play Short':'Play video')+': '+title+' on YouTube (opens in a new tab)');
    if(card.dataset.videoId!==video.id)poster.querySelector('img').src=thumbnail;
    card.dataset.videoPublished=video.published;card.dataset.videoId=video.id;
    schemaElement.textContent=JSON.stringify(schema).replace(/</g,'\\u003c');
   }).catch(()=>{}).finally(()=>{refreshing=false;}); // Keep the last displayed card on failure.
  }
  refresh();
  if(source==='brainilab'){
   const refreshWhileVisible=()=>{if(!document.hidden)refresh();};
   setInterval(refreshWhileVisible,5*60_000);
   document.addEventListener('visibilitychange',refreshWhileVisible);
  }
 }
})();
