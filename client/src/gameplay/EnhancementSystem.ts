/**
 * EnhancementSystem — P26-13: 장비 강화 시스템
 *
 * 기능:
 * - 강화 UI + 재화 소모
 * - 성공/실패 확률 표시
 * - 강화 레벨별 확률 감소
 * - NetworkManager 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager, InventoryItem } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface EnhancementInfo {
  item: InventoryItem;
  currentLevel: number;
  maxLevel: number;
  successRate: number; // 0~1
  goldCost: number;
  materialCost: Array<{ itemId: string; name: string; quantity: number }>;
}

export interface EnhancementResult {
  success: boolean;
  newLevel: number;
  item: InventoryItem;
  message: string;
}

// 강화 확률 테이블 (레벨별)
const ENHANCEMENT_RATES: number[] = [
  1.0,   // +0 → +1: 100%
  0.95,  // +1 → +2: 95%
  0.90,  // +2 → +3: 90%
  0.80,  // +3 → +4: 80%
  0.70,  // +4 → +5: 70%
  0.55,  // +5 → +6: 55%
  0.40,  // +6 → +7: 40%
  0.30,  // +7 → +8: 30%
  0.20,  // +8 → +9: 20%
  0.10,  // +9 → +10: 10%
];

const GOLD_PER_LEVEL = 500; // 레벨당 골드 비용 증가

// ── 메인 클래스 ───────────────────────────────────────────────

export class EnhancementSystem {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private visible = false;
  private characterId = '';

  // 현재 선택된 장비
  private selectedItem: InventoryItem | null = null;
  private enhanceInfo: EnhancementInfo | null = null;

  // UI
  private resultAnim: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
  }

  // ── 공개 API ──────────────────────────────────────────────

  open(characterId: string, item: InventoryItem): void {
    this.characterId = characterId;
    this.selectedItem = item;
    this.visible = true;
    this.container.setVisible(true);

    const currentLevel = (item.stats?.enhanceLevel as number) ?? 0;
    const maxLevel = 10;
    const rate = ENHANCEMENT_RATES[Math.min(currentLevel, maxLevel - 1)];

    this.enhanceInfo = {
      item,
      currentLevel,
      maxLevel,
      successRate: rate,
      goldCost: (currentLevel + 1) * GOLD_PER_LEVEL,
      materialCost: currentLevel >= 5
        ? [{ itemId: 'enhance_stone', name: '강화석', quantity: currentLevel - 4 }]
        : [],
    };

    this._buildUI();
  }

  close(): void {
    this.visible = false;
    this.container.removeAll(true);
    this.container.setVisible(false);
    this._closeResult();
  }

  isOpen(): boolean { return this.visible; }

  // ── 내부: UI ──────────────────────────────────────────────

  private _buildUI(): void {
    this.container.removeAll(true);

    if (!this.enhanceInfo) return;
    const info = this.enhanceInfo;

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const pw = 340;
    const ph = 360;

    // dimmer
    const dimmer = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setInteractive().on('pointerdown', () => this.close());
    this.container.add(dimmer);

    // 패널
    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xffaa00);
    this.container.add(bg);

    let y = cy - ph / 2 + 20;
    const line = (text: string, color = '#e0e0ff', size = '13px') => {
      const t = this.scene.add.text(cx, y, text, { fontSize: size, color }).setOrigin(0.5);
      this.container.add(t);
      y += parseInt(size) + 8;
    };

    line('🔨 장비 강화', '#ffaa00', '18px');
    y += 6;
    line(info.item.name, '#ffffff', '15px');
    line(`현재: +${info.currentLevel}`, '#ccccee');

    if (info.currentLevel >= info.maxLevel) {
      line('✨ 최대 강화 달성!', '#ffcc00', '14px');
      return;
    }

    y += 10;
    line(`성공 확률: ${(info.successRate * 100).toFixed(0)}%`, info.successRate >= 0.5 ? '#55cc55' : '#ff6644', '14px');
    line(`비용: ${info.goldCost.toLocaleString()} G`, '#ffcc00');

    if (info.materialCost.length > 0) {
      info.materialCost.forEach(mat => {
        line(`  ${mat.name} x${mat.quantity}`, '#aaddff', '12px');
      });
    }

    // 확률 바
    y += 10;
    const barW = 200;
    const barH = 16;
    const barBg = this.scene.add.rectangle(cx - barW / 2, y, barW, barH, 0x2a2a4e).setOrigin(0, 0);
    const barFill = this.scene.add.rectangle(cx - barW / 2, y, barW * info.successRate, barH,
      info.successRate >= 0.7 ? 0x55cc55 : (info.successRate >= 0.4 ? 0xffcc00 : 0xff4444)
    ).setOrigin(0, 0);
    const rateLabel = this.scene.add.text(cx, y + barH / 2, `${(info.successRate * 100).toFixed(0)}%`, {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add([barBg, barFill, rateLabel]);
    y += barH + 20;

    // 강화 버튼
    const enhBtn = this.scene.add.text(cx, y, '[ ⚒️ 강화 ]', {
      fontSize: '16px', color: '#ffaa00', backgroundColor: '#2a2a4e',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._doEnhance());
    this.container.add(enhBtn);

    // 닫기
    const closeBtn = this.scene.add.text(cx + pw / 2 - 24, cy - ph / 2 + 8, '✕', {
      fontSize: '18px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  // ── 내부: 강화 실행 ──────────────────────────────────────

  private async _doEnhance(): Promise<void> {
    if (!this.enhanceInfo || !this.selectedItem) return;

    try {
      const result = await this.net.post<EnhancementResult>('/api/enhance', {
        characterId: this.characterId,
        itemId: this.selectedItem.id,
      });

      this._showResult(result);

      if (result.success) {
        this.selectedItem = result.item;
        // 리빌드 UI with updated info
        this.scene.time.delayedCall(2000, () => {
          this.open(this.characterId, this.selectedItem!);
        });
      }
    } catch (e) {
      console.error('[Enhancement] failed', e);
    }
  }

  // ── 내부: 결과 애니메이션 ─────────────────────────────────

  private _showResult(result: EnhancementResult): void {
    this._closeResult();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2 - 40;

    this.resultAnim = this.scene.add.container(0, 0).setDepth(960);

    const bg = this.scene.add.rectangle(cx, cy, 300, 80, result.success ? 0x1a4a1a : 0x4a1a1a, 0.95)
      .setStrokeStyle(2, result.success ? 0x55cc55 : 0xff4444);
    this.resultAnim.add(bg);

    const icon = result.success ? '✨' : '💥';
    const msg = result.success
      ? `강화 성공! +${result.newLevel}`
      : '강화 실패...';
    const color = result.success ? '#55ff55' : '#ff4444';

    const text = this.scene.add.text(cx, cy, `${icon} ${msg}`, {
      fontSize: '18px', color, fontStyle: 'bold',
    }).setOrigin(0.5);
    this.resultAnim.add(text);

    // 파티클 효과 (성공 시)
    if (result.success) {
      for (let i = 0; i < 8; i++) {
        const spark = this.scene.add.circle(cx, cy, 3, 0xffcc00);
        this.resultAnim.add(spark);
        this.scene.tweens.add({
          targets: spark,
          x: cx + Phaser.Math.Between(-100, 100),
          y: cy + Phaser.Math.Between(-80, 80),
          alpha: 0,
          duration: 800,
          delay: i * 50,
        });
      }
    }

    // 2초 후 자동 닫기
    this.scene.time.delayedCall(2000, () => this._closeResult());
  }

  private _closeResult(): void {
    if (this.resultAnim) { this.resultAnim.destroy(); this.resultAnim = null; }
  }

  destroy(): void {
    this._closeResult();
    this.container.destroy();
  }
}
