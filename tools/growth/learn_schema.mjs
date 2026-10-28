// Optional local adapter: no HTTP, database, scripts or resource requests.
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {inertPublicHTML} from '../../editor/page-link-evidence.js';
import {observeLearnSchema,compactLearnSchema,learnSchemaURL} from '../../editor/page-schema-evidence.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.JSDOM_MODULE||'jsdom'),dom=new JSDOM(''),document=dom.window.document;
let raw='';for await(const chunk of process.stdin){raw+=chunk;if(Buffer.byteLength(raw)>20*1024*1024)throw Error('Input bound');}
const inputs=JSON.parse(raw);if(!Array.isArray(inputs)||inputs.length>250)throw Error('Inventory bound');
const output=[];
for(const input of inputs){
 if(!learnSchemaURL(input.url)||typeof input.html!=='string'||Buffer.byteLength(input.html)>2000000||!Number.isFinite(Date.parse(input.checkedAt)))continue;
 const fragment=inertPublicHTML(input.html,document),nodes=[];let incomplete=false;
 function walk(v,depth=0){if(depth>8||nodes.length>1000)throw Error('Graph bound');if(Array.isArray(v)){for(const n of v)walk(n,depth+1);}else if(v&&typeof v==='object'){nodes.push(v);if(v['@graph'])walk(v['@graph'],depth+1);}}
 for(const n of fragment.querySelectorAll('script[type="application/ld+json" i]')){if(n.closest('noscript'))continue;try{walk(JSON.parse(n.textContent));}catch{incomplete=true;}}
 const evidence=observeLearnSchema(fragment,input.url,nodes,{incomplete});if(!evidence)continue;
 const contentSha256=createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
 output.push({url:input.url,checkedAt:input.checkedAt,sha256:createHash('sha256').update(input.html).digest('hex'),contentSha256,...compactLearnSchema(evidence)});
}
dom.window.close();process.stdout.write(JSON.stringify(output));
