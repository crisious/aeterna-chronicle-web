import type * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

export type SkillTreeClassId =
  | 'ether_knight'
  | 'memory_weaver'
  | 'shadow_weaver'
  | 'memory_breaker'
  | 'time_guardian'
  | 'void_wanderer';

export const SKILL_TREE_ICON_IDS: Record<SkillTreeClassId, readonly [string, string, string, string, string]> = {
  ether_knight: ['skill_ek_slash', 'skill_ek_shield', 'skill_ek_charge', 'skill_ek_explode', 'skill_ek_ultimate'],
  memory_weaver: ['skill_mw_arrow', 'skill_mw_heal', 'skill_mw_storm', 'skill_mw_passive', 'skill_mw_ultimate'],
  shadow_weaver: ['skill_sw_stab', 'skill_sw_smoke', 'skill_sw_vital', 'skill_sw_explosion', 'skill_sw_ultimate'],
  memory_breaker: ['skill_mb_shatter', 'skill_mb_ground', 'skill_mb_rage', 'skill_mb_storm', 'skill_mb_ultimate'],
  time_guardian: ['skill_tg_stop', 'skill_tg_slow', 'skill_tg_haste', 'skill_tg_reverse', 'skill_tg_eternity'],
  void_wanderer: ['skill_vw_bullet', 'skill_vw_warp', 'skill_vw_tether', 'skill_vw_rift', 'skill_vw_explosion'],
};

export function getAllSkillTreeIconIds(): readonly string[] {
  return Array.from(new Set(Object.values(SKILL_TREE_ICON_IDS).flat()));
}

export function getSkillTreeIconId(classId: string, tier: number, preferredIcon?: string | null): string | undefined {
  if (preferredIcon && getSpriteResourceForSkillIcon(preferredIcon)) {
    return preferredIcon;
  }

  const icons = SKILL_TREE_ICON_IDS[classId as SkillTreeClassId];
  const index = Math.floor(tier) - 1;

  return index >= 0 ? icons?.[index] : undefined;
}

export function preloadSkillTreeIconResources(scene: Phaser.Scene): void {
  for (const iconId of getAllSkillTreeIconIds()) {
    const resource = getSpriteResourceForSkillIcon(iconId);
    if (resource && !scene.textures.exists(resource.key)) {
      scene.load.image(resource.key, resource.path);
    }
  }
}
