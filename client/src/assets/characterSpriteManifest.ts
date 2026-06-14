export type CharacterMotion =
  | 'idle'
  | 'walk'
  | 'attack_melee'
  | 'attack_ranged'
  | 'cast'
  | 'hit'
  | 'death'
  | 'ready'
  | 'victory';

export type CharacterDirection = 'D' | 'DL' | 'L' | 'UL' | 'U';

export interface CharacterSpriteResource {
  readonly classId: string;
  readonly textureKey: string;
  readonly imagePath: string;
  readonly jsonPath: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly directions: readonly CharacterDirection[];
  readonly motions: readonly CharacterMotion[];
}

export const CHARACTER_SPRITE_MANIFEST = [
  {
    classId: 'ether_knight',
    textureKey: 'char_sprite_ether_knight_base',
    imagePath: 'assets/generated/characters/sprites/char_ether_knight_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_ether_knight_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'],
  },
  {
    classId: 'memory_weaver',
    textureKey: 'char_sprite_memory_weaver_base',
    imagePath: 'assets/generated/characters/sprites/char_memory_weaver_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_memory_weaver_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'],
  },
  {
    classId: 'shadow_weaver',
    textureKey: 'char_sprite_shadow_weaver_base',
    imagePath: 'assets/generated/characters/sprites/char_shadow_weaver_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_shadow_weaver_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'],
  },
  {
    classId: 'memory_breaker',
    textureKey: 'char_sprite_memory_breaker_base',
    imagePath: 'assets/generated/characters/sprites/char_memory_breaker_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_memory_breaker_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'],
  },
  {
    classId: 'time_guardian',
    textureKey: 'char_sprite_time_guardian_base',
    imagePath: 'assets/generated/characters/sprites/char_time_guardian_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_time_guardian_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'],
  },
  {
    classId: 'void_wanderer',
    textureKey: 'char_sprite_void_wanderer_base',
    imagePath: 'assets/generated/characters/sprites/char_void_wanderer_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_void_wanderer_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'],
  },
] as const satisfies readonly CharacterSpriteResource[];

const CHARACTER_SPRITE_RESOURCE_BY_CLASS_ID: ReadonlyMap<string, CharacterSpriteResource> = new Map(
  CHARACTER_SPRITE_MANIFEST.map((resource) => [resource.classId, resource] as const),
);

export function getCharacterSpriteResource(classId: string): CharacterSpriteResource | undefined {
  return CHARACTER_SPRITE_RESOURCE_BY_CLASS_ID.get(classId);
}

export function getCharacterSpriteAnimationKey(
  classId: string,
  motion: CharacterMotion,
  direction: CharacterDirection,
): string {
  return `char_sprite_${classId}_${motion}_${direction}`;
}

// --- Frame-range SSOT -------------------------------------------------------
// The generated sheets lay out 40 frames per direction, in a fixed motion
// order, with one direction after another. This block is the single source of
// truth for that layout so the runtime (BattleScene anims) and the contract
// tests agree on which frame indices belong to which motion. Changing the
// sheet layout (e.g. Phase B's 30→40 expansion) means changing it *here* and
// the consumers follow.

/** Frames authored per direction in every full character sheet. */
export const CHARACTER_BASE_FRAME_COUNT = 40;

/**
 * Direction order as laid out along the sheet. The frame offset for a
 * direction is its index in this array × CHARACTER_BASE_FRAME_COUNT.
 */
export const CHARACTER_DIRECTION_ORDER = ['D', 'DL', 'L', 'UL', 'U'] as const;

/**
 * Inclusive frame index range for each motion, relative to a direction's
 * block (direction D). death is appended after the 0–29 Phase A range so the
 * original indices stay stable; ready/victory follow (Phase B).
 */
export const CHARACTER_MOTION_FRAMES: Readonly<
  Record<CharacterMotion, { readonly from: number; readonly to: number }>
> = {
  idle: { from: 0, to: 3 },
  walk: { from: 4, to: 9 },
  attack_melee: { from: 10, to: 15 },
  // attack_ranged shares the melee block: classes without a distinct ranged
  // animation fall back to it rather than indexing past the authored frames.
  attack_ranged: { from: 10, to: 15 },
  cast: { from: 16, to: 20 },
  hit: { from: 21, to: 23 },
  death: { from: 24, to: 29 },
  ready: { from: 30, to: 33 },
  victory: { from: 34, to: 39 },
};

/**
 * Absolute (sheet-wide) frame index range for a motion in a given direction.
 * Returns inclusive { from, to } suitable for Phaser
 * `generateFrameNumbers(key, { start, end })`.
 */
export function getCharacterFrameRange(
  motion: CharacterMotion,
  direction: CharacterDirection,
): { from: number; to: number } {
  const base = CHARACTER_MOTION_FRAMES[motion];
  const dirIndex = CHARACTER_DIRECTION_ORDER.indexOf(direction);
  const offset = (dirIndex < 0 ? 0 : dirIndex) * CHARACTER_BASE_FRAME_COUNT;
  return { from: base.from + offset, to: base.to + offset };
}
