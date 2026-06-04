/**
 * HUDOrchestrator — HUD 업데이트 로직 (P10-08)
 *
 * GameScene에서 분리된 HUD 상태 관리 서비스.
 * HP/MP 시뮬레이션, 퀵슬롯 관리, 대화창 토글, HUD 이벤트 바인딩을 담당한다.
 * GameScene은 create/update에서 이 오케스트레이터를 호출만 한다.
 */

import * as Phaser from 'phaser';
import {
  HudOverlay,
  HudStatusProps,
  QuestItem,
  QuickSlotData,
  makeDefaultQuests,
  makeDefaultSlots,
} from '../ui/HudOverlay';
import {
  buildNpcDialogueData,
  resolveNpcDialogueChoice,
  type NpcDialogueSource,
} from '../gameplay/npcDialogue';
import { activeQuestToQuestItem } from '../ui/questGuide';
import { networkManager } from '../network/NetworkManager';

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
    // 데모 목업을 먼저(동기) 그려 HUD 가 빈 채로 뜨지 않게 하고, 실 active 퀘스트를 비동기로 덮어쓴다.
    this.hud.setQuests(makeDefaultQuests());
    void this.loadQuests();

    this.bindEvents();
  }

  /**
   * 진행 중(active) 퀘스트를 서버에서 가져와 HUD 에 반영한다(서버가 부착한 진행 가이드 포함).
   * 진행 중 퀘스트가 0개이거나 로드 실패면 데모 목업을 그대로 둔다 — 회귀 없이 단조 개선.
   */
  async loadQuests(): Promise<void> {
    try {
      const active = await networkManager.getActiveQuests();
      const items = active
        .map(activeQuestToQuestItem)
        .filter((it): it is QuestItem => it !== null);
      if (items.length > 0) {
        this.hud.setQuests(items);
      }
    } catch (err) {
      console.warn('[HUDOrchestrator] active 퀘스트 로드 실패 — 데모 목업 유지:', err);
    }
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
   * 필드 NPC 대화창 표시
   */
  showNpcDialogue(npc: NpcDialogueSource): void {
    this.dialogueOpenAtMs = Date.now();
    this.hud.showDialogue(buildNpcDialogueData(npc));
  }

  /**
   * NPC 선택지 결과 표시 — 후속 대사가 없으면 false 반환
   */
  showNpcChoiceResult(npc: NpcDialogueSource, choiceId: string): boolean {
    const nextDialogue = resolveNpcDialogueChoice(npc, choiceId);
    if (!nextDialogue) {
      return false;
    }

    this.hud.showDialogue(nextDialogue);
    return true;
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
