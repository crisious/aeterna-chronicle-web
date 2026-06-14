import * as Phaser from 'phaser';
import type { NetworkManager } from '../network/NetworkManager';
import {
  Minimap,
  type MinimapMarker,
  preloadMinimapUiFrameTextures,
} from '../ui/Minimap';

type MinimapEventHandler = (payload: unknown) => void;

class MinimapQaNetwork {
  private handlers = new Map<string, Set<MinimapEventHandler>>();

  on(event: string, handler: MinimapEventHandler): void {
    const handlers = this.handlers.get(event) ?? new Set<MinimapEventHandler>();
    handlers.add(handler);
    this.handlers.set(event, handlers);
  }

  emit(event: string, payload: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }
}

const QA_MARKERS: MinimapMarker[] = [
  { id: 'qa-npc-gorodi', type: 'npc', x: 420, y: 520, name: '고로디' },
  { id: 'qa-monster-memory-dust', type: 'monster', x: 1680, y: 860, name: '기억 먼지' },
  { id: 'qa-portal-sanctuary', type: 'portal', x: 2600, y: 440, name: '성소 관문' },
  { id: 'qa-quest-fragment', type: 'quest', x: 1120, y: 2320, name: '기억 파편' },
];

export class MinimapQaScene extends Phaser.Scene {
  private minimap?: Minimap;

  constructor() {
    super({ key: 'MinimapQaScene' });
  }

  preload(): void {
    preloadMinimapUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0f172a');

    this.add.text(24, 24, 'Standalone Minimap Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, 58, 'Aseprite UI-HUD-002-DEF panel frame + marker content inset', {
      fontSize: '14px',
      color: '#9fb4d0',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width / 2, height / 2, 520, 320, 0x1d2a3f, 0.28)
      .setStrokeStyle(1, 0x5d7599, 0.5);

    const qaNetwork = new MinimapQaNetwork();
    this.minimap = new Minimap(this, qaNetwork as unknown as NetworkManager, { frameQa: true });
    this.minimap.setZone('aether_plains', '에테르 평원', 3200, 3200);
    this.minimap.setPlayerPosition(800, 1200);
    for (const marker of QA_MARKERS) {
      this.minimap.addMarker(marker);
    }
    this.minimap.setOnClickMove((worldX, worldY) => {
      this.minimap?.setPlayerPosition(worldX, worldY);
    });

    this.time.delayedCall(250, () => this.minimap?.writeFrameQaProbe('ready'));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyMinimap());
  }

  private destroyMinimap(): void {
    this.minimap?.destroy();
    this.minimap = undefined;
  }
}
