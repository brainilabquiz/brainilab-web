import test from 'node:test';
import assert from 'node:assert/strict';
import {productionRequest, PRODUCTION_BACKEND} from '../lib/production-origin.js';
import worker from '../worker.js';

test('production backend preserves archive and challenge parameters', () => {
  const r = productionRequest(new Request(`https://${PRODUCTION_BACKEND}/games/brainiword/?archive=2026-09-07&challenge=abc%2Bdef`));
  assert.equal(r.url, 'https://brainilabgames.com/games/brainiword/?archive=2026-09-07&challenge=abc%2Bdef');
});

test('production backend preserves authentication and request body', async () => {
  const original = new Request(`https://${PRODUCTION_BACKEND}/api/admin/video-info`, {
    method: 'POST', headers: {Authorization: 'Bearer test-only-token', 'Content-Type': 'application/json'}, body: '{"example":1}'
  });
  const r = productionRequest(original);
  assert.equal(r.method, 'POST');
  assert.equal(r.headers.get('Authorization'), 'Bearer test-only-token');
  assert.equal(await r.text(), '{"example":1}');
});

test('branch previews and untrusted forwarded hosts cannot become production', () => {
  for (const host of [`codex-test-${PRODUCTION_BACKEND}`, 'preview.example.org', 'brainilabgames.com', `${PRODUCTION_BACKEND}.example.org`]) {
    const original = new Request(`https://${host}/breaking-news/`, {headers: {'X-Forwarded-Host': 'brainilabgames.com'}});
    assert.equal(productionRequest(original), original);
  }
  for (const origin of [`http://${PRODUCTION_BACKEND}`, `https://${PRODUCTION_BACKEND}:8443`]) {
    const original = new Request(origin + '/');
    assert.equal(productionRequest(original), original);
  }
});

test('canonical redirects from the backend return the public domain', async () => {
  const r = await worker.fetch(new Request(`https://${PRODUCTION_BACKEND}/index.html?source=friend`), {}, {});
  assert.equal(r.status, 308);
  assert.equal(r.headers.get('Location'), 'https://brainilabgames.com/?source=friend');
});

test('static routes preserve status, cache and security headers at the backend', async () => {
  let upstream;
  const env = {ASSETS: {fetch: async r => {
    upstream = r;
    return new Response('missing', {status: 404, headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
  }}};
  const r = await worker.fetch(new Request(`https://${PRODUCTION_BACKEND}/missing-file`), env, {});
  assert.equal(upstream.url, 'https://brainilabgames.com/missing-file');
  assert.equal(r.status, 404);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('backend reads the existing news store; HEAD and previews do not read it', async () => {
  let reads = 0;
  const env = {
    ASSETS: {fetch: async () => new Response('<!-- breaking-news -->', {headers: {'Content-Type': 'text/html'}})},
    BREAKING_NEWS: {idFromName: name => {assert.equal(name, 'world-news-v1'); return 1;}, get: () => ({fetch: async url => {
      assert.equal(url, 'https://news.internal/edition'); reads++;
      return Response.json({generatedAt: new Date().toISOString(), stories: []});
    }})}
  };
  await worker.fetch(new Request(`https://${PRODUCTION_BACKEND}/api/breaking-news`), env, {});
  assert.equal(reads, 1);
  await worker.fetch(new Request(`https://${PRODUCTION_BACKEND}/breaking-news/`, {method: 'HEAD'}), env, {});
  await worker.fetch(new Request(`https://codex-test-${PRODUCTION_BACKEND}/api/breaking-news`), env, {});
  assert.equal(reads, 1);
  assert.equal((await worker.fetch(new Request(`https://${PRODUCTION_BACKEND}/api/breaking-news`, {method: 'POST'}), env, {})).status, 405);
  assert.equal(reads, 1);
});
