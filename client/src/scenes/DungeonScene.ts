/**
 * DungeonScene.ts — 던전 웨이브 관리 씬 (ATB 전투 연동)
 *
 * - FF6 레이아웃: 왼쪽 플레이어(side), 오른쪽 몬스터 프리뷰
 * - 웨이브 카운터 (Wave 1/5 등)
 * - 적 스폰 시 BattleScene(ATB)으로 전환
 * - 전투 승리 → 다음 웨이브 진행
 * - 보스 경고 연출 + 보스 글로우
 * - 전투 타이머
 * - 플레이어 HP/MP 바
 * - 승리/클리어 연출 + EXP/골드 팝업
 * - SFX 연동 (SFXHelper)
 * - P25-06: NetworkManager 던전 API 연동
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { playSfx, UI_SFX, COMBAT_VOICE, playRandomVoice } from '../utils/SFXHelper';
import type { CombatUnit } from '../combat/CombatManager';
import type { BattleSceneData } from './BattleScene';
import { classSkills } from '../data/classSkills';
import { composeDungeonGameOverText } from '../gameplay/dungeonGameOverNarration';
import {
  getCharacterSpriteResource,
  getCharacterSpriteAnimationKey,
  getCharacterFrameRange,
} from '../assets/characterSpriteManifest';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

// ── 타입 ────────────────────────────────────────────────────

interface DungeonConfig {
  dungeonName: string;
  totalWaves: number;
  bossWave: number;
  timeLimitSec: number;
}

/** BattleScene에서 복귀 시 전달받는 데이터 */
interface DungeonResumeData {
  resumeWave?: number;
  earnedExp?: number;
  earnedGold?: number;
  elapsedSec?: number;
  serverSessionId?: string | null;
  characterClass?: string;
  victory?: boolean;
  allyState?: Array<{ hp: number; mp: number }>;
  dungeonFrameQa?: 'ready' | 'clear';
}

type DungeonPhase = 'ready' | 'fighting' | 'boss_warning' | 'boss' | 'clear' | 'timeout' | 'defeat';

// ── 상수 ────────────────────────────────────────────────────

const DEFAULT_CONFIG: DungeonConfig = {
  dungeonName: '에테르 시련의 동굴',
  totalWaves: 5,
  bossWave: 5,
  timeLimitSec: 180,
};

const ENEMIES_PER_WAVE = 4;
const ENEMY_BASE_HP = 80;
const BOSS_HP_MULT = 5;

// FF6 레이아웃 상수
const PLAYER_X = 160;
const ENEMY_POSITIONS = [
  { x: 720, y: 180 },
  { x: 840, y: 260 },
  { x: 720, y: 340 },
  { x: 840, y: 420 },
];
const BOSS_POS = { x: 780, y: 300 };

// 플레이어 스탯
const PLAYER_MAX_HP = 500;
const PLAYER_MAX_MP = 200;

// 보상
const EXP_PER_WAVE = 30;
const GOLD_PER_WAVE = 50;
const BOSS_EXP_BONUS = 150;
const BOSS_GOLD_BONUS = 300;

// 몬스터 이미지 매핑 (존별 대표 몬스터)
const DUNGEON_MONSTER_IMAGES: Record<string, string[]> = {
  default: [
    'mon_erebos_ruin_skeleton_normal', 'mon_erebos_fog_wolf_normal', 'mon_erebos_memory_ghost_normal',
    'mon_erebos_broken_golem_normal', 'mon_erebos_ruin_spider_normal',
  ],
};
const DUNGEON_BOSS_IMAGE = 'mon_erebos_memory_absorber_normal';

const MONSTER_NAMES: Record<string, string> = {
  mon_erebos_ruin_skeleton_normal: '폐허 스켈레톤',
  mon_erebos_fog_wolf_normal: '안개 늑대',
  mon_erebos_memory_ghost_normal: '기억의 망령',
  mon_erebos_broken_golem_normal: '파손된 골렘',
  mon_erebos_ruin_spider_normal: '폐허 거미',
  mon_erebos_memory_absorber_normal: '기억 흡수자',
};

interface DungeonMonsterPreviewTexture {
  textureKey: string;
  path: string;
  displaySize: number;
}

interface DungeonUiFrameTexture {
  key: string;
  path: string;
  width: number;
  height: number;
}

interface DungeonFrameRender {
  primary: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  stroke?: Phaser.GameObjects.Rectangle;
}

const DUNGEON_MONSTER_PREVIEW_TEXTURES: Record<string, DungeonMonsterPreviewTexture> = {
  mon_erebos_ruin_skeleton_normal: {
    textureKey: 'monster_battle_icon_mon_erebos_ruin_skeleton_normal',
    path: 'assets/generated/monsters/battle/mon_erebos_ruin_skeleton_normal.png',
    displaySize: 56,
  },
  mon_erebos_fog_wolf_normal: {
    textureKey: 'monster_battle_icon_mon_erebos_fog_wolf_normal',
    path: 'assets/generated/monsters/battle/mon_erebos_fog_wolf_normal.png',
    displaySize: 56,
  },
  mon_erebos_memory_ghost_normal: {
    textureKey: 'monster_battle_icon_mon_erebos_memory_ghost_normal',
    path: 'assets/generated/monsters/battle/mon_erebos_memory_ghost_normal.png',
    displaySize: 56,
  },
  mon_erebos_broken_golem_normal: {
    textureKey: 'monster_battle_icon_mon_erebos_broken_golem_normal',
    path: 'assets/generated/monsters/battle/mon_erebos_broken_golem_normal.png',
    displaySize: 56,
  },
  mon_erebos_ruin_spider_normal: {
    textureKey: 'monster_battle_icon_mon_erebos_ruin_spider_normal',
    path: 'assets/generated/monsters/battle/mon_erebos_ruin_spider_normal.png',
    displaySize: 56,
  },
  mon_erebos_memory_absorber_normal: {
    textureKey: 'monster_battle_icon_mon_erebos_memory_absorber_normal',
    path: 'assets/generated/monsters/battle/mon_erebos_memory_absorber_normal.png',
    displaySize: 80,
  },
};

