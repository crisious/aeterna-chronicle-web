# scenarioRegistry SSOT 사용 가이드

> 작성: 2026-05-22 (SYNC-29 자동 라운드)
> 모듈: `shared/types/scenarioRegistry.ts`
> 누적: 27 sprint, +236 가드, 115 SSOT entity, 30+ helpers, 237 회귀 가드

## 1. 개요

Obsidian 시나리오 문서 (`시나리오/`)와 게임 코드 (`server/src/quest/`, `shared/types/chronoField.ts` 등) narrative 단일 진입점 SSOT.

## 2. 15 SSOT 도메인

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
| SCENARIO_DIALOGUES | 14 | 핵심 NPC 대화 시그니처 |
| COMPANION_REPUTATION_REWARDS | 5 | 동료 합류 quest reputation 매핑 |
| SCENARIO_MYTHIC_RELICS | 4 | 엔딩 D 신화 유물 |
| SCENARIO_LORE_DOCUMENTS | 11 | 외전 (편지 5 + 도서 4 + 기억 조각 2) |
| SCENARIO_ZONE_CONNECTIONS | 8 | zone 이동 경로 |
| SCENARIO_CHAPTER_ROUTES | 5 | 챕터 진행 동선 |

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
// { companions: 6, zones: 9, ..., totalEntities: 115 }

const sync = getSyncCompletionReport();
// { coveragePercent: 100, companions: { synced: 6, planned: 0, orphan: 0 }, ... }
```

## 4. cross-domain 매핑 원칙

- **모든 entity 는 obsidianId snake_case**.
- **게임 매핑 필드 (gameNpcId, gameZoneId, gameBossId, gameQuestCode, gameItemId)** — 게임 코드 cross-reference.
- **planned* 필드** — 미동기 항목 추적 (SYNC-5~SYNC-8 에서 100% sync 완료).
- entity 간 reference (예: `fragment.zoneObsidianId`) 는 항상 다른 도메인의 obsidianId 참조.

## 5. 회귀 가드 위치

- `tests/unit/scenarioRegistry.test.ts` (237 가드)
- SYNC-S1 ~ SYNC-S37 (각 sprint 별 가드)

## 6. 확장 절차

1. 새 entity 추가 → `SCENARIO_*` array 에 push
2. 인터페이스 확장 → 새 필드 추가
3. 헬퍼 함수 추가 → `getByObsidianId`, `listBy*` 패턴
4. 회귀 가드 추가 → `tests/unit/scenarioRegistry.test.ts`
5. `getScenarioRegistryStats` 자동 반영
6. `buildScenarioIndex` 새 도메인 entry 추가

## 7. Obsidian 출처

- 시나리오/에테르나크로니클_시나리오_마스터.md
- 시나리오/연대표_역사기록.md
- 시나리오/세계관외전/세계관_외전_문서.md
- 시나리오/NPC대화/*
- 시나리오/챕터/*
- 01_코어기획/멀티엔딩_플래그_설계.md
- 01_코어기획/엔딩D_유물_목록.md
- 01_코어기획/worldmap_design.md

## 8. 변경 영향 매트릭스

| 변경 | 영향 도메인 | 회귀 가드 |
|---|---|---|
| 신규 동료 추가 | COMPANIONS + REPUTATION + DIALOGUES + MILESTONES | S1, S15, S22, S28, S26 |
| 신규 zone 추가 | ZONES + FRAGMENTS (zone) + RELICS (zone) + CONNECTIONS + ROUTES | S2, S16, S30, S34 |
| 신규 보스 추가 | BOSSES + MILESTONES (보스 quest) | S3, S26, S17 |
| 신규 quest 추가 (companion) | COMPANIONS.gameNpcId + REPUTATION + questSeeds + 정량 가드 | S15, S22, questCatalog S1 |
| 엔딩 분기 변경 | ENDINGS + evaluateEnding + evaluateAdvancedEnding | S5, S12, S27 |

---

**참조**: `docs/obsidian-game-mapping-2026-05-18.md` (초기 분석 보고서).
