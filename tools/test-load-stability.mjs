// Rankings, profile and suggestions keep their layout while scripts, data and web fonts arrive.
// Run: JSDOM_MODULE=<abs path to jsdom/lib/api.js> node tools/test-load-stability.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
const {JSDOM,VirtualConsole}=await import(pathToFileURL(process.env.JSDOM_MODULE).href);

// Profile: the guest note is painted as soon as the cloud script runs, before the avatar studio draws below it.
const auth=readFileSync('assets/js/auth.js','utf8');
function profileWith(status,root='<div data-profile-auth-root></div>'){
 const dom=new JSDOM(`<!doctype html><main>${root}<section id="my-avatar"></section></main>`,{runScripts:'outside-only',url:'https://brainilabgames.com/profile/',virtualConsole:new VirtualConsole()});
 const w=dom.window;
 w.BrainiData={authState:()=>({status}),api:{getAuthState:async()=>({status})}};
 w.eval(auth);
 const html=w.document.querySelector('[data-profile-auth-root]').innerHTML;
 w.close();
 return html;
}
assert.match(profileWith('guest'),/profile-guest-note/,'guests see the note without waiting for the session check');
assert.equal(profileWith('authenticated'),'','signed-in players get no note');
assert.equal(profileWith('guest','<div data-profile-auth-root><p>kept</p></div>'),'<p>kept</p>','an already painted area is left alone');
assert.ok(readFileSync('assets/js/cloud.bundle.js','utf8').includes('try{paintGuestNoteEarly();}catch{}'),'the cloud bundle carries the early guest note');

// Rankings: one title layout on phones, a held space for the board, and readable labels.
const rankings=readFileSync('assets/css/rankings.css','utf8');
assert.match(rankings,/@media\(max-width:420px\)\{\.rankings-page \.rankings-title\{flex:1 1 100%\}\}/,'the phone title takes its own row, so the web font cannot re-wrap "My groups"');
// Two rules: a browser without :has() still keeps the empty-board space.
assert.match(rankings,/#rankingsRoot:empty\{min-height:100vh\}\n#rankingsRoot:has\(>\.ranking-skeleton\)\{min-height:100vh\}/,'the board keeps a screen of space until it loads');
const readable=rankings.slice(rankings.indexOf('/* Readable minimum'));
for(const selector of ['.ranking-board-period','.rankings-page .ranking-list-head','.rankings-page .ranking-identity small','.ranking-player-count'])assert.ok(readable.includes(selector),selector+' is raised to 12px');
assert.match(readable,/\{font-size:12px\}/);
assert.match(readable,/\.ranking-you\{font-size:11px\}/);

// Suggestions: the kicker above the title is readable.
assert.match(readFileSync('assets/css/suggestions.css','utf8'),/\.suggestions-main \.auth-kicker\{font-size:12px\}/);
console.log('PASS load stability: profile guest note, rankings title row and board space, readable ranking and suggestion labels.');