const DUNGEON_UI_FRAME_TEXTURES = {
  statusPanel: {
    key: 'ui_frame_dungeon_status_panel',
    path: 'assets/generated/ui/frames/UI-HUD-007-DEF.png',
    width: 512,
    height: 512,
  },
  actionButton: {
    key: 'ui_frame_dungeon_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
    width: 512,
    height: 512,
  },
  rewardPanel: {
    key: 'ui_frame_dungeon_reward_panel',
    path: 'assets/generated/ui/frames/UI-INV-005-DEF.png',
    width: 512,
    height: 512,
  },
} as const satisfies Record<string, DungeonUiFrameTexture>;

const DUNGEON_ACTION_BUTTON_ICON_ID = 'skill_ek_slash';
const DUNGEON_TITLE_ICON_ID = 'skill_ek_slash';
const DUNGEON_CLEAR_TITLE_ICON_ID = 'skill_ek_ultimate';

// ── DungeonScene ────────────────────────────────────────────

export class DungeonScene extends Phaser.Scene {
  private config: DungeonConfig = DEFAULT_CONFIG;
  private phase: DungeonPhase = 'ready';
  private currentWave = 0;
  private elapsedSec = 0;

  // 플레이어 상태
  private playerHp = PLAYER_MAX_HP;
  private playerMp = PLAYER_MAX_MP;
  private earnedExp = 0;
  private earnedGold = 0;

  // P25-06: 서버 던전 세션
  private serverSessionId: string | null = null;

  // 씬 데이터
  private _sceneData: DungeonResumeData & Record<string, unknown> = {};

  // UI 요소
  private waveText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private phaseText?: Phaser.GameObjects.Text;
  private playerSprite?: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private playerHpBar?: Phaser.GameObjects.Rectangle;
  private playerHpBarBg?: Phaser.GameObjects.Rectangle;
  private playerHpText?: Phaser.GameObjects.Text;
  private playerMpBar?: Phaser.GameObjects.Rectangle;
  private playerMpBarBg?: Phaser.GameObjects.Rectangle;
  private playerMpText?: Phaser.GameObjects.Text;
  private playerIdleTween?: Phaser.Tweens.Tween;
  private battleBtn?: Phaser.GameObjects.Text;
  private battleBtnFrame?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private battleBtnIcon?: Phaser.GameObjects.Image;
  private dungeonTitleIcon?: Phaser.GameObjects.Image;
  private dungeonTitleIconFallbackRendered = false;
  private dungeonClearTitleIcon?: Phaser.GameObjects.Image;
  private dungeonClearTitleIconFallbackRendered = false;
  private dungeonClearTitleText?: Phaser.GameObjects.Text;
  private enemyPreviews: Phaser.GameObjects.GameObject[] = [];
  private dungeonFrameQaRenderedKeys = new Set<string>();

