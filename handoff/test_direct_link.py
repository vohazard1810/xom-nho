import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("direct_link", Path(__file__).with_name("direct_link.py"))
link = importlib.util.module_from_spec(spec)
spec.loader.exec_module(link)


class DirectLinkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="xom-direct-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "docs/office_hub/reports").mkdir(parents=True)
        self.cfg = {"workspace": str(self.root), "conversation_id": "47b8d4fc-0808-455a-ab31-40cf8e3ca68d",
                    "executable": "fake-agentapi", "dashboard_origin": "http://127.0.0.1:8990", "max_messages_per_hour": 2}

    def test_remote_dashboard_rejected(self):
        p = self.root / "config.json"
        p.write_text(json.dumps({**self.cfg, "dashboard_origin": "https://remote.invalid"}), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "loopback"):
            link.load_config(p)

    def test_secret_redaction_and_no_secret_in_log(self):
        token = "synthetic-test-token-not-a-credential"
        result = subprocess.CompletedProcess([], 0, json.dumps({"echo": token}), "")
        with patch.dict(os.environ, {"ANTIGRAVITY_LS_ADDRESS": "127.0.0.1:1111", "ANTIGRAVITY_CSRF_TOKEN": token}), patch.object(link.subprocess, "run", return_value=result):
            reply = link.invoke(self.cfg, "get-conversation-metadata", self.cfg["conversation_id"])
        self.assertEqual(reply["echo"], "[REDACTED]")
        self.assertNotIn(token, (self.root / "docs/office_hub/direct_link.log").read_text())

    def test_stop_blocks_cli(self):
        (self.root / "STOP").touch()
        with patch.dict(os.environ, {"ANTIGRAVITY_LS_ADDRESS": "127.0.0.1:1111", "ANTIGRAVITY_CSRF_TOKEN": "synthetic"}), patch.object(link.subprocess, "run") as run:
            with self.assertRaisesRegex(ValueError, "STOP"):
                link.invoke(self.cfg, "send-message", "message")
            run.assert_not_called()

    def test_rate_limit_survives_new_read_of_log(self):
        message = self.root / "message.txt"
        message.write_text("Authorized test message", encoding="utf-8")
        response = {"response": {"sendMessage": {"recipientId": self.cfg["conversation_id"]}}}
        with patch.object(link, "invoke", return_value=response) as invoke:
            for _ in range(2):
                self.assertEqual(link.send(self.cfg, message)["event"], "message_delivered")
            with self.assertRaisesRegex(ValueError, "Hourly"):
                link.send(self.cfg, message)
            self.assertEqual(invoke.call_count, 2)

    def test_ack_requires_local_and_live_nonce(self):
        nonce = "OFFICE-TEST-NONCE"
        text = f"Antigravity | ACK | {nonce}\nROUNDTRIP-CONFIRMED {nonce}"
        (self.root / "docs/office_hub/reports/DIRECT_LINK_ACK.md").write_text(text, encoding="utf-8")
        with patch.object(link, "urlopen", return_value=io.BytesIO(text.encode())):
            verified = link.verify(self.cfg, nonce)
            self.assertEqual(verified["event"], "ack_verified")
            self.assertTrue(verified["roundtrip_confirmed"])
        with patch.object(link, "urlopen", return_value=io.BytesIO(b"Antigravity | ACK | stale")):
            with self.assertRaisesRegex(ValueError, "Matching ACK"):
                link.verify(self.cfg, nonce)


if __name__ == "__main__":
    unittest.main()
