# Obsidian 시나리오 ↔ 게임 코드 연결 상태 분석 (2026-05-18)

> 작업: 사용자 명시 "Obsidian 시나리오 문서와 게임 내 시나리오 스토리 및 퀘스트 연결 상태 체크"

## 1. 비교 대상

### Obsidian 시나리오 SSOT (master)
- `시나리오/에테르나크로니클_시나리오_마스터.md` — 5 Act 구조 (Ch1~Ch5)
- `시나리오/챕터/챕터1~8_시나리오.md` — 8 챕터 시나리오
- `00_인덱스/시나리오_인덱스.md` — 인덱스

### 게임 코드 SSOT
- `server/src/quest/questSeeds.ts` — 메인 퀘스트 15 chapter (MQ_CH01~MQ_CH15)
- `shared/types/chronoField.ts` — 7 zone (aether_plains, memory_forest, malatus_sanctuary, shadow_gorge, crystal_cave, forgotten_citadel, chrono_spire)
- `server/src/skill/skillSeeds.ts` — 6 클래스 스킬

## 2. Chapter 수 불일치

| Obsidian | 게임 코드 |
|---|---|
| **8 챕터** (Ch1~Ch8) — 시나리오 파일 | **15 chapter** (MQ_CH01~MQ_CH15) — 메인 퀘스트 |
| **5 Act** — master 문서 |  |

→ Obsidian Act-기반 vs 게임 세분화 chapter. 1:1 매핑 불가.

## 3. Zone narrative 매핑

| Obsidian zone | 게임 chronoField | 게임 questSeeds | 매핑 |
|---|---|---|---|
| 에레보스 (Ch1) | — | — | ❌ 게임 코드에 미정의 |
| 실반헤임 (Ch2) | memory_forest? | zone_veiled_forest | ⚠ 부분 일치 ('실반헤임' ↔ 'veiled') |
| 솔라리스 사막 (Ch3) | — | — | ❌ 게임 코드에 미정의 |
| 아르겐티움 (Ch4) | chrono_spire? | zone_argentium_*, zone_argentium_sewer | ⚠ 부분 일치 ('chrono_spire' = '크로노스 시계탑') |
| 망각의 고원 (Ch5) | forgotten_citadel | zone_oblivion_throne | ⚠ 부분 일치 |
| 칸텔라 마을 (Ch1) | — | — | ❌ 미정의 |
| (none) | aether_plains | — | ❌ Obsidian 미정의 |
| (none) | malatus_sanctuary | — | ✓ Obsidian Ch2 말라투스 고목 = 게임 zone narrative |
| (none) | shadow_gorge | — | ❌ Obsidian 미정의 |
| (none) | crystal_cave | zone_crystal_cavern_deep | ⚠ 게임 quest 일치, Obsidian 미정의 |

**핵심 불일치**: Obsidian zone (에레보스/실반헤임/솔라리스) ↔ 게임 chronoField zone (aether_plains/memory_forest/등) 명사 자체가 다른 도메인.

## 4. NPC 매핑

### Obsidian 주요 인물 (12+)
에리언 (주인공), 세라핀, 마에스트로 크리오, 이그나, 벤자민 크로스, 레이나, 우르그롬, 베르나르도, 케인, 황제 레나르도, 카일 (전생), 레테 (망각의 신), 미네르바, 마테우스, 누아리엘 (Ch3 솔라리스)

### 게임 questSeeds npcId
npc_nuariel, npc_bernardo, npc_bernardo_final, npc_clockmaker, npc_archivist, npc_blacksmith, npc_innkeeper, npc_pet_trainer, npc_guard_captain, npc_herbalist, npc_villager_01, npc_lost_explorer, npc_miner, npc_merchant_east/west/south, npc_shadow_master

### 매핑 결과

