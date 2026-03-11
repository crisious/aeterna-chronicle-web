/**
 * DungeonScene.ts — 던전 전투 씬 (P5-18)
 *
 * - 웨이브 카운터 (Wave 1/5 등)
 * - 보스 경고 연출
 * - 전투 타이머
 * - 웨이브 완료 → 다음 웨이브 or 보스 → 클리어 → 보상
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';

// ── 타입 ────────────────────────────────────────────────────

interface DungeonConfig {
  dungeonName: string;
  totalWaves: number;
  bossWave: number;
  timeLimitSec: number;
}

interface EnemySprite {
  sprite: Phaser.GameObjects.Rectangle;
  hp: number;
  maxHp: number;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
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
const ENEMY_AREA_X = 700;
const ENEMY_Y_START = 180;
const ENEMY_Y_GAP = 100;
const BAR_W = 50;
const BAR_H = 5;

// ── DungeonScene ────────────────────────────────────────────

export class DungeonScene extends Phaser.Scene {
  private config: DungeonConfig = DEFAULT_CONFIG;
  private phase: DungeonPhase = 'ready';
  private currentWave = 0;
  private elapsedSec = 0;
  private enemies: EnemySprite[] = [];

  // UI 요소
  private waveText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;


  constructor() {
    super({ key: 'DungeonScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0d0d1a');

    this.phase = 'ready';
    this.currentWave = 0;
    this.elapsedSec = 0;
    this.enemies = [];

    // 던전 이름
    this.add.text(width / 2, 20, `⚔ ${this.config.dungeonName}`, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ff8844',
    }).setOrigin(0.5);

    // 웨이브 카운터
    this.waveText = this.add.text(20, 50, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });

    // 타이머
    this.timerText = this.add.text(width - 20, 50, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffcc44',
    }).setOrigin(1, 0);

    // 상태 텍스트 (중앙)
    this.phaseText = this.add.text(width / 2, height / 2, '', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // 플레이어 표시 (간략)
    this.add.rectangle(180, height / 2, 40, 40, 0x4488ff);
    this.add.text(180, height / 2 + 32, '플레이어', {
      fontSize: '11px',
      color: '#88ccff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 공격 안내
    this.add.text(width / 2, height - 30, '[ 클릭으로 적 공격 ]', {
      fontSize: '12px',
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 뒤로가기
    this.add.text(20, height - 30, '← 퇴장', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: 'monospace',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LobbyScene'));

    // 시작 연출
    this._showPhaseText('준비!', () => {
      this.phase = 'fighting';
      this._startNextWave();
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
      e.sprite.destroy();
      e.hpBar.destroy();
      e.hpBarBg.destroy();
    }
    this.enemies = [];

    const count = isBoss ? 1 : ENEMIES_PER_WAVE;
    const { height } = this.cameras.main;

    for (let i = 0; i < count; i++) {
      const x = ENEMY_AREA_X + Phaser.Math.Between(0, 200);
      const y = isBoss ? height / 2 : ENEMY_Y_START + i * ENEMY_Y_GAP;
      const hp = isBoss
        ? ENEMY_BASE_HP * this.currentWave * BOSS_HP_MULT
        : ENEMY_BASE_HP * this.currentWave;
      const size = isBoss ? 56 : 36;
      const color = isBoss ? 0xff2244 : 0xff6644;

      const sprite = this.add.rectangle(x, y, size, size, color)
        .setInteractive({ useHandCursor: true });

      const hpBarBg = this.add.rectangle(x, y - size / 2 - 8, BAR_W, BAR_H, 0x333333);
      const hpBar = this.add.rectangle(x, y - size / 2 - 8, BAR_W, BAR_H, 0x44ff44);

      const enemy: EnemySprite = { sprite, hp, maxHp: hp, hpBar, hpBarBg };
      this.enemies.push(enemy);

      // 클릭 공격
      sprite.on('pointerdown', () => this._attackEnemy(enemy));
    }

    if (isBoss) {
      // 보스 이름
      const bossEnemy = this.enemies[0];
      this.add.text(bossEnemy.sprite.x, bossEnemy.sprite.y + 40, '★ BOSS ★', {
        fontSize: '14px',
        color: '#ff4444',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }

  private _attackEnemy(enemy: EnemySprite): void {
    if (this.phase !== 'fighting' && this.phase !== 'boss') return;
    if (enemy.hp <= 0) return;

    const dmg = Phaser.Math.Between(15, 35) * (1 + this.currentWave * 0.1);
    enemy.hp = Math.max(0, enemy.hp - Math.round(dmg));

    // HP바 업데이트
    const ratio = enemy.hp / enemy.maxHp;
    enemy.hpBar.setScale(ratio, 1);
    enemy.hpBar.setPosition(
      enemy.hpBarBg.x - (BAR_W * (1 - ratio)) / 2,
      enemy.hpBarBg.y,
    );

    // 히트 이펙트 (흔들림)
    this.tweens.add({
      targets: enemy.sprite,
      x: enemy.sprite.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 2,
    });

    // 사망 판정
    if (enemy.hp <= 0) {
      enemy.sprite.setAlpha(0.2);
      this._checkWaveClear();
    }
  }

  private _checkWaveClear(): void {
    const allDead = this.enemies.every(e => e.hp <= 0);
    if (!allDead) return;

    if (this.phase === 'boss' || this.currentWave >= this.config.totalWaves) {
      // 던전 클리어
      this.phase = 'clear';
      this._showPhaseText('🏆 던전 클리어!', () => {
        this.scene.start('LobbyScene');
      }, 2000);
    } else {
      // 다음 웨이브
      this._showPhaseText(`Wave ${this.currentWave} 완료!`, () => {
        this.phase = 'fighting';
        this._startNextWave();
      }, 1000);
    }
  }

  // ── 보스 경고 ────────────────────────────────────────────

  private _showBossWarning(onComplete: () => void): void {
    this.phase = 'boss_warning';
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 2);
    // container는 onComplete 콜백에서 destroy됨

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
        // 보스 경고 UI 해제 완료
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
      this._showPhaseText('⏰ 시간 초과!', () => {
        this.scene.start('LobbyScene');
      }, 2000);
    }
  }

  // ── UI ───────────────────────────────────────────────────

  private _updateUI(): void {
    this.waveText.setText(`Wave ${this.currentWave} / ${this.config.totalWaves}`);

    const remaining = Math.max(0, this.config.timeLimitSec - this.elapsedSec);
    const min = Math.floor(remaining / 60);
    const sec = remaining % 60;
    this.timerText.setText(`${min}:${sec.toString().padStart(2, '0')}`);

    // 타이머 색상 (30초 이하 빨간색)
    this.timerText.setColor(remaining <= 30 ? '#ff4444' : '#ffcc44');
  }

  // ── 중앙 텍스트 연출 ─────────────────────────────────────

  private _showPhaseText(msg: string, onDone?: () => void, delay = 1500): void {
    this.phaseText.setText(msg).setAlpha(0);

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
