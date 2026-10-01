"""Idempotently attach BrainiLab's shared visual layer to real HTML entry points."""
from pathlib import Path
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LINK = '<link rel="stylesheet" href="/assets/css/visual-system.css?v=1"/>'
TOPICS = {'general-knowledge', 'geography', 'history', 'science', 'sports'}
inventory = []
for name in subprocess.check_output(['git', 'ls-files', '*.html'], cwd=ROOT, text=True).splitlines():
    if name.startswith('tools/'):
        continue
    path = ROOT / name
    html = path.read_text(encoding='utf-8')
    if 'site.css' not in html and 'admin.css' not in html:
        inventory.append({'path': name, 'kind': 'redirect', 'visualLayer': False})
        continue
    first = name.split('/')[0]
    kind = 'public'
    if first in TOPICS and (name.count('/') == 1 or name == 'geography/flags/index.html'):
        kind = 'topic'
    elif (first == 'games' and name != 'games/index.html') or (first in TOPICS and name.count('/') > 1):
        kind = 'play'
    elif first in {'about', 'privacy', 'cookies', 'plus'}:
        kind = 'info'
    elif name == '404.html':
        kind = 'error'
    elif first == 'admin':
        kind = 'admin'
    classes = ['braini-visual'] + ([kind + '-page'] if kind in {'topic', 'play', 'info', 'error'} else [])
    def body(match):
        attrs = match[1]
        current = re.search(r'class="([^"]*)"', attrs)
        if current:
            values = list(dict.fromkeys(current[1].split() + classes))
            attrs = attrs[:current.start()] + 'class="' + ' '.join(values) + '"' + attrs[current.end():]
        else:
            attrs += ' class="' + ' '.join(classes) + '"'
        return '<body' + attrs + '>'
    html = re.sub(r'<body([^>]*)>', body, html, count=1)
    html = re.sub(r'<link rel="stylesheet" href="/assets/css/visual-system.css\?v=\d+"/>\s*', '', html)
    html = html.replace('</head>', LINK + '\n</head>', 1)
    path.write_text(html, encoding='utf-8')
    inventory.append({'path': name, 'kind': kind, 'visualLayer': True})

report = ROOT / 'tools/visual-route-inventory.json'
report.write_text(json.dumps(inventory, indent=2) + '\n', encoding='utf-8')
print(f'Visual layer: {sum(r["visualLayer"] for r in inventory)} pages; {sum(not r["visualLayer"] for r in inventory)} redirects preserved.')
