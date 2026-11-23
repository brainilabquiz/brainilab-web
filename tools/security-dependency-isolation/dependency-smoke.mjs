// Private, bounded dependency check. NOT EXECUTED during source review.
// Execute only in the approved offline OS container against the patched graph.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root=path.resolve(process.argv[2]||'/work/repo');
const fromRoot=createRequire(path.join(root,'package.json'));
function packageInfo(entry,name){
  let directory=path.dirname(entry);
  for(let depth=0;depth<16;depth++){
    try{
      const info=JSON.parse(readFileSync(path.join(directory,'package.json'),'utf8'));
      if(info.name===name)return info;
    }catch(error){if(error.code!=='ENOENT')throw error;}
    const parent=path.dirname(directory);if(parent===directory)break;directory=parent;
  }
  throw Error('Cannot identify '+name+' from its resolved entry');
}
const sanitizerEntry=fromRoot.resolve('sanitize-html');
const fromSanitizer=createRequire(sanitizerEntry);
const postcssEntry=fromSanitizer.resolve('postcss');
const fromPostcss=createRequire(postcssEntry);
const mapEntry=fromPostcss.resolve('source-map-js');
assert.equal(packageInfo(sanitizerEntry,'sanitize-html').version,'2.18.0');
assert.equal(packageInfo(fromSanitizer.resolve('launder'),'launder').version,'1.7.2');
assert.equal(packageInfo(mapEntry,'source-map-js').version,'1.2.2');

// Exercise BrainiLab's actual public HTML policy rather than a replacement policy.
const {cleanHtml}=await import(pathToFileURL(path.join(root,'lib/learn-content.js')).href);
const safe=cleanHtml('<h3>Example</h3><p><strong>Keep</strong> <a href="/learn/">Learn</a> <a href="https://example.test/read">Source</a></p><table class="table-scroll"><caption>Dummy results</caption><tbody><tr><th scope="row">A</th><td>1</td></tr></tbody></table><details class="practice-answer"><summary>Answer</summary><p>One</p></details>');
for(const expected of ['<h3>Example</h3>','<strong>Keep</strong>','href="/learn/"','href="https://example.test/read"','scope="row"','<summary>Answer</summary>'])assert.ok(safe.includes(expected),expected);
const unsafe=cleanHtml('<script>bad()</script><p onclick="bad()" style="color:red">Keep text</p><a href="jav&#x61;script:bad()">Unsafe URL</a><meta http-equiv="refresh" content="0;url=javascript:bad()"><svg><a:animate attributeName="href" values="javascript:bad()"></a:animate></svg>');
assert.ok(unsafe.includes('Keep text'));
assert.doesNotMatch(unsafe,/<script|onclick|style=|javascript:|<meta|<svg|<a:animate/i);

// Upstream condition: cf7658058ceeaa8619d5ae0ec90be6905209d016.
// Tiny maps only. Do not serialize/materialize a map with an enormous offset.
const {SourceMapConsumer,SourceMapGenerator,SourceNode}=fromPostcss('source-map-js');
const flat=()=>({version:3,sources:['fixture.js'],sourcesContent:['x'],names:[],mappings:'AAAA'});
const indexed=(line,column=0,map=flat())=>({version:3,sections:[{offset:{line,column},map}]});
for(const invalid of [-1,0.5,NaN,Infinity,-Infinity,Number.MAX_SAFE_INTEGER+1,'1',null,undefined,{}]){
  assert.throws(()=>new SourceMapConsumer(indexed(invalid)),/non-negative integers/);
  // Assign explicitly: indexed(0, undefined) would use its valid zero default.
  const invalidColumn=indexed(0);
  invalidColumn.sections[0].offset.column=invalid;
  assert.throws(()=>new SourceMapConsumer(invalidColumn),/non-negative integers/,
    'Reject column '+String(invalid));
}
assert.throws(()=>new SourceMapConsumer(indexed(10000001)),/must not exceed/);
assert.throws(()=>new SourceMapConsumer(indexed(5000000,0,indexed(5000000,0,indexed(5000000)))),/including offsets of nested sections/);
const positive=new SourceMapConsumer(indexed(2,0,indexed(2,0,indexed(2))));
const lines=[];positive.eachMapping(mapping=>lines.push(mapping.generatedLine));
assert.deepEqual(lines,[7]);
assert.deepEqual(positive.sources,['fixture.js']);
// Indexed consumers do not expose sourceRoot for fromSourceMap in this library.
// Use its public mapping API to serialize these seven bounded generated lines.
const generator=new SourceMapGenerator({file:'fixture.out.js'});
positive.eachMapping(mapping=>generator.addMapping({
  generated:{line:mapping.generatedLine,column:mapping.generatedColumn},
  original:{line:mapping.originalLine,column:mapping.originalColumn},
  source:mapping.source,
}));
const serial=generator.toJSON();
assert.equal((serial.mappings.match(/;/g)||[]).length,6);
assert.equal(SourceMapGenerator.fromSourceMap(new SourceMapConsumer(flat())).toJSON().mappings,'AAAA');
assert.equal(SourceNode.fromStringWithSourceMap('x',new SourceMapConsumer(indexed(8))).toString(),'x');

// Bounded nesting verifies getter reuse without a depth/time exhaustion probe.
let nested=flat();for(let level=0;level<4;level++)nested=indexed(1,0,nested);
const consumer=new SourceMapConsumer(nested);let deepest=consumer;
for(let level=0;level<4;level++)deepest=deepest._sections[0].consumer;
const original=deepest.sources;let reads=0;
Object.defineProperty(deepest,'sources',{get(){reads++;return original;}});
assert.deepEqual(consumer.sources,['fixture.js']);assert.equal(reads,1);
console.log('PASS patched dependency versions; real Learn HTML allowlist; bounded invalid and nested source-map offsets, ordinary serialization and source text.');
