/**
 * BattleUI.ts — 전투 씬 HUD 오버레이 (P5-05)
 *
 * - 스킬 슬롯 바 (하단 6칸) + 쿨다운 오버레이
 * - 미니 상태창 (HP/MP/버프 아이콘)
 * - 전투 로그 (최근 5줄)
 * - 일시정지 / 도주 버튼
 */

import * as Phaser from 'phaser';
import { SkillSlot } from '../combat/CombatManager';

// ─── 상수 ──────────────────────────────────────────────────────

const SKILL_BAR_Y = 660;
const SKILL_SLOT_SIZE = 52;
const SKILL_GAP = 8;
const SKILL_COUNT = 6;
const LOG_MAX_LINES = 5;
const LOG_X = 20;
const LOG_Y = 520;

// ─── BattleUI ──────────────────────────────────────────────────

export class BattleUI {
  private scene: Phaser.Scene;

  // 스킬 슬롯 UI
  private slotBgs: Phaser.GameObjects.Rectangle[] = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private cooldownOverlays: Phaser.GameObjects.Rectangle[] = [];
  private slotKeyLabels: Phaser.GameObjects.Text[] = [];
  private skillSlots: SkillSlot[];

  // 전투 로그
  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;

  // 미니 상태창
  private statusContainer!: Phaser.GameObjects.Container;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private buffContainer!: Phaser.GameObjects.Container;

