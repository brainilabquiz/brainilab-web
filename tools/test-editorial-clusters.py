"""Publication boundary checks for the ten-article hub policy."""
import unittest
from editorial_clusters import validate_clusters


class HubPublicationTests(unittest.TestCase):
    def setUp(self):
        self.slugs = [f'article-{i}' for i in range(10)]
        self.plan = {'supportingArticlesPerHub': 10, 'blocks': [{
            'id': 'example', 'hubSlug': 'reading-guide',
            'members': [{'slug': slug} for slug in self.slugs]}]}
        self.members = [{'slug': slug, 'status': 'published', 'sections': [],
                         'hub': {'url': '/learn/reading-guide/'}} for slug in self.slugs]
        self.hub = {'slug': 'reading-guide', 'status': 'published', 'sections': [
            {'html': ''.join(f'<p><a href="/learn/{slug}/">Read</a></p>' for slug in self.slugs)}]}

    def test_incomplete_block_is_allowed_without_a_public_hub(self):
        validate_clusters(self.members[:9], self.plan)
        with self.assertRaisesRegex(ValueError, 'before its ten'):
            validate_clusters(self.members[:9] + [self.hub], self.plan)

    def test_tenth_publication_requires_complete_reading_route(self):
        with self.assertRaisesRegex(ValueError, 'require their hub'):
            validate_clusters(self.members, self.plan)
        validate_clusters(self.members + [self.hub], self.plan)
        self.hub['sections'][0]['html'] = self.hub['sections'][0]['html'].replace(
            '/learn/article-9/', '/learn/nonexistent/')
        with self.assertRaisesRegex(ValueError, 'missing a link to article-9'):
            validate_clusters(self.members + [self.hub], self.plan)

    def test_return_links_are_required_and_can_be_contextual(self):
        self.members[0]['hub'] = {'url': '/games/'}
        with self.assertRaisesRegex(ValueError, 'missing its return link'):
            validate_clusters(self.members + [self.hub], self.plan)
        self.members[0]['sections'] = [{'html': '<a href="/learn/reading-guide/">Full guide</a>'}]
        validate_clusters(self.members + [self.hub], self.plan)

    def test_draft_does_not_count_as_tenth_published_article(self):
        self.members[-1]['status'] = 'draft'
        with self.assertRaisesRegex(ValueError, 'before its ten'):
            validate_clusters(self.members + [self.hub], self.plan)

    def test_hub_cannot_count_as_a_supporting_article(self):
        self.plan['blocks'][0]['members'][-1]['slug'] = 'reading-guide'
        with self.assertRaisesRegex(ValueError, 'ten distinct supporting'):
            validate_clusters(self.members + [self.hub], self.plan)


if __name__ == '__main__':
    unittest.main()
