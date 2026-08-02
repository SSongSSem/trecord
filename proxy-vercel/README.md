# 공용 AI 연결 — Vercel (서울 고정)

키 없이도 다른 선생님이 AI 검토를 쓸 수 있게 하는 중계 서버입니다.
**키를 `index.html`에 넣으면 안 됩니다** — 이 저장소는 공개라 소스에서 그대로 읽히고,
시크릿 검사에 걸려 폐기됩니다.

## 왜 Cloudflare가 아니라 Vercel인가

먼저 Cloudflare Workers(`../proxy/`)로 만들었는데, 실제로 돌려 보니 홍콩(HKG) 콜로에서
실행되어 구글이 거절했습니다.

```
CF-Ray: ...-HKG
→ {"error":{"message":"User location is not supported for the API use.","code":400}}
```

Workers 무료 요금제는 실행 지역을 고를 수 없고, Smart Placement는 *지연 시간* 기준이라
지역을 보장하지 않습니다. Vercel은 **Hobby 요금제에서도 단일 지역 고정**이 되고
`icn1`(서울)은 Gemini API 지원 지역이라 이 문제가 없습니다.

---

## 배포

이 폴더에서 실행합니다.

```bash
cd proxy-vercel

npx vercel login     # 1. 브라우저에서 계정 인증
npx vercel --prod    # 2. 배포 → 주소가 출력된다
```

처음 배포하면 프로젝트 이름 등을 묻습니다. 기본값으로 넘기면 됩니다.

## 키 넣기 — 반드시 웹 화면에서

**명령줄(`npx vercel env add`)은 쓰지 마세요.** 프롬프트에 값을 받는 방식이라,
터미널이 아닌 곳(에이전트 셸 등)에서 실행하면 **빈 값이 조용히 들어갑니다.**
실제로 Cloudflare에서 그 사고가 났습니다.

1. <https://vercel.com/dashboard> → 이 프로젝트 → **Settings** → **Environment Variables**
2. Key `GEMINI_API_KEY`, Value 에 키를 붙여넣기, 환경은 **Production** 체크 → **Save**
3. 환경 변수는 다음 배포부터 적용되므로 `npx vercel --prod` 를 한 번 더 실행

## 앱에 주소 넣기

`app.src.html` 에서 이 줄을 채우고 빌드합니다.

```js
const AI_PROXY = "";                              // ← 비어 있으면 각자 키 방식
const AI_PROXY = "https://○○○.vercel.app";        // ← 배포 주소
```

```bash
python build.py
```

## 잘 됐는지 보는 법

```
https://○○○.vercel.app/v1beta/models
```

| 보이는 것 | 뜻 |
|---|---|
| 모델 목록 JSON | 성공 |
| `서버에 키가 설정되지 않았습니다` | 환경 변수 미설정, 또는 값을 넣고 재배포를 안 함 |
| `User location is not supported` | 서울(`icn1`)이 아닌 곳에서 실행됨 — `vercel.json`의 `regions` 확인 |

---

## 알아 둘 것

- **한도는 구글이 정합니다.** 공용 연결이 하루 한도에 닿으면 앱이 429를 받아
  「본인 키를 넣으면 바로 이어서 쓸 수 있습니다」라고 안내합니다.
  키 하나를 여러 학교가 나눠 쓰는 셈이라 쓰는 사람이 늘면 금방 닿습니다.
- **결제를 붙이지 마세요.** 키가 붙은 구글 프로젝트에 결제 수단을 등록하면
  한도가 풀리는 대신 청구가 키 주인에게 갑니다. 무료 등급이 곧 상한선입니다.
- **막는 것과 못 막는 것.** `ALLOW`(요청 출처)·`MODEL_OK`(모델)·`MAX_BODY`(크기)로 좁혔지만,
  브라우저를 거치지 않는 요청은 `Origin`을 위조할 수 있어 완전히 막지 못합니다.
  이상하면 Vercel에서 프로젝트를 지우거나 AI Studio에서 키를 재발급하면 즉시 끊깁니다.
- **본인 키를 넣은 사람은 공용을 거치지 않습니다.**
- 개인정보 고지는 앱이 자동으로 바꿔 씁니다 — 공용 연결이 켜져 있으면
  「공용 연결 서버를 거쳐 구글로 전송됩니다」라고 알립니다.
