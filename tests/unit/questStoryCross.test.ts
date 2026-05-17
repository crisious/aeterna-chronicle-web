/**
 * Unit tests — 퀘스트 narrative ↔ STORY chronoField cross-domain (QUEST-QA-11)
 *
 * 퀘스트와 STORY (chronoField/dualTech/tripleTech/chronoEraAtb) 의 cross-domain narrative cohesion:
 * - 게임명 'aetherna' 시그니처 cross (퀘스트 MQ_CH15 + chronoField aetherna_collapse)
 * - 7 클래스 ↔ Tech partnerClasses (이미 STORY V3 검증, 여기서는 quest 측면)
 * - 시간선/시간 키워드 cross (퀘스트 chrono_ + chronoField chrono_)
 */
import { describe, it, expect } from 'vitest';
import { ALL_QUEST_SEEDS } from '../../server/src/quest/questSeeds';

describe('QUEST-QA-S29 — aetherna 게임명 시그니처 cross-domain', () => {
  it('MQ_CH15 "에테르나 크로니클" 게임명 narrative 시그니처', () => {
    const final = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH15');
    expect(final).toBeDefined();
    expect(final!.name).toContain('에테르나');
  });

  it('EQ_ANNIVERSARY 칭호 "에테르나의 동반자" 시그니처', () => {
    const ann = ALL_QUEST_SEEDS.find((q) => q.code === 'EQ_ANNIVERSARY');
    expect(ann).toBeDefined();
    const titleReward = ann!.rewards.find((r) => r.type === 'title');
    expect(titleReward).toBeDefined();
    expect(titleReward!.description).toContain('에테르나');
  });

  it('chronoField aetherna 시그니처 보스 = aetherna_eidolon + aetherna_collapse', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const bosses = listAllBossMonsterIds();
    const aetherna = bosses.filter((id) => id.startsWith('aetherna_'));
    expect(aetherna.length).toBe(2);
  });
});

describe('QUEST-QA-S30 — 시간/기억 narrative cross-domain', () => {
  it('퀘스트 메인 chapter 1 "기억" 시그니처 ↔ memory_forest narrative', async () => {
    const ch1 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH01');
    expect(ch1!.name).toContain('기억');
    // memory_forest zone 존재
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('memory_forest');
    expect(list.length).toBe(3);
  });

  it('퀘스트 chapter 11 "크로노스의 시계탑" ↔ chrono_spire zone narrative', async () => {
    const ch11 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH11');
    expect(ch11!.name).toContain('크로노');
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('chrono_spire');
    expect(list.length).toBe(3);
  });

  it('퀘스트 mob_time_wraith ↔ STORY 시간 시그니처 monster narrative', () => {
    // MQ_CH02 mob_time_wraith — 시간 narrative 일관
    const ch2 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH02');
    const hasTimeKill = ch2!.objectives.some(
      (o) => o.type === 'kill' && o.target === 'mob_time_wraith',
    );
    expect(hasTimeKill).toBe(true);
  });
});

describe('QUEST-QA-S31 — 보스 narrative cross-domain', () => {
  it('퀘스트 boss kill 목표 ≥ 5 (메인 보스 시그니처)', () => {
    let bossCount = 0;
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type === 'kill' && obj.target.startsWith('boss_')) {
          bossCount += 1;
        }
      }
    }
    expect(bossCount).toBeGreaterThanOrEqual(5);
  });

  it('퀘스트 boss target 모두 unique narrative (보스 1대 1퀘스트)', () => {
    const bossTargets = new Set<string>();
    const dupes: string[] = [];
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type === 'kill' && obj.target.startsWith('boss_')) {
          if (bossTargets.has(obj.target)) {
            dupes.push(obj.target);
          }
          bossTargets.add(obj.target);
        }
      }
    }
    expect(dupes, `dup boss targets: ${dupes.join(',')}`).toEqual([]);
  });
});

describe('QUEST-QA-S32 — STORY chronoField boss ↔ quest 보스 도메인 격리', () => {
  it('퀘스트의 boss_ 타겟은 chronoField 의 보스 id 와 격리 (다른 도메인 narrative)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const chronoBosses = new Set(listAllBossMonsterIds());

    // 퀘스트 boss_ 타겟 추출
    const questBosses = new Set<string>();
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type === 'kill' && obj.target.startsWith('boss_')) {
          questBosses.add(obj.target);
        }
      }
    }

    // 두 도메인 id 격리 (chronoField 보스는 prefix 없는 snake_case, 퀘스트 보스는 boss_ prefix)
    for (const qb of questBosses) {
      expect(chronoBosses.has(qb), `quest boss '${qb}' should not collide with chronoField`).toBe(false);
    }
  });

  it('퀘스트 monster (mob_) 도 chronoField id 와 격리 (도메인 분리)', async () => {
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const chronoMonsters = new Set(listAllFieldMonsterIds());

    const questMobs = new Set<string>();
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type === 'kill' && obj.target.startsWith('mob_')) {
          questMobs.add(obj.target);
        }
      }
    }

    for (const m of questMobs) {
      expect(chronoMonsters.has(m), `quest mob '${m}' collides with chronoField`).toBe(false);
    }
  });
});
