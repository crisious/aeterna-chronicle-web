# 테스트 디자인 시스템 v1.0 — 회귀 테스트 SSOT

> 작성: 가춘운 (CMO/디자인)
> 작성일: 2026-04-26
> 스코프: UI·인벤토리·세이브 E2E/통합 테스트의 시각 검증 기준
> 대상 스프린트: `1.0.0-rc.4` CBT 안정성 확보
> 참조: `DESIGN.md v1.0`, `client/src/styles/design-system.css`, `client/src/ui/design-tokens.ts`

---

## 0. 왜 이 문서인가

회귀 테스트 38개가 **Fastify mock 서버**에만 머무르고 있어요. 실제 픽셀이 흔들리면 테스트는 통과하는데 사용자는 깨진 화면을 봅니다 😱

**해결**: 테스트가 참조할 **디자인 토큰 SSOT**를 단일 문서로 고정 → 토큰이 바뀌면 테스트가 깨져서 회귀를 알려주도록 묶어둡니다.

---

## 1. 테스트 대상별 시각 계약 (Visual Contract)

### 1.1 InventoryUI

| 시각 요소 | 토큰 | 테스트 검증 포인트 |
|---|---|---|
| 패널 배경 | `--bg-panel` `#16213E` | `getComputedStyle` 일치 |
| 그리드 셀 | `40×40px`, `gap: 4px` | 셀 박스모델 정합 |
| 등급 보더 | `--rarity-{common\|uncommon\|rare\|epic\|legendary\|mythic\|ether}` | 7색 회귀 매트릭스 |
| 빈 슬롯 호버 | `--bg-hover` `#4A4A5A` | hover state DOM 검증 |
| 드래그 중 슬롯 | `opacity: 0.5`, `cursor: grabbing` | 드래그 시뮬레이션 후 style 검증 |
| 장착 슬롯 강조 | `border: 2px solid --border-accent` (`#FFD700`) | 장착 후 보더 색 검증 |
| 툴팁 | `font-mono`, `--text-primary` 14px | 툴팁 출현 + 폰트 체크 |
| 수량 배지 | 우하단, `--text-accent` 12px | 위치+컬러 |

**E2E 시나리오 검증 시각 체크리스트:**
- [ ] 드래그 → 드롭 시 슬롯 보더 색이 등급에 맞게 유지됨
- [ ] 장착 시 1프레임 내 금색 글로우 발생 (CSS `transition: 200ms`)
- [ ] 소비 시 슬롯 fade-out (`opacity: 1 → 0`, 300ms)
- [ ] 인벤토리 풀(full) 상태에서 알림 토스트 `--accent-danger` 색 노출

### 1.2 SaveService UI 피드백

| 상태 | 토큰 | UX 요구 |
|---|---|---|
| 저장 중 | `--accent-ether` `#89CFF0` 스피너 | 200ms 이상 시에만 노출 (깜빡임 방지) |
| 저장 성공 | `--accent-success` `#2ECC71` + 체크 아이콘 | 1.5초 후 자동 fade |
| 저장 실패 | `--accent-danger` `#FF4444` + 재시도 버튼 | 영구 노출, 사용자 액션 필요 |
| 자동 저장 | `--text-secondary` `#A0A0A0` 우상단 작은 텍스트 | 비침습 (3초 fade) |
| ITP 7일 경고 | `--text-warning` 토스트 | i18n `safariITPWarning` 트리거 |
| 용량 초과 | `--accent-danger` 모달 | i18n `storageQuotaExceeded` |

### 1.3 공통 HUD/모달

| 영역 | 토큰 | 비고 |
|---|---|---|
| HP 게이지 | `--gauge-hp-full` → `--gauge-hp-low` (50% 임계) | 수치 vs 색 상태 매트릭스 검증 |
| MP 게이지 | `--gauge-mp-start` → `--gauge-mp-end` 그라디언트 | linear-gradient 정합 |
| 모달 dim | `rgba(13,13,26,0.85)` | `--bg-abyss` × 0.85 |
| 포커스 링 | `outline: 2px solid --border-accent` | a11y 키보드 네비게이션 |

---

## 2. 테스트가 참조할 토큰 SSOT (직접 import)

