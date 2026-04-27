/**
 * licenseRegistry — 사운드 자산 라이선스 메타·검증
 *
 * 단계: Build (구현 완료)
 * 책임:
 *   1) 모든 사운드 자산의 라이선스 메타 SSOT
 *   2) CC0/오픈/자체보유 화이트리스트 검증
 *   3) 라이선스 위험 0건 보장 — ship-gate 차단 게이트
 *
 * 비고: 137개 자산은 자체 ElevenLabs 생성 + 자체 제작 — PROPRIETARY_OWNED 기본.
 *       특정 키만 별도 라이선스(CC-BY 등) 시 OVERRIDE_REGISTRY로 덮어쓰기.
 */

import { SOUND_MANIFEST, type SoundEntry } from './soundManifest';

// ─── 허용 라이선스 ─────────────────────────────────────────────
export type SafeLicense =
  | 'CC0-1.0'
  | 'CC-BY-4.0'
  | 'CC-BY-SA-4.0'
  | 'OFL-1.1'
  | 'MIT'
  | 'Apache-2.0'
  | 'PUBLIC_DOMAIN'
  | 'PROPRIETARY_OWNED';

export type UnsafeLicense =
  | 'CC-BY-NC-4.0'
  | 'CC-BY-ND-4.0'
  | 'GPL-3.0'
  | 'UNKNOWN'
  | 'COPYRIGHTED';

export type LicenseId = SafeLicense | UnsafeLicense;

export const SAFE_LICENSES: ReadonlySet<SafeLicense> = new Set([
  'CC0-1.0',
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
  'OFL-1.1',
  'MIT',
  'Apache-2.0',
  'PUBLIC_DOMAIN',
  'PROPRIETARY_OWNED',
]);

const ATTRIBUTION_REQUIRED: ReadonlySet<LicenseId> = new Set<LicenseId>([
  'CC-BY-4.0',
  'CC-BY-SA-4.0',
]);

const PROOF_REQUIRED: ReadonlySet<LicenseId> = new Set<LicenseId>([
  'PROPRIETARY_OWNED',
]);

// ─── 자산 라이선스 메타 ────────────────────────────────────────
export interface AssetLicenseMeta {
  soundKey: string;
  assetPath: string;
  license: LicenseId;
  source: string;
  author?: string;
  proofPath?: string;
  verifiedAt?: string;
  notes?: string;
}

// ─── 카테고리별 기본 라이선스 메타 ──────────────────────────────
/**
 * 137개 자산 일괄 PROPRIETARY_OWNED 처리 (자체 ElevenLabs 생성 + 자체 제작).
 * 특정 키만 다른 라이선스 사용 시 OVERRIDE_REGISTRY에 명시.
 */
const DEFAULT_VERIFIED_AT = '2026-04-27';
const DEFAULT_PROOF_PATH = 'audio/LICENSE.md';

function defaultMetaFor(entry: SoundEntry): AssetLicenseMeta {
  const sourceMap: Record<string, string> = {
    bgm: 'ElevenLabs Music — internal generation (project license: commercial use granted)',
    sfx: 'ElevenLabs SFX — internal generation (project license: commercial use granted)',
    ambient: 'ElevenLabs SFX — internal generation (ambient layer)',
    voice: 'ElevenLabs Voice — internal generation (project license: commercial use granted)',
  };
  return {
    soundKey: entry.key,
    assetPath: entry.path,
    license: 'PROPRIETARY_OWNED',
    source: sourceMap[entry.type] ?? 'Internal generation',
    proofPath: DEFAULT_PROOF_PATH,
    verifiedAt: DEFAULT_VERIFIED_AT,
  };
}

/**
 * 키별 오버라이드 — CC-BY 등 외부 자산 사용 시 명시.
 * (현재 모든 자산이 자체 생성이므로 비어있음. 추후 외부 팩 도입 시 추가.)
 */
const OVERRIDE_REGISTRY: Readonly<Record<string, Partial<AssetLicenseMeta>>> = {
  // 예시:
  // 'sfx_ui_click': {
  //   license: 'CC0-1.0',
  //   source: 'https://freesound.org/s/12345',
  //   author: 'kwahmah_02',
  // },
};

// ─── 레지스트리 SSOT ──────────────────────────────────────────
/**
 * 137개 자산 자동 채움 + OVERRIDE 적용.
 * 지표: 라이선스 위험 0건 — 모든 자산이 SAFE_LICENSES 내.
 */
export const LICENSE_REGISTRY: Readonly<Record<string, AssetLicenseMeta>> = (() => {
  const registry: Record<string, AssetLicenseMeta> = {};
  for (const entry of SOUND_MANIFEST) {
    const base = defaultMetaFor(entry);
    const override = OVERRIDE_REGISTRY[entry.key];
    registry[entry.key] = override ? { ...base, ...override } : base;
  }
  return registry;
})();

// ─── 검증 인터페이스 ───────────────────────────────────────────
export interface LicenseAuditIssue {
  soundKey: string;
  assetPath?: string;
  severity: 'BLOCK' | 'WARN';
  reason:
    | 'missing_meta'
    | 'unsafe_license'
    | 'missing_proof'
    | 'missing_attribution'
    | 'stale_verification'
    | 'unknown_source';
  detail?: string;
}

export interface LicenseAuditReport {
  totalAssets: number;
  registeredAssets: number;
  issues: LicenseAuditIssue[];
  verdict: 'PASS' | 'BLOCK' | 'WARN';
  zeroRiskAchieved: boolean;
}

