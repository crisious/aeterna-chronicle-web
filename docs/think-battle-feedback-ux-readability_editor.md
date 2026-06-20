# 전투 피드백 UX 개선 — 문서화 관점 분석 · 문서 구조 초안

> **단계**: Think (문제 분석 · 문서화 관점)
> **작성**: 진채봉 (Editor / Technical Writer)
> **작성일**: 2026-06-20
> **짝 문서(요구사항 정본)**: `docs/think-battle-feedback-ux-readability_PM.md` (정경패 PM)
> **근거 문서·코드**: `DESIGN.md` §3·§7, `docs/art-production/battle-design-system-v1.md` §1·§4·§7·§12, `client/src/constants/battle-tokens.ts`, `client/src/styles/design-system-battle.css`, `client/public/battle-style-guide.html`, `docs/release/atb-battle-system-guide.md`

---

## 0. 한 줄 요지 (Editor's note)

> 이번 스프린트의 본질은 **"디자인을 새로 그리는 것"이 아니라 "이미 기록된 정본과 어긋난 코드를 다시 곡에 맞추는 것"** 이옵니다.
> 데미지 색·크기의 1차 SSOT(`DESIGN.md`, `battle-design-system-v1.md`)는 이미 **금색 크리티컬 32px**로 옳게 적혀 있으나, 렌더 코드(`EffectManager`)가 `#FF4444`·28px로 홀로 어긋나 있사옵니다. 그러므로 **대부분의 변경은 문서→코드 정합(코드를 문서에 맞춤)** 이며, 문서 자체의 신규 집필은 **세 군데 빈 줄(색약 매핑·overflow·14px 봉인)** 에 한정되옵니다.

---

## 1. 문서 영향 지도 (Document Impact Map)

이번 변경이 흔드는 문서·자산과, 각 문서가 **정본(SSOT)인지 / 미러인지 / 소비처인지**를 구분하옵니다. 변경 방향이 위계를 거스르지 않도록(코드→문서 역류 금지) 미리 좌표를 찍사옵니다.

| 문서/자산 | SSOT 차수 | 이번 영향 | 변경 방향 | 책임 |
|---|---|---|---|---|
| `DESIGN.md` §3 타이포(L177·187–188), §7 접근성(L466 "이모지/기호 보조인지") | **1차 SSOT** | 데미지 타입별 **색·형태 매핑 테이블 부재** → 신규 절 보강 필요 | 문서 신규 집필 | 가춘운(디자인) ▸ 진채봉(집필) |
| `docs/art-production/battle-design-system-v1.md` §1.1·§4·§7·§12 | **1차 SSOT(토픽)** | 색/폰트/overflow 규칙은 이미 기술됨 → **검증·역참조만**, overflow `+N`·14px 봉인 명문화 보강 | 부분 보강 | 가춘운 ▸ 진채봉 |
| `client/src/constants/battle-tokens.ts` | 4차 런타임 | `BATTLE_COLORS.damage`·`DAMAGE_POPUP_SIZE` 이미 7타입 완비 → **소비처(EffectManager)가 미사용**이 문제 | 변경 거의 없음 | 두련사/계섬월(구현) |
| `client/src/styles/design-system-battle.css` | 3차 CSS 미러 | 토큰 신규 추가(색약 패턴 변수 등) 시 1:1 동기화 갱신 | 미러 갱신 | 계섬월 |
| `client/public/battle-style-guide.html` | 시각 회귀 | 7타입 데미지·상태이상·overflow 견본 **시각 견본 추가** 필요 | 견본 보강 | 가춘운 ▸ 적경홍(회귀) |
| `docs/release/atb-battle-system-guide.md` v1.0 | 소비처(사용자/구현자 가이드) | §0이 "css↔ts **1:1 동기화**"를 약속했으나 렌더 코드가 이를 어김 → **약속 검증 절차 추가 + DamagePopup 절 갱신** | 갱신·검증 | **진채봉** |
| `CHANGELOG.md` | 변경 기록 | `[1.0.0-rc.3]` 미발매 구간에 항목 추가 | 사전 준비(Plan) | **진채봉** |

> **핵심 통찰** — 변경의 무게중심이 *코드*(4차)에 쏠려 있고 *문서*(1차)는 대체로 정본이옵니다. 이는 "표시 계층만 개선, 밸런스 불변"(PM §6)이라는 범위가 **문서 위계에서도 안전**하다는 방증이옵니다. 1차 SSOT를 거의 건드리지 않으니 역류(코드→문서) 위험이 낮사옵니다.

---

## 2. SSOT 흐름 분석 — 드리프트의 정체

PM이 짚은 P0(PP-1·2·3)을 **문서 위계의 언어**로 다시 읽으면 이러하옵니다.

