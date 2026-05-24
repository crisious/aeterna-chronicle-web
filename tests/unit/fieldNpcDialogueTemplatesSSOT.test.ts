/**
 * 유닛 테스트 — SYNC-102: SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES SSOT consistency
 *
 * scenarioRegistry 의 필드 NPC 대화 템플릿이
 * 1) 5종 role default + 1종 npc 특화 (npc_ghost_merchant) 를 모두 포함한다
 * 2) 각 선택지는 results 항목과 1:1 매칭되며 닫기 류 외에는 텍스트가 비어 있지 않다
 * 3) override 가 role default 보다 우선 적용된다
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES,
  applyFieldNpcNameToken,
  getFieldNpcOverrideTemplate,
  getFieldNpcRoleTemplate,
  resolveFieldNpcTemplate,
} from '../../shared/types/scenarioRegistry';

const REQUIRED_ROLE_KEYS = ['shop', 'quest', 'craft', 'dialogue', 'boss'] as const;

describe('SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES', () => {
  test('5종 role default + 최소 1종 npc 특화를 포함한다', () => {
    for (const role of REQUIRED_ROLE_KEYS) {
      const tpl = getFieldNpcRoleTemplate(role);
      expect(tpl, role).toBeDefined();
      expect(tpl?.kind, role).toBe('role');
    }
    const ghost = getFieldNpcOverrideTemplate('npc_ghost_merchant');
    expect(ghost).toBeDefined();
    expect(ghost?.kind).toBe('npc');
  });

  test('각 템플릿은 openingLine 비어 있지 않고 선택지가 최소 2개 이상이다', () => {
    for (const tpl of SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES) {
      expect(tpl.openingLine.trim(), tpl.key).not.toBe('');
      expect(tpl.choices.length, tpl.key).toBeGreaterThanOrEqual(2);
      for (const choice of tpl.choices) {
        expect(choice.choiceId.trim(), `${tpl.key}:${choice.choiceId}`).not.toBe('');
        expect(choice.label.trim(), `${tpl.key}:${choice.choiceId}`).not.toBe('');
      }
    }
  });

  test('모든 선택지는 results 와 1:1 매칭되고 닫기 외에는 resultLine 이 비어 있지 않다', () => {
    for (const tpl of SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES) {
      const choiceIds = tpl.choices.map((c) => c.choiceId);
      const resultIds = tpl.results.map((r) => r.choiceId);
      expect(new Set(resultIds), tpl.key).toEqual(new Set(choiceIds));
      for (const result of tpl.results) {
        if (result.resultLine === null) {
          continue;
        }
        expect(result.resultLine.trim(), `${tpl.key}:${result.choiceId}`).not.toBe('');
      }
    }
  });

  test('npc 특화 override 가 role default 보다 우선 적용된다', () => {
    const tpl = resolveFieldNpcTemplate('npc_ghost_merchant', 'shop');
    expect(tpl?.kind).toBe('npc');
    expect(tpl?.key).toBe('npc_ghost_merchant');
  });

  test('id 미지정 시 role default 로 폴백한다', () => {
    const tpl = resolveFieldNpcTemplate('', 'shop');
    expect(tpl?.kind).toBe('role');
    expect(tpl?.key).toBe('shop');
  });

  test('id/role 모두 미지정 시 어떤 템플릿도 매칭되지 않는다', () => {
    expect(resolveFieldNpcTemplate('', '')).toBeUndefined();
  });

  test('applyFieldNpcNameToken 은 {name} 토큰을 모두 치환한다', () => {
    expect(applyFieldNpcNameToken('{name}의 의뢰', '루미나')).toBe('루미나의 의뢰');
    expect(applyFieldNpcNameToken('{name}이 {name}을 부른다', '에리언')).toBe('에리언이 에리언을 부른다');
    expect(applyFieldNpcNameToken('토큰 없음', '루미나')).toBe('토큰 없음');
  });
});
