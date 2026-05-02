# README §📱 모바일 반응형 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-29
> 적용 위치: `README.md` §🛡️ 데이터 검증 ↔ §📁 문서 링크 사이
> 상위 가이드: `docs/release/mobile-responsive-user-guide.md`

---

## 0. 적용 절차 (계섬월 Build 인계)

1. 본 골격을 그대로 `README.md` 해당 위치에 삽입.
2. 빠른 시작 3명령은 `package.json scripts`와 1:1 매칭되어야 함.
3. 약속 4지표 임의 갱신 금지 — 백능파(Strategy) 승인 필수.
4. 상단 배지 2종(`Viewport 4/4` · `Touch p95 ≤100ms`) 추가.

---

## 1. 삽입할 README 절 — 그대로 복사

```markdown
## 📱 모바일 반응형 (Mobile Responsive)

Phaser.js 데스크탑(1920×1080) 우선 개발 위에 모바일 360~430 너비를 얹사옵나이다. 4 게이트로 한눈에.

### 한눈 약속 (4지표)

| 지표 | 임계 |
|------|------|
| **Viewport 시나리오 동작률** | 360/375/414/430 4종에서 이동·대화·전투·세이브 **100%** |
| **터치 인식 지연** | **p95 ≤ 100ms** (탭/드래그/롱프레스) |
| **본문 폰트** | **≥ 14px** (시스템 메시지 ≥ 12px 예외) |
| **Safe Area 침범** | 노치/홈 인디케이터 영역 **0건** |

### 빠른 시작

```bash
# 4 viewport × 4 시나리오 = 16건 자동 검증
npm run mobile:viewport

# 터치 지연 100회 측정 (p95 ≤ 100ms 검사)
npm run mobile:touch-latency

# 4 게이트 일괄 실행 (CI 진입점)
npm run mobile:gate
```

### 4 게이트 흐름

| 순서 | 게이트 | 검사 항목 |
|------|--------|----------|
| 1 | **Viewport** | mob-360/375/414/430 레이아웃 잘림·시나리오 16건 |
| 2 | **Touch Latency** | pointerdown→로직 반응 p95 측정 |
| 3 | **UI Variant** | HUD·메뉴·전투 UI safe-area-inset 보정 |
| 4 | **Font Audit** | Phaser Text fontSize ≥ 14px 전수 |

### 자세한 가이드

- [모바일 반응형 사용자 가이드](docs/release/mobile-responsive-user-guide.md) — 9개 절 + FAQ
- [에러 메시지 카피 SSOT](docs/release/mobile-responsive-error-messages.md) — 16 슬롯 ko/en
- [PR / 커밋 컨벤션](docs/release/mobile-responsive-pr-template.md) — 7 스코프·봉인 4항
- [DESIGN.md §8 반응형 브레이크포인트](DESIGN.md#8-반응형-브레이크포인트) — 디자인 토큰 SSOT

### Ship-gate 3-AND (예고)

본 모바일 게이트는 출시 전 다음 3-AND 조건의 한 축:

```
mobile:gate ∧ save:gate ∧ data:validate = ALL PASS → ship
```

세 조건 중 하나라도 FAIL이면 출시 차단. 백능파 승인 없이 우회 불가.
```

---

## 2. 상단 배지 — 추가할 마크다운

`README.md` 상단 배지 묶음 끝에 다음 2줄 추가:

```markdown
[![Mobile Viewport](https://img.shields.io/badge/Mobile%20Viewport-4%2F4%20Pass-brightgreen?style=for-the-badge)](#-모바일-반응형-mobile-responsive)
[![Touch Latency](https://img.shields.io/badge/Touch%20Latency-p95%20%E2%89%A4100ms-success?style=for-the-badge)](#-모바일-반응형-mobile-responsive)
```

배지 갱신 정책:

- 4/4 미만 → 배지 색 `red`
- p95 > 100ms → 배지 표기 실측치로 갱신 + 색 `orange` 전환
- 회복 후 즉시 `brightgreen`/`success`로 환원, 백능파 승인 없이 임계치 자체는 변경 금지.

---

## 3. 봉인 항목 (이소화 비협상)

| 봉인 | 내용 |
|------|------|
| 1 | 약속 4지표 수치 (100% / ≤100ms / ≥14px / 0건) — 임의 갱신 금지 |
| 2 | 4 게이트 순서 (Viewport → Touch → UI → Font) — 재배치 금지 |
| 3 | 빠른 시작 3명령 (`mobile:viewport` / `mobile:touch-latency` / `mobile:gate`) — 이름 변경 금지 |
| 4 | Ship-gate 3-AND (`mobile:gate ∧ save:gate ∧ data:validate`) — AND 조건 해제 금지 |

---

## 4. 변경 절차 — SSOT 위계

`DESIGN.md §⚠️ 디자인 토큰 SSOT 위계`와 동일한 단방향 흐름:

```
1차 SSOT  : docs/release/mobile-responsive-user-guide.md (사람이 읽는 정본)
        ↓
2차 미러  : README.md §📱 모바일 반응형 (본 골격)
        ↓
3차 코드  : client/src/config/responsive-tokens.ts
        ↓
4차 런타임 : client/src/utils/safe-area.ts, touch-handler.ts
        ↓
CSS 미러  : client/src/styles/responsive.css (env(safe-area-inset-*) 정의)
```

**금지** — 코드 → 문서 역방향 갱신, 4차 런타임 단독 변경.

---

## 5. 다음 단계 (Build → Review → Test → Ship)

- [ ] `README.md`에 본 §📱 모바일 반응형 절 삽입 (계섬월 Build 단계)
- [ ] 상단 배지 2종 추가 (계섬월)
- [ ] `package.json` scripts 5종 등록 (`mobile:viewport`, `mobile:touch-latency`, `mobile:font-audit`, `mobile:safe-area`, `mobile:gate`)
- [ ] `client/src/constants/mobile_responsive_messages.ts` 카피 4슬롯 (계섬월, REDUCTION 스코프)
- [ ] CI workflow에 `mobile:gate` 게이트 추가 (적경홍 QA)
- [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처 → CHANGELOG 본 항목 _TBD_ 슬롯 충진

---

> 본 문서가 README 골격 SSOT. 약속 수치 변경 시 §1 표 + 사용자 가이드 §0 표 동시 갱신, 백능파 승인 메모 PR 본문 첨부.
