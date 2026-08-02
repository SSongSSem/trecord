# -*- coding: utf-8 -*-
"""app.src.html + standards.compact.json -> 단일 HTML(자체 포함)."""
import re, sys
from pathlib import Path

HERE = OUTDIR = Path(__file__).parent

src = (HERE / "app.src.html").read_text(encoding="utf-8")
data = (HERE / "standards.compact.json").read_text(encoding="utf-8").strip()
kw   = (HERE / "keywords.json").read_text(encoding="utf-8").strip()

if "/*__STD__*/" not in src:
    sys.exit("자리표시자 /*__STD__*/ 를 찾지 못했습니다.")
out = re.sub(r"/\*__STD__\*/.*?/\*__/STD__\*/", lambda m: data, src, flags=re.S)
out = re.sub(r"/\*__KW__\*/.*?/\*__/KW__\*/", lambda m: kw, out, flags=re.S)

# 삽입 검증
n = out.count('"s":[[')
dst = OUTDIR / "index.html"
dst.write_text(out, encoding="utf-8")
print(f"wrote {dst}  {len(out.encode('utf-8'))//1024} KB  (영역 블록 {n}개)")
