import importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('bundle',Path(__file__).with_name('build_bundle.py'))
bundle=importlib.util.module_from_spec(spec);spec.loader.exec_module(bundle)
class LatestPackageTests(unittest.TestCase):
 def package(self,hub,name,at,verdict='PASS',refs=None):
  record={'nonce':name,'at':at,'verdict':verdict,'tasks':{'A':'Done'},'reports':refs or {'codex':'reports/cx.md','antigravity':'reports/ag.md'},'testReceipt':'reports/tests.json','reviewRound':2}
  (hub/'reports'/f'{name}_ACCEPTANCE.json').write_text(json.dumps(record),encoding='utf-8')
 def test_latest_is_selected_by_acceptance_time_not_filename(self):
  with tempfile.TemporaryDirectory() as tmp:
   hub=Path(tmp);(hub/'reports').mkdir()
   for name in ['cx.md','ag.md']:(hub/'reports'/name).write_text('real report',encoding='utf-8')
   (hub/'reports/tests.json').write_text(json.dumps({'exitCode':0,'sourceUnchanged':True,'passedFiles':18,'totalFiles':18}),encoding='utf-8')
   self.package(hub,'Z_OLD','2026-10-24T10:00:00+07:00');self.package(hub,'A_NEW','2026-10-25T10:00:00+07:00')
   latest=bundle.build_latest(hub);self.assertEqual(latest['nonce'],'A_NEW');self.assertEqual(latest['tests']['passed'],18);self.assertTrue(latest['tests']['valid'])
 def test_blocked_and_outside_report_references_are_not_current_accepted_package(self):
  with tempfile.TemporaryDirectory() as tmp:
   hub=Path(tmp);(hub/'reports').mkdir()
   self.package(hub,'BLOCKED','2026-10-25T10:00:00+07:00',verdict='BLOCKED')
   self.package(hub,'OUTSIDE','2026-10-25T10:00:00+07:00',refs={'codex':'../private.md'})
   self.assertIsNone(bundle.build_latest(hub))
if __name__=='__main__':unittest.main()
