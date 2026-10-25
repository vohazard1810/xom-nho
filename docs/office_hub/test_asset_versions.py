import importlib.util
from pathlib import Path
import re
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('office_build_bundle', Path(__file__).with_name('build_bundle.py'))
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class AssetVersionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='office-assets-')
        self.addCleanup(self.temp.cleanup)
        self.hub = Path(self.temp.name)
        (self.hub / 'index.html').write_text('<link href="style.css?v=old"><script src="app.js?v=old"></script>', encoding='utf-8')
        (self.hub / 'style.css').write_text('body { color: black; }', encoding='utf-8')
        (self.hub / 'app.js').write_text('const version = 1;', encoding='utf-8')

    def refs(self):
        return re.findall(r'(?:href|src)="([^"]+)"', (self.hub / 'index.html').read_text(encoding='utf-8'))

    def test_unchanged_assets_keep_index_snapshot_stable(self):
        build.refresh_asset_versions(self.hub)
        first = (self.hub / 'index.html').read_bytes()
        build.refresh_asset_versions(self.hub)
        self.assertEqual((self.hub / 'index.html').read_bytes(), first)
        self.assertTrue(all(ref.count('?v=') == 1 and 'old' not in ref for ref in self.refs()))

    def test_changed_asset_gets_new_url_without_invalidating_other_asset(self):
        build.refresh_asset_versions(self.hub)
        original_css, original_js = self.refs()
        (self.hub / 'style.css').write_text('body { color: blue; }', encoding='utf-8')
        build.refresh_asset_versions(self.hub)
        next_css, next_js = self.refs()
        self.assertNotEqual(next_css, original_css)
        self.assertEqual(next_js, original_js)
        (self.hub / 'app.js').write_text('const version = 2;', encoding='utf-8')
        build.refresh_asset_versions(self.hub)
        final_css, final_js = self.refs()
        self.assertEqual(final_css, next_css)
        self.assertNotEqual(final_js, next_js)