  constructor() {
    super({ key: 'DungeonScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  init(data: DungeonResumeData & Record<string, unknown>): void {
    this._sceneData = data ?? {};
  }

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Dungeon] 에셋 로드 실패: ${file.key}`);
    });

    const playerSpriteResource = getCharacterSpriteResource(this._getPlayerClassId()) ?? getCharacterSpriteResource('ether_knight');
    if (playerSpriteResource && !this.textures.exists(playerSpriteResource.textureKey)) {
      this.load.spritesheet(playerSpriteResource.textureKey, playerSpriteResource.imagePath, {
        frameWidth: playerSpriteResource.frameWidth,
        frameHeight: playerSpriteResource.frameHeight,
      });
    }

    const fallbackClassId = playerSpriteResource?.classId ?? 'ether_knight';
    this.load.image('dungeon_player', `assets/generated/characters/class_main/char_illust_${fallbackClassId}_side.png`);

    // 배경
    this.load.image('dungeon_bg', 'assets/generated/environment/backgrounds/DUNGEON-BG-FAR.png');

    for (const preview of Object.values(DUNGEON_MONSTER_PREVIEW_TEXTURES)) {
      if (!this.textures.exists(preview.textureKey)) {
        this.load.image(preview.textureKey, preview.path);
      }
    }

    for (const texture of Object.values(DUNGEON_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }

    const actionButtonIconResource = getSpriteResourceForSkillIcon(DUNGEON_ACTION_BUTTON_ICON_ID);
    if (actionButtonIconResource && !this.textures.exists(actionButtonIconResource.key)) {
      this.load.image(actionButtonIconResource.key, actionButtonIconResource.path);
    }
    const titleIconResource = getSpriteResourceForSkillIcon(DUNGEON_TITLE_ICON_ID);
    const isTitleIconQueuedByAction = actionButtonIconResource?.key === titleIconResource?.key;
    if (titleIconResource && !isTitleIconQueuedByAction && !this.textures.exists(titleIconResource.key)) {
      this.load.image(titleIconResource.key, titleIconResource.path);
    }
    const clearTitleIconResource = getSpriteResourceForSkillIcon(DUNGEON_CLEAR_TITLE_ICON_ID);
    const isClearTitleIconQueuedByExisting = clearTitleIconResource?.key === actionButtonIconResource?.key
      || clearTitleIconResource?.key === titleIconResource?.key;
    if (clearTitleIconResource && !isClearTitleIconQueuedByExisting && !this.textures.exists(clearTitleIconResource.key)) {
      this.load.image(clearTitleIconResource.key, clearTitleIconResource.path);
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0d0d1a');

    // 초기화
    this.phase = 'ready';
    this.currentWave = 0;
    this.elapsedSec = 0;
    this.playerHp = PLAYER_MAX_HP;
    this.playerMp = PLAYER_MAX_MP;
    this.earnedExp = 0;
    this.earnedGold = 0;
    this.enemyPreviews = [];
    this.battleBtnFrame = undefined;
    this.battleBtnIcon = undefined;
    this.dungeonTitleIcon = undefined;
    this.dungeonTitleIconFallbackRendered = false;
    this.dungeonClearTitleIcon = undefined;
    this.dungeonClearTitleIconFallbackRendered = false;
    this.dungeonClearTitleText = undefined;
    this.dungeonFrameQaRenderedKeys.clear();

    // 복귀 데이터 적용
    const isResume = this._sceneData.resumeWave != null;
    if (isResume) {
      this.currentWave = this._sceneData.resumeWave!;
      this.earnedExp = this._sceneData.earnedExp ?? 0;
      this.earnedGold = this._sceneData.earnedGold ?? 0;
      this.elapsedSec = this._sceneData.elapsedSec ?? 0;
      this.serverSessionId = this._sceneData.serverSessionId ?? null;

      // BattleScene에서 돌아온 아군 상태 적용
      if (this._sceneData.allyState?.[0]) {
        this.playerHp = this._sceneData.allyState[0].hp;
        this.playerMp = this._sceneData.allyState[0].mp;
      }
    }

    // ── 배경 ──
    if (this.textures.exists('dungeon_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'dungeon_bg').setDepth(-1);
      const sx = width / bg.width;
      const sy = height / bg.height;
      bg.setScale(Math.max(sx, sy));
    }

    // ── 던전 이름 ──
    const titleIconResource = getSpriteResourceForSkillIcon(DUNGEON_TITLE_ICON_ID);
    const hasTitleIcon = Boolean(titleIconResource && this.textures.exists(titleIconResource.key));
    if (hasTitleIcon && titleIconResource) {
      this.dungeonTitleIcon = this.add.image(width / 2 - 138, 18, titleIconResource.key)
        .setName('dungeon_title_icon');
      this.dungeonTitleIcon.setDisplaySize(20, 20);
      this.dungeonTitleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.dungeonTitleIconFallbackRendered = true;
    }
    const titleLabel = hasTitleIcon ? this.config.dungeonName : `⚔ ${this.config.dungeonName}`;
    const titleX = hasTitleIcon ? width / 2 + 12 : width / 2;
    this.add.text(titleX, 18, titleLabel, {
      fontSize: '20px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ff8844',
    }).setOrigin(0.5);

    // ── 웨이브 카운터 ──
    this.waveText = this.add.text(20, 50, '', {
      fontSize: '16px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ffffff',
    });

    // ── 타이머 ──
    this.timerText = this.add.text(width - 20, 50, '', {
      fontSize: '16px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ffcc44',
    }).setOrigin(1, 0);

    // ── 중앙 상태 텍스트 ──
    this.phaseText = this.add.text(width / 2, height / 2, '', {
      fontSize: '28px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // ── 플레이어 캐릭터 (FF6 왼쪽 배치) ──
    this._createPlayer(height);

    // ── 플레이어 HP/MP 바 (하단 좌측) ──
    this._createPlayerStatusBars(width, height);

    // ── 뒤로가기 ──
    this.add.text(20, height - 30, '← 퇴장 (ESC)', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LobbyScene'));

    // FINDING-A4 ext6: ESC 로 던전 퇴장 (WCAG 2.1.1)
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('LobbyScene'));

    // ── 시작 또는 복귀 분기 ──
    if (!isResume && this._getDungeonFrameQaMode() === 'ready') {
      this.phase = 'fighting';
      this._startNextWave();
      this._writeDungeonFrameQaProbe();
    } else if (!isResume && this._getDungeonFrameQaMode() === 'clear') {
      this.currentWave = this.config.totalWaves;
      this.earnedExp = EXP_PER_WAVE * this.config.totalWaves + BOSS_EXP_BONUS;
      this.earnedGold = GOLD_PER_WAVE * this.config.totalWaves + BOSS_GOLD_BONUS;
      this.phase = 'clear';
      this._showVictory();
      this._writeDungeonFrameQaProbe();
    } else if (isResume) {
      if (this._sceneData.victory) {
        this._onBattleVictory();
      } else {
        this._onDefeat();
      }
    } else {
      this._showPhaseText('준비!', () => {
        this.phase = 'fighting';
        this._startNextWave();
      });
    }

    // 1초 타이머
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this._tick(),
    });

    SceneManager.fadeIn(this, 300);
  }

  update(): void {
    this._updateUI();
  }

  // ── 플레이어 생성 ────────────────────────────────────────

  private _getPlayerClassId(): string {
    const classId = this._sceneData.characterClass?.trim();
    return classId && classId.length > 0 ? classId : 'ether_knight';
  }

  /**
   * 던전 플레이어 idle 애니메이션 lazy 생성. manifest SSOT
   * (getCharacterFrameRange)에서 idle_D 프레임 범위를 받아 루프 생성.
   */
  private _ensureCharIdleAnim(classId: string): string {
    const resource = getCharacterSpriteResource(classId);
    // 키는 textureKey 기반(스킨-안전). resource 없으면 classId 폴백.
    const key = getCharacterSpriteAnimationKey(resource?.textureKey ?? classId, 'idle', 'D');
    if (!resource || this.anims.exists(key)) return key;
    const { from, to } = getCharacterFrameRange('idle', 'D');
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers(resource.textureKey, { start: from, end: to }),
      frameRate: 6,
      repeat: -1,
    });
    return key;
  }

  private _createPlayer(sceneHeight: number): void {
    const py = sceneHeight / 2;
    const playerSpriteResource = getCharacterSpriteResource(this._getPlayerClassId()) ?? getCharacterSpriteResource('ether_knight');

    if (playerSpriteResource && this.textures.exists(playerSpriteResource.textureKey)) {
      // 태그 스프라이트: add.sprite 로 만들어 idle 루프 재생(이전엔 정적 frame 0).
      // 던전은 고정 위치 사이드뷰라 walk 는 없고 idle 만 — 아래 bob 트윈과 겹쳐도
      // 트윈은 y 만 건드려 프레임과 무관.
      const sprite = this.add.sprite(PLAYER_X, py, playerSpriteResource.textureKey, 0)
        .setScale(1.4);
      sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      const idleKey = this._ensureCharIdleAnim(playerSpriteResource.classId);
      if (this.anims.exists(idleKey)) sprite.play(idleKey);
      this.playerSprite = sprite;
    } else if (this.textures.exists('dungeon_player')) {
      this.playerSprite = this.add.image(PLAYER_X, py, 'dungeon_player')
        .setScale(0.2);
      // LINEAR 필터로 pixelArt nearest-neighbor 오버라이드
      (this.playerSprite as Phaser.GameObjects.Image).texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    } else {
      this.playerSprite = this.add.rectangle(PLAYER_X, py, 40, 50, 0x4488ff);
    }

    // 이름 라벨
    this.add.text(PLAYER_X, py + 55, '플레이어', {
      fontSize: '11px',
      color: '#88ccff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);

    // FF6 대기 모션 (부드러운 상하 흔들림)
    this.playerIdleTween = this.tweens.add({
      targets: this.playerSprite,
      y: py - 4,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ── 플레이어 HP/MP 바 ────────────────────────────────────

  private _createPlayerStatusBars(width: number, height: number): void {
    const baseX = 30;
    const baseY = height - 90;
    const barW = 160;
    const barH = 10;

    this._addDungeonFrame(baseX + 145, baseY + 16, 300, 78, DUNGEON_UI_FRAME_TEXTURES.statusPanel, 0x101525, 0.82, 0x4466aa, 1);

    // HP
    this.add.text(baseX, baseY - 2, 'HP', {
      fontSize: '11px', color: '#44ff44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.playerHpBarBg = this.add.rectangle(baseX + 25 + barW / 2, baseY + 4, barW, barH, 0x333333);
    this.playerHpBar = this.add.rectangle(baseX + 25 + barW / 2, baseY + 4, barW, barH, 0x44ff44);
    this.playerHpText = this.add.text(baseX + 25 + barW + 8, baseY - 2, `${this.playerHp}/${PLAYER_MAX_HP}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    // MP
    const mpY = baseY + 20;
    this.add.text(baseX, mpY - 2, 'MP', {
      fontSize: '11px', color: '#4488ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.playerMpBarBg = this.add.rectangle(baseX + 25 + barW / 2, mpY + 4, barW, barH, 0x333333);
    this.playerMpBar = this.add.rectangle(baseX + 25 + barW / 2, mpY + 4, barW, barH, 0x4488ff);
    this.playerMpText = this.add.text(baseX + 25 + barW + 8, mpY - 2, `${this.playerMp}/${PLAYER_MAX_MP}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this._updatePlayerBars();
  }

  private _updatePlayerBars(): void {
    const hpRatio = this.playerHp / PLAYER_MAX_HP;
    const mpRatio = this.playerMp / PLAYER_MAX_MP;
    const barW = 160;

    this.playerHpBar?.setScale(hpRatio, 1);
    if (this.playerHpBar && this.playerHpBarBg) {
      this.playerHpBar.setPosition(
        this.playerHpBarBg.x - (barW * (1 - hpRatio)) / 2,
        this.playerHpBarBg.y,
      );
    }
    if (hpRatio < 0.25) {
      this.playerHpBar?.setFillStyle(0xff2222);
    } else if (hpRatio < 0.5) {
      this.playerHpBar?.setFillStyle(0xffaa44);
    } else {
      this.playerHpBar?.setFillStyle(0x44ff44);
    }

    this.playerMpBar?.setScale(mpRatio, 1);
    if (this.playerMpBar && this.playerMpBarBg) {
      this.playerMpBar.setPosition(
        this.playerMpBarBg.x - (barW * (1 - mpRatio)) / 2,
        this.playerMpBarBg.y,
      );
    }

    this.playerHpText?.setText(`${this.playerHp}/${PLAYER_MAX_HP}`);
    this.playerMpText?.setText(`${this.playerMp}/${PLAYER_MAX_MP}`);
  }

  // ── 웨이브 관리 ──────────────────────────────────────────

  private _startNextWave(): void {
    this.currentWave++;

    // 보스 웨이브 경고
    if (this.currentWave === this.config.bossWave) {
      this._showBossWarning(() => {
        this.phase = 'boss';
        this._spawnEnemyPreview(true);
      });
      return;
    }

    this._spawnEnemyPreview(false);
  }

  private _clearEnemyPreviews(): void {
    for (const obj of this.enemyPreviews) {
      obj.destroy();
    }
    this.enemyPreviews = [];
    this.battleBtn?.destroy();
    this.battleBtn = undefined;
    this.battleBtnIcon?.destroy();
    this.battleBtnIcon = undefined;
    this.battleBtnFrame?.destroy();
    this.battleBtnFrame = undefined;
  }

  private _spawnEnemyPreview(isBoss: boolean): void {
    this._clearEnemyPreviews();

    const count = isBoss ? 1 : ENEMIES_PER_WAVE;

    for (let i = 0; i < count; i++) {
      const pos = isBoss ? BOSS_POS : ENEMY_POSITIONS[i % ENEMY_POSITIONS.length];
      const x = pos.x + Phaser.Math.Between(-20, 20);
      const y = pos.y;
      const _size = isBoss ? 64 : 40;

      const monsterKeys = isBoss ? [DUNGEON_BOSS_IMAGE] : DUNGEON_MONSTER_IMAGES.default;
      const monKey = monsterKeys[i % monsterKeys.length];
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
      const preview = DUNGEON_MONSTER_PREVIEW_TEXTURES[monKey];

      if (preview && this.textures.exists(preview.textureKey)) {
        sprite = this.add.image(x, y, preview.textureKey)
          .setDisplaySize(preview.displaySize, preview.displaySize);
        sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      } else {
        // Aseprite preview 로드 실패 시에만 사용하는 안전 fallback.
        const color = isBoss ? 0xaa2233 : this._monColor(monKey);
        const rectSize = isBoss ? 80 : 56;
        const gfx = this.add.graphics();
        gfx.fillStyle(color, 0.9);
        gfx.fillRoundedRect(0, 0, rectSize, rectSize, 8);
        gfx.generateTexture(`dmon_${i}`, rectSize, rectSize);
        gfx.destroy();
        sprite = this.add.image(x, y, `dmon_${i}`);

        const icon = this._monIcon(monKey);
        const iconText = this.add.text(x, y - 4, icon, {
          fontSize: isBoss ? '28px' : '22px',
        }).setOrigin(0.5);
        this.enemyPreviews.push(iconText);
      }

      // 이름 라벨
      const monName = MONSTER_NAMES[monKey] ?? monKey;
      const nameLabel = this.add.text(x, y - (isBoss ? 92 : 54), isBoss ? `★ ${monName} ★` : monName, {
        fontSize: isBoss ? '13px' : '10px',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        color: isBoss ? '#ff4444' : '#cccccc',
      }).setOrigin(0.5);

      // 스폰 애니메이션
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        duration: 300,
        delay: i * 100,
      });

      this.enemyPreviews.push(sprite, nameLabel);

      // 보스 글로우 이펙트
      if (isBoss) {
        this.tweens.add({
          targets: sprite,
          scaleX: sprite.scaleX * 1.05,
          scaleY: sprite.scaleY * 1.05,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        playSfx(this, UI_SFX.NOTIFICATION, 0.6);
      }
    }

    // ── Battle! 버튼 ──
    const { width, height } = this.cameras.main;
    const battleButtonY = height - 96;
    const launchBattle = () => {
      playSfx(this, UI_SFX.CLICK, 0.3);
      this._launchBattle(isBoss);
    };
    const actionFrame = this._addDungeonFrame(width / 2, battleButtonY, 210, 64, DUNGEON_UI_FRAME_TEXTURES.actionButton, 0x882222, 0.9, 0xffbbbb, 1);
    this.battleBtnFrame = actionFrame.primary;
    const setActionFrameHover = (hovered: boolean) => {
      if (!this.battleBtnFrame) return;

      if (this.battleBtnFrame instanceof Phaser.GameObjects.Image) {
        if (hovered) {
          this.battleBtnFrame.setTint(0xffcccc);
        } else {
          this.battleBtnFrame.clearTint();
        }
        return;
      }

      this.battleBtnFrame.setFillStyle(hovered ? 0xaa3333 : 0x882222, 0.9);
    };
    this.battleBtnFrame
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', launchBattle)
      .on('pointerover', () => setActionFrameHover(true))
      .on('pointerout', () => setActionFrameHover(false));

    const actionButtonIconResource = getSpriteResourceForSkillIcon(DUNGEON_ACTION_BUTTON_ICON_ID);
    const hasActionButtonIcon = Boolean(actionButtonIconResource && this.textures.exists(actionButtonIconResource.key));
    if (hasActionButtonIcon && actionButtonIconResource) {
      this.battleBtnIcon = this.add.image(width / 2 - 45, battleButtonY, actionButtonIconResource.key)
        .setName('dungeon_action_button_icon');
      this.battleBtnIcon.setDisplaySize(22, 22);
      this.battleBtnIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.battleBtn = this.add.text(width / 2 + 16, battleButtonY, hasActionButtonIcon ? 'Battle!' : '⚔ Battle!', {
      fontSize: '22px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ffffff',
      padding: { x: 24, y: 12 },
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', launchBattle)
      .on('pointerover', () => setActionFrameHover(true))
      .on('pointerout', () => setActionFrameHover(false));

    // 버튼 펄스 애니메이션
    this.tweens.add({
      targets: this.battleBtn,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // FINDING-A4 ext13: Enter/Space 로 wave 시작 (WCAG 2.1.1)
    // once 사용 — _launchBattle 후 battleBtn 사라지므로 자동 정리
    const onBattleKey = () => {
      playSfx(this, UI_SFX.CLICK, 0.3);
      this._launchBattle(isBoss);
    };
    this.input.keyboard?.once('keydown-ENTER', onBattleKey);
    this.input.keyboard?.once('keydown-SPACE', onBattleKey);
    // battleBtn destroy 시 listener 강제 정리 (사용자가 ESC 등 다른 path 시)
    this.battleBtn.once('destroy', () => {
      this.input.keyboard?.off('keydown-ENTER', onBattleKey);
      this.input.keyboard?.off('keydown-SPACE', onBattleKey);
    });
    this._writeDungeonFrameQaProbe();
  }

  // ── BattleScene 전환 ─────────────────────────────────────

  private _monIcon(id: string): string {
    const l = id.toLowerCase();
    if (l.includes('skeleton') || l.includes('bone')) return '💀';
    if (l.includes('wolf') || l.includes('hound')) return '🐺';
    if (l.includes('ghost') || l.includes('spirit') || l.includes('shade') || l.includes('phantom')) return '👻';
    if (l.includes('spider')) return '🕷';
    if (l.includes('golem') || l.includes('stone')) return '🪨';
    if (l.includes('rat') || l.includes('beetle') || l.includes('bug')) return '🐛';
    if (l.includes('bat') || l.includes('bird')) return '🦇';
    if (l.includes('serpent') || l.includes('snake') || l.includes('worm')) return '🐍';
    if (l.includes('slime')) return '🫧';
    if (l.includes('boss') || l.includes('absorber')) return '👁';
    return '⚔️';
  }

  private _monColor(id: string): number {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff;
    return 0x333333 | (h & 0x7f7f7f);
  }

  private _launchBattle(isBoss: boolean): void {
    const count = isBoss ? 1 : ENEMIES_PER_WAVE;
    const enemies: CombatUnit[] = [];

    for (let i = 0; i < count; i++) {
      const monsterKeys = isBoss ? [DUNGEON_BOSS_IMAGE] : DUNGEON_MONSTER_IMAGES.default;
      const monKey = monsterKeys[i % monsterKeys.length];
      const monName = MONSTER_NAMES[monKey] ?? monKey;
      const hp = isBoss
        ? ENEMY_BASE_HP * this.currentWave * BOSS_HP_MULT
        : ENEMY_BASE_HP * this.currentWave;

      // monKey에서 _normal 접미사 제거 + 인덱스로 고유 id
      const cleanId = monKey.replace(/_normal$/, '');
      enemies.push({
        id: `${cleanId}_${i}`,
        name: monName,
        hp, maxHp: hp,
        mp: 0, maxMp: 0,
        attack: Math.round(10 + this.currentWave * 3),
        defense: Math.round(3 + this.currentWave),
        attackSpeed: isBoss ? 0.7 : 0.8 + Math.random() * 0.3,
        level: this.currentWave,
        isAlly: false,
      });
    }

    const classId = this._sceneData.characterClass ?? 'ether_knight';

    const allies: CombatUnit[] = [{
      id: 'player_1',
      name: '플레이어',
      hp: this.playerHp, maxHp: PLAYER_MAX_HP,
      mp: this.playerMp, maxMp: PLAYER_MAX_MP,
      attack: 30,
      defense: 10,
      attackSpeed: 1.0,
      level: 1,
      isAlly: true,
      classId,
    }];

    const battleData: BattleSceneData = {
      allies,
      enemies,
      skillSlots: (classSkills[classId] ?? classSkills['ether_knight']).map(s => ({ ...s, currentCooldown: 0 })),
      zoneId: 'erebos',
      monsterId: enemies[0].id,
      monsterName: enemies[0].name,
      returnScene: 'DungeonScene',
      returnData: {
        resumeWave: this.currentWave,
        earnedExp: this.earnedExp,
        earnedGold: this.earnedGold,
        elapsedSec: this.elapsedSec,
        serverSessionId: this.serverSessionId,
        characterClass: classId,
      },
    };

    this.scene.start('BattleScene', battleData);
  }

  // ── 전투 결과 처리 ───────────────────────────────────────

  private _onBattleVictory(): void {
    // 보상 누적
    const isBossWave = this.currentWave >= this.config.bossWave;
    const waveExp = isBossWave
      ? EXP_PER_WAVE * this.currentWave + BOSS_EXP_BONUS
      : EXP_PER_WAVE * this.currentWave;
    const waveGold = isBossWave
      ? GOLD_PER_WAVE * this.currentWave + BOSS_GOLD_BONUS
      : GOLD_PER_WAVE * this.currentWave;
    this.earnedExp += waveExp;
    this.earnedGold += waveGold;

    if (isBossWave) {
      this.phase = 'clear';
      this._showVictory();
    } else {
      this.phase = 'fighting';
      this._showWaveClearPopup(waveExp, waveGold, () => {
        this._startNextWave();
      });
    }
  }

  // ── 웨이브 클리어 팝업 ──────────────────────────────────

  private _showWaveClearPopup(exp: number, gold: number, onDone: () => void): void {
    const { width, height } = this.cameras.main;

    const msg = this.add.text(width / 2, height / 2 - 20, `Wave ${this.currentWave} 클리어!`, {
      fontSize: '24px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffcc44',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const reward = this.add.text(width / 2, height / 2 + 20, `EXP +${exp}   Gold +${gold}`, {
      fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#aaffaa',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0);

    playSfx(this, UI_SFX.QUEST_ACCEPT, 0.5);

    this.tweens.add({
      targets: [msg, reward],
      alpha: 1,
      duration: 300,
      hold: 1200,
      yoyo: true,
      onComplete: () => {
        msg.destroy();
        reward.destroy();
        onDone();
      },
    });
  }

  // ── 승리 연출 ────────────────────────────────────────────

  private _showVictory(): void {
    const { width, height } = this.cameras.main;

    // 승리 보이스
    playRandomVoice(this, [COMBAT_VOICE.VICTORY], 0.5);
    playSfx(this, UI_SFX.QUEST_COMPLETE, 0.6);

    const clearTitleIconResource = getSpriteResourceForSkillIcon(DUNGEON_CLEAR_TITLE_ICON_ID);
    const hasClearTitleIcon = Boolean(clearTitleIconResource && this.textures.exists(clearTitleIconResource.key));
    if (hasClearTitleIcon && clearTitleIconResource) {
      this.dungeonClearTitleIcon = this.add.image(width / 2 - 112, height / 2 - 60, clearTitleIconResource.key)
        .setName('dungeon_clear_title_icon')
        .setOrigin(0.5)
        .setAlpha(0);
      this.dungeonClearTitleIcon.setDisplaySize(26, 26);
      this.dungeonClearTitleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    } else {
      this.dungeonClearTitleIcon = undefined;
      this.dungeonClearTitleIconFallbackRendered = true;
    }

    // 승리 텍스트
    const victoryLabel = hasClearTitleIcon ? '던전 클리어!' : '🏆 던전 클리어!';
    const victoryText = this.add.text(hasClearTitleIcon ? width / 2 + 18 : width / 2, height / 2 - 60, victoryLabel, {
      fontSize: '32px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffdd44',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.dungeonClearTitleText = victoryText;

    // 보상 패널
    const panelBg = this._addDungeonFrame(width / 2, height / 2 + 20, 300, 120, DUNGEON_UI_FRAME_TEXTURES.rewardPanel, 0x111133, 0.9, 0x4466aa, 2);
    panelBg.primary.setAlpha(0);
    panelBg.stroke?.setAlpha(0);

    const rewardText = this.add.text(width / 2, height / 2 + 20, [
      `━━━ 보상 ━━━`,
      `EXP  +${this.earnedExp}`,
      `Gold +${this.earnedGold}`,
      `웨이브 ${this.config.totalWaves}/${this.config.totalWaves} 완료`,
    ].join('\n'), {
      fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffffff',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    // 복귀 버튼
    const returnBtn = this.add.text(width / 2, height / 2 + 100, '[ 로비로 복귀 ]', {
      fontSize: '16px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#88ccff',
      backgroundColor: '#223355', padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setAlpha(0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        playSfx(this, UI_SFX.CLICK, 0.3);
        this.scene.start('LobbyScene');
      });

    // 연출 시퀀스
    this.tweens.add({
      targets: victoryText,
      alpha: 1, y: victoryText.y - 10,
      duration: 500,
    });
    if (this.dungeonClearTitleIcon) {
      this.tweens.add({
        targets: this.dungeonClearTitleIcon,
        alpha: 1, y: this.dungeonClearTitleIcon.y - 10,
        duration: 500,
      });
    }

    this.tweens.add({
      targets: [panelBg.primary, panelBg.stroke, rewardText].filter((
        target,
      ): target is Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text => Boolean(target)),
      alpha: 1,
      duration: 500,
      delay: 400,
    });

    this.tweens.add({
      targets: returnBtn,
      alpha: 1,
      duration: 300,
      delay: 800,
    });

    // FINDING-A4 ext13: Enter/Space 로 로비 복귀 (WCAG 2.1.1)
    // ESC 는 이미 _create() 의 globally 등록 — 여기엔 Enter/Space 만.
    // 1100ms 지연(연출 끝나고) 후 listener once 등록.
    this.time.delayedCall(1100, () => {
      const onReturnKey = () => {
        playSfx(this, UI_SFX.CLICK, 0.3);
        this.scene.start('LobbyScene');
      };
      this.input.keyboard?.once('keydown-ENTER', onReturnKey);
      this.input.keyboard?.once('keydown-SPACE', onReturnKey);
    });

    this._writeDungeonFrameQaProbe();
  }

  // ── 패배 연출 ────────────────────────────────────────────

  private _onDefeat(): void {
    this.phase = 'defeat';
    playRandomVoice(this, [COMBAT_VOICE.DEATH], 0.4);

    // 플레이어 사망 모션
    if (this.playerIdleTween) this.playerIdleTween.stop();
    if (this.playerSprite) {
      this.tweens.add({
        targets: this.playerSprite,
        alpha: 0.2,
        angle: -90,
        duration: 600,
      });
    }

    // 카메라 효과
    this.cameras.main.flash(300, 255, 0, 0);

    this.time.delayedCall(800, () => {
      // SSOT wiring: 패배 연출에 SCENARIO_GAME_OVER_NARRATIVES(universal) 재도전 hint 연결
      this._showPhaseText(composeDungeonGameOverText('party_wipe'), () => {
        this.scene.start('LobbyScene');
      }, 2000);
    });
  }

  // ── 보스 경고 ────────────────────────────────────────────

  private _showBossWarning(onComplete: () => void): void {
    this.phase = 'boss_warning';
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 2);

    // 붉은 배경 플래시
    const flash = this.add.rectangle(0, 0, width, height, 0xff0000, 0);
    container.add(flash);

    const text = this.add.text(0, 0, '⚠ WARNING ⚠\n보스 등장!', {
      fontSize: '36px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ff2222',
      align: 'center',
      stroke: '#440000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    container.add(text);

    // 플래시 + 텍스트 애니메이션
    this.tweens.add({
      targets: flash,
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      repeat: 3,
    });

    // 보스 등장 SFX
    playSfx(this, UI_SFX.NOTIFICATION, 0.7);

    this.tweens.add({
      targets: text,
      alpha: 1,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      hold: 800,
      onComplete: () => {
        container.destroy();
        onComplete();
      },
    });
  }

  // ── 타이머 ───────────────────────────────────────────────

  private _tick(): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;

    this.elapsedSec++;

    if (this.elapsedSec >= this.config.timeLimitSec) {
      this.phase = 'timeout';
      this._clearEnemyPreviews();
      // SSOT wiring: 시간초과 연출에도 동일 universal game-over hint 연결
      this._showPhaseText(composeDungeonGameOverText('time_limit'), () => {
        this.scene.start('LobbyScene');
      }, 2000);
    }
  }

  // ── UI 업데이트 ──────────────────────────────────────────

  private _updateUI(): void {
    this.waveText?.setText(`Wave ${this.currentWave} / ${this.config.totalWaves}`);

    const remaining = Math.max(0, this.config.timeLimitSec - this.elapsedSec);
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    this.timerText?.setText(`${min}:${sec.toString().padStart(2, '0')}`);

    // 타이머 색상 (30초 이하 빨간색)
    this.timerText?.setColor(remaining <= 30 ? '#ff4444' : '#ffcc44');
  }

  // ── 중앙 텍스트 연출 ─────────────────────────────────────

  private _showPhaseText(msg: string, onDone?: () => void, delay = 1500): void {
    this.phaseText?.setText(msg).setAlpha(0);

    this.tweens.add({
      targets: this.phaseText,
      alpha: 1,
      duration: 300,
      hold: delay,
      yoyo: true,
      onComplete: () => {
        if (onDone) onDone();
      },
    });
  }

  private _addDungeonFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof DUNGEON_UI_FRAME_TEXTURES[keyof typeof DUNGEON_UI_FRAME_TEXTURES],
    fallbackColor: number,
    fallbackAlpha: number,
    strokeColor: number,
    strokeWidth = 1,
  ): DungeonFrameRender {
    if (this.textures.exists(texture.key)) {
      const frame = this.add.image(x, y, texture.key)
        .setName(`dungeon_ui_frame_${texture.key}`)
        .setDisplaySize(width, height)
        .setAlpha(0.9);
      this.dungeonFrameQaRenderedKeys.add(texture.key);

      const stroke = this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setName(`dungeon_ui_frame_stroke_${texture.key}`)
        .setStrokeStyle(strokeWidth, strokeColor);
      return { primary: frame, stroke };
    }

    // Aseprite dungeon UI frame 로드 실패 시에만 사용하는 안전 fallback.
    const fallback = this.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
      .setName(`dungeon_ui_frame_fallback_${texture.key}`)
      .setStrokeStyle(strokeWidth, strokeColor);
    return { primary: fallback };
  }

  private _getDungeonFrameQaMode(): 'ready' | 'clear' | undefined {
    return this._sceneData.dungeonFrameQa === 'ready' || this._sceneData.dungeonFrameQa === 'clear'
      ? this._sceneData.dungeonFrameQa
      : undefined;
  }

  private _writeDungeonFrameQaProbe(): void {
    const mode = this._getDungeonFrameQaMode();
    if (!mode || typeof document === 'undefined') return;

    const expectedTextures = mode === 'clear'
      ? [DUNGEON_UI_FRAME_TEXTURES.statusPanel, DUNGEON_UI_FRAME_TEXTURES.rewardPanel]
      : [DUNGEON_UI_FRAME_TEXTURES.statusPanel, DUNGEON_UI_FRAME_TEXTURES.actionButton];
    const renderedFrameKeys = expectedTextures
      .map((texture) => texture.key)
      .filter((key) => this.dungeonFrameQaRenderedKeys.has(key));
    const missingFrameKeys = expectedTextures
      .filter((texture) => !this.textures.exists(texture.key) || !this.dungeonFrameQaRenderedKeys.has(texture.key))
      .map((texture) => texture.key);
    const actionButtonIconResource = getSpriteResourceForSkillIcon(DUNGEON_ACTION_BUTTON_ICON_ID);
    const missingActionButtonIconKeys = mode === 'ready'
      && (!actionButtonIconResource || !this.textures.exists(actionButtonIconResource.key) || this.battleBtnIcon === undefined)
      ? [actionButtonIconResource?.key ?? DUNGEON_ACTION_BUTTON_ICON_ID]
      : [];
    const titleIconResource = getSpriteResourceForSkillIcon(DUNGEON_TITLE_ICON_ID);
    const missingTitleIconKeys = !titleIconResource || !this.textures.exists(titleIconResource.key) || this.dungeonTitleIcon === undefined
      ? [titleIconResource?.key ?? DUNGEON_TITLE_ICON_ID]
      : [];
    const clearTitleIconResource = getSpriteResourceForSkillIcon(DUNGEON_CLEAR_TITLE_ICON_ID);
    const missingClearTitleIconKeys = mode === 'clear'
      && (!clearTitleIconResource || !this.textures.exists(clearTitleIconResource.key) || this.dungeonClearTitleIcon === undefined)
      ? [clearTitleIconResource?.key ?? DUNGEON_CLEAR_TITLE_ICON_ID]
      : [];
    const clearTitleLegacyGlyphPresent = this.dungeonClearTitleText?.text.includes('🏆') ?? false;

    document.body.dataset.aeternaDungeonFrameQa = JSON.stringify({
      status: missingFrameKeys.length === 0
        && missingActionButtonIconKeys.length === 0
        && missingTitleIconKeys.length === 0
        && missingClearTitleIconKeys.length === 0
        && !(mode === 'clear' && clearTitleLegacyGlyphPresent)
        ? 'ready'
        : 'missing-frame',
      mode,
      renderedFrameKeys,
      missingFrameKeys,
      titleIcon: {
        iconId: DUNGEON_TITLE_ICON_ID,
        key: titleIconResource?.key ?? null,
        path: titleIconResource?.path ?? null,
        rendered: this.dungeonTitleIcon !== undefined,
        visible: this.dungeonTitleIcon?.visible ?? false,
        displayWidth: this.dungeonTitleIcon?.displayWidth ?? 0,
        displayHeight: this.dungeonTitleIcon?.displayHeight ?? 0,
        fallbackRendered: this.dungeonTitleIconFallbackRendered,
      },
      missingTitleIconKeys,
      clearTitleIcon: {
        iconId: DUNGEON_CLEAR_TITLE_ICON_ID,
        key: clearTitleIconResource?.key ?? null,
        path: clearTitleIconResource?.path ?? null,
        rendered: this.dungeonClearTitleIcon !== undefined,
        visible: this.dungeonClearTitleIcon?.visible ?? false,
        displayWidth: this.dungeonClearTitleIcon?.displayWidth ?? 0,
        displayHeight: this.dungeonClearTitleIcon?.displayHeight ?? 0,
        fallbackRendered: this.dungeonClearTitleIconFallbackRendered,
      },
      clearTitleLegacyGlyphPresent,
      missingClearTitleIconKeys,
      actionButtonIcon: {
        iconId: DUNGEON_ACTION_BUTTON_ICON_ID,
        key: actionButtonIconResource?.key ?? null,
        path: actionButtonIconResource?.path ?? null,
        rendered: this.battleBtnIcon !== undefined,
        visible: this.battleBtnIcon?.visible ?? false,
        displayWidth: this.battleBtnIcon?.displayWidth ?? 0,
        displayHeight: this.battleBtnIcon?.displayHeight ?? 0,
        fallbackRendered: this.battleBtnIcon === undefined,
      },
      missingActionButtonIconKeys,
    });
  }
}
