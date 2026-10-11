import assert from 'node:assert/strict';
import {assetVersion, versionAssets} from '../lib/asset-versions.js';

const versions = new Map([
  ['assets/css/site.css', assetVersion('body{color:#2d296e}')],
  ['assets/css/home.css', assetVersion('.challenge-wrap{order:-1}')],
  ['assets/js/shell.bundle.js', assetVersion('window.ready=true;')]
]);
const version = versions.get('assets/css/home.css');
assert.notEqual(version, assetVersion('.challenge-wrap{order:0}'), 'A CSS change must invalidate an immutable cached URL');
assert.equal(version, assetVersion('.challenge-wrap{order:-1}'), 'Unchanged CSS must keep its cache URL');
for (const [page, href] of [['index.html', 'assets/css/home.css'], ['learn/example/index.html', '../../assets/css/home.css'], ['games/flags/index.html', '/assets/css/home.css']]) {
  const html = `<link rel="stylesheet" href="${href}?v=old">`;
  const result = versionAssets(html, page, versions);
  assert.equal(result, `<link rel="stylesheet" href="${href}?v=${version}">`);
  assert.equal(versionAssets(result, page, versions), result, 'Versioning must be idempotent');
}
assert.equal(versionAssets("<LINK HREF='/assets/css/home.css' REL='stylesheet' media='print'>", 'index.html', versions), `<LINK HREF='/assets/css/home.css?v=${version}' REL='stylesheet' media='print'>`);
assert.equal(versionAssets('<link rel="stylesheet" href="/assets/css/home.css?theme=warm&amp;v=old&amp;mode=light#test">', 'index.html', versions), `<link rel="stylesheet" href="/assets/css/home.css?theme=warm&amp;mode=light&amp;v=${version}#test">`);
const untouched = `<link rel="stylesheet" href="https://fonts.example.org/css?v=old"><link rel="stylesheet" href="//cdn.example.org/assets/css/home.css?v=old"><script>const example='<link rel="stylesheet" href="/assets/css/home.css?v=old">';</script><!-- <link rel="stylesheet" href="/assets/css/home.css?v=old"> -->`;
assert.equal(versionAssets(untouched, 'index.html', versions), untouched);
const scriptVersion = versions.get('assets/js/shell.bundle.js');
assert.equal(versionAssets('<script defer src="/assets/js/shell.bundle.js?v=old"></script>', 'index.html', versions), `<script defer src="/assets/js/shell.bundle.js?v=${scriptVersion}"></script>`);
assert.equal(versionAssets('<link rel="preload" as="script" href="/assets/js/shell.bundle.js?v=old">', 'index.html', versions), `<link rel="preload" as="script" href="/assets/js/shell.bundle.js?v=${scriptVersion}">`);
assert.throws(() => versionAssets('<link rel="stylesheet" href="/assets/css/missing.css?v=old">', 'index.html', versions), /Missing published asset/);
console.log('PASS CSS/JS cache versions: updates, nested paths, query strings, unchanged content and missing assets.');
