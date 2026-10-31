import {HOME_CHANNELS} from './youtube-channel.js';
const origin='https://brainilabgames.com';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const homeVideoEmbed=id=>'https://www.youtube-nocookie.com/embed/'+id+'?playsinline=1&rel=0';
export function homeVideoSchema(video,key){
 const channel=HOME_CHANNELS[key];
 return {'@context':'https://schema.org','@type':'VideoObject','@id':video.url+'#video',name:video.title,url:video.url,thumbnailUrl:origin+'/api/youtube-thumbnail/'+video.id+'?v=2',uploadDate:video.published,embedUrl:homeVideoEmbed(video.id),creator:{'@type':'Organization',name:channel.name,url:channel.url},isPartOf:{'@id':origin+'/#webpage'},...(Number.isFinite(video.durationSeconds)&&video.durationSeconds>0?{duration:'PT'+video.durationSeconds+'S'}:{})};
}
export function homeVideoCard(video,key,short=false){
 const channel=HOME_CHANNELS[key],label=channel.name+(short?' · Short':''),date=new Date(video.published).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 const seconds=Number.isFinite(video.durationSeconds)&&video.durationSeconds>0?video.durationSeconds:null;
 const duration=seconds?`<span data-video-duration>${Math.floor(seconds/60)} min ${Math.floor(seconds%60)} sec</span>`:'';
 const schema=JSON.stringify(homeVideoSchema(video,key)).replace(/</g,'\\u003c');
 return `<article class="home-video has-video" data-latest-video data-video-source="${key}" data-video-format="${short?'short':'long'}" data-video-id="${video.id}" data-video-published="${esc(video.published)}"><div class="home-video-player"><iframe data-video-player src="${esc(homeVideoEmbed(video.id))}" title="Play ${esc(video.title)} on ${channel.name}" width="480" height="270" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div><div class="home-video-copy"><span class="video-label" data-video-label>${label}</span><h2 data-video-title>${esc(video.title)}</h2><p class="video-meta">Published <time data-video-date datetime="${esc(video.published)}">${date}</time>${duration}</p><a data-video-link class="video-action" href="${video.url}" target="_blank" rel="noopener noreferrer">${short?'Watch Short':'Watch'} on YouTube <span aria-hidden="true">↗</span></a></div><script type="application/ld+json" data-video-schema>${schema}</script></article>`;
}
