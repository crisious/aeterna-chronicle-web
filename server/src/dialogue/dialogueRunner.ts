/**
 * dialogueRunner.ts — NPC 대화 트리 실행 엔진 (P5-09)
 *
 * 역할:
 *   - NPC 대화 트리 순회/실행
 *   - 조건부 분기 (호감도/퀘스트 상태/아이템 보유/스토리 플래그)
 *   - 선택지 → 결과 처리 (호감도 변경, 퀘스트 수주, 아이템 지급, 플래그 설정)
 *   - 대화 이력 저장
 */

import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 대화 노드 */
export interface DialogueNode {
  id: string;
  speaker: string;
  portrait?: string;
  text: string;
  voiceKey?: string;
  options?: DialogueOption[];
  next?: string;          // 자동 진행 (옵션 없을 때)
  effects?: DialogueEffect[];
  isEnd?: boolean;
}

/** 대화 선택지 */
export interface DialogueOption {
  id: string;
  text: string;
  nextNodeId: string;
  condition?: DialogueCondition;
  effects?: DialogueEffect[];
}

/** 분기 조건 */
export interface DialogueCondition {
  type: 'affinity' | 'quest' | 'item' | 'flag' | 'level';
  target: string;       // NPC ID, 퀘스트 code, 아이템 code, 플래그명
  operator: 'gte' | 'lte' | 'eq' | 'has' | 'not';
  value: number | string | boolean;
}

/** 대화 결과 효과 */
export interface DialogueEffect {
  type: 'affinity_change' | 'quest_accept' | 'item_give' | 'item_take' | 'flag_set' | 'flag_clear';
  target: string;
  value?: number | string;
}

/** 대화 트리 (NPC 1명 기준) */
export interface DialogueTree {
  npcId: string;
  npcName: string;
  chapter?: string;
  startNodeId: string;
  nodes: Record<string, DialogueNode>;
}

/** 대화 세션 상태 (Redis 캐싱) */
export interface DialogueSession {
  userId: string;
  npcId: string;
  treeId: string;
  currentNodeId: string;
  startedAt: number;
}

/** 대화 진행 응답 */
export interface DialogueResponse {
  node: DialogueNode;
  availableOptions: DialogueOption[];
  effectsApplied: DialogueEffect[];
  isEnd: boolean;
}

// ── Redis 키 헬퍼 ──────────────────────────────────────────────

function sessionKey(userId: string): string {
  return `dialogue:session:${userId}`;
}

function historyKey(userId: string): string {
  return `dialogue:history:${userId}`;
}

// ── 조건 평가 ──────────────────────────────────────────────────

async function evaluateCondition(userId: string, cond: DialogueCondition): Promise<boolean> {
  switch (cond.type) {
    case 'affinity': {
      const affinity = await prisma.npcAffinity.findUnique({
        where: { userId_npcId: { userId, npcId: cond.target } },
      });
      const level = affinity?.level ?? 0;
      return compareValue(level, cond.operator, cond.value as number);
    }

    case 'quest': {
      // quest code 기반 조회
      const quest = await prisma.quest.findUnique({ where: { code: cond.target } });
      if (!quest) return false;
      const qp = await prisma.questProgress.findUnique({
        where: { userId_questId: { userId, questId: quest.id } },
      });
      if (cond.operator === 'has') return !!qp;
      if (cond.operator === 'not') return !qp;
      if (cond.operator === 'eq') return qp?.status === cond.value;
      return false;
    }

    case 'item': {
      // item code 기반 조회
      const item = await prisma.item.findUnique({ where: { code: cond.target } });
      if (!item) return cond.operator === 'not';
      const inv = await prisma.inventorySlot.findFirst({
        where: { userId, itemId: item.id },
      });
      if (cond.operator === 'has') return !!inv;
      if (cond.operator === 'not') return !inv;
      if (cond.operator === 'gte') return (inv?.quantity ?? 0) >= (cond.value as number);
      return false;
    }

    case 'flag': {
      if (redisConnected) {
        const hasFlag = await redisClient.sIsMember(`story:flags:${userId}`, cond.target);
        return cond.operator === 'has' ? hasFlag : !hasFlag;
      }
      return false;
    }

    case 'level': {
      const char = await prisma.character.findFirst({ where: { userId } });
      const lvl = char?.level ?? 1;
      return compareValue(lvl, cond.operator, cond.value as number);
    }

    default:
      return true;
  }
}

