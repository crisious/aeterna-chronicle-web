import type { DialogueData } from '../ui/HudOverlay';
import {
  applyFieldNpcNameToken,
  resolveFieldNpcTemplate,
  type FieldNpcDialogueTemplate,
} from '../../../shared/types/scenarioRegistry';

export interface NpcDialogueSource {
  id: string;
  name: string;
  role?: string;
}

const UNKNOWN_NPC_NAME = '알 수 없는 NPC';
const CLOSE_CHOICE: DialogueData['choices'] = [
  { choiceId: 'CLOSE', text: '닫기', disabled: false },
];

const DEFAULT_DIALOGUE: DialogueData = {
  speakerName: UNKNOWN_NPC_NAME,
  bodyText: '지금은 응답할 수 없습니다. 잠시 뒤 다시 말을 걸어 주세요.',
  choices: [{ choiceId: 'A', text: '닫기', disabled: false }],
  canSkip: true,
};

function normalizeNpc(npc: NpcDialogueSource | null | undefined): {
  name: string;
  id: string;
  role: string;
} {
  return {
    name: npc?.name?.trim() || UNKNOWN_NPC_NAME,
    id: npc?.id?.trim() ?? '',
    role: npc?.role?.trim().toLowerCase() ?? '',
  };
}

function templateToOpening(
  template: FieldNpcDialogueTemplate,
  npcName: string,
): DialogueData {
  return {
    speakerName: npcName,
    bodyText: applyFieldNpcNameToken(template.openingLine, npcName),
    choices: template.choices.map((c) => ({
      choiceId: c.choiceId,
      text: c.label,
      disabled: false,
    })),
    canSkip: true,
  };
}

export function buildNpcDialogueData(npc: NpcDialogueSource | null | undefined): DialogueData {
  const { name, id, role } = normalizeNpc(npc);
  const template = resolveFieldNpcTemplate(id, role);
  if (!template) {
    return { ...DEFAULT_DIALOGUE, speakerName: name };
  }
  return templateToOpening(template, name);
}

export function resolveNpcDialogueChoice(
  npc: NpcDialogueSource | null | undefined,
  choiceId: string,
): DialogueData | null {
  const { name, id, role } = normalizeNpc(npc);
  const normalizedChoiceId = choiceId.trim().toUpperCase();
  const template = resolveFieldNpcTemplate(id, role);
  if (!template) {
    if (normalizedChoiceId === 'CLOSE') {
      return null;
    }
    return {
      speakerName: name,
      bodyText: `${name}이 짧게 응답했습니다. 아직 이 역할의 세부 상호작용은 준비 중입니다.`,
      choices: CLOSE_CHOICE,
      canSkip: true,
    };
  }

  const result = template.results.find((r) => r.choiceId === normalizedChoiceId);
  if (!result || result.resultLine === null) {
    return null;
  }

  return {
    speakerName: name,
    bodyText: applyFieldNpcNameToken(result.resultLine, name),
    choices: CLOSE_CHOICE,
    canSkip: true,
  };
}
