#!/usr/bin/env python3
"""Validate measured evidence. PASS is impossible with null/unmeasured anchors."""
from __future__ import annotations
import argparse,json,math
from pathlib import Path

STATIONARY=[
 ("QUEUE_WAIT","normal"),("QUEUE_WAIT","deprioritized"),
 ("QUEUE_WAIT","reserved_for_other"),("QUEUE_WAIT","stock_pending"),
 ("ORDER",None),("SPECIAL_REQUEST",None),("CONFLICT_WAIT",None),
 ("RECEIVE",None),("REFUSED",None),
 ("REACT","positive"),("REACT","neutral"),("REACT","negative"),
 ("PAY",None)
]

def frames(spec,variant=None):
    return spec.get("frames_by_variant",{}).get(variant,[]) if variant else spec.get("frames",[])

def measured_anchor(frame,name):
    a=frame.get("anchors",{}).get(name)
    return (frame.get("status")=="MEASURED" and isinstance(a,dict)
            and all(isinstance(a.get(axis),(int,float)) and not isinstance(a.get(axis),bool)
                    and math.isfinite(a[axis]) for axis in ("x","y")))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("manifest"); ap.add_argument("-o","--output",default="tools/animation-qc/report.json")
    a=ap.parse_args(); m=json.loads(Path(a.manifest).read_text(encoding="utf-8"))
    states=m["characters"]["be_ti"]["states"]; ys=[]; missing=[]
    for state,var in STATIONARY:
        spec=states[state]; fs=frames(spec,var)
        label=f"{state}{'.'+var if var else ''}"
        expected=spec.get("frame_count_per_variant" if var else "frame_count")
        if expected is not None and len(fs)!=expected:
            missing.append(f"{label}:expected_{expected}_found_{len(fs)}")
        if not fs: missing.append(f"{label}:no_frames"); continue
        for f in fs:
            if measured_anchor(f,"feet"): ys.append(f["anchors"]["feet"]["y"])
            else: missing.append(f"{label}:{f.get('index','?')}:feet")
    feet={"status":"BLOCKED","result":None,"missing":missing}
    if not missing:
        delta=max(ys)-min(ys); feet={"status":"PASS" if delta<=3 else "FAIL","result":{"min_y":min(ys),"max_y":max(ys),"delta_px":delta},"missing":[]}

    hand_frames=frames(m["characters"]["shopkeeper"]["states"]["HANDOFF"])
    recv_frames=frames(states["RECEIVE"])
    hand=hand_frames[-1] if hand_frames else None; recv=recv_frames[-1] if recv_frames else None
    hs={"status":"BLOCKED","result":None}
    if hand and recv and measured_anchor(hand,"hand_right") and measured_anchor(recv,"receive_point"):
        p=hand["anchors"]["hand_right"]; q=recv["anchors"]["receive_point"]
        d=math.hypot(p["x"]-q["x"],p["y"]-q["y"])
        hs={"status":"PASS" if d<=10 else "FAIL","result":{"distance_px":d,"shopkeeper":p,"be_ti":q}}

    human=m["validation_tests"]["wait_readability_human"]
    human_ok=human.get("status")=="PASS" and human.get("checked_by") and human.get("checked_at") and all(v is True for v in human.get("results",{}).values())
    report={"feet_anchor_consistency":feet,"handoff_sync":hs,"wait_readability_human":{"status":"PASS" if human_ok else "BLOCKED"}}
    report["gate_status"]="PASS" if all(v["status"]=="PASS" for v in report.values() if isinstance(v,dict) and "status" in v) else "BLOCKED"
    Path(a.output).write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8"); print(json.dumps(report,indent=2,ensure_ascii=False))

if __name__=="__main__": main()
