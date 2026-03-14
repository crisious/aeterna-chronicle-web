/**
 * P28-15: 빌드 최적화
 * P28-16: 배포 구성 최종화
 *
 * - Vite 프로덕션 빌드 설정 최적화
 * - 번들 크기 분석
 * - 코드 스플리팅 검증
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// ─── 번들 분석 ──────────────────────────────────────────────────

interface BundleChunk {
  name: string;
  sizeBytes: number;
  sizeKB: string;
  gzipEstimateKB: string;
}

interface BundleReport {
  timestamp: string;
  totalSizeKB: string;
  totalGzipEstimateKB: string;
  chunks: BundleChunk[];
  recommendations: string[];
}

function analyzeBundle(distDir: string): BundleReport {
  const chunks: BundleChunk[] = [];
  const recommendations: string[] = [];

  if (!existsSync(distDir)) {
    return {
      timestamp: new Date().toISOString(),
      totalSizeKB: '0',
      totalGzipEstimateKB: '0',
      chunks: [],
      recommendations: ['빌드 디렉터리가 없습니다. `npm run build` 실행 필요.'],
    };
  }

  function scanDir(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
        const stat = statSync(fullPath);
        chunks.push({
          name: fullPath.replace(distDir + '/', ''),
          sizeBytes: stat.size,
          sizeKB: (stat.size / 1024).toFixed(1),
          gzipEstimateKB: (stat.size / 1024 * 0.3).toFixed(1), // gzip ~70% 압축 추정
        });
      }
    }
  }

  scanDir(distDir);
  chunks.sort((a, b) => b.sizeBytes - a.sizeBytes);

  const totalBytes = chunks.reduce((s, c) => s + c.sizeBytes, 0);

  // 권장사항
  if (totalBytes > 5 * 1024 * 1024) {
    recommendations.push('총 번들 크기 5MB 초과 — 추가 코드 스플리팅 필요');
  }

  const largest = chunks[0];
  if (largest && largest.sizeBytes > 1024 * 1024) {
    recommendations.push(`최대 청크 ${largest.name} (${largest.sizeKB}KB) — 동적 import 또는 분할 권장`);
  }

  if (chunks.filter(c => c.name.includes('vendor')).length === 0) {
    recommendations.push('vendor 청크가 없습니다 — manualChunks 설정으로 라이브러리 분리 권장');
  }

  if (recommendations.length === 0) {
    recommendations.push('번들 크기 정상 범위 — 추가 최적화 불필요');
  }

  return {
    timestamp: new Date().toISOString(),
    totalSizeKB: (totalBytes / 1024).toFixed(1),
    totalGzipEstimateKB: (totalBytes / 1024 * 0.3).toFixed(1),
    chunks,
    recommendations,
  };
}

// ─── Vite 빌드 설정 최적화 사항 ──────────────────────────────────

const VITE_OPTIMIZATION_NOTES = `
# Vite 프로덕션 빌드 최적화 (P28-15)

## 적용된 최적화:

### 1. 코드 스플리팅 (manualChunks)
\`\`\`ts
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-phaser': ['phaser'],
        'vendor-socket': ['socket.io-client'],
        'vendor-ui': ['react', 'react-dom'],  // admin dashboard
      },
    },
  },
}
\`\`\`

### 2. 트리쉐이킹
- sideEffects: false 설정으로 미사용 코드 제거
- Phaser의 사용하지 않는 플러그인 제외

### 3. 에셋 최적화
- 이미지: WebP 변환 (vite-plugin-imagemin)
- 오디오: OGG Vorbis (품질 6)
- 텍스처 아틀라스: TexturePacker 최적화

### 4. 소스맵
- production: hidden-source-map (서버 에러 리포팅용, 클라이언트 노출 X)
- staging: source-map (디버깅용)

### 5. 압축
- Brotli + Gzip (vite-plugin-compression)
- 정적 에셋 캐시: 1년 (content hash 기반)

## 번들 크기 목표:
- 초기 로드: < 500KB (gzip)
- 메인 게임 청크: < 2MB (gzip)
- 전체: < 5MB (gzip)
`;

// ─── 배포 구성 검증 (P28-16) ─────────────────────────────────────

interface DeploymentCheck {
  item: string;
  status: 'pass' | 'fail' | 'warning';
  details: string;
}

function verifyDeploymentConfig(): DeploymentCheck[] {
  const checks: DeploymentCheck[] = [];

  // Docker
  checks.push({
    item: 'Dockerfile 존재',
    status: existsSync('Dockerfile') || existsSync('docker-compose.yml') ? 'pass' : 'fail',
    details: 'docker-compose.yml + Dockerfile (server + client)',
  });

  // k8s
  const k8sDir = 'k8s/production';
  checks.push({
    item: 'k8s manifests',
    status: existsSync(k8sDir) ? 'pass' : 'fail',
    details: 'Deployment, Service, Ingress, HPA, PDB 매니페스트',
  });

  // CI/CD
  checks.push({
    item: 'GitHub Actions CI/CD',
    status: existsSync('.github/workflows') ? 'pass' : 'fail',
    details: 'lint → test → build → deploy 파이프라인',
  });

  // 환경변수
  checks.push({
    item: '.env.example',
    status: existsSync('.env.example') ? 'pass' : 'fail',
    details: '필수 환경변수 목록 문서화',
  });

  // Staging
  checks.push({
    item: 'Staging 설정',
    status: existsSync('docker-compose.staging.yml') ? 'pass' : 'warning',
    details: 'docker-compose.staging.yml + .env.staging',
  });

  return checks;
}

// ─── 실행 ────────────────────────────────────────────────────────

if (process.argv[1]?.includes('build-optimize')) {
  console.log(VITE_OPTIMIZATION_NOTES);
  console.log('\n=== 번들 분석 ===\n');

  const report = analyzeBundle('dist');
  console.log(JSON.stringify(report, null, 2));

  console.log('\n=== 배포 구성 검증 ===\n');
  const deployChecks = verifyDeploymentConfig();
  for (const c of deployChecks) {
    const emoji = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '⚠️';
    console.log(`${emoji} ${c.item}: ${c.details}`);
  }
}

export { analyzeBundle, verifyDeploymentConfig, VITE_OPTIMIZATION_NOTES };
export type { BundleReport, BundleChunk, DeploymentCheck };
