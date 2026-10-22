// Existing gameplay, ownership, scoring, editorial and UI regressions in one run.
// All fixtures are local; this runner makes no production database requests.
import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const phase=process.argv.find(a=>a.startsWith('--release-phase='))?.split('=')[1];
if(!['private','launched'].includes(phase))throw Error('Specify --release-phase=private or --release-phase=launched from the reviewed release plan.');
if(!process.env.JSDOM_MODULE||!process.env.PGLITE_MODULE)throw Error('Set JSDOM_MODULE and PGLITE_MODULE to the installed DOM and isolated PostgreSQL test dependencies.');
const tests=readdirSync('tools').filter(n=>/^test-.*\.mjs$/.test(n)).sort(),failed=[];
for(const test of tests){
 const flags=test==='test-halloween-release.mjs'?[...(phase==='launched'?['--launched']:[]),'--require-dist']:[];
 const result=spawnSync(process.execPath,['tools/'+test,...flags],{encoding:'utf8',timeout:90000,env:process.env});
 if(result.status===0)console.log('PASS '+test);
 else{failed.push(test);console.error('FAIL '+test+'\n'+(result.error?.message||result.stdout+result.stderr));}
}
console.log((tests.length-failed.length)+' of '+tests.length+' suites passed.');
if(failed.length){console.error('Failed: '+failed.join(', '));process.exitCode=1;}
