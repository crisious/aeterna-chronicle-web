# 🌸 `client/src/accessibility/` — 접근성 모듈 SSOT

> 작성: 진채봉 (Editor) · 흩어진 악보를 한데 모아 곡조를 맞추겠사옵니다
> 스프린트: Auto — WCAG 2.1 AAA 자동 접근성 감사
> 단계: 에셋 (모듈 README 골격)
> 연계 문서:
> - PRD: `docs/release/prd_a11y-aaa-audit.md`
> - 아키텍처: `docs/release/plan_a11y-aaa-audit-architecture.md`
> - 사용자 가이드: `docs/release/a11y-user-guide.md`
> - 에러 카피: `docs/release/a11y-error-messages.md`
> - 리포트 템플릿: `docs/release/a11y-audit-report-template.md`

---

## 0. 한 문단 요약

이 도량(道場) 은 에테르나 크로니클의 **런타임 접근성 자산**을 모아 둔 곳입니다. 색맹 필터, 포커스 매니저, 자막, 모션 감소, ARIA 라벨 SSOT 가 모두 여기에서 출발하며, 빌드타임 자동 감사(`scripts/a11y/audit.ts`) 가 이 모듈들을 **소비** 합니다. 모듈을 추가·수정할 때는 본 README 의 "확장 규약" 절을 반드시 따라 주십시오.

---

## 1. 모듈 구성

```
accessibility/
├─ AccessibilityManager.ts     # 설정 허브 (701 LOC) — 모든 토글의 단일 진입점
├─ AccessibilityAudit.ts       # 자동 감사 진입점 — Build 단계에 확장 예정
├─ colorblind/
│  ├─ ColorBlindFilter.ts      # LMS 기반 4종 시뮬 필터
│  └─ PatternOverlay.ts        # 게이지 보강 패턴 오버레이
├─ screen_reader/
│  ├─ AriaLabelMap.ts          # ARIA 라벨 SSOT (컨트랙트 테스트 대상)
│  └─ FocusManager.ts          # 포커스 트랩·트래버스
├─ display/                    # 고대비·UI 스케일
├─ motion/                     # 모션 감소·자동 진행
└─ audio/                      # 자막·시각화 큐·사운드 별칭
```

> 신규 하위 모듈을 만들 때는 **반드시** `AccessibilityManager` 의 옵션 스키마와 `AriaLabelMap` 등록을 동반하옵소서.

---

## 2. 빠른 시작 (Quick Start)

```ts
import { AccessibilityManager } from "@/accessibility/AccessibilityManager";

const a11y = AccessibilityManager.getInstance();

// 색맹 시뮬 토글
a11y.colorblind.setMode("deuteranopia");

// 고대비 ON
a11y.display.setHighContrast(true);

// 모션 감소 — OS 추종 + 강제 ON
a11y.motion.setReduced("force-on");

// ARIA 라벨 등록 (신규 컴포넌트 추가 시)
a11y.screenReader.aria.register("inventory.slot.{n}", {
  label: (n: number) => `인벤토리 슬롯 ${n}`,
  role: "button",
});
```

---

## 3. 자동 감사와의 계약

| 모듈 | 계약 | 검증 Probe |
|------|------|------------|
| `ColorBlindFilter` | 4종 모드에 대해 `.toCanvas()` 노출 | `ColorBlindSim` |
| `PatternOverlay` | 게이지마다 `data-a11y-pattern` 속성 보장 | `Axe` (custom rule) |
| `AriaLabelMap` | 모든 인터랙션 요소 라벨 등록 | `AriaContract` |
| `FocusManager` | `Tab`/`Shift+Tab` 순환 + 트랩 해제 가능 | `KeyboardTraverser` |
| `display.HighContrast` | 본문 7:1 / 큰 글자 4.5:1 | `ColorContrast` |

> 계약 위반은 머지 게이트에서 차단됩니다. 회피하지 마시고, 본 README §4 의 확장 규약을 따라 주십시오.

---

## 4. 확장 규약 (필수)

신규 인터랙션 요소·씬·컴포넌트를 추가할 때:

1. **`AriaLabelMap.register()`** — 라벨·역할·설명 등록 (생략 시 `AriaContract` 위반).
2. **`PatternOverlay`** — 색상으로 의미를 전달하는 모든 요소에 패턴/아이콘 병기.
3. **`FocusManager.attach()`** — 모달·다이얼로그는 트랩 후 닫힐 때 해제.
4. **i18n 키** — 새 메시지는 `docs/release/a11y-error-messages.md` SSOT 에 먼저 등록 후 i18n JSON 반영.
5. **자동 감사 케이스** — 신규 화면은 `tests/e2e/a11y/screens.json` 에 등록.

---

## 5. 릴리스 게이트와의 연결

| launch_checklist 항목 | 책임 모듈 | 게이트 신호원 |
|----------------------|-----------|---------------|
| §2.17 자동 접근성 감사 | 본 모듈 전체 + `scripts/a11y/audit.ts` | `tests/reports/a11y/summary.json` |
| §4.1 화면 낭독기 호환 | `screen_reader/` | NVDA·JAWS·VoiceOver 수동 + AriaContract |
| §4.2 색맹 모드 | `colorblind/` | ColorBlindSim 스냅샷 |
| §4.3 키보드 풀-내비 | `screen_reader/FocusManager` | KeyboardTraverser |
| §4.4 VPAT 2.4 | 본 모듈 + `docs/legal/vpat-2.4.md` | `summary.wcagLevel` 자동 갱신 |

---

## 6. 향후 작업 (Build 단계 인계)

- [ ] `AccessibilityAudit.ts` — 5종 Probe 통합 진입점으로 확장
- [ ] `AriaLabelMap` — 컨트랙트 테스트 (`tests/unit/a11y/ariaContract.test.ts`)
- [ ] `colorblind/` — 시뮬레이션 스냅샷 훅 (Playwright 통합)
- [ ] `screen_reader/FocusManager` — 자동 트래버스 점검 헬퍼 노출
- [ ] `audio/` — 사운드 → 시각 큐 모듈화 (현재 인라인)

---

## 변경 이력

| 버전 | 날짜 | 변경 | 작성 |
|------|------|------|------|
| 0.1 (뼈대) | 2026-04-26 | 초안 — 모듈 트리 + 계약 + 확장 규약 + 게이트 매핑 | 진채봉 |
