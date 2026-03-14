/**
 * P28-04: 씬 전환 애니메이션 모듈
 * P28-05: VFX 이펙트 연결
 *
 * - 페이드 인/아웃, 슬라이드, 와이프, 디졸브 전환
 * - 로딩 씬 전환 인디케이터
 * - UI 팝업 애니메이션 (슬라이드/페이드/스케일)
 * - 전투 VFX: 히트/스킬/크리티컬/레벨업/강화/환경 파티클
 */

import * as Phaser from 'phaser';

// ─── 전환 타입 ──────────────────────────────────────────────────

export type TransitionType = 'fade' | 'slide_left' | 'slide_right' | 'slide_up' | 'wipe' | 'dissolve';

export interface TransitionConfig {
  type: TransitionType;
  durationMs: number;
  color?: number;       // fade 색상 (기본: 0x000000)
  easing?: string;      // Phaser 이징 함수명 (기본: 'Cubic.easeInOut')
}

const DEFAULT_TRANSITION: TransitionConfig = {
  type: 'fade',
  durationMs: 600,
  color: 0x000000,
  easing: 'Cubic.easeInOut',
};

// ─── SceneTransitionManager ──────────────────────────────────

export class SceneTransitionManager {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isTransitioning = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 페이드 아웃 (현재 씬 위에 오버레이)
   */
  async fadeOut(config: Partial<TransitionConfig> = {}): Promise<void> {
    const cfg = { ...DEFAULT_TRANSITION, ...config };
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const { width, height } = this.scene.cameras.main;
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, cfg.color, 0)
      .setDepth(9999)
      .setScrollFactor(0);

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 1,
        duration: cfg.durationMs,
        ease: cfg.easing,
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * 페이드 인 (오버레이 제거)
   */
  async fadeIn(config: Partial<TransitionConfig> = {}): Promise<void> {
    const cfg = { ...DEFAULT_TRANSITION, ...config };

    const { width, height } = this.scene.cameras.main;
    if (!this.overlay) {
      this.overlay = this.scene.add.rectangle(width / 2, height / 2, width, height, cfg.color, 1)
        .setDepth(9999)
        .setScrollFactor(0);
    }

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: this.overlay,
        alpha: 0,
        duration: cfg.durationMs,
        ease: cfg.easing,
        onComplete: () => {
          this.overlay?.destroy();
          this.overlay = null;
          this.isTransitioning = false;
          resolve();
        },
      });
    });
  }

  /**
   * 슬라이드 전환 (카메라 기반)
   */
  async slideTransition(direction: 'left' | 'right' | 'up' | 'down', durationMs = 500): Promise<void> {
    const cam = this.scene.cameras.main;
    const { width, height } = cam;

    const offsets: Record<string, { x: number; y: number }> = {
      left:  { x: -width, y: 0 },
      right: { x: width,  y: 0 },
      up:    { x: 0,      y: -height },
      down:  { x: 0,      y: height },
    };

    const { x: ox, y: oy } = offsets[direction];

    return new Promise(resolve => {
      this.scene.tweens.add({
        targets: cam,
        scrollX: cam.scrollX + ox,
        scrollY: cam.scrollY + oy,
        duration: durationMs,
        ease: 'Cubic.easeInOut',
        onComplete: () => resolve(),
      });
    });
  }

  /**
   * 로딩 인디케이터 표시
   */
  showLoadingIndicator(): { spinner: Phaser.GameObjects.Arc; text: Phaser.GameObjects.Text; destroy: () => void } {
    const { width, height } = this.scene.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    // 반투명 배경
    const bg = this.scene.add.rectangle(cx, cy, width, height, 0x000000, 0.7)
      .setDepth(9998).setScrollFactor(0);

    // 스피너
    const spinner = this.scene.add.arc(cx, cy - 20, 24, 0, 270, false, 0x00ccff, 1)
      .setDepth(9999).setScrollFactor(0);

    this.scene.tweens.add({
      targets: spinner,
      angle: 360,
      duration: 1000,
      repeat: -1,
      ease: 'Linear',
    });

    // 텍스트
    const text = this.scene.add.text(cx, cy + 30, '불러오는 중...', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'NanumGothic, sans-serif',
    }).setOrigin(0.5).setDepth(9999).setScrollFactor(0);

    // 점 애니메이션
    let dots = 0;
    const dotTimer = this.scene.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        dots = (dots + 1) % 4;
        text.setText('불러오는 중' + '.'.repeat(dots));
      },
    });

    return {
      spinner,
      text,
      destroy: () => {
        dotTimer.destroy();
        bg.destroy();
        spinner.destroy();
        text.destroy();
      },
    };
  }
}

// ─── UI 팝업 애니메이션 ──────────────────────────────────────────

export type PopupAnimation = 'fade_in' | 'slide_up' | 'scale_bounce' | 'slide_right';

export interface PopupAnimConfig {
  type: PopupAnimation;
  durationMs: number;
  delay?: number;
}

/**
 * UI 팝업에 등장 애니메이션 적용
 */
