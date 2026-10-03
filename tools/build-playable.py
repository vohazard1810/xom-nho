#!/usr/bin/env python3
"""Package the existing game and only referenced art; no video or new art."""
from pathlib import Path
import re, shutil, argparse
root=Path(__file__).resolve().parents[1]
args=argparse.ArgumentParser()
args.add_argument('--out',type=Path,default=root/'dist')
opts=args.parse_args()
out=opts.out.resolve();(out/'game').mkdir(parents=True,exist_ok=True)
main=(root/'game/main.mjs').read_text();css=(root/'game/style.css').read_text()
paths=set(re.findall(r"\.\./(assets/[A-Za-z0-9_./-]+\.(?:png|jpg))",main+css))
base=re.search(r"const ASSET_BASE = '\.\./([^']+)';",main).group(1)
paths.update(base+f for f in re.findall(r"ASSET_BASE \+ '([^']+)'",main))
for f in ['index.html','main.mjs','style.css','day1-core.mjs','day-content.mjs','shift-engine.mjs','empire-engine.mjs']:
 shutil.copy2(root/'game'/f,out/'game'/f)
for f in paths:
 dest=out/f;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(root/f,dest)
(out/'index.html').write_text('<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Xóm Nhỏ — Quán của bạn</title><meta http-equiv="refresh" content="0;url=./game/"><a href="./game/">Mở quán Xóm Nhỏ</a></html>')
print(f'Packaged {len(paths)} existing images; {sum(p.stat().st_size for p in out.rglob("*") if p.is_file())/1048576:.1f} MB into {out}')