  // 버튼
  private pauseBtn!: Phaser.GameObjects.Text;
  private fleeBtn!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, skillSlots: SkillSlot[]) {
    this.scene = scene;
    this.skillSlots = skillSlots;

    this._createSkillBar();
    this._createLogPanel();
    this._createStatusPanel();
    this._createButtons();
  }

  // ─── 스킬 바 생성 ─────────────────────────────────────────────

  private _createSkillBar(): void {
    const totalWidth = SKILL_COUNT * SKILL_SLOT_SIZE + (SKILL_COUNT - 1) * SKILL_GAP;
    const startX = (1280 - totalWidth) / 2;

    for (let i = 0; i < SKILL_COUNT; i++) {
      const x = startX + i * (SKILL_SLOT_SIZE + SKILL_GAP) + SKILL_SLOT_SIZE / 2;
      const y = SKILL_BAR_Y;

      // 슬롯 배경
      const bg = this.scene.add.rectangle(x, y, SKILL_SLOT_SIZE, SKILL_SLOT_SIZE, 0x222244)
        .setStrokeStyle(1, 0x6666aa)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        // 클릭으로 스킬 사용 — BattleScene에서 처리
        const battleScene = this.scene as unknown as { _useSkill: (idx: number) => void };
        if (typeof battleScene._useSkill === 'function') {
          battleScene._useSkill(i);
        }
      });
      this.slotBgs.push(bg);

      // 스킬 이름
      const slot = this.skillSlots[i];
      const label = slot ? slot.name.slice(0, 4) : '—';
      const txt = this.scene.add.text(x, y, label, {
        fontSize: '12px', color: '#ffffff',
      }).setOrigin(0.5);
      this.slotTexts.push(txt);

      // 쿨다운 오버레이 (반투명 검정)
      const overlay = this.scene.add.rectangle(x, y, SKILL_SLOT_SIZE, SKILL_SLOT_SIZE, 0x000000, 0)
        .setDepth(1);
      this.cooldownOverlays.push(overlay);

      // 단축키 라벨
      const keyLabel = this.scene.add.text(x - SKILL_SLOT_SIZE / 2 + 4, y - SKILL_SLOT_SIZE / 2 + 2,
        `${i + 1}`, {
          fontSize: '9px', color: '#aaaaaa',
        });
      this.slotKeyLabels.push(keyLabel);
    }
  }

  // ─── 전투 로그 ────────────────────────────────────────────────

  private _createLogPanel(): void {
    // 배경
    this.scene.add.rectangle(LOG_X + 150, LOG_Y + 40, 320, 100, 0x000000, 0.5);

    this.logText = this.scene.add.text(LOG_X, LOG_Y, '', {
      fontSize: '12px',
      color: '#cccccc',
      lineSpacing: 4,
      wordWrap: { width: 300 },
    });
  }

  /** 전투 로그에 한 줄 추가 */
  addLog(message: string): void {
    this.logLines.push(message);
    if (this.logLines.length > LOG_MAX_LINES) {
      this.logLines.shift();
    }
    this.logText.setText(this.logLines.join('\n'));
  }

  // ─── 미니 상태창 ─────────────────────────────────────────────

  private _createStatusPanel(): void {
    this.statusContainer = this.scene.add.container(20, 20);

    const bg = this.scene.add.rectangle(100, 30, 220, 70, 0x000000, 0.6)
      .setStrokeStyle(1, 0x555555);
    this.statusContainer.add(bg);

    this.hpText = this.scene.add.text(14, 10, 'HP: --/--', {
      fontSize: '14px', color: '#44ff44',
    });
    this.statusContainer.add(this.hpText);

    this.mpText = this.scene.add.text(14, 30, 'MP: --/--', {
      fontSize: '14px', color: '#4488ff',
    });
    this.statusContainer.add(this.mpText);

    // 버프 아이콘 컨테이너
    this.buffContainer = this.scene.add.container(14, 52);
    this.statusContainer.add(this.buffContainer);
  }

  /** HP/MP 값 갱신 (외부 호출용) */
  updateStatus(hp: number, maxHp: number, mp: number, maxMp: number): void {
    this.hpText.setText(`HP: ${hp}/${maxHp}`);
    this.mpText.setText(`MP: ${mp}/${maxMp}`);
  }

  /** 버프 아이콘 갱신 */
  updateBuffs(buffs: Array<{ icon: string; remaining: number }>): void {
    this.buffContainer.removeAll(true);
    buffs.forEach((buff, i) => {
      const txt = this.scene.add.text(i * 24, 0, buff.icon, {
        fontSize: '16px',
      });
      this.buffContainer.add(txt);
    });
  }

  // ─── 버튼 ────────────────────────────────────────────────────

  private _createButtons(): void {
    // 일시정지
    this.pauseBtn = this.scene.add.text(1200, 20, '⏸ 일시정지', {
      fontSize: '13px', color: '#aaaaaa',
      backgroundColor: '#333333', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => {
      // 토글 pause (간단 구현)
      if (this.scene.scene.isPaused('BattleScene')) {
        this.scene.scene.resume('BattleScene');
        this.pauseBtn.setText('⏸ 일시정지');
      } else {
        this.scene.scene.pause('BattleScene');
        this.pauseBtn.setText('▶ 재개');
      }
    });

    // 도주
    this.fleeBtn = this.scene.add.text(1200, 50, '🏃 도주', {
      fontSize: '13px', color: '#ff8888',
      backgroundColor: '#333333', padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    this.fleeBtn.on('pointerdown', () => {
      this.addLog('🏃 도주 시도...');
      // 50% 확률 도주
      if (Math.random() < 0.5) {
        this.addLog('✅ 도주 성공!');
        this.scene.time.delayedCall(500, () => {
          this.scene.scene.start('GameScene');
        });
      } else {
        this.addLog('❌ 도주 실패!');
      }
    });
  }

  // ─── 스킬 쿨다운 표시 ────────────────────────────────────────

  /** 스킬 사용 시 호출 — 쿨다운 오버레이 활성화 */
  onSkillUsed(slotIndex: number, cooldownSec: number): void {
    if (slotIndex < 0 || slotIndex >= SKILL_COUNT) return;
    const overlay = this.cooldownOverlays[slotIndex];
    overlay.setAlpha(0.6);

    // 쿨다운 종료 시 오버레이 제거
    this.scene.time.delayedCall(cooldownSec * 1000, () => {
      overlay.setAlpha(0);
    });
  }

  // ─── 프레임 업데이트 ─────────────────────────────────────────

  update(_delta: number): void {
    // 쿨다운 오버레이 알파 보간 (매 프레임)
    for (let i = 0; i < SKILL_COUNT; i++) {
      const slot = this.skillSlots[i];
      if (!slot) continue;
      const overlay = this.cooldownOverlays[i];
      if (slot.currentCooldown > 0) {
        const ratio = slot.currentCooldown / slot.cooldown;
        overlay.setAlpha(ratio * 0.6);
      } else {
        overlay.setAlpha(0);
      }
    }
  }
}
