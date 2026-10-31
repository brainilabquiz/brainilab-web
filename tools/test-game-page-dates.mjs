import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {gamePageDates,gamePageDateRecords} from '../lib/game-page-dates.js';
import {renderHalloweenPage} from '../lib/halloween-render.js';
import {halloweenState} from '../lib/halloween-event.js';

const graph=d=>[...d.querySelectorAll('script[type="application/ld+json"]')].flatMap(s=>{const j=JSON.parse(s.textContent);return Array.isArray(j)?j:j['@graph']||[j];});
const withoutDates=d=>{const m=d.querySelector('main').cloneNode(true);m.querySelectorAll('.game-page-dates').forEach(n=>n.remove());return m.innerHTML;};
const types=new Set(['WebPage','Game','Quiz','VideoGame','WebApplication','SoftwareApplication']),base='https://brainilabgames.com';
for(const [path,record]of Object.entries(gamePageDateRecords)){
 if(path.startsWith('/halloween/'))continue;
 const source=readFileSync('.'+path+'index.html','utf8'),html=gamePageDates(source,path),a=new JSDOM(source),b=new JSDOM(html),d=b.window.document;
 const times=d.querySelectorAll('main [data-game-page-date="modified"]');assert.equal(times.length,1,path);assert.equal(times[0].dateTime,record.modifiedAt);assert.match(times[0].parentElement.textContent,/^Page updated /);
 assert.equal(times[0].textContent,new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(Date.parse(record.modifiedAt)));
 assert.equal(withoutDates(d),withoutDates(a.window.document),path+' preserves all game controls and page content');
 const prior=graph(a.window.document),next=graph(d);let checked=0;
 for(const [i,node]of next.entries())if(node.url===base+path&&[].concat(node['@type']).some(t=>types.has(t))){assert.equal(node.dateModified,record.modifiedAt);if(prior[i].dateModified===undefined)delete node.dateModified;checked++;}
 assert.ok(checked);assert.deepEqual(next,prior,path+' preserves original publication, answers, identity, FAQ and other schema');
 assert.equal(gamePageDates(html,path),html,'Repeated rendering is inert');
 assert.deepEqual([...d.querySelectorAll('script:not([type="application/ld+json"])')].map(n=>n.outerHTML),[...a.window.document.querySelectorAll('script:not([type="application/ld+json"])')].map(n=>n.outerHTML),'No gameplay scripts change');
 a.window.close();b.window.close();
}
const fixture='<html><head><script type="application/ld+json">'+JSON.stringify({'@type':'VideoGame',url:base+'/games/cryptic/',datePublished:'2026-09-01T12:00:00.123456+02:00'})+'</script></head><body><main><header><h1>Game</h1><p>A clue</p></header><button>Play</button></main></body></html>';
const records={'/games/cryptic/':{modifiedAt:'2026-10-01T00:05:03.120000+02:30',sourceRevision:'a'.repeat(40)}};
const precise=new JSDOM(gamePageDates(fixture,'/games/cryptic/',records));
assert.equal(precise.window.document.querySelector('time').textContent,'30 Sept 2026','Use the UTC day across timezone boundaries');
assert.equal(precise.window.document.querySelector('time').dateTime,records['/games/cryptic/'].modifiedAt);
assert.equal(graph(precise.window.document)[0].datePublished,'2026-09-01T12:00:00.123456+02:00','Never rewrite an original publication date');precise.window.close();
assert.equal(gamePageDates(fixture,'/learn/example/'),fixture,'Unregistered pages remain unchanged');
assert.throws(()=>gamePageDates(fixture.replace('<h1>Game</h1>','<h1>Game</h1><h1>Another</h1>'),'/games/cryptic/'));
assert.throws(()=>gamePageDates(fixture.replace('"VideoGame"','"FAQPage"'),'/games/cryptic/'));
assert.throws(()=>gamePageDates(fixture,'/games/cryptic/',{'/games/cryptic/':{...records['/games/cryptic/'],modifiedAt:'2026-02-30T00:00:00Z'}}));
assert.throws(()=>gamePageDates(fixture.replace('"datePublished"','"dateModified"'),'/games/cryptic/'),'Do not overwrite conflicting existing modification dates');
const template=readFileSync('learn/index.html','utf8');
for(const game of ['trick-or-think','spooky-connections'])for(const now of ['2026-10-31T12:00:00Z','2026-11-02T12:00:00Z']){
 const path='/halloween/'+game+'/',html=renderHalloweenPage(template,halloweenState(Date.parse(now)),game),dom=new JSDOM(html),d=dom.window.document;
 assert.equal(d.querySelectorAll('main [data-game-page-date="modified"]').length,1);
 assert.equal(d.querySelector('time[data-game-page-date]').dateTime,gamePageDateRecords[path].modifiedAt);
 assert.equal(graph(d)[0].dateModified,gamePageDateRecords[path].modifiedAt);
 assert.equal(d.querySelector('[data-halloween-game]').getAttribute('data-halloween-game'),game,'Game mounts stay intact, including after seasonal closure');dom.window.close();
}
assert.doesNotMatch(renderHalloweenPage(template,halloweenState(Date.parse('2026-10-31T12:00:00Z'))),/data-game-page-date="modified"/,'Do not invent individual-game dates for a directory');
console.log('PASS game page dates: 22 routes, stable recorded revision times, exact visible/schema dates, original publication preservation, unchanged content/controls/scripts, UTC precision, repeated rendering, conflict guards and seasonal active/closed pages.');
