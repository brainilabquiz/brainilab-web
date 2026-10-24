import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {prepare,sha256,webpWidth,snapshotSql,publishSql} from './editorial-publish.mjs';
const stamp=new Date().toISOString(),now=Date.now();
function webp(width){const b=Buffer.alloc(30);b.write('RIFF');b.writeUInt32LE(22,4);b.write('WEBP',8);b.write('VP8X',12);b.writeUInt32LE(10,16);b.writeUIntLE(width-1,24,3);b.writeUIntLE(639,27,3);return b;}
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'brainilab-publisher-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const document={slug:'sample-reading',title:'Test',cover:{src:'/assets/images/learn/sample.webp',small:'/assets/images/learn/sample-small.webp',thumbnail:'/assets/images/learn/sample-thumb.webp',alt:'Sample illustration',credit:'Synthetic test fixture'}};
 const bytes=Buffer.from(JSON.stringify(document));await fs.writeFile(path.join(root,'document.json'),bytes);
 const proof=Buffer.from('Synthetic test evidence, never for publication');await fs.writeFile(path.join(root,'proof.txt'),proof);
 const review={documentSha256:sha256(bytes),checkedAt:stamp};
 for(const gate of ['intent','novelty','sources','examples','english','metadata','links','mobile','desktop','validators','demand'])review[gate]={status:'verified',proofFile:'proof.txt',proofSha256:sha256(proof)};
 Object.assign(review.demand,{type:'external-estimate',query:'test only',market:'TEST',language:'en',checkedAt:stamp});
 await fs.writeFile(path.join(root,'review.json'),JSON.stringify(review));
 const plan={id:'synthetic-test',entries:[{kind:'article',document:'document.json',review:'review.json'}]};
 const snapshot=Buffer.from(JSON.stringify({capturedAt:stamp,entries:[{kind:'article',slug:document.slug,revision:0,publishedRevision:0,snapshotHash:'missing'}]}));
 const fetcher=async url=>({type:'image/webp',bytes:webp(url.includes('-small')?480:url.includes('-thumb')?240:960)});
 return {root,plan,snapshot,fetcher,review,document};
}
test('binds proof bytes, verifies live dimensions, strips private paths and generates data-only SQL',async t=>{
 const f=await fixture(t),packet=await prepare(f.plan,f.snapshot,f.root,f.fetcher,now);
 assert.deepEqual(packet.entries[0].assets.map(x=>x.width),[960,480,240]);assert.equal(packet.entries[0].expectedSnapshotHash,'missing');
 assert.ok(!JSON.stringify(packet).includes('proofFile'));assert.ok(!JSON.stringify(packet).includes(f.root));
 const sql=publishSql(packet);assert.match(sql,/^select brainilab_editor\.publish_reviewed_release/);assert.ok(!sql.includes('test only'));
});
test('rejects changed proof',async t=>{const f=await fixture(t);await fs.writeFile(path.join(f.root,'proof.txt'),'edited');await assert.rejects(prepare(f.plan,f.snapshot,f.root,f.fetcher,now),/Changed .* evidence/);});
test('rejects changed document after review',async t=>{const f=await fixture(t);await fs.appendFile(path.join(f.root,'document.json'),' ');await assert.rejects(prepare(f.plan,f.snapshot,f.root,f.fetcher,now),/Review not bound/);});
test('requires actual demand proof rather than a generic reviewed flag',async t=>{const f=await fixture(t);delete f.review.demand;await fs.writeFile(path.join(f.root,'review.json'),JSON.stringify(f.review));await assert.rejects(prepare(f.plan,f.snapshot,f.root,f.fetcher,now),/Missing demand/);});
test('rejects wrong responsive dimensions',async t=>{const f=await fixture(t);await assert.rejects(prepare(f.plan,f.snapshot,f.root,async()=>({type:'image/webp',bytes:webp(960)}),now),/Incorrect 480px/);});
test('rejects HTML returned as an image',async t=>{const f=await fixture(t);await assert.rejects(prepare(f.plan,f.snapshot,f.root,async()=>({type:'text/html',bytes:Buffer.from('<html>')}),now),/Incorrect 960px/);});
test('requires explicit missing row and fresh snapshot',async t=>{const f=await fixture(t);await assert.rejects(prepare(f.plan,Buffer.from(JSON.stringify({capturedAt:stamp,entries:[]})),f.root,f.fetcher,now),/Explicit fresh snapshot/);await assert.rejects(prepare(f.plan,Buffer.from('{"capturedAt":"2000-01-01","entries":[]}'),f.root,f.fetcher,now),/Fresh backup/);});
test('rejects traversal to proof outside packet',async t=>{const f=await fixture(t);f.plan.entries[0].document='../outside.json';await assert.rejects(prepare(f.plan,f.snapshot,f.root,f.fetcher,now));});
test('snapshot SQL accepts only literal known kinds and safe slugs',()=>{assert.throws(()=>snapshotSql([{kind:'article',slug:"x');drop schema public;--"}]),/Invalid snapshot/);assert.throws(()=>snapshotSql([{kind:'author',slug:'person'}]));assert.match(snapshotSql([{kind:'article',slug:'sample'}]),/coalesce\(a\.revision,b\.revision,0\)/);});
test('WebP parser fails closed on malformed content',()=>{assert.throws(()=>webpWidth(Buffer.from('bad')),/Expected WebP/);const b=webp(480);b.writeUInt32LE(1000,16);assert.throws(()=>webpWidth(b),/Truncated WebP/);});
