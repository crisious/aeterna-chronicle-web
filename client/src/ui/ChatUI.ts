/**
 * ChatUI — P27-08: 채팅 UI
 *
 * 기능:
 * - 채널 탭 (일반/파티/길드/귓속말)
 * - 메시지 입력/전송
 * - 이모지 삽입, 시스템 메시지 스타일 분리
 * - 스크롤 이력 + 최신 고정
 * - chatSocketHandler 연동
 * - HUD 하단 연동
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForStatusIcon } from '../assets/spriteResourceManifest';
import type { NetworkManager } from '../network/NetworkManager';

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
  frame: Phaser.GameObjects.Image | null;
  unread: number;
}

interface ChatUiConfig {
  frameQa: boolean;
}

export const CHAT_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_chat_panel',
    path: 'assets/generated/ui/frames/UI-HUD-008-DEF.png',
  },
  input: {
    key: 'ui_frame_chat_input',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
  tabButton: {
    key: 'ui_frame_chat_tab_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
  emojiButton: {
    key: 'ui_frame_chat_emoji_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const CHAT_EMOJI_BUTTON_ICON_ID = 'charm';
const CHAT_EXPECTED_RENDERED_FRAME_KEY_COUNT = 4;
const CHAT_EXPECTED_TAB_FRAME_COUNT = 4;

export function preloadChatUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(CHAT_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  const emojiButtonIconResource = getSpriteResourceForStatusIcon(CHAT_EMOJI_BUTTON_ICON_ID);
  if (emojiButtonIconResource && !scene.textures.exists(emojiButtonIconResource.key)) {
    scene.load.image(emojiButtonIconResource.key, emojiButtonIconResource.path);
  }
}

const CHANNEL_COLORS: Record<ChatChannel, string> = {
  general: '#ffffff',
  party: '#88ccff',
  guild: '#88ff88',
  whisper: '#ff88cc',
};

const MAX_VISIBLE = 10;
const MAX_HISTORY = 200;

// ── 메인 클래스 ───────────────────────────────────────────────

export class ChatUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private config: ChatUiConfig;
  private container: Phaser.GameObjects.Container;

  private activeChannel: ChatChannel = 'general';
  private messages: Map<ChatChannel, ChatMessage[]> = new Map();
  private messageTexts: Phaser.GameObjects.Text[] = [];
  private tabs: ChannelTab[] = [];

  private panelFrame: Phaser.GameObjects.Image | null = null;
  private inputBg!: Phaser.GameObjects.Rectangle;
  private inputFrame: Phaser.GameObjects.Image | null = null;
  private tabFrames: Phaser.GameObjects.Image[] = [];
  private emojiButtonFrame: Phaser.GameObjects.Image | null = null;
  private emojiButtonIcon: Phaser.GameObjects.Image | null = null;
  private emojiButtonFallback: Phaser.GameObjects.Text | null = null;
  private inputText!: Phaser.GameObjects.Text;
  private inputBuffer = '';
  private isInputFocused = false;
  private socketHandlers: Array<[string, (...args: any[]) => void]> = [];
  private renderedFrameKeys: string[] = [];
  private missingFrameKeys: string[] = [];

  private readonly PANEL_W = 380;
  private readonly PANEL_H = 260;
  private readonly PANEL_X: number;
  private readonly PANEL_Y: number;
  private readonly CONTENT_INSET_X = 14;
  private readonly TAB_TOP_INSET = 14;
  private readonly MESSAGE_TOP_INSET = 44;
  private readonly MESSAGE_LINE_HEIGHT = 17;
  private readonly INPUT_SIDE_INSET = 12;
  private readonly INPUT_BOTTOM_INSET = 16;
  private readonly INPUT_H = 24;

  constructor(scene: Phaser.Scene, net: NetworkManager, config?: Partial<ChatUiConfig>) {
    this.scene = scene;
    this.net = net;
    this.config = { frameQa: false, ...config };
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
    const panelTexture = CHAT_UI_FRAME_TEXTURES.panel;
    const hasPanelFrame = this.scene.textures.exists(panelTexture.key);

    // 배경: Aseprite frame이 있으면 rectangle은 hit/readability layer로만 쓰고, 누락 시 fallback panel을 노출한다.
    const bg = this.scene.add.rectangle(
      px,
      py,
      this.PANEL_W,
      this.PANEL_H,
      0x0a0a1a,
      hasPanelFrame ? 0.26 : 0.7,
    ).setOrigin(0, 0);
    if (hasPanelFrame) {
      this.panelFrame = this.scene.add.image(px + this.PANEL_W / 2, py + this.PANEL_H / 2, panelTexture.key);
      this.panelFrame.setDisplaySize(this.PANEL_W, this.PANEL_H);
      this.panelFrame.setAlpha(0.78);
      this.addRenderedFrameKey(panelTexture.key);
    } else {
      bg.setStrokeStyle(1, 0x2a2a4a);
      this.addMissingFrameKey(panelTexture.key);
    }
    this.container.add(bg);
    if (this.panelFrame) {
      this.container.add(this.panelFrame);
    }

    // 탭 버튼
    const tabDefs: Array<{ label: string; channel: ChatChannel }> = [
      { label: '일반', channel: 'general' },
      { label: '파티', channel: 'party' },
      { label: '길드', channel: 'guild' },
      { label: '귓속말', channel: 'whisper' },
    ];

    tabDefs.forEach((def, i) => {
      const tabX = px + this.CONTENT_INSET_X + i * 84;
      const tabY = py + this.TAB_TOP_INSET;
      const tabFrame = this.createTabFrame(tabX + 30, tabY + 10, def.channel);
      const btn = this.scene.add.text(tabX + 30, tabY + 10, def.label, {
        fontSize: '10px',
        color: CHANNEL_COLORS[def.channel],
        stroke: '#060814',
        strokeThickness: tabFrame ? 2 : 0,
        ...(tabFrame ? {} : {
          backgroundColor: def.channel === this.activeChannel ? '#3a3a5a' : '#1a1a2e',
          padding: { x: 6, y: 3 },
        }),
      }).setOrigin(tabFrame ? 0.5 : 0, tabFrame ? 0.5 : 0).setInteractive({ useHandCursor: true });

      const switchToTab = () => this.switchChannel(def.channel);
      tabFrame?.on('pointerdown', switchToTab);
      btn.on('pointerdown', switchToTab);
      if (tabFrame) {
        this.container.add(tabFrame);
      }
      this.container.add(btn);
      const tab = { label: def.label, channel: def.channel, btn, frame: tabFrame, unread: 0 };
      this.tabs.push(tab);
      this.updateTabVisual(tab);
    });

    // 메시지 영역
    for (let i = 0; i < MAX_VISIBLE; i++) {
      const msgText = this.scene.add.text(
        px + this.CONTENT_INSET_X,
        py + this.MESSAGE_TOP_INSET + i * this.MESSAGE_LINE_HEIGHT,
        '',
        {
          fontSize: '10px', color: '#cccccc', wordWrap: { width: this.PANEL_W - this.CONTENT_INSET_X * 2 },
        },
      );
      this.container.add(msgText);
      this.messageTexts.push(msgText);
    }

    // 입력창
    const inputTexture = CHAT_UI_FRAME_TEXTURES.input;
    const inputX = px + this.INPUT_SIDE_INSET;
    const inputY = py + this.PANEL_H - this.INPUT_BOTTOM_INSET - this.INPUT_H;
    const inputW = this.PANEL_W - this.INPUT_SIDE_INSET * 2;
    const inputH = this.INPUT_H;
    const hasInputFrame = this.scene.textures.exists(inputTexture.key);
    this.inputBg = this.scene.add.rectangle(
      inputX,
      inputY,
      inputW,
      inputH,
      0x1a1a2e,
      hasInputFrame ? 0 : 0.9,
    ).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    if (hasInputFrame) {
      this.inputFrame = this.scene.add.image(inputX + inputW / 2, inputY + inputH / 2, inputTexture.key);
      this.inputFrame.setDisplaySize(inputW, inputH);
      this.inputFrame.setAlpha(0.86);
      this.addRenderedFrameKey(inputTexture.key);
    } else {
      this.inputBg.setStrokeStyle(1, 0x3a3a5a);
      this.addMissingFrameKey(inputTexture.key);
    }
    this.inputBg.on('pointerdown', () => this.focusInput());

    this.inputText = this.scene.add.text(inputX + 8, inputY + 7, '메시지를 입력하세요...', {
      fontSize: '10px', color: '#666666',
    });

    const emojiTexture = CHAT_UI_FRAME_TEXTURES.emojiButton;
    const hasEmojiButtonFrame = this.scene.textures.exists(emojiTexture.key);
    const emojiX = inputX + inputW - 16;
    const emojiY = inputY + inputH / 2;
    if (hasEmojiButtonFrame) {
      this.emojiButtonFrame = this.scene.add.image(emojiX, emojiY, emojiTexture.key)
        .setName('chat_emoji_button_frame')
        .setDisplaySize(24, 20)
        .setAlpha(0.84)
        .setInteractive({ useHandCursor: true });
      this.emojiButtonFrame.on('pointerdown', () => this.toggleEmojiPicker());
      this.addRenderedFrameKey(emojiTexture.key);
    } else {
      this.addMissingFrameKey(emojiTexture.key);
    }

    const emojiButtonIconResource = getSpriteResourceForStatusIcon(CHAT_EMOJI_BUTTON_ICON_ID);
    if (emojiButtonIconResource && this.scene.textures.exists(emojiButtonIconResource.key)) {
      this.emojiButtonIcon = this.scene.add.image(emojiX, emojiY, emojiButtonIconResource.key)
        .setName('chat_emoji_button_icon')
        .setInteractive({ useHandCursor: true });
      this.emojiButtonIcon.setDisplaySize(16, 16);
      this.emojiButtonIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.emojiButtonIcon.on('pointerdown', () => this.toggleEmojiPicker());
    } else {
      this.emojiButtonFallback = this.scene.add.text(
        hasEmojiButtonFrame ? emojiX : inputX + inputW - 22,
        hasEmojiButtonFrame ? emojiY : inputY + 4,
        '😀',
        {
          fontSize: '12px',
          stroke: '#060814',
          strokeThickness: hasEmojiButtonFrame ? 2 : 0,
        },
      )
        .setName('chat_emoji_button_fallback')
        .setOrigin(hasEmojiButtonFrame ? 0.5 : 0, hasEmojiButtonFrame ? 0.5 : 0)
        .setInteractive({ useHandCursor: true });
      this.emojiButtonFallback.on('pointerdown', () => this.toggleEmojiPicker());
    }

    this.container.add([
      this.inputBg,
      ...(this.inputFrame ? [this.inputFrame] : []),
      this.inputText,
      ...(this.emojiButtonFrame ? [this.emojiButtonFrame] : []),
      ...(this.emojiButtonIcon ? [this.emojiButtonIcon] : []),
      ...(this.emojiButtonFallback ? [this.emojiButtonFallback] : []),
    ]);
    this.writeFrameQaProbeIfEnabled('ready');
  }

  // ═══ 소켓 이벤트 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    const on = (event: string, handler: (...args: any[]) => void) => {
      socket.on(event, handler);
      this.socketHandlers.push([event, handler]);
    };

    on('chat:message', (data: ChatMessage) => {
      this.addMessage(data);
    });

    on('chat:system', (data: { channel: ChatChannel; content: string }) => {
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
      if (tab.channel === channel) {
        tab.unread = 0;
        tab.btn.setText(tab.label);
      }
      this.updateTabVisual(tab);
    });

    this.refreshDisplay();
    this.writeFrameQaProbeIfEnabled('ready');
  }

  private createTabFrame(x: number, y: number, channel: ChatChannel): Phaser.GameObjects.Image | null {
    const tabTexture = CHAT_UI_FRAME_TEXTURES.tabButton;
    if (!this.scene.textures.exists(tabTexture.key)) {
      this.addMissingFrameKey(tabTexture.key);
      return null;
    }

    const frame = this.scene.add.image(x, y, tabTexture.key)
      .setName(`chat_tab_button_frame_${channel}`)
      .setDisplaySize(68, 22);
    this.tabFrames.push(frame);
    this.addRenderedFrameKey(tabTexture.key);
    return frame;
  }

  private updateTabVisual(tab: ChannelTab): void {
    const isActive = tab.channel === this.activeChannel;
    tab.btn.setColor(CHANNEL_COLORS[tab.channel]);
    tab.btn.setFontStyle(isActive ? 'bold' : 'normal');

    if (tab.frame) {
      tab.frame.setAlpha(isActive ? 0.9 : 0.56);
      if (isActive) {
        tab.frame.setTint(0xc8e5ff);
      } else {
        tab.frame.clearTint();
      }
      return;
    }

    tab.btn.setStyle({
      backgroundColor: isActive ? '#3a3a5a' : '#1a1a2e',
    });
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
    this.writeFrameQaProbeIfEnabled('ready');
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
    if (this.inputFrame) {
      this.inputFrame.setTint(0xbad7ff);
      this.inputFrame.setAlpha(1);
    } else {
      this.inputBg.setStrokeStyle(1, 0x4488ff);
    }
    this.updateInputDisplay();
  }

  private unfocusInput(): void {
    this.isInputFocused = false;
    if (this.inputFrame) {
      this.inputFrame.clearTint();
      this.inputFrame.setAlpha(0.86);
    } else {
      this.inputBg.setStrokeStyle(1, 0x3a3a5a);
    }
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
    this.writeFrameQaProbeIfEnabled('ready');
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.setVisible(!this.container.visible); }
  public isVisible(): boolean { return this.container.visible; }
  public isFocused(): boolean { return this.isInputFocused; }
  public writeFrameQaProbe(status: 'ready' | 'hidden' = 'ready'): void {
    if (typeof document === 'undefined' || !document.body) return;
    const emojiButtonIconResource = getSpriteResourceForStatusIcon(CHAT_EMOJI_BUTTON_ICON_ID);
    const missingEmojiButtonIconKeys = emojiButtonIconResource && !this.emojiButtonIcon
      ? [emojiButtonIconResource.key]
      : [];
    const missingFrameKeys = Array.from(new Set([
      ...this.missingFrameKeys,
      ...(this.tabFrames.length < CHAT_EXPECTED_TAB_FRAME_COUNT ? [CHAT_UI_FRAME_TEXTURES.tabButton.key] : []),
    ]));

    document.body.dataset.aeternaChatFrameQa = JSON.stringify({
      status,
      visible: this.container.visible,
      renderedFrameKeys: this.renderedFrameKeys,
      renderedFrameCount: this.renderedFrameKeys.length,
      expectedFrameCount: CHAT_EXPECTED_RENDERED_FRAME_KEY_COUNT,
      missingFrameKeys,
      panelFrame: {
        key: CHAT_UI_FRAME_TEXTURES.panel.key,
        path: CHAT_UI_FRAME_TEXTURES.panel.path,
        rendered: this.panelFrame !== null,
        displayWidth: this.panelFrame?.displayWidth ?? 0,
        displayHeight: this.panelFrame?.displayHeight ?? 0,
      },
      inputFrame: {
        key: CHAT_UI_FRAME_TEXTURES.input.key,
        path: CHAT_UI_FRAME_TEXTURES.input.path,
        rendered: this.inputFrame !== null,
        displayWidth: this.inputFrame?.displayWidth ?? 0,
        displayHeight: this.inputFrame?.displayHeight ?? 0,
      },
      emojiButtonFrame: {
        key: CHAT_UI_FRAME_TEXTURES.emojiButton.key,
        path: CHAT_UI_FRAME_TEXTURES.emojiButton.path,
        rendered: this.emojiButtonFrame !== null,
        displayWidth: this.emojiButtonFrame?.displayWidth ?? 0,
        displayHeight: this.emojiButtonFrame?.displayHeight ?? 0,
      },
      emojiButtonIcon: {
        iconId: CHAT_EMOJI_BUTTON_ICON_ID,
        key: emojiButtonIconResource?.key ?? null,
        path: emojiButtonIconResource?.path ?? null,
        rendered: this.emojiButtonIcon !== null,
        visible: this.emojiButtonIcon?.visible ?? false,
        displayWidth: this.emojiButtonIcon?.displayWidth ?? 0,
        displayHeight: this.emojiButtonIcon?.displayHeight ?? 0,
        fallbackRendered: this.emojiButtonFallback !== null,
        missingIconKeys: missingEmojiButtonIconKeys,
      },
      tabButtonFrame: {
        key: CHAT_UI_FRAME_TEXTURES.tabButton.key,
        path: CHAT_UI_FRAME_TEXTURES.tabButton.path,
        renderedCount: this.tabFrames.length,
        expectedCount: CHAT_EXPECTED_TAB_FRAME_COUNT,
        displaySizes: this.tabFrames.map((frame) => ({
          name: frame.name,
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      activeChannel: this.activeChannel,
      tabLabels: this.tabs.map((tab) => tab.btn.text),
      inputBufferLength: this.inputBuffer.length,
      inputTextPreview: this.inputText.text,
      tabCount: this.tabs.length,
      messageCount: Array.from(this.messages.values()).reduce((sum, messages) => sum + messages.length, 0),
      visibleMessageRows: this.messageTexts.filter((text) => text.text.length > 0).length,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  public destroy(): void {
    const socket = this.net.getSocket();
    if (socket) {
      this.socketHandlers.forEach(([event, handler]) => socket.off(event, handler));
    }
    this.socketHandlers = [];
    this.container.destroy();
  }

  private writeFrameQaProbeIfEnabled(status: 'ready' | 'hidden'): void {
    if (this.config.frameQa || this.isFrameQaRoute()) {
      this.writeFrameQaProbe(status);
    }
  }

  private isFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('chatFrameQa') === '1';
  }

  private addRenderedFrameKey(key: string): void {
    if (!this.renderedFrameKeys.includes(key)) {
      this.renderedFrameKeys.push(key);
    }
  }

  private addMissingFrameKey(key: string): void {
    if (!this.missingFrameKeys.includes(key)) {
      this.missingFrameKeys.push(key);
    }
  }
}
