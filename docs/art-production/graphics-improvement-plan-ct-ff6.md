# 그래픽 리소스 개선 개발 계획 — 크로노 트리거 & FF6 레퍼런스 기반

> 작성일: 2026-06-14
> 근거 문서: Notion/Obsidian「그래픽 레퍼런스 분석 — 크로노 트리거 & FF6」(PART A 분석 + PART B B1~B15 제작 지시)
> 연계: `docs/art-production/sprite-production-roadmap.md`(Phase 3), `ART_STYLE_GUIDE_v2.md`, `character-sprite-production.md`
> 스코프: **신규 파이프라인 구축이 아니라, 이미 가동 중인 Aseprite 파이프라인의 리소스 품질·일관성을 CT/FF6 원칙으로 끌어올리는 것**

---

## 2026-06-20 현황 보정

현재 코드 기준으로 Phase A/B의 6클래스 full motion 승급과 `ready`/`victory` 포즈 추가는 완료된 상태다. Phase C의 팔레트/실루엣 품질 게이트도 `tests/unit/characterSpriteQualityGates.test.ts`, `validate-character-palette.mjs`, `validate-character-silhouette.mjs`로 운영 중이다.

따라서 이후 개선 루프는 "파일럿을 full로 승급"하는 작업이 아니라, 이미 게시된 6개 기본 클래스의 **모션별 픽셀 품질 보정**, **방향별 실루엣 가독성 보강**, **combo/skill 전용 pose 추가** 순서로 진행한다.

최근 루프:

- `char_time_guardian_base`의 `U`/`UL` 후방 포즈를 보정해 전면 피부색 노출을 줄이고 후드/로브/시계 장치 실루엣을 강화했다.
- RED 기준: `U` idle 상체 영역 Time Guardian 피부색 픽셀 `112 > 48` 실패.
- 완료 기준: 동일 영역 피부색 픽셀 `0`, `art:character:roster`, 단일 character export validate, 관련 vitest 49개, `client` typecheck, Battle/Game browser QA 통과.
- `char_memory_weaver_base`의 `U`/`UL` 후방 책 소품을 열린 페이지에서 닫힌 표지/책등으로 보정했다.
- RED 기준: `U` idle 책 영역 `bookPage` 색 픽셀 `96 > 24` 실패.
- 완료 기준: 동일 영역 `bookPage` 픽셀 `0`, `art:character:roster`, 단일 character export validate, 관련 vitest 50개, `client` typecheck, Battle/Game browser QA 통과.
- `char_void_wanderer_base`의 `U`/`UL` 후방 몸통을 전면 가슴 패널에서 망토 등판으로 보정했다.
- RED 기준: `U` idle 중심 몸통 `silverBlue` 패널 픽셀 `25 > 4` 실패.
- 완료 기준: 동일 영역 `silverBlue` 픽셀 `0`, `art:character:roster`, 단일 character export validate, 관련 vitest 51개, `client` typecheck, Battle/Game browser QA 통과.

---

## 0. 현황 진단 (코드 기준)

### 0-1. 실제 파이프라인 (브리프 보정)

레퍼런스 분석 PART B는 생성기를 "SDXL + Pixel Art XL LoRA"로 적었으나, **실제 캐릭터·환경 리소스는 Aseprite Lua 절차적 스크립트로 생성**된다(`tools/aseprite-pipeline/scripts/create-*.lua`). README 기준 역할 분담은:

- **AI(SDXL 등)**: seed·reference 생성, 후처리.
- **Aseprite**: QA 반려/애니메이션 일관성이 필요한 에셋의 **수동 보정 SSOT**. Lua 스크립트가 `colors` 테이블로 픽셀을 직접 드로잉하고, CLI export → 정규화 JSON → atlas pack → 심링크 publish.

→ 따라서 개선 레버는 "프롬프트"가 아니라 **Lua 스크립트의 팔레트 상수·레이어 규약·프레임 태그·검증 게이트**다. B2(SDXL 프롬프트)는 seed 단계에만 유효하고, 캐닉컬 품질은 Aseprite 단계에서 결정된다.

### 0-2. 클래스 파리티 격차 (최우선)

`assets/source/aseprite/character/character-sprite-roster.json` + `client/src/assets/characterSpriteManifest.ts` 기준:

