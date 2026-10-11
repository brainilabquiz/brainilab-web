import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLISHERS,publisherArticleURL,publisherLinks,publisherSource,collectPublisherSources,balancedPublisherSources,publisherRequestBody,parsePublisherResponse} from '../lib/news-publisher.js';
import {BreakingNewsStore,NEWS_MODEL,RESERVATION_CENTS,REFRESH_MS} from '../lib/news-refresh.js';
const now=Date.parse('2026-10-11T10:15:00Z');
const url='https://www.bbc.com/news/articles/c1234567890x';
const metadata={ '@type':'ReportageNewsArticle',url,datePublished:'2026-10-11T08:00:00.000Z',dateModified:'2026-10-11T09:00:00Z',headline:'A test report',description:'A new public project opened today.'};
const article=(changes={})=>`<script type="application/ld+json">${JSON.stringify({...metadata,...changes})}</script><div data-component="text-block"><p>Officials opened the project this morning.</p></div>`;
const htmlResponse=html=>new Response(html,{headers:{'Content-Type':'text/html'}});
const source={id:1,...publisherSource(article(),url,now)};
const response=(stories=[{sourceId:1,title:'A new project opens',summary:'Officials opened a new public project this morning.'}])=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({stories})}]}],usage:{input_tokens:600,output_tokens:80}});
function state(){const data=new Map();let queue=Promise.resolve();return {data,storage:{get:async k=>data.get(k),put:async(k,v)=>data.set(k,v),setAlarm:async t=>data.set('alarm',t),transaction(fn){const work=queue.then(()=>fn(this));queue=work.catch(()=>{});return work;}}};}
test('BBC discovery accepts only approved article routes and caps distinct links',()=>{
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
  assert.deepEqual(called,PUBLISHERS.map(p=>p.index));
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
    if(PUBLISHERS.some(p=>p.index===address))return new Response('',{status:503});
    assert.equal(address,'https://api.openai.com/v1/responses');assert.equal(JSON.parse(options.body).tools,undefined);return Response.json(response());
  };
  await Promise.all(Array.from({length:5},()=>store.refresh(now,fetcher)));
  assert.equal(requests.length,PUBLISHERS.length+2);assert.equal(requests.filter(r=>r.address.includes('api.openai.com')).length,1);
  for(const request of requests.filter(r=>!r.address.includes('api.openai.com')))assert.equal(request.options.headers.Authorization,undefined);
  assert.deepEqual(s.data.get('budget:2026-10'),{cents:RESERVATION_CENTS,calls:1});assert.equal(s.data.get('status').code,'updated');
  assert.equal(s.data.get('edition').stories[0].reportedAt,metadata.datePublished);
});
test('publisher failure pauses later slots without making any paid request',async()=>{
  const s=state(),store=new BreakingNewsStore(s,{OPENAI_API_KEY:'fixture-secret'}),requests=[];
  const fetcher=async address=>{requests.push(address);return new Response('',{status:403});};
  await store.refresh(now,fetcher);await store.refresh(now+REFRESH_MS,fetcher);
  assert.equal(s.data.get('status').code,'publisher-unavailable');assert.deepEqual(requests,PUBLISHERS.map(p=>p.index));
});
const guardianURL='https://www.theguardian.com/world/2026/oct/11/test-report';
const aljazeeraURL='https://www.aljazeera.com/news/2026/10/11/test-report';
const whoURL='https://www.who.int/southeastasia/news/detail/10-10-2026-test-report';
const nasaURL='https://www.nasa.gov/news-release/test-report/';
const ld=(address,changes={})=>`<script type="application/ld+json">${JSON.stringify({...metadata,url:undefined,mainEntityOfPage:address,...changes})}</script>`;
const nasa=(date='Oct 10, 2026',canonical=nasaURL)=>`<link href="${canonical}" rel="canonical"><meta content="A new science mission is scheduled." name="description"><h1>A test NASA release</h1><div class="article-meta"><span class="heading-12 text-uppercase">${date}</span></div><p>Updated Oct 11, 2026</p>`;

