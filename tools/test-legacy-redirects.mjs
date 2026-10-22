import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{LEGACY_PAGES} from '../worker.js';
// Retired pages answer 301 with their replacement, keeping the query string.
const cases=[
 ['https://brainilabgames.com/games/flag-dash/','https://brainilabgames.com/geography/world-flags-quiz/'],
 ['https://brainilabgames.com/games/flag-dash/index.html?level=hard','https://brainilabgames.com/geography/world-flags-quiz/?level=hard'],
 ['https://brainilabgames.com/games/map-hunt','https://brainilabgames.com/games/topic-rush/'],
 ['https://brainilabgames.com/categories/','https://brainilabgames.com/games/'],
 ['https://brainilabgames.com/leaderboards/','https://brainilabgames.com/rankings/'],
 ['https://brainilabgames.com/profile/plus/?session_id=abc','https://brainilabgames.com/plus/?session_id=abc'],
 ['https://preview.workers.dev/games/map-hunt/','https://preview.workers.dev/games/topic-rush/']
];
for(const [input,expected] of cases){
 const r=await worker.fetch(new Request(input),{},{});
 assert.equal(r.status,301,input);assert.equal(r.headers.get('location'),expected,input);
}
assert.notEqual((await worker.fetch(new Request('https://brainilabgames.com/games/flag-dash/',{method:'POST'}),{ASSETS:{fetch:async()=>new Response('asset')}},{})).status,301);
// Every legacy path must reach the Worker before the static asset layer.
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));
for(const path of Object.keys(LEGACY_PAGES)){
 const first='/'+path.split('/')[1];
 assert.ok(config.assets.run_worker_first.includes(first+'/*'),path+' runs the Worker first');
}
const sitemap=readFileSync('sitemap.xml','utf8');
for(const path of Object.keys(LEGACY_PAGES))assert.ok(!sitemap.includes('https://brainilabgames.com'+path+'<'),path+' stays out of the sitemap');
console.log(`PASS legacy redirects: ${Object.keys(LEGACY_PAGES).length} retired pages answer 301 with the query kept, run the Worker first and stay out of the sitemap.`);
