import * as Phaser from 'phaser';
import {
  MinimapOverlay,
  preloadMinimapOverlayUiFrameTextures,
} from '../ui/MinimapOverlay';
import {
  NavigationManager,
  preloadNavigationArrowTexture,
} from '../ui/NavigationManager';

export class NavigationArrowQaScene extends Phaser.Scene {
  private minimap?: MinimapOverlay;
  private navigation?: NavigationManager;

  constructor() {
    super({ key: 'NavigationArrowQaScene' });
  }

  preload(): void {
    preloadMinimapOverlayUiFrameTextures(this);
    preloadNavigationArrowTexture(this);
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#111827');

    this.add.text(24, 24, 'Navigation Arrow Image QA', {
      fontSize: '24px',
      color: '#d7f8ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });
    this.add.text(24, height - 48, 'Aseprite skill_mw_arrow image + NavigationManager fallback probe', {
      fontSize: '14px',
      color: '#91a7c2',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    });

    this.add.rectangle(width / 2, height / 2, 520, 320, 0x203248, 0.28)
      .setStrokeStyle(1, 0x5a7ea2, 0.5);
    this.add.circle(width / 2, height / 2, 12, 0xfbbf24, 1);

    this.minimap = new MinimapOverlay(this, { size: 220, margin: 24, frameQa: true });
    this.navigation = new NavigationManager(
      this,
      this.minimap,
      { distance: 96, size: 20, alpha: 0.92 },
      { frameQa: true },
    );

    this.navigation.registerZoneMap({
      zoneId: 'qa_aether_plains',
      zoneName: 'QA 에테르 평원',
      textureKey: '__missing_minimap_map',
      worldWidth: 2600,
      worldHeight: 1800,
    });
    this.navigation.changeZone('qa_aether_plains');
    this.navigation.setNpcMarkers([
      { id: 'gorodi', x: 360, y: 420, label: '고로디' },
      { id: 'mira', x: 820, y: 620, label: '미라' },
    ]);
    this.navigation.setWaypoint(2400, 1600);
    this.navigation.update(width / 2, height / 2);
    this.navigation.writeArrowQaProbe('ready');
    this.minimap.writeFrameQaProbe('ready');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyNavigation());
  }

  private destroyNavigation(): void {
    this.navigation?.destroy();
    this.navigation = undefined;
    this.minimap?.destroy();
    this.minimap = undefined;
  }
}
