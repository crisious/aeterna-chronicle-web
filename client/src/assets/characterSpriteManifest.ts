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
    directions: ['D'],
    motions: ['idle', 'walk'],
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