function compareValue(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case 'gte': return actual >= expected;
    case 'lte': return actual <= expected;
    case 'eq':  return actual === expected;
    default:    return false;
  }
}

// ── 효과 적용 ──────────────────────────────────────────────────

async function applyEffect(userId: string, effect: DialogueEffect): Promise<void> {
  switch (effect.type) {
    case 'affinity_change': {
      const delta = typeof effect.value === 'number' ? effect.value : parseInt(String(effect.value), 10) || 0;
      await prisma.npcAffinity.upsert({
        where: { userId_npcId: { userId, npcId: effect.target } },
        update: { exp: { increment: delta } },
        create: { userId, npcId: effect.target, exp: delta },
      });
      break;
    }

    case 'quest_accept': {
      const quest = await prisma.quest.findUnique({ where: { code: effect.target } });
      if (quest) {
        const objectives = quest.objectives as Array<{ type: string; target: string; count: number }>;
        const progress = objectives.map((obj, i) => ({
          objectiveIndex: i,
          current: 0,
          target: obj.count,
          completed: false,
        }));
        await prisma.questProgress.upsert({
          where: { userId_questId: { userId, questId: quest.id } },
          update: {},
          create: { userId, questId: quest.id, status: 'in_progress', progress },
        });
      }
      break;
    }

    case 'item_give': {
      const item = await prisma.item.findUnique({ where: { code: effect.target } });
      if (item) {
        const qty = typeof effect.value === 'number' ? effect.value : 1;
        if (item.stackable) {
          const existing = await prisma.inventorySlot.findFirst({
            where: { userId, itemId: item.id, isEquipped: false },
          });
          if (existing) {
            await prisma.inventorySlot.update({
              where: { id: existing.id },
              data: { quantity: { increment: qty } },
            });
          } else {
            await prisma.inventorySlot.create({
              data: { userId, itemId: item.id, quantity: qty },
            });
          }
        } else {
          for (let i = 0; i < qty; i++) {
            await prisma.inventorySlot.create({
              data: { userId, itemId: item.id, quantity: 1 },
            });
          }
        }
      }
      break;
    }

    case 'item_take': {
      const item = await prisma.item.findUnique({ where: { code: effect.target } });
      if (item) {
        const qty = typeof effect.value === 'number' ? effect.value : 1;
        const slot = await prisma.inventorySlot.findFirst({
          where: { userId, itemId: item.id, isEquipped: false },
        });
        if (slot) {
          if (slot.quantity <= qty) {
            await prisma.inventorySlot.delete({ where: { id: slot.id } });
          } else {
            await prisma.inventorySlot.update({
              where: { id: slot.id },
              data: { quantity: { decrement: qty } },
            });
          }
        }
      }
      break;
    }

    case 'flag_set': {
      if (redisConnected) {
        await redisClient.sAdd(`story:flags:${userId}`, effect.target);
      }
      break;
    }

    case 'flag_clear': {
      if (redisConnected) {
        await redisClient.sRem(`story:flags:${userId}`, effect.target);
      }
      break;
    }
  }
}

// ── 대화 실행 엔진 ─────────────────────────────────────────────

class DialogueRunner {
  /** 대화 트리 캐시 (npcId → DialogueTree) */
  private treeCache: Map<string, DialogueTree> = new Map();

  /** 대화 트리 등록 (dialogueLoader에서 호출) */
  registerTree(tree: DialogueTree): void {
    this.treeCache.set(tree.npcId, tree);
  }

  /** 대화 트리 등록 여부 확인 */
  hasTree(npcId: string): boolean {
    return this.treeCache.has(npcId);
  }

  /**
   * 대화 시작
   */
  async start(userId: string, npcId: string): Promise<DialogueResponse> {
    const tree = this.treeCache.get(npcId);
    if (!tree) {
      throw new Error(`NPC ${npcId}의 대화 트리가 등록되지 않았습니다.`);
    }

    const startNode = tree.nodes[tree.startNodeId];
    if (!startNode) {
      throw new Error(`시작 노드 ${tree.startNodeId}를 찾을 수 없습니다.`);
    }

    // 세션 저장
    const session: DialogueSession = {
      userId,
      npcId,
      treeId: npcId,
      currentNodeId: tree.startNodeId,
      startedAt: Date.now(),
    };

    if (redisConnected) {
      await redisClient.set(sessionKey(userId), JSON.stringify(session), { EX: 3600 });
    }

    // 노드 진입 효과 적용
    const appliedEffects: DialogueEffect[] = [];
    if (startNode.effects) {
      for (const eff of startNode.effects) {
        await applyEffect(userId, eff);
        appliedEffects.push(eff);
      }
    }

    // 조건 필터링된 선택지
    const availableOptions = await this.filterOptions(userId, startNode.options ?? []);

    // 이력 저장
    await this.saveHistory(userId, npcId, tree.startNodeId, null);

    return {
      node: startNode,
      availableOptions,
      effectsApplied: appliedEffects,
      isEnd: startNode.isEnd ?? (!startNode.next && availableOptions.length === 0),
    };
  }

