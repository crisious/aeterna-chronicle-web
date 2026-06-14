export type CosmeticSeason = 1 | 2 | 3;

export interface CosmeticAssetSpec {
  season: CosmeticSeason;
  cosmeticId: string;
  runtimeKey: string;
  runtimePath: string;
}

interface CosmeticGroupSpec {
  season: CosmeticSeason;
  prefix: string;
  count: number;
}

const COSMETIC_GROUPS: readonly CosmeticGroupSpec[] = [
  { season: 1, prefix: 'COS-EMOTE', count: 7 },
  { season: 1, prefix: 'COS-MOUNT', count: 5 },
  { season: 1, prefix: 'COS-PET', count: 8 },
  { season: 1, prefix: 'COS-SKIN_EK', count: 5 },
  { season: 1, prefix: 'COS-SKIN_MW', count: 5 },
  { season: 1, prefix: 'COS-SKIN_SW', count: 5 },
  { season: 1, prefix: 'COS-TITLE', count: 5 },
  { season: 1, prefix: 'COS-WPN', count: 10 },
  { season: 2, prefix: 'COS-AURA_S2', count: 10 },
  { season: 2, prefix: 'COS-EMOTE_S2', count: 3 },
  { season: 2, prefix: 'COS-MOUNT_S2', count: 4 },
  { season: 2, prefix: 'COS-PET_S2', count: 5 },
  { season: 2, prefix: 'COS-SKIN_S2_EK', count: 2 },
  { season: 2, prefix: 'COS-SKIN_S2_MB', count: 2 },
  { season: 2, prefix: 'COS-SKIN_S2_MW', count: 2 },
  { season: 2, prefix: 'COS-SKIN_S2_SW', count: 2 },
  { season: 2, prefix: 'COS-WING_S2', count: 10 },
  { season: 2, prefix: 'COS-WPN_S2', count: 10 },
  { season: 3, prefix: 'COS-AURA_S3', count: 5 },
  { season: 3, prefix: 'COS-EMOTE_S3', count: 5 },
  { season: 3, prefix: 'COS-MOUNT_S3', count: 5 },
  { season: 3, prefix: 'COS-PET_S3', count: 6 },
  { season: 3, prefix: 'COS-SKIN_S3_EK', count: 3 },
  { season: 3, prefix: 'COS-SKIN_S3_MB', count: 3 },
  { season: 3, prefix: 'COS-SKIN_S3_MW', count: 3 },
  { season: 3, prefix: 'COS-SKIN_S3_SW', count: 3 },
  { season: 3, prefix: 'COS-SKIN_S3_TG', count: 3 },
  { season: 3, prefix: 'COS-TITLE_S3', count: 6 },
  { season: 3, prefix: 'COS-WPN_S3', count: 8 },
];

export function createCosmeticRuntimeKey(season: CosmeticSeason, cosmeticId: string): string {
  return `cosmetic_s${season}_${cosmeticId.replace(/[^A-Za-z0-9]+/g, '_')}`;
}

export function getAllCosmeticAssetSpecs(): CosmeticAssetSpec[] {
  return COSMETIC_GROUPS.flatMap((group) => Array.from({ length: group.count }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    const cosmeticId = `${group.prefix}_${number}`;

    return {
      season: group.season,
      cosmeticId,
      runtimeKey: createCosmeticRuntimeKey(group.season, cosmeticId),
      runtimePath: `assets/generated/cosmetics/season${group.season}/${cosmeticId}.png`,
    };
  }));
}
