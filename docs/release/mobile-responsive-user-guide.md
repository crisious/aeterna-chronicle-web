# 에테르나 크로니클 — 모바일 반응형 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-29
> 스코프: Phaser.js 데스크탑 우선(1920×1080) → 모바일(360~430) 적응
> 참조: `docs/release/mobile-responsive-error-messages.md`, `docs/release/mobile-responsive-readme-skeleton.md`

---

## 0. 한눈 약속 (4지표 SSOT)

| 약속 | 임계 | 측정 위치 |
|------|------|----------|
| **Viewport 시나리오 동작률** | 360/375/414/430 4종에서 **이동·대화·전투·세이브 100%** | `npm run mobile:viewport` |
| **터치 인식 지연** | **≤ 100ms** (탭→클릭 / 드래그→이동 / 롱프레스→메뉴) | `npm run mobile:touch-latency` |
| **최소 폰트 크기** | 본문 텍스트 **≥ 14px** (시스템 메시지 ≥ 12px 예외) | `npm run mobile:font-audit` |
| **Safe Area 회피** | 노치/홈 인디케이터 영역 침범 **0건** | `npm run mobile:safe-area` |

> 본 표가 1차 SSOT — 수치 갱신 시 백능파(Strategy) 승인 필수, `README.md §📱 모바일 반응형` 동시 갱신.

---

## 1. 한 손 흐름도 — 4 게이트

```
[Viewport 검증]
   │  layout shift, 가로/세로 잘림 검사
   ▼
[터치 매핑]
   │  pointerdown → tap/drag/longpress 분기
   ▼
[UI 변형]
   │  HUD·메뉴·전투 UI safe area 보정
   ▼
[가독성 검증]
   │  fontSize ≥ 14px, contrast ≥ 4.5:1
   ▼
PASS → ship-gate 통과
```

---

## 2. Viewport 4종 — 검증 매트릭스

| 코드명 | 너비 × 높이 (CSS px) | 대표 기기 | DPR | safe-area-inset (top/bottom) |
|--------|---------------------|----------|-----|------------------------------|
| `mob-360` | 360 × 640 | Galaxy S8, 보급형 안드로이드 | 3 | 24 / 0 |
| `mob-375` | 375 × 812 | iPhone X/11/12 mini | 3 | 44 / 34 |
| `mob-414` | 414 × 896 | iPhone 11/XR | 2 | 44 / 34 |
| `mob-430` | 430 × 932 | iPhone 14 Pro Max, 16 Pro | 3 | 59 / 34 |

**검증 시나리오 4종 (각 viewport × 4 = 16 케이스)**

| 시나리오 | 검증 항목 |
|---------|----------|
| **이동** | 월드맵 드래그, 미니맵 표시, 이동 속도 일관성 |
| **대화** | NPC 말풍선 너비 ≤ viewport-32, 자동 줄바꿈, 다음 버튼 터치 영역 ≥ 44×44 |
| **전투** | ATB 게이지·HP/MP 바·스킬 6슬롯 모두 표시, 화면 가림 없음 |
| **세이브** | 슬롯 5종 스크롤 가능, 확인 모달 safe area 회피 |

---

## 3. 터치 입력 매핑 — 제스처 3종

| 제스처 | Phaser 매핑 | 디바운스 | 시각 피드백 |
|--------|------------|----------|-----------|
| **탭** (≤ 200ms, 이동 < 8px) | `pointerup` → `click` | 50ms | 0.1초 ripple |
| **드래그** (이동 ≥ 8px) | `pointermove` → 카메라/캐릭터 이동 | — | 커서 trail |
| **롱프레스** (≥ 500ms 정지) | `pointerdown` 타이머 → 컨텍스트 메뉴 | 500ms | 진동 (가능 시) + 외곽선 |

**금지 사항**

- `mousedown` / `mouseup` 단일 사용 → 모바일에서 무시되는 결사옵니다. 반드시 `pointer*` 계열로 통일.
- `dblclick` 사용 금지 → 터치 환경에서 의도치 않은 줌 발생.
- 터치 영역 < 44×44px 금지 (Apple HIG · Material 권고).

---

## 4. HUD·메뉴·전투 UI 모바일 변형

### 4.1 HUD

| 영역 | 데스크탑 | 모바일 변형 |
|------|---------|-----------|
| **HP/MP 바** | 좌상단 280×40 | 좌상단 (viewport-32)×24, safe-area-inset-top 만큼 아래로 |
| **미니맵** | 우상단 200×200 | 우상단 120×120, safe-area-inset-top 보정 |
| **퀘스트 트래커** | 우중단 240×120 | 펼침/접힘 토글 (기본 접힘), 펼치면 viewport-32 너비 |

### 4.2 메뉴

- 데스크탑: 8칸 그리드 메뉴 (인벤토리·스킬·파티·맵·세이브·옵션·도움말·종료)
- 모바일: 2×4 그리드 (각 셀 ≥ 88×88px), 하단 safe-area-inset-bottom 보정

### 4.3 전투 UI

| 요소 | 데스크탑 | 모바일 변형 |
|------|---------|-----------|
| **ATB 게이지** | 화면 하단 4개 가로 정렬 | 화면 우측 4개 세로 정렬 |
| **스킬 슬롯** | 하단 6슬롯 (각 80×80) | 하단 6슬롯 (각 56×56), safe-area-inset-bottom 보정 |
| **타겟 인디케이터** | 마우스 호버 | 탭 → 0.5초 하이라이트 후 확정 탭 |

