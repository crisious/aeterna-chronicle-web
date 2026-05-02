# Browser Use QA 자동 테스트 환경

## 목적

Codex Browser Use(in-app browser)로 클라이언트 주요 화면을 실제 브라우저에서 열고, DOM 계약·콘솔 에러·스타일 가이드 노출 상태를 자동 점검한다.

## 명령

```bash
npm run qa
npm run qa:auto:full
npm run qa:browser:preflight
npm run qa:browser:manifest
```

- `qa` / `qa:auto`: `.env`가 없으면 `.env.example`에서 생성하고, Docker PostgreSQL/Redis를 기동·재시작한 뒤 Prisma schema sync, API 서버 재시작, Browser Use preflight, `test:e2e`를 순서대로 실행한다.
- `qa:auto:full`: `qa:auto` 이후 `verify`까지 이어서 실행한다.
- `qa:seed`: live e2e에 필요한 최소 아이템·월드 존·몬스터 마스터 데이터를 idempotent하게 upsert한다. `qa:auto` 안에서 자동 실행된다.
- `qa:browser:preflight`: Vite dev server를 `127.0.0.1:5173`에 띄우고 HTML/라우트 계약을 확인한다.
- `qa:browser:manifest`: Browser Use 세션에서 import할 runner URL과 QA 대상 목록을 `.ac/browser-use-qa/manifest.json`으로 생성한다.
- 리포트는 `.ac/browser-use-qa/` 아래에 생성된다. `.ac/`는 gitignore 대상이다.

`qa:auto`는 DB 데이터를 초기화하지 않는다. 기존 Docker volume을 유지한 채 컨테이너만 재시작하고 `prisma db push`와 `qa:seed`로 현재 schema와 최소 QA 마스터 데이터를 맞춘다. Docker daemon이 꺼져 있으면 Windows에서는 Docker Desktop 자동 기동을 시도한다.
QA 종료 시 스크립트가 띄운 로컬 API 서버는 정리하지만, PostgreSQL/Redis 컨테이너는 다음 실행 속도를 위해 실행 상태로 둔다.

## Browser Use 실행 셀

Browser Use 런타임 초기화 후 아래 runner를 import해서 실행한다.

```js
const { runAeternaBrowserQa } = await import("file:///C:/fork/aeterna-chronicle-web2/scripts/browser-use-qa/browser-use-session.mjs");
await runAeternaBrowserQa({
  agent,
  display,
  baseUrl: "http://127.0.0.1:5173",
  showScreenshots: false,
  keepTab: false,
});
```

검증 범위는 `scripts/browser-use-qa/scenarios.json`이 SSOT다.

## 현재 시나리오

| id | 경로 | 목적 |
|---|---|---|
| `client.home.boot` | `/` | 게임 클라이언트 부팅 HTML과 기본 컨테이너 확인 |
| `style.design-system` | `/style-guide.html` | 디자인 시스템 스타일 가이드 확인 |
| `style.battle-hud` | `/battle-style-guide.html` | 전투 HUD 스타일 가이드 확인 |
| `style.tutorial-onboarding` | `/tutorial-style-guide.html` | 튜토리얼 온보딩 UI 토큰·코치마크 확인 |
| `compat.cross-browser` | `/compat-check.html` | 크로스브라우저 호환성 검증 페이지 확인 |

## 실패 기준

- HTTP 200이 아닌 정적 라우트
- `<title>` 계약 불일치
- 필수 HTML 문자열 누락
- Browser Use DOM snapshot에서 필수 텍스트 누락
- 필수 CSS selector 0건
- 브라우저 콘솔 error 1건 이상

## 확장 규칙

새 QA 화면을 추가할 때는 `scenarios.json`에만 먼저 등록한다. Browser Use runner와 preflight는 같은 시나리오 SSOT를 공유하므로 중복 구현을 만들지 않는다.
