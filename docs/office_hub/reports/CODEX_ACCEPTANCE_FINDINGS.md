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
| 5d36219a9ae84d587b9d64fed9ebecbb8b10bdaeb5942e2b3ed41f84f19a2bff | T1/T2 narrow | 02_mobile_lobby_390x844.png: sidebar240px leaves content ~100px, unreadable | Needs mobile shell fix |
Desktop management faces now verified entirely visible; mobile management view still needs real visual evidence.


16:34 browser check during editing: desktop image clipping fixed. Compare Mode remains blank; renderCompareStage selectors must match HTML. Await final frozen snapshot before acceptance.


16:37 actual 02_mobile_lobby_390x844.png updated: shell/sidebar fixed, but selected management tab still shows UI room plus clipped management room. A single selected room must occupy full width; verify desktop/mobile stage display overrides and tab visibility. Screenshot does not yet show both management faces as requested.


| 9b26e6087a7e663e6d96809f2426d76ab0e1d09d8ede91572f4a71c553e62893 | T2 final | renderCompareStage queries compare-stage-a/b; HTML uses compare-device-a/b. Both panes blank in real browser | FAIL |
| 9b26e6087a7e663e6d96809f2426d76ab0e1d09d8ede91572f4a71c553e62893 | T1/T2 mobile final | Submitted 02_mobile_lobby_390x844.png shows selected management tab with UI room and clipped management room | FAIL |
These findings refer to final frozen files and submitted screenshot, not the earlier clipping already fixed. Independent CUA confirms grid image clipping fixed; Kanban counters and fixture decisions passed.

