// Check the same IDs used by results, the Daily, quizzes and historical progress.
// Run during every build so a new game cannot silently point to a missing icon.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const data=readFileSync('assets/js/data.js','utf8');
const registry=vm.runInNewContext('('+data.match(/const GAME_DEFS = (\{[\s\S]*?\n  \});/)[1]+')');
const source=readFileSync('assets/js/icon-system.js','utf8');
const ids=[...Object.keys(registry),'europeflags'];
let count=0;
for(const script of ['https://brainilabgames.com/assets/js/shell.bundle.js?v=41.50.1','https://preview.example/subdir/assets/js/icon-system.js','file:///C:/site/assets/js/shell.bundle.js']){
 const context={window:{},document:{currentScript:{src:script}},URL};vm.runInNewContext(source,context);
 const icons=context.window.BrainiIcons;
 const aliases=[...new Set([...ids,...Object.values(icons.GAME_FILES),...Object.values(icons.CATEGORY_BY_GAME)])];
 for(const id of aliases)for(const variant of ['standard','mini','card','mono']){
  const url=icons.gamePath(id,variant),markup=icons.game(id,variant,'post-game-art');
  assert.ok(markup.includes(`src="${url}"`),`${id}: game and gamePath must agree`);
  const root=new URL('../',script).href;
  assert.ok(url.startsWith(root),`${id}: URL must resolve from the script, not the current game page`);
  const file='assets/'+url.slice(root.length);
  assert.ok(existsSync(file),`${id}/${variant}: missing ${file}`);
  assert.match(readFileSync(file,'utf8'),/<svg\b/,`${id}: not an SVG`);
  count++;
 }
 for(const id of Object.keys(icons.CATEGORY_BY_GAME))assert.equal(icons.categoryPath(id),icons.gamePath(id),`${id}: same artwork for quiz and result`);
 assert.match(icons.gamePath('oddoneout'),/illustrations\/games\/odd-one-out.svg$/);
 assert.match(icons.gamePath('higherlower'),/illustrations\/games\/higher-lower.svg$/);
}
console.log(`PASS game icons: ${ids.length} game IDs, aliases, four variants and production/preview/file roots (${count} valid asset paths).`);
