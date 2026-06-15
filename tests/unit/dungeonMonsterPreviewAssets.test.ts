import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  monsterBattleIconId?: string;
}

interface DungeonMonsterPreviewSpec {
  monsterId: string;
  runtimeKey: string;
  runtimePng: string;
  displaySize: number;
}

const DUNGEON_MONSTER_PREVIEWS: DungeonMonsterPreviewSpec[] = [
  {
    monsterId: 'mon_erebos_ruin_skeleton_normal',
    runtimeKey: 'monster_battle_icon_mon_erebos_ruin_skeleton_normal',
    runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_ruin_skeleton_normal.png',
    displaySize: 56,
  },
  {
    monsterId: 'mon_erebos_fog_wolf_normal',
    runtimeKey: 'monster_battle_icon_mon_erebos_fog_wolf_normal',
    runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_fog_wolf_normal.png',
    displaySize: 56,
  },
  {
    monsterId: 'mon_erebos_memory_ghost_normal',
    runtimeKey: 'monster_battle_icon_mon_erebos_memory_ghost_normal',
    runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_memory_ghost_normal.png',
    displaySize: 56,
  },
  {
    monsterId: 'mon_erebos_broken_golem_normal',
    runtimeKey: 'monster_battle_icon_mon_erebos_broken_golem_normal',
    runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_broken_golem_normal.png',
    displaySize: 56,
  },
  {
    monsterId: 'mon_erebos_ruin_spider_normal',
    runtimeKey: 'monster_battle_icon_mon_erebos_ruin_spider_normal',
    runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_ruin_spider_normal.png',
    displaySize: 56,
  },
  {
    monsterId: 'mon_erebos_memory_absorber_normal',
    runtimeKey: 'monster_battle_icon_mon_erebos_memory_absorber_normal',
    runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_memory_absorber_normal.png',
    displaySize: 80,
  },
];

function readPngSize(filePath: string): { w: number; h: number } {
  const buffer = readFileSync(filePath);

  return {
    w: buffer.readUInt32BE(16),
    h: buffer.readUInt32BE(20),
  };
}

function readSpriteRoster(): SpriteRosterItem[] {
  const rosterPath = resolve(process.cwd(), 'assets/source/aseprite/sprite-production-roster.json');
  const roster = JSON.parse(readFileSync(rosterPath, 'utf8')) as { items: SpriteRosterItem[] };

  return roster.items;
}

describe('dungeon monster preview runtime images', () => {
  it('던전 몬스터 preview는 기존 Aseprite monsterBattleIcon 로스터와 DungeonScene preload로 연결된다', () => {
    const roster = readSpriteRoster();
    const dungeonSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/DungeonScene.ts'), 'utf8');

    for (const spec of DUNGEON_MONSTER_PREVIEWS) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.monsterId).toEqual({ w: 64, h: 64 });
      expect(
        roster.some((item) => (
          item.category === 'monsterBattleIcon'
          && item.monsterBattleIconId === spec.monsterId
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.monsterId,
      ).toBe(true);
      expect(dungeonSource).toContain(`textureKey: '${spec.runtimeKey}'`);
      expect(dungeonSource).toContain(`path: 'assets/generated/monsters/battle/${spec.monsterId}.png'`);
      expect(dungeonSource).toContain(`displaySize: ${spec.displaySize}`);
    }

    expect(dungeonSource).toContain('for (const preview of Object.values(DUNGEON_MONSTER_PREVIEW_TEXTURES))');
    expect(dungeonSource).toContain('this.load.image(preview.textureKey, preview.path)');
    expect(dungeonSource).toContain('this.add.image(x, y, preview.textureKey)');
    expect(dungeonSource).toContain('sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(dungeonSource).toContain('Aseprite preview 로드 실패 시에만 사용하는 안전 fallback');
    expect(dungeonSource).toContain('gfx.generateTexture(`dmon_${i}`, rectSize, rectSize)');
  });
});
