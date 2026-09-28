"""Check that wait poses participate in cross-state scale screening."""
import hashlib
import importlib.util
import tempfile
import unittest
from pathlib import Path

from PIL import Image


SCRIPT = Path(__file__).with_name("scale_consistency_check.py")
spec = importlib.util.spec_from_file_location("scale_consistency_check", SCRIPT)
scale = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scale)
measure_spec = importlib.util.spec_from_file_location("measure_frames", SCRIPT.with_name("measure_frames.py"))
measure = importlib.util.module_from_spec(measure_spec)
measure_spec.loader.exec_module(measure)


class QueueScaleTest(unittest.TestCase):
    def test_wait_variant_bbox_drift_is_reported(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            measurements = []
            variants = {}
            for variant, height in (("normal", 20), ("stock_pending", 26)):
                name = f"{variant}.png"
                path = root / name
                im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
                for x in range(20):
                    for y in range(height):
                        im.putpixel((x, y), (20, 20, 20, 255))
                im.save(path)
                variants[variant] = [{"file": name, "index": 0}]
                measurements.append({"file": name, "has_alpha": True,
                                     "status": "PIXELS_MEASURED_ANCHORS_PENDING",
                                     "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                                     "alpha_bbox": [0, 0, 20, height]})
            manifest = {"characters": {"be_ti": {"states": {
                "QUEUE_WAIT": {"frame_count_per_variant": 1, "frames_by_variant": variants}
            }}}}
            result = scale.check(manifest, measurements, "be_ti", root / "manifest.json")
            self.assertEqual(result["status"], "ISSUES_FOUND")
            self.assertTrue(any(issue["type"] == "cross_state_height" for issue in result["issues"]))

    def test_low_alpha_noise_does_not_masquerade_as_body_drift(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            rows = []
            frames = []
            for index, noisy in enumerate((False, True)):
                name = f"frame_{index}.png"
                path = root / name
                im = Image.new("RGBA", (100, 100), (0, 0, 0, 0))
                for x in range(30, 50):
                    for y in range(30, 70):
                        im.putpixel((x, y), (20, 20, 20, 255))
                if noisy:
                    im.putpixel((0, 0), (20, 20, 20, 2))
                im.save(path)
                frames.append({"file": name, "index": index})
                row = measure.measure(path)
                row["file"] = name
                rows.append(row)
            manifest = {"characters": {"be_ti": {"states": {
                "QUEUE_WAIT": {"frame_count_per_variant": 2,
                               "frames_by_variant": {"normal": frames}}
            }}}}
            result = scale.check(manifest, rows, "be_ti", root / "manifest.json")
            self.assertEqual(result["status"], "NO_DRIFT_DETECTED")
            self.assertEqual(len(result["warnings"]), 1)


if __name__ == "__main__":
    unittest.main()
