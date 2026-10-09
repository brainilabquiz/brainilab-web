"""Validate complete reading blocks before generating static editorial pages."""
from html.parser import HTMLParser
import re


class Links(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.hrefs = set()
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.hrefs.update(value for key, value in attrs if key == 'href' and value)


def validate_clusters(articles, plan):
    published = {a['slug']: a for a in articles if a['status'] == 'published'}
    if plan.get('supportingArticlesPerHub') != 10:
        raise ValueError('Editorial hubs require ten supporting articles')
    claimed, hubs, block_ids = set(), set(), set()
    for block in plan['blocks']:
        name, hub = block['id'], block['hubSlug']
        required = block.get('supportingArticlesPerHub', plan['supportingArticlesPerHub'])
        if type(required) is not int or required < 2:
            raise ValueError(f'{name}: supporting article count must be an integer of at least two')
        members = [m['slug'] for m in block['members']]
        if name in block_ids or hub in hubs:
            raise ValueError(f'Duplicate editorial block or hub: {name}')
        block_ids.add(name)
        hubs.add(hub)
        if len(members) != required or len(set(members)) != required or hub in members:
            raise ValueError(f'{name}: plan exactly {required} distinct supporting articles')
        if claimed.intersection(members):
            raise ValueError(f'{name}: supporting article assigned to multiple blocks')
        claimed.update(members)
        if not all(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug) for slug in [hub, *members]):
            raise ValueError(f'{name}: invalid planned URL slug')
        live_members = [slug for slug in members if slug in published]
        if hub in published and len(live_members) != required:
            raise ValueError(f'{name}: hub published before all {required} supporting articles')
        if len(live_members) == required:
            if hub not in published:
                raise ValueError(f'{name}: {required} published articles require their hub')
            hub_links = Links(''.join(s['html'] for s in published[hub]['sections'])).hrefs
            for slug in members:
                if f'/learn/{slug}/' not in hub_links:
                    raise ValueError(f'{name}: hub is missing a link to {slug}')
                article = published[slug]
                returns = Links(''.join(s['html'] for s in article['sections'])).hrefs
                returns.add(article.get('hub', {}).get('url'))
                if f'/learn/{hub}/' not in returns:
                    raise ValueError(f'{name}: {slug} is missing its return link')
    if claimed.intersection(hubs):
        raise ValueError('A hub cannot count as a supporting article in another block')
