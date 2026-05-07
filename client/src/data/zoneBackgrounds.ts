import type { ChronoEraId } from '../time/ChronoTimeline';

type ZoneBackgroundPhase = 'DAY' | 'DUSK' | 'NIGHT';

interface ZoneBackgroundProfile {
  prefix: string;
  fieldPhase: ZoneBackgroundPhase;
  tintColor: number;
}

export interface ZoneBackgroundDescriptor {
  farKey: string;
  farPath: string;
  skyKey: string;
  skyPath: string;
  battleKey: string;
  battlePath: string;
  prefix: string;
  phase: ZoneBackgroundPhase;
  tintColor: number;
}

const BACKGROUND_DIR = 'assets/generated/environment/backgrounds';

const DEFAULT_PROFILE: ZoneBackgroundProfile = {
  prefix: 'ERB',
  fieldPhase: 'DAY',
  tintColor: 0x88cc44,
};

const ZONE_BACKGROUND_PROFILES: Record<string, ZoneBackgroundProfile> = {
  aether_plains: {
    prefix: 'ERB',
    fieldPhase: 'DAY',
    tintColor: 0x88cc44,
  },
  memory_forest: {
    prefix: 'SYL',
    fieldPhase: 'DAY',
    tintColor: 0x44aa88,
  },
  malatus_sanctuary: {
    prefix: 'TEM',
    fieldPhase: 'DAY',
    tintColor: 0x7fd8a8,
  },
  shadow_gorge: {
    prefix: 'ABY',
    fieldPhase: 'DAY',
    tintColor: 0x664488,
  },
  crystal_cave: {
    prefix: 'NOR',
    fieldPhase: 'DAY',
    tintColor: 0x44cccc,
  },
  forgotten_citadel: {
    prefix: 'ARG',
    fieldPhase: 'DAY',
    tintColor: 0xcc8844,
  },
  chrono_spire: {
    prefix: 'TEM',
    fieldPhase: 'DAY',
    tintColor: 0xff4488,
  },
  erebos: {
    prefix: 'ERB',
    fieldPhase: 'DAY',
    tintColor: 0x88cc44,
  },
  sylvanheim: {
    prefix: 'SYL',
    fieldPhase: 'DAY',
    tintColor: 0x44aa88,
  },
  solaris: {
    prefix: 'ARG',
    fieldPhase: 'DAY',
    tintColor: 0xffcc44,
  },
  boreal: {
    prefix: 'NOR',
    fieldPhase: 'DAY',
    tintColor: 0x88ccff,
  },
  argentium: {
    prefix: 'ARG',
    fieldPhase: 'DAY',
    tintColor: 0xcc8844,
  },
  britalia: {
    prefix: 'BRI',
    fieldPhase: 'DAY',
    tintColor: 0x44aaff,
  },
  plateau_oblivion: {
    prefix: 'ABY',
    fieldPhase: 'DAY',
    tintColor: 0xbbaa88,
  },
  fog_sea: {
    prefix: 'NOR',
    fieldPhase: 'DAY',
    tintColor: 0x8899aa,
  },
};

function sanitizeTexturePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
}

export function resolveZoneBackground(
  zoneId: string,
  eraId: ChronoEraId = 'present',
): ZoneBackgroundDescriptor {
  const profile = ZONE_BACKGROUND_PROFILES[zoneId] ?? DEFAULT_PROFILE;
  // DUSK/NIGHT 원본 중 일부는 횡스크롤 타일셋이라 필드 카메라와 맞지 않는다.
  // 시대감은 ChronoTimeline tint overlay로 표현하고, 텍스처 키만 시대별로 분리한다.
  const phase = profile.fieldPhase;
  const keySuffix = `${sanitizeTexturePart(zoneId)}_${sanitizeTexturePart(eraId)}_${phase.toLowerCase()}`;
  const fileBase = `${profile.prefix}-BG`;

  return {
    farKey: `zone_bg_far_${keySuffix}`,
    farPath: `${BACKGROUND_DIR}/${fileBase}-FAR-${phase}.png`,
    skyKey: `zone_bg_sky_${keySuffix}`,
    skyPath: `${BACKGROUND_DIR}/${fileBase}-SKY-${phase}.png`,
    battleKey: `battle_bg_${keySuffix}`,
    battlePath: `${BACKGROUND_DIR}/${fileBase}-FAR-${phase}.png`,
    prefix: profile.prefix,
    phase,
    tintColor: profile.tintColor,
  };
}
