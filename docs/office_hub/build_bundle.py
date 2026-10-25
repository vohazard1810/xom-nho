"""Rebuild Office Hub data for offline (file://) viewing.

Run from the repo root after editing tasks.json, reports, or evidence:

    python docs/office_hub/build_bundle.py

It scans the evidence folders, rewrites evidence.json, and writes
data.bundle.js. When index.html is served over HTTP, app.js reads the live
files first; data.bundle.js is only a fallback for opening index.html directly
from disk, where browsers block fetch() for local files.
"""
import json
import hashlib
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path

HUB = Path(__file__).resolve().parent
DOCS = HUB.parent
EVIDENCE_DIRS = ["mobile_gate_evidence/operational_handoff"]
REPORTS = {
    "antigravity": "reports/ANTIGRAVITY_UI_REPORT.md",
    "codex": "reports/CODEX_BACKEND_REPORT.md",
}

TOPICS = {
    "quiet_interval_cue": "Chỉ báo vắng khách · giờ chạy nhanh",
    "map_home_owner": "Bản đồ · Bạn đang đứng bán",
    "map_school_managed": "Bản đồ · Quản lý đang tự bán",
    "map_office_closed": "Bản đồ · Nghỉ hôm nay",
    "familiar_badge": "Phiếu đơn · ★ Khách quen",
    "empire_result": "Tổng kết đa quán",
    "day1_kitchen": "Day 1 · Bếp thực tế",
    "day1_result": "Day 1 · Kết quả cuối ca",
    "day1_ledger_expanded": "Day 1 · Sổ tiền mở rộng",
}


def describe(path: Path, rel: str) -> dict:
    stem = path.stem
    viewport = re.search(r"(\d{3})x(\d{3})", stem)
    kind = "fresh" if "_fresh_" in stem else "fixture" if "_controlled_" in stem else "other"
    topic_key = re.sub(r"^shot_(controlled|fresh)_", "", stem)
    topic_key = re.sub(r"_\d{3}x\d{3}$", "", topic_key)
    return {
        "file": rel,
        "title": TOPICS.get(topic_key, topic_key.replace("_", " ")),
        "topic": topic_key,
        "viewport": viewport.group(0) if viewport else None,
        "kind": kind,
    }


def refresh_asset_versions(hub: Path) -> None:
    index = hub / 'index.html'
    original = index.read_text(encoding='utf-8')
    updated = original
    for asset in ['style.css', 'app.js']:
        version = hashlib.sha256((hub / asset).read_bytes()).hexdigest()[:12]
        pattern = re.compile(r'((?:href|src)=)(["\'])' + re.escape(asset) + r'(?:\?[^"\']*)?\2')
        updated, count = pattern.subn(lambda m: f'{m[1]}{m[2]}{asset}?v={version}{m[2]}', updated)
        if count != 1:
            raise ValueError(f'Expected exactly one index reference to {asset}; found {count}')
    if updated != original:
        index.write_text(updated, encoding='utf-8')


def build_latest(hub: Path) -> dict | None:
    candidates = []
    for path in (hub / 'reports').glob('*_ACCEPTANCE.json'):
        record = json.loads(path.read_text(encoding='utf-8'))
        if record.get('verdict') != 'PASS' or not record.get('reports') or not record.get('testReceipt'):
            continue
        # References must remain inside this Office Hub, even for offline bundles.
        refs = list(record['reports'].values()) + [record['testReceipt']]
        if any(not (hub / ref).resolve().is_relative_to(hub.resolve()) for ref in refs):
            continue
        stamp = record.get('at') or record.get('time')
        if stamp:
            candidates.append((datetime.fromisoformat(stamp.replace('Z', '+00:00')), record))
    if not candidates:
        return None
    record = max(candidates, key=lambda item: item[0])[1]
    tests = json.loads((hub / record['testReceipt']).read_text(encoding='utf-8'))
    return {'nonce': record['nonce'], 'at': record.get('at') or record.get('time'),
            'commit': record.get('codeCommit'), 'reviewRound': record.get('reviewRound'),
            'tasks': record.get('tasks', {}), 'reports': record['reports'],
            'tests': {'passed': tests.get('passedFiles'), 'total': tests.get('totalFiles'),
                      'valid': tests.get('exitCode') == 0 and tests.get('sourceUnchanged') is True},
            'markdown': {key: (hub / value).read_text(encoding='utf-8') for key, value in record['reports'].items()}}


def main() -> None:
    evidence = []
    for folder in EVIDENCE_DIRS:
        for png in sorted((DOCS / folder).glob("*.png")):
            evidence.append(describe(png, f"../{folder}/{png.name}"))
    (HUB / "evidence.json").write_text(
        json.dumps({"folders": EVIDENCE_DIRS, "items": evidence}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    bundle = {
        "generatedAt": datetime.now(timezone(timedelta(hours=7))).isoformat(timespec="seconds"),
        "tasks": json.loads((HUB / "tasks.json").read_text(encoding="utf-8")),
        "evidence": {"folders": EVIDENCE_DIRS, "items": evidence},
        "reports": {k: (HUB / v).read_text(encoding="utf-8") for k, v in REPORTS.items()},
    }
    bundle["latest"] = build_latest(HUB)
    (HUB / "latest.json").write_text(json.dumps(bundle["latest"], ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    handoff = DOCS.parent / "handoff"
    bundle["orchestrator"] = {
        key: json.loads((handoff / filename).read_text(encoding="utf-8"))
        if (handoff / filename).exists() else None
        for key, filename in [("queue", "queue.json"), ("dryRun", "dry-run.json")]
    }
    log_file = handoff / "orchestrator.log"
    bundle["orchestrator"]["log"] = "\n".join(log_file.read_text(encoding="utf-8").splitlines()[-25:]) if log_file.exists() else ""
    payload = json.dumps(bundle, ensure_ascii=False, indent=1).replace("</", "<\\/")
    (HUB / "data.bundle.js").write_text(
        "// Generated by build_bundle.py — do not edit by hand.\n"
        f"window.OFFICE_HUB_BUNDLE = {payload};\n",
        encoding="utf-8",
    )
    refresh_asset_versions(HUB)
    print(f"evidence: {len(evidence)} images, bundle written at {bundle['generatedAt']}")


if __name__ == "__main__":
    main()
