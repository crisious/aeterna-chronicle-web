# scenarioRegistry SSOT 사용 가이드

> 작성: 2026-05-22 (SYNC-29 / SYNC-57 갱신 자동 라운드)
> 갱신: 2026-05-24 (SYNC-105 / 개발 및 플레이 상태 반영)
> 모듈: `shared/types/scenarioRegistry.ts`
> 누적 상태: 105 sprint, 55+ core SSOT domains, field NPC 46명, BGM 42개, ambient 43개, 최신 runtime narrative 전용 테스트 22/22 pass

## 1. 개요

Obsidian 시나리오 문서 (`시나리오/`)와 게임 코드 (`server/src/quest/`, `shared/types/chronoField.ts` 등) narrative 단일 진입점 SSOT.

## 2. 대표 SSOT 도메인

이 절은 초도 28개 핵심 도메인과 SYNC-101~105 runtime narrative 확장 도메인을 중심으로 정리한다. SYNC-100 기준 55+ 누적 도메인의 상세 진행 이력은 `progress.md`를 기준으로 한다.

### 2.1 핵심 도메인 (chapter I+II)

| 도메인 | 개수 | 설명 |
|---|---|---|
| SCENARIO_COMPANIONS | 6 | 동료 캐릭터 (세라핀/크리오/이그나/벤자민/레이나/우르그롬) |
| SCENARIO_ZONES | 9 | 시나리오 zone (에레보스/실반헤임/솔라리스/아르겐티움 등) |
| SCENARIO_BOSSES | 9 | 시나리오 보스 (말라투스/라와르/케인/레테 등) |
| SCENARIO_CHAPTERS | 5 | Obsidian Ch1~Ch5 |
| SCENARIO_ENDINGS | 5 | 멀티 엔딩 A/B/C/D/FAIL |
| SCENARIO_FRAGMENTS | 4 | 신성 기억 파편 (Ch1~Ch4 각 1개) |
| SCENARIO_DEITIES | 12 | 창세 11신 + 레테 배제 |
| SCENARIO_TIMELINE | 13 | 창세 → 게임 시작 연대표 |
| SCENARIO_MILESTONES | 5 | 챕터별 game-flow milestone |
| SCENARIO_DIALOGUES | 17+ | 핵심 NPC 대화 시그니처 |
| COMPANION_REPUTATION_REWARDS | 5 | 동료 합류 quest reputation 매핑 |
| SCENARIO_MYTHIC_RELICS | 4 | 엔딩 D 신화 유물 |
| SCENARIO_LORE_DOCUMENTS | 11 | 외전 (편지 5 + 도서 4 + 기억 조각 2) |
| SCENARIO_ZONE_CONNECTIONS | 8 | zone 이동 경로 |
| SCENARIO_CHAPTER_ROUTES | 5 | 챕터 진행 동선 |

### 2.2 chronoField extension (SYNC-33)

| 도메인 | 개수 | 설명 |
|---|---|---|
| SCENARIO_EXTRA_ZONES | 2 | chronoField 외 zone (에레보스/솔라리스) |
| SCENARIO_EXTRA_BOSSES | 1 | chronoField 외 보스 (라와르 3 phases) |

### 2.3 narrative 풍부도 (chapter V)

| 도메인 | 개수 | 설명 |
|---|---|---|
| COMPANION_CLASS_MAPPINGS | 6 | 동료 → STORY 7 클래스 매핑 |
| SCENARIO_CHAPTER_REWARDS | 5 | 챕터 종결 보상 + nextZone |
| COMPANION_STORY_ARCS | 6 | 동료 개인 서사 (coreSecret + revealChapter) |
| SCENARIO_CHAPTER_BGMS | 5 | 챕터 BGM track 매핑 |
| SCENARIO_SUB_PLOTS | 7 | 챕터별 부 이야기 narrative |
| SCENARIO_CHAPTER_DIFFICULTIES | 5 | 권장 레벨 + 보스 난이도 |
| SCENARIO_CHAPTER_VISUALS | 5 | 색상/분위기/의상 narrative |
| SCENARIO_EPIC_ITEMS | 5 | 챕터별 epic 아이템 |

### 2.4 chapter VII narrative 확장

