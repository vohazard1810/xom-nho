# Office Hub direct link

Verified 2026-10-24 against the Antigravity conversation already working on Xóm Nhỏ.

| Field | Value |
|---|---|
| Served workspace | `C:\Users\truonggiang.vo01\.gemini\antigravity\scratch\xom-nho` |
| Dashboard | http://127.0.0.1:8990/docs/office_hub/index.html#reports |
| Conversation | `47b8d4fc-0808-455a-ab31-40cf8e3ca68d` |
| Send transport | `language_server.exe agentapi send-message` |
| Reply transport | Shared report/ACK files, verified through HTTP and filesystem |
| Model selection | Existing Antigravity conversation controls its model; send-message cannot select Light/Medium |
| Credentials | Caller environment only; never persisted |
| Lifecycle | On demand while Codex is working; no always-on daemon started |

This supersedes the earlier dry-run finding that no verified direct transport was
available. The standalone `agy` CLI is still absent, but the existing app's
`agentapi` messaging has now been verified with a nonce written back by Antigravity.
Delivery acknowledgement alone is not task completion or proof of passing tests.

The owner explicitly authorized using the running local session token in memory
for this connection. The helper does not extract credentials. The caller must
supply `ANTIGRAVITY_LS_ADDRESS` and `ANTIGRAVITY_CSRF_TOKEN` using an authorized
session environment. Never put the token in JSON, message files, logs, or Git.
Local service ports can change when Antigravity restarts; revalidate the endpoint.

```powershell
python handoff/direct_link.py check
python handoff/direct_link.py send --message-file handoff/message.txt
python handoff/direct_link.py verify --nonce OFFICE-LINK-20261024-1215
```

Run from the served repo, or use the bundled Python executable if `python` is
unavailable in Codex's shell. No need to paste task text into the other agent's UI.
The helper enforces loopback, STOP and six message attempts/hour. Every send is
recorded in `docs/office_hub/direct_link.log` without credential contents.

Report updates are visible when the existing reports view loads again. Static
`python -m http.server` serves files; it does not itself run agents, create a
permanent two-way chat service, or guarantee the UI refreshes without reload.
Do not overwrite Antigravity's unfinished UI to deploy this helper.
