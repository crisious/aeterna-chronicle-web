/**
 * WebP 에셋 로더 — optimize-images.sh 매니페스트 기반
 *
 * 사용법:
 *   import { getOptimizedAssetPath } from '../tools/generate-webp-loader';
 *   const src = getOptimizedAssetPath('client/public/assets/generated/ui/icon.png');
 *   // → 'client/public/assets/generated/ui/icon.webp' (있으면)
 *   // → 'client/public/assets/generated/ui/icon.png'  (없으면 원본)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// ── 타입 ─────────────────────────────────────────────────────────

interface ManifestMapping {
  original: string;
  webp: string;
  originalSize: number;
  webpSize: number;
}

interface WebPManifest {
  generated: string;
  quality: number;
  thresholdBytes: number;
  totalFiles: number;
  mappings: ManifestMapping[];
}

// ── 매니페스트 로드 ──────────────────────────────────────────────

const MANIFEST_PATH = resolve(__dirname, 'webp-manifest.json');

let manifest: WebPManifest | null = null;
let lookupMap: Map<string, string> | null = null;

function loadManifest(): void {
  if (manifest) return;

  if (!existsSync(MANIFEST_PATH)) {
    console.warn(
      `[webp-loader] 매니페스트 없음: ${MANIFEST_PATH}\n` +
        '  → ./tools/optimize-images.sh 실행 필요',
    );
    manifest = { generated: '', quality: 0, thresholdBytes: 0, totalFiles: 0, mappings: [] };
    lookupMap = new Map();
    return;
  }

  const raw = readFileSync(MANIFEST_PATH, 'utf-8');
  manifest = JSON.parse(raw) as WebPManifest;
  lookupMap = new Map();
  for (const m of manifest.mappings) {
    lookupMap.set(normalizePath(m.original), m.webp);
  }
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

// ── 공개 API ─────────────────────────────────────────────────────

/**
 * 원본 PNG 경로에 대응하는 WebP 경로를 반환합니다.
 * WebP가 없으면 원본 경로를 그대로 반환합니다.
 *
 * @param originalPath - 원본 에셋 경로 (예: 'client/public/assets/generated/ui/icon.png')
 * @returns WebP 경로 또는 원본 경로
 */
export function getOptimizedAssetPath(originalPath: string): string {
  loadManifest();

  const normalized = normalizePath(originalPath);
  const webpPath = lookupMap!.get(normalized);

  if (webpPath && existsSync(webpPath)) {
    return webpPath;
  }

  return originalPath;
}

/**
 * 매니페스트의 전체 매핑 목록을 반환합니다.
 */
export function getAllMappings(): ManifestMapping[] {
  loadManifest();
  return manifest!.mappings;
}

/**
 * 매니페스트 메타데이터를 반환합니다.
 */
export function getManifestInfo(): Omit<WebPManifest, 'mappings'> {
  loadManifest();
  const { mappings: _, ...info } = manifest!;
  return info;
}
