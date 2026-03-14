/**
 * DeathReviveSystem — P26-14: 사망/부활 시스템
 *
 * 기능:
 * - 사망 감지 (HP <= 0)
 * - 사망 시 페널티 (EXP 감소)
 * - 부활 위치 선택 UI
 * - 부활 후 무적 시간
 * - NetworkManager 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';
import { GameHUD } from '../ui/GameHUD';

// ── 타입 ──────────────────────────────────────────────────────

export interface DeathPenalty {
  expLost: number;
  expLostPercent: number;
  goldLost: number;
}

export interface ReviveOption {
  id: string;
  label: string;
  description: string;
  cost: number; // 0 = free
  location: string;
  cooldownMs: number;
}

export type DeathCallback = (penalty: DeathPenalty) => void;
export type ReviveCallback = (option: ReviveOption) => void;

// ── 기본 부활 옵션 ──────────────────────────────────────────

const DEFAULT_REVIVE_OPTIONS: ReviveOption[] = [
  {
    id: 'town',
    label: '🏘️ 마을 부활',
    description: '가장 가까운 마을에서 부활합니다.',
    cost: 0,
    location: 'nearest_town',
    cooldownMs: 0,
  },
  {
    id: 'spot',
    label: '📍 현장 부활',
    description: '사망 지점에서 부활합니다. 골드가 필요합니다.',
    cost: 500,
    location: 'death_spot',
    cooldownMs: 30000,
  },
  {
    id: 'safe',
    label: '🏰 안전 지대',
    description: '존의 안전 지대에서 부활합니다.',
    cost: 0,
    location: 'safe_zone',
    cooldownMs: 10000,
  },
];

// EXP 페널티: 현재 EXP의 5%
const EXP_PENALTY_RATE = 0.05;

// ── 메인 클래스 ───────────────────────────────────────────────

export class DeathReviveSystem {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private hud: GameHUD;
  private characterId = '';

  // 상태
  private isDead = false;
  private invincibleUntil = 0; // 부활 후 무적 시간 (ms timestamp)

  // UI
  private deathOverlay: Phaser.GameObjects.Container | null = null;
  private reviveUI: Phaser.GameObjects.Container | null = null;

  // 콜백
  private onDeath?: DeathCallback;
  private onRevive?: ReviveCallback;

  constructor(scene: Phaser.Scene, net: NetworkManager, hud: GameHUD) {
    this.scene = scene;
    this.net = net;
    this.hud = hud;
    this._bindEvents();
  }

  init(characterId: string): void {
    this.characterId = characterId;
  }

  setOnDeath(cb: DeathCallback): void { this.onDeath = cb; }
  setOnRevive(cb: ReviveCallback): void { this.onRevive = cb; }

  // ── 사망 처리 ────────────────────────────────────────────

  async triggerDeath(): Promise<void> {
    if (this.isDead) return;
    this.isDead = true;

    // 서버에 사망 알림 → 페널티 계산
    let penalty: DeathPenalty;
    try {
      penalty = await this.net.post<DeathPenalty>('/api/characters/death', {
        characterId: this.characterId,
      });
    } catch {
      // fallback 로컬 계산
      penalty = {
        expLost: 50,
        expLostPercent: EXP_PENALTY_RATE * 100,
        goldLost: 0,
      };
    }

    this.onDeath?.(penalty);
    this._showDeathScreen(penalty);
  }

  // HP 변경 감시 (외부에서 호출)
  checkDeath(currentHp: number): void {
    if (currentHp <= 0 && !this.isDead) {
      this.triggerDeath();
    }
  }

  isPlayerDead(): boolean { return this.isDead; }

  isInvincible(): boolean {
    return Date.now() < this.invincibleUntil;
  }

  // ── 사망 화면 ────────────────────────────────────────────

  private _showDeathScreen(penalty: DeathPenalty): void {
    this._closeDeathOverlay();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.deathOverlay = this.scene.add.container(0, 0).setDepth(990);

    // 풀스크린 어두운 오버레이
    const overlay = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x0a0000, 0)
      .setInteractive();
    this.deathOverlay.add(overlay);

    // 페이드 인
    this.scene.tweens.add({
      targets: overlay,
      fillAlpha: 0.8,
      duration: 1500,
    });

    // 사망 텍스트
    const deathText = this.scene.add.text(cx, cy - 80, '💀 사망', {
      fontSize: '36px', color: '#ff2222', fontStyle: 'bold',
    }).setOrigin(0.5).setAlpha(0);
    this.deathOverlay.add(deathText);

    this.scene.tweens.add({
      targets: deathText,
      alpha: 1,
      duration: 1000,
      delay: 500,
    });

    // 페널티 표시
    const penaltyText = this.scene.add.text(cx, cy - 30, '', {
      fontSize: '14px', color: '#ff6666', align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    let penaltyMsg = '';
    if (penalty.expLost > 0) penaltyMsg += `경험치 -${penalty.expLost} (${penalty.expLostPercent.toFixed(1)}%)\n`;
    if (penalty.goldLost > 0) penaltyMsg += `골드 -${penalty.goldLost}`;
    penaltyText.setText(penaltyMsg || '페널티 없음');
    this.deathOverlay.add(penaltyText);

    this.scene.tweens.add({
      targets: penaltyText,
      alpha: 1,
      duration: 800,
      delay: 1500,
    });

    // 2초 후 부활 옵션 표시
    this.scene.time.delayedCall(2500, () => {
      this._showReviveOptions();
    });
  }

  private _closeDeathOverlay(): void {
    if (this.deathOverlay) { this.deathOverlay.destroy(); this.deathOverlay = null; }
  }

  // ── 부활 옵션 UI ──────────────────────────────────────────

  private _showReviveOptions(): void {
    this._closeReviveUI();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2 + 40;

    this.reviveUI = this.scene.add.container(0, 0).setDepth(995);

    const title = this.scene.add.text(cx, cy - 10, '부활 위치 선택', {
      fontSize: '16px', color: '#aaaacc',
    }).setOrigin(0.5);
    this.reviveUI.add(title);

    DEFAULT_REVIVE_OPTIONS.forEach((option, i) => {
      const y = cy + 30 + i * 50;

      const bg = this.scene.add.rectangle(cx, y, 320, 42, 0x1a1a2e, 0.9)
        .setStrokeStyle(1, 0x3a3a5e)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._selectRevive(option))
        .on('pointerover', () => bg.setStrokeStyle(2, 0x55aaff))
        .on('pointerout', () => bg.setStrokeStyle(1, 0x3a3a5e));
      this.reviveUI!.add(bg);

      const label = this.scene.add.text(cx - 140, y - 8, option.label, {
        fontSize: '14px', color: '#ffffff',
      });
      this.reviveUI!.add(label);

      const desc = this.scene.add.text(cx - 140, y + 8, option.description, {
        fontSize: '10px', color: '#888888',
      });
      this.reviveUI!.add(desc);

      if (option.cost > 0) {
        const cost = this.scene.add.text(cx + 110, y, `${option.cost} G`, {
          fontSize: '12px', color: '#ffcc00',
        }).setOrigin(0.5);
        this.reviveUI!.add(cost);
      } else {
        const free = this.scene.add.text(cx + 110, y, '무료', {
          fontSize: '12px', color: '#55cc55',
        }).setOrigin(0.5);
        this.reviveUI!.add(free);
      }
    });
  }

  private _closeReviveUI(): void {
    if (this.reviveUI) { this.reviveUI.destroy(); this.reviveUI = null; }
  }

  // ── 부활 실행 ────────────────────────────────────────────

  private async _selectRevive(option: ReviveOption): Promise<void> {
    try {
      await this.net.post('/api/characters/revive', {
        characterId: this.characterId,
        reviveType: option.id,
      });

      this.isDead = false;
      this.invincibleUntil = Date.now() + 5000; // 5초 무적

      this._closeReviveUI();
      this._closeDeathOverlay();

      // HUD 갱신
      await this.hud.refreshCharacter();

      // 부활 이펙트
      this._showReviveEffect();

      this.onRevive?.(option);
    } catch (e) {
      console.error('[DeathRevive] revive failed', e);
    }
  }

  private _showReviveEffect(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    const flash = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0xffffff, 0.8)
      .setDepth(999);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 1000,
      onComplete: () => flash.destroy(),
    });

    const text = this.scene.add.text(cx, cy, '✨ 부활!', {
      fontSize: '24px', color: '#55ff55', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: text,
      y: cy - 60,
      alpha: 0,
      duration: 2000,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }

  // ── 이벤트 바인딩 ─────────────────────────────────────────

  private _bindEvents(): void {
    this.net.on('combat:result', (_raw: unknown) => {
      // 전투 결과 수신 — 사망 판정은 checkDeath(hp)로 처리
    });
  }

  destroy(): void {
    this._closeDeathOverlay();
    this._closeReviveUI();
  }
}