test('each publisher verifies its own dated identity and name',()=>{
  const guardian=publisherSource(ld(guardianURL,{description:undefined})+'<meta name="description" content="Scientists test a new method.">',guardianURL,now);
  assert.equal(guardian.sourceName,'The Guardian');assert.equal(guardian.description,'Scientists test a new method.');
  assert.equal(publisherSource(ld({'@id':aljazeeraURL}),aljazeeraURL,now).sourceName,'Al Jazeera');
  const who=publisherSource(ld(whoURL,{description:'<p>WHO describes a new programme.</p>'.repeat(100)}).replace('</script>',';</script>'),whoURL,now);
  assert.equal(who.sourceName,'World Health Organization');assert.equal(who.description.length,800);assert.doesNotMatch(who.description,/[<>]/);
  const release=publisherSource(nasa(),nasaURL,now);
  assert.equal(release.sourceName,'NASA');assert.equal(release.reportedAt,'2026-10-10T00:00:00.000Z');
  assert.equal(publisherSource(ld(guardianURL),aljazeeraURL,now),null);
  assert.equal(publisherSource(nasa('Oct 10, 2026',nasaURL.replace('test-report','other-report')),nasaURL,now),null);
  assert.equal(publisherSource(ld(guardianURL,{isAccessibleForFree:false}),guardianURL,now),null);
});
test('all publishers discard expired and future dates; NASA ignores body update dates',()=>{
  for(const address of [guardianURL,aljazeeraURL,whoURL])for(const datePublished of ['2026-10-01T00:00:00Z','2026-10-12T00:00:00Z','invalid'])assert.equal(publisherSource(ld(address,{datePublished}),address,now),null);
  for(const day of ['Oct 09, 2026','Oct 12, 2026','Feb 31, 2026','Bad 10, 2026'])assert.equal(publisherSource(nasa(day),nasaURL,now),null);
});
test('discovery ignores other hosts, live blogs, category indexes and NASA featured navigation',()=>{
  assert.equal(publisherLinks(`<a href="${aljazeeraURL}">Other newsroom</a>`,PUBLISHERS[1].index).length,0);
  assert.equal(publisherArticleURL('https://www.theguardian.com/world/live/2026/oct/11/test'),null);
  assert.equal(publisherArticleURL('https://www.aljazeera.com/admin/'),null);
  assert.equal(publisherLinks('<a href="/world/2026/oct/11/all"></a>',PUBLISHERS[1].index).length,0);
  assert.deepEqual(publisherLinks(`<a href="${nasaURL}">Featured</a><a class="hds-content-item-heading" href="${nasaURL}">Latest</a>`,PUBLISHERS[4].index),[nasaURL]);
  assert.equal(publisherLinks('<a href="'+guardianURL+'">Report</a>','https://evil.org/').length,0);
});
test('balanced selection represents five publishers, is deterministic and degrades without padding',()=>{
  const addresses=[url,guardianURL,aljazeeraURL,whoURL,nasaURL];
  const found=PUBLISHERS.flatMap((p,i)=>Array.from({length:4},(_,j)=>({...source,sourceName:p.name,sourceUrl:addresses[i]+'?fixture='+j,reportedAt:new Date(now-j*1000).toISOString()})));
  const selected=balancedPublisherSources(found);
  assert.equal(selected.length,5);assert.equal(new Set(selected.map(s=>s.sourceName)).size,5);
  assert.deepEqual(balancedPublisherSources([...found].reverse()),selected);
  assert.deepEqual(selected.map(s=>s.id),[1,2,3,4,5]);
  const two=balancedPublisherSources(found.filter(s=>['BBC News','Al Jazeera'].includes(s.sourceName)));
  assert.equal(two.length,5);assert.equal(two.filter(s=>s.sourceName==='BBC News').length,3);
  assert.equal(balancedPublisherSources(found.filter(s=>s.sourceName==='NASA')).length,4);
  assert.deepEqual(balancedPublisherSources([]),[]);
});
test('multiple publishers share bounded discovery and retain immutable provenance after generation',async()=>{
  const addresses=[url,guardianURL,aljazeeraURL,whoURL,nasaURL],calls=[],pages=addresses.map((address,i)=>i===4?nasa():ld(address));
  let active=0,maxActive=0;
  const sources=await collectPublisherSources(now,async address=>{
    calls.push(address);const publisherIndex=PUBLISHERS.findIndex(p=>p.index===address);
    if(publisherIndex>=0)return htmlResponse(Array.from({length:8},(_,i)=>`<a class="hds-content-item-heading" href="${addresses[publisherIndex]}?variant=${i}"></a>`).join(''));
    active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,1));active--;
    return htmlResponse(pages[addresses.indexOf(address)]);
  });
  assert.equal(calls.length,10);assert.ok(maxActive<=4);assert.equal(new Set(sources.map(s=>s.sourceName)).size,5);
  const generated=sources.map(s=>({sourceId:s.id,title:'Original report from '+s.sourceName,summary:'An original short summary grounded in this source.',sourceName:'Wrong publisher'}));
  const result=parsePublisherResponse(response(generated),sources,now);
  assert.deepEqual(result.edition.stories.map(s=>s.sourceName),PUBLISHERS.map(p=>p.name));
  assert.deepEqual(result.edition.stories.map(s=>s.sourceUrl),addresses);
});
test('a blocked BBC cannot prevent a verified article from another newsroom',async()=>{
  const sources=await collectPublisherSources(now,async address=>address===PUBLISHERS[2].index?htmlResponse(`<a href="${aljazeeraURL}"></a>`):address===aljazeeraURL?htmlResponse(ld(aljazeeraURL)):new Response('',{status:403}));
  assert.equal(sources.length,1);assert.equal(sources[0].sourceName,'Al Jazeera');
});

