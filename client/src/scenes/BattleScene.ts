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
import { EffectManager } from '../effects/EffectManager';
import { SoundManager } from '../sound/SoundManager';
import { BattleUI } from '../ui/BattleUI';
import { CombatManager, CombatUnit, SkillSlot, LootItem } from '../combat/CombatManager';
import { computeCritEchoDamage, computeReflectDamage, rollMiss, type PassiveCombatantClient } from '../combat/passiveClientHelpers';
import { COMBO_MIRROR } from '../skills/comboMirror';
import { StatusEffectRenderer } from '../combat/StatusEffectRenderer';
import { ComboUI } from '../ui/ComboUI';
import { networkManager, CombatResult } from '../network/NetworkManager';
import { isScreenShakeEnabled } from './SettingsScene';
import { playSfx, playRandomVoice, COMBAT_VOICE } from '../utils/SFXHelper';
import { classSkills } from '../data/classSkills';
import { getChronoEra, type ChronoEraId } from '../time/ChronoTimeline';
import { chronoEraToSpeedTier } from '../../../shared/types/chronoEraAtb';
import { loadLastEra } from '../time/eraStorage';
import { getDualTechById } from '../../../shared/types/dualTech';

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
  eraId?: ChronoEraId;
  atbMode?: ATBMode;
  enemyHpMultiplier?: number;
  enemyAttackSpeedMultiplier?: number;
  rewardMultiplier?: number;
  offlineQa?: boolean;
  /** 전투 종료 후 복귀할 씬 (없으면 GameScene) */
  returnScene?: string;
  /** 복귀 시 전달할 데이터 (victory/allyState 자동 추가) */
  returnData?: Record<string, unknown>;
}

const DUNGEON_BATTLE_BG_KEY = 'battle_bg_dungeon';
const DUNGEON_BATTLE_BG_PATH = 'assets/generated/environment/backgrounds/DUNGEON-BG-FAR.png';

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
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  atb: number;           // 0 ~ ATB_MAX
  atbBar?: Phaser.GameObjects.Graphics;
  isAlly: boolean;
  isDead: boolean;
}

// 커맨드 메뉴 항목
type CommandType = 'attack' | 'magic' | 'item' | 'defend' | 'flee';

interface CommandOption {
  type: CommandType;
  label: string;
}