| 클래스 | phase | 방향 | 모션 | 프레임 | 비고 |
|--------|-------|------|------|--------|------|
| ether_knight | **full** | D/DL/L/UL/U (5) | idle/walk/attack_melee/cast/hit/death (6) | 150 | 5레이어(shadow/body/armor/weapon/accent) — 기준 품질 |
| memory_weaver | pilot | D (1) | idle/walk (2) | ~ | base만 |
| memory_breaker | pilot | D (1) | idle/walk (2) | ~ | base만 |
| shadow_weaver | pilot | D (1) | idle/walk (2) | ~ | base만 |
| time_guardian | pilot | D (1) | idle/walk (2) | ~ | base만 |
| void_wanderer | pilot | D (1) | idle/walk (2) | ~ | base만 |

→ **5클래스가 Ether Knight 대비 1/15 수준(1방향·2모션)**. `sprite-production-roadmap.md` Phase 3가 이미 "pilot → full motion set 승급"으로 이 격차를 명명하고 있다. 본 계획의 Phase A가 이를 구체화한다.

### 0-3. CT/FF6 분석이 짚는, 로드맵에 없는 품질 차원

| 분석 항목(B) | 현 상태 | 격차 |
|---|---|---|
| FF6 표준 포즈 8태그(B2-6/B9): idle/ready/attack/cast/hit/wounded/dead/victory | 현 모션 6종에 **victory·ready 없음**(wounded=hit, dead=death로 대응) | 승리/전투대기 포즈 부재 → 전투 연출 빈약 |
| 15색 팔레트 규율(B2-5) | 팔레트가 **스크립트별 `colors` 테이블**(ether_knight ~13색), 공용 SSOT·색수 검증 없음 | 클래스 간 색 일관성·색수 상한 미보증 |
| CT 실루엣-우선 식별(B9) | 자동 실루엣 구별 검수 없음 | 6클래스 실루엣 차별화 미검증 |
| FF6 포트레이트 2층(B-A §3) | characterIllustration(256×384)·battleThumbnail은 있으나 메뉴 포트레이트 규약 불명확 | 대화/메뉴 고밀도 포트레이트 표준 부재 |
| 리컬러 변형(B5/B9, FF6 Past/Esper) | 레이어 분리(armor/accent)는 **이미 존재** → 리컬러에 유리. cosmetic atlas(s1/s2/s3) 존재 | 레이어 기반 팔레트-스왑 코스메틱 파생 규약 미정립 |
| 존 팔레트 무드(B10) | atlas_bg_*·atlas_monster_* 존 10종 존재 | 존별 기준 팔레트 정의·일치 검증 없음 |
| 보스 텔레그래프(B11/전투UX r15) | boss portrait 카테고리 존재 | 예고 모션 프레임 규약 없음 |

---

## 1. 개선 목표 & 원칙

**목표**: 6클래스를 동일 품질(5방향·표준 포즈·레이어·팔레트)로 통일하고, CT/FF6 원칙을 검증 게이트로 코드화해 신규 에셋이 자동으로 품질선을 넘게 한다.

**원칙 → 코드 레버 매핑**:
1. CT 형태-우선 → **실루엣 구별 QA 게이트**(Phase C).
2. FF6 표준 포즈 문법 → **모션 태그 규약 확장**(victory/ready) + roster `requiredTags` 강제(Phase A/B).
3. 15색 규율 → **공용 팔레트 모듈 + 색수 검증기**(Phase C).
4. FF6 리컬러 → **레이어 기반 팔레트-스왑 코스메틱**(Phase D).
5. 존 팔레트 무드 → **존 팔레트 정의 + 일치 검증**(Phase E).

---

## Phase A — 클래스 파리티: 5 pilot → full (최우선)

**목표**: memory_weaver/memory_breaker/shadow_weaver/time_guardian/void_wanderer를 Ether Knight와 동일하게 5방향 × 6모션 × 5레이어 = 150프레임으로 승급.

**작업**:
1. 각 클래스 `create-<class>-pilot.lua`를 `create-ether-knight-pilot.lua`(21KB, full)를 템플릿으로 확장 — `directions` 5종 테이블 + 모션 6종 프레임 블록 + 레이어 5종.
   - 클래스 고유성은 `colors` 테이블과 실루엣 모티프(B9 디자인 브리프: weaver=로브·곡선, breaker=비대칭 각, time_guardian=시계 모티프 등)로 차별화.
2. `character-sprite-roster.json`의 각 클래스 `directions`·`motions`·`requiredTags`·`phase`를 `full`로 갱신.
3. `characterSpriteManifest.ts`의 directions/motions를 5방향·6모션으로 갱신.
4. 빌드·publish: `npm run art:character:build -- <class-id> --publish`.

