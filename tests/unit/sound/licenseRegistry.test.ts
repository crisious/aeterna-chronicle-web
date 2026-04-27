/**
 * Unit tests — licenseRegistry (Phase 54 / v1.0.0-rc.3)
 *
 * 라이선스 위험 0건 ship-gate의 게이트.
 */
import { describe, it, expect } from 'vitest';
import {
  LICENSE_REGISTRY,
  SAFE_LICENSES,
  isSafeLicense,
  auditLicenses,
  generateAttributionList,
  getLicenseMeta,
  getExternalLicensedKeys,
} from '../../../client/src/sound/licenseRegistry';
import { SOUND_MANIFEST } from '../../../client/src/sound/soundManifest';

describe('licenseRegistry', () => {
  // ─── isSafeLicense ───────────────────────────────────────────
  describe('isSafeLicense', () => {
    it('SAFE_LICENSES 8종 모두 true', () => {
      for (const l of SAFE_LICENSES) {
        expect(isSafeLicense(l), l).toBe(true);
      }
    });

    it('UNKNOWN/COPYRIGHTED/CC-BY-NC: false', () => {
      expect(isSafeLicense('UNKNOWN' as any)).toBe(false);
      expect(isSafeLicense('COPYRIGHTED' as any)).toBe(false);
      expect(isSafeLicense('CC-BY-NC-4.0' as any)).toBe(false);
      expect(isSafeLicense('GPL-3.0' as any)).toBe(false);
    });
  });

  // ─── LICENSE_REGISTRY 정합성 ────────────────────────────────
  describe('LICENSE_REGISTRY', () => {
    it('SOUND_MANIFEST 모든 키 등록됨', () => {
      for (const entry of SOUND_MANIFEST) {
        expect(LICENSE_REGISTRY[entry.key], entry.key).toBeDefined();
      }
    });

    it('모든 메타가 안전한 라이선스', () => {
      for (const meta of Object.values(LICENSE_REGISTRY)) {
        expect(isSafeLicense(meta.license), meta.soundKey).toBe(true);
      }
    });

    it('모든 메타에 source 필드 존재', () => {
      for (const meta of Object.values(LICENSE_REGISTRY)) {
        expect(meta.source.trim().length, meta.soundKey).toBeGreaterThan(0);
      }
    });
  });

  // ─── auditLicenses (ship-gate 게이트) ───────────────────────
  describe('auditLicenses — ship-gate', () => {
    it('현재 자산 — BLOCK 0건, zeroRiskAchieved=true', () => {
      // 현재 시점 검증: 모든 자산이 PROPRIETARY_OWNED + verifiedAt 2026-04-27
      // 90일 stale 체크는 verifiedAt + 89일 시점에서만 PASS
      const report = auditLicenses(new Date('2026-05-01'));
      const blocks = report.issues.filter(i => i.severity === 'BLOCK');
      expect(blocks, blocks.map(b => `${b.soundKey}: ${b.detail}`).join('\n')).toHaveLength(0);
      expect(report.zeroRiskAchieved).toBe(true);
      expect(report.verdict).toBe('PASS');
    });

    it('자산 수 = 등록 수 (전수 등록)', () => {
      const report = auditLicenses(new Date('2026-05-01'));
      expect(report.registeredAssets).toBe(SOUND_MANIFEST.length);
      expect(report.totalAssets).toBe(SOUND_MANIFEST.length);
    });

    it('verifiedAt 90일 초과 시 WARN 누적', () => {
      // 2026-04-27 verifiedAt에서 91일 후 = 2026-07-27
      const report = auditLicenses(new Date('2026-07-27'));
      const warnCount = report.issues.filter(i => i.severity === 'WARN').length;
      expect(warnCount).toBeGreaterThan(0);
      expect(report.verdict).toBe('WARN');
    });
  });

  // ─── getLicenseMeta ─────────────────────────────────────────
  describe('getLicenseMeta', () => {
    it('등록된 키 메타 반환', () => {
      const sample = SOUND_MANIFEST[0];
      const meta = getLicenseMeta(sample.key);
      expect(meta).toBeDefined();
      expect(meta?.soundKey).toBe(sample.key);
    });

    it('미등록 키: undefined', () => {
      expect(getLicenseMeta('phantom_key_zzz')).toBeUndefined();
    });
  });

  // ─── getExternalLicensedKeys ────────────────────────────────
  describe('getExternalLicensedKeys', () => {
    it('현재는 모든 자산 PROPRIETARY_OWNED → 빈 배열', () => {
      // 현재 OVERRIDE_REGISTRY 비어있어 외부 라이선스 0건
      expect(getExternalLicensedKeys()).toEqual([]);
    });
  });

  // ─── generateAttributionList ────────────────────────────────
  describe('generateAttributionList', () => {
    it('자체 자산 한 줄 요약 라인 포함 (Original audio assets)', () => {
      const list = generateAttributionList();
      const summaryLine = list.find(l => l.includes('Original audio assets'));
      expect(summaryLine).toBeDefined();
      expect(summaryLine).toContain(`${SOUND_MANIFEST.length} entries`);
    });
  });
});
