export const CHANNEL='UCy35EdjSpdYufOLJBybevsA';
export const PLAYLIST='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4';
export const PLAYLIST_URL='https://www.youtube.com/playlist?list='+PLAYLIST;
export function videoRecord(id,title,published){
  if(!/^[-\w]{11}$/.test(id||'')||typeof title!=='string'||!title.trim()||!Number.isFinite(Date.parse(published))||Date.parse(published)>Date.now())return null;
  return {id,title:title.trim().slice(0,250),published,url:'https://www.youtube.com/watch?v='+id+'&list='+PLAYLIST,thumbnail:'/api/youtube-thumbnail/'+id};
}
// API key is a Worker secret. Only this fixed public playlist is ever queried.
export async function latestPlaylistVideo(apiKey,fetcher=fetch){
  const signal=AbortSignal.timeout(7000),seen=new Set();
  let token='',latest=null;
  for(let page=0;page<10;page++){
    const url=new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    url.search=new URLSearchParams({part:'snippet,contentDetails,status',playlistId:PLAYLIST,maxResults:'50',key:apiKey,...(token?{pageToken:token}:{})});
    const response=await fetcher(url.toString(),{signal,redirect:'error',headers:{Accept:'application/json'}});
    if(!response.ok)throw Error('Video service unavailable');
    const body=await response.text();
    if(body.length>500000)throw Error('Video response too large');
    const data=JSON.parse(body);
    if(!Array.isArray(data.items))throw Error('Invalid video response');
    for(const item of data.items){
      const s=item?.snippet,c=item?.contentDetails;
      if(s?.playlistId!==PLAYLIST)throw Error('Unexpected playlist');
      if(s.videoOwnerChannelId!==CHANNEL||item.status?.privacyStatus!=='public'||s.resourceId?.kind!=='youtube#video'||s.resourceId.videoId!==c?.videoId)continue;
      // snippet.publishedAt is the date ADDED to the playlist, not publication.
      const video=videoRecord(c.videoId,s.title,c.videoPublishedAt);
      if(video&&(!latest||Date.parse(video.published)>Date.parse(latest.published)||video.published===latest.published&&video.id<latest.id))latest=video;
    }
    if(!data.nextPageToken)return latest;
    if(typeof data.nextPageToken!=='string'||data.nextPageToken.length>1024||seen.has(data.nextPageToken))throw Error('Invalid video pagination');
    token=data.nextPageToken;seen.add(token);
  }
  // Never label a partial scan as the newest video.
  throw Error('Video playlist exceeds scan limit');
}