| 도메인 | 개수 | 설명 |
|---|---|---|
| SCENARIO_PARTY_COMPOSITIONS | 5 | 챕터별 추천 동료 조합 |
| SCENARIO_MEMORY_RECALLS | 6 | 회상 narrative (에리언/동료/라와르) |
| SCENARIO_CHOICES | 6 | 분기 선택지 narrative |
| SCENARIO_FACTIONS | 7 | 세력 (엘파리스/이프리타/제국/교단 등) |
| SCENARIO_PREREQUISITES | 5 | 챕터 진입 prerequisite 그래프 |

### 2.5 runtime narrative 확장 (SYNC-101~105)

| 도메인 | 개수 | 설명 |
|---|---:|---|
| NPC 대화 화자 동적 분기 | 46 field NPC 대상 | 선택한 NPC의 `id/name/role`로 speakerName, opening, result를 생성 |
| SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES | 6 templates | quest/shop/dialogue/craft/boss default + `npc_ghost_merchant` override |
| SCENARIO_ZONE_ENTRY_NARRATIVES | 9 | zone 진입 mood/suggestion narrative |
| SCENARIO_BGM_NARRATIVES | 42 | BGM ID별 mood/intent/intensity narrative |
| SCENARIO_AMBIENT_NARRATIVES | 43 | ambient ID별 category/description narrative |

## 3. 사용 예시

### 3.1 동료 조회

```ts
import { getCompanionByObsidianId, listCompanionsByChapter } from './scenarioRegistry';

const seraphine = getCompanionByObsidianId('seraphine');
// { name: '세라핀', role: '엘파리스 정찰병', joinChapter: 1, gameNpcId: 'npc_seraphine', loyaltyThreshold: 50 }

const ch1Companions = listCompanionsByChapter(1);
// [세라핀, 마에스트로 크리오]
```

### 3.2 엔딩 평가

```ts
import { evaluateGameFlow, evaluateAdvancedEnding } from './scenarioRegistry';

// 엔딩 A 평가
const flow = evaluateGameFlow({
  completedQuests: new Set([
    'SQ_EREBOS_RUINS', 'SQ_SILVANHEIM_FRAGMENT',
    'SQ_SOLARIS_RAWAR', 'SQ_ARGENTIUM_FRAGMENT',
  ]),
  companionLoyalty: {
    seraphine: 50, maestro_crio: 40, ignara: 20,
    benjamin_cross: 40, reina: 30, urgrom: 40,
  },
});
// { achievableEnding: 'A', fragmentsCollected: 4, aliveCompanions: [...6] }

// 엔딩 D 평가 (신화 시대 회귀)
const advanced = evaluateAdvancedEnding({
  ...flow,
  metMinerva: true,
  mythicRelicsCount: 2,
});
// { achievableEnding: 'D', canAchieveEndingD: true }
```

### 3.3 신뢰도 시스템

```ts
import { applyReputationReward, evaluateLoyalty } from './scenarioRegistry';

// quest 완료 → 신뢰도 가산
const result = applyReputationReward('seraphine', 0, 'SQ_COMPANION_SERAPHINE');
// { newLoyalty: 50, meetsThreshold: true }

// 현재 신뢰도 평가
const loyalty = evaluateLoyalty('seraphine', 30);
// { hasLeft: true } (threshold 50 미만)
```

### 3.4 챕터 진행

```ts
import { evaluateChapterProgress, getMilestoneByChapter } from './scenarioRegistry';

const progress = evaluateChapterProgress(1, new Set(['MQ_CH01', 'SQ_COMPANION_SERAPHINE']));
// { progressRatio: 0.5, isComplete: false, pendingQuests: [...] }
```

### 3.5 worldmap 동선

```ts
import { getConnectionsFromZone, getRouteByChapter } from './scenarioRegistry';

const fromArgentium = getConnectionsFromZone('argentium');
// [→ palatino_lab, → oblivion_plateau]

const ch1Route = getRouteByChapter(1);
// { startZoneId: 'cantela_village', endZoneId: 'erebos' }
```

### 3.6 종합 통계

```ts
import { getScenarioRegistryStats, getSyncCompletionReport } from './scenarioRegistry';

const stats = getScenarioRegistryStats();
// legacy 25 도메인 중심 집계 helper.
// SYNC-101~105 runtime narrative 도메인은 직접 export 배열과 전용 테스트를 기준으로 확인한다.

const sync = getSyncCompletionReport();
// { coveragePercent: 100, companions: { synced: 6, planned: 0, orphan: 0 }, ... }
```

