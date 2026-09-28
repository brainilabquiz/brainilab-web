import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../assets/js/admin.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('  function esc('),source.indexOf('  function when('));
const metric=source.slice(source.indexOf('  function metric('),source.indexOf('  function dailyGameCard('));
const calculation=source.slice(source.indexOf('    const verifiedPct='),source.indexOf('    const daily=d.daily'));
const invocation=source.match(/\$\{(metric\("Verified answers"[^\n]+)\}/)[1];
function render(d){
  return vm.runInNewContext(`${helpers}\n${metric}\n${calculation}\n${invocation}`,{d});
}
for(const [data,expected] of [
  [{},'—'],
  [{results_today:0,answers_verified_today:0},'—'],
  [{results_today:4,answers_verified_today:2},'50%'],
  [{results_today:4,answers_verified_today:0},'0%'],
  [{results_today:3,answers_verified_today:1},`${(33.3).toLocaleString()}%`],
  [{results_today:'4',answers_verified_today:'4'},'100%']
]){
  const html=render(data);
  assert.ok(html.includes(`<strong>${expected}</strong>`),html);
  assert.ok(!html.includes('NaN'),html);
}
const textMetric=vm.runInNewContext(`${helpers}\n${metric}\nmetric('Top game', 'Brain Mix <test>', 'By completed plays')`);
assert.ok(textMetric.includes('<strong>Brain Mix &lt;test&gt;</strong>'));
console.log('Admin dashboard: empty, zero and fractional rates plus escaped game names passed.');
