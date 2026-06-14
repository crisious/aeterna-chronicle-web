export type CharacterMotion =
  | 'idle'
  | 'walk'
  | 'attack_melee'
  | 'attack_ranged'
  | 'cast'
  | 'hit'
  | 'death';

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
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death'],
  },
  {
    classId: 'memory_weaver',
    textureKey: 'char_sprite_memory_weaver_base',
    imagePath: 'assets/generated/characters/sprites/char_memory_weaver_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_memory_weaver_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death'],
  },
  {
    classId: 'shadow_weaver',
    textureKey: 'char_sprite_shadow_weaver_base',
    imagePath: 'assets/generated/characters/sprites/char_shadow_weaver_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_shadow_weaver_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death'],
  },
  {
    classId: 'memory_breaker',
    textureKey: 'char_sprite_memory_breaker_base',
    imagePath: 'assets/generated/characters/sprites/char_memory_breaker_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_memory_breaker_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death'],
  },
  {
    classId: 'time_guardian',
    textureKey: 'char_sprite_time_guardian_base',
    imagePath: 'assets/generated/characters/sprites/char_time_guardian_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_time_guardian_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death'],
  },
  {
    classId: 'void_wanderer',
    textureKey: 'char_sprite_void_wanderer_base',
    imagePath: 'assets/generated/characters/sprites/char_void_wanderer_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_void_wanderer_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D', 'DL', 'L', 'UL', 'U'],
    motions: ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death'],
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
