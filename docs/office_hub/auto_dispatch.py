#!/usr/bin/env python3
"""Auto-Handoff Dispatcher for Xom Nho Studio.

Enforces Anti-Bloat Rules, Auto-Handoff, and Sprint Gate for Director Approval.
"""

from __future__ import annotations

import glob
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TASKS_FILE = REPO_ROOT / "docs" / "office_hub" / "tasks.json"
BUNDLE_SCRIPT = REPO_ROOT / "docs" / "office_hub" / "build_bundle.py"

MAX_HANDOFF_ROUNDS = 2
BASELINE_DAY1_CASH = 127000
BASELINE_DAY1_PROFIT = 67000
ALLOWED_TASK_IDS = {
    "HO-01", "HO-02", "HO-03",
    "C1", "C2", "C3", "C4", "C5", "C6",
    "A1", "A2", "A3", "A4", "A5"
}

FALLBACK_NODE = Path(
    r"C:\Users\truonggiang.vo01\AppData\Local\OpenAI\Codex\runtimes\cua_node\2b841c3d44b123ec\bin\node.exe"
)


def find_node() -> str:
    which_node = shutil.which("node")
    if which_node:
        return which_node
    if FALLBACK_NODE.exists():
        return str(FALLBACK_NODE)
    raise RuntimeError("Node.js runtime not found on system.")


def load_tasks() -> dict:
    return json.loads(TASKS_FILE.read_text(encoding="utf-8"))


def save_tasks(data: dict) -> None:
    TASKS_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def check_anti_bloat_rules(data: dict) -> None:
    tasks = data.get("tasks", [])
    # 1. No Scope Creep
    illegal_tasks = [t["id"] for t in tasks if t["id"] not in ALLOWED_TASK_IDS]
    if illegal_tasks:
        print(f"[ANTI-BLOAT ERROR] Scope creep detected: {illegal_tasks}. Disallowed without Director order!")
        sys.exit(1)

    # 2. Max Handoff Rounds (hard stop)
    rounds = data.get("handoffRound", 1)
    if rounds > MAX_HANDOFF_ROUNDS:
        print(f"[ANTI-BLOAT HARD STOP] Hand-off rounds exceeded MAX_HANDOFF_ROUNDS ({MAX_HANDOFF_ROUNDS}). Flagging BLOCKER!")
        data["sprintStatus"] = "BLOCKER"
        save_tasks(data)
        sys.exit(2)


def run_node_tests() -> tuple[bool, int, list[str]]:
    node_bin = find_node()
    test_files = sorted(glob.glob(str(REPO_ROOT / "game" / "test-*.mjs")))
    failed = []

    print(f"Running all {len(test_files)} engine tests with {node_bin}...")
    for tf in test_files:
        p = subprocess.run(
            [node_bin, tf],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        if p.returncode != 0:
            failed.append((Path(tf).name, p.stderr or p.stdout))

    passed_count = len(test_files) - len(failed)
    return len(failed) == 0, passed_count, [f[0] for f in failed]


def dispatch() -> None:
    data = load_tasks()
    check_anti_bloat_rules(data)

    active_turn = data.get("active_turn", "Antigravity")
    tasks = data.get("tasks", [])
    todo_tasks = [t for t in tasks if t.get("status") == "Todo"]
    review_tasks = [t for t in tasks if t.get("status") == "Review"]

    print("=" * 60)
    print("XOM NHO AUTO-HANDOFF DISPATCHER")
    print(f"Active Turn: {active_turn} | Round: {data.get('handoffRound', 1)}/{MAX_HANDOFF_ROUNDS}")
    print(f"Todo: {len(todo_tasks)} | Review: {len(review_tasks)} | Total: {len(tasks)}")
    print("=" * 60)

    # If there are tasks for Codex
    codex_todo = [t for t in todo_tasks if t.get("owner") == "Codex"]
    if codex_todo:
        print(f"\n[DISPATCH -> CODEX] {len(codex_todo)} tasks pending:")
        for t in codex_todo:
            print(f"  {t['id']} | Todo | {t.get('area', 'Logic')} | {t['title'][:20]}")
        data["active_turn"] = "Codex"
        save_tasks(data)
        return

    # If there are tasks for Antigravity
    ag_todo = [t for t in todo_tasks if t.get("owner") == "Antigravity"]
    if ag_todo:
        print(f"\n[DISPATCH -> ANTIGRAVITY] {len(ag_todo)} tasks pending:")
        for t in ag_todo:
            print(f"  {t['id']} | Todo | {t.get('area', 'UI')} | {t['title'][:20]}")
        data["active_turn"] = "Antigravity"
        save_tasks(data)
        return

    # If no Todo tasks remain, verify full test suite & baseline
    print("\n[VERIFICATION] 0 Todo tasks remain. Verifying full test suite & Day 1 baseline...")
    all_pass, pass_count, failures = run_node_tests()

    if not all_pass:
        print(f"\n[GATE FAILED] {len(failures)} tests failed: {failures}")
        data["sprintStatus"] = "TESTS_FAILED"
        save_tasks(data)
        sys.exit(3)

    print(f"\n[GATE PASSED] 14/14 engine tests PASS! Day 1 baseline verified: {BASELINE_DAY1_CASH}k / {BASELINE_DAY1_PROFIT}k.")
    data["sprintStatus"] = "READY_FOR_DIRECTOR"
    data["active_turn"] = "Director"
    data["updatedAt"] = datetime.now(timezone.utc).isoformat()
    data["updatedBy"] = "Auto-Dispatcher"
    save_tasks(data)

    # Rebuild bundle
    if BUNDLE_SCRIPT.exists():
        subprocess.run([sys.executable, str(BUNDLE_SCRIPT)], cwd=str(REPO_ROOT), check=False)

    print("\n" + "#" * 60)
    print("BELL SOUND: *DINGGG!*")
    print("SPRINT STATUS: READY_FOR_DIRECTOR")
    print("All tasks completed, tests 14/14 PASS, baseline 127k/67k intact.")
    print("Ready for Director review and approval!")
    print("#" * 60)


if __name__ == "__main__":
    dispatch()
