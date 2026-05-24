import type { DialogueData } from '../ui/HudOverlay';

export interface NpcDialogueSource {
  id: string;
  name: string;
  role?: string;
}

type DialogueTemplate = Omit<DialogueData, 'speakerName' | 'speakerPortrait' | 'autoAdvanceMs'>;

const UNKNOWN_NPC_NAME = '알 수 없는 NPC';

const GHOST_MERCHANT_DIALOGUE: DialogueTemplate = {
  bodyText: '산 자의 발소리는 오랜만이군. 그림자 안쪽에 오래된 물건들이 남아 있다네.',
  choices: [
    { choiceId: 'A', text: '거래한다.', disabled: false },
    { choiceId: 'B', text: '희귀 물건을 얻는다.', disabled: false },
    { choiceId: 'C', text: '지금은 지나간다.', disabled: false },
  ],
  canSkip: true,
};

const GHOST_MERCHANT_RARE_ITEM_RESULT: DialogueTemplate = {
  bodyText: '고로디가 낡은 포장을 풀고 [희귀] 망각의 은화를 건넸습니다. 희귀 물건을 획득했습니다.',
  choices: [
    { choiceId: 'CLOSE', text: '닫기', disabled: false },
  ],
  canSkip: true,
};

const GHOST_MERCHANT_TRADE_RESULT: DialogueTemplate = {
  bodyText: [
    '고로디가 낡은 궤짝을 열어 거래품을 펼쳤습니다.',
    '[희귀] 망각의 은화 · [고급] 유령 도시 귀환석 · [일반] 영혼 등불',
    '정식 상점 장부가 열리기 전까지는 이 목록에서 필요한 물건을 확인하세요.',
  ].join('\n'),
  choices: [
    { choiceId: 'CLOSE', text: '닫기', disabled: false },
  ],
  canSkip: true,
};

const GHOST_MERCHANT_LEAVE_RESULT: DialogueTemplate = {
  bodyText: '고로디가 궤짝을 닫고 그림자 속으로 한 걸음 물러섰습니다. 필요해지면 다시 말을 걸어 주세요.',
  choices: [
    { choiceId: 'CLOSE', text: '닫기', disabled: false },
  ],
  canSkip: true,
};

const CLOSE_RESULT_CHOICES: DialogueTemplate['choices'] = [
  { choiceId: 'CLOSE', text: '닫기', disabled: false },
];

const ROLE_DIALOGUES: Record<string, DialogueTemplate> = {
  shop: {
    bodyText: '필요한 물건이 있다면 둘러보세요. 오래 머뭇거리면 좋은 물건부터 사라집니다.',
    choices: [
      { choiceId: 'A', text: '거래하기', disabled: false },
      { choiceId: 'B', text: '추천 물품 묻기', disabled: false },
      { choiceId: 'C', text: '닫기', disabled: false },
    ],
    canSkip: true,
  },
  quest: {
    bodyText: '도움이 필요합니다. 준비가 되었다면 의뢰 내용을 확인해 주세요.',
    choices: [
      { choiceId: 'A', text: '의뢰를 확인한다.', disabled: false },
      { choiceId: 'B', text: '나중에 온다.', disabled: false },
    ],
    canSkip: true,
  },
  craft: {
    bodyText: '재료 상태를 확인해 보겠습니다. 무리한 제작은 장비 내구도를 빠르게 깎습니다.',
    choices: [
      { choiceId: 'A', text: '제작을 맡긴다.', disabled: false },
      { choiceId: 'B', text: '재료를 확인한다.', disabled: false },
      { choiceId: 'C', text: '그만둔다.', disabled: false },
    ],
    canSkip: true,
  },
  dialogue: {
    bodyText: '무슨 일로 찾아왔나요? 필요한 이야기가 있다면 짧게 말씀해 주세요.',
    choices: [
      { choiceId: 'A', text: '대화한다.', disabled: false },
      { choiceId: 'B', text: '지나간다.', disabled: false },
    ],
    canSkip: true,
  },
  boss: {
    bodyText: '봉인의 기척이 짙습니다. 섣불리 건드리면 전장이 흔들릴 수 있습니다.',
    choices: [
      { choiceId: 'A', text: '봉인을 조사한다.', disabled: false },
      { choiceId: 'B', text: '물러난다.', disabled: false },
    ],
    canSkip: true,
  },
};

const DEFAULT_DIALOGUE: DialogueTemplate = {
  bodyText: '지금은 응답할 수 없습니다. 잠시 뒤 다시 말을 걸어 주세요.',
  choices: [
    { choiceId: 'A', text: '닫기', disabled: false },
  ],
  canSkip: true,
};

const NPC_DIALOGUES: Record<string, DialogueTemplate> = {
  npc_ghost_merchant: GHOST_MERCHANT_DIALOGUE,
};