export function animatePopupIn(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { x: number; y: number; alpha: number; scaleX: number; scaleY: number },
  config: PopupAnimConfig = { type: 'fade_in', durationMs: 300 },
): void {
  const { type, durationMs, delay = 0 } = config;

  switch (type) {
    case 'fade_in':
      target.alpha = 0;
      scene.tweens.add({ targets: target, alpha: 1, duration: durationMs, delay, ease: 'Cubic.easeOut' });
      break;

    case 'slide_up': {
      const origY = target.y;
      target.y += 40;
      target.alpha = 0;
      scene.tweens.add({ targets: target, y: origY, alpha: 1, duration: durationMs, delay, ease: 'Back.easeOut' });
      break;
    }

    case 'scale_bounce':
      target.scaleX = 0;
      target.scaleY = 0;
      scene.tweens.add({ targets: target, scaleX: 1, scaleY: 1, duration: durationMs, delay, ease: 'Back.easeOut' });
      break;

    case 'slide_right': {
      const origX = target.x;
      target.x -= 60;
      target.alpha = 0;
      scene.tweens.add({ targets: target, x: origX, alpha: 1, duration: durationMs, delay, ease: 'Cubic.easeOut' });
      break;
    }
  }
}

/**
 * UI 팝업 퇴장 애니메이션
 */
export function animatePopupOut(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.GameObject & { alpha: number; scaleX: number; scaleY: number },
  durationMs = 200,
): Promise<void> {
  return new Promise(resolve => {
    scene.tweens.add({
      targets: target,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: durationMs,
      ease: 'Cubic.easeIn',
      onComplete: () => resolve(),
    });
  });
}

// ─── VFX 이펙트 (P28-05) ────────────────────────────────────────

export type VfxType =
  | 'hit_slash' | 'hit_blunt' | 'hit_magic' | 'hit_critical'
  | 'skill_fire' | 'skill_ice' | 'skill_lightning' | 'skill_shadow' | 'skill_heal'
  | 'levelup' | 'enhance_success' | 'enhance_fail'
  | 'particle_rain' | 'particle_snow' | 'particle_ether_beam'
  | 'death_dissolve' | 'revive_glow';

export interface VfxConfig {
  atlasKey: string;
  framePrefix: string;
  frameCount: number;
  frameRate: number;
  scale: number;
  /** 재생 후 자동 파괴 */
  autoDestroy: boolean;
}

export const VFX_CONFIGS: Record<VfxType, VfxConfig> = {
  hit_slash:        { atlasKey: 'vfx_atlas', framePrefix: 'hit_slash_',      frameCount: 6,  frameRate: 24, scale: 1.0, autoDestroy: true },
  hit_blunt:        { atlasKey: 'vfx_atlas', framePrefix: 'hit_blunt_',      frameCount: 5,  frameRate: 20, scale: 1.0, autoDestroy: true },
  hit_magic:        { atlasKey: 'vfx_atlas', framePrefix: 'hit_magic_',      frameCount: 8,  frameRate: 24, scale: 1.2, autoDestroy: true },
  hit_critical:     { atlasKey: 'vfx_atlas', framePrefix: 'hit_crit_',       frameCount: 10, frameRate: 30, scale: 1.5, autoDestroy: true },
  skill_fire:       { atlasKey: 'vfx_atlas', framePrefix: 'skill_fire_',     frameCount: 12, frameRate: 24, scale: 1.3, autoDestroy: true },
  skill_ice:        { atlasKey: 'vfx_atlas', framePrefix: 'skill_ice_',      frameCount: 10, frameRate: 20, scale: 1.2, autoDestroy: true },
  skill_lightning:  { atlasKey: 'vfx_atlas', framePrefix: 'skill_lightning_', frameCount: 8,  frameRate: 30, scale: 1.4, autoDestroy: true },
  skill_shadow:     { atlasKey: 'vfx_atlas', framePrefix: 'skill_shadow_',   frameCount: 10, frameRate: 24, scale: 1.3, autoDestroy: true },
  skill_heal:       { atlasKey: 'vfx_atlas', framePrefix: 'skill_heal_',     frameCount: 12, frameRate: 20, scale: 1.0, autoDestroy: true },
  levelup:          { atlasKey: 'vfx_atlas', framePrefix: 'levelup_',        frameCount: 16, frameRate: 20, scale: 2.0, autoDestroy: true },
  enhance_success:  { atlasKey: 'vfx_atlas', framePrefix: 'enhance_ok_',     frameCount: 12, frameRate: 24, scale: 1.5, autoDestroy: true },
  enhance_fail:     { atlasKey: 'vfx_atlas', framePrefix: 'enhance_fail_',   frameCount: 8,  frameRate: 20, scale: 1.0, autoDestroy: true },
  particle_rain:    { atlasKey: 'vfx_atlas', framePrefix: 'rain_',           frameCount: 4,  frameRate: 12, scale: 1.0, autoDestroy: false },
  particle_snow:    { atlasKey: 'vfx_atlas', framePrefix: 'snow_',           frameCount: 4,  frameRate: 10, scale: 1.0, autoDestroy: false },
  particle_ether_beam: { atlasKey: 'vfx_atlas', framePrefix: 'ether_beam_', frameCount: 8,  frameRate: 16, scale: 1.5, autoDestroy: false },
  death_dissolve:   { atlasKey: 'vfx_atlas', framePrefix: 'dissolve_',       frameCount: 12, frameRate: 18, scale: 1.0, autoDestroy: true },
  revive_glow:      { atlasKey: 'vfx_atlas', framePrefix: 'revive_',         frameCount: 14, frameRate: 20, scale: 1.2, autoDestroy: true },
};

