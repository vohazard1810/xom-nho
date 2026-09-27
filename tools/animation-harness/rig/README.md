# Bé Tí textured rig candidate

This is a visual approval candidate for WALK/ARRIVE/LEAVE only. The original static states are outside this rig. Do not reference these files from `manifest.json` or mark them MEASURED/PASS.

- `be_ti_parts_candidate.png`: unapproved source art parts, generated from the approved Bé Tí look.
- `be_ti_textured_standing.svg`: 16 named groups with draft `data-pivot` coordinates. These are provisional SVG rig pivots, **not measured semantic anchors**.
- `be_ti_textured_standing.png`: static render for inspection.
- `style-comparison-textured.mp4`: side-by-side at the same 220×330 display box for human style review.

Before animation: obtain human approval of style and alignment, remove residual sleeve overlap and neck seam, verify feet are on one baseline. Then animate the two leg chains with world-space planted foot targets, export six WALK frames, four ARRIVE frames, and six LEAVE frames. Keep the gate BLOCKED until the production PNG and anchor QC are complete.
