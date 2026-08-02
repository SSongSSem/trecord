# 공용 AI 연결 만들기 (선택)

키 없이도 다른 선생님이 AI 검토를 쓸 수 있게 하는 방법입니다.
**키를 `index.html`에 넣으면 안 됩니다** — 이 저장소는 공개라 소스를 보면 그대로 읽히고,
구글·깃허브의 시크릿 검사에 걸려 며칠 안에 폐기됩니다.

대신 키를 **작은 중계 서버(Cloudflare Workers)** 에 두고, 앱에는 그 주소만 넣습니다.
무료 요금제로 하루 10만 요청까지 되고, 카드 등록도 필요 없습니다.

---

## 명령줄로 배포하기 (권장)

대시보드 화면은 개편이 잦아 버튼 이름이 자주 바뀝니다. 명령줄은 그대로입니다.
아래는 전부 이 `proxy/` 폴더에서 실행합니다.

```bash
cd proxy

npx wrangler login                  # 1. 브라우저가 열리면 Cloudflare 계정으로 허용
npx wrangler deploy                 # 2. worker.js 배포 → 주소가 출력된다
npx wrangler secret put GEMINI_KEY  # 3. 키를 붙여넣고 Enter (화면에 남지 않는다)
```

3번을 마치면 다시 배포할 필요 없이 바로 반영됩니다.
2번이 출력하는 주소(`https://trecord-ai.○○○.workers.dev`)를 적어 두세요.

설정은 `wrangler.jsonc`에 있습니다 — 이름을 바꾸려면 `name`만 고치면 됩니다.

## 대시보드로 배포하기

명령줄이 막힐 때만 쓰세요. 2026년 8월 기준 화면입니다.

1. <https://dash.cloudflare.com> → 왼쪽 **Workers & Pages** → **Create application**
2. 템플릿 중 가장 단순한 것(Hello World 계열)으로 만들고 이름을 `trecord-ai`로 둡니다
3. 만들어진 Worker에서 코드 편집기를 열어 내용을 전부 지우고 `worker.js`를 붙여넣은 뒤 배포
4. 그 Worker → **Settings** → **Variables and Secrets** → **Add**

   | 항목 | 값 |
   |---|---|
   | Type | **Secret** (Text 아님 — Secret이어야 화면에 다시 안 보입니다) |
   | Variable name | `GEMINI_KEY` |
   | Value | `AIza…` 로 시작하는 본인 키 |

   → **Deploy** 를 눌러야 반영됩니다.

## 허용 주소 확인

`worker.js` 맨 위 `ALLOW` 에 앱이 실제로 열리는 주소가 들어 있어야 합니다.
GitHub Pages를 쓴다면 `https://ssongssem.github.io` 그대로 두면 되고,
다른 곳에 올렸다면 그 주소로 고칩니다. 개발용 `http://127.0.0.1:8777` 줄은 지워도 됩니다.
고친 뒤에는 `npx wrangler deploy` 를 다시 하세요.

## 앱에 주소 넣기

`app.src.html` 에서 이 줄을 찾아 주소를 채웁니다.

```js
const AI_PROXY = "";
```
↓
```js
const AI_PROXY = "https://trecord-ai.○○○.workers.dev";
```

그리고 빌드합니다.

```bash
python build.py
```

`AI 연결` 탭에 「연결됨 · 공용」이라고 뜨고, 키를 넣지 않아도 **저장하고 연결 확인**이 통과하면 된 것입니다.

## 잘 됐는지 보는 법

브라우저에서 이 주소를 그냥 열어 봅니다.

```
https://trecord-ai.○○○.workers.dev/v1beta/models
```

| 보이는 것 | 뜻 |
|---|---|
| 모델 목록 JSON | 성공 |
| `서버에 키가 설정되지 않았습니다` | 시크릿 이름이 `GEMINI_KEY`가 맞는지 확인 |
| `지원하지 않는 경로입니다` | 주소 뒤 `/v1beta/models` 를 빠뜨렸습니다 |

---

## 알아 둘 것

- **한도는 구글이 정합니다.** 공용 연결이 하루 한도에 닿으면 앱이 429를 받아
  「공용 연결이 오늘 한도에 닿았습니다 — 본인 키를 넣으면 바로 이어서 쓸 수 있습니다」라고 안내합니다.
  키 하나를 여러 학교가 나눠 쓰는 셈이라, 쓰는 사람이 늘면 금방 닿습니다.
- **결제를 붙이지 마세요.** 이 키가 붙은 구글 프로젝트에 결제 수단을 등록하면,
  한도가 풀리는 대신 그 청구가 키 주인에게 갑니다. 무료 등급으로 두는 것이 곧 상한선입니다.
- **막는 것과 못 막는 것.** `ALLOW`(요청 출처)·`MODEL_OK`(모델)·`MAX_BODY`(크기)로 우회 사용을 좁혔지만,
  브라우저를 거치지 않는 요청은 `Origin` 머리를 위조할 수 있어 완전히 막지는 못합니다.
  구글 쪽 한도가 실질적인 상한이고, 이상하면 `npx wrangler delete` 로 Worker를 내리거나
  AI Studio에서 키를 재발급하면 즉시 끊깁니다.
- **본인 키를 넣은 사람은 공용을 거치지 않습니다.** 앱이 키가 있으면 구글로 바로 호출합니다.
- 개인정보 고지는 앱이 자동으로 바꿔 씁니다 — 공용 연결이 켜져 있으면
  「공용 연결 서버를 거쳐 구글로 전송됩니다」라고 알립니다.
