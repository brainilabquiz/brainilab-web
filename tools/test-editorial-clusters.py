"""Publication boundaries for default and explicitly sized editorial blocks."""
import unittest
from editorial_clusters import validate_clusters


class HubPublicationTests(unittest.TestCase):
    def setUp(self):
        self.slugs = [f'article-{i}' for i in range(10)]
        self.plan = {'supportingArticlesPerHub': 10, 'blocks': [{
            'id': 'example', 'hubSlug': 'reading-guide',
            'members': [{'slug': slug} for slug in self.slugs]}]}
        self.members = [{'slug': slug, 'status': 'published', 'sections': [
                         {'html': '<a href="/learn/reading-guide/">Full guide</a>'}],
                         'hub': {'url': '/learn/reading-guide/'}} for slug in self.slugs]
        self.hub = {'slug': 'reading-guide', 'status': 'published', 'sections': [
            {'html': ''.join(f'<p><a href="/learn/{slug}/">Read</a></p>' for slug in self.slugs)}]}

    def test_incomplete_block_is_allowed_without_a_public_hub(self):
        validate_clusters(self.members[:9], self.plan)
        with self.assertRaisesRegex(ValueError, 'before all 10'):
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
        self.members[0]['sections'] = []
        self.members[0]['hub'] = {'url': '/games/'}
        with self.assertRaisesRegex(ValueError, 'missing its return link'):
            validate_clusters(self.members + [self.hub], self.plan)
        self.members[0]['sections'] = [{'html': '<a href="/learn/reading-guide/">Full guide</a>'}]
        validate_clusters(self.members + [self.hub], self.plan)

    def test_draft_does_not_count_as_tenth_published_article(self):
        self.members[-1]['status'] = 'draft'
        with self.assertRaisesRegex(ValueError, 'before all 10'):
            validate_clusters(self.members + [self.hub], self.plan)

    def test_hub_cannot_count_as_a_supporting_article(self):
        self.plan['blocks'][0]['members'][-1]['slug'] = 'reading-guide'
        with self.assertRaisesRegex(ValueError, '10 distinct supporting'):
            validate_clusters(self.members + [self.hub], self.plan)

    def test_explicit_seven_article_block_keeps_the_default_unchanged(self):
        block = self.plan['blocks'][0]
        block['members'] = block['members'][:7]
        with self.assertRaisesRegex(ValueError, '10 distinct supporting'):
            validate_clusters(self.members[:7] + [self.hub], self.plan)
        block['supportingArticlesPerHub'] = 7
        validate_clusters(self.members[:7] + [self.hub], self.plan)
        self.assertEqual(self.plan['supportingArticlesPerHub'], 10)
        with self.assertRaisesRegex(ValueError, 'require their hub'):
            validate_clusters(self.members[:7], self.plan)
        with self.assertRaisesRegex(ValueError, 'before all 7'):
            validate_clusters(self.members[:6] + [self.hub], self.plan)
        self.members[6]['status'] = 'draft'
        with self.assertRaisesRegex(ValueError, 'before all 7'):
            validate_clusters(self.members[:7] + [self.hub], self.plan)

    def test_sized_block_still_requires_two_way_links(self):
        block = self.plan['blocks'][0]
        block.update(supportingArticlesPerHub=7, members=block['members'][:7])
        self.members[0]['hub'] = {'url': '/learn/'}
        self.members[0]['sections'] = []
        with self.assertRaisesRegex(ValueError, 'missing its return link'):
            validate_clusters(self.members[:7] + [self.hub], self.plan)
        self.members[0]['hub']['url'] = '/learn/reading-guide/'
        self.members[0]['sections'] = [{'html': '<a href="/learn/reading-guide/">Full guide</a>'}]
        self.hub['sections'][0]['html'] = ''
        with self.assertRaisesRegex(ValueError, 'missing a link'):
            validate_clusters(self.members[:7] + [self.hub], self.plan)

    def test_invalid_override_cannot_bypass_completeness_checks(self):
        for count in (True, 0, 1, -1, 7.5, '7', None):
            with self.subTest(count=count):
                self.plan['blocks'][0]['supportingArticlesPerHub'] = count
                with self.assertRaisesRegex(ValueError, 'integer of at least two'):
                    validate_clusters(self.members + [self.hub], self.plan)

    def test_legacy_hub_metadata_is_not_a_visible_return_link(self):
        self.members[0]['sections'] = []
        self.assertEqual(self.members[0]['hub']['url'], '/learn/reading-guide/')
        with self.assertRaisesRegex(ValueError, 'missing its return link'):
            validate_clusters(self.members + [self.hub], self.plan)


if __name__ == '__main__':
    unittest.main()
