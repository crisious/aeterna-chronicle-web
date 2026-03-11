/**
 * P6-15: 에셋 파이프라인
 * - 이미지 최적화 (WebP 변환, 리사이즈)
 * - 버전 해시: filename.{hash}.ext
 * - 매니페스트 생성: asset-manifest.json (경로→해시 맵)
 * - S3 업로드 시뮬레이션 (버킷/경로/캐시 헤더)
 * - 캐시 버스팅: 매니페스트 기반 URL 교체
 */
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ─── 설정 ────────────────────────────────────────────────────────

export interface AssetPipelineConfig {
  /** 에셋 소스 디렉토리 */
  srcDir: string;
  /** 빌드 출력 디렉토리 */
  outDir: string;
  /** S3 버킷 이름 */
  s3Bucket: string;
  /** S3 경로 프리픽스 */
  s3Prefix: string;
  /** CDN 베이스 URL */
  cdnBaseUrl: string;
  /** 이미지 리사이즈 최대 너비 (px) */
  maxImageWidth: number;
  /** WebP 변환 품질 (0-100) */
  webpQuality: number;
  /** 캐시 TTL (초) */
  cacheTtl: number;
}

const DEFAULT_CONFIG: AssetPipelineConfig = {
  srcDir: './assets/src',
  outDir: './assets/dist',
  s3Bucket: 'aeterna-chronicle-assets',
  s3Prefix: 'v1/',
  cdnBaseUrl: 'https://cdn.aeterna-chronicle.com',
  maxImageWidth: 2048,
  webpQuality: 85,
  cacheTtl: 31536000, // 1년
};

// ─── 매니페스트 타입 ────────────────────────────────────────────

export interface AssetManifest {
  /** 빌드 타임스탬프 */
  buildTime: string;
  /** 빌드 해시 */
  buildHash: string;
  /** 원본 경로 → 해시 경로 매핑 */
  files: Record<string, AssetEntry>;
}

export interface AssetEntry {
  /** 원본 파일명 */
  original: string;
  /** 해시된 파일명 (filename.{hash}.ext) */
  hashed: string;
  /** CDN URL */
  cdnUrl: string;
  /** 파일 크기 (bytes) */
  size: number;
  /** 콘텐츠 해시 */
  hash: string;
  /** MIME 타입 */
  mimeType: string;
  /** WebP 변환 여부 */
  webpConverted: boolean;
}

// ─── S3 업로드 시뮬레이션 ───────────────────────────────────────

export interface S3UploadResult {
  bucket: string;
  key: string;
  url: string;
  contentType: string;
  cacheControl: string;
  size: number;
  etag: string;
}

/** S3 업로드 시뮬레이터 (실제 AWS SDK 대신 로컬 파일 복사) */
export function simulateS3Upload(
  localPath: string,
  config: AssetPipelineConfig,
  hashedName: string,
  mimeType: string,
): S3UploadResult {
  const key = `${config.s3Prefix}${hashedName}`;
  const stat = fs.statSync(localPath);
  const content = fs.readFileSync(localPath);
  const etag = crypto.createHash('md5').update(content).digest('hex');

  return {
    bucket: config.s3Bucket,
    key,
    url: `https://${config.s3Bucket}.s3.amazonaws.com/${key}`,
    contentType: mimeType,
    cacheControl: `public, max-age=${config.cacheTtl}, immutable`,
    size: stat.size,
    etag: `"${etag}"`,
  };
}

// ─── 파일 해싱 ──────────────────────────────────────────────────

/** 파일 콘텐츠 기반 SHA-256 해시 (8자 절단) */
export function hashFile(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
}

/** 해시된 파일명 생성: filename.{hash}.ext */
export function hashedFileName(originalName: string, hash: string): string {
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  return `${base}.${hash}${ext}`;
}

// ─── MIME 타입 매핑 ─────────────────────────────────────────────

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_MAP[ext] || 'application/octet-stream';
}

// ─── 이미지 최적화 (WebP 변환 시뮬레이션) ──────────────────────

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif']);

export interface ImageOptimizeResult {
  originalPath: string;
  outputPath: string;
  originalSize: number;
  optimizedSize: number;
  webpConverted: boolean;
  savings: string; // "32.5%"
}

/**
 * 이미지 최적화 시뮬레이션.
 * 실제 프로덕션에서는 sharp 라이브러리를 사용해 WebP 변환/리사이즈.
 * 여기서는 파일 복사 + 메타데이터 기록.
 */
export function optimizeImage(
  srcPath: string,
  outDir: string,
  _config: AssetPipelineConfig,
): ImageOptimizeResult {
  const ext = path.extname(srcPath).toLowerCase();
  const baseName = path.basename(srcPath, ext);
  const isImage = IMAGE_EXTENSIONS.has(ext);

  // WebP 변환 대상이면 확장자 교체 (시뮬레이션)
  const outputExt = isImage ? '.webp' : ext;
  const outputName = `${baseName}${outputExt}`;
  const outputPath = path.join(outDir, outputName);

  // 실제로는 sharp로 리사이즈/변환하지만, 여기서는 복사
  fs.copyFileSync(srcPath, outputPath);

  const originalSize = fs.statSync(srcPath).size;
  // 시뮬레이션: WebP 변환 시 약 30% 절약 가정
  const simulatedSize = isImage ? Math.floor(originalSize * 0.7) : originalSize;
  const savings = originalSize > 0
    ? ((1 - simulatedSize / originalSize) * 100).toFixed(1) + '%'
    : '0%';

  return {
    originalPath: srcPath,
    outputPath,
    originalSize,
    optimizedSize: simulatedSize,
    webpConverted: isImage,
    savings,
  };
}

