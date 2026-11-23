"""Windows adapter: apply the original kit's HTML inventory parser offline.

Adapter copyright 2026 BrainiLab. The separately vendored, unmodified kit is
copyright SIM32, EUPL-1.2; see its LICENSE and NOTICE. No browser or network is
launched by this adapter. Input is an owner-created public-page snapshot.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'vendor' / 'kit-audit-web' / 'lib'))
from inventaire import AnalyseurPage

manifest = Path(sys.argv[1]).resolve()
data = json.loads(manifest.read_text(encoding='utf-8'))
rows = []
for page in data['pages']:
    if not page.get('file'):
        rows.append({'url': page['url'], 'status': None, 'unverified': True})
        continue
    file = (manifest.parent / page['file']).resolve()
    if not file.is_relative_to(manifest.parent):
        raise ValueError('Snapshot path escapes its folder')
    parser = AnalyseurPage()
    parser.feed(file.read_text(encoding='utf-8'))
    rows.append({'url': page['url'], 'status': page['status'], 'title': parser.title.strip(),
                 'lang': parser.lang, 'description': parser.meta.get('description'),
                 'viewport': parser.meta.get('viewport'), 'robots': parser.meta.get('robots'),
                 'headings': parser.titres, 'jsonldBlocks': parser.jsonld,
                 'imagesMissingAlt': [i['src'] for i in parser.images if i['alt'] is None],
                 'imageCount': len(parser.images), 'linkCount': len(parser.liens)})
output = {'parser': 'MathBach32/kit-audit-web inventaire.AnalyseurPage',
          'scope': 'Static public HTML inventory; not a rendered accessibility or performance score.',
          'pages': rows}
Path(sys.argv[2]).write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print(json.dumps({'kitPages': len(rows)}))
