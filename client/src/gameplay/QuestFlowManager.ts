/**
 * QuestFlowManager — P26-09: 퀘스트 수락/완료 플로우
 *
 * 플로우: NPC 대화 → 퀘스트 수락 → HUD 추적 → 조건 달성 → 보상
 *
 * 기능:
 * - DialogueUI의 quest_offer 액션 수신 → 퀘스트 수락 API 호출
 * - QuestTracker 자동 갱신
 * - 전투/아이템 이벤트로 진행률 업데이트
 * - 완료 시 자동 turn-in + 보상 팝업
 */

import * as Phaser from 'phaser';
import { NetworkManager, QuestData } from '../network/NetworkManager';
import { QuestTracker } from '../ui/QuestTracker';
import { DialogueAction } from '../ui/DialogueUI';

// ── 타입 ──────────────────────────────────────────────────────

export interface QuestReward {
  exp: number;
  gold: number;
  items: Array<{ name: string; quantity: number }>;
}

type QuestEventType = 'kill' | 'collect' | 'talk' | 'explore' | 'craft';

export interface QuestEvent {
  type: QuestEventType;
  targetId: string;
  amount: number;
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class QuestFlowManager {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private tracker: QuestTracker;
  private characterId = '';

  // 보상 팝업
  private rewardPopup: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, net: NetworkManager, tracker: QuestTracker) {
    this.scene = scene;
    this.net = net;
    this.tracker = tracker;
  }

  init(characterId: string): void {
    this.characterId = characterId;
  }

  // ── DialogueUI 액션 핸들러 ────────────────────────────────

  async handleDialogueAction(action: DialogueAction): Promise<void> {
    if (action.type === 'quest_offer' && action.questId) {
      await this.acceptQuest(action.questId);
    } else if (action.type === 'quest_complete' && action.questId) {
      await this.completeQuest(action.questId);
    }
  }

  // ── 퀘스트 수락 ──────────────────────────────────────────

  async acceptQuest(questId: string): Promise<void> {
    try {
      const quest = await this.net.acceptQuest(questId, this.characterId);
      await this.tracker.refresh();
      this._showNotification(`📜 퀘스트 수락: ${quest.name}`);
    } catch (e) {
      console.error('[QuestFlow] accept failed', e);
    }
  }

  // ── 퀘스트 완료 ──────────────────────────────────────────

  async completeQuest(questId: string): Promise<void> {
    try {
      const result = await this.net.completeQuest(questId, this.characterId);
      await this.tracker.refresh();

      const rewards = result.rewards as QuestReward;
      this._showRewardPopup(result.quest.name, rewards);
    } catch (e) {
      console.error('[QuestFlow] complete failed', e);
    }
  }

  // ── 이벤트 기반 진행률 업데이트 ──────────────────────────

  processEvent(event: QuestEvent): void {
    // 서버에서 진행률을 관리하지만 클라이언트 HUD도 즉시 업데이트
    // 서버 동기화는 주기적 refresh로 보정
    this.net.post('/api/quests/progress', {
      characterId: this.characterId,
      eventType: event.type,
      targetId: event.targetId,
      amount: event.amount,
    }).then(() => {
      this.tracker.refresh();
    }).catch(e => {
      console.error('[QuestFlow] progress update failed', e);
    });
  }

  // 전투 킬 이벤트 편의 메서드
  onMonsterKill(monsterId: string): void {
    this.processEvent({ type: 'kill', targetId: monsterId, amount: 1 });
  }

  // 아이템 수집 이벤트
  onItemCollect(itemId: string, quantity: number): void {
    this.processEvent({ type: 'collect', targetId: itemId, amount: quantity });
  }

  // ── 보상 팝업 ────────────────────────────────────────────

  private _showRewardPopup(questName: string, rewards: QuestReward): void {
    this._closeRewardPopup();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.rewardPopup = this.scene.add.container(0, 0).setDepth(950);

    // 배경
    const bg = this.scene.add.rectangle(cx, cy, 320, 220, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0x55cc55);
    this.rewardPopup.add(bg);

    let y = cy - 80;
    const line = (text: string, color = '#e0e0ff', size = '13px') => {
      const t = this.scene.add.text(cx, y, text, { fontSize: size, color }).setOrigin(0.5);
      this.rewardPopup!.add(t);
      y += parseInt(size) + 8;
    };

    line('🎉 퀘스트 완료!', '#55ff55', '18px');
    line(questName, '#ffffff', '14px');
    line('', '#ffffff', '6px');
    line(`EXP +${rewards.exp}`, '#88cc88');
    line(`Gold +${rewards.gold}`, '#ffcc00');

    if (rewards.items && rewards.items.length > 0) {
      rewards.items.forEach(item => {
        line(`📦 ${item.name} x${item.quantity}`, '#aaddff', '12px');
      });
    }

    // 닫기 버튼
    const closeBtn = this.scene.add.text(cx, cy + 80, '[ 확인 ]', {
      fontSize: '14px', color: '#aaaacc', backgroundColor: '#2a2a4e', padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeRewardPopup());
    this.rewardPopup.add(closeBtn);
  }

  private _closeRewardPopup(): void {
    if (this.rewardPopup) { this.rewardPopup.destroy(); this.rewardPopup = null; }
  }

  // ── 알림 ──────────────────────────────────────────────────

  private _showNotification(msg: string): void {
    const t = this.scene.add.text(this.scene.scale.width / 2, 80, msg, {
      fontSize: '16px', color: '#55ff55', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(960);

    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      y: 50,
      duration: 2000,
      delay: 2000,
      onComplete: () => t.destroy(),
    });
  }

  destroy(): void {
    this._closeRewardPopup();
  }
}
