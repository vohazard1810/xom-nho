"""Direct, on-demand liaison with the existing Antigravity conversation.

Credentials come only from the caller's environment. Never persist session tokens.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
from datetime import datetime, timezone
from urllib.request import urlopen


def now():
    return datetime.now(timezone.utc).isoformat()


def load_config(filename):
    cfg = json.loads(Path(filename).read_text(encoding="utf-8"))
    if not re.fullmatch(r"[a-f0-9-]{36}", cfg["conversation_id"]):
        raise ValueError("Invalid conversation ID")
    if not Path(cfg["workspace"]).is_dir():
        raise ValueError("Workspace not found")
    if not re.fullmatch(r"http://127\.0\.0\.1:\d{1,5}", cfg["dashboard_origin"]):
        raise ValueError("Only loopback Dashboard origins are supported")
    return cfg


def record(cfg, event, **fields):
    log = Path(cfg["workspace"]) / "docs/office_hub/direct_link.log"
    row = {"time": now(), "event": event, "conversation_id": cfg["conversation_id"], **fields}
    with log.open("a", encoding="utf-8") as out:
        out.write(json.dumps(row, ensure_ascii=False) + "\n")
    return row


def invoke(cfg, command, *args):
    address = os.environ.get("ANTIGRAVITY_LS_ADDRESS", "")
    token = os.environ.get("ANTIGRAVITY_CSRF_TOKEN", "")
    if not re.fullmatch(r"127\.0\.0\.1:\d{1,5}", address) or not token:
        raise ValueError("Supply the authorized local LS address and CSRF token through environment only")
    if (Path(cfg["workspace"]) / "STOP").exists() or (Path(cfg["workspace"]) / "handoff/STOP").exists():
        raise ValueError("STOP present")
    result = subprocess.run(
        [cfg["executable"], "agentapi", command, *args],
        cwd=cfg["workspace"], capture_output=True, text=True, encoding="utf-8",
        timeout=30, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    # Even malformed CLI output must never expose an inherited token.
    safe_output = (result.stdout or result.stderr).replace(token, "[REDACTED]")
    record(cfg, "api_result", command=command, exit_code=result.returncode,
           output_sha256=hashlib.sha256(safe_output.encode()).hexdigest())
    if result.returncode:
        raise RuntimeError(safe_output[:1500])
    return json.loads(safe_output)


def verify(cfg, nonce):
    if not re.fullmatch(r"[A-Za-z0-9_-]{8,100}", nonce):
        raise ValueError("Invalid nonce")
    resource = "/docs/office_hub/reports/DIRECT_LINK_ACK.md"
    local = (Path(cfg["workspace"]) / resource.lstrip("/")).read_text(encoding="utf-8")
    with urlopen(cfg["dashboard_origin"] + resource, timeout=5) as response:
        live = response.read().decode("utf-8")
    if nonce not in local or nonce not in live or "Antigravity" not in live or "ACK" not in live:
        raise ValueError("Matching ACK is not available in both workspace and live Dashboard")
    marker = "ROUNDTRIP-CONFIRMED " + nonce
    return record(cfg, "ack_verified", nonce=nonce, ack_sha256=hashlib.sha256(live.encode()).hexdigest(),
                  roundtrip_confirmed=marker in live and marker in local, http_origin=cfg["dashboard_origin"])


def send(cfg, filename):
    message = Path(filename).read_text(encoding="utf-8").strip()
    if not message or len(message) > 12000:
        raise ValueError("Message must contain 1–12000 characters")
    logfile = Path(cfg["workspace"]) / "docs/office_hub/direct_link.log"
    rows = [json.loads(line) for line in logfile.read_text(encoding="utf-8").splitlines() if line.strip()] if logfile.exists() else []
    recent = [r for r in rows if r["event"] == "send_started" and 0 <= (datetime.now(timezone.utc) - datetime.fromisoformat(r["time"])).total_seconds() < 3600]
    if len(recent) >= cfg.get("max_messages_per_hour", 6):
        raise ValueError("Hourly message limit reached")
    record(cfg, "send_started", sender="Codex", recipient="Antigravity",
           message_sha256=hashlib.sha256(message.encode()).hexdigest())
    result = invoke(cfg, "send-message", "--title=Codex-Office-Hub", cfg["conversation_id"], message)
    delivered = result.get("response", {}).get("sendMessage", {}).get("recipientId") == cfg["conversation_id"]
    return record(cfg, "message_delivered" if delivered else "delivery_unconfirmed", sender="Codex", recipient="Antigravity")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=str(Path(__file__).with_suffix(".json")))
    parser.add_argument("action", choices=["check", "send", "verify"])
    parser.add_argument("--message-file")
    parser.add_argument("--nonce")
    args = parser.parse_args()
    cfg = load_config(args.config)
    if args.action == "verify":
        result = verify(cfg, args.nonce or cfg["handshake_nonce"])
    elif args.action == "send":
        if not args.message_file:
            parser.error("send requires --message-file")
        result = send(cfg, args.message_file)
    else:
        data = invoke(cfg, "get-conversation-metadata", cfg["conversation_id"])
        metadata = data.get("response", {}).get("conversationMetadata", {}).get("metadata", {})
        result = {"conversation_id": metadata.get("rootConversationId"), "reachable": metadata.get("rootConversationId") == cfg["conversation_id"]}
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
