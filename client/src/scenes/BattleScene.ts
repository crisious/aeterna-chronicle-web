/**
 * BattleScene.ts — FF6 스타일 사이드뷰 ATB 전투 씬 (P37)
 *
 * - FF6 레이아웃: 왼쪽 아군(side), 오른쪽 몬스터(front)
 * - ATB(Active Time Battle) 게이지: 실시간 충전, 차면 커맨드 메뉴
 * - 커맨드 메뉴: 공격/마법/아이템/방어/도주
 * - HP/MP 상태 패널 (하단 우측, FF6 스타일)
 * - 데미지 숫자 팝업 (크리티컬=금색, 회복=초록)
 * - 히트 이펙트 + 흔들림
 * - 전투 플로우: intro → fighting → victory/defeat
 * - SFX/Voice 연동 (SFXHelper)
 * - 서버 전투 API 연동 (NetworkManager)
 */

import * as Phaser from 'phaser';
import { EffectManager, EFFECT_FALLBACK_TEXTURES } from '../effects/EffectManager';
import { SoundManager } from '../sound/SoundManager';
import { BattleUI, preloadBattleUiFrameTextures } from '../ui/BattleUI';
import { CombatManager, CombatUnit, SkillSlot, LootItem } from '../combat/CombatManager';
import { computeCritEchoDamage, computeReflectDamage, rollMiss, type PassiveCombatantClient } from '../combat/passiveClientHelpers';
import { COMBO_MIRROR } from '../skills/comboMirror';
import { StatusEffectRenderer, type StatusEffectData } from '../combat/StatusEffectRenderer';
import { resolveStatusCategory } from '../combat/statusEffectCategory';
import { ComboUI, preloadComboUiFrameTextures } from '../ui/ComboUI';
import { networkManager, CombatResult } from '../network/NetworkManager';
import { isScreenShakeEnabled } from './SettingsScene';
import { playSfx, playRandomVoice, COMBAT_VOICE } from '../utils/SFXHelper';
import { classSkills } from '../data/classSkills';
import {
  getCharacterSpriteResource,
  getCharacterSpriteAnimationKey,
  getCharacterFrameRange,
  type CharacterMotion,
  type CharacterDirection,
} from '../assets/characterSpriteManifest';
import { preloadEnvironmentParticleTextures } from './TransitionEffects';
import { getChronoEra, type ChronoEraId } from '../time/ChronoTimeline';
import { chronoEraToSpeedTier } from '../../../shared/types/chronoEraAtb';
import { loadLastEra } from '../time/eraStorage';
import { getDualTechById } from '../../../shared/types/dualTech';
import { resolveFieldEncounter } from '../../../shared/types/chronoField';
import { composeEscapeLog, escapeOutcomeFromResult } from '../combat/escapeNarration';
import { getCombatPopupColor } from '../combat/combatResultPalette';
import { formatDamageTypeTag, getDamageTypePopupColor } from '../combat/damageTypeNarration';
import { getSpriteResourceForMonster, getSpriteResourceForSkillIcon, getSpriteResourceForVfx } from '../assets/spriteResourceManifest';
import { getStatusIconResource, preloadStatusIconResources } from '../data/statusEffectIcons';
import { getItemIconResource } from '../data/itemIconResources';
import monsterManifest from '../data/monsterManifest.json';

// CHRONO-S44: Dual Tech element → SFX 매핑 (대표 카테고리)
const DUAL_TECH_SFX_BY_ELEMENT: Record<string, string> = {
  chrono: 'sfx_combat_magic_cast',
  holy: 'sfx_combat_magic_heal',
  dark: 'sfx_combat_magic_cast',
  fire: 'sfx_combat_magic_cast',
  ice: 'sfx_combat_magic_cast',
  lightning: 'sfx_combat_magic_cast',
  wind: 'sfx_combat_magic_cast',
  earth: 'sfx_combat_magic_cast',
  neutral: 'sfx_combat_magic_cast',
};

// FF6 SPEED_TIER_SCALAR (atbTimeline 와 일치) — UI 표시 전용
const TIER_LABEL: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {
  1: '×0.5',
  2: '×0.7',
  3: '×1.0',
  4: '×1.3',
  5: '×1.6',
  6: '×2.0',
};
import { resolveZoneBackground } from '../data/zoneBackgrounds';
import type { ATBMode } from '../../../shared/types/atb';


// ─── 전투 상태 ──────────────────────────────────────────────────

export type BattlePhase = 'intro' | 'fighting' | 'victory' | 'defeat';

/** 전투 씬 시작 시 전달받는 데이터 */
export interface BattleSceneData {
  allies: CombatUnit[];
  enemies: CombatUnit[];
  skillSlots: SkillSlot[];
  bgKey?: string;
  battleId?: string;
  zoneId?: string;
  monsterId?: string;
  monsterName?: string;
  characterId?: string;
  characterName?: string;
  characterClass?: string;
  className?: string;
  baseStats?: { hp: number; mp: number; atk: number; def: number };
  level?: number;
  eraId?: ChronoEraId;
  atbMode?: ATBMode;
  enemyHpMultiplier?: number;
  enemyAttackSpeedMultiplier?: number;
  rewardMultiplier?: number;
  /** CHRONO-S126: GameScene 에서 보스 sprite 클릭 시 true. boss_room 분위기 강제. */
  isBossField?: boolean;
  offlineQa?: boolean;
  /** 전투 종료 후 복귀할 씬 (없으면 GameScene) */
  returnScene?: string;
  /** 복귀 시 전달할 데이터 (victory/allyState 자동 추가) */
  returnData?: Record<string, unknown>;
  /** Aseprite 결과/패배 팝업 frame 브라우저 QA용 강제 표시 */
  battleResultFrameQa?: 'victory' | 'defeat';
  /** Aseprite 전투 종료 lead banner icon 브라우저 QA용 */
  battleResultLeadQa?: 'victory' | 'defeat';
  /** Aseprite 전투 페이싱 버튼 frame 브라우저 QA용 */
  battlePaceFrameQa?: boolean;
  /** Aseprite 협공 버튼 frame 브라우저 QA용 */
  battleComboTechFrameQa?: boolean;
  /** Aseprite 필드 ambient line icon 브라우저 QA용 */
  battleAmbientLineQa?: boolean;
  /** Aseprite 전투 시작 intro icon 브라우저 QA용 */
  battleIntroIconQa?: boolean;
  /** Aseprite 커맨드 메뉴 focus icon 브라우저 QA용 */
  battleCommandFocusIconQa?: boolean;
  /** Aseprite 마법/아이템 서브메뉴 focus icon 브라우저 QA용 */
  battleSubMenuFocusIconQa?: 'magic' | 'item';
}

const DUNGEON_BATTLE_BG_KEY = 'battle_bg_dungeon';
const DUNGEON_BATTLE_BG_PATH = 'assets/generated/environment/backgrounds/DUNGEON-BG-FAR.png';
const MONSTER_IMAGE_MANIFEST = monsterManifest as Record<string, string>;

export const BATTLE_MONSTER_FALLBACK_TEXTURES = {
  normal: {
    key: 'battle_monster_fallback',
    path: 'assets/generated/monsters/fallback/battle_monster_fallback.png',
    displaySize: 60,
  },
  boss: {
    key: 'battle_boss_fallback',
    path: 'assets/generated/monsters/fallback/battle_boss_fallback.png',
    displaySize: 90,
  },
} as const;

