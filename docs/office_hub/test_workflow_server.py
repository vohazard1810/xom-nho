import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError

spec = importlib.util.spec_from_file_location('workflow_server', Path(__file__).with_name('workflow_server.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='office-workflow-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'docs/office_hub').mkdir(parents=True)
        (self.root / 'docs/office_hub/app.js').write_text('initial', encoding='utf-8')
        self.office = m.Office(self.root, workers=False)

    def action(self, action, **kw):
        return self.office.decision({'action': action, 'expectedRevision': self.office.state['revision'],
                                    'submissionId': self.office.state['submission']['id'], **kw})

    def request(self):
        self.action('request_changes', feedback='Fix modal X')
        return self.office.state['requests'][-1]

    def actor(self, req, filename, **kw):
        m.atomic(self.office.receipt_path(req['id']) / filename, {'requestId': req['id'], 'nonce': req['nonce'],
                  'actor': 'Antigravity', 'at': m.utc(), **kw})

    def test_approve_records_receipt_but_does_not_launch_next_step(self):
        self.action('approve')
        self.assertEqual(self.office.state['submission']['status'], 'approved')
        self.assertEqual(self.office.state['requests'], [])
        self.assertTrue(list(self.office.receipts.glob('*/DIRECTOR_DECISION.json')))
        with self.assertRaises(m.WorkflowError):
            self.action('approve')

    def test_delegated_decision_requires_charter_and_records_real_actor(self):
        with self.assertRaises(m.WorkflowError):
            self.action('approve', actingAs='CodexDelegated')
        charter = self.office.hub / 'reports/DELEGATED_DIRECTOR.md'
        charter.parent.mkdir(parents=True, exist_ok=True)
        charter.write_text('Owner delegates Office Hub acceptance to Codex', encoding='utf-8')
        self.action('approve', actingAs='CodexDelegated')
        receipt = json.loads(next(self.office.receipts.glob('*/DIRECTOR_DECISION.json')).read_text(encoding='utf-8'))
        self.assertEqual(receipt['actor'], 'Codex')
        self.assertEqual(receipt['authority']['sha256'], m.digest(charter.read_bytes()))
        self.assertEqual(self.office.state['requests'], [])
        self.assertIn('Codex duyệt theo ủy quyền', self.office.state['events'][-1]['message'])

    def test_delegation_does_not_override_blocked_or_stale_submission(self):
        charter = self.office.hub / 'reports/DELEGATED_DIRECTOR.md'
        charter.parent.mkdir(parents=True, exist_ok=True)
        charter.write_text('Owner authorization', encoding='utf-8')
        self.office.state['submission']['status'] = 'blocked'
        with self.assertRaises(m.WorkflowError):
            self.action('approve', actingAs='CodexDelegated')
        self.office.state['submission']['status'] = 'awaiting_director'
        (self.root / 'docs/office_hub/app.js').write_text('new snapshot', encoding='utf-8')
        with self.assertRaises(m.WorkflowError):
            self.action('approve', actingAs='CodexDelegated')

    def test_feedback_required_stale_revision_rejected_and_no_fake_agent_work(self):
        with self.assertRaises(m.WorkflowError):
            self.action('request_changes', feedback='')
        req = self.request()
        self.assertEqual(req['status'], 'queued')
        self.assertEqual(self.office.view()['agents']['Antigravity']['status'], 'queued')
        with self.assertRaises(m.WorkflowError):
            self.office.decision({'action': 'approve', 'expectedRevision': 0, 'submissionId': 'office-hub-current'})

    def test_product_change_invalidates_approval_snapshot(self):
        (self.root / 'docs/office_hub/app.js').write_text('changed', encoding='utf-8')
        with self.assertRaises(m.WorkflowError) as err:
            self.action('approve')
        self.assertEqual(err.exception.status, 409)
        self.assertNotEqual(self.office.state['submission']['status'], 'approved')
        with self.assertRaises(m.WorkflowError):
            self.action('approve')
        self.assertEqual(self.office.state['submission']['status'], 'blocked')

    def test_proposal_not_executed_before_director_approval(self):
        self.assertEqual(self.office.state['requests'], [])
        p = self.office.state['proposals'][0]
        self.action('approve_proposal', proposalId=p['id'])
        self.assertEqual(p['status'], 'approved')
        self.assertEqual(self.office.state['requests'][0]['proposalId'], p['id'])

    def test_wrong_nonce_cannot_start_work_or_submit_result(self):
        req = self.request()
        self.actor(req, 'ACK.json', nonce='wrong')
        self.office.reconcile(req)
        self.assertEqual(req['status'], 'blocked')
        with self.assertRaises(m.WorkflowError):
            self.action('approve')

    def test_valid_receipts_require_existing_evidence_and_not_self_reported_pass(self):
        req = self.request()
        self.actor(req, 'ACK.json', status='received')
        self.actor(req, 'STARTED.json', status='working')
        self.actor(req, 'RESULT.json', status='ready_for_review', summary='fixed', evidence=['docs/office_hub/app.js'])
        self.office.reconcile(req)
        self.assertEqual(req['status'], 'verifying')
        self.assertEqual(self.office.state['submission']['status'], 'changes_requested')
        self.assertTrue(req['verifiedEvidence'][0]['sha256'])

    def test_path_escape_rejected(self):
        req = self.request()
        self.actor(req, 'ACK.json')
        self.actor(req, 'STARTED.json')
        self.actor(req, 'RESULT.json', status='ready_for_review', evidence=['../../outside'])
        self.office.reconcile(req)
        self.assertEqual(req['status'], 'blocked')

    def test_dispatch_uses_real_delivery_response_not_exit_code_alone(self):
        req = self.request()
        self.office.config.update(agentapi='fake', conversation='target')
        output = json.dumps({'response': {'sendMessage': {'recipientId': 'target'}}})
        with patch.dict(os.environ, {'ANTIGRAVITY_CSRF_TOKEN': 'synthetic', 'ANTIGRAVITY_LS_ADDRESS': '127.0.0.1:1000'}), patch.object(m.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, output, '')):
            self.office.dispatch(req)
        self.assertEqual(req['status'], 'delivered')
        self.assertNotEqual(self.office.state['agents']['Antigravity']['status'], 'working')
        self.assertNotIn('synthetic', self.office.datafile.read_text(encoding='utf-8'))

    def test_restart_marks_interrupted_calls_and_never_claims_working(self):
        req = self.request()
        req['status'] = 'reviewing'
        self.office._save()
        restarted = m.Office(self.root, workers=False)
        self.assertEqual(restarted.state['requests'][0]['status'], 'interrupted')
        self.assertEqual(restarted.view()['agents']['Codex']['status'], 'unknown')

    def test_stale_actor_heartbeat_cannot_display_working(self):
        self.office.state['agents']['Antigravity'].update(status='working', lastEvent='2020-01-01T00:00:00+00:00')
        self.assertEqual(self.office.view()['agents']['Antigravity']['status'], 'unknown')

    def prepared_review(self):
        req = self.request()
        req.update(status='verifying', resultSnapshot=self.office.snapshot(), result={'summary': 'done'}, verifiedEvidence=[])
        (self.root / 'handoff').mkdir()
        (self.root / 'handoff/run-game-tests.mjs').write_text('// trusted test fixture', encoding='utf-8')
        self.office.config.update(node='fake-node', codex='fake-codex')
        return req

    def test_supervisor_test_failure_blocks_before_review(self):
        req = self.prepared_review()
        with patch.object(self.office, 'run_child', return_value=1) as run:
            self.office.verify_and_review(req)
        self.assertEqual(req['status'], 'blocked')
        self.assertEqual(run.call_count, 1)

    def test_review_pass_waits_for_director_and_does_not_auto_approve(self):
        req = self.prepared_review()
        def child(request, command, args, phase, input_text=None):
            if phase == 'codex-review':
                m.atomic(self.office.receipt_path(req['id']) / 'CODEX_REVIEW.json', {'verdict': 'PASS', 'requestId': req['id'], 'snapshot': req['resultSnapshot'], 'findings': []})
            return 0
        with patch.object(self.office, 'run_child', side_effect=child):
            self.office.verify_and_review(req)
        self.assertEqual(req['status'], 'ready_for_director')
        self.assertEqual(self.office.state['submission']['status'], 'awaiting_director')

    def test_third_review_failure_blocks_no_fourth_round(self):
        req = self.prepared_review()
        req['reviewRound'] = 2
        def child(request, command, args, phase, input_text=None):
            if phase == 'codex-review':
                m.atomic(self.office.receipt_path(req['id']) / 'CODEX_REVIEW.json', {'verdict': 'FAIL', 'requestId': req['id'], 'snapshot': req['resultSnapshot'], 'findings': ['Still broken']})
            return 0
        with patch.object(self.office, 'run_child', side_effect=child):
            self.office.verify_and_review(req)
        self.assertEqual(req['status'], 'blocked')
        self.assertEqual(req['reviewRound'], 3)

    def test_infrastructure_failure_does_not_consume_review_round(self):
        req = self.prepared_review()
        def child(request, command, args, phase, input_text=None):
            if phase == 'codex-review':
                (self.office.receipt_path(req['id']) / 'codex-review.log').write_text('ERROR usage limit', encoding='utf-8')
                return 1
            return 0
        with patch.object(self.office, 'run_child', side_effect=child):
            self.office.verify_and_review(req)
        self.assertEqual(req['reviewRound'], 0)
        self.assertEqual(req['errorActor'], 'Codex')
        self.assertEqual(self.office.view()['agents']['Codex']['status'], 'blocked')
        self.assertIn('hết hạn mức', req['error'])

    def test_explicit_retry_refreshes_snapshot_without_auto_pass_or_rework(self):
        req = self.prepared_review()
        self.office.block(req, 'CLI failed', actor='Codex')
        old = req['resultSnapshot']
        (self.root / 'docs/office_hub/app.js').write_text('new version', encoding='utf-8')
        self.action('retry_review', requestId=req['id'])
        self.assertEqual(req['status'], 'review_waiting')
        self.assertNotEqual(req['resultSnapshot'], old)
        self.assertEqual(self.office.state['submission']['status'], 'in_progress')
        self.assertEqual(len(self.office.state['requests']), 1)
        self.assertTrue(list(self.office.receipt_path(req['id']).glob('RETRY-*.json')))

    def test_process_end_clears_working_and_preserves_previous_receipt(self):
        req = self.prepared_review()
        directory = self.office.receipt_path(req['id'])
        (directory / 'tests.log').write_text('previous run', encoding='utf-8')
        m.atomic(directory / 'tests-receipt.json', {'exitCode': 7, 'old': True})
        code = self.office.run_child(req, sys.executable, ['-c', 'print("PASS tiny subprocess")'], 'tests')
        self.assertEqual(code, 0)
        self.assertEqual(self.office.state['agents']['Codex']['status'], 'idle')
        self.assertNotIn(req['id'], self.office.running)
        self.assertEqual(len(list(directory.glob('ARCHIVED-*-tests.log'))), 1)
        old = json.loads(next(directory.glob('ARCHIVED-*-tests-receipt.json')).read_text(encoding='utf-8'))
        self.assertEqual(old['exitCode'], 7)

    def test_gui_runtime_uses_only_linked_fresh_metadata_not_old_ack(self):
        db = self.root / 'metadata.db'
        with sqlite3.connect(db) as c:
            c.execute('CREATE TABLE conversation_summaries(conversation_id,status,step_count,last_modified_time)')
            c.execute('INSERT INTO conversation_summaries VALUES(?,?,?,?)', ('linked', 'CASCADE_RUN_STATUS_RUNNING', 12, m.utc()))
            c.execute('INSERT INTO conversation_summaries VALUES(?,?,?,?)', ('other', 'CASCADE_RUN_STATUS_IDLE', 50, m.utc()))
        c.close()
        self.office.config.update(conversation='linked', antigravityMetadataDb=str(db))
        view = self.office.view()
        self.assertEqual(view['agents']['Antigravity']['status'], 'working')
        self.assertEqual(view['agents']['Antigravity']['runtime']['steps'], 12)
        self.assertTrue((self.office.receipts / 'ANTIGRAVITY_RUNTIME.json').exists())
        self.assertEqual(self.office.state['agents']['Antigravity']['status'], 'unknown')

    def test_expired_runtime_cannot_claim_gui_is_working(self):
        db = self.root / 'metadata.db'
        with sqlite3.connect(db) as c:
            c.execute('CREATE TABLE conversation_summaries(conversation_id,status,step_count,last_modified_time)')
            c.execute('INSERT INTO conversation_summaries VALUES(?,?,?,?)', ('linked', 'CASCADE_RUN_STATUS_RUNNING', 12, '2020-01-01T00:00:00+00:00'))
        c.close()
        self.office.config.update(conversation='linked', antigravityMetadataDb=str(db))
        self.assertEqual(self.office.view()['agents']['Antigravity']['status'], 'unknown')

    def test_http_origin_token_and_valid_post(self):
        server = ThreadingHTTPServer(('127.0.0.1', 0), m.handler_for(self.office))
        self.office.port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        origin = f'http://127.0.0.1:{self.office.port}'
        with urlopen(origin + '/api/office/state') as response:
            state = json.load(response)
        body = json.dumps({'action': 'approve', 'expectedRevision': state['revision'], 'submissionId': state['submission']['id']}).encode()
        for headers in [{'Origin': 'https://evil.invalid', 'X-Office-Token': state['csrfToken']}, {'Origin': origin}]:
            with self.assertRaises(HTTPError) as err:
                urlopen(Request(origin + '/api/office/decision', data=body, headers={**headers, 'Content-Type': 'application/json'}))
            self.assertEqual(err.exception.code, 403)
        with urlopen(Request(origin + '/api/office/decision', data=body, headers={'Origin': origin, 'X-Office-Token': state['csrfToken'], 'Content-Type': 'application/json'})) as response:
            self.assertEqual(json.load(response)['state']['submission']['status'], 'approved')


if __name__ == '__main__':
    unittest.main()
