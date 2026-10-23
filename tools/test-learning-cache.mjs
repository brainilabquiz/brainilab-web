import assert from 'node:assert/strict';
import {learningAssets,learningAssetsFrom,renderLearningPage} from '../lib/learning-render.js';
import {renderPage,prepareArticle} from '../lib/learn-content.js';
import {pageStyles} from '../lib/page-styles.js';

const css='/assets/css/learning-paths.css?v=0123456789ab';
const js='/assets/js/learning-paths.bundle.js?v=abcdef012345';
const template=`<html><head><title>Learn</title><link rel="stylesheet" href="${css}"/><script defer src="${js}"></script></head><body><main id="main-content"></main></body></html>`;
const article=prepareArticle({slug:'cache-example',title:'A curious question',description:'An example.',topic:'Curiosity',sections:[],sources:[],related:[],cover:{src:'/assets/images/learn/daily-or-anytime.webp'},game:{name:'Games',url:'/games/'}});
for(const html of [renderPage(template,[],null),renderPage(template,[article],article),renderLearningPage(template,{})]){
 assert.ok(html.includes(css),'A CMS render must preserve the published stylesheet version');
 assert.ok(html.includes(js),'A CMS render must preserve the published script version');
 assert.equal((html.match(/href="\/assets\/css\/learning-paths\.css/g)||[]).length,1);
 assert.equal((html.match(/src="\/assets\/js\/learning-paths\.bundle\.js/g)||[]).length,1);
 assert.ok(!html.includes('?v=10"'),'Runtime pages must not revert to the static source version');
}
assert.equal(learningAssetsFrom('<head></head>'),learningAssets,'Static generation must still work before hashes are assigned');
const updated=template.replace('0123456789ab','111111111111').replace('abcdef012345','222222222222');
const updatedPage=renderPage(updated,[],null);
assert.ok(updatedPage.includes('?v=111111111111')&&updatedPage.includes('?v=222222222222'));
const fullTemplate=template.replace('<title>Learn</title>','<title>Learn</title><link rel="stylesheet" href="/assets/css/site.css?v=base"/><link rel="stylesheet" href="/assets/css/mobile.css?v=mobile"/><link rel="stylesheet" href="/assets/css/editorial.css"/><link rel="stylesheet" href="/assets/css/visual-system.css"/>');
const bundled=pageStyles(fullTemplate,'learn/index.html');
assert.deepEqual(bundled.files,['assets/css/editorial.css','assets/css/visual-system.css']);
assert.equal(learningAssetsFrom(bundled.html),learningAssetsFrom(fullTemplate),'the shared Learn bundle must preserve the standalone exact Academy cache URLs');
for(const html of [renderPage(bundled.html,[article],article),renderPage(bundled.html,[],null),renderLearningPage(bundled.html,{})]){
 assert.equal((html.match(/href="\/assets\/css\/learn-page\.css/g)||[]).length,1);
 assert.equal((html.match(/href="\/assets\/css\/learning-paths\.css/g)||[]).length,1);
 assert.ok(html.includes(css)&&html.includes(js));assert.ok(!html.includes('?v=10"'),'CMS must not replace published Academy versions after CSS grouping');
}
console.log('PASS CMS asset cache: Learn, articles and Academy preserve one current CSS/JS reference across updates.');