const BATTLE_SCENE_UI_FRAME_TEXTURES = {
  bottomPanel: {
    key: 'ui_frame_UI-HUD-001-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-001-DEF.png',
  },
  commandMenu: {
    key: 'ui_frame_UI-BTN-002-DEF',
    path: 'assets/generated/ui/frames/UI-BTN-002-DEF.png',
  },
  magicSubMenu: {
    key: 'ui_frame_UI-BTN-003-DEF',
    path: 'assets/generated/ui/frames/UI-BTN-003-DEF.png',
  },
  itemSubMenu: {
    key: 'ui_frame_UI-BTN-004-DEF',
    path: 'assets/generated/ui/frames/UI-BTN-004-DEF.png',
  },
  resultPopup: {
    key: 'ui_frame_UI-INV-005-DEF',
    path: 'assets/generated/ui/frames/UI-INV-005-DEF.png',
  },
  defeatPopup: {
    key: 'ui_frame_UI-INV-006-DEF',
    path: 'assets/generated/ui/frames/UI-INV-006-DEF.png',
  },
  paceButton: {
    key: 'ui_frame_battle_pace_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
  comboTechButton: {
    key: 'ui_frame_battle_combo_tech_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const BATTLE_ACTIVE_INDICATOR_ICON_ID = 'skill_mw_arrow';
const BATTLE_COMMAND_FOCUS_ICON_ID = 'skill_mw_arrow';
const BATTLE_COMMAND_FOCUS_ICON_EXPECTED_COUNT = 1;
const BATTLE_SUB_MENU_FOCUS_ICON_ID = 'skill_mw_arrow';
const BATTLE_SUB_MENU_FOCUS_ICON_EXPECTED_COUNT = 1;
const BATTLE_INTRO_ICON_ID = 'skill_ek_slash';
const BATTLE_FIELD_AMBIENT_ICON_ID = 'shield';
const BATTLE_FIELD_BOSS_ICON_ID = 'skill_ek_slash';
const BATTLE_COMBO_TECH_BUTTON_ICON_IDS = {
  dual: 'skill_mw_storm',
  triple: 'skill_ek_ultimate',
} as const;
const BATTLE_RESULT_REWARD_ICON_IDS = {
  title: 'skill_ek_ultimate',
  exp: 'skill_ek_passive',
  gold: 'ITM-MAT-002',
  loot: 'ITM-MAT-001',
} as const;
const BATTLE_RESULT_LEAD_ICON_IDS = {
  victory: 'skill_ek_ultimate',
  defeat: 'curse',
} as const;
const BATTLE_RESULT_REWARD_ICON_EXPECTED_COUNT = 4;
const BATTLE_RESULT_REWARD_ICON_SIZE = 18;
const BATTLE_RESULT_LEAD_ICON_SIZE = 34;
const BATTLE_DEFEAT_TITLE_ICON_ID = 'curse';
const BATTLE_DEFEAT_TITLE_ICON_EXPECTED_COUNT = 1;
const BATTLE_DEFEAT_TITLE_ICON_SIZE = 18;

type BattleFieldAmbientIconKind = 'ambient' | 'boss';
type BattleResultRewardIconKind = keyof typeof BATTLE_RESULT_REWARD_ICON_IDS;
type BattleResultLeadMode = keyof typeof BATTLE_RESULT_LEAD_ICON_IDS;

interface BattleSceneFrameRender {
  primary: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  stroke?: Phaser.GameObjects.Rectangle;
}

// ─── 상수 ──────────────────────────────────────────────────────

/** FF6 레이아웃 상수 (1920×1080 기준) */
const _SCREEN_W = 1920;
const SCREEN_H = 1080;

// 아군 배치 (왼쪽, 사이드뷰) — 배틀 영역 y 0~920
// FF6 스타일: 아군 우측 종대, 적 좌측-중앙 횡대
const ALLY_POSITIONS = [
  { x: 1500, y: 320 },
  { x: 1580, y: 460 },
  { x: 1500, y: 600 },
  { x: 1580, y: 740 },
];

// 몬스터 배치 (좌측~중앙, 적당히 모여있게)
const ENEMY_POSITIONS = [
  { x: 500, y: 350 },
  { x: 700, y: 450 },
  { x: 500, y: 550 },
  { x: 700, y: 650 },
  { x: 600, y: 300 },
];

// 하단 UI 패널 (상단 85% = 배틀, 하단 15% = UI)
const UI_PANEL_Y = 920;
const CMD_MENU_X = 580;
const CMD_MENU_Y = UI_PANEL_Y + 8;
const STATUS_PANEL_X = 40;
const STATUS_PANEL_Y = UI_PANEL_Y + 8;

// ATB
const ATB_MAX = 100;
const ATB_SPEED_BASE = 25; // units/sec at speed 1.0
const ATB_BAR_W = 50;
const ATB_BAR_H = 4;

// HP/MP bar in status panel
const STAT_BAR_W = 120;
const _STAT_BAR_H = 8;

// 한글 호환 폰트 스택 (DR-15: Galmuri11 우선 — 다른 scene 과 일관)
const FONT_FAMILY = '"Galmuri11", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", monospace';

// ─── 유닛 스프라이트 래퍼 ─────────────────────────────────────

interface UnitSprite {
  unit: CombatUnit;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  atb: number;           // 0 ~ ATB_MAX
  atbBar?: Phaser.GameObjects.Graphics;
  isAlly: boolean;
  isDead: boolean;
  /** UX: 적 머리 위 HP 바(보스는 더 큼). _spawnEnemies 에서 생성, _updateEnemyHpBars 가 매프레임 갱신. */
  enemyHpBar?: Phaser.GameObjects.Graphics;
  isBoss?: boolean;
  /** UX(#9): 표시용 HP 보간값 — 실제 hp 로 lerp 해 바가 부드럽게 드레인(즉시 점프 방지). */
  displayedHp?: number;
  /** UX(rank13): 방어 상태. baseDefense=방어 전 원본(스냅샷 복원용), defendToken=최신 방어만 복원 유효. */
  isDefending?: boolean;
  baseDefense?: number;
  defendToken?: number;
  defendIcon?: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
}

// 커맨드 메뉴 항목
type CommandType = 'attack' | 'magic' | 'item' | 'defend' | 'flee';
type BattleCommandIconDescriptor =
  | { kind: 'skill'; id: string }
  | { kind: 'status'; id: string }
  | { kind: 'item'; itemIconId: string };

interface BattleIconResource {
  key: string;
  path: string;
}

interface BattleCommandIconResource extends BattleIconResource {}

interface CommandOption {
  type: CommandType;
  label: string;
  fallbackLabel: string;
  icon: BattleCommandIconDescriptor;
}

interface BattleSubMenuItem {
  text: Phaser.GameObjects.Text;
  action: () => void;
  label: string;
  focusX: number;
  focusY: number;
  icon?: Phaser.GameObjects.Image;
}

const COMMANDS: CommandOption[] = [
  { type: 'attack', label: '공격', fallbackLabel: '⚔ 공격', icon: { kind: 'skill', id: 'skill_ek_slash' } },
  { type: 'magic',  label: '마법', fallbackLabel: '✨ 마법', icon: { kind: 'skill', id: 'skill_mw_bolt' } },
  { type: 'item',   label: '아이템', fallbackLabel: '🎒 아이템', icon: { kind: 'item', itemIconId: 'ITM-CON-001' } },
  { type: 'defend', label: '방어', fallbackLabel: '🛡 방어', icon: { kind: 'status', id: 'shield' } },
  { type: 'flee',   label: '도주', fallbackLabel: '🏃 도주', icon: { kind: 'skill', id: 'skill_vw_warp' } },
];

function getBattleCommandIconResource(cmd: CommandOption): BattleCommandIconResource | undefined {
  switch (cmd.icon.kind) {
    case 'skill':
      return getSpriteResourceForSkillIcon(cmd.icon.id);
    case 'status':
      return getStatusIconResource(cmd.icon.id);
    case 'item':
      return getItemIconResource({ itemIconId: cmd.icon.itemIconId });
    default:
      return undefined;
  }
}

function getBattleResultRewardIconResource(kind: BattleResultRewardIconKind): BattleIconResource | undefined {
  switch (kind) {
    case 'title':
    case 'exp':
      return getSpriteResourceForSkillIcon(BATTLE_RESULT_REWARD_ICON_IDS[kind]);
    case 'gold':
    case 'loot':
      return getItemIconResource({ itemIconId: BATTLE_RESULT_REWARD_ICON_IDS[kind] });
    default:
      return undefined;
  }
}

function getBattleResultLeadIconResource(mode: BattleResultLeadMode): BattleIconResource | undefined {
  switch (mode) {
    case 'victory':
      return getSpriteResourceForSkillIcon(BATTLE_RESULT_LEAD_ICON_IDS.victory);
    case 'defeat':
      return getStatusIconResource(BATTLE_RESULT_LEAD_ICON_IDS.defeat);
    default:
      return undefined;
  }
}

// ─── BattleScene ────────────────────────────────────────────────

export class BattleScene extends Phaser.Scene {
  private phase: BattlePhase = 'intro';
  private effectManager!: EffectManager;
  private soundManager!: SoundManager;
  private battleUI!: BattleUI;
  private combatManager!: CombatManager;

  private allySprites: UnitSprite[] = [];
  private enemySprites: UnitSprite[] = [];
  private allSprites: UnitSprite[] = [];

  // ATB 커맨드 큐
  private commandQueue: UnitSprite[] = [];  // ATB가 찬 순서
  private activeCommander: UnitSprite | null = null;
  private selectedTarget: UnitSprite | null = null;

  // 커맨드 메뉴 UI
  private cmdMenuContainer: Phaser.GameObjects.Container | null = null;
  private cmdMenuTexts: Phaser.GameObjects.Text[] = [];
  private cmdMenuIndex = 0;
  private cmdSubMenu: Phaser.GameObjects.Container | null = null;
  // UX(#4): 행동 주체(activeCommander) sprite 위 펄싱 화살표 — 다인 파티에서 '내 턴' 가시화.
  private activeIndicator: Phaser.GameObjects.Image | Phaser.GameObjects.Text | null = null;
  private activeIndicatorTween: Phaser.Tweens.Tween | null = null;
  // 전키보드 UI: 서브메뉴(마법/아이템) 선택을 키보드로. update-폴링 패턴(커맨드 메뉴와 동일).
  private subMenuItems: BattleSubMenuItem[] = [];
  private subMenuIndex = 0;

  // 상태 패널
  private statusPanelContainer: Phaser.GameObjects.Container | null = null;
  private statusPanelGraphics: Phaser.GameObjects.Graphics | null = null;
  private statusTexts: Map<string, { name: Phaser.GameObjects.Text; hp: Phaser.GameObjects.Text; mp: Phaser.GameObjects.Text; atb: Phaser.GameObjects.Graphics }> = new Map();

  // 타겟 선택 모드
  private targetSelectMode = false;
  private targetSelectCallback: ((target: UnitSprite) => void) | null = null;
  private targetCursor: Phaser.GameObjects.Graphics | null = null;
  // UX(#12): 타겟 커서의 예상 데미지/KILL 미리보기 텍스트(확정 전 마무리 판단).
  private targetPreviewText?: Phaser.GameObjects.Text;
  // UX(#12-ext): 타겟 선택 진입 시점의 펜딩 스킬(있으면 미리보기를 스킬 공식으로 산정, 없으면 기본공격).
  private _previewSkill?: SkillSlot;
  private targetCandidates: UnitSprite[] = [];
  private targetIndex = 0;

  private skillSlots: SkillSlot[] = [];
  private battleId?: string;
  public lootPopup: Phaser.GameObjects.Container | null = null;

  // 키 입력
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private enterKey?: Phaser.Input.Keyboard.Key;
  private escKey?: Phaser.Input.Keyboard.Key;

  // P6-04/05: 상태이상 렌더러 + 콤보 UI
  private statusEffectRenderer?: StatusEffectRenderer;
  private comboUI?: ComboUI;
  // UX(#7): targetId → 활성 상태이상 목록 누적기. 서버 combat:effectApplied(단건)를 모아 updateEffects 에 전달.
  private _unitEffects = new Map<string, StatusEffectData[]>();

  // P25-05: 소켓 이벤트 클린업
  private socketCleanups: Array<() => void> = [];
  // 라이프사이클 가드(견고성): 중복 종료(combatEnd/scene.start)·중복 teardown 방지.
  // Phaser 는 씬 인스턴스를 재사용(scene.start→같은 인스턴스 create 재실행)하므로 create() 에서 반드시 리셋.
  private _exiting = false;
  private _battleTornDown = false;
  // UX(rank13): 방어 만료 타이머 토큰 — 재방어 시 이전 타이머의 조기 복원을 무효화(최신만 유효).
  private _defendCounter = 0;
  // UX(rank16): 아군 위급(최저 HP<25%) 화면 가장자리 비네트 + 진입 엣지 1회 경고음.
  private _dangerVignette?: Phaser.GameObjects.Graphics;
  private _allyInDanger = false;
  private serverCombatId: string | null = null;
  // UX(#13): 전투 중 연결 끊김 — '재연결 중' 배지 + ATB 정지(입력/진행 잠금).
  private connectionBadge?: Phaser.GameObjects.Text;
  private atbFrozenByConnection = false;
  // CHRONO-S23/S45: server 가 노출한 발동 가능 협공 후보 (마지막 tick 기준)
  private lastDualTechCandidates: Array<{
    techId: string;
    name: string;
    actorIds: [string, string];
    element?: string;
    aoe?: boolean;
    mpCost?: number;
  }> = [];
  // CHRONO-S63: Triple Tech 후보 (3-actor)
  private lastTripleTechCandidates: Array<{
    techId: string;
    name: string;
    actorIds: [string, string, string];
    element?: string;
    aoe?: boolean;
    mpCost?: number;
  }> = [];
  // CHRONO-S87: Triple Tech 후보 선택 인덱스 (Shift+T cycle)
  private tripleTechSelectedIndex = 0;
  // CHRONO-S36: 다중 후보 중 선택 인덱스 (Shift+D 로 cycle)
  private dualTechSelectedIndex = 0;
  // CHRONO-S31: 협공 발동 버튼 (후보 있을 때만 visible)
  private dualTechButton: Phaser.GameObjects.Container | null = null;
  // CHRONO-S65: 3인 협공 발동 버튼
  private tripleTechButton: Phaser.GameObjects.Container | null = null;
  private comboTechButtonIcons: Phaser.GameObjects.Image[] = [];
  private fieldAmbientIcons: Phaser.GameObjects.Image[] = [];
  private fieldAmbientIconFallbackKinds: BattleFieldAmbientIconKind[] = [];
  private battleIntroIcon?: Phaser.GameObjects.Image;
  private battleIntroIconFallbackRendered = false;
  private battleCommandFocusIcon: Phaser.GameObjects.Image | null = null;
  private battleCommandFocusIconFallbackRendered = false;
  private battleCommandFocusTexts: Phaser.GameObjects.Text[] = [];
  private battleSubMenuFocusIcon: Phaser.GameObjects.Image | null = null;
  private battleSubMenuFocusIconFallbackRendered = false;
  private battleSubMenuFocusTexts: Phaser.GameObjects.Text[] = [];
  private battleResultRewardIcons: Phaser.GameObjects.Image[] = [];
  private battleResultRewardIconFallbackKinds: BattleResultRewardIconKind[] = [];
  private battleDefeatTitleIcon: Phaser.GameObjects.Image | null = null;
  private battleDefeatTitleIconFallbackRendered = false;
  private battleResultLeadIcon: Phaser.GameObjects.Image | null = null;
  private battleResultLeadIconFallbackRendered = false;
  private battleResultLeadText: Phaser.GameObjects.Text | null = null;
  // CHRONO-S70: chain combo 카운터 + UI 라벨
  private chainCount = 0;
  private chainLabel: Phaser.GameObjects.Text | null = null;
  private chainExpireTick = 0;

  // Auto-battle & speed control
  private autoMode = false;
  private speedMultiplier = 1;
  private atbMode: ATBMode = 'WAIT';
  private autoButton: Phaser.GameObjects.Text | null = null;
  private speedButton: Phaser.GameObjects.Text | null = null;
  private atbModeButton: Phaser.GameObjects.Text | null = null;
  private phaseText: Phaser.GameObjects.Text | null = null;
  private introFallbackTimer: Phaser.Time.TimerEvent | null = null;
  private battleSceneFrameQaRenderedCounts = new Map<string, number>();

  private _initData!: BattleSceneData;
  private battleBackgroundKey = DUNGEON_BATTLE_BG_KEY;


  constructor() {
    super({ key: 'BattleScene' });
  }

  // ─── 라이프사이클 ─────────────────────────────────────────────

  init(data: BattleSceneData): void {
    this.phase = 'intro';
    // 이전 씬 아틀라스 텍스처 제거 (스프라이트 시트 충돌 방지)
    ['characters', 'effects', 'ui'].forEach(k => {
      if (this.textures.exists(k)) this.textures.remove(k);
    });
    this.allySprites = [];
    this.enemySprites = [];
    this.allSprites = [];
    this.commandQueue = [];
    this.activeCommander = null;
    this.selectedTarget = null;
    this.targetSelectMode = false;
    this.lootPopup = null;
    this.cmdMenuContainer = null;
    this.cmdSubMenu = null;
    this.statusPanelContainer = null;
    this.statusPanelGraphics = null;
    this.statusTexts = new Map();
    this.cmdMenuTexts = [];
    this.cmdMenuIndex = 0;
    this.targetCursor = null;
    this.autoMode = false;
    this.speedMultiplier = 1;
    this.atbMode = data.atbMode ?? 'WAIT';
    this.autoButton = null;
    this.speedButton = null;
    this.atbModeButton = null;
    this.phaseText = null;
    this.introFallbackTimer = null;
    this.comboTechButtonIcons = [];
    this.fieldAmbientIcons = [];
    this.fieldAmbientIconFallbackKinds = [];
    this.battleIntroIcon = undefined;
    this.battleIntroIconFallbackRendered = false;
    this.battleCommandFocusIcon = null;
    this.battleCommandFocusIconFallbackRendered = false;
    this.battleCommandFocusTexts = [];
    this.battleSubMenuFocusIcon = null;
    this.battleSubMenuFocusIconFallbackRendered = false;
    this.battleSubMenuFocusTexts = [];
    this.battleResultRewardIcons = [];
    this.battleResultRewardIconFallbackKinds = [];
    this.battleDefeatTitleIcon = null;
    this.battleDefeatTitleIconFallbackRendered = false;
    this.battleResultLeadIcon = null;
    this.battleResultLeadIconFallbackRendered = false;
    this.battleResultLeadText = null;
    this.battleSceneFrameQaRenderedCounts.clear();

    this.skillSlots = data.skillSlots ?? [];
    this.battleId = data.battleId;
    // CHRONO-S18: data.eraId 없으면 localStorage 마지막 era 복원 (디버그/직접 진입 ergonomics)
    this._initData = data.eraId
      ? data
      : { ...data, eraId: loadLastEra() ?? undefined };
  }

  preload(): void {
    // 전투 배경: 던전에서 왔으면 던전 배경, 아니면 zoneId 기반
    if (this._initData?.returnScene === 'DungeonScene') {
      this.battleBackgroundKey = DUNGEON_BATTLE_BG_KEY;
      if (!this.textures.exists(DUNGEON_BATTLE_BG_KEY)) {
        this.load.image(DUNGEON_BATTLE_BG_KEY, DUNGEON_BATTLE_BG_PATH);
      }
    } else {
      const zoneId = this._initData?.zoneId ?? '';
      const background = resolveZoneBackground(zoneId, this._initData?.eraId ?? 'present');
      this.battleBackgroundKey = background.battleKey;
      if (!this.textures.exists(background.battleKey)) {
        this.load.image(background.battleKey, background.battlePath);
      }
    }

    for (const texture of Object.values(BATTLE_MONSTER_FALLBACK_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    preloadBattleUiFrameTextures(this);
    preloadComboUiFrameTextures(this);
    for (const texture of Object.values(BATTLE_SCENE_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }

    // 몬스터별 리소스가 없으면 generic Aseprite fallback으로 내려간다.

    // 캐릭터 전투 썸네일 (64x96) 로드
    const classIds = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'time_guardian', 'void_wanderer'];
    for (const cid of classIds) {
      this.load.image(`char_battle_${cid}`, `assets/generated/characters/class_main/battle/char_battle_${cid}.png`);
      const spriteResource = getCharacterSpriteResource(cid);
      if (spriteResource && !this.textures.exists(spriteResource.textureKey)) {
        this.load.spritesheet(spriteResource.textureKey, spriteResource.imagePath, {
          frameWidth: spriteResource.frameWidth,
          frameHeight: spriteResource.frameHeight,
        });
      }
    }

    // 몬스터 스프라이트 이미지 로드 (128x128, 투명 배경)
    const enemies = this._initData?.enemies ?? this._createDefaultEnemies();
    for (const enemy of enemies) {
      const cleanId = (enemy.id ?? '').replace(/_\d+$/, '');
      const resource = getSpriteResourceForMonster(cleanId);
      if (resource && !this.textures.exists(resource.key)) {
        this.load.spritesheet(resource.key, resource.path, {
          frameWidth: resource.frameWidth,
          frameHeight: resource.frameHeight,
        });
        continue;
      }

      const texKey = `mon_battle_${cleanId}`;
      const legacyMonsterPath = MONSTER_IMAGE_MANIFEST[cleanId];
      if (legacyMonsterPath && !this.textures.exists(texKey)) {
        this.load.image(texKey, legacyMonsterPath);
      }
    }

    const characterClass = this._initData?.characterClass ?? 'ether_knight';
    const preloadedSkillSlots = this.skillSlots.length > 0
      ? this.skillSlots
      : (classSkills[characterClass] ?? classSkills['ether_knight']);
    const queuedSkillIconKeys = new Set<string>();
    for (const slot of preloadedSkillSlots) {
      const skillIconResource = slot.icon ? getSpriteResourceForSkillIcon(slot.icon) : undefined;
      if (skillIconResource && !this.textures.exists(skillIconResource.key) && !queuedSkillIconKeys.has(skillIconResource.key)) {
        this.load.image(skillIconResource.key, skillIconResource.path);
        queuedSkillIconKeys.add(skillIconResource.key);
      }
    }

    const activeIndicatorResource = getSpriteResourceForSkillIcon(BATTLE_ACTIVE_INDICATOR_ICON_ID);
    if (activeIndicatorResource && !this.textures.exists(activeIndicatorResource.key)) {
      this.load.image(activeIndicatorResource.key, activeIndicatorResource.path);
    }

    const commandFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_COMMAND_FOCUS_ICON_ID);
    if (
      commandFocusIconResource
      && commandFocusIconResource.key !== activeIndicatorResource?.key
      && !this.textures.exists(commandFocusIconResource.key)
    ) {
      this.load.image(commandFocusIconResource.key, commandFocusIconResource.path);
    }

    const subMenuFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_SUB_MENU_FOCUS_ICON_ID);
    if (
      subMenuFocusIconResource
      && subMenuFocusIconResource.key !== activeIndicatorResource?.key
      && subMenuFocusIconResource.key !== commandFocusIconResource?.key
      && !this.textures.exists(subMenuFocusIconResource.key)
    ) {
      this.load.image(subMenuFocusIconResource.key, subMenuFocusIconResource.path);
    }

    const introIconResource = getSpriteResourceForSkillIcon(BATTLE_INTRO_ICON_ID);
    if (introIconResource && !this.textures.exists(introIconResource.key)) {
      this.load.image(introIconResource.key, introIconResource.path);
    }

    const ambientIconResource = getStatusIconResource(BATTLE_FIELD_AMBIENT_ICON_ID);
    if (ambientIconResource && !this.textures.exists(ambientIconResource.key)) {
      this.load.image(ambientIconResource.key, ambientIconResource.path);
    }

    const bossIconResource = getSpriteResourceForSkillIcon(BATTLE_FIELD_BOSS_ICON_ID);
    if (bossIconResource && !this.textures.exists(bossIconResource.key)) {
      this.load.image(bossIconResource.key, bossIconResource.path);
    }

    for (const iconId of Object.values(BATTLE_COMBO_TECH_BUTTON_ICON_IDS)) {
      const comboTechIconResource = getSpriteResourceForSkillIcon(iconId);
      if (comboTechIconResource && !this.textures.exists(comboTechIconResource.key)) {
        this.load.image(comboTechIconResource.key, comboTechIconResource.path);
      }
    }

    const queuedResultRewardIconKeys = new Set(queuedSkillIconKeys);
    for (const kind of Object.keys(BATTLE_RESULT_REWARD_ICON_IDS) as BattleResultRewardIconKind[]) {
      const resultRewardIconResource = getBattleResultRewardIconResource(kind);
      if (
        resultRewardIconResource
        && !this.textures.exists(resultRewardIconResource.key)
        && !queuedResultRewardIconKeys.has(resultRewardIconResource.key)
      ) {
        this.load.image(resultRewardIconResource.key, resultRewardIconResource.path);
        queuedResultRewardIconKeys.add(resultRewardIconResource.key);
      }
    }

    for (const cmd of COMMANDS) {
      const commandIconResource = getBattleCommandIconResource(cmd);
      if (commandIconResource && !this.textures.exists(commandIconResource.key)) {
        this.load.image(commandIconResource.key, commandIconResource.path);
      }
    }

    // VFX — 프로그래매틱 이펙트 사용
    const hitSlashResource = getSpriteResourceForVfx('vfx_hit_slash');
    if (hitSlashResource && !this.textures.exists(hitSlashResource.key)) {
      this.load.spritesheet(hitSlashResource.key, hitSlashResource.path, {
        frameWidth: hitSlashResource.frameWidth,
        frameHeight: hitSlashResource.frameHeight,
      });
    }

    for (const texture of EFFECT_FALLBACK_TEXTURES) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    preloadEnvironmentParticleTextures(this);

    preloadStatusIconResources(this);

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Battle] 이미지 로드 실패: ${file.key}`);
    });

  }

  create(): void {
    // 라이프사이클 정리(견고성): 인스턴스 재사용 대비 가드 리셋 + 단일 정리 진입점 등록.
    // SHUTDOWN 은 _exitBattle 의 scene.start 뿐 아니라 외부 전환 등 '모든' 종료에서 발생하므로,
    // 소켓·리스너 해제를 여기로 모아 죽은 씬에 묶인 핸들러가 다음 전투 이벤트를 처리하는 누수를 차단.
    this._exiting = false;
    this._battleTornDown = false;
    this._dangerVignette = undefined; // 인스턴스 재사용 시 이전 전투의 destroy 된 그래픽 참조 잔존 방지
    this._allyInDanger = false;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this._teardownBattle());

    const { width: scW, height: scH } = this.cameras.main;

    // ── 배경 ───────────────────────────────────────────────
    this.cameras.main.setBackgroundColor('#0a0a1e');

    try {
      if (this.textures.exists(this.battleBackgroundKey)) {
        const bgImg = this.add.image(scW / 2, scH / 2, this.battleBackgroundKey);
        const sw = scW / bgImg.width;
        const sh = scH / bgImg.height;
        bgImg.setScale(Math.max(sw, sh));
      }
    } catch (e) { console.warn('[Battle] bg error:', e); }

    const era = getChronoEra(this._initData.eraId ?? 'present');
    const tier = chronoEraToSpeedTier(this._initData.eraId ?? 'present');
    this.add.rectangle(scW / 2, scH / 2, scW, scH, era.tintColor, 0.08).setDepth(1);
    // CHRONO-S11: era 라벨 + ATB tier (시대 기반 ATB 속도 차별화 시각화)
    this.add.text(scW - 20, 12, `${era.label} / ${era.yearLabel} · ATB ${TIER_LABEL[tier]}`, {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: `#${era.tintColor.toString(16).padStart(6, '0')}`,
    }).setOrigin(1, 0).setDepth(250).setName('eraTierLabel');

    // CHRONO-S109: 필드 encounter ambient line (좌상단 hint)
    const zoneIdField = this._initData.zoneId ?? '';
    const fieldEnc = zoneIdField ? resolveFieldEncounter(zoneIdField, this._initData.eraId ?? 'present') : null;
    if (fieldEnc) {
      // CHRONO-S144: 35자 이상이면 truncate (UI overflow 방지)
      const ambientShort = fieldEnc.ambientLine.length > 35
        ? `${fieldEnc.ambientLine.slice(0, 32)}…`
        : fieldEnc.ambientLine;
      const ambientIconResource = getStatusIconResource(BATTLE_FIELD_AMBIENT_ICON_ID);
      const bossIconResource = getSpriteResourceForSkillIcon(BATTLE_FIELD_BOSS_ICON_ID);
      const hasAmbientIcon = Boolean(ambientIconResource && this.textures.exists(ambientIconResource.key));
      const hasBossIcon = Boolean(fieldEnc.hasBossSlot && bossIconResource && this.textures.exists(bossIconResource.key));
      if (hasAmbientIcon && ambientIconResource) {
        this._addFieldAmbientIcon(20, 20, ambientIconResource, 'ambient');
      } else {
        this.fieldAmbientIconFallbackKinds.push('ambient');
      }

      const ambientLabel = hasAmbientIcon ? ambientShort : `🛡 ${ambientShort}`;
      const bossLabelSuffix = fieldEnc.hasBossSlot && !hasBossIcon ? ' ⚔️' : '';
      const ambientText = this.add.text(hasAmbientIcon ? 42 : 20, 12, `${ambientLabel}${bossLabelSuffix}`, {
        fontSize: '12px',
        fontFamily: FONT_FAMILY,
        color: '#ffd54a',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0, 0).setDepth(250).setName('fieldAmbientLine');
      if (fieldEnc.hasBossSlot) {
        if (hasBossIcon && bossIconResource) {
          this._addFieldAmbientIcon(ambientText.x + ambientText.displayWidth + 18, 20, bossIconResource, 'boss');
        } else {
          this.fieldAmbientIconFallbackKinds.push('boss');
        }
      }
      this._writeBattleAmbientLineQaProbe({ fieldEnc, ambientText, hasAmbientIcon, hasBossIcon });

      // CHRONO-S113/S118/S127: ambientEffect 약한 색조 overlay
      // S127: isBossField 시 boss_room 강제 (visible 보스 진입)
      const effectTint: Record<string, number | null> = {
        mist: 0xeeeeee,
        dust: 0xb38b6a,
        glow: 0xffd54a,
        void: 0x6633aa,
        boss_room: 0xff3333,
        none: null,
      };
      const effectKind = this._initData.isBossField ? 'boss_room' : (fieldEnc.ambientEffect ?? 'none');
      const tint = effectTint[effectKind];
      if (tint !== null && tint !== undefined) {
        const alpha = effectKind === 'boss_room' ? 0.12 : 0.06;
        this.add.rectangle(scW / 2, scH / 2, scW, scH, tint, alpha)
          .setDepth(2)
          .setName(`fieldAmbientOverlay_${effectKind}`);
      }
      // CHRONO-S128/S129: 보스 진입 시 카메라 진입 zoom + SFX
      if (this._initData.isBossField) {
        this.cameras.main.setZoom(1.0);
        this.tweens.add({
          targets: this.cameras.main,
          zoom: 1.05,
          duration: 400,
          ease: 'Power2',
        });
        // 보스 진입 SFX (자산 미존재 시 SoundManager fallback)
        try {
          playSfx(this, 'sfx_combat_magic_cast', 0.9);
          playSfx(this, COMBAT_VOICE.SKILL_CAST, 0.9);
        } catch (e) {
          console.warn('[BattleScene] 보스 진입 SFX 실패:', e);
        }
      }
      // CHRONO-S116/S143: bgmTrack 재생 시도 + 명시 fallback
      if (fieldEnc.bgmTrack && this.soundManager) {
        try {
          this.soundManager.playBgm(fieldEnc.bgmTrack, 1500);
          this.battleUI?.addLog(`🎵 ${fieldEnc.bgmTrack}`);
        } catch (e) {
          console.warn('[BattleScene] BGM 재생 실패 (자산 미존재 가능):', fieldEnc.bgmTrack, e);
          this.battleUI?.addLog(`🔇 BGM 미존재: ${fieldEnc.bgmTrack}`);
        }
      }
    }

    // CHRONO-S70: chain combo 라벨 (era 라벨 아래)
    this.chainLabel = this.add.text(scW - 20, 32, '', {
      fontSize: '14px',
      fontFamily: FONT_FAMILY,
      color: '#ffd54a',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(1, 0).setDepth(252).setName('chainLabel').setVisible(false);

    // CHRONO-S31: 협공 발동 버튼 (우하단, 후보 있을 때만 표시)
    const btnContainer = this.add.container(scW - 90, scH - 50);
    const btnFrame = this._addBattleSceneFrame(0, 0, 160, 36, BATTLE_SCENE_UI_FRAME_TEXTURES.comboTechButton, 0x6fd3ff, 0.85, 0x6fd3ff, 2, undefined, btnContainer);
    btnFrame.primary.setInteractive({ useHandCursor: true });
    const dualTechIcon = this._addComboTechButtonIcon(btnContainer, -52, 0, 'dual', BATTLE_COMBO_TECH_BUTTON_ICON_IDS.dual);
    const btnLabel = dualTechIcon ? '협공 (D)' : '✨ 협공 (D)';
    const btnText = this.add.text(dualTechIcon ? 12 : 0, 0, btnLabel, {
      fontSize: '14px',
      fontFamily: FONT_FAMILY,
      color: '#dff7ff',
      stroke: '#00141f',
      strokeThickness: 2,
    }).setOrigin(0.5).setName('dualTechButtonLabel');
    btnContainer.add(btnText);
    this._bindComboTechButtonParts(btnContainer, btnFrame, btnText);
    this._setComboTechButtonAccent(btnContainer, 0x6fd3ff, 0.85, 2);
    btnContainer.setDepth(260).setVisible(false).setName('dualTechButton');
    btnFrame.primary.on('pointerdown', () => this._triggerFirstDualTech());
    this.dualTechButton = btnContainer;

    // CHRONO-S65: 3인 협공 버튼 (Dual 위, 더 큰 강조)
    const tBtnContainer = this.add.container(scW - 90, scH - 92);
    const tBtnFrame = this._addBattleSceneFrame(0, 0, 180, 40, BATTLE_SCENE_UI_FRAME_TEXTURES.comboTechButton, 0xffd54a, 0.92, 0xffd54a, 3, undefined, tBtnContainer);
    tBtnFrame.primary.setInteractive({ useHandCursor: true });
    const tripleTechIcon = this._addComboTechButtonIcon(tBtnContainer, -62, 0, 'triple', BATTLE_COMBO_TECH_BUTTON_ICON_IDS.triple);
    const tBtnLabel = tripleTechIcon ? '3인 협공 (T)' : '🌟 3인 협공 (T)';
    const tBtnText = this.add.text(tripleTechIcon ? 14 : 0, 0, tBtnLabel, {
      fontSize: '15px',
      fontFamily: FONT_FAMILY,
      color: '#fff3b0',
      stroke: '#241900',
      strokeThickness: 2,
    }).setOrigin(0.5).setName('tripleTechButtonLabel');
    tBtnContainer.add(tBtnText);
    this._bindComboTechButtonParts(tBtnContainer, tBtnFrame, tBtnText);
    this._setComboTechButtonAccent(tBtnContainer, 0xffd54a, 0.92, 3);
    tBtnContainer.setDepth(261).setVisible(false).setName('tripleTechButton');
    tBtnFrame.primary.on('pointerdown', () => this._triggerFirstTripleTech());
    this.tripleTechButton = tBtnContainer;
    this._applyBattleComboTechFrameQa();

    // ── 매니저 초기화 (개별 try-catch) ────────────────────────
    try { this.effectManager = new EffectManager(this); } catch (e) { console.warn('[Battle] EffectManager init error:', e); }
    try { this.soundManager = new SoundManager(this); } catch (e) { console.warn('[Battle] SoundManager init error:', e); }
    try {
      this.combatManager = new CombatManager(this.battleId, {
        useSocket: this._shouldUseServerCombat(),
      });
    } catch (e) { console.warn('[Battle] CombatManager init error:', e); }

    // ── 유닛 생성 ──────────────────────────────────────────
    const allies = this._initData.allies ?? this._createDefaultAllies();
    const enemies = this._initData.enemies ?? this._createDefaultEnemies();

    // 스킬 슬롯 폴백: 비어있으면 클래스 기본 스킬 적용
    if (this.skillSlots.length === 0) {
      const cid = allies[0]?.classId ?? 'ether_knight';
      this.skillSlots = (classSkills[cid] ?? classSkills['ether_knight']).map(s => ({ ...s, currentCooldown: 0 }));
    }

    this._spawnAllies(allies);
    this._spawnEnemies(enemies);
    this.allSprites = [...this.allySprites, ...this.enemySprites];

    // ── 하단 UI 패널 배경 ───────────────────────────────────
    this._addBattleSceneFrame(
      scW / 2,
      (UI_PANEL_Y + SCREEN_H) / 2,
      scW,
      SCREEN_H - UI_PANEL_Y,
      BATTLE_SCENE_UI_FRAME_TEXTURES.bottomPanel,
      0x0a0a2e,
      0.85,
      0x334488,
      2,
      100,
    );

    // 구분선
    this.add.rectangle(scW / 2, UI_PANEL_Y, scW, 2, 0x334488, 0.8)
      .setDepth(101);

    // ── FF6 상태 패널 (하단 우측) ─────────────────────────────
    this._createStatusPanel();

    // ── 타겟 커서 ──────────────────────────────────────────
    this.targetCursor = this.add.graphics().setDepth(200);

    // ── 페이즈 디버그 표시 ──────────────────────────────────
    this.phaseText = this.add.text(10, 10, `phase: ${this.phase}`, {
      fontSize: '8px',
      fontFamily: FONT_FAMILY,
      color: '#ffffff',
    }).setAlpha(0.3).setDepth(999);

    // ── 키 바인딩 ──────────────────────────────────────────
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      // CHRONO-S25: 'D' 키 → 선택된 Dual Tech 후보 발동
      // CHRONO-S36: Shift+D → 다음 후보로 cycle
      this.input.keyboard.on('keydown-D', (e: KeyboardEvent) => {
        if (e.shiftKey) {
          this._cycleDualTechSelection();
        } else {
          this._triggerFirstDualTech();
        }
      });
      // CHRONO-S63: 'T' 키 → 선택된 Triple Tech 후보 발동
      // CHRONO-S87: Shift+T → 다음 후보 cycle
      this.input.keyboard.on('keydown-T', (e: KeyboardEvent) => {
        if (e.shiftKey) {
          this._cycleTripleTechSelection();
        } else {
          this._triggerFirstTripleTech();
        }
      });
      // UX(#6): 숫자키 1~6 → 스킬바 슬롯 직접 사용(스킬바가 그려둔 1~6 단축키 라벨이 실제 동작하도록).
      ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'].forEach((key, i) => {
        this.input.keyboard!.on(`keydown-${key}`, () => this._useSkill(i));
      });
      // UX(rank18): 전투 페이싱 컨트롤 키보드 등가 — A=AUTO 토글, F=속도 cycle, M=ATB 모드 cycle.
      this.input.keyboard.on('keydown-A', () => this._toggleAuto());
      this.input.keyboard.on('keydown-F', () => this._cycleSpeed());
      this.input.keyboard.on('keydown-M', () => this._cycleAtbMode());
    }

    // ── 전투 UI (스킬바, 로그) ────────────────────────────────
    try { this.battleUI = new BattleUI(this, this.skillSlots); } catch (e) { console.warn('[Battle] BattleUI init error:', e); }

    // ── 상태이상 렌더러 + 콤보 UI ───────────────────────────
    try {
      this.statusEffectRenderer = new StatusEffectRenderer(this);
      for (const us of this.allSprites) {
        this.statusEffectRenderer.registerUnit(us.unit.id);
      }
    } catch (e) { console.warn('[Battle] StatusEffectRenderer init error:', e); }

    try { this.comboUI = new ComboUI(this); } catch (e) { console.warn('[Battle] ComboUI init error:', e); }

    // ── 서버 연동 ──────────────────────────────────────────
    if (this._shouldUseServerCombat()) {
      this._startServerCombat();
      this._setupCombatSocket();
    } else {
      this.battleUI?.addLog('[로컬] 비로그인 전투 모드');
    }

    // ── Auto / Speed / ATB모드 버튼 ─────────────────────────
    // UX(rank18): 콜백을 명명 메서드로 추출해 마우스 클릭과 키보드 핫키(A/F/M)가 단일 진입점 공유.
    //   라벨에 핫키 힌트 병기('전키보드 UI' 목표 — 전투 페이싱 컨트롤도 키보드 등가).
    this._addBattleSceneFrame(scW - 340 + 67, UI_PANEL_Y + 34, 134, 36, BATTLE_SCENE_UI_FRAME_TEXTURES.paceButton, 0x222244, 0.9, 0x88aaff, 1, 199);
    this.autoButton = this.add.text(scW - 220, UI_PANEL_Y + 20, 'AUTO: OFF (A)', {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: '#888888',
      padding: { x: 6, y: 3 },
    }).setDepth(201).setInteractive({ useHandCursor: true });
    this.autoButton.on('pointerdown', () => this._toggleAuto());

    this._addBattleSceneFrame(scW - 220 + 58, UI_PANEL_Y + 34, 116, 36, BATTLE_SCENE_UI_FRAME_TEXTURES.paceButton, 0x222244, 0.9, 0x88aaff, 1, 199);
    this.speedButton = this.add.text(scW - 100, UI_PANEL_Y + 20, '1x (F)', {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: '#88ccff',
      padding: { x: 6, y: 3 },
    }).setDepth(201).setInteractive({ useHandCursor: true });
    this.speedButton.on('pointerdown', () => this._cycleSpeed());

    this._addBattleSceneFrame(scW - 100 + 36, UI_PANEL_Y + 34, 72, 36, BATTLE_SCENE_UI_FRAME_TEXTURES.paceButton, 0x222244, 0.9, 0x88aaff, 1, 199);
    this.atbModeButton = this.add.text(scW - 340, UI_PANEL_Y + 20, `MODE: ${this.atbMode} (M)`, {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: '#c8a2ff',
      padding: { x: 6, y: 3 },
    }).setDepth(201).setInteractive({ useHandCursor: true });
    this.atbModeButton.on('pointerdown', () => this._cycleAtbMode());
    this._writeBattlePaceFrameQaProbe();

    // ── 인트로 연출 ─────────────────────────────────────────
    this._playIntro();
    this._startBattleResultFrameQa();
    this._startBattleResultLeadQa();
  }

  private _addBattleSceneFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof BATTLE_SCENE_UI_FRAME_TEXTURES[keyof typeof BATTLE_SCENE_UI_FRAME_TEXTURES],
    fallbackColor: number,
    fallbackAlpha: number,
    strokeColor: number,
    strokeWidth = 2,
    depth?: number,
    container?: Phaser.GameObjects.Container,
  ): BattleSceneFrameRender {
    const addObject = (object: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle => {
      if (depth !== undefined) {
        object.setDepth(depth);
      }
      if (container) {
        container.add(object);
      }
      return object;
    };

    if (this.textures.exists(texture.key)) {
      const frame = this.add.image(x, y, texture.key)
        .setName(`battle_scene_ui_frame_${texture.key}`)
        .setDisplaySize(width, height)
        .setAlpha(0.9);
      addObject(frame);
      this.battleSceneFrameQaRenderedCounts.set(texture.key, (this.battleSceneFrameQaRenderedCounts.get(texture.key) ?? 0) + 1);
      const stroke = this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setName(`battle_scene_ui_frame_stroke_${texture.key}`)
        .setStrokeStyle(strokeWidth, strokeColor);
      addObject(stroke);
      return { primary: frame, stroke };
    }

    // Aseprite battle scene UI frame 로드 실패 시에만 사용하는 안전 fallback.
    const fallback = this.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
      .setName(`battle_scene_ui_frame_fallback_${texture.key}`)
      .setStrokeStyle(strokeWidth, strokeColor);
    addObject(fallback);
    return { primary: fallback };
  }

  private _addFieldAmbientIcon(
    x: number,
    y: number,
    resource: BattleCommandIconResource,
    kind: BattleFieldAmbientIconKind,
  ): Phaser.GameObjects.Image {
    const icon = this.add.image(x, y, resource.key)
      .setOrigin(0.5)
      .setDepth(251)
      .setName(`battle_field_ambient_${kind}_icon`);
    icon.setDisplaySize(18, 18);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.fieldAmbientIcons.push(icon);
    return icon;
  }

  private _addComboTechButtonIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    name: 'dual' | 'triple',
    iconId: string,
  ): Phaser.GameObjects.Image | undefined {
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (!iconResource || !this.textures.exists(iconResource.key)) return undefined;

    const icon = this.add.image(x, y, iconResource.key)
      .setName(`battle_combo_tech_button_icon_${name}`)
      .setOrigin(0.5);
    icon.setDisplaySize(18, 18);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(icon);
    container.setData('icon', icon);
    this.comboTechButtonIcons.push(icon);
    return icon;
  }

  private _bindComboTechButtonParts(
    container: Phaser.GameObjects.Container,
    frame: BattleSceneFrameRender,
    label: Phaser.GameObjects.Text,
  ): void {
    container.setData('framePrimary', frame.primary);
    container.setData('frameStroke', frame.stroke);
    container.setData('label', label);
  }

  private _getComboTechButtonLabel(container: Phaser.GameObjects.Container | null): Phaser.GameObjects.Text | undefined {
    return container?.getData('label') as Phaser.GameObjects.Text | undefined;
  }

  private _hasComboTechButtonIcon(container: Phaser.GameObjects.Container | null): boolean {
    return container?.getData('icon') instanceof Phaser.GameObjects.Image;
  }

  private _setComboTechButtonAccent(
    container: Phaser.GameObjects.Container | null,
    tint: number,
    fallbackAlpha: number,
    strokeWidth: number,
  ): void {
    const primary = container?.getData('framePrimary') as Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | undefined;
    const stroke = container?.getData('frameStroke') as Phaser.GameObjects.Rectangle | undefined;

    if (primary instanceof Phaser.GameObjects.Image) {
      primary.setTint(tint);
      primary.setAlpha(0.92);
    } else {
      primary?.setFillStyle(tint, fallbackAlpha);
    }
    stroke?.setStrokeStyle(strokeWidth, tint);
  }

  // ─── 전투 페이싱 컨트롤(AUTO/속도/ATB모드) — 마우스 버튼 + 키보드 핫키 단일 진입점 ───
  private _toggleAuto(): void {
    this.autoMode = !this.autoMode;
    this.autoButton?.setText(this.autoMode ? 'AUTO: ON (A)' : 'AUTO: OFF (A)');
    this.autoButton?.setColor(this.autoMode ? '#44ff44' : '#888888');
    if (this.autoMode) {
      this._closeCommandMenu();
      this._closeSubMenu();
      if (this.activeCommander) {
        this.commandQueue.unshift(this.activeCommander);
        this.activeCommander = null;
        this._clearActiveIndicator(); // UX(rank8): AUTO 전환 시 주인 없는 펄싱 ▼ 제거(_endTurn 만 호출하던 누수)
      }
      this.battleUI?.addLog('⚙ [AUTO] 자동 전투 ON (×1.5)');
    } else {
      this.battleUI?.addLog('⚙ [AUTO] 자동 전투 OFF');
    }
  }

  private _cycleSpeed(): void {
    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : this.speedMultiplier === 2 ? 3 : 1;
    this.speedButton?.setText(`${this.speedMultiplier}x (F)`);
  }

  private _cycleAtbMode(): void {
    this.atbMode = this.atbMode === 'WAIT' ? 'ACTIVE' : this.atbMode === 'ACTIVE' ? 'SEMI' : 'WAIT';
    this.atbModeButton?.setText(`MODE: ${this.atbMode} (M)`);
    // UX(rank9): raw enum 만 반복하던 라벨/로그에 동작 설명 병기(_isATBTimelineFrozen 의 실제 분기와 일치).
    const desc = this.atbMode === 'WAIT' ? '메뉴/조준 중 정지'
      : this.atbMode === 'ACTIVE' ? '항상 실시간'
      : '조준 중만 정지';
    this.battleUI?.addLog(`⏱ ATB 모드: ${this.atbMode} — ${desc}`);
  }

  update(_time: number, delta: number): void {
    this.phaseText?.setText(`phase: ${this.phase}`);
    if (this.phase === 'intro') return;
    if (this.phase !== 'fighting') {
      this.effectManager?.update(delta);
      return;
    }

    // ATB 게이지 업데이트
    this._updateATB(delta);

    // 키보드 입력 처리
    this._handleKeyboardInput();

    // 적 AI (ATB가 찬 적은 자동 행동)
    this._processEnemyAI();

    // UX(#9): HP 표시값을 실제 hp 로 부드럽게 보간(드레인)
    this._lerpDisplayedHp(delta);

    // 상태 패널 갱신
    this._updateStatusPanel();
    this._updateEnemyHpBars();

    // 전투 종료 판정
    this._checkBattleEnd();

    // 이펙트 업데이트
    this.effectManager?.update(delta);
    this.statusEffectRenderer?.update(delta);
    this.comboUI?.update(delta);
    // UX(rank14): 활성 commander MP(내 턴 아니면 null)를 스킬바에 push — 누르기 전 MP부족/내턴아님 dim.
    this.battleUI?.setSkillAvailability(this.activeCommander ? (this.activeCommander.unit.mp ?? 0) : null);
    this.battleUI?.update(delta);
  }

  // ─── 인트로 연출 ─────────────────────────────────────────────

  private _playIntro(): void {
    const { width: scW, height: scH } = this.cameras.main;

    // 화면 페이드인
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const introIconResource = getSpriteResourceForSkillIcon(BATTLE_INTRO_ICON_ID);
    const hasIntroIcon = Boolean(introIconResource && this.textures.exists(introIconResource.key));
    const introContainer = this.add.container(scW / 2, scH / 2 - 40)
      .setAlpha(0)
      .setDepth(500)
      .setName('battle_intro_start_container');

    if (hasIntroIcon && introIconResource) {
      const introIcon = this.add.image(-132, 0, introIconResource.key)
        .setOrigin(0.5)
        .setName('battle_intro_start_icon');
      introIcon.setDisplaySize(34, 34);
      introIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      introContainer.add(introIcon);
      this.battleIntroIcon = introIcon;
    } else {
      this.battleIntroIconFallbackRendered = true;
    }

    const introTextLabel = hasIntroIcon ? '전투 시작!' : '⚔ 전투 시작!';
    const introText = this.add.text(hasIntroIcon ? 18 : 0, 0, introTextLabel, {
      fontSize: '36px',
      fontFamily: FONT_FAMILY,
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setName('battle_intro_start_text');
    introContainer.add(introText);
    this._writeBattleIntroIconQaProbe({ hasIntroIcon, introText });

    this.tweens.add({
      targets: introContainer,
      alpha: 1,
      y: scH / 2 - 60,
      duration: 400,
      ease: 'Back.easeOut',
      hold: 600,
      yoyo: true,
      onComplete: () => {
        introContainer.destroy();
        this.introFallbackTimer?.remove();
        this._startFighting();
      },
    });

    // Fallback: 3초 안에 tween이 완료되지 않으면 강제 전환
    this.introFallbackTimer = this.time.delayedCall(3000, () => {
      if (this.phase === 'intro') {
        introContainer.destroy();
        this._startFighting();
      }
    });
  }

  private _writeBattleIntroIconQaProbe({
    hasIntroIcon,
    introText,
  }: {
    hasIntroIcon: boolean;
    introText: Phaser.GameObjects.Text;
  }): void {
    if (this._initData.battleIntroIconQa !== true || typeof document === 'undefined') return;

    const introIconResource = getSpriteResourceForSkillIcon(BATTLE_INTRO_ICON_ID);
    const missingIntroIconKeys = hasIntroIcon
      ? []
      : [introIconResource?.key ?? BATTLE_INTRO_ICON_ID];
    const legacyGlyphPresent = introText.text.includes('⚔');

    document.body.dataset.aeternaBattleIntroIconQa = JSON.stringify({
      status: hasIntroIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      introText: introText.text,
      legacyGlyphPresent,
      introIcon: {
        iconId: BATTLE_INTRO_ICON_ID,
        key: introIconResource?.key ?? null,
        path: introIconResource?.path ?? null,
        renderedCount: this.battleIntroIcon?.active === true ? 1 : 0,
        displaySizes: this.battleIntroIcon
          ? [{ width: this.battleIntroIcon.displayWidth, height: this.battleIntroIcon.displayHeight }]
          : [],
        fallbackRendered: this.battleIntroIconFallbackRendered,
      },
      missingIntroIconKeys,
    });
  }

  private _startFighting(): void {
    this.phase = 'fighting';
    this.battleUI?.addLog('⚔️ 전투 시작!');
    // 첫 프레임 ATB 킥: 각 유닛에 5~20 랜덤 시작값
    for (const us of this.allSprites) {
      if (!us.isDead) {
        us.atb = Phaser.Math.Between(5, 20);
      }
    }

    if (this._initData.battleSubMenuFocusIconQa) {
      const firstAlly = this.allySprites.find((us) => !us.isDead);
      if (firstAlly) {
        firstAlly.atb = ATB_MAX;
        this.commandQueue = [];
        this._openCommandMenu(firstAlly);
        if (this._initData.battleSubMenuFocusIconQa === 'item') {
          this._showItemSubMenu();
        } else {
          this._showMagicSubMenu();
        }
      } else {
        this._writeBattleSubMenuFocusIconQaProbe(this._initData.battleSubMenuFocusIconQa);
      }
      return;
    }

    if (this._initData.battleCommandFocusIconQa === true) {
      const firstAlly = this.allySprites.find((us) => !us.isDead);
      if (firstAlly) {
        firstAlly.atb = ATB_MAX;
        this.commandQueue = [];
        this._openCommandMenu(firstAlly);
      } else {
        this._writeBattleCommandFocusIconQaProbe();
      }
    }
  }

  // ─── ATB 시스템 ──────────────────────────────────────────────

  private _updateATB(delta: number): void {
    if (this._isATBTimelineFrozen()) {
      return;
    }

    const dt = (delta / 1000) * this.speedMultiplier;
    const autoSpeedBonus = this.autoMode ? 1.5 : 1;

    for (const us of this.allSprites) {
      if (us.isDead) continue;
      if (us.atb >= ATB_MAX) continue;

      // 행동 중인 캐릭터는 ATB 정지
      if (us === this.activeCommander) continue;

      const speed = (us.unit.attackSpeed ?? 1.0) * ATB_SPEED_BASE * autoSpeedBonus;
      us.atb = Math.min(ATB_MAX, us.atb + speed * dt);

      // ATB가 찬 아군 → 커맨드 큐에 추가
      if (us.atb >= ATB_MAX && us.isAlly) {
        if (!this.commandQueue.includes(us)) {
          this.commandQueue.push(us);
        }
      }
    }

    // 아군 ATB 시각: 밝기 조절
    for (const us of this.allySprites) {
      if (us.isDead) {
        us.sprite.setAlpha(0.3);
        us.defendIcon?.destroy(); // UX(rank13): 방어 중 사망 시 아이콘 정리
        us.defendIcon = undefined;
        continue;
      }
      if (us.atb >= ATB_MAX) {
        // 행동 가능: 밝게
        if (this._canTint(us.sprite)) us.sprite.clearTint();
        us.sprite.setAlpha(1.0);
      } else {
        // 충전 중: 어둡게
        if (this._canTint(us.sprite)) us.sprite.setTint(0x666666);
        us.sprite.setAlpha(0.7);
      }
      // UX(rank13/17): 방어 아이콘이 sprite(부유 트윈) 를 매프레임 추종 — 허공 고정 방지.
      us.defendIcon?.setPosition(us.sprite.x, us.sprite.y - 70);
    }

    // UX(rank16): 아군 위급(살아있는 아군 중 HP<25% 존재) 감지 — 진입 엣지에 1회 경고음 + 가장자리 비네트.
    //   실시간 ATB 라 작은 상태패널 색 변화를 놓치면 전멸 가능. 색/소리 신호라 reduce-motion 무관(펄스만 모션 게이트).
    const danger = this.allySprites.some(a => !a.isDead && a.unit.maxHp > 0 && a.unit.hp / a.unit.maxHp < 0.25);
    if (danger && !this._allyInDanger) playSfx(this, 'sfx_ui_error', 0.4); // 진입 엣지에서만 1회
    this._allyInDanger = danger;
    this._updateDangerVignette();

    // 스킬 쿨다운 감소
    for (const skill of this.skillSlots) {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - dt);
      }
    }

    // 커맨드 큐에서 다음 캐릭터의 메뉴 표시 (또는 자동 전투)
    if (!this.activeCommander && !this.targetSelectMode && this.commandQueue.length > 0) {
      if (this.autoMode) {
        const next = this.commandQueue.shift()!;
        const livingEnemies = this.enemySprites.filter(e => !e.isDead);
        const livingAllies = this.allySprites.filter(a => !a.isDead);
        if (livingEnemies.length > 0) {
          // 사용 가능한 스킬 찾기 (쿨다운 0 + MP 충분 + 데미지 > 0)
          const availableSkill = this.skillSlots.find(s =>
            s.currentCooldown <= 0 &&
            s.mpCost > 0 &&
            s.damage > 0 &&
            next.unit.mp >= s.mpCost
          );

          // 힐 스킬 확인 (아군 HP가 40% 이하일 때)
          const healSkill = this.skillSlots.find(s =>
            s.currentCooldown <= 0 &&
            s.mpCost > 0 &&
            s.damage < 0 && // 음수 데미지 = 힐
            next.unit.mp >= s.mpCost
          );
          const needHeal = livingAllies.some(a => a.unit.hp < a.unit.maxHp * 0.4);

          if (needHeal && healSkill) {
            // 힐이 필요하면 HP 가장 낮은 아군에게 힐
            const healTarget = livingAllies.reduce((a, b) =>
              (a.unit.hp / a.unit.maxHp) < (b.unit.hp / b.unit.maxHp) ? a : b
            );
            this._performSkill(next, healTarget, healSkill);
          } else if (availableSkill && Math.random() < 0.6) {
            // 60% 확률로 스킬 사용 (HP 가장 낮은 적 타겟)
            const target = livingEnemies.reduce((a, b) => a.unit.hp < b.unit.hp ? a : b);
            this._performSkill(next, target, availableSkill);
          } else {
            // 기본 공격 (HP 가장 낮은 적)
            const target = livingEnemies.reduce((a, b) => a.unit.hp < b.unit.hp ? a : b);
            this._performAttack(next, target);
          }
          next.atb = 0;
        }
      } else {
        const next = this.commandQueue.shift()!;
        this._openCommandMenu(next);
      }
    }
  }

  /**
   * UX(rank16): 아군 위급 시 화면 가장자리 붉은 비네트. 첫 위급 진입에 lazy 생성(가장자리로 진해지는
   * 테두리 근사). 위급 중엔 alpha 펄스(reduce-motion 이면 정적 — 색 신호는 유지). 회복 시 alpha 0.
   */
  private _updateDangerVignette(): void {
    if (this._allyInDanger && !this._dangerVignette) {
      const { width, height } = this.cameras.main;
      const g = this.add.graphics().setDepth(390).setScrollFactor(0);
      for (const b of [{ inset: 0, lw: 6, a: 0.5 }, { inset: 9, lw: 10, a: 0.28 }, { inset: 22, lw: 16, a: 0.13 }]) {
        g.lineStyle(b.lw, 0xff0000, b.a);
        g.strokeRect(b.inset, b.inset, width - b.inset * 2, height - b.inset * 2);
      }
      this._dangerVignette = g;
    }
    if (!this._dangerVignette) return;
    const alpha = this._allyInDanger
      ? (isScreenShakeEnabled() ? 0.5 + 0.5 * Math.abs(Math.sin(this.time.now / 350)) : 0.85)
      : 0;
    this._dangerVignette.setAlpha(alpha);
  }

  private _isATBTimelineFrozen(): boolean {
    if (this.atbFrozenByConnection) return true; // UX(#13): 연결 끊김 중엔 전투 정지

    if (this.atbMode === 'ACTIVE') {
      return false;
    }

    if (this.atbMode === 'SEMI') {
      return this.targetSelectMode;
    }

    return this.activeCommander !== null
      || this.targetSelectMode
      || this.cmdMenuContainer !== null
      || this.cmdSubMenu !== null;
  }

  // ─── 커맨드 메뉴 ─────────────────────────────────────────────

  private _openCommandMenu(us: UnitSprite): void {
    this.activeCommander = us;
    this.cmdMenuIndex = 0;

    // UX(#4): 행동 주체 sprite 위에 펄싱 화살표(누구 턴인지 sprite 레벨 가시화)
    this._showActiveIndicator(us);

    // 기존 메뉴 제거
    this._closeCommandMenu();

    const container = this.add.container(CMD_MENU_X, CMD_MENU_Y).setDepth(200);
    this.battleCommandFocusIconFallbackRendered = false;
    this.battleCommandFocusTexts = [];

    // 메뉴 배경 — 5 commands in a row, compact
    const menuW = COMMANDS.length * 120 + 20;
    const menuH = 50;
    this._addBattleSceneFrame(
      menuW / 2,
      menuH / 2,
      menuW,
      menuH,
      BATTLE_SCENE_UI_FRAME_TEXTURES.commandMenu,
      0x0a0a3e,
      0.92,
      0x4466aa,
      2,
      undefined,
      container,
    );

    const commandFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_COMMAND_FOCUS_ICON_ID);
    if (commandFocusIconResource && this.textures.exists(commandFocusIconResource.key)) {
      this.battleCommandFocusIcon = this._addBattleCommandFocusIcon(
        container,
        12,
        24,
        commandFocusIconResource,
      ).setVisible(false);
    } else {
      this.battleCommandFocusIcon = null;
      this.battleCommandFocusIconFallbackRendered = true;
    }

    // 캐릭터 이름 표시 (위)
    const nameLabel = this.add.text(menuW / 2, -2, `${us.unit.name}`, {
      fontSize: '11px',
      fontFamily: FONT_FAMILY,
      color: '#ffcc44',
    }).setOrigin(0.5, 1);
    container.add(nameLabel);

    // 커맨드 항목 — horizontal row
    this.cmdMenuTexts = [];
    COMMANDS.forEach((cmd, i) => {
      const itemX = 16 + i * 120;
      const commandIconResource = getBattleCommandIconResource(cmd);
      const hasCommandIcon = Boolean(commandIconResource && this.textures.exists(commandIconResource.key));
      if (commandIconResource && hasCommandIcon) {
        const icon = this.add.image(itemX + 12, 24, commandIconResource.key)
          .setOrigin(0.5)
          .setName(`battle_command_icon_${cmd.type}`)
          .setInteractive({ useHandCursor: true });
        icon.setDisplaySize(20, 20);
        icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        icon.on('pointerdown', () => {
          this.cmdMenuIndex = i;
          this._executeCommand(COMMANDS[i].type);
        });
        icon.on('pointerover', () => {
          this.cmdMenuIndex = i;
          this._highlightCommand();
        });
        container.add(icon);
      }

      const label = hasCommandIcon ? cmd.label : cmd.fallbackLabel;
      const text = this.add.text(hasCommandIcon ? itemX + 28 : itemX, 16, label, {
        fontSize: '14px',
        fontFamily: FONT_FAMILY,
        color: '#ffffff',
      }).setInteractive({ useHandCursor: true });
      text.setData('commandLabel', label);
      text.setData('commandFocusX', itemX - 4);
      text.setData('commandFocusY', 24);

      text.on('pointerdown', () => {
        this.cmdMenuIndex = i;
        this._executeCommand(COMMANDS[i].type);
      });

      text.on('pointerover', () => {
        this.cmdMenuIndex = i;
        this._highlightCommand();
      });

      container.add(text);
      this.cmdMenuTexts.push(text);
    });
    this.battleCommandFocusTexts = this.cmdMenuTexts;

    this.cmdMenuContainer = container;
    this._highlightCommand();
  }

  private _highlightCommand(): void {
    this.cmdMenuTexts.forEach((t, i) => {
      const label = (t.getData('commandLabel') as string | undefined) ?? COMMANDS[i].fallbackLabel;
      const target = {
        text: t,
        label,
        x: Number(t.getData('commandFocusX') ?? 12),
        y: Number(t.getData('commandFocusY') ?? 24),
      };
      if (i === this.cmdMenuIndex) {
        this._renderBattleCommandFocus({ activeIndex: i, target });
        return;
      }
      t.setText(label).setColor('#ffffff');
    });
  }

  private _closeCommandMenu(): void {
    this.cmdMenuContainer?.destroy();
    this.cmdMenuContainer = null;
    this.cmdMenuTexts = [];
    this.battleCommandFocusIcon = null;
    this.battleCommandFocusTexts = [];
  }

  private _renderBattleCommandFocus({
    activeIndex,
    target,
  }: {
    activeIndex: number;
    target: {
      text: Phaser.GameObjects.Text;
      label: string;
      x: number;
      y: number;
    };
  }): void {
    const focusIcon = this.battleCommandFocusIcon?.active === true
      ? this.battleCommandFocusIcon
      : null;

    if (focusIcon) {
      target.text.setText(target.label).setColor('#ffff00');
      focusIcon.setPosition(target.x, target.y).setVisible(true);
    } else {
      target.text.setText(`▶ ${target.label}`).setColor('#ffff00');
      this.battleCommandFocusIconFallbackRendered = true;
    }

    this._writeBattleCommandFocusIconQaProbe(activeIndex);
  }

  private _addBattleCommandFocusIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: BattleCommandIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('battle_command_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(focusIcon);
    return focusIcon;
  }

  // UX(#4): 행동 주체 sprite 위 펄싱 화살표 표시/제거
  private _showActiveIndicator(us: UnitSprite): void {
    this._clearActiveIndicator();
    const spriteH = us.sprite.displayHeight ?? 60;
    const indicatorY = us.sprite.y - spriteH / 2 - 30;
    const activeIndicatorResource = getSpriteResourceForSkillIcon(BATTLE_ACTIVE_INDICATOR_ICON_ID);
    if (activeIndicatorResource && this.textures.exists(activeIndicatorResource.key)) {
      const indicator = this.add.image(us.sprite.x, indicatorY, activeIndicatorResource.key)
        .setOrigin(0.5)
        .setDepth(160)
        .setName('battle_active_turn_indicator');
      indicator.setDisplaySize(28, 28);
      indicator.setAngle(90);
      indicator.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.activeIndicator = indicator;
    } else {
      // Aseprite active turn indicator image 로드 실패 시에만 사용하는 안전 fallback.
      this.activeIndicator = this.add.text(us.sprite.x, indicatorY, '▼', {
        fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ffee44',
        stroke: '#000000', strokeThickness: 3,
      }).setOrigin(0.5).setDepth(160).setName('battle_active_turn_indicator_fallback');
    }

    const arrow = this.activeIndicator;
    this.activeIndicatorTween = this.tweens.add({
      targets: arrow,
      y: arrow.y - 6,
      alpha: { from: 1, to: 0.5 },
      duration: 480, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  private _clearActiveIndicator(): void {
    this.activeIndicatorTween?.remove();
    this.activeIndicatorTween = null;
    this.activeIndicator?.destroy();
    this.activeIndicator = null;
  }

  private _closeSubMenu(): void {
    this.cmdSubMenu?.destroy();
    this.cmdSubMenu = null;
    this.subMenuItems = [];
    this.subMenuIndex = 0;
    this.battleSubMenuFocusIcon = null;
    this.battleSubMenuFocusIconFallbackRendered = false;
    this.battleSubMenuFocusTexts = [];
  }

  // ─── 커맨드 실행 ──────────────────────────────────────────────

  private _executeCommand(type: CommandType): void {
    switch (type) {
      case 'attack':
        this._enterTargetSelect(this.enemySprites.filter(e => !e.isDead), (target) => {
          if (this.activeCommander) this._performAttack(this.activeCommander, target);
          this._endTurn();
        });
        break;

      case 'magic':
        this._showMagicSubMenu();
        break;

      case 'item':
        this._showItemSubMenu();
        break;

      case 'defend':
        if (this.activeCommander) this._performDefend(this.activeCommander);
        this._endTurn();
        break;

      case 'flee':
        this._attemptFlee();
        break;
    }
  }

  // ─── 타겟 선택 모드 ──────────────────────────────────────────

  private _enterTargetSelect(candidates: UnitSprite[], callback: (target: UnitSprite) => void, previewSkill?: SkillSlot): void {
    this._closeCommandMenu();
    this.targetSelectMode = true;
    this.targetCandidates = candidates;
    this.targetIndex = 0;
    this.targetSelectCallback = callback;
    this._previewSkill = previewSkill; // UX(#12-ext): 스킬 경로면 미리보기를 스킬 데미지로 계산

    // 마우스 클릭 타겟팅
    for (const c of candidates) {
      c.sprite.removeAllListeners('pointerdown');
      c.sprite.on('pointerdown', () => {
        this._confirmTarget(c);
      });
      if (c.sprite.input) c.sprite.input.cursor = 'pointer'; // UX(rank11): 지금 클릭 가능한 대상만 손가락 커서
    }

    this._drawTargetCursor();
  }

  private _drawTargetCursor(): void {
    this.targetCursor?.clear();
    if (!this.targetSelectMode || this.targetCandidates.length === 0) return;

    const target = this.targetCandidates[this.targetIndex];
    if (!target) { this.targetPreviewText?.setVisible(false); return; }

    this.targetCursor?.lineStyle(2, 0xffff00, 1);
    this.targetCursor?.strokeTriangle(
      target.sprite.x, target.sprite.y - 50,
      target.sprite.x - 8, target.sprite.y - 60,
      target.sprite.x + 8, target.sprite.y - 60,
    );

    // UX(#12): 적 타겟이면 예상 데미지 + KILL 미리보기(확정 전이라 실행과 무관·안전).
    // 적 HP 바(#1)와 결합해 '마무리 가능' 적이 한눈에.
    // UX(#12-ext): 펜딩 스킬이 있으면 스킬 공식(방어 무시 damage + attack×scale)으로, 없으면 기본공격(attack−defense).
    //   _performSkill 의 baseDmg 와 동일 — 분산(0.9~1.1)·콤보는 미반영한 기대값(타겟 시점엔 미정).
    if (!target.isAlly && this.activeCommander) {
      const atk = this.activeCommander.unit.attack ?? 0;
      const skill = this._previewSkill;
      const expected = skill
        ? Math.max(1, Math.round(skill.damage + atk * (skill.damageScale ?? 1)))
        : Math.max(1, atk - (target.unit.defense ?? 0));
      const isKill = target.unit.hp <= expected;
      if (!this.targetPreviewText) {
        this.targetPreviewText = this.add.text(0, 0, '', {
          fontSize: '11px', fontFamily: FONT_FAMILY, stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5).setDepth(8002);
      }
      this.targetPreviewText
        .setText(isKill ? `~${expected} 💀KILL` : `~${expected}`)
        .setColor(isKill ? '#ff5555' : '#ffffff')
        .setPosition(target.sprite.x, target.sprite.y - 72)
        .setVisible(true);
    } else {
      this.targetPreviewText?.setVisible(false);
    }
  }

  private _confirmTarget(target: UnitSprite): void {
    this.targetSelectMode = false;
    this.targetCursor?.clear();
    this.targetPreviewText?.setVisible(false); // UX(#12)
    this._previewSkill = undefined; // UX(#12-ext)
    this.targetSelectCallback?.(target);
    this.targetSelectCallback = null;

    // 클릭 리스너 복원
    for (const c of this.targetCandidates) {
      c.sprite.removeAllListeners('pointerdown');
      if (c.sprite.input) c.sprite.input.cursor = ''; // UX(rank11): 타겟 확정 후 손가락 커서 해제
    }
    this.targetCandidates = [];
  }

  private _cancelTargetSelect(): void {
    this.targetSelectMode = false;
    this.targetCursor?.clear();
    this.targetPreviewText?.setVisible(false); // UX(#12)
    this._previewSkill = undefined; // UX(#12-ext)
    this.targetSelectCallback = null;
    for (const c of this.targetCandidates) {
      c.sprite.removeAllListeners('pointerdown');
      if (c.sprite.input) c.sprite.input.cursor = ''; // UX(rank11): 취소 시 손가락 커서 해제
    }
    this.targetCandidates = [];
    // 커맨드 메뉴 재오픈
    if (this.activeCommander) {
      this._openCommandMenu(this.activeCommander);
    }
  }

  // ─── 턴 종료 ─────────────────────────────────────────────────

  private _endTurn(): void {
    if (this.activeCommander) {
      this.activeCommander.atb = 0;
    }
    this.activeCommander = null;
    this._clearActiveIndicator(); // UX(#4)
    this._closeCommandMenu();
    this._closeSubMenu();
  }

  // ─── 전투 행동 ───────────────────────────────────────────────

  private _performAttack(attacker: UnitSprite, target: UnitSprite): void {
    // B-S2: passive evasion / hit_chance 미러 — miss 판정
    if (rollMiss(attacker.unit as PassiveCombatantClient, target.unit as PassiveCombatantClient)) {
      this._spawnMissText(target.sprite.x, target.sprite.y);
      this.battleUI?.addLog(`${attacker.unit.name} → ${target.unit.name} : MISS!`);
      this._flashSprite(target);
      // UX(rank4): 빗나감 피드백 — 헛스윙 whiff(저볼륨 slash) + 회피 보이스. 이전엔 무음이었다.
      playSfx(this, 'sfx_combat_slash', 0.25);
      playSfx(this, COMBAT_VOICE.DODGE, 0.5);
      return;
    }

    const rawDmg = Math.max(1, attacker.unit.attack - (target.unit.defense ?? 0));
    const isCritical = Math.random() < 0.15;
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.round(rawDmg * variance * (isCritical ? 1.8 : 1));

    // 서버 동기화
    this.combatManager?.requestAttack(attacker.unit.id, target.unit.id, dmg);

    // 로컬 적용
    target.unit.hp = Math.max(0, target.unit.hp - dmg);

    // 데미지 팝업 (FF6 스타일)
    this._spawnDamageNumber(target.sprite.x, target.sprite.y, dmg, isCritical ? 'critical' : 'normal');

    // B-S4: critEcho — crit 시 attacker 의 critEchoPercent 만큼 추가 데미지
    const echoDmg = computeCritEchoDamage(attacker.unit as PassiveCombatantClient, isCritical, dmg);
    if (echoDmg > 0 && target.unit.hp > 0) {
      target.unit.hp = Math.max(0, target.unit.hp - echoDmg);
      this._spawnEchoText(target.sprite.x, target.sprite.y, echoDmg);
      this.battleUI?.addLog(`✨ ECHO! +${echoDmg}`);
    }

    // B-S4: reflect — target 의 reflectPercent 만큼 attacker 에 반사
    const reflectDmg = computeReflectDamage(target.unit as PassiveCombatantClient, dmg);
    if (reflectDmg > 0 && !attacker.isDead) {
      attacker.unit.hp = Math.max(0, attacker.unit.hp - reflectDmg);
      this._spawnReflectText(attacker.sprite.x, attacker.sprite.y, reflectDmg);
      this.battleUI?.addLog(`🛡 반사 → ${attacker.unit.name} : -${reflectDmg}`);
      if (attacker.unit.hp <= 0) this._killUnit(attacker);
    }

    // 히트 이펙트 + 화면 흔들림 (FINDING-A4 ext11: 설정 + reduce-motion 검사). UX(#10): 크리 분기 + 크리 시 shake 강화
    this._showHitVFX(target.sprite.x, target.sprite.y, { crit: isCritical });
    if (isScreenShakeEnabled()) this.cameras.main.shake(isCritical ? 160 : 100, isCritical ? 0.009 : 0.005);

    // SFX + Voice
    if (attacker.isAlly) {
      playSfx(this, 'sfx_combat_slash', 0.6);
      if (isCritical) {
        playSfx(this, COMBAT_VOICE.CRITICAL, 0.7);
      } else {
        playRandomVoice(this, [...COMBAT_VOICE.ATTACK], 0.5);
      }
    } else if (target.isAlly) {
      // UX(rank3): 아군 피격음 — 이전엔 attacker.isAlly 게이트로 '적의 공격'(절반의 전투)이 완전 무음이었다.
      playSfx(this, 'sfx_hit_flesh', isCritical ? 0.7 : 0.55);
      playRandomVoice(this, [...COMBAT_VOICE.HIT], 0.5);
    }
    // UX(rank13): 방어 중 피격 — 데미지는 2배 방어로 이미 경감됨. guard-block 음으로 '막았다' 신호.
    if (target.isDefending) playSfx(this, 'sfx_combat_guard_block', 0.4);

    // 로그
    const critLabel = isCritical ? ' 💥크리티컬!' : '';
    this.battleUI?.addLog(`${attacker.unit.name} → ${target.unit.name} : ${dmg}${critLabel}`);

    // 대상 피격 연출 (번쩍임 + 흔들림)
    this._flashSprite(target);

    // 사망 처리
    if (target.unit.hp <= 0) {
      this._killUnit(target);
    }
  }

  private _performDefend(us: UnitSprite): void {
    // 방어: 일정 시간 방어력 2배. UX(rank13) 버그픽스 — 이전엔 defense += round(defense) 적용 +
    // defense -= round(defense/2) 복원이라, 사이에 defense 가 바뀌거나 3초 내 재방어 시 누적/드리프트했다.
    // baseDefense 스냅샷 + 항상 base 기준 계산 + 토큰 복원으로 멱등화(원본으로 정확히 되돌림).
    if (!us.isDefending) us.baseDefense = us.unit.defense ?? 0; // 방어 중이 아닐 때만 원본 캡처(2배값 재캡처 차단)
    us.isDefending = true;
    const base = us.baseDefense ?? 0;
    us.unit.defense = base > 0 ? base * 2 : 10;
    this.battleUI?.addLog(`🛡 ${us.unit.name} 방어 태세!`);
    playSfx(this, 'sfx_combat_guard_block', 0.5);

    // 머리 위 방어 아이콘 — 자체 수명이 복원 타이밍과 정확히 일치(StatusEffectRenderer 는 combat:tick 의존이라
    // 로컬 전투에서 안 줄어드는 미스매치가 있어 자체 관리). 위치는 아군 update 루프가 매프레임 추종.
    if (!us.defendIcon) {
      const defendIconResource = getStatusIconResource('shield');
      if (defendIconResource && this.textures.exists(defendIconResource.key)) {
        const defendIcon = this.add.image(us.sprite.x, us.sprite.y - 70, defendIconResource.key)
          .setOrigin(0.5)
          .setDepth(8000)
          .setName(`battle_defend_icon_${us.unit.id}`);
        defendIcon.setDisplaySize(28, 28);
        defendIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        us.defendIcon = defendIcon;
      } else {
        us.defendIcon = this.add.text(us.sprite.x, us.sprite.y - 70, '🛡', { fontSize: '20px' })
          .setOrigin(0.5)
          .setDepth(8000)
          .setName(`battle_defend_icon_fallback_${us.unit.id}`);
      }
    }

    const token = ++this._defendCounter;
    us.defendToken = token;
    this.time.delayedCall(3000, () => {
      if (us.defendToken !== token) return; // 더 최신 방어가 있으면 이 타이머는 무효(조기 복원 방지)
      if (!us.isDead) us.unit.defense = us.baseDefense ?? us.unit.defense; // 스냅샷 복원 — 드리프트 없음
      us.isDefending = false;
      us.defendIcon?.destroy();
      us.defendIcon = undefined;
    });
  }

  private _attemptFlee(): void {
    const chance = 0.3 + (this.allySprites.filter(a => !a.isDead).length * 0.1);
    const succeeded = Math.random() < chance;
    // SSOT wiring: 도주 로그 텍스트는 SCENARIO_ESCAPE_NARRATIVES 단일 출처 (escapeNarration)
    this.battleUI?.addLog(composeEscapeLog(escapeOutcomeFromResult(succeeded)));
    if (succeeded) {
      this._closeCommandMenu();
      this.activeCommander = null;
      this.time.delayedCall(500, () => this._exitBattle());
    } else {
      this._endTurn();
    }
  }

  // ─── UX(#6): 스킬바 슬롯 직접 사용 (클릭/숫자키 → 타겟 선택) ───────
  /**
   * 스킬바 슬롯 idx 를 직접 사용한다. BattleUI 슬롯 클릭(_useSkill 호출) + 숫자키 1~6 의 진입점.
   * 이전엔 이 메서드가 없어(grep 0건) 클릭/핫키가 전부 silent no-op 이었다(거짓 어포던스).
   * 본인 턴(activeCommander)이고 타겟 선택 중이 아닐 때만 동작 — 매직 서브메뉴 doSkill 과 동일 경로.
   */
  private _useSkill(idx: number): void {
    if (!this.activeCommander || this.targetSelectMode) return;
    const skill = this.skillSlots[idx];
    if (!skill) return;
    if (skill.currentCooldown > 0) {
      this.battleUI?.addLog(`⏳ ${skill.name} 쿨다운 중`);
      return;
    }
    if ((this.activeCommander.unit.mp ?? 0) < skill.mpCost) {
      this.battleUI?.addLog(`💧 MP 부족 — ${skill.name}(MP ${skill.mpCost})`);
      return;
    }
    this._closeCommandMenu();
    this._closeSubMenu();
    this._enterTargetSelect(this.enemySprites.filter(e => !e.isDead), (target) => {
      if (this.activeCommander) this._performSkill(this.activeCommander, target, skill);
      this._endTurn();
    }, skill); // UX(#12-ext): 스킬 데미지 미리보기
  }

  // ─── 마법/아이템 서브메뉴 ────────────────────────────────────

  private _showMagicSubMenu(): void {
    this._closeSubMenu();
    this.subMenuItems = [];
    this.subMenuIndex = 0;
    // UX(#12-ext): 쿨다운 중 스킬을 filter 로 숨기지 않고 전부 표시(회색+⏳). 이전엔 목록에서 사라져
    //   "내 스킬 어디 갔지?" 혼란 + 핫키 경로(_useSkill)는 로그를 주는데 서브메뉴는 침묵 — 비대칭 해소.
    const skills = this.skillSlots;

    const menuH = Math.max(80, skills.length * 24 + 30);
    const container = this.add.container(CMD_MENU_X, UI_PANEL_Y - menuH - 4).setDepth(210);
    this._addBattleSceneFrame(
      100,
      menuH / 2,
      220,
      menuH,
      BATTLE_SCENE_UI_FRAME_TEXTURES.magicSubMenu,
      0x0a0a3e,
      0.95,
      0x4466aa,
      2,
      undefined,
      container,
    );

    this.battleSubMenuFocusIconFallbackRendered = false;
    this.battleSubMenuFocusTexts = [];
    const subMenuFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_SUB_MENU_FOCUS_ICON_ID);
    if (subMenuFocusIconResource && this.textures.exists(subMenuFocusIconResource.key)) {
      this.battleSubMenuFocusIcon = this._addBattleSubMenuFocusIcon(
        container,
        8,
        21,
        subMenuFocusIconResource,
      ).setVisible(false);
    } else {
      this.battleSubMenuFocusIcon = null;
      this.battleSubMenuFocusIconFallbackRendered = true;
    }

    if (skills.length === 0) {
      const t = this.add.text(80, 50, '보유한 마법 없음', { fontSize: '12px', color: '#888888', fontFamily: FONT_FAMILY }).setOrigin(0.5);
      container.add(t);
    } else {
      skills.forEach((skill, i) => {
        const onCd = skill.currentCooldown > 0;
        const noMp = (this.activeCommander?.unit.mp ?? 0) < skill.mpCost;
        const usable = !onCd && !noMp;
        // 쿨다운 중이면 남은 초(올림)를, 아니면 MP 코스트를 표기
        const label = onCd
          ? `${skill.name} ⏳${Math.ceil(skill.currentCooldown)}s`
          : `${skill.name} (MP:${skill.mpCost})`;
        const skillIconResource = skill.icon ? getSpriteResourceForSkillIcon(skill.icon) : undefined;
        const hasSkillIcon = Boolean(skillIconResource && this.textures.exists(skillIconResource.key));
        const doSkill = (): void => {
          // 사용 불가 사유를 로그로 알림(핫키 _useSkill 과 동일 메시지 — 두 경로 일관)
          if (onCd) { this.battleUI?.addLog(`⏳ ${skill.name} 쿨다운 중`); return; }
          if (noMp) { this.battleUI?.addLog(`💧 MP 부족 — ${skill.name}(MP ${skill.mpCost})`); return; }
          this._closeSubMenu();
          this._enterTargetSelect(this.enemySprites.filter(e => !e.isDead), (target) => {
            if (this.activeCommander) this._performSkill(this.activeCommander, target, skill);
            this._endTurn();
          }, skill); // UX(#12-ext): 스킬 데미지 미리보기
        };

        let skillIcon: Phaser.GameObjects.Image | undefined;
        if (skillIconResource && hasSkillIcon) {
          skillIcon = this.add.image(22, 21 + i * 24, skillIconResource.key)
            .setOrigin(0.5)
            .setName(`battle_magic_submenu_icon_${skill.skillId}`)
            .setInteractive({ useHandCursor: true });
          skillIcon.setDisplaySize(18, 18);
          skillIcon.setAlpha(usable ? 1 : 0.4);
          skillIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
          skillIcon.on('pointerdown', doSkill);
          skillIcon.on('pointerover', () => {
            this.subMenuIndex = i;
            this._highlightSubMenu();
          });
          container.add(skillIcon);
        }

        const t = this.add.text(hasSkillIcon ? 38 : 10, 15 + i * 24, label, {
          fontSize: '13px', fontFamily: FONT_FAMILY,
          color: usable ? '#88ccff' : '#555555',
        }).setInteractive({ useHandCursor: true });
        t.on('pointerdown', doSkill);
        t.on('pointerover', () => {
          this.subMenuIndex = i;
          this._highlightSubMenu();
        });
        this.subMenuItems.push({
          text: t,
          action: doSkill,
          label,
          focusX: hasSkillIcon ? 8 : -4,
          focusY: 21 + i * 24,
          icon: skillIcon,
        });

        container.add(t);
      });
    }

    // ESC로 닫기 / 키보드 선택(update 폴링)
    this.cmdSubMenu = container;
    this.battleSubMenuFocusTexts = this.subMenuItems.map((item) => item.text);
    this._highlightSubMenu();
  }

  private _showItemSubMenu(): void {
    this._closeSubMenu();
    this.subMenuItems = [];
    this.subMenuIndex = 0;

    const container = this.add.container(CMD_MENU_X, UI_PANEL_Y - 90).setDepth(210);
    this._addBattleSceneFrame(
      100,
      40,
      220,
      80,
      BATTLE_SCENE_UI_FRAME_TEXTURES.itemSubMenu,
      0x0a0a3e,
      0.95,
      0x4466aa,
      2,
      undefined,
      container,
    );

    this.battleSubMenuFocusIconFallbackRendered = false;
    this.battleSubMenuFocusTexts = [];
    const subMenuFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_SUB_MENU_FOCUS_ICON_ID);
    if (subMenuFocusIconResource && this.textures.exists(subMenuFocusIconResource.key)) {
      this.battleSubMenuFocusIcon = this._addBattleSubMenuFocusIcon(
        container,
        20,
        40,
        subMenuFocusIconResource,
      ).setVisible(false);
    } else {
      this.battleSubMenuFocusIcon = null;
      this.battleSubMenuFocusIconFallbackRendered = true;
    }

    // 간이: 포션만 표시
    const itemLabel = '포션 (HP +100)';
    const itemFallbackLabel = '🧪 포션 (HP +100)';
    const itemIconResource = getItemIconResource({ itemIconId: 'ITM-CON-001' });
    const hasItemIcon = Boolean(itemIconResource && this.textures.exists(itemIconResource.key));
    const label = hasItemIcon ? itemLabel : itemFallbackLabel;
    const doItem = (): void => {
      this._closeSubMenu();
      if (!this.activeCommander) return;
      // 아군 대상 선택
      this._enterTargetSelect(this.allySprites.filter(a => !a.isDead), (target) => {
        target.unit.hp = Math.min(target.unit.maxHp, target.unit.hp + 100);
        this._spawnDamageNumber(target.sprite.x, target.sprite.y, 100, 'heal');
        this.battleUI?.addLog(`🧪 ${target.unit.name} HP +100 회복!`);
        playSfx(this, 'sfx_combat_magic_heal', 0.5);
        this._endTurn();
      });
    };
    let itemIcon: Phaser.GameObjects.Image | undefined;
    if (itemIconResource && hasItemIcon) {
      itemIcon = this.add.image(34, 40, itemIconResource.key)
        .setOrigin(0.5)
        .setName('battle_item_submenu_icon_ITM-CON-001')
        .setInteractive({ useHandCursor: true });
      itemIcon.setDisplaySize(18, 18);
      itemIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      itemIcon.on('pointerdown', doItem);
      itemIcon.on('pointerover', () => {
        this.subMenuIndex = 0;
        this._highlightSubMenu();
      });
      container.add(itemIcon);
    }

    const t = this.add.text(hasItemIcon ? 52 : 80, 40, label, { fontSize: '13px', fontFamily: FONT_FAMILY, color: '#88ff88' })
      .setOrigin(hasItemIcon ? 0 : 0.5, 0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerdown', doItem);
    t.on('pointerover', () => {
      this.subMenuIndex = 0;
      this._highlightSubMenu();
    });
    this.subMenuItems.push({
      text: t,
      action: doItem,
      label,
      focusX: hasItemIcon ? 20 : 50,
      focusY: 40,
      icon: itemIcon,
    });
    container.add(t);

    this.cmdSubMenu = container;
    this.battleSubMenuFocusTexts = this.subMenuItems.map((item) => item.text);
    this._highlightSubMenu();
  }

  /** 서브메뉴 선택 표시 — Aseprite focus icon을 먼저 쓰고, 누락 시에만 prefix fallback을 사용한다. */
  private _highlightSubMenu(): void {
    this.subMenuItems.forEach((it, i) => {
      if (i === this.subMenuIndex) {
        this._renderBattleSubMenuFocus({
          activeIndex: i,
          subMenuType: this._getActiveBattleSubMenuType(),
          target: it,
        });
        return;
      }

      it.text.setText(this.battleSubMenuFocusIcon?.active === true ? it.label : `  ${it.label}`);
    });
  }

  private _renderBattleSubMenuFocus({
    activeIndex,
    subMenuType,
    target,
  }: {
    activeIndex: number;
    subMenuType: 'magic' | 'item';
    target: BattleSubMenuItem;
  }): void {
    const focusIcon = this.battleSubMenuFocusIcon?.active === true
      ? this.battleSubMenuFocusIcon
      : null;

    if (focusIcon) {
      target.text.setText(target.label);
      focusIcon.setPosition(target.focusX, target.focusY).setVisible(true);
    } else {
      target.text.setText(`▶ ${target.label}`);
      this.battleSubMenuFocusIconFallbackRendered = true;
    }

    this._writeBattleSubMenuFocusIconQaProbe(subMenuType, activeIndex);
  }

  private _addBattleSubMenuFocusIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: BattleCommandIconResource,
  ): Phaser.GameObjects.Image {
    const focusIcon = this.add.image(x, y, resource.key)
      .setName('battle_submenu_focus_icon')
      .setOrigin(0.5);
    focusIcon.setDisplaySize(14, 14);
    focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(focusIcon);
    return focusIcon;
  }

  private _getActiveBattleSubMenuType(): 'magic' | 'item' {
    return this._initData.battleSubMenuFocusIconQa === 'item' ? 'item' : 'magic';
  }

  private _performSkill(attacker: UnitSprite, target: UnitSprite, skill: SkillSlot): void {
    // MP 차감
    attacker.unit.mp -= skill.mpCost;
    skill.currentCooldown = skill.cooldown;

    // E-S4: 스킬 이력 추가 + 콤보 검출
    this._recordSkillUse(attacker.unit.id, skill.skillId);
    const combo = this._detectCombo(attacker.unit.id);
    let comboBonus = 1.0;
    if (combo) {
      comboBonus = 1 + combo.damageBonus / 100;
      this._spawnComboText(attacker.sprite.x, attacker.sprite.y - 60, combo.name, combo.damageBonus);
      this.battleUI?.addLog(`⚡ 콤보: ${combo.name}! +${combo.damageBonus}%`);
      // UX(#8): ComboUI 중앙 "COMBO!" 연출 배선(이전엔 작은 _spawnComboText 팝업뿐, 354줄 ComboUI dead)
      this.comboUI?.showComboAchieved({
        comboName: combo.name,
        damageBonus: combo.damageBonus,
        bonusDescription: `+${combo.damageBonus}% 데미지`,
      });
      // 콤보 발동 후 이력 리셋 (재사용 방지)
      this._unitSkillHistory.set(attacker.unit.id, []);
    }

    const baseDmg = skill.damage + (attacker.unit.attack * (skill.damageScale ?? 1));
    const variance = 0.9 + Math.random() * 0.2;
    const dmg = Math.round(baseDmg * variance * comboBonus);

    // 서버 동기화
    this.combatManager?.requestSkill(attacker.unit.id, target.unit.id, skill.skillId, dmg);

    // 로컬 적용
    target.unit.hp = Math.max(0, target.unit.hp - dmg);

    // 이펙트
    this._spawnDamageNumber(target.sprite.x, target.sprite.y, dmg, 'normal');
    // SSOT-WIRE-07: 속성 스킬은 데미지 위에 element 태그 표시 (SCENARIO_DAMAGE_TYPE_NARRATIVES 단일 출처)
    this._spawnElementTag(target.sprite.x, target.sprite.y, skill.element);
    this._showHitVFX(target.sprite.x, target.sprite.y, { element: skill.element }); // UX(#10): 속성색 고정
    // FINDING-A4 ext11: 설정 + reduce-motion 검사
    if (isScreenShakeEnabled()) this.cameras.main.shake(80, 0.003);

    playSfx(this, skill.sfxKey ?? 'sfx_combat_magic_cast', 0.6);
    playSfx(this, COMBAT_VOICE.SKILL_CAST, 0.6);

    this.battleUI?.addLog(`⚡ ${skill.name} → ${target.unit.name} : ${dmg}`);
    this.battleUI?.onSkillUsed(this.skillSlots.indexOf(skill), skill.cooldown);

    this._flashSprite(target);

    if (target.unit.hp <= 0) {
      this._killUnit(target);
    }
  }

  // ─── 적 AI ───────────────────────────────────────────────────

  private _processEnemyAI(): void {
    for (const es of this.enemySprites) {
      if (es.isDead || es.atb < ATB_MAX) continue;

      const livingAllies = this.allySprites.filter(a => !a.isDead);
      if (livingAllies.length === 0) continue;

      const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
      this._performAttack(es, target);
      es.atb = 0;
    }
  }

  // ─── 키보드 입력 ──────────────────────────────────────────────

  private _handleKeyboardInput(): void {
    if (!this.cursors) return;

    // 타겟 선택 모드
    if (this.targetSelectMode) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.targetIndex = (this.targetIndex - 1 + this.targetCandidates.length) % this.targetCandidates.length;
        this._drawTargetCursor();
      }
      if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.targetIndex = (this.targetIndex + 1) % this.targetCandidates.length;
        this._drawTargetCursor();
      }
      if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this._confirmTarget(this.targetCandidates[this.targetIndex]);
      }
      if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this._cancelTargetSelect();
      }
      return;
    }

    // 서브메뉴(마법/아이템): 위/아래 선택 + Enter 실행 + ESC 닫기
    if (this.cmdSubMenu) {
      const n = this.subMenuItems.length;
      if (n > 0) {
        if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
          this.subMenuIndex = (this.subMenuIndex - 1 + n) % n;
          this._highlightSubMenu();
        }
        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
          this.subMenuIndex = (this.subMenuIndex + 1) % n;
          this._highlightSubMenu();
        }
        if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
          this.subMenuItems[this.subMenuIndex]?.action();
        }
      }
      if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this._closeSubMenu();
        if (this.activeCommander) this._openCommandMenu(this.activeCommander);
      }
      return;
    }

    // 커맨드 메뉴 조작
    if (this.activeCommander && this.cmdMenuContainer) {
      // UX(rank10): 좌/우도 받음(이전엔 up/down 만) — 타겟선택 분기는 이미 4방향이라 비대칭이었다.
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
        this.cmdMenuIndex = (this.cmdMenuIndex - 1 + COMMANDS.length) % COMMANDS.length;
        this._highlightCommand();
      }
      if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
        this.cmdMenuIndex = (this.cmdMenuIndex + 1) % COMMANDS.length;
        this._highlightCommand();
      }
      if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this._executeCommand(COMMANDS[this.cmdMenuIndex].type);
      }
      // UX(rank5): ESC = 이 턴 대기/넘김(atb 리셋→재충전). 형제 분기(타겟/서브메뉴)는 ESC 를 처리하는데
      //   커맨드 메뉴만 누락이라 진입 후 빠져나갈 수 없었다(WAIT 모드에서 강제 커밋). _endTurn 재사용.
      if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this.battleUI?.addLog(`⏭ ${this.activeCommander.unit.name} 대기`);
        this._endTurn();
      }
    }
  }

  // ─── FF6 스타일 데미지 숫자 팝업 ──────────────────────────────

  // E-S4: 콤보 검출 + 시각화 인프라 ─────────────────────────────
  private _unitSkillHistory: Map<string, string[]> = new Map();

  private _recordSkillUse(unitId: string, skillCode: string): void {
    const hist = this._unitSkillHistory.get(unitId) ?? [];
    hist.push(skillCode);
    // 최근 6개만 유지 (콤보 sequence 최대 ~3 이라 6 충분)
    if (hist.length > 6) hist.splice(0, hist.length - 6);
    this._unitSkillHistory.set(unitId, hist);
  }

  /**
   * 최근 사용 이력의 끝과 콤보 sequence 가 정확히 일치하면 그 콤보 반환.
   * 여러 콤보 동시 매칭 시 가장 긴 sequence 우선.
   */
  private _detectCombo(unitId: string): typeof COMBO_MIRROR[number] | null {
    const hist = this._unitSkillHistory.get(unitId) ?? [];
    if (hist.length < 2) return null;
    // 가장 긴 sequence 부터 검사
    const sorted = [...COMBO_MIRROR].sort((a, b) => b.sequence.length - a.sequence.length);
    for (const combo of sorted) {
      const seq = combo.sequence;
      if (hist.length < seq.length) continue;
      const tail = hist.slice(-seq.length);
      if (tail.every((s, i) => s === seq[i])) return combo;
    }
    return null;
  }

  private _spawnComboText(x: number, y: number, name: string, bonus: number): void {
    // SSOT wiring: combo popup 색은 SCENARIO_COMBAT_RESULT_LABELS 단일 출처
    const text = this.add.text(x, y, `⚡ ${name} +${bonus}%`, {
      fontSize: '18px',
      fontFamily: FONT_FAMILY,
      color: getCombatPopupColor('combo'),
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9100).setAlpha(0).setScale(0.6);
    this.tweens.add({
      targets: text,
      scale: 1.2,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 50,
          alpha: 0,
          duration: 800,
          delay: 600,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private _spawnEchoText(x: number, y: number, dmg: number): void {
    // B-S4: critEcho 발동 시 보라 "ECHO! +N" 팝업 (색은 SSOT crit_echo 단일 출처)
    const text = this.add.text(x + 30, y - 10, `✨ ECHO +${dmg}`, {
      fontSize: '16px',
      fontFamily: FONT_FAMILY,
      color: getCombatPopupColor('crit_echo'),
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9100).setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: text,
      scale: 1.0,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 60,
          alpha: 0,
          duration: 700,
          delay: 400,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private _spawnReflectText(x: number, y: number, dmg: number): void {
    // B-S4: reflect 발동 시 청 "🛡 -N" 팝업 (attacker 위치, 색은 SSOT reflect 단일 출처)
    const text = this.add.text(x, y - 30, `🛡 -${dmg}`, {
      fontSize: '17px',
      fontFamily: FONT_FAMILY,
      color: getCombatPopupColor('reflect'),
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9100).setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: text,
      scale: 1.0,
      alpha: 1,
      duration: 200,
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 70,
          alpha: 0,
          duration: 700,
          delay: 400,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private _spawnMissText(x: number, y: number): void {
    // B-S2: passive evasion 발동 시 "MISS!" 텍스트 (색은 SSOT miss 단일 출처)
    const text = this.add.text(x, y, 'MISS!', {
      fontSize: '20px',
      fontFamily: FONT_FAMILY,
      color: getCombatPopupColor('miss'),
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'italic',
    }).setOrigin(0.5).setDepth(9000).setAlpha(0);
    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: { from: 0, to: 1 },
      duration: 200,
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 600,
          delay: 400,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  private _spawnDamageNumber(x: number, y: number, value: number, type: 'normal' | 'critical' | 'heal'): void {
    let color = '#ffffff';
    let fontSize = '22px';
    let prefix = '';

    switch (type) {
      case 'critical':
        color = '#ffd700';
        fontSize = '30px';
        prefix = '💥';
        break;
      case 'heal':
        color = '#44ff44';
        fontSize = '22px';
        prefix = '+';
        break;
      default:
        color = '#ffffff';
        fontSize = '22px';
        break;
    }

    const text = this.add.text(x, y, `${prefix}${value}`, {
      fontSize,
      fontFamily: FONT_FAMILY,
      color,
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: type === 'critical' ? 'bold' : 'normal',
    }).setOrigin(0.5).setDepth(9000).setAlpha(0);

    // FF6 스타일: 아래에서 위로 떠오름
    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: { from: 0, to: 1 },
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 80,
          alpha: 0,
          duration: 400,
          delay: 200,
          ease: 'Sine.easeIn',
          onComplete: () => text.destroy(),
        });
      },
    });

    // UX(#3): EffectManager.spawnDamageText 이중 스폰 제거. 위 인라인 팝업(crit 금색 30px💥 + FF6 2단 트윈)과
    // 같은 좌표/depth 에 다른 색(#FF4444 28px)으로 한 번 더 떠올라 겹침/깜빡임 + 색 불일치였다. 인라인만 유지.
  }

  /**
   * SSOT-WIRE-07: 속성 스킬 데미지 위에 element 태그(이모지 + 라벨)를 띄운다.
   * 색/라벨은 SCENARIO_DAMAGE_TYPE_NARRATIVES 단일 출처. 무속성(physical 귀결)은 미표시.
   */
  private _spawnElementTag(x: number, y: number, element: string | undefined): void {
    const tag = formatDamageTypeTag(element);
    if (!tag) {
      return;
    }
    const text = this.add.text(x, y - 26, tag, {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: getDamageTypePopupColor(element),
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(9050).setAlpha(0).setScale(0.7);
    this.tweens.add({
      targets: text,
      scale: 1.0,
      alpha: 1,
      y: y - 38,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: y - 70,
          alpha: 0,
          duration: 500,
          delay: 350,
          onComplete: () => text.destroy(),
        });
      },
    });
  }

  // ─── 히트 VFX ────────────────────────────────────────────────

  /**
   * UX(#10): 히트 VFX 타입별 분기. 이전엔 랜덤 4색 원이라 물리/마법/크리/속성이 전부 동일했다.
   * - 속성: damageTypeNarration 색으로 고정(랜덤 제거)
   * - 크리: 큰 금빛 버스트 + 추가 링 + 방사 파티클(가장 중요한 '크리 터지는 맛'). shake 는 호출부 게이트.
   * - 기본(물리/무속성): 흰색 일관 버스트.
   */
  private _showHitVFX(x: number, y: number, opts?: { crit?: boolean; element?: string }): void {
    const crit = opts?.crit ?? false;
    const ELEM_COLOR: Record<string, number> = {
      fire: 0xff5533, water: 0x4499ff, wind: 0x66dd88, earth: 0xcc9955, light: 0xffee88, dark: 0xaa66dd,
    };
    const elementColor = opts?.element ? ELEM_COLOR[opts.element] : undefined;
    const baseColor = crit ? 0xffe066 : (elementColor ?? 0xffffff);
    const hitSlashResource = getSpriteResourceForVfx('vfx_hit_slash');

    if (hitSlashResource && this.textures.exists(hitSlashResource.key)) {
      const animKey = `${hitSlashResource.key}_play`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(hitSlashResource.key, {
            start: 0,
            end: hitSlashResource.frameCount - 1,
          }),
          frameRate: crit ? 20 : 18,
          repeat: 0,
        });
      }

      const slash = this.add.sprite(x, y, hitSlashResource.key, 0)
        .setName('vfx_hit_slash_instance')
        .setDepth(8002)
        .setScale(crit ? 2.1 : 1.7)
        .setAlpha(crit ? 1 : 0.92)
        .setRotation(Phaser.Math.DegToRad(crit ? -18 : -10));
      slash.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      slash.setTint(baseColor);
      slash.play(animKey);
      slash.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => slash.destroy());
    }

    const circle = this.add.circle(x, y, crit ? 14 : 8, baseColor, 0.85).setDepth(8000);
    this.tweens.add({
      targets: circle, scaleX: crit ? 4 : 3, scaleY: crit ? 4 : 3, alpha: 0,
      duration: crit ? 380 : 300, ease: 'Sine.easeOut', onComplete: () => circle.destroy(),
    });

    if (crit) {
      // 크리 임팩트: 확장 링 + 방사 파티클 6개
      const ring = this.add.circle(x, y, 10).setStrokeStyle(3, 0xffe066, 1).setDepth(8001);
      this.tweens.add({
        targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 360, ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 / 6) * i;
        const p = this.add.circle(x, y, 3, 0xffd700, 1).setDepth(8001);
        this.tweens.add({
          targets: p, x: x + Math.cos(ang) * 36, y: y + Math.sin(ang) * 36, alpha: 0,
          duration: 320, ease: 'Quad.easeOut', onComplete: () => p.destroy(),
        });
      }
    }
  }

  // ─── 스프라이트 연출 ──────────────────────────────────────────

  private _flashSprite(us: UnitSprite): void {
    // 번쩍임 (흰색 → 원래)
    if (this._canTint(us.sprite)) {
      us.sprite.setTint(0xffffff);
      this.time.delayedCall(80, () => {
        if (this._canTint(us.sprite)) us.sprite.clearTint();
      });
    }

    // 흔들림
    const origX = us.sprite.x;
    this.tweens.add({
      targets: us.sprite,
      x: origX + 6,
      duration: 40,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        us.sprite.x = origX;
      },
    });
  }

  private _killUnit(us: UnitSprite): void {
    us.isDead = true; // 전투 종료 판정은 이 플래그로 즉시 — 아래 트윈은 표시뿐이라 로직 무영향
    this.battleUI?.addLog(`💀 ${us.unit.name} 쓰러짐!`);
    playSfx(this, us.isAlly ? COMBAT_VOICE.DEATH : 'sfx_combat_enemy_death', us.isAlly ? 0.7 : 0.5);

    // UX(#5): 사망 연출 트윈(이전엔 setAlpha(0.2) 즉시 — 처치 피드백 약함). 깜빡임/shake 없이 mild.
    const spr = us.sprite;
    us.nameText.setAlpha(0); // 이름 숨김(적 HP 바는 _updateEnemyHpBars 가 isDead 로 숨김)
    if (us.isAlly) {
      // 아군: 그레이 tint + 쓰러짐. 태그 스프라이트는 death 애니메이션이 붕괴를
      // 표현하므로 angle 회전 없이 alpha 만 낮춘다(회전과 death 프레임 충돌 방지).
      if (this._canTint(spr)) spr.setTint(0x555555);
      const classId = us.unit.classId ?? '';
      if (spr instanceof Phaser.GameObjects.Sprite && classId) {
        this._playCharMotion(spr, classId, 'death', 'D');
        this.tweens.add({ targets: spr, alpha: 0.5, duration: 350, ease: 'Quad.easeIn' });
      } else {
        this.tweens.add({ targets: spr, angle: 90, alpha: 0.35, duration: 350, ease: 'Quad.easeIn' });
      }
    } else {
      // 적: 축소 + 회전 + 페이드아웃(보스는 더 느리게, 회전 없이 무게감)
      this.tweens.add({
        targets: spr,
        scaleX: spr.scaleX * 0.3, scaleY: spr.scaleY * 0.3,
        angle: us.isBoss ? 0 : 30, alpha: 0,
        duration: us.isBoss ? 650 : 340, ease: 'Back.easeIn',
      });
    }
  }

  // ─── 캐릭터 태그 애니메이션 ───────────────────────────────────

  /**
   * classId·motion·direction 조합당 Phaser Animation 을 lazily 생성한다.
   * 프레임 범위는 manifest 의 SSOT(getCharacterFrameRange)에서 받아 시트
   * 레이아웃과 런타임이 절대 어긋나지 않게 한다. idle 만 루프(repeat -1),
   * 나머지(victory/death 등)는 1회 재생.
   */
  private _ensureCharAnim(
    classId: string,
    motion: CharacterMotion,
    direction: CharacterDirection,
  ): string {
    const resource = getCharacterSpriteResource(classId);
    const key = getCharacterSpriteAnimationKey(classId, motion, direction);
    if (!resource || this.anims.exists(key)) return key;

    const { from, to } = getCharacterFrameRange(motion, direction);
    // idle 은 잔잔하게(6fps), victory 는 약간 빠르게(10fps) — CT 승리 포즈 리듬.
    const frameRate = motion === 'idle' ? 6 : motion === 'victory' ? 10 : 8;
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(resource.textureKey, { start: from, end: to }),
      frameRate,
      repeat: motion === 'idle' ? -1 : 0,
    });
    return key;
  }

  /** 태그 애니메이션을 보장 생성 후 스프라이트에 재생. Sprite 타입에만 적용. */
  private _playCharMotion(
    sprite: Phaser.GameObjects.Sprite,
    classId: string,
    motion: CharacterMotion,
    direction: CharacterDirection = 'D',
  ): void {
    const key = this._ensureCharAnim(classId, motion, direction);
    if (this.anims.exists(key)) sprite.play(key);
  }

  /**
   * 전투 진입 포즈(FF6 표준): ready(무기 들고 대기) 1회 → idle 루프로 정착.
   * ready 프레임이 없으면 곧장 idle. ready 완료 후에도 그 사이 victory/death
   * 가 재생됐으면 idle 로 덮지 않도록 완료 애니 키를 확인한다.
   */
  private _playCharIntro(sprite: Phaser.GameObjects.Sprite, classId: string): void {
    const readyKey = this._ensureCharAnim(classId, 'ready', 'D');
    if (!this.anims.exists(readyKey)) {
      this._playCharMotion(sprite, classId, 'idle', 'D');
      return;
    }
    sprite.play(readyKey);
    sprite.once(
      Phaser.Animations.Events.ANIMATION_COMPLETE,
      (anim: Phaser.Animations.Animation) => {
        if (anim.key === readyKey) this._playCharMotion(sprite, classId, 'idle', 'D');
      },
    );
  }

  /**
   * setTint/clearTint 가능 여부 타입가드. Image·Sprite 둘 다 Tint 컴포넌트를
   * 갖지만 Rectangle 폴백은 없다. (#280 에서 아군이 Image→Sprite 로 바뀌며
   * Sprite 는 Image 의 하위클래스가 아니라 instanceof Image 가 false — 틴트가
   * 조용히 누락됐던 회귀를 이 가드로 일괄 차단.)
   */
  private _canTint(
    s: Phaser.GameObjects.GameObject,
  ): s is Phaser.GameObjects.Image | Phaser.GameObjects.Sprite {
    return s instanceof Phaser.GameObjects.Image || s instanceof Phaser.GameObjects.Sprite;
  }

  // ─── 유닛 스폰 ───────────────────────────────────────────────

  private _spawnAllies(units: CombatUnit[]): void {
    units.forEach((unit, idx) => {
      const pos = ALLY_POSITIONS[idx % ALLY_POSITIONS.length];
      const classId = unit.classId ?? '';
      const spriteResource = getCharacterSpriteResource(classId);
      const staticTexKey = `char_battle_${classId}`;

      // B-S4: ally 에 critEcho 부여 (default 30%)
      if (unit.critEchoPercent === undefined) {
        unit.critEchoPercent = 30;
      }
      if (unit.alive === undefined) unit.alive = true;

      let sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
      if (spriteResource && this.textures.exists(spriteResource.textureKey)) {
        // 태그 기반 스프라이트: add.sprite 로 만들어 idle 루프 재생(A/B 포즈가 실제로 움직임).
        const charSprite = this.add.sprite(pos.x, pos.y, spriteResource.textureKey, 0)
          .setScale(1)
          // UX(rank11): 평소엔 손가락 커서 끔(클릭 가능해 보이는 거짓 어포던스). 타겟 선택 중 후보에만 켠다.
          .setInteractive({ useHandCursor: false })
          .setDepth(50);
        charSprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        // 전투 진입: ready 포즈 1회 → idle 루프 (Phase B 수용 기준).
        this._playCharIntro(charSprite, classId);
        sprite = charSprite;
      } else if (classId && this.textures.exists(staticTexKey)) {
        sprite = this.add.image(pos.x, pos.y, staticTexKey)
          .setScale(1)
          // UX(rank11): 평소엔 손가락 커서 끔(클릭 가능해 보이는 거짓 어포던스). 타겟 선택 중 후보에만 켠다.
          .setInteractive({ useHandCursor: false })
          .setDepth(50);
        // LINEAR 필터로 pixelArt nearest-neighbor 오버라이드
        sprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } else {
        sprite = this.add.rectangle(pos.x, pos.y, 48, 64, 0x4488ff)
          .setInteractive({ useHandCursor: false }) // UX(rank11): 평소 손가락커서 끔
          .setDepth(50);
      }

      // 대기 애니메이션: 살짝 위아래 흔들림
      this.tweens.add({
        targets: sprite,
        y: pos.y - 3,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const nameText = this.add.text(pos.x, pos.y + sprite.displayHeight / 2 + 4, unit.name, {
        fontSize: '11px',
        fontFamily: FONT_FAMILY,
        color: '#88ccff',
      }).setOrigin(0.5).setDepth(51);

      const us: UnitSprite = {
        unit, sprite, nameText,
        atb: Phaser.Math.Between(0, 30), // 약간 랜덤 시작
        isAlly: true, isDead: false,
      };
      this.allySprites.push(us);
    });
  }

  private _spawnEnemies(units: CombatUnit[]): void {
    units.forEach((unit, idx) => {
      const pos = ENEMY_POSITIONS[idx % ENEMY_POSITIONS.length];
      const isBoss = (unit.id ?? '').toUpperCase().startsWith('BOSS');

      // B-S3/S4: 적 monster 에 passive 부여 (보스 강화, 일반 약간)
      if (unit.evasionAddPercent === undefined) {
        unit.evasionAddPercent = isBoss ? 30 : 15;
      }
      if (unit.reflectPercent === undefined) {
        unit.reflectPercent = isBoss ? 25 : 10; // 피격 데미지 25% / 10% 반사
      }
      if (unit.alive === undefined) unit.alive = true;

      // 몬스터 이미지 키 찾기 (preload에서 로드됨)
      const cleanId = (unit.id ?? '').replace(/_\d+$/, '');
      const monsterResource = getSpriteResourceForMonster(cleanId);
      const monTexKey = `mon_battle_${cleanId}`;
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

      if (monsterResource && this.textures.exists(monsterResource.key)) {
        sprite = this.add.image(pos.x, pos.y, monsterResource.key, 0)
          .setScale(isBoss ? 2 : 1.5)
          .setInteractive({ useHandCursor: false })
          .setDepth(50);
        sprite.setFrame(0);
        sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      } else if (this.textures.exists(monTexKey)) {
        sprite = this.add.image(pos.x, pos.y, monTexKey)
          .setScale(isBoss ? 2 : 1)
          .setInteractive({ useHandCursor: false }) // UX(rank11): 평소 손가락커서 끔
          .setDepth(50);
        sprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } else {
        const fallbackTexture = isBoss
          ? BATTLE_MONSTER_FALLBACK_TEXTURES.boss
          : BATTLE_MONSTER_FALLBACK_TEXTURES.normal;

        if (this.textures.exists(fallbackTexture.key)) {
          sprite = this.add.image(pos.x, pos.y, fallbackTexture.key)
            .setDisplaySize(fallbackTexture.displaySize, fallbackTexture.displaySize)
            .setInteractive({ useHandCursor: false }) // UX(rank11): 평소 손가락커서 끔
            .setDepth(50);
          sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        } else {
          // Aseprite fallback 로드 실패 시에만 사용하는 안전 fallback.
          const size = fallbackTexture.displaySize;
          const color = this._monsterColor(unit.name ?? unit.id ?? 'monster');
          const icon = this._monsterIcon(unit.id ?? '', unit.name ?? '');
          const fallbackKey = `_mon_prog_${idx}_${this.sys.game.loop.frame}`;
          const gfx = this.add.graphics().setVisible(false);
          gfx.fillStyle(color, 1);
          gfx.fillRoundedRect(0, 0, size, size, 10);
          gfx.lineStyle(2, 0xffffff, 0.3);
          gfx.strokeRoundedRect(0, 0, size, size, 10);
          gfx.generateTexture(fallbackKey, size, size);
          gfx.destroy();
          sprite = this.add.image(pos.x, pos.y, fallbackKey)
            .setInteractive({ useHandCursor: false }) // UX(rank11): 평소 손가락커서 끔
            .setDepth(50);
          this.add.text(pos.x, pos.y - 4, icon, {
            fontSize: isBoss ? '36px' : '24px',
            fontFamily: FONT_FAMILY,
          }).setOrigin(0.5).setDepth(52);
        }
      }

      const spriteH = sprite.displayHeight ?? 60;
      const nameText = this.add.text(pos.x, pos.y - spriteH / 2 - 14, unit.name, {
        fontSize: '11px',
        fontFamily: FONT_FAMILY,
        color: '#ff8888',
      }).setOrigin(0.5).setDepth(51);

      // CHRONO-S52: 시대별 monster sprite tint (present 외 era 에 era.tintColor 살짝 적용)
      const eraId = this._initData.eraId ?? 'present';
      if (eraId !== 'present' && sprite instanceof Phaser.GameObjects.Image) {
        const era = getChronoEra(eraId);
        sprite.setTint(era.tintColor);
        sprite.setName(`enemy_${unit.id}_eratint`);
      }

      // UX(#1): 적 머리 위 HP 바 — ATB RPG 의 가장 기본 정보(이전엔 적 HP 가시화 0%). _updateEnemyHpBars 갱신.
      const enemyHpBar = this.add.graphics().setDepth(51);
      // UX(rank2): 적 ATB(행동 임박) 게이지 — HP 만큼 기본 정보(이전엔 적 게이지 전무). dead 필드 atbBar 재사용.
      const atbBar = this.add.graphics().setDepth(51);

      const us: UnitSprite = {
        unit, sprite, nameText,
        atb: Phaser.Math.Between(0, 20),
        isAlly: false, isDead: false,
        isBoss,
        enemyHpBar,
        atbBar,
      };
      this.enemySprites.push(us);
    });
  }

  // ─── FF6 상태 패널 (하단 우측) ────────────────────────────────

  private _createStatusPanel(): void {
    const container = this.add.container(STATUS_PANEL_X, STATUS_PANEL_Y).setDepth(150);
    this.statusPanelContainer = container;

    const gfx = this.add.graphics().setDepth(149);

    this.allySprites.forEach((us, i) => {
      const y = i * 20;

      // 이름 + HP/MP 한 줄로 compact (20px row)
      const nameText = this.add.text(0, y + 2, `${us.unit.name} Lv${us.unit.level}`, {
        fontSize: '11px', fontFamily: FONT_FAMILY, color: '#ffffff',
      });
      container.add(nameText);

      const hpText = this.add.text(160, y + 2, `HP ${us.unit.hp}/${us.unit.maxHp}`, {
        fontSize: '10px', fontFamily: FONT_FAMILY, color: '#ffcc44',
      });
      container.add(hpText);

      const mpText = this.add.text(310, y + 2, `MP ${us.unit.mp}/${us.unit.maxMp}`, {
        fontSize: '10px', fontFamily: FONT_FAMILY, color: '#44ff88',
      });
      container.add(mpText);

      // ATB 그래픽 (바)
      const atbGfx = this.add.graphics().setDepth(151);
      container.add(atbGfx);

      this.statusTexts.set(us.unit.id, {
        name: nameText,
        hp: hpText,
        mp: mpText,
        atb: atbGfx,
      });
    });

    this.statusPanelGraphics = gfx;
  }

  private _updateStatusPanel(): void {
    if (!this.statusPanelGraphics) return;

    this.statusPanelGraphics.clear();

    this.allySprites.forEach((us, i) => {
      const entry = this.statusTexts.get(us.unit.id);
      if (!entry) return;

      const baseX = STATUS_PANEL_X;
      const baseY = STATUS_PANEL_Y + i * 20;

      // HP/MP 텍스트 업데이트 (숫자는 실제 hp 로 즉시 — FF식 '숫자는 점프, 바는 드레인')
      const hpRatio = us.unit.hp / us.unit.maxHp;
      const hpCritical = hpRatio < 0.25;
      // UX(rank7): 위급(<25%)을 색상만으로 표시하면 색약 사용자가 구분 불가 → ⚠ 접두로 색-독립 단서.
      entry.hp.setText(`${hpCritical ? '⚠ ' : ''}HP ${Math.max(0, us.unit.hp)}/${us.unit.maxHp}`);
      entry.mp.setText(`MP ${Math.max(0, us.unit.mp)}/${us.unit.maxMp}`);
      entry.hp.setColor(hpCritical ? '#ff4444' : '#ffcc44');

      // HP 바 — UX(#9): displayedHp(보간값)로 부드럽게 드레인
      const drainRatio = Math.max(0, (us.displayedHp ?? us.unit.hp) / us.unit.maxHp);
      const barY = baseY + 14;
      const hpBarX = baseX + 160;
      this.statusPanelGraphics!.fillStyle(0x222244, 1);
      this.statusPanelGraphics!.fillRect(hpBarX, barY, STAT_BAR_W, 4);
      this.statusPanelGraphics!.fillStyle(hpCritical ? 0xff4444 : 0xffcc44, 1);
      this.statusPanelGraphics!.fillRect(hpBarX, barY, STAT_BAR_W * drainRatio, 4);
      // UX(rank7): 25/50/75% tick — 적 HP 바(_updateEnemyHpBars)와 동일한 색약 redundancy + 잔량 판단 단서.
      this.statusPanelGraphics!.fillStyle(0x000000, 0.5);
      for (const t of [0.25, 0.5, 0.75]) this.statusPanelGraphics!.fillRect(Math.round(hpBarX + STAT_BAR_W * t), barY, 1, 4);

      // MP 바
      const mpRatio = us.unit.maxMp > 0 ? us.unit.mp / us.unit.maxMp : 0;
      const mpBarX = baseX + 310;
      this.statusPanelGraphics!.fillStyle(0x222244, 1);
      this.statusPanelGraphics!.fillRect(mpBarX, barY, 60, 4);
      this.statusPanelGraphics!.fillStyle(0x44ff88, 1);
      this.statusPanelGraphics!.fillRect(mpBarX, barY, 60 * Math.max(0, mpRatio), 4);

      // ATB 바
      const atbBarX = baseX + 400;
      const atbRatio = us.atb / ATB_MAX;
      entry.atb.clear();
      entry.atb.fillStyle(0x222244, 1);
      entry.atb.fillRect(atbBarX - STATUS_PANEL_X, barY - STATUS_PANEL_Y, ATB_BAR_W, ATB_BAR_H);
      entry.atb.fillStyle(atbRatio >= 1 ? 0x44ff44 : 0x4488ff, 1);
      entry.atb.fillRect(atbBarX - STATUS_PANEL_X, barY - STATUS_PANEL_Y, ATB_BAR_W * atbRatio, ATB_BAR_H);
    });
  }

  // UX(#9): 모든 유닛의 displayedHp 를 실제 hp 로 부드럽게 보간(~200ms 추종). 바는 이 값으로 드레인.
  private _lerpDisplayedHp(delta: number): void {
    const t = Math.min(1, delta / 200);
    for (const us of this.allySprites) this._lerpUnitHp(us, t);
    for (const us of this.enemySprites) this._lerpUnitHp(us, t);
  }

  private _lerpUnitHp(us: UnitSprite, t: number): void {
    const target = Math.max(0, us.unit.hp);
    if (us.displayedHp === undefined) { us.displayedHp = target; return; }
    us.displayedHp += (target - us.displayedHp) * t;
    if (Math.abs(us.displayedHp - target) < 0.5) us.displayedHp = target;
  }

  // ─── UX(#1): 적 머리 위 HP 바 ─────────────────────────────────
  /** 적/보스 sprite 위에 HP 바를 매프레임 그린다. 적 HP 가시화로 "몇 대 더?" 판단 + 보스전 페이싱. */
  /** 적 머리 위 HP 바(#1) + ATB 행동 게이지(rank2)를 매프레임 갱신. 사망 시 둘 다 숨김. */
  private _updateEnemyHpBars(): void {
    for (const us of this.enemySprites) {
      const g = us.enemyHpBar;
      const ab = us.atbBar;
      g?.clear();
      ab?.clear();
      if (us.isDead) continue; // 사망 시 두 바 모두 숨김(위에서 clear 완료)

      const ratio = us.unit.maxHp > 0 ? Math.max(0, Math.min(1, (us.displayedHp ?? us.unit.hp) / us.unit.maxHp)) : 0;
      const w = us.isBoss ? 140 : 64;
      const h = us.isBoss ? 8 : 5;
      const spriteH = us.sprite.displayHeight ?? 60;
      const x = us.sprite.x - w / 2;
      const y = us.sprite.y - spriteH / 2 - (us.isBoss ? 30 : 22); // 이름 라벨 위

      if (g) {
        // 외곽 + 배경
        g.fillStyle(0x000000, 0.55);
        g.fillRect(x - 1, y - 1, w + 2, h + 2);
        g.fillStyle(0x331111, 1);
        g.fillRect(x, y, w, h);
        // 잔여 HP(적=빨강 계열, 위험 구간에서 색 변화 — 색약 대비 tick 병행)
        const col = ratio > 0.5 ? 0xee5555 : ratio > 0.25 ? 0xffaa33 : 0xff2222;
        g.fillStyle(col, 1);
        g.fillRect(x, y, w * ratio, h);
        // 25/50/75% tick(색약 redundancy + 마무리 판단)
        g.fillStyle(0x000000, 0.5);
        for (const t of [0.25, 0.5, 0.75]) g.fillRect(Math.round(x + w * t), y, 1, h);
      }

      // UX(rank2): ATB 게이지 — HP 바 바로 아래. '언제 맞을지' 예측 가능하게(이전엔 적 게이지 전무).
      if (ab) {
        const atbRatio = Math.max(0, Math.min(1, us.atb / ATB_MAX));
        const abH = us.isBoss ? 4 : 3;
        const abY = y + h + 2;
        ab.fillStyle(0x000000, 0.55);
        ab.fillRect(x - 1, abY - 1, w + 2, abH + 2);
        ab.fillStyle(0x0a1a2a, 1);
        ab.fillRect(x, abY, w, abH);
        // 평소 청록 충전 → 임박(≥80%)엔 적색으로 '곧 행동' 신호(색=색약 redundancy).
        // 펄스는 모션 강조라 reduce-motion(흔들림 설정)일 때 비활성 — 색만으로도 구분 가능.
        const imminent = atbRatio >= 0.8;
        const fillCol = imminent ? 0xff5544 : 0x44ccff;
        const alpha = (imminent && isScreenShakeEnabled())
          ? 0.55 + 0.45 * Math.abs(Math.sin(this.time.now / 110))
          : 1;
        ab.fillStyle(fillCol, alpha);
        ab.fillRect(x, abY, w * atbRatio, abH);
      }
    }
  }

  // ─── UX(#7): 상태이상 시각화 배선 ─────────────────────────────
  private _findUnitSprite(unitId: string): UnitSprite | undefined {
    return this.allySprites.find(u => u.unit.id === unitId)
      ?? this.enemySprites.find(u => u.unit.id === unitId);
  }

  /** 누적된 효과 목록을 sprite 좌표로 렌더. */
  private _renderUnitEffects(targetId: string): void {
    const us = this._findUnitSprite(targetId);
    const list = this._unitEffects.get(targetId);
    if (!us || !list) return;
    this.statusEffectRenderer?.updateEffects(targetId, list, us.sprite.x, us.sprite.y);
  }

  /**
   * 서버 combat:effectApplied 단건을 누적 + 렌더. 이전엔 존재하지 않는 applyEffect 를 (as any) 로 불러
   * silent no-op 이라 독/화상/버프 등 상태이상이 시각적 전무였다. effectId→카테고리로 isDebuff 판정.
   */
  private _applyStatusEffect(targetId: string, effectId: string, value: number): void {
    if (!targetId || !effectId) return;
    const isDebuff = resolveStatusCategory(effectId, false) !== 'buff';
    const duration = Number.isFinite(value) && value > 0 ? value : 3;
    const list = this._unitEffects.get(targetId) ?? [];
    const existing = list.find(e => e.effectId === effectId);
    if (existing) {
      existing.stacks += 1;
      existing.remainingDuration = Math.max(existing.remainingDuration, duration);
    } else {
      list.push({ effectId, name: effectId, icon: '', isDebuff, stacks: 1, remainingDuration: duration });
    }
    this._unitEffects.set(targetId, list);
    this._renderUnitEffects(targetId);
  }

  /** 매 서버 tick: 지속시간 감소 + 만료 제거 + 재렌더(자연 만료). */
  private _decayStatusEffects(): void {
    for (const [targetId, list] of [...this._unitEffects]) {
      for (const e of list) e.remainingDuration -= 1;
      const alive = list.filter(e => e.remainingDuration > 0);
      const us = this._findUnitSprite(targetId);
      if (alive.length === 0) {
        this._unitEffects.delete(targetId);
        this.statusEffectRenderer?.updateEffects(targetId, [], us?.sprite.x ?? 0, us?.sprite.y ?? 0);
      } else {
        this._unitEffects.set(targetId, alive);
        if (us) this.statusEffectRenderer?.updateEffects(targetId, alive, us.sprite.x, us.sprite.y);
      }
    }
  }

  // ─── 전투 종료 판정 ──────────────────────────────────────────

  private _checkBattleEnd(): void {
    const allEnemiesDead = this.enemySprites.every(e => e.isDead);
    const allAlliesDead = this.allySprites.every(a => a.isDead);

    if (allEnemiesDead) {
      this.phase = 'victory';
      this._closeCommandMenu();
      this._closeSubMenu();
      this.targetSelectMode = false;
      this.activeCommander = null;
      // 생존 아군은 승리 포즈 재생(idle 루프 → victory 1회). 흔들림 트윈은
      // y 를 건드릴 뿐 프레임과 무관해 그대로 둬도 포즈 전환과 충돌하지 않는다.
      this._playAllyMotion(a => !a.isDead, 'victory');
      this._showVictory();
    } else if (allAlliesDead) {
      this.phase = 'defeat';
      this._closeCommandMenu();
      this._closeSubMenu();
      this.targetSelectMode = false;
      this.activeCommander = null;
      // death 포즈는 각 아군 사망 시 _killUnit 이 이미 재생함(전멸 시 재호출하면
      // 끝난 애니를 되감아 깜빡임 → 중복 제거). 패배 팝업만 띄운다.
      this._showDefeat();
    }
  }

  /**
   * 조건에 맞는 아군의 태그 스프라이트에 모션을 재생한다. add.sprite 로
   * 만들어진 아군에만 적용(정적 이미지/사각형 폴백은 anims 가 없어 건너뜀).
   */
  private _playAllyMotion(predicate: (us: UnitSprite) => boolean, motion: CharacterMotion): void {
    for (const us of this.allySprites) {
      if (!predicate(us)) continue;
      if (!(us.sprite instanceof Phaser.GameObjects.Sprite)) continue;
      const classId = us.unit.classId ?? '';
      if (classId) this._playCharMotion(us.sprite, classId, motion, 'D');
    }
  }

  // ─── 승리 연출 ───────────────────────────────────────────────

  private _addBattleResultLeadIcon(
    mode: BattleResultLeadMode,
    x: number,
    y: number,
    resource: BattleIconResource | undefined,
  ): boolean {
    if (!resource || !this.textures.exists(resource.key)) {
      this.battleResultLeadIconFallbackRendered = true;
      return false;
    }

    const leadIcon = this.add.image(x, y, resource.key)
      .setName(`battle_result_lead_${mode}_icon`)
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(500);
    leadIcon.setDisplaySize(BATTLE_RESULT_LEAD_ICON_SIZE, BATTLE_RESULT_LEAD_ICON_SIZE);
    leadIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.battleResultLeadIcon = leadIcon;
    return true;
  }

  private _showBattleResultLeadBanner(mode: BattleResultLeadMode): void {
    const { width: scW, height: scH } = this.cameras.main;
    const iconResource = getBattleResultLeadIconResource(mode);
    this.battleResultLeadIcon = null;
    this.battleResultLeadIconFallbackRendered = false;
    this.battleResultLeadText = null;

    if (mode === 'victory') {
      const hasIcon = this._addBattleResultLeadIcon(mode, scW / 2 - 116, scH / 3, iconResource);
      const label = hasIcon ? 'Victory!' : '🎉 Victory!';
      this.battleResultLeadText = this.add.text(hasIcon ? scW / 2 + 20 : scW / 2, scH / 3, label, {
        fontSize: '42px',
        fontFamily: FONT_FAMILY,
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(0).setDepth(500);
    } else {
      const hasIcon = this._addBattleResultLeadIcon(mode, scW / 2 - 92, scH / 3, iconResource);
      const label = hasIcon ? '패배...' : '💔 패배...';
      this.battleResultLeadText = this.add.text(hasIcon ? scW / 2 + 20 : scW / 2, scH / 3, label, {
        fontSize: '36px',
        fontFamily: FONT_FAMILY,
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setAlpha(0).setDepth(500);
    }

    const leadTweenTargets: Phaser.GameObjects.GameObject[] = [];
    if (this.battleResultLeadText) leadTweenTargets.push(this.battleResultLeadText);
    if (this.battleResultLeadIcon) leadTweenTargets.push(this.battleResultLeadIcon);

    this.tweens.add({
      targets: leadTweenTargets,
      alpha: 1,
      scaleX: mode === 'victory' ? 1.1 : 1,
      scaleY: mode === 'victory' ? 1.1 : 1,
      duration: mode === 'victory' ? 500 : 600,
      ease: mode === 'victory' ? 'Back.easeOut' : undefined,
    });
  }

  private _showVictory(): void {
    this.battleUI?.addLog('🎉 승리!');
    playSfx(this, COMBAT_VOICE.VICTORY, 0.8);
    playSfx(this, 'sfx_ui_quest_complete', 0.6);

    this._showBattleResultLeadBanner('victory');

    // 결과 화면 (1초 후)
    this.time.delayedCall(1200, () => {
      this._showResultPopup();
    });
  }

  /**
   * 키보드 컷오버: 결과/패배 팝업을 Enter/ESC 로 닫는다. victory/defeat phase 는 update 가
   * early-return(L692) 해 _handleKeyboardInput 의 폴링 키 입력이 죽으므로, 폴링이 아니라
   * 이벤트 once 로 _exitBattle 을 건다(_exiting 가드로 중복 안전, 씬 종료 시 dangling once 정리).
   * keyboardOnlyMode(마우스 차단) 에서 전투를 빠져나가는 유일 경로 — 이게 없으면 하드 softlock.
   */
  private _bindPopupExitKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    const exit = (): void => { this._exitBattle(); };
    kb.once('keydown-ENTER', exit);
    kb.once('keydown-ESC', exit);
  }

  private _addBattleResultRewardIcon(
    container: Phaser.GameObjects.Container,
    kind: BattleResultRewardIconKind,
    x: number,
    y: number,
    resource: BattleIconResource | undefined,
  ): boolean {
    if (!resource || !this.textures.exists(resource.key)) {
      this.battleResultRewardIconFallbackKinds.push(kind);
      return false;
    }

    const rewardIcon = this.add.image(x, y, resource.key)
      .setName(`battle_result_${kind}_icon`)
      .setOrigin(0.5);
    rewardIcon.setDisplaySize(BATTLE_RESULT_REWARD_ICON_SIZE, BATTLE_RESULT_REWARD_ICON_SIZE);
    rewardIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(rewardIcon);
    this.battleResultRewardIcons.push(rewardIcon);
    return true;
  }

  private _addBattleDefeatTitleIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    resource: BattleIconResource | undefined,
  ): boolean {
    if (!resource || !this.textures.exists(resource.key)) {
      this.battleDefeatTitleIconFallbackRendered = true;
      return false;
    }

    const defeatIcon = this.add.image(x, y, resource.key)
      .setName('battle_defeat_title_icon')
      .setOrigin(0.5);
    defeatIcon.setDisplaySize(BATTLE_DEFEAT_TITLE_ICON_SIZE, BATTLE_DEFEAT_TITLE_ICON_SIZE);
    defeatIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    container.add(defeatIcon);
    this.battleDefeatTitleIcon = defeatIcon;
    return true;
  }

  private _showResultPopup(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const container = this.add.container(cx, cy).setDepth(600);
    this.battleResultRewardIcons = [];
    this.battleResultRewardIconFallbackKinds = [];

    // 배경
    this._addBattleSceneFrame(
      0,
      0,
      400,
      320,
      BATTLE_SCENE_UI_FRAME_TEXTURES.resultPopup,
      0x0a0a2e,
      0.95,
      0xffcc00,
      2,
      undefined,
      container,
    );

    const titleIconResource = getBattleResultRewardIconResource('title');
    const hasTitleIcon = this._addBattleResultRewardIcon(container, 'title', -88, -130, titleIconResource);
    const titleLabel = hasTitleIcon ? '전투 결과' : '🏆 전투 결과';
    const title = this.add.text(hasTitleIcon ? 18 : 0, -130, titleLabel, {
      fontSize: '22px', fontFamily: FONT_FAMILY, color: '#ffcc00',
    }).setOrigin(0.5);
    container.add(title);

    // EXP / 골드 (간이 계산)
    const totalEnemyLevel = this.enemySprites.reduce((sum, e) => sum + (e.unit.level ?? 1), 0);
    const rewardMultiplier = this._initData.rewardMultiplier ?? 1;
    const exp = Math.round((totalEnemyLevel * 25 + Phaser.Math.Between(10, 50)) * rewardMultiplier);
    const gold = Math.round((totalEnemyLevel * 10 + Phaser.Math.Between(5, 30)) * rewardMultiplier);

    const expIconResource = getBattleResultRewardIconResource('exp');
    const hasExpIcon = this._addBattleResultRewardIcon(container, 'exp', -158, -70, expIconResource);
    const expLabel = hasExpIcon ? `경험치: +${exp}` : `✨ 경험치: +${exp}`;
    const expText = this.add.text(hasExpIcon ? -132 : -150, -80, expLabel, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#88ccff',
    });
    container.add(expText);

    const goldIconResource = getBattleResultRewardIconResource('gold');
    const hasGoldIcon = this._addBattleResultRewardIcon(container, 'gold', -158, -40, goldIconResource);
    const goldLabel = hasGoldIcon ? `골드: +${gold}` : `💰 골드: +${gold}`;
    const goldText = this.add.text(hasGoldIcon ? -132 : -150, -50, goldLabel, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffcc44',
    });
    container.add(goldText);

    // 전리품
    const loot = this.combatManager?.getLoot() ?? [];
    const lootIconResource = getBattleResultRewardIconResource('loot');
    const hasLootIcon = this._addBattleResultRewardIcon(container, 'loot', -158, -5, lootIconResource);
    const lootTitleLabel = hasLootIcon ? '전리품:' : '📦 전리품:';
    const lootTitle = this.add.text(hasLootIcon ? -132 : -150, -15, lootTitleLabel, {
      fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ffffff',
    });
    container.add(lootTitle);

    loot.forEach((item: LootItem, i: number) => {
      const txt = this.add.text(-130, 10 + i * 22, `• ${item.name} x${item.quantity}`, {
        fontSize: '13px', fontFamily: FONT_FAMILY, color: '#aaaaaa',
      });
      container.add(txt);
    });

    if (loot.length === 0) {
      const noLoot = this.add.text(-130, 10, '(없음)', {
        fontSize: '13px', fontFamily: FONT_FAMILY, color: '#666666',
      });
      container.add(noLoot);
    }

    // 확인 버튼 (Enter/ESC 키로도 닫힘 — 마우스 없이 전투 종료)
    const closeBtn = this.add.text(0, 120, '[ 확인 ] (Enter)', {
      fontSize: '18px', fontFamily: FONT_FAMILY, color: '#88ff88',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this._exitBattle());
    closeBtn.on('pointerover', () => closeBtn.setColor('#ccffcc'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#88ff88'));
    container.add(closeBtn);

    this.lootPopup = container;
    this._bindPopupExitKeys(); // 키보드 컷오버: Enter/ESC → _exitBattle
  }

  private _writeBattleCommandFocusIconQaProbe(activeIndex = 0): void {
    if (this._initData.battleCommandFocusIconQa !== true || typeof document === 'undefined' || !document.body) return;

    const commandFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_COMMAND_FOCUS_ICON_ID);
    const focusIcon = this.battleCommandFocusIcon?.active === true
      ? this.battleCommandFocusIcon
      : null;
    const labels = this.battleCommandFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingBattleCommandFocusIconKeys = focusIcon && commandFocusIconResource
      ? []
      : [commandFocusIconResource?.key ?? BATTLE_COMMAND_FOCUS_ICON_ID];

    document.body.dataset.aeternaBattleCommandFocusIconQa = JSON.stringify({
      status: focusIcon && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      activeIndex,
      focusIcon: {
        key: commandFocusIconResource?.key ?? null,
        path: commandFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: BATTLE_COMMAND_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.battleCommandFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      labels,
      legacyGlyphPresent,
      missingBattleCommandFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _writeBattleSubMenuFocusIconQaProbe(
    subMenuType: 'magic' | 'item' = this._getActiveBattleSubMenuType(),
    activeIndex = 0,
  ): void {
    if (!this._initData.battleSubMenuFocusIconQa || typeof document === 'undefined' || !document.body) return;

    const subMenuFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_SUB_MENU_FOCUS_ICON_ID);
    const focusIcon = this.battleSubMenuFocusIcon?.active === true
      ? this.battleSubMenuFocusIcon
      : null;
    const labels = this.battleSubMenuFocusTexts.map((text) => text.text);
    const legacyGlyphPresent = labels.some((label) => label.includes('▶'));
    const missingBattleSubMenuFocusIconKeys = focusIcon && subMenuFocusIconResource
      ? []
      : [subMenuFocusIconResource?.key ?? BATTLE_SUB_MENU_FOCUS_ICON_ID];

    document.body.dataset.aeternaBattleSubMenuFocusIconQa = JSON.stringify({
      status: focusIcon && this.subMenuItems.length > 0 && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      subMenuType,
      activeIndex,
      itemCount: this.subMenuItems.length,
      focusIcon: {
        key: subMenuFocusIconResource?.key ?? null,
        path: subMenuFocusIconResource?.path ?? null,
        renderedCount: focusIcon ? 1 : 0,
        expectedCount: BATTLE_SUB_MENU_FOCUS_ICON_EXPECTED_COUNT,
        displaySizes: focusIcon ? [{ width: focusIcon.displayWidth, height: focusIcon.displayHeight }] : [],
        fallbackRendered: this.battleSubMenuFocusIconFallbackRendered,
        visible: focusIcon?.visible ?? false,
        x: focusIcon?.x ?? null,
        y: focusIcon?.y ?? null,
      },
      labels,
      legacyGlyphPresent,
      missingBattleSubMenuFocusIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private _writeBattleAmbientLineQaProbe({
    fieldEnc,
    ambientText,
    hasAmbientIcon,
    hasBossIcon,
  }: {
    fieldEnc: NonNullable<ReturnType<typeof resolveFieldEncounter>>;
    ambientText: Phaser.GameObjects.Text;
    hasAmbientIcon: boolean;
    hasBossIcon: boolean;
  }): void {
    if (this._initData.battleAmbientLineQa !== true || typeof document === 'undefined') return;

    const ambientIconResource = getStatusIconResource(BATTLE_FIELD_AMBIENT_ICON_ID);
    const bossIconResource = getSpriteResourceForSkillIcon(BATTLE_FIELD_BOSS_ICON_ID);
    const ambientIcons = this.fieldAmbientIcons.filter((icon) => icon.name === 'battle_field_ambient_ambient_icon');
    const bossIcons = this.fieldAmbientIcons.filter((icon) => icon.name === 'battle_field_ambient_boss_icon');
    const missingAmbientIconKeys = hasAmbientIcon
      ? []
      : [ambientIconResource?.key ?? BATTLE_FIELD_AMBIENT_ICON_ID];
    const missingBossIconKeys = fieldEnc.hasBossSlot && !hasBossIcon
      ? [bossIconResource?.key ?? BATTLE_FIELD_BOSS_ICON_ID]
      : [];
    const legacyGlyphPresent = ambientText.text.includes('🛡') || ambientText.text.includes('⚔');

    document.body.dataset.aeternaBattleAmbientLineQa = JSON.stringify({
      status: missingAmbientIconKeys.length === 0 && missingBossIconKeys.length === 0 && !legacyGlyphPresent ? 'ready' : 'missing-icon',
      ambientLine: fieldEnc.ambientLine,
      hasBossSlot: fieldEnc.hasBossSlot,
      text: ambientText.text,
      legacyGlyphPresent,
      ambientIcon: {
        iconId: BATTLE_FIELD_AMBIENT_ICON_ID,
        key: ambientIconResource?.key ?? null,
        path: ambientIconResource?.path ?? null,
        renderedCount: ambientIcons.length,
        displaySizes: ambientIcons.map((icon) => ({ width: icon.displayWidth, height: icon.displayHeight })),
        fallbackRendered: this.fieldAmbientIconFallbackKinds.includes('ambient'),
      },
      bossIcon: {
        iconId: BATTLE_FIELD_BOSS_ICON_ID,
        key: bossIconResource?.key ?? null,
        path: bossIconResource?.path ?? null,
        expectedCount: fieldEnc.hasBossSlot ? 1 : 0,
        renderedCount: bossIcons.length,
        displaySizes: bossIcons.map((icon) => ({ width: icon.displayWidth, height: icon.displayHeight })),
        fallbackRendered: this.fieldAmbientIconFallbackKinds.includes('boss'),
      },
      missingAmbientIconKeys,
      missingBossIconKeys,
    });
  }

  private _startBattleResultFrameQa(): void {
    const mode = this._initData.battleResultFrameQa;
    if (mode !== 'victory' && mode !== 'defeat') return;

    this.time.delayedCall(100, () => {
      if (mode === 'victory') {
        this._showResultPopup();
      } else {
        this._showDefeatPopup();
      }
      this._writeBattleResultFrameQaProbe(mode);
    });
  }

  private _startBattleResultLeadQa(): void {
    const mode = this._initData.battleResultLeadQa;
    if (mode !== 'victory' && mode !== 'defeat') return;

    this.time.delayedCall(100, () => {
      this._showBattleResultLeadBanner(mode);
      this._writeBattleResultLeadQaProbe(mode);
    });
  }

  private _writeBattleResultLeadQaProbe(mode: BattleResultLeadMode): void {
    if (typeof document === 'undefined') return;

    const expectedIconResource = getBattleResultLeadIconResource(mode);
    const expectedTextureKeys = expectedIconResource ? [expectedIconResource.key] : [];
    const activeLeadIcons = this.battleResultLeadIcon?.active ? [this.battleResultLeadIcon] : [];
    const renderedTextureKeys = activeLeadIcons.map((icon) => icon.texture.key);
    const missingBattleResultLeadIconKeys = expectedTextureKeys
      .filter((key) => !renderedTextureKeys.includes(key));
    const leadLabel = this.battleResultLeadText?.text ?? '';
    const leadLegacyGlyphPresent = leadLabel.includes('🎉') || leadLabel.includes('💔');
    const hasExpectedIcon = activeLeadIcons.length >= 1
      && missingBattleResultLeadIconKeys.length === 0
      && !this.battleResultLeadIconFallbackRendered
      && !leadLegacyGlyphPresent;

    document.body.dataset.aeternaBattleResultLeadQa = JSON.stringify({
      mode,
      status: hasExpectedIcon ? 'ready' : 'missing-icon',
      battleResultLeadIcon: {
        expectedCount: 1,
        renderedCount: activeLeadIcons.length,
        expectedTextureKeys,
        renderedTextureKeys,
        displaySizes: activeLeadIcons.map((icon) => ({ width: icon.displayWidth, height: icon.displayHeight })),
        fallbackRendered: this.battleResultLeadIconFallbackRendered,
      },
      leadLabel,
      leadLegacyGlyphPresent,
      missingBattleResultLeadIconKeys,
    });
  }

  private _writeBattleResultFrameQaProbe(mode: 'victory' | 'defeat'): void {
    if (typeof document === 'undefined') return;

    const frameTexture = mode === 'victory'
      ? BATTLE_SCENE_UI_FRAME_TEXTURES.resultPopup
      : BATTLE_SCENE_UI_FRAME_TEXTURES.defeatPopup;
    const hasTexture = this.textures.exists(frameTexture.key);
    const expectedRewardIconKeys = mode === 'victory'
      ? (Object.keys(BATTLE_RESULT_REWARD_ICON_IDS) as BattleResultRewardIconKind[])
        .map((kind) => getBattleResultRewardIconResource(kind)?.key)
        .filter((key): key is string => typeof key === 'string')
      : [];
    const defeatTitleIconResource = getStatusIconResource(BATTLE_DEFEAT_TITLE_ICON_ID);
    const expectedDefeatTitleIconKeys = mode === 'defeat' && defeatTitleIconResource
      ? [defeatTitleIconResource.key]
      : [];
    const activeRewardIcons = mode === 'victory'
      ? this.battleResultRewardIcons.filter((icon) => icon.active)
      : [];
    const renderedRewardIconKeys = activeRewardIcons.map((icon) => icon.texture.key);
    const missingBattleResultRewardIconKeys = expectedRewardIconKeys
      .filter((key) => !renderedRewardIconKeys.includes(key));
    const activeDefeatTitleIcons = mode === 'defeat' && this.battleDefeatTitleIcon?.active
      ? [this.battleDefeatTitleIcon]
      : [];
    const renderedDefeatTitleIconKeys = activeDefeatTitleIcons.map((icon) => icon.texture.key);
    const missingBattleDefeatTitleIconKeys = expectedDefeatTitleIconKeys
      .filter((key) => !renderedDefeatTitleIconKeys.includes(key));
    const popupTexts = this.lootPopup?.list
      .filter((child): child is Phaser.GameObjects.Text => child instanceof Phaser.GameObjects.Text)
      .map((text) => text.text) ?? [];
    const rewardLegacyGlyphPresent = mode === 'victory'
      && popupTexts.some((label) => (
        label.includes('🏆')
        || label.includes('✨')
        || label.includes('💰')
        || label.includes('📦')
      ));
    const defeatTitleLegacyGlyphPresent = mode === 'defeat'
      && popupTexts.some((label) => label.includes('💔'));
    const hasExpectedRewardIcons = mode !== 'victory'
      || (
        activeRewardIcons.length >= BATTLE_RESULT_REWARD_ICON_EXPECTED_COUNT
        && missingBattleResultRewardIconKeys.length === 0
        && !rewardLegacyGlyphPresent
      );
    const hasExpectedDefeatTitleIcon = mode !== 'defeat'
      || (
        activeDefeatTitleIcons.length >= BATTLE_DEFEAT_TITLE_ICON_EXPECTED_COUNT
        && missingBattleDefeatTitleIconKeys.length === 0
        && !this.battleDefeatTitleIconFallbackRendered
        && !defeatTitleLegacyGlyphPresent
      );

    document.body.dataset.aeternaBattleResultFrameQa = JSON.stringify({
      mode,
      status: hasTexture && hasExpectedRewardIcons && hasExpectedDefeatTitleIcon ? 'ready' : 'missing-texture-or-icon',
      renderedFrameKeys: hasTexture ? [frameTexture.key] : [],
      missingFrameKeys: hasTexture ? [] : [frameTexture.key],
      resultRewardIcon: {
        expectedCount: mode === 'victory' ? BATTLE_RESULT_REWARD_ICON_EXPECTED_COUNT : 0,
        renderedCount: activeRewardIcons.length,
        expectedTextureKeys: expectedRewardIconKeys,
        renderedTextureKeys: renderedRewardIconKeys,
        displaySizes: activeRewardIcons.map((icon) => ({ width: icon.displayWidth, height: icon.displayHeight })),
        fallbackKinds: this.battleResultRewardIconFallbackKinds,
      },
      defeatTitleIcon: {
        expectedCount: mode === 'defeat' ? BATTLE_DEFEAT_TITLE_ICON_EXPECTED_COUNT : 0,
        renderedCount: activeDefeatTitleIcons.length,
        expectedTextureKeys: expectedDefeatTitleIconKeys,
        renderedTextureKeys: renderedDefeatTitleIconKeys,
        displaySizes: activeDefeatTitleIcons.map((icon) => ({ width: icon.displayWidth, height: icon.displayHeight })),
        fallbackRendered: this.battleDefeatTitleIconFallbackRendered,
      },
      rewardLabels: popupTexts,
      rewardLegacyGlyphPresent,
      rewardTitleLegacyGlyphPresent: rewardLegacyGlyphPresent,
      defeatTitleLegacyGlyphPresent,
      missingBattleResultRewardIconKeys,
      missingBattleDefeatTitleIconKeys,
    });
  }

  private _writeBattlePaceFrameQaProbe(): void {
    if (this._initData.battlePaceFrameQa !== true || typeof document === 'undefined') return;

    const frameTexture = BATTLE_SCENE_UI_FRAME_TEXTURES.paceButton;
    const renderedFrameCount = this.battleSceneFrameQaRenderedCounts.get(frameTexture.key) ?? 0;
    const hasExpectedFrames = this.textures.exists(frameTexture.key) && renderedFrameCount >= 3;
    document.body.dataset.aeternaBattlePaceFrameQa = JSON.stringify({
      status: hasExpectedFrames ? 'ready' : 'missing-frame',
      renderedFrameKeys: renderedFrameCount > 0 ? [frameTexture.key] : [],
      renderedFrameCount,
      expectedFrameCount: 3,
      missingFrameKeys: hasExpectedFrames ? [] : [frameTexture.key],
      buttonLabels: ['MODE', 'AUTO', 'Speed'],
    });
  }

  private _applyBattleComboTechFrameQa(): void {
    if (this._initData.battleComboTechFrameQa !== true || typeof document === 'undefined') return;

    this.dualTechButton?.setVisible(true);
    this.tripleTechButton?.setVisible(true);

    const frameTexture = BATTLE_SCENE_UI_FRAME_TEXTURES.comboTechButton;
    const renderedFrameCount = this.battleSceneFrameQaRenderedCounts.get(frameTexture.key) ?? 0;
    const hasExpectedFrames = this.textures.exists(frameTexture.key) && renderedFrameCount >= 2;
    const renderedIconTextureKeys = this.comboTechButtonIcons.map((icon) => icon.texture.key);
    const expectedIconTextureKeys = Object.values(BATTLE_COMBO_TECH_BUTTON_ICON_IDS)
      .map((iconId) => getSpriteResourceForSkillIcon(iconId)?.key)
      .filter((key): key is string => typeof key === 'string');
    const missingIconTextureKeys = expectedIconTextureKeys.filter((key) => !renderedIconTextureKeys.includes(key));
    const hasExpectedIcons = missingIconTextureKeys.length === 0 && this.comboTechButtonIcons.length >= 2;
    document.body.dataset.aeternaBattleComboTechFrameQa = JSON.stringify({
      status: hasExpectedFrames && hasExpectedIcons ? 'ready' : 'missing-frame-or-icon',
      renderedFrameKeys: renderedFrameCount > 0 ? [frameTexture.key] : [],
      renderedFrameCount,
      expectedFrameCount: 2,
      missingFrameKeys: hasExpectedFrames ? [] : [frameTexture.key],
      buttonLabels: [
        this._getComboTechButtonLabel(this.dualTechButton)?.text ?? '',
        this._getComboTechButtonLabel(this.tripleTechButton)?.text ?? '',
      ],
      comboTechButtonIcon: {
        renderedIconCount: this.comboTechButtonIcons.length,
        expectedIconCount: 2,
        iconNames: this.comboTechButtonIcons.map((icon) => icon.name),
        textureKeys: renderedIconTextureKeys,
        displaySizes: this.comboTechButtonIcons.map((icon) => ({
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        missingIconTextureKeys,
      },
    });
  }

  // ─── 패배 연출 ───────────────────────────────────────────────

  private _showDefeat(): void {
    const { width: scW, height: scH } = this.cameras.main;

    this.battleUI?.addLog('💔 패배...');

    // 화면 붉은 플래시 — UX(rank6): 전체화면 적색 점멸은 광과민성 최고위험 패턴이라 reduce-motion
    //   (흔들림 설정 off)일 땐 점멸 없이 정적 옅은 오버레이로 대체. 같은 파일의 모든 shake 는 이미 게이트됨.
    const flash = this.add.rectangle(scW / 2, scH / 2, scW, scH, 0xff0000, 0).setDepth(400);
    if (isScreenShakeEnabled()) {
      this.tweens.add({
        targets: flash,
        alpha: 0.3,
        duration: 300,
        yoyo: true,
        repeat: 2,
        onComplete: () => flash.destroy(),
      });
    } else {
      // 점멸 없이 1회 옅게 페이드인 후 유지(씬 종료 시 정리). 색만으로 '패배' 분위기 전달.
      this.tweens.add({ targets: flash, alpha: 0.15, duration: 400 });
    }

    this._showBattleResultLeadBanner('defeat');

    // 패배 팝업
    this.time.delayedCall(2000, () => {
      this._showDefeatPopup();
    });
  }

  private _showDefeatPopup(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const container = this.add.container(cx, cy).setDepth(600);
    this.battleDefeatTitleIcon = null;
    this.battleDefeatTitleIconFallbackRendered = false;
    this._addBattleSceneFrame(
      0,
      0,
      280,
      140,
      BATTLE_SCENE_UI_FRAME_TEXTURES.defeatPopup,
      0x000000,
      0.9,
      0xff4444,
      2,
      undefined,
      container,
    );

    const defeatTitleIconResource = getStatusIconResource(BATTLE_DEFEAT_TITLE_ICON_ID);
    const hasTitleIcon = this._addBattleDefeatTitleIcon(container, -64, -30, defeatTitleIconResource);
    const titleLabel = hasTitleIcon ? '전투 실패' : '💔 전투 실패';
    const title = this.add.text(hasTitleIcon ? 12 : 0, -30, titleLabel, {
      fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ff4444',
    }).setOrigin(0.5);
    container.add(title);

    const closeBtn = this.add.text(0, 30, '[ 돌아가기 ] (Enter)', {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#aaaaaa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._exitBattle());
    container.add(closeBtn);

    this.lootPopup = container;
    this._bindPopupExitKeys(); // 키보드 컷오버: Enter/ESC → _exitBattle (마우스 없이 패배 종료)
  }

  // ─── 기본 유닛 생성 (폴백) ────────────────────────────────────

  private _createDefaultAllies(): CombatUnit[] {
    const classId = this._initData.characterClass ?? 'ether_knight';
    const charName = (this._initData as unknown as Record<string, unknown>)?.characterName as string ?? '모험자';
    const level = (this._initData as unknown as Record<string, unknown>)?.level as number ?? 1;
    return [{
      id: this._initData.characterId ?? 'player_1',
      name: charName,
      hp: 500, maxHp: 500,
      mp: 150, maxMp: 150,
      attack: 30,
      defense: 10,
      attackSpeed: 1.0,
      level,
      isAlly: true,
      classId,
    }];
  }

  private _createDefaultEnemies(): CombatUnit[] {
    const monsterName = this._initData.monsterName ?? '공허 딱정벌레';
    const hpMultiplier = this._initData.enemyHpMultiplier ?? 1;
    const speedMultiplier = this._initData.enemyAttackSpeedMultiplier ?? 1;
    const maxHp = Math.max(1, Math.round(300 * hpMultiplier));
    return [{
      id: this._initData.monsterId ?? 'enemy_1',
      name: monsterName,
      hp: maxHp, maxHp,
      mp: 0, maxMp: 0,
      attack: 15,
      defense: 5,
      attackSpeed: 0.8 * speedMultiplier,
      level: 1,
      isAlly: false,
    }];
  }

  // ─── 몬스터 매니페스트 키 매칭 ────────────────────────────────

  /** 몬스터 이름 해시 → 고유 색상 */
  private _monsterColor(name: string): number {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = Math.min(220, Math.abs((hash >> 0) & 0xFF) * 0.55 + 60);
    const g = Math.min(200, Math.abs((hash >> 8) & 0xFF) * 0.45 + 40);
    const b = Math.min(220, Math.abs((hash >> 16) & 0xFF) * 0.55 + 60);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  /** 몬스터 id/name → 아이콘 이모지 */
  private _monsterIcon(id: string, name: string): string {
    const lower = `${id} ${name}`.toLowerCase();
    if (/skeleton|bone/.test(lower)) return '\u{1F480}';
    if (/wolf|hound/.test(lower)) return '\u{1F43A}';
    if (/ghost|spirit|shade|phantom/.test(lower)) return '\u{1F47B}';
    if (/spider/.test(lower)) return '\u{1F577}';
    if (/golem|stone|rock/.test(lower)) return '\u{1FAA8}';
    if (/rat|beetle|bug/.test(lower)) return '\u{1F41B}';
    if (/bird|bat|hawk/.test(lower)) return '\u{1F987}';
    if (/serpent|snake|worm/.test(lower)) return '\u{1F40D}';
    if (/slime|blob/.test(lower)) return '\u{1FAE7}';
    if (/boss|absorber/.test(lower)) return '\u{1F441}';
    return '\u2694\uFE0F';
  }

  // ─── P25-05: 서버 전투 연동 ───────────────────────────────────

  private async _startServerCombat(): Promise<void> {
    if (!this._shouldUseServerCombat()) {
      return;
    }

    try {
      // 서버 전투 계약: 파티 캐릭터 DB id 배열 + zoneId(서버가 zone 의 DB 몬스터를 해결).
      // characterId 는 세션의 활성 캐릭터(networkManager.activeCharacterId)를 우선 사용한다.
      const characterId = this._initData.characterId ?? networkManager.activeCharacterId ?? networkManager.userId ?? '';
      const result = await networkManager.combatStart({
        partyCharacterIds: characterId ? [characterId] : [],
        zoneId: this._initData.zoneId,
        // CHRONO-S8: 현재 시대 전달 → 서버가 ATB SpeedTier 매핑 자동 적용
        eraId: this._initData.eraId,
      });
      this.serverCombatId = result.combatId;
      this.battleUI?.addLog(`[서버] 전투 ID: ${result.combatId}`);
      this._setupConnectionBadge(); // UX(#13): 연결 끊김 감지 + 배지
    } catch (err) {
      console.warn('[BattleScene] 서버 전투 시작 실패 (로컬 모드):', err);
    }
  }

  /** UX(#13): 전투 중 연결 끊김/재연결 상태를 상단 배지로 표시하고 ATB 를 정지(silent freeze 방지). */
  private _setupConnectionBadge(): void {
    if (!this.connectionBadge) {
      const cx = this.cameras.main.width / 2;
      this.connectionBadge = this.add.text(cx, 64, '', {
        fontSize: '14px', fontFamily: FONT_FAMILY, color: '#ffcc44',
        backgroundColor: '#000000cc', padding: { x: 12, y: 6 }, stroke: '#000000', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(9500).setVisible(false);
    }
    const unsub = networkManager.onConnectionChange((state) => {
      if (state === 'reconnecting' || state === 'connecting' || state === 'disconnected' || state === 'error') {
        const reconnecting = state !== 'error';
        this.connectionBadge
          ?.setText(reconnecting ? '○ 재연결 중… 전투 일시정지' : '✕ 연결 실패 — 재시도 중')
          .setColor(reconnecting ? '#ffaa44' : '#ff5555')
          .setVisible(true);
        this.atbFrozenByConnection = true;
      } else if (state === 'connected') {
        if (this.atbFrozenByConnection) this.battleUI?.addLog('🔌 재연결됨 — 전투 재개');
        this.atbFrozenByConnection = false;
        this.connectionBadge?.setVisible(false);
      }
    });
    this.socketCleanups.push(unsub);
  }

  /**
   * CHRONO-S25: 'D' 키 → 첫 Dual Tech 후보 발동.
   * lastDualTechCandidates[0] + 첫 alive 적을 target 으로 networkManager.combatDualTech 호출.
   * UI 발동 버튼 풀 구현 전 빠른 데모 path (사용자 입력 → 협공 발동 가능).
   */
  private async _triggerFirstDualTech(): Promise<void> {
    if (!this.serverCombatId) {
      this.battleUI?.addLog('[협공] 서버 전투 미연결');
      return;
    }
    const cand = this.lastDualTechCandidates[this.dualTechSelectedIndex] ?? this.lastDualTechCandidates[0];
    if (!cand) {
      this.battleUI?.addLog('[협공] 발동 가능한 후보 없음 (양쪽 ATB 100% + 호환 클래스 필요)');
      return;
    }
    const targetSprite = this.enemySprites.find((s) => s.unit.alive);
    if (!targetSprite) {
      this.battleUI?.addLog('[협공] 살아있는 적이 없습니다');
      return;
    }
    try {
      const resp = await networkManager.combatDualTech({
        combatId: this.serverCombatId,
        actorIdA: cand.actorIds[0],
        actorIdB: cand.actorIds[1],
        techId: cand.techId,
        targetId: targetSprite.unit.id,
      });
      if (resp.success) {
        this.battleUI?.addLog(`✨ 협공 발동: ${cand.name}`);
        // CHRONO-S27: target 위치에 시각 효과 재생
        const fxKey = `fx_${cand.techId}`;
        this.effectManager?.spawnDualTechEffect(
          targetSprite.sprite.x,
          targetSprite.sprite.y,
          fxKey,
          cand.name,
        );
        // CHRONO-S33/S44: element 기반 SFX 차별화
        const def = getDualTechById(cand.techId);
        const sfxKey = def
          ? DUAL_TECH_SFX_BY_ELEMENT[def.element] ?? 'sfx_combat_magic_cast'
          : 'sfx_combat_magic_cast';
        playSfx(this, sfxKey, 0.8);
        playSfx(this, COMBAT_VOICE.SKILL_CAST, 0.7);
        // CHRONO-S49: 카메라 shake — AOE 강 (180ms, 0.01), 단일 약 (120ms, 0.006)
        if (isScreenShakeEnabled()) {
          const aoe = def?.aoe ?? false;
          this.cameras.main.shake(aoe ? 180 : 120, aoe ? 0.01 : 0.006);
        }
      } else {
        this.battleUI?.addLog(`[협공] 발동 실패`);
      }
    } catch (err) {
      console.warn('[BattleScene] 협공 발동 실패:', err);
      this.battleUI?.addLog('[협공] 네트워크 오류');
    }
  }

  /**
   * CHRONO-S51: 보스 sprite 위에 협공 저항 단계 텍스트 부착/갱신.
   * sprite 데이터에 캐싱하여 중복 생성 방지.
   */
  /**
   * CHRONO-S86: 협공 완전 면역 보스 라벨 (별도 색조 — 흰색 강조).
   */
  private _updateBossImmuneLabel(
    enemy: { unit: { id: string }; sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle },
  ): void {
    const cacheKey = '__bossResistText';
    const existing = (enemy as unknown as Record<string, Phaser.GameObjects.Text | undefined>)[cacheKey];
    const label = '🛡 협공 면역';
    if (existing) {
      existing.setText(label).setColor('#ffffff');
      existing.setPosition(enemy.sprite.x, enemy.sprite.y - 80);
      return;
    }
    const t = this.add.text(enemy.sprite.x, enemy.sprite.y - 80, label, {
      fontSize: '12px',
      fontFamily: FONT_FAMILY,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8800).setName(`bossImmune_${enemy.unit.id}`);
    (enemy as unknown as Record<string, Phaser.GameObjects.Text | undefined>)[cacheKey] = t;
  }

  private _updateBossResistLabel(
    enemy: { unit: { id: string }; sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle },
    dualHits: number,
    tripleHits: number,
  ): void {
    const cacheKey = '__bossResistText';
    const existing = (enemy as unknown as Record<string, Phaser.GameObjects.Text | undefined>)[cacheKey];
    const parts: string[] = [];
    if (dualHits > 0) parts.push(`Dual +${dualHits * 5}%`);
    if (tripleHits > 0) parts.push(`Triple +${tripleHits * 10}%`);
    const label = `🛡 ${parts.join(' / ')}`;
    if (existing) {
      existing.setText(label);
      existing.setPosition(enemy.sprite.x, enemy.sprite.y - 80);
      return;
    }
    const t = this.add.text(enemy.sprite.x, enemy.sprite.y - 80, label, {
      fontSize: '11px',
      fontFamily: FONT_FAMILY,
      color: '#ffd54a',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(8800).setName(`bossResist_${enemy.unit.id}`);
    (enemy as unknown as Record<string, Phaser.GameObjects.Text | undefined>)[cacheKey] = t;
  }

  /**
   * CHRONO-S63: 'T' 키 → 첫 Triple Tech 후보 발동.
   */
  private async _triggerFirstTripleTech(): Promise<void> {
    if (!this.serverCombatId) {
      this.battleUI?.addLog('[3인 협공] 서버 전투 미연결');
      return;
    }
    const cand = this.lastTripleTechCandidates[this.tripleTechSelectedIndex] ?? this.lastTripleTechCandidates[0];
    if (!cand) {
      this.battleUI?.addLog('[3인 협공] 발동 가능한 후보 없음 (3명 ATB 100 + 호환 클래스 필요)');
      return;
    }
    const targetSprite = this.enemySprites.find((s) => s.unit.alive);
    if (!targetSprite) {
      this.battleUI?.addLog('[3인 협공] 살아있는 적이 없습니다');
      return;
    }
    try {
      const resp = await networkManager.combatTripleTech({
        combatId: this.serverCombatId,
        actorIds: cand.actorIds,
        techId: cand.techId,
        targetId: targetSprite.unit.id,
      });
      if (resp.success) {
        this.battleUI?.addLog(`🌟 3인 협공 발동: ${cand.name}`);
        // 모든 적에 강한 시각 효과 (Triple Tech 는 항상 AOE 풍)
        for (const enemy of this.enemySprites) {
          if (!enemy.unit.alive) continue;
          this.effectManager?.spawnDualTechEffect(
            enemy.sprite.x,
            enemy.sprite.y,
            `fx_triple_${cand.techId}`,
            cand.name,
          );
        }
        // SFX + 강한 카메라 shake
        playSfx(this, 'sfx_combat_magic_cast', 1.0);
        playSfx(this, COMBAT_VOICE.SKILL_CAST, 0.9);
        if (isScreenShakeEnabled()) {
          this.cameras.main.shake(250, 0.015);
        }
      } else {
        this.battleUI?.addLog('[3인 협공] 발동 실패');
      }
    } catch (err) {
      console.warn('[BattleScene] 3인 협공 발동 실패:', err);
      this.battleUI?.addLog('[3인 협공] 네트워크 오류');
    }
  }

  /**
   * CHRONO-S87: Shift+T 로 Triple Tech 후보 cycle.
   */
  private _cycleTripleTechSelection(): void {
    if (this.lastTripleTechCandidates.length === 0) {
      this.battleUI?.addLog('[3인 협공] 후보 없음 (cycle 무효)');
      return;
    }
    this.tripleTechSelectedIndex = (this.tripleTechSelectedIndex + 1) % this.lastTripleTechCandidates.length;
    const sel = this.lastTripleTechCandidates[this.tripleTechSelectedIndex];
    this.battleUI?.addLog(
      `🔁 3인 협공 선택: ${sel.name} (${this.tripleTechSelectedIndex + 1}/${this.lastTripleTechCandidates.length})`,
    );
    const txt = this._getComboTechButtonLabel(this.tripleTechButton);
    const aoePrefix = this._hasComboTechButtonIcon(this.tripleTechButton) ? '' : (sel.aoe ? '💥 🌟 ' : '🌟 ');
    txt?.setText(`${aoePrefix}${sel.name} (T)`);
    const tint = (() => {
      switch (sel.element) {
        case 'chrono': return 0x6fd3ff;
        case 'dark': return 0xc8a2ff;
        case 'holy': return 0xffd54a;
        default: return 0xffd54a;
      }
    })();
    this._setComboTechButtonAccent(this.tripleTechButton, tint, 0.92, 3);
  }

  /**
   * CHRONO-S36: Shift+D 로 협공 후보 cycle. 다음 인덱스로 회전 + 버튼 라벨 갱신.
   */
  private _cycleDualTechSelection(): void {
    if (this.lastDualTechCandidates.length === 0) {
      this.battleUI?.addLog('[협공] 후보 없음 (cycle 무효)');
      return;
    }
    this.dualTechSelectedIndex = (this.dualTechSelectedIndex + 1) % this.lastDualTechCandidates.length;
    const sel = this.lastDualTechCandidates[this.dualTechSelectedIndex];
    this.battleUI?.addLog(
      `🔁 협공 선택: ${sel.name} (${this.dualTechSelectedIndex + 1}/${this.lastDualTechCandidates.length})`,
    );
    const txt = this._getComboTechButtonLabel(this.dualTechButton);
    const aoePrefix = this._hasComboTechButtonIcon(this.dualTechButton) ? '' : (sel.aoe ? '💥 ' : '✨ ');
    txt?.setText(`${aoePrefix}${sel.name} (D)`);
    const tint = (() => {
      switch (sel.element) {
        case 'chrono': return 0x6fd3ff;
        case 'dark': return 0xc8a2ff;
        case 'holy': return 0xffd54a;
        default: return 0x6fd3ff;
      }
    })();
    this._setComboTechButtonAccent(this.dualTechButton, tint, 0.85, 2);
  }

  private _shouldUseServerCombat(): boolean {
    if (this._initData.offlineQa) {
      return false;
    }
    return networkManager.isAuthenticated || !!this._initData.characterId;
  }

  private _setupCombatSocket(): void {
    if (!this._shouldUseServerCombat()) {
      return;
    }

    const unsub1 = networkManager.on('combat:tick', (data) => {
      const d = data as {
        combatId: string;
        turn?: number;
        tick?: number;
        actions: Array<{ actionType: string; actorName?: string; targetName?: string; damage?: number }>;
        // CHRONO-S23/S45: server TickResult.dualTechCandidates 노출 (element/aoe/mpCost 포함)
        dualTechCandidates?: Array<{
          techId: string;
          name: string;
          actorIds: [string, string];
          element?: string;
          aoe?: boolean;
          mpCost?: number;
        }>;
        // CHRONO-S63: Triple Tech 후보 (3-actor)
        tripleTechCandidates?: Array<{
          techId: string;
          name: string;
          actorIds: [string, string, string];
          element?: string;
          aoe?: boolean;
          mpCost?: number;
        }>;
        // CHRONO-S51: 보스 저항 단계 표시용 snapshot
        participants?: Array<{
          id: string;
          team: 'party' | 'monsters';
          dualTechHitsTaken?: number;
          tripleTechHitsTaken?: number;
          dualTechImmune?: boolean;
        }>;
        // CHRONO-S83: 협공 사용 통계
        combatStats?: {
          dualTechFired: number;
          tripleTechFired: number;
          maxChainReached: number;
        };
        combatEnded?: boolean;
      };
      if (d.combatId === this.serverCombatId) {
        const turn = d.turn ?? d.tick ?? 0;
        this.battleUI?.addLog(`[서버] 턴 ${turn}`);
        this._decayStatusEffects(); // UX(#7): 매 tick 상태이상 지속시간 감소 + 만료 제거
        // CHRONO-S83: 전투 종료 시 협공 통계 보고
        if (d.combatEnded && d.combatStats) {
          const cs = d.combatStats;
          this.battleUI?.addLog(
            `🏆 협공 통계: Dual ${cs.dualTechFired}회 / Triple ${cs.tripleTechFired}회 / 최대 CHAIN ×${cs.maxChainReached}`,
          );
        }
        if (d.dualTechCandidates && d.dualTechCandidates.length > 0) {
          const names = d.dualTechCandidates.map((c) => c.name).join(', ');
          this.battleUI?.addLog(`✨ 협공 가능: ${names}`);
          this.lastDualTechCandidates = d.dualTechCandidates;
          // CHRONO-S36: 후보 목록 갱신 시 selectedIndex 가 범위 밖이면 0 으로 reset
          if (this.dualTechSelectedIndex >= d.dualTechCandidates.length) {
            this.dualTechSelectedIndex = 0;
          }
          // CHRONO-S31/S46: 후보 있으면 버튼 visible + element 색조 + AOE 아이콘
          this.dualTechButton?.setVisible(true);
          const txt = this._getComboTechButtonLabel(this.dualTechButton);
          const sel = d.dualTechCandidates[this.dualTechSelectedIndex] ?? d.dualTechCandidates[0];
          const aoePrefix = this._hasComboTechButtonIcon(this.dualTechButton) ? '' : (sel.aoe ? '💥 ' : '✨ ');
          txt?.setText(`${aoePrefix}${sel.name} (D)`);
          const tint = (() => {
            switch (sel.element) {
              case 'chrono': return 0x6fd3ff;
              case 'dark': return 0xc8a2ff;
              case 'holy': return 0xffd54a;
              default: return 0x6fd3ff;
            }
          })();
          this._setComboTechButtonAccent(this.dualTechButton, tint, 0.85, 2);
        } else {
          this.lastDualTechCandidates = [];
          this.dualTechSelectedIndex = 0;
          this.dualTechButton?.setVisible(false);
        }
        // CHRONO-S63/S65/S87/S91: Triple Tech 후보 수신 + 버튼 가시화 + element 색조 + AOE
        if (d.tripleTechCandidates && d.tripleTechCandidates.length > 0) {
          const tNames = d.tripleTechCandidates.map((c) => c.name).join(', ');
          this.battleUI?.addLog(`🌟 3인 협공 가능: ${tNames} ('T' 키)`);
          this.lastTripleTechCandidates = d.tripleTechCandidates;
          if (this.tripleTechSelectedIndex >= d.tripleTechCandidates.length) {
            this.tripleTechSelectedIndex = 0;
          }
          this.tripleTechButton?.setVisible(true);
          const tTxt = this._getComboTechButtonLabel(this.tripleTechButton);
          const tSel = d.tripleTechCandidates[this.tripleTechSelectedIndex] ?? d.tripleTechCandidates[0];
          const aoePrefix = this._hasComboTechButtonIcon(this.tripleTechButton) ? '' : (tSel.aoe ? '💥 🌟 ' : '🌟 ');
          tTxt?.setText(`${aoePrefix}${tSel.name} (T)`);
          const tint = (() => {
            switch (tSel.element) {
              case 'chrono': return 0x6fd3ff;
              case 'dark': return 0xc8a2ff;
              case 'holy': return 0xffd54a;
              default: return 0xffd54a;
            }
          })();
          this._setComboTechButtonAccent(this.tripleTechButton, tint, 0.92, 3);
        } else {
          this.lastTripleTechCandidates = [];
          this.tripleTechSelectedIndex = 0;
          this.tripleTechButton?.setVisible(false);
        }
        // CHRONO-S51/S67/S86: 보스 협공 저항 / 면역 표시
        for (const sp of d.participants ?? []) {
          if (sp.team !== 'monsters') continue;
          const dHits = sp.dualTechHitsTaken ?? 0;
          const tHits = sp.tripleTechHitsTaken ?? 0;
          const immune = sp.dualTechImmune ?? false;
          if (!immune && dHits <= 0 && tHits <= 0) continue;
          const enemy = this.enemySprites.find((es) => es.unit.id === sp.id);
          if (!enemy) continue;
          if (immune) {
            this._updateBossImmuneLabel(enemy);
          } else {
            this._updateBossResistLabel(enemy, dHits, tHits);
          }
        }

        // CHRONO-S28/S70: chain combo indicator — server 가 actorName 에 '(CHAIN)' 표시
        // CHRONO-S40: AOE 협공 — actorName '(AOE)' 검출 시 모든 alive 적에 시각 효과
        const turnNow = d.turn ?? d.tick ?? 0;
        // chain 만료 검사 (5 tick 지나면 reset)
        if (this.chainCount > 0 && turnNow > this.chainExpireTick) {
          this.chainCount = 0;
          this.chainLabel?.setVisible(false).setAlpha(1);
          this.comboUI?.updateHitCount(0, 1.0); // UX(#8): 체인 만료 시 ComboUI 카운터 숨김
        } else if (this.chainCount > 0 && this.chainLabel?.visible) {
          // CHRONO-S84: 만료 임박 (2 tick 이내) 시 alpha 깜빡 시각 효과
          const remaining = this.chainExpireTick - turnNow;
          this.chainLabel.setAlpha(remaining <= 2 ? 0.6 : 1.0);
        }
        for (const act of d.actions ?? []) {
          if (act.actionType === 'dual_tech' || act.actionType === 'triple_tech') {
            const isChain = act.actorName?.includes('(CHAIN)');
            const prevChain = this.chainCount;
            if (isChain) {
              this.chainCount += 1;
              this.battleUI?.addLog(`🔥 CHAIN ×${this.chainCount}! (${act.damage ?? 0})`);
            } else {
              this.chainCount = 1;
            }
            this.chainExpireTick = turnNow + 5;
            // CHRONO-S74: 4+ 면 빨간색 강조, 그 외 gold
            const isMax = act.actorName?.includes('(MAX CHAIN)') ?? false;
            this.chainLabel
              ?.setText(`${isMax ? '💥' : '🔥'} CHAIN ×${this.chainCount}${isMax ? ' MAX' : ''}`)
              .setColor(isMax ? '#ff4444' : '#ffd54a')
              .setStroke('#000000', isMax ? 4 : 2)
              .setFontSize(isMax ? 18 : 14)
              .setVisible(true);
            // UX(#8): ComboUI 히트 카운터/체인 게이지 배선(354줄 ComboUI 의 '쌓이는 맛' 복원)
            this.comboUI?.updateHitCount(this.chainCount, 1 + this.chainCount * 0.1);
            // CHRONO-S100: chain 막 4 통과 (prev<4 && 현재>=4) 도달 시 알림 효과
            if (prevChain < 4 && this.chainCount >= 4) {
              playSfx(this, 'sfx_ui_level_up', 0.9);
              if (isScreenShakeEnabled()) {
                this.cameras.main.shake(200, 0.012);
              }
              this.battleUI?.addLog('💥 CHAIN MAX 도달! 다음 협공 +50% 데미지');
            }
            if (act.actorName?.includes('(AOE)')) {
              this.battleUI?.addLog(`💥 광역 협공: ${act.targetName ?? ''} (총 ${act.damage ?? 0})`);
              const aoeName = (act.actorName ?? '').split(' (')[0];
              for (const enemy of this.enemySprites) {
                if (!enemy.unit.alive) continue;
                this.effectManager?.spawnDualTechEffect(
                  enemy.sprite.x,
                  enemy.sprite.y,
                  'fx_aoe',
                  aoeName,
                );
              }
            }
          }
        }
      }
    });

    const unsub2 = networkManager.on('combat:result', (data) => {
      const result = data as CombatResult;
      if (result.combatId === this.serverCombatId) {
        if (result.victory) {
          this.phase = 'victory';
          this.battleUI?.addLog(`🎉 서버 승리 확인! EXP +${result.expGained}, 골드 +${result.goldGained}`);
          // CHRONO-S94: chain 보너스 적용 시 별도 강조 로그
          if (result.chainBonusApplied) {
            this.battleUI?.addLog('🔥 CHAIN 보너스 +20% 적용!');
          }
          if (result.levelUp) {
            this.battleUI?.addLog(`🆙 레벨 업! Lv.${result.levelUp.newLevel}`);
            playSfx(this, 'sfx_ui_level_up', 0.8);
          }
        }
      }
    });

    const unsub3 = networkManager.on('combat:effectApplied', (data) => {
      const d = data as { combatId: string; targetId: string; effectId: string; value: number };
      if (d.combatId === this.serverCombatId) {
        // UX(#7): 깨진 applyEffect(as any no-op) → 누적기 경유 실제 렌더
        this._applyStatusEffect(d.targetId, d.effectId, d.value);
      }
    });

    // push(= 가 아니라): _setupConnectionBadge 가 먼저 push 한 unsub 을 덮어쓰지 않도록 보강(순서 독립).
    this.socketCleanups.push(unsub1, unsub2, unsub3);
  }

  /**
   * 전투 씬의 로컬 자원 정리(멱등). 소켓 리스너 해제 + CombatManager orphan 소켓 disconnect +
   * 인디케이터/트윈 제거. SHUTDOWN(모든 종료 경로) 과 _exitBattle 양쪽에서 호출되며 1회만 실행된다.
   */
  private _teardownBattle(): void {
    if (this._battleTornDown) return;
    this._battleTornDown = true;
    this.socketCleanups.forEach((fn) => { try { fn(); } catch { /* 멱등 */ } });
    this.socketCleanups = [];
    try { this.combatManager?.destroy(); } catch { /* 이미 정리됨 */ }
    this._clearActiveIndicator();
  }

  private async _exitBattle(): Promise<void> {
    // 재진입 가드(rank12): 결과/패배/도주 버튼 연타 시 combatEnd 중복 + 다중 scene.start 레이스 방지.
    if (this._exiting) return;
    this._exiting = true;

    if (this.serverCombatId) {
      try {
        await networkManager.combatEnd(this.serverCombatId);
      } catch { /* 이미 종료되었을 수 있음 */ }
    }

    this._teardownBattle();

    if (this._initData.returnScene) {
      const allyState = this.allySprites.map(a => ({ hp: a.unit.hp, mp: a.unit.mp }));
      this.scene.start(this._initData.returnScene, {
        ...(this._initData.returnData ?? {}),
        victory: this.phase === 'victory',
        allyState,
      });
    } else {
      this.scene.start('GameScene', {
        ...this._initData,
        zoneId: this._initData.zoneId,
        eraId: this._initData.eraId,
        characterClass: this._initData.characterClass,
      });
    }
  }
}
