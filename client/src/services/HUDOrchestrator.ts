/**
 * HUDOrchestrator — HUD 업데이트 로직 (P10-08)
 *
 * GameScene에서 분리된 HUD 상태 관리 서비스.
 * HP/MP 시뮬레이션, 퀵슬롯 관리, 대화창 토글, HUD 이벤트 바인딩을 담당한다.
 * GameScene은 create/update에서 이 오케스트레이터를 호출만 한다.
 */

import * as Phaser from 'phaser';
import {
  DialogueData,
  HudOverlay,
  HudStatusProps,
  QuickSlotData,
  makeDefaultQuests,
  makeDefaultSlots,
} from '../ui/HudOverlay';

// ── HUDOrchestrator ───────────────────────────────────────────

export class HUDOrchestrator {
  private hud!: HudOverlay;
  private hudStatus: HudStatusProps;
  private quickSlots: QuickSlotData[] = [];

  /** Delta accumulator: 100ms 주기로 HUD 상태 시뮬레이션 */
  private statusTickAccumulator = 0;
  private static readonly STATUS_TICK_INTERVAL_MS = 100;

  /** 대화창 열린 시점 (텔레메트리용) */
  dialogueOpenAtMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    initialStatus?: Partial<HudStatusProps>,
  ) {
    this.hudStatus = {
      hpCurrent: 415,
      hpMax: 415,
      mpCurrent: 208,
      mpMax: 208,
      level: 15,
      expRatio: 0.42,
      characterName: 'Erien',
      dangerHpThreshold: 0.2,
      ...initialStatus,
    };
  }

  /**
   * HUD 초기화 — Scene.create()에서 호출
   */
  init(): void {
    this.hud = new HudOverlay(this.scene);
    this.quickSlots = makeDefaultSlots();
    this.hud.setStatus(this.hudStatus);
    this.hud.setQuickSlots(this.quickSlots, 'keyboard');
    this.hud.setQuests(makeDefaultQuests());

    this.bindEvents();
  }

  /**
   * HUD 업데이트 — Scene.update()에서 호출
   */
  update(delta: number): void {
    this.hud.update(delta);

    this.statusTickAccumulator += delta;
    if (this.statusTickAccumulator >= HUDOrchestrator.STATUS_TICK_INTERVAL_MS) {
      this.simulateStatusTick(this.statusTickAccumulator);
      this.statusTickAccumulator = 0;
    }
  }

  /**
   * 핫키로 슬롯 트리거
   */
  triggerSlotByHotkey(hotkey: string): void {
    this.hud.triggerSlotByHotkey(hotkey);
  }

  /**
   * 대화창 토글
   */
  toggleSampleDialogue(): void {
    const sample: DialogueData = {
      speakerName: '누아리엘',
      bodyText: '버티는 건 치료가 아니에요. 선택하세요. 짧게 버틸지, 길게 살아남을지.',
      choices: [
        { choiceId: 'A', text: '바로 다녀올게.', disabled: false },
        { choiceId: 'B', text: '대체 재료는 없어?', disabled: false },
        { choiceId: 'C', text: '지금은 시간이 없어.', disabled: false },
      ],
      canSkip: true,
    };

    this.dialogueOpenAtMs = Date.now();
    this.hud.showDialogue(sample);
  }

  /**
   * 대화창 숨기기
   */
  hideDialogue(): void {
    this.hud.hideDialogue();
  }

  /**
   * HUD 상태 직접 갱신 (서버 데이터 반영 등)
   */
  setStatus(status: Partial<HudStatusProps>): void {
    this.hudStatus = { ...this.hudStatus, ...status };
    this.hud.setStatus(this.hudStatus);
  }

  // ── 내부 ────────────────────────────────────────────────────

  private bindEvents(): void {
    const events = this.scene.events;

    events.on('ui.event.quickslot.use', ({ slotIndex }: { slotIndex: number }) => {
      console.log(`[HUD] quickslot use -> ${slotIndex}`);
    });

    events.on('ui.event.quickslot.invalid_use', ({ slotIndex }: { slotIndex: number }) => {
      console.warn(`[HUD] quickslot invalid -> ${slotIndex}`);
    });

    events.on('ui.event.status.avatar_click', () => {
      console.log('[HUD] avatar clicked');
    });

    events.on('ui.event.status.hp_critical', () => {
      console.warn('[HUD] HP critical');
    });
  }

  private simulateStatusTick(delta: number): void {
    const hpDrainPerSec = 1.2;
    const mpRegenPerSec = 0.8;

    const nextHp = Math.max(1, this.hudStatus.hpCurrent - (hpDrainPerSec * delta) / 1000);
    const nextMp = Math.min(this.hudStatus.mpMax, this.hudStatus.mpCurrent + (mpRegenPerSec * delta) / 1000);

    this.hudStatus = {
      ...this.hudStatus,
      hpCurrent: Math.round(nextHp),
      mpCurrent: Math.round(nextMp),
    };

    this.hud.setStatus(this.hudStatus);
  }
}