// ─── 디렉토리 재귀 탐색 ────────────────────────────────────────

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

// ─── 메인 빌드 파이프라인 ───────────────────────────────────────

export interface BuildResult {
  manifest: AssetManifest;
  uploads: S3UploadResult[];
  optimizations: ImageOptimizeResult[];
  totalFiles: number;
  totalSize: number;
  duration: number; // ms
}

/**
 * 에셋 빌드 파이프라인 실행:
 * 1. 소스 디렉토리 스캔
 * 2. 이미지 최적화 (WebP 변환)
 * 3. 버전 해시 생성
 * 4. 매니페스트 생성
 * 5. S3 업로드 시뮬레이션
 */
export function buildAssets(configOverride?: Partial<AssetPipelineConfig>): BuildResult {
  const config = { ...DEFAULT_CONFIG, ...configOverride };
  const startTime = Date.now();

  // 출력 디렉토리 생성
  if (!fs.existsSync(config.outDir)) {
    fs.mkdirSync(config.outDir, { recursive: true });
  }

  const sourceFiles = walkDir(config.srcDir);
  const manifest: AssetManifest = {
    buildTime: new Date().toISOString(),
    buildHash: '',
    files: {},
  };
  const uploads: S3UploadResult[] = [];
  const optimizations: ImageOptimizeResult[] = [];
  let totalSize = 0;

  for (const srcFile of sourceFiles) {
    const relativePath = path.relative(config.srcDir, srcFile);
    const ext = path.extname(srcFile).toLowerCase();

    // 이미지 최적화
    let processedPath = srcFile;
    let webpConverted = false;
    if (IMAGE_EXTENSIONS.has(ext)) {
      const optResult = optimizeImage(srcFile, config.outDir, config);
      optimizations.push(optResult);
      processedPath = optResult.outputPath;
      webpConverted = true;
    } else {
      // 비-이미지 파일은 그대로 복사
      const destPath = path.join(config.outDir, relativePath);
      const destDir = path.dirname(destPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.copyFileSync(srcFile, destPath);
      processedPath = destPath;
    }

    // 해시 생성
    const hash = hashFile(processedPath);
    const processedName = path.basename(processedPath);
    const hashed = hashedFileName(processedName, hash);
    const hashedPath = path.join(config.outDir, hashed);

    // 해시된 이름으로 리네임
    if (fs.existsSync(processedPath) && processedPath !== hashedPath) {
      fs.renameSync(processedPath, hashedPath);
    }

    const mimeType = getMimeType(processedPath);
    const fileSize = fs.existsSync(hashedPath) ? fs.statSync(hashedPath).size : 0;
    totalSize += fileSize;

    // 매니페스트 엔트리
    manifest.files[relativePath] = {
      original: relativePath,
      hashed,
      cdnUrl: `${config.cdnBaseUrl}/${config.s3Prefix}${hashed}`,
      size: fileSize,
      hash,
      mimeType,
      webpConverted,
    };

    // S3 업로드 시뮬레이션
    if (fs.existsSync(hashedPath)) {
      uploads.push(simulateS3Upload(hashedPath, config, hashed, mimeType));
    }
  }

  // 빌드 해시: 모든 파일 해시의 합성
  const allHashes = Object.values(manifest.files).map(f => f.hash).sort().join('');
  manifest.buildHash = crypto.createHash('sha256').update(allHashes).digest('hex').slice(0, 12);

  // 매니페스트 파일 저장
  const manifestPath = path.join(config.outDir, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  return {
    manifest,
    uploads,
    optimizations,
    totalFiles: sourceFiles.length,
    totalSize,
    duration: Date.now() - startTime,
  };
}

// ─── 캐시 버스팅: 매니페스트 기반 URL 교체 ─────────────────────

/**
 * HTML/CSS/JS 내의 에셋 경로를 CDN 해시 URL로 교체한다.
 * @param content 원본 텍스트
 * @param manifest 에셋 매니페스트
 * @returns 경로가 교체된 텍스트
 */
export function bustCache(content: string, manifest: AssetManifest): string {
  let result = content;
  for (const [originalPath, entry] of Object.entries(manifest.files)) {
    // 다양한 형태의 경로 패턴 교체
    const patterns = [
      originalPath,                          // 상대 경로
      `/${originalPath}`,                    // 절대 경로
      `./assets/${originalPath}`,            // 에셋 디렉토리 경로
    ];
    for (const pattern of patterns) {
      // 전역 교체 (정규식 이스케이프)
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), entry.cdnUrl);
    }
  }
  return result;
}

// ─── CLI 실행 ───────────────────────────────────────────────────

if (require.main === module) {
  console.log('🔨 에셋 빌드 파이프라인 시작...');
  const result = buildAssets();
  console.log(`✅ 빌드 완료: ${result.totalFiles}개 파일, ${(result.totalSize / 1024).toFixed(1)}KB`);
  console.log(`   빌드 해시: ${result.manifest.buildHash}`);
  console.log(`   소요 시간: ${result.duration}ms`);
  console.log(`   S3 업로드: ${result.uploads.length}건 (시뮬레이션)`);
  console.log(`   이미지 최적화: ${result.optimizations.length}건`);
  console.log(`   매니페스트: ${path.join(DEFAULT_CONFIG.outDir, 'asset-manifest.json')}`);
}
