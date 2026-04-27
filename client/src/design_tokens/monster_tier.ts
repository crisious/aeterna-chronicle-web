/**
 * monster_tier.ts — 몬스터 아트 파이프라인 Tier 토큰 (토픽 확장)
 *
 * ─── SSOT 위계 (Phase 54 정리) ────────────────────────────────
 *   1차 SSOT: `/DESIGN.md` §10 (Monster Tier Tokens) + docs/release/design-system_monster-art-pipeline.md
 *   2차 (코어): `client/src/config/design-tokens.ts` — 코어 컬러/타이포 미러
 *   3차 (본 파일): 몬스터 Tier 토픽 확장 — 본 파일이 monster 토픽의 코드 미러
 *   4차 (런타임): 필요 시 `client/src/constants/` 추가
 *
 *   변경 절차:
 *     - DESIGN.md §10 또는 design-system_monster-art-pipeline.md 갱신 → 본 파일 미러
 *     - 본 파일 단독 갱신 금지 (드리프트 위험) — 항상 1차 SSOT부터
 *
 * 주의:
 * - 이 파일은 "구조"만 담당한다.
 * - 실제 렌더링/애니메이션 적용은 Build/Development 단계에서 연결한다.
 */

export const MONSTER_TIER_ORDER = ['normal', 'elite', 'boss'] as const;

export type MonsterTierId = typeof MONSTER_TIER_ORDER[number];

export interface MonsterTierToken {
  readonly id: MonsterTierId;
  readonly labelKo: string;
  readonly sprite: {
    readonly widthPx: number;
    readonly heightPx: number;
    readonly allowAsymmetric: boolean;
    readonly aspectRatioMax: number;
  };
  readonly outline: {
    readonly widthPx: number;
    readonly colorHex: string;
    readonly highlightWidthPx: number;
    readonly highlightColorHex?: string;
    readonly gradientHex?: readonly [string, string];
  };
  readonly rimLight: {
    readonly enabled: boolean;
    readonly widthPx: number;
    readonly colorHex?: string;
    readonly placement: 'none' | 'top-left' | 'full-silhouette';
  };
  readonly palette: {
    readonly maxColors: number;
    readonly fileName: string;
  };
  readonly idle: {
    readonly frames: number;
    readonly amplitudePx: number;
    readonly fps: number;
  };
  readonly particles: {
    readonly minCount: number;
    readonly maxCount: number;
    readonly colorHex?: string;
    readonly screenAmbient: boolean;
  };
  readonly intro: {
    readonly durationMs: number;
  };
}

export const MONSTER_TIER_TOKENS: Record<MonsterTierId, MonsterTierToken> = {
  normal: {
    id: 'normal',
    labelKo: '일반',
    sprite: {
      widthPx: 32,
      heightPx: 32,
      allowAsymmetric: false,
      aspectRatioMax: 1,
    },
    outline: {
      widthPx: 2,
      colorHex: '#000000',
      highlightWidthPx: 0,
    },
    rimLight: {
      enabled: false,
      widthPx: 0,
      placement: 'none',
    },
    palette: {
      maxColors: 16,
      fileName: 'tier_normal.aseprite-pal',
    },
    idle: {
      frames: 4,
      amplitudePx: 1,
      fps: 6,
    },
    particles: {
      minCount: 0,
      maxCount: 0,
      screenAmbient: false,
    },
    intro: {
      durationMs: 0,
    },
  },
  elite: {
    id: 'elite',
    labelKo: '엘리트',
    sprite: {
      widthPx: 48,
      heightPx: 48,
      allowAsymmetric: false,
      aspectRatioMax: 1.15,
    },
    outline: {
      widthPx: 2,
      colorHex: '#000000',
      highlightWidthPx: 1,
      highlightColorHex: '#FFD700',
    },
    rimLight: {
      enabled: true,
      widthPx: 1,
      colorHex: '#FFD700',
      placement: 'top-left',
    },
    palette: {
      maxColors: 24,
      fileName: 'tier_elite.aseprite-pal',
    },
    idle: {
      frames: 6,
      amplitudePx: 2,
      fps: 8,
    },
    particles: {
      minCount: 2,
      maxCount: 3,
      colorHex: '#FFD700',
      screenAmbient: false,
    },
    intro: {
      durationMs: 800,
    },
  },
  boss: {
    id: 'boss',
    labelKo: '보스',
    sprite: {
      widthPx: 64,
      heightPx: 64,
      allowAsymmetric: true,
      aspectRatioMax: 1.5,
    },
    outline: {
      widthPx: 2,
      colorHex: '#000000',
      highlightWidthPx: 2,
      gradientHex: ['#89CFF0', '#FFD700'],
    },
    rimLight: {
      enabled: true,
      widthPx: 2,
      colorHex: '#89CFF0',
      placement: 'full-silhouette',
    },
    palette: {
      maxColors: 32,
      fileName: 'tier_boss.aseprite-pal',
    },
    idle: {
      frames: 8,
      amplitudePx: 3,
      fps: 10,
    },
    particles: {
      minCount: 5,
      maxCount: 8,
      colorHex: '#89CFF0',
      screenAmbient: true,
    },
    intro: {
      durationMs: 3000,
    },
  },
};

export function getMonsterTierToken(tier: MonsterTierId): MonsterTierToken {
  return MONSTER_TIER_TOKENS[tier];
}

/**
 * 런타임 sprite 사이즈 검증.
 *
 * 사용처: AssetManager 가 몬스터 sprite 로드 직후 호출하여
 *         Tier 정의를 위반한 에셋이 실서비스로 흘러가는 것을 차단한다.
 *
 * 보스 Tier 는 비대칭 허용 (allowAsymmetric=true) — 64px 정사각이 아니라도
 * `aspectRatioMax` 와 절대 상한 (96px) 을 동시에 만족하면 통과.
 *
 * @throws Error 사이즈 위반 시 게임 부팅을 차단할 수 있도록 throw.
 */
export function assertTierSize(tier: MonsterTierId, w: number, h: number): void {
  const token = MONSTER_TIER_TOKENS[tier];
  const maxW = token.sprite.allowAsymmetric ? 96 : token.sprite.widthPx;
  const maxH = token.sprite.allowAsymmetric ? 96 : token.sprite.heightPx;

  if (w <= 0 || h <= 0) {
    throw new Error(`[MonsterTier] ${tier} sprite has invalid dimensions ${w}x${h}`);
  }
  if (w > maxW || h > maxH) {
    throw new Error(
      `[MonsterTier] ${tier} sprite ${w}x${h} exceeds ${maxW}x${maxH} ` +
        `(allowAsymmetric=${token.sprite.allowAsymmetric})`
    );
  }
  const aspect = Math.max(w / h, h / w);
  if (aspect > token.sprite.aspectRatioMax) {
    throw new Error(
      `[MonsterTier] ${tier} sprite aspect ratio ${aspect.toFixed(2)} ` +
        `exceeds max ${token.sprite.aspectRatioMax}`
    );
  }
}

/**
 * Tier 별 CSS 클래스 이름. monster-tier.css 헬퍼 클래스와 1:1.
 * 사용 예: `<div className={`monster ${cssClassForTier('elite')}`}/>`
 */
export function cssClassForTier(tier: MonsterTierId): `monster--${MonsterTierId}` {
  return `monster--${tier}` as const;
}

