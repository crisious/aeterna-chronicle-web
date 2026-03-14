/**
 * DungeonFlowManager — P26-12: 던전 입장/클리어
 *
 * 기능:
 * - 던전 입장 UI (파티 확인)
 * - 웨이브 진행 표시
 * - 보스 전투 → 클리어 판정 → 보상
 * - NetworkManager 연동 (enterDungeon, clearDungeon, combatRoutes)
 */

import * as Phaser from 'phaser';
import { NetworkManager, CombatResult } from '../network/NetworkManager';
import { CombatRewardFlow } from './CombatRewardFlow';

// ── 타입 ──────────────────────────────────────────────────────

export interface DungeonInfo {
  id: string;
  name: string;
  minLevel: number;
  waves: number;
  bossName?: string;
  rewards?: { exp: number; gold: number };
}

export interface DungeonSession {
  sessionId: string;
  dungeonId: string;
  currentWave: number;
  totalWaves: number;
  status: 'preparing' | 'in_progress' | 'boss' | 'cleared' | 'failed';
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class DungeonFlowManager {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private combatReward: CombatRewardFlow;
  private characterId = '';

  // 상태
  private currentSession: DungeonSession | null = null;
  private dungeons: DungeonInfo[] = [];

  // UI
  private entryUI: Phaser.GameObjects.Container | null = null;
  private waveHUD: Phaser.GameObjects.Container | null = null;
  private waveText: Phaser.GameObjects.Text | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, net: NetworkManager, combatReward: CombatRewardFlow) {
    this.scene = scene;
    this.net = net;
    this.combatReward = combatReward;
  }

  init(characterId: string): void {
    this.characterId = characterId;
  }

  // ── 던전 목록 로드 ────────────────────────────────────────

  async loadDungeons(zoneId?: string): Promise<DungeonInfo[]> {
    try {
      this.dungeons = await this.net.getDungeons(zoneId) as unknown as DungeonInfo[];
    } catch {
      this.dungeons = [];
    }
    return this.dungeons;
  }

  // ── 던전 입장 UI ──────────────────────────────────────────

  showEntryUI(dungeon: DungeonInfo, characterLevel: number): void {
    this._closeEntryUI();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const pw = 360;
    const ph = 280;

    this.entryUI = this.scene.add.container(0, 0).setDepth(930);

    // dimmer
    const dimmer = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setInteractive().on('pointerdown', () => this._closeEntryUI());
    this.entryUI.add(dimmer);

    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xff6644);
    this.entryUI.add(bg);

    let y = cy - ph / 2 + 20;
    const line = (text: string, color = '#e0e0ff', size = '13px') => {
      const t = this.scene.add.text(cx, y, text, { fontSize: size, color }).setOrigin(0.5);
      this.entryUI!.add(t);
      y += parseInt(size) + 8;
    };

    line('🏰 던전 입장', '#ff6644', '18px');
    line(dungeon.name, '#ffffff', '16px');
    y += 6;
    line(`추천 레벨: ${dungeon.minLevel}+`, '#ffcc00');
    line(`웨이브: ${dungeon.waves}`, '#aaaacc');
    if (dungeon.bossName) line(`보스: ${dungeon.bossName}`, '#ff4444');
    y += 10;

    const levelOk = characterLevel >= dungeon.minLevel;

    if (!levelOk) {
      line(`⚠️ 레벨 부족 (현재: ${characterLevel})`, '#ff4444');
    }

    // 입장 버튼
    const enterBtn = this.scene.add.text(cx, cy + ph / 2 - 50, levelOk ? '[ 입장 ]' : '[ 레벨 부족 ]', {
      fontSize: '14px',
      color: levelOk ? '#55cc55' : '#555566',
      backgroundColor: '#2a2a4e',
      padding: { x: 16, y: 6 },
    }).setOrigin(0.5);

