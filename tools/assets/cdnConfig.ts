/**
 * P6-15: CDN 설정 — CloudFront/Cloudflare 캐시 정책, 오리진 설정
 * 게임 에셋 배포를 위한 CDN 구성 정의
 */

// ─── CDN 프로바이더 설정 ────────────────────────────────────────

export type CdnProvider = 'cloudfront' | 'cloudflare';

export interface CdnConfig {
  /** CDN 프로바이더 */
  provider: CdnProvider;
  /** 배포 도메인 */
  domain: string;
  /** 오리진 도메인 (S3 버킷 등) */
  originDomain: string;
  /** HTTPS 강제 여부 */
  httpsOnly: boolean;
  /** HTTP/2 지원 */
  http2: boolean;
  /** Gzip/Brotli 압축 */
  compression: boolean;
  /** 캐시 정책 */
  cachePolicy: CachePolicy;
  /** 오리진 설정 */
  originConfig: OriginConfig;
  /** 보안 헤더 */
  securityHeaders: SecurityHeaders;
}

// ─── 캐시 정책 ──────────────────────────────────────────────────

export interface CachePolicy {
  /** 기본 TTL (초) */
  defaultTtl: number;
  /** 최대 TTL (초) */
  maxTtl: number;
  /** 최소 TTL (초) */
  minTtl: number;
  /** 파일 확장자별 TTL 오버라이드 */
  extensionOverrides: Record<string, number>;
  /** 캐시 키에 쿼리 스트링 포함 여부 */
  includeQueryString: boolean;
  /** 캐시 키에 쿠키 포함 여부 */
  includeCookies: boolean;
  /** immutable 캐시 사용 (해시 파일) */
  immutableHashed: boolean;
}

// ─── 오리진 설정 ────────────────────────────────────────────────

export interface OriginConfig {
  /** 오리진 프로토콜 */
  protocol: 'http' | 'https' | 'match-viewer';
  /** 연결 타임아웃 (초) */
  connectionTimeout: number;
  /** 읽기 타임아웃 (초) */
  readTimeout: number;
  /** 오리진 실패 시 재시도 횟수 */
  retryCount: number;
  /** 커스텀 오리진 헤더 */
  customHeaders: Record<string, string>;
  /** 오리진 Shield (엣지→오리진 사이 캐시 레이어) */
  originShield?: {
    enabled: boolean;
    region: string; // ap-northeast-2 등
  };
}

// ─── 보안 헤더 ──────────────────────────────────────────────────

export interface SecurityHeaders {
  /** Strict-Transport-Security */
  hsts: string;
  /** X-Content-Type-Options */
  contentTypeOptions: string;
  /** X-Frame-Options */
  frameOptions: string;
  /** Referrer-Policy */
  referrerPolicy: string;
  /** CORS 허용 오리진 */
  corsOrigins: string[];
}

// ─── 기본 설정 (프로덕션) ───────────────────────────────────────

export const PRODUCTION_CDN_CONFIG: CdnConfig = {
  provider: 'cloudfront',
  domain: 'cdn.aeterna-chronicle.com',
  originDomain: 'aeterna-chronicle-assets.s3.ap-northeast-2.amazonaws.com',
  httpsOnly: true,
  http2: true,
  compression: true,

  cachePolicy: {
    defaultTtl: 86400,          // 1일
    maxTtl: 31536000,           // 1년
    minTtl: 0,
    extensionOverrides: {
      // 해시된 에셋: 1년 (immutable)
      '.js': 31536000,
      '.css': 31536000,
      '.woff2': 31536000,
      '.webp': 31536000,
      '.png': 31536000,
      '.jpg': 31536000,
      // 자주 변경되는 파일: 짧은 TTL
      '.json': 300,             // 5분 (매니페스트, 설정)
      '.html': 60,              // 1분
    },
    includeQueryString: false,
    includeCookies: false,
    immutableHashed: true,
  },

  originConfig: {
    protocol: 'https',
    connectionTimeout: 10,
    readTimeout: 30,
    retryCount: 3,
    customHeaders: {
      'X-Origin-Verify': 'aeterna-cdn-secret', // 오리진 접근 제어
    },
    originShield: {
      enabled: true,
      region: 'ap-northeast-2', // 서울 리전
    },
  },

  securityHeaders: {
    hsts: 'max-age=31536000; includeSubDomains; preload',
    contentTypeOptions: 'nosniff',
    frameOptions: 'DENY',
    referrerPolicy: 'strict-origin-when-cross-origin',
    corsOrigins: [
      'https://aeterna-chronicle.com',
      'https://www.aeterna-chronicle.com',
      'https://admin.aeterna-chronicle.com',
    ],
  },
};

