/**
 * GuildRaidUI — P27-11: 길드 레이드 UI
 *
 * 기능:
 * - 레이드 목록 (난이도, 보상, 입장 조건)
 * - 레이드 로비 (참가자 목록, 준비 상태)
 * - 레이드 진행 상태 (보스 HP, 페이즈, 타이머)
 * - 레이드 보상 분배 결과
 * - raidRoutes + raidSocketHandler 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface RaidInfo {
  id: string;
  name: string;
  difficulty: 'normal' | 'hard' | 'hell';
  minLevel: number;
  maxPlayers: number;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  phase: number;
  totalPhases: number;
  timeRemaining: number;
  rewards: Array<{ itemName: string; rarity: string; dropRate: number }>;
}

export interface RaidParticipant {
  userId: string;
  name: string;
  classId: string;
  level: number;
  isReady: boolean;
  damage: number;
}

export interface RaidReward {
  userId: string;
  name: string;
  items: Array<{ itemName: string; rarity: string }>;
  gold: number;
}

export type RaidViewState = 'list' | 'lobby' | 'battle' | 'result';

const DIFFICULTY_COLORS: Record<string, number> = {
  normal: 0x55cc55, hard: 0xffaa00, hell: 0xff4444,
};

const CLASS_ICONS: Record<string, string> = {
  ether_knight: '⚔️', memory_weaver: '🔮', shadow_weaver: '🗡️',
  memory_breaker: '💥', time_guardian: '🛡️', void_wanderer: '🌀',
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class GuildRaidUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private viewState: RaidViewState = 'list';
  private raids: RaidInfo[] = [];
  private currentRaid: RaidInfo | null = null;
  private participants: RaidParticipant[] = [];
  private contentContainer!: Phaser.GameObjects.Container;
  private timerText!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 500;
  private readonly PANEL_H = 420;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(940);
    this.container.setVisible(false);

    this.createPanel();
    this.bindSocketEvents();
  }

  // ═══ 패널 ═══

  private createPanel(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const px = cx - this.PANEL_W / 2;
    const py = cy - this.PANEL_H / 2;

    const dim = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setOrigin(0, 0).setInteractive();
    this.container.add(dim);

    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x1a1a2e, 0.96)
      .setOrigin(0, 0).setStrokeStyle(2, 0xff6644);
    this.container.add(bg);

    const title = this.scene.add.text(px + 12, py + 10, '🐉 길드 레이드', {
      fontSize: '16px', color: '#ff8866', fontStyle: 'bold',
    });
    const closeBtn = this.createButton(px + this.PANEL_W - 40, py + 10, '✕', () => this.hide());
    this.container.add([title, closeBtn]);

    this.timerText = this.scene.add.text(px + this.PANEL_W - 120, py + 12, '', {
      fontSize: '12px', color: '#ffcc44',
    });
    this.container.add(this.timerText);

    this.contentContainer = this.scene.add.container(px, py + 40);
    this.container.add(this.contentContainer);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#5a3a3a',
      padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('raid:update', (data: { raid: RaidInfo; participants: RaidParticipant[] }) => {
      this.currentRaid = data.raid;
      this.participants = data.participants;
      if (this.viewState === 'battle') this.showBattle();
    });

    socket.on('raid:phaseChange', (data: { phase: number }) => {
      if (this.currentRaid) this.currentRaid.phase = data.phase;
      if (this.viewState === 'battle') this.showBattle();
    });

    socket.on('raid:result', (data: { rewards: RaidReward[] }) => {
      this.viewState = 'result';
      this.showResult(data.rewards);
    });

    socket.on('raid:playerJoin', () => this.loadLobby());
    socket.on('raid:playerLeave', () => this.loadLobby());
  }

  // ═══ 레이드 목록 ═══

  public async loadRaidList(): Promise<void> {
    this.viewState = 'list';
    try {
      const resp = await this.net.httpGet('/api/raid');
      this.raids = resp.raids ?? [];
      this.showList();
    } catch (err) {
      console.error('[GuildRaidUI] 목록 로드 실패:', err);
    }
  }

  private showList(): void {
    this.contentContainer.removeAll(true);

    this.raids.forEach((raid, idx) => {
      const y = idx * 60;
      const color = DIFFICULTY_COLORS[raid.difficulty] ?? 0xaaaaaa;
      const bg = this.scene.add.rectangle(16, y, this.PANEL_W - 40, 54, 0x252540, 0.8)
        .setOrigin(0, 0).setStrokeStyle(1, color);
      const name = this.scene.add.text(22, y + 4, `🐉 ${raid.name}`, { fontSize: '12px', color: '#ffffff' });
      const diff = this.scene.add.text(22, y + 22, `난이도: ${raid.difficulty.toUpperCase()} | 보스: ${raid.bossName}`, {
        fontSize: '9px', color: '#aaaaaa',
      });
      const req = this.scene.add.text(22, y + 36, `최소 Lv.${raid.minLevel} | 최대 ${raid.maxPlayers}명`, {
        fontSize: '9px', color: '#888888',
      });
      const enterBtn = this.createButton(this.PANEL_W - 90, y + 12, '입장', () => this.enterRaid(raid.id));

      this.contentContainer.add([bg, name, diff, req, enterBtn]);
    });

    if (this.raids.length === 0) {
      const empty = this.scene.add.text(16, 20, '진행 가능한 레이드가 없습니다', { fontSize: '11px', color: '#666666' });
      this.contentContainer.add(empty);
    }
  }

  // ═══ 로비 ═══

  private async enterRaid(raidId: string): Promise<void> {
    try {
      const resp = await this.net.httpPost(`/api/raid/${raidId}/join`, { userId: this.net.getUserId() });
      this.currentRaid = resp.raid;
      this.participants = resp.participants ?? [];
      this.viewState = 'lobby';
      this.showLobby();
    } catch (err) {
      console.error('[GuildRaidUI] 입장 실패:', err);
    }
  }

  private async loadLobby(): Promise<void> {
    if (!this.currentRaid) return;
    try {
      const resp = await this.net.httpGet(`/api/raid/${this.currentRaid.id}/status`);
      this.participants = resp.participants ?? [];
      this.showLobby();
    } catch (err) {
      console.error('[GuildRaidUI] 로비 갱신 실패:', err);
    }
  }

  private showLobby(): void {
    this.contentContainer.removeAll(true);
    if (!this.currentRaid) return;

    const header = this.scene.add.text(16, 4, `🐉 ${this.currentRaid.name} — 대기실`, {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    });
    this.contentContainer.add(header);

    this.participants.forEach((p, idx) => {
      const y = 30 + idx * 28;
      const icon = this.scene.add.text(16, y, CLASS_ICONS[p.classId] ?? '❓', { fontSize: '12px' });
      const name = this.scene.add.text(34, y, `${p.name} (Lv.${p.level})`, { fontSize: '10px', color: '#ffffff' });
      const ready = this.scene.add.text(200, y, p.isReady ? '✅ 준비' : '⬜ 대기', {
        fontSize: '10px', color: p.isReady ? '#44ff44' : '#888888',
      });
      this.contentContainer.add([icon, name, ready]);
    });

    const readyBtn = this.createButton(16, this.PANEL_H - 100, '✅ 준비', () => this.toggleReady());
    const startBtn = this.createButton(120, this.PANEL_H - 100, '⚔️ 시작', () => this.startRaid());
    const leaveBtn = this.createButton(240, this.PANEL_H - 100, '🚪 나가기', () => this.leaveRaid());
    this.contentContainer.add([readyBtn, startBtn, leaveBtn]);
  }

  // ═══ 전투 ═══

  private showBattle(): void {
    this.contentContainer.removeAll(true);
    if (!this.currentRaid) return;

    const r = this.currentRaid;
    const header = this.scene.add.text(16, 4, `⚔️ ${r.bossName} — 페이즈 ${r.phase}/${r.totalPhases}`, {
      fontSize: '13px', color: '#ff4444', fontStyle: 'bold',
    });
    this.contentContainer.add(header);

    // 보스 HP 바
    const hpRatio = r.bossMaxHp > 0 ? r.bossHp / r.bossMaxHp : 0;
    const barW = this.PANEL_W - 40;
    const hpBg = this.scene.add.rectangle(16, 28, barW, 16, 0x333333).setOrigin(0, 0);
    const hpFill = this.scene.add.rectangle(16, 28, barW * hpRatio, 16, 0xff4444).setOrigin(0, 0);
    const hpText = this.scene.add.text(16 + barW / 2, 30, `${r.bossHp.toLocaleString()} / ${r.bossMaxHp.toLocaleString()}`, {
      fontSize: '10px', color: '#ffffff',
    }).setOrigin(0.5, 0);
    this.contentContainer.add([hpBg, hpFill, hpText]);

    // 타이머
    const mins = Math.floor(r.timeRemaining / 60);
    const secs = r.timeRemaining % 60;
    this.timerText.setText(`⏱️ ${mins}:${secs.toString().padStart(2, '0')}`);

    // 데미지 랭킹
    const sorted = [...this.participants].sort((a, b) => b.damage - a.damage);
    sorted.forEach((p, idx) => {
      const y = 54 + idx * 22;
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      const icon = CLASS_ICONS[p.classId] ?? '❓';
      const text = this.scene.add.text(16, y, `${medal} ${icon} ${p.name}: ${p.damage.toLocaleString()}`, {
        fontSize: '10px', color: '#ffffff',
      });
      this.contentContainer.add(text);
    });
  }

  // ═══ 결과 ═══

  private showResult(rewards: RaidReward[]): void {
    this.contentContainer.removeAll(true);

    const header = this.scene.add.text(16, 4, '🎉 레이드 완료!', {
      fontSize: '14px', color: '#ffcc44', fontStyle: 'bold',
    });
    this.contentContainer.add(header);

    rewards.forEach((r, idx) => {
      const y = 30 + idx * 40;
      const name = this.scene.add.text(16, y, `${r.name}:`, { fontSize: '11px', color: '#ffffff' });
      const gold = this.scene.add.text(120, y, `💰 ${r.gold.toLocaleString()}G`, { fontSize: '10px', color: '#ffcc44' });
      const items = this.scene.add.text(16, y + 16, r.items.map(i => `📦 ${i.itemName}`).join('  '), {
        fontSize: '9px', color: '#aaaaaa',
      });
      this.contentContainer.add([name, gold, items]);
    });

    const closeBtn = this.createButton(16, this.PANEL_H - 90, '확인', () => this.hide());
    this.contentContainer.add(closeBtn);
  }

  // ═══ 액션 ═══

  private async toggleReady(): Promise<void> {
    if (!this.currentRaid) return;
    try {
      await this.net.httpPost(`/api/raid/${this.currentRaid.id}/ready`, { userId: this.net.getUserId() });
    } catch (err) {
      console.error('[GuildRaidUI] 준비 실패:', err);
    }
  }

  private async startRaid(): Promise<void> {
    if (!this.currentRaid) return;
    try {
      await this.net.httpPost(`/api/raid/${this.currentRaid.id}/start`, { userId: this.net.getUserId() });
      this.viewState = 'battle';
    } catch (err) {
      console.error('[GuildRaidUI] 시작 실패:', err);
    }
  }

  private async leaveRaid(): Promise<void> {
    if (!this.currentRaid) return;
    try {
      await this.net.httpPost(`/api/raid/${this.currentRaid.id}/leave`, { userId: this.net.getUserId() });
      this.currentRaid = null;
      this.viewState = 'list';
      this.loadRaidList();
    } catch (err) {
      console.error('[GuildRaidUI] 나가기 실패:', err);
    }
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.loadRaidList(); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public destroy(): void { this.container.destroy(); }
}