/**
 * VFX 재생 유틸
 */
export class VfxPlayer {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * 지정 위치에 VFX 재생
   */
  play(type: VfxType, x: number, y: number, options?: { scale?: number; tint?: number }): Phaser.GameObjects.Sprite | null {
    const config = VFX_CONFIGS[type];
    if (!config) return null;

    const animKey = `vfx_${type}`;

    // 애니메이션이 없으면 생성
    if (!this.scene.anims.exists(animKey)) {
      const frames = this.scene.anims.generateFrameNames(config.atlasKey, {
        prefix: config.framePrefix,
        start: 0,
        end: config.frameCount - 1,
        zeroPad: 2,
      });

      // 프레임이 없으면 fallback (프로시저럴 원 이펙트)
      if (frames.length === 0) {
        return this.playFallback(type, x, y, options);
      }

      this.scene.anims.create({
        key: animKey,
        frames,
        frameRate: config.frameRate,
        repeat: config.autoDestroy ? 0 : -1,
      });
    }

    const sprite = this.scene.add.sprite(x, y, config.atlasKey)
      .setScale(options?.scale ?? config.scale)
      .setDepth(8000);

    if (options?.tint) sprite.setTint(options.tint);

    sprite.play(animKey);

    if (config.autoDestroy) {
      sprite.once('animationcomplete', () => sprite.destroy());
    }

    return sprite;
  }

  /**
   * 아틀라스 프레임 없을 때 프로시저럴 이펙트
   */
  private playFallback(type: VfxType, x: number, y: number, options?: { scale?: number; tint?: number }): Phaser.GameObjects.Sprite | null {
    const colorMap: Partial<Record<VfxType, number>> = {
      hit_slash: 0xff4444, hit_blunt: 0xffaa00, hit_magic: 0x44aaff,
      hit_critical: 0xffff00, skill_fire: 0xff6600, skill_ice: 0x66ccff,
      skill_lightning: 0xffff44, skill_shadow: 0x8844aa, skill_heal: 0x44ff44,
      levelup: 0xffdd00, enhance_success: 0x00ff88, enhance_fail: 0xff0000,
    };

    const color = options?.tint ?? colorMap[type] ?? 0xffffff;
    const size = Math.round(32 * (options?.scale ?? 1));

    const circle = this.scene.add.circle(x, y, size / 2, color, 0.8).setDepth(8000);

    this.scene.tweens.add({
      targets: circle,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => circle.destroy(),
    });

    return null;
  }

  /**
   * 환경 파티클 이미터 생성 (비/눈/에테르 광선)
   */
  createEnvironmentParticles(type: 'rain' | 'snow' | 'ether_beam'): Phaser.GameObjects.Particles.ParticleEmitter | null {
    const { width, height } = this.scene.cameras.main;

    // generateTexture fallback
    const texKey = `particle_${type}`;
    if (!this.scene.textures.exists(texKey)) {
      const gfx = this.scene.add.graphics();
      switch (type) {
        case 'rain':
          gfx.fillStyle(0x6688cc, 0.6);
          gfx.fillRect(0, 0, 2, 10);
          break;
        case 'snow':
          gfx.fillStyle(0xffffff, 0.8);
          gfx.fillCircle(3, 3, 3);
          break;
        case 'ether_beam':
          gfx.fillStyle(0x00ccff, 0.5);
          gfx.fillRect(0, 0, 3, 16);
          break;
      }
      gfx.generateTexture(texKey, type === 'rain' ? 2 : 6, type === 'ether_beam' ? 16 : 10);
      gfx.destroy();
    }

    const emitter = this.scene.add.particles(0, 0, texKey, {
      x: { min: 0, max: width },
      y: -10,
      lifespan: type === 'snow' ? 5000 : 2000,
      speedY: type === 'snow' ? { min: 30, max: 80 } : { min: 200, max: 400 },
      speedX: type === 'rain' ? { min: -20, max: -60 } : { min: -10, max: 10 },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 0.8, end: 0 },
      quantity: type === 'ether_beam' ? 2 : (type === 'rain' ? 8 : 3),
      frequency: type === 'rain' ? 30 : (type === 'snow' ? 100 : 200),
    });

    emitter.setDepth(7000).setScrollFactor(0);
    return emitter;
  }
}
