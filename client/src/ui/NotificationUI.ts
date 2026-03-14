/**
 * NotificationUI — P27-14: 알림 시스템 UI
 *
 * 기능:
 * - 토스트 알림 (화면 우상단, 자동 소멸)
 * - 알림 목록 패널 (전체 이력)
 * - 읽음/삭제 처리
 * - 알림 종류별 아이콘/색상
 * - notificationRoutes + notificationSocketHandler 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export type NotificationType =
  | 'system' | 'friend_request' | 'party_invite' | 'guild_invite'
  | 'trade_request' | 'mail' | 'achievement' | 'pvp_match'
  | 'raid' | 'auction' | 'level_up' | 'item_acquired';

export interface NotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  actionUrl?: string;
}

interface ToastItem {
  container: Phaser.GameObjects.Container;
  timer: Phaser.Time.TimerEvent;
  notification: NotificationData;
}

const TYPE_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  system: { icon: '⚙️', color: '#aaaaaa' },
  friend_request: { icon: '👥', color: '#88ccff' },
  party_invite: { icon: '⚔️', color: '#88ccff' },
  guild_invite: { icon: '🏰', color: '#88ff88' },
  trade_request: { icon: '💱', color: '#ffcc44' },
  mail: { icon: '📬', color: '#88aaff' },
  achievement: { icon: '🏅', color: '#ffaa00' },
  pvp_match: { icon: '⚔️', color: '#ff6688' },
  raid: { icon: '🐉', color: '#ff8866' },
  auction: { icon: '🏪', color: '#ffaa00' },
  level_up: { icon: '⬆️', color: '#44ff44' },
  item_acquired: { icon: '📦', color: '#bb88ff' },
};

const MAX_TOASTS = 4;
const TOAST_DURATION = 4000;
const TOAST_W = 280;
const TOAST_H = 50;

// ── 메인 클래스 ───────────────────────────────────────────────

export class NotificationUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;

  // 토스트
  private toastContainer: Phaser.GameObjects.Container;
  private activeToasts: ToastItem[] = [];

  // 패널
  private panelContainer: Phaser.GameObjects.Container;
  private notifications: NotificationData[] = [];
  private panelContent!: Phaser.GameObjects.Container;
  private unreadCount = 0;
  private badgeText!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 300;
  private readonly PANEL_H = 400;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;

    // 토스트 컨테이너 (우상단)
    this.toastContainer = scene.add.container(0, 0);
    this.toastContainer.setDepth(990);

    // 패널 컨테이너
    this.panelContainer = scene.add.container(0, 0);
    this.panelContainer.setDepth(930);
    this.panelContainer.setVisible(false);

    this.createPanel();
    this.createBadge();
    this.bindSocketEvents();
  }

  // ═══ 패널 생성 ═══

  private createPanel(): void {
    const px = this.scene.scale.width - this.PANEL_W - 10;
    const py = 50;

    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x1a1a2e, 0.95)
      .setOrigin(0, 0).setStrokeStyle(1, 0x4a4a6a);
    this.panelContainer.add(bg);

    const title = this.scene.add.text(px + 10, py + 8, '🔔 알림', {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
    });
    this.panelContainer.add(title);

    // 전체 읽기 버튼
    const readAllBtn = this.createButton(px + this.PANEL_W - 90, py + 6, '모두 읽기', () => this.markAllRead());
    const closeBtn = this.createButton(px + this.PANEL_W - 30, py + 6, '✕', () => this.hidePanel());
    this.panelContainer.add([readAllBtn, closeBtn]);

    this.panelContent = this.scene.add.container(px, py + 32);
    this.panelContainer.add(this.panelContent);
  }

  private createBadge(): void {
    // HUD 상의 알림 아이콘에 배지 오버레이
    this.badgeText = this.scene.add.text(this.scene.scale.width - 40, 10, '', {
      fontSize: '10px', color: '#ffffff', backgroundColor: '#ff4444',
      padding: { x: 4, y: 2 },
    }).setDepth(995);
    this.badgeText.setVisible(false);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '10px', color: '#ffffff', backgroundColor: '#3a4a6a',
      padding: { x: 5, y: 3 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('notification:push', (data: NotificationData) => {
      this.pushNotification(data);
    });

    socket.on('notification:batch', (data: { notifications: NotificationData[] }) => {
      data.notifications.forEach(n => this.pushNotification(n, false));
    });
  }

  // ═══ 알림 수신 ═══

  public pushNotification(notification: NotificationData, showToast = true): void {
    this.notifications.unshift(notification);
    if (this.notifications.length > 100) this.notifications.pop();

    if (!notification.isRead) {
      this.unreadCount++;
      this.updateBadge();
    }

    if (showToast) this.showToast(notification);
    if (this.panelContainer.visible) this.refreshPanel();
  }

  // ═══ 토스트 ═══

  private showToast(notification: NotificationData): void {
    // 초과 토스트 제거
    while (this.activeToasts.length >= MAX_TOASTS) {
      const old = this.activeToasts.shift()!;
      old.timer.destroy();
      old.container.destroy();
    }

    const config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;
    const x = this.scene.scale.width - TOAST_W - 20;
    const y = 60 + this.activeToasts.length * (TOAST_H + 6);

    const toast = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, TOAST_W, TOAST_H, 0x1a1a2e, 0.94)
      .setOrigin(0, 0).setStrokeStyle(1, Phaser.Display.Color.HexStringToColor(config.color).color);
    const icon = this.scene.add.text(8, 8, config.icon, { fontSize: '16px' });
    const title = this.scene.add.text(30, 6, notification.title, {
      fontSize: '11px', color: config.color, fontStyle: 'bold',
    });
    const msg = this.scene.add.text(30, 22, notification.message, {
      fontSize: '9px', color: '#aaaaaa', wordWrap: { width: TOAST_W - 40 },
    });

    toast.add([bg, icon, title, msg]);
    this.toastContainer.add(toast);

    // 입장 애니메이션
    toast.setAlpha(0);
    this.scene.tweens.add({ targets: toast, alpha: 1, duration: 200 });

    // 자동 소멸 타이머
    const timer = this.scene.time.delayedCall(TOAST_DURATION, () => {
      this.scene.tweens.add({
        targets: toast, alpha: 0, x: x + 50, duration: 300,
        onComplete: () => {
          toast.destroy();
          this.activeToasts = this.activeToasts.filter(t => t.container !== toast);
          this.repositionToasts();
        },
      });
    });

    this.activeToasts.push({ container: toast, timer, notification });
  }

  private repositionToasts(): void {
    this.activeToasts.forEach((toast, i) => {
      const targetY = 60 + i * (TOAST_H + 6);
      this.scene.tweens.add({ targets: toast.container, y: targetY, duration: 200 });
    });
  }

  // ═══ 패널 관리 ═══

  public async loadNotifications(): Promise<void> {
    try {
      const resp = await this.net.httpGet(`/api/notifications/${this.net.getUserId()}`);
      this.notifications = resp.notifications ?? [];

      const unreadResp = await this.net.httpGet(`/api/notifications/${this.net.getUserId()}/unread`);
      this.unreadCount = unreadResp.count ?? 0;

      this.updateBadge();
      this.refreshPanel();
    } catch (err) {
      console.error('[NotificationUI] 로드 실패:', err);
    }
  }

  private refreshPanel(): void {
    this.panelContent.removeAll(true);

    this.notifications.slice(0, 20).forEach((notif, idx) => {
      const y = idx * 36;
      const config = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.system;

      const bg = this.scene.add.rectangle(8, y, this.PANEL_W - 16, 32, notif.isRead ? 0x202030 : 0x252550, 0.9)
        .setOrigin(0, 0);
      const icon = this.scene.add.text(14, y + 4, config.icon, { fontSize: '12px' });
      const title = this.scene.add.text(32, y + 2, notif.title, {
        fontSize: '10px', color: notif.isRead ? '#888888' : '#ffffff',
      });
      const msg = this.scene.add.text(32, y + 16, notif.message, {
        fontSize: '8px', color: '#aaaaaa',
        wordWrap: { width: this.PANEL_W - 60 },
      });

      const deleteBtn = this.scene.add.text(this.PANEL_W - 30, y + 6, '✕', {
        fontSize: '10px', color: '#666666',
      }).setInteractive({ useHandCursor: true });
      deleteBtn.on('pointerdown', () => this.deleteNotification(notif.id));

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.markAsRead(notif.id));

      this.panelContent.add([bg, icon, title, msg, deleteBtn]);
    });

    if (this.notifications.length === 0) {
      const empty = this.scene.add.text(8, 10, '알림이 없습니다', { fontSize: '11px', color: '#666666' });
      this.panelContent.add(empty);
    }
  }

  // ═══ 액션 ═══

  private async markAsRead(id: string): Promise<void> {
    try {
      await this.net.httpPatch(`/api/notifications/${id}/read`);
      const notif = this.notifications.find(n => n.id === id);
      if (notif && !notif.isRead) {
        notif.isRead = true;
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateBadge();
        this.refreshPanel();
      }
    } catch (err) {
      console.error('[NotificationUI] 읽기 실패:', err);
    }
  }

  private async markAllRead(): Promise<void> {
    try {
      await this.net.httpPatch('/api/notifications/read-all', { userId: this.net.getUserId() });
      this.notifications.forEach(n => (n.isRead = true));
      this.unreadCount = 0;
      this.updateBadge();
      this.refreshPanel();
    } catch (err) {
      console.error('[NotificationUI] 일괄 읽기 실패:', err);
    }
  }

  private async deleteNotification(id: string): Promise<void> {
    try {
      await this.net.httpDelete(`/api/notifications/${id}`);
      const notif = this.notifications.find(n => n.id === id);
      if (notif && !notif.isRead) {
        this.unreadCount = Math.max(0, this.unreadCount - 1);
        this.updateBadge();
      }
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.refreshPanel();
    } catch (err) {
      console.error('[NotificationUI] 삭제 실패:', err);
    }
  }

  // ═══ 배지 ═══

  private updateBadge(): void {
    if (this.unreadCount > 0) {
      this.badgeText.setText(`${this.unreadCount}`).setVisible(true);
    } else {
      this.badgeText.setVisible(false);
    }
  }

  // ═══ 공개 API ═══

  public showPanel(): void { this.panelContainer.setVisible(true); this.loadNotifications(); }
  public hidePanel(): void { this.panelContainer.setVisible(false); }
  public togglePanel(): void { this.panelContainer.visible ? this.hidePanel() : this.showPanel(); }
  public isPanelVisible(): boolean { return this.panelContainer.visible; }
  public getUnreadCount(): number { return this.unreadCount; }

  public destroy(): void {
    this.activeToasts.forEach(t => { t.timer.destroy(); t.container.destroy(); });
    this.toastContainer.destroy();
    this.panelContainer.destroy();
    this.badgeText.destroy();
  }
}
