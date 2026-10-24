"""Keep dynamic thumbnail support narrow without hiding missing public assets."""
from pathlib import Path
from tempfile import TemporaryDirectory
from contextlib import contextmanager
import importlib.util
import unittest

spec=importlib.util.spec_from_file_location('check_build',Path(__file__).with_name('check-build.py'))
checker=importlib.util.module_from_spec(spec)
spec.loader.exec_module(checker)

@contextmanager
def temporary_build():
    parent=Path(__file__).resolve().parent
    with TemporaryDirectory(prefix='build-links-',dir=parent) as directory:
        assert Path(directory).resolve().is_relative_to(parent)
        yield directory

class BuildLinks(unittest.TestCase):
    def test_known_thumbnail_and_real_static_file(self):
        with temporary_build() as directory:
            root=Path(directory)
            (root/'photo.webp').write_bytes(b'fixture')
            (root/'index.html').write_text('<img src="/photo.webp"><img src="/api/youtube-thumbnail/lL1VbyzusHQ?v=2">',encoding='utf-8')
            self.assertEqual(checker.check_build(root),1)

    def test_missing_or_malformed_references_still_fail(self):
        for url in ['/missing.webp','/api/unknown-route','/api/youtube-thumbnail/short','/api/youtube-thumbnail/lL1VbyzusHQ/','/api/youtube-thumbnail/%6cL1VbyzusHQ']:
            with self.subTest(url=url),temporary_build() as directory:
                root=Path(directory)
                (root/'index.html').write_text('<img src="'+url+'">',encoding='utf-8')
                with self.assertRaisesRegex(AssertionError,'index.html'):
                    checker.check_build(root)

    def test_private_build_content_still_fails(self):
        for forbidden in ['tools','content','supabase','.git','node_modules','dist','package.json','wrangler.jsonc','debug.map']:
            with self.subTest(forbidden=forbidden),temporary_build() as directory:
                root=Path(directory)
                (root/'index.html').write_text('<main>Public page</main>',encoding='utf-8')
                (root/forbidden).write_text('private fixture',encoding='utf-8')
                with self.assertRaises(AssertionError):checker.check_build(root)

if __name__=='__main__':unittest.main()
