"""Loopback Office Hub: static files plus evidence-backed Director actions.

No credentials are persisted. Agentapi credentials must be inherited from the
owner-authorized session environment. This replaces http.server on the same port.
"""
from __future__ import annotations
import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import sqlite3
import subprocess
import threading
import time
from urllib.parse import urlsplit
import uuid


def utc():
    return datetime.now(timezone.utc).isoformat()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + '.tmp')
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(path)


class WorkflowError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


class Office:
    PRODUCT_FILES = ['docs/office_hub/app.js', 'docs/office_hub/index.html', 'docs/office_hub/style.css']

    def __init__(self, root, port=8990, workers=True):
        self.root = Path(root).resolve()
        self.hub = self.root / 'docs/office_hub'
        self.datafile = self.hub / 'workflow_state.json'
        self.receipts = self.hub / 'reports/workflow'
        self.lock = threading.RLock()
        self.token = secrets.token_urlsafe(32)
        self.port = port
        self.workers = workers
        self.running = {}
        self.closing = threading.Event()
        self._session_cache = None
        self._session_checked = 0
        self.config = self._config()
        if self.datafile.exists():
            self.state = json.loads(self.datafile.read_text(encoding='utf-8'))
        else:
            self.state = {'schemaVersion': 1, 'revision': 0,
                          'submission': {'id': 'office-hub-current', 'status': 'awaiting_director',
                                         'snapshot': self.snapshot(), 'title': 'Office Hub hiện tại'},
                          'agents': {a: {'status': 'unknown', 'detail': 'Chưa có tác vụ được Office Hub xác minh', 'lastEvent': None} for a in ['Codex', 'Antigravity']},
                          'proposals': [{'id': 'codex-acceptance', 'title': 'Nghiệm thu thao tác và dữ liệu Office Hub',
                                         'reason': 'Kiểm tra desktop, khung hẹp, popup, trạng thái và vòng yêu cầu sửa.',
                                         'author': 'Codex', 'recipient': 'Antigravity', 'status': 'proposed'}],
                          'requests': [], 'events': [], 'calls': []}
            atomic(self.datafile, self.state)
        # Old process IDs/old ACKs never establish that an agent is currently working.
        for a in self.state['agents'].values():
            a.update(status='unknown', detail='Dịch vụ vừa khởi động; đang kiểm tra bằng chứng mới')
        for req in self.state['requests']:
            if req['status'] in ['dispatching', 'reviewing', 'verifying']:
                req['status'] = 'interrupted'
                req['error'] = 'Dịch vụ bị gián đoạn; không tự gọi lại một lệnh đã khởi chạy.'
        self._save()

    def _config(self):
        candidate = self.root / 'handoff/direct_link.json'
        direct = json.loads(candidate.read_text(encoding='utf-8')) if candidate.exists() else {}
        codex = shutil.which('codex.exe') or shutil.which('codex')
        if not codex:
            bins = list((Path.home() / 'AppData/Local/OpenAI/Codex/bin').glob('*/codex.exe'))
            codex = str(max(bins, key=lambda p: p.stat().st_mtime)) if bins else None
        node = shutil.which('node')
        cfg = {'agentapi': direct.get('executable'), 'conversation': direct.get('conversation_id'),
               'codex': codex, 'node': node, 'lightModel': 'gpt-6-luna', 'mediumModel': 'gpt-6.1-sol',
               'maxCallsPerHour': 6, 'maxReviewRounds': 3, 'timeoutSeconds': 1200,
               'antigravityMetadataDb': str(Path.home() / '.gemini/antigravity/conversation_summaries.db')}
        file = self.hub / 'workflow_config.json'
        if file.exists():
            cfg.update(json.loads(file.read_text(encoding='utf-8')))
        return cfg

    def snapshot(self):
        hashes = {p: digest((self.root / p).read_bytes()) for p in self.PRODUCT_FILES if (self.root / p).is_file()}
        return digest(json.dumps(hashes, sort_keys=True).encode())

    def _save(self):
        atomic(self.datafile, self.state)

    def event(self, kind, message, **fields):
        row = {'time': utc(), 'type': kind, 'message': message, **fields}
        self.receipts.mkdir(parents=True, exist_ok=True)
        # Append-only physical evidence is written before the materialized state changes.
        with (self.receipts / 'events.jsonl').open('a', encoding='utf-8') as out:
            out.write(json.dumps(row, ensure_ascii=False) + '\n')
        self.state['events'].append(row)
        self.state['events'] = self.state['events'][-150:]
        self.state['revision'] += 1
        self._save()
        return row

    def agent(self, name, status, detail, request=None):
        self.state['agents'][name] = {'status': status, 'detail': detail, 'lastEvent': utc(), 'requestId': request}

    def receipt_path(self, request_id):
        return self.receipts / request_id

    def _proposal_import(self):
        file = self.hub / 'proposals_antigravity.json'
        if not file.exists():
            return
        try:
            items = json.loads(file.read_text(encoding='utf-8'))
            if not isinstance(items, list):
                return
            for p in items[:5]:
                if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', p.get('id', '')) or not p.get('title'):
                    continue
                if any(x['id'] == p['id'] for x in self.state['proposals']):
                    continue
                self.state['proposals'].append({'id': p['id'], 'title': str(p['title'])[:200],
                    'reason': str(p.get('reason', ''))[:600], 'author': 'Antigravity',
                    'recipient': 'Antigravity', 'status': 'proposed'})
                self.event('proposal', 'Antigravity đề xuất: ' + str(p['title'])[:200])
        except (OSError, ValueError):
            pass

    def view(self):
        with self.lock:
            self._proposal_import()
            # Actor-provided working evidence expires; no fake eternal breathing animation.
            for a in self.state['agents'].values():
                if a['status'] == 'working' and a.get('lastEvent'):
                    age = (datetime.now(timezone.utc) - datetime.fromisoformat(a['lastEvent'])).total_seconds()
                    if age > 120:
                        a.update(status='unknown', detail='Chưa có heartbeat mới; không khẳng định agent đang chạy')
            data = json.loads(json.dumps(self.state))
            runtime = self.session_runtime()
            if runtime:
                active = runtime['status'].endswith('_RUNNING')
                idle = runtime['status'].endswith(('_IDLE', '_DONE', '_COMPLETED'))
                if active or idle:
                    data['agents']['Antigravity'].update(status='working' if active else 'idle',
                        detail='Phiên Antigravity đang chạy (trạng thái từ ứng dụng)' if active else 'Phiên Antigravity hiện không chạy; xem kết quả bàn giao riêng',
                        lastEvent=runtime['updatedAt'], runtimeSource='Antigravity session', runtime=runtime)
            for rid, proc in self.running.items():
                if proc.poll() is None:
                    data['agents']['Codex'].update(status='working', detail='Tiến trình kiểm chứng/review PID ' + str(proc.pid), lastEvent=utc(), requestId=rid)
            data.update(csrfToken=self.token, backend={'online': True, 'pid': os.getpid(),
                       'paused': (self.root / 'STOP').exists() or (self.root / 'handoff/STOP').exists(),
                       'activityScope': 'Tác vụ do Office Hub giao; ACK cũ không phải trạng thái hoạt động hiện tại'})
            return data

    def session_runtime(self):
        """Read only the linked conversation's status, never other conversations or message content."""
        if time.monotonic() - self._session_checked < 2:
            return self._session_cache
        self._session_checked = time.monotonic()
        self._session_cache = None
        db = Path(self.config.get('antigravityMetadataDb', ''))
        if not self.config.get('conversation') or not db.is_file():
            return None
        try:
            with closing(sqlite3.connect(db.as_uri() + '?mode=ro', uri=True, timeout=1)) as con:
                row = con.execute('SELECT status,step_count,last_modified_time FROM conversation_summaries WHERE conversation_id=?',
                                  (self.config['conversation'],)).fetchone()
            if not row:
                return None
            changed = datetime.fromisoformat(row[2].replace('Z', '+00:00'))
            if not changed.tzinfo:
                return None
            age = (datetime.now(timezone.utc) - changed).total_seconds()
            if not -5 <= age <= 120:
                return None
            runtime = {'status': row[0], 'steps': row[1], 'updatedAt': changed.isoformat(),
                       'observedAt': utc(), 'conversationId': self.config['conversation']}
            atomic(self.receipts / 'ANTIGRAVITY_RUNTIME.json', runtime)
            self._session_cache = runtime
            return runtime
        except (ValueError, OSError, sqlite3.Error):
            return None

    def decision(self, body):
        with self.lock:
            actor = 'Director'
            authority = None
            if body.get('actingAs') == 'CodexDelegated':
                charter = self.hub / 'reports/DELEGATED_DIRECTOR.md'
                if not charter.is_file():
                    raise WorkflowError('Chưa có biên bản ủy quyền trong repo.', 403)
                actor = 'Codex'
                authority = {'role': 'Assistant Director', 'delegatedBy': 'Project Owner',
                             'receipt': 'docs/office_hub/reports/DELEGATED_DIRECTOR.md',
                             'sha256': digest(charter.read_bytes())}
            elif body.get('actingAs') not in [None, 'Director']:
                raise WorkflowError('Vai trò quyết định không hợp lệ')
            if body.get('expectedRevision') != self.state['revision']:
                raise WorkflowError('Dữ liệu đã đổi. Tải lại trước khi duyệt.', 409)
            action = body.get('action')
            if action not in ['approve', 'request_changes', 'approve_proposal', 'retry_review', 'return_for_revision']:
                raise WorkflowError('Hành động không hợp lệ')
            if body.get('recipient', 'Antigravity') not in ['Antigravity', 'Both']:
                raise WorkflowError('Luồng này giao UI cho Antigravity, sau đó Codex review; không hỗ trợ route khác.')
            if (self.root / 'STOP').exists() or (self.root / 'handoff/STOP').exists():
                raise WorkflowError('STOP đang bật; không nhận giao việc mới.', 423)
            if action not in ['approve_proposal', 'retry_review'] and body.get('submissionId') != self.state['submission']['id']:
                raise WorkflowError('Không đúng bản bàn giao', 409)
            active = [r for r in self.state['requests'] if r['status'] in ['queued', 'dispatching', 'delivered', 'received', 'working', 'verifying', 'reviewing', 'review_waiting']]
            if active:
                raise WorkflowError('Đang có yêu cầu chưa kết thúc; tránh giao việc trùng.', 409)
            if action == 'return_for_revision':
                req = next((r for r in self.state['requests'] if r['id'] == body.get('requestId')), None)
                feedback = str(body.get('feedback', '')).strip()
                if not req or req['status'] != 'ready_for_director':
                    raise WorkflowError('Không có bản đã kiểm chứng đang chờ nghiệm thu.', 409)
                if not feedback or len(feedback) > 6000:
                    raise WorkflowError('Cần góp ý cụ thể, tối đa 6000 ký tự.')
                if req.get('reviewRound', 0) >= self.config['maxReviewRounds']:
                    self.block(req, 'Nghiệm thu cuối chưa đạt: ' + feedback)
                    raise WorkflowError('Đã đủ ba vòng; giữ Blocked thay vì mở vòng bốn.', 409)
                receipt = {'time': utc(), 'actor': actor, 'authority': authority,
                           'action': action, 'requestId': req['id'], 'feedback': feedback,
                           'snapshot': self.snapshot(), 'reviewRound': req['reviewRound']}
                atomic(self.receipt_path(req['id']) / ('RETURN-' + str(uuid.uuid4()) + '.json'), receipt)
                for name in ['ACK.json', 'STARTED.json', 'HEARTBEAT.json', 'RESULT.json']:
                    file = self.receipt_path(req['id']) / name
                    if file.exists():
                        file.rename(file.with_name('RETURN-' + str(uuid.uuid4()) + '-' + name))
                req.update(status='queued', nonce=secrets.token_hex(16), reviewFeedback=feedback, seen=[])
                self.state['submission']['status'] = 'changes_requested'
                self.agent('Antigravity', 'queued', 'Nghiệm thu yêu cầu sửa; giữ nguyên số vòng review', req['id'])
                self.event('acceptance_returned', 'Bản qua kiểm chứng được trả sửa sau nghiệm thu trực tiếp.',
                           requestId=req['id'], actor=actor, authority=authority)
                return {'state': self.view(), 'decisionId': req['id']}
            if action == 'retry_review':
                req = next((r for r in self.state['requests'] if r['id'] == body.get('requestId')), None)
                if not req or req['status'] not in ['blocked', 'interrupted'] or not req.get('result'):
                    raise WorkflowError('Không có kết quả bị chặn để kiểm chứng lại.', 409)
                if req.get('reviewRound', 0) >= self.config['maxReviewRounds']:
                    raise WorkflowError('Đã chạm giới hạn review; cần quyết định mới của Giám đốc.', 409)
                current = self.snapshot()
                previous = req.get('resultSnapshot')
                receipt = {'time': utc(), 'actor': actor, 'authority': authority, 'action': action, 'requestId': req['id'],
                           'previousSnapshot': previous, 'snapshot': current,
                           'reason': 'Explicit retry; retest current files, never reuse PASS from another snapshot'}
                atomic(self.receipt_path(req['id']) / ('RETRY-' + str(uuid.uuid4()) + '.json'), receipt)
                # Rebind only through an explicit retry receipt. The original agent RESULT is retained as historical context.
                req['previousResultSnapshot'] = previous
                req['resultSnapshot'] = current
                verified = []
                for old in req.get('verifiedEvidence', []):
                    file = (self.root / old['path']).resolve()
                    if not file.is_relative_to(self.root) or not file.is_file():
                        raise WorkflowError('Bằng chứng cũ không còn tồn tại; cần agent nộp lại.', 409)
                    verified.append({'path': old['path'], 'sha256': digest(file.read_bytes())})
                req['verifiedEvidence'] = verified
                req['status'] = 'review_waiting'
                req.pop('error', None)
                self.state['submission']['status'] = 'in_progress'
                self.agent('Codex', 'queued', 'Chờ kiểm chứng lại bản hiện tại; không bắt Antigravity làm lại', req['id'])
                self.event('review_retry', 'Đã yêu cầu kiểm chứng lại bản hiện tại; chưa có verdict mới.', requestId=req['id'])
                return {'state': self.view(), 'decisionId': req['id']}
            if action == 'approve' and self.state['submission']['status'] == 'approved':
                raise WorkflowError('Bản này đã được duyệt.', 409)
            if action == 'approve' and self.state['submission']['status'] != 'awaiting_director':
                raise WorkflowError('Bản này chưa đủ điều kiện chờ Giám đốc duyệt.', 409)
            feedback = str(body.get('feedback', '')).strip()
            if len(feedback) > 6000:
                raise WorkflowError('Góp ý quá dài')
            if action == 'request_changes' and not feedback:
                raise WorkflowError('Hãy ghi điều cần chỉnh sửa trước khi gửi.')
            proposal = None
            if action == 'approve_proposal':
                proposal = next((p for p in self.state['proposals'] if p['id'] == body.get('proposalId')), None)
                if not proposal or proposal['status'] != 'proposed':
                    raise WorkflowError('Đề xuất không còn chờ duyệt.', 409)
                feedback = proposal['title'] + '\n' + proposal['reason']
            if action == 'approve':
                current = self.snapshot()
                if current != self.state['submission']['snapshot']:
                    self.state['submission'].update(status='blocked', changedSnapshot=current)
                    self.event('stale_submission', 'Mã đã thay đổi sau bản bàn giao; cần kiểm chứng lại trước khi duyệt.')
                    raise WorkflowError('Mã đã đổi; cần kiểm chứng bản mới trước khi duyệt.', 409)
            rid = str(uuid.uuid4())
            evidence = {'id': rid, 'time': utc(), 'actor': actor, 'authority': authority, 'action': action,
                        'submission': self.state['submission']['id'], 'snapshot': self.snapshot(),
                        'feedback': feedback, 'proposalId': body.get('proposalId')}
            atomic(self.receipt_path(rid) / 'DIRECTOR_DECISION.json', evidence)
            if action == 'approve':
                self.state['submission'].update(status='approved', approvedAt=evidence['time'], approvalReceipt=rid)
                label = 'Codex duyệt theo ủy quyền' if authority else 'Giám đốc đã duyệt'
                self.event('approved', label + ' bản hiện tại. Chưa tự mở Sprint mới.', requestId=rid,
                           actor=actor, authority=authority)
            else:
                if proposal:
                    proposal['status'] = 'approved'
                self.state['submission']['status'] = 'changes_requested' if action == 'request_changes' else 'in_progress'
                req = {'id': rid, 'nonce': secrets.token_hex(16), 'kind': action, 'feedback': feedback,
                       'recipient': 'Antigravity', 'status': 'queued', 'createdAt': utc(), 'reviewRound': 0,
                       'baseSnapshot': self.snapshot(), 'proposalId': body.get('proposalId')}
                self.state['requests'].append(req)
                self.agent('Antigravity', 'queued', 'Đã lưu yêu cầu; chưa coi là agent đang làm', rid)
                self.event('queued', 'Yêu cầu đã được lưu, chờ gửi trực tiếp Antigravity.', requestId=rid)
            return {'state': self.view(), 'decisionId': rid}

    def _reserve_call(self, req, role):
        now = datetime.now(timezone.utc)
        recent = [c for c in self.state['calls'] if 0 <= (now - datetime.fromisoformat(c['time'])).total_seconds() < 3600]
        if len(recent) >= self.config['maxCallsPerHour']:
            return False
        row = {'time': utc(), 'requestId': req['id'], 'role': role}
        self.state['calls'].append(row)
        self.event('call_started', role + ': bắt đầu lời gọi', requestId=req['id'])
        return True

    def _prompt(self, req):
        directory = self.receipt_path(req['id'])
        return f'''Owner-approved Office Hub request. Work only in {self.root}. Read AGENTS.md. Preserve other unfinished work.
Request: {req['feedback']}
Request ID: {req['id']}; nonce: {req['nonce']}; review round {req['reviewRound']}/3. Check root STOP before each action; stop if present.
First write {directory / 'ACK.json'} with JSON {{"requestId":"{req['id']}","nonce":"{req['nonce']}","actor":"Antigravity","status":"received","at":"current ISO UTC"}}.
Then write STARTED.json with same identifiers, status working, actual current UTC at; update HEARTBEAT.json only while actually working.
Edit only Office Hub UI files and relevant reports/evidence. Do not change workflow_server.py, workflow_state.json, config, game engine, tests, Git branch, or tasks.json.
When complete write RESULT.json with same identifiers plus status ready_for_review, summary, and evidence:[relative paths of actual changed product files or screenshots/reports]. Do not claim tests not run. No secrets.
Codex supervisor will run real game tests and call a read-only Codex reviewer. No self-approval or automatic new tasks. Stop after RESULT.
Feedback from previous review: {req.get('reviewFeedback', '')}'''

    def dispatch(self, req):
        with self.lock:
            if not self._reserve_call(req, 'Antigravity'):
                return
            req['status'] = 'dispatching'
            self.agent('Antigravity', 'queued', 'Đang gửi tin; chưa xác nhận đang làm', req['id'])
            self._save()
        try:
            if not self.config.get('agentapi') or not self.config.get('conversation'):
                raise ValueError('Chưa cấu hình agentapi/conversation')
            if not os.environ.get('ANTIGRAVITY_CSRF_TOKEN') or not re.fullmatch(r'127\.0\.0\.1:\d+', os.environ.get('ANTIGRAVITY_LS_ADDRESS', '')):
                raise ValueError('Thiếu phiên xác thực local; token không được lưu trên đĩa')
            result = subprocess.run([self.config['agentapi'], 'agentapi', 'send-message', '--title=Office-Hub-Director',
                self.config['conversation'], self._prompt(req)], cwd=self.root, capture_output=True, text=True,
                encoding='utf-8', timeout=30, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            text = result.stdout or result.stderr
            text = text.replace(os.environ.get('ANTIGRAVITY_CSRF_TOKEN', 'NONEXISTENT-SECRET'), '[REDACTED]')
            response = json.loads(text) if result.returncode == 0 else {}
            delivered = response.get('response', {}).get('sendMessage', {}).get('recipientId') == self.config['conversation']
            if not delivered:
                raise ValueError('CLI chưa xác nhận gửi thành công: ' + text[:300])
            with self.lock:
                atomic(self.receipt_path(req['id']) / 'DELIVERY.json', {'time': utc(), 'nonce': req['nonce'], 'delivered': True})
                req['status'] = 'delivered'
                self.agent('Antigravity', 'delivered', 'Đã gửi trực tiếp; đang chờ ACK của agent', req['id'])
                self.event('delivered', 'Antigravity đã được gửi yêu cầu; đang chờ ACK.', requestId=req['id'])
        except Exception as e:
            self.block(req, 'Không gửi được: ' + str(e)[:500])

    def block(self, req, message, actor='Antigravity'):
        with self.lock:
            atomic(self.receipt_path(req['id']) / 'BLOCKED.json', {'time': utc(), 'reason': message})
            req['status'] = 'blocked'
            req['error'] = message
            req['errorActor'] = actor
            self.state['submission']['status'] = 'blocked'
            self.agent(actor, 'blocked', message, req['id'])
            self.event('blocked', message, requestId=req['id'])

    def _read_actor(self, req, name):
        file = self.receipt_path(req['id']) / name
        if not file.exists():
            return None
        try:
            x = json.loads(file.read_text(encoding='utf-8'))
            if x.get('requestId') != req['id'] or x.get('nonce') != req['nonce'] or x.get('actor') != 'Antigravity':
                raise ValueError('ACK/RESULT không khớp request, nonce hoặc actor')
            return x
        except Exception as e:
            self.block(req, str(e))
            return None

    def reconcile(self, req):
        with self.lock:
            for name, state in [('ACK.json', 'received'), ('STARTED.json', 'working')]:
                if name in req.get('seen', []):
                    continue
                x = self._read_actor(req, name)
                if req['status'] == 'blocked':
                    return
                if x:
                    if name == 'STARTED.json' and 'ACK.json' not in req.get('seen', []):
                        continue
                    req.setdefault('seen', []).append(name)
                    req['status'] = state
                    self.agent('Antigravity', state, 'Đã nhận yêu cầu' if state == 'received' else 'Agent báo bắt đầu; chờ heartbeat/kết quả', req['id'])
                    try:
                        dt = datetime.fromisoformat(x.get('at', '').replace('Z', '+00:00'))
                        if dt.tzinfo and dt <= datetime.now(timezone.utc):
                            self.state['agents']['Antigravity']['lastEvent'] = dt.isoformat()
                        else:
                            raise ValueError('Invalid actor time')
                    except ValueError:
                        self.state['agents']['Antigravity'].update(status='unknown', detail='ACK có thời gian không hợp lệ; chưa xác minh đang làm')
                    self.event(state, 'Antigravity: ' + state, requestId=req['id'])
            heartbeat = self._read_actor(req, 'HEARTBEAT.json')
            if heartbeat and heartbeat.get('at') != req.get('heartbeatAt'):
                try:
                    dt = datetime.fromisoformat(heartbeat['at'].replace('Z', '+00:00'))
                    age = (datetime.now(timezone.utc) - dt).total_seconds()
                    if 0 <= age <= 120:
                        req['heartbeatAt'] = heartbeat['at']
                        self.agent('Antigravity', 'working', 'Heartbeat tác vụ đã xác minh', req['id'])
                        self._save()
                except (KeyError, ValueError, TypeError):
                    pass
            result = self._read_actor(req, 'RESULT.json')
            if not result or req['status'] == 'blocked':
                return
            if not all(f in req.get('seen', []) for f in ['ACK.json', 'STARTED.json']):
                self.block(req, 'RESULT thiếu ACK/STARTED đúng nonce')
                return
            evidence = result.get('evidence')
            if result.get('status') != 'ready_for_review' or not isinstance(evidence, list) or not evidence:
                self.block(req, 'RESULT thiếu bằng chứng hoặc chưa sẵn sàng duyệt')
                return
            verified = []
            for rel in evidence:
                if not isinstance(rel, str):
                    self.block(req, 'Đường dẫn bằng chứng không hợp lệ')
                    return
                file = (self.root / rel).resolve()
                if not file.is_relative_to(self.root) or not file.is_file() or file.is_relative_to(self.receipt_path(req['id'])):
                    self.block(req, 'Bằng chứng không tồn tại hoặc ngoài workspace')
                    return
                verified.append({'path': rel, 'sha256': digest(file.read_bytes())})
            req.update(status='verifying', result=result, resultSnapshot=self.snapshot(), verifiedEvidence=verified)
            self.agent('Antigravity', 'awaiting_review', 'Đã giao kết quả; Codex sẽ chạy kiểm chứng', req['id'])
            self.event('result', 'Nhận RESULT có bằng chứng; chưa tự đánh PASS.', requestId=req['id'])
        if self.workers:
            threading.Thread(target=self.verify_and_review, args=(req,), daemon=True).start()

    def run_child(self, req, command, args, phase, input_text=None):
        env = os.environ.copy()
        for k in ['ANTIGRAVITY_CSRF_TOKEN', 'ANTIGRAVITY_LS_ADDRESS']:
            env.pop(k, None)
        output = self.receipt_path(req['id']) / (phase + '.log')
        for previous in [output, self.receipt_path(req['id']) / (phase + '-receipt.json')]:
            if previous.exists():
                previous.rename(previous.with_name('ARCHIVED-' + str(uuid.uuid4()) + '-' + previous.name))
        with output.open('w', encoding='utf-8') as log:
            proc = subprocess.Popen([command, *args], cwd=self.root, env=env, stdin=subprocess.PIPE if input_text else subprocess.DEVNULL,
                stdout=log, stderr=log, text=True, encoding='utf-8', creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
            with self.lock:
                self.running[req['id']] = proc
                self.agent('Codex', 'verifying' if phase == 'tests' else 'working', phase + ': tiến trình PID ' + str(proc.pid), req['id'])
                self.event('process_started', phase + ': tiến trình thật đã chạy', requestId=req['id'], pid=proc.pid)
            try:
                proc.communicate(input=input_text, timeout=self.config['timeoutSeconds'])
            except subprocess.TimeoutExpired:
                if os.name == 'nt':
                    subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], capture_output=True)
                else:
                    proc.kill()
                proc.wait(timeout=10)
                raise ValueError('Tiến trình hết thời gian')
            finally:
                with self.lock:
                    self.running.pop(req['id'], None)
        atomic(self.receipt_path(req['id']) / (phase + '-receipt.json'), {'time': utc(), 'exitCode': proc.returncode,
            'output_sha256': digest(output.read_bytes()), 'snapshot': self.snapshot()})
        with self.lock:
            self.agent('Codex', 'idle', phase + ' đã kết thúc, exit ' + str(proc.returncode) + '; đang đối soát kết quả', req['id'])
            self.event('process_finished', phase + ': tiến trình đã kết thúc', requestId=req['id'], exitCode=proc.returncode)
        return proc.returncode

    def verify_and_review(self, req):
        try:
            runner = self.root / 'handoff/run-game-tests.mjs'
            if not self.config.get('node') or not runner.is_file():
                raise ValueError('Chưa có Node hoặc trusted game test runner')
            code = self.run_child(req, self.config['node'], [str(runner)], 'tests')
            if code != 0:
                raise ValueError('Bộ test thật thất bại; xem test receipt. Không tự duyệt.')
            if self.snapshot() != req['resultSnapshot']:
                raise ValueError('Mã đã đổi trong lúc chạy test; bằng chứng đã cũ')
            with self.lock:
                if not self._reserve_call(req, 'Codex review'):
                    req['status'] = 'review_waiting'
                    self.agent('Codex', 'queued', 'Chờ hạn mức gọi model; test đã qua', req['id'])
                    self._save()
                    return
                if not self.config.get('codex'):
                    raise ValueError('Không tìm thấy codex exec')
                round_number = req['reviewRound'] + 1
                req['status'] = 'reviewing'
                self._save()
            out = self.receipt_path(req['id']) / 'CODEX_REVIEW.json'
            if out.exists():
                out.rename(out.with_name('ARCHIVED-' + str(uuid.uuid4()) + '-CODEX_REVIEW.json'))
            prompt = f'''Review the owner request and current Office Hub UI, read-only. Do not send other agents messages.
Request: {req['feedback']}
Antigravity result: {json.dumps(req['result'], ensure_ascii=False)}
Test receipt: {self.receipt_path(req['id']) / 'tests-receipt.json'}
Evidence: {json.dumps(req['verifiedEvidence'])}
Read exact current UI files, verify requested behavior, use actual evidence. Never assume old PASS proves new UI works.
Return ONLY JSON {{"verdict":"PASS" or "FAIL","requestId":"{req['id']}","snapshot":"{req['resultSnapshot']}","findings":["specific finding"]}}.
Original RESULT may be historical; the supervisor has refreshed the evidence hashes for the exact current snapshot. Review current files, not old screenshots as proof of new changes.
This is a headless code reviewer. A browser may be unavailable in your process; lack of a browser alone is NOT a product failure.
Read the supplied current-snapshot browser test artifacts, scripts, interaction logs and screenshots. Evaluate their scope and freshness.
Also read docs/office_hub/reports/CODEX_ACCEPTANCE_FINDINGS.md if present. It contains independent browser observations; apply only findings matching this snapshot.
If essential evidence is missing, report exactly what is missing. Do not list working features as failures. Do not fabricate an interaction test.
This is review {round_number}/{self.config['maxReviewRounds']}. No code edits or self-approved next steps.'''
            code = self.run_child(req, self.config['codex'], ['exec', '--sandbox', 'read-only', '--model', self.config['lightModel'],
                '-c', 'model_reasoning_effort="low"', '-C', str(self.root), '--output-last-message', str(out), '-'], 'codex-review', prompt)
            review = json.loads(out.read_text(encoding='utf-8')) if out.exists() and code == 0 else {}
            if code != 0:
                log = (self.receipt_path(req['id']) / 'codex-review.log').read_text(encoding='utf-8', errors='replace').lower()
                if 'usage limit' in log or 'rate limit' in log:
                    raise ValueError('Codex hết hạn mức tại lần gọi này; chưa có verdict. Dùng kiểm chứng lại sau khi hạn mức phục hồi.')
                raise ValueError('Codex CLI không hoàn tất, exit code ' + str(code) + '; xem log review trước khi thử lại.')
            if review.get('requestId') != req['id'] or review.get('snapshot') != req['resultSnapshot'] or review.get('verdict') not in ['PASS', 'FAIL']:
                raise ValueError('Review không hợp lệ hoặc sai snapshot')
            if self.snapshot() != req['resultSnapshot']:
                raise ValueError('Mã thay đổi sau khi duyệt; cần kiểm chứng lại')
            with self.lock:
                req['reviewRound'] = round_number
                if review['verdict'] == 'PASS':
                    req['status'] = 'ready_for_director'
                    self.state['submission'].update(status='awaiting_director', snapshot=self.snapshot(), requestId=req['id'])
                    self.agent('Codex', 'awaiting_director', 'Kiểm chứng và review đã qua; chờ Giám đốc', req['id'])
                    self.event('ready_for_director', 'Codex review PASS; chờ Giám đốc, chưa tự Approve.', requestId=req['id'])
                elif req['reviewRound'] >= self.config['maxReviewRounds']:
                    self.block(req, 'Review vòng cuối chưa đạt: ' + '; '.join(review.get('findings', [])))
                else:
                    req.update(status='queued', nonce=secrets.token_hex(16), reviewFeedback='; '.join(review.get('findings', [])), seen=[])
                    self.agent('Codex', 'idle', 'Đã gửi feedback; chờ Antigravity nộp lại', req['id'])
                    for name in ['ACK.json', 'STARTED.json', 'HEARTBEAT.json', 'RESULT.json']:
                        file = self.receipt_path(req['id']) / name
                        if file.exists():
                            file.rename(file.with_name(str(req['reviewRound']) + '-' + name))
                    self.event('revision_requested', 'Codex yêu cầu Antigravity sửa; có feedback trong review.', requestId=req['id'])
        except Exception as e:
            self.block(req, str(e)[:600], actor='Codex')

    def tick(self):
        if (self.root / 'STOP').exists() or (self.root / 'handoff/STOP').exists():
            for proc in list(self.running.values()):
                if proc.poll() is None:
                    if os.name == 'nt':
                        subprocess.run(['taskkill', '/PID', str(proc.pid), '/T', '/F'], capture_output=True)
                    else:
                        proc.terminate()
            return
        with self.lock:
            items = list(self.state['requests'])
        for req in items:
            if req['status'] == 'queued':
                self.dispatch(req)
            elif req['status'] in ['delivered', 'received', 'working']:
                self.reconcile(req)
            elif req['status'] == 'review_waiting' and self.workers:
                with self.lock:
                    recent = [c for c in self.state['calls'] if (datetime.now(timezone.utc)-datetime.fromisoformat(c['time'])).total_seconds() < 3600]
                    if len(recent) < self.config['maxCallsPerHour']:
                        req['status'] = 'verifying'
                        threading.Thread(target=self.verify_and_review, args=(req,), daemon=True).start()

    def loop(self):
        while not self.closing.wait(2):
            try:
                self.tick()
            except Exception as e:
                with self.lock:
                    self.event('service_error', str(e)[:300])


