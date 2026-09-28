"""Regression tests for stationary-frame coverage; synthetic coordinates are not art QC."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools/animation-qc/validate_manifest.py"
SOURCE = ROOT / "tools/animation-harness/manifest.json"


def populated_manifest():
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    states = data["characters"]["be_ti"]["states"]
    for name in ("QUEUE_WAIT", "ORDER", "SPECIAL_REQUEST", "CONFLICT_WAIT",
                 "RECEIVE", "REFUSED", "REACT", "PAY"):
        spec = states[name]
        count = spec.get("frame_count_per_variant", spec.get("frame_count"))
        targets = spec["frames_by_variant"].values() if "frames_by_variant" in spec else [spec["frames"]]
        for target in targets:
            target.extend({"index": i, "status": "MEASURED",
                           "anchors": {"feet": {"x": 30, "y": 100},
                                       "receive_point": {"x": 50, "y": 60}}}
                          for i in range(count))
    data["characters"]["shopkeeper"]["states"]["HANDOFF"]["frames"] = [
        {"index": i, "status": "MEASURED", "anchors": {"hand_right": {"x": 50, "y": 60}}}
        for i in range(4)
    ]
    human = data["validation_tests"]["wait_readability_human"]
    human.update(status="PASS", checked_by="synthetic-test", checked_at="2026-09-28T00:00:00Z")
    human["results"] = {name: True for name in human["results"]}
    return data


def validate(data):
    with tempfile.TemporaryDirectory() as directory:
        source = Path(directory) / "manifest.json"
        source.write_text(json.dumps(data), encoding="utf-8")
        result = subprocess.run([sys.executable, str(SCRIPT), str(source),
                                 "-o", str(Path(directory) / "report.json")],
                                capture_output=True, text=True, check=True)
        return json.loads(result.stdout)


class StationaryCoverageTest(unittest.TestCase):
    def test_complete_synthetic_coverage(self):
        self.assertEqual(validate(populated_manifest())["feet_anchor_consistency"]["status"], "PASS")

    def test_missing_wait_variant_blocks(self):
        data = populated_manifest()
        data["characters"]["be_ti"]["states"]["QUEUE_WAIT"]["frames_by_variant"]["stock_pending"].clear()
        report = validate(data)
        self.assertEqual(report["gate_status"], "BLOCKED")
        self.assertIn("QUEUE_WAIT.stock_pending:no_frames", report["feet_anchor_consistency"]["missing"])

    def test_refused_missing_anchor_blocks(self):
        data = populated_manifest()
        del data["characters"]["be_ti"]["states"]["REFUSED"]["frames"][1]["anchors"]["feet"]
        report = validate(data)
        self.assertEqual(report["feet_anchor_consistency"]["status"], "BLOCKED")
        self.assertIn("REFUSED:1:feet", report["feet_anchor_consistency"]["missing"])

    def test_partial_state_blocks_even_with_valid_anchors(self):
        data = populated_manifest()
        data["characters"]["be_ti"]["states"]["ORDER"]["frames"].pop()
        report = validate(data)
        self.assertIn("ORDER:expected_4_found_3", report["feet_anchor_consistency"]["missing"])

    def test_nonfinite_and_boolean_anchors_block(self):
        data = populated_manifest()
        data["characters"]["be_ti"]["states"]["PAY"]["frames"][0]["anchors"]["feet"]["y"] = float("nan")
        self.assertEqual(validate(data)["gate_status"], "BLOCKED")
        data["characters"]["be_ti"]["states"]["PAY"]["frames"][0]["anchors"]["feet"]["y"] = True
        self.assertEqual(validate(data)["gate_status"], "BLOCKED")


if __name__ == "__main__":
    unittest.main()