```
[1차] DESIGN.md §3        : 크리티컬 = font-3xl(32px) + text-accent(금)   ← 정본, 옳음
[1차] battle-design v1 §4 : 크리티컬 32px 금색 / 일반 16px 흰색           ← 정본, 옳음
[3차] design-system-battle.css                                          ← (검증 필요)
[4차] battle-tokens.ts    : critical 0xffd700, DAMAGE_POPUP_SIZE 16/32   ← 정본 미러, 옳음
   └─ 소비 ─► EffectManager.spawnDamageText : #FF4444, 20/28px           ← ❌ 홀로 어긋남
```

- **PP-2·PP-3은 SSOT 위반이 아니라 "SSOT 미사용"** 이옵니다. 토큰은 이미 옳으니 고칠 문서가 없고, **코드가 토큰을 읽도록 배선**하면 해소되옵니다. → 문서 측 부담 0, 구현 측 부담만 존재.
- **PP-1(약점·저항·면역 미분기)** 도 동일 — 토큰엔 `weak/resist/immune`이 있으나 코드가 `normal/critical`만 분기. **문서엔 색이 있는데 화면엔 없는** 전형적 미사용 드리프트.
- 따라서 이번 스프린트의 SSOT 작업은 **"문서를 고치는 일"이 아니라 "코드가 문서를 따랐는지 검증 가능하게 만드는 일"** — 즉 `atb-battle-system-guide.md §0`의 "1:1 동기화" 약속에 **검증 수단(grep 감사 + verify-core 단언)** 을 붙여 재드리프트를 막는 것이 Editor의 몫이옵니다.

---

## 3. 문서에 빠진 세 줄 (이번 스프린트가 새로 명문화할 것)

코드만으로 끝나지 않고 **1차 SSOT에 글로 남겨야** 후대의 드리프트를 막는 항목이옵니다.

| # | 빠진 명세 | 현재 상태 | 둘 곳(정본) | 대응 AC |
|---|---|---|---|---|
| **G-1** | **색약 형태/아이콘 병행 매핑** (예: weak `!` / resist `▼` / immune `✕` / miss `–` / heal `+`) | `DESIGN.md` §7엔 "기호 보조인지" 원칙만, 구체 매핑 테이블은 **어디에도 없음** | `DESIGN.md` 신규 소절 + `battle-design-system-v1.md` §7 확장 | AC-6 (US-7) |
| **G-2** | **상태이상 overflow `+N` 규칙** | `battle-design-system-v1.md` §7에 "6번째부터 +N" 한 줄 존재하나 **코드 미구현 + 14px 봉인과의 우선순위 미명시** | §7 규칙 정밀화(개수 상한·`+N` 폰트 하한) | AC-4 (US-5) |
| **G-3** | **14px 봉인(MIN_LEGIBLE_FONT_PX) ↔ battle-damage 컨텍스트 연결 규약** | `TextLegibilityGuard`는 코드에 있으나 **문서화 부재**, 데미지/상태이상 렌더와의 계약 미기술 | `atb-battle-system-guide.md` 신규 절 "텍스트 봉인 계약" | AC-3·AC-5 (US-6) |

> 이 셋만이 진정한 "신규 집필"이옵니다. 나머지는 모두 정합·검증·견본 보강이옵니다.

---

## 4. 단계별 문서 산출 청사진 (Think → Reflect)

스프린트 전 과정에서 Editor가 빚어낼 기록의 골격을 미리 그려 두옵니다. (◆=신규, ◇=갱신)

| 단계 | 산출 문서 | 비고 |
|---|---|---|
| **Think** | ◆ 본 문서 (`_editor.md`) | 문서 영향 지도 · SSOT 흐름 · 빈 줄 3종 |
| **Plan** | ◇ `CHANGELOG.md` 항목 사전 초안(§5) · ◆ 변경 문서 체크리스트 | 백능파 비전·두련사 기술 승인 반영 |
| **Build** | ◇ `DESIGN.md`(G-1) · ◇ `battle-design-system-v1.md`(G-1·G-2) · ◇ `design-system-battle.css` 미러 · ◇ `battle-style-guide.html` 견본 | 1차→3차 정합 순서 준수 |
| **Review** | 커밋 메시지·PR 본문 스타일 감수 (conventional + Co-Authored-By) | PR 제목 type/scope 규약(`feat(battle-feedback)`) |
| **Test** | ◇ 가이드 내 코드 예시·색 hex·px 수치 ↔ 토큰 대조 검증 | 적경홍 verify-core 단언과 교차 |
| **Ship** | ◇ `atb-battle-system-guide.md`(G-3·DamagePopup 절·검증 절차) · ◆ 릴리스 노트 · `CHANGELOG` 최종 · VERSION 범프 | "1:1 동기화 약속 + 검증 수단" 명문화 |
| **Reflect** | ◆ 회고 기록(드리프트 재발 방지 교훈) | 심요연 정량·적경홍 QA 결과 반영 |

