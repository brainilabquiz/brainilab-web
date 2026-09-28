"""Check published editorial metadata, destinations and draft exclusion."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json, re, tempfile, shutil, subprocess, sys
ROOT=Path(__file__).resolve().parents[1]
class Page(HTMLParser):
    def __init__(self,text):
        super().__init__();self.refs=[];self.h1=0;self.ids=[];self.canonical=[];self.description=[];self.feed(text)
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='h1':self.h1+=1
        if 'id' in a:self.ids.append(a['id'])
        if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
        if tag=='meta' and a.get('name')=='description':self.description.append(a['content'])
        if tag in ('a','link','img','script','source'):
            for key in ('href','src','srcset'):
                if key in a:self.refs.append(a[key])
pages=[ROOT/'index.html',*sorted((ROOT/'learn').rglob('index.html'))]
for path in pages:
    text=path.read_text(encoding='utf-8');p=Page(text)
    assert p.h1==1,(path,'H1 count',p.h1)
    assert len(p.ids)==len(set(p.ids)),(path,'Duplicate ID')
    assert len(p.canonical)==1 and len(p.description)==1,(path,'metadata')
    for source in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text,re.S):json.loads(source)
    for ref in p.refs:
        url=urlsplit(ref)
        if url.scheme or url.netloc:continue
        dest=ROOT/unquote(url.path).lstrip('/') if url.path.startswith('/') else path.parent/unquote(url.path)
        if not url.path:dest=path
        elif dest.is_dir():dest=dest/'index.html'
        assert dest.is_file(),(path,ref,'Missing destination')
        if url.fragment and dest.suffix=='.html':
            assert url.fragment in Page(dest.read_text(encoding='utf-8')).ids,(path,ref,'Missing anchor')
assert 'content/articles/' in (ROOT/'.assetsignore').read_text(),'Draft sources must not be served'
assert 'pnpm-lock.yaml' in (ROOT/'.assetsignore').read_text()
nf=Page((ROOT/'404.html').read_text(encoding='utf-8'))
assert all(ref.startswith('/') for ref in nf.refs if 'assets/' in ref)
# Isolate publication/unpublication fixtures from the real site.
with tempfile.TemporaryDirectory(prefix='brainilab-editorial-', dir=ROOT.parent) as tmp:
    assert Path(tmp).resolve().is_relative_to(ROOT.parent.resolve())
    temp=Path(tmp)/'site'
    shutil.copytree(ROOT,temp,ignore=shutil.ignore_patterns('.git','node_modules','dist'))
    src=temp/'content/articles/how-to-learn-world-flags.json'
    a=json.loads(src.read_text(encoding='utf-8'));a['status']='draft';src.write_text(json.dumps(a),encoding='utf-8')
    subprocess.run([sys.executable,str(temp/'tools/build-editorial.py')],check=True,capture_output=True)
    assert not (temp/'learn/how-to-learn-world-flags/index.html').exists()
    for file in ('sitemap.xml','learn/index.html','learn/daily-or-anytime/index.html','index.html'):
        assert '/learn/how-to-learn-world-flags/' not in (temp/file).read_text(encoding='utf-8'),file
    a['status']='published';src.write_text(json.dumps(a),encoding='utf-8')
    subprocess.run([sys.executable,str(temp/'tools/build-editorial.py')],check=True,capture_output=True)
    assert (temp/'learn/how-to-learn-world-flags/index.html').is_file()
print(f'Checked {len(pages)} pages: links, assets, anchors, metadata, schema, draft exclusion and republishing passed.')
