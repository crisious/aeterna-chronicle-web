/**
 * PartyUI — P27-02: 파티 시스템 UI
 *
 * 기능:
 * - 파티 멤버 목록 (이름, HP 바, 역할 표시)
 * - 파티 초대 팝업 (수신/발신)
 * - 파티 찾기 UI (공개 파티 검색/가입)
 * - 파티 전투 동기화 상태 (P27-03)
 * - NetworkManager 연동 (party:invite, party:update 등)
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface PartyMember {
  userId: string;
  name: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  role: 'leader' | 'member';
  combatReady: boolean;
  isOnline: boolean;
}

export interface PartyInvite {
  inviteId: string;
  partyId: string;
  inviterName: string;
  partyName: string;
  memberCount: number;
  expiresAt: number;
}

export interface PartySearchResult {
  partyId: string;
  name: string;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
  minLevel: number;
  description: string;
}

interface MemberSlot {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  classIcon: Phaser.GameObjects.Text;
  levelText: Phaser.GameObjects.Text;
  hpBarBg: Phaser.GameObjects.Rectangle;
  hpBarFill: Phaser.GameObjects.Rectangle;
  mpBarBg: Phaser.GameObjects.Rectangle;
  mpBarFill: Phaser.GameObjects.Rectangle;
  roleIcon: Phaser.GameObjects.Text;
  readyIcon: Phaser.GameObjects.Text;
}

const MAX_PARTY_SIZE = 4;
const CLASS_ICONS: Record<string, string> = {
  ether_knight: '⚔️',
  memory_weaver: '🔮',
  shadow_weaver: '🗡️',
  memory_breaker: '💥',
  time_guardian: '🛡️',
  void_wanderer: '🌀',
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class PartyUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private memberSlots: MemberSlot[] = [];
  private members: PartyMember[] = [];
  private partyId: string | null = null;
  private isLeader = false;

  // 초대 팝업
  private invitePopup: Phaser.GameObjects.Container | null = null;
  private pendingInvites: PartyInvite[] = [];

  // 파티 찾기 패널
  private searchPanel: Phaser.GameObjects.Container | null = null;
  private searchResults: PartySearchResult[] = [];

  // 레이아웃
  private readonly PANEL_X = 10;
  private readonly PANEL_Y = 100;
  private readonly PANEL_W = 220;
  private readonly SLOT_H = 56;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(900);
    this.container.setVisible(false);

    this.createPartyPanel();
    this.bindSocketEvents();
  }

  // ═══ 초기화 ═══

  private createPartyPanel(): void {
    // 패널 배경
    const bg = this.scene.add.rectangle(
      this.PANEL_X, this.PANEL_Y,
      this.PANEL_W, MAX_PARTY_SIZE * this.SLOT_H + 80,
      0x1a1a2e, 0.92,
    ).setOrigin(0, 0).setStrokeStyle(1, 0x4a4a6a);
    this.container.add(bg);

    // 제목
    const title = this.scene.add.text(
      this.PANEL_X + 10, this.PANEL_Y + 8,
      '⚔️ 파티', { fontSize: '14px', color: '#e0e0e0', fontStyle: 'bold' },
    );
    this.container.add(title);

    // 버튼 영역
    const createBtn = this.createButton(this.PANEL_X + 130, this.PANEL_Y + 6, '생성', () => this.createParty());
    const searchBtn = this.createButton(this.PANEL_X + 175, this.PANEL_Y + 6, '찾기', () => this.toggleSearch());
    this.container.add([createBtn, searchBtn]);

    // 멤버 슬롯 4개
    for (let i = 0; i < MAX_PARTY_SIZE; i++) {
      const slotY = this.PANEL_Y + 36 + i * this.SLOT_H;
      const slot = this.createMemberSlot(this.PANEL_X + 6, slotY, i);
      this.memberSlots.push(slot);
    }
  }

  private createMemberSlot(x: number, y: number, _index: number): MemberSlot {
    const slotContainer = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, this.PANEL_W - 12, this.SLOT_H - 4, 0x252540, 0.8)
      .setOrigin(0, 0).setStrokeStyle(1, 0x3a3a5a);
    const roleIcon = this.scene.add.text(6, 4, '', { fontSize: '12px' });
    const classIcon = this.scene.add.text(22, 4, '', { fontSize: '12px' });
    const nameText = this.scene.add.text(40, 4, '빈 슬롯', { fontSize: '11px', color: '#888888' });
    const levelText = this.scene.add.text(40, 20, '', { fontSize: '9px', color: '#aaaaaa' });
    const readyIcon = this.scene.add.text(this.PANEL_W - 30, 4, '', { fontSize: '12px' });

    // HP 바
    const hpBarBg = this.scene.add.rectangle(6, 34, this.PANEL_W - 30, 6, 0x333333).setOrigin(0, 0);
    const hpBarFill = this.scene.add.rectangle(6, 34, 0, 6, 0x44cc44).setOrigin(0, 0);

    // MP 바
    const mpBarBg = this.scene.add.rectangle(6, 42, this.PANEL_W - 30, 4, 0x333333).setOrigin(0, 0);
    const mpBarFill = this.scene.add.rectangle(6, 42, 0, 4, 0x4488ee).setOrigin(0, 0);

    slotContainer.add([bg, roleIcon, classIcon, nameText, levelText, readyIcon, hpBarBg, hpBarFill, mpBarBg, mpBarFill]);
    this.container.add(slotContainer);

    return { container: slotContainer, bg, nameText, classIcon, levelText, hpBarBg, hpBarFill, mpBarBg, mpBarFill, roleIcon, readyIcon };
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#3a5a8a',
      padding: { x: 6, y: 3 },
    }).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ backgroundColor: '#4a6a9a' }));
    btn.on('pointerout', () => btn.setStyle({ backgroundColor: '#3a5a8a' }));
    btn.on('pointerdown', callback);

    return btn;
  }

  // ═══ 소켓 이벤트 바인딩 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('party:update', (data: { partyId: string; members: PartyMember[] }) => {
      this.partyId = data.partyId;
      this.members = data.members;
      this.refreshSlots();
    });

    socket.on('party:invite', (data: PartyInvite) => {
      this.pendingInvites.push(data);
      this.showInvitePopup(data);
    });

    socket.on('party:disbanded', () => {
      this.partyId = null;
      this.members = [];
      this.isLeader = false;
      this.refreshSlots();
    });

    socket.on('party:combat:sync', (data: { members: PartyMember[] }) => {
      this.members = data.members;
      this.refreshSlots();
    });

    socket.on('party:kicked', () => {
      this.partyId = null;
      this.members = [];
      this.isLeader = false;
      this.refreshSlots();
    });
  }

  // ═══ UI 갱신 ═══

  private refreshSlots(): void {
    const myUserId = this.net.getUserId();
    this.isLeader = this.members.some(m => m.userId === myUserId && m.role === 'leader');

    for (let i = 0; i < MAX_PARTY_SIZE; i++) {
      const slot = this.memberSlots[i];
      const member = this.members[i];

      if (member) {
        const icon = CLASS_ICONS[member.classId] ?? '❓';
        slot.classIcon.setText(icon);
        slot.nameText.setText(member.name).setColor(member.isOnline ? '#e0e0e0' : '#666666');
        slot.levelText.setText(`Lv.${member.level}`);
        slot.roleIcon.setText(member.role === 'leader' ? '👑' : '');
        slot.readyIcon.setText(member.combatReady ? '✅' : '');

        // HP 바
        const hpRatio = member.maxHp > 0 ? member.hp / member.maxHp : 0;
        const barWidth = this.PANEL_W - 30;
        slot.hpBarFill.setSize(barWidth * hpRatio, 6);
        slot.hpBarFill.setFillStyle(hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.2 ? 0xcccc44 : 0xcc4444);

        // MP 바
        const mpRatio = member.maxMp > 0 ? member.mp / member.maxMp : 0;
        slot.mpBarFill.setSize(barWidth * mpRatio, 4);

        slot.bg.setFillStyle(0x252540, 0.8);
      } else {
        slot.classIcon.setText('');
        slot.nameText.setText('빈 슬롯').setColor('#555555');
        slot.levelText.setText('');
        slot.roleIcon.setText('');
        slot.readyIcon.setText('');
        slot.hpBarFill.setSize(0, 6);
        slot.mpBarFill.setSize(0, 4);
        slot.bg.setFillStyle(0x1a1a30, 0.5);
      }
    }
  }

  // ═══ 파티 액션 ═══

  private async createParty(): Promise<void> {
    try {
      const resp = await this.net.httpPost('/api/party/create', { leaderId: this.net.getUserId() });
      if (resp.id) {
        this.partyId = resp.id;
      }
    } catch (err) {
      console.error('[PartyUI] 파티 생성 실패:', err);
    }
  }

  public async invitePlayer(targetUserId: string): Promise<void> {
    if (!this.partyId) return;
    try {
      await this.net.httpPost('/api/party/invite', {
        partyId: this.partyId,
        inviterId: this.net.getUserId(),
        targetUserId,
      });
    } catch (err) {
      console.error('[PartyUI] 초대 실패:', err);
    }
  }

  private async respondInvite(inviteId: string, accept: boolean): Promise<void> {
    const endpoint = accept ? '/api/party/invite/accept' : '/api/party/invite/reject';
    try {
      await this.net.httpPost(endpoint, { inviteId, userId: this.net.getUserId() });
      this.pendingInvites = this.pendingInvites.filter(i => i.inviteId !== inviteId);
      this.hideInvitePopup();
    } catch (err) {
      console.error('[PartyUI] 초대 응답 실패:', err);
    }
  }

  public async leaveParty(): Promise<void> {
    if (!this.partyId) return;
    try {
      await this.net.httpPost('/api/party/leave', {
        partyId: this.partyId,
        userId: this.net.getUserId(),
      });
      this.partyId = null;
      this.members = [];
      this.refreshSlots();
    } catch (err) {
      console.error('[PartyUI] 파티 탈퇴 실패:', err);
    }
  }

  public async toggleCombatReady(): Promise<void> {
    if (!this.partyId) return;
    const me = this.members.find(m => m.userId === this.net.getUserId());
    const ready = me ? !me.combatReady : true;

    try {
      await this.net.httpPost(`/api/party/${this.partyId}/ready`, {
        userId: this.net.getUserId(),
        ready,
      });
    } catch (err) {
      console.error('[PartyUI] 준비 상태 변경 실패:', err);
    }
  }

  // ═══ 초대 팝업 ═══

  private showInvitePopup(invite: PartyInvite): void {
    this.hideInvitePopup();
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.invitePopup = this.scene.add.container(cx - 140, cy - 60);
    this.invitePopup.setDepth(950);

    const bg = this.scene.add.rectangle(0, 0, 280, 120, 0x1a1a2e, 0.95)
      .setOrigin(0, 0).setStrokeStyle(2, 0x4488ff);
    const title = this.scene.add.text(10, 10, '⚔️ 파티 초대', { fontSize: '14px', color: '#ffffff', fontStyle: 'bold' });
    const desc = this.scene.add.text(10, 35, `${invite.inviterName}님이 '${invite.partyName}'\n파티에 초대했습니다 (${invite.memberCount}/4)`, {
      fontSize: '11px', color: '#cccccc', wordWrap: { width: 260 },
    });

    const acceptBtn = this.createButton(40, 85, '수락', () => this.respondInvite(invite.inviteId, true));
    const rejectBtn = this.createButton(160, 85, '거절', () => this.respondInvite(invite.inviteId, false));

    this.invitePopup.add([bg, title, desc, acceptBtn, rejectBtn]);
    this.scene.add.existing(this.invitePopup);

    // 만료 타이머
    this.scene.time.delayedCall(30000, () => this.hideInvitePopup());
  }

  private hideInvitePopup(): void {
    if (this.invitePopup) {
      this.invitePopup.destroy();
      this.invitePopup = null;
    }
  }

  // ═══ 파티 찾기 ═══

  private toggleSearch(): void {
    if (this.searchPanel) {
      this.searchPanel.destroy();
      this.searchPanel = null;
      return;
    }
    this.openSearchPanel();
  }

  private async openSearchPanel(): Promise<void> {
    const px = this.PANEL_X + this.PANEL_W + 10;
    const py = this.PANEL_Y;

    this.searchPanel = this.scene.add.container(px, py);
    this.searchPanel.setDepth(910);

    const bg = this.scene.add.rectangle(0, 0, 280, 300, 0x1a1a2e, 0.95)
      .setOrigin(0, 0).setStrokeStyle(1, 0x4a4a6a);
    const title = this.scene.add.text(10, 8, '🔍 파티 찾기', { fontSize: '13px', color: '#e0e0e0', fontStyle: 'bold' });
    this.searchPanel.add([bg, title]);

    try {
      const resp = await this.net.httpGet('/api/party/search');
      this.searchResults = resp.parties ?? [];

      this.searchResults.forEach((result, idx) => {
        const ry = 36 + idx * 44;
        const itemBg = this.scene.add.rectangle(6, ry, 268, 40, 0x252540, 0.8)
          .setOrigin(0, 0).setStrokeStyle(1, 0x3a3a5a);
        const name = this.scene.add.text(12, ry + 4, result.name, { fontSize: '11px', color: '#ffffff' });
        const info = this.scene.add.text(12, ry + 20, `${result.leaderName} | ${result.memberCount}/${result.maxMembers}`,
          { fontSize: '9px', color: '#aaaaaa' });
        const joinBtn = this.createButton(220, ry + 8, '가입', () => this.joinParty(result.partyId));

        this.searchPanel!.add([itemBg, name, info, joinBtn]);
      });

      if (this.searchResults.length === 0) {
        const empty = this.scene.add.text(10, 40, '공개 파티가 없습니다', { fontSize: '11px', color: '#888888' });
        this.searchPanel.add(empty);
      }
    } catch (err) {
      console.error('[PartyUI] 파티 검색 실패:', err);
    }

    this.container.add(this.searchPanel);
  }

  private async joinParty(partyId: string): Promise<void> {
    try {
      await this.net.httpPost('/api/party/join', { partyId, userId: this.net.getUserId() });
      if (this.searchPanel) {
        this.searchPanel.destroy();
        this.searchPanel = null;
      }
    } catch (err) {
      console.error('[PartyUI] 파티 가입 실패:', err);
    }
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.setVisible(!this.container.visible); }
  public isVisible(): boolean { return this.container.visible; }
  public getPartyId(): string | null { return this.partyId; }
  public getMembers(): PartyMember[] { return this.members; }
  public isInParty(): boolean { return this.partyId !== null; }

  public destroy(): void {
    this.hideInvitePopup();
    if (this.searchPanel) this.searchPanel.destroy();
    this.container.destroy();
  }
}
