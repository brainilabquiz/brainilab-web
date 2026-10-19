import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assetVersion} from '../lib/asset-versions.js';
import {halloweenAssets} from '../lib/halloween-assets.js';
import {decorateHalloween,renderHalloweenPage} from '../lib/halloween-render.js';
import {halloweenState,HALLOWEEN} from '../lib/halloween-event.js';

const files=['assets/css/halloween.css','assets/js/halloween-game-model.js','assets/js/halloween-hub.js','assets/js/halloween-games.js'];
assert.deepEqual(Object.keys(halloweenAssets),files);
for(const file of files){
 const bytes=readFileSync('dist/'+file),url=new URL(halloweenAssets[file],'https://brainilabgames.com');
 assert.equal(url.pathname,'/'+file);
 assert.equal(url.searchParams.get('v'),assetVersion(bytes),'Runtime URL follows the exact minified bytes: '+file);
 assert.equal(url.searchParams.getAll('v').length,1);
 assert.equal(halloweenAssets[file],'/'+file+'?v='+assetVersion(Buffer.from(bytes)),'Stable bytes reuse the cache');
 assert.notEqual(url.searchParams.get('v'),assetVersion(Buffer.concat([bytes,Buffer.from('\n/* changed */')])),'Changed bytes invalidate the cache');
}
const template='<html><head><title>Learn</title><link rel="canonical" href="https://brainilabgames.com/learn/"></head><body><main id="main-content"></main></body></html>';
for(const time of [Date.parse(HALLOWEEN.start),Date.parse(HALLOWEEN.end)]){
 const state=halloweenState(time,true);
 for(const game of [null,'trick-or-think','spooky-connections']){
  const html=renderHalloweenPage(template,state,game);
  const refs=[...html.matchAll(/(?:src|href)="([^"]*assets\/(?:css|js)\/halloween[^"\s]*)"/g)].map(m=>m[1]);
  const expected=files.filter(file=>game||file!=='assets/js/halloween-games.js').map(file=>halloweenAssets[file]);
  assert.deepEqual(refs.sort(),expected.sort(),'Every runtime CSS/JS tag is versioned once, active or closed');
 }
 const decorated=decorateHalloween(template,state,'/rankings/');
 assert.equal(decorated.includes(halloweenAssets[files[0]]),state.active,'Sitewide decoration uses the same current stylesheet');
}
console.log('PASS Halloween immutable asset cache: four exact published hashes, stable and changed bytes, hub and both games, active and closed pages, sitewide decoration.');
