# 🌸 접근성 자동 감사 CLI 사용 가이드 v1.0

> 작성: 진채봉 (Editor) · 흩어진 명령어를 한 줄 운율로 엮었사옵니다
> 스프린트: Auto — WCAG 2.1 AAA 자동 접근성 감사
> 단계: 에셋 (Build 인수용 — `npm run a11y:audit` 사용법 SSOT)
> 연계: `plan_a11y-aaa-audit-architecture.md` · `qa-plan_a11y-aaa-audit.md` · `a11y-audit-report-template.md` · `launch_checklist.md §2.17`
> 노출 위치: 본 문서 · `tests/a11y/README.md` (Build 단계 심볼릭 인계)

---

## 목차

1. [이 문서의 쓰임](#1-이-문서의-쓰임)
2. [한눈에 보는 명령어](#2-한눈에-보는-명령어)
3. [전제 조건](#3-전제-조건)
4. [전체 감사 — `npm run a11y:audit`](#4-전체-감사--npm-run-a11yaudit)
5. [부분 감사 — Probe 단위 실행](#5-부분-감사--probe-단위-실행)
6. [출력물과 위치](#6-출력물과-위치)
7. [머지 게이트와 종료 코드](#7-머지-게이트와-종료-코드)
8. [CI 연동 스니펫](#8-ci-연동-스니펫)
9. [문제 해결](#9-문제-해결)

---

## 1. 이 문서의 쓰임

본 문서는 **계섬월(Engineer)** 과 **적경홍(QA)** 이 동일한 명령으로 동일한 결과를 얻을 수 있도록 작성된 CLI SSOT 입니다. 다른 문서에 흩어진 명령은 모두 본 문서를 참조하도록 통일하옵소서.

> 🪧 **표기 약속**
> - `$` 는 프로젝트 루트(`aeterna-chronicle-web2/`) 에서의 실행을 뜻하옵니다.
> - 🟢 = 머지 가능 / 🟡 = AAA 추세 감시 / 🔴 = 머지 차단 (`launch_checklist §2.17` 참조)

---

## 2. 한눈에 보는 명령어

| 목적 | 명령 | 종료 코드 의미 |
|------|------|--------------|
| 전체 감사 (5종 Probe) | `$ npm run a11y:audit` | 0 = 🟢 / 1 = 🔴 AA / 2 = 🟡 AAA |
| 색맹 시뮬만 | `$ npm run a11y:colorblind` | 색맹 4종 차이만 검사 |
| 키보드 트래버스만 | `$ npm run a11y:keyboard` | 포커스 트랩·탭 순서만 검사 |
| 스크린 리더 계약만 | `$ npm run a11y:aria` | ARIA 라벨·역할만 검사 |
| 콘트라스트만 | `$ npm run a11y:contrast` | 7:1 / 4.5:1 만 검사 |
| 리포트 보기 | `$ npm run a11y:report` | `tests/reports/a11y/index.html` 자동 오픈 |
| 베이스라인 갱신 | `$ npm run a11y:baseline` | 색맹 4종 스냅샷 재생성 |

> 모든 명령은 `package.json#scripts` 에 정의되어 있사옵니다. 별칭 변경 시 본 문서 동시 갱신.

---

## 3. 전제 조건

| 항목 | 요구 | 확인 명령 |
|------|------|---------|
| Node.js | ≥ 20.10 LTS | `$ node -v` |
| npm | ≥ 10 | `$ npm -v` |
| 의존성 설치 | `node_modules/` 존재 | `$ npm ci` |
| 빌드 산출물 | `client/dist/` 최신 | `$ npm run build:client` |
| 헤드리스 브라우저 | Playwright Chromium | `$ npx playwright install chromium` |

> 🟡 CI 첫 실행 시 Playwright 브라우저 캐시(약 180 MB)를 받습니다. 다음 실행부터는 캐시 적중.

---

## 4. 전체 감사 — `npm run a11y:audit`

```bash
$ npm run a11y:audit
```

### 실행 흐름

```
1. client/dist 빌드 검증 (없으면 빌드 트리거)
2. Playwright Chromium 기동 (headless)
3. 5종 Probe 순차 실행
   ├─ Axe (정적 룰 350+)
   ├─ ColorContrast (7:1 / 4.5:1)
   ├─ ColorBlindSim (Protan/Deutan/Tritan/Achroma 4종)
   ├─ KeyboardTraverser (Tab·Shift+Tab·Enter·Esc)
   └─ AriaContract (라벨·역할·라이브 리전)
4. tests/reports/a11y/summary.json 출력
5. tests/reports/a11y/index.md / index.html 렌더 (Mustache → 템플릿)
6. 머지 게이트 판정 → 종료 코드 반환
```

### 주요 옵션

| 옵션 | 기본 | 의미 |
|------|------|------|
| `--scope=<glob>` | `client/dist/**/*.html` | 검사 대상 페이지 한정 |
| `--profile=<name>` | `aaa` | `aa` / `aaa` / `vpat` 프로파일 전환 |
| `--fail-on=<level>` | `aa` | `aa` 위반만 차단 / `aaa` 도 차단 |
| `--update-baseline` | off | 색맹 스냅샷 재생성 (의도적 변경 시만) |
| `--quiet` | off | 진행 로그 억제, 종료 코드만 반환 |

### 실행 예

```bash
# 1) 머지 직전 — AAA 까지 차단 모드
$ npm run a11y:audit -- --fail-on=aaa

# 2) 특정 화면만 빠르게
$ npm run a11y:audit -- --scope="client/dist/battle/**"

# 3) VPAT 갱신용
$ npm run a11y:audit -- --profile=vpat
```

---

## 5. 부분 감사 — Probe 단위 실행

> 디버깅 시 호흡을 짧게 가져가시오. 각 Probe 는 독립 실행 가능합니다.

```bash
$ npm run a11y:colorblind   # 색맹 4종 시뮬레이션 + 시각 회귀 (임계 3%)
$ npm run a11y:keyboard     # 포커스 트랩·논리적 탭 순서·스킵 링크
$ npm run a11y:aria         # ARIA 라벨/역할/라이브 리전/대체 텍스트
$ npm run a11y:contrast     # 7:1 (본문) / 4.5:1 (대형 텍스트) / 3:1 (UI)
```

각 Probe 는 `tests/reports/a11y/<probe>/result.json` 단독 산출물을 남깁니다. 전체 감사가 이를 머지하여 `summary.json` 을 만듭니다.

---

## 6. 출력물과 위치

| 경로 | 형식 | 용도 |
|------|------|------|
| `tests/reports/a11y/summary.json` | JSON (머신 리더블) | 머지 게이트 · CI 판정 SSOT |
| `tests/reports/a11y/index.md` | Markdown | 본 문서 템플릿 충진본 — PR 본문 첨부용 |
| `tests/reports/a11y/index.html` | HTML | 사람이 보기 좋은 리포트 (스크린샷 인라인) |
| `tests/reports/a11y/snapshots/<mode>/` | PNG | 색맹 4종 시각 회귀 베이스라인 |
| `tests/reports/a11y/<probe>/result.json` | JSON | Probe 단독 결과 |

> 🪧 본 디렉터리는 `.gitignore` 에 등록되어 있되, **CI 아티팩트로 14일 보존** 합니다 (Build 단계에서 워크플로 추가).

---

## 7. 머지 게이트와 종료 코드

| 코드 | 등급 | 의미 | 처치 |
|------|------|------|------|
| `0` | 🟢 PASS | AA·AAA 모두 통과 | 머지 허용 |
| `1` | 🔴 BLOCK | AA 위반 ≥ 1 | **즉시 차단** — 본 PR 머지 금지 |
| `2` | 🟡 WARN | AAA 위반 ≥ 1 (AA 0건) | 머지 가능, `launch_checklist §2.17` 추세 보고 |
| `3` | 🟠 ERROR | 감사 도구 자체 오류 | 인프라 점검 (두련사 인계) |

> AAA 위반 한도는 **누적 ≤ 5건** 까지 허용. 6건째 발생 시 다음 스프린트 P0 으로 자동 승격하옵니다.

---

## 8. CI 연동 스니펫

### GitHub Actions 예시 (Build 단계 작성용 초안)

```yaml
- name: A11y Audit (WCAG 2.1 AAA)
  run: npm run a11y:audit -- --fail-on=aa --quiet
  continue-on-error: false

- name: Upload A11y Report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: a11y-report-${{ github.sha }}
    path: tests/reports/a11y/
    retention-days: 14

- name: Comment PR with summary
  if: github.event_name == 'pull_request'
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    path: tests/reports/a11y/index.md
```

> 본 스니펫은 **초안** 입니다. 실제 워크플로 파일 작성은 두련사(SRE) 인수 사항이옵니다.

---

## 9. 문제 해결

| 증상 | 원인 후보 | 처치 |
|------|---------|------|
| `Error: client/dist not found` | 빌드 누락 | `$ npm run build:client` 후 재시도 |
| 색맹 스냅샷 전부 ❌ | 베이스라인 누락 | `$ npm run a11y:baseline` 1회 실행 |
| `Timeout 30s exceeded` | 헤드리스 부하 | `CI=true` 환경변수로 재시도, 또는 `--scope` 좁히기 |
| AAA 위반 6건째 발생 | 추세 임계 초과 | `launch_checklist §2.17` 갱신 → 다음 스프린트 P0 |
| Windows 한글 경로 깨짐 | UTF-8 미설정 | `chcp 65001` 후 재시도 |

> 본 가이드에 적힌 명령어가 실제 `package.json` 과 어긋나면 **본 문서가 1차 SSOT** 이옵니다. Build 단계에서 스크립트 별칭을 본 문서에 맞추어 정의하소서.
