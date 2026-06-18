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
import { getSpriteResourceForSkillIcon, getSpriteResourceForUiIcon } from '../assets/spriteResourceManifest';
import { getStatusIconResource } from '../data/statusEffectIcons';
import { getItemIconResource } from '../data/itemIconResources';

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
const BATTLE_LOG_HIGHLIGHT_ICON_QA_DELAY_MS = 1700;

const BATTLE_UTILITY_BUTTON_ICON_IDS = {
  pause: 'skill_tg_stop',
  resume: 'skill_mw_arrow',
  flee: 'skill_vw_warp',
} as const;
const BATTLE_UTILITY_BUTTON_RENDERED_ICON_COUNT = 2;

export const BATTLE_LOG_HIGHLIGHT_ICON_IDS = {
  critical: 'skill_ek_explode',
  chain: 'skill_mw_storm',
  echo: 'skill_mw_storm',
  skillHit: 'skill_mw_storm',
  mana: 'skill_mw_passive',
  cooldown: 'skill_tg_stop',
  wait: 'skill_tg_stop',
  reconnect: 'skill_tg_stop',
  autoMode: 'skill_tg_haste',
  atbMode: 'skill_tg_stop',
  telegraph: 'skill_ek_explode',
  victory: 'skill_ek_ultimate',
  level: 'skill_ek_passive',
  start: 'skill_ek_slash',
  escapeSuccess: 'skill_vw_warp',
  escapeFail: 'skill_tg_stop',
  escapeBlocked: 'skill_tg_stop',
  escapeForbidden: 'skill_tg_stop',
  escapeCritical: 'skill_vw_warp',
  dualTech: 'skill_mw_storm',
  tripleTech: 'skill_ek_ultimate',
} as const;
export const BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS = {
  guard: 'shield',
  death: 'curse',
  defeat: 'curse',
} as const;
export const BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS = {
  itemHeal: 'ITM-CON-001',
} as const;
export const BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS = {
  bgmTrack: 'battle_bgm_playing',
  bgmMissing: 'battle_bgm_missing',
} as const;
const BATTLE_LOG_HIGHLIGHT_ICON_SIZE = 16;
type BattleLogHighlightStatusIconKind = keyof typeof BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS;
type BattleLogHighlightItemIconKind = keyof typeof BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS;
type BattleLogHighlightUiIconKind = keyof typeof BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS;
type BattleLogHighlightIconKind =
  | keyof typeof BATTLE_LOG_HIGHLIGHT_ICON_IDS
  | BattleLogHighlightStatusIconKind
  | BattleLogHighlightItemIconKind
  | BattleLogHighlightUiIconKind;

export const BATTLE_UI_FRAME_TEXTURES = {
  skillSlot: {
    key: 'ui_frame_UI-BTN-001-DEF',
    path: 'assets/generated/ui/frames/UI-BTN-001-DEF.png',
    width: 512,
    height: 512,
  },
  logPanel: {
    key: 'ui_frame_UI-HUD-008-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-008-DEF.png',
    width: 512,
    height: 512,
  },
  skillTooltip: {
    key: 'ui_frame_battle_skill_tooltip',
    path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png',
    width: 512,
    height: 512,
  },
  utilityButton: {
    key: 'ui_frame_battle_utility_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
    width: 512,
    height: 512,
  },
} as const;

export function preloadBattleUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(BATTLE_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  for (const iconId of Object.values(BATTLE_UTILITY_BUTTON_ICON_IDS)) {
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (iconResource && !scene.textures.exists(iconResource.key)) {
      scene.load.image(iconResource.key, iconResource.path);
    }
  }
}

// ─── BattleUI ──────────────────────────────────────────────────

export class BattleUI {
  private scene: Phaser.Scene;

  // 스킬 슬롯 UI
  private slotBgs: Array<Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle> = [];
  private slotTexts: Phaser.GameObjects.Text[] = [];
  private cooldownOverlays: Phaser.GameObjects.Rectangle[] = [];
  private slotKeyLabels: Phaser.GameObjects.Text[] = [];
  private skillSlots: SkillSlot[];
  // UX(rank14): 활성 commander 의 현재 MP(내 턴 아니면 null) — BattleScene 이 매프레임 push.
  //   누르기 전에 MP부족/내턴아님 슬롯을 dim 해 '왜 안 되는지'를 선제 표시(쿨다운만 표시하던 비대칭 해소).
  private _availableMp: number | null = null;

  // 전투 로그
  private logLines: string[] = [];
  private logText!: Phaser.GameObjects.Text;
  // UX(#11): 중요 이벤트(크리/콤보/사망/승리)를 색상으로 강조하는 1줄 하이라이트(회색 로그에 묻힘 방지).
  private logHighlight?: Phaser.GameObjects.Text;
  private logHighlightIcon?: Phaser.GameObjects.Image;
  private logHighlightIconFallbackRendered = false;
  private logHighlightIconKind: BattleLogHighlightIconKind | null = null;

