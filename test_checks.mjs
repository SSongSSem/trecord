/* 검사 규칙 회귀 시험 —  node test_checks.mjs
 *
 * 기재요령 검사와 루브릭 점검은 정규식과 임계값으로 되어 있고, 그중 몇은
 * 표본에서 재서 넣은 수다(RUB_NEAR). 손대다 보면 조용히 어긋나므로 여기에 못을 박는다.
 *
 * app.src.html 에서 검사 부분만 떼어 그대로 돌린다 — 규칙을 이 파일에 옮겨 적지 않는다.
 * 옮겨 적으면 사본이 하나 더 생기고, 정본이 바뀌어도 시험은 통과해 버린다.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(here, "app.src.html"), "utf8");

/* 잘라 오는 자리. 표식이 사라지면 조용히 빈 문자열이 되지 않도록 여기서 멈춘다 */
function slice(src, from, to, whose) {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + 1);
  if (a < 0 || b < 0) {
    console.error(`\n${whose}에서 표식을 찾지 못했습니다: ${a < 0 ? from : to}`);
    console.error("검사 코드의 자리가 바뀌었다면 이 파일의 표식도 함께 고쳐 주세요.");
    process.exit(2);
  }
  return src.slice(a, b);
}
const REGION = s => [
  slice(s, "const toks =", "/* ══ 기재요령 검사 ══ */", "app.src.html"),
  slice(s, "const SWAPS = [", "function check(text)", "app.src.html"),
  slice(s, "function check(text)", "const SVG =", "app.src.html"),
].join("\n");

const { rubricLint, check } = new Function(REGION(SRC) + "; return {rubricLint, check};")();

