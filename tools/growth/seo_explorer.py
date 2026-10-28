"""BrainiLab's own dated SEO index. Public pages only; no paid provider or tracking."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import gzip
import hashlib
import http.client
from html.parser import HTMLParser
import ipaddress
import json
import os
from pathlib import Path
import re
import socket
import ssl
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
import gsc_sync as api
import seo_keywords
import seo_reputation
import seo_discovery
import quiz_schema

DOMAIN = 'brainilabgames.com'
AGENT = 'BrainiLabSEO'
VERSION = 1
PRODUCER_VERSION = 5
MAX_BYTES = 2_000_000
CHECKS = {'https': 10, 'available': 20, 'title': 10, 'description': 10,
          'heading': 10, 'canonical': 15, 'indexable': 15, 'structuredData': 10}
LIMITATIONS = [
    'Known public sources only; this is not a global backlink index.',
    'An HTML link is not proof that Google indexed it or passes ranking value.',
    'Missing HTML links may be rendered with JavaScript. Failed requests do not prove lost links.',
    'BrainiLab Trust v1 is a technical publishing checklist, not Google authority, Ahrefs DR, Majestic Trust Flow, or a reputation verdict.',
    'Domain Trust is the mean of successful page checks in this crawl; it changes with coverage.',
    'Dated Google Links, manual-action and security reports are separate reputation evidence, not an authority score.',
    'Editorial independence, spam risk and total global backlinks remain unmeasured.',
]
DISCOVERY = {'published_listing', 'owner_submitted_listing', 'reviewed_public_candidate', 'google_links_report'}


def stamp(value):
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.isoformat() if parsed.tzinfo else None
    except (ValueError, TypeError, AttributeError):
        return None


def public_url(value, own=False):
    if not isinstance(value, str) or len(value) > 1000:
        return None
    try:
        u = urlsplit(value)
        if u.scheme != 'https' or u.username or u.password or u.port or not u.hostname:
            return None
        host = u.hostname.lower()
        if host in {'mail.google.com','accounts.google.com','drive.google.com','docs.google.com','outlook.live.com','login.live.com'}:return None
        if own and host not in (DOMAIN, 'www.' + DOMAIN):
            return None
        if not re.fullmatch(r'[a-z0-9-]+(?:\.[a-z0-9-]+)+', host):
            return None
        try:
            ipaddress.ip_address(host)
            return None
        except ValueError:
            pass
        # Discard query/fragment data rather than importing private tokens or emails.
        if not re.fullmatch(r'/[a-zA-Z0-9/_.~-]*', u.path or '/') or '@' in u.path:
            return None
        if own and re.match(r'^/(admin|auth|account|profile)(/|$)', u.path):
            return None
        # A numeric page is a public document locator (e.g. a Google Links source),
        # not a tracking/auth query. Never preserve arbitrary parameters.
        pagination = '?' + u.query if not own and re.fullmatch(r'page=[1-9][0-9]{0,4}', u.query) else ''
        return 'https://' + (DOMAIN if own else host) + (u.path or '/') + pagination
    except ValueError:
        return None


def own_host(url):
    return urlsplit(url).hostname in (DOMAIN,'www.'+DOMAIN)


def public_addresses(url):
    clean = public_url(url)
    if not clean:
        raise ValueError('Unsupported public URL')
    addresses = socket.getaddrinfo(urlsplit(clean).hostname, 443, type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise ValueError('Only publicly routable hosts are supported')
    return clean, sorted({a[4][0] for a in addresses})


def safe_host(url):
    return public_addresses(url)[0]


class PinnedHTTPS(http.client.HTTPSConnection):
    """Connect to the validated address; retain the real host for TLS and HTTP."""
    def __init__(self, host, address):
        super().__init__(host, timeout=20, context=ssl.create_default_context())
        self.address = address

    def connect(self):
        sock = socket.create_connection((self.address, 443), self.timeout)
        try: self.sock = self._context.wrap_socket(sock, server_hostname=self.host)
        except BaseException:
            sock.close()
            raise


def fetch(url):
    for redirect in range(6):
        clean, addresses = public_addresses(url)
        url = clean
        u = urlsplit(clean)
        connection = PinnedHTTPS(u.hostname, addresses[0])
        try:
            connection.request('GET',(u.path or '/') + ('?' + u.query if u.query else ''),headers={'User-Agent': AGENT+'/1.0 (authorised site review)','Accept-Encoding':'identity'})
            response = connection.getresponse()
            if response.status in (301,302,303,307,308):
                location = response.getheader('Location')
                if not location or redirect==5: raise ValueError('Unsupported redirect chain')
                url = urljoin(url,location)
                # Re-resolve, validate and pin every new connection, including redirects.
                continue
            if response.status != 200:
                return {'url':url,'status':response.status,'body':b'','robotsHeader':response.getheader('X-Robots-Tag','')}
            if response.headers.get_content_type() not in ('text/html','application/xhtml+xml','text/plain'):
                raise ValueError('Unsupported public document')
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ValueError('Public document exceeds crawl limit')
            encoding = response.headers.get('Content-Encoding', 'identity')
            if encoding == 'gzip':
                # Bound decompression too; no unbounded gzip bombs from source URLs.
                import io
                with gzip.GzipFile(fileobj=io.BytesIO(body)) as stream:
                    body = stream.read(MAX_BYTES + 1)
            elif encoding != 'identity':
                raise ValueError('Unsupported response encoding')
            if len(body) > MAX_BYTES:
                raise ValueError('Decoded document exceeds crawl limit')
            return {'url':url,'status':response.status,'body':body,'robotsHeader':response.getheader('X-Robots-Tag','')}
        finally:
            connection.close()


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.titles, self.headings, self.descriptions, self.canonicals, self.robots = [], [], [], [], []
        self.links, self.schemas, self.authors = [], [], []
        self.current = None
        self.schema = None
        self.anchor = None
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('title', 'h1'):
            self.current = [tag, '']
        if tag == 'meta':
            name = a.get('name', '').lower()
            if name == 'description': self.descriptions.append(a.get('content', '').strip())
            if name in ('robots', 'googlebot'): self.robots.append(a.get('content', '').lower())
            if name == 'author' and a.get('content', '').strip(): self.authors.append(a['content'].strip())
        if tag == 'link' and 'canonical' in a.get('rel', '').lower().split():
            self.canonicals.append(a.get('href', ''))
        if tag == 'script' and a.get('type', '').lower() == 'application/ld+json':
            self.schema = ''
        if tag == 'a':
            self.anchor = {'href': a.get('href', ''), 'rel': a.get('rel', '').lower().split(), 'anchor': ''}
        if tag in ('script', 'style'): self.skip += 1

    def handle_data(self, data):
        if self.schema is not None: self.schema += data
        if self.skip: return
        if self.current: self.current[1] += data
        if self.anchor: self.anchor['anchor'] += data

    def handle_endtag(self, tag):
        if self.current and self.current[0] == tag:
            (self.titles if tag == 'title' else self.headings).append(self.current[1].strip())
            self.current = None
        if tag == 'a' and self.anchor:
            self.links.append(self.anchor); self.anchor = None
        if tag == 'script' and self.schema is not None:
            try: self.schemas.append(json.loads(self.schema))
            except (ValueError, TypeError): self.schemas.append(None)
            self.schema = None
        if tag in ('script', 'style'): self.skip = max(0, self.skip - 1)


def parse(response):
    p = Page()
    p.feed(response['body'].decode('utf-8', errors='strict'))
    return p


def audit_page(url, response, observed):
    p = parse(response)
    final = public_url(response['url'], own=True)
    available = 200 <= response['status'] < 300 and final is not None
    rules = {
        'https': response['url'].startswith('https://'), 'available': available,
        'title': len(p.titles) == 1 and bool(p.titles[0]),
        'description': len(p.descriptions) == 1 and bool(p.descriptions[0]),
        'heading': len(p.headings) == 1 and bool(p.headings[0]),
        # This HTML belongs to the returned response after redirects. Compare
        # its own declaration with that final URL, never with the old request.
        # The requested URL and exact response hash remain separate evidence.
        'canonical': final is not None and p.canonicals == [final],
        'indexable': not any(re.search(r'(^|[,\s])(?:noindex|none)(?=$|[,\s])', x) for x in [*p.robots, response['robotsHeader'].lower()]),
        'structuredData': bool(p.schemas) and all(x is not None for x in p.schemas),
    }
    # A blocked/unavailable response cannot be scored as an inspected page.
    score = sum(CHECKS[k] for k, passed in rules.items() if passed) if available else None
    schema_text = json.dumps(p.schemas)
    author = bool(p.authors) or bool(re.search(r'"author"\s*:', schema_text))
    sources = len({public_url(urljoin(url, a['href'])) for a in p.links
                   if public_url(urljoin(url, a['href'])) and urlsplit(urljoin(url, a['href'])).hostname not in (DOMAIN, 'www.' + DOMAIN)})
    row = {'url': url, 'finalUrl': final, 'status': response['status'], 'checkedAt': observed,
            'trust': score, 'checks': rules, 'authorDeclared': author,
            'externalSourceLinks': sources, 'sha256': hashlib.sha256(response['body']).hexdigest()}
    evidence = quiz_schema.observe(url, response, observed)
    if evidence is not None: row['quizQuestions'] = evidence
    return row


def backlinks(url, response, observed):
    final = public_url(response['url'])
    if not final or own_host(final): return []
    p = parse(response)
    links = {}
    if response['status'] != 200: return []
    for a in p.links:
        target = public_url(urljoin(response['url'], a['href']), own=True)
        if not target: continue
        anchor = re.sub(r'\s+', ' ', a['anchor']).strip()[:180]
        if '@' in anchor: anchor = '[Anchor withheld]'
        rel = sorted(set(a['rel']) & {'nofollow', 'ugc', 'sponsored', 'noopener', 'noreferrer'})
        # Repeated image/text buttons on one source page are one backlink per
        # target/rel combination, rather than inflating the count with anchors.
        key = (target, tuple(rel))
        links[key] = {'sourceUrl': final, 'targetUrl': target, 'anchor': anchor, 'rel': rel,
                      'verifiedAt': observed, 'sha256': hashlib.sha256(response['body']).hexdigest()}
    return list(links.values())


def trust_summary(pages):
    scored = [p['trust'] for p in pages if p.get('trust') is not None]
    return {'value': round(sum(scored) / len(scored), 1) if scored else None,
            'scoredPages': len(scored), 'requestedPages': len(pages), 'method': 'BrainiLab Trust v1 · technical checklist'}


def validate(value):
    if value.get('schemaVersion') != VERSION or value.get('domain') != DOMAIN or not stamp(value.get('observedAt')):
        raise ValueError('Unsupported SEO index')
    pages, sources, links = [], [], []
    for p in value['pages']:
        if public_url(p['url'], own=True) != p['url'] or not stamp(p['checkedAt']) or type(p['status']) is not int or not 0<=p['status']<=599:
            raise ValueError('Invalid audited page')
        if p['finalUrl'] is not None and public_url(p['finalUrl'],own=True)!=p['finalUrl']:
            raise ValueError('Invalid final page URL')
        if type(p['authorDeclared']) is not bool or type(p['externalSourceLinks']) is not int or not 0<=p['externalSourceLinks']<=100000 or not re.fullmatch('[a-f0-9]{64}',p['sha256']):
            raise ValueError('Invalid public page evidence')
        checks = {k: p['checks'].get(k) for k in CHECKS}
        if any(type(x) is not bool for x in checks.values()): raise ValueError('Invalid checklist')
        available = checks['available']
        if available != (200<=p['status']<300 and p['finalUrl'] is not None):
            raise ValueError('Availability does not match the response')
        score = sum(CHECKS[k] for k, passed in checks.items() if passed) if available else None
        if score != p.get('trust'): raise ValueError('Trust score does not match its evidence')
        pages.append({k:p[k] for k in ('url','finalUrl','status','checkedAt','trust','authorDeclared','externalSourceLinks','sha256')} | {'checks': checks})
        if p.get('quizQuestions') is not None:
            evidence = quiz_schema.page(p['quizQuestions'])
            if evidence['url']!=p['url'] or evidence['sha256']!=p['sha256'] or evidence['checkedAt']!=quiz_schema.timestamp(p['checkedAt']):
                raise ValueError('Quiz declarations are not bound to this response')
            pages[-1]['quizQuestions'] = evidence
    for s in value['sources']:
        if public_url(s['url']) != s['url'] or not stamp(s['checkedAt']) or s['state'] not in ('verified','not_found_in_html','unavailable','robots_disallowed','not_external'):
            raise ValueError('Invalid backlink source')
        if s.get('lastVerifiedAt') is not None and not stamp(s['lastVerifiedAt']): raise ValueError('Invalid source history date')
        if s.get('status') is not None and (type(s['status']) is not int or not 100<=s['status']<=599): raise ValueError('Invalid source response')
        if s.get('finalUrl') is not None and public_url(s['finalUrl'])!=s['finalUrl']: raise ValueError('Invalid source redirect')
        provenance = s.get('discovery', 'reviewed_public_candidate')
        if provenance not in DISCOVERY: raise ValueError('Invalid source provenance')
        sources.append({k:s.get(k) for k in ('url','finalUrl','checkedAt','state','status','lastVerifiedAt')} | {'discovery': provenance})
    for b in value['backlinks']:
        if public_url(b['sourceUrl']) != b['sourceUrl'] or public_url(b['targetUrl'],own=True) != b['targetUrl'] or not stamp(b['verifiedAt']) or not stamp(b['firstVerifiedAt']):
            raise ValueError('Invalid backlink')
        if not isinstance(b['anchor'],str) or len(b['anchor']) > 180 or '@' in b['anchor'] or not isinstance(b['rel'],list) or any(r not in ('nofollow','ugc','sponsored','noopener','noreferrer') for r in b['rel']) or not re.fullmatch('[a-f0-9]{64}',b['sha256']):
            raise ValueError('Invalid backlink label')
        if not any(s['url'] == b['sourceUrl'] and s['state'] == 'verified' and s['checkedAt'] == b['verifiedAt'] for s in sources):
            raise ValueError('Backlink has no matching successful source observation')
        links.append({k:b[k] for k in ('sourceUrl','targetUrl','anchor','rel','verifiedAt','firstVerifiedAt','sha256')})
    if len(pages)>250 or len(sources)>500 or len(links)>3000: raise ValueError('SEO index exceeds bounds')
    if len({p['url'] for p in pages})!=len(pages) or len({s['url'] for s in sources})!=len(sources): raise ValueError('Duplicate index entries')
    links = list({(b['sourceUrl'],b['targetUrl'],tuple(b['rel'])):b for b in links}.values())
    known = {}
    for b in [*value.get('knownLinks',[]),*links]:
        if public_url(b['sourceUrl'])!=b['sourceUrl'] or own_host(b['sourceUrl']) or public_url(b['targetUrl'],own=True)!=b['targetUrl'] or not stamp(b['firstVerifiedAt']) or not stamp(b.get('lastVerifiedAt',b.get('verifiedAt'))):
            raise ValueError('Invalid backlink history')
        if not isinstance(b['rel'],list) or any(r not in ('nofollow','ugc','sponsored','noopener','noreferrer') for r in b['rel']):raise ValueError('Invalid historical attributes')
        key=(b['sourceUrl'],b['targetUrl'],tuple(b['rel']))
        item={k:b[k] for k in ('sourceUrl','targetUrl','rel','firstVerifiedAt')}
        item['lastVerifiedAt']=b.get('lastVerifiedAt',b.get('verifiedAt'))
        if key in known:item['firstVerifiedAt']=min(known[key]['firstVerifiedAt'],item['firstVerifiedAt'],key=lambda x:datetime.fromisoformat(stamp(x)))
        known[key]=item
    if len(known)>6000:raise ValueError('Backlink history exceeds bounds')
    for b in links:b['firstVerifiedAt']=known[(b['sourceUrl'],b['targetUrl'],tuple(b['rel']))]['firstVerifiedAt']
    result = {'schemaVersion': VERSION, 'domain': DOMAIN, 'observedAt': value['observedAt'],
            'pages': pages, 'sources': sources, 'backlinks': links, 'knownLinks':list(known.values()),'domainTrust': trust_summary(pages),
            'limitations': LIMITATIONS, 'scoreWeights': CHECKS,
            'scope': 'Published catalogue, recorded public game listings and reviewed candidate URLs; anonymous HTML fetches only.'}
    if 'canonicalReference' in value:
        if value['canonicalReference'] != 'final_response_url': raise ValueError('Unsupported canonical reference')
        result['canonicalReference'] = value['canonicalReference']
    if value.get('keywords') is not None: result['keywords'] = seo_keywords.validate(value['keywords'])
    if value.get('reputation') is not None: result['reputation'] = seo_reputation.validate(value['reputation'])
    if value.get('searchSources') is not None: result['searchSources'] = seo_discovery.validate(value['searchSources'])
    if value.get('quizSchema') is not None: result['quizSchema'] = quiz_schema.validate(value['quizSchema'])
    return result


def crawl(page_urls, source_urls, previous=None, now=None, fetcher=fetch, source_kinds=None):
    observed = (now or datetime.now(timezone.utc)).isoformat()
    previous = previous or {}
    pages, sources, links = [], [], []
    robots = {}
    for origin in sorted({'https://' + urlsplit(u).hostname for u in [*page_urls, *source_urls]}):
        rp = RobotFileParser()
        try:
            result = fetcher(origin + '/robots.txt')
            if result['status'] == 200: rp.parse(result['body'].decode('utf-8').splitlines())
            elif result['status'] in (404,410): rp.parse([])
            else: robots[origin] = None; continue
            robots[origin] = rp
        except (OSError, ValueError, URLError, http.client.HTTPException): robots[origin] = None
    def collect(url):
        rule = robots.get('https://' + urlsplit(url).hostname)
        if rule is None: return url, None, 'unavailable'
        if not rule.can_fetch(AGENT, url): return url, None, 'robots_disallowed'
        try: return url, fetcher(url), None
        except (OSError, ValueError, URLError, UnicodeError, http.client.HTTPException): return url, None, 'unavailable'
    # One request at a time per remote portal; bounded concurrency only on our own site.
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(collect, page_urls))
    for url, result, failure in results:
        if failure:
            pages.append({'url':url,'finalUrl':None,'status':0,'checkedAt':observed,'trust':None,
                          'checks':{k:False for k in CHECKS},'authorDeclared':False,'externalSourceLinks':0,'sha256':hashlib.sha256(b'').hexdigest()})
        else:
            try: pages.append(audit_page(url, result, observed))
            except (ValueError, UnicodeError):
                pages.append({'url':url,'finalUrl':None,'status':0,'checkedAt':observed,'trust':None,'checks':{k:False for k in CHECKS},'authorDeclared':False,'externalSourceLinks':0,'sha256':hashlib.sha256(b'').hexdigest()})
    old_links = {(b['sourceUrl'],b['targetUrl'],tuple(b['rel'])):b for b in [*previous.get('backlinks',[]),*previous.get('knownLinks',[])]}
    for url in source_urls:
        _, result, failure = collect(url)
        prior = next((s for s in previous.get('sources',[]) if s['url']==url), {})
        found = []
        if result:
            try: found = backlinks(url, result, observed)
            except (ValueError, UnicodeError): failure = 'unavailable'
        if result and own_host(result['url']): failure='not_external'
        state = failure or ('verified' if found else 'not_found_in_html' if result['status']==200 else 'unavailable')
        final=public_url(result['url']) if result else None
        record_url=final if final and not own_host(final) else url
        sources.append({'url':record_url,'finalUrl':final,'checkedAt':observed,'state':state,'status':result['status'] if result else None,
                        'discovery':(source_kinds or {}).get(url,'reviewed_public_candidate'),
                        'lastVerifiedAt':observed if found else prior.get('lastVerifiedAt')})
        for b in found:
            old = old_links.get((b['sourceUrl'],b['targetUrl'],tuple(b['rel'])),{})
            b['firstVerifiedAt'] = old.get('firstVerifiedAt', observed)
            links.append(b)
    # Inspect the exact incoming destinations too, including index.html aliases.
    # Never borrow checks from a canonical sibling or grow beyond the site budget.
    inspected = {p['url'] for p in pages}
    targets = sorted({b['targetUrl'] for b in links} - inspected)[:max(0, 250-len(pages))]
    with ThreadPoolExecutor(max_workers=3) as pool:
        target_results = list(pool.map(collect, targets))
    for url, result, failure in target_results:
        try:
            if failure: raise ValueError('Destination could not be inspected')
            pages.append(audit_page(url, result, observed))
        except (ValueError, UnicodeError):
            pages.append({'url':url,'finalUrl':None,'status':0,'checkedAt':observed,'trust':None,
                          'checks':{k:False for k in CHECKS},'authorDeclared':False,'externalSourceLinks':0,'sha256':hashlib.sha256(b'').hexdigest()})
    if not any(p['trust'] is not None for p in pages):
        raise RuntimeError('No public page could be inspected; preserve the last successful index')
    sources=list({s['url']:s for s in sources}.values())
    return validate({'schemaVersion':VERSION,'domain':DOMAIN,'observedAt':observed,'canonicalReference':'final_response_url','pages':pages,'sources':sources,'backlinks':links,'knownLinks':previous.get('knownLinks',previous.get('backlinks',[]))})


def ledger_sources(value):
    """Only explicit public listing fields from verified publication records.

    Never walk free text, email bodies, receipts, account URLs or unverified forms.
    A candidate must still pass this crawl before becoming a verified backlink.
    """
    found = set()
    for row in value.get('forms', []):
        if not any(row.get(k) is True for k in ('placementVerified', 'publicationVerified', 'listingVerified')):
            continue
        for key in ('listingUrl', 'publicUrl'):
            raw = row.get(key)
            clean = public_url(raw)
            if clean and clean == raw and not own_host(clean): found.add(clean)
    return sorted(found)


def refresh(private, distribution_path=None, force=False, now=None, sources_path=None, ledger_path=None):
    private = Path(private); now = now or datetime.now(timezone.utc)
    source = Path(distribution_path or private/'distribution-latest.json')
    data_bytes = source.read_bytes(); data = json.loads(data_bytes)
    page_urls = sorted({u for r in data['resources'] if (u:=public_url('https://'+DOMAIN+r['path'],own=True))} | {'https://'+DOMAIN+'/'})
    provenance = {u: 'published_listing' for r in data['directories'] if r.get('state')=='published' and (u:=public_url(r.get('listingUrl')))}
    ledger_path = Path(ledger_path) if ledger_path else None
    ledger_bytes = ledger_path.read_bytes() if ledger_path else None
    if ledger_bytes:
        provenance.update({u: 'owner_submitted_listing' for u in ledger_sources(json.loads(ledger_bytes))})
    extra_path = Path(sources_path or private/'seo-explorer-sources.json')
    extra_bytes = extra_path.read_bytes() if extra_path.exists() else None
    if extra_bytes:
        extra = json.loads(extra_bytes)
        if not isinstance(extra,list):
            raise ValueError('Additional sources must be explicit public external page URLs')
        for entry in extra:
            u = entry if isinstance(entry,str) else entry.get('url') if isinstance(entry,dict) else None
            kind = 'reviewed_public_candidate' if isinstance(entry,str) else entry.get('discovery') if isinstance(entry,dict) else None
            if public_url(u)!=u or not u or own_host(u) or kind not in DISCOVERY:
                raise ValueError('Additional sources must be explicit public external page URLs')
            provenance.setdefault(u, kind)
    source_urls = sorted(provenance)
    if len(page_urls)>250 or len(source_urls)>500: raise ValueError('Crawl exceeds explicit index limits')
    path = private/'seo-explorer-latest.json'; prior = path.read_bytes() if path.exists() else None
    previous = validate(json.loads(prior)) if prior else None
    # Reuse a matching successful daily snapshot; no minimum crawl volume.
    frontier = hashlib.sha256(json.dumps([PRODUCER_VERSION,page_urls,provenance],sort_keys=True).encode()).hexdigest()
    state_path = private/'seo-explorer-state.json'
    state = json.loads(state_path.read_text()) if state_path.exists() else {}
    if not force and previous and state.get('frontier')==frontier and state.get('day')==now.date().isoformat() and state.get('sha256')==hashlib.sha256(prior).hexdigest():
        return {'reused':True,'pages':len(previous['pages']),'backlinks':len(previous['backlinks']),'observedAt':previous['observedAt']}
    lock = private/'seo-explorer.write-lock'
    private.mkdir(parents=True,exist_ok=True)
    fd = os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        os.close(fd)
        clean = crawl(page_urls, source_urls, previous, now, source_kinds=provenance)
        clean = validate(clean)
        if (path.read_bytes() if path.exists() else None)!=prior or source.read_bytes()!=data_bytes or (extra_path.read_bytes() if extra_path.exists() else None)!=extra_bytes or (ledger_path.read_bytes() if ledger_path else None)!=ledger_bytes:
            raise RuntimeError('SEO inputs changed concurrently; reread before retrying')
        if prior: api.private_write(private/'seo-explorer-history'/(hashlib.sha256(prior).hexdigest()+'.json'),json.loads(prior))
        api.private_write(path,clean)
        api.private_write(state_path,{'frontier':frontier,'day':now.date().isoformat(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
        return {'reused':False,'pages':len(clean['pages']),'backlinks':len(clean['backlinks']),'observedAt':clean['observedAt']}
    finally:
        lock.unlink()


def attach_seo(report, private):
    path = private/'seo-explorer-latest.json'
    candidates = [report.get('seoExplorer')]
    if path.exists():
        try: candidates.append(json.loads(path.read_text(encoding='utf-8')))
        except (OSError,ValueError): pass
    bases = []
    for candidate in candidates:
        if not isinstance(candidate,dict): continue
        try: bases.append(validate({k:v for k,v in candidate.items() if k not in ('keywords','reputation','searchSources','quizSchema')}))
        except (ValueError,KeyError,TypeError): continue
    if not bases: return report
    clean = max(bases,key=lambda s:datetime.fromisoformat(stamp(s['observedAt'])))
    for key, file, validator in [('keywords','seo-keywords-latest.json',seo_keywords.validate),('searchSources','seo-search-sources-latest.json',seo_discovery.validate),('reputation','seo-reputation-latest.json',seo_reputation.validate)]:
        item = Path(private)/file
        choices = [c.get(key) for c in candidates if isinstance(c,dict)]
        if item.exists():
            try: choices.append(json.loads(item.read_text(encoding='utf-8')))
            except (OSError,ValueError): pass
        valid = []
        for choice in choices:
            try: valid.append(validator(choice))
            except (ValueError,KeyError,TypeError,AttributeError): continue
        if not valid: continue
        if key in ('keywords','searchSources'):
            clean[key]=max(valid,key=lambda s:datetime.fromisoformat(stamp(s['observedAt'])))
        else:
            # The three UI reports may be read on different days. Preserve the
            # newest successful observation of each, independently of crawl age.
            merged={'schemaVersion':1,'domain':DOMAIN}
            for section in ('manualActions','securityIssues','links'):
                merged[section]=max(valid,key=lambda s:datetime.fromisoformat(stamp(s[section]['observedAt'])))[section]
            clean[key]=validator(merged)
    clean = quiz_schema.attach(clean, private, candidates)
    return {**report,'seoExplorer':clean}


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private',type=Path,default=api.PRIVATE)
    parser.add_argument('--force',action='store_true')
    parser.add_argument('--sources',type=Path,help='Private JSON array of additional public source page URLs, e.g. reviewed Search Console link exports')
    parser.add_argument('--ledger',type=Path,help='Private campaign ledger: allowlisted published listing URLs only')
    parser.add_argument('--keywords',action='store_true',help='Refresh two query-only final Search Console windows using the existing readonly authorization')
    parser.add_argument('--search-sources',action='store_true',help='Refresh separate Google Images queries and 90-day Web query/page evidence')
    parser.add_argument('--reputation-input',type=Path,help='Record dated observed Search Console UI evidence; never a synthetic authority score')
    parser.add_argument('--expected-reputation-sha256',help='Exact prior private reputation hash, or missing')
    args=parser.parse_args();api.PRIVATE=args.private.resolve()
    try:
        if args.reputation_input:
            if not args.expected_reputation_sha256: raise ValueError('Expected reputation hash is required')
            print(json.dumps(seo_reputation.record(api.PRIVATE,json.loads(args.reputation_input.read_text(encoding='utf-8')),args.expected_reputation_sha256)))
        elif args.keywords: print(json.dumps(seo_keywords.refresh(api.PRIVATE)))
        elif args.search_sources: print(json.dumps(seo_discovery.refresh(api.PRIVATE)))
        else: print(json.dumps(refresh(api.PRIVATE,force=args.force,sources_path=args.sources,ledger_path=args.ledger)))
    except (OSError,ValueError,RuntimeError,KeyError,TypeError):
        print('SEO crawl failed. Preserve the last dated snapshot; do not infer lost backlinks or zero trust.')
        raise SystemExit(1)
