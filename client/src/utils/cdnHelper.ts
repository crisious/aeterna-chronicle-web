/**
 * CDN 헬퍼 — P4-16 성능 최적화 2차
 * 
 * 기능:
 *   - 정적 에셋 CDN URL 생성
 *   - 해시 기반 캐시 버스팅
 *   - Lazy loading 이미지/에셋 헬퍼
 */

// ── CDN 설정 ─────────────────────────────────────────────────

/** CDN 베이스 URL (환경변수 또는 기본값) */
const CDN_BASE_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_CDN_URL) ||
  '';

/** 에셋 버전 해시 (빌드 시 주입) */
const BUILD_HASH: string =
  (typeof import.meta !== 'undefined' && (import.meta as unknown as Record<string, Record<string, string>>).env?.VITE_BUILD_HASH) ||
  Date.now().toString(36);

// ── 에셋 카테고리별 경로 매핑 ────────────────────────────────

export type AssetCategory =
  | 'sprite'
  | 'tilemap'
  | 'audio'
  | 'ui'
  | 'portrait'
  | 'effect'
  | 'font'
  | 'video';

const CATEGORY_PATHS: Record<AssetCategory, string> = {
  sprite:   'assets/sprites',
  tilemap:  'assets/tilemaps',
  audio:    'assets/audio',
  ui:       'assets/ui',
  portrait: 'assets/portraits',
  effect:   'assets/effects',
  font:     'assets/fonts',
  video:    'assets/videos',
};

// ── CDN URL 생성 ─────────────────────────────────────────────

/**
 * 에셋 파일의 CDN URL 생성.
 * CDN 미설정 시 로컬 경로 반환.
 * 
 * @param category 에셋 카테고리
 * @param filename 파일명
 * @param bustCache 캐시 버스팅 쿼리 파라미터 추가 여부 (기본: true)
 */
export function cdnUrl(category: AssetCategory, filename: string, bustCache = true): string {
  const basePath = CATEGORY_PATHS[category];
  const path = `${basePath}/${filename}`;

  if (!CDN_BASE_URL) {
    // CDN 미설정 → 로컬 상대 경로
    return bustCache ? `${path}?v=${BUILD_HASH}` : path;
  }

  const base = CDN_BASE_URL.endsWith('/') ? CDN_BASE_URL.slice(0, -1) : CDN_BASE_URL;
  return bustCache ? `${base}/${path}?v=${BUILD_HASH}` : `${base}/${path}`;
}

/**
 * 원시 URL에 캐시 버스팅 해시 추가.
 */
export function withCacheBust(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${BUILD_HASH}`;
}

// ── 해시 기반 캐시 버스팅 ────────────────────────────────────

/** 문자열에서 간단한 해시 생성 (djb2) */
export function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

/**
 * 에셋 매니페스트 기반 URL 생성.
 * 빌드 시 생성된 매니페스트에서 해시를 조회.
 */
const assetManifest = new Map<string, string>();

/** 매니페스트 초기화 (빌드 도구에서 주입) */
export function initAssetManifest(manifest: Record<string, string>): void {
  for (const [key, hash] of Object.entries(manifest)) {
    assetManifest.set(key, hash);
  }
}

/** 매니페스트 기반 URL — 개별 파일 해시 사용 */
export function manifestUrl(category: AssetCategory, filename: string): string {
  const key = `${category}/${filename}`;
  const hash = assetManifest.get(key) || BUILD_HASH;
  const basePath = CATEGORY_PATHS[category];
  const base = CDN_BASE_URL
    ? `${CDN_BASE_URL.replace(/\/$/, '')}/${basePath}`
    : basePath;
  return `${base}/${filename}?v=${hash}`;
}

// ── Lazy Loading 헬퍼 ────────────────────────────────────────

/** 이미지 lazy load 상태 */
interface LazyLoadState {
  loaded: Set<string>;
  loading: Set<string>;
  failed: Set<string>;
}

const lazyState: LazyLoadState = {
  loaded: new Set(),
  loading: new Set(),
  failed: new Set(),
};

/**
 * 이미지를 lazy load.
 * 이미 로드된 경우 캐시된 결과 반환.
 * 
 * @returns Promise<HTMLImageElement> (DOM 환경) 또는 URL 문자열
 */
export function lazyLoadImage(
  category: AssetCategory,
  filename: string,
): Promise<string> {
  const url = cdnUrl(category, filename);
  const key = `${category}/${filename}`;

  // 이미 로드 완료
  if (lazyState.loaded.has(key)) {
    return Promise.resolve(url);
  }

  // 이미 실패
  if (lazyState.failed.has(key)) {
    return Promise.reject(new Error(`에셋 로드 실패: ${key}`));
  }

  // 로딩 중이면 대기
  if (lazyState.loading.has(key)) {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (lazyState.loaded.has(key)) {
          clearInterval(check);
          resolve(url);
        }
        if (lazyState.failed.has(key)) {
          clearInterval(check);
          reject(new Error(`에셋 로드 실패: ${key}`));
        }
      }, 50);
    });
  }

  // 새로 로드 시작
  lazyState.loading.add(key);

  return new Promise((resolve, reject) => {
    if (typeof Image !== 'undefined') {
      // 브라우저 환경 — 실제 이미지 프리로드
      const img = new Image();
      img.onload = () => {
        lazyState.loading.delete(key);
        lazyState.loaded.add(key);
        resolve(url);
      };
      img.onerror = () => {
        lazyState.loading.delete(key);
        lazyState.failed.add(key);
        reject(new Error(`에셋 로드 실패: ${key}`));
      };
      img.src = url;
    } else {
      // Node 환경 (SSR 등) — URL만 반환
      lazyState.loading.delete(key);
      lazyState.loaded.add(key);
      resolve(url);
    }
  });
}

/**
 * 여러 에셋을 병렬 프리로드.
 * 일부 실패해도 성공한 것들은 캐시됨.
 */
export async function preloadAssets(
  assets: Array<{ category: AssetCategory; filename: string }>,
): Promise<{ loaded: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    assets.map((a) => lazyLoadImage(a.category, a.filename)),
  );

  const loaded: string[] = [];
  const failed: string[] = [];

  results.forEach((result, i) => {
    const key = `${assets[i].category}/${assets[i].filename}`;
    if (result.status === 'fulfilled') {
      loaded.push(key);
    } else {
      failed.push(key);
    }
  });

  return { loaded, failed };
}

/** Lazy load 상태 조회 (디버그용) */
export function getLazyLoadStats(): {
  loaded: number;
  loading: number;
  failed: number;
} {
  return {
    loaded: lazyState.loaded.size,
    loading: lazyState.loading.size,
    failed: lazyState.failed.size,
  };
}

/** Lazy load 캐시 초기화 (테스트용) */
export function resetLazyLoadCache(): void {
  lazyState.loaded.clear();
  lazyState.loading.clear();
  lazyState.failed.clear();
}
