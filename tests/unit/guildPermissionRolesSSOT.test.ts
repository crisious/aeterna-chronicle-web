/**
 * 유닛 테스트 — SYNC-234: SCENARIO_GUILD_PERMISSION_ROLES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GUILD_PERMISSION_ROLES,
  getGuildPermissionRoleNarrative,
  listGuildRolesByHierarchy,
  type GuildPermissionRole,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GuildPermissionRole[] = ['member', 'officer', 'raid_leader', 'treasurer', 'leader'];

describe('SCENARIO_GUILD_PERMISSION_ROLES', () => {
  test('5 역할 모두 정의', () => {
    expect(SCENARIO_GUILD_PERMISSION_ROLES.length).toBe(5);
    for (const r of ALL) {
      expect(getGuildPermissionRoleNarrative(r), r).toBeDefined();
    }
  });

  test('leader 의 hierarchyLevel 이 가장 높음', () => {
    const max = Math.max(...SCENARIO_GUILD_PERMISSION_ROLES.map((r) => r.hierarchyLevel));
    expect(getGuildPermissionRoleNarrative('leader')?.hierarchyLevel).toBe(max);
  });

  test('member 의 hierarchyLevel 이 가장 낮음 (1)', () => {
    expect(getGuildPermissionRoleNarrative('member')?.hierarchyLevel).toBe(1);
  });

  test('label/permissions 비어 있지 않음', () => {
    for (const r of SCENARIO_GUILD_PERMISSION_ROLES) {
      expect(r.label.trim(), r.role).not.toBe('');
      expect(r.permissions.length, r.role).toBeGreaterThan(0);
    }
  });

  test('listGuildRolesByHierarchy ascending', () => {
    const sorted = listGuildRolesByHierarchy();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].hierarchyLevel).toBeGreaterThanOrEqual(sorted[i - 1].hierarchyLevel);
    }
  });
});
