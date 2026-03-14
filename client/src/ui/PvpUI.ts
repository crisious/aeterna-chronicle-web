/**
 * PvpUI — P27-12: PvP 매칭 UI
 *
 * 기능:
 * - 매칭 큐 등록/취소
 * - 매칭 진행 타이머
 * - 대전 결과 (승리/패배, 레이팅 변동)
 * - 시즌 정보 + 티어 표시
 * - pvpRoutes + pvpSocketHandler + matchmakingSocketHandler 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface PvpRating {
  rating: number;
  tier: string;
  rank: number;
  wins: number;
  losses: number;
  winRate: number;
  season: string;
}

export interface PvpMatchResult {
  matchId: string;
  opponentName: string;
  opponentClass: string;
  result: 'win' | 'lose' | 'draw';
  ratingChange: number;
  newRating: number;
  duration: number;
}

export type PvpViewState = 'idle' | 'queued' | 'matched' | 'result';

const TIER_COLORS: Record<string, number> = {
  bronze: 0xcd7f32,
  silver: 0xc0c0c0,
  gold: 0xffd700,
  platinum: 0x44ddbb,
  diamond: 0x88bbff,
  master: 0xff6644,
  challenger: 0xff4488,
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class PvpUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private viewState: PvpViewState = 'idle';
  private myRating: PvpRating | null = null;
  private queueTimer = 0;
  private queueTimerEvent: Phaser.Time.TimerEvent | null = null;
  private lastResult: PvpMatchResult | null = null;

  private contentContainer!: Phaser.GameObjects.Container;
  private statusText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 400;
  private readonly PANEL_H = 350;

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
      .setOrigin(0, 0).setStrokeStyle(2, 0xff4488);
    this.container.add(bg);

    const title = this.scene.add.text(px + 12, py + 10, '⚔️ PvP 대전', {
      fontSize: '16px', color: '#ff6688', fontStyle: 'bold',
    });
    const closeBtn = this.createButton(px + this.PANEL_W - 40, py + 10, '✕', () => this.hide());
    this.container.add([title, closeBtn]);

    this.statusText = this.scene.add.text(cx, py + 36, '', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5);
    this.container.add(this.statusText);

    this.timerText = this.scene.add.text(cx, py + 54, '', {
      fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);
    this.container.add(this.timerText);

    this.contentContainer = this.scene.add.container(px, py + 75);
    this.container.add(this.contentContainer);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#5a3a5a',
      padding: { x: 10, y: 5 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('pvp:matched', (data: { matchId: string; opponentName: string }) => {
      this.viewState = 'matched';
      this.statusText.setText(`대전 상대: ${data.opponentName}`).setColor('#ffcc44');
      this.stopQueueTimer();
    });

    socket.on('pvp:result', (data: PvpMatchResult) => {
      this.lastResult = data;
      this.viewState = 'result';
      this.showResult();
    });

    socket.on('matchmaking:timeout', () => {
      this.viewState = 'idle';
      this.stopQueueTimer();
      this.statusText.setText('매칭 타임아웃 — 다시 시도하세요').setColor('#ff4444');
      this.showIdle();
    });
  }

  // ═══ 뷰 관리 ═══

  public async loadMyRating(): Promise<void> {
    try {
      const resp = await this.net.httpGet(`/api/pvp/ratings/${this.net.getUserId()}`);
      this.myRating = resp.data ?? resp;
      this.showIdle();
    } catch (err) {
      console.error('[PvpUI] 레이팅 로드 실패:', err);
    }
  }

  private showIdle(): void {
    this.contentContainer.removeAll(true);

    if (this.myRating) {
      const r = this.myRating;
      const tierColor = TIER_COLORS[r.tier.toLowerCase()] ?? 0xaaaaaa;
      const tierHex = `#${tierColor.toString(16).padStart(6, '0')}`;

      const lines = [
        { text: `🏆 ${r.tier.toUpperCase()}`, color: tierHex, size: '18px' },
        { text: `레이팅: ${r.rating} (#${r.rank})`, color: '#ffffff', size: '12px' },
        { text: `전적: ${r.wins}승 ${r.losses}패 (${(r.winRate * 100).toFixed(1)}%)`, color: '#aaaaaa', size: '11px' },
        { text: `시즌: ${r.season}`, color: '#888888', size: '10px' },
      ];

      lines.forEach((line, i) => {
        const t = this.scene.add.text(this.PANEL_W / 2, i * 26, line.text, {
          fontSize: line.size, color: line.color, fontStyle: i === 0 ? 'bold' : 'normal',
        }).setOrigin(0.5, 0);
        this.contentContainer.add(t);
      });
    }

    // 매칭 버튼
    const queueBtn = this.createButton(
      this.PANEL_W / 2 - 60, 140,
      '⚔️ 매칭 시작',
      () => this.startQueue(),
    );
    this.contentContainer.add(queueBtn);

    this.statusText.setText('대전 준비 완료').setColor('#aaaaaa');
    this.timerText.setText('');
  }

  // ═══ 매칭 큐 ═══

  private async startQueue(): Promise<void> {
    try {
      const socket = this.net.getSocket();
      await this.net.httpPost('/api/pvp/queue', {
        userId: this.net.getUserId(),
        characterId: this.net.getCharacterId(),
        socketId: socket?.id ?? '',
      });

      this.viewState = 'queued';
      this.statusText.setText('매칭 중...').setColor('#88ccff');
      this.startQueueTimer();

      this.contentContainer.removeAll(true);
      const cancelBtn = this.createButton(this.PANEL_W / 2 - 50, 60, '❌ 취소', () => this.cancelQueue());
      this.contentContainer.add(cancelBtn);
    } catch (err) {
      console.error('[PvpUI] 큐 등록 실패:', err);
      this.statusText.setText('매칭 등록 실패').setColor('#ff4444');
    }
  }

  private async cancelQueue(): Promise<void> {
    try {
      await this.net.httpDelete('/api/pvp/queue');
      this.viewState = 'idle';
      this.stopQueueTimer();
      this.statusText.setText('매칭 취소됨').setColor('#aaaaaa');
      this.showIdle();
    } catch (err) {
      console.error('[PvpUI] 큐 취소 실패:', err);
    }
  }

  private startQueueTimer(): void {
    this.queueTimer = 0;
    this.queueTimerEvent = this.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        this.queueTimer++;
        const mins = Math.floor(this.queueTimer / 60);
        const secs = this.queueTimer % 60;
        this.timerText.setText(`⏱️ ${mins}:${secs.toString().padStart(2, '0')}`);
      },
    });
  }

  private stopQueueTimer(): void {
    if (this.queueTimerEvent) {
      this.queueTimerEvent.destroy();
      this.queueTimerEvent = null;
    }
    this.timerText.setText('');
  }

  // ═══ 결과 ═══

  private showResult(): void {
    this.contentContainer.removeAll(true);
    if (!this.lastResult) return;

    const r = this.lastResult;
    const isWin = r.result === 'win';
    const resultColor = isWin ? '#44ff44' : r.result === 'draw' ? '#ffcc44' : '#ff4444';
    const resultLabel = isWin ? '승리!' : r.result === 'draw' ? '무승부' : '패배';

    const resultText = this.scene.add.text(this.PANEL_W / 2, 10, resultLabel, {
      fontSize: '24px', color: resultColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    const opponent = this.scene.add.text(this.PANEL_W / 2, 50, `상대: ${r.opponentName}`, {
      fontSize: '12px', color: '#ffffff',
    }).setOrigin(0.5);

    const ratingPrefix = r.ratingChange >= 0 ? '+' : '';
    const ratingChange = this.scene.add.text(this.PANEL_W / 2, 75,
      `레이팅: ${r.newRating} (${ratingPrefix}${r.ratingChange})`, {
        fontSize: '14px', color: r.ratingChange >= 0 ? '#44ff44' : '#ff4444',
      }).setOrigin(0.5);

    const duration = this.scene.add.text(this.PANEL_W / 2, 100,
      `전투 시간: ${Math.floor(r.duration / 60)}분 ${r.duration % 60}초`, {
        fontSize: '10px', color: '#aaaaaa',
      }).setOrigin(0.5);

    const okBtn = this.createButton(this.PANEL_W / 2 - 30, 140, '확인', () => {
      this.viewState = 'idle';
      this.loadMyRating();
    });

    this.contentContainer.add([resultText, opponent, ratingChange, duration, okBtn]);
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.loadMyRating(); }
  public hide(): void { this.container.setVisible(false); this.stopQueueTimer(); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public destroy(): void { this.stopQueueTimer(); this.container.destroy(); }
}
