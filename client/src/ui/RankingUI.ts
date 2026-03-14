/**
 * RankingUI — P27-13: 랭킹 UI
 *
 * 기능:
 * - 전투력/레벨/PvP/길드 랭킹 탭
 * - Top 100 + 내 순위
 * - 시즌별 필터
 * - rankingRoutes 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export type RankingCategory = 'power' | 'level' | 'pvp' | 'guild';

export interface RankingEntry {
  rank: number;
  userId: string;
  name: string;
  classId: string;
  level: number;
  value: number;       // 전투력, 레벨, 레이팅, 길드 레벨 등
  guildName?: string;
  isMe: boolean;
}

const CATEGORY_LABELS: Record<RankingCategory, string> = {
  power: '⚔️ 전투력',
  level: '📊 레벨',
  pvp: '🏆 PvP',
  guild: '🏰 길드',
};

const CLASS_ICONS: Record<string, string> = {
  ether_knight: '⚔️', memory_weaver: '🔮', shadow_weaver: '🗡️',
  memory_breaker: '💥', time_guardian: '🛡️', void_wanderer: '🌀',
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class RankingUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private activeCategory: RankingCategory = 'power';
  private entries: RankingEntry[] = [];
  private myRank: RankingEntry | null = null;
  private contentContainer!: Phaser.GameObjects.Container;
  private myRankContainer!: Phaser.GameObjects.Container;

  private readonly PANEL_W = 480;
  private readonly PANEL_H = 460;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(940);
    this.container.setVisible(false);

    this.createPanel();
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
      .setOrigin(0, 0).setStrokeStyle(2, 0xffaa00);
    this.container.add(bg);

    const title = this.scene.add.text(px + 12, py + 10, '🏆 랭킹', {
      fontSize: '16px', color: '#ffcc44', fontStyle: 'bold',
    });
    const closeBtn = this.createButton(px + this.PANEL_W - 40, py + 10, '✕', () => this.hide());
    this.container.add([title, closeBtn]);

    // 카테고리 탭
    const categories: RankingCategory[] = ['power', 'level', 'pvp', 'guild'];
    categories.forEach((cat, i) => {
      const btn = this.createButton(px + 12 + i * 100, py + 36, CATEGORY_LABELS[cat],
        () => this.switchCategory(cat));
      this.container.add(btn);
    });

    // 헤더
    const header = this.scene.add.text(px + 16, py + 64,
      '순위    이름                     클래스    레벨    수치', {
        fontSize: '9px', color: '#888888',
      });
    this.container.add(header);

    this.contentContainer = this.scene.add.container(px, py + 80);
    this.container.add(this.contentContainer);

    // 내 순위 영역
    this.myRankContainer = this.scene.add.container(px, py + this.PANEL_H - 40);
    this.container.add(this.myRankContainer);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '10px', color: '#ffffff', backgroundColor: '#3a4a5a',
      padding: { x: 6, y: 3 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 카테고리 전환 ═══

  private switchCategory(cat: RankingCategory): void {
    this.activeCategory = cat;
    this.loadRanking();
  }

  // ═══ 데이터 로드 ═══

  private async loadRanking(): Promise<void> {
    try {
      const [topResp, meResp] = await Promise.all([
        this.net.httpGet(`/api/ranking/${this.activeCategory}?limit=100`),
        this.net.httpGet(`/api/ranking/${this.activeCategory}/me?userId=${this.net.getUserId()}`),
      ]);

      this.entries = (topResp.data?.entries ?? []).map((e: RankingEntry) => ({
        ...e,
        isMe: e.userId === this.net.getUserId(),
      }));

      this.myRank = meResp.data?.entry ?? null;
      this.refreshDisplay();
    } catch (err) {
      console.error('[RankingUI] 로드 실패:', err);
    }
  }

  // ═══ 디스플레이 ═══

  private refreshDisplay(): void {
    this.contentContainer.removeAll(true);
    this.myRankContainer.removeAll(true);

    // 상위 표시 (스크롤 가능 — 여기서는 상위 20개)
    const visible = this.entries.slice(0, 20);

    visible.forEach((entry, idx) => {
      const y = idx * 18;
      const medal = entry.rank <= 3
        ? ['🥇', '🥈', '🥉'][entry.rank - 1]
        : `${entry.rank}.`;

      const bgColor = entry.isMe ? 0x3a4a6a : (idx % 2 === 0 ? 0x252540 : 0x202038);
      const bg = this.scene.add.rectangle(16, y, this.PANEL_W - 40, 16, bgColor, 0.8).setOrigin(0, 0);

      const rankText = this.scene.add.text(20, y + 1, `${medal}`, { fontSize: '9px', color: '#ffffff' });
      const name = this.scene.add.text(60, y + 1, entry.name, {
        fontSize: '9px', color: entry.isMe ? '#88ccff' : '#ffffff',
      });
      const classIcon = this.scene.add.text(200, y + 1, CLASS_ICONS[entry.classId] ?? '', { fontSize: '9px' });
      const level = this.scene.add.text(240, y + 1, `Lv.${entry.level}`, { fontSize: '9px', color: '#aaaaaa' });
      const value = this.scene.add.text(310, y + 1, this.formatValue(entry.value), {
        fontSize: '9px', color: '#ffcc44',
      });
      const guild = this.scene.add.text(400, y + 1, entry.guildName ?? '', { fontSize: '8px', color: '#88ff88' });

      this.contentContainer.add([bg, rankText, name, classIcon, level, value, guild]);
    });

    // 내 순위
    if (this.myRank) {
      const myBg = this.scene.add.rectangle(16, 0, this.PANEL_W - 40, 20, 0x3a4a6a, 0.9).setOrigin(0, 0);
      const myText = this.scene.add.text(20, 2,
        `📍 내 순위: #${this.myRank.rank} | ${this.formatValue(this.myRank.value)}`, {
          fontSize: '10px', color: '#88ccff', fontStyle: 'bold',
        });
      this.myRankContainer.add([myBg, myText]);
    }
  }

  private formatValue(value: number): string {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toLocaleString();
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.switchCategory('power'); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public destroy(): void { this.container.destroy(); }
}
