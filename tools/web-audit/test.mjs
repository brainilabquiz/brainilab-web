import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {extractLinks} from './extract.mjs';
import {publicTarget} from './run.mjs';

let requests=0;
const server=createServer((req,res)=>{requests++;res.end('must not be fetched by the legacy parser')});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const port=server.address().port;
 const links=await extractLinks(`<base href="https://brainilabgames.com/learn/"><a href="relative/">A reading</a><img src="/assets/a.webp" alt=""><script src="http://127.0.0.1:${port}/never.js"></script><a href="https://example.com/">External</a><form action="/api/private"></form>`,`https://brainilabgames.com/`);
 assert(links.some(l=>l.url==='https://brainilabgames.com/learn/relative/'));
 assert(links.some(l=>l.url==='https://brainilabgames.com/assets/a.webp'));
 assert(links.some(l=>l.url===`http://127.0.0.1:${port}/never.js`));
 assert.equal(requests,0,'Legacy transport must not make requests');
 assert.equal(publicTarget('https://brainilabgames.com/api/private'),null);
 assert.equal(publicTarget('https://brainilabgames.com/%61pi/private'),null);
 assert.equal(publicTarget('https://brainilabgames.com/logout'),null);
 assert.equal(publicTarget('https://brainilabgames.com/learn/?q=private'),null);
 assert.equal(publicTarget('https://brainilabgames.com.evil.example/'),null);
 assert.equal(publicTarget('https://name:secret@brainilabgames.com/'),null);
 assert.equal(publicTarget('https://brainilabgames.com/learn/reading/#answer'),'https://brainilabgames.com/learn/reading/');
 assert.equal(publicTarget('https://brainilabgames.com/assets/a.css?v=123'),'https://brainilabgames.com/assets/a.css?v=123');
 console.log('PASS audit integration: actual broken-link-checker parser, relative/base/media/script URLs, zero legacy HTTP requests, same-origin scope, blocked private/action/query targets and preserved asset versions.');
}finally{await new Promise(r=>server.close(r));}
