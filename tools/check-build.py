"""Verify the deploy directory has only public files and valid local HTML references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import posixpath
ROOT=Path(__file__).resolve().parents[1]/'dist'
assert ROOT.is_dir(), 'Run the build first'
errors=[]
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('src','href') and value:self.links.append(value)
for page in ROOT.rglob('*.html'):
    parser=Links();parser.links=[];parser.feed(page.read_text(encoding='utf8'))
    for link in parser.links:
        url=urlsplit(link)
        if url.scheme or url.netloc or not url.path:continue
        local=unquote(url.path)
        target=ROOT/local.lstrip('/') if local.startswith('/') else page.parent/local
        if target.is_dir():target=target/'index.html'
        if not target.exists():errors.append(f'{page.relative_to(ROOT)}: {link}')
for forbidden in ['tools','content','supabase','.git','node_modules','dist','package.json','wrangler.jsonc']:
    assert not (ROOT/forbidden).exists(),f'Private/build content leaked: {forbidden}'
assert not list(ROOT.rglob('*.map')), 'Do not deploy duplicate source maps'
assert not (ROOT/'assets/js/daily-game-runner.js').exists(), 'Retired game runner still deployed'
assert not errors,'\n'.join(errors)
print(f'Checked {len(list(ROOT.rglob("*.html")))} deployed HTML pages: local links/assets and publication exclusions passed.')