**검증 게이트**:
- `npm run art:character:roster` (roster 정합)
- `npm run art:aseprite:validate` (PNG/JSON/프레임/tag 정합)
- 헤드리스 QA: BattleScene·GameScene에서 각 클래스 6모션 재생(`tools/qa/keyboard-qa.mjs` 패턴)
- `npm run typecheck:client` + 영향 vitest(asepritePipeline.test.ts, characterSpriteManifest.test.ts)

**수용 기준**: 6클래스 전부 30태그(6모션×5방향) validate 통과 + 브라우저 QA에서 전투/필드 구동 + manifest 타입 일치.

**우선순위**: ★★★ (가장 큰 체감 격차, 로드맵 Phase 3 직접 이행)

---

## Phase B — FF6 표준 포즈 보강 (victory/ready)

**목표**: FF6 표준 전투 포즈 문법(B2-6/B9) 정합 — 현 6모션에 `victory`(승리)·`ready`(전투 대기) 추가, `attack_ranged`(manifest 타입엔 이미 존재) 정리.

**작업**:
1. `aseprite.config.json` character 카테고리 `requiredTags`에 `victory_D`·(선택)`ready_D` 추가, 모션 vocabulary 확장.
2. 각 클래스 Lua에 victory(FF6 승리 팡파레 포즈)·ready(무기 들고 대기) 프레임 블록 추가.
3. `CharacterMotion` 타입(manifest)에 `victory`·`ready` 추가, BattleScene 승리 시 victory 모션 재생 배선(전투 종료 팝업 B4-2와 연결).

**검증**: roster/aseprite validate + BattleScene 승리 연출 헤드리스 QA.

**수용 기준**: 승리 시 victory 포즈 1회 재생, 전투 진입 시 ready 포즈.

**우선순위**: ★★ (Phase A 직후 — 표준 포즈가 있어야 신규 클래스 비용이 일정해짐)

---

## Phase C — 15색 팔레트 SSOT + 실루엣 QA (CT 형태-우선)

**목표**: 클래스별로 흩어진 `colors` 테이블을 공용 팔레트 모듈로 모으고, 색수 상한·실루엣 구별을 검증 게이트화.

**작업**:
1. **공용 팔레트 모듈**: `scripts/lib/palette.lua`(공통 16-슬롯: outline/shadow/skin 계열 + 클래스 accent 슬롯). 각 create 스크립트가 `--palette <class>.gpl` 또는 공용 모듈을 로드. 이미 `--palette` 파라미터·`LoadPalette` 훅 존재 → 활용.
2. **색수 검증기**: `validate-palette.mjs` — 생성 PNG의 고유 색(투명 제외) ≤ 15 + 클래스 팔레트 일치 검사. `art:character:build` 후속 게이트.
3. **실루엣 QA**: `validate-silhouette.mjs` — 각 클래스 idle_D 프레임을 알파→흑백 실루엣으로 환원해 6클래스 상호 해밍 거리 임계 검사(B9 "흑백 실루엣 구별" 자동화).

**검증**: 두 검증기를 `art:character:build` 파이프라인 + CI 게이트에 편입.

**수용 기준**: 6클래스 전부 ≤15색 + 실루엣 상호 구별 통과.

**우선순위**: ★★ (Phase A와 병행 가능 — 팔레트 SSOT가 먼저면 A에서 색 재작업 절감)

---

## Phase D — 포트레이트 2층 + 리컬러 코스메틱 (FF6 Past/Esper)

**목표**: FF6식 "필드 도트(소형) + 메뉴 포트레이트(고밀도)" 2층 구조 표준화 + 레이어 기반 팔레트-스왑 코스메틱.

**작업**:
1. **포트레이트 규약**: 클래스별 메뉴 포트레이트(npcPortrait 512² 또는 신규 charPortrait 카테고리) 1장씩 — 대화/메뉴에서 사용(B-A §3, B7-2 상태바 포트레이트와 연결).
2. **리컬러 코스메틱**: Ether Knight가 이미 가진 armor/accent 레이어를 활용, base 도트 유지 + 팔레트 스왑으로 시즌 스킨 파생(atlas_cosmetic_s1/s2/s3 기존 슬롯 충전). `build-cosmetic-library.mjs` 확장.

**검증**: cosmetic atlas pack + 런타임 표시 QA.