  // 미니 상태창
  private statusContainer!: Phaser.GameObjects.Container;
  private hpText!: Phaser.GameObjects.Text;
  private mpText!: Phaser.GameObjects.Text;
  private buffContainer!: Phaser.GameObjects.Container;

  // 버튼
  private pauseBtn!: Phaser.GameObjects.Text;
  private fleeBtn!: Phaser.GameObjects.Text;
  private utilityButtonFrames: Phaser.GameObjects.Image[] = [];
  private utilityButtonIcons: Phaser.GameObjects.Image[] = [];
  private pauseIcon?: Phaser.GameObjects.Image;
  private fleeIcon?: Phaser.GameObjects.Image;

  // 스킬 툴팁
  private tooltipContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, skillSlots: SkillSlot[]) {
    this.scene = scene;
    this.skillSlots = skillSlots;

    this._createSkillBar();
    this._createLogPanel();
    this._createStatusPanel();
    this._createButtons();
    this._startBattleSkillTooltipFrameQaIfNeeded();
    this._startBattleLogHighlightIconQaIfNeeded();
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

      // 슬롯 배경은 Aseprite UI frame을 우선 사용하고, 로드 실패 시 기존 절차 사각형으로 안전 fallback한다.
      const frameTexture = BATTLE_UI_FRAME_TEXTURES.skillSlot;
      const bg = this.scene.textures.exists(frameTexture.key)
        ? this.scene.add.image(x, y, frameTexture.key)
          .setDisplaySize(SKILL_SLOT_SIZE, SKILL_SLOT_SIZE)
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
        : this.scene.add.rectangle(x, y, SKILL_SLOT_SIZE, SKILL_SLOT_SIZE, 0x222244)
          .setStrokeStyle(2, elemColor)
          .setInteractive({ useHandCursor: true });
      if (bg instanceof Phaser.GameObjects.Image) {
        this.scene.add.rectangle(x, y, SKILL_SLOT_SIZE, SKILL_SLOT_SIZE, 0x000000, 0)
          .setStrokeStyle(2, elemColor);
      }
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

      const iconResource = slot?.icon ? getSpriteResourceForSkillIcon(slot.icon) : undefined;
      const hasIcon = Boolean(iconResource && this.scene.textures.exists(iconResource.key));
      if (slot && iconResource && hasIcon) {
        this.scene.add.image(x, y - 7, iconResource.key)
          .setDisplaySize(30, 30)
          .setOrigin(0.5);
      }

      // 스킬 이름 (슬롯 크기에 맞춰 최대 5자)
      const label = slot ? slot.name.slice(0, 5) : '—';
      const txt = this.scene.add.text(x, hasIcon ? y + 18 : y - 6, label, {
        fontSize: hasIcon ? '8px' : '11px', color: '#ffffff',
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
    const logPanelTexture = BATTLE_UI_FRAME_TEXTURES.logPanel;
    const hasLogPanelTexture = this.scene.textures.exists(logPanelTexture.key);

    if (hasLogPanelTexture) {
      // Aseprite 로그 panel frame을 먼저 사용하고, 내부 로그 가독성은 어두운 오버레이로 보정한다.
      this.scene.add.image(LOG_X + 160, LOG_Y + 38, logPanelTexture.key)
        .setName(`battle_ui_log_frame_${logPanelTexture.key}`)
        .setDisplaySize(340, 86)
        .setAlpha(0.88)
        .setDepth(108);
      this.scene.add.rectangle(LOG_X + 160, LOG_Y + 38, 316, 58, 0x020915, 0.42)
        .setDepth(109);
      this.scene.add.rectangle(LOG_X + 160, LOG_Y + 38, 340, 86, 0x000000, 0)
        .setStrokeStyle(1, 0x9bd4ff, 0.65)
        .setDepth(110);
    } else {
      // Aseprite battle log UI frame 로드 실패 시에만 사용하는 안전 fallback.
      this.scene.add.rectangle(LOG_X + 160, LOG_Y + 38, 340, 86, 0x000000, 0.35)
        .setDepth(110);
    }

    this._writeBattleLogFrameQaProbe(logPanelTexture, hasLogPanelTexture);

    // UX(#11): 로그 패널 위 색상 하이라이트(중요 이벤트 1줄). 별도 객체라 회색 로그와 분리.
    this.logHighlight = this.scene.add.text(LOG_X, LOG_Y - 16, '', {
      fontSize: '13px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setDepth(112).setAlpha(0);

    this._makeLogText();
  }

  private _isBattleLogFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return new URLSearchParams(window.location.search).get('battleLogFrameQa') === '1';
    } catch {
      return false;
    }
  }

  private _writeBattleLogFrameQaProbe(
    texture: (typeof BATTLE_UI_FRAME_TEXTURES)['logPanel'],
    hasTexture: boolean,
  ): void {
    if (!this._isBattleLogFrameQaRoute() || typeof document === 'undefined') return;

    document.body.dataset.aeternaBattleLogFrameQa = JSON.stringify({
      status: hasTexture ? 'ready' : 'missing',
      renderedFrameKeys: hasTexture ? [texture.key] : [],
      missingFrameKeys: hasTexture ? [] : [texture.key],
    });
  }

  /** UX(#11): 메시지의 이모지/키워드로 중요 이벤트 색을 추론(평범한 줄은 null = 강조 안 함). */
  private _inferHighlightColor(m: string): string | null {
    if (m.includes('💥') || m.includes('크리') || m.includes('CRIT')) return '#ffd700';   // 크리
    if (m.includes('⚔') || m.includes('전투 시작')) return '#ffd700';                     // 전투 시작
    if (m.includes('💢') || m.includes('강공 준비') || m.includes('강공!')) return '#ff5533'; // 보스 강공 예고/피해
    if (m.includes('💀') || m.includes('쓰러짐')) return '#ff5555';                       // 사망
    if (m.includes('💔') || m.includes('패배')) return '#ff5555';                         // 패배
    if (m.includes('🎉') || m.includes('승리')) return '#55ff77';                         // 승리
    if (m.includes('🆙') || m.includes('레벨 업')) return '#55ddff';                       // 레벨업
    if (m.includes('ECHO')) return '#6fd3ff';                                             // ECHO
    if (m.includes('스킬 발동')) return '#6fd3ff';                                         // 스킬 피해
    if (m.includes('💧') || m.includes('MP 부족')) return '#6699ff';                       // MP 부족
    if (m.includes('🧪') || m.includes('회복')) return '#55ff99';                           // 아이템 회복
    if (m.includes('⏳') || m.includes('쿨다운')) return '#c8a2ff';                         // 쿨다운
    if (m.includes('⏭') || m.includes('대기')) return '#c8a2ff';                            // 턴 대기
    if (m.includes('🔌') || m.includes('재연결됨') || m.includes('전투 재개')) return '#c8a2ff'; // 연결 복구
    if (m.includes('⚙') || m.includes('[AUTO]') || m.includes('자동 전투')) return '#55ddff'; // 자동 전투
    if (m.includes('⏱') || m.includes('ATB 모드')) return '#c8a2ff';                         // ATB 모드
    if (m.includes('🎵') || m.includes('BGM:')) return '#6fd3ff';                             // BGM 재생
    if (m.includes('🔇') || m.includes('BGM 미존재')) return '#ff8888';                        // BGM 누락
    if (m.includes('도주 성공') || m.includes('비상 도주')) return '#55ff77';                  // 도주 성공
    if (m.includes('도주 실패') || m.includes('도주 차단') || m.includes('도주 불가')) return '#ff8888'; // 도주 실패/차단
    if (m.includes('⚡') || m.includes('콤보') || m.includes('🔥') || m.includes('CHAIN')) return '#ff9933'; // 콤보/체인
    if (m.includes('3인 협공') || m.includes('협공')) return '#6fd3ff';                    // 협공
    if (m.includes('방어') || m.includes('반사')) return '#90caf9';                         // 방어/반사
    return null;
  }

  private _inferHighlightIconKind(message: string): BattleLogHighlightIconKind | null {
    if (message.includes('💥') || message.includes('크리') || message.includes('CRIT')) return 'critical';
    if (message.includes('⚔') || message.includes('전투 시작')) return 'start';
    if (message.includes('💢') || message.includes('강공 준비') || message.includes('강공!')) return 'telegraph';
    if (message.includes('💀') || message.includes('쓰러짐')) return 'death';
    if (message.includes('💔') || message.includes('패배')) return 'defeat';
    if (message.includes('🎉') || message.includes('승리')) return 'victory';
    if (message.includes('🆙') || message.includes('레벨 업')) return 'level';
    if (message.includes('ECHO')) return 'echo';
    if (message.includes('스킬 발동')) return 'skillHit';
    if (message.includes('💧') || message.includes('MP 부족')) return 'mana';
    if (message.includes('🧪') || message.includes('회복')) return 'itemHeal';
    if (message.includes('⏳') || message.includes('쿨다운')) return 'cooldown';
    if (message.includes('⏭') || message.includes('대기')) return 'wait';
    if (message.includes('🔌') || message.includes('재연결됨') || message.includes('전투 재개')) return 'reconnect';
    if (message.includes('⚙') || message.includes('[AUTO]') || message.includes('자동 전투')) return 'autoMode';
    if (message.includes('⏱') || message.includes('ATB 모드')) return 'atbMode';
    if (message.includes('🎵') || message.includes('BGM:')) return 'bgmTrack';
    if (message.includes('🔇') || message.includes('BGM 미존재')) return 'bgmMissing';
    if (message.includes('도주 성공')) return 'escapeSuccess';
    if (message.includes('도주 실패')) return 'escapeFail';
    if (message.includes('도주 차단')) return 'escapeBlocked';
    if (message.includes('도주 불가')) return 'escapeForbidden';
    if (message.includes('비상 도주')) return 'escapeCritical';
    if (message.includes('⚡') || message.includes('콤보') || message.includes('🔥') || message.includes('CHAIN')) return 'chain';
    if (message.includes('3인 협공')) return 'tripleTech';
    if (message.includes('협공')) return 'dualTech';
    if (message.includes('방어') || message.includes('반사')) return 'guard';
    return null;
  }

  private _isLogHighlightStatusIconKind(kind: BattleLogHighlightIconKind): kind is BattleLogHighlightStatusIconKind {
    return kind in BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS;
  }

  private _isLogHighlightItemIconKind(kind: BattleLogHighlightIconKind): kind is BattleLogHighlightItemIconKind {
    return kind in BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS;
  }

  private _isLogHighlightUiIconKind(kind: BattleLogHighlightIconKind): kind is BattleLogHighlightUiIconKind {
    return kind in BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS;
  }

  private _getLogHighlightIconResource(kind: BattleLogHighlightIconKind) {
    if (this._isLogHighlightStatusIconKind(kind)) {
      return getStatusIconResource(BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS[kind]);
    }

    if (this._isLogHighlightItemIconKind(kind)) {
      return getItemIconResource({ itemIconId: BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS[kind] });
    }

    if (this._isLogHighlightUiIconKind(kind)) {
      return getSpriteResourceForUiIcon(BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS[kind]);
    }

    return getSpriteResourceForSkillIcon(BATTLE_LOG_HIGHLIGHT_ICON_IDS[kind]);
  }

  private _addLogHighlightIcon(kind: BattleLogHighlightIconKind): Phaser.GameObjects.Image | undefined {
    const iconResource = this._getLogHighlightIconResource(kind);
    if (!iconResource || !this.scene.textures.exists(iconResource.key)) {
      this.logHighlightIconFallbackRendered = true;
      this.logHighlightIcon?.setVisible(false);
      this.logHighlightIconKind = null;
      return undefined;
    }

    if (!this.logHighlightIcon) {
      this.logHighlightIcon = this.scene.add.image(LOG_X - 10, LOG_Y - 8, iconResource.key)
        .setName('battle_ui_log_highlight_icon')
        .setOrigin(0.5)
        .setDepth(113)
        .setAlpha(0);
    } else if (this.logHighlightIcon.texture.key !== iconResource.key) {
      this.logHighlightIcon.setTexture(iconResource.key);
    }

    const icon = this.logHighlightIcon;
    icon.setDisplaySize(BATTLE_LOG_HIGHLIGHT_ICON_SIZE, BATTLE_LOG_HIGHLIGHT_ICON_SIZE);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    icon.setVisible(true).setAlpha(1);
    this.logHighlightIconKind = kind;
    return icon;
  }

  private _formatLogHighlightText(message: string, icon?: Phaser.GameObjects.Image): string {
    if (!icon) return message;

    return message
      .replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪🔌⚙⏱🎵🔇]/gu, '')
      .replace(/[🏃❌🚧🔒🆘]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
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
        const highlightIconKind = this._inferHighlightIconKind(message);
        const highlightIcon = highlightIconKind ? this._addLogHighlightIcon(highlightIconKind) : undefined;
        const highlightText = this._formatLogHighlightText(message, highlightIcon);
        const highlightTargets: Array<Phaser.GameObjects.Text | Phaser.GameObjects.Image> = highlightIcon
          ? [this.logHighlight!, highlightIcon]
          : [this.logHighlight!];
        if (!highlightIcon) {
          this.logHighlightIcon?.setVisible(false).setAlpha(0);
          this.logHighlightIconKind = null;
        }
        this.scene.tweens.killTweensOf(highlightTargets);
        this.logHighlight!
          .setText(highlightText)
          .setX(highlightIcon ? LOG_X + 12 : LOG_X)
          .setColor(hlColor)
          .setAlpha(1);
        this.scene.tweens.add({ targets: highlightTargets, alpha: 0, duration: 1400, delay: 700, ease: 'Sine.easeIn' });
      } catch { /* 하이라이트 갱신 포기(비치명적) */ }
    } else {
      this.logHighlightIcon?.setVisible(false).setAlpha(0);
      this.logHighlightIconKind = null;
    }
  }

  private _getBattleLogHighlightQaKind(): BattleLogHighlightIconKind | null {
    if (typeof window === 'undefined') return null;

    try {
      const kind = new URLSearchParams(window.location.search).get('battleLogHighlightIconQa');
      return kind === 'critical' || kind === 'chain' || kind === 'victory' || kind === 'level' || kind === 'start'
        || kind === 'dualTech' || kind === 'tripleTech' || kind === 'guard' || kind === 'death' || kind === 'defeat'
        || kind === 'echo' || kind === 'telegraph' || kind === 'mana' || kind === 'skillHit'
        || kind === 'cooldown' || kind === 'wait' || kind === 'itemHeal' || kind === 'reconnect'
        || kind === 'autoMode' || kind === 'atbMode'
        || kind === 'bgmTrack' || kind === 'bgmMissing'
        || kind === 'escapeSuccess' || kind === 'escapeFail' || kind === 'escapeBlocked' || kind === 'escapeForbidden' || kind === 'escapeCritical'
        ? kind
        : null;
    } catch {
      return null;
    }
  }

  private _startBattleLogHighlightIconQaIfNeeded(): void {
    const kind = this._getBattleLogHighlightQaKind();
    if (!kind) return;

    const qaMessages: Record<BattleLogHighlightIconKind, string> = {
      critical: '💥 CRIT 88',
      chain: '🔥 CHAIN ×2',
      victory: '🎉 승리!',
      level: '🆙 레벨 업',
      start: '⚔ 전투 시작!',
      echo: '✨ ECHO! +29',
      skillHit: '⚡ 스킬 발동: 에테르 슬래시 → 허수아비 : 88',
      mana: '💧 MP 부족 — 에테르 슬래시(MP 15)',
      itemHeal: '🧪 Erien HP +100 회복!',
      cooldown: '⏳ 에테르 슬래시 쿨다운 중',
      wait: '⏭ Erien 대기',
      reconnect: '🔌 재연결됨 — 전투 재개',
      autoMode: '⚙ [AUTO] 자동 전투 ON (×1.5)',
      atbMode: '⏱ ATB 모드: WAIT — 메뉴/조준 중 정지',
      bgmTrack: '🎵 BGM: bgm_ancient_field',
      bgmMissing: '🔇 BGM 미존재: bgm_missing',
      escapeSuccess: '🏃 도주 성공!',
      escapeFail: '❌ 도주 실패!',
      escapeBlocked: '🚧 도주 차단!',
      escapeForbidden: '🔒 도주 불가!',
      escapeCritical: '🆘 비상 도주!',
      telegraph: '💢 보스 강공 준비!',
      dualTech: '✨ 협공 발동: 크로노 블레이드',
      tripleTech: '🌟 3인 협공 발동: 에테르나 파이널',
      guard: '🛡 방어 태세!',
      death: '💀 쓰러짐!',
      defeat: '💔 패배...',
    };

    this.scene.time.delayedCall(BATTLE_LOG_HIGHLIGHT_ICON_QA_DELAY_MS, () => {
      const sourceMessage = qaMessages[kind];
      this.addLog(sourceMessage);
      this._writeBattleLogHighlightIconQaProbe(kind, sourceMessage);
    });
  }

  private _writeBattleLogHighlightIconQaProbe(kind: BattleLogHighlightIconKind, sourceMessage: string): void {
    if (typeof document === 'undefined' || !document.body) return;

    const iconResource = this._getLogHighlightIconResource(kind);
    const expectedTextureKeys = iconResource ? [iconResource.key] : [];
    const activeIcon = this.logHighlightIcon?.active && this.logHighlightIcon.visible
      ? this.logHighlightIcon
      : undefined;
    const renderedTextureKeys = activeIcon ? [activeIcon.texture.key] : [];
    const missingBattleLogHighlightIconKeys = expectedTextureKeys
      .filter((key) => !renderedTextureKeys.includes(key));
    const highlightText = this.logHighlight?.active ? this.logHighlight.text : '';
    const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪🔌⚙⏱🎵🔇]/u.test(highlightText);
    const escapeLegacyGlyphPresent = /[🏃❌🚧🔒🆘]/u.test(highlightText);
    const hasExpectedIcon = Boolean(activeIcon)
      && missingBattleLogHighlightIconKeys.length === 0
      && !this.logHighlightIconFallbackRendered
      && !legacyGlyphPresent
      && !escapeLegacyGlyphPresent;

    document.body.dataset.aeternaBattleLogHighlightIconQa = JSON.stringify({
      status: hasExpectedIcon ? 'ready' : 'missing-icon',
      kind,
      sourceMessage,
      highlightText,
      legacyGlyphPresent: legacyGlyphPresent || escapeLegacyGlyphPresent,
      escapeLegacyGlyphPresent,
      logHighlightIcon: {
        iconId: this._isLogHighlightStatusIconKind(kind)
          ? BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS[kind]
          : this._isLogHighlightItemIconKind(kind)
            ? BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS[kind]
            : this._isLogHighlightUiIconKind(kind)
              ? BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS[kind]
          : BATTLE_LOG_HIGHLIGHT_ICON_IDS[kind],
        expectedCount: 1,
        renderedCount: activeIcon ? 1 : 0,
        expectedTextureKeys,
        renderedTextureKeys,
        displaySizes: activeIcon
          ? [{ width: activeIcon.displayWidth, height: activeIcon.displayHeight }]
          : [],
        fallbackRendered: this.logHighlightIconFallbackRendered,
        activeKind: this.logHighlightIconKind,
      },
      missingBattleLogHighlightIconKeys,
      visibleCanvasCount: Array.from(document.querySelectorAll('canvas')).filter((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length,
    });
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
    const buttonY = LOG_Y + 96;
    const pauseX = LOG_X + 56;
    const fleeX = LOG_X + 132;

    // 일시정지 (battle log 아래) — 키보드 컷오버(감사 rank5): P 키 등가 추가.
    this._addBattleUtilityButtonFrame(pauseX, buttonY, 116, 26, 'pause');
    this.pauseIcon = this._addBattleUtilityButtonIcon(pauseX - 44, buttonY, 'pause', BATTLE_UTILITY_BUTTON_ICON_IDS.pause);
    this.pauseBtn = this.scene.add.text(this.pauseIcon ? pauseX + 8 : pauseX, buttonY, '', {
      fontSize: '10px', color: '#aaaaaa',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(112).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => this.togglePause());
    this.pauseIcon?.on('pointerdown', () => this.togglePause());

    // P 키는 Phaser 씬 키보드가 아니라 window 레벨에 바인딩 — scene.pause('BattleScene') 가
    // 씬 시스템(키보드 플러그인 포함)을 멈추므로, 씬 키였다면 "P로 정지 → P로 재개 불가" 트랩.
    // window keydown 은 일시정지 상태와 무관하게 발화한다(#271 튜토리얼과 동일 패턴).
    const onPauseKey = (e: KeyboardEvent): void => {
      if (e.key !== 'p' && e.key !== 'P') return;
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return; // DOM 입력 중 보호
      this.togglePause();
    };
    window.addEventListener('keydown', onPauseKey);
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onPauseKey);
    });

    // 도주
    this._addBattleUtilityButtonFrame(fleeX, buttonY, 72, 26, 'flee');
    this.fleeIcon = this._addBattleUtilityButtonIcon(fleeX - 24, buttonY, 'flee', BATTLE_UTILITY_BUTTON_ICON_IDS.flee);
    const fleeLabel = this.fleeIcon ? '도주' : '🏃 도주';
    this.fleeBtn = this.scene.add.text(this.fleeIcon ? fleeX + 7 : fleeX, buttonY, fleeLabel, {
      fontSize: '10px', color: '#ff8888',
      padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(112).setInteractive({ useHandCursor: true });
    // UX(#2): 단일 도주 경로로 위임. 이전엔 여기서 50% 고정확률 + scene.start('GameScene') 직행으로
    // BattleScene._attemptFlee(생존자 기반 확률·escapeNarration 로그·_exitBattle 의 combatEnd 서버정리/
    // returnScene 복귀)를 통째로 우회해, 서버 전투가 안 닫히고 던전 등으로 복귀 못 하는 버그였다.
    this.fleeBtn.on('pointerdown', () => {
      (this.scene as unknown as { _attemptFlee?: () => void })._attemptFlee?.();
    });
    this.fleeIcon?.on('pointerdown', () => {
      (this.scene as unknown as { _attemptFlee?: () => void })._attemptFlee?.();
    });
    this._setPauseButtonPausedState(false);
    this._writeBattleUtilityButtonFrameQaProbe();
  }

  private _setPauseButtonPausedState(paused: boolean): void {
    const pauseIconResource = getSpriteResourceForSkillIcon(BATTLE_UTILITY_BUTTON_ICON_IDS.pause);
    const resumeIconResource = getSpriteResourceForSkillIcon(BATTLE_UTILITY_BUTTON_ICON_IDS.resume);
    const targetIconResource = paused ? resumeIconResource : pauseIconResource;
    const hasStateIcon = Boolean(this.pauseIcon && targetIconResource && this.scene.textures.exists(targetIconResource.key));

    if (this.pauseIcon) {
      this.pauseIcon.setVisible(hasStateIcon);
      if (targetIconResource && this.scene.textures.exists(targetIconResource.key)) {
        this.pauseIcon.setTexture(targetIconResource.key);
        this.pauseIcon.setDisplaySize(14, 14);
        this.pauseIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      }
    }

    if (paused) {
      this.pauseBtn.setText(hasStateIcon ? '재개 (P)' : '▶ 재개 (P)');
      return;
    }

    this.pauseBtn.setText(hasStateIcon ? '일시정지 (P)' : '⏸ 일시정지 (P)');
  }

  private _addBattleUtilityButtonIcon(
    x: number,
    y: number,
    name: 'pause' | 'flee',
    iconId: string,
  ): Phaser.GameObjects.Image | undefined {
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (!iconResource || !this.scene.textures.exists(iconResource.key)) return undefined;

    const icon = this.scene.add.image(x, y, iconResource.key)
      .setName(`battle_ui_utility_button_icon_${name}`)
      .setOrigin(0.5)
      .setDepth(112)
      .setInteractive({ useHandCursor: true });
    icon.setDisplaySize(14, 14);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.utilityButtonIcons.push(icon);
    return icon;
  }

  private _addBattleUtilityButtonFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    name: 'pause' | 'flee',
  ): void {
    const texture = BATTLE_UI_FRAME_TEXTURES.utilityButton;
    if (this.scene.textures.exists(texture.key)) {
      const frame = this.scene.add.image(x, y, texture.key)
        .setName(`battle_ui_utility_button_frame_${name}`)
        .setDisplaySize(width, height)
        .setAlpha(0.9)
        .setDepth(111);
      this.utilityButtonFrames.push(frame);
      return;
    }

    // Aseprite utility button frame 로드 실패 시에만 사용하는 안전 fallback.
    this.scene.add.rectangle(x, y, width, height, 0x222222, 0.88)
      .setStrokeStyle(1, name === 'pause' ? 0x6666aa : 0xaa6666)
      .setDepth(111);
  }

  private _isBattleUtilityButtonFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return new URLSearchParams(window.location.search).get('battleUtilityButtonFrameQa') === '1';
    } catch {
      return false;
    }
  }

  private _writeBattleUtilityButtonFrameQaProbe(): void {
    if (!this._isBattleUtilityButtonFrameQaRoute() || typeof document === 'undefined') return;

    const texture = BATTLE_UI_FRAME_TEXTURES.utilityButton;
    const hasTexture = this.scene.textures.exists(texture.key);
    const expectedTextureKeys = this._getBattleUtilityButtonExpectedIconKeys();
    const missingUtilityButtonIconKeys = this._getMissingBattleUtilityButtonIconKeys();
    document.body.dataset.aeternaBattleUtilityButtonFrameQa = JSON.stringify({
      status: hasTexture && missingUtilityButtonIconKeys.length === 0 ? 'ready' : 'missing',
      renderedFrameKeys: hasTexture ? [texture.key] : [],
      renderedFrameCount: this.utilityButtonFrames.length,
      expectedFrameCount: 2,
      missingFrameKeys: hasTexture ? [] : [texture.key],
      utilityButtonFrame: {
        key: texture.key,
        path: texture.path,
        rendered: hasTexture,
        buttonNames: this.utilityButtonFrames.map((frame) => frame.name),
        displaySizes: this.utilityButtonFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      utilityButtonIcon: {
        renderedIconCount: this.utilityButtonIcons.length,
        expectedIconCount: 2,
        expectedRenderedIconCount: BATTLE_UTILITY_BUTTON_RENDERED_ICON_COUNT,
        expectedTextureKeys,
        iconNames: this.utilityButtonIcons.map((icon) => icon.name),
        textureKeys: this.utilityButtonIcons.map((icon) => icon.texture.key),
        pauseIconTextureKey: this.pauseIcon?.texture.key ?? null,
        pauseLabelLegacyGlyphPresent: this.pauseBtn.text.includes('▶') || this.pauseBtn.text.includes('⏸'),
        missingUtilityButtonIconKeys,
        displaySizes: this.utilityButtonIcons.map((icon) => ({
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
      },
      missingUtilityButtonIconKeys,
      pauseLabel: this.pauseBtn.text,
      fleeLabel: this.fleeBtn.text,
      visibleCanvasCount: typeof document === 'undefined'
        ? 0
        : Array.from(document.querySelectorAll('canvas')).filter((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
    });
  }

  private _getBattleUtilityButtonExpectedIconKeys(): string[] {
    return Object.values(BATTLE_UTILITY_BUTTON_ICON_IDS)
      .map((iconId) => getSpriteResourceForSkillIcon(iconId)?.key)
      .filter((key): key is string => key !== undefined);
  }

  private _getMissingBattleUtilityButtonIconKeys(): string[] {
    return Object.values(BATTLE_UTILITY_BUTTON_ICON_IDS)
      .map((iconId) => getSpriteResourceForSkillIcon(iconId)?.key ?? iconId)
      .filter((key) => !this.scene.textures.exists(key));
  }

  /** 일시정지 토글 — 마우스 버튼과 P 키(window)가 공유하는 단일 진입점(라벨 동기 포함). */
  togglePause(): void {
    if (this.scene.scene.isPaused('BattleScene')) {
      this.scene.scene.resume('BattleScene');
      this._setPauseButtonPausedState(false);
    } else {
      this.scene.scene.pause('BattleScene');
      this._setPauseButtonPausedState(true);
    }
    this._writeBattleUtilityButtonFrameQaProbe();
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

  /** UX(rank14): 활성 commander MP(내 턴 아니면 null)를 매프레임 받아 슬롯 사용가능성 표시. */
  setSkillAvailability(mp: number | null): void {
    this._availableMp = mp;
  }

  update(_delta: number): void {
    // 슬롯 오버레이: 쿨다운(보간) > MP부족/내턴아님(고정 dim) > 사용가능(투명) 순으로 '왜 못 쓰는지' 표시
    for (let i = 0; i < SKILL_COUNT; i++) {
      const slot = this.skillSlots[i];
      if (!slot) continue;
      const overlay = this.cooldownOverlays[i];
      if (slot.currentCooldown > 0) {
        const ratio = slot.currentCooldown / slot.cooldown;
        overlay.setAlpha(ratio * 0.6);
      } else if (slot.mpCost > 0 && (this._availableMp === null || this._availableMp < slot.mpCost)) {
        // 액티브 스킬인데 MP 부족 또는 내 턴이 아님 → 회색 dim(마법 서브메뉴의 회색 처리와 동일 의미)
        overlay.setAlpha(0.45);
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

    const tooltipTexture = BATTLE_UI_FRAME_TEXTURES.skillTooltip;
    const hasTooltipFrame = this.scene.textures.exists(tooltipTexture.key);
    const tooltipW = 150;
    const tooltipH = lines.length * 18 + 16;
    const tooltipObjects: Phaser.GameObjects.GameObject[] = [];

    if (hasTooltipFrame) {
      tooltipObjects.push(
        this.scene.add.image(0, 0, tooltipTexture.key)
          .setName(`battle_ui_skill_tooltip_frame_${tooltipTexture.key}`)
          .setDisplaySize(tooltipW, tooltipH)
          .setAlpha(0.9)
          .setOrigin(0.5),
      );
    }

    // Aseprite frame이 있으면 rectangle은 텍스트 가독성 레이어로만 쓰고, 없으면 기존 stroke fallback을 유지한다.
    const bg = this.scene.add.rectangle(0, 0, tooltipW - 20, tooltipH - 12, 0x05091a, hasTooltipFrame ? 0.48 : 0.9)
      .setOrigin(0.5);
    if (!hasTooltipFrame) {
      bg.setStrokeStyle(1, 0x6666aa);
    }
    tooltipObjects.push(bg);

    const txt = this.scene.add.text(0, 0, lines.join('\n'), {
      fontSize: '10px', color: '#ffffff', align: 'center', lineSpacing: 2,
    }).setOrigin(0.5);
    tooltipObjects.push(txt);

    this.tooltipContainer = this.scene.add.container(x, y - 10, tooltipObjects).setDepth(200);
    this._writeBattleSkillTooltipFrameQaProbe(
      hasTooltipFrame ? 'ready' : 'missing',
      tooltipTexture,
      hasTooltipFrame,
      {
        slotName: slot.name,
        lineCount: lines.length,
        tooltipWidth: tooltipW,
        tooltipHeight: tooltipH,
      },
    );
  }

  private _hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
      this._writeBattleSkillTooltipFrameQaProbe(
        'hidden',
        BATTLE_UI_FRAME_TEXTURES.skillTooltip,
        this.scene.textures.exists(BATTLE_UI_FRAME_TEXTURES.skillTooltip.key),
      );
    }
  }

  private _isBattleSkillTooltipFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return new URLSearchParams(window.location.search).get('battleTooltipFrameQa') === '1';
    } catch {
      return false;
    }
  }

  private _startBattleSkillTooltipFrameQaIfNeeded(): void {
    if (!this._isBattleSkillTooltipFrameQaRoute()) return;

    const slotIndex = this.skillSlots.findIndex(Boolean);
    if (slotIndex < 0) {
      this._writeBattleSkillTooltipFrameQaProbe(
        'missing',
        BATTLE_UI_FRAME_TEXTURES.skillTooltip,
        this.scene.textures.exists(BATTLE_UI_FRAME_TEXTURES.skillTooltip.key),
      );
      return;
    }

    const startX = 40;
    const x = startX + slotIndex * (SKILL_SLOT_SIZE + SKILL_GAP) + SKILL_SLOT_SIZE / 2;
    const y = SKILL_BAR_Y - SKILL_SLOT_SIZE - 10;
    this.scene.time.delayedCall(80, () => {
      const slot = this.skillSlots[slotIndex];
      if (slot) {
        this._showTooltip(x, y, slot);
      }
    });
  }

  private _writeBattleSkillTooltipFrameQaProbe(
    status: 'ready' | 'missing' | 'hidden',
    texture: (typeof BATTLE_UI_FRAME_TEXTURES)['skillTooltip'],
    hasTexture: boolean,
    tooltip?: {
      slotName: string;
      lineCount: number;
      tooltipWidth: number;
      tooltipHeight: number;
    },
  ): void {
    if (!this._isBattleSkillTooltipFrameQaRoute() || typeof document === 'undefined') return;

    document.body.dataset.aeternaBattleSkillTooltipFrameQa = JSON.stringify({
      status,
      visible: status === 'ready' || status === 'missing',
      renderedFrameKeys: hasTexture && status !== 'hidden' ? [texture.key] : [],
      renderedFrameCount: hasTexture && status !== 'hidden' ? 1 : 0,
      expectedFrameCount: 1,
      missingFrameKeys: hasTexture ? [] : [texture.key],
      skillTooltipFrame: {
        key: texture.key,
        path: texture.path,
        rendered: hasTexture && status !== 'hidden',
        displayWidth: tooltip?.tooltipWidth ?? 0,
        displayHeight: tooltip?.tooltipHeight ?? 0,
      },
      slotName: tooltip?.slotName ?? '',
      lineCount: tooltip?.lineCount ?? 0,
      visibleCanvasCount: typeof document === 'undefined'
        ? 0
        : Array.from(document.querySelectorAll('canvas')).filter((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length,
    });
  }
}