def handler_for(office):
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **kw):
            super().__init__(*a, directory=str(office.root), **kw)

        def _json(self, data, status=200):
            raw = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)

        def _host(self):
            return self.headers.get('Host') in [f'127.0.0.1:{office.port}', f'localhost:{office.port}']

        def do_GET(self):
            if not self._host():
                self._json({'error': 'Host not allowed'}, 403)
                return
            if urlsplit(self.path).path == '/api/office/state':
                self._json(office.view())
            elif self.path.startswith('/api/'):
                self._json({'error': 'Not found'}, 404)
            else:
                super().do_GET()

        def do_POST(self):
            try:
                if not self._host() or self.headers.get('Origin') not in [f'http://127.0.0.1:{office.port}', f'http://localhost:{office.port}']:
                    raise WorkflowError('Origin/Host not allowed', 403)
                if not secrets.compare_digest(self.headers.get('X-Office-Token', ''), office.token):
                    raise WorkflowError('Missing or invalid action token', 403)
                if self.headers.get('Content-Type', '').split(';')[0] != 'application/json':
                    raise WorkflowError('JSON required', 415)
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 16000:
                    raise WorkflowError('Invalid payload size', 413)
                body = json.loads(self.rfile.read(length))
                if self.path != '/api/office/decision':
                    raise WorkflowError('Not found', 404)
                self._json(office.decision(body), 200)
            except WorkflowError as e:
                self._json({'error': str(e)}, e.status)
            except (ValueError, TypeError, KeyError):
                self._json({'error': 'Malformed request'}, 400)
    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument('--port', type=int, default=8990)
    parser.add_argument('--no-workers', action='store_true')
    args = parser.parse_args()
    office = Office(args.root, args.port, not args.no_workers)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler_for(office))
    if not args.no_workers:
        threading.Thread(target=office.loop, daemon=True).start()
    print(f'Office Hub workflow server on http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        office.closing.set()
        server.server_close()


if __name__ == '__main__':
    main()
