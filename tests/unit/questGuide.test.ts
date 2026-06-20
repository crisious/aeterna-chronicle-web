import { describe, expect, test } from 'vitest';

import { deriveQuestGuideFields, questGuideToFields, activeQuestToQuestItem } from '../../client/src/ui/questGuide';
import { buildQuestGuide } from '../../shared/types/scenarioRegistry';
import type { ActiveQuestData } from '../../client/src/network/NetworkManager';

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

  test('deriveQuestGuideFields — objective 종류별 Aseprite 안내 아이콘 리소스를 함께 반환한다', () => {
    const cases = [
      {
        type: 'explore',
        key: 'skill_vw_warp_icon',
        path: 'assets/generated/ui/icons/skills/skill_vw_warp.png',
      },
      {
        type: 'talk',
        key: 'ui_icon_chat_system',
        path: 'assets/generated/ui/icons/system/chat_system.png',
      },
      {
        type: 'kill',
        key: 'skill_ek_slash_icon',
        path: 'assets/generated/ui/icons/skills/skill_ek_slash.png',
      },
      {
        type: 'collect',
        key: 'icon_item_ITM-MAT_001',
        path: 'assets/generated/ui/icons/items/ITM-MAT-001.png',
      },
      {
        type: 'craft',
        key: 'icon_item_ITM-WPN_001',
        path: 'assets/generated/ui/icons/items/ITM-WPN-001.png',
      },
    ] as const;

    for (const c of cases) {
      const fields = deriveQuestGuideFields([{ type: c.type, description: `${c.type} 목표`, target: `${c.type}_target` }]);
      const record = fields as Record<string, unknown>;
      expect(record.actionIconImageKey, c.type).toBe(c.key);
      expect(record.actionIconImagePath, c.type).toBe(c.path);
    }
  });

  test('questGuideToFields — 서버 guide(QuestGuide)를 동일 규칙으로 매핑', () => {
    const guide = buildQuestGuide([{ type: 'kill', description: '시간 망령 처치', target: 'mob_time_wraith' }]);
    const f = questGuideToFields(guide);
    expect(f.actionHint).toContain('시간 망령 처치');
    expect(f.mapZoneId).toBe('mob_time_wraith'); // kill 도 opensMap=true
    expect((f as Record<string, unknown>).actionIconImageKey).toBe('skill_ek_slash_icon');
    expect(questGuideToFields(null)).toEqual({});
    expect(questGuideToFields(undefined)).toEqual({});
  });
});

describe('activeQuestToQuestItem — 서버 active 퀘스트 → HUD 행', () => {
  const makeActive = (over: Partial<ActiveQuestData> = {}): ActiveQuestData => ({
    questId: 'q1',
    status: 'in_progress',
    progress: [
      { objectiveIndex: 0, current: 1, target: 1, completed: true },
      { objectiveIndex: 1, current: 2, target: 5, completed: false },
    ],
    quest: {
      id: 'uuid-1',
      code: 'MQ_CH02',
      name: '두 번째 기억',
      type: 'main',
      objectives: [
        { type: 'talk', description: '완료된 대화', target: 'npc_a' },
        { type: 'kill', description: '시간 망령 5마리 처치', target: 'mob_time_wraith', count: 5 },
      ],
    },
    guide: buildQuestGuide([
      { type: 'talk', description: '완료된 대화', target: 'npc_a', completed: true },
      { type: 'kill', description: '시간 망령 5마리 처치', target: 'mob_time_wraith', completed: false },
    ]),
    ...over,
  });

  test('현재(첫 미완료) objective 기준으로 매핑한다', () => {
    const item = activeQuestToQuestItem(makeActive())!;
    expect(item.questId).toBe('MQ_CH02');
    expect(item.title).toBe('두 번째 기억');
    expect(item.isMainQuest).toBe(true);
    expect(item.isCompleted).toBe(false);
    expect(item.objectiveText).toBe('시간 망령 5마리 처치'); // 두 번째(미완료) objective
    expect(item.progressCurrent).toBe(2);
    expect(item.progressTarget).toBe(5);
    expect(item.actionHint).toContain('시간 망령 5마리 처치');
    expect(item.mapZoneId).toBe('mob_time_wraith'); // kill 은 opensMap
  });

  test('quest 상세가 null 이면 null 반환(호출부에서 제외)', () => {
    expect(activeQuestToQuestItem(makeActive({ quest: null }))).toBeNull();
  });

  test('guide 미부착이어도 objectives 로 직접 파생', () => {
    const a = makeActive({ guide: undefined });
    const item = activeQuestToQuestItem(a)!;
    expect(item.actionHint).toContain('시간 망령 5마리 처치');
  });

  test('비-main 타입은 isMainQuest=false', () => {
    const item = activeQuestToQuestItem(makeActive({
      quest: { id: 'u', code: 'SQ_X', name: '심부름', type: 'sub', objectives: [{ type: 'collect', description: '약초 채집', target: 'herb', count: 3 }] },
      progress: [{ objectiveIndex: 0, current: 0, target: 3, completed: false }],
    }))!;
    expect(item.isMainQuest).toBe(false);
    expect(item.progressTarget).toBe(3);
  });
});
