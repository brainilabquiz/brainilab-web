import {HOME_CHANNELS} from './youtube-channel.js';
import {videoDescription} from './youtube-playlist.js';
const origin='https://brainilabgames.com';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function homeVideoSchema(video,key){
 const channel=HOME_CHANNELS[key];
 const description=videoDescription(video.description)||'Watch “'+video.title+'” from '+channel.name+'.';
 return {'@context':'https://schema.org','@type':'VideoObject','@id':video.url+'#video',name:video.title,description,url:video.url,thumbnailUrl:origin+'/api/youtube-thumbnail/'+video.id+'?v=2',uploadDate:video.published,creator:{'@type':'Organization',name:channel.name,url:channel.url},...(Number.isFinite(video.durationSeconds)&&video.durationSeconds>0?{duration:'PT'+video.durationSeconds+'S'}:{})};
}
export function homeVideoCard(video,key,short=false){
 const channel=HOME_CHANNELS[key],label=channel.name+(short?' · Short':''),date=new Date(video.published).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 const seconds=Number.isFinite(video.durationSeconds)&&video.durationSeconds>0?video.durationSeconds:null;
 const duration=seconds?`<span data-video-duration>${Math.floor(seconds/60)} min ${Math.floor(seconds%60)} sec</span>`:'';
 const action=short?'Play Short':'Play video';
 const metadata=homeVideoSchema(video,key);
 const schema=JSON.stringify(metadata).replace(/</g,'\\u003c');
 const imagePriority=short?'loading="lazy"':'loading="eager" fetchpriority="high"';
 return `<article class="home-video has-video" data-latest-video data-video-source="${key}" data-video-format="${short?'short':'long'}" data-video-id="${video.id}" data-video-published="${esc(video.published)}"><div class="home-video-player"><a data-video-play href="${esc(video.url)}" target="_blank" rel="noopener noreferrer" aria-label="${action}: ${esc(video.title)} on YouTube (opens in a new tab)"><img src="${esc(new URL(metadata.thumbnailUrl).pathname+'?v=2')}" width="320" height="180" ${imagePriority} decoding="async" alt=""><span aria-hidden="true" class="video-play">${action}</span></a></div><div class="home-video-copy"><span class="video-label" data-video-label>${label}</span><h2 data-video-title>${esc(video.title)}</h2><p class="video-meta">Published <time data-video-date datetime="${esc(video.published)}">${date}</time>${duration}</p><p class="home-video-description" data-video-description>${esc(metadata.description)}</p></div><script type="application/ld+json" data-video-schema>${schema}</script></article>`;
}
