/**
 * ChatUI — P27-08: 채팅 UI
 *
 * 기능:
 * - 채널 탭 (일반/파티/길드/귓속말)
 * - 메시지 입력/전송
 * - 이모지 삽입, 시스템 메시지 스타일 분리
 * - 스크롤 이력 + 최신 고정
 * - chatSocketHandler 연동
 * - GameHUD 하단 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export type ChatChannel = 'general' | 'party' | 'guild' | 'whisper';

export interface ChatMessage {
  id: string;
  channel: ChatChannel;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  isSystem: boolean;
  whisperTarget?: string;
}

interface ChannelTab {
  label: string;
  channel: ChatChannel;
  btn: Phaser.GameObjects.Text;
  unread: number;
}

const CHANNEL_COLORS: Record<ChatChannel, string> = {
  general: '#ffffff',
  party: '#88ccff',
  guild: '#88ff88',
  whisper: '#ff88cc',
};

const MAX_VISIBLE = 12;
const MAX_HISTORY = 200;

// ── 메인 클래스 ───────────────────────────────────────────────

export class ChatUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private activeChannel: ChatChannel = 'general';
  private messages: Map<ChatChannel, ChatMessage[]> = new Map();
  private messageTexts: Phaser.GameObjects.Text[] = [];
  private tabs: ChannelTab[] = [];

  private inputBg!: Phaser.GameObjects.Rectangle;
  private inputText!: Phaser.GameObjects.Text;
  private inputBuffer = '';
  private isInputFocused = false;

  private readonly PANEL_W = 380;
  private readonly PANEL_H = 260;
  private readonly PANEL_X: number;
  private readonly PANEL_Y: number;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.PANEL_X = 10;
    this.PANEL_Y = scene.scale.height - this.PANEL_H - 10;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(880);

    // 채널별 메시지 배열 초기화
    (['general', 'party', 'guild', 'whisper'] as ChatChannel[]).forEach(ch => {
      this.messages.set(ch, []);
    });

    this.createChatPanel();
    this.bindSocketEvents();
    this.bindKeyboard();
  }

  // ═══ 패널 생성 ═══

  private createChatPanel(): void {
    const px = this.PANEL_X;
    const py = this.PANEL_Y;

    // 배경 (반투명)
    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x0a0a1a, 0.7)
      .setOrigin(0, 0).setStrokeStyle(1, 0x2a2a4a);
    this.container.add(bg);

    // 탭 버튼
    const tabDefs: Array<{ label: string; channel: ChatChannel }> = [
      { label: '일반', channel: 'general' },
      { label: '파티', channel: 'party' },
      { label: '길드', channel: 'guild' },
      { label: '귓속말', channel: 'whisper' },
    ];

    tabDefs.forEach((def, i) => {
      const btn = this.scene.add.text(px + 8 + i * 80, py + 4, def.label, {
        fontSize: '10px', color: CHANNEL_COLORS[def.channel],
        backgroundColor: def.channel === this.activeChannel ? '#3a3a5a' : '#1a1a2e',
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => this.switchChannel(def.channel));
      this.container.add(btn);
      this.tabs.push({ label: def.label, channel: def.channel, btn, unread: 0 });
    });

    // 메시지 영역
    for (let i = 0; i < MAX_VISIBLE; i++) {
      const msgText = this.scene.add.text(px + 8, py + 26 + i * 16, '', {
        fontSize: '10px', color: '#cccccc', wordWrap: { width: this.PANEL_W - 20 },
      });
      this.container.add(msgText);
      this.messageTexts.push(msgText);
    }

    // 입력창
    this.inputBg = this.scene.add.rectangle(px + 4, py + this.PANEL_H - 26, this.PANEL_W - 8, 22, 0x1a1a2e, 0.9)
      .setOrigin(0, 0).setStrokeStyle(1, 0x3a3a5a).setInteractive({ useHandCursor: true });
    this.inputBg.on('pointerdown', () => this.focusInput());

    this.inputText = this.scene.add.text(px + 10, py + this.PANEL_H - 22, '메시지를 입력하세요...', {
      fontSize: '10px', color: '#666666',
    });

    // 이모지 버튼
    const emojiBtn = this.scene.add.text(px + this.PANEL_W - 28, py + this.PANEL_H - 24, '😀', {
      fontSize: '12px',
    }).setInteractive({ useHandCursor: true });
    emojiBtn.on('pointerdown', () => this.toggleEmojiPicker());

    this.container.add([this.inputBg, this.inputText, emojiBtn]);
  }

  // ═══ 소켓 이벤트 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('chat:message', (data: ChatMessage) => {
      this.addMessage(data);
    });

    socket.on('chat:system', (data: { channel: ChatChannel; content: string }) => {
      this.addMessage({
        id: `sys-${Date.now()}`,
        channel: data.channel,
        senderId: 'SYSTEM',
        senderName: '시스템',
        content: data.content,
        timestamp: Date.now(),
        isSystem: true,
      });
    });
  }

  // ═══ 키보드 바인딩 ═══

  private bindKeyboard(): void {
    this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.isInputFocused) {
        if (event.key === 'Enter') {
          this.focusInput();
          event.preventDefault();
        }
        return;
      }

      if (event.key === 'Enter') {
        this.sendMessage();
        event.preventDefault();
      } else if (event.key === 'Escape') {
        this.unfocusInput();
      } else if (event.key === 'Backspace') {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.updateInputDisplay();
      } else if (event.key.length === 1) {
        this.inputBuffer += event.key;
        this.updateInputDisplay();
      }
    });
  }

  // ═══ 채널 전환 ═══

  private switchChannel(channel: ChatChannel): void {
    this.activeChannel = channel;

    // 탭 스타일 업데이트
    this.tabs.forEach(tab => {
      tab.btn.setStyle({
        backgroundColor: tab.channel === channel ? '#3a3a5a' : '#1a1a2e',
      });
      if (tab.channel === channel) tab.unread = 0;
    });

    this.refreshDisplay();
  }

  // ═══ 메시지 관리 ═══

  private addMessage(msg: ChatMessage): void {
    const channelMsgs = this.messages.get(msg.channel) ?? [];
    channelMsgs.push(msg);
    if (channelMsgs.length > MAX_HISTORY) channelMsgs.shift();
    this.messages.set(msg.channel, channelMsgs);

    // 미읽음 카운트
    if (msg.channel !== this.activeChannel) {
      const tab = this.tabs.find(t => t.channel === msg.channel);
      if (tab) {
        tab.unread++;
        tab.btn.setText(`${tab.label}(${tab.unread})`);
      }
    }

    if (msg.channel === this.activeChannel) {
      this.refreshDisplay();
    }
  }

  private refreshDisplay(): void {
    const channelMsgs = this.messages.get(this.activeChannel) ?? [];
    const visible = channelMsgs.slice(-MAX_VISIBLE);

    this.messageTexts.forEach((text, i) => {
      const msg = visible[i];
      if (msg) {
        const color = msg.isSystem ? '#ffcc44' : CHANNEL_COLORS[msg.channel];
        const prefix = msg.isSystem ? '⚙️ ' : `[${msg.senderName}] `;
        text.setText(`${prefix}${msg.content}`).setColor(color);
      } else {
        text.setText('');
      }
    });
  }

  // ═══ 입력 ═══

  private focusInput(): void {
    this.isInputFocused = true;
    this.inputBg.setStrokeStyle(1, 0x4488ff);
    this.updateInputDisplay();
  }

  private unfocusInput(): void {
    this.isInputFocused = false;
    this.inputBg.setStrokeStyle(1, 0x3a3a5a);
    if (!this.inputBuffer) {
      this.inputText.setText('메시지를 입력하세요...').setColor('#666666');
    }
  }

  private updateInputDisplay(): void {
    if (this.inputBuffer) {
      this.inputText.setText(this.inputBuffer).setColor('#ffffff');
    } else {
      this.inputText.setText(this.isInputFocused ? '|' : '메시지를 입력하세요...')
        .setColor(this.isInputFocused ? '#ffffff' : '#666666');
    }
  }

  private async sendMessage(): Promise<void> {
    const content = this.inputBuffer.trim();
    if (!content) return;

    // 귓속말 파싱: /w 대상이름 메시지
    let channel = this.activeChannel;
    let whisperTarget: string | undefined;
    let finalContent = content;

    if (content.startsWith('/w ')) {
      const parts = content.slice(3).split(' ');
      whisperTarget = parts[0];
      finalContent = parts.slice(1).join(' ');
      channel = 'whisper';
    }

    try {
      const socket = this.net.getSocket();
      if (socket) {
        socket.emit('chat:send', {
          channel,
          senderId: this.net.getUserId(),
          content: finalContent,
          whisperTarget,
        });
      }
    } catch (err) {
      console.error('[ChatUI] 전송 실패:', err);
    }

    this.inputBuffer = '';
    this.updateInputDisplay();
    this.unfocusInput();
  }

  // ═══ 이모지 ═══

  private toggleEmojiPicker(): void {
    const emojis = ['😀', '😂', '❤️', '👍', '🎉', '⚔️', '🛡️', '💎', '🔥', '✨'];
    // 간단한 이모지 삽입 — 실제 구현에서는 팝업 패널로 확장
    const random = emojis[Math.floor(Math.random() * emojis.length)];
    this.inputBuffer += random;
    this.updateInputDisplay();
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.setVisible(!this.container.visible); }
  public isVisible(): boolean { return this.container.visible; }
  public isFocused(): boolean { return this.isInputFocused; }
  public destroy(): void { this.container.destroy(); }
}
