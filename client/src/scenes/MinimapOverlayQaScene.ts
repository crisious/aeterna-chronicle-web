import * as Phaser from 'phaser';
import {
  MinimapOverlay,
  preloadMinimapOverlayUiFrameTextures,
} from '../ui/MinimapOverlay';

export class MinimapOverlayQaScene extends Phaser.Scene {
  private minimap?: MinimapOverlay;

  constructor() {
    super({ key: 'MinimapOverlayQaScene' });
  }

  preload(): void {
    preloadMinimapOverlayUiFrameTextures(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#101827');

    this.add.text(24, 24, 'Minimap Overlay Frame QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, height - 48, 'Aseprite UI-HUD-002-DEF frame + dynamic marker layer', {
      fontSize: '14px',
      color: '#91a7c2',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.minimap = new MinimapOverlay(this, { size: 220, margin: 24, frameQa: true });
    this.minimap.setZone({
      zoneId: 'qa_aether_plains',
      zoneName: 'QA 에테르 평원',
      textureKey: '__missing_minimap_map',
      worldWidth: 1600,
      worldHeight: 1200,
    });
    this.minimap.setMarkers([
      { id: 'npc-gorody', type: 'npc', x: 360, y: 420, label: '고로디', active: true },
      { id: 'quest-echo', type: 'quest_give', x: 960, y: 360, label: '기억 파편', active: true },
      { id: 'dungeon-ruin', type: 'dungeon', x: 1250, y: 820, label: '폐허 입구', active: true },
      { id: 'monster-aggro', type: 'monster_aggro', x: 720, y: 760, label: '시간 망령', active: true },
    ]);
    this.minimap.updatePlayerPosition(760, 560);
    this.minimap.setWaypoint(1180, 880);
    this.minimap.writeFrameQaProbe('ready');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyMinimap());

    this.add.rectangle(width / 2, height / 2, 480, 280, 0x203248, 0.28)
      .setStrokeStyle(1, 0x5a7ea2, 0.5);
  }

  private destroyMinimap(): void {
    this.minimap?.destroy();
    this.minimap = undefined;
  }
}
