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
for(const [kind,file,count] of [['sequence','sequence',18],['numberroute','numberroute',12]]){
 const rows=parse(fs.readFileSync(root+'/admin/content-batches/'+file+'-20261014.csv','utf8'));
 assert.equal(rows.length,count);assert.ok(normalize(kind,rows).every(r=>r.valid),'Every new '+kind+' record passes the real Admin importer');
}
// Exercise real ad eligibility with enabled runtime flags: functional routes must stay excluded.
const ads=fs.readFileSync(root+'/assets/js/ads.js','utf8');
const eligible=ads.slice(ads.indexOf('  const config='),ads.indexOf('  function publisherReady('));
function adEligibility(url,{active=false,free=false,consent=true,enabled=true}={}){
 const context={location:new URL(url,'https://brainilabgames.com'),URLSearchParams,document:{querySelector:()=>active?{}:null},window:{}};
 context.window={BrainiMonetization:{canDecideAds:()=>consent,adsEnabled:()=>true,adsFree:()=>free},BrainiRuntime:{has:()=>true}};context.BrainiRuntime={get:()=>({enabled})};
 return vm.runInNewContext(eligible+';eligiblePlacement("quiz_result")',context);
}
for(const [url,expected] of [['/404.html',false],['/profile/',false],['/rankings/',false],['/suggestions/',false],['/privacy/',false],['/games/',true],['/science/science-quiz/',true]])assert.equal(adEligibility(url),expected,url);
assert.equal(adEligibility('https://preview.brainilabquiz.workers.dev/games/'),false);
assert.equal(adEligibility('https://www.brainilabgames.com/games/'),true);
assert.equal(adEligibility('/',{active:true}),false);
assert.equal(adEligibility('/games/',{free:true}),false);
assert.equal(adEligibility('/games/',{consent:false}),false);
assert.equal(adEligibility('/games/',{enabled:false}),false);

console.log('CSV alignment, Connections content and ad exclusion tests passed.');
