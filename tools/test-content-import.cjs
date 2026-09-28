const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const admin=fs.readFileSync(root+'/assets/js/admin.js','utf8');const parser=admin.slice(admin.indexOf('  function parseCSV('),admin.indexOf('  function importRowFromCSV('));
const parse=vm.runInNewContext(parser+';parseCSV');
assert.equal(parse('a,b\r\n"one,two",three')[0].a,'one,two');
assert.throws(()=>parse('a,b\n1,2,3'),/expected 2 columns/);
assert.throws(()=>parse('a,b\n1'),/expected 2 columns/);
assert.throws(()=>parse('a,b\n"oops,2'),/unclosed/);
assert.throws(()=>parse('a,a\n1,2'),/unique/);
const normText=admin.slice(admin.indexOf('  function normalizePoolImport('),admin.indexOf('  function openPoolImport('));
const normalize=vm.runInNewContext('const cleanError=e=>e.message;'+normText+';normalizePoolImport');
const template=parse(fs.readFileSync(root+'/admin/brainilab_connections_template.csv','utf8'));
assert.equal(normalize('connections',template)[0].valid,true);
assert.equal(normalize('connections',[{...template[0],explanation:''}])[0].valid,false);
assert.equal(normalize('connections',[{...template[0],clue_5:template[0].correct_connection}])[0].valid,false);
// Exercise real ad eligibility with enabled runtime flags: functional routes must stay excluded.
const ads=fs.readFileSync(root+'/assets/js/ads.js','utf8');
const eligible=ads.slice(ads.indexOf('  function eligiblePlacement('),ads.indexOf('  function publisherReady('));
for(const [url,expected] of [['/404.html',false],['/profile/',false],['/rankings/',false],['/suggestions/',false],['/privacy/',false],['/games/',true],['/science/science-quiz/',true]]){
const context={location:{pathname:url},debugMode:()=>false,flagForPlacement:{quiz_result:'yes'},window:{}};
context.window={BrainiMonetization:{canDecideAds:()=>true,adsEnabled:()=>true,adsFree:()=>false},BrainiRuntime:{has:()=>true}};context.BrainiRuntime={get:()=>({enabled:true})};
assert.equal(vm.runInNewContext(eligible+';eligiblePlacement("quiz_result")',context),expected,url);}

console.log('CSV alignment, Connections content and ad exclusion tests passed.');