**수용 기준**: 클래스당 포트레이트 1 + 시즌 스킨 1 이상이 base 재생성 없이 팔레트 스왑으로 생성.

**우선순위**: ★ (콘텐츠 확장 — A/B/C 안정화 후)

---

## Phase E — 존 팔레트 무드 + 보스 텔레그래프 (B10/B11)

**목표**: 존 10종(abyss/argentium/britalia/erebos/fog_sea/northland/oblivion/solaris/sylvanheim/temporal_rift)에 기준 팔레트 무드를 정의·일치 검증하고, 보스 예고 모션 프레임을 규약화.

**작업**:
1. **존 팔레트 정의**: 존별 기준 팔레트(채도·색온도) 테이블 → 해당 존 atlas_bg_*·atlas_monster_* 생성 스크립트가 참조. Phase C 색수 검증기를 존 단위로 확장.
2. **보스 텔레그래프**: monster boss 카테고리에 `telegraph`(예고) 프레임 태그 추가(B11-2, 전투 UX 백로그 r15). 아이콘+색+모션 동시(색맹 대응).

**검증**: 존별 팔레트 일치 검증 + 보스전 헤드리스 QA.

**수용 기준**: 존별 에셋이 기준 팔레트 내, 보스 강공 전 telegraph 프레임 재생.

**우선순위**: ★ (월드/전투 폴리시 — 후반)

---

## 2. 우선순위·의존성 요약

```
Phase A (클래스 파리티 5종) ──┬─> Phase B (victory/ready)
                              └─> Phase D (포트레이트·코스메틱)
Phase C (팔레트 SSOT·실루엣 QA) ──> A와 병행(선행이면 재작업 절감), C는 E의 검증기 기반 제공
Phase E (존 팔레트·보스 텔레그래프) ──> C 검증기 의존
```

- **즉시 착수**: Phase A(rank1) + Phase C-1 공용 팔레트 모듈(병행).
- A 완료 후: B → D.
- C 검증기 완성 후: E.

## 3. 공통 검증 게이트 (모든 Phase)

1. `npm run art:character:roster` / `art:sprite:roster` — roster 정합.
2. `npm run art:aseprite:validate` — export 정합(PNG/JSON/프레임/tag).
3. `validate-palette.mjs` / `validate-silhouette.mjs` (Phase C 산출) — CT/FF6 품질.
4. `npm run typecheck:client` (고정 tsc, npx 직접 실행 금지 — TS5101 함정).
5. vitest: asepritePipeline.test.ts, characterSpriteManifest.test.ts + contract/integration.
6. 헤드리스 키보드 QA(`tools/qa/keyboard-qa.mjs`): BattleScene/GameScene 구동·신규 모션 재생.
7. atlas pack(`art:atlas:pack`) + 매니페스트 갱신 — `client/public/assets/generated` 심링크 경유(CI 클론에서도 유효).

## 4. 리스크·주의

- **Aseprite 실행 환경**: Windows 경로 탐색(`art:aseprite:check`), CI엔 `ASEPRITE_EXE` 고정 필요. CLI 미설치 환경에선 Lua 생성 단계 스킵·fallback texture 경로 검증.
- **심링크**: `client/public/assets/generated`는 추적된 심볼릭 링크 — publish 산출물은 단일 소스(assets/generated)에서 파생, 사본 커밋 불필요.
- **팔레트 SSOT 이행**: 기존 클래스 색 재정의는 시각 회귀 — 이행 시 before/after 스크린샷 QA.
- **AI seed vs Aseprite 캐닉컬**: seed는 참고용, 최종 픽셀은 Aseprite Lua가 SSOT. 두 단계를 혼동해 SDXL 산출물을 직접 publish하지 말 것.

## 5. 레퍼런스 매핑 (추적성)

| Phase | 근거 B-자료 | CT/FF6 원칙 |
|-------|------------|-------------|
| A | B9(6클래스 디자인), B2-6(태그 규약) | FF6 표준 포즈·로스터 확장성 |
| B | B1(전투), B9(8태그) | FF6 victory/ready 표준 포즈 |
| C | B2-5(15색), B9(실루엣) | CT 형태-우선, 단단한 도트 |
| D | B5/B9(리컬러), B-A §3(포트레이트) | FF6 Past/Esper, 2층 포트레이트 |
| E | B10(존 팔레트), B11(보스 텔레그래프) | CT 시대 팔레트 무드, FF6 대형 보스 |
