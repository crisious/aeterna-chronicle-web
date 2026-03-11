/**
 * dialogueLoader.ts — NPC 대화 스크립트 로더 (P5-09)
 *
 * 역할:
 *   - NPC 시드의 dialogue JSON을 런타임 대화 트리로 변환
 *   - 챕터별 대화 스크립트 로딩
 *   - dialogueRunner에 등록
 */

import { prisma } from '../db';
import { dialogueRunner, DialogueTree, DialogueNode, DialogueOption } from './dialogueRunner';

// ── 타입 정의: NPC dialogue JSON 스키마 ─────────────────────────

/** NPC DB의 dialogue 필드 JSON 구조 */
interface NpcDialogueRaw {
  id: string;
  text: string;
  speaker?: string;
  portrait?: string;
  voiceKey?: string;
  isEnd?: boolean;
  next?: string;
  options?: NpcOptionRaw[];
  effects?: Array<{
    type: string;
    target: string;
    value?: number | string;
  }>;
}

interface NpcOptionRaw {
  id?: string;
  text: string;
  nextId: string;
  condition?: {
    type: string;
    target: string;
    operator: string;
    value: number | string | boolean;
  };
  effects?: Array<{
    type: string;
    target: string;
    value?: number | string;
  }>;
}

// ── 변환 함수 ──────────────────────────────────────────────────

/**
 * NPC DB의 dialogue JSON 배열을 DialogueTree로 변환
 */
function convertToDialogueTree(
  npcId: string,
  npcName: string,
  dialogueRaw: NpcDialogueRaw[],
  chapter?: string,
): DialogueTree {
  const nodes: Record<string, DialogueNode> = {};

  for (const raw of dialogueRaw) {
    const options: DialogueOption[] = (raw.options ?? []).map((opt, idx) => ({
      id: opt.id ?? `${raw.id}_opt_${idx}`,
      text: opt.text,
      nextNodeId: opt.nextId,
      condition: opt.condition ? {
        type: opt.condition.type as DialogueOption['condition'] extends { type: infer T } ? T : never,
        target: opt.condition.target,
        operator: opt.condition.operator as 'gte' | 'lte' | 'eq' | 'has' | 'not',
        value: opt.condition.value,
      } : undefined,
      effects: opt.effects?.map(e => ({
        type: e.type as DialogueNode['effects'] extends Array<{ type: infer T }> | undefined ? T : never,
        target: e.target,
        value: e.value,
      })),
    }));

    nodes[raw.id] = {
      id: raw.id,
      speaker: raw.speaker ?? npcName,
      portrait: raw.portrait,
      text: raw.text,
      voiceKey: raw.voiceKey,
      options: options.length > 0 ? options : undefined,
      next: raw.next,
      isEnd: raw.isEnd,
      effects: raw.effects?.map(e => ({
        type: e.type as 'affinity_change' | 'quest_accept' | 'item_give' | 'item_take' | 'flag_set' | 'flag_clear',
        target: e.target,
        value: e.value,
      })),
    };
  }

  // 첫 번째 노드를 시작 노드로 사용
  const startNodeId = dialogueRaw.length > 0 ? dialogueRaw[0].id : 'start';

  return {
    npcId,
    npcName,
    chapter,
    startNodeId,
    nodes,
  };
}

// ── 로더 클래스 ─────────────────────────────────────────────────

class DialogueLoader {
  /**
   * DB에서 모든 활성 NPC의 대화 트리를 로딩하여 dialogueRunner에 등록
   */
  async loadAll(): Promise<number> {
    const npcs = await prisma.npc.findMany({
      where: { isActive: true },
      select: { id: true, name: true, dialogue: true },
    });

    let count = 0;

    for (const npc of npcs) {
      const dialogueRaw = npc.dialogue as NpcDialogueRaw[] | null;
      if (!dialogueRaw || !Array.isArray(dialogueRaw) || dialogueRaw.length === 0) {
        continue;
      }

      const tree = convertToDialogueTree(npc.id, npc.name, dialogueRaw);
      dialogueRunner.registerTree(tree);
      count++;
    }

    console.log(`[DialogueLoader] ${count}개 NPC 대화 트리 로딩 완료`);
    return count;
  }

  /**
   * 특정 NPC의 대화 트리만 (재)로딩
   */
  async loadByNpcId(npcId: string): Promise<boolean> {
    const npc = await prisma.npc.findUnique({
      where: { id: npcId },
      select: { id: true, name: true, dialogue: true },
    });

    if (!npc) return false;

    const dialogueRaw = npc.dialogue as NpcDialogueRaw[] | null;
    if (!dialogueRaw || !Array.isArray(dialogueRaw) || dialogueRaw.length === 0) {
      return false;
    }

    const tree = convertToDialogueTree(npc.id, npc.name, dialogueRaw);
    dialogueRunner.registerTree(tree);
    return true;
  }

  /**
   * 챕터별 대화 스크립트 로딩
   * - NPC name에 챕터 태그가 포함된 경우 해당 챕터만 필터
   */
  async loadByChapter(chapter: string): Promise<number> {
    // NPC의 dialogue JSON 내에 챕터 정보가 있는 경우 필터링
    const npcs = await prisma.npc.findMany({
      where: { isActive: true },
      select: { id: true, name: true, dialogue: true },
    });

    let count = 0;

    for (const npc of npcs) {
      const dialogueRaw = npc.dialogue as NpcDialogueRaw[] | null;
      if (!dialogueRaw || !Array.isArray(dialogueRaw)) continue;

      // 챕터 필터: 첫 노드에 "chapter" 필드가 있는 경우 매칭
      const firstNode = dialogueRaw[0] as unknown as Record<string, unknown>;
      if (firstNode?.['chapter'] && firstNode['chapter'] !== chapter) continue;

      const tree = convertToDialogueTree(npc.id, npc.name, dialogueRaw, chapter);
      dialogueRunner.registerTree(tree);
      count++;
    }

    console.log(`[DialogueLoader] 챕터 "${chapter}": ${count}개 대화 트리 로딩`);
    return count;
  }
}

export const dialogueLoader = new DialogueLoader();