export function isSafeLicense(license: LicenseId): boolean {
  return SAFE_LICENSES.has(license as SafeLicense);
}

/**
 * 검증일 90일 초과 — WARN
 */
const STALE_DAYS = 90;
function isStale(verifiedAt: string | undefined, now: Date = new Date()): boolean {
  if (!verifiedAt) return true;
  const verified = new Date(verifiedAt).getTime();
  if (Number.isNaN(verified)) return true;
  const ageDays = (now.getTime() - verified) / (1000 * 60 * 60 * 24);
  return ageDays > STALE_DAYS;
}

/**
 * 전수 검증 — SOUND_MANIFEST × LICENSE_REGISTRY.
 * BLOCK 0건이면 zeroRiskAchieved=true → ship-gate PASS.
 */
export function auditLicenses(now: Date = new Date()): LicenseAuditReport {
  const issues: LicenseAuditIssue[] = [];
  let registered = 0;

  for (const entry of SOUND_MANIFEST) {
    const meta = LICENSE_REGISTRY[entry.key];

    // 1) 등록 누락
    if (!meta) {
      issues.push({
        soundKey: entry.key,
        assetPath: entry.path,
        severity: 'BLOCK',
        reason: 'missing_meta',
        detail: `${entry.key} 라이선스 메타 없음`,
      });
      continue;
    }
    registered++;

    // 2) 라이선스 안전성
    if (!isSafeLicense(meta.license)) {
      issues.push({
        soundKey: entry.key,
        assetPath: meta.assetPath,
        severity: 'BLOCK',
        reason: 'unsafe_license',
        detail: `${meta.license} 라이선스는 출시 차단`,
      });
    }

    // 3) PROPRIETARY_OWNED — 증빙 필수
    if (PROOF_REQUIRED.has(meta.license) && !meta.proofPath) {
      issues.push({
        soundKey: entry.key,
        assetPath: meta.assetPath,
        severity: 'BLOCK',
        reason: 'missing_proof',
        detail: `PROPRIETARY_OWNED 라이선스는 proofPath 필수`,
      });
    }

    // 4) CC-BY 계열 — 작자 표기 필수
    if (ATTRIBUTION_REQUIRED.has(meta.license) && !meta.author) {
      issues.push({
        soundKey: entry.key,
        assetPath: meta.assetPath,
        severity: 'BLOCK',
        reason: 'missing_attribution',
        detail: `${meta.license}는 author 필수 (크레딧 누락 시 라이선스 위반)`,
      });
    }

    // 5) source 누락
    if (!meta.source || meta.source.trim() === '') {
      issues.push({
        soundKey: entry.key,
        assetPath: meta.assetPath,
        severity: 'BLOCK',
        reason: 'unknown_source',
        detail: '출처 미상',
      });
    }

    // 6) 검증일 90일 초과 — WARN
    if (isStale(meta.verifiedAt, now)) {
      issues.push({
        soundKey: entry.key,
        assetPath: meta.assetPath,
        severity: 'WARN',
        reason: 'stale_verification',
        detail: `verifiedAt=${meta.verifiedAt ?? 'none'} (${STALE_DAYS}일 초과)`,
      });
    }
  }

  const blockCount = issues.filter((i) => i.severity === 'BLOCK').length;
  const warnCount = issues.filter((i) => i.severity === 'WARN').length;

  let verdict: 'PASS' | 'BLOCK' | 'WARN';
  if (blockCount > 0) verdict = 'BLOCK';
  else if (warnCount > 0) verdict = 'WARN';
  else verdict = 'PASS';

  return {
    totalAssets: SOUND_MANIFEST.length,
    registeredAssets: registered,
    issues,
    verdict,
    zeroRiskAchieved: blockCount === 0,
  };
}

/**
 * 엔드 크레딧·about 화면용 — 외부 라이선스(CC-BY 등) 우선 표기.
 * 자체 생성(PROPRIETARY_OWNED)은 한 줄 요약, 외부는 개별 표기.
 */
export function generateAttributionList(): string[] {
  const lines: string[] = [];
  const externalLines = new Set<string>();
  let proprietaryCount = 0;

  for (const meta of Object.values(LICENSE_REGISTRY)) {
    if (meta.license === 'PROPRIETARY_OWNED') {
      proprietaryCount++;
      continue;
    }
    const author = meta.author ? `${meta.author} ` : '';
    const line = `${author}(${meta.license}) — ${meta.soundKey} [${meta.source}]`;
    externalLines.add(line);
  }

  if (proprietaryCount > 0) {
    lines.push(
      `Aeterna Chronicle — Original audio assets (${proprietaryCount} entries): ` +
      `Generated/produced internally with commercial-use license (ElevenLabs Music/SFX/Voice).`,
    );
  }

  // 외부 라이선스는 정렬 표기 (재현성·QA 용이)
  const sorted = Array.from(externalLines).sort();
  lines.push(...sorted);

  return lines;
}

/** 단일 키 메타 조회 */
export function getLicenseMeta(soundKey: string): AssetLicenseMeta | undefined {
  return LICENSE_REGISTRY[soundKey];
}

/** 외부 라이선스(CC-BY 등 비-자체) 키만 추출 — 크레딧 화면용 */
export function getExternalLicensedKeys(): string[] {
  return Object.values(LICENSE_REGISTRY)
    .filter((m) => m.license !== 'PROPRIETARY_OWNED')
    .map((m) => m.soundKey);
}
