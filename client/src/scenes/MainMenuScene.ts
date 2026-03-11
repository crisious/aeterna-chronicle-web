/**
 * MainMenuScene.ts — 타이틀 화면 (P5-18)
 *
 * - 에테르나 크로니클 로고 + 배경
 * - 시작 / 설정 / 크레딧 버튼
 * - 페이드 인 트랜지션
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';

// ── 상수 ────────────────────────────────────────────────────

const TITLE_TEXT = 'AETHERNA\nCHRONICLE';
const SUBTITLE_TEXT = '에테르나 크로니클';
const BG_COLOR_TOP = 0x0a0a2e;
const BG_COLOR_BOTTOM = 0x16213e;

/** 메뉴 항목 정의 */
interface MenuItem {
  label: string;
  action: () => void;
}

// ── MainMenuScene ───────────────────────────────────────────

export class MainMenuScene extends Phaser.Scene {
  private menuItems: Phaser.GameObjects.Text[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private particleTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  create(): void {
    const { width, height } = this.cameras.main;

    // 그라데이션 배경
    this._drawGradientBg(width, height);

    // 배경 파티클 (에테르 빛 입자)
    this._spawnAetherParticles(width, height);

    // 타이틀 로고
    this.titleText = this.add.text(width / 2, height * 0.25, TITLE_TEXT, {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#c8a2ff',
      align: 'center',
      stroke: '#4a0080',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    // 서브타이틀 (한국어)
    this.subtitleText = this.add.text(width / 2, height * 0.42, SUBTITLE_TEXT, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#8888cc',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // 메뉴 버튼
    const menuDefs: MenuItem[] = [
      { label: '▶  게임 시작', action: () => this._onStart() },
      { label: '⚙  설정',     action: () => this._onSettings() },
      { label: '📜 크레딧',   action: () => this._onCredits() },
    ];

    const menuStartY = height * 0.58;
    const menuGap = 48;

    menuDefs.forEach((def, i) => {
      const btn = this.add.text(width / 2, menuStartY + i * menuGap, def.label, {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#cccccc',
        align: 'center',
      })
        .setOrigin(0.5)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });

      // 호버 이펙트
      btn.on('pointerover', () => btn.setColor('#ffffff').setScale(1.05));
      btn.on('pointerout', () => btn.setColor('#cccccc').setScale(1.0));
      btn.on('pointerdown', def.action);

      this.menuItems.push(btn);
    });

    // 하단 버전 표시
    this.add.text(width - 12, height - 12, 'v0.5.18', {
      fontSize: '11px',
      color: '#444466',
    }).setOrigin(1, 1);

    // 페이드 인 연출
    this._playIntroAnimation();

    // SceneManager 페이드 인 (다른 씬에서 전환 시)
    SceneManager.fadeIn(this, 300);
  }

  // ── 메뉴 액션 ────────────────────────────────────────────

  private _onStart(): void {
    this.scene.start('CharacterSelectScene');
  }

  private _onSettings(): void {
    // TODO: SettingsScene 구현 후 연결
    console.info('[MainMenuScene] 설정 화면 (미구현)');
  }

  private _onCredits(): void {
    this._showCreditsOverlay();
  }

  // ── 인트로 애니메이션 ────────────────────────────────────

  private _playIntroAnimation(): void {
    // 타이틀 페이드 인
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      y: this.titleText.y - 10,
      duration: 800,
      ease: 'Power2',
    });

    // 서브타이틀 딜레이 페이드 인
    this.tweens.add({
      targets: this.subtitleText,
      alpha: 1,
      duration: 600,
      delay: 400,
      ease: 'Power2',
    });

    // 메뉴 항목 순차 페이드 인
    this.menuItems.forEach((btn, i) => {
      this.tweens.add({
        targets: btn,
        alpha: 1,
        duration: 500,
        delay: 800 + i * 150,
        ease: 'Power2',
      });
    });
  }

  // ── 배경 ─────────────────────────────────────────────────

  private _drawGradientBg(w: number, h: number): void {
    const gfx = this.add.graphics();
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(BG_COLOR_TOP),
        Phaser.Display.Color.IntegerToColor(BG_COLOR_BOTTOM),
        steps,
        i,
      );
      gfx.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      gfx.fillRect(0, ratio * h, w, h / steps + 1);
    }
  }

  /** 배경 에테르 빛 입자 (간단한 사각형 트윈) */
  private _spawnAetherParticles(w: number, h: number): void {
    this.particleTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, w);
        const y = Phaser.Math.Between(0, h);
        const size = Phaser.Math.Between(1, 3);
        const dot = this.add.rectangle(x, y, size, size, 0xaaaaff, 0.3);
        this.tweens.add({
          targets: dot,
          alpha: 0,
          y: y - 40,
          duration: 2000,
          ease: 'Power1',
          onComplete: () => dot.destroy(),
        });
      },
    });
  }

  // ── 크레딧 오버레이 ──────────────────────────────────────

  private _showCreditsOverlay(): void {
    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    const container = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.9)
      .setStrokeStyle(1, 0x6644aa);
    container.add(bg);

    const credits = [
      '— 에테르나 크로니클 —',
      '',
      '기획·개발: Crisious',
      '엔진: Phaser 3',
      '서버: Fastify + Prisma',
      '',
      '[ 닫기 ]',
    ];

    credits.forEach((line, i) => {
      const isClose = line === '[ 닫기 ]';
      const txt = this.add.text(0, -100 + i * 28, line, {
        fontSize: isClose ? '16px' : '14px',
        color: isClose ? '#88ff88' : '#cccccc',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      if (isClose) {
        txt.setInteractive({ useHandCursor: true });
        txt.on('pointerdown', () => container.destroy());
      }

      container.add(txt);
    });
  }

  // ── 정리 ─────────────────────────────────────────────────

  shutdown(): void {
    this.particleTimer?.destroy();
    this.menuItems = [];
  }
}
