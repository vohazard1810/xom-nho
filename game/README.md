# Day 1 playable vertical slice

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/game/` on a desktop browser. For a phone on the same Wi-Fi, use the computer's LAN IP in place of `localhost` and allow the local server through the computer firewall. The page is portrait responsive and stores two checksum-validated save revisions in localStorage; it restores the newest valid one.

Gameplay: HOME → XOM_OI → MARKET → SHOP → DAY_RESULT. Buy physical ingredient quantities, tap a customer, respond to Bé Tí's extra-cha request, tap the exact ingredient counts, and commit. Orders never auto-fulfill. Wrong or cleared drafts do not consume stock; duplicate commits are rejected. Unserved customers become missed orders when the shop closes. Replay resets the saved day. The displayed Bé Tí art is an existing candidate static crop; no walk cycle or game animation timing is changed.

**Playtest fixtures:** initial cash 60,000đ, three named arrivals and the displayed ingredient and selling prices are implementation fixtures for the transaction walkthrough. They are not approved economy balance or final Day 1 narrative. Cô Chín and Anh Tùng use emoji placeholders. No new NPC states or rig work is introduced. Debt is displayed but this slice has no debt choice yet. Device playtest and visual inspection remain NOT_RUN.

```sh
node game/test-day1.mjs
```

Evidence for a phone finding: screenshot or recording, exact screen and steps to reproduce, expected versus actual result, device/browser. Route walking pose defects to BLOCKED_KEYFRAME_QC; do not change animation timing to hide them.
