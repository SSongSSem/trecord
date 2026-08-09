# -*- coding: utf-8 -*-
"""app.src.html + standards.compact.json -> 단일 HTML(자체 포함)."""
import re, sys
from pathlib import Path

HERE = OUTDIR = Path(__file__).parent

src = (HERE / "app.src.html").read_text(encoding="utf-8")
data = (HERE / "standards.compact.json").read_text(encoding="utf-8").strip()
kw   = (HERE / "keywords.json").read_text(encoding="utf-8").strip()
skel = (HERE / "hwpx-skeleton.b64").read_text(encoding="utf-8").strip()
# 학생평가지원포털 자료에서 뽑은 것 — 성취기준별 성취수준 A·B·C와 평가 요소
lv   = (HERE / "levels.compact.json").read_text(encoding="utf-8").strip()
pt   = (HERE / "points.compact.json").read_text(encoding="utf-8").strip()
# 세특 문장 골격(①수행 과제 ②수행한 기능 ③교과 역량)과 교과 역량·보기 문장
fr   = (HERE / "frame.compact.json").read_text(encoding="utf-8").strip()

for mark in ("/*__STD__*/", "/*__KW__*/", "/*__LV__*/", "/*__PT__*/", "/*__FR__*/"):
    if mark not in src:
        sys.exit(f"자리표시자 {mark} 를 찾지 못했습니다.")
out = re.sub(r"/\*__STD__\*/.*?/\*__/STD__\*/", lambda m: data, src, flags=re.S)
out = re.sub(r"/\*__KW__\*/.*?/\*__/KW__\*/", lambda m: kw, out, flags=re.S)
# 한글 문서 골격(python-hwpx, Apache-2.0). THIRD-PARTY-NOTICES.md 참고
out = re.sub(r"/\*__SKEL__\*/.*?/\*__/SKEL__\*/", lambda m: '"' + skel + '"', out, flags=re.S)
out = re.sub(r"/\*__LV__\*/.*?/\*__/LV__\*/", lambda m: lv, out, flags=re.S)
out = re.sub(r"/\*__PT__\*/.*?/\*__/PT__\*/", lambda m: pt, out, flags=re.S)
out = re.sub(r"/\*__FR__\*/.*?/\*__/FR__\*/", lambda m: fr, out, flags=re.S)

# 삽입 검증
n = out.count('"s":[[')
dst = OUTDIR / "index.html"
dst.write_text(out, encoding="utf-8")
print(f"wrote {dst}  {len(out.encode('utf-8'))//1024} KB  (영역 블록 {n}개)")