## 4. cross-domain 매핑 원칙

- **모든 entity 는 obsidianId snake_case**.
- **게임 매핑 필드 (gameNpcId, gameZoneId, gameBossId, gameQuestCode, gameItemId)** — 게임 코드 cross-reference.
- **planned* 필드** — 미동기 항목 추적 (SYNC-5~SYNC-8 에서 100% sync 완료).
- entity 간 reference (예: `fragment.zoneObsidianId`) 는 항상 다른 도메인의 obsidianId 참조.

## 5. 회귀 가드 위치

- `tests/unit/scenarioRegistry.test.ts` (legacy + chapter/domain stress)
- `tests/unit/npcDialogue.test.ts` (NPC 화자 동적 분기, 고로디 회귀)
- `tests/unit/fieldNpcDialogueTemplatesSSOT.test.ts` (SYNC-102, 7 tests)
- `tests/unit/zoneEntryNarrativesSSOT.test.ts` (SYNC-103, 5 tests)
- `tests/unit/bgmNarrativesSSOT.test.ts` (SYNC-104, 5 tests)
- `tests/unit/ambientNarrativesSSOT.test.ts` (SYNC-105, 5 tests)

## 6. 확장 절차

1. 새 entity 추가 → `SCENARIO_*` array 에 push
2. 인터페이스 확장 → 새 필드 추가
3. 헬퍼 함수 추가 → `getByObsidianId`, `listBy*` 패턴
4. 회귀 가드 추가 → legacy 도메인은 `scenarioRegistry.test.ts`, runtime 도메인은 전용 `*SSOT.test.ts`
5. 통계/검색 노출이 필요한 도메인은 `getScenarioRegistryStats` 또는 `buildScenarioIndex` 반영
6. 플레이 UI와 연결된 도메인은 브라우저 QA 로그에 실제 선택/진입 증거를 남김

## 7. Obsidian 출처

- 시나리오/에테르나크로니클_시나리오_마스터.md
- 시나리오/연대표_역사기록.md
- 시나리오/세계관외전/세계관_외전_문서.md
- 시나리오/NPC대화/*
- 시나리오/챕터/*
- 01_코어기획/멀티엔딩_플래그_설계.md
- 01_코어기획/엔딩D_유물_목록.md
- 01_코어기획/worldmap_design.md
- 01_코어기획/bgm_ai_music_design.md
- 월드맵/*
- 캐릭터/*

## 8. 변경 영향 매트릭스

| 변경 | 영향 도메인 | 회귀 가드 |
|---|---|---|
| 신규 동료 추가 | COMPANIONS + REPUTATION + DIALOGUES + MILESTONES | S1, S15, S22, S28, S26 |
| 신규 zone 추가 | ZONES + FRAGMENTS (zone) + RELICS (zone) + CONNECTIONS + ROUTES | S2, S16, S30, S34 |
| 신규 보스 추가 | BOSSES + MILESTONES (보스 quest) | S3, S26, S17 |
| 신규 quest 추가 (companion) | COMPANIONS.gameNpcId + REPUTATION + questSeeds + 정량 가드 | S15, S22, questCatalog S1 |
| 엔딩 분기 변경 | ENDINGS + evaluateEnding + evaluateAdvancedEnding | S5, S12, S27 |
| 필드 NPC 추가/role 변경 | FIELD_NPC_DIALOGUE_TEMPLATES + `npcDialogue` + browser QA | `npcDialogue.test.ts`, `fieldNpcDialogueTemplatesSSOT.test.ts` |
| zone seed BGM 변경 | BGM_NARRATIVES + zone seed cohesion | `bgmNarrativesSSOT.test.ts` |
| ambient ID 변경 | AMBIENT_NARRATIVES + category consistency | `ambientNarrativesSSOT.test.ts` |
| zone 진입 문구 변경 | ZONE_ENTRY_NARRATIVES + chapter/zone cohesion | `zoneEntryNarrativesSSOT.test.ts` |

---

**참조**: `docs/obsidian-game-mapping-2026-05-18.md` (초기 분석 보고서).
