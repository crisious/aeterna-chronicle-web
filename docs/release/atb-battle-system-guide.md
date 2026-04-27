# ⚔️ ATB 전투 시스템 통합 가이드 v1.0

> **스프린트:** "에테르나 크로니클 전투 시스템 개선 — FF6 레퍼런스 ATB 시스템과 그래픽 리소스 개선"
> **버전:** v1.0 (Build 단계 산출물 통합본)
> **작성:** 진채봉 (Editor) · 감수: 가춘운(CMO) · 계섬월(Eng) · 적경홍(QA)
> **선행 문서:**
> - `DESIGN.md` v1.0 — 코어 디자인 토큰
> - `docs/art-production/battle-design-system-v1.md` — Plan 단계 설계
> - `docs/art-production/battle-atb-assets-v1.md` — Assets 단계 자원 규격
> **소비자:** 신규 합류자 · 클라이언트 구현자(계섬월) · QA(적경홍) · 빌드/배포 담당(이소화)

---

## 0. 한눈에 보기

| 항목 | 결정 사항 |
|------|-----------|
| **레퍼런스** | Final Fantasy VI ATB(Active Time Battle) — 게이지·턴큐·커맨드 카드 |
| **렌더러** | Phaser.js (전투 씬), HTML 오버레이(콤보·로그) |
| **SSOT** | `design-system-battle.css` ↔ `battle-tokens.ts` (값 1:1 동기화) |
| **레이어 위계** | 배경 0 → 엔티티 10 → VFX 20 → HUD 30 → 팝업 40 → 모달 50 |
| **ATB 1회전** | 8000 ms (속도 1.0 기준) · 80 ms 틱 |
| **접근성** | `prefers-reduced-motion` · `prefers-contrast: more` 양쪽 대응 |

> **비유 한 줄.** ATB는 거문고의 줄과 같사옵니다 — 게이지 한 칸이 차오르는 동안 호흡을 가다듬고, 가득 찬 순간 손끝으로 한 음을 뽑아내는 리듬이옵니다.

---

## 1. 시스템 구성도

```
┌──────────────────────────────────────────────────────────────┐
│                     CombatManager.ts                         │
│   (턴 디스패처 · ATB 누적 · 콤보 매니저 · 상태이상 매니저)    │
└──────────────────────────────────────────────────────────────┘
        │                │                │                │
        ▼                ▼                ▼                ▼
 ATBGaugeRenderer  StatusEffect      BattleCommand    DamagePopup
   (Phaser)          Renderer          Menu (HUD)      (CSS+Phaser)
        │                │                │                │
        └────── design-system-battle.css ◄──── battle-tokens.ts ─┘
                            (CSS 변수)              (Phaser 상수)
```

- **CombatManager**: 게이트키퍼. 모든 행동은 여기서 ATB 100% 검증 후 디스패치.
- **ATBGaugeRenderer**: `BATTLE_TIMING.atbTickMs` 주기로 게이지 폭 갱신, 100% 도달 시 펄스 글로우.
- **StatusEffectRenderer**: 8종 상태이상 아이콘(Burn·Poison·Freeze·Stun·Bleed·Silence·Shield·Haste) 12×12 SVG 트레이.
- **BattleCommandMenu**: 4지선다 카드(공격·스킬·아이템·도주) — FF6의 "Fight/Magic/Item/Run" 직계.

---

## 2. 빠른 시작 — 신규 합류자용

### 2.1 파일 위치 지도

| 산출물 | 경로 |
|--------|------|
| 디자인 토큰 (CSS) | `client/src/styles/design-system-battle.css` |
| 디자인 토큰 (Phaser 상수) | `client/src/constants/battle-tokens.ts` |
| 전투 매니저 | `client/src/combat/CombatManager.ts` |
| 게이지 렌더러 | `client/src/combat/ATBGaugeRenderer.ts` |
| 커맨드 메뉴 | `client/src/combat/BattleCommandMenu.ts` |
| 상태이상 렌더러 | `client/src/combat/StatusEffectRenderer.ts` |

### 2.2 스타일 링크 순서 (중요)

```html
<!-- index.html — 캐스케이드 순서 절대 준수 -->
<link rel="stylesheet" href="/src/styles/design-system.css">
<link rel="stylesheet" href="/src/styles/design-system-battle.css">
```

> 전투 시트는 **반드시** 코어 시트 뒤에 와야 토큰 오버라이드가 깨지지 않사옵니다.

### 2.3 토큰 사용 원칙

- **CSS에서**: `var(--ac-atb-ready)` — 절대로 `#89CFF0` 직접 입력 금지.
- **Phaser에서**: `BATTLE_COLORS.atb.ready` — 매직 넘버 금지.
- 새로운 색이 필요하면 **두 파일에 동시에** 추가 (PR 시 짝 검토).

---

## 3. ATB 게이지 사양

### 3.1 상태 머신

```
[empty] ──tick──▶ [charging-1] ──33%──▶ [charging-2] ──66%──▶ [charging-3] ──100%──▶ [ready] ──action──▶ [empty]
                                                                                          │
                                                                              [frozen]◄──stun/freeze
```

| 상태 | 색상 토큰 | 애니메이션 |
|------|-----------|------------|
| empty | `--ac-atb-empty` | 없음 |
| charging-1/2/3 | gradient 3단 | `transition: width 80ms linear` |
| ready (아군) | `--ac-atb-ready` + 청색 펄스 | `ac-atb-pulse 0.6s alternate` |
| ready (적) | `--ac-atb-enemy-ready` + 적색 경고 | `ac-atb-enemy-warn 0.4s alternate` |
| frozen | `--ac-atb-frozen` | 없음 (스턴/빙결) |

