/**
 * Unit tests — Obsidian 시나리오 ↔ 게임 코드 연결 회귀 가드 (OBS-2)
 *
 * Obsidian 시나리오 SSOT 와 게임 코드 (questSeeds + chronoField) 사이에서
 * 현재 연결된 narrative 가 회귀 없이 유지되는지 검증.
 *
 * 분석 보고서: .gstack/obsidian-game-mapping-2026-05-18.md
 */
import { describe, it, expect } from 'vitest';
import { ALL_QUEST_SEEDS } from '../../server/src/quest/questSeeds';

describe('OBS-S1 — 베르나르도 캐릭터 narrative 회귀 가드', () => {
  it('npc_bernardo (Obsidian Ch4 베르나르도) MQ_CH04 에 등장', () => {
    const ch4 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH04');
    expect(ch4).toBeDefined();
    expect(ch4!.objectives.some((o) => o.target === 'npc_bernardo')).toBe(true);
  });

  it('npc_bernardo_final (Obsidian Ch4 최후 대화) MQ_CH12 에 등장', () => {
    const ch12 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH12');
    expect(ch12).toBeDefined();
    expect(ch12!.objectives.some((o) => o.target === 'npc_bernardo_final')).toBe(true);
  });

  it('boss_bernardo_corrupted (타락한 베르나르도) MQ_CH12 보스로 등장', () => {
    const ch12 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH12');
    expect(ch12!.objectives.some((o) => o.target === 'boss_bernardo_corrupted')).toBe(true);
  });

  it('MQ_CH04 name "베르나르도의 배신" 시그니처', () => {
    const ch4 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH04');
    expect(ch4!.name).toContain('베르나르도');
  });
});

describe('OBS-S2 — 말라투스 narrative 회귀 가드 (Obsidian Ch2 ↔ chronoField)', () => {
  it('chronoField malatus_sanctuary zone 존재 (말라투스 zone narrative)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('malatus_sanctuary');
    expect(list.length).toBe(3);
  });

  it('chronoField malatus_avatar 보스 존재 (Obsidian 말라투스 화신)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    expect(listAllBossMonsterIds()).toContain('malatus_avatar');
  });

  it('chronoField fallen_malatus 보스 존재 (Obsidian 타락한 말라투스)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    expect(listAllBossMonsterIds()).toContain('fallen_malatus');
  });

  it('말라투스 name 한글 narrative "말라투스" 포함', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    let found = false;
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        if (slot.name.includes('말라투스')) found = true;
      }
    }
    expect(found, '말라투스 name narrative').toBe(true);
  });
});

describe('OBS-S3 — 레테/최종 보스 narrative 회귀 가드 (Obsidian Ch5)', () => {
  it('MQ_CH15 "에테르나 크로니클" 최종 chapter 시그니처', () => {
    const ch15 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH15');
    expect(ch15).toBeDefined();
    expect(ch15!.name).toContain('에테르나');
  });

  it('boss_oblivion_lord (Obsidian 레테 ~ 망각의 군주) MQ_CH15 보스 등장', () => {
    const ch15 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH15');
    expect(ch15!.objectives.some((o) => o.target === 'boss_oblivion_lord')).toBe(true);
  });

  it('MQ_CH13 "망각의 왕좌" — Obsidian Ch5 망각의 고원 narrative', () => {
    const ch13 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH13');
    expect(ch13!.name).toContain('망각');
  });

  it('chronoField aetherna_collapse "에테르나의 종말" — 게임 정점 보스 (~Obsidian 레테)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const final = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const boss = final.monsterPool.find((s) => s.isBoss)!;
    expect(boss.monsterId).toBe('aetherna_collapse');
    expect(boss.name).toContain('종말');
  });
});

describe('OBS-S4 — 챕터 narrative 부분 일치 회귀 가드', () => {
  it('MQ_CH02 "시간의 균열" — Obsidian Ch8 동일 narrative', () => {
    const ch2 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH02');
    expect(ch2!.name).toContain('시간');
    expect(ch2!.name).toContain('균열');
  });

  it('MQ_CH03 "망각의 숲" — Obsidian Ch2 기억의 숲 narrative', () => {
    const ch3 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH03');
    expect(ch3!.name).toContain('숲');
  });

  it('MQ_CH11 "크로노스의 시계탑" — Obsidian 크로나이 신 시그니처', () => {
    const ch11 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH11');
    expect(ch11!.name).toContain('크로노');
  });

  it('MQ_CH01 "잃어버린 기억의 조각" — Obsidian 기억 파편 narrative', () => {
    const ch1 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH01');
    expect(ch1!.name).toContain('기억');
  });
});

describe('OBS-S5 — 누아리엘 캐릭터 narrative 회귀 (위치 불일치 인지)', () => {
  it('npc_nuariel MQ_CH01 에 등장 (Obsidian 솔라리스 Ch3 인물, 게임 위치 차이)', () => {
    const ch1 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH01');
    expect(ch1!.objectives.some((o) => o.target === 'npc_nuariel')).toBe(true);
  });
});

describe('OBS-S6 — Obsidian 미정의 zone (게임 자체 narrative) 회귀 가드', () => {
  it('aether_plains zone (Obsidian 미정의, 게임 자체 시작 zone)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    expect(listFieldEncountersByZone('aether_plains').length).toBe(3);
  });

  it('shadow_gorge zone (Obsidian 미정의, 게임 자체 그림자 협곡)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    expect(listFieldEncountersByZone('shadow_gorge').length).toBe(3);
  });

  it('crystal_cave zone (Obsidian 미정의, 게임 자체 수정 동굴)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    expect(listFieldEncountersByZone('crystal_cave').length).toBe(3);
  });
});

describe('OBS-S7 — Obsidian SSOT 파일 존재 (regression guard)', () => {
  it('시나리오 master 파일 존재', async () => {
    const fs = await import('fs/promises');
    const path = '시나리오/에테르나크로니클_시나리오_마스터.md';
    const stat = await fs.stat(path).catch(() => null);
    expect(stat, `${path} not found`).not.toBeNull();
  });

  it('챕터 1~5 시나리오 파일 모두 존재', async () => {
    const fs = await import('fs/promises');
    for (let i = 1; i <= 5; i += 1) {
      const path = `시나리오/챕터/챕터${i}_시나리오.md`;
      const stat = await fs.stat(path).catch(() => null);
      expect(stat, `${path} not found`).not.toBeNull();
    }
  });

  it('시나리오 인덱스 파일 존재', async () => {
    const fs = await import('fs/promises');
    const stat = await fs.stat('00_인덱스/시나리오_인덱스.md').catch(() => null);
    expect(stat).not.toBeNull();
  });
});