  /**
   * 선택지 선택
   */
  async choose(userId: string, choiceId: string): Promise<DialogueResponse> {
    // 세션 복구
    let session: DialogueSession | null = null;
    if (redisConnected) {
      const raw = await redisClient.get(sessionKey(userId));
      if (raw) session = JSON.parse(raw) as DialogueSession;
    }
    if (!session) {
      throw new Error('활성 대화 세션이 없습니다.');
    }

    const tree = this.treeCache.get(session.treeId);
    if (!tree) {
      throw new Error('대화 트리를 찾을 수 없습니다.');
    }

    const currentNode = tree.nodes[session.currentNodeId];
    if (!currentNode?.options) {
      throw new Error('현재 노드에 선택지가 없습니다.');
    }

    // 선택지 찾기
    const chosen = currentNode.options.find(o => o.id === choiceId);
    if (!chosen) {
      throw new Error(`선택지 ${choiceId}를 찾을 수 없습니다.`);
    }

    // 선택지 효과 적용
    const appliedEffects: DialogueEffect[] = [];
    if (chosen.effects) {
      for (const eff of chosen.effects) {
        await applyEffect(userId, eff);
        appliedEffects.push(eff);
      }
    }

    // 다음 노드로 이동
    const nextNode = tree.nodes[chosen.nextNodeId];
    if (!nextNode) {
      throw new Error(`다음 노드 ${chosen.nextNodeId}를 찾을 수 없습니다.`);
    }

    // 노드 진입 효과 적용
    if (nextNode.effects) {
      for (const eff of nextNode.effects) {
        await applyEffect(userId, eff);
        appliedEffects.push(eff);
      }
    }

    // 세션 갱신
    session.currentNodeId = chosen.nextNodeId;
    if (redisConnected) {
      await redisClient.set(sessionKey(userId), JSON.stringify(session), { EX: 3600 });
    }

    const availableOptions = await this.filterOptions(userId, nextNode.options ?? []);
    const isEnd = nextNode.isEnd ?? (!nextNode.next && availableOptions.length === 0);

    // 종료 시 세션 정리
    if (isEnd && redisConnected) {
      await redisClient.del(sessionKey(userId));
    }

    // 이력 저장
    await this.saveHistory(userId, session.npcId, chosen.nextNodeId, choiceId);

    return {
      node: nextNode,
      availableOptions,
      effectsApplied: appliedEffects,
      isEnd,
    };
  }

  /**
   * 대화 이력 조회
   */
  async getHistory(userId: string, limit: number = 50): Promise<Array<{ npcId: string; nodeId: string; choiceId: string | null; timestamp: number }>> {
    if (!redisConnected) return [];

    const raw = await redisClient.lRange(historyKey(userId), 0, limit - 1);
    return raw.map(r => JSON.parse(r) as { npcId: string; nodeId: string; choiceId: string | null; timestamp: number });
  }

  // ── 내부 헬퍼 ──────────────────────────────────────────────

  /** 조건 기반 선택지 필터링 */
  private async filterOptions(userId: string, options: DialogueOption[]): Promise<DialogueOption[]> {
    const result: DialogueOption[] = [];
    for (const opt of options) {
      if (opt.condition) {
        const pass = await evaluateCondition(userId, opt.condition);
        if (!pass) continue;
      }
      result.push(opt);
    }
    return result;
  }

  /** 이력 Redis 저장 */
  private async saveHistory(userId: string, npcId: string, nodeId: string, choiceId: string | null): Promise<void> {
    if (!redisConnected) return;

    const entry = JSON.stringify({ npcId, nodeId, choiceId, timestamp: Date.now() });
    await redisClient.lPush(historyKey(userId), entry);
    // 최근 500건만 유지
    await redisClient.lTrim(historyKey(userId), 0, 499);
  }
}

export const dialogueRunner = new DialogueRunner();