---

## 5. 폰트 가독성 정책

| 분류 | 최소 크기 | 권장 크기 | 비고 |
|------|----------|----------|------|
| **본문 (대화·설명)** | 14px | 16px | 0.5σ 이상 작으면 ERROR |
| **버튼 라벨** | 14px | 14px | 짝수 단위 강제 |
| **시스템 메시지** | 12px | 14px | 일시적 토스트만 12px 허용 |
| **숫자 (HP/MP/데미지)** | 14px | 18px | 가변폭 폰트 사용, 한 자리 흔들림 ≤ 1px |

**측정 방법**

```bash
npm run mobile:font-audit
# 모든 Phaser Text 객체를 순회, fontSize < 14px 인 노드 리스트업
# 출력: path:line:objectName → 현재값 → 권고값
```

---

## 6. Safe Area · 노치 회피

```css
/* CSS 미러 — viewport-fit=cover 전제 */
:root {
  --sa-top: env(safe-area-inset-top, 0px);
  --sa-bottom: env(safe-area-inset-bottom, 0px);
  --sa-left: env(safe-area-inset-left, 0px);
  --sa-right: env(safe-area-inset-right, 0px);
}
```

**Phaser 내부 변환**

```ts
// client/src/utils/safe-area.ts
export const getSafeArea = (): SafeArea => ({
  top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sa-top')),
  bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sa-bottom')),
  left: 0,
  right: 0,
});
```

**검증 모드**

```bash
npm run mobile:safe-area
# safe-area 영역 내부에 Phaser 오브젝트 침범 시 ERROR
# 허용: 배경 이미지(zIndex < 0)만 침범 가능
```

---

## 7. npm 명령어 (Build → CI 인계)

| 명령 | 목적 |
|------|------|
| `npm run mobile:viewport` | 4종 viewport에서 시나리오 16건 자동 실행 |
| `npm run mobile:touch-latency` | pointerdown→click 지연 100회 측정, p95 ≤ 100ms 검사 |
| `npm run mobile:font-audit` | Phaser Text 객체 fontSize 전수 검사 |
| `npm run mobile:safe-area` | safe-area-inset 영역 침범 검사 |
| `npm run mobile:gate` | 위 4 게이트 일괄 실행 (CI 진입점) |

---

## 8. 자주 묻는 질문 (FAQ)

**Q1. 데스크탑 1920×1080 게임플레이가 깨지지 않을까요?**
A. 깨지지 않사옵니다. `mobile:` 변형은 `window.innerWidth ≤ 480 && 'ontouchstart' in window` 조건에서만 활성화되옵니다.

**Q2. 가로/세로 회전을 모두 지원해야 하나요?**
A. 본 스프린트는 **세로 우선**이옵니다. 가로 모드는 다음 스프린트로 미루옵나이다.

**Q3. 태블릿(≥ 768)은 어떻게 되나요?**
A. 데스크탑 레이아웃을 그대로 사용하옵나이다. 토픽 스코프 360~430만 본 가이드의 적용 대상이옵니다.

**Q4. 노치가 있는 기기와 없는 기기를 어떻게 구별하나요?**
A. `env(safe-area-inset-top)`이 0이 아니면 노치 있음으로 판정하옵니다. 별도 user-agent 분기는 사용하지 않사옵니다.

**Q5. Phaser 캔버스 자체 크기는 어떻게 정하나요?**
A. `Phaser.Scale.RESIZE` 모드로 viewport에 맞춰 자동 리사이즈하옵나이다. 게임 좌표는 `1920×1080` 기준 그대로 두고, 카메라 zoom과 UI 컨테이너 scale로 보정하옵니다.

**Q6. 터치 지연 100ms는 어디서 측정하나요?**
A. `pointerdown` 발생부터 게임 로직 첫 반응(예: 캐릭터 이동 시작)까지를 측정하옵나이다. 렌더링 프레임 1회(16.7ms)는 포함하옵니다.

**Q7. 키보드/게임패드 입력은 어떻게 되나요?**
A. 모바일 모드에서도 외부 입력은 살아있사옵니다. 터치는 추가 입력 경로로 병행되옵니다.

---

## 9. 참고 문서

- `README.md §📱 모바일 반응형` — 사용자 진입점 (본 가이드의 메아리)
- `docs/release/mobile-responsive-error-messages.md` — 에러 메시지 카피 SSOT
- `docs/release/mobile-responsive-pr-template.md` — PR/커밋 컨벤션
- `docs/release/mobile-responsive-readme-skeleton.md` — README 골격
- `docs/release/mobile-responsive-changelog-draft.md` — CHANGELOG 항목 초안
- `DESIGN.md §8. 반응형 브레이크포인트` — 디자인 토큰 SSOT

---

> 본 문서가 **1차 SSOT** (사람이 읽는 정본). 약속 4지표 임의 갱신 금지 — 백능파(Strategy) 승인 필수.
> 변경 이력은 본 문서 상단 작성일 갱신과 함께 CHANGELOG 항목에 기록하옵나이다.