test('generated figures must appear in the selected source, not another story or its URL',()=>{
  const counted={...source,headline:'Officials announce 109 places',description:'More than 116 people applied.',context:'The programme supports 1,000 participants.'};
  const valid={sourceId:1,title:'Officials announce 109 places',summary:'More than 116 people applied to the programme, which supports 1000 participants.'};
  assert.equal(parsePublisherResponse(response([valid]),[counted],now).edition.stories.length,1);
  for(const summary of ['Officials announced 350 places.','Officials announced 2026 places.']) {
    assert.throws(()=>parsePublisherResponse(response([{...valid,summary}]),[counted,{...source,id:2,description:'350 places.'}],now),error=>error.validationDiagnostic?.rejections['unsupported-number']===1);
  }
  assert.throws(()=>parsePublisherResponse(response([{...valid,title:'Officials announce 110 places'}]),[counted],now),error=>error.validationDiagnostic?.rejections['unsupported-number']===1);
});

test('numeric grounding handles grouped and decimal figures without fabricating calculations',()=>{
  const counted={...source,description:'The value is 12.5, and 208\u00a0000 people participated.'};
  const item={sourceId:1,title:'Officials report results',summary:'The value is 12.5, with 208,000 people participating.'};
  assert.equal(parsePublisherResponse(response([item]),[counted],now).edition.stories.length,1);
  assert.throws(()=>parsePublisherResponse(response([{...item,summary:'The rounded value is 13.'}]),[counted],now),error=>error.validationDiagnostic?.rejections['unsupported-number']===1);
});

test('one unsupported figure does not discard other valid stories',()=>{
  const other={...source,id:2,description:'Officials reported 42 participants.'};
  const result=parsePublisherResponse(response([{sourceId:1,title:'Unverified count',summary:'Officials reported 999 participants.'},{sourceId:2,title:'Officials report participation',summary:'Officials reported 42 participants.'}]),[source,other],now);
  assert.equal(result.edition.stories.length,1);assert.equal(result.edition.stories[0].summary,'Officials reported 42 participants.');
  assert.equal(result.validationDiagnostic.rejections['unsupported-number'],1);
});

test('large numeric figures remain exact instead of collapsing through floating-point conversion',()=>{
  const counted={...source,description:'The reported value is 9007199254740993.'};
  const item={sourceId:1,title:'Officials report a value',summary:'Officials reported a value of 9007199254740993.'};
  assert.equal(parsePublisherResponse(response([item]),[counted],now).edition.stories.length,1);
  assert.throws(()=>parsePublisherResponse(response([{...item,summary:'Officials reported a value of 9007199254740992.'}]),[counted],now),error=>error.validationDiagnostic?.rejections['unsupported-number']===1);
});
