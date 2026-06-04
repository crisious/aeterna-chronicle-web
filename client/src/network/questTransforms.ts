/**
 * questTransforms — 서버 퀘스트 행 ↔ 클라 QuestData 변환 (순수 함수, DOM/Phaser 비의존).
 *
 * 서버 GET /api/quests 는 DB 행을 가공 없이 반환한다: objectives 는 {type,target,count,description},
 * rewards 는 [{type,itemId,amount,description}]. 그런데 클라 QuestData 계약은 objectives:{desc,current,
 * target} + rewards:{exp,gold,items} + status 다. 이 불일치(타입 거짓말) 때문에 LobbyScene 퀘스트
 * 보드가 서버 데이터로는 "undefined undefined/undefined"·"EXP undefined" 로 깨졌다. 여기서 정직하게 매핑한다.
 */
import type { QuestData, ActiveQuestData } from './NetworkManager';

/** 서버 GET /api/quests 가 반환하는 가공 전 퀘스트 행(필요 필드만, 전부 optional 로 방어). */
export interface RawQuestRow {
  id?: string;
  code?: string;
  name?: string;
  description?: string;
  type?: string;
  objectives?: Array<{ type?: string; target?: string; count?: number; description?: string }>;
  rewards?: Array<{ type?: string; itemId?: string; amount?: number; description?: string }>;
}

/** 서버 퀘스트 행 → QuestData(카탈로그 기본 status='available', 진행도는 0). */
export function rawQuestRowToQuestData(row: RawQuestRow): QuestData {
  const objectives = (row.objectives ?? []).map((o) => ({
    desc: o.description ?? '',
    current: 0,
    target: o.count ?? 1,
  }));
  const rewards = row.rewards ?? [];
  const items = rewards
    .filter((r) => r.type === 'item')
    .map((r) => r.description || r.itemId || '')
    .filter((s): s is string => s !== '');
  return {
    id: row.id ?? row.code ?? '',
    name: row.name ?? '',
    description: row.description ?? '',
    status: 'available',
    objectives,
    rewards: {
      exp: rewards.find((r) => r.type === 'exp')?.amount ?? 0,
      gold: rewards.find((r) => r.type === 'gold')?.amount ?? 0,
      items,
    },
  };
}

/**
 * 진행 중(active) 상태를 카탈로그에 오버레이한다.
 * 수주한 퀘스트는 status='active'(전 objective 달성 시 'complete') + 실 진행도(current/target)로 바뀐다.
 * 매칭 키는 quest row id. active 가 없으면 카탈로그 항목을 그대로 둔다.
 */
export function mergeActiveQuestStatus(catalog: QuestData[], active: ActiveQuestData[]): QuestData[] {
  const activeById = new Map<string, ActiveQuestData>();
  for (const a of active) {
    if (a.quest?.id) activeById.set(a.quest.id, a);
  }
  return catalog.map((q) => {
    const a = activeById.get(q.id);
    if (!a || !a.quest) return q;
    const objectives = (a.quest.objectives ?? []).map((o, i) => {
      const p = a.progress.find((pp) => pp.objectiveIndex === i);
      return {
        desc: o.description ?? '',
        current: p?.current ?? 0,
        target: p?.target ?? o.count ?? 1,
      };
    });
    const allDone = objectives.length > 0 && objectives.every((o) => o.current >= o.target);
    return { ...q, status: allDone ? 'complete' : 'active', objectives };
  });
}
