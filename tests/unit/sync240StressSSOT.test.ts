/**
 * 유닛 테스트 — SYNC-240: 🎯 10 sprint (231~240) 누적 stress + REPORT_REASONS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_FORMATIONS,
  SCENARIO_ENCOUNTER_BIOMES,
  SCENARIO_SHRINE_TYPES,
  SCENARIO_GUILD_PERMISSION_ROLES,
  SCENARIO_ITEM_DURABILITY_LEVELS,
  SCENARIO_ENEMY_ARCHETYPE_GROUPS,
  SCENARIO_LOOT_SOURCE_TYPES,
  SCENARIO_DAILY_RESET_TIMES,
  SCENARIO_CHAT_CHANNEL_TYPES,
  SCENARIO_REPORT_REASONS,
  getReportReasonNarrative,
  listReportReasonsByPriority,
  type ReportReason,
} from '../../shared/types/scenarioRegistry';

const REASONS: readonly ReportReason[] = ['toxicity', 'cheating', 'spam', 'inappropriate_name', 'account_abuse'];

describe('SYNC-240 🎯 10 sprint 누적 stress', () => {
  test('REPORT_REASONS — 5 사유 매칭', () => {
    expect(SCENARIO_REPORT_REASONS.length).toBe(5);
    for (const r of REASONS) {
      const n = getReportReasonNarrative(r);
      expect(n, r).toBeDefined();
      expect(n?.label.trim(), r).not.toBe('');
      expect(n?.autoActionHint.trim(), r).not.toBe('');
      expect(n?.routingDestination.trim(), r).not.toBe('');
    }
  });

  test('cheating / account_abuse 는 priority 1 (최고)', () => {
    expect(getReportReasonNarrative('cheating')?.priority).toBe(1);
    expect(getReportReasonNarrative('account_abuse')?.priority).toBe(1);
  });

  test('listReportReasonsByPriority ascending', () => {
    const sorted = listReportReasonsByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority);
    }
  });

  test('sync-231~240 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_BATTLE_FORMATIONS.length).toBe(4);
    expect(SCENARIO_ENCOUNTER_BIOMES.length).toBe(5);
    expect(SCENARIO_SHRINE_TYPES.length).toBe(5);
    expect(SCENARIO_GUILD_PERMISSION_ROLES.length).toBe(5);
    expect(SCENARIO_ITEM_DURABILITY_LEVELS.length).toBe(5);
    expect(SCENARIO_ENEMY_ARCHETYPE_GROUPS.length).toBe(5);
    expect(SCENARIO_LOOT_SOURCE_TYPES.length).toBe(5);
    expect(SCENARIO_DAILY_RESET_TIMES.length).toBe(4);
    expect(SCENARIO_CHAT_CHANNEL_TYPES.length).toBe(5);
    expect(SCENARIO_REPORT_REASONS.length).toBe(5);
  });

  test('sync-231~240 누적 48 entry 확보', () => {
    const total =
      SCENARIO_BATTLE_FORMATIONS.length +
      SCENARIO_ENCOUNTER_BIOMES.length +
      SCENARIO_SHRINE_TYPES.length +
      SCENARIO_GUILD_PERMISSION_ROLES.length +
      SCENARIO_ITEM_DURABILITY_LEVELS.length +
      SCENARIO_ENEMY_ARCHETYPE_GROUPS.length +
      SCENARIO_LOOT_SOURCE_TYPES.length +
      SCENARIO_DAILY_RESET_TIMES.length +
      SCENARIO_CHAT_CHANNEL_TYPES.length +
      SCENARIO_REPORT_REASONS.length;
    expect(total).toBe(48);
  });
});
