/**
 * QuestTracker — P26-04: 퀘스트 추적 HUD
 *
 * 기능:
 * - 활성 퀘스트 목록 (우측 상단)
 * - 목표 진행률 표시
 * - 퀘스트 완료 알림
 * - NetworkManager 연동 (getQuests, completeQuest)
 */

import * as Phaser from 'phaser';
import { NetworkManager, QuestData } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

interface QuestEntry {
  container: Phaser.GameObjects.Container;
  quest: QuestData;
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class QuestTracker {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private entries: QuestEntry[] = [];
  private quests: QuestData[] = [];
  private characterId = '';
  private visible = true;

  // 알림
  private notifContainer: Phaser.GameObjects.Container;
  private notifQueue: string[] = [];
  private notifActive = false;

  // 설정
  private readonly PANEL_X: number;
  private readonly PANEL_Y = 10;
  private readonly PANEL_W = 260;
  private readonly MAX_DISPLAY = 5;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.PANEL_X = scene.scale.width - this.PANEL_W - 10;
    this.container = scene.add.container(this.PANEL_X, this.PANEL_Y).setDepth(800);
    this.notifContainer = scene.add.container(scene.scale.width / 2, 60).setDepth(850);
  }

  // ── 공개 API ──────────────────────────────────────────────

  async init(characterId: string): Promise<void> {
    this.characterId = characterId;
    await this.refresh();
  }

  async refresh(): Promise<void> {
    try {
      const all = await this.net.getQuests(this.characterId);
      const prev = this.quests;
      this.quests = all.filter(q => q.status === 'active' || q.status === 'complete');

      // 새로 완료된 퀘스트 감지
      this.quests.forEach(q => {
        if (q.status === 'complete') {
          const was = prev.find(p => p.id === q.id);
          if (!was || was.status !== 'complete') {
            this._enqueueNotif(`✅ 퀘스트 완료: ${q.name}`);
          }
        }
      });
    } catch {
      this.quests = [];
    }
    this._render();
  }

  show(): void { this.visible = true; this.container.setVisible(true); }
  hide(): void { this.visible = false; this.container.setVisible(false); }
  toggle(): void { this.visible ? this.hide() : this.show(); }

  // 외부에서 퀘스트 진행 업데이트 수신
  updateProgress(questId: string, objectiveIndex: number, current: number): void {
    const q = this.quests.find(qq => qq.id === questId);
    if (!q) return;
    if (q.objectives[objectiveIndex]) {
      q.objectives[objectiveIndex].current = current;
      // 전체 완료 체크
      const allDone = q.objectives.every(o => o.current >= o.target);
      if (allDone && q.status !== 'complete') {
        q.status = 'complete';
        this._enqueueNotif(`✅ 퀘스트 완료: ${q.name}`);
      }
    }
    this._render();
  }

  // ── 내부: 렌더 ────────────────────────────────────────────

  private _render(): void {
    this.container.removeAll(true);
    this.entries = [];

    if (this.quests.length === 0) return;

    // 헤더
    const header = this.scene.add.text(0, 0, '📋 퀘스트', {
      fontSize: '14px', color: '#e0e0ff', fontStyle: 'bold',
    });
    this.container.add(header);

    let y = 24;
    const display = this.quests.slice(0, this.MAX_DISPLAY);

    display.forEach(q => {
      const entry = this._createEntry(q, y);
      this.container.add(entry.container);
      this.entries.push(entry);
      y += this._entryHeight(q);
    });

    if (this.quests.length > this.MAX_DISPLAY) {
      const more = this.scene.add.text(0, y, `  +${this.quests.length - this.MAX_DISPLAY} more`, {
        fontSize: '11px', color: '#666688',
      });
      this.container.add(more);
    }
  }

  private _createEntry(quest: QuestData, y: number): QuestEntry {
    const c = this.scene.add.container(0, y);

    const isComplete = quest.status === 'complete';
    const nameColor = isComplete ? '#55cc55' : (quest.rewards.exp > 500 ? '#ffcc00' : '#ccccee');
    const marker = isComplete ? '✅' : '▸';

    const nameT = this.scene.add.text(0, 0, `${marker} ${quest.name}`, {
      fontSize: '12px', color: nameColor, fontStyle: isComplete ? 'bold' : 'normal',
    });
    c.add(nameT);

    let objY = 18;
    quest.objectives.forEach(obj => {
      const pct = Math.min(obj.current / obj.target, 1);
      const barW = 160;
      const filled = barW * pct;

      const objText = this.scene.add.text(12, objY, `${obj.desc}`, {
        fontSize: '10px', color: '#aaaacc',
      });
      c.add(objText);

      objY += 14;

      // 프로그레스 바
      const barBg = this.scene.add.rectangle(12, objY + 3, barW, 6, 0x2a2a4e).setOrigin(0, 0.5);
      const barFill = this.scene.add.rectangle(12, objY + 3, filled, 6, pct >= 1 ? 0x55cc55 : 0x4488ff).setOrigin(0, 0.5);
      const pctText = this.scene.add.text(barW + 18, objY, `${obj.current}/${obj.target}`, {
        fontSize: '9px', color: '#888888',
      }).setOrigin(0, 0.5);

      c.add([barBg, barFill, pctText]);
      objY += 12;
    });

    return { container: c, quest };
  }

  private _entryHeight(quest: QuestData): number {
    return 20 + quest.objectives.length * 26 + 8;
  }

  // ── 내부: 알림 ────────────────────────────────────────────

  private _enqueueNotif(msg: string): void {
    this.notifQueue.push(msg);
    if (!this.notifActive) this._showNextNotif();
  }

  private _showNextNotif(): void {
    if (this.notifQueue.length === 0) {
      this.notifActive = false;
      return;
    }

    this.notifActive = true;
    const msg = this.notifQueue.shift()!;

    const bg = this.scene.add.rectangle(0, 0, 320, 40, 0x1a4a1a, 0.9)
      .setStrokeStyle(2, 0x55cc55);
    const text = this.scene.add.text(0, 0, msg, {
      fontSize: '14px', color: '#55ff55', fontStyle: 'bold',
    }).setOrigin(0.5);

    const notif = this.scene.add.container(0, -50).setDepth(860);
    notif.add([bg, text]);
    this.notifContainer.add(notif);

    // 슬라이드 인
    this.scene.tweens.add({
      targets: notif,
      y: 0,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 3초 후 페이드 아웃
        this.scene.time.delayedCall(3000, () => {
          this.scene.tweens.add({
            targets: notif,
            alpha: 0,
            y: -30,
            duration: 500,
            onComplete: () => {
              notif.destroy();
              this._showNextNotif();
            },
          });
        });
      },
    });
  }

  // ── 정리 ──────────────────────────────────────────────────

  destroy(): void {
    this.container.destroy();
    this.notifContainer.destroy();
  }
}