let pass = 0, fail = 0;
const t = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `\n         got=${JSON.stringify(got)} want=${JSON.stringify(want)}`}`);
};
const group = s => console.log(`\n${s}`);

/* 루브릭 점검 — id 가 뜨는가로만 본다. 문구는 다듬을 수 있어야 하므로 묶지 않는다 */
const lint = (rows, stds) => rubricLint(rows, stds || []).map(f => f.id);
const lintHas = (rows, id, stds) => lint(rows, stds).includes(id);
/* 기재요령 검사 */
const hits = s => check(s).map(f => `${f.id}:${f.lv}`);
const blocked = (s, id) => hits(s).includes(`${id}:block`);
const warned = (s, id) => hits(s).includes(`${id}:warn`);

const R3 = (a, b, c) => [{level:"잘함",text:a},{level:"보통",text:b},{level:"노력요함",text:c}];

group("루브릭 — 같음·겹침·근사");
t("두 수준이 같으면 rub-same",
  lintHas(R3("문단을 요약해 씀","문단을 요약해 씀","옮겨 적음"), "rub-same"), true);
t("겹치는 낱말이 없으면 rub-drift",
  lintHas([{level:"잘함",text:"각도기를 맞추어 예각과 둔각을 구분함"},
           {level:"노력요함",text:"자료를 표로 정리함"}], "rub-drift"), true);
t("낱말 한둘만 다르면 rub-near (임계 0.85)",
  lintHas([{level:"잘함",text:"중심 문장을 찾아 문단의 내용을 요약해 씀"},
           {level:"노력요함",text:"중심 문장을 찾아 문단의 내용을 요약해 봄"}], "rub-near"), true);
t("하는 일이 달라지면 rub-near 안 뜸",
  lintHas([{level:"잘함",text:"중심 문장을 정하고 뒷받침 문장을 붙여 문단을 씀"},
           {level:"노력요함",text:"읽은 문장을 차례대로 옮겨 적음"}], "rub-near"), false);

group("루브릭 — 정도부사. 활용형을 갈라 보지 않는다");
for (const w of ["정확히","정확하게","자세히","자세하게","명확하게","능숙하게","효과적으로","적절하게"])
  t(`'${w}' 는 rub-degree`,
    lintHas(R3(`자료를 ${w} 분류함`,"자료를 분류함","자료를 봄"), "rub-degree"), true);
t("'구체적으로' 는 일부러 안 잡음",
  lintHas(R3("장면을 구체적으로 씀","장면을 씀","장면을 봄"), "rub-degree"), false);
t("'적극적으로' 는 rub-attend 쪽이 봄",
  lintHas(R3("모둠 활동에 적극적으로 참여함","참여함","지켜봄"), "rub-attend"), true);
t("수준 이름 '잘함' 은 정도부사가 아님",
  lintHas(R3("문단을 요약해 씀","문단을 옮겨 적음","한 문장을 옮겨 적음"), "rub-degree"), false);

group("루브릭 — 맨 아래 칸");
t("'부분적으로' 는 rub-vague",
  lintHas(R3("기준에 따라 낱말을 분류함","낱말을 분류함","낱말 분류를 부분적으로 이해함"), "rub-vague"), true);
t("'간단한' 은 과제를 줄인 것이므로 안 잡음",
  lintHas(R3("상황에 맞게 대화함","대화함","간단한 대화를 함"), "rub-vague"), false);
t("도움을 적어 두면 rub-vague 안 뜸",
  lintHas(R3("스스로 분류함","분류함","도움을 받아 부분적으로 분류함"), "rub-vague"), false);
t("못 하는 것으로 끝나면 rub-deficit",
  lintHas(R3("스스로 분류함","분류함","낱말을 분류하지 못함"), "rub-deficit"), true);

group("루브릭 — 나머지");
t("성취기준을 베끼면 rub-copy",
  lintHas(R3("단어를 분류하고 국어사전을 활용하여 능동적인 국어 활동을 한다","낱말을 분류함","낱말을 봄"),
          "rub-copy", ["단어를 분류하고 국어사전을 활용하여 능동적인 국어 활동을 한다."]), true);
t("개수로 가르면 rub-count",
  lintHas(R3("근거를 세 가지 이상 들어 말함","근거를 들어 말함","생각을 말함"), "rub-count"), true);
t("90자를 넘으면 rub-long",
  lintHas(R3("가".repeat(95),"짧게 씀","더 짧게 씀"), "rub-long"), true);
t("피드백(fb)은 검사하지 않음",
  lintHas([{level:"잘함",text:"문단을 요약해 씀",fb:"끝까지 잘 들어 보자"},
           {level:"노력요함",text:"한 문장을 옮겨 적음"}], "rub-degree"), false);
/* 세 수준이 같은 낱말을 붙들고 하는 일만 달라지는 예. 여기서 무엇이든 뜨면 규칙이 넓어진 것이다.
   ('안내를 받아'처럼 아래 칸에 도움을 적어 두면 rub-vague·rub-deficit 가 비켜 간다) */
t("잘 쓴 세 수준은 조용함",
  lint(R3("중심 문장을 먼저 정하고 뒷받침 문장을 붙여 문단을 씀",
          "중심 문장과 뒷받침 문장을 갖추어 문단을 쓰나 순서가 뒤섞임",
          "안내를 받아 중심 문장을 찾아 문단의 맨 앞에 옮겨 씀")), []);

group("기재요령 — 등급 1");
t("어학시험", blocked("토익 점수를 올림", "lang"), true);
t("자격증", blocked("자격증을 취득함", "lang"), true);
t("논문", blocked("논문을 작성함", "paper"), true);
t("출간", blocked("자신의 글을 출간함", "paper"), true);
t("국제기구", blocked("유네스코 활동을 소개함", "intl"), true);
t("장학금", blocked("장학금을 받음", "money"), true);
t("상표는 일반명사 제안", blocked("유튜브 영상을 만들어 봄", "brand"), true);
t("특수문자", blocked("① 첫째로 발표함", "special"), true);

group("기재요령 — 특허는 배운 일과 낸 실적을 가름");
for (const s of ["발명과 특허의 관계를 이해하고 지식재산권의 중요성을 인식함",
                 "특허 침해 사례를 조사하여 발표함",
                 "일상생활을 바꾼 발명품과 특허를 탐색함"])
  t(`통과: 「${s}」`, blocked(s, "paper"), false);
for (const s of ["발명품으로 특허를 출원함", "특허 취득 경험을 발표함",
                 "학교 발명반에서 특허 등록을 함", "특허를 받은 경험을 소개함",
                 "지식재산권 등록을 마침"])
  t(`차단: 「${s}」`, blocked(s, "paper"), true);

group("기재요령 — 등급 2");
t("대회", warned("줄넘기 대회에서 응원함", "contest"), true);
t("점수", warned("수학 시험에서 90점을 받음", "score"), true);
t("'3등분' 은 뜻이 달라 안 잡음", warned("색종이를 3등분하여 나눔", "score"), false);
t("주어", warned("이 학생은 성실함", "subj"), true);

group("기재요령 — 명사형 종결. 받침 자모로 가른다");
t("평서형 '~했다'", warned("친구를 도와주었다.", "ending"), true);
t("평서형 '~있다'", warned("스스로 정리할 수 있다.", "ending"), true);
for (const s of ["새로운 낱말을 익힘.", "빠진 자료를 찾아냄.", "모둠을 이끎.", "생각을 나눔."])
  t(`통과: 「${s}」`, warned(s, "ending"), false);

group("정상 문장은 조용해야 한다");
for (const s of ["모둠 활동에서 중심 문장을 찾아 근거를 들어 설명함.",
                 "각도기를 정확히 맞추어 예각과 둔각을 구분하여 그림.",
                 "학급 회의에서 급식 잔반 줄이기 규칙을 제안하고 실천표를 만듦."])
  t(`「${s}」`, check(s).length, 0);

group("index.html 이 app.src.html 과 같은 규칙을 담고 있는가");
const OUT = path.join(here, "index.html");
if (!fs.existsSync(OUT)) {
  console.log("  --    index.html 이 없습니다 (build.py 를 아직 안 돌림) — 건너뜀");
} else {
  t("build.py 를 다시 돌려야 하는 상태가 아님",
    REGION(fs.readFileSync(OUT, "utf8")) === REGION(SRC), true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
