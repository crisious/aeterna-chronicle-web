/**
 * GuildUI — P27-10: 길드 UI
 *
 * 기능:
 * - 길드 목록/검색/가입/생성
 * - 길드 정보 (공지, 레벨, 경험치)
 * - 길드원 목록 + 직급 관리
 * - 길드 채팅 (ChatUI 길드 탭과 연동)
 * - 길드 스킬/버프 표시
 * - guildRoutes + guildSocketHandler 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface GuildInfo {
  id: string;
  name: string;
  tag: string;
  leaderName: string;
  level: number;
  xp: number;
  maxXp: number;
  memberCount: number;
  maxMembers: number;
  notice: string;
  createdAt: number;
}

export interface GuildMember {
  userId: string;
  name: string;
  classId: string;
  level: number;
  role: 'master' | 'officer' | 'member';
  isOnline: boolean;
  contribution: number;
  joinedAt: number;
}

export interface GuildSearchResult {
  id: string;
  name: string;
  tag: string;
  level: number;
  memberCount: number;
  maxMembers: number;
  leaderName: string;
}

export interface GuildSkill {
  id: string;
  name: string;
  level: number;
  maxLevel: number;
  description: string;
  cost: number;
}

export type GuildTab = 'info' | 'members' | 'skills' | 'search';

const ROLE_LABELS: Record<string, string> = {
  master: '👑 길드장',
  officer: '⭐ 부길장',
  member: '멤버',
};

const CLASS_ICONS: Record<string, string> = {
  ether_knight: '⚔️', memory_weaver: '🔮', shadow_weaver: '🗡️',
  memory_breaker: '💥', time_guardian: '🛡️', void_wanderer: '🌀',
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class GuildUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private activeTab: GuildTab = 'info';
  private guildInfo: GuildInfo | null = null;
  private members: GuildMember[] = [];
  private skills: GuildSkill[] = [];
  private searchResults: GuildSearchResult[] = [];
  private isInGuild = false;

  private contentContainer!: Phaser.GameObjects.Container;

  private readonly PANEL_W = 540;
  private readonly PANEL_H = 440;

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
      .setOrigin(0, 0).setStrokeStyle(2, 0x55cc55);
    this.container.add(bg);

    const title = this.scene.add.text(px + 12, py + 10, '🏰 길드', {
      fontSize: '16px', color: '#88ff88', fontStyle: 'bold',
    });
    const closeBtn = this.createButton(px + this.PANEL_W - 40, py + 10, '✕', () => this.hide());
    this.container.add([title, closeBtn]);

    // 탭
    const tabs: Array<{ label: string; tab: GuildTab }> = [
      { label: '📋 정보', tab: 'info' },
      { label: '👥 멤버', tab: 'members' },
      { label: '⚡ 스킬', tab: 'skills' },
      { label: '🔍 찾기', tab: 'search' },
    ];
    tabs.forEach((t, i) => {
      const btn = this.createButton(px + 12 + i * 80, py + 36, t.label, () => this.switchTab(t.tab));
      this.container.add(btn);
    });

    this.contentContainer = this.scene.add.container(px, py + 65);
    this.container.add(this.contentContainer);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#3a5a4a',
      padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('guild:update', (data: GuildInfo) => {
      this.guildInfo = data;
      if (this.activeTab === 'info') this.showInfo();
    });

    socket.on('guild:memberJoin', () => this.loadMembers());
    socket.on('guild:memberLeave', () => this.loadMembers());
    socket.on('guild:chat', () => { /* ChatUI가 처리 */ });
  }

  // ═══ 탭 전환 ═══

  private switchTab(tab: GuildTab): void {
    this.activeTab = tab;
    switch (tab) {
      case 'info': this.loadGuildInfo(); break;
      case 'members': this.loadMembers(); break;
      case 'skills': this.loadSkills(); break;
      case 'search': this.loadSearch(); break;
    }
  }

  // ═══ 정보 탭 ═══

  private async loadGuildInfo(): Promise<void> {
    try {
      // 내 길드 정보 가져오기
      const resp = await this.net.httpGet(`/api/guild/my?userId=${this.net.getUserId()}`);
      if (resp.guild) {
        this.guildInfo = resp.guild;
        this.isInGuild = true;
        this.showInfo();
      } else {
        this.isInGuild = false;
        this.showNoGuild();
      }
    } catch {
      this.isInGuild = false;
      this.showNoGuild();
    }
  }

  private showInfo(): void {
    this.contentContainer.removeAll(true);
    if (!this.guildInfo) return;
    const g = this.guildInfo;

    const lines = [
      `이름: ${g.name} [${g.tag}]`,
      `길드장: ${g.leaderName}`,
      `레벨: ${g.level}  (${g.xp}/${g.maxXp} XP)`,
      `인원: ${g.memberCount}/${g.maxMembers}`,
      ``,
      `📢 공지사항`,
      g.notice || '공지 없음',
    ];

    lines.forEach((line, i) => {
      const color = i === 5 ? '#ffcc44' : '#cccccc';
      const text = this.scene.add.text(16, i * 18, line, { fontSize: '11px', color, wordWrap: { width: this.PANEL_W - 40 } });
      this.contentContainer.add(text);
    });

    // XP 바
    const barY = 140;
    const barW = this.PANEL_W - 40;
    const xpRatio = g.maxXp > 0 ? g.xp / g.maxXp : 0;
    const xpBg = this.scene.add.rectangle(16, barY, barW, 8, 0x333333).setOrigin(0, 0);
    const xpFill = this.scene.add.rectangle(16, barY, barW * xpRatio, 8, 0x55cc55).setOrigin(0, 0);
    this.contentContainer.add([xpBg, xpFill]);

    // 탈퇴 버튼
    const leaveBtn = this.createButton(16, 170, '🚪 길드 탈퇴', () => this.leaveGuild());
    this.contentContainer.add(leaveBtn);
  }

  private showNoGuild(): void {
    this.contentContainer.removeAll(true);
    const msg = this.scene.add.text(16, 20, '소속된 길드가 없습니다.\n길드 찾기 탭에서 가입하거나 새로 생성하세요.', {
      fontSize: '12px', color: '#888888', wordWrap: { width: this.PANEL_W - 40 },
    });
    const createBtn = this.createButton(16, 80, '🏰 길드 생성', () => this.createGuild());
    this.contentContainer.add([msg, createBtn]);
  }

  // ═══ 멤버 탭 ═══

  private async loadMembers(): Promise<void> {
    if (!this.guildInfo) return;
    try {
      const resp = await this.net.httpGet(`/api/guild/${this.guildInfo.id}/members`);
      this.members = resp.members ?? [];
      this.showMembers();
    } catch (err) {
      console.error('[GuildUI] 멤버 로드 실패:', err);
    }
  }

  private showMembers(): void {
    this.contentContainer.removeAll(true);

    // 정렬: master > officer > member, 온라인 우선
    const sorted = [...this.members].sort((a, b) => {
      const rolePriority = { master: 0, officer: 1, member: 2 };
      const rp = (rolePriority[a.role] ?? 2) - (rolePriority[b.role] ?? 2);
      if (rp !== 0) return rp;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    sorted.forEach((member, idx) => {
      const y = idx * 24;
      const dot = this.scene.add.text(16, y + 2, member.isOnline ? '🟢' : '⚫', { fontSize: '8px' });
      const icon = this.scene.add.text(30, y + 2, CLASS_ICONS[member.classId] ?? '❓', { fontSize: '10px' });
      const name = this.scene.add.text(46, y + 2, member.name, {
        fontSize: '10px', color: member.isOnline ? '#ffffff' : '#666666',
      });
      const level = this.scene.add.text(150, y + 2, `Lv.${member.level}`, { fontSize: '9px', color: '#aaaaaa' });
      const role = this.scene.add.text(200, y + 2, ROLE_LABELS[member.role] ?? '', { fontSize: '9px', color: '#88ff88' });
      const contrib = this.scene.add.text(300, y + 2, `기여: ${member.contribution}`, { fontSize: '9px', color: '#aaaaaa' });

      this.contentContainer.add([dot, icon, name, level, role, contrib]);
    });
  }

  // ═══ 스킬 탭 ═══

  private async loadSkills(): Promise<void> {
    if (!this.guildInfo) return;
    try {
      const resp = await this.net.httpGet(`/api/guild/${this.guildInfo.id}/skills`);
      this.skills = resp.skills ?? [];
      this.showSkills();
    } catch (err) {
      console.error('[GuildUI] 스킬 로드 실패:', err);
    }
  }

  private showSkills(): void {
    this.contentContainer.removeAll(true);

    this.skills.forEach((skill, idx) => {
      const y = idx * 50;
      const bg = this.scene.add.rectangle(16, y, this.PANEL_W - 40, 44, 0x252540, 0.8)
        .setOrigin(0, 0).setStrokeStyle(1, 0x3a5a4a);
      const name = this.scene.add.text(22, y + 4, `⚡ ${skill.name} (Lv.${skill.level}/${skill.maxLevel})`, {
        fontSize: '11px', color: '#88ff88',
      });
      const desc = this.scene.add.text(22, y + 20, skill.description, { fontSize: '9px', color: '#aaaaaa' });

      this.contentContainer.add([bg, name, desc]);

      if (skill.level < skill.maxLevel) {
        const upgradeBtn = this.createButton(this.PANEL_W - 100, y + 8, `업그레이드 (${skill.cost})`, () => this.upgradeSkill(skill.id));
        this.contentContainer.add(upgradeBtn);
      }
    });
  }

  // ═══ 검색 탭 ═══

  private async loadSearch(): Promise<void> {
    try {
      const resp = await this.net.httpGet('/api/guild?page=1&limit=15');
      this.searchResults = resp.guilds ?? [];
      this.showSearch();
    } catch (err) {
      console.error('[GuildUI] 검색 실패:', err);
    }
  }

  private showSearch(): void {
    this.contentContainer.removeAll(true);

    this.searchResults.forEach((guild, idx) => {
      const y = idx * 30;
      const bg = this.scene.add.rectangle(16, y, this.PANEL_W - 40, 26, 0x252540, 0.8)
        .setOrigin(0, 0);
      const name = this.scene.add.text(22, y + 3, `[${guild.tag}] ${guild.name}`, {
        fontSize: '10px', color: '#ffffff',
      });
      const info = this.scene.add.text(250, y + 3, `Lv.${guild.level} | ${guild.memberCount}/${guild.maxMembers}`, {
        fontSize: '9px', color: '#aaaaaa',
      });
      const joinBtn = this.createButton(this.PANEL_W - 80, y + 2, '가입', () => this.joinGuild(guild.id));

      this.contentContainer.add([bg, name, info, joinBtn]);
    });

    if (this.searchResults.length === 0) {
      const empty = this.scene.add.text(16, 10, '길드가 없습니다', { fontSize: '11px', color: '#666666' });
      this.contentContainer.add(empty);
    }
  }

  // ═══ 액션 ═══

  private async createGuild(): Promise<void> {
    try {
      await this.net.httpPost('/api/guild', {
        name: '새 길드', tag: 'NEW', leaderId: this.net.getUserId(),
      });
      this.loadGuildInfo();
    } catch (err) {
      console.error('[GuildUI] 생성 실패:', err);
    }
  }

  private async joinGuild(guildId: string): Promise<void> {
    try {
      await this.net.httpPost(`/api/guild/${guildId}/join`, { userId: this.net.getUserId() });
      this.switchTab('info');
    } catch (err) {
      console.error('[GuildUI] 가입 실패:', err);
    }
  }

  private async leaveGuild(): Promise<void> {
    if (!this.guildInfo) return;
    try {
      await this.net.httpPost(`/api/guild/${this.guildInfo.id}/leave`, { userId: this.net.getUserId() });
      this.guildInfo = null;
      this.isInGuild = false;
      this.showNoGuild();
    } catch (err) {
      console.error('[GuildUI] 탈퇴 실패:', err);
    }
  }

  private async upgradeSkill(skillId: string): Promise<void> {
    if (!this.guildInfo) return;
    try {
      await this.net.httpPost(`/api/guild/${this.guildInfo.id}/skills/${skillId}/upgrade`, {});
      this.loadSkills();
    } catch (err) {
      console.error('[GuildUI] 스킬 업그레이드 실패:', err);
    }
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.switchTab('info'); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public destroy(): void { this.container.destroy(); }
}
