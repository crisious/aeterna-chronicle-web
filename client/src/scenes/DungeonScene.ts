/**
 * DungeonScene.ts — FF6 스타일 사이드뷰 던전 전투 씬
 *
 * - FF6 레이아웃: 왼쪽 플레이어(side), 오른쪽 몬스터(front)
 * - 웨이브 카운터 (Wave 1/5 등)
 * - 보스 경고 연출 + 보스 글로우
 * - 전투 타이머
 * - 데미지 팝업 (크리티컬=금색)
 * - 커맨드 버튼: 공격/방어/포션
 * - 플레이어 HP/MP 바 + 적 반격
 * - 히트 이펙트 (흔들림 + 번쩍임)
 * - 승리/클리어 연출 + EXP/골드 팝업
 * - SFX 연동 (SFXHelper)
 * - P25-06: NetworkManager 던전 API 연동
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { networkManager } from '../network/NetworkManager';
import { playSfx, UI_SFX, COMBAT_VOICE, playRandomVoice } from '../utils/SFXHelper';

// ── 타입 ────────────────────────────────────────────────────

interface DungeonConfig {
  dungeonName: string;
  totalWaves: number;
  bossWave: number;
  timeLimitSec: number;
}

interface EnemySprite {
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  hp: number;
  maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  nameLabel?: Phaser.GameObjects.Text;
}

type DungeonPhase = 'ready' | 'fighting' | 'boss_warning' | 'boss' | 'clear' | 'timeout' | 'defeat';

type CommandMode = 'attack' | 'defend' | 'potion';

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
const BAR_W = 50;
const BAR_H = 5;

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
const POTION_HEAL = 120;
const POTION_COUNT = 5;
const DEFEND_REDUCTION = 0.5;
const ENEMY_ATTACK_INTERVAL_MS = 2500; // 적 반격 주기

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

// ── DungeonScene ────────────────────────────────────────────

export class DungeonScene extends Phaser.Scene {
  private config: DungeonConfig = DEFAULT_CONFIG;
  private phase: DungeonPhase = 'ready';
  private currentWave = 0;
  private elapsedSec = 0;
  private enemies: EnemySprite[] = [];

  // 플레이어 상태
  private playerHp = PLAYER_MAX_HP;
  private playerMp = PLAYER_MAX_MP;
  private potionCount = POTION_COUNT;
  private isDefending = false;
  private commandMode: CommandMode = 'attack';
  private earnedExp = 0;
  private earnedGold = 0;

  // P25-06: 서버 던전 세션
  private serverSessionId: string | null = null;

  // UI 요소
  private waveText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private phaseText?: Phaser.GameObjects.Text;
  private playerSprite?: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private playerHpBar?: Phaser.GameObjects.Rectangle;
  private playerHpBarBg?: Phaser.GameObjects.Rectangle;
  private playerHpText?: Phaser.GameObjects.Text;
  private playerMpBar?: Phaser.GameObjects.Rectangle;
  private playerMpBarBg?: Phaser.GameObjects.Rectangle;
  private playerMpText?: Phaser.GameObjects.Text;
  private cmdAttackBtn?: Phaser.GameObjects.Text;
  private cmdDefendBtn?: Phaser.GameObjects.Text;
  private cmdPotionBtn?: Phaser.GameObjects.Text;
  private enemyAttackTimer?: Phaser.Time.TimerEvent;
  private playerIdleTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: 'DungeonScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  preload(): void {
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Dungeon] 에셋 로드 실패: ${file.key}`);
    });

    // 플레이어 캐릭터
    const classId = (this as any)._initData?.characterClass ?? 'ether_knight';
    this.load.image('dungeon_player', `assets/generated/characters/class_main/char_illust_${classId}_side.png`);

    // 배경
    this.load.image('dungeon_bg', 'assets/generated/environment/backgrounds/ERB-BG-FAR-NIGHT.png');

    // 몬스터
    for (const key of DUNGEON_MONSTER_IMAGES.default) {
      this.load.image(key, `assets/generated/monsters/normal/${key}.png`);
    }
    this.load.image(DUNGEON_BOSS_IMAGE, `assets/generated/monsters/normal/${DUNGEON_BOSS_IMAGE}.png`);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0d0d1a');

    this.phase = 'ready';
    this.currentWave = 0;
    this.elapsedSec = 0;
    this.enemies = [];
    this.playerHp = PLAYER_MAX_HP;
    this.playerMp = PLAYER_MAX_MP;
    this.potionCount = POTION_COUNT;
    this.isDefending = false;
    this.commandMode = 'attack';
    this.earnedExp = 0;
    this.earnedGold = 0;

    // ── 배경 ──
    if (this.textures.exists('dungeon_bg')) {
      this.add.image(width / 2, height / 2, 'dungeon_bg')
        .setDisplaySize(width, height).setAlpha(0.35).setDepth(-1);
    }

    // ── 던전 이름 ──
    this.add.text(width / 2, 18, `⚔ ${this.config.dungeonName}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ff8844',
    }).setOrigin(0.5);

    // ── 웨이브 카운터 ──
    this.waveText = this.add.text(20, 50, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });

    // ── 타이머 ──
    this.timerText = this.add.text(width - 20, 50, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc44',
    }).setOrigin(1, 0);

    // ── 중앙 상태 텍스트 ──
    this.phaseText = this.add.text(width / 2, height / 2, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // ── 플레이어 캐릭터 (FF6 왼쪽 배치) ──
    this._createPlayer(height);

    // ── 플레이어 HP/MP 바 (하단 좌측) ──
    this._createPlayerStatusBars(width, height);

    // ── 커맨드 버튼 (하단 중앙) ──
    this._createCommandButtons(width, height);

    // ── 뒤로가기 ──
    this.add.text(20, height - 30, '← 퇴장', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: 'monospace',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LobbyScene'));

    // ── 시작 연출 ──
    this._showPhaseText('준비!', () => {
      this.phase = 'fighting';
      this._startNextWave();
      this._startEnemyAttackTimer();
    });

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

  private _createPlayer(sceneHeight: number): void {
    const py = sceneHeight / 2;

    if (this.textures.exists('dungeon_player')) {
      this.playerSprite = this.add.image(PLAYER_X, py, 'dungeon_player')
        .setDisplaySize(72, 90);
    } else {
      this.playerSprite = this.add.rectangle(PLAYER_X, py, 40, 50, 0x4488ff);
    }

    // 이름 라벨
    this.add.text(PLAYER_X, py + 55, '플레이어', {
      fontSize: '11px',
      color: '#88ccff',
      fontFamily: 'monospace',
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

    // HP
    this.add.text(baseX, baseY - 2, 'HP', {
      fontSize: '11px', color: '#44ff44', fontFamily: 'monospace',
    });
    this.playerHpBarBg = this.add.rectangle(baseX + 25 + barW / 2, baseY + 4, barW, barH, 0x333333);
    this.playerHpBar = this.add.rectangle(baseX + 25 + barW / 2, baseY + 4, barW, barH, 0x44ff44);
    this.playerHpText = this.add.text(baseX + 25 + barW + 8, baseY - 2, `${this.playerHp}/${PLAYER_MAX_HP}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
    });

    // MP
    const mpY = baseY + 20;
    this.add.text(baseX, mpY - 2, 'MP', {
      fontSize: '11px', color: '#4488ff', fontFamily: 'monospace',
    });
    this.playerMpBarBg = this.add.rectangle(baseX + 25 + barW / 2, mpY + 4, barW, barH, 0x333333);
    this.playerMpBar = this.add.rectangle(baseX + 25 + barW / 2, mpY + 4, barW, barH, 0x4488ff);
    this.playerMpText = this.add.text(baseX + 25 + barW + 8, mpY - 2, `${this.playerMp}/${PLAYER_MAX_MP}`, {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace',
    });
  }

  // ── 커맨드 버튼 ──────────────────────────────────────────

  private _createCommandButtons(width: number, height: number): void {
    const btnY = height - 55;
    const btnStyle = {
      fontSize: '15px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#333355',
      padding: { x: 14, y: 8 },
    };
    const selectedStyle = '#5566aa';
    const normalBg = '#333355';

    // 공격 버튼
    this.cmdAttackBtn = this.add.text(width / 2 - 130, btnY, '⚔ 공격', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.commandMode = 'attack';
        this.isDefending = false;
        this._updateCommandHighlight();
        playSfx(this, UI_SFX.CLICK, 0.3);
      });

    // 방어 버튼
    this.cmdDefendBtn = this.add.text(width / 2, btnY, '🛡 방어', btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.commandMode = 'defend';
        this.isDefending = true;
        this._updateCommandHighlight();
        playSfx(this, UI_SFX.CONFIRM, 0.3);
        this._showDamagePopup(this.playerSprite!, '방어 태세!', '#88aaff');
      });

    // 포션 버튼
    this.cmdPotionBtn = this.add.text(width / 2 + 130, btnY, `💊 포션(${this.potionCount})`, btnStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this._usePotion();
      });

    this._updateCommandHighlight();
  }

  private _updateCommandHighlight(): void {
    const selColor = '#aaccff';
    const normColor = '#ffffff';
    this.cmdAttackBtn?.setColor(this.commandMode === 'attack' ? selColor : normColor);
    this.cmdDefendBtn?.setColor(this.commandMode === 'defend' ? selColor : normColor);
    this.cmdPotionBtn?.setColor(normColor);

    // 배경 시각적 강조 (underline 효과)
    this.cmdAttackBtn?.setStyle({ backgroundColor: this.commandMode === 'attack' ? '#5566aa' : '#333355' });
    this.cmdDefendBtn?.setStyle({ backgroundColor: this.commandMode === 'defend' ? '#5566aa' : '#333355' });
  }

  private _usePotion(): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;
    if (this.potionCount <= 0) {
      this._showDamagePopup(this.playerSprite!, '포션 없음!', '#ff4444');
      playSfx(this, UI_SFX.ERROR, 0.3);
      return;
    }

    this.potionCount--;
    const heal = Math.min(POTION_HEAL, PLAYER_MAX_HP - this.playerHp);
    this.playerHp = Math.min(PLAYER_MAX_HP, this.playerHp + POTION_HEAL);

    this.cmdPotionBtn?.setText(`💊 포션(${this.potionCount})`);
    this._showDamagePopup(this.playerSprite!, `+${heal}`, '#44ff44');
    playSfx(this, UI_SFX.ITEM_PICKUP, 0.4);
    this._updatePlayerBars();
  }

  // ── 웨이브 관리 ──────────────────────────────────────────

  private _startNextWave(): void {
    this.currentWave++;

    // 보스 웨이브 경고
    if (this.currentWave === this.config.bossWave) {
      this._showBossWarning(() => {
        this.phase = 'boss';
        this._spawnEnemies(true);
      });
      return;
    }

    this._spawnEnemies(false);
  }

  private _spawnEnemies(isBoss: boolean): void {
    // 기존 적 정리
    for (const e of this.enemies) {
      e.sprite?.destroy();
      e.hpBar?.destroy();
      e.hpBarBg?.destroy();
      e.nameLabel?.destroy();
    }
    this.enemies = [];

    const count = isBoss ? 1 : ENEMIES_PER_WAVE;

    for (let i = 0; i < count; i++) {
      const pos = isBoss ? BOSS_POS : ENEMY_POSITIONS[i % ENEMY_POSITIONS.length];
      const x = pos.x + Phaser.Math.Between(-20, 20);
      const y = pos.y;
      const hp = isBoss
        ? ENEMY_BASE_HP * this.currentWave * BOSS_HP_MULT
        : ENEMY_BASE_HP * this.currentWave;
      const size = isBoss ? 64 : 40;
      const color = isBoss ? 0xff2244 : 0xff6644;

      // 몬스터 이미지 사용 (fallback: 사각형)
      const monsterKeys = isBoss ? [DUNGEON_BOSS_IMAGE] : DUNGEON_MONSTER_IMAGES.default;
      const monKey = monsterKeys[i % monsterKeys.length];
      let sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;

      if (this.textures.exists(monKey)) {
        sprite = this.add.image(x, y, monKey)
          .setDisplaySize(isBoss ? size * 2.5 : size * 2, isBoss ? size * 2.5 : size * 2)
          .setInteractive({ useHandCursor: true });
      } else {
        sprite = this.add.rectangle(x, y, size, size, color)
          .setInteractive({ useHandCursor: true });
      }

      // HP 바
      const hpBarBg = this.add.rectangle(x, y - (isBoss ? 80 : 44), BAR_W, BAR_H, 0x333333);
      const hpBar = this.add.rectangle(x, y - (isBoss ? 80 : 44), BAR_W, BAR_H, isBoss ? 0xff4444 : 0x44ff44);

      // 이름 라벨
      const monName = MONSTER_NAMES[monKey] ?? monKey;
      const nameLabel = this.add.text(x, y - (isBoss ? 92 : 54), isBoss ? `★ ${monName} ★` : monName, {
        fontSize: isBoss ? '13px' : '10px',
        fontFamily: 'monospace',
        color: isBoss ? '#ff4444' : '#cccccc',
      }).setOrigin(0.5);

      const enemy: EnemySprite = { sprite, hp, maxHp: hp, hpBar, hpBarBg, nameLabel };
      this.enemies.push(enemy);

      // 스폰 애니메이션
      sprite.setAlpha(0);
      this.tweens.add({
        targets: sprite,
        alpha: 1,
        duration: 300,
        delay: i * 100,
      });

      // 클릭 → 현재 커맨드에 따라 행동
      sprite.on('pointerdown', () => this._onEnemyClick(enemy));
    }

    // 보스 글로우 이펙트
    if (isBoss && this.enemies.length > 0) {
      const bossSprite = this.enemies[0].sprite;
      this.tweens.add({
        targets: bossSprite,
        scaleX: (bossSprite as any).scaleX * 1.05,
        scaleY: (bossSprite as any).scaleY * 1.05,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      // 보스 등장 SFX
      playSfx(this, UI_SFX.NOTIFICATION, 0.6);
    }
  }

  // ── 적 클릭 핸들러 ───────────────────────────────────────

  private _onEnemyClick(enemy: EnemySprite): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;
    if (enemy.hp <= 0) return;

    if (this.commandMode === 'attack') {
      this._attackEnemy(enemy);
    }
    // defend/potion은 버튼에서 처리, 적 클릭 시에도 공격으로 폴백
  }

  private _attackEnemy(enemy: EnemySprite): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;
    if (enemy.hp <= 0) return;

    // 방어 해제 (공격하면 방어 상태 종료)
    this.isDefending = false;
    this.commandMode = 'attack';
    this._updateCommandHighlight();

    // 데미지 계산
    const baseDmg = Phaser.Math.Between(15, 35) * (1 + this.currentWave * 0.1);
    const isCritical = Math.random() < 0.15;
    const dmg = Math.round(isCritical ? baseDmg * 2 : baseDmg);
    enemy.hp = Math.max(0, enemy.hp - dmg);

    // HP 바 업데이트
    this._updateEnemyHpBar(enemy);

    // 데미지 팝업
    this._showDamagePopup(
      enemy.sprite,
      isCritical ? `${dmg} CRIT!` : `${dmg}`,
      isCritical ? '#ffcc00' : '#ffffff',
    );

    // 히트 이펙트: 흔들림 + 번쩍임
    this._showHitEffect(enemy.sprite);

    // SFX
    playSfx(this, 'sfx_combat_slash', 0.4);
    if (isCritical) {
      playRandomVoice(this, [COMBAT_VOICE.CRITICAL], 0.5);
    } else {
      playRandomVoice(this, [...COMBAT_VOICE.ATTACK], 0.3);
    }

    // 사망 판정
    if (enemy.hp <= 0) {
      this._killEnemy(enemy);
    }
  }

  private _killEnemy(enemy: EnemySprite): void {
    // 사망 연출: 페이드 아웃
    this.tweens.add({
      targets: [enemy.sprite, enemy.hpBar, enemy.hpBarBg, enemy.nameLabel].filter(Boolean),
      alpha: 0,
      duration: 500,
      onComplete: () => {
        this._checkWaveClear();
      },
    });
    playRandomVoice(this, [COMBAT_VOICE.DEATH], 0.3);
  }

  private _updateEnemyHpBar(enemy: EnemySprite): void {
    const ratio = enemy.hp / enemy.maxHp;
    enemy.hpBar?.setScale(ratio, 1);
    if (enemy.hpBar && enemy.hpBarBg) {
      enemy.hpBar.setPosition(
        enemy.hpBarBg.x - (BAR_W * (1 - ratio)) / 2,
        enemy.hpBarBg.y,
      );
    }
    // 색상 변화 (HP 낮으면 빨갛게)
    if (ratio < 0.3) {
      enemy.hpBar?.setFillStyle(0xff4444);
    } else if (ratio < 0.6) {
      enemy.hpBar?.setFillStyle(0xffaa44);
    }
  }

  // ── 적 반격 시스템 ───────────────────────────────────────

  private _startEnemyAttackTimer(): void {
    this.enemyAttackTimer = this.time.addEvent({
      delay: ENEMY_ATTACK_INTERVAL_MS,
      loop: true,
      callback: () => this._enemyAttack(),
    });
  }

  private _enemyAttack(): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;

    const aliveEnemies = this.enemies.filter(e => e.hp > 0);
    if (aliveEnemies.length === 0) return;

    // 랜덤 적 하나가 공격
    const attacker = aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)];
    const baseDmg = Phaser.Math.Between(8, 20) * (1 + this.currentWave * 0.15);
    const dmg = Math.round(this.isDefending ? baseDmg * DEFEND_REDUCTION : baseDmg);

    this.playerHp = Math.max(0, this.playerHp - dmg);
    this._updatePlayerBars();

    // 데미지 팝업 (플레이어)
    this._showDamagePopup(
      this.playerSprite!,
      this.isDefending ? `${dmg} (방어!)` : `${dmg}`,
      '#ff6644',
    );

    // 히트 이펙트 (플레이어)
    this._showHitEffect(this.playerSprite!);
    playRandomVoice(this, [...COMBAT_VOICE.HIT], 0.3);

    // 공격 모션 (적 → 플레이어 방향 돌진)
    const origX = attacker.sprite?.x ?? 0;
    if (attacker.sprite) {
      this.tweens.add({
        targets: attacker.sprite,
        x: origX - 40,
        duration: 150,
        yoyo: true,
      });
    }

    // 패배 체크
    if (this.playerHp <= 0) {
      this._onDefeat();
    }
  }

  private _updatePlayerBars(): void {
    const hpRatio = this.playerHp / PLAYER_MAX_HP;
    const mpRatio = this.playerMp / PLAYER_MAX_MP;

    this.playerHpBar?.setScale(hpRatio, 1);
    if (this.playerHpBar && this.playerHpBarBg) {
      const barW = 160;
      this.playerHpBar.setPosition(
        this.playerHpBarBg.x - (barW * (1 - hpRatio)) / 2,
        this.playerHpBarBg.y,
      );
    }
    // HP색 변화
    if (hpRatio < 0.25) {
      this.playerHpBar?.setFillStyle(0xff2222);
    } else if (hpRatio < 0.5) {
      this.playerHpBar?.setFillStyle(0xffaa44);
    } else {
      this.playerHpBar?.setFillStyle(0x44ff44);
    }

    this.playerMpBar?.setScale(mpRatio, 1);
    if (this.playerMpBar && this.playerMpBarBg) {
      const barW = 160;
      this.playerMpBar.setPosition(
        this.playerMpBarBg.x - (barW * (1 - mpRatio)) / 2,
        this.playerMpBarBg.y,
      );
    }

    this.playerHpText?.setText(`${this.playerHp}/${PLAYER_MAX_HP}`);
    this.playerMpText?.setText(`${this.playerMp}/${PLAYER_MAX_MP}`);
  }

  // ── 웨이브 클리어 ────────────────────────────────────────

  private _checkWaveClear(): void {
    const allDead = this.enemies.every(e => e.hp <= 0);
    if (!allDead) return;

    // 보상 누적
    const isBossWave = this.phase === 'boss' || this.currentWave >= this.config.totalWaves;
    const waveExp = isBossWave ? EXP_PER_WAVE * this.currentWave + BOSS_EXP_BONUS : EXP_PER_WAVE * this.currentWave;
    const waveGold = isBossWave ? GOLD_PER_WAVE * this.currentWave + BOSS_GOLD_BONUS : GOLD_PER_WAVE * this.currentWave;
    this.earnedExp += waveExp;
    this.earnedGold += waveGold;

    if (isBossWave) {
      // 던전 클리어
      this.phase = 'clear';
      this.enemyAttackTimer?.remove();
      this._showVictory();
    } else {
      // 웨이브 클리어 → 다음 웨이브
      this._showWaveClearPopup(waveExp, waveGold, () => {
        this.phase = 'fighting';
        this._startNextWave();
      });
    }
  }

  private _showWaveClearPopup(exp: number, gold: number, onDone: () => void): void {
    const { width, height } = this.cameras.main;

    const msg = this.add.text(width / 2, height / 2 - 20, `Wave ${this.currentWave} 클리어!`, {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffcc44',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    const reward = this.add.text(width / 2, height / 2 + 20, `EXP +${exp}   Gold +${gold}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#aaffaa',
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

    // 승리 텍스트
    const victoryText = this.add.text(width / 2, height / 2 - 60, '🏆 던전 클리어!', {
      fontSize: '32px', fontFamily: 'monospace', color: '#ffdd44',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // 보상 패널
    const panelBg = this.add.rectangle(width / 2, height / 2 + 20, 300, 120, 0x111133, 0.9)
      .setStrokeStyle(2, 0x4466aa).setAlpha(0);

    const rewardText = this.add.text(width / 2, height / 2 + 20, [
      `━━━ 보상 ━━━`,
      `EXP  +${this.earnedExp}`,
      `Gold +${this.earnedGold}`,
      `웨이브 ${this.config.totalWaves}/${this.config.totalWaves} 완료`,
    ].join('\n'), {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      align: 'center', lineSpacing: 6,
    }).setOrigin(0.5).setAlpha(0);

    // 복귀 버튼
    const returnBtn = this.add.text(width / 2, height / 2 + 100, '[ 로비로 복귀 ]', {
      fontSize: '16px', fontFamily: 'monospace', color: '#88ccff',
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

    this.tweens.add({
      targets: [panelBg, rewardText],
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
  }

  // ── 패배 연출 ────────────────────────────────────────────

  private _onDefeat(): void {
    this.phase = 'defeat';
    this.enemyAttackTimer?.remove();
    playRandomVoice(this, [COMBAT_VOICE.DEATH], 0.4);

    const { width, height } = this.cameras.main;

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
      this._showPhaseText('💀 패배...', () => {
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
      fontFamily: 'monospace',
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

  // ── 히트 이펙트 ──────────────────────────────────────────

  private _showHitEffect(target: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.GameObject): void {
    // 흔들림
    this.tweens.add({
      targets: target,
      x: (target as any).x + 6,
      duration: 40,
      yoyo: true,
      repeat: 3,
    });

    // 번쩍임 (setTint 흰색 → 원복)
    if ('setTint' in target && typeof (target as any).setTint === 'function') {
      (target as any).setTint(0xffffff);
      this.time.delayedCall(80, () => {
        if ('clearTint' in target && typeof (target as any).clearTint === 'function') {
          (target as any).clearTint();
        }
      });
    }
  }

  // ── 데미지 팝업 ──────────────────────────────────────────

  private _showDamagePopup(
    target: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image | Phaser.GameObjects.GameObject,
    text: string,
    color: string,
  ): void {
    const tx = (target as any).x ?? 0;
    const ty = (target as any).y ?? 0;

    const dmgText = this.add.text(tx + Phaser.Math.Between(-10, 10), ty - 25, text, {
      fontSize: '18px',
      color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 45,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => dmgText.destroy(),
    });
  }

  // ── 타이머 ───────────────────────────────────────────────

  private _tick(): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;

    this.elapsedSec++;

    if (this.elapsedSec >= this.config.timeLimitSec) {
      this.phase = 'timeout';
      this.enemyAttackTimer?.remove();
      this._showPhaseText('⏰ 시간 초과!', () => {
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
}
