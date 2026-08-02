/* T-record 공용 AI 연결 — Cloudflare Workers
 *
 * 키는 이 서버의 환경 변수(GEMINI_KEY)에만 있고, 공개된 앱에는 이 주소만 들어간다.
 * 그래서 소스를 봐도 키가 보이지 않는다.
 *
 * 배포 절차는 같은 폴더의 README.md 참고.
 */

/* 이 주소에서 온 요청만 받는다. 배포 주소가 다르면 여기를 고친다. */
const ALLOW = [
  "https://ssongssem.github.io",
];

/* 허용 모델 — 다른 구글 API로 우회하지 못하게 좁혀 둔다 */
const MODEL_OK = /^gemini-[A-Za-z0-9._-]+$/;

/* 한 요청의 크기 상한. 산출물 사진을 붙여 읽히는 경우를 감안한 값 */
const MAX_BODY = 8 * 1024 * 1024;

const UPSTREAM = "https://generativelanguage.googleapis.com";

function cors(origin) {
  const ok = ALLOW.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : ALLOW[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}
const fail = (msg, status, h) =>
  new Response(JSON.stringify({ error: { message: msg } }), {
    status,
    headers: Object.assign({ "Content-Type": "application/json" }, h),
  });

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const h = cors(origin);

    if (req.method === "OPTIONS") return new Response(null, { headers: h });
    if (origin && !ALLOW.includes(origin))
      return fail("허용되지 않은 주소에서 온 요청입니다.", 403, h);

    /* 시크릿 이름은 둘 다 받는다 — 대시보드에서 넣을 때 이름이 갈리기 쉽다 */
    const KEY = env.GEMINI_API_KEY || env.GEMINI_KEY;
    if (!KEY)
      return fail("서버에 키가 설정되지 않았습니다. 시크릿 이름을 GEMINI_API_KEY로 넣어 주세요.", 500, h);

    const url = new URL(req.url);
    const gen = url.pathname.match(/^\/v1beta\/models\/([^:/]+):generateContent$/);
    const list = url.pathname === "/v1beta/models";

    if (!gen && !list) return fail("지원하지 않는 경로입니다.", 404, h);
    if (gen && !MODEL_OK.test(gen[1])) return fail("허용되지 않은 모델입니다.", 400, h);
    if (req.method !== (list ? "GET" : "POST"))
      return fail("요청 방법이 올바르지 않습니다.", 405, h);

    let body;
    if (!list) {
      body = await req.text();
      if (body.length > MAX_BODY)
        return fail("보낸 내용이 너무 큽니다. 산출물 사진을 줄여 주세요.", 413, h);
    }

    const res = await fetch(UPSTREAM + url.pathname + url.search, {
      method: req.method,
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body,
    });

    /* 위쪽 응답을 그대로 흘려보내되 CORS 머리만 얹는다.
       429(한도 초과)도 그대로 넘긴다 — 앱이 '본인 키를 넣으라'고 안내한다. */
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  },
};
