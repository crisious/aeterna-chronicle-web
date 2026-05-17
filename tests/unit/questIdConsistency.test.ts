/**
 * Unit tests — 퀘스트 ID naming 일관성 narrative (QUEST-QA-9)
 *
 * objectives.target + npcId + reward.itemId 의 naming 패턴 + 도메인 분포 검증.
 */
import { describe, it, expect } from 'vitest';
import { ALL_QUEST_SEEDS } from '../../server/src/quest/questSeeds';

describe('QUEST-QA-S25 — objectives.target naming 일관성', () => {
  it('talk objective target 모두 npc_ prefix narrative', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type !== 'talk') continue;
        // any_npc 같은 wildcard 도 허용
        const isWildcard = obj.target === 'any_npc';
        const isNpc = obj.target.startsWith('npc_');
        expect(isWildcard || isNpc, `${q.code} talk target '${obj.target}'`).toBe(true);
      }
    }
  });

  it('explore objective target 모두 zone_ prefix 또는 wildcard narrative', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type !== 'explore') continue;
        const isWildcard = ['summer_minigame', 'daily_zone_a', 'daily_zone_b'].includes(obj.target);
        const isZone = obj.target.startsWith('zone_');
        expect(isWildcard || isZone, `${q.code} explore target '${obj.target}'`).toBe(true);
      }
    }
  });

  it('kill objective target naming 패턴 (mob_/boss_/wildcard) narrative', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type !== 'kill') continue;
        const wildcards = [
          'any_monster', 'elite_monster', 'pvp_match', 'pvp_win',
          'raid_participation', 'raid_clear', 'field_boss',
          'mob_training_dummy', 'mob_guild_trial',
        ];
        const isWildcard = wildcards.includes(obj.target);
        const isMobOrBoss = obj.target.startsWith('mob_') || obj.target.startsWith('boss_');
        expect(isWildcard || isMobOrBoss, `${q.code} kill target '${obj.target}'`).toBe(true);
      }
    }
  });

  it('craft objective target 모두 snake_case 또는 wildcard', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type !== 'craft') continue;
        expect(obj.target.match(/^[a-z][a-z0-9_]*$/), `${q.code} craft target '${obj.target}'`).not.toBeNull();
      }
    }
  });

  it('collect objective target 모두 snake_case narrative', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type !== 'collect') continue;
        expect(obj.target.match(/^[a-z][a-z0-9_]*$/), `${q.code} collect target '${obj.target}'`).not.toBeNull();
      }
    }
  });
});

describe('QUEST-QA-S26 — npcId 도메인', () => {
  it('npcId 보유 퀘스트 모두 npc_ prefix + 비빈', () => {
    const withNpc = ALL_QUEST_SEEDS.filter((q) => q.npcId);
    expect(withNpc.length).toBeGreaterThanOrEqual(5);
    for (const q of withNpc) {
      expect(q.npcId!.startsWith('npc_'), `${q.code} npcId`).toBe(true);
      expect(q.npcId!.length).toBeGreaterThan(4);
    }
  });

  it('npcId snake_case 정합 (npc_ 뒤 영소문자/숫자/_)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      if (q.npcId) {
        expect(q.npcId.match(/^npc_[a-z][a-z0-9_]*$/), `${q.code} npcId '${q.npcId}'`).not.toBeNull();
      }
    }
  });
});

describe('QUEST-QA-S27 — reward itemId naming', () => {
  it('item 보상 itemId 모두 item_ prefix + snake_case', () => {
    for (const q of ALL_QUEST_SEEDS) {
      for (const r of q.rewards) {
        if (r.type !== 'item') continue;
        // item_ 또는 recipe_ 또는 potion_ 시그니처 허용
        const allowed = ['item_', 'recipe_'];
        const isAllowed = allowed.some((p) => r.itemId!.startsWith(p));
        expect(isAllowed, `${q.code} reward itemId '${r.itemId}'`).toBe(true);
        expect(r.itemId!.match(/^[a-z][a-z0-9_]*$/), `${r.itemId} snake_case`).not.toBeNull();
      }
    }
  });

  it('reward itemId unique per quest (한 퀘스트 내 같은 itemId 보상 중복 없음)', () => {
    for (const q of ALL_QUEST_SEEDS) {
      const itemIds = q.rewards
        .filter((r) => r.type === 'item' && r.itemId)
        .map((r) => r.itemId!);
      expect(new Set(itemIds).size, `${q.code} item dup`).toBe(itemIds.length);
    }
  });
});

describe('QUEST-QA-S28 — chapter 시그니처 narrative cross', () => {
  it('chapter 1~3 (초반): requiredLevel ≤ 6 (초반 진입)', () => {
    const main1To3 = ALL_QUEST_SEEDS.filter((q) => q.type === 'main' && (q.chapter ?? 0) <= 3);
    for (const q of main1To3) {
      expect(q.requiredLevel, `${q.code} level`).toBeLessThanOrEqual(6);
    }
  });

  it('chapter 14~15 (종반): requiredLevel ≥ 55 (최종 도달)', () => {
    const main14To15 = ALL_QUEST_SEEDS.filter((q) => q.type === 'main' && (q.chapter ?? 0) >= 14);
    for (const q of main14To15) {
      expect(q.requiredLevel, `${q.code} level`).toBeGreaterThanOrEqual(55);
    }
  });

  it('chapter 6 (첫 보스): "시간의 감시자" boss kill 목표', () => {
    const ch6 = ALL_QUEST_SEEDS.find((q) => q.code === 'MQ_CH06');
    expect(ch6).toBeDefined();
    const hasBoss = ch6!.objectives.some(
      (o) => o.type === 'kill' && o.target.startsWith('boss_'),
    );
    expect(hasBoss).toBe(true);
  });
});
