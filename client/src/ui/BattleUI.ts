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

const SKILL_BAR_Y = 960;          // Below status panel, inside UI panel (y 920~1080)
const SKILL_SLOT_SIZE = 56;
const SKILL_GAP = 6;
const SKILL_COUNT = 6;

/** 속성별 슬롯 테두리 색상 */
const ELEMENT_COLORS: Record<string, number> = {
  aether: 0x66aaff,
  light: 0xffee66,
  dark: 0xaa66ff,
  neutral: 0x6666aa,
  time: 0x66ffcc,
  lightning: 0xffff44,
  earth: 0x88aa44,
};
const LOG_MAX_LINES = 4;          // Compact: 4 lines max
const LOG_X = 1560;               // Top-right corner
const LOG_Y = 10;

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
  // UX(#11): 중요 이벤트(크리/콤보/사망/승리)를 색상으로 강조하는 1줄 하이라이트(회색 로그에 묻힘 방지).
  private logHighlight?: Phaser.GameObjects.Text;

  // 미니 상태창
  private statusContainer!: Phaser.GameObjects.Container;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private buffContainer!: Phaser.GameObjects.Container;

  // 버튼
  private pauseBtn!: Phaser.GameObjects.Text;
  private fleeBtn!: Phaser.GameObjects.Text;

  // 스킬 툴팁
  private tooltipContainer: Phaser.GameObjects.Container | null = null;

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
    const _totalWidth = SKILL_COUNT * SKILL_SLOT_SIZE + (SKILL_COUNT - 1) * SKILL_GAP;
    const startX = 40; // Bottom-left, below status panel

    for (let i = 0; i < SKILL_COUNT; i++) {
      const x = startX + i * (SKILL_SLOT_SIZE + SKILL_GAP) + SKILL_SLOT_SIZE / 2;
      const y = SKILL_BAR_Y;

      const slot = this.skillSlots[i];
      const elemColor = slot ? (ELEMENT_COLORS[slot.element ?? 'neutral'] ?? 0x6666aa) : 0x6666aa;

      // 슬롯 배경
      const bg = this.scene.add.rectangle(x, y, SKILL_SLOT_SIZE, SKILL_SLOT_SIZE, 0x222244)
        .setStrokeStyle(2, elemColor)
        .setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        // 클릭으로 스킬 사용 — BattleScene에서 처리
        const battleScene = this.scene as unknown as { _useSkill: (idx: number) => void };
        if (typeof battleScene._useSkill === 'function') {
          battleScene._useSkill(i);
        }
      });
      // 호버 시 전체 이름 표시
      if (slot) {
        bg.on('pointerover', () => {
          this._showTooltip(x, y - SKILL_SLOT_SIZE, slot);
        });
        bg.on('pointerout', () => {
          this._hideTooltip();
        });
      }
      this.slotBgs.push(bg);

      // 스킬 이름 (슬롯 크기에 맞춰 최대 5자)
      const label = slot ? slot.name.slice(0, 5) : '—';
      const txt = this.scene.add.text(x, y - 6, label, {
        fontSize: '11px', color: '#ffffff',
        fontStyle: slot?.mpCost === 0 ? 'italic' : 'bold',
      }).setOrigin(0.5);
      this.slotTexts.push(txt);

      // MP 비용 표시
      if (slot && slot.mpCost > 0) {
        this.scene.add.text(x, y + 12, `${slot.mpCost}`, {
          fontSize: '9px', color: '#6699ff',
        }).setOrigin(0.5).setDepth(110);
      } else if (slot && slot.mpCost === 0) {
        this.scene.add.text(x, y + 12, 'P', {
          fontSize: '9px', color: '#88cc88',
        }).setOrigin(0.5).setDepth(110);
      }

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
    // 배경 — top-right corner, semi-transparent, compact (4 lines)
    this.scene.add.rectangle(LOG_X + 160, LOG_Y + 38, 340, 86, 0x000000, 0.35)
      .setDepth(110);

    // UX(#11): 로그 패널 위 색상 하이라이트(중요 이벤트 1줄). 별도 객체라 회색 로그와 분리.
    this.logHighlight = this.scene.add.text(LOG_X, LOG_Y - 16, '', {
      fontSize: '13px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setDepth(112).setAlpha(0);

    this._makeLogText();
  }

  /** UX(#11): 메시지의 이모지/키워드로 중요 이벤트 색을 추론(평범한 줄은 null = 강조 안 함). */
  private _inferHighlightColor(m: string): string | null {
    if (m.includes('💥') || m.includes('크리') || m.includes('CRIT')) return '#ffd700';   // 크리
    if (m.includes('💀')) return '#ff5555';                                              // 사망
    if (m.includes('🎉') || m.includes('승리')) return '#55ff77';                         // 승리
    if (m.includes('🆙') || m.includes('레벨 업')) return '#55ddff';                       // 레벨업
    if (m.includes('⚡') || m.includes('콤보') || m.includes('🔥') || m.includes('CHAIN')) return '#ff9933'; // 콤보/체인
    return null;
  }

  /** 로그 Text 게임오브젝트 생성(배경 제외) — 파괴 시 재생성용으로 분리 */
  private _makeLogText(): void {
    this.logText = this.scene.add.text(LOG_X, LOG_Y + 4, this.logLines.join('\n'), {
      fontSize: '11px',
      color: '#aaaaaa',
      lineSpacing: 2,
      wordWrap: { width: 320 },
    }).setDepth(111);
  }

  /**
   * logText 가 setText 가능한 상태인지 검사.
   * Phaser Text 는 내부 CanvasTexture 의 Frame.data 가 살아있어야 setText→updateText→
   * Frame.updateUVs(this.data.drawImage) 가 동작한다. 씬 전환/텍스처 정리 등으로 프레임이
   * destroy 되면 data 가 null 이 되어 "Cannot read properties of null (reading 'drawImage')"
   * 크래시가 난다. 이를 사전 차단한다.
   */
  private _isLogTextUsable(): boolean {
    const t = this.logText as unknown as {
      scene?: unknown;
      frame?: { data?: unknown } | null;
    } | undefined;
    return !!(t && t.scene && t.frame && t.frame.data);
  }

  /** 전투 로그에 한 줄 추가 */
  addLog(message: string): void {
    this.logLines.push(message);
    if (this.logLines.length > LOG_MAX_LINES) {
      this.logLines.shift();
    }

    // 프레임/텍스처가 파괴된 경우 재생성해 크래시 방지(전투 로그는 비치명적 UI)
    if (!this._isLogTextUsable()) {
      this._makeLogText();
    }

    try {
      this.logText.setText(this.logLines.join('\n'));
    } catch (err) {
      // 그래도 실패하면 1회 재생성 후 재시도 — 끝내 실패하면 조용히 무시(게임 진행 유지)
      console.warn('[BattleUI] logText.setText 실패 — 재생성 시도:', err);
      try {
        this._makeLogText();
        this.logText.setText(this.logLines.join('\n'));
      } catch { /* 로그 갱신 포기(비치명적) */ }
    }

    // UX(#11): 중요 이벤트면 색상 하이라이트로 강조 + 페이드(회색 로그에 묻히지 않게)
    const hlColor = this._inferHighlightColor(message);
    const hl = this.logHighlight as unknown as { scene?: unknown; frame?: { data?: unknown } | null } | undefined;
    if (hlColor && hl && hl.scene && hl.frame && hl.frame.data) {
      try {
        this.logHighlight!.setText(message).setColor(hlColor).setAlpha(1);
        this.scene.tweens.add({ targets: this.logHighlight, alpha: 0, duration: 1400, delay: 700, ease: 'Sine.easeIn' });
      } catch { /* 하이라이트 갱신 포기(비치명적) */ }
    }
  }

  // ─── 미니 상태창 ─────────────────────────────────────────────

  private _createStatusPanel(): void {
    // 미니 상태창 숨김 — BattleScene 하단 패널의 상태 패널이 메인
    this.statusContainer = this.scene.add.container(-999, -999);
    this.hpText = this.scene.add.text(-999, -999, '');
    this.mpText = this.scene.add.text(-999, -999, '');
    this.buffContainer = this.scene.add.container(-999, -999);
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
    // 일시정지 (battle log 아래)
    this.pauseBtn = this.scene.add.text(LOG_X, LOG_Y + 84, '⏸ 일시정지', {
      fontSize: '10px', color: '#aaaaaa',
      backgroundColor: '#222222', padding: { x: 4, y: 2 },
    }).setDepth(112).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => {
      if (this.scene.scene.isPaused('BattleScene')) {
        this.scene.scene.resume('BattleScene');
        this.pauseBtn.setText('⏸ 일시정지');
      } else {
        this.scene.scene.pause('BattleScene');
        this.pauseBtn.setText('▶ 재개');
      }
    });

    // 도주
    this.fleeBtn = this.scene.add.text(LOG_X + 100, LOG_Y + 84, '🏃 도주', {
      fontSize: '10px', color: '#ff8888',
      backgroundColor: '#222222', padding: { x: 4, y: 2 },
    }).setDepth(112).setInteractive({ useHandCursor: true });
    // UX(#2): 단일 도주 경로로 위임. 이전엔 여기서 50% 고정확률 + scene.start('GameScene') 직행으로
    // BattleScene._attemptFlee(생존자 기반 확률·escapeNarration 로그·_exitBattle 의 combatEnd 서버정리/
    // returnScene 복귀)를 통째로 우회해, 서버 전투가 안 닫히고 던전 등으로 복귀 못 하는 버그였다.
    this.fleeBtn.on('pointerdown', () => {
      (this.scene as unknown as { _attemptFlee?: () => void })._attemptFlee?.();
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

  // ─── 스킬 툴팁 ──────────────────────────────────────────────

  private _showTooltip(x: number, y: number, slot: SkillSlot): void {
    this._hideTooltip();
    const lines: string[] = [slot.name];
    if (slot.damage > 0) lines.push(`DMG ${slot.damage} (×${slot.damageScale ?? 1})`);
    if (slot.mpCost > 0) lines.push(`MP ${slot.mpCost}  CD ${slot.cooldown}s`);
    else lines.push('패시브');

    const bg = this.scene.add.rectangle(0, 0, 120, lines.length * 16 + 8, 0x111133, 0.9)
      .setStrokeStyle(1, 0x6666aa).setOrigin(0.5);
    const txt = this.scene.add.text(0, 0, lines.join('\n'), {
      fontSize: '10px', color: '#ffffff', align: 'center', lineSpacing: 2,
    }).setOrigin(0.5);

    this.tooltipContainer = this.scene.add.container(x, y - 10, [bg, txt]).setDepth(200);
  }

  private _hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
  }
}