| Obsidian | 게임 | 매핑 |
|---|---|---|
| 누아리엘 (Ch3 솔라리스, 이프리타) | npc_nuariel (MQ_CH01 아르겐티움 외곽) | ⚠ 이름 일치, 위치 불일치 |
| 베르나르도 | npc_bernardo (MQ_CH04), npc_bernardo_final (MQ_CH12) | ✓ 완전 일치 |
| 세라핀 | — | ❌ 게임 NPC 미정의 |
| 마에스트로 크리오 | — | ❌ 게임 NPC 미정의 |
| 이그나 | — | ❌ 게임 NPC 미정의 |
| 벤자민 크로스 | — | ❌ 게임 NPC 미정의 |
| 레이나 | — | ❌ 게임 NPC 미정의 |
| 우르그롬 | — | ❌ 게임 NPC 미정의 |
| 케인 (기억 사냥꾼) | — | ❌ 게임 NPC 미정의 |
| 황제 레나르도 | — | ❌ 게임 NPC 미정의 |
| 레테 (최종 보스) | boss_oblivion_lord? | ⚠ 게임 보스 narrative 추정 |

**핵심 불일치**: Obsidian 12+ 인물 중 게임 NPC 일치 = 2명 (누아리엘 위치 불일치, 베르나르도 정확). 게임 코드 측 일치율 ~17%.

## 5. 보스 매핑

| Obsidian 보스 | 게임 questSeeds | chronoField 보스 | 매핑 |
|---|---|---|---|
| 기억의 골렘 (Ch1) | — | ancient_relic_golem? | ⚠ '골렘' 시그니처만 일치 |
| 말라투스 (Ch2 고목) | — | malatus_avatar, fallen_malatus | ✓ 일치 |
| 라와르 (Ch3 솔리안 왕) | — | — | ❌ 미정의 |
| 케인 (Ch4 중간 보스) | — | — | ❌ 미정의 |
| 레테 (Ch5 최종) | boss_oblivion_lord (MQ_CH15) | aetherna_collapse | ⚠ narrative 일치 ('망각/종말') |
| 베르나르도 (타락한, Ch4) | boss_bernardo_corrupted (MQ_CH12) | — | ✓ 일치 |
| 시간의 감시자 | boss_time_watcher (MQ_CH06) | — | ✓ 게임 자체 |
| 톱니 수호자 | boss_gear_guardian (MQ_CH11) | — | ✓ 게임 자체 |

**일치율**: 보스 11개 중 게임 ↔ Obsidian 직접 매핑 = 3 (말라투스/베르나르도/레테↔망각의 군주). 

## 6. 메인 퀘스트 narrative 매핑

| 게임 MQ | 게임 name/zone | Obsidian 챕터 매칭 |
|---|---|---|
| MQ_CH01 | 잃어버린 기억의 조각 / 아르겐티움 외곽 | ⚠ Ch1 (에레보스 — 위치 불일치) + '기억의 조각' 컨셉 일치 |
| MQ_CH02 | 시간의 균열 / 아르겐티움 하수도 | ⚠ Ch8 (시간의 균열 — name 일치, 위치 불일치) |
| MQ_CH03 | 망각의 숲 / 장막의 숲 | ✓ Ch2 (기억의 숲 — 컨셉 일치) |
| MQ_CH04 | 베르나르도의 배신 / 에테르 연구소 | ✓ Ch4 (제국의 심장과 배신자) |
| MQ_CH05 | 수정 동굴의 비밀 / 수정 동굴 | ❌ Obsidian 미정의 |
| MQ_CH06 | 심연의 문 / boss_time_watcher | ❌ Obsidian 미정의 |
| MQ_CH07 | 잊혀진 기록보관소 | ❌ Obsidian 미정의 (편지/도서 외전 일부 일치) |
| MQ_CH08 | 에테르 폭주 / 아르겐티움 | ⚠ Ch4 일부 일치 |
| MQ_CH09 | 그림자 직조자의 소환 | ❌ Obsidian 미정의 |
| MQ_CH10 | 기억의 바다 | ❌ Obsidian 미정의 |
| MQ_CH11 | 크로노스의 시계탑 | ⚠ '크로노스' 명사 (Obsidian 신화 11신 중 크로나이) |
| MQ_CH12 | 배반자의 선택 / boss_bernardo_corrupted | ✓ Ch4 베르나르도 일치 |
| MQ_CH13 | 망각의 왕좌 | ⚠ Ch5 '망각의 고원' 부분 일치 |
| MQ_CH14 | 에테르의 심장 | ⚠ Ch5 '4개 신성 기억 파편 통합' 부분 일치 |
| MQ_CH15 | 에테르나 크로니클 / boss_oblivion_lord | ✓ Ch5 최종 결전 일치 |

