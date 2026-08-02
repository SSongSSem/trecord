/* T-record 공용 AI 연결 — Vercel Functions (서울 icn1 고정)
 *
 * Cloudflare Workers로 먼저 만들었으나, 무료 요금제는 실행 지역을 고를 수 없어
 * 홍콩 콜로로 나가면 구글이 "User location is not supported"로 거절했다.
 * Vercel은 Hobby 요금제에서도 단일 지역을 고정할 수 있어 서울로 못박는다
 * (vercel.json의 "regions": ["icn1"]). 한국은 Gemini API 지원 지역이다.
 *
 * 키는 이 프로젝트의 환경 변수 GEMINI_API_KEY 에만 있고 앱에는 주소만 들어간다.
 */

/* 이 주소에서 온 요청만 받는다. 배포 주소가 다르면 여기를 고친다. */
const ALLOW = [
  "https://ssongssem.github.io",
];

const MODEL_OK = /^gemini-[A-Za-z0-9._-]+$/;
const MAX_BODY = 8 * 1024 * 1024;
const UPSTREAM = "https://generativelanguage.googleapis.com";

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOW.includes(origin) ? origin : ALLOW[0],
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
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const h = cors(origin);

    if (request.method === "OPTIONS") return new Response(null, { headers: h });
    if (origin && !ALLOW.includes(origin))
      return fail("허용되지 않은 주소에서 온 요청입니다.", 403, h);

    /* 이름이 갈리기 쉬워 둘 다 받는다 */
    const KEY = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY;
    if (!KEY)
      return fail("서버에 키가 설정되지 않았습니다. 환경 변수 GEMINI_API_KEY를 넣어 주세요.", 500, h);

    const url = new URL(request.url);
    /* vercel.json의 재작성으로 들어오면 원래 경로가 ?p= 에 담긴다.
       직접 호출된 경우를 대비해 pathname에서도 뽑는다. */
    const q = new URLSearchParams(url.search);
    let path = q.get("p") || "";
    if (!path) {
      const m = url.pathname.match(/^\/v1beta\/(.*)$/);
      path = m ? m[1] : "";
    }

    const gen = path.match(/^models\/([^:/]+):generateContent$/);
    const list = path === "models";
    if (!gen && !list) return fail("지원하지 않는 경로입니다.", 404, h);
    if (gen && !MODEL_OK.test(gen[1])) return fail("허용되지 않은 모델입니다.", 400, h);
    if (request.method !== (list ? "GET" : "POST"))
      return fail("요청 방법이 올바르지 않습니다.", 405, h);

    let body;
    if (!list) {
      body = await request.text();
      if (body.length > MAX_BODY)
        return fail("보낸 내용이 너무 큽니다. 산출물 사진을 줄여 주세요.", 413, h);
    }

    /* 재작성이 p·path 같은 자기 쿼리를 덧붙이므로, 넘길 것만 골라 보낸다.
       빼는 방식으로 하면 새로 생기는 파라미터를 구글이 거절한다. */
    const q2 = new URLSearchParams();
    for (const [k, v] of q) if (k === "pageSize" || k === "pageToken") q2.append(k, v);
    const qs = q2.toString();
    const res = await fetch(`${UPSTREAM}/v1beta/${path}${qs ? "?" + qs : ""}`, {
      method: request.method,
      headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
      body,
    });

    /* 위쪽 응답을 그대로 흘려보내되 CORS 머리만 얹는다.
       429(한도 초과)도 그대로 넘긴다 — 앱이 '본인 키를 넣으라'고 안내한다. */
    const out = new Response(res.body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    });
    for (const [k, v] of Object.entries(h)) out.headers.set(k, v);
    return out;
  },
};
