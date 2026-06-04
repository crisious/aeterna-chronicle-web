import { describe, expect, test } from 'vitest';

import { rawQuestRowToQuestData, mergeActiveQuestStatus } from '../../client/src/network/questTransforms';
import type { QuestData, ActiveQuestData } from '../../client/src/network/NetworkManager';

/**
 * 유닛 테스트 — questTransforms. 서버 raw 퀘스트 행 → QuestData 정직 매핑 + active 상태 오버레이.
 * LobbyScene 퀘스트 보드가 서버 데이터로 'undefined undefined/undefined' 로 깨지던 회귀를 가드한다.
 */
describe('rawQuestRowToQuestData', () => {
  test('objectives 를 {desc,current:0,target:count} 로, rewards 를 {exp,gold,items} 로 매핑', () => {
    const q = rawQuestRowToQuestData({
      id: 'uuid-1',
      code: 'MQ_CH01',
      name: '잃어버린 기억의 조각',
      description: '기억 파편을 모은다.',
      type: 'main',
      objectives: [
        { type: 'collect', target: 'memory_shard_ch1', count: 3, description: '기억 파편 수집' },
        { type: 'talk', target: 'npc_a', count: 1, description: '장로에게 보고' },
      ],
      rewards: [
        { type: 'exp', amount: 120, description: '' },
        { type: 'gold', amount: 80, description: '' },
        { type: 'item', itemId: 'item_x', amount: 1, description: '시간 파편' },
      ],
    });
    expect(q.id).toBe('uuid-1');
    expect(q.name).toBe('잃어버린 기억의 조각');
    expect(q.status).toBe('available');
    expect(q.objectives).toEqual([
      { desc: '기억 파편 수집', current: 0, target: 3 },
      { desc: '장로에게 보고', current: 0, target: 1 },
    ]);
    expect(q.rewards.exp).toBe(120);
    expect(q.rewards.gold).toBe(80);
    expect(q.rewards.items).toEqual(['시간 파편']);
  });

  test('필드 누락 행에도 안전한 기본값(LobbyScene undefined 표시 회귀 방지)', () => {
    const q = rawQuestRowToQuestData({ id: 'q1' });
    expect(q.id).toBe('q1');
    expect(q.name).toBe('');
    expect(q.status).toBe('available');
    expect(q.objectives).toEqual([]);
    expect(q.rewards).toEqual({ exp: 0, gold: 0, items: [] });
  });

  test('id 없으면 code 로 폴백', () => {
    expect(rawQuestRowToQuestData({ code: 'DQ_X' }).id).toBe('DQ_X');
  });
});

describe('mergeActiveQuestStatus', () => {
  const catalog: QuestData[] = [
    { id: 'a', name: 'A', description: '', status: 'available', objectives: [{ desc: 'x', current: 0, target: 3 }], rewards: { exp: 1, gold: 1 } },
    { id: 'b', name: 'B', description: '', status: 'available', objectives: [{ desc: 'y', current: 0, target: 1 }], rewards: { exp: 1, gold: 1 } },
  ];

  const mkActive = (id: string, current: number, target: number): ActiveQuestData => ({
    questId: id,
    status: 'in_progress',
    progress: [{ objectiveIndex: 0, current, target, completed: current >= target }],
    quest: { id, code: id.toUpperCase(), name: id, type: 'sub', objectives: [{ type: 'collect', target: 't', count: target, description: '진행 목표' }] },
  });

  test('수주한 퀘스트는 status=active + 실 진행도로 오버레이, 나머지는 그대로', () => {
    const merged = mergeActiveQuestStatus(catalog, [mkActive('a', 2, 3)]);
    const a = merged.find((q) => q.id === 'a')!;
    const b = merged.find((q) => q.id === 'b')!;
    expect(a.status).toBe('active');
    expect(a.objectives).toEqual([{ desc: '진행 목표', current: 2, target: 3 }]);
    expect(b.status).toBe('available'); // 미수주 → 변화 없음
  });

  test('전 objective 달성이면 status=complete', () => {
    const merged = mergeActiveQuestStatus(catalog, [mkActive('a', 3, 3)]);
    expect(merged.find((q) => q.id === 'a')!.status).toBe('complete');
  });

  test('active 가 비면 카탈로그 그대로', () => {
    expect(mergeActiveQuestStatus(catalog, [])).toEqual(catalog);
  });
});
