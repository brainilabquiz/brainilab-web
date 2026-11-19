import assert from 'node:assert/strict';
import {waitForPreviewManifest} from './preview-propagation.mjs';
const expected={commit:'a'.repeat(40),runtimeHash:'b'.repeat(64)},old={commit:'c'.repeat(40),runtimeHash:'d'.repeat(64)};
let time=0,reads=0;
const clock=()=>time,sleep=async ms=>{time+=ms;};
assert.deepEqual(await waitForPreviewManifest(expected,{read:async()=>++reads<3?old:expected,clock,sleep}),expected);
assert.equal(time,4000);assert.equal(reads,3);
for(const wrong of [old,{...expected,commit:old.commit},{...expected,runtimeHash:old.runtimeHash}]){
 time=0;await assert.rejects(waitForPreviewManifest(expected,{read:async()=>wrong,clock,sleep,timeoutMs:5000}),/timed out/);assert.equal(time,5000);
}
await assert.rejects(waitForPreviewManifest(expected,{read:async()=>{throw Error('Invalid release manifest');},clock,sleep}),/Invalid release manifest/);
console.log('PASS preview propagation: waits for exact uploaded revision/hash, bounded stale reads, no acceptance of the wrong identity or an invalid manifest.');