// ─── 스테이징 설정 ──────────────────────────────────────────────

export const STAGING_CDN_CONFIG: CdnConfig = {
  ...PRODUCTION_CDN_CONFIG,
  domain: 'cdn-staging.aeterna-chronicle.com',
  originDomain: 'aeterna-chronicle-assets-staging.s3.ap-northeast-2.amazonaws.com',
  cachePolicy: {
    ...PRODUCTION_CDN_CONFIG.cachePolicy,
    defaultTtl: 60,     // 1분 (스테이징은 빠른 갱신)
    maxTtl: 3600,        // 1시간
  },
  securityHeaders: {
    ...PRODUCTION_CDN_CONFIG.securityHeaders,
    corsOrigins: [
      'https://staging.aeterna-chronicle.com',
      'http://localhost:3000',
      'http://localhost:5173',
    ],
  },
};

// ─── CDN 캐시 무효화 요청 생성 ──────────────────────────────────

export interface CacheInvalidation {
  paths: string[];
  distributionId?: string;
  callerReference: string;
}

/**
 * CDN 캐시 무효화 요청을 생성한다.
 * 실제 AWS SDK 호출 대신 요청 객체만 반환 (시뮬레이션).
 */
export function createInvalidation(
  paths: string[],
  distributionId = 'E1AETERNA00CDN',
): CacheInvalidation {
  return {
    paths: paths.map(p => (p.startsWith('/') ? p : `/${p}`)),
    distributionId,
    callerReference: `invalidation-${Date.now()}`,
  };
}

// ─── Nginx/Cloudflare 캐시 헤더 생성 ───────────────────────────

/**
 * 파일 경로에 맞는 Cache-Control 헤더를 생성한다.
 * 해시된 파일(filename.{hash}.ext)은 immutable, 그 외는 정책 기반.
 */
export function getCacheControlHeader(
  filePath: string,
  config: CdnConfig = PRODUCTION_CDN_CONFIG,
): string {
  const ext = filePath.match(/\.[^.]+$/)?.[0] || '';
  const isHashed = /\.[a-f0-9]{8}\.[^.]+$/.test(filePath);

  if (isHashed && config.cachePolicy.immutableHashed) {
    return `public, max-age=${config.cachePolicy.maxTtl}, immutable`;
  }

  const ttl = config.cachePolicy.extensionOverrides[ext] ?? config.cachePolicy.defaultTtl;
  return `public, max-age=${ttl}`;
}

// ─── CloudFront 배포 설정 (IaC 참조용) ─────────────────────────

export function generateCloudFrontDistributionConfig(config: CdnConfig = PRODUCTION_CDN_CONFIG) {
  return {
    DistributionConfig: {
      Origins: {
        Quantity: 1,
        Items: [{
          Id: 'S3-GameAssets',
          DomainName: config.originDomain,
          S3OriginConfig: {
            OriginAccessIdentity: '', // OAI 또는 OAC 사용
          },
          CustomHeaders: {
            Quantity: Object.keys(config.originConfig.customHeaders).length,
            Items: Object.entries(config.originConfig.customHeaders).map(([k, v]) => ({
              HeaderName: k,
              HeaderValue: v,
            })),
          },
          ConnectionAttempts: config.originConfig.retryCount,
          ConnectionTimeout: config.originConfig.connectionTimeout,
        }],
      },
      DefaultCacheBehavior: {
        TargetOriginId: 'S3-GameAssets',
        ViewerProtocolPolicy: config.httpsOnly ? 'redirect-to-https' : 'allow-all',
        Compress: config.compression,
        CachePolicyId: 'custom-game-assets',
        AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      },
      ViewerCertificate: {
        ACMCertificateArn: 'arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID',
        SslSupportMethod: 'sni-only',
        MinimumProtocolVersion: 'TLSv1.2_2021',
      },
      Aliases: { Quantity: 1, Items: [config.domain] },
      HttpVersion: config.http2 ? 'http2and3' : 'http2',
      Enabled: true,
      Comment: 'Aeterna Chronicle - Game Assets CDN',
    },
  };
}
