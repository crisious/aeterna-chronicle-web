/**
 * CombatEffectManager — 전투 이펙트 연출 (P10-08)
 *
 * GameScene에서 분리된 전투 이펙트 오케스트레이션 서비스.
 * Phaser 이벤트 → EffectManager 스폰을 중개한다.
 * 디버그 모드 이펙트 트리거도 이 서비스가 담당한다.
 */

import * as Phaser from 'phaser';
import { EffectManager, HitEffectType } from '../effects/EffectManager';

// ── 타입 정의 ─────────────────────────────────────────────────

export interface DamageEvent {
  x: number;
  y: number;
  damage: number;
  isCritical: boolean;
}

export interface HitEvent {
  x: number;
  y: number;
  type: HitEffectType;
}

export interface BuffEvent {
  x: number;
  y: number;
  buffId: string;
}

// ── CombatEffectManager ───────────────────────────────────────

export class CombatEffectManager {
  private effectManager!: EffectManager;

  constructor(private readonly scene: Phaser.Scene) {}

  /**
   * 초기화 — Scene.create() 이후 호출
   * EffectManager 생성 + 이벤트 리스너 바인딩
   */
  init(): void {
    this.effectManager = new EffectManager(this.scene);
    this.bindCombatEvents();
  }

  /**
   * 매 프레임 업데이트 — EffectManager 위임
   */
  update(delta: number): void {
    this.effectManager.update(delta);
  }

  /**
   * EffectManager 풀 통계 조회
   */
  getStats(): ReturnType<EffectManager['getStats']> {
    return this.effectManager.getStats();
  }

  /**
   * 디버그 테스트 이펙트 발동 (SPACE 키)
   */
  setupDebugTrigger(getPlayerPosition: () => { x: number; y: number }): void {
    this.scene.input.keyboard!.on('keydown-SPACE', () => {
      const { x: px, y: py } = getPlayerPosition();
      const testDamage = Math.floor(Math.random() * 500) + 100;
      const isCrit = Math.random() < 0.3;
      const hitTypes: HitEffectType[] = ['slash', 'blunt', 'magic'];
      const hitType = hitTypes[Math.floor(Math.random() * hitTypes.length)];

      this.effectManager.spawnDamageText(
        px + (Math.random() - 0.5) * 40,
        py - 40,
        testDamage,
        isCrit,
      );
      this.effectManager.spawnHitEffect(px, py, hitType);

      console.log(
        `[Combat] 테스트 — ${testDamage}${isCrit ? ' (CRIT!)' : ''} [${hitType}]`,
        this.effectManager.getStats(),
      );
    });
  }

  // ── 내부 ────────────────────────────────────────────────────

  private bindCombatEvents(): void {
    const events = this.scene.events;

    events.on('combat.damage', (data: DamageEvent) => {
      this.effectManager.spawnDamageText(data.x, data.y, data.damage, data.isCritical);
    });

    events.on('combat.hit', (data: HitEvent) => {
      this.effectManager.spawnHitEffect(data.x, data.y, data.type);
    });

    events.on('combat.buff', (data: BuffEvent) => {
      this.effectManager.spawnBuffIcon(data.x, data.y, data.buffId);
    });
  }
}
