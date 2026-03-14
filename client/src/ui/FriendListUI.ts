/**
 * FriendListUI — P27-09: 친구 목록 UI
 *
 * 기능:
 * - 친구 목록 (온라인/오프라인 분리)
 * - 친구 추가/삭제/차단
 * - 온라인 상태 실시간 표시
 * - 우클릭 컨텍스트 메뉴 (귓속말, 거래, 파티 초대)
 * - socialRoutes /api/friends/* + socialSocketHandler 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface FriendData {
  userId: string;
  name: string;
  classId: string;
  level: number;
  isOnline: boolean;
  lastSeen: number;
  status: string; // 'idle' | 'in_dungeon' | 'in_pvp' | 'afk'
}

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromName: string;
  timestamp: number;
}

interface FriendRow {
  container: Phaser.GameObjects.Container;
  friend: FriendData;
}

const CLASS_ICONS: Record<string, string> = {
  ether_knight: '⚔️',
  memory_weaver: '🔮',
  shadow_weaver: '🗡️',
  memory_breaker: '💥',
  time_guardian: '🛡️',
  void_wanderer: '🌀',
};

const STATUS_LABELS: Record<string, string> = {
  idle: '',
  in_dungeon: '던전',
  in_pvp: 'PvP',
  afk: '자리비움',
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class FriendListUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private friends: FriendData[] = [];
  private pendingRequests: FriendRequest[] = [];
  private friendRows: FriendRow[] = [];
  private contextMenu: Phaser.GameObjects.Container | null = null;

  private contentContainer!: Phaser.GameObjects.Container;
  private requestContainer!: Phaser.GameObjects.Container;
  private countText!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 240;
  private readonly PANEL_H = 400;

  // 콜백 (GameHUD에서 주입)
  public onWhisper?: (userId: string) => void;
  public onTrade?: (userId: string) => void;
  public onPartyInvite?: (userId: string) => void;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(920);
    this.container.setVisible(false);

    this.createPanel();
    this.bindSocketEvents();
  }

  // ═══ 패널 생성 ═══

  private createPanel(): void {
    const px = this.scene.scale.width - this.PANEL_W - 10;
    const py = 80;

    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x1a1a2e, 0.94)
      .setOrigin(0, 0).setStrokeStyle(1, 0x4a4a6a);
    this.container.add(bg);

    const title = this.scene.add.text(px + 10, py + 8, '👥 친구 목록', {
      fontSize: '13px', color: '#88ccff', fontStyle: 'bold',
    });
    this.container.add(title);

    this.countText = this.scene.add.text(px + this.PANEL_W - 60, py + 10, '0/0', {
      fontSize: '10px', color: '#888888',
    });
    this.container.add(this.countText);

    // 추가 버튼
    const addBtn = this.createButton(px + this.PANEL_W - 40, py + 6, '➕', () => this.addFriendPrompt());
    this.container.add(addBtn);

    // 요청 영역
    this.requestContainer = this.scene.add.container(px, py + 30);
    this.container.add(this.requestContainer);

    // 친구 목록 영역
    this.contentContainer = this.scene.add.container(px, py + 60);
    this.container.add(this.contentContainer);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '12px', color: '#ffffff', backgroundColor: '#3a5a8a',
      padding: { x: 4, y: 2 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('social:online', (data: { userId: string }) => {
      const friend = this.friends.find(f => f.userId === data.userId);
      if (friend) { friend.isOnline = true; this.refreshList(); }
    });

    socket.on('social:offline', (data: { userId: string }) => {
      const friend = this.friends.find(f => f.userId === data.userId);
      if (friend) { friend.isOnline = false; this.refreshList(); }
    });

    socket.on('social:friendRequest', (data: FriendRequest) => {
      this.pendingRequests.push(data);
      this.refreshRequests();
    });

    socket.on('social:statusChange', (data: { userId: string; status: string }) => {
      const friend = this.friends.find(f => f.userId === data.userId);
      if (friend) { friend.status = data.status; this.refreshList(); }
    });
  }

  // ═══ 데이터 로드 ═══

  public async loadFriends(): Promise<void> {
    try {
      const [friendsResp, requestsResp] = await Promise.all([
        this.net.httpGet(`/api/friends?userId=${this.net.getUserId()}`),
        this.net.httpGet(`/api/friends/pending?userId=${this.net.getUserId()}`),
      ]);
      this.friends = friendsResp.friends ?? [];
      this.pendingRequests = requestsResp.requests ?? [];

      this.refreshList();
      this.refreshRequests();
    } catch (err) {
      console.error('[FriendListUI] 로드 실패:', err);
    }
  }

  // ═══ 리스트 갱신 ═══

  private refreshList(): void {
    this.contentContainer.removeAll(true);
    this.friendRows = [];

    // 온라인 먼저, 그 다음 오프라인
    const sorted = [...this.friends].sort((a, b) => {
      if (a.isOnline === b.isOnline) return a.name.localeCompare(b.name);
      return a.isOnline ? -1 : 1;
    });

    const online = sorted.filter(f => f.isOnline).length;
    this.countText.setText(`${online}/${sorted.length}`);

    sorted.forEach((friend, idx) => {
      const y = idx * 28;
      const row = this.scene.add.container(8, y);

      const bg = this.scene.add.rectangle(0, 0, this.PANEL_W - 16, 24, 0x252540, 0.8)
        .setOrigin(0, 0);
      const dot = this.scene.add.text(4, 3, friend.isOnline ? '🟢' : '⚫', { fontSize: '8px' });
      const icon = this.scene.add.text(18, 3, CLASS_ICONS[friend.classId] ?? '❓', { fontSize: '10px' });
      const name = this.scene.add.text(34, 3, friend.name, {
        fontSize: '10px', color: friend.isOnline ? '#ffffff' : '#666666',
      });
      const level = this.scene.add.text(34, 14, `Lv.${friend.level}`, { fontSize: '8px', color: '#888888' });

      const statusLabel = STATUS_LABELS[friend.status] ?? '';
      const status = this.scene.add.text(this.PANEL_W - 70, 5, statusLabel, {
        fontSize: '8px', color: '#aaaaaa',
      });

      row.add([bg, dot, icon, name, level, status]);

      // 우클릭 메뉴
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.rightButtonDown()) {
          this.showContextMenu(pointer.x, pointer.y, friend);
        }
      });

      this.contentContainer.add(row);
      this.friendRows.push({ container: row, friend });
    });
  }

  // ═══ 요청 표시 ═══

  private refreshRequests(): void {
    this.requestContainer.removeAll(true);
    if (this.pendingRequests.length === 0) return;

    const label = this.scene.add.text(8, 0, `📩 요청 ${this.pendingRequests.length}건`, {
      fontSize: '10px', color: '#ffcc44',
    });
    this.requestContainer.add(label);

    this.pendingRequests.slice(0, 3).forEach((req, i) => {
      const y = 16 + i * 20;
      const text = this.scene.add.text(8, y, `${req.fromName}`, { fontSize: '9px', color: '#ffffff' });
      const accept = this.createButton(140, y - 2, '✓', () => this.acceptRequest(req));
      const reject = this.createButton(170, y - 2, '✕', () => this.rejectRequest(req));
      this.requestContainer.add([text, accept, reject]);
    });
  }

  // ═══ 컨텍스트 메뉴 ═══

  private showContextMenu(x: number, y: number, friend: FriendData): void {
    this.hideContextMenu();
    this.contextMenu = this.scene.add.container(x, y);
    this.contextMenu.setDepth(960);

    const bg = this.scene.add.rectangle(0, 0, 120, 120, 0x1a1a2e, 0.96)
      .setOrigin(0, 0).setStrokeStyle(1, 0x4a4a6a);
    this.contextMenu.add(bg);

    const actions = [
      { label: '💬 귓속말', cb: () => this.onWhisper?.(friend.userId) },
      { label: '💱 거래', cb: () => this.onTrade?.(friend.userId) },
      { label: '⚔️ 파티 초대', cb: () => this.onPartyInvite?.(friend.userId) },
      { label: '🚫 차단', cb: () => this.blockFriend(friend.userId) },
      { label: '❌ 삭제', cb: () => this.removeFriend(friend.userId) },
    ];

    actions.forEach((action, i) => {
      const btn = this.scene.add.text(6, 4 + i * 22, action.label, {
        fontSize: '10px', color: '#ffffff',
      }).setInteractive({ useHandCursor: true });
      btn.on('pointerdown', () => { action.cb(); this.hideContextMenu(); });
      this.contextMenu!.add(btn);
    });

    // 외부 클릭으로 닫기
    this.scene.input.once('pointerdown', () => this.hideContextMenu());
  }

  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.destroy();
      this.contextMenu = null;
    }
  }

  // ═══ 액션 ═══

  private async acceptRequest(req: FriendRequest): Promise<void> {
    try {
      await this.net.httpPost('/api/friends/accept', { userId: this.net.getUserId(), friendId: req.fromUserId });
      this.pendingRequests = this.pendingRequests.filter(r => r.id !== req.id);
      this.refreshRequests();
      this.loadFriends();
    } catch (err) {
      console.error('[FriendListUI] 수락 실패:', err);
    }
  }

  private async rejectRequest(req: FriendRequest): Promise<void> {
    try {
      await this.net.httpPost('/api/friends/reject', { userId: this.net.getUserId(), friendId: req.fromUserId });
      this.pendingRequests = this.pendingRequests.filter(r => r.id !== req.id);
      this.refreshRequests();
    } catch (err) {
      console.error('[FriendListUI] 거절 실패:', err);
    }
  }

  private async addFriendPrompt(): Promise<void> {
    // 실제 구현: DOM 기반 입력 프롬프트 또는 인게임 입력 UI
    console.log('[FriendListUI] 친구 추가 프롬프트 — DOM 연동 필요');
  }

  private async removeFriend(friendId: string): Promise<void> {
    try {
      await this.net.httpDelete(`/api/friends/${friendId}?userId=${this.net.getUserId()}`);
      this.friends = this.friends.filter(f => f.userId !== friendId);
      this.refreshList();
    } catch (err) {
      console.error('[FriendListUI] 삭제 실패:', err);
    }
  }

  private async blockFriend(targetId: string): Promise<void> {
    try {
      await this.net.httpPost('/api/friends/block', { userId: this.net.getUserId(), targetId });
      this.friends = this.friends.filter(f => f.userId !== targetId);
      this.refreshList();
    } catch (err) {
      console.error('[FriendListUI] 차단 실패:', err);
    }
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.loadFriends(); }
  public hide(): void { this.container.setVisible(false); this.hideContextMenu(); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public getOnlineCount(): number { return this.friends.filter(f => f.isOnline).length; }
  public destroy(): void { this.hideContextMenu(); this.container.destroy(); }
}
