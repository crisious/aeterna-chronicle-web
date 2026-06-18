/**
 * LobbyScene.ts — 마을 허브 씬 (P5-18 → P25-03 API 연결)
 *
 * - NPC 목록 표시 (서버 조회 + 로컬 폴백)
 * - 상점 / 게시판 / 파티 모집 버튼
 * - 미니맵 표시
 * - 월드맵·던전 진입 포인트
 * - NetworkManager 소켓 연결 (P25-03)
 * - 퀘스트/인벤토리 API 연동 (P25-04)
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { networkManager, type ConnectionState } from '../network/NetworkManager';
import type { QuestData } from '../network/NetworkManager';
import { mergeActiveQuestStatus } from '../network/questTransforms';
import { playSfx, UI_SFX, NPC_VOICE } from '../utils/SFXHelper';
import {
  SkillTreeUI,
  SKILL_TREE_UI_FRAME_TEXTURES,
  preloadSkillTreeUiFrameTextures,
  type ClassId,
} from '../ui/SkillTreeUI';
import { isUiModalOpen } from '../accessibility/uiModalLock';
import {
  getSpriteResourceForLobbyNpc,
  getSpriteResourceForSkillIcon,
  getSpriteResourceForWorldZoneIcon,
} from '../assets/spriteResourceManifest';
import { getItemIconResource, preloadItemIconResources } from '../data/itemIconResources';
import { preloadSkillTreeIconResources } from '../data/skillTreeIcons';

// ── 타입 ────────────────────────────────────────────────────

type ItemIconQaMode = 'shop' | 'inventory';
type LobbyNotificationIconId = 'shop' | 'enhance' | 'quest' | 'party' | 'story';

export interface LobbySceneData {
  characterId?: string;
  characterName: string;
  characterClass: string;
  className: string;
  baseStats: { hp: number; mp: number; atk: number; def: number };
  level?: number;
  offlineQa?: boolean;
  openSkillTreeQa?: boolean;
  itemIconQa?: ItemIconQaMode;
  dialogueTitleIconQa?: boolean;
  dialogueChoiceButtonFrameQa?: boolean;
  dialogueChoiceFocusIconQa?: boolean;
  lobbyNavFocusIconQa?: boolean;
  inventoryTitleIconQa?: boolean;
  inventoryActionFocusIconQa?: boolean;
  partyRecruitIconQa?: boolean;
  partyActionFocusIconQa?: boolean;
  shopTitleIconQa?: boolean;
  shopActionFocusIconQa?: boolean;
  enhanceTitleIconQa?: boolean;
  enhanceActionFocusIconQa?: boolean;
  storyTitleIconQa?: boolean;
  storyActionFocusIconQa?: boolean;
  questTitleIconQa?: boolean;
  questActionFocusIconQa?: boolean;
  goldIconQa?: boolean;
  lobbyTitleIconQa?: boolean;
  lobbyNotificationIconQa?: LobbyNotificationIconId;
  lobbyConnectionIconQa?: 'connected' | 'offline' | 'error';
}

interface NpcEntry {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  color: number;
}

type QuestPanelSource = 'server' | 'local';

type ShopRow = { code: string; name: string; price: number; itemIconId?: string; type?: string };
type LobbyNavIconDescriptor =
  | { kind: 'worldmap'; id: string }
  | { kind: 'item'; id: string }
  | { kind: 'skill'; id: string };
type LobbyNavIconResource = { key: string; path: string };

// ── 상수 ────────────────────────────────────────────────────

const TOWN_NPCS: NpcEntry[] = [
  { id: 'blacksmith', name: '대장장이 칼렌', role: '장비 강화', x: 200, y: 300, color: 0xff8844 },
  { id: 'merchant', name: '상인 미라', role: '아이템 상점', x: 400, y: 250, color: 0x44cc88 },
  { id: 'quest_board', name: '기억의 게시판', role: '퀘스트 수주', x: 600, y: 300, color: 0xcccc44 },
  { id: 'party_recruit', name: '모험가 길드', role: '파티 모집', x: 800, y: 250, color: 0x4488ff },
  { id: 'elder', name: '장로 마테우스', role: '메인 스토리', x: 1000, y: 300, color: 0xcc88ff },
];

const MINIMAP_SIZE = 140;
const MINIMAP_MARGIN = 12;

const LOBBY_UI_FRAME_TEXTURES = {
  minimap: {
    key: 'ui_frame_UI-HUD-002-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-002-DEF.png',
  },
  dialoguePanel: {
    key: 'ui_frame_UI-HUD-007-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-007-DEF.png',
  },
  dialogueChoiceButton: {
    key: 'ui_frame_lobby_dialogue_choice_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
  storyPanel: {
    key: 'ui_frame_UI-HUD-008-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-008-DEF.png',
  },
  shopPanel: {
    key: 'ui_frame_UI-SHP-001-DEF',
    path: 'assets/generated/ui/frames/UI-SHP-001-DEF.png',
  },
  enhancePanel: {
    key: 'ui_frame_UI-SHP-002-DEF',
    path: 'assets/generated/ui/frames/UI-SHP-002-DEF.png',
  },
  partyPanel: {
    key: 'ui_frame_UI-SHP-003-DEF',
    path: 'assets/generated/ui/frames/UI-SHP-003-DEF.png',
  },
  inventoryPanel: {
    key: 'ui_frame_UI-INV-003-DEF',
    path: 'assets/generated/ui/frames/UI-INV-003-DEF.png',
  },
  questPanel: {
    key: 'ui_frame_UI-INV-004-DEF',
    path: 'assets/generated/ui/frames/UI-INV-004-DEF.png',
  },
} as const;

const LOBBY_NAV_ICON_TEXTURES = {
  world: { kind: 'worldmap', id: 'aether_plains' },
  dungeon: { kind: 'worldmap', id: 'crystal_cave' },
  inventory: { kind: 'item', id: 'ITM-CON-001' },
  skill: { kind: 'skill', id: 'skill_ek_slash' },
  quest: { kind: 'item', id: 'ITM-QST-004' },
} as const;

const LOBBY_TITLE_ICON_ZONE_ID = 'aether_plains';
const LOBBY_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_TITLE_ICON_SIZE = 20;
const LOBBY_DIALOGUE_TITLE_ICON_NPC_ID = 'merchant';
const LOBBY_DIALOGUE_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_NAV_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_NAV_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_PARTY_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_PARTY_ACTION_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_STORY_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_STORY_ACTION_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_SHOP_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_SHOP_ACTION_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_ENHANCE_ACTION_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_INVENTORY_TITLE_ICON_ID = 'ITM-CON-001';
const LOBBY_INVENTORY_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_INVENTORY_ACTION_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_PARTY_RECRUIT_TITLE_ICON_ID = 'skill_ek_slash';
const LOBBY_PARTY_RECRUIT_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_SHOP_TITLE_ICON_ID = 'ITM-CON-001';
const LOBBY_SHOP_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_ENHANCE_TITLE_ICON_ID = 'ITM-MAT-001';
const LOBBY_ENHANCE_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_STORY_TITLE_ICON_ID = 'ITM-QST-001';
const LOBBY_STORY_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_QUEST_TITLE_ICON_ID = 'ITM-QST-004';
const LOBBY_QUEST_TITLE_ICON_EXPECTED_COUNT = 1;
const LOBBY_QUEST_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow';
const LOBBY_QUEST_ACTION_FOCUS_ICON_EXPECTED_COUNT = 1;
const LOBBY_GOLD_ICON_ID = 'ITM-MAT-002';
const LOBBY_GOLD_ICON_EXPECTED_COUNT = 1;
const LOBBY_NOTIFICATION_ICON_TEXTURES = {
  shop: { kind: 'item', id: LOBBY_SHOP_TITLE_ICON_ID },
  enhance: { kind: 'item', id: LOBBY_ENHANCE_TITLE_ICON_ID },
  quest: { kind: 'item', id: LOBBY_QUEST_TITLE_ICON_ID },
  party: { kind: 'skill', id: LOBBY_PARTY_RECRUIT_TITLE_ICON_ID },
  story: { kind: 'item', id: LOBBY_STORY_TITLE_ICON_ID },
} as const satisfies Record<LobbyNotificationIconId, LobbyNavIconDescriptor>;
const LOBBY_NOTIFICATION_ICON_EXPECTED_COUNT = 1;
const LOBBY_NOTIFICATION_ICON_SIZE = 18;
const LOBBY_NOTIFICATION_QA_MESSAGES: Record<LobbyNotificationIconId, string> = {
  shop: '상인 미라: 상점을 열었습니다. (아이템 80종 판매 중)',
  enhance: '대장장이 칼렌: 장비 강화 서비스를 준비합니다.',
  quest: '기억의 게시판: 의뢰 게시판을 엽니다.',
  party: '모험가 길드: 파티원을 모집합니다.',
  story: '장로 마테우스: 메인 스토리를 진행합니다.',
};
const LOBBY_CONNECTION_ICON_IDS = {
  connected: 'skill_mw_arrow',
  offline: 'skill_tg_stop',
  error: 'skill_ek_explode',
} as const;
const LOBBY_CONNECTION_ICON_SIZE = 14;

type LobbyConnectionIconMode = keyof typeof LOBBY_CONNECTION_ICON_IDS;

const LOBBY_CONNECTION_STATES: Record<LobbyConnectionIconMode, {
  label: string;
  fallbackLabel: string;
  color: string;
}> = {
  connected: { label: '온라인', fallbackLabel: '● 온라인', color: '#44cc44' },
  offline: { label: '오프라인', fallbackLabel: '○ 오프라인', color: '#cccc44' },
  error: { label: '연결 실패', fallbackLabel: '✕ 연결 실패', color: '#ff4444' },
};

function getLobbyConnectionIconResource(mode: LobbyConnectionIconMode) {
  return getSpriteResourceForSkillIcon(LOBBY_CONNECTION_ICON_IDS[mode]);
}

function getLobbyConnectionMode(state: ConnectionState): LobbyConnectionIconMode {
  if (state === 'connected') return 'connected';
  if (state === 'error') return 'error';
  return 'offline';
}

function getLobbyConnectionStateLabel(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return '온라인';
    case 'connecting':
      return '연결 중';
    case 'reconnecting':
      return '재연결 중';
    case 'error':
      return '연결 실패';
    case 'disconnected':
    default:
      return '오프라인';
  }
}

function isLobbyNotificationIconId(value: string | undefined): value is LobbyNotificationIconId {
  return value === 'shop'
    || value === 'enhance'
    || value === 'quest'
    || value === 'party'
    || value === 'story';
}

// P33-A: NPC id → 스프라이트 파일명 매핑
const NPC_SPRITE_MAP: Record<string, string> = {
  blacksmith: '19_kalen_sprite',   // 대장장이 칼렌
  merchant: '20_mira_sprite',      // 상인 미라
  quest_board: '18_memory_fragment_sprite', // 기억의 게시판 (기억 파편 컨셉)
  party_recruit: '13_hashir_sprite', // 모험가 길드 → 하시르 스프라이트
  elder: '04_mateus_sprite',       // 장로 마테우스
};

type LobbyNpcPortraitTexture = {
  key: string;
  path: string;
};

const LOBBY_NPC_PORTRAIT_TEXTURES: Record<string, LobbyNpcPortraitTexture> = {
  blacksmith: {
    key: 'npc_portrait_19_kalen_portrait',
    path: 'assets/generated/characters/npc/npc_portrait_19_kalen_portrait.png',
  },
  merchant: {
    key: 'npc_portrait_20_mira_portrait',
    path: 'assets/generated/characters/npc/npc_portrait_20_mira_portrait.png',
  },
  quest_board: {
    key: 'npc_portrait_18_memory_fragment_portrait',
    path: 'assets/generated/characters/npc/npc_portrait_18_memory_fragment_portrait.png',
  },
  party_recruit: {
    key: 'npc_portrait_13_hashir_portrait',
    path: 'assets/generated/characters/npc/npc_portrait_13_hashir_portrait.png',
  },
  elder: {
    key: 'npc_portrait_04_mateus_portrait',
    path: 'assets/generated/characters/npc/npc_portrait_04_mateus_portrait.png',
  },
};

const QUEST_STATUS_STYLE: Record<QuestData['status'], { label: string; color: string }> = {
  available: { label: '수주 가능', color: '#88ff88' },
  active: { label: '진행중', color: '#ffcc44' },
  complete: { label: '완료 가능', color: '#88ccff' },
  turned_in: { label: '완료됨', color: '#888888' },
};

// 보드는 앞 4개만 노출하므로(slice), actionable(진행중·완료가능·수주가능)을 완료됨보다 먼저
// 정렬해 이미 끝낸 퀘스트가 수주 가능 퀘스트를 가리지 않게 한다.
const QUEST_STATUS_ORDER: Record<QuestData['status'], number> = {
  active: 0,
  complete: 1,
  available: 2,
  turned_in: 3,
};

const FALLBACK_QUESTS: QuestData[] = [
  {
    id: 'chrono_echoes',
    name: '시간의 잔향',
    description: '기억의 게시판에 남은 시간 파편을 조사한다.',
    status: 'available',
    objectives: [{ desc: '기억의 게시판 조사', current: 0, target: 1 }],
    rewards: { exp: 120, gold: 80, items: ['시간 파편'] },
  },
  {
    id: 'forest_clockwork',
    name: '숲의 시계장치',
    description: '실반헤임 숲에 나타난 시간 왜곡 몬스터를 추적한다.',
    status: 'active',
    objectives: [{ desc: '시간 왜곡 흔적 수집', current: 2, target: 5 }],
    rewards: { exp: 240, gold: 150 },
  },
  {
    id: 'ruined_future_signal',
    name: '붕괴미래의 신호',
    description: '미래 시대에서 전송된 구조 신호의 좌표를 복원한다.',
    status: 'complete',
    objectives: [{ desc: '좌표 복원', current: 3, target: 3 }],
    rewards: { exp: 360, gold: 220, items: ['공명 코어'] },
  },
];

const FALLBACK_SHOP_ITEMS: ShopRow[] = [
  { code: 'CON_HP_S', name: 'HP 포션 (소)', price: 20, itemIconId: 'ITM-CON-001', type: 'consumable' },
  { code: 'CON_HP_M', name: 'HP 포션 (중)', price: 60, itemIconId: 'ITM-CON-002', type: 'consumable' },
  { code: 'CON_MP_S', name: 'MP 포션 (소)', price: 25, itemIconId: 'ITM-CON-003', type: 'consumable' },
  { code: 'CON_HP_L', name: 'HP 포션 (대)', price: 150, itemIconId: 'ITM-CON-004', type: 'consumable' },
  { code: 'CON_MP_M', name: 'MP 포션 (중)', price: 70, itemIconId: 'ITM-CON-005', type: 'consumable' },
];

const LOBBY_QA_INVENTORY_ITEMS = [
  { id: 'qa-wpn-001', itemId: 'WP-001-ironSword', name: '훈련용 철검', type: 'weapon', quantity: 1, rarity: 'common' },
  { id: 'qa-con-003', itemId: 'CS-003-hpPotionM', name: '중형 HP 포션', type: 'consumable', quantity: 4, rarity: 'uncommon' },
  { id: 'qa-mat-002', itemId: 'MAT-002-memoryShard', name: '기억 파편', type: 'material', quantity: 7, rarity: 'rare' },
];

// ── LobbyScene ──────────────────────────────────────────────

export class LobbyScene extends Phaser.Scene {
  private characterData!: LobbySceneData;
  private npcSprites: Phaser.GameObjects.Container[] = [];
  private dialoguePanel: Phaser.GameObjects.Container | null = null;

  // FINDING-A4 ext5: 하단 nav 버튼 키보드 nav state
  private navButtonItems: Array<{
    text: Phaser.GameObjects.Text;
    action: () => void;
    label: string;
    focusX: number;
    focusY: number;
  }> = [];
  private navIndex = 0;
  private _lobbyKeyboardCleanup: (() => void) | null = null;

  // FINDING-A4 ext7: NPC sprite 키보드 nav state
  // focusGroup: 'nav' = 하단 버튼 활성 / 'npc' = NPC 활성
  // ArrowLeft/Right → group='nav', ArrowUp/Down → group='npc' 자동 전환
  private focusGroup: 'nav' | 'npc' = 'nav';
  private npcIndex = 0;
  private skillTreeUI?: SkillTreeUI; // 스킬 트리 패널(지연 생성). uiModalLock 사용.
  private npcHighlightRing: Phaser.GameObjects.Arc | null = null;
  private minimapContainer!: Phaser.GameObjects.Container;
  private lobbyMinimapNpcMarkerKeys: string[] = [];
  private lobbyMinimapNpcMarkerMissingTextureKeys: string[] = [];
  private lobbyMinimapNpcMarkerFallbackIds: string[] = [];
  private lobbyNavIconImages: Phaser.GameObjects.Image[] = [];
  private fallbackLobbyNavIconIds: string[] = [];
  private lobbyNavFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyNavFocusIconFallbackRendered = false;
  private connectionIndicator!: Phaser.GameObjects.Text;
  private lobbyConnectionStatusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyConnectionStatusIconFallbackRendered = false;
  private goldText!: Phaser.GameObjects.Text;
  private goldIcon: Phaser.GameObjects.Image | null = null;
  private goldIconFallbackRendered = false;
  private lobbyTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyTitleIconFallbackRendered = false;
  private lobbyNotificationIcon: Phaser.GameObjects.Image | null = null;
  private lobbyNotificationText: Phaser.GameObjects.Text | null = null;
  private lobbyNotificationIconFallbackRendered = false;
  private itemIconQaRenderedIconIds: string[] = [];
  private itemIconQaMissingIconIds: string[] = [];
  private lobbyDialogueTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyDialogueTitleIconFallbackRendered = false;
  private lobbyDialogueTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyDialogueChoiceButtonFrames: Phaser.GameObjects.Image[] = [];
  private lobbyDialogueChoiceButtonFrameFallbackRendered = false;
  private lobbyDialogueChoiceFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyDialogueChoiceFocusIconFallbackRendered = false;
  private lobbyDialogueChoiceTexts: Phaser.GameObjects.Text[] = [];
  private lobbyInventoryTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyInventoryTitleIconFallbackRendered = false;
  private lobbyInventoryTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyInventoryActionFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyInventoryActionFocusIconFallbackRendered = false;
  private lobbyInventoryActionFocusTexts: Phaser.GameObjects.Text[] = [];
  private lobbyPartyRecruitTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyPartyRecruitTitleIconFallbackRendered = false;
  private lobbyPartyRecruitTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyPartyActionFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyPartyActionFocusIconFallbackRendered = false;
  private lobbyPartyActionFocusTexts: Phaser.GameObjects.Text[] = [];
  private lobbyShopTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyShopTitleIconFallbackRendered = false;
  private lobbyShopTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyShopActionFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyShopActionFocusIconFallbackRendered = false;
  private lobbyShopActionFocusTexts: Phaser.GameObjects.Text[] = [];
  private lobbyEnhanceTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyEnhanceTitleIconFallbackRendered = false;
  private lobbyEnhanceTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyEnhanceActionFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyEnhanceActionFocusIconFallbackRendered = false;
  private lobbyEnhanceActionFocusTexts: Phaser.GameObjects.Text[] = [];
  private lobbyStoryTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyStoryTitleIconFallbackRendered = false;
  private lobbyStoryTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyStoryActionFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyStoryActionFocusIconFallbackRendered = false;
  private lobbyStoryActionFocusTexts: Phaser.GameObjects.Text[] = [];
  private lobbyQuestTitleIcon: Phaser.GameObjects.Image | null = null;
  private lobbyQuestTitleIconFallbackRendered = false;
  private lobbyQuestTitleText: Phaser.GameObjects.Text | null = null;
  private lobbyQuestActionFocusIcon: Phaser.GameObjects.Image | null = null;
  private lobbyQuestActionFocusIconFallbackRendered = false;
  private lobbyQuestActionFocusTexts: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'LobbyScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  init(data: LobbySceneData): void {
    this.characterData = data;
    this.lobbyDialogueTitleIcon = null;
    this.lobbyDialogueTitleIconFallbackRendered = false;
    this.lobbyDialogueTitleText = null;
    this.lobbyDialogueChoiceButtonFrames = [];
    this.lobbyDialogueChoiceButtonFrameFallbackRendered = false;
    this.lobbyDialogueChoiceFocusIcon = null;
    this.lobbyDialogueChoiceFocusIconFallbackRendered = false;
    this.lobbyDialogueChoiceTexts = [];
    this.lobbyNavFocusIcon = null;
    this.lobbyNavFocusIconFallbackRendered = false;
    this.lobbyInventoryTitleIcon = null;
    this.lobbyInventoryTitleIconFallbackRendered = false;
    this.lobbyInventoryTitleText = null;
    this.lobbyInventoryActionFocusIcon = null;
    this.lobbyInventoryActionFocusIconFallbackRendered = false;
    this.lobbyInventoryActionFocusTexts = [];
    this.lobbyPartyRecruitTitleIcon = null;
    this.lobbyPartyRecruitTitleIconFallbackRendered = false;
    this.lobbyPartyRecruitTitleText = null;
    this.lobbyPartyActionFocusIcon = null;
    this.lobbyPartyActionFocusIconFallbackRendered = false;
    this.lobbyPartyActionFocusTexts = [];
    this.lobbyShopTitleIcon = null;
    this.lobbyShopTitleIconFallbackRendered = false;
    this.lobbyShopTitleText = null;
    this.lobbyShopActionFocusIcon = null;
    this.lobbyShopActionFocusIconFallbackRendered = false;
    this.lobbyShopActionFocusTexts = [];
    this.lobbyEnhanceTitleIcon = null;
    this.lobbyEnhanceTitleIconFallbackRendered = false;
    this.lobbyEnhanceTitleText = null;
    this.lobbyEnhanceActionFocusIcon = null;
    this.lobbyEnhanceActionFocusIconFallbackRendered = false;
    this.lobbyEnhanceActionFocusTexts = [];
    this.lobbyStoryTitleIcon = null;
    this.lobbyStoryTitleIconFallbackRendered = false;
    this.lobbyStoryTitleText = null;
    this.lobbyStoryActionFocusIcon = null;
    this.lobbyStoryActionFocusIconFallbackRendered = false;
    this.lobbyStoryActionFocusTexts = [];
    this.lobbyQuestTitleIcon = null;
    this.lobbyQuestTitleIconFallbackRendered = false;
    this.lobbyQuestTitleText = null;
    this.lobbyQuestActionFocusIcon = null;
    this.lobbyQuestActionFocusIconFallbackRendered = false;
    this.lobbyQuestActionFocusTexts = [];
    this.lobbyConnectionStatusIcon = null;
    this.lobbyConnectionStatusIconFallbackRendered = false;
    this.goldIcon = null;
    this.goldIconFallbackRendered = false;
    this.lobbyTitleIcon = null;
    this.lobbyTitleText = null;
    this.lobbyTitleIconFallbackRendered = false;
    this.lobbyNotificationIcon = null;
    this.lobbyNotificationText = null;
    this.lobbyNotificationIconFallbackRendered = false;
  }

  preload(): void {
    // P33-A: 타운 배경 (실반헤임 숲)
    this.load.image('town_bg', 'assets/generated/environment/backgrounds/SYL-BG-FAR-DAY.png');
    this.load.image('town_bg_mid', 'assets/generated/environment/backgrounds/SYL-BG-MID-DAY.png');
    for (const texture of Object.values(LOBBY_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    const lobbyTitleIconResource = getSpriteResourceForWorldZoneIcon(LOBBY_TITLE_ICON_ZONE_ID);
    const queuedLobbyWorldIconKeys = new Set<string>();
    if (lobbyTitleIconResource && !this.textures.exists(lobbyTitleIconResource.key)) {
      this.load.image(lobbyTitleIconResource.key, lobbyTitleIconResource.path);
      queuedLobbyWorldIconKeys.add(lobbyTitleIconResource.key);
    }
    for (const icon of Object.values(LOBBY_NAV_ICON_TEXTURES)) {
      const navIconResource = this._resolveLobbyNavIconResource(icon);
      if (
        navIconResource
        && !this.textures.exists(navIconResource.key)
        && !queuedLobbyWorldIconKeys.has(navIconResource.key)
      ) {
        this.load.image(navIconResource.key, navIconResource.path);
        queuedLobbyWorldIconKeys.add(navIconResource.key);
      }
    }
    const partyTitleIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_RECRUIT_TITLE_ICON_ID);
    if (partyTitleIconResource && !this.textures.exists(partyTitleIconResource.key)) {
      this.load.image(partyTitleIconResource.key, partyTitleIconResource.path);
    }
    const dialogueChoiceFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID);
    if (dialogueChoiceFocusIconResource && !this.textures.exists(dialogueChoiceFocusIconResource.key)) {
      this.load.image(dialogueChoiceFocusIconResource.key, dialogueChoiceFocusIconResource.path);
    }
    const navFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_NAV_FOCUS_ICON_ID);
    if (
      navFocusIconResource
      && navFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && !this.textures.exists(navFocusIconResource.key)
    ) {
      this.load.image(navFocusIconResource.key, navFocusIconResource.path);
    }
    const partyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_ACTION_FOCUS_ICON_ID);
    if (
      partyActionFocusIconResource
      && partyActionFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && partyActionFocusIconResource.key !== navFocusIconResource?.key
      && !this.textures.exists(partyActionFocusIconResource.key)
    ) {
      this.load.image(partyActionFocusIconResource.key, partyActionFocusIconResource.path);
    }
    const storyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_STORY_ACTION_FOCUS_ICON_ID);
    if (
      storyActionFocusIconResource
      && storyActionFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && storyActionFocusIconResource.key !== navFocusIconResource?.key
      && storyActionFocusIconResource.key !== partyActionFocusIconResource?.key
      && !this.textures.exists(storyActionFocusIconResource.key)
    ) {
      this.load.image(storyActionFocusIconResource.key, storyActionFocusIconResource.path);
    }
    const shopActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_SHOP_ACTION_FOCUS_ICON_ID);
    if (
      shopActionFocusIconResource
      && shopActionFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && shopActionFocusIconResource.key !== navFocusIconResource?.key
      && shopActionFocusIconResource.key !== partyActionFocusIconResource?.key
      && shopActionFocusIconResource.key !== storyActionFocusIconResource?.key
      && !this.textures.exists(shopActionFocusIconResource.key)
    ) {
      this.load.image(shopActionFocusIconResource.key, shopActionFocusIconResource.path);
    }
    const enhanceActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID);
    if (
      enhanceActionFocusIconResource
      && enhanceActionFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && enhanceActionFocusIconResource.key !== navFocusIconResource?.key
      && enhanceActionFocusIconResource.key !== partyActionFocusIconResource?.key
      && enhanceActionFocusIconResource.key !== storyActionFocusIconResource?.key
      && enhanceActionFocusIconResource.key !== shopActionFocusIconResource?.key
      && !this.textures.exists(enhanceActionFocusIconResource.key)
    ) {
      this.load.image(enhanceActionFocusIconResource.key, enhanceActionFocusIconResource.path);
    }
    const inventoryActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID);
    if (
      inventoryActionFocusIconResource
      && inventoryActionFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && inventoryActionFocusIconResource.key !== navFocusIconResource?.key
      && inventoryActionFocusIconResource.key !== partyActionFocusIconResource?.key
      && inventoryActionFocusIconResource.key !== storyActionFocusIconResource?.key
      && inventoryActionFocusIconResource.key !== shopActionFocusIconResource?.key
      && inventoryActionFocusIconResource.key !== enhanceActionFocusIconResource?.key
      && !this.textures.exists(inventoryActionFocusIconResource.key)
    ) {
      this.load.image(inventoryActionFocusIconResource.key, inventoryActionFocusIconResource.path);
    }
    const questActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_QUEST_ACTION_FOCUS_ICON_ID);
    if (
      questActionFocusIconResource
      && questActionFocusIconResource.key !== dialogueChoiceFocusIconResource?.key
      && questActionFocusIconResource.key !== navFocusIconResource?.key
      && questActionFocusIconResource.key !== partyActionFocusIconResource?.key
      && questActionFocusIconResource.key !== storyActionFocusIconResource?.key
      && questActionFocusIconResource.key !== shopActionFocusIconResource?.key
      && questActionFocusIconResource.key !== enhanceActionFocusIconResource?.key
      && questActionFocusIconResource.key !== inventoryActionFocusIconResource?.key
      && !this.textures.exists(questActionFocusIconResource.key)
    ) {
      this.load.image(questActionFocusIconResource.key, questActionFocusIconResource.path);
    }
    const queuedLobbyIconKeys = new Set([
      partyTitleIconResource?.key,
      dialogueChoiceFocusIconResource?.key,
      navFocusIconResource?.key,
      partyActionFocusIconResource?.key,
      storyActionFocusIconResource?.key,
      shopActionFocusIconResource?.key,
      enhanceActionFocusIconResource?.key,
      inventoryActionFocusIconResource?.key,
      questActionFocusIconResource?.key,
    ].filter((key): key is string => Boolean(key)));
    for (const mode of Object.keys(LOBBY_CONNECTION_ICON_IDS) as LobbyConnectionIconMode[]) {
      const connectionIconResource = getLobbyConnectionIconResource(mode);
      if (
        connectionIconResource
        && !this.textures.exists(connectionIconResource.key)
        && !queuedLobbyIconKeys.has(connectionIconResource.key)
      ) {
        this.load.image(connectionIconResource.key, connectionIconResource.path);
        queuedLobbyIconKeys.add(connectionIconResource.key);
      }
    }

    // P33-A: NPC 스프라이트
    for (const [npcId, spriteFile] of Object.entries(NPC_SPRITE_MAP)) {
      const resource = getSpriteResourceForLobbyNpc(npcId);
      if (resource) {
        this.load.spritesheet(resource.key, resource.path, {
          frameWidth: resource.frameWidth,
          frameHeight: resource.frameHeight,
        });
      } else {
        this.load.image(
          `npc_${npcId}`,
          `assets/generated/characters/npc_sprites/${spriteFile}.png`,
        );
      }
    }
    for (const portrait of Object.values(LOBBY_NPC_PORTRAIT_TEXTURES)) {
      if (!this.textures.exists(portrait.key)) {
        this.load.image(portrait.key, portrait.path);
      }
    }
    preloadSkillTreeIconResources(this);
    preloadItemIconResources(this);
    const isSkillTreeFrameQa = this.characterData?.openSkillTreeQa === true || this._isSkillTreeFrameQaRoute();
    const skillTreeFrameQaCacheBuster = isSkillTreeFrameQa ? this._getSkillTreeFrameQaCacheBuster() : undefined;
    preloadSkillTreeUiFrameTextures(this, skillTreeFrameQaCacheBuster
      ? { cacheBuster: skillTreeFrameQaCacheBuster, forceReload: true }
      : undefined);
    if (skillTreeFrameQaCacheBuster) {
      this._preloadSkillTreeFrameQaProbes(skillTreeFrameQaCacheBuster);
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Lobby] 이미지 로드 실패: ${file.key}`);
    });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#12211a');

    this._drawTownBackground(width, height);
    this._drawHud(width);
    this._spawnNpcs();
    this._drawNavButtons(width, height);
    this._drawMinimap(width);

    // P25-03: 소켓 연결 + 연결 상태 표시
    this.connectionIndicator = this.add.text(width - 12, height - 12, '', {
      fontSize: '10px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#44cc44',
    }).setOrigin(1, 1);

    this._connectToServer();

    if (this.characterData?.openSkillTreeQa === true) {
      this.time.delayedCall(300, () => {
        void this._openSkillTree();
      });
    }

    if (this._getItemIconQaMode()) {
      this.time.delayedCall(350, () => this._openItemIconQaPanel());
    }

    if (this.characterData?.dialogueTitleIconQa === true || this._isDialogueTitleIconQaRoute()) {
      this.time.delayedCall(350, () => this._openDialogueTitleIconQaPanel());
    }

    if (this.characterData?.dialogueChoiceButtonFrameQa === true || this._isDialogueChoiceButtonFrameQaRoute()) {
      this.time.delayedCall(350, () => this._openDialogueChoiceButtonFrameQaPanel());
    }

    if (this.characterData?.dialogueChoiceFocusIconQa === true || this._isDialogueChoiceFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openDialogueChoiceFocusIconQaPanel());
    }

    if (this.characterData?.inventoryTitleIconQa === true || this._isInventoryTitleIconQaRoute()) {
      this.time.delayedCall(350, () => this._openInventoryTitleIconQaPanel());
    }

    if (this.characterData?.inventoryActionFocusIconQa === true || this._isInventoryActionFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openInventoryActionFocusIconQaPanel());
    }

    if (this.characterData?.partyRecruitIconQa === true || this._isPartyRecruitIconQaRoute()) {
      this.time.delayedCall(350, () => this._openPartyRecruitIconQaPanel());
    }

    if (this.characterData?.partyActionFocusIconQa === true || this._isPartyActionFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openPartyActionFocusIconQaPanel());
    }

    if (this.characterData?.shopTitleIconQa === true || this._isShopTitleIconQaRoute()) {
      this.time.delayedCall(350, () => this._openShopTitleIconQaPanel());
    }

    if (this.characterData?.shopActionFocusIconQa === true || this._isShopActionFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openShopActionFocusIconQaPanel());
    }

    if (this.characterData?.enhanceTitleIconQa === true || this._isEnhanceTitleIconQaRoute()) {
      this.time.delayedCall(350, () => this._openEnhanceTitleIconQaPanel());
    }

    if (this.characterData?.enhanceActionFocusIconQa === true || this._isEnhanceActionFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openEnhanceActionFocusIconQaPanel());
    }

    if (this.characterData?.storyTitleIconQa === true || this._isStoryTitleIconQaRoute()) {
      this.time.delayedCall(350, () => this._openStoryTitleIconQaPanel());
    }

    if (this.characterData?.storyActionFocusIconQa === true || this._isStoryActionFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openStoryActionFocusIconQaPanel());
    }

    if (this.characterData?.questTitleIconQa === true || this._isQuestTitleIconQaRoute()) {
      this.time.delayedCall(350, () => this._openQuestTitleIconQaPanel());
    }

    if (this.characterData?.questActionFocusIconQa === true || this._isQuestActionFocusIconQaRoute()) {
      this.time.delayedCall(350, () => this._openQuestActionFocusIconQaPanel());
    }

    const lobbyNotificationIconQaMode = this._getLobbyNotificationIconQaMode();
    if (lobbyNotificationIconQaMode) {
      this.time.delayedCall(350, () => this._openLobbyNotificationIconQa(lobbyNotificationIconQaMode));
    }

    SceneManager.fadeIn(this, 300);
  }

  private _isSkillTreeFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('skillTreeQa') === '1';
  }

  private _getSkillTreeFrameQaCacheBuster(): string {
    if (typeof window === 'undefined') return 'skillTreeQa=1';

    const qaRun = new URLSearchParams(window.location.search).get('qaRun');
    return qaRun ? `skillTreeQa=1&qaRun=${encodeURIComponent(qaRun)}` : 'skillTreeQa=1';
  }

  private _getItemIconQaMode(): ItemIconQaMode | undefined {
    const dataMode = this.characterData?.itemIconQa;
    if (dataMode === 'shop' || dataMode === 'inventory') return dataMode;
    if (typeof window === 'undefined') return undefined;

    const routeMode = new URLSearchParams(window.location.search).get('itemIconQa');
    return routeMode === 'shop' || routeMode === 'inventory' ? routeMode : undefined;
  }

  private _openItemIconQaPanel(): void {
    const itemIconQaMode = this._getItemIconQaMode();
    if (!itemIconQaMode) return;

    this._resetItemIconQaProbe();

    if (itemIconQaMode === 'shop') {
      const merchant = TOWN_NPCS.find((npc) => npc.id === 'merchant');
      if (merchant) {
        void this._showShopPanel(merchant).then(() => this._writeItemIconQaProbe('ready'));
      } else {
        this._writeItemIconQaProbe('missing-merchant');
      }
      return;
    }

    if (itemIconQaMode === 'inventory') {
      this._showInventoryPanel(LOBBY_QA_INVENTORY_ITEMS);
      this._writeItemIconQaProbe('ready');
    }
  }

  private _resetItemIconQaProbe(): void {
    if (!this._getItemIconQaMode()) return;

    this.itemIconQaRenderedIconIds = [];
    this.itemIconQaMissingIconIds = [];
    this._writeItemIconQaProbe('opening');
  }

  private _recordItemIconQaProbe(iconId: string, rendered: boolean): void {
    if (!this._getItemIconQaMode()) return;

    const target = rendered ? this.itemIconQaRenderedIconIds : this.itemIconQaMissingIconIds;
    if (!target.includes(iconId)) {
      target.push(iconId);
    }
  }

  private _writeItemIconQaProbe(status: string): void {
    const itemIconQaMode = this._getItemIconQaMode();
    if (!itemIconQaMode || typeof document === 'undefined') return;

    document.body.dataset.aeternaItemIconQa = JSON.stringify({
      mode: itemIconQaMode,
      status,
      renderedIconIds: this.itemIconQaRenderedIconIds,
      missingIconIds: this.itemIconQaMissingIconIds,
    });
  }

  private _isDialogueTitleIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('dialogueTitleIconQa') === '1';
  }

  private _openDialogueTitleIconQaPanel(): void {
    if (!this._isDialogueTitleIconQaRoute() && this.characterData?.dialogueTitleIconQa !== true) return;

    const merchant = TOWN_NPCS.find((npc) => npc.id === LOBBY_DIALOGUE_TITLE_ICON_NPC_ID);
    if (!merchant) {
      this._writeDialogueTitleIconQaProbe({ npc: null, titleText: '' });
      return;
    }

    this._openNpcDialogue(merchant);
  }

  private _writeDialogueTitleIconQaProbe({ npc, titleText }: { npc: NpcEntry | null; titleText: string }): void {
    if (!this._isDialogueTitleIconQaRoute() && this.characterData?.dialogueTitleIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const dialogueTitleIconResource = npc ? LOBBY_NPC_PORTRAIT_TEXTURES[npc.id] : undefined;
    const titleIcon = this.lobbyDialogueTitleIcon?.active === true
      ? this.lobbyDialogueTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('💬')
      || (this.lobbyDialogueTitleText?.text.includes('💬') ?? false);
    const missingDialogueTitleIconKeys = titleIcon && dialogueTitleIconResource
      ? []
      : [dialogueTitleIconResource?.key ?? LOBBY_DIALOGUE_TITLE_ICON_NPC_ID];

    document.body.dataset.aeternaDialogueTitleIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      npcId: npc?.id ?? null,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: dialogueTitleIconResource?.key ?? null,
        path: dialogueTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_DIALOGUE_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyDialogueTitleIconFallbackRendered,
      },
      missingDialogueTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isDialogueChoiceButtonFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('dialogueChoiceButtonFrameQa') === '1';
  }

  private _openDialogueChoiceButtonFrameQaPanel(): void {
    if (!this._isDialogueChoiceButtonFrameQaRoute() && this.characterData?.dialogueChoiceButtonFrameQa !== true) return;

    const merchant = TOWN_NPCS.find((npc) => npc.id === LOBBY_DIALOGUE_TITLE_ICON_NPC_ID);
    if (!merchant) {
      this._writeDialogueChoiceButtonFrameQaProbe();
      return;
    }

    this._openNpcDialogue(merchant);
  }

  private _writeDialogueChoiceButtonFrameQaProbe(): void {
    if (!this._isDialogueChoiceButtonFrameQaRoute() && this.characterData?.dialogueChoiceButtonFrameQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const frameTexture = LOBBY_UI_FRAME_TEXTURES.dialogueChoiceButton;
    const renderedCount = this.lobbyDialogueChoiceButtonFrames.length;

    document.body.dataset.aeternaDialogueChoiceButtonFrameQa = JSON.stringify({
      status: renderedCount === 2 && !this.lobbyDialogueChoiceButtonFrameFallbackRendered ? 'ready' : 'missing-frame',
      buttonFrame: {
        key: frameTexture.key,
        path: frameTexture.path,
        renderedCount: this.lobbyDialogueChoiceButtonFrames.length,
        expectedCount: 2,
        displaySizes: this.lobbyDialogueChoiceButtonFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
        fallbackRendered: this.lobbyDialogueChoiceButtonFrameFallbackRendered,
      },
      missingFrameKeys: renderedCount === 2 ? [] : [frameTexture.key],
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isDialogueChoiceFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('dialogueChoiceFocusIconQa') === '1';
  }

  private _openDialogueChoiceFocusIconQaPanel(): void {
    if (!this._isDialogueChoiceFocusIconQaRoute() && this.characterData?.dialogueChoiceFocusIconQa !== true) return;

    const merchant = TOWN_NPCS.find((npc) => npc.id === LOBBY_DIALOGUE_TITLE_ICON_NPC_ID);
    if (!merchant) {
      this._writeDialogueChoiceFocusIconQaProbe();
      return;
    }

    this._openNpcDialogue(merchant);
  }

  private _writeDialogueChoiceFocusIconQaProbe(): void {
    if (!this._isDialogueChoiceFocusIconQaRoute() && this.characterData?.dialogueChoiceFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const focusIconResource = getSpriteResourceForSkillIcon(LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID);
    const focusIcon = this.lobbyDialogueChoiceFocusIcon?.active === true
      ? this.lobbyDialogueChoiceFocusIcon
      : null;
    const legacyGlyphPresent = this.lobbyDialogueChoiceTexts.some((text) => text.text.includes('▶'));
    const missingDialogueChoiceFocusIconKeys = focusIcon && focusIconResource
      ? []
      : [focusIconResource?.key ?? LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID];

    document.body.dataset.aeternaDialogueChoiceFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      focusIcon: {
        key: focusIconResource?.key ?? null,
        path: focusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyDialogueChoiceFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      missingDialogueChoiceFocusIconKeys,
      labels: this.lobbyDialogueChoiceTexts.map((text) => text.text),
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isInventoryTitleIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('inventoryTitleIconQa') === '1';
  }

  private _openInventoryTitleIconQaPanel(): void {
    if (!this._isInventoryTitleIconQaRoute() && this.characterData?.inventoryTitleIconQa !== true) return;

    this._showInventoryPanel(LOBBY_QA_INVENTORY_ITEMS);
  }

  private _writeInventoryTitleIconQaProbe({ titleText }: { titleText: string }): void {
    if (!this._isInventoryTitleIconQaRoute() && this.characterData?.inventoryTitleIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const inventoryTitleIconResource = getItemIconResource({ itemIconId: LOBBY_INVENTORY_TITLE_ICON_ID });
    const titleIcon = this.lobbyInventoryTitleIcon?.active === true
      ? this.lobbyInventoryTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('🎒')
      || (this.lobbyInventoryTitleText?.text.includes('🎒') ?? false);
    const missingInventoryTitleIconKeys = titleIcon && inventoryTitleIconResource
      ? []
      : [inventoryTitleIconResource?.key ?? LOBBY_INVENTORY_TITLE_ICON_ID];

    document.body.dataset.aeternaInventoryTitleIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      iconId: LOBBY_INVENTORY_TITLE_ICON_ID,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: inventoryTitleIconResource?.key ?? null,
        path: inventoryTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_INVENTORY_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyInventoryTitleIconFallbackRendered,
      },
      missingInventoryTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isInventoryActionFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('inventoryActionFocusIconQa') === '1';
  }

  private _openInventoryActionFocusIconQaPanel(): void {
    if (!this._isInventoryActionFocusIconQaRoute() && this.characterData?.inventoryActionFocusIconQa !== true) return;

    this._showInventoryPanel(LOBBY_QA_INVENTORY_ITEMS);
  }

  private _writeInventoryActionFocusIconQaProbe(activeIndex = 0): void {
    if (!this._isInventoryActionFocusIconQaRoute() && this.characterData?.inventoryActionFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const inventoryActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID);
    const focusIcon = this.lobbyInventoryActionFocusIcon?.active === true
      ? this.lobbyInventoryActionFocusIcon
      : null;
    const labels = this.lobbyInventoryActionFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingInventoryActionFocusIconKeys = focusIcon && inventoryActionFocusIconResource
      ? []
      : [inventoryActionFocusIconResource?.key ?? LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID];

    document.body.dataset.aeternaInventoryActionFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: inventoryActionFocusIconResource?.key ?? null,
        path: inventoryActionFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_INVENTORY_ACTION_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyInventoryActionFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingInventoryActionFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isPartyRecruitIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('partyRecruitIconQa') === '1';
  }

  private _openPartyRecruitIconQaPanel(): void {
    if (!this._isPartyRecruitIconQaRoute() && this.characterData?.partyRecruitIconQa !== true) return;

    const partyRecruit = TOWN_NPCS.find((npc) => npc.id === 'party_recruit');
    if (!partyRecruit) {
      this._writePartyRecruitIconQaProbe({ titleText: '' });
      return;
    }

    this._showPartyPanel(partyRecruit);
  }

  private _writePartyRecruitIconQaProbe({ titleText }: { titleText: string }): void {
    if (!this._isPartyRecruitIconQaRoute() && this.characterData?.partyRecruitIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const partyTitleIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_RECRUIT_TITLE_ICON_ID);
    const titleIcon = this.lobbyPartyRecruitTitleIcon?.active === true
      ? this.lobbyPartyRecruitTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('⚔')
      || (this.lobbyPartyRecruitTitleText?.text.includes('⚔') ?? false);
    const missingPartyRecruitTitleIconKeys = titleIcon && partyTitleIconResource
      ? []
      : [partyTitleIconResource?.key ?? LOBBY_PARTY_RECRUIT_TITLE_ICON_ID];

    document.body.dataset.aeternaPartyRecruitIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      iconId: LOBBY_PARTY_RECRUIT_TITLE_ICON_ID,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: partyTitleIconResource?.key ?? null,
        path: partyTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_PARTY_RECRUIT_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyPartyRecruitTitleIconFallbackRendered,
      },
      missingPartyRecruitTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isPartyActionFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('partyActionFocusIconQa') === '1';
  }

  private _openPartyActionFocusIconQaPanel(): void {
    if (!this._isPartyActionFocusIconQaRoute() && this.characterData?.partyActionFocusIconQa !== true) return;

    const partyRecruit = TOWN_NPCS.find((npc) => npc.id === 'party_recruit');
    if (!partyRecruit) {
      this._writePartyActionFocusIconQaProbe();
      return;
    }

    this._showPartyPanel(partyRecruit);
  }

  private _writePartyActionFocusIconQaProbe(activeIndex = 0): void {
    if (!this._isPartyActionFocusIconQaRoute() && this.characterData?.partyActionFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const partyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_ACTION_FOCUS_ICON_ID);
    const focusIcon = this.lobbyPartyActionFocusIcon?.active === true
      ? this.lobbyPartyActionFocusIcon
      : null;
    const labels = this.lobbyPartyActionFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingPartyActionFocusIconKeys = focusIcon && partyActionFocusIconResource
      ? []
      : [partyActionFocusIconResource?.key ?? LOBBY_PARTY_ACTION_FOCUS_ICON_ID];

    document.body.dataset.aeternaPartyActionFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: partyActionFocusIconResource?.key ?? null,
        path: partyActionFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_PARTY_ACTION_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyPartyActionFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingPartyActionFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isShopTitleIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('shopTitleIconQa') === '1';
  }

  private _openShopTitleIconQaPanel(): void {
    if (!this._isShopTitleIconQaRoute() && this.characterData?.shopTitleIconQa !== true) return;

    const merchant = TOWN_NPCS.find((npc) => npc.id === 'merchant');
    if (!merchant) {
      this._writeShopTitleIconQaProbe({ titleText: '' });
      return;
    }

    void this._showShopPanel(merchant);
  }

  private _writeShopTitleIconQaProbe({ titleText }: { titleText: string }): void {
    if (!this._isShopTitleIconQaRoute() && this.characterData?.shopTitleIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const shopTitleIconResource = getItemIconResource({ itemIconId: LOBBY_SHOP_TITLE_ICON_ID });
    const titleIcon = this.lobbyShopTitleIcon?.active === true
      ? this.lobbyShopTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('🛒')
      || (this.lobbyShopTitleText?.text.includes('🛒') ?? false);
    const missingShopTitleIconKeys = titleIcon && shopTitleIconResource
      ? []
      : [shopTitleIconResource?.key ?? LOBBY_SHOP_TITLE_ICON_ID];

    document.body.dataset.aeternaShopTitleIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      iconId: LOBBY_SHOP_TITLE_ICON_ID,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: shopTitleIconResource?.key ?? null,
        path: shopTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_SHOP_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyShopTitleIconFallbackRendered,
      },
      missingShopTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isShopActionFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('shopActionFocusIconQa') === '1';
  }

  private _openShopActionFocusIconQaPanel(): void {
    if (!this._isShopActionFocusIconQaRoute() && this.characterData?.shopActionFocusIconQa !== true) return;

    const merchant = TOWN_NPCS.find((npc) => npc.id === 'merchant');
    if (!merchant) {
      this._writeShopActionFocusIconQaProbe();
      return;
    }

    void this._showShopPanel(merchant);
  }

  private _writeShopActionFocusIconQaProbe(activeIndex = 0): void {
    if (!this._isShopActionFocusIconQaRoute() && this.characterData?.shopActionFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const shopActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_SHOP_ACTION_FOCUS_ICON_ID);
    const focusIcon = this.lobbyShopActionFocusIcon?.active === true
      ? this.lobbyShopActionFocusIcon
      : null;
    const labels = this.lobbyShopActionFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingShopActionFocusIconKeys = focusIcon && shopActionFocusIconResource
      ? []
      : [shopActionFocusIconResource?.key ?? LOBBY_SHOP_ACTION_FOCUS_ICON_ID];

    document.body.dataset.aeternaShopActionFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: shopActionFocusIconResource?.key ?? null,
        path: shopActionFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_SHOP_ACTION_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyShopActionFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingShopActionFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isEnhanceTitleIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('enhanceTitleIconQa') === '1';
  }

  private _openEnhanceTitleIconQaPanel(): void {
    if (!this._isEnhanceTitleIconQaRoute() && this.characterData?.enhanceTitleIconQa !== true) return;

    const blacksmith = TOWN_NPCS.find((npc) => npc.id === 'blacksmith');
    if (!blacksmith) {
      this._writeEnhanceTitleIconQaProbe({ titleText: '' });
      return;
    }

    this._showEnhancePanel(blacksmith);
  }

  private _writeEnhanceTitleIconQaProbe({ titleText }: { titleText: string }): void {
    if (!this._isEnhanceTitleIconQaRoute() && this.characterData?.enhanceTitleIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const enhanceTitleIconResource = getItemIconResource({ itemIconId: LOBBY_ENHANCE_TITLE_ICON_ID });
    const titleIcon = this.lobbyEnhanceTitleIcon?.active === true
      ? this.lobbyEnhanceTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('🔨')
      || (this.lobbyEnhanceTitleText?.text.includes('🔨') ?? false);
    const missingEnhanceTitleIconKeys = titleIcon && enhanceTitleIconResource
      ? []
      : [enhanceTitleIconResource?.key ?? LOBBY_ENHANCE_TITLE_ICON_ID];

    document.body.dataset.aeternaEnhanceTitleIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      iconId: LOBBY_ENHANCE_TITLE_ICON_ID,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: enhanceTitleIconResource?.key ?? null,
        path: enhanceTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_ENHANCE_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyEnhanceTitleIconFallbackRendered,
      },
      missingEnhanceTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isEnhanceActionFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('enhanceActionFocusIconQa') === '1';
  }

  private _openEnhanceActionFocusIconQaPanel(): void {
    if (!this._isEnhanceActionFocusIconQaRoute() && this.characterData?.enhanceActionFocusIconQa !== true) return;

    const blacksmith = TOWN_NPCS.find((npc) => npc.id === 'blacksmith');
    if (!blacksmith) {
      this._writeEnhanceActionFocusIconQaProbe();
      return;
    }

    this._showEnhancePanel(blacksmith);
  }

  private _writeEnhanceActionFocusIconQaProbe(activeIndex = 0): void {
    if (!this._isEnhanceActionFocusIconQaRoute() && this.characterData?.enhanceActionFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const enhanceActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID);
    const focusIcon = this.lobbyEnhanceActionFocusIcon?.active === true
      ? this.lobbyEnhanceActionFocusIcon
      : null;
    const labels = this.lobbyEnhanceActionFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingEnhanceActionFocusIconKeys = focusIcon && enhanceActionFocusIconResource
      ? []
      : [enhanceActionFocusIconResource?.key ?? LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID];

    document.body.dataset.aeternaEnhanceActionFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: enhanceActionFocusIconResource?.key ?? null,
        path: enhanceActionFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_ENHANCE_ACTION_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyEnhanceActionFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingEnhanceActionFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isStoryTitleIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('storyTitleIconQa') === '1';
  }

  private _openStoryTitleIconQaPanel(): void {
    if (!this._isStoryTitleIconQaRoute() && this.characterData?.storyTitleIconQa !== true) return;

    const elder = TOWN_NPCS.find((npc) => npc.id === 'elder');
    if (!elder) {
      this._writeStoryTitleIconQaProbe({ titleText: '' });
      return;
    }

    this._showStoryPanel(elder);
  }

  private _writeStoryTitleIconQaProbe({ titleText }: { titleText: string }): void {
    if (!this._isStoryTitleIconQaRoute() && this.characterData?.storyTitleIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const storyTitleIconResource = getItemIconResource({ itemIconId: LOBBY_STORY_TITLE_ICON_ID });
    const titleIcon = this.lobbyStoryTitleIcon?.active === true
      ? this.lobbyStoryTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('📖')
      || (this.lobbyStoryTitleText?.text.includes('📖') ?? false);
    const missingStoryTitleIconKeys = titleIcon && storyTitleIconResource
      ? []
      : [storyTitleIconResource?.key ?? LOBBY_STORY_TITLE_ICON_ID];

    document.body.dataset.aeternaStoryTitleIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      iconId: LOBBY_STORY_TITLE_ICON_ID,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: storyTitleIconResource?.key ?? null,
        path: storyTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_STORY_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyStoryTitleIconFallbackRendered,
      },
      missingStoryTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isStoryActionFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('storyActionFocusIconQa') === '1';
  }

  private _openStoryActionFocusIconQaPanel(): void {
    if (!this._isStoryActionFocusIconQaRoute() && this.characterData?.storyActionFocusIconQa !== true) return;

    const elder = TOWN_NPCS.find((npc) => npc.id === 'elder');
    if (!elder) {
      this._writeStoryActionFocusIconQaProbe();
      return;
    }

    this._showStoryPanel(elder);
  }

  private _writeStoryActionFocusIconQaProbe(activeIndex = 0): void {
    if (!this._isStoryActionFocusIconQaRoute() && this.characterData?.storyActionFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const storyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_STORY_ACTION_FOCUS_ICON_ID);
    const focusIcon = this.lobbyStoryActionFocusIcon?.active === true
      ? this.lobbyStoryActionFocusIcon
      : null;
    const labels = this.lobbyStoryActionFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingStoryActionFocusIconKeys = focusIcon && storyActionFocusIconResource
      ? []
      : [storyActionFocusIconResource?.key ?? LOBBY_STORY_ACTION_FOCUS_ICON_ID];

    document.body.dataset.aeternaStoryActionFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: storyActionFocusIconResource?.key ?? null,
        path: storyActionFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_STORY_ACTION_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyStoryActionFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingStoryActionFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isQuestTitleIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('questTitleIconQa') === '1';
  }

  private _openQuestTitleIconQaPanel(): void {
    if (!this._isQuestTitleIconQaRoute() && this.characterData?.questTitleIconQa !== true) return;

    this._showQuestPanel(FALLBACK_QUESTS, 'local');
  }

  private _writeQuestTitleIconQaProbe({ titleText }: { titleText: string }): void {
    if (!this._isQuestTitleIconQaRoute() && this.characterData?.questTitleIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const questTitleIconResource = getItemIconResource({ itemIconId: LOBBY_QUEST_TITLE_ICON_ID });
    const titleIcon = this.lobbyQuestTitleIcon?.active === true
      ? this.lobbyQuestTitleIcon
      : null;
    const legacyGlyphPresent = titleText.includes('📜')
      || (this.lobbyQuestTitleText?.text.includes('📜') ?? false);
    const missingQuestTitleIconKeys = titleIcon && questTitleIconResource
      ? []
      : [questTitleIconResource?.key ?? LOBBY_QUEST_TITLE_ICON_ID];

    document.body.dataset.aeternaQuestTitleIconQa = JSON.stringify({
      status: titleIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      iconId: LOBBY_QUEST_TITLE_ICON_ID,
      titleText,
      legacyGlyphPresent,
      titleIcon: {
        key: questTitleIconResource?.key ?? null,
        path: questTitleIconResource?.path ?? null,
        renderedCount: titleIcon ? 1 : 0,
        expectedCount: LOBBY_QUEST_TITLE_ICON_EXPECTED_COUNT,
        displaySizes: titleIcon ? [{ width: titleIcon.displayWidth, height: titleIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyQuestTitleIconFallbackRendered,
      },
      missingQuestTitleIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isQuestActionFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('questActionFocusIconQa') === '1';
  }

  private _openQuestActionFocusIconQaPanel(): void {
    if (!this._isQuestActionFocusIconQaRoute() && this.characterData?.questActionFocusIconQa !== true) return;

    this._showQuestPanel(FALLBACK_QUESTS, 'local');
  }

  private _writeQuestActionFocusIconQaProbe(activeIndex = 0): void {
    if (!this._isQuestActionFocusIconQaRoute() && this.characterData?.questActionFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const questActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_QUEST_ACTION_FOCUS_ICON_ID);
    const focusIcon = this.lobbyQuestActionFocusIcon?.active === true
      ? this.lobbyQuestActionFocusIcon
      : null;
    const labels = this.lobbyQuestActionFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingQuestActionFocusIconKeys = focusIcon && questActionFocusIconResource
      ? []
      : [questActionFocusIconResource?.key ?? LOBBY_QUEST_ACTION_FOCUS_ICON_ID];

    document.body.dataset.aeternaQuestActionFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: questActionFocusIconResource?.key ?? null,
        path: questActionFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_QUEST_ACTION_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyQuestActionFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingQuestActionFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _preloadSkillTreeFrameQaProbes(cacheBuster: string): void {
    const probes = [
      {
        key: 'ui_frame_skill_tree_main_panel_qa_probe',
        path: SKILL_TREE_UI_FRAME_TEXTURES.mainPanel.path,
        probe: 'main',
      },
      {
        key: 'ui_frame_skill_tree_detail_panel_qa_probe',
        path: SKILL_TREE_UI_FRAME_TEXTURES.detailPanel.path,
        probe: 'detail',
      },
      {
        key: 'ui_frame_skill_tree_action_button_qa_probe',
        path: SKILL_TREE_UI_FRAME_TEXTURES.actionButton.path,
        probe: 'action',
      },
    ] as const;

    for (const probe of probes) {
      if (this.textures.exists(probe.key)) {
        this.textures.remove(probe.key);
      }
      this.load.image(probe.key, `${probe.path}?${cacheBuster}&probe=${probe.probe}`);
    }
  }

  private _addLobbyConnectionStatusIcon(resource: LobbyNavIconResource): Phaser.GameObjects.Image {
    const icon = this.add.image(0, 0, resource.key)
      .setOrigin(0.5)
      .setDepth(10000)
      .setName('lobby_connection_status_icon');
    icon.setDisplaySize(14, 14);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return icon;
  }

  private _renderLobbyConnectionStatus(
    mode: LobbyConnectionIconMode,
    labelOverride?: string,
    colorOverride?: string,
  ): void {
    const state = LOBBY_CONNECTION_STATES[mode];
    const iconResource = getLobbyConnectionIconResource(mode);
    const hasConnectionIcon = Boolean(iconResource && this.textures.exists(iconResource.key));
    const label = hasConnectionIcon
      ? (labelOverride ?? state.label)
      : (labelOverride ? `${state.fallbackLabel.split(' ')[0]} ${labelOverride}` : state.fallbackLabel);
    const color = colorOverride ?? state.color;

    this.connectionIndicator.setText(label).setColor(color);

    if (hasConnectionIcon && iconResource) {
      if (!this.lobbyConnectionStatusIcon || !this.lobbyConnectionStatusIcon.active) {
        this.lobbyConnectionStatusIcon = this._addLobbyConnectionStatusIcon(iconResource);
      } else {
        this.lobbyConnectionStatusIcon.setTexture(iconResource.key).setVisible(true);
      }
      this.lobbyConnectionStatusIcon
        .setPosition(
          this.connectionIndicator.x - this.connectionIndicator.displayWidth - LOBBY_CONNECTION_ICON_SIZE / 2 - 4,
          this.connectionIndicator.y - LOBBY_CONNECTION_ICON_SIZE / 2,
        )
        .setAlpha(1);
      this.lobbyConnectionStatusIconFallbackRendered = false;
    } else {
      this.lobbyConnectionStatusIcon?.setVisible(false);
      this.lobbyConnectionStatusIconFallbackRendered = true;
    }

    this._writeLobbyConnectionIconQaProbe({ mode, label, hasConnectionIcon });
  }

  private _writeLobbyConnectionIconQaProbe({
    mode,
    label,
    hasConnectionIcon,
  }: {
    mode: LobbyConnectionIconMode;
    label: string;
    hasConnectionIcon: boolean;
  }): void {
    if (this.characterData.lobbyConnectionIconQa === undefined || typeof document === 'undefined') return;

    const connectionIconResource = getLobbyConnectionIconResource(mode);
    const legacyGlyphPresent = label.includes('●') || label.includes('○') || label.includes('✕');
    const missingLobbyConnectionIconKeys = hasConnectionIcon
      ? []
      : [connectionIconResource?.key ?? LOBBY_CONNECTION_ICON_IDS[mode]];

    document.body.dataset.aeternaLobbyConnectionIconQa = JSON.stringify({
      status: hasConnectionIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      mode,
      label,
      legacyGlyphPresent,
      connectionIcon: {
        iconId: LOBBY_CONNECTION_ICON_IDS[mode],
        key: connectionIconResource?.key ?? null,
        path: connectionIconResource?.path ?? null,
        renderedCount: this.lobbyConnectionStatusIcon?.active === true && this.lobbyConnectionStatusIcon.visible ? 1 : 0,
        displaySizes: this.lobbyConnectionStatusIcon
          ? [{ width: this.lobbyConnectionStatusIcon.displayWidth, height: this.lobbyConnectionStatusIcon.displayHeight }]
          : [],
        fallbackRendered: this.lobbyConnectionStatusIconFallbackRendered,
      },
      missingLobbyConnectionIconKeys,
    });
  }

  // ── P25-03: 서버 연결 ───────────────────────────────────

  private _connectToServer(): void {
    if (this.characterData?.offlineQa) {
      if (this.characterData.lobbyConnectionIconQa !== undefined) {
        this._renderLobbyConnectionStatus(this.characterData.lobbyConnectionIconQa);
        return;
      }
      this._renderLobbyConnectionStatus('connected', '로컬 QA', '#ffcc44');
      return;
    }

    // 소켓 연결
    if (!networkManager.isConnected) {
      networkManager.connect();
    }

    // 연결 상태 표시
    networkManager.onConnectionChange((state) => {
      const mode = getLobbyConnectionMode(state);
      this._renderLobbyConnectionStatus(mode, getLobbyConnectionStateLabel(state));
    });

    // 소켓 이벤트 바인딩
    networkManager.on('world:playerJoined', (data) => {
      const d = data as { characterId: string; name: string };
      console.log(`[Lobby] 플레이어 입장: ${d.name}`);
    });

    networkManager.on('system:notification', (data) => {
      const d = data as { type: string; message: string };
      this._showNotification(d.message);
    });

    // 초기 상태 표시
    this._renderLobbyConnectionStatus(networkManager.isConnected ? 'connected' : 'offline');
  }

  private _showNotification(msg: string, iconId?: LobbyNotificationIconId): void {
    const { width } = this.cameras.main;
    this.lobbyNotificationIcon = null;
    this.lobbyNotificationText = null;
    this.lobbyNotificationIconFallbackRendered = false;

    const notificationIconResource = iconId ? this._resolveLobbyNotificationIconResource(iconId) : undefined;
    const hasNotificationIcon = Boolean(notificationIconResource && this.textures.exists(notificationIconResource.key));
    const notif = this.add.container(width / 2, 110).setAlpha(0);
    const textOffsetX = hasNotificationIcon ? LOBBY_NOTIFICATION_ICON_SIZE / 2 + 8 : 0;

    this.lobbyNotificationText = this.add.text(textOffsetX, 0, msg, {
      fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);

    const notificationWidth = this.lobbyNotificationText.displayWidth
      + (hasNotificationIcon ? LOBBY_NOTIFICATION_ICON_SIZE + 24 : 18);
    const notificationHeight = Math.max(this.lobbyNotificationText.displayHeight + 10, LOBBY_NOTIFICATION_ICON_SIZE + 10);
    notif.add(this.add.rectangle(0, 0, notificationWidth, notificationHeight, 0x000000, 0.56)
      .setStrokeStyle(1, 0x334433, 0.65));

    if (hasNotificationIcon && notificationIconResource) {
      const iconX = this.lobbyNotificationText.x
        - this.lobbyNotificationText.displayWidth / 2
        - LOBBY_NOTIFICATION_ICON_SIZE / 2
        - 8;
      this.lobbyNotificationIcon = this.add.image(iconX, 0, notificationIconResource.key)
        .setName('lobby_notification_icon')
        .setOrigin(0.5);
      this.lobbyNotificationIcon.setDisplaySize(LOBBY_NOTIFICATION_ICON_SIZE, LOBBY_NOTIFICATION_ICON_SIZE);
      this.lobbyNotificationIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      notif.add(this.lobbyNotificationIcon);
    } else if (iconId) {
      this.lobbyNotificationIconFallbackRendered = true;
    }

    notif.add(this.lobbyNotificationText);
    this._writeLobbyNotificationIconQaProbe(iconId, msg);

    this.tweens.add({
      targets: notif, alpha: 1, duration: 300,
      yoyo: true, hold: 2000,
      onComplete: () => notif.destroy(),
    });
  }

  private _resolveLobbyNotificationIconResource(iconId: LobbyNotificationIconId): LobbyNavIconResource | undefined {
    return this._resolveLobbyNavIconResource(LOBBY_NOTIFICATION_ICON_TEXTURES[iconId]);
  }

  private _getLobbyNotificationIconQaMode(): LobbyNotificationIconId | undefined {
    if (isLobbyNotificationIconId(this.characterData?.lobbyNotificationIconQa)) {
      return this.characterData.lobbyNotificationIconQa;
    }
    if (typeof window === 'undefined') return undefined;

    const iconId = new URLSearchParams(window.location.search).get('lobbyNotificationIconQa') ?? undefined;
    return isLobbyNotificationIconId(iconId) ? iconId : undefined;
  }

  private _openLobbyNotificationIconQa(iconId: LobbyNotificationIconId): void {
    this._showNotification(LOBBY_NOTIFICATION_QA_MESSAGES[iconId], iconId);
  }

  private _writeLobbyNotificationIconQaProbe(
    iconId: LobbyNotificationIconId | undefined,
    message: string,
  ): void {
    const qaIconId = this._getLobbyNotificationIconQaMode();
    if (!qaIconId || typeof document === 'undefined' || !document.body) return;

    const notificationIconResource = this._resolveLobbyNotificationIconResource(iconId ?? qaIconId);
    const rendered = this.lobbyNotificationIcon?.active === true;
    const notificationLegacyGlyphPresent = /[🛒🔨📜⚔📖]/u.test(this.lobbyNotificationText?.text ?? message);
    const missingLobbyNotificationIconKeys = rendered ? [] : [notificationIconResource?.key ?? (iconId ?? qaIconId)];

    document.body.dataset.aeternaLobbyNotificationIconQa = JSON.stringify({
      status: rendered && !notificationLegacyGlyphPresent ? 'ready' : 'missing-icon',
      notificationLabel: this.lobbyNotificationText?.text ?? message,
      notificationIcon: {
        iconId: iconId ?? qaIconId,
        expectedCount: LOBBY_NOTIFICATION_ICON_EXPECTED_COUNT,
        renderedCount: rendered ? 1 : 0,
        key: notificationIconResource?.key ?? null,
        path: notificationIconResource?.path ?? null,
        displaySizes: this.lobbyNotificationIcon
          ? [{ width: this.lobbyNotificationIcon.displayWidth, height: this.lobbyNotificationIcon.displayHeight }]
          : [],
        fallbackRendered: this.lobbyNotificationIconFallbackRendered,
      },
      missingLobbyNotificationIconKeys,
      notificationLegacyGlyphPresent,
    });
  }

  // ── 배경 ─────────────────────────────────────────────────

  private _drawTownBackground(w: number, h: number): void {
    // P33-A: 실제 배경 이미지 사용 (fallback: 기존 프로그래매틱 배경)
    if (this.textures.exists('town_bg')) {
      this.add.image(w / 2, h / 2, 'town_bg').setDisplaySize(w, h).setAlpha(0.8);
    }
    if (this.textures.exists('town_bg_mid')) {
      this.add.image(w / 2, h / 2, 'town_bg_mid').setDisplaySize(w, h).setAlpha(0.3);
    }

    // 배경 이미지가 없으면 기존 프로그래매틱 배경
    if (!this.textures.exists('town_bg')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x1a3322, 1);
      gfx.fillRect(0, 0, w, h);
      gfx.lineStyle(1, 0x224433, 0.3);
      const tileSize = 48;
      for (let x = 0; x < w; x += tileSize) gfx.lineBetween(x, 0, x, h);
      for (let y = 0; y < h; y += tileSize) gfx.lineBetween(0, y, w, y);
    }

    // 반투명 오버레이 (UI 가독성)
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a1a12, 0.4);

    const lobbyTitleIconResource = getSpriteResourceForWorldZoneIcon(LOBBY_TITLE_ICON_ZONE_ID);
    const hasLobbyTitleIcon = Boolean(lobbyTitleIconResource && this.textures.exists(lobbyTitleIconResource.key));
    const titleLabel = hasLobbyTitleIcon ? '아에테리아 마을' : '☆ 아에테리아 마을 ☆';

    this.lobbyTitleText = this.add.text(
      hasLobbyTitleIcon ? w / 2 + LOBBY_TITLE_ICON_SIZE / 2 + 6 : w / 2,
      80,
      titleLabel,
      {
      fontSize: '20px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#88cc88',
      },
    ).setOrigin(0.5);

    if (hasLobbyTitleIcon && lobbyTitleIconResource) {
      const iconX = this.lobbyTitleText.x
        - this.lobbyTitleText.displayWidth / 2
        - LOBBY_TITLE_ICON_SIZE / 2
        - 8;
      this.lobbyTitleIcon = this.add.image(iconX, 80, lobbyTitleIconResource.key)
        .setName('lobby_title_zone_icon')
        .setOrigin(0.5);
      this.lobbyTitleIcon.setDisplaySize(LOBBY_TITLE_ICON_SIZE, LOBBY_TITLE_ICON_SIZE);
      this.lobbyTitleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.lobbyTitleIcon = null;
      this.lobbyTitleIconFallbackRendered = true;
    }

    this._writeLobbyTitleIconQaProbe();
  }

  private _isLobbyTitleIconQaRoute(): boolean {
    if (this.characterData?.lobbyTitleIconQa === true) return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lobbyTitleIconQa') === '1';
  }

  private _writeLobbyTitleIconQaProbe(): void {
    if (!this._isLobbyTitleIconQaRoute() || typeof document === 'undefined' || !document.body) return;

    const lobbyTitleIconResource = getSpriteResourceForWorldZoneIcon(LOBBY_TITLE_ICON_ZONE_ID);
    const rendered = this.lobbyTitleIcon?.active === true;
    const titleLabelLegacyGlyphPresent = /[☆★]/u.test(this.lobbyTitleText?.text ?? '');
    const missingLobbyTitleIconKeys = rendered ? [] : [lobbyTitleIconResource?.key ?? LOBBY_TITLE_ICON_ZONE_ID];

    document.body.dataset.aeternaLobbyTitleIconQa = JSON.stringify({
      status: rendered && !titleLabelLegacyGlyphPresent ? 'ready' : 'missing-icon',
      titleLabel: this.lobbyTitleText?.text ?? null,
      titleIcon: {
        iconId: LOBBY_TITLE_ICON_ZONE_ID,
        expectedCount: LOBBY_TITLE_ICON_EXPECTED_COUNT,
        renderedCount: rendered ? 1 : 0,
        key: lobbyTitleIconResource?.key ?? null,
        path: lobbyTitleIconResource?.path ?? null,
        displaySizes: this.lobbyTitleIcon
          ? [{ width: this.lobbyTitleIcon.displayWidth, height: this.lobbyTitleIcon.displayHeight }]
          : [],
        fallbackRendered: this.lobbyTitleIconFallbackRendered,
      },
      missingLobbyTitleIconKeys,
      titleLabelLegacyGlyphPresent,
    });
  }

  private _drawHud(w: number): void {
    const name = this.characterData?.characterName ?? '???';
    const cls = this.characterData?.className ?? '???';
    const lv = this.characterData?.level ?? 1;

    this.add.text(12, 12, `${name} [${cls}] Lv.${lv}`, {
      fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    });

    const goldIconResource = getItemIconResource({ itemIconId: LOBBY_GOLD_ICON_ID });
    const hasGoldIcon = Boolean(goldIconResource && this.textures.exists(goldIconResource.key));

    this.goldText = this.add.text(w - 12, 12, hasGoldIcon ? '--- Gold' : '💰 --- Gold', {
      fontSize: '13px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffcc44',
    }).setOrigin(1, 0);

    if (hasGoldIcon && goldIconResource) {
      this.goldIcon = this.add.image(0, 0, goldIconResource.key)
        .setName('lobby_gold_icon')
        .setOrigin(0.5);
      this.goldIcon.setDisplaySize(18, 18);
      this.goldIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this._updateGoldIconPosition();
    } else {
      this.goldIcon = null;
      this.goldIconFallbackRendered = true;
    }

    // 서버에서 실제 골드 조회
    if (this.characterData?.offlineQa) {
      this._setGoldLabel('999 Gold');
      return;
    }
    this._writeGoldIconQaProbe();
    this._fetchGold();
  }

  private async _fetchGold(): Promise<void> {
    try {
      const res = await networkManager.get('/api/characters');
      const chars = (res as any)?.characters ?? res;
      const char = Array.isArray(chars)
        ? chars.find((c: any) => c.id === this.characterData?.characterId) ?? chars[0]
        : null;
      const gold = char?.gold ?? char?.currency ?? 0;
      this._setGoldLabel(`${gold.toLocaleString()} Gold`);
    } catch {
      this._setGoldLabel('--- Gold');
    }
  }

  private _setGoldLabel(label: string): void {
    if (!this.goldText) return;

    this.goldText.setText(this.goldIcon?.active === true ? label : `💰 ${label}`);
    this._updateGoldIconPosition();
    this._writeGoldIconQaProbe();
  }

  private _updateGoldIconPosition(): void {
    if (!this.goldIcon || !this.goldText) return;

    this.goldIcon.setPosition(this.goldText.x - this.goldText.displayWidth - 12, this.goldText.y + 9);
  }

  private _isGoldIconQaRoute(): boolean {
    if (this.characterData?.goldIconQa === true) return true;
    if (typeof window === 'undefined') return false;

    return new URLSearchParams(window.location.search).get('goldIconQa') === '1';
  }

  private _writeGoldIconQaProbe(): void {
    if (!this._isGoldIconQaRoute() || typeof document === 'undefined' || !document.body) return;

    const goldIconResource = getItemIconResource({ itemIconId: LOBBY_GOLD_ICON_ID });
    const rendered = this.goldIcon?.active === true;
    const legacyGlyphPresent = this.goldText?.text.includes('💰') ?? false;
    const missingGoldIconKeys = rendered ? [] : [goldIconResource?.key ?? LOBBY_GOLD_ICON_ID];

    document.body.dataset.aeternaLobbyGoldIconQa = JSON.stringify({
      status: rendered && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      goldLabel: this.goldText?.text ?? null,
      goldIcon: {
        expectedCount: LOBBY_GOLD_ICON_EXPECTED_COUNT,
        renderedCount: rendered ? 1 : 0,
        key: goldIconResource?.key ?? null,
        path: goldIconResource?.path ?? null,
        displaySizes: this.goldIcon
          ? [{ width: this.goldIcon.displayWidth, height: this.goldIcon.displayHeight }]
          : [],
        fallbackRendered: this.goldIconFallbackRendered,
      },
      legacyGlyphPresent,
      missingGoldIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  // ── NPC ──────────────────────────────────────────────────

  private _spawnNpcs(): void {
    for (const npc of TOWN_NPCS) {
      const container = this.add.container(npc.x, npc.y);

      // P33-A: 실제 NPC 스프라이트 사용 (fallback: 원형 도형)
      const spriteResource = getSpriteResourceForLobbyNpc(npc.id);
      const npcTexKey = spriteResource?.key ?? `npc_${npc.id}`;
      let body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (this.textures.exists(npcTexKey)) {
        body = this.add.image(0, 0, npcTexKey, 0)
          .setScale(spriteResource ? 1 : 0.15)
          .setInteractive({ useHandCursor: true });
        if (spriteResource) {
          body.setFrame(0);
          body.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        }
      } else {
        body = this.add.circle(0, 0, 20, npc.color)
          .setInteractive({ useHandCursor: true });
      }
      const label = this.add.text(0, -32, npc.name, {
        fontSize: '12px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      const roleTag = this.add.text(0, 28, npc.role, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5);

      container.add([body, label, roleTag]);
      this.npcSprites.push(container);

      body.on('pointerdown', () => {
        if (this.dialoguePanel || isUiModalOpen()) return; // 모달 떠 있으면 NPC 대화 중복 개방 차단
        playSfx(this, UI_SFX.CLICK);
        this._openNpcDialogue(npc);
      });
      const baseScaleX = body.scaleX;
      const baseScaleY = body.scaleY;
      body.on('pointerover', () => {
        body.setScale(baseScaleX * 1.15, baseScaleY * 1.15);
        playSfx(this, UI_SFX.HOVER);
        // FINDING-A4 ext7: pointer hover ↔ NPC 키보드 highlight 동기화
        const idx = TOWN_NPCS.findIndex(n => n.id === npc.id);
        if (idx >= 0) {
          this.focusGroup = 'npc';
          this._setNpcIndex(idx);
        }
      });
      body.on('pointerout', () => body.setScale(baseScaleX, baseScaleY));
    }
  }

  // FINDING-A4 ext8 helper: 모든 모달 패널이 ESC 로 닫히도록 dialoguePanel 추적 통일
  // panel.destroy() 만 호출하면 자동 null 처리 → onEsc 가 패널 닫기로 동작
  private _registerModalPanel(panel: Phaser.GameObjects.Container): void {
    this.dialoguePanel = panel;
    panel.on('destroy', () => {
      if (this.dialoguePanel === panel) this.dialoguePanel = null;
    });
  }

  // 인라인 모달 패널용 키보드 nav 공통 헬퍼 — 검증된 대화 패널 패턴(▶highlight + 방향키 + ENTER)을
  // 일반화한다. focusables 를 위→아래 순서로 UP/DOWN 이동, ENTER/SPACE 로 activate.
  // 모달 열림 동안 글로벌 로비 nav 는 dialoguePanel 가드로 이미 양보하므로 충돌하지 않으며
  // (ESC 닫기도 글로벌 onEsc 가 담당), 패널 destroy 시 키 핸들러를 자동 정리한다.
  // 오펀 KeyboardFocusRing 클래스(InventoryUI/ShopUI 등)를 되살리는 대신, 실제 도달 가능한
  // 인라인 패널에 직접 키보드를 입히는 경로(회귀 위험 최소).
  private _attachPanelKeyboardNav(
    panel: Phaser.GameObjects.Container,
    focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }>,
  ): void {
    if (focusables.length === 0) return;
    let idx = 0;
    const sync = () => focusables.forEach((f, i) => f.setFocused(i === idx));
    sync();
    // 상위 uiModal(스킬트리 등 KeyboardFocusRing)이 떠 있으면 하위 인라인 패널 키 입력을 양보 — 이중발화 방지.
    const move = (delta: number) => {
      if (isUiModalOpen()) return;
      idx = (idx + delta + focusables.length) % focusables.length;
      sync();
    };
    const onPrev = () => move(-1);
    const onNext = () => move(1);
    const onActivate = () => { if (isUiModalOpen()) return; focusables[idx]?.activate(); };
    // 세로 리스트(상점·인벤토리)·가로 버튼 쌍(파티·스토리) 모두 자연스럽게 — 4방향 화살표 모두 이동에 바인딩.
    this.input.keyboard?.on('keydown-UP', onPrev);
    this.input.keyboard?.on('keydown-LEFT', onPrev);
    this.input.keyboard?.on('keydown-DOWN', onNext);
    this.input.keyboard?.on('keydown-RIGHT', onNext);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    panel.on('destroy', () => {
      this.input.keyboard?.off('keydown-UP', onPrev);
      this.input.keyboard?.off('keydown-LEFT', onPrev);
      this.input.keyboard?.off('keydown-DOWN', onNext);
      this.input.keyboard?.off('keydown-RIGHT', onNext);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
    });
  }

  // FINDING-A4 ext7: NPC 키보드 highlight ring 동기화
  private _setNpcIndex(i: number): void {
    if (TOWN_NPCS[i] === undefined) return;
    this.npcIndex = i;
    const npc = TOWN_NPCS[i];
    if (!this.npcHighlightRing) {
      this.npcHighlightRing = this.add.circle(npc.x, npc.y, 32)
        .setStrokeStyle(3, 0xc8a2ff)
        .setFillStyle(0x000000, 0)
        .setDepth(50);
    } else {
      this.npcHighlightRing.setPosition(npc.x, npc.y);
      this.npcHighlightRing.setVisible(true);
    }
  }

  private _openNpcDialogue(npc: NpcEntry): void {
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);

    this._addLobbyModalFrame(panel, 0, 0, 420, 200, LOBBY_UI_FRAME_TEXTURES.dialoguePanel, 0x000000, 0.9, 0x446644, 1);

    this._addLobbyNpcPortrait(panel, npc, -160, 0, 96);

    this.lobbyDialogueTitleIconFallbackRendered = false;
    const dialogueTitleIconResource = LOBBY_NPC_PORTRAIT_TEXTURES[npc.id];
    const hasDialogueTitleIcon = Boolean(dialogueTitleIconResource && this.textures.exists(dialogueTitleIconResource.key));
    if (hasDialogueTitleIcon && dialogueTitleIconResource) {
      this.lobbyDialogueTitleIcon = this._addLobbyDialogueTitleIcon(panel, -58, -70, dialogueTitleIconResource);
    } else {
      this.lobbyDialogueTitleIcon = null;
      this.lobbyDialogueTitleIconFallbackRendered = true;
    }
    const titleText = hasDialogueTitleIcon ? npc.name : `💬 ${npc.name}`;
    this.lobbyDialogueTitleText = this.add.text(hasDialogueTitleIcon ? 12 : 0, -70, titleText, {
      fontSize: '16px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyDialogueTitleText);
    this._writeDialogueTitleIconQaProbe({ npc, titleText });
    panel.once('destroy', () => {
      this.lobbyDialogueTitleIcon = null;
      this.lobbyDialogueTitleText = null;
      this.lobbyDialogueChoiceButtonFrames = [];
      this.lobbyDialogueChoiceFocusIcon = null;
      this.lobbyDialogueChoiceTexts = [];
    });

    panel.add(this.add.text(0, -20, `"어서 와, 모험가. 내 ${npc.role} 서비스가 필요한가?"`, {
      fontSize: '13px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      wordWrap: { width: 380 }, align: 'center',
    }).setOrigin(0.5));

    this.lobbyDialogueChoiceButtonFrames = [];
    this.lobbyDialogueChoiceButtonFrameFallbackRendered = false;
    const choiceButtonFrameResource = LOBBY_UI_FRAME_TEXTURES.dialogueChoiceButton;
    if (this.textures.exists(choiceButtonFrameResource.key)) {
      this.lobbyDialogueChoiceButtonFrames.push(
        this._addLobbyDialogueChoiceButtonFrame(panel, -60, 50, 108, 34, choiceButtonFrameResource),
        this._addLobbyDialogueChoiceButtonFrame(panel, 60, 50, 108, 34, choiceButtonFrameResource),
      );
    } else {
      this.lobbyDialogueChoiceButtonFrameFallbackRendered = true;
    }
    this._writeDialogueChoiceButtonFrameQaProbe();

    const acceptBtn = this.add.text(-60, 50, '[ 이용하기 ]', {
      fontSize: '14px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(acceptBtn);

    const closeBtn = this.add.text(60, 50, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(closeBtn);

    this.lobbyDialogueChoiceTexts = [acceptBtn, closeBtn];
    this.lobbyDialogueChoiceFocusIconFallbackRendered = false;
    const dialogueChoiceFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID);
    if (dialogueChoiceFocusIconResource && this.textures.exists(dialogueChoiceFocusIconResource.key)) {
      this.lobbyDialogueChoiceFocusIcon = this._addLobbyDialogueChoiceFocusIcon(
        panel,
        -108,
        50,
        dialogueChoiceFocusIconResource,
      );
    } else {
      this.lobbyDialogueChoiceFocusIcon = null;
      this.lobbyDialogueChoiceFocusIconFallbackRendered = true;
    }

    // FINDING-A4 ext8: 다이얼로그 패널 키보드 nav (WCAG 2.1.1)
    // 0 = 이용하기 / 1 = 닫기. 첫 highlight = 이용하기(default action)
    let dialogueIndex = 0;
    const renderDialogueChoice = () => {
      this._renderDialogueChoiceFocus({ dialogueIndex, acceptBtn, closeBtn });
    };
    renderDialogueChoice();
    this._writeDialogueChoiceFocusIconQaProbe();

    const doAccept = () => {
      playSfx(this, UI_SFX.CONFIRM);
      panel.destroy(); // _registerModalPanel destroy hook 가 dialoguePanel = null 자동 처리
      this._executeNpcAction(npc);
    };
    const doClose = () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy(); // 동일 — register hook 자동 처리
    };

    acceptBtn.on('pointerover', () => { dialogueIndex = 0; renderDialogueChoice(); });
    acceptBtn.on('pointerdown', doAccept);
    closeBtn.on('pointerover', () => { dialogueIndex = 1; renderDialogueChoice(); });
    closeBtn.on('pointerdown', doClose);
    this.lobbyDialogueChoiceButtonFrames[0]?.on('pointerover', () => { dialogueIndex = 0; renderDialogueChoice(); });
    this.lobbyDialogueChoiceButtonFrames[0]?.on('pointerdown', doAccept);
    this.lobbyDialogueChoiceButtonFrames[1]?.on('pointerover', () => { dialogueIndex = 1; renderDialogueChoice(); });
    this.lobbyDialogueChoiceButtonFrames[1]?.on('pointerdown', doClose);

    // 상위 uiModal 떠 있으면 양보(심층 방어 — 마우스 진입 가드와 상호 보완).
    const onDialogLeft = () => { if (isUiModalOpen()) return; dialogueIndex = 0; renderDialogueChoice(); };
    const onDialogRight = () => { if (isUiModalOpen()) return; dialogueIndex = 1; renderDialogueChoice(); };
    const onDialogActivate = () => { if (isUiModalOpen()) return; dialogueIndex === 0 ? doAccept() : doClose(); };

    this.input.keyboard?.on('keydown-LEFT', onDialogLeft);
    this.input.keyboard?.on('keydown-RIGHT', onDialogRight);
    this.input.keyboard?.on('keydown-ENTER', onDialogActivate);
    this.input.keyboard?.on('keydown-SPACE', onDialogActivate);

    panel.on('destroy', () => {
      this.input.keyboard?.off('keydown-LEFT', onDialogLeft);
      this.input.keyboard?.off('keydown-RIGHT', onDialogRight);
      this.input.keyboard?.off('keydown-ENTER', onDialogActivate);
      this.input.keyboard?.off('keydown-SPACE', onDialogActivate);
    });

    // P34-A: NPC 인사 보이스
    const voiceKey = NPC_VOICE[npc.id];
    if (voiceKey) playSfx(this, voiceKey, 0.7);

    playSfx(this, UI_SFX.OPEN);

    // FINDING-A4 ext20: _registerModalPanel 패턴 통일 (다른 5 모달과 일관)
    // 기존 doAccept/doClose 의 panel.destroy() → register hook 으로 자동 dialoguePanel null
    this._registerModalPanel(panel);
  }

  private _addLobbyDialogueTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNpcPortraitTexture,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_dialogue_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _addLobbyDialogueChoiceButtonFrame(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    resource: typeof LOBBY_UI_FRAME_TEXTURES.dialogueChoiceButton,
  ): Phaser.GameObjects.Image {
    const frame = this.add.image(x, y, resource.key)
      .setName('lobby_dialogue_choice_button_frame')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    frame.setDisplaySize(width, height);
    frame.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(frame);
    return frame;
  }

  private _renderDialogueChoiceFocus({
    dialogueIndex,
    acceptBtn,
    closeBtn,
  }: {
    dialogueIndex: number;
    acceptBtn: Phaser.GameObjects.Text;
    closeBtn: Phaser.GameObjects.Text;
  }): void {
    const hasFocusIcon = this.lobbyDialogueChoiceFocusIcon?.active === true;
    if (hasFocusIcon && this.lobbyDialogueChoiceFocusIcon) {
      acceptBtn.setText('[ 이용하기 ]');
      acceptBtn.setColor(dialogueIndex === 0 ? '#ffffff' : '#88ff88');
      closeBtn.setText('[ 닫기 ]');
      closeBtn.setColor(dialogueIndex === 1 ? '#ffffff' : '#888888');
      this.lobbyDialogueChoiceFocusIcon
        .setVisible(true)
        .setPosition(dialogueIndex === 0 ? -108 : 16, 50);
      this._writeDialogueChoiceFocusIconQaProbe();
      return;
    }

    const focusPrefix = '▶ ';
    acceptBtn.setText(dialogueIndex === 0 ? `${focusPrefix}[ 이용하기 ]` : '   [ 이용하기 ]');
    acceptBtn.setColor(dialogueIndex === 0 ? '#ffffff' : '#88ff88');
    closeBtn.setText(dialogueIndex === 1 ? `${focusPrefix}[ 닫기 ]` : '   [ 닫기 ]');
    closeBtn.setColor(dialogueIndex === 1 ? '#ffffff' : '#888888');
    this._writeDialogueChoiceFocusIconQaProbe();
  }

  private _addLobbyDialogueChoiceFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_dialogue_choice_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  // ── NPC 액션 실행 ────────────────────────────────────────

  private _executeNpcAction(npc: NpcEntry): void {
    switch (npc.id) {
      case 'merchant':
        this._showNotification(`${npc.name}: 상점을 열었습니다. (아이템 ${80}종 판매 중)`, 'shop');
        // P38: 인라인 ShopPanel — 소비 상점 API(gold) 연동(async)
        void this._showShopPanel(npc);
        break;
      case 'blacksmith':
        this._showNotification(`${npc.name}: 장비 강화 서비스를 준비합니다.`, 'enhance');
        this._showEnhancePanel(npc);
        break;
      case 'quest_board':
        this._showNotification(`${npc.name}: 의뢰 게시판을 엽니다.`, 'quest');
        this._showQuests();
        break;
      case 'party_recruit':
        this._showNotification(`${npc.name}: 파티원을 모집합니다.`, 'party');
        this._showPartyPanel(npc);
        break;
      case 'elder':
        this._showNotification(`${npc.name}: 메인 스토리를 진행합니다.`, 'story');
        this._showStoryPanel(npc);
        break;
      default:
        this._showNotification(`${npc.name}과(와) 대화를 마쳤습니다.`);
    }
  }

  private async _showShopPanel(npc: NpcEntry): Promise<void> {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    this._addLobbyModalFrame(panel, 0, 0, 500, 350, LOBBY_UI_FRAME_TEXTURES.shopPanel, 0x0a0a1a, 0.95, 0x44cc88);
    this.lobbyShopTitleIconFallbackRendered = false;
    const shopTitleIconResource = getItemIconResource({ itemIconId: LOBBY_SHOP_TITLE_ICON_ID });
    const hasShopTitleIcon = Boolean(shopTitleIconResource && this.textures.exists(shopTitleIconResource.key));
    if (hasShopTitleIcon && shopTitleIconResource) {
      this.lobbyShopTitleIcon = this._addLobbyShopTitleIcon(panel, -136, -150, shopTitleIconResource);
    } else {
      this.lobbyShopTitleIcon = null;
      this.lobbyShopTitleIconFallbackRendered = true;
    }
    const titleText = hasShopTitleIcon ? `${npc.name} — 아이템 상점` : `🛒 ${npc.name} — 아이템 상점`;
    this.lobbyShopTitleText = this.add.text(hasShopTitleIcon ? 12 : 0, -150, titleText, {
      fontSize: '18px', color: '#44cc88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyShopTitleText);
    this._writeShopTitleIconQaProbe({ titleText });
    panel.once('destroy', () => {
      this.lobbyShopTitleIcon = null;
      this.lobbyShopTitleText = null;
      this.lobbyShopActionFocusIcon = null;
      this.lobbyShopActionFocusTexts = [];
    });

    // 서버 소비 상점(gold 아이템) 목록 fetch. 오프라인/실패 시 fallback 으로 렌더는 유지.
    let shopItems: ShopRow[];
    if (this.characterData?.offlineQa) {
      shopItems = FALLBACK_SHOP_ITEMS;
    } else {
      try {
        const level = this.characterData?.level ?? 1;
        const resp = await networkManager.get<{ items?: ShopRow[] }>(`/api/shop/consumables?characterLevel=${level}`);
        const items = (resp?.items ?? []).slice(0, 8);
        shopItems = items.length > 0 ? items : FALLBACK_SHOP_ITEMS;
      } catch {
        shopItems = FALLBACK_SHOP_ITEMS;
      }
    }

    // 마우스(pointerdown)와 키보드(ENTER)가 공유하는 구매 동작 (gold 차감 + 인벤토리 지급).
    const buy = async (item: ShopRow): Promise<void> => {
      try {
        const resp = await networkManager.post<{ gold?: number }>('/api/shop/buy', {
          itemCode: item.code,
          characterId: this.characterData?.characterId,
          quantity: 1,
        });
        playSfx(this, UI_SFX.GOLD_GAIN);
        this._showNotification(`${item.name} 구매 완료!${typeof resp?.gold === 'number' ? ` (남은 골드 ${resp.gold}G)` : ''}`);
        this._fetchGold(); // 골드 HUD 갱신
      } catch (err: any) {
        const msg = err?.message ?? '구매 실패';
        if (msg.includes('골드')) this._showNotification('골드가 부족합니다!');
        else this._showNotification(`구매 실패: ${msg}`);
        playSfx(this, UI_SFX.CLICK);
      }
    };

    // 키보드 포커스 링: [구매]×5 + [닫기]
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];
    const buyButtons: Phaser.GameObjects.Text[] = [];

    shopItems.forEach((item, i) => {
      const y = -80 + i * 40;
      this._addLobbyItemIcon(panel, -214, y + 8, item, 28);
      panel.add(this.add.text(-176, y, item.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(100, y, `${item.price}G`, {
        fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      const buyBtn = this.add.text(180, y, '[구매]', {
        fontSize: '12px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => void buy(item));
      panel.add(buyBtn);
      const buyIndex = buyButtons.length;
      buyButtons.push(buyBtn);
      buyBtn.on('pointerover', () => {
        shopActionIndex = buyIndex;
        renderShopActionFocus();
      });
      focusables.push({
        setFocused: (active) => {
          if (!active) return;
          shopActionIndex = buyIndex;
          renderShopActionFocus();
        },
        activate: () => void buy(item),
      });
    });

    const closeBtn = this.add.text(0, 140, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
    closeBtn.on('pointerover', () => {
      shopActionIndex = buyButtons.length;
      renderShopActionFocus();
    });
    focusables.push({
      setFocused: (active) => {
        if (!active) return;
        shopActionIndex = buyButtons.length;
        renderShopActionFocus();
      },
      activate: () => panel.destroy(),
    });

    this.lobbyShopActionFocusTexts = [...buyButtons, closeBtn];
    this.lobbyShopActionFocusIconFallbackRendered = false;
    const shopActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_SHOP_ACTION_FOCUS_ICON_ID);
    if (shopActionFocusIconResource && this.textures.exists(shopActionFocusIconResource.key)) {
      this.lobbyShopActionFocusIcon = this._addLobbyShopActionFocusIcon(
        panel,
        162,
        -73,
        shopActionFocusIconResource,
      );
    } else {
      this.lobbyShopActionFocusIcon = null;
      this.lobbyShopActionFocusIconFallbackRendered = true;
    }

    let shopActionIndex = 0;
    const renderShopActionFocus = () => {
      this._renderLobbyShopActionFocus({ activeIndex: shopActionIndex, buyButtons, closeBtn });
    };
    this._attachPanelKeyboardNav(panel, focusables);
  }

  private _addLobbyShopTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_shop_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _renderLobbyShopActionFocus({
    activeIndex,
    buyButtons,
    closeBtn,
  }: {
    activeIndex: number;
    buyButtons: Phaser.GameObjects.Text[];
    closeBtn: Phaser.GameObjects.Text;
  }): void {
    const hasFocusIcon = this.lobbyShopActionFocusIcon?.active === true;
    const closeIndex = buyButtons.length;

    buyButtons.forEach((buyBtn, index) => {
      const isActive = activeIndex === index;
      buyBtn
        .setText(hasFocusIcon ? '[구매]' : (isActive ? '▶[구매]' : '[구매]'))
        .setColor(isActive ? '#ffffff' : '#88ff88');
    });

    const isCloseActive = activeIndex === closeIndex;
    closeBtn
      .setText(hasFocusIcon ? '[ 닫기 ]' : (isCloseActive ? '▶ [ 닫기 ]' : '[ 닫기 ]'))
      .setColor(isCloseActive ? '#ffffff' : '#888888');

    if (hasFocusIcon && this.lobbyShopActionFocusIcon) {
      const activeBuyBtn = activeIndex < buyButtons.length ? buyButtons[activeIndex] : null;
      const position = activeBuyBtn
        ? { x: activeBuyBtn.x - 18, y: activeBuyBtn.y + 7 }
        : { x: -50, y: closeBtn.y };
      this.lobbyShopActionFocusIcon
        .setVisible(true)
        .setPosition(position.x, position.y);
    }

    this._writeShopActionFocusIconQaProbe(activeIndex);
  }

  private _addLobbyShopActionFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_shop_action_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  private _showEnhancePanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    this._addLobbyModalFrame(panel, 0, 0, 450, 250, LOBBY_UI_FRAME_TEXTURES.enhancePanel, 0x0a0a1a, 0.95, 0xff8844);
    this.lobbyEnhanceTitleIconFallbackRendered = false;
    const enhanceTitleIconResource = getItemIconResource({ itemIconId: LOBBY_ENHANCE_TITLE_ICON_ID });
    const hasEnhanceTitleIcon = Boolean(enhanceTitleIconResource && this.textures.exists(enhanceTitleIconResource.key));
    if (hasEnhanceTitleIcon && enhanceTitleIconResource) {
      this.lobbyEnhanceTitleIcon = this._addLobbyEnhanceTitleIcon(panel, -132, -90, enhanceTitleIconResource);
    } else {
      this.lobbyEnhanceTitleIcon = null;
      this.lobbyEnhanceTitleIconFallbackRendered = true;
    }
    const titleText = hasEnhanceTitleIcon ? `${npc.name} — 장비 강화` : `🔨 ${npc.name} — 장비 강화`;
    this.lobbyEnhanceTitleText = this.add.text(hasEnhanceTitleIcon ? 12 : 0, -90, titleText, {
      fontSize: '18px', color: '#ff8844', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyEnhanceTitleText);
    this._writeEnhanceTitleIconQaProbe({ titleText });
    panel.once('destroy', () => {
      this.lobbyEnhanceTitleIcon = null;
      this.lobbyEnhanceTitleText = null;
      this.lobbyEnhanceActionFocusIcon = null;
      this.lobbyEnhanceActionFocusTexts = [];
    });
    panel.add(this.add.text(0, -30, '"장비를 가져오면 강화해주지.\n강화 재료와 골드가 필요하다."', {
      fontSize: '13px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      align: 'center',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 30, '장비를 선택하세요 (인벤토리에서 장비 보유 필요)', {
      fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));
    const closeBtn = this.add.text(0, 90, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
    this.lobbyEnhanceActionFocusTexts = [closeBtn];
    this.lobbyEnhanceActionFocusIconFallbackRendered = false;
    const enhanceActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID);
    if (enhanceActionFocusIconResource && this.textures.exists(enhanceActionFocusIconResource.key)) {
      this.lobbyEnhanceActionFocusIcon = this._addLobbyEnhanceActionFocusIcon(
        panel,
        -50,
        90,
        enhanceActionFocusIconResource,
      );
    } else {
      this.lobbyEnhanceActionFocusIcon = null;
      this.lobbyEnhanceActionFocusIconFallbackRendered = true;
    }
    const renderEnhanceActionFocus = () => {
      this._renderLobbyEnhanceActionFocus({ activeIndex: 0, closeBtn });
    };
    closeBtn.on('pointerover', renderEnhanceActionFocus);
    this._attachPanelKeyboardNav(panel, [{
      setFocused: (active) => {
        if (!active) return;
        renderEnhanceActionFocus();
      },
      activate: () => panel.destroy(),
    }]);
  }

  private _renderLobbyEnhanceActionFocus({
    activeIndex,
    closeBtn,
  }: {
    activeIndex: number;
    closeBtn: Phaser.GameObjects.Text;
  }): void {
    const hasFocusIcon = this.lobbyEnhanceActionFocusIcon?.active === true;
    closeBtn
      .setText(hasFocusIcon ? '[ 닫기 ]' : '▶ [ 닫기 ]')
      .setColor('#ffffff');

    if (hasFocusIcon && this.lobbyEnhanceActionFocusIcon) {
      this.lobbyEnhanceActionFocusIcon
        .setVisible(true)
        .setPosition(-50, 90);
    }

    this._writeEnhanceActionFocusIconQaProbe(activeIndex);
  }

  private _addLobbyEnhanceActionFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_enhance_action_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  private _addLobbyEnhanceTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_enhance_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _showPartyPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    this._addLobbyModalFrame(panel, 0, 0, 450, 250, LOBBY_UI_FRAME_TEXTURES.partyPanel, 0x0a0a1a, 0.95, 0x4488ff);
    this.lobbyPartyRecruitTitleIconFallbackRendered = false;
    const partyTitleIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_RECRUIT_TITLE_ICON_ID);
    const hasPartyTitleIcon = Boolean(partyTitleIconResource && this.textures.exists(partyTitleIconResource.key));
    if (hasPartyTitleIcon && partyTitleIconResource) {
      this.lobbyPartyRecruitTitleIcon = this._addLobbyPartyRecruitTitleIcon(panel, -120, -90, partyTitleIconResource);
    } else {
      this.lobbyPartyRecruitTitleIcon = null;
      this.lobbyPartyRecruitTitleIconFallbackRendered = true;
    }
    const titleText = hasPartyTitleIcon ? `${npc.name} — 파티 모집` : `⚔️ ${npc.name} — 파티 모집`;
    this.lobbyPartyRecruitTitleText = this.add.text(hasPartyTitleIcon ? 12 : 0, -90, titleText, {
      fontSize: '18px', color: '#4488ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyPartyRecruitTitleText);
    this._writePartyRecruitIconQaProbe({ titleText });
    panel.once('destroy', () => {
      this.lobbyPartyRecruitTitleIcon = null;
      this.lobbyPartyRecruitTitleText = null;
      this.lobbyPartyActionFocusIcon = null;
      this.lobbyPartyActionFocusTexts = [];
    });
    panel.add(this.add.text(0, -20, '"파티원을 모집하거나 참여할 수 있다.\n함께라면 더 강한 적도 쓰러뜨릴 수 있지."', {
      fontSize: '13px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      align: 'center',
    }).setOrigin(0.5));
    const doCreate = () => { panel.destroy(); this._showNotification('파티를 생성했습니다!'); };
    const createBtn = this.add.text(-80, 50, '[ 파티 생성 ]', {
      fontSize: '13px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    createBtn.on('pointerdown', doCreate);
    panel.add(createBtn);
    const doSearch = () => { panel.destroy(); this._showNotification('현재 모집 중인 파티가 없습니다.'); };
    const searchBtn = this.add.text(80, 50, '[ 파티 검색 ]', {
      fontSize: '13px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    searchBtn.on('pointerdown', doSearch);
    panel.add(searchBtn);
    const closeBtn = this.add.text(0, 90, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const doClose = () => panel.destroy();
    closeBtn.on('pointerdown', doClose);
    panel.add(closeBtn);

    this.lobbyPartyActionFocusTexts = [createBtn, searchBtn, closeBtn];
    this.lobbyPartyActionFocusIconFallbackRendered = false;
    const partyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_ACTION_FOCUS_ICON_ID);
    if (partyActionFocusIconResource && this.textures.exists(partyActionFocusIconResource.key)) {
      this.lobbyPartyActionFocusIcon = this._addLobbyPartyActionFocusIcon(
        panel,
        -142,
        50,
        partyActionFocusIconResource,
      );
    } else {
      this.lobbyPartyActionFocusIcon = null;
      this.lobbyPartyActionFocusIconFallbackRendered = true;
    }

    let partyActionIndex = 0;
    const renderPartyActionFocus = () => {
      this._renderLobbyPartyActionFocus({ activeIndex: partyActionIndex, createBtn, searchBtn, closeBtn });
    };
    createBtn.on('pointerover', () => { partyActionIndex = 0; renderPartyActionFocus(); });
    searchBtn.on('pointerover', () => { partyActionIndex = 1; renderPartyActionFocus(); });
    closeBtn.on('pointerover', () => { partyActionIndex = 2; renderPartyActionFocus(); });
    this._attachPanelKeyboardNav(panel, [
      { setFocused: (active) => { if (!active) return; partyActionIndex = 0; renderPartyActionFocus(); }, activate: doCreate },
      { setFocused: (active) => { if (!active) return; partyActionIndex = 1; renderPartyActionFocus(); }, activate: doSearch },
      { setFocused: (active) => { if (!active) return; partyActionIndex = 2; renderPartyActionFocus(); }, activate: doClose },
    ]);
  }

  private _addLobbyPartyRecruitTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_party_recruit_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _renderLobbyPartyActionFocus({
    activeIndex,
    createBtn,
    searchBtn,
    closeBtn,
  }: {
    activeIndex: number;
    createBtn: Phaser.GameObjects.Text;
    searchBtn: Phaser.GameObjects.Text;
    closeBtn: Phaser.GameObjects.Text;
  }): void {
    const hasFocusIcon = this.lobbyPartyActionFocusIcon?.active === true;
    const isCreateActive = activeIndex === 0;
    const isSearchActive = activeIndex === 1;
    const isCloseActive = activeIndex === 2;

    createBtn
      .setText(hasFocusIcon ? '[ 파티 생성 ]' : (isCreateActive ? '▶ [ 파티 생성 ]' : '[ 파티 생성 ]'))
      .setColor(isCreateActive ? '#ffffff' : '#88ff88');
    searchBtn
      .setText(hasFocusIcon ? '[ 파티 검색 ]' : (isSearchActive ? '▶ [ 파티 검색 ]' : '[ 파티 검색 ]'))
      .setColor(isSearchActive ? '#ffffff' : '#88ccff');
    closeBtn
      .setText(hasFocusIcon ? '[ 닫기 ]' : (isCloseActive ? '▶ [ 닫기 ]' : '[ 닫기 ]'))
      .setColor(isCloseActive ? '#ffffff' : '#888888');

    if (hasFocusIcon && this.lobbyPartyActionFocusIcon) {
      const iconPositions = [
        { x: -142, y: 50 },
        { x: 18, y: 50 },
        { x: -50, y: 90 },
      ];
      const position = iconPositions[activeIndex] ?? iconPositions[0];
      this.lobbyPartyActionFocusIcon
        .setVisible(true)
        .setPosition(position.x, position.y);
    }

    this._writePartyActionFocusIconQaProbe(activeIndex);
  }

  private _addLobbyPartyActionFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_party_action_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  private _showStoryPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    this._addLobbyModalFrame(panel, 0, 0, 500, 300, LOBBY_UI_FRAME_TEXTURES.storyPanel, 0x0a0a1a, 0.95, 0xcc88ff);

    this._addLobbyNpcPortrait(panel, npc, -200, -30, 112);

    this.lobbyStoryTitleIconFallbackRendered = false;
    const storyTitleIconResource = getItemIconResource({ itemIconId: LOBBY_STORY_TITLE_ICON_ID });
    const hasStoryTitleIcon = Boolean(storyTitleIconResource && this.textures.exists(storyTitleIconResource.key));
    if (hasStoryTitleIcon && storyTitleIconResource) {
      this.lobbyStoryTitleIcon = this._addLobbyStoryTitleIcon(panel, -128, -120, storyTitleIconResource);
    } else {
      this.lobbyStoryTitleIcon = null;
      this.lobbyStoryTitleIconFallbackRendered = true;
    }
    const titleText = hasStoryTitleIcon ? `${npc.name} — 메인 스토리` : `📖 ${npc.name} — 메인 스토리`;
    this.lobbyStoryTitleText = this.add.text(hasStoryTitleIcon ? 12 : 0, -120, titleText, {
      fontSize: '18px', color: '#cc88ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyStoryTitleText);
    this._writeStoryTitleIconQaProbe({ titleText });
    panel.once('destroy', () => {
      this.lobbyStoryTitleIcon = null;
      this.lobbyStoryTitleText = null;
      this.lobbyStoryActionFocusIcon = null;
      this.lobbyStoryActionFocusTexts = [];
    });
    panel.add(this.add.text(20, -50, '"대망각이 세계를 덮친 지 212년...\n에리언이여, 기억의 파편을 찾아야 한다.\n에레보스의 폐허에서 첫 번째 단서가 기다리고 있다."', {
      fontSize: '12px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      align: 'center', wordWrap: { width: 440 },
    }).setOrigin(0.5));
    const doStart = () => {
      panel.destroy();
      this.scene.start('WorldScene', this.characterData);
    };
    const startBtn = this.add.text(-80, 80, '[ 챕터 1 시작 ]', {
      fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', doStart);
    panel.add(startBtn);
    const closeBtn = this.add.text(80, 80, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);

    this.lobbyStoryActionFocusTexts = [startBtn, closeBtn];
    this.lobbyStoryActionFocusIconFallbackRendered = false;
    const storyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_STORY_ACTION_FOCUS_ICON_ID);
    if (storyActionFocusIconResource && this.textures.exists(storyActionFocusIconResource.key)) {
      this.lobbyStoryActionFocusIcon = this._addLobbyStoryActionFocusIcon(
        panel,
        -142,
        80,
        storyActionFocusIconResource,
      );
    } else {
      this.lobbyStoryActionFocusIcon = null;
      this.lobbyStoryActionFocusIconFallbackRendered = true;
    }

    let storyActionIndex = 0;
    const renderStoryActionFocus = () => {
      this._renderLobbyStoryActionFocus({ activeIndex: storyActionIndex, startBtn, closeBtn });
    };
    startBtn.on('pointerover', () => { storyActionIndex = 0; renderStoryActionFocus(); });
    closeBtn.on('pointerover', () => { storyActionIndex = 1; renderStoryActionFocus(); });
    this._attachPanelKeyboardNav(panel, [
      { setFocused: (active) => { if (!active) return; storyActionIndex = 0; renderStoryActionFocus(); }, activate: doStart },
      { setFocused: (active) => { if (!active) return; storyActionIndex = 1; renderStoryActionFocus(); }, activate: () => panel.destroy() },
    ]);
  }

  private _addLobbyStoryTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_story_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _renderLobbyStoryActionFocus({
    activeIndex,
    startBtn,
    closeBtn,
  }: {
    activeIndex: number;
    startBtn: Phaser.GameObjects.Text;
    closeBtn: Phaser.GameObjects.Text;
  }): void {
    const isStartActive = activeIndex === 0;
    const hasFocusIcon = this.lobbyStoryActionFocusIcon?.active === true;

    startBtn
      .setText(hasFocusIcon ? '[ 챕터 1 시작 ]' : (isStartActive ? '▶ [ 챕터 1 시작 ]' : '[ 챕터 1 시작 ]'))
      .setColor(isStartActive ? '#ffffff' : '#ffcc44');
    closeBtn
      .setText(hasFocusIcon ? '[ 닫기 ]' : (!isStartActive ? '▶ [ 닫기 ]' : '[ 닫기 ]'))
      .setColor(!isStartActive ? '#ffffff' : '#888888');

    if (hasFocusIcon && this.lobbyStoryActionFocusIcon) {
      this.lobbyStoryActionFocusIcon
        .setVisible(true)
        .setPosition(isStartActive ? -142 : 38, 80);
    }

    this._writeStoryActionFocusIconQaProbe(activeIndex);
  }

  private _addLobbyStoryActionFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_story_action_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  // ── 하단 네비게이션 ──────────────────────────────────────

  private _drawNavButtons(w: number, h: number): void {
    const btnY = h - 40;
    // 5개 균등 배치 (i+1)/6
    const buttons = [
      { id: 'world', label: '월드맵', fallbackLabel: '🗺️ 월드맵', icon: LOBBY_NAV_ICON_TEXTURES.world, x: w / 6, action: () => this.scene.start('WorldScene', this.characterData) },
      { id: 'dungeon', label: '던전', fallbackLabel: '⚔️ 던전', icon: LOBBY_NAV_ICON_TEXTURES.dungeon, x: (w * 2) / 6, action: () => this.scene.start('DungeonScene', this.characterData) },
      { id: 'inventory', label: '인벤토리', fallbackLabel: '🎒 인벤토리', icon: LOBBY_NAV_ICON_TEXTURES.inventory, x: (w * 3) / 6, action: () => this._showInventory() },
      { id: 'skill', label: '스킬', fallbackLabel: '🌳 스킬', icon: LOBBY_NAV_ICON_TEXTURES.skill, x: (w * 4) / 6, action: () => void this._openSkillTree() },
      { id: 'quest', label: '퀘스트', fallbackLabel: '📜 퀘스트', icon: LOBBY_NAV_ICON_TEXTURES.quest, x: (w * 5) / 6, action: () => this._showQuests() },
    ];

    this.navButtonItems = [];
    this.lobbyNavIconImages = [];
    this.fallbackLobbyNavIconIds = [];
    this.lobbyNavFocusIcon = null;
    this.lobbyNavFocusIconFallbackRendered = false;

    buttons.forEach((def, i) => {
      const navIconResource = this._resolveLobbyNavIconResource(def.icon);
      const hasNavIcon = Boolean(navIconResource && this.textures.exists(navIconResource.key));
      const displayLabel = hasNavIcon ? def.label : def.fallbackLabel;
      const activate = () => {
        // 키보드 onActivate 와 동일 가드 — 모달/패널이 떠 있으면 마우스로 두 번째 표면을 열지 않음.
        if (this.dialoguePanel || isUiModalOpen()) return;
        playSfx(this, UI_SFX.CLICK);
        def.action();
      };

      if (navIconResource && hasNavIcon) {
        const navIcon = this.add.image(def.x - 38, btnY, navIconResource.key)
          .setName(`lobby_nav_icon_${def.id}`)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .on('pointerover', () => this._setNavIndex(i))
          .on('pointerdown', activate);
        navIcon.setDisplaySize(18, 18);
        navIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.lobbyNavIconImages.push(navIcon);
      } else {
        this.fallbackLobbyNavIconIds.push(def.id);
      }

      const t = this.add.text(hasNavIcon ? def.x + 12 : def.x, btnY, displayLabel, {
        fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#cccccc',
        backgroundColor: '#1a1a2e', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this._setNavIndex(i))
        .on('pointerdown', activate);
      this.navButtonItems.push({
        text: t,
        action: def.action,
        label: displayLabel,
        focusX: hasNavIcon ? def.x - 62 : def.x - 54,
        focusY: btnY,
      });
    });

    const navFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_NAV_FOCUS_ICON_ID);
    if (navFocusIconResource && this.textures.exists(navFocusIconResource.key)) {
      const firstItem = this.navButtonItems[0];
      this.lobbyNavFocusIcon = this._addLobbyNavFocusIcon(
        firstItem?.focusX ?? buttons[0].x - 62,
        firstItem?.focusY ?? btnY,
        navFocusIconResource,
      );
    } else {
      this.lobbyNavFocusIconFallbackRendered = true;
    }

    // FINDING-A4 ext5: 메인 nav 버튼 키보드 navigation (WCAG 2.1.1)
    if (this.navButtonItems.length > 0) {
      this.navIndex = 0;
      this._renderNavButton(0);
    }

    this._writeLobbyNavIconQaProbe();
    this._writeLobbyNavFocusIconQaProbe();

    const len = this.navButtonItems.length;
    const onLeft = () => {
      if (this.dialoguePanel || isUiModalOpen()) return; // FINDING-A4 ext8: 다이얼로그 모달 모드 — handler 양보
      if (len === 0) return;
      this.focusGroup = 'nav';
      if (this.npcHighlightRing) this.npcHighlightRing.setVisible(false);
      this._setNavIndex((this.navIndex + len - 1) % len);
    };
    const onRight = () => {
      if (this.dialoguePanel || isUiModalOpen()) return;
      if (len === 0) return;
      this.focusGroup = 'nav';
      if (this.npcHighlightRing) this.npcHighlightRing.setVisible(false);
      this._setNavIndex((this.navIndex + 1) % len);
    };
    // FINDING-A4 ext7: ArrowUp/Down → NPC group 활성 + cycle
    const onUp = () => {
      if (this.dialoguePanel || isUiModalOpen()) return;
      if (TOWN_NPCS.length === 0) return;
      this.focusGroup = 'npc';
      this._setNpcIndex((this.npcIndex + TOWN_NPCS.length - 1) % TOWN_NPCS.length);
    };
    const onDown = () => {
      if (this.dialoguePanel || isUiModalOpen()) return;
      if (TOWN_NPCS.length === 0) return;
      this.focusGroup = 'npc';
      this._setNpcIndex((this.npcIndex + 1) % TOWN_NPCS.length);
    };
    const onActivate = () => {
      if (this.dialoguePanel || isUiModalOpen()) return; // 다이얼로그 자체 handler 가 처리
      // FINDING-A4 ext7: focus group 별 activate 분기
      if (this.focusGroup === 'npc') {
        const npc = TOWN_NPCS[this.npcIndex];
        if (npc) {
          playSfx(this, UI_SFX.CLICK);
          this._openNpcDialogue(npc);
        }
      } else {
        const item = this.navButtonItems[this.navIndex];
        if (item) {
          playSfx(this, UI_SFX.CLICK);
          item.action();
        }
      }
    };
    const onEsc = () => {
      if (isUiModalOpen()) return; // 스킬 트리 등 uiModal 은 자체 ESC(bindEscClose)가 처리
      // 다이얼로그 패널 열려있으면 닫기, 아니면 캐릭터 선택 복귀
      if (this.dialoguePanel) {
        this.dialoguePanel.destroy();
        this.dialoguePanel = null;
      } else {
        this.scene.start('CharacterSelectScene');
      }
    };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    this.input.keyboard?.on('keydown-ESC', onEsc);

    this._lobbyKeyboardCleanup = () => {
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-UP', onUp);
      this.input.keyboard?.off('keydown-DOWN', onDown);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
      this.input.keyboard?.off('keydown-ESC', onEsc);
    };
  }

  private _resolveLobbyNavIconResource(icon: LobbyNavIconDescriptor): LobbyNavIconResource | undefined {
    if (icon.kind === 'worldmap') {
      return getSpriteResourceForWorldZoneIcon(icon.id);
    }
    if (icon.kind === 'skill') {
      return getSpriteResourceForSkillIcon(icon.id);
    }
    return getItemIconResource({ itemIconId: icon.id });
  }

  private _isLobbyNavIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lobbyNavIconQa') === '1';
  }

  private _writeLobbyNavIconQaProbe(): void {
    if (!this._isLobbyNavIconQaRoute() || typeof document === 'undefined') return;

    const expectedResources = Object.values(LOBBY_NAV_ICON_TEXTURES)
      .map((icon) => this._resolveLobbyNavIconResource(icon));
    const expectedKeys = expectedResources
      .map((resource) => resource?.key)
      .filter((key): key is string => typeof key === 'string');
    const missingNavIconKeys = Object.values(LOBBY_NAV_ICON_TEXTURES)
      .map((icon, index) => {
        const resource = expectedResources[index];
        if (!resource) return `${icon.kind}:${icon.id}`;
        return this.textures.exists(resource.key) ? null : resource.key;
      })
      .filter((key): key is string => typeof key === 'string');
    const activeIcons = this.lobbyNavIconImages.filter((icon) => icon.active);

    document.body.dataset.aeternaLobbyNavIconQa = JSON.stringify({
      status: missingNavIconKeys.length === 0
        && this.fallbackLobbyNavIconIds.length === 0
        && activeIcons.length === Object.keys(LOBBY_NAV_ICON_TEXTURES).length
        ? 'ready'
        : 'missing-icon',
      renderedCount: activeIcons.length,
      expectedCount: Object.keys(LOBBY_NAV_ICON_TEXTURES).length,
      expectedKeys,
      renderedKeys: activeIcons.map((icon) => icon.texture.key),
      fallbackLobbyNavIconIds: this.fallbackLobbyNavIconIds,
      missingNavIconKeys,
      displaySizes: activeIcons.map((icon) => ({
        name: icon.name,
        width: icon.displayWidth,
        height: icon.displayHeight,
        visible: icon.visible,
      })),
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _isLobbyNavFocusIconQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lobbyNavFocusIconQa') === '1';
  }

  private _writeLobbyNavFocusIconQaProbe(): void {
    if (!this._isLobbyNavFocusIconQaRoute() && this.characterData?.lobbyNavFocusIconQa !== true) return;
    if (typeof document === 'undefined' || !document.body) return;

    const navFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_NAV_FOCUS_ICON_ID);
    const focusIcon = this.lobbyNavFocusIcon?.active === true
      ? this.lobbyNavFocusIcon
      : null;
    const labels = this.navButtonItems.map((item) => item.text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingLobbyNavFocusIconKeys = focusIcon && navFocusIconResource
      ? []
      : [navFocusIconResource?.key ?? LOBBY_NAV_FOCUS_ICON_ID];

    document.body.dataset.aeternaLobbyNavFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex: this.navIndex,
      focusIcon: {
        key: navFocusIconResource?.key ?? null,
        path: navFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: LOBBY_NAV_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.lobbyNavFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      legacyGlyphPresent,
      labels,
      missingLobbyNavFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  // FINDING-A4 ext5: nav 버튼 highlight 동기화 + Aseprite focus icon
  private _setNavIndex(i: number): void {
    if (i === this.navIndex || !this.navButtonItems[i]) return;
    const oldI = this.navIndex;
    this.navIndex = i;
    this._renderNavButton(oldI);
    this._renderNavButton(i);
  }

  private _renderNavButton(i: number): void {
    const item = this.navButtonItems[i];
    if (!item) return;
    const isActive = i === this.navIndex;
    item.text.setText(this.lobbyNavFocusIcon?.active === true ? item.label : (isActive ? `▶ ${item.label}` : item.label));
    item.text.setColor(isActive ? '#ffffff' : '#cccccc');
    if (this.lobbyNavFocusIcon?.active === true) {
      const activeItem = this.navButtonItems[this.navIndex];
      if (activeItem) {
        this.lobbyNavFocusIcon
          .setVisible(true)
          .setPosition(activeItem.focusX, activeItem.focusY);
      }
    }
    this._writeLobbyNavFocusIconQaProbe();
  }

  private _addLobbyNavFocusIcon(
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_nav_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return focusIcon;
  }

  // ── P25-04: 인벤토리 / 퀘스트 표시 ─────────────────────

  // ── 스킬 트리 (SkillTreeUI 패널 — 서버 API 연동, 전키보드) ──
  private async _openSkillTree(): Promise<void> {
    const userId = networkManager.getUserId() ?? this.characterData?.characterId;
    if (!userId) { this._showNotification('로그인이 필요합니다.'); return; }
    // characterClass → ClassId (6 클래스 검증, 아니면 fallback)
    const VALID: ClassId[] = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'time_guardian', 'void_wanderer'];
    const raw = this.characterData?.characterClass ?? '';
    const classId: ClassId = (VALID as string[]).includes(raw) ? (raw as ClassId) : 'ether_knight';
    const level = this.characterData?.level ?? 1;
    // 잔여 스킬 포인트 fetch (실패 시 0)
    let points = this.characterData?.openSkillTreeQa === true ? 3 : 0;
    if (this.characterData?.openSkillTreeQa !== true) {
      try {
        // 서버 응답 필드는 remainingPoints. characterLevel 쿼리로 총 포인트 계산(미전달 시 서버 기본 1).
        const resp = await networkManager.get<{ remainingPoints?: number }>(`/api/skills/points/${userId}?characterLevel=${level}`);
        points = resp?.remainingPoints ?? 0;
      } catch { /* fallback 0 */ }
    }
    if (!this.skillTreeUI) {
      this.skillTreeUI = new SkillTreeUI(this, networkManager);
      // 씬 종료 시 모달락(uiModalLock) 누수 방지 — 열려 있으면 닫는다.
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.skillTreeUI?.close());
    }
    void this.skillTreeUI.open(userId, classId, level, points);
  }

  private async _showInventory(): Promise<void> {
    if (this.characterData?.offlineQa) {
      this._showInventoryPanel(LOBBY_QA_INVENTORY_ITEMS);
      this._showNotification('로컬 QA 인벤토리를 표시합니다.');
      return;
    }

    const userId = networkManager.getUserId();
    if (!userId) {
      this._showNotification('로그인이 필요합니다.');
      return;
    }
    try {
      const items = await networkManager.getInventory(userId);
      console.log('[Lobby] 인벤토리:', items);
      this._showInventoryPanel(items);
    } catch {
      this._showNotification('인벤토리 로드 실패');
    }
  }

  // 인벤토리 아이템 사용/장착 (서버 /api/inventory/use·/equip — slotId 소유권은 authUserId 로 검증).
  private async _useOrEquipItem(slotId: string, itemType: string, itemName: string): Promise<void> {
    const userId = networkManager.getUserId() ?? this.characterData?.characterId;
    if (!userId || !slotId) { this._showNotification('처리할 수 없는 아이템입니다.'); return; }
    try {
      if (itemType === 'consumable') {
        await networkManager.useItem(userId, slotId);
        this._showNotification(`${itemName} 사용!`);
      } else if (itemType === 'weapon' || itemType === 'armor' || itemType === 'accessory') {
        await networkManager.equipItem(userId, slotId);
        this._showNotification(`${itemName} 장착!`);
      } else {
        this._showNotification(`${itemName}: 사용/장착할 수 없는 아이템`);
        return;
      }
      playSfx(this, UI_SFX.CLICK);
      void this._showInventory(); // 사용/장착 후 인벤토리 갱신(재fetch·재렌더)
    } catch (err: any) {
      this._showNotification(`실패: ${err?.message ?? '처리 불가'}`);
    }
  }

  private _showInventoryPanel(items: any[]): void {
    // 기존 패널 제거
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);

    // 키보드 포커스 링: 아이템 행(읽기 전용 highlight) + [닫기]
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];
    const actionFocusTargets: Array<{
      text: Phaser.GameObjects.Text;
      label: string;
      x: number;
      y: number;
      activeColor: string;
      inactiveColor: string;
    }> = [];

    const panelH = Math.min(400, 120 + items.length * 36);
    this._addLobbyModalFrame(panel, 0, 0, 520, panelH, LOBBY_UI_FRAME_TEXTURES.inventoryPanel, 0x0a0a1a, 0.95, 0xcc8844);
    this.lobbyInventoryActionFocusIconFallbackRendered = false;
    this.lobbyInventoryActionFocusTexts = [];
    const inventoryActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID);
    if (inventoryActionFocusIconResource && this.textures.exists(inventoryActionFocusIconResource.key)) {
      this.lobbyInventoryActionFocusIcon = this._addLobbyInventoryActionFocusIcon(
        panel,
        -202,
        -panelH / 2 + 80,
        inventoryActionFocusIconResource,
      ).setVisible(false);
    } else {
      this.lobbyInventoryActionFocusIcon = null;
      this.lobbyInventoryActionFocusIconFallbackRendered = true;
    }

    this.lobbyInventoryTitleIconFallbackRendered = false;
    const inventoryTitleIconResource = getItemIconResource({ itemIconId: LOBBY_INVENTORY_TITLE_ICON_ID });
    const hasInventoryTitleIcon = Boolean(inventoryTitleIconResource && this.textures.exists(inventoryTitleIconResource.key));
    if (hasInventoryTitleIcon && inventoryTitleIconResource) {
      this.lobbyInventoryTitleIcon = this._addLobbyInventoryTitleIcon(panel, -116, -panelH / 2 + 20, inventoryTitleIconResource);
    } else {
      this.lobbyInventoryTitleIcon = null;
      this.lobbyInventoryTitleIconFallbackRendered = true;
    }
    const titleText = hasInventoryTitleIcon ? `인벤토리 (${items.length}개)` : `🎒 인벤토리 (${items.length}개)`;
    this.lobbyInventoryTitleText = this.add.text(hasInventoryTitleIcon ? 12 : 0, -panelH / 2 + 20, titleText, {
      fontSize: '18px', color: '#cc8844', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyInventoryTitleText);
    this._writeInventoryTitleIconQaProbe({ titleText });
    panel.once('destroy', () => {
      this.lobbyInventoryTitleIcon = null;
      this.lobbyInventoryTitleText = null;
      this.lobbyInventoryActionFocusIcon = null;
      this.lobbyInventoryActionFocusTexts = [];
    });

    if (items.length === 0) {
      panel.add(this.add.text(0, 0, '아이템이 없습니다.', {
        fontSize: '13px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5));
    } else {
      // 헤더
      const headerY = -panelH / 2 + 50;
      panel.add(this.add.text(-220, headerY, '아이템', {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(80, headerY, '수량', {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(160, headerY, '상태', {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));

      items.forEach((item: any, i: number) => {
        if (i >= 8) return; // 최대 8개 표시
        const y = headerY + 30 + i * 36;
        const itemName = item.name ?? item.item?.name ?? item.itemCode ?? item.itemId ?? '???';
        const qty = item.quantity ?? 1;
        const equipped = item.isEquipped ? '장착중' : '';
        const rarity = item.rarity ?? item.item?.rarity ?? '';
        const slotId = item.id ?? item.slotId ?? '';
        const itemType = item.item?.type ?? item.type ?? '';

        // 등급별 색상
        const rarityColors: Record<string, string> = {
          common: '#cccccc', uncommon: '#44cc44', rare: '#4488ff',
          epic: '#aa44ff', legendary: '#ffaa00', mythic: '#ff4444',
        };
        const nameColor = rarityColors[rarity] ?? '#ffffff';

        this._addLobbyItemIcon(panel, -220, y + 8, item, 28);
        const nameText = this.add.text(-184, y, itemName, {
          fontSize: '13px', color: nameColor, fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        });
        panel.add(nameText);
        // ENTER → 소비템은 사용, 장비는 장착. (마우스: 행 클릭으로도 동일)
        nameText.setInteractive({ useHandCursor: true });
        nameText.on('pointerdown', () => void this._useOrEquipItem(slotId, itemType, itemName));
        const focusIndex = actionFocusTargets.length;
        actionFocusTargets.push({
          text: nameText,
          label: itemName,
          x: -202,
          y: y + 7,
          activeColor: '#ffffff',
          inactiveColor: nameColor,
        });
        this.lobbyInventoryActionFocusTexts = actionFocusTargets.map((target) => target.text);
        focusables.push({
          setFocused: (a) => {
            const target = actionFocusTargets[focusIndex];
            if (!target) return;
            if (a) {
              this._renderLobbyInventoryActionFocus({ activeIndex: focusIndex, target });
              return;
            }
            target.text.setText(target.label).setColor(target.inactiveColor);
          },
          activate: () => void this._useOrEquipItem(slotId, itemType, itemName),
        });
        panel.add(this.add.text(80, y, `×${qty}`, {
          fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        }));
        if (equipped) {
          panel.add(this.add.text(160, y, equipped, {
            fontSize: '11px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
          }));
        }
      });

      if (items.length > 8) {
        panel.add(this.add.text(0, headerY + 30 + 8 * 36, `... 외 ${items.length - 8}개`, {
          fontSize: '11px', color: '#666666', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        }).setOrigin(0.5));
      }
    }

    const closeBtn = this.add.text(0, panelH / 2 - 25, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const doClose = () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy(); // _registerModalPanel destroy hook 가 dialoguePanel = null 처리
    };
    closeBtn.on('pointerdown', doClose);
    panel.add(closeBtn);
    const closeFocusIndex = actionFocusTargets.length;
    actionFocusTargets.push({
      text: closeBtn,
      label: '[ 닫기 ]',
      x: -50,
      y: panelH / 2 - 25,
      activeColor: '#ffffff',
      inactiveColor: '#888888',
    });
    this.lobbyInventoryActionFocusTexts = actionFocusTargets.map((target) => target.text);
    focusables.push({
      setFocused: (a) => {
        const target = actionFocusTargets[closeFocusIndex];
        if (!target) return;
        if (a) {
          this._renderLobbyInventoryActionFocus({ activeIndex: closeFocusIndex, target });
          return;
        }
        target.text.setText(target.label).setColor(target.inactiveColor);
      },
      activate: doClose,
    });

    this._attachPanelKeyboardNav(panel, focusables);
  }

  private _addLobbyInventoryTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_inventory_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _renderLobbyInventoryActionFocus({
    activeIndex,
    target,
  }: {
    activeIndex: number;
    target: {
      text: Phaser.GameObjects.Text;
      label: string;
      x: number;
      y: number;
      activeColor: string;
      inactiveColor: string;
    };
  }): void {
    const focusIcon = this.lobbyInventoryActionFocusIcon?.active === true
      ? this.lobbyInventoryActionFocusIcon
      : null;

    if (focusIcon) {
      target.text.setText(target.label).setColor(target.activeColor);
      focusIcon.setPosition(target.x, target.y).setVisible(true);
    } else {
      target.text.setText(`▶ ${target.label}`).setColor(target.activeColor);
      this.lobbyInventoryActionFocusIconFallbackRendered = true;
    }

    this._writeInventoryActionFocusIconQaProbe(activeIndex);
  }

  private _addLobbyInventoryActionFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_inventory_action_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  private _addLobbyItemIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    item: Record<string, unknown>,
    displaySize: number,
  ): boolean {
    const iconResource = getItemIconResource(item);
    if (!iconResource) {
      this._recordItemIconQaProbe('unresolved', false);
      return false;
    }

    if (!this.textures.exists(iconResource.key)) {
      this._recordItemIconQaProbe(iconResource.itemIconId, false);
      return false;
    }

    const icon = this.add.image(x, y, iconResource.key)
      .setDisplaySize(displaySize, displaySize)
      .setName(`item_icon_${iconResource.itemIconId}`);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(icon);
    this._recordItemIconQaProbe(iconResource.itemIconId, true);
    return true;
  }

  private async _showQuests(): Promise<void> {
    if (this.characterData?.offlineQa) {
      this._showQuestPanel(FALLBACK_QUESTS, 'local');
      this._showNotification('로컬 QA 퀘스트를 표시합니다.');
      return;
    }

    const characterId = this.characterData?.characterId;
    if (!characterId) {
      this._showQuestPanel(FALLBACK_QUESTS, 'local');
      this._showNotification('캐릭터 ID가 없어 로컬 퀘스트를 표시합니다.');
      return;
    }

    try {
      // 카탈로그(수주 가능)에 진행 중(active) + 완료(turned_in) 상태를 오버레이 →
      // 수주한 퀘스트는 '진행중'+실 진행도, 이미 끝낸 퀘스트는 '완료됨'(다시 [수주] 안 뜸).
      const [catalog, active, completedIds] = await Promise.all([
        networkManager.getQuests(characterId),
        networkManager.getActiveQuests().catch(() => []),
        networkManager.getCompletedQuestIds().catch(() => []),
      ]);
      const quests = mergeActiveQuestStatus(catalog, active, completedIds);
      this._showQuestPanel(quests, 'server');
      this._showNotification(`퀘스트: ${quests.length}개 표시`);
    } catch {
      this._showQuestPanel(FALLBACK_QUESTS, 'local');
      this._showNotification('서버 연결 없음: 로컬 퀘스트를 표시합니다.');
    }
  }

  private _showQuestPanel(quests: QuestData[], source: QuestPanelSource): void {
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);

    const panelW = 640;
    const panelH = 440;
    this._addLobbyModalFrame(panel, 0, 0, panelW, panelH, LOBBY_UI_FRAME_TEXTURES.questPanel, 0x0a0a1a, 0.96, 0xcccc44);

    const sourceLabel = source === 'server' ? '서버 동기화' : '로컬 QA 데이터';
    this.lobbyQuestTitleIconFallbackRendered = false;
    const questTitleIconResource = getItemIconResource({ itemIconId: LOBBY_QUEST_TITLE_ICON_ID });
    const hasQuestTitleIcon = Boolean(questTitleIconResource && this.textures.exists(questTitleIconResource.key));
    if (hasQuestTitleIcon && questTitleIconResource) {
      this.lobbyQuestTitleIcon = this._addLobbyQuestTitleIcon(panel, -128, -panelH / 2 + 24, questTitleIconResource);
    } else {
      this.lobbyQuestTitleIcon = null;
      this.lobbyQuestTitleIconFallbackRendered = true;
    }
    const titleText = hasQuestTitleIcon ? `퀘스트 (${sourceLabel})` : `📜 퀘스트 (${sourceLabel})`;
    this.lobbyQuestTitleText = this.add.text(hasQuestTitleIcon ? 12 : 0, -panelH / 2 + 24, titleText, {
      fontSize: '18px', color: '#ffdd66', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    panel.add(this.lobbyQuestTitleText);
    this._writeQuestTitleIconQaProbe({ titleText });
    this.lobbyQuestActionFocusIconFallbackRendered = false;
    this.lobbyQuestActionFocusTexts = [];
    const questActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_QUEST_ACTION_FOCUS_ICON_ID);
    if (questActionFocusIconResource && this.textures.exists(questActionFocusIconResource.key)) {
      this.lobbyQuestActionFocusIcon = this._addLobbyQuestActionFocusIcon(
        panel,
        190,
        -120,
        questActionFocusIconResource,
      ).setVisible(false);
    } else {
      this.lobbyQuestActionFocusIcon = null;
      this.lobbyQuestActionFocusIconFallbackRendered = true;
    }
    panel.once('destroy', () => {
      this.lobbyQuestTitleIcon = null;
      this.lobbyQuestTitleText = null;
      this.lobbyQuestActionFocusIcon = null;
      this.lobbyQuestActionFocusTexts = [];
    });

    // 상태순(actionable 우선) 안정 정렬 후 앞 4개 — turned_in 이 수주 가능 퀘스트를 가리지 않도록.
    const sortedQuests = [...quests].sort(
      (a, b) => (QUEST_STATUS_ORDER[a.status] ?? 9) - (QUEST_STATUS_ORDER[b.status] ?? 9),
    );
    const visibleQuests = sortedQuests.slice(0, 4);

    // 키보드 포커스 링: 액션 가능 퀘스트(수주/완료) + [새로고침] + [닫기]
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];
    const actionFocusTargets: Array<{
      text: Phaser.GameObjects.Text;
      label: string;
      x: number;
      y: number;
      activeColor: string;
      inactiveColor: string;
    }> = [];

    if (visibleQuests.length === 0) {
      panel.add(this.add.text(0, 0, '표시할 퀘스트가 없습니다.', {
        fontSize: '13px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5));
    }

    visibleQuests.forEach((quest, i) => {
      const y = -panelH / 2 + 70 + i * 78;
      const status = QUEST_STATUS_STYLE[quest.status] ?? QUEST_STATUS_STYLE.available;
      const objective = quest.objectives[0];
      const progress = objective
        ? `${objective.desc} ${objective.current}/${objective.target}`
        : '목표 없음';
      const rewardItems = quest.rewards.items?.length
        ? ` / ${quest.rewards.items.join(', ')}`
        : '';

      panel.add(this.add.rectangle(0, y + 32, panelW - 52, 1, 0x334433, 0.8));
      panel.add(this.add.text(-285, y, quest.name, {
        fontSize: '14px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(-285, y + 22, quest.description, {
        fontSize: '11px', color: '#bbbbbb', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        wordWrap: { width: 360 },
      }));
      panel.add(this.add.text(-285, y + 42, progress, {
        fontSize: '11px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(-25, y + 42, `EXP ${quest.rewards.exp} / ${quest.rewards.gold}G${rewardItems}`, {
        fontSize: '11px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(210, y, status.label, {
        fontSize: '12px', color: status.color, fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));

      const actionText = this._getQuestActionText(quest.status);
      const actionable = quest.status === 'available' || quest.status === 'complete';
      const actionBtn = this.add.text(210, y + 30, actionText, {
        fontSize: '12px',
        color: actionable ? '#88ff88' : '#777777',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setInteractive({ useHandCursor: actionable });

      if (actionable) {
        // 마우스(pointerdown)·키보드(ENTER) 공유 액션. done 가드로 중복 실행/라벨 깨짐 방지.
        let done = false;
        const doneText = quest.status === 'available' ? '[ 진행중 ]' : '[ 완료됨 ]';
        const act = async () => {
          if (done) return;
          done = true;
          playSfx(this, UI_SFX.CONFIRM);
          if (quest.status === 'available') await this._acceptQuestFromPanel(quest, source);
          else await this._completeQuestFromPanel(quest, source);
          actionBtn.setText(doneText).setColor('#777777').disableInteractive();
        };
        actionBtn.on('pointerdown', act);
        const focusIndex = actionFocusTargets.length;
        actionFocusTargets.push({
          text: actionBtn,
          label: actionText,
          x: 190,
          y: y + 30,
          activeColor: '#ffffff',
          inactiveColor: '#88ff88',
        });
        focusables.push({
          setFocused: (a) => {
            if (done) return; // 활성 후 라벨 고정
            const target = actionFocusTargets[focusIndex];
            if (!target) return;
            if (a) {
              this._renderLobbyQuestActionFocus({ activeIndex: focusIndex, target });
              return;
            }
            target.text.setText(target.label).setColor(target.inactiveColor);
          },
          activate: () => void act(),
        });
      }
      panel.add(actionBtn);
    });

    if (quests.length > visibleQuests.length) {
      panel.add(this.add.text(0, panelH / 2 - 58, `... 외 ${quests.length - visibleQuests.length}개`, {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5));
    }

    const doRefresh = () => {
      playSfx(this, UI_SFX.CLICK);
      panel.destroy();
      void this._showQuests();
    };
    const refreshBtn = this.add.text(-80, panelH / 2 - 26, '[ 새로고침 ]', {
      fontSize: '13px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    refreshBtn.on('pointerdown', doRefresh);
    panel.add(refreshBtn);
    const refreshFocusIndex = actionFocusTargets.length;
    actionFocusTargets.push({
      text: refreshBtn,
      label: '[ 새로고침 ]',
      x: -142,
      y: panelH / 2 - 26,
      activeColor: '#ffffff',
      inactiveColor: '#88ccff',
    });

    const doClose = () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy();
    };
    const closeBtn = this.add.text(90, panelH / 2 - 26, '[ 닫기 ]', {
      fontSize: '13px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', doClose);
    panel.add(closeBtn);
    const closeFocusIndex = actionFocusTargets.length;
    actionFocusTargets.push({
      text: closeBtn,
      label: '[ 닫기 ]',
      x: 42,
      y: panelH / 2 - 26,
      activeColor: '#ffffff',
      inactiveColor: '#888888',
    });
    this.lobbyQuestActionFocusTexts = actionFocusTargets.map((target) => target.text);

    focusables.push(
      {
        setFocused: (a) => {
          const target = actionFocusTargets[refreshFocusIndex];
          if (!target) return;
          if (a) {
            this._renderLobbyQuestActionFocus({ activeIndex: refreshFocusIndex, target });
            return;
          }
          target.text.setText(target.label).setColor(target.inactiveColor);
        },
        activate: doRefresh,
      },
      {
        setFocused: (a) => {
          const target = actionFocusTargets[closeFocusIndex];
          if (!target) return;
          if (a) {
            this._renderLobbyQuestActionFocus({ activeIndex: closeFocusIndex, target });
            return;
          }
          target.text.setText(target.label).setColor(target.inactiveColor);
        },
        activate: doClose,
      },
    );
    this._attachPanelKeyboardNav(panel, focusables);
  }

  private _renderLobbyQuestActionFocus({
    activeIndex,
    target,
  }: {
    activeIndex: number;
    target: {
      text: Phaser.GameObjects.Text;
      label: string;
      x: number;
      y: number;
      activeColor: string;
      inactiveColor: string;
    };
  }): void {
    const focusIcon = this.lobbyQuestActionFocusIcon?.active === true
      ? this.lobbyQuestActionFocusIcon
      : null;

    if (focusIcon) {
      target.text.setText(target.label).setColor(target.activeColor);
      focusIcon.setPosition(target.x, target.y).setVisible(true);
    } else {
      target.text.setText(`▶ ${target.label}`).setColor(target.activeColor);
      this.lobbyQuestActionFocusIconFallbackRendered = true;
    }

    this._writeQuestActionFocusIconQaProbe(activeIndex);
  }

  private _addLobbyQuestActionFocusIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('lobby_quest_action_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(focusIcon);
    return focusIcon;
  }

  private _addLobbyQuestTitleIcon(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: LobbyNavIconResource,
  ): Phaser.GameObjects.Image {
    const titleIcon = this.add.image(x, y, resource.key)
      .setName('lobby_quest_title_icon')
      .setOrigin(0.5);
    titleIcon.setDisplaySize(20, 20);
    titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    panel.add(titleIcon);
    return titleIcon;
  }

  private _getQuestActionText(status: QuestData['status']): string {
    if (status === 'available') return '[ 수주 ]';
    if (status === 'complete') return '[ 완료 ]';
    if (status === 'turned_in') return '[ 완료됨 ]';
    return '[ 진행중 ]';
  }

  private async _acceptQuestFromPanel(quest: QuestData, source: QuestPanelSource): Promise<void> {
    if (source === 'server' && this.characterData?.characterId) {
      try {
        await networkManager.acceptQuest(quest.id, this.characterData.level ?? 1);
      } catch {
        this._showNotification('서버 수주 실패: 로컬 진행 처리');
        return;
      }
    }
    this._showNotification(`${quest.name} 수주 완료`);
  }

  private async _completeQuestFromPanel(quest: QuestData, source: QuestPanelSource): Promise<void> {
    if (source === 'server' && this.characterData?.characterId) {
      try {
        await networkManager.completeQuest(quest.id, this.characterData.characterId);
      } catch {
        this._showNotification('서버 완료 실패: 로컬 완료 처리');
        return;
      }
    }
    this._showNotification(`${quest.name} 완료 보상 지급`);
  }

  private _addLobbyModalFrame(
    panel: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof LOBBY_UI_FRAME_TEXTURES[keyof typeof LOBBY_UI_FRAME_TEXTURES],
    fallbackColor: number,
    fallbackAlpha: number,
    strokeColor: number,
    strokeWidth = 2,
  ): void {
    if (this.textures.exists(texture.key)) {
      panel.add(this.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(0.9));
      panel.add(this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setStrokeStyle(strokeWidth, strokeColor));
      return;
    }

    // Aseprite lobby modal UI frame 로드 실패 시에만 사용하는 안전 fallback.
    panel.add(this.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
      .setStrokeStyle(strokeWidth, strokeColor));
  }

  private _addLobbyNpcPortrait(
    panel: Phaser.GameObjects.Container,
    npc: NpcEntry,
    x: number,
    y: number,
    size: number,
  ): void {
    const portrait = LOBBY_NPC_PORTRAIT_TEXTURES[npc.id];
    if (portrait && this.textures.exists(portrait.key)) {
      const portraitImage = this.add.image(x, y, portrait.key)
        .setName(`lobby_npc_portrait_${npc.id}`);
      portraitImage.setDisplaySize(size, size);
      portraitImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      panel.add(portraitImage);
      return;
    }

    const spriteResource = getSpriteResourceForLobbyNpc(npc.id);
    const fallbackKey = spriteResource?.key ?? `npc_${npc.id}`;
    if (!this.textures.exists(fallbackKey)) return;

    const fallbackImage = this.add.image(x, y, fallbackKey, 0)
      .setDisplaySize(Math.round(size * 0.72), Math.round(size * 0.72))
      .setName(`lobby_npc_portrait_sprite_fallback_${npc.id}`);
    if (spriteResource) {
      fallbackImage.setFrame(0);
      fallbackImage.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    panel.add(fallbackImage);
  }

  // ── 미니맵 ───────────────────────────────────────────────

  private _drawMinimap(sceneW: number): void {
    const mx = sceneW - MINIMAP_SIZE - MINIMAP_MARGIN;
    const my = MINIMAP_MARGIN + 40;
    this.minimapContainer = this.add.container(mx, my);
    this.lobbyMinimapNpcMarkerKeys = [];
    this.lobbyMinimapNpcMarkerMissingTextureKeys = [];
    this.lobbyMinimapNpcMarkerFallbackIds = [];

    const minimapFrame = LOBBY_UI_FRAME_TEXTURES.minimap;
    if (this.textures.exists(minimapFrame.key)) {
      const bg = this.add.image(MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, minimapFrame.key)
        .setDisplaySize(MINIMAP_SIZE, MINIMAP_SIZE)
        .setAlpha(0.88);
      this.minimapContainer.add(bg);
      this.minimapContainer.add(this.add.rectangle(
        MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, MINIMAP_SIZE, MINIMAP_SIZE, 0x000000, 0,
      ).setStrokeStyle(1, 0x446644));
    } else {
      // Aseprite UI frame 로드 실패 시에만 사용하는 안전 fallback.
      const bg = this.add.rectangle(
        MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, MINIMAP_SIZE, MINIMAP_SIZE, 0x000000, 0.6,
      ).setStrokeStyle(1, 0x446644);
      this.minimapContainer.add(bg);
    }

    for (const npc of TOWN_NPCS) {
      const dotX = (npc.x / 1280) * MINIMAP_SIZE;
      const dotY = (npc.y / 720) * MINIMAP_SIZE;
      this.minimapContainer.add(this._addLobbyMinimapNpcMarker(npc, dotX, dotY));
    }

    this.minimapContainer.add(this.add.text(MINIMAP_SIZE / 2, -8, '미니맵', {
      fontSize: '10px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));

    if (this._isLobbyMinimapMarkerQaRoute()) {
      this._writeLobbyMinimapMarkerQaProbe();
    }
  }

  private _addLobbyMinimapNpcMarker(
    npc: NpcEntry,
    dotX: number,
    dotY: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Arc {
    const resource = getSpriteResourceForLobbyNpc(npc.id);
    if (resource && this.textures.exists(resource.key)) {
      const marker = this.add.image(dotX, dotY, resource.key, 0)
        .setName(`lobby_minimap_npc_marker_${npc.id}`)
        .setOrigin(0.5);
      marker.setDisplaySize(10, 10);
      marker.setFrame(0);
      marker.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.lobbyMinimapNpcMarkerKeys.push(resource.key);
      return marker;
    }

    this.lobbyMinimapNpcMarkerMissingTextureKeys.push(resource?.key ?? `npc_${npc.id}`);
    this.lobbyMinimapNpcMarkerFallbackIds.push(npc.id);
    return this.add.circle(dotX, dotY, 3, npc.color)
      .setName(`lobby_minimap_npc_marker_fallback_${npc.id}`);
  }

  private _isLobbyMinimapMarkerQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('lobbyMinimapMarkerQa') === '1';
  }

  private _writeLobbyMinimapMarkerQaProbe(): void {
    if (typeof document === 'undefined' || !document.body) return;

    document.body.dataset.aeternaLobbyMinimapMarkerQa = JSON.stringify({
      status: 'ready',
      expectedMarkerCount: TOWN_NPCS.length,
      renderedMarkerCount: this.lobbyMinimapNpcMarkerKeys.length,
      renderedMarkerKeys: this.lobbyMinimapNpcMarkerKeys,
      missingMarkerTextureKeys: this.lobbyMinimapNpcMarkerMissingTextureKeys,
      fallbackMarkerIds: this.lobbyMinimapNpcMarkerFallbackIds,
      markerDisplaySize: { width: 10, height: 10 },
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  shutdown(): void {
    // FINDING-A4 ext5: scene 종료 시 keyboard listener 정리
    this._lobbyKeyboardCleanup?.();
    this._lobbyKeyboardCleanup = null;
    this.navButtonItems = [];
    // FINDING-A4 ext7: NPC highlight ring 정리
    if (this.npcHighlightRing) {
      this.npcHighlightRing.destroy();
      this.npcHighlightRing = null;
    }
  }
}