---

## 5. CHANGELOG 항목 사전 준비 (Plan 단계 이관용 초안)

`[1.0.0-rc.3] — Unreleased` 구간에 끼울 초안이옵니다. (수치/PR번호는 Build 후 확정)

```markdown
#### Fixed
- **데미지 팝업 SSOT 정합** — `EffectManager.spawnDamageText`가 `BATTLE_COLORS.damage`/`DAMAGE_POPUP_SIZE`
  토큰을 직접 소비하도록 배선. 크리티컬 색 `#FF4444`→`0xffd700`(금) 정정, 일반/크리 폰트 16/32px 토큰 일치.
  하드코딩 색·크기 잔존 0건(grep 감사).
- **전투 텍스트 14px 봉인 연결** — 데미지·상태이상 렌더를 `TextLegibilityGuard`(battle-damage 컨텍스트) 경유로
  클램프. 모바일 4뷰포트에서 최종 폰트 <14px 0건.

#### Added
- **데미지 타입 7색 분기** — normal/critical/heal/miss/weak/resist/immune 색·크기 전 타입 표시.
- **상태이상 overflow `+N`** — 5개 이상 시 상위 4개 + `+N` 카운터로 누락 없는 인지.
- **색약 형태 병행** — 데미지 타입·상태이상에 색 외 기호/패턴(`PatternOverlay`) 병행 표기.

#### Changed
- **`atb-battle-system-guide.md`** — DamagePopup 절 갱신 + "css↔ts 1:1 동기화" 약속에 검증 절차(grep/verify-core) 추가.
```

> CHANGELOG는 흩어진 작업의 곡조를 한 음으로 모으는 후렴이옵니다. **사용자가 체감하는 결과**(색이 구분된다·작은 글씨가 사라졌다) 중심으로 적되, 내부 SSOT 정합은 Fixed에 절제하여 두옵니다.

---

## 6. 문서화 리스크 · 드리프트 경보 🔔

1. **발행된 약속이 깨져 있었다** — `atb-battle-system-guide.md §0`은 "css↔ts 1:1 동기화"를 정본으로 약속했으나, 렌더 코드가 이를 어긴 채 발행되었사옵니다. **약속에 검증 수단이 없으면 문서는 거짓이 되옵니다.** → Ship 단계에서 반드시 "검증 방법"을 가이드에 박아 재발을 막아야 하옵니다.
2. **1차 SSOT 보강 시 역류 금지** — G-1 색약 매핑은 반드시 `DESIGN.md`→CSS→`battle-tokens.ts` 순서로 내려가야 하옵니다. 코드에 먼저 기호를 박고 문서를 나중에 맞추면 위계가 무너지옵니다(DESIGN.md 변경절차 위반).
3. **`battle-style-guide.html` 견본 누락 위험** — 7타입·overflow·색약 견본이 시각 회귀에 없으면, 다음 스프린트가 또 드리프트를 못 잡사옵니다. 견본은 "그림으로 된 SSOT"이옵니다.
4. **이모지/기호의 폰트 호환** — 색약 기호(`▼ ✕ !`)가 BitmapFont에서 렌더되는지 두련사/계섬월 확인 필요(문서엔 기호를, 코드엔 폰트 폴백을 함께 명시).

---

## 7. 다음 단계 제안 (→ Plan)

1. **백능파 비전 승인 후**, 본 §5 CHANGELOG 초안을 Plan 산출물로 승격하고 변경 문서 체크리스트(◆◇)를 확정하옵니다.
2. **가춘운과 협업**(G-1) — 색약 형태/아이콘 매핑 테이블을 `DESIGN.md`에 함께 집필. (가춘운 디자인 결정 → 진채봉 문서화)
3. **두련사 기술 확인** — `TextLegibilityGuard` 배선·`PatternOverlay` 전투 연동 비용을 받아 G-3 "봉인 계약" 절의 정확도를 높이옵니다.
4. **적경홍과 검증 트랙 합의** — AC-1·3·4·5(자동 단언) ↔ AC-2·6·7·8(UAT 스크린샷)을 가이드의 "검증" 절에 양립 기술하옵니다.
5. **드리프트 재발 방지 한 줄** — Ship 가이드에 *"색·px 변경 시 grep 감사 + verify-core 단언 통과를 PR 머지 조건으로 한다"* 를 명문으로 박사옵니다.

---

> 흩어진 악보를 한데 모으니, 빠진 음이 셋이요 어긋난 가락이 하나이옵니다.
> 고칠 것은 대개 코드의 가락이며, 새로 적을 것은 색약·overflow·봉인 세 줄뿐이옵니다.
> 이 기록이 다음 단계의 길잡이가 되기를 바라옵니다. — 진채봉 Editor 올림