    if (levelOk) {
      enterBtn.setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._enterDungeon(dungeon));
    }
    this.entryUI.add(enterBtn);

    // 취소
    const cancelBtn = this.scene.add.text(cx, cy + ph / 2 - 20, '[ 취소 ]', {
      fontSize: '12px', color: '#aaaacc',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeEntryUI());
    this.entryUI.add(cancelBtn);
  }

  private _closeEntryUI(): void {
    if (this.entryUI) { this.entryUI.destroy(); this.entryUI = null; }
  }

  // ── 던전 입장 ────────────────────────────────────────────

  private async _enterDungeon(dungeon: DungeonInfo): Promise<void> {
    this._closeEntryUI();

    try {
      const result = await this.net.enterDungeon(dungeon.id, this.characterId);
      this.currentSession = {
        sessionId: result.sessionId,
        dungeonId: dungeon.id,
        currentWave: 1,
        totalWaves: result.waves,
        status: 'in_progress',
      };

      this._showWaveHUD();
      this._updateWaveDisplay();

      // 로딩 후 던전 씬 전환
      this.scene.scene.start('DungeonScene', {
        sessionId: result.sessionId,
        dungeonId: dungeon.id,
        dungeonName: dungeon.name,
        waves: result.waves,
        characterId: this.characterId,
      });
    } catch (e) {
      console.error('[DungeonFlow] enter failed', e);
    }
  }

  // ── 웨이브 HUD ───────────────────────────────────────────

  private _showWaveHUD(): void {
    this._closeWaveHUD();

    const cx = this.scene.scale.width / 2;
    this.waveHUD = this.scene.add.container(cx, 20).setDepth(810);

    const bg = this.scene.add.rectangle(0, 0, 240, 36, 0x1a1a2e, 0.85)
      .setStrokeStyle(1, 0xff6644);
    this.waveHUD.add(bg);

    this.waveText = this.scene.add.text(-60, 0, 'Wave 1/1', {
      fontSize: '14px', color: '#ff6644', fontStyle: 'bold',
    }).setOrigin(0, 0.5);
    this.waveHUD.add(this.waveText);

    this.statusText = this.scene.add.text(60, 0, '진행 중', {
      fontSize: '12px', color: '#aaaacc',
    }).setOrigin(0, 0.5);
    this.waveHUD.add(this.statusText);
  }

  private _closeWaveHUD(): void {
    if (this.waveHUD) { this.waveHUD.destroy(); this.waveHUD = null; }
  }

  private _updateWaveDisplay(): void {
    if (!this.currentSession || !this.waveText || !this.statusText) return;
    this.waveText.setText(`Wave ${this.currentSession.currentWave}/${this.currentSession.totalWaves}`);

    const statusLabels: Record<string, string> = {
      preparing: '준비 중',
      in_progress: '진행 중',
      boss: '⚠️ 보스 전투',
      cleared: '✅ 클리어!',
      failed: '❌ 실패',
    };
    this.statusText.setText(statusLabels[this.currentSession.status] ?? '');
    this.statusText.setColor(this.currentSession.status === 'boss' ? '#ff4444' : '#aaaacc');
  }

  // ── 웨이브 진행 (외부 호출) ──────────────────────────────

  advanceWave(): void {
    if (!this.currentSession) return;
    this.currentSession.currentWave++;

    if (this.currentSession.currentWave >= this.currentSession.totalWaves) {
      this.currentSession.status = 'boss';
    }
    this._updateWaveDisplay();
  }

  // ── 던전 클리어 ──────────────────────────────────────────

  async clearDungeon(): Promise<void> {
    if (!this.currentSession) return;

    try {
      const result = await this.net.clearDungeon(this.currentSession.sessionId);
      this.currentSession.status = 'cleared';
      this._updateWaveDisplay();

      // 보상 처리
      await this.combatReward.processCombatResult(result);

      // 3초 후 HUD 닫기
      this.scene.time.delayedCall(3000, () => {
        this._closeWaveHUD();
        this.currentSession = null;
      });
    } catch (e) {
      console.error('[DungeonFlow] clear failed', e);
    }
  }

  // 던전 실패
  dungeonFailed(): void {
    if (!this.currentSession) return;
    this.currentSession.status = 'failed';
    this._updateWaveDisplay();

    this.scene.time.delayedCall(3000, () => {
      this._closeWaveHUD();
      this.currentSession = null;
    });
  }

  isInDungeon(): boolean {
    return this.currentSession !== null && this.currentSession.status !== 'cleared' && this.currentSession.status !== 'failed';
  }

  destroy(): void {
    this._closeEntryUI();
    this._closeWaveHUD();
  }
}
