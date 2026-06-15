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

/**
 * 팔레트 스왑 리컬러 스킨(Phase D Part②). 각 스킨은 6클래스 전부에 대해
 * assets/generated/characters/recolors/char_<class>_<skin>.png 로 존재한다.
 * 'base'(또는 미지정)는 원본. 새 시즌 스킨 = 이 목록에 추가 + 리컬러 생성.
 */
export const CHARACTER_RECOLOR_SKINS = ['ember'] as const;
export type CharacterSkinId = (typeof CHARACTER_RECOLOR_SKINS)[number];

export function isCharacterSkinId(skinId: string | undefined): skinId is CharacterSkinId {
  return skinId !== undefined && (CHARACTER_RECOLOR_SKINS as readonly string[]).includes(skinId);
}

/**
 * classId(+선택 skinId)로 스프라이트 리소스를 해석. 스킨이 유효하면 리컬러
 * PNG/JSON 과 스킨 전용 textureKey 를 가진 파생 리소스를 반환(프레임 레이아웃은
 * base 와 동일 — 리컬러는 색만 교체). 스킨 미지정/'base'/미지원이면 원본.
 */
export function getCharacterSpriteResource(
  classId: string,
  skinId?: string,
): CharacterSpriteResource | undefined {
  const base = CHARACTER_SPRITE_RESOURCE_BY_CLASS_ID.get(classId);
  if (!base || !isCharacterSkinId(skinId)) return base;
  return {
    ...base,
    textureKey: `char_sprite_${classId}_${skinId}`,
    imagePath: `assets/generated/characters/recolors/char_${classId}_${skinId}.png`,
    jsonPath: `assets/generated/characters/recolors/char_${classId}_${skinId}.json`,
  };
}

/**
 * 애니메이션 키는 *textureKey 기반*이어야 한다 — Phaser 의
 * generateFrameNumbers 는 textureKey 를 anim 에 굽기 때문에, base 와 스킨이
 * 같은 키를 공유하면 먼저 생성된 텍스처가 고정돼 스킨이 base 프레임을 재생한다.
 * textureKey 가 class+skin 을 인코딩하므로 키가 스킨별로 자동 분리된다.
 */
export function getCharacterSpriteAnimationKey(
  textureKey: string,
  motion: CharacterMotion,
  direction: CharacterDirection,
): string {
  return `${textureKey}_${motion}_${direction}`;
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
