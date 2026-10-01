import {youtubeId,cleanVideo} from './video-card.js';
import {CHANNEL} from './youtube-playlist.js';
const DATABASE='https://wvgcdlxebbybthyuajgb.supabase.co';
const KEY='sb_publishable_8spWjgOq3d5KJsynwrx71Q_h1OJ34b7';
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function adminVideoInfo(request,apiKey,fetcher=fetch){
 const token=request.headers.get('Authorization');
 if(!/^Bearer [A-Za-z0-9._-]{20,8192}$/.test(token||''))return reply({error:'Sign in to the admin first.'},401);
 try{
  const session=await fetcher(DATABASE+'/rest/v1/rpc/get_brainilab_admin_session',{method:'POST',headers:{apikey:KEY,Authorization:token,'Content-Type':'application/json'},body:'{}',redirect:'manual',signal:AbortSignal.timeout(6000)});
  if(!session.ok)return reply({error:'Admin access could not be verified.'},403);
  const admin=await session.json();
  if(admin.admin!==true||admin.authenticated!==true||!['owner','editor'].includes(admin.role)||admin.mfa_satisfied!==true)return reply({error:'Article editor access is required.'},403);
  const id=youtubeId(new URL(request.url).searchParams.get('id'));
  if(!id)return reply({error:'Paste a link to a single YouTube video.'},400);
  if(!apiKey)return reply({error:'YouTube connection is unavailable. Try again later.'},503);
  const url=new URL('https://www.googleapis.com/youtube/v3/videos');
  url.search=new URLSearchParams({part:'snippet,status',id,key:apiKey,fields:'items(id,snippet(title,channelId,publishedAt,liveBroadcastContent),status(privacyStatus,uploadStatus))'}).toString();
  const response=await fetcher(url.href,{signal:AbortSignal.timeout(6000),redirect:'manual'});
  if(!response.ok)return reply({error:'YouTube could not be reached. Try again later.'},503);
  const body=await response.text();if(body.length>50000)return reply({error:'The video response could not be read.'},503);
  const data=JSON.parse(body),item=data.items?.find(v=>v.id===id);
  if(!item||item.snippet?.channelId!==CHANNEL||item.status?.privacyStatus!=='public'||item.status?.uploadStatus!=='processed'||item.snippet?.liveBroadcastContent!=='none'||!(Date.parse(item.snippet?.publishedAt)<=Date.now()))return reply({error:'Choose a published, public video from the BrainiLab channel.'},422);
  const video=cleanVideo({id,title:item.snippet.title});
  return video?reply({video}):reply({error:'This video has no usable title.'},422);
 }catch{return reply({error:'The video could not be checked. Try again later.'},503);}
}
