import * as Phaser from 'phaser';
import type { NetworkManager } from '../network/NetworkManager';
import {
  ChatUI,
  type ChatMessage,
  preloadChatUiFrameTextures,
} from '../ui/ChatUI';

type ChatHandler = (payload: any) => void;

class ChatQaSocket {
  private handlers = new Map<string, Set<ChatHandler>>();

  on(event: string, handler: ChatHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<ChatHandler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  off(event: string, handler: ChatHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }
}

class ChatQaNetwork {
  private readonly socket = new ChatQaSocket();

  getSocket(): ChatQaSocket {
    return this.socket;
  }

  getUserId(): string {
    return 'chat-frame-qa-user';
  }

  emitMessage(message: ChatMessage): void {
    this.socket.emit('chat:message', message);
  }

  emitSystem(channel: ChatMessage['channel'], content: string): void {
    this.socket.emit('chat:system', { channel, content });
  }
}

export class ChatUiQaScene extends Phaser.Scene {
  private chatUi?: ChatUI;
  private qaNetwork?: ChatQaNetwork;

  constructor() {
    super({ key: 'ChatUiQaScene' });
  }

  preload(): void {
    preloadChatUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(24, 24, 'Chat UI Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, 58, 'Aseprite UI-HUD-008-DEF panel + UI-BTN-006-DEF input', {
      fontSize: '14px',
      color: '#9fb4d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width / 2, height / 2, 620, 320, 0x1d2a3f, 0.28)
      .setStrokeStyle(1, 0x5d7599, 0.5);

    this.qaNetwork = new ChatQaNetwork();
    this.chatUi = new ChatUI(this, this.qaNetwork as unknown as NetworkManager, { frameQa: true });

    const now = Date.now();
    this.qaNetwork.emitMessage({
      id: 'chat-frame-qa-1',
      channel: 'general',
      senderId: 'qa-gorody',
      senderName: '고로디',
      content: 'Aseprite 채팅 패널 프레임이 먼저 렌더되는지 확인합니다.',
      timestamp: now,
      isSystem: false,
    });
    this.qaNetwork.emitSystem('general', '입력창도 UI-BTN-006-DEF 프레임으로 표시됩니다.');
    this.qaNetwork.emitMessage({
      id: 'chat-frame-qa-2',
      channel: 'party',
      senderId: 'qa-party',
      senderName: '파티원',
      content: '비활성 채널 미읽음 카운트도 기존 로직을 유지합니다.',
      timestamp: now + 1,
      isSystem: false,
    });

    this.time.delayedCall(250, () => this.chatUi?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyChatUi());
  }

  private destroyChatUi(): void {
    this.chatUi?.destroy();
    this.chatUi = undefined;
    this.qaNetwork = undefined;
  }
}
