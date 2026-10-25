export const CHANNEL='UCy35EdjSpdYufOLJBybevsA';
export const PLAYLIST='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4';
export const PLAYLIST_URL='https://www.youtube.com/playlist?list='+PLAYLIST;
export function durationSeconds(value){
  const m=typeof value==='string'&&/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  if(!m||!m.slice(1).some(v=>v!==undefined))return null;
  const seconds=Number(m[1]||0)*86400+Number(m[2]||0)*3600+Number(m[3]||0)*60+Number(m[4]||0);
  return Number.isFinite(seconds)&&seconds>0?seconds:null;
}
export const isLongVideo=video=>Number.isFinite(video?.durationSeconds)&&video.durationSeconds>180;
export function videoRecord(id,title,published,playlist=PLAYLIST){
  if(!/^[-\w]{11}$/.test(id||'')||typeof title!=='string'||!title.trim()||!Number.isFinite(Date.parse(published))||Date.parse(published)>Date.now())return null;
  return {id,title:title.trim().slice(0,250),published,url:'https://www.youtube.com/watch?v='+id+(playlist?'&list='+playlist:''),thumbnail:'/api/youtube-thumbnail/'+id};
}
// Selections are server-owned: the existing quiz list or the verified Knowledge
// channel's uploads list. Request parameters are never passed through here.
export async function latestPlaylistVideo(apiKey,fetcher=fetch,selection={}){
  const playlistId=selection.playlistId||PLAYLIST,channelId=selection.channelId||CHANNEL;
  const signal=selection.signal||AbortSignal.timeout(7000),seen=new Set();
  let token='',latest=null;
  for(let page=0;page<10;page++){
    const url=new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.search=new URLSearchParams({part:'snippet,contentDetails,status',playlistId,maxResults:'50',key:apiKey,...(token?{pageToken:token}:{})});
    const response=await fetcher(url.toString(),{signal,redirect:'manual',headers:{Accept:'application/json'}});
    if(!response.ok){
      const error=Error('Video service unavailable');
      error.videoStatus=response.status;
      const reasons=new Set(['accessNotConfigured','quotaExceeded','dailyLimitExceeded','keyInvalid','forbidden','playlistNotFound','ipRefererBlocked','API_KEY_INVALID','API_KEY_SERVICE_BLOCKED']);
      const body=await response.json().catch(()=>null);
      const reason=body?.error?.errors?.[0]?.reason||body?.error?.details?.[0]?.reason;
      error.videoReason=reasons.has(reason)?reason:'upstream';
      throw error;
    }
    const body=await response.text();
    if(body.length>500000)throw Error('Video response too large');
    const data=JSON.parse(body);
    if(!Array.isArray(data.items))throw Error('Invalid video response');
    const candidates=[];
    for(const item of data.items){
      const s=item?.snippet,c=item?.contentDetails;
      if(s?.playlistId!==playlistId)throw Error('Unexpected playlist');
      if(s.videoOwnerChannelId!==channelId||item.status?.privacyStatus!=='public'||s.resourceId?.kind!=='youtube#video'||s.resourceId.videoId!==c?.videoId)continue;
      // snippet.publishedAt is the date ADDED to the playlist, not publication.
      const video=videoRecord(c.videoId,s.title,c.videoPublishedAt,selection.standalone?null:playlistId);
      if(video)candidates.push(video);
    }
    let eligible=candidates;
    if(selection.longForm&&candidates.length){
      const detailsUrl=new URL('https://www.googleapis.com/youtube/v3/videos');
      detailsUrl.search=new URLSearchParams({part:'snippet,contentDetails,status',fields:'items(id,snippet(channelId,title,publishedAt,liveBroadcastContent),contentDetails(duration),status(privacyStatus))',id:[...new Set(candidates.map(v=>v.id))].join(','),key:apiKey});
      const detailsResponse=await fetcher(detailsUrl.toString(),{signal,redirect:'manual',headers:{Accept:'application/json'}});
      if(!detailsResponse.ok){const error=Error('Video service unavailable');error.videoStatus=detailsResponse.status;throw error;}
      const detailsBody=await detailsResponse.text();if(detailsBody.length>500000)throw Error('Video response too large');
      const details=JSON.parse(detailsBody);if(!Array.isArray(details.items))throw Error('Invalid video response');
      const ids=new Set(candidates.map(v=>v.id));
      eligible=details.items.flatMap(item=>{
        if(!ids.has(item?.id)||item.snippet?.channelId!==channelId||item.status?.privacyStatus!=='public'||['live','upcoming'].includes(item.snippet?.liveBroadcastContent))return [];
        const video=videoRecord(item.id,item.snippet.title,item.snippet.publishedAt,selection.standalone?null:playlistId);
        const seconds=durationSeconds(item.contentDetails?.duration);
        return video&&isLongVideo({durationSeconds:seconds})?[{...video,durationSeconds:seconds}]:[];
      });
    }
    for(const video of eligible)if(!latest||Date.parse(video.published)>Date.parse(latest.published)||video.published===latest.published&&video.id<latest.id)latest=video;
    if(!data.nextPageToken)return latest;
    if(typeof data.nextPageToken!=='string'||data.nextPageToken.length>1024||seen.has(data.nextPageToken))throw Error('Invalid video pagination');
    token=data.nextPageToken;seen.add(token);
  }
  // Never label a partial scan as the newest video.
  throw Error('Video playlist exceeds scan limit');
}
