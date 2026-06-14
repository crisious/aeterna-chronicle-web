import type * as Phaser from 'phaser';
import { getSpriteResourceForStatusIcon, type SpriteResource } from '../assets/spriteResourceManifest';
import { STATUS_EFFECT_ICON_IDS } from './statusIconSpecs';

export { STATUS_EFFECT_ICON_IDS };

export type StatusEffectIconId = typeof STATUS_EFFECT_ICON_IDS[number];

export function getStatusIconResource(effectId: string): SpriteResource | undefined {
  return getSpriteResourceForStatusIcon(effectId);
}

export function preloadStatusIconResources(scene: Phaser.Scene): void {
  for (const effectId of STATUS_EFFECT_ICON_IDS) {
    const resource = getStatusIconResource(effectId);
    if (resource && !scene.textures.exists(resource.key)) {
      scene.load.image(resource.key, resource.path);
    }
  }
}