```typescript
// tests/fixtures/design-tokens.ts (신규 — 계섬월에게 인계)
import { DESIGN_TOKENS } from '@/ui/design-tokens';

export const VISUAL_CONTRACT = {
  rarity: {
    common:    '#808080',
    uncommon:  '#2ECC71',
    rare:      '#3498DB',
    epic:      '#9B59B6',
    legendary: '#F39C12',
    mythic:    '#E74C3C',
    ether:     '#89CFF0',
  },
  saveState: {
    saving:  '#89CFF0',
    success: '#2ECC71',
    error:   '#FF4444',
    auto:    '#A0A0A0',
  },
  inventory: {
    cellSize: 40,
    gap: 4,
    fadeMs: 300,
    glowMs: 200,
  },
} as const;
```

**핵심 원칙**: 테스트는 **하드코딩된 색/사이즈를 절대 쓰지 않고**, 위 SSOT를 import 합니다. 토큰이 바뀌면 SSOT만 갱신, 테스트 전체가 자동 정합.

---

## 3. 회귀 차단 매트릭스

| 카테고리 | 케이스 수 | 우선순위 |
|---|---|---|
| 인벤토리 등급 색 회귀 | 7 (등급별) | P0 |
| 드래그&드롭 시각 상태 | 5 (idle/hover/drag/drop/invalid) | P0 |
| 저장 상태 토스트 | 6 (saving/success/error/auto/itp/quota) | P0 |
| 게이지 임계 색 전환 | 4 (HP 100/50/20/0%) | P1 |
| 모달 dim/포커스 링 | 3 (모달/dialog/alert) | P1 |
| 등급 호버 글로우 200ms | 7 | P2 |

**총 32 케이스** — 적경홍 QA가 Test 단계에서 자동화로 누적.

---

## 4. AI 슬롭 감지 체크리스트 (디자이너의 눈)

E2E 스크린샷 비교 시 다음을 자동 감지하도록 적경홍에게 인계:

- [ ] **간격 흔들림**: 4px 그리드 외 값 (3px, 5px, 7px) 감지 → fail
- [ ] **그라디언트 방향**: HP 게이지는 `to right`, MP는 `to right` 고정. 어긋나면 fail
- [ ] **폰트 폴백**: `Pretendard` 미로드 시 시스템 폰트로 폴백 → 스크린샷 차이 → fail
- [ ] **색 대비**: 텍스트 vs 배경 4.5:1 미만 → fail (`@axe-core/playwright` 통합)
- [ ] **z-index 충돌**: 모달이 토스트 위에 → fail (모달 1000, 토스트 2000 룰)

---

## 5. 인계 카드

| 받는 사람 | 인계 항목 | 산출물 |
|---|---|---|
| **계섬월 (Eng)** | `tests/fixtures/design-tokens.ts` 생성 + `design-tokens.ts` re-export | Build 단계 |
| **적경홍 (QA)** | 32 케이스 매트릭스 + AI 슬롭 체크 5종 | Test 단계 |
| **진채봉 (Editor)** | i18n 키 7종 (saveState 토스트 메시지) 검증 | Build 단계 |
| **심요연 (Data)** | 색약 사용자 비율 + 등급 색 인지 정확도 측정 | Reflect 단계 |

---

## 6. Definition of Done (디자인 관점)

- [ ] `tests/fixtures/design-tokens.ts` 가 SSOT로 동작 (하드코딩 0)
- [ ] 32 회귀 케이스 중 P0 (18개) 100% 자동화
- [ ] AI 슬롭 감지 5종 CI 통합
- [ ] 등급 색 7종 / 저장 상태 6종 시각 회귀 베이스라인 스크린샷 확보
- [ ] DESIGN.md §5 컴포넌트 토큰과 100% 정합

---

## 7. 다음 스프린트 후보 (스코프 외)

- 전투 UI (ATB 게이지·대미지 팝업) 시각 회귀 — **rc.5**
- 다크/라이트 테마 전환 시각 회귀 — **Phase 2**
- 모바일 브레이크포인트 회귀 — **멀티엔진 단계**

---

> **결론**: 토큰을 SSOT로 묶고, 테스트가 그 SSOT를 import 하도록 하면, 회귀는 *반드시* 잡힙니다. 디자인 변경이 곧 테스트 실패가 되는 체계 — 이게 CBT 안정성의 본질이에요~ ✨