**매핑 결과**: 15 게임 chapter 중 ~7개 Obsidian narrative 부분/완전 일치 (~47%). 나머지 8개는 게임에서 신규 생성된 narrative.

## 7. 종합 평가

### 일치 (잘 연결됨, ~30%)
- **베르나르도 캐릭터 체인**: Obsidian Ch4 → 게임 MQ_CH04 + MQ_CH12 (npc_bernardo + npc_bernardo_final + boss_bernardo_corrupted)
- **말라투스 보스**: Obsidian Ch2 말라투스 ↔ 게임 chronoField malatus_avatar + fallen_malatus + malatus_sanctuary zone
- **최종 보스 narrative**: Obsidian Ch5 레테 ↔ 게임 boss_oblivion_lord (MQ_CH15) + chronoField aetherna_collapse
- **챕터 4 narrative cohesion**: 제국의 심장 + 배신자 컨셉 일치

### 부분 일치 (이름/컨셉 일부 매칭, ~40%)
- Zone: '실반헤임 ↔ 장막의 숲', '아르겐티움 ↔ chrono_spire 시계탑', '망각의 고원 ↔ forgotten_citadel/oblivion_throne'
- NPC: 누아리엘 (위치 불일치), 일부 chapter name (시간의 균열, 기억의 숲)

### 불일치 (게임 코드만 또는 Obsidian만, ~30%)
- **Obsidian 미반영 게임**: aether_plains, shadow_gorge, crystal_cave zone; MQ_CH05~CH11 일부; 5 클래스 (ether_knight/memory_weaver/shadow_weaver/memory_breaker/time_guardian/void_wanderer 스킬 트리)
- **게임 미반영 Obsidian**: 에레보스 (Ch1), 솔라리스 (Ch3), 칸텔라 마을, 동료 캐릭터 (세라핀/크리오/이그나/벤자민/레이나/우르그롬/케인/카일/레테/미네르바), 멀티 엔딩 4종 (A/B/C/D), MDS 시스템, 신뢰도 시스템, 12 신화 신
- **Chapter 수 격차**: Obsidian 5/8 ↔ 게임 15

## 8. 결론

**현재 상태**: 부분 연결 (~30~40% narrative 일치).

게임 코드는 Obsidian 시나리오를 일부 반영했지만, 다음 핵심 요소가 분리되어 있음:
1. **동료 캐릭터**: 6명 동료 (세라핀/이그나/벤자민/우르그롬/레이나/크리오) 가 게임 NPC에 미정의
2. **엔딩 시스템**: 4종 엔딩 (A/B/C/D) 가 게임 코드에 미반영
3. **세계관 zone**: Obsidian 5개 핵심 zone (에레보스/실반헤임/솔라리스/아르겐티움/망각의 고원) 중 게임은 다른 zone 7개 (aether_plains 등) 운영
4. **신화 체계**: 12 신 + 레테 배제 narrative 가 게임에 미반영

### 권장 (장기)
- Obsidian 핵심 인물/zone을 게임 코드에 동기화 (NPC 추가, zone 명사 통일)
- 멀티 엔딩 분기 게임 데이터 추가
- 챕터 매핑 SSOT 문서 (Obsidian Ch ↔ 게임 MQ) 작성

### 권장 (단기 — 회귀 가드)
- 현재 일치된 narrative 회귀 보호 (베르나르도 체인, 말라투스, 레테↔aetherna_collapse, 챕터 4 narrative)
