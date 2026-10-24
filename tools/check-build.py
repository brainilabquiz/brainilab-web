"""Verify the deploy directory has only public files and valid local HTML references."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
ROOT=Path(__file__).resolve().parents[1]/'dist'
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ('src','href') and value:self.links.append(value)
def check_build(root=ROOT):
    assert root.is_dir(), 'Run the build first'
    errors=[]
    pages=list(root.rglob('*.html'))
    for page in pages:
        parser=Links();parser.links=[];parser.feed(page.read_text(encoding='utf8'))
        for link in parser.links:
            url=urlsplit(link)
            if url.scheme or url.netloc or not url.path:continue
            # worker.js serves this image route; it is not a static dist file.
            # Keep the exact ASCII ID contract, never exempt arbitrary /api/ URLs.
            if re.fullmatch(r'/api/youtube-thumbnail/[A-Za-z0-9_-]{11}',url.path):continue
            local=unquote(url.path)
            target=root/local.lstrip('/') if local.startswith('/') else page.parent/local
            if target.is_dir():target=target/'index.html'
            if not target.exists():errors.append(f'{page.relative_to(root)}: {link}')
    for forbidden in ['tools','content','supabase','.git','node_modules','dist','package.json','wrangler.jsonc']:
        assert not (root/forbidden).exists(),f'Private/build content leaked: {forbidden}'
    assert not list(root.rglob('*.map')), 'Do not deploy duplicate source maps'
    assert not (root/'assets/js/daily-game-runner.js').exists(), 'Retired game runner still deployed'
    assert not errors,'\n'.join(errors)
    return len(pages)

if __name__=='__main__':
    print(f'Checked {check_build()} deployed HTML pages: local links/assets and publication exclusions passed.')
