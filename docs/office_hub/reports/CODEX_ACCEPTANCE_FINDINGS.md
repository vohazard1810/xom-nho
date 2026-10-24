# Codex independent browser acceptance

| Snapshot | Task | Observation | Decision |
|---|---|---|---|
| 5d36219a9ae84d587b9d64fed9ebecbb8b10bdaeb5942e2b3ed41f84f19a2bff | T2 | 1280px: screenshots cropped left; expand overlay outside image right | Needs correction |
| Same | T3 | Total20, filtered20, unfinished1, done19 visible | Counters verified |
| Same | T4 | Independent CUA fixture8992: approve then request_changes succeeded | Interaction verified |

| Evidence | Scope |
|---|---|
| CODEX_BROWSER_ACTIONS.json | Actual CUA actions and resulting accessibility observations |
| CODEX_QA_LAYOUT_FEEDBACK.txt | Detail of remaining image clipping; no screenshot content should be cropped |

Do not treat absence of browser in headless CLI as failure. Inspect actual screenshot assets and current DOM/CSS.
Fixture8992 has workers disabled; production decisions were not clicked for testing.