### 3.2 속도 모디파이어

`ATB_SPEED_MOD` (battle-tokens.ts) 적용 순서:
1. 기본 속도 = `8000ms / haste_multiplier`
2. Haste(가속): ×1.5 / Slow(감속): ×0.5 / Stop: 0
3. 캐릭터 AGI 보정: `±20%` 범위 내 비례

---

## 4. 대미지 팝업 매트릭스

| 타입 | 폰트 크기 | 색상 | 트리거 |
|------|-----------|------|--------|
| 일반 | 16px | `--ac-dmg-normal` | 기본 명중 |
| 크리티컬 | **32px** | `--ac-dmg-critical` (금) | 크리율 적중 |
| 회복 | 18px | `--ac-dmg-heal` (녹) | 힐 스킬 |
| 빗나감 | 14px italic | `--ac-dmg-miss` (회) | 명중 실패 |
| 약점 적중 | 22px | `--ac-dmg-weak` (주황) | 속성 약점 ×1.5 |
| 저항 | 14px | `--ac-dmg-resist` (청) | 속성 저항 ×0.5 |
| 면역 | 14px | `--ac-dmg-immune` (보라) | 데미지 0 |

> 크리티컬은 다른 모든 팝업의 **2배 크기**로 시각적 보상감을 확보하옵니다 (FF6 원전의 큰 숫자 카타르시스 계승).

---

## 5. 상태이상 아이콘 8종

| 아이콘 | 의미 | 색상 | 스택 가능 |
|--------|------|------|-----------|
| Burn 🔥 | 매턴 화염 도트 | `--ac-skill-physical` | ✗ |
| Poison ☠️ | 매턴 독 도트 | `--ac-skill-debuff` | ✗ |
| Freeze ❄️ | ATB 정지 | `--ac-atb-frozen` | ✗ |
| Stun ⚡ | 1턴 행동 불가 | `--ac-dmg-critical` | ✗ |
| Bleed 🩸 | 행동 시 추가 도트 | `--ac-dmg-weak` | ○ (3) |
| Silence 🔇 | 마법 봉인 | `--ac-skill-magic` | ✗ |
| Shield 🛡️ | 받는 피해 -30% | `--ac-skill-buff` | ✗ |
| Haste ⏩ | ATB 속도 ×1.5 | `--ac-atb-ready` | ✗ |

규격: **12×12 SVG · `image-rendering: pixelated` · 안티앨리어싱 금지**

---

## 6. 구현 체크리스트 (Build 단계 → Review 인계)

### 6.1 클라이언트 (계섬월)

- [x] `design-system-battle.css` 링크 (`index.html`)
- [x] `battle-tokens.ts` 상수 import (`CombatManager`)
- [x] `ATBGaugeRenderer.ts` 4상태 분기
- [x] `BattleCommandMenu.ts` 4지선다 카드
- [x] `StatusEffectRenderer.ts` 8종 아이콘 트레이
- [ ] 콤보 게이지 HUD 연동 (rc.4 이월 후보)
- [ ] 스킬명 등장 카드 ↔ 보이스 SFX 동기 (rc.4)

### 6.2 QA (적경홍)

- [ ] ATB 1회전 8000ms ±50ms 측정 (FPS 60 기준)
- [ ] 크리티컬 팝업 32px 가독성 (1920·1280·1024 모두)
- [ ] `prefers-reduced-motion` ON 시 펄스 비활성 검증
- [ ] 색약 시뮬(프로타노피아·중수증) 게이지 구분 가능 여부

### 6.3 문서/릴리즈 (진채봉)

- [x] 본 통합 가이드 발행
- [x] CHANGELOG.md ATB 항목 추가
- [x] README.md 전투 섹션 ATB 명시
- [ ] 릴리즈 노트 v1.0.0-rc.3 ATB 섹션 추가 (Ship 단계)

---

## 7. 다음 곡조 — 향후 확장 후보

| 항목 | 우선도 | 비고 |
|------|--------|------|
| 콤보 게이지 ↔ ATB 동기화 (C→B→A→S) | 高 | rc.4 |
| 스킬 카드 등장 시 보이스 컷인 (TTS 20개) | 中 | rc.4 |
| 보스전 전용 "행동 임박" 빨간 비네팅 | 中 | rc.4 |
| 색약 모드 토글 (UI 설정) | 中 | rc.5 |
| Unity 포팅 시 토큰 export (JSON) | 低 | Phase 2 |

---

## 8. 참조 문서

- 코어 디자인 시스템: [`DESIGN.md`](../../DESIGN.md)
- 전투 디자인 (Plan): [`battle-design-system-v1.md`](../art-production/battle-design-system-v1.md)
- 전투 에셋 (Assets): [`battle-atb-assets-v1.md`](../art-production/battle-atb-assets-v1.md)
- GDD 전투 챕터: [`01_코어기획/GDD_final.md`](../../01_코어기획/GDD_final.md) §3
- 릴리즈 노트: [`release_notes_v1.0-rc.3.md`](./release_notes_v1.0-rc.3.md)

---

> *기억은 사라져도, 곡조는 남사옵니다 — 이 한 권의 가이드가 ATB의 첫 박을 일정하게 잡아주옵소서.*
> — 진채봉 拜
