import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);
const modelSource=readFileSync('assets/js/halloween-game-model.js','utf8'),uiSource=readFileSync('assets/js/halloween-games.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
const plain=value=>JSON.parse(JSON.stringify(value));
let scenarios=0;
async function setup(game='trick-or-think',options={}){
 const dom=new JSDOM(`<section data-halloween-game="${game}"></section>`,{url:'https://brainilabgames.com/halloween/'+game+'/',runScripts:'outside-only'}),w=dom.window;
 const calls={owner:'guest:sharing-test',allowed:true,clipboard:[],native:[],saved:0,release:null};
 w.fetch=()=>{throw Error('Sharing must not make network requests');};
 w.BrainiData={api:{submitGameResult(){throw Error('Daily must not be called');}}};
 w.eval(modelSource);const m=w.BrainiHalloweenGameModel,pack=m.game(game),preview=!!options.preview;
 const submission=game==='trick-or-think'?{answers:pack.questions.map((q,i)=>({id:q.id,answer:i<7?q.answer:q.options.find(o=>o.id!==q.answer).id}))}:{attempts:[['w00','w01','w04','w08'],...pack.groups.map(g=>plain(g.wordIds))]};
 const result=plain(m.summary(game,submission));
 w.BrainiLabHalloween={identityKey:()=>calls.owner,availability:()=>({allowed:calls.allowed,preview,day:'2026-10-19'}),snapshot:()=>({entitlements:[]}),completeGame:()=>{calls.saved++;return new Promise(()=>{});}};
 if(options.clipboard!==false)Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{calls.clipboard.push(text);if(options.copyFail)throw Error('Denied');if(options.copyHeld)return new Promise(resolve=>{calls.release=resolve;});}}});
 if(options.native)Object.defineProperty(w.navigator,'share',{value:async data=>{calls.native.push(plain(data));if(options.nativeError)throw Object.assign(Error('Native share'),{name:options.nativeError});if(options.nativeHeld)return new Promise(resolve=>{calls.release=resolve;});}});
 if(options.canShare===false)Object.defineProperty(w.navigator,'canShare',{value:()=>false});
 const session={session_id:'share-session',game,day:'2026-10-19',ownerKey:calls.owner,guest:true,preview,pack:plain(m.publicPack(game)),practice:!!options.practice,savedResultScore:options.practice?40:null};
 const key='brainilab_halloween_game_v1:'+(preview?'preview:':'live:')+encodeURIComponent(calls.owner)+':'+game;
 w.localStorage.setItem(key,JSON.stringify({version:pack.version,preview,session,submission,screen:'result',answered:false,saved:!options.pending}));
 w.eval(uiSource);await tick();
 const root=w.document.querySelector('section');
 return {dom,w,m,root,calls,result,game,close(){dom.window.close();}};
}
function open(u){u.root.querySelector('[data-hg-share]').click();return u.root.querySelector('[data-hg-share-panel]')||u.root.querySelector('.halloween-invitation');}
function edit(u,text){const field=u.root.querySelector('[data-hg-invite-message]');field.value=text;field.dispatchEvent(new u.w.Event('input',{bubbles:true}));}
function data(u){const text=u.root.querySelector('[data-hg-invite-message]').value.trim(),url='https://brainilabgames.com/halloween/'+u.game+'/#challenge='+u.result.score;return {text,url,full:text+'\n'+url};}
for(const game of ['trick-or-think','spooky-connections']){
 const u=await setup(game);
 for(const score of [0,70,100]){const invite=u.m.share(game,{score,answers:['secret-answer'],userId:'private-id'});assert.ok(invite.text.includes(score+'/100'));assert.match(invite.text,score===100?/Can you match me/:score===0?/Think you can do better/:/Think you can beat me/);assert.match(invite.text,/I got/);assert.ok(!/secret-answer|private-id|q01|w00|Turnips|FEMUR/.test(JSON.stringify(invite)));assert.equal(new URL(invite.url).search,'');assert.equal(new URL(invite.url).hash,'#challenge='+score);}
 assert.match(u.m.share(game,{score:70}).text,game==='trick-or-think'?/Ten Halloween questions/:/Four hidden groups/);
 for(const score of [-1,101,NaN,Infinity,'70',70.5])assert.throws(()=>u.m.share(game,{score}));
 const panel=open(u);assert.equal(panel.hidden,false);assert.equal(u.calls.clipboard.length,0);assert.equal(u.calls.native.length,0);assert.equal(u.w.document.activeElement,u.root.querySelector('[data-hg-invite-message]'));
 const before=data(u);assert.equal(u.root.querySelector('[data-hg-invite-send]'),null);
 const wa=new URL(u.root.querySelector('[data-hg-invite-whatsapp]').href);assert.equal(wa.origin,'https://wa.me');assert.equal(wa.searchParams.get('text'),before.full);assert.equal(u.root.querySelector('[data-hg-invite-whatsapp]').rel,'noopener noreferrer');
 const personal='Your turn, Sam! I reckon you can beat my '+u.result.score+'/100 👻';edit(u,personal);
 u.root.querySelector('[data-hg-invite-copy]').click();await tick();assert.deepEqual(u.calls.clipboard,[data(u).full]);assert.equal(new URL(u.root.querySelector('[data-hg-invite-whatsapp]').href).searchParams.get('text'),data(u).full);assert.match(u.root.querySelector('[data-hg-share-status]').textContent,/Invitation copied/);
 u.root.querySelector('[data-hg-share]').click();assert.equal(panel.hidden,true);assert.equal(u.w.document.activeElement,u.root.querySelector('[data-hg-share]'));open(u);assert.equal(data(u).text,personal,'Closing preserves the edited message');assert.equal(u.calls.saved,0);scenarios++;u.close();
}
const native=await setup('trick-or-think',{native:true});open(native);edit(native,'Fancy a quick challenge? Your turn!');native.root.querySelector('[data-hg-invite-send]').click();await tick();assert.equal(native.calls.native.length,1);assert.equal(native.calls.native[0].text,data(native).text);assert.equal(native.calls.native[0].url,data(native).url);assert.equal(native.calls.clipboard.length,0);assert.doesNotMatch(native.root.querySelector('[data-hg-share-status]').textContent,/sent|delivered/i,'Native handoff is not proof of delivery');scenarios++;native.close();
const cancel=await setup('spooky-connections',{native:true,nativeError:'AbortError'});open(cancel);cancel.root.querySelector('[data-hg-invite-send]').click();await tick();assert.equal(cancel.root.querySelector('[data-hg-share-status]').textContent,'');assert.equal(cancel.calls.clipboard.length,0,'Cancellation never auto-copies');assert.equal(cancel.root.querySelector('[data-hg-invite-send]').disabled,false);scenarios++;cancel.close();
for(const mode of [{native:true,nativeError:'NotAllowedError'},{native:true,canShare:false}]){
 const u=await setup('trick-or-think',mode);open(u);u.root.querySelector('[data-hg-invite-send]').click();await tick();assert.match(u.root.querySelector('[data-hg-share-status]').textContent,/copy the invitation instead/);assert.equal(u.w.document.activeElement,u.root.querySelector('[data-hg-invite-copy]'));u.root.querySelector('[data-hg-invite-copy]').click();await tick();assert.equal(u.calls.clipboard.length,1);scenarios++;u.close();
}
for(const options of [{clipboard:false},{copyFail:true}]){
 const u=await setup('spooky-connections',options);open(u);edit(u,'Ready for your turn?');u.root.querySelector('[data-hg-invite-copy]').click();await tick();const manual=u.root.querySelector('[aria-label="Invitation to copy"]');assert.equal(manual.value,data(u).full);assert.equal(manual.readOnly,true);assert.equal(manual.selectionStart,0);assert.equal(manual.selectionEnd,manual.value.length);assert.equal(u.w.document.activeElement,manual);edit(u,'One more try!');assert.equal(u.root.querySelector('[aria-label="Invitation to copy"]'),null,'An edit removes a stale manual copy');scenarios++;u.close();
}
const empty=await setup('trick-or-think',{native:true});open(empty);edit(empty,'  ');assert.equal(empty.root.querySelector('[data-hg-invite-copy]').disabled,true);assert.equal(empty.root.querySelector('[data-hg-invite-send]').disabled,true);assert.equal(empty.root.querySelector('[data-hg-invite-whatsapp]').hasAttribute('href'),false);assert.match(empty.root.querySelector('[data-hg-share-status]').textContent,/Write a short message/);scenarios++;empty.close();
const unsafe=await setup('trick-or-think');open(unsafe);edit(unsafe,'<img src=x onerror="bad()"> & hello');unsafe.root.querySelector('[data-hg-invite-copy]').click();await tick();assert.equal(unsafe.root.querySelectorAll('img,script').length,0);assert.equal(unsafe.calls.clipboard[0],data(unsafe).full);assert.equal(new URL(unsafe.root.querySelector('[data-hg-invite-whatsapp]').href).searchParams.get('text'),data(unsafe).full);scenarios++;unsafe.close();
for(const game of ['trick-or-think','spooky-connections']){
 const u=await setup(game,{preview:true,native:true});open(u);assert.equal(u.root.querySelector('[data-hg-invite-copy]').disabled,true);assert.equal(u.root.querySelector('[data-hg-invite-send]').disabled,true);assert.equal(u.root.querySelector('[data-hg-invite-whatsapp]').hasAttribute('href'),false);assert.match(u.root.querySelector('[data-hg-share-status]').textContent,/Preview only/);assert.equal(u.calls.clipboard.length+u.calls.native.length,0);scenarios++;u.close();
}
const pending=await setup('trick-or-think',{pending:true});assert.equal(pending.root.querySelector('[data-hg-share]').disabled,true);pending.root.querySelector('[data-hg-share]').click();assert.equal(pending.root.querySelector('[data-hg-invite-message]'),null);scenarios++;pending.close();
const expired=await setup('trick-or-think',{native:true});open(expired);expired.calls.allowed=false;expired.root.querySelector('[data-hg-invite-send]').click();expired.root.querySelector('[data-hg-invite-copy]').click();await tick();assert.equal(expired.calls.clipboard.length+expired.calls.native.length,0);assert.match(expired.root.querySelector('[data-hg-share-status]').textContent,/Halloween games have finished/);scenarios++;expired.close();
for(const type of ['copy','native']){
 const u=await setup('spooky-connections',{native:true,copyHeld:type==='copy',nativeHeld:type==='native'});open(u);const button=u.root.querySelector(type==='copy'?'[data-hg-invite-copy]':'[data-hg-invite-send]');button.click();button.click();await tick();assert.equal(u.calls.clipboard.length+u.calls.native.length,1);u.calls.release();await tick();assert.equal(button.disabled,false);scenarios++;u.close();
}
const changed=await setup('trick-or-think',{native:true});open(changed);const oldCopy=changed.root.querySelector('[data-hg-invite-copy]');changed.calls.owner='account:another-person';changed.w.dispatchEvent(new changed.w.Event('brainilab:authchange'));oldCopy.click();await tick();assert.equal(changed.calls.clipboard.length+changed.calls.native.length,0);assert.match(changed.root.textContent,/account has changed/);scenarios++;changed.close();
const practice=await setup('trick-or-think',{practice:true});open(practice);practice.root.querySelector('[data-hg-invite-copy]').click();await tick();assert.match(practice.calls.clipboard[0],/70\/100/);assert.equal(practice.calls.saved,0);scenarios++;practice.close();
console.log(`PASS Halloween sharing: ${scenarios} cases; distinct personal messages, fair100/0 wording, editable preview, native handoff/cancel/failure, WhatsApp parity, clipboard/manual fallback, empty/unsafe input, owner/expiry/preview/pending guards and duplicate-click prevention. No messages sent.`);
