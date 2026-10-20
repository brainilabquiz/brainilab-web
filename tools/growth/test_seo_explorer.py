import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import socket
import tempfile
import unittest
from unittest.mock import patch
import seo_explorer as seo
import gsc_sync as api

AT=datetime(2026,10,20,18,tzinfo=timezone.utc)
URL='https://brainilabgames.com/games/example/'
SOURCE='https://directory.example/game/brainilab/'
HTML=b'''<html><head><title>Example game</title><meta name="description" content="A real description"><link rel="canonical" href="https://brainilabgames.com/games/example/"><script type="application/ld+json">{"@type":"Article","author":{"name":"BrainiLab"}}</script></head><body><h1>Example</h1><a href="https://source.example/fact/">Source</a></body></html>'''
def response(url,body=HTML,status=200,robots=''):
    return {'url':url,'body':body,'status':status,'robotsHeader':robots}
def fake(url):
    if url.endswith('/robots.txt'):return response(url,b'User-agent: *\nAllow: /')
    if url==SOURCE:return response(url,b'<a href="https://brainilabgames.com/games/example/?utm_source=test" rel="ugc nofollow">Try &amp; play</a><a href="https://evil.example/x">Other</a>')
    return response(url)

class SEOTest(unittest.TestCase):
    def test_page_formula_and_unavailable(self):
        row=seo.audit_page(URL,response(URL),AT.isoformat())
        self.assertEqual(row['trust'],100);self.assertTrue(row['authorDeclared'])
        self.assertEqual(row['externalSourceLinks'],1)
        self.assertEqual(seo.audit_page(URL,response(URL,robots='googlebot: noindex'),AT.isoformat())['trust'],85)
        self.assertIsNone(seo.audit_page(URL,response(URL,b'',403),AT.isoformat())['trust'])
        self.assertEqual(seo.trust_summary([row,{'trust':None}])['scoredPages'],1)

    def test_invalid_schema_and_duplicate_heading(self):
        body=HTML.replace(b'</body>',b'<h1>Another</h1></body>').replace(b'{"@type":"Article","author":{"name":"BrainiLab"}}',b'{broken')
        row=seo.audit_page(URL,response(URL,body),AT.isoformat())
        self.assertEqual(row['trust'],80)
        self.assertFalse(row['checks']['structuredData']);self.assertFalse(row['checks']['heading'])

    def test_direct_links_only_and_private_url_data(self):
        body=b'<a href="https://brainilabgames.com/games/example/?token=secret#x" rel="nofollow noopener">=SUM(1)</a><a href="https://brainilabgames.com/profile/">Private</a><a href="https://evil.example/?url=https://brainilabgames.com/">Redirector</a><script>"https://brainilabgames.com/"</script>'
        links=seo.backlinks(SOURCE,response(SOURCE,body),AT.isoformat())
        self.assertEqual(len(links),1);self.assertEqual(links[0]['targetUrl'],URL)
        self.assertNotIn('secret',json.dumps(links));self.assertEqual(links[0]['rel'],['nofollow','noopener'])

    def test_history_failures_and_no_false_lost_link(self):
        first=seo.crawl([URL],[SOURCE],now=AT,fetcher=fake)
        self.assertEqual(len(first['backlinks']),1)
        later=datetime(2026,10,21,18,tzinfo=timezone.utc)
        second=seo.crawl([URL],[SOURCE],previous=first,now=later,fetcher=fake)
        self.assertEqual(second['backlinks'][0]['firstVerifiedAt'],AT.isoformat())
        failed=seo.crawl([URL],[SOURCE],previous=first,now=later,fetcher=lambda u:response(u,b'',403) if u==SOURCE else fake(u))
        self.assertEqual(failed['sources'][0]['state'],'unavailable');self.assertEqual(failed['backlinks'],[])
        self.assertEqual(failed['sources'][0]['lastVerifiedAt'],AT.isoformat())
        missing=seo.crawl([URL],[SOURCE],previous=first,now=later,fetcher=lambda u:response(u,b'<main>No static link</main>') if u==SOURCE else fake(u))
        self.assertEqual(missing['sources'][0]['state'],'not_found_in_html')
        recovered=seo.crawl([URL],[SOURCE],previous=missing,now=datetime(2026,10,22,18,tzinfo=timezone.utc),fetcher=fake)
        self.assertEqual(recovered['backlinks'][0]['firstVerifiedAt'],AT.isoformat())

    def test_redirects_cannot_create_self_backlinks_and_aliases_are_deduplicated(self):
        def redirected(u):return response(URL,b'<a href="https://brainilabgames.com/games/example/">Self</a>') if u==SOURCE else fake(u)
        result=seo.crawl([URL],[SOURCE],now=AT,fetcher=redirected)
        self.assertEqual(result['backlinks'],[]);self.assertEqual(result['sources'][0]['state'],'not_external')
        second='https://second.example/game/'
        def aliases(u):return response(SOURCE,b'<a href="https://brainilabgames.com/games/example/">Play</a>') if u in (SOURCE,second) else fake(u)
        result=seo.crawl([URL],[SOURCE,second],now=AT,fetcher=aliases)
        self.assertEqual(len(result['backlinks']),1);self.assertEqual(len(result['sources']),1)

    def test_connection_uses_validated_ip_with_original_tls_hostname(self):
        connection=seo.PinnedHTTPS('directory.example','8.8.8.8')
        with patch('seo_explorer.socket.create_connection') as connect,patch.object(connection._context,'wrap_socket') as tls:
            connection.connect();connect.assert_called_once_with(('8.8.8.8',443),20)
            self.assertEqual(tls.call_args.kwargs['server_hostname'],'directory.example')

    def test_robots(self):
        requests=[]
        def guarded(u):
            requests.append(u)
            return response(u,b'User-agent: *\nDisallow: /game/') if u=='https://directory.example/robots.txt' else fake(u)
        result=seo.crawl([URL],[SOURCE],now=AT,fetcher=guarded)
        self.assertNotIn(SOURCE,requests);self.assertEqual(result['sources'][0]['state'],'robots_disallowed')
        with self.assertRaises(RuntimeError):seo.crawl([URL],[],now=AT,fetcher=lambda u:response(u,b'',503))

    def test_public_hosts(self):
        for bad in ['http://example.org/','https://127.0.0.1/','https://user:pass@example.org/','https://localhost/','https://example.org:8443/']:
            self.assertIsNone(seo.public_url(bad))
        with patch('seo_explorer.socket.getaddrinfo',return_value=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('192.168.1.2',443))]):
            with self.assertRaises(ValueError):seo.safe_host(SOURCE)
        with patch('seo_explorer.socket.getaddrinfo',return_value=[(socket.AF_INET,socket.SOCK_STREAM,6,'',('8.8.8.8',443))]):
            self.assertEqual(seo.safe_host(SOURCE),SOURCE)

    def test_validation_allowlist_and_forged_scores(self):
        value=seo.crawl([URL],[SOURCE],now=AT,fetcher=fake)
        value['secret']='private email';value['pages'][0]['private']='private email'
        self.assertNotIn('private email',json.dumps(seo.validate(value)))
        for mutation in [lambda v:v['pages'][0].update(trust=99),lambda v:v['pages'][0].update(url=URL+'?email=private'),lambda v:v['backlinks'][0].update(targetUrl='https://evil.example/'),lambda v:v['backlinks'][0].update(anchor='private@example.org'),lambda v:v['pages'].append(v['pages'][0])]:
            bad=copy.deepcopy(value);mutation(bad)
            with self.assertRaises(ValueError):seo.validate(bad)

    def test_cache_history_cas_and_failure_preservation(self):
        with tempfile.TemporaryDirectory(dir=Path.cwd()) as directory,patch.object(api,'PRIVATE',Path(directory)):
            self.assertTrue(Path(directory).resolve().is_relative_to(Path.cwd().resolve()))
            private=Path(directory);distribution=private/'distribution-latest.json'
            distribution.write_text(json.dumps({'resources':[{'path':'/games/example/'}],'directories':[{'state':'published','listingUrl':SOURCE},{'state':'pending','listingUrl':'https://pending.example/'}]}))
            snapshot=seo.crawl([URL],[SOURCE],now=AT,fetcher=fake)
            with patch.object(seo,'crawl',return_value=snapshot) as collect:
                self.assertFalse(seo.refresh(private,now=AT)['reused']);self.assertTrue(seo.refresh(private,now=AT)['reused']);self.assertEqual(collect.call_count,1)
            original=(private/'seo-explorer-latest.json').read_bytes()
            def concurrent(*args,**kwargs):distribution.write_text(distribution.read_text()+' ');return snapshot
            with patch.object(seo,'crawl',side_effect=concurrent):
                with self.assertRaises(RuntimeError):seo.refresh(private,now=AT,force=True)
            self.assertEqual((private/'seo-explorer-latest.json').read_bytes(),original)
            self.assertFalse((private/'seo-explorer.write-lock').exists())
            with patch.object(seo,'crawl',side_effect=RuntimeError('offline')):
                with self.assertRaises(RuntimeError):seo.refresh(private,now=AT,force=True)
            self.assertEqual((private/'seo-explorer-latest.json').read_bytes(),original)
            enriched=seo.attach_seo({'opportunities':[{'state':'published','baseline':'keep'}]},private)
            self.assertEqual(enriched['opportunities'],[{'state':'published','baseline':'keep'}])
            (private/'seo-explorer-latest.json').write_text('{broken')
            self.assertEqual(seo.attach_seo(enriched,private),enriched)

    def test_only_explicit_published_ledger_urls_expand_the_frontier(self):
        ledger={'forms':[
            {'publicationVerified':True,'publicUrl':SOURCE,'body':'https://private.example/secret/'},
            {'publicationVerified':False,'publicUrl':'https://pending.example/'},
            {'placementVerified':True,'listingUrl':'https://mail.google.com/mail/u/0/'},
            {'placementVerified':True,'listingUrl':SOURCE+'?token=private'},
            {'publicationVerified':True,'publicUrl':SOURCE},
        ],'emails':[{'publicUrl':'https://mail-body.example/'}]}
        self.assertEqual(seo.ledger_sources(ledger),[SOURCE])

    def test_numeric_public_pagination_is_preserved_without_private_queries(self):
        source='https://directory.example/discover?page=8'
        self.assertEqual(seo.public_url(source),source)
        self.assertEqual(seo.public_url(source+'&token=secret'),'https://directory.example/discover')
        class Reply:
            status=200
            headers=type('Headers',(),{'get_content_type':lambda self:'text/html','get':lambda self,k,d:d})()
            def getheader(self,k,d=None):return d
            def read(self,n):return b'<html></html>'
        with patch('seo_explorer.public_addresses',return_value=(source,['8.8.8.8'])),patch('seo_explorer.PinnedHTTPS') as connection:
            connection.return_value.getresponse.return_value=Reply()
            self.assertEqual(seo.fetch(source)['url'],source)
            self.assertEqual(connection.return_value.request.call_args.args[1],'/discover?page=8')

    def test_redirected_sources_keep_their_discovery_origin(self):
        alias='https://directory.example/old/'
        def redirects(u):return fake(SOURCE) if u==alias else fake(u)
        result=seo.crawl([URL],[alias],now=AT,fetcher=redirects,source_kinds={alias:'owner_submitted_listing'})
        self.assertEqual(result['sources'][0]['url'],SOURCE)
        self.assertEqual(result['sources'][0]['discovery'],'owner_submitted_listing')

if __name__=='__main__':unittest.main()
