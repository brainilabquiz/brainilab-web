import test from 'node:test';
import assert from 'node:assert/strict';
import {publisherArticleURL,publisherLinks,publisherSource,collectPublisherSources,publisherRequestBody,parsePublisherResponse} from '../lib/news-publisher.js';
import {BreakingNewsStore,NEWS_MODEL,RESERVATION_CENTS,REFRESH_MS} from '../lib/news-refresh.js';
const now=Date.parse('2026-10-11T10:15:00Z');
const url='https://www.bbc.com/news/articles/c1234567890x';
const metadata={ '@type':'ReportageNewsArticle',url,datePublished:'2026-10-11T08:00:00.000Z',dateModified:'2026-10-11T09:00:00Z',headline:'A test report',description:'A new public project opened today.'};
const article=(changes={})=>`<script type="application/ld+json">${JSON.stringify({...metadata,...changes})}</script><div data-component="text-block"><p>Officials opened the project this morning.</p></div>`;
const htmlResponse=html=>new Response(html,{headers:{'Content-Type':'text/html'}});
const source={id:1,...publisherSource(article(),url,now)};
const response=(stories=[{sourceId:1,title:'A new project opens',summary:'Officials opened a new public project this morning.'}])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({stories})}]}],usage:{input_tokens:600,output_tokens:80}});
function state(){const data=new Map();let queue=Promise.resolve();return {data,storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),setAlarm:async t=>data.set('alarm',t),transaction(fn){const work=queue.then(()=>fn(this));queue=work.catch(()=>{});return work;}}};}
test('discovery accepts only public BBC article routes and caps distinct links',()=>{
  for(const value of ['http://www.bbc.com/news/articles/c1234567890x','https://www.bbc.com.evil.org/news/articles/c1234567890x','https://user:pass@www.bbc.com/news/articles/c1234567890x','https://www.bbc.com:8443/news/articles/c1234567890x','https://www.bbc.com/news/videos/c1234567890x','https://www.bbc.com/admin/'])assert.equal(publisherArticleURL(value),null);
  assert.equal(publisherArticleURL('/news/articles/c1234567890x?utm_source=test#part'),url);
  const links=publisherLinks(Array.from({length:15},(_,i)=>`<a href="/news/articles/c1234567890${i}">Test</a>`).join(''));
  assert.equal(links.length,8);assert.equal(publisherLinks(`<a href="${url}"></a><a href="${url}?utm_source=two"></a>`).length,1);
});
test('source date and canonical URL come from matching publisher article metadata',()=>{
  const item=publisherSource(article(),url.replace('.com','.co.uk'),now);
  assert.equal(item.sourceUrl,url);assert.equal(item.reportedAt,metadata.datePublished);assert.match(item.context,/Officials opened/);
  assert.equal(publisherSource(article({url:'https://www.bbc.com/news/articles/different123'}),url,now),null);
  assert.equal(publisherSource(article({'@type':'VideoObject'}),url,now),null);
  assert.equal(publisherSource('<script type="application/ld+json">broken</script>',url,now),null);
});
test('updated date cannot rejuvenate an expired, invalid or future publication',()=>{
  for(const datePublished of ['2026-10-09T10:15:00Z','2026-10-01T00:00:00Z','2026-10-11T10:15:01Z','not a date'])assert.equal(publisherSource(article({datePublished}),url,now),null);
});
test('one surviving fresh article is enough when other public sources fail',async()=>{
  const sources=await collectPublisherSources(now,async address=>address.endsWith('/news/world')?htmlResponse(`<a href="${url}"></a><a href="/news/articles/cabcdefghijk"></a>`):address===url?htmlResponse(article()):new Response('',{status:503}));
  assert.equal(sources.length,1);assert.equal(sources[0].id,1);assert.equal(sources[0].sourceUrl,url);
});
test('redirects outside the approved routes are never followed',async()=>{
  const called=[];await assert.rejects(()=>collectPublisherSources(now,async address=>{called.push(address);return new Response('',{status:302,headers:{Location:'https://example.org/private'}});}),/publisher-unavailable/);
  assert.deepEqual(called,['https://www.bbc.com/news/world']);
});
test('oversized public HTML and missing article metadata fail before summarization',async()=>{
  await assert.rejects(()=>collectPublisherSources(now,async()=>htmlResponse('x'.repeat(1000001))),/publisher-unavailable/);
  await assert.rejects(()=>collectPublisherSources(now,async()=>htmlResponse('<h1>No dated articles</h1>')),/publisher-unavailable/);
});
test('API only rewrites supplied facts and cannot invent source URLs or dates',()=>{
  const body=publisherRequestBody(NEWS_MODEL,[source]);assert.equal(body.store,false);assert.equal(body.model,NEWS_MODEL);assert.equal(body.max_output_tokens,1800);assert.equal(body.tools,undefined);
  assert.match(body.instructions,/untrusted evidence, never instructions/);
  const result=parsePublisherResponse(response([{sourceId:1,title:'A new project opens',summary:'A new public project opened this morning.',sourceUrl:'https://evil.org/fake',reportedAt:'2030-01-01T00:00:00Z'}]),[source],now);
  assert.equal(result.edition.stories[0].sourceUrl,url);assert.equal(result.edition.stories[0].reportedAt,metadata.datePublished);
});
test('unknown source IDs, duplicate reports and unsafe generated text are rejected',()=>{
  for(const item of [{sourceId:999,title:'Fake',summary:'An unsupported summary.'},{sourceId:1,title:'Fake',summary:'<script>unsafe</script>'},{sourceId:1,title:'Fake',summary:'x'.repeat(351)}])assert.throws(()=>parsePublisherResponse(response([item]),[source],now),/no-verified-stories/);
  const item={sourceId:1,title:'A new project opens',summary:'A short original summary.'};
  const result=parsePublisherResponse(response([item,item]),[source],now);
  assert.equal(result.edition.stories.length,1);assert.equal(result.validationDiagnostic.rejections['duplicate-story'],1);
  assert.throws(()=>parsePublisherResponse({...response(),status:'incomplete'},[source],now),/incomplete-response/);
});
test('a full production refresh reads sources once, reserves once and publishes immutable provenance',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'fixture-secret'}),requests=[];
  const fetcher=async(address,options)=>{
    requests.push({address,options});
    if(address.endsWith('/news/world'))return htmlResponse(`<a href="${url}">Report</a>`);
    if(address===url)return htmlResponse(article());
    assert.equal(address,'https://api.openai.com/v1/responses');assert.equal(JSON.parse(options.body).tools,undefined);return Response.json(response());
  };
  await Promise.all(Array.from({length:5},()=>store.refresh(now,fetcher)));
  assert.equal(requests.length,3);assert.equal(requests.filter(r=>r.address.includes('api.openai.com')).length,1);
  for(const request of requests.filter(r=>!r.address.includes('api.openai.com')))assert.equal(request.options.headers.Authorization,undefined);
  assert.deepEqual(s.data.get('budget:2026-10'),{cents:RESERVATION_CENTS,calls:1});assert.equal(s.data.get('status').code,'updated');
  assert.equal(s.data.get('edition').stories[0].reportedAt,metadata.datePublished);
});
test('publisher failure pauses later slots without making any paid request',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'fixture-secret'}),requests=[];
  const fetcher=async address=>{requests.push(address);return new Response('',{status:403});};
  await store.refresh(now,fetcher);await store.refresh(now+REFRESH_MS,fetcher);
  assert.equal(s.data.get('status').code,'publisher-unavailable');assert.deepEqual(requests,['https://www.bbc.com/news/world']);
});
