/**
 * CDN 에셋 설정 — P7-17 CDN 에셋 배포
 *
 * 정적 에셋(이미지/사운드/스프라이트/폰트) 경로를 CDN URL로 라우팅.
 * 환경변수 CDN_BASE_URL이 설정되면 CDN 경로 사용, 아니면 로컬 fallback.
 *
 * 환경변수:
 *   VITE_CDN_BASE_URL  — CDN 기본 URL (예: https://cdn.aeterna.gg)
 *   VITE_CDN_VERSION   — 에셋 버전 (캐시 버스팅, 예: v1.2.0)
 *   VITE_CDN_ENABLED   — CDN 활성화 여부 (true/false, 기본: auto)
 */

// ── CDN 설정 ─────────────────────────────────────────────────

interface CdnConfig {
  /** CDN 활성화 여부 */
  enabled: boolean;
  /** CDN 기본 URL (trailing slash 없음) */
  baseUrl: string;
  /** 에셋 버전 (캐시 버스팅) */
  version: string;
  /** 에셋 타입별 경로 프리픽스 */
  paths: {
    images: string;
    sounds: string;
    sprites: string;
    fonts: string;
    videos: string;
  };
}

// Vite 환경변수 접근
const env = typeof import.meta !== 'undefined' && (import.meta as unknown as Record<string, Record<string, string>>).env
  ? (import.meta as unknown as Record<string, Record<string, string>>).env
  : (typeof process !== 'undefined' ? process.env : {}) as Record<string, string>;

const cdnBaseUrl = (env.VITE_CDN_BASE_URL || env.CDN_BASE_URL || '').replace(/\/$/, '');
const cdnVersion = env.VITE_CDN_VERSION || env.CDN_VERSION || 'v1';
const cdnEnabled = env.VITE_CDN_ENABLED === 'true' || (env.VITE_CDN_ENABLED !== 'false' && cdnBaseUrl.length > 0);

export const cdnConfig: CdnConfig = {
  enabled: cdnEnabled,
  baseUrl: cdnBaseUrl,
  version: cdnVersion,
  paths: {
    images: '/assets/images',
    sounds: '/assets/sounds',
    sprites: '/assets/sprites',
    fonts: '/assets/fonts',
    videos: '/assets/videos',
  },
};

// ── 에셋 URL 생성 함수 ──────────────────────────────────────

type AssetType = keyof CdnConfig['paths'];

/**
 * 에셋 파일의 전체 URL을 반환.
 * CDN 활성화 시: https://cdn.aeterna.gg/v1/assets/images/hero.png
 * CDN 비활성화 시: /assets/images/hero.png (로컬 상대 경로)
 *
 * @param type - 에셋 타입 (images, sounds, sprites, fonts, videos)
 * @param filename - 파일명 (예: hero.png, bgm_battle.ogg)
 * @param options - 추가 옵션
 */
export function assetUrl(
  type: AssetType,
  filename: string,
  options?: { noVersion?: boolean; subdir?: string }
): string {
  const pathPrefix = cdnConfig.paths[type];
  const subdir = options?.subdir ? `/${options.subdir}` : '';
  const relativePath = `${pathPrefix}${subdir}/${filename}`;

  if (!cdnConfig.enabled) {
    return relativePath;
  }

  const versionSegment = options?.noVersion ? '' : `/${cdnConfig.version}`;
  return `${cdnConfig.baseUrl}${versionSegment}${relativePath}`;
}

/**
 * 이미지 에셋 URL 숏컷
 * @example imageUrl('hero_portrait.png') → CDN 또는 로컬 경로
 */
export function imageUrl(filename: string, subdir?: string): string {
  return assetUrl('images', filename, { subdir });
}

/**
 * 사운드 에셋 URL 숏컷
 * @example soundUrl('bgm_battle.ogg') → CDN 또는 로컬 경로
 */
export function soundUrl(filename: string, subdir?: string): string {
  return assetUrl('sounds', filename, { subdir });
}

/**
 * 스프라이트 에셋 URL 숏컷
 * @example spriteUrl('player_idle.png') → CDN 또는 로컬 경로
 */
export function spriteUrl(filename: string, subdir?: string): string {
  return assetUrl('sprites', filename, { subdir });
}

/**
 * 폰트 에셋 URL 숏컷
 * @example fontUrl('NotoSansKR.woff2') → CDN 또는 로컬 경로
 */
export function fontUrl(filename: string): string {
  return assetUrl('fonts', filename);
}

// ── CDN 배포 설정 (서버/CI 사이드) ──────────────────────────

/** CloudFront/R2 배포에 필요한 설정 (CI 스크립트에서 참조) */
export const cdnDeployConfig = {
  /** S3/R2 버킷명 */
  bucket: env.CDN_BUCKET || 'aeterna-assets',
  /** CloudFront 디스트리뷰션 ID */
  distributionId: env.CDN_DISTRIBUTION_ID || '',
  /** 에셋 소스 디렉터리 (빌드 출력) */
  sourceDir: 'dist/assets',
  /** 캐시 TTL (초) */
  cacheTtl: {
    images: 86400 * 30,   // 30일
    sounds: 86400 * 30,
    sprites: 86400 * 30,
    fonts: 86400 * 365,   // 1년
    videos: 86400 * 7,    // 7일
  },
  /** 캐시 버스팅: 버전 프리픽스 사용 */
  versionPrefix: cdnVersion,
};

// ── 상태 조회 ────────────────────────────────────────────────

/** CDN 설정 상태 반환 (디버그/헬스체크용) */
export function getCdnStatus(): {
  enabled: boolean;
  baseUrl: string;
  version: string;
} {
  return {
    enabled: cdnConfig.enabled,
    baseUrl: cdnConfig.baseUrl || '(local)',
    version: cdnConfig.version,
  };
}
