# ⚔️ 에테르나 크로니클 — 전투 피드백 가독성 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-06-20
> 스코프: 데미지 팝업 · 상태이상 표시 · 색약 비색상 단서 · 전투 텍스트 가독성
> 1차 SSOT — 약속 수치 변경 시 본 문서 §1 흐름도 동시 갱신
> 메아리: `README.md §⚔️ 전투 피드백 가독성` · `launch_checklist.md §2.20(예정)` · 인게임 [도움말 → 전투 표시]
> 정합: `DESIGN.md §1 디자인 원칙(접근성 우선)` · `client/src/constants/battle-tokens.ts` · `client/src/utils/TextLegibilityGuard.ts`

---

## 목차

1. [한 손 흐름도](#1-한-손-흐름도)
2. [데미지 팝업 — 결과 7종](#2-데미지-팝업--결과-7종)
3. [데미지 속성 태그 — 6종](#3-데미지-속성-태그--6종)
4. [상태이상 표시 — 전투 15종](#4-상태이상-표시--전투-15종)
5. [가독성 4약속](#5-가독성-4약속)
6. [npm 명령어 표](#6-npm-명령어-표)
7. [관련 코드 자원](#7-관련-코드-자원)
8. [트러블슈팅](#8-트러블슈팅)
9. [FAQ 8건](#9-faq-8건)

---

## 1. 한 손 흐름도

```
[1] 타격 발생     → CombatManager.resolveHit()        결과 7종 분기
       ↓
[2] 데미지 팝업    → 색상 + 폰트크기 + 속성 이모지       ≥ 900ms 체류
       ↓
[3] 속성 태그      → formatDamageTypeTag()              색상 + 🔥❄⚡🌑✨ 병행
       ↓
[4] 상태이상 부여  → StatusEffectRenderer.apply()        아이콘 + 라벨 + 잔여 턴
       ↓
[5] 가독 게이트    → npm run battle:gate                 🟢 4종 PASS
```

**약속 수치 (60초 게이트)**
| 지표 | 약속 | 측정 도구 |
|------|------|-----------|
| 데미지·상태이상 명도 대비 | 텍스트 ≥ 7:1 (AAA) · 아이콘 ≥ 3:1 | `battle:contrast` |
| 전투 텍스트 최소 폰트 | ≥ 14px (데미지 28px) | `battle:legibility` |
| 색약 비색상 단서 커버리지 | 100% (속성 6 + 상태 15 전부) | `battle:colorblind` |
| 데미지 팝업 최소 체류 · 겹침 | ≥ 900ms · 동시 겹침 0 | `battle:overlap` |

---

## 2. 데미지 팝업 — 결과 7종

> SSOT: `client/src/constants/battle-tokens.ts` §1 `BATTLE_COLORS.damage` + §7 `DAMAGE_POPUP_SIZE`

| 결과 | 색상 | 폰트 | 비색상 단서 | 가독 비고 |
|------|------|:----:|-------------|-----------|
| 일반 (normal) | `#FFFFFF` 흰 | 16px | — | 기준 |
| 크리티컬 (critical) | `#FFD700` 금 | **32px** | 굵게 + 카메라 쉐이크 150ms | 크기로 위계 |
| 회복 (heal) | `#2ECC71` 녹 | 18px | `+` 접두 | 양수 표기 |
| 빗나감 (miss) | `#A0A0A0` 회 | 14px | `MISS` 라벨 | ⚠ 대비 주의 |
| 약점 (weak) | `#FF6B35` 주황 | 22px | `▲ WEAK` | 크기 강조 |
| 저항 (resist) | `#3498DB` 청 | 14px | `▽ RESIST` | ⚠ 대비 주의 |
| 무효 (immune) | `#9B59B6` 보라 | 14px | `∅ IMMUNE` | ⚠ 대비 주의 |

**가독성 원칙**: 색상은 보조 단서일 뿐, **크기·라벨·형태**가 1차 단서입니다 (색약 대응). `miss/resist/immune` 3종은 채도 낮아 다크 배경(`#14141F`) 대비가 약하니 라벨 병행이 필수이옵니다.

---

## 3. 데미지 속성 태그 — 6종

> SSOT: `client/src/combat/damageTypeNarration.ts` — 게임 어휘 ~16종 → 6 DamageElement 매핑

| 속성 | 이모지 | 게임 어휘 매핑 예 | 태그 표시 |
|------|:------:|-------------------|-----------|
| 물리 (physical) | (무태그) | physical/neutral/aether/earth/beast/arcane/time/memory | 무가시 보존 |
| 화염 (fire) | 🔥 | fire | `🔥 화염` |
| 빙결 (ice) | ❄ | ice/water/chrono | `❄ 빙결` |
| 뇌전 (lightning) | ⚡ | lightning/wind | `⚡ 뇌전` |
| 암흑 (shadow) | 🌑 | shadow/dark/poison/void/psychic | `🌑 암흑` |
| 신성 (holy) | ✨ | holy/light/nature | `✨ 신성` |

**무가시 보존 원칙**: 물리 계열은 태그를 붙이지 않아 기존 팝업 외관을 보존합니다. 속성 스킬만 이모지+라벨이 붙어 **색상 없이도** 속성을 식별할 수 있사옵니다.

---

## 4. 상태이상 표시 — 전투 15종

> SSOT: `client/src/data/statusIconSpecs.ts` `STATUS_EFFECT_ICON_IDS` (group: `battle`)
> 아이콘 경로: `assets/generated/ui/icons/status/status_<id>.png`

| 분류 | 효과 | 아이콘 ID | 표시 요소 |
|------|------|-----------|-----------|
| 🩸 지속 피해 (3) | 독 / 화상 / 출혈 | `poison` `burn` `bleed` | 아이콘 + 잔여 턴 + 틱 데미지 |
| ⛓️ 행동 봉쇄 (4) | 기절 / 빙결 / 침묵 / 매혹 | `stun` `freeze` `silence` `charm` | 아이콘 + 잔여 턴 + 회색 처리 |
| 📉 능력 저하 (3) | 둔화 / 실명 / 저주 | `slow` `blind` `curse` | 아이콘 + 잔여 턴 |
| 📈 능력 강화 (5) | 공격↑ / 방어↑ / 가속 / 재생 / 보호막 | `attack_up` `defense_up` `haste` `regen` `shield` | 아이콘 + 잔여 턴 (녹/청 테두리) |

**가독성 약속**: 모든 상태이상은 **아이콘(형태) + 한글 라벨 + 잔여 턴 수**의 3중 단서로 표시합니다. 색상만으로 버프/디버프를 구분하지 않사옵니다 — 테두리 형태(버프 둥근, 디버프 각진)를 병행하옵니다.

> legacy 아이콘(`STS-BUF-001~005`, `STS-DBF-001~020`)은 본 가독성 스코프 밖이며, 전투 15종만 게이트 대상입니다.

---

## 5. 가독성 4약속

### 5.1 명도 대비 (contrast)
- 전투 텍스트(데미지/라벨)는 표시 시점 배경 대비 **≥ 7:1 (WCAG AAA)**.
- 상태이상 아이콘/그래픽 요소는 **≥ 3:1 (WCAG AA Graphics)**.
- 저채도 3종(`miss/resist/immune`)은 1px 외곽선(`#000000` 80%)으로 대비 보강.

### 5.2 최소 폰트 (legibility)
- `client/src/utils/TextLegibilityGuard.ts` 14px 봉인 — 전투 텍스트 어떤 뷰포트에서도 14px 미만 금지.
- `battle-damage` 컨텍스트 데스크탑 기준 **28px** (모바일 fontScale 적용 후에도 14px 클램프).

### 5.3 색약 비색상 단서 (colorblind)
- 데미지 속성 6종 → 이모지 병행, 상태이상 15종 → 아이콘 병행 = **커버리지 100%**.
- 적록/청황/전색맹 3종 시뮬레이션에서 모든 결과/속성/상태가 색상 없이 식별 가능.

### 5.4 팝업 체류·겹침 (overlap)
- 데미지 팝업 최소 체류 **≥ 900ms** (`BATTLE_TIMING.damagePopupMs`).
- 동시 다발 타격 시 팝업 **세로 오프셋 스태거**로 겹침 0 — 숫자가 서로를 가리지 않도록.

---

## 6. npm 명령어 표

> ⚙️ 명령어 6종 + `scripts/battle/` 게이트 스크립트는 **Build 단계(계섬월) 배선 예정**이옵니다. 본 표는 SSOT 선행 정의 — 배선 완료 시 *예상 소요*를 실측치로 갱신하옵소서.

| 명령어 | 역할 | 예상 소요 |
|--------|------|-----------|
| `npm run battle:contrast` | 데미지·상태 대비비 검사 | ~5s |
| `npm run battle:legibility` | 14px 봉인 감사 | ~3s |
| `npm run battle:colorblind` | 색약 3종 시뮬 + 비색상 단서 커버리지 | ~8s |
| `npm run battle:overlap` | 팝업 체류/겹침 측정 | ~10s |
| `npm run battle:measure` | 종합 측정 (대비/폰트/체류) | ~12s |
| `npm run battle:gate` | 4종 게이트 합본 (PR 게이트) | ~60s |

---

## 7. 관련 코드 자원

> ✅ `battle-tokens.ts`만 실재(4차 SSOT). 나머지 4종(`damageTypeNarration` · `StatusEffectRenderer` · `statusIconSpecs` · `TextLegibilityGuard`)은 **Build 단계 배선 예정** — 본 가이드가 인터페이스 SSOT를 선행 정의하옵니다.

```
client/src/
├── constants/battle-tokens.ts          # 데미지 색상 7 + 폰트 7 + 타이밍 (4차 SSOT)
├── combat/
│   ├── damageTypeNarration.ts          # 속성 6종 → 이모지/라벨 매핑
│   ├── StatusEffectRenderer.ts         # 상태이상 아이콘/라벨/턴 렌더
│   └── statusEffectCategory.ts         # 상태이상 분류
├── data/
│   ├── statusEffectIcons.ts            # 아이콘 리소스 로더
│   └── statusIconSpecs.ts              # 전투 15종 + legacy 25종 스펙
├── utils/TextLegibilityGuard.ts        # 14px 봉인 + 컨텍스트별 폰트
├── ui/BattleUI.ts                      # 전투 HUD
└── styles/design-system-battle.css     # CSS 미러 (3차 SSOT)
```

---

## 8. 트러블슈팅

| 증상 | 원인 후보 | 처방 |
|------|-----------|------|
| `MISS` 글자가 배경에 묻힘 | `#A0A0A0` 저채도, 외곽선 누락 | 1px `#000` 외곽선 추가 → `battle:contrast` 재검 |
| 데미지 숫자가 겹쳐 안 보임 | 동시 타격 스태거 미적용 | 세로 오프셋 적용 → `battle:overlap` 재검 |
| 모바일에서 폰트가 깨알 | fontScale 후 14px 미달 | `TextLegibilityGuard.clampFontPx()` 경유 확인 |
| 색약 모드에서 속성 구분 불가 | 이모지 태그 누락 | `formatDamageTypeTag()` 반환값 렌더 확인 |
| 상태이상 버프/디버프 혼동 | 테두리 형태 단서 누락 | 버프 둥근/디버프 각진 테두리 적용 |

---

## 9. FAQ 8건

**Q1. 왜 색상만으로 데미지 종류를 구분하지 않사옵니까?**
A. `DESIGN.md §1` 접근성 우선 원칙 — 색약 플레이어(인구 약 8%)를 위해 색상은 보조 단서일 뿐, 크기·라벨·아이콘이 1차 단서이옵니다.

**Q2. 크리티컬은 왜 32px이옵니까?**
A. 결과의 중요도를 **크기 위계**로 표현합니다 (일반 16 → 약점 22 → 크리티컬 32). 색맹 여부와 무관하게 한눈에 읽히옵니다.

**Q3. 속성 이모지는 어디서 정의되옵니까?**
A. `damageTypeNarration.ts §DAMAGE_ELEMENT_EMOJI` — 표현 레이어 상수입니다. 물리는 무태그(무가시 보존).

**Q4. 상태이상 아이콘이 안 뜹니다.**
A. `preloadStatusIconResources(scene)`가 씬 preload에서 호출됐는지 확인하옵소서. 경로는 `assets/generated/ui/icons/status/`.

**Q5. legacy 상태 아이콘 25종도 게이트 대상이옵니까?**
A. 아니옵니다. 전투 15종(`group: 'battle'`)만 가독성 게이트 대상입니다.

**Q6. 대비비 7:1은 너무 빡빡하지 않사옵니까?**
A. AAA 기준이오나 다크 배경+밝은 텍스트라 대부분 자연 충족됩니다. 저채도 3종만 외곽선으로 보강하면 통과하옵니다.

**Q7. 데미지 팝업 체류 900ms는 변경 가능하옵니까?**
A. `BATTLE_TIMING.damagePopupMs` SSOT 단일 수정. 단 900ms 미만은 가독 약속 위반 → 백능파(Strategy) 승인 필요.

**Q8. 인게임 [도움말]과 본 가이드가 다르면?**
A. 본 문서가 1차 SSOT입니다. 인게임 카피는 메아리이니 본 문서를 따라 갱신하옵소서.

---

> 본 가이드는 1차 SSOT입니다. 약속 수치(대비 7:1 · 폰트 14px · 색약 단서 100% · 체류 900ms) 변경 시 백능파(Strategy) 승인 후 §1 흐름도와 §2~§5 표를 동시 갱신하옵소서.
