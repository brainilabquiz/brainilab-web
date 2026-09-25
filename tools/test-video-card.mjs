import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const html=readFileSync('index.html','utf8'),script=readFileSync('assets/js/latest-video.js','utf8');
const playlist='PLUJ2DxFEKsFSGP_Ry6gY5jDwQNnDgFKh4';
const video={id:'newerVid002',playlistId:playlist,title:'<img src=x onerror=alert(1)>',stale:false};
for(const data of [video,{...video,stale:true},{unavailable:true},{...video,playlistId:'wrong'}]){
 const d=new JSDOM(html,{url:'https://brainilabgames.com/',runScripts:'outside-only'}),w=d.window;
 w.fetch=async()=>Response.json(data);w.AbortSignal=AbortSignal;w.eval(script);
 await new Promise(resolve=>setTimeout(resolve,20));
 const card=w.document.querySelector('[data-latest-video]');
 if(data===video){assert.ok(card.href.includes('watch?v=newerVid002'));assert.equal(card.querySelector('[data-video-title]').textContent,video.title);assert.equal(card.querySelector('[data-video-title] img'),null);assert.ok(card.classList.contains('has-video'));}
 else{assert.equal(card.href,'https://www.youtube.com/playlist?list='+playlist);assert.equal(card.classList.contains('has-video'),false);assert.equal(card.querySelector('[data-video-title]').textContent,'Watch a quiz. Play along.');}
 w.close();
}
console.log('Video card: fresh title is escaped; stale, unavailable and foreign-playlist data preserve the playlist link.');