const COMMANDS: CommandOption[] = [
  { type: 'attack', label: '⚔ 공격' },
  { type: 'magic',  label: '✨ 마법' },
  { type: 'item',   label: '🎒 아이템' },
  { type: 'defend', label: '🛡 방어' },
  { type: 'flee',   label: '🏃 도주' },
];

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

  // 상태 패널
  private statusPanelContainer: Phaser.GameObjects.Container | null = null;
  private statusPanelGraphics: Phaser.GameObjects.Graphics | null = null;
  private statusTexts: Map<string, { name: Phaser.GameObjects.Text; hp: Phaser.GameObjects.Text; mp: Phaser.GameObjects.Text; atb: Phaser.GameObjects.Graphics }> = new Map();

  // 타겟 선택 모드
  private targetSelectMode = false;
  private targetSelectCallback: ((target: UnitSprite) => void) | null = null;
  private targetCursor: Phaser.GameObjects.Graphics | null = null;
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

  // P25-05: 소켓 이벤트 클린업
  private socketCleanups: Array<() => void> = [];
  private serverCombatId: string | null = null;
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
  // CHRONO-S36: 다중 후보 중 선택 인덱스 (Shift+D 로 cycle)
  private dualTechSelectedIndex = 0;
  // CHRONO-S31: 협공 발동 버튼 (후보 있을 때만 visible)
  private dualTechButton: Phaser.GameObjects.Container | null = null;
  // CHRONO-S65: 3인 협공 발동 버튼
  private tripleTechButton: Phaser.GameObjects.Container | null = null;

  // Auto-battle & speed control
  private autoMode = false;
  private speedMultiplier = 1;
  private atbMode: ATBMode = 'WAIT';
  private autoButton: Phaser.GameObjects.Text | null = null;
  private speedButton: Phaser.GameObjects.Text | null = null;
  private atbModeButton: Phaser.GameObjects.Text | null = null;
  private phaseText: Phaser.GameObjects.Text | null = null;
  private introFallbackTimer: Phaser.Time.TimerEvent | null = null;

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

    // 몬스터 이미지 로드 제거 — 프로그래매틱 아이콘 스프라이트 사용

    // 캐릭터 side 일러스트 (원본 256x384 사용)
    const classIds = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'time_guardian', 'void_wanderer'];
    for (const cid of classIds) {
      this.load.image(`char_battle_${cid}`, `assets/generated/characters/class_main/char_illust_${cid}_side.png`);
    }

    // 몬스터 스프라이트 이미지 로드 (128x128, 투명 배경)
    const enemies = this._initData?.enemies ?? [];
    for (const enemy of enemies) {
      const cleanId = (enemy.id ?? '').replace(/_\d+$/, '');
      const texKey = `mon_battle_${cleanId}`;
      const path = `assets/generated/monsters/normal/${cleanId}_normal.png`;
      if (!this.textures.exists(texKey)) {
        this.load.image(texKey, path);
      }
    }

    // VFX — 프로그래매틱 이펙트 사용

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Battle] 이미지 로드 실패: ${file.key}`);
    });

  }

  create(): void {
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

    // CHRONO-S31: 협공 발동 버튼 (우하단, 후보 있을 때만 표시)
    const btnContainer = this.add.container(scW - 90, scH - 50);
    const btnBg = this.add.rectangle(0, 0, 160, 36, 0x6fd3ff, 0.85)
      .setStrokeStyle(2, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(0, 0, '✨ 협공 (D)', {
      fontSize: '14px',
      fontFamily: FONT_FAMILY,
      color: '#1a0033',
    }).setOrigin(0.5);
    btnContainer.add([btnBg, btnText]);
    btnContainer.setDepth(260).setVisible(false).setName('dualTechButton');
    btnBg.on('pointerdown', () => this._triggerFirstDualTech());
    this.dualTechButton = btnContainer;

    // CHRONO-S65: 3인 협공 버튼 (Dual 위, 더 큰 강조)
    const tBtnContainer = this.add.container(scW - 90, scH - 92);
    const tBtnBg = this.add.rectangle(0, 0, 180, 40, 0xffd54a, 0.92)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });
    const tBtnText = this.add.text(0, 0, '🌟 3인 협공 (T)', {
      fontSize: '15px',
      fontFamily: FONT_FAMILY,
      color: '#1a0033',
    }).setOrigin(0.5);
    tBtnContainer.add([tBtnBg, tBtnText]);
    tBtnContainer.setDepth(261).setVisible(false).setName('tripleTechButton');
    tBtnBg.on('pointerdown', () => this._triggerFirstTripleTech());
    this.tripleTechButton = tBtnContainer;

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

    // ── 하단 UI 패널 배경 (반투명 검은 바) ─────────────────────
    this.add.rectangle(scW / 2, (UI_PANEL_Y + SCREEN_H) / 2, scW, SCREEN_H - UI_PANEL_Y, 0x0a0a2e, 0.85)
      .setDepth(100);

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
      // CHRONO-S63: 'T' 키 → 첫 Triple Tech 후보 발동
      this.input.keyboard.on('keydown-T', () => this._triggerFirstTripleTech());
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

    // ── Auto / Speed 버튼 ──────────────────────────────────
    this.autoButton = this.add.text(scW - 220, UI_PANEL_Y + 20, 'AUTO: OFF', {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: '#888888',
      backgroundColor: '#222244',
      padding: { x: 6, y: 3 },
    }).setDepth(200).setInteractive({ useHandCursor: true });

    this.autoButton.on('pointerdown', () => {
      this.autoMode = !this.autoMode;
      this.autoButton!.setText(this.autoMode ? 'AUTO: ON' : 'AUTO: OFF');
      this.autoButton!.setColor(this.autoMode ? '#44ff44' : '#888888');
      if (this.autoMode) {
        this._closeCommandMenu();
        this._closeSubMenu();
        if (this.activeCommander) {
          this.commandQueue.unshift(this.activeCommander);
          this.activeCommander = null;
        }
      }
    });

    this.speedButton = this.add.text(scW - 100, UI_PANEL_Y + 20, '1x', {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: '#88ccff',
      backgroundColor: '#222244',
      padding: { x: 6, y: 3 },
    }).setDepth(200).setInteractive({ useHandCursor: true });

    this.speedButton.on('pointerdown', () => {
      if (this.speedMultiplier === 1) this.speedMultiplier = 2;
      else if (this.speedMultiplier === 2) this.speedMultiplier = 3;
      else this.speedMultiplier = 1;
      this.speedButton!.setText(`${this.speedMultiplier}x`);
    });

    this.atbModeButton = this.add.text(scW - 340, UI_PANEL_Y + 20, `MODE: ${this.atbMode}`, {
      fontSize: '13px',
      fontFamily: FONT_FAMILY,
      color: '#c8a2ff',
      backgroundColor: '#222244',
      padding: { x: 6, y: 3 },
    }).setDepth(200).setInteractive({ useHandCursor: true });

    this.atbModeButton.on('pointerdown', () => {
      this.atbMode = this.atbMode === 'WAIT' ? 'ACTIVE' : this.atbMode === 'ACTIVE' ? 'SEMI' : 'WAIT';
      this.atbModeButton!.setText(`MODE: ${this.atbMode}`);
      this.battleUI?.addLog(`ATB 모드: ${this.atbMode}`);
    });

    // ── 인트로 연출 ─────────────────────────────────────────
    this._playIntro();
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

    // 상태 패널 갱신
    this._updateStatusPanel();

    // 전투 종료 판정
    this._checkBattleEnd();

    // 이펙트 업데이트
    this.effectManager?.update(delta);
    this.statusEffectRenderer?.update(delta);
    this.comboUI?.update(delta);
    this.battleUI?.update(delta);
  }

  // ─── 인트로 연출 ─────────────────────────────────────────────

  private _playIntro(): void {
    const { width: scW, height: scH } = this.cameras.main;

    // 화면 페이드인
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // "전투 시작!" 텍스트
    const introText = this.add.text(scW / 2, scH / 2 - 40, '⚔ 전투 시작!', {
      fontSize: '36px',
      fontFamily: FONT_FAMILY,
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(500);

    this.tweens.add({
      targets: introText,
      alpha: 1,
      y: scH / 2 - 60,
      duration: 400,
      ease: 'Back.easeOut',
      hold: 600,
      yoyo: true,
      onComplete: () => {
        introText.destroy();
        this.introFallbackTimer?.remove();
        this._startFighting();
      },
    });

    // Fallback: 3초 안에 tween이 완료되지 않으면 강제 전환
    this.introFallbackTimer = this.time.delayedCall(3000, () => {
      if (this.phase === 'intro') {
        introText.destroy();
        this._startFighting();
      }
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
        continue;
      }
      if (us.atb >= ATB_MAX) {
        // 행동 가능: 밝게
        if (us.sprite instanceof Phaser.GameObjects.Image) {
          (us.sprite as Phaser.GameObjects.Image).clearTint();
        }
        us.sprite.setAlpha(1.0);
      } else {
        // 충전 중: 어둡게
        if (us.sprite instanceof Phaser.GameObjects.Image) {
          (us.sprite as Phaser.GameObjects.Image).setTint(0x666666);
        }
        us.sprite.setAlpha(0.7);
      }
    }

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

  private _isATBTimelineFrozen(): boolean {
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

    // 기존 메뉴 제거
    this._closeCommandMenu();

    const container = this.add.container(CMD_MENU_X, CMD_MENU_Y).setDepth(200);

    // 메뉴 배경 — 5 commands in a row, compact
    const menuW = COMMANDS.length * 120 + 20;
    const menuH = 50;
    const bg = this.add.rectangle(menuW / 2, menuH / 2, menuW, menuH, 0x0a0a3e, 0.92)
      .setStrokeStyle(2, 0x4466aa);
    container.add(bg);

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
      const text = this.add.text(16 + i * 120, 16, cmd.label, {
        fontSize: '14px',
        fontFamily: FONT_FAMILY,
        color: '#ffffff',
      }).setInteractive({ useHandCursor: true });

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

    this.cmdMenuContainer = container;
    this._highlightCommand();
  }

  private _highlightCommand(): void {
    this.cmdMenuTexts.forEach((t, i) => {
      t.setColor(i === this.cmdMenuIndex ? '#ffff00' : '#ffffff');
      t.setText(i === this.cmdMenuIndex ? `▶ ${COMMANDS[i].label}` : `  ${COMMANDS[i].label}`);
    });
  }

  private _closeCommandMenu(): void {
    this.cmdMenuContainer?.destroy();
    this.cmdMenuContainer = null;
    this.cmdMenuTexts = [];
  }

  private _closeSubMenu(): void {
    this.cmdSubMenu?.destroy();
    this.cmdSubMenu = null;
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

  private _enterTargetSelect(candidates: UnitSprite[], callback: (target: UnitSprite) => void): void {
    this._closeCommandMenu();
    this.targetSelectMode = true;
    this.targetCandidates = candidates;
    this.targetIndex = 0;
    this.targetSelectCallback = callback;

    // 마우스 클릭 타겟팅
    for (const c of candidates) {
      c.sprite.removeAllListeners('pointerdown');
      c.sprite.on('pointerdown', () => {
        this._confirmTarget(c);
      });
    }

    this._drawTargetCursor();
  }

  private _drawTargetCursor(): void {
    this.targetCursor?.clear();
    if (!this.targetSelectMode || this.targetCandidates.length === 0) return;

    const target = this.targetCandidates[this.targetIndex];
    if (!target) return;

    this.targetCursor?.lineStyle(2, 0xffff00, 1);
    this.targetCursor?.strokeTriangle(
      target.sprite.x, target.sprite.y - 50,
      target.sprite.x - 8, target.sprite.y - 60,
      target.sprite.x + 8, target.sprite.y - 60,
    );
  }

  private _confirmTarget(target: UnitSprite): void {
    this.targetSelectMode = false;
    this.targetCursor?.clear();
    this.targetSelectCallback?.(target);
    this.targetSelectCallback = null;

    // 클릭 리스너 복원
    for (const c of this.targetCandidates) {
      c.sprite.removeAllListeners('pointerdown');
    }
    this.targetCandidates = [];
  }

  private _cancelTargetSelect(): void {
    this.targetSelectMode = false;
    this.targetCursor?.clear();
    this.targetSelectCallback = null;
    for (const c of this.targetCandidates) {
      c.sprite.removeAllListeners('pointerdown');
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

    // 히트 이펙트 + 화면 흔들림 (FINDING-A4 ext11: 설정 + reduce-motion 검사)
    this._showHitVFX(target.sprite.x, target.sprite.y);
    if (isScreenShakeEnabled()) this.cameras.main.shake(100, 0.005);

    // SFX + Voice
    if (attacker.isAlly) {
      playSfx(this, 'sfx_combat_slash', 0.6);
      if (isCritical) {
        playSfx(this, COMBAT_VOICE.CRITICAL, 0.7);
      } else {
        playRandomVoice(this, [...COMBAT_VOICE.ATTACK], 0.5);
      }
    }

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
    // 방어: 다음 피격 데미지 50% 감소 (간이 구현)
    us.unit.defense = (us.unit.defense ?? 0) + Math.round(us.unit.defense ?? 10);
    this.battleUI?.addLog(`🛡 ${us.unit.name} 방어 태세!`);
    playSfx(this, 'sfx_combat_guard_block', 0.5);

    // 1턴 후 방어력 복귀
    this.time.delayedCall(3000, () => {
      us.unit.defense = Math.max(0, (us.unit.defense ?? 0) - Math.round((us.unit.defense ?? 10) / 2));
    });
  }

  private _attemptFlee(): void {
    const chance = 0.3 + (this.allySprites.filter(a => !a.isDead).length * 0.1);
    if (Math.random() < chance) {
      this.battleUI?.addLog('🏃 도주 성공!');
      this._closeCommandMenu();
      this.activeCommander = null;
      this.time.delayedCall(500, () => this._exitBattle());
    } else {
      this.battleUI?.addLog('❌ 도주 실패!');
      this._endTurn();
    }
  }

  // ─── 마법/아이템 서브메뉴 ────────────────────────────────────

  private _showMagicSubMenu(): void {
    this._closeSubMenu();
    const skills = this.skillSlots.filter(s => s.currentCooldown <= 0);

    const menuH = Math.max(80, skills.length * 24 + 30);
    const container = this.add.container(CMD_MENU_X, UI_PANEL_Y - menuH - 4).setDepth(210);
    const bg = this.add.rectangle(100, menuH / 2, 220, menuH, 0x0a0a3e, 0.95)
      .setStrokeStyle(2, 0x4466aa);
    container.add(bg);

    if (skills.length === 0) {
      const t = this.add.text(80, 50, '사용 가능한 마법 없음', { fontSize: '12px', color: '#888888', fontFamily: FONT_FAMILY }).setOrigin(0.5);
      container.add(t);
    } else {
      skills.forEach((skill, i) => {
        const label = `${skill.name} (MP:${skill.mpCost})`;
        const t = this.add.text(10, 15 + i * 24, label, {
          fontSize: '13px', fontFamily: FONT_FAMILY,
          color: (this.activeCommander?.unit.mp ?? 0) >= skill.mpCost ? '#88ccff' : '#555555',
        }).setInteractive({ useHandCursor: true });

        t.on('pointerdown', () => {
          if ((this.activeCommander?.unit.mp ?? 0) < skill.mpCost) return;
          this._closeSubMenu();
          this._enterTargetSelect(this.enemySprites.filter(e => !e.isDead), (target) => {
            if (this.activeCommander) this._performSkill(this.activeCommander, target, skill);
            this._endTurn();
          });
        });

        container.add(t);
      });
    }

    // ESC로 닫기
    this.cmdSubMenu = container;
  }

  private _showItemSubMenu(): void {
    this._closeSubMenu();

    const container = this.add.container(CMD_MENU_X, UI_PANEL_Y - 90).setDepth(210);
    const bg = this.add.rectangle(100, 40, 220, 80, 0x0a0a3e, 0.95)
      .setStrokeStyle(2, 0x4466aa);
    container.add(bg);

    // 간이: 포션만 표시
    const t = this.add.text(80, 40, '🧪 포션 (HP +100)', { fontSize: '13px', fontFamily: FONT_FAMILY, color: '#88ff88' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    t.on('pointerdown', () => {
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
    });
    container.add(t);

    this.cmdSubMenu = container;
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
    this._showHitVFX(target.sprite.x, target.sprite.y);
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

    // 서브메뉴가 열려있으면 ESC로 닫기
    if (this.cmdSubMenu) {
      if (this.escKey && Phaser.Input.Keyboard.JustDown(this.escKey)) {
        this._closeSubMenu();
        if (this.activeCommander) this._openCommandMenu(this.activeCommander);
      }
      return;
    }

    // 커맨드 메뉴 조작
    if (this.activeCommander && this.cmdMenuContainer) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.cmdMenuIndex = (this.cmdMenuIndex - 1 + COMMANDS.length) % COMMANDS.length;
        this._highlightCommand();
      }
      if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.cmdMenuIndex = (this.cmdMenuIndex + 1) % COMMANDS.length;
        this._highlightCommand();
      }
      if (this.enterKey && Phaser.Input.Keyboard.JustDown(this.enterKey)) {
        this._executeCommand(COMMANDS[this.cmdMenuIndex].type);
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
    const text = this.add.text(x, y, `⚡ ${name} +${bonus}%`, {
      fontSize: '18px',
      fontFamily: FONT_FAMILY,
      color: '#ffaa44',
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
    // B-S4: critEcho 발동 시 보라 "ECHO! +N" 팝업
    const text = this.add.text(x + 30, y - 10, `✨ ECHO +${dmg}`, {
      fontSize: '16px',
      fontFamily: FONT_FAMILY,
      color: '#cc88ff',
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
    // B-S4: reflect 발동 시 청 "🛡 -N" 팝업 (attacker 위치)
    const text = this.add.text(x, y - 30, `🛡 -${dmg}`, {
      fontSize: '17px',
      fontFamily: FONT_FAMILY,
      color: '#88ccff',
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
    // B-S2: passive evasion 발동 시 "MISS!" 텍스트
    const text = this.add.text(x, y, 'MISS!', {
      fontSize: '20px',
      fontFamily: FONT_FAMILY,
      color: '#aaaaaa',
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

    // EffectManager 연동 (풀링)
    this.effectManager?.spawnDamageText(x, y, value, type === 'critical');
  }

  // ─── 히트 VFX ────────────────────────────────────────────────

  private _showHitVFX(x: number, y: number): void {
    // 간단한 원형 이펙트로 대체 (VFX 스프라이트 시트 문제 회피)
    const colors = [0xff4444, 0xffaa00, 0xffffff, 0x44aaff];
    const color = colors[Phaser.Math.Between(0, colors.length - 1)];
    
    const circle = this.add.circle(x, y, 8, color, 0.8)
      .setDepth(8000);

    this.tweens.add({
      targets: circle,
      scaleX: 3, scaleY: 3,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeOut',
      onComplete: () => circle.destroy(),
    });
  }

  // ─── 스프라이트 연출 ──────────────────────────────────────────

  private _flashSprite(us: UnitSprite): void {
    // 번쩍임 (흰색 → 원래)
    if (us.sprite instanceof Phaser.GameObjects.Image) {
      (us.sprite as Phaser.GameObjects.Image).setTint(0xffffff);
      this.time.delayedCall(80, () => {
        if (us.sprite instanceof Phaser.GameObjects.Image) {
          (us.sprite as Phaser.GameObjects.Image).clearTint();
        }
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
    us.isDead = true;
    us.sprite.setAlpha(0.2);
    this.battleUI?.addLog(`💀 ${us.unit.name} 쓰러짐!`);

    if (us.isAlly) {
      playSfx(this, COMBAT_VOICE.DEATH, 0.7);
    } else {
      playSfx(this, 'sfx_combat_enemy_death', 0.5);
    }
  }

  // ─── 유닛 스폰 ───────────────────────────────────────────────

  private _spawnAllies(units: CombatUnit[]): void {
    units.forEach((unit, idx) => {
      const pos = ALLY_POSITIONS[idx % ALLY_POSITIONS.length];
      const classId = unit.classId ?? '';
      const texKey = `char_battle_${classId}`;

      // B-S4: ally 에 critEcho 부여 (default 30%)
      if (unit.critEchoPercent === undefined) {
        unit.critEchoPercent = 30;
      }
      if (unit.alive === undefined) unit.alive = true;

      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
      if (classId && this.textures.exists(texKey)) {
        sprite = this.add.image(pos.x, pos.y, texKey)
          .setScale(1)
          .setInteractive({ useHandCursor: true })
          .setDepth(50);
        // LINEAR 필터로 pixelArt nearest-neighbor 오버라이드
        sprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } else {
        sprite = this.add.rectangle(pos.x, pos.y, 48, 64, 0x4488ff)
          .setInteractive({ useHandCursor: true })
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
      const monTexKey = `mon_battle_${cleanId}`;
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

      if (this.textures.exists(monTexKey)) {
        sprite = this.add.image(pos.x, pos.y, monTexKey)
          .setScale(isBoss ? 2 : 1)
          .setInteractive({ useHandCursor: true })
          .setDepth(50);
        sprite.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
      } else {
        // 폴백: 프로그래매틱 아이콘
        const size = isBoss ? 90 : 60;
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
          .setInteractive({ useHandCursor: true })
          .setDepth(50);
        this.add.text(pos.x, pos.y - 4, icon, {
          fontSize: isBoss ? '36px' : '24px',
          fontFamily: FONT_FAMILY,
        }).setOrigin(0.5).setDepth(52);
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

      const us: UnitSprite = {
        unit, sprite, nameText,
        atb: Phaser.Math.Between(0, 20),
        isAlly: false, isDead: false,
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

      // HP/MP 텍스트 업데이트
      const hpRatio = us.unit.hp / us.unit.maxHp;
      entry.hp.setText(`HP ${Math.max(0, us.unit.hp)}/${us.unit.maxHp}`);
      entry.mp.setText(`MP ${Math.max(0, us.unit.mp)}/${us.unit.maxMp}`);
      entry.hp.setColor(hpRatio < 0.25 ? '#ff4444' : '#ffcc44');

      // HP 바 (compact, under text row)
      const barY = baseY + 14;
      const hpBarX = baseX + 160;
      this.statusPanelGraphics!.fillStyle(0x222244, 1);
      this.statusPanelGraphics!.fillRect(hpBarX, barY, STAT_BAR_W, 4);
      this.statusPanelGraphics!.fillStyle(hpRatio < 0.25 ? 0xff4444 : 0xffcc44, 1);
      this.statusPanelGraphics!.fillRect(hpBarX, barY, STAT_BAR_W * Math.max(0, hpRatio), 4);

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
      this._showVictory();
    } else if (allAlliesDead) {
      this.phase = 'defeat';
      this._closeCommandMenu();
      this._closeSubMenu();
      this.targetSelectMode = false;
      this.activeCommander = null;
      this._showDefeat();
    }
  }

  // ─── 승리 연출 ───────────────────────────────────────────────

  private _showVictory(): void {
    const { width: scW, height: scH } = this.cameras.main;

    this.battleUI?.addLog('🎉 승리!');
    playSfx(this, COMBAT_VOICE.VICTORY, 0.8);
    playSfx(this, 'sfx_ui_quest_complete', 0.6);

    // 승리 팡파르 텍스트
    const victoryText = this.add.text(scW / 2, scH / 3, '🎉 Victory!', {
      fontSize: '42px',
      fontFamily: FONT_FAMILY,
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(500);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scaleX: 1.1, scaleY: 1.1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // 결과 화면 (1초 후)
    this.time.delayedCall(1200, () => {
      this._showResultPopup();
    });
  }

  private _showResultPopup(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const container = this.add.container(cx, cy).setDepth(600);

    // 배경
    const bg = this.add.rectangle(0, 0, 400, 320, 0x0a0a2e, 0.95)
      .setStrokeStyle(2, 0xffcc00);
    container.add(bg);

    const title = this.add.text(0, -130, '🏆 전투 결과', {
      fontSize: '22px', fontFamily: FONT_FAMILY, color: '#ffcc00',
    }).setOrigin(0.5);
    container.add(title);

    // EXP / 골드 (간이 계산)
    const totalEnemyLevel = this.enemySprites.reduce((sum, e) => sum + (e.unit.level ?? 1), 0);
    const rewardMultiplier = this._initData.rewardMultiplier ?? 1;
    const exp = Math.round((totalEnemyLevel * 25 + Phaser.Math.Between(10, 50)) * rewardMultiplier);
    const gold = Math.round((totalEnemyLevel * 10 + Phaser.Math.Between(5, 30)) * rewardMultiplier);

    const expText = this.add.text(-150, -80, `✨ 경험치: +${exp}`, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#88ccff',
    });
    container.add(expText);

    const goldText = this.add.text(-150, -50, `💰 골드: +${gold}`, {
      fontSize: '16px', fontFamily: FONT_FAMILY, color: '#ffcc44',
    });
    container.add(goldText);

    // 전리품
    const loot = this.combatManager?.getLoot() ?? [];
    const lootTitle = this.add.text(-150, -15, '📦 전리품:', {
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

    // 확인 버튼
    const closeBtn = this.add.text(0, 120, '[ 확인 ]', {
      fontSize: '18px', fontFamily: FONT_FAMILY, color: '#88ff88',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this._exitBattle());
    closeBtn.on('pointerover', () => closeBtn.setColor('#ccffcc'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#88ff88'));
    container.add(closeBtn);

    this.lootPopup = container;
  }

  // ─── 패배 연출 ───────────────────────────────────────────────

  private _showDefeat(): void {
    const { width: scW, height: scH } = this.cameras.main;

    this.battleUI?.addLog('💔 패배...');

    // 화면 붉은 플래시
    const flash = this.add.rectangle(scW / 2, scH / 2, scW, scH, 0xff0000, 0).setDepth(400);
    this.tweens.add({
      targets: flash,
      alpha: 0.3,
      duration: 300,
      yoyo: true,
      repeat: 2,
      onComplete: () => flash.destroy(),
    });

    const defeatText = this.add.text(scW / 2, scH / 3, '💔 패배...', {
      fontSize: '36px',
      fontFamily: FONT_FAMILY,
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(500);

    this.tweens.add({
      targets: defeatText,
      alpha: 1,
      duration: 600,
    });

    // 패배 팝업
    this.time.delayedCall(2000, () => {
      const cx = this.cameras.main.centerX;
      const cy = this.cameras.main.centerY;

      const container = this.add.container(cx, cy).setDepth(600);
      const bg = this.add.rectangle(0, 0, 280, 140, 0x000000, 0.9)
        .setStrokeStyle(2, 0xff4444);
      container.add(bg);

      const title = this.add.text(0, -30, '💔 전투 실패', {
        fontSize: '20px', fontFamily: FONT_FAMILY, color: '#ff4444',
      }).setOrigin(0.5);
      container.add(title);

      const closeBtn = this.add.text(0, 30, '[ 돌아가기 ]', {
        fontSize: '16px', fontFamily: FONT_FAMILY, color: '#aaaaaa',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      closeBtn.on('pointerdown', () => this._exitBattle());
      container.add(closeBtn);
    });
  }

  // ─── 기본 유닛 생성 (폴백) ────────────────────────────────────

  private _createDefaultAllies(): CombatUnit[] {
    const classId = (this._initData as unknown as Record<string, unknown>)?.characterClass as string ?? 'ether_knight';
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
      const result = await networkManager.combatStart({
        characterId: this._initData.characterId ?? networkManager.userId ?? '',
        zoneId: this._initData.zoneId,
        monsterId: this._initData.monsterId,
        // CHRONO-S8: 현재 시대 전달 → 서버가 ATB SpeedTier 매핑 자동 적용
        eraId: this._initData.eraId,
      });
      this.serverCombatId = result.combatId;
      this.battleUI?.addLog(`[서버] 전투 ID: ${result.combatId}`);
    } catch (err) {
      console.warn('[BattleScene] 서버 전투 시작 실패 (로컬 모드):', err);
    }
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
  private _updateBossResistLabel(enemy: { unit: { id: string }; sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle }, hits: number): void {
    const cacheKey = '__bossResistText';
    const existing = (enemy as unknown as Record<string, Phaser.GameObjects.Text | undefined>)[cacheKey];
    const label = `🛡 협공 저항 +${(hits * 5)}%`;
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
    const cand = this.lastTripleTechCandidates[0];
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
    const txt = this.dualTechButton?.list?.[1] as Phaser.GameObjects.Text | undefined;
    const bg = this.dualTechButton?.list?.[0] as Phaser.GameObjects.Rectangle | undefined;
    const aoePrefix = sel.aoe ? '💥 ' : '✨ ';
    txt?.setText(`${aoePrefix}${sel.name} (D)`);
    const tint = (() => {
      switch (sel.element) {
        case 'chrono': return 0x6fd3ff;
        case 'dark': return 0xc8a2ff;
        case 'holy': return 0xffd54a;
        default: return 0x6fd3ff;
      }
    })();
    bg?.setFillStyle(tint, 0.85);
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
        }>;
      };
      if (d.combatId === this.serverCombatId) {
        const turn = d.turn ?? d.tick ?? 0;
        this.battleUI?.addLog(`[서버] 턴 ${turn}`);
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
          const txt = this.dualTechButton?.list?.[1] as Phaser.GameObjects.Text | undefined;
          const bg = this.dualTechButton?.list?.[0] as Phaser.GameObjects.Rectangle | undefined;
          const sel = d.dualTechCandidates[this.dualTechSelectedIndex] ?? d.dualTechCandidates[0];
          const aoePrefix = sel.aoe ? '💥 ' : '✨ ';
          txt?.setText(`${aoePrefix}${sel.name} (D)`);
          const tint = (() => {
            switch (sel.element) {
              case 'chrono': return 0x6fd3ff;
              case 'dark': return 0xc8a2ff;
              case 'holy': return 0xffd54a;
              default: return 0x6fd3ff;
            }
          })();
          bg?.setFillStyle(tint, 0.85);
        } else {
          this.lastDualTechCandidates = [];
          this.dualTechSelectedIndex = 0;
          this.dualTechButton?.setVisible(false);
        }
        // CHRONO-S63/S65: Triple Tech 후보 수신 + 버튼 가시화
        if (d.tripleTechCandidates && d.tripleTechCandidates.length > 0) {
          const tNames = d.tripleTechCandidates.map((c) => c.name).join(', ');
          this.battleUI?.addLog(`🌟 3인 협공 가능: ${tNames} ('T' 키)`);
          this.lastTripleTechCandidates = d.tripleTechCandidates;
          this.tripleTechButton?.setVisible(true);
          const tTxt = this.tripleTechButton?.list?.[1] as Phaser.GameObjects.Text | undefined;
          tTxt?.setText(`🌟 ${d.tripleTechCandidates[0].name} (T)`);
        } else {
          this.lastTripleTechCandidates = [];
          this.tripleTechButton?.setVisible(false);
        }
        // CHRONO-S51: 보스 협공 저항 단계 표시 (snapshot.dualTechHitsTaken 활용)
        for (const sp of d.participants ?? []) {
          if (sp.team !== 'monsters') continue;
          const hits = sp.dualTechHitsTaken ?? 0;
          if (hits <= 0) continue;
          const enemy = this.enemySprites.find((es) => es.unit.id === sp.id);
          if (!enemy) continue;
          this._updateBossResistLabel(enemy, hits);
        }

        // CHRONO-S28: chain combo indicator — server 가 actorName 에 '(CHAIN)' 표시
        // CHRONO-S40: AOE 협공 — actorName '(AOE)' 검출 시 모든 alive 적에 시각 효과
        for (const act of d.actions ?? []) {
          if (act.actionType === 'dual_tech') {
            if (act.actorName?.includes('(CHAIN)')) {
              this.battleUI?.addLog(`🔥 CHAIN COMBO! +20% 데미지 (${act.damage ?? 0})`);
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
        (this.statusEffectRenderer as any)?.applyEffect?.(d.targetId, d.effectId, d.value);
      }
    });

    this.socketCleanups = [unsub1, unsub2, unsub3];
  }

  private async _exitBattle(): Promise<void> {
    if (this.serverCombatId) {
      try {
        await networkManager.combatEnd(this.serverCombatId);
      } catch { /* 이미 종료되었을 수 있음 */ }
    }

    this.socketCleanups.forEach((fn) => fn());
    this.socketCleanups = [];

    if (this._initData.returnScene) {
      const allyState = this.allySprites.map(a => ({ hp: a.unit.hp, mp: a.unit.mp }));
      this.scene.start(this._initData.returnScene, {
        ...(this._initData.returnData ?? {}),
        victory: this.phase === 'victory',
        allyState,
      });
    } else {
      this.scene.start('GameScene', {
        zoneId: this._initData.zoneId,
        eraId: this._initData.eraId,
      });
    }
  }
}