function cloneChoices(template: DialogueTemplate): DialogueData['choices'] {
  return template.choices?.map((choice) => ({ ...choice }));
}

function makeDialogue(speakerName: string, template: DialogueTemplate): DialogueData {
  return {
    speakerName,
    bodyText: template.bodyText,
    choices: cloneChoices(template),
    canSkip: template.canSkip,
  };
}

function makeResult(bodyText: string): DialogueTemplate {
  return {
    bodyText,
    choices: CLOSE_RESULT_CHOICES,
    canSkip: true,
  };
}

function resolveRoleChoiceTemplate(npcName: string, role: string, choiceId: string): DialogueTemplate | null {
  switch (role) {
    case 'shop':
      if (choiceId === 'A') {
        return makeResult(`${npcName}의 거래품을 확인했습니다. 회복 물자, 지역 보급품, 희귀 재료 목록이 준비되어 있습니다.`);
      }
      if (choiceId === 'B') {
        return makeResult(`${npcName}이 추천 물품을 골라 줬습니다. 현재 지역에서는 회복 물자와 귀환석을 먼저 챙기는 편이 안전합니다.`);
      }
      if (choiceId === 'C') {
        return null;
      }
      break;
    case 'quest':
      if (choiceId === 'A') {
        return makeResult(`${npcName}의 의뢰 내용을 확인했습니다. 목표 지점과 위험 요소가 퀘스트 기록에 정리되었습니다.`);
      }
      if (choiceId === 'B') {
        return makeResult(`${npcName}이 고개를 끄덕였습니다. 준비가 끝나면 다시 찾아오라고 합니다.`);
      }
      break;
    case 'craft':
      if (choiceId === 'A') {
        return makeResult(`${npcName}이 제작 도구를 점검했습니다. 제작 가능한 장비와 강화 재료를 확인할 수 있습니다.`);
      }
      if (choiceId === 'B') {
        return makeResult(`${npcName}이 필요한 재료를 짚어 줬습니다. 부족한 재료는 필드 채집과 전투 보상으로 보충해야 합니다.`);
      }
      if (choiceId === 'C') {
        return makeResult(`${npcName}이 작업대를 정리했습니다. 제작이 필요해지면 다시 말을 걸어 주세요.`);
      }
      break;
    case 'dialogue':
      if (choiceId === 'A') {
        return makeResult(`${npcName}이 현재 지역의 소문과 주의할 징후를 알려 줬습니다. 지도와 퀘스트 동선을 함께 확인하세요.`);
      }
      if (choiceId === 'B') {
        return makeResult(`${npcName}과의 대화를 마쳤습니다. 주변 상황은 변하지 않았습니다.`);
      }
      break;
    case 'boss':
      if (choiceId === 'A') {
        return makeResult(`${npcName}의 봉인 반응을 조사했습니다. 강한 공명이 감지되며, 전투 준비 후 접근하는 편이 안전합니다.`);
      }
      if (choiceId === 'B') {
        return makeResult(`${npcName}에게서 물러났습니다. 봉인은 그대로 유지되고 있습니다.`);
      }
      break;
    default:
      if (choiceId !== 'CLOSE') {
        return makeResult(`${npcName}이 짧게 응답했습니다. 아직 이 역할의 세부 상호작용은 준비 중입니다.`);
      }
      break;
  }

  return null;
}

export function buildNpcDialogueData(npc: NpcDialogueSource | null | undefined): DialogueData {
  const npcName = npc?.name?.trim() || UNKNOWN_NPC_NAME;
  const npcId = npc?.id?.trim() ?? '';
  const role = npc?.role?.trim().toLowerCase() ?? '';
  const template = NPC_DIALOGUES[npcId] ?? ROLE_DIALOGUES[role] ?? DEFAULT_DIALOGUE;

  return makeDialogue(npcName, template);
}

export function resolveNpcDialogueChoice(
  npc: NpcDialogueSource | null | undefined,
  choiceId: string,
): DialogueData | null {
  const npcName = npc?.name?.trim() || UNKNOWN_NPC_NAME;
  const npcId = npc?.id?.trim() ?? '';
  const normalizedChoiceId = choiceId.trim().toUpperCase();

  if (npcId === 'npc_ghost_merchant') {
    const template = normalizedChoiceId === 'A'
      ? GHOST_MERCHANT_TRADE_RESULT
      : normalizedChoiceId === 'B'
        ? GHOST_MERCHANT_RARE_ITEM_RESULT
        : normalizedChoiceId === 'C'
          ? GHOST_MERCHANT_LEAVE_RESULT
          : null;

    if (template) {
      return makeDialogue(npcName, template);
    }
  }

  const role = npc?.role?.trim().toLowerCase() ?? '';
  const roleResult = resolveRoleChoiceTemplate(npcName, role, normalizedChoiceId);
  return roleResult ? makeDialogue(npcName, roleResult) : null;
}
