import { describe, expect, test } from 'vitest';

import { deriveQuestGuideFields, questGuideToFields } from '../../client/src/ui/questGuide';
import { buildQuestGuide } from '../../shared/types/scenarioRegistry';

/**
 * 유닛 테스트 — questGuide 표현 레이어(wiring). SSOT buildQuestGuide(SYNC-258)를 QuestItem
 * 안내 필드(actionHint/mapZoneId)로 매핑하는 규칙을 박제: opensMap 일 때만 mapZoneId 노출.
 */
describe('questGuide wiring', () => {
  test('deriveQuestGuideFields — explore 는 actionHint + mapZoneId(target) 둘 다', () => {
    const f = deriveQuestGuideFields([{ type: 'explore', description: '안개 빈터 도달', target: 'zone_fog_clearing' }]);
    expect(f.actionHint).toContain('안개 빈터 도달');
    expect(f.mapZoneId).toBe('zone_fog_clearing');
  });

  test('deriveQuestGuideFields — craft 는 actionHint 만, mapZoneId 없음', () => {
    const f = deriveQuestGuideFields([{ type: 'craft', description: '시계태엽 제작', target: 'clockwork_gear' }]);
    expect(f.actionHint).toContain('시계태엽 제작');
    expect(f.mapZoneId).toBeUndefined();
  });

  test('deriveQuestGuideFields — objective 없으면 빈 객체(렌더 안 됨)', () => {
    expect(deriveQuestGuideFields([])).toEqual({});
  });

  test('questGuideToFields — 서버 guide(QuestGuide)를 동일 규칙으로 매핑', () => {
    const guide = buildQuestGuide([{ type: 'kill', description: '시간 망령 처치', target: 'mob_time_wraith' }]);
    const f = questGuideToFields(guide);
    expect(f.actionHint).toContain('시간 망령 처치');
    expect(f.mapZoneId).toBe('mob_time_wraith'); // kill 도 opensMap=true
    expect(questGuideToFields(null)).toEqual({});
    expect(questGuideToFields(undefined)).toEqual({});
  });
});
