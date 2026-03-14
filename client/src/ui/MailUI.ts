/**
 * MailUI — P27-07: 우편 시스템 UI
 *
 * 기능:
 * - 수신함 (읽기/미읽기 구분)
 * - 우편 상세 보기 (제목, 본문, 첨부 아이템/골드)
 * - 첨부 수령 / 우편 삭제
 * - 우편 발송 (수신자, 제목, 본문, 첨부)
 * - socialRoutes /api/mail/* 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface MailData {
  id: string;
  senderId: string;
  senderName: string;
  subject: string;
  body: string;
  isRead: boolean;
  hasAttachments: boolean;
  attachments: Array<{ itemId: string; itemName: string; count: number }>;
  gold: number;
  createdAt: number;
  collected: boolean;
}

export type MailTab = 'inbox' | 'compose';

interface MailRow {
  container: Phaser.GameObjects.Container;
  mail: MailData;
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class MailUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private activeTab: MailTab = 'inbox';
  private mails: MailData[] = [];
  private mailRows: MailRow[] = [];
  private selectedMail: MailData | null = null;
  private currentPage = 1;

  private contentContainer!: Phaser.GameObjects.Container;
  private detailContainer!: Phaser.GameObjects.Container;
  private pageText!: Phaser.GameObjects.Text;
  private unreadBadge!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 520;
  private readonly PANEL_H = 420;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(940);
    this.container.setVisible(false);

    this.createMailPanel();
    this.bindSocketEvents();
  }

  // ═══ 패널 생성 ═══

  private createMailPanel(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const px = cx - this.PANEL_W / 2;
    const py = cy - this.PANEL_H / 2;

    const dim = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setOrigin(0, 0).setInteractive();
    this.container.add(dim);

    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x1a1a2e, 0.96)
      .setOrigin(0, 0).setStrokeStyle(2, 0x66aaff);
    this.container.add(bg);

    const title = this.scene.add.text(px + 12, py + 10, '📬 우편함', {
      fontSize: '16px', color: '#88ccff', fontStyle: 'bold',
    });
    const closeBtn = this.createButton(px + this.PANEL_W - 40, py + 10, '✕', () => this.hide());
    this.container.add([title, closeBtn]);

    // 미읽음 배지
    this.unreadBadge = this.scene.add.text(px + 95, py + 10, '', {
      fontSize: '10px', color: '#ffffff', backgroundColor: '#ff4444',
      padding: { x: 4, y: 2 },
    });
    this.container.add(this.unreadBadge);

    // 탭
    const inboxBtn = this.createButton(px + 12, py + 36, '📥 수신함', () => this.switchTab('inbox'));
    const composeBtn = this.createButton(px + 100, py + 36, '✏️ 작성', () => this.switchTab('compose'));
    const collectAllBtn = this.createButton(px + this.PANEL_W - 120, py + 36, '📦 전체 수령', () => this.collectAll());
    this.container.add([inboxBtn, composeBtn, collectAllBtn]);

    // 목록 영역 (좌)
    this.contentContainer = this.scene.add.container(px, py + 65);
    this.container.add(this.contentContainer);

    // 상세 영역 (우)
    this.detailContainer = this.scene.add.container(px + 250, py + 65);
    this.container.add(this.detailContainer);

    // 페이지
    this.pageText = this.scene.add.text(px + 120, py + this.PANEL_H - 20, '', {
      fontSize: '10px', color: '#888888',
    }).setOrigin(0.5);
    this.container.add(this.pageText);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#3a4a6a',
      padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('mail:new', () => {
      if (this.container.visible) this.loadMails();
    });
  }

  // ═══ 탭 전환 ═══

  private switchTab(tab: MailTab): void {
    this.activeTab = tab;
    if (tab === 'inbox') {
      this.loadMails();
    } else {
      this.showComposeForm();
    }
  }

  // ═══ 수신함 ═══

  private async loadMails(): Promise<void> {
    try {
      const resp = await this.net.httpGet(`/api/mail/inbox?userId=${this.net.getUserId()}&page=${this.currentPage}`);
      this.mails = resp.mails ?? [];
      this.refreshMailList();

      const unread = this.mails.filter(m => !m.isRead).length;
      this.unreadBadge.setText(unread > 0 ? `${unread}` : '');
    } catch (err) {
      console.error('[MailUI] 로드 실패:', err);
    }
  }

  private refreshMailList(): void {
    this.contentContainer.removeAll(true);
    this.mailRows = [];

    this.mails.forEach((mail, idx) => {
      const y = idx * 32;
      const row = this.scene.add.container(12, y);

      const bg = this.scene.add.rectangle(0, 0, 230, 28, mail.isRead ? 0x252540 : 0x2a3a5a, 0.9)
        .setOrigin(0, 0).setStrokeStyle(1, mail.hasAttachments ? 0xffaa00 : 0x3a3a5a);
      const readDot = this.scene.add.text(4, 4, mail.isRead ? '' : '●', { fontSize: '10px', color: '#4488ff' });
      const attachIcon = this.scene.add.text(16, 4, mail.hasAttachments ? '📎' : '', { fontSize: '10px' });
      const subject = this.scene.add.text(30, 4, mail.subject, {
        fontSize: '10px', color: mail.isRead ? '#aaaaaa' : '#ffffff',
      });
      const sender = this.scene.add.text(30, 16, mail.senderName, { fontSize: '8px', color: '#888888' });

      row.add([bg, readDot, attachIcon, subject, sender]);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => this.selectMail(mail));

      this.contentContainer.add(row);
      this.mailRows.push({ container: row, mail });
    });

    if (this.mails.length === 0) {
      const empty = this.scene.add.text(12, 10, '우편이 없습니다', { fontSize: '11px', color: '#666666' });
      this.contentContainer.add(empty);
    }
  }

  // ═══ 상세 보기 ═══

  private selectMail(mail: MailData): void {
    this.selectedMail = mail;
    this.detailContainer.removeAll(true);

    const subject = this.scene.add.text(10, 0, mail.subject, { fontSize: '13px', color: '#ffffff', fontStyle: 'bold' });
    const from = this.scene.add.text(10, 20, `보낸이: ${mail.senderName}`, { fontSize: '10px', color: '#aaaaaa' });
    const date = this.scene.add.text(10, 34, new Date(mail.createdAt).toLocaleString('ko-KR'), {
      fontSize: '9px', color: '#888888',
    });

    const divider = this.scene.add.rectangle(10, 50, 240, 1, 0x4a4a6a).setOrigin(0, 0);

    const body = this.scene.add.text(10, 58, mail.body, {
      fontSize: '10px', color: '#cccccc', wordWrap: { width: 240 },
    });

    this.detailContainer.add([subject, from, date, divider, body]);

    // 첨부
    if (mail.hasAttachments && !mail.collected) {
      let ay = 160;
      mail.attachments.forEach(att => {
        const attText = this.scene.add.text(10, ay, `📦 ${att.itemName} x${att.count}`, {
          fontSize: '10px', color: '#ffaa00',
        });
        this.detailContainer.add(attText);
        ay += 16;
      });

      if (mail.gold > 0) {
        const goldText = this.scene.add.text(10, ay, `💰 ${mail.gold.toLocaleString()}G`, {
          fontSize: '10px', color: '#ffcc44',
        });
        this.detailContainer.add(goldText);
        ay += 20;
      }

      const collectBtn = this.createButton(10, ay, '📦 수령', () => this.collectMail(mail.id));
      this.detailContainer.add(collectBtn);
    }

    // 삭제 버튼
    const deleteBtn = this.createButton(10, 280, '🗑️ 삭제', () => this.deleteMail(mail.id));
    this.detailContainer.add(deleteBtn);
  }

  // ═══ 액션 ═══

  private async collectMail(mailId: string): Promise<void> {
    try {
      await this.net.httpPost(`/api/mail/${mailId}/collect`, { userId: this.net.getUserId() });
      if (this.selectedMail) this.selectedMail.collected = true;
      this.loadMails();
    } catch (err) {
      console.error('[MailUI] 수령 실패:', err);
    }
  }

  private async collectAll(): Promise<void> {
    const uncollected = this.mails.filter(m => m.hasAttachments && !m.collected);
    for (const mail of uncollected) {
      await this.collectMail(mail.id);
    }
  }

  private async deleteMail(mailId: string): Promise<void> {
    try {
      await this.net.httpDelete(`/api/mail/${mailId}?userId=${this.net.getUserId()}`);
      this.selectedMail = null;
      this.detailContainer.removeAll(true);
      this.loadMails();
    } catch (err) {
      console.error('[MailUI] 삭제 실패:', err);
    }
  }

  public async sendMail(receiverId: string, subject: string, body: string, attachments?: Array<{ itemId: string; count: number }>): Promise<void> {
    try {
      await this.net.httpPost('/api/mail/send', {
        senderId: this.net.getUserId(),
        receiverId,
        subject,
        body,
        attachments,
      });
    } catch (err) {
      console.error('[MailUI] 발송 실패:', err);
    }
  }

  // ═══ 작성 폼 ═══

  private showComposeForm(): void {
    this.contentContainer.removeAll(true);
    this.detailContainer.removeAll(true);

    const formTitle = this.scene.add.text(12, 0, '✏️ 우편 작성', { fontSize: '13px', color: '#ffffff' });
    const toLabel = this.scene.add.text(12, 28, '받는이:', { fontSize: '10px', color: '#aaaaaa' });
    const subLabel = this.scene.add.text(12, 56, '제목:', { fontSize: '10px', color: '#aaaaaa' });
    const bodyLabel = this.scene.add.text(12, 84, '내용:', { fontSize: '10px', color: '#aaaaaa' });
    const sendBtn = this.createButton(12, 200, '📤 보내기', () => {
      // 실제 구현에서는 입력 필드 값을 사용
      console.log('[MailUI] 보내기 클릭 — DOM 입력 연동 필요');
    });

    this.contentContainer.add([formTitle, toLabel, subLabel, bodyLabel, sendBtn]);
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.loadMails(); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public getUnreadCount(): number { return this.mails.filter(m => !m.isRead).length; }
  public destroy(): void { this.container.destroy(); }
}
