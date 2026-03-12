/**
 * featureFlags — 서버 기능 토글 시스템 (P10-11)
 *
 * 환경변수/config 기반 기능 on/off.
 * FEATURE_PVP=true, FEATURE_HOUSING=false 등으로 제어.
 * featureRegistry와 연동하여 비활성 기능의 라우트/소켓을 자동 스킵한다.
 *
 * 사용 예:
 * ```ts
 * if (featureFlags.isEnabled('pvp')) {
 *   await fastify.register(pvpRoutes);
 * }
 * ```
 */

// ── 타입 정의 ─────────────────────────────────────────────────

/** 기능 키 목록 — 확장 시 여기에 추가 */
export type FeatureKey =
  | 'pvp'
  | 'housing'
  | 'guild_war'
  | 'auction'
  | 'cosmetic_shop'
  | 'season_pass'
  | 'matchmaking'
  | 'raid'
  | 'pet'
  | 'craft'
  | 'codex'
  | 'ranking'
  | 'social'
  | 'chat'
  | 'notification'
  | 'tutorial'
  | 'analytics'
  | 'beta'
  | 'payment'
  | 'story'
  | string; // 확장 가능

/** 기능 정의 */
export interface FeatureDefinition {
  key: FeatureKey;
  /** 기본 활성 여부 (환경변수 미설정 시) */
  defaultEnabled: boolean;
  /** 설명 */
  description: string;
}

/** 기능 상태 */
export interface FeatureStatus {
  key: FeatureKey;
  enabled: boolean;
  source: 'env' | 'config' | 'default';
  description: string;
}

// ── 기능 레지스트리 ───────────────────────────────────────────

/** 기본 기능 정의 목록 — 새 기능 추가 시 여기에 등록 */
const DEFAULT_FEATURES: FeatureDefinition[] = [
  { key: 'pvp',            defaultEnabled: true,  description: 'PvP 시스템 (아레나/매칭)' },
  { key: 'housing',        defaultEnabled: true,  description: '하우징 시스템' },
  { key: 'guild_war',      defaultEnabled: true,  description: '길드전 (거점 점령)' },
  { key: 'auction',        defaultEnabled: true,  description: '거래소/경매장' },
  { key: 'cosmetic_shop',  defaultEnabled: true,  description: '코스메틱 상점' },
  { key: 'season_pass',    defaultEnabled: true,  description: '시즌 패스' },
  { key: 'matchmaking',    defaultEnabled: true,  description: '파티 매칭 큐' },
  { key: 'raid',           defaultEnabled: true,  description: '레이드 보스' },
  { key: 'pet',            defaultEnabled: true,  description: '펫 시스템' },
  { key: 'craft',          defaultEnabled: true,  description: '제작 시스템' },
  { key: 'codex',          defaultEnabled: true,  description: '도감/컬렉션' },
  { key: 'ranking',        defaultEnabled: true,  description: '통합 랭킹' },
  { key: 'social',         defaultEnabled: true,  description: '소셜 (친구/파티/우편)' },
  { key: 'chat',           defaultEnabled: true,  description: '채팅 시스템' },
  { key: 'notification',   defaultEnabled: true,  description: '알림 시스템' },
  { key: 'tutorial',       defaultEnabled: true,  description: '튜토리얼' },
  { key: 'analytics',      defaultEnabled: true,  description: 'KPI/BI 분석' },
  { key: 'beta',           defaultEnabled: false, description: '오픈 베타 기능' },
  { key: 'payment',        defaultEnabled: true,  description: '결제/프리미엄 화폐' },
  { key: 'story',          defaultEnabled: true,  description: '스토리 챕터' },
  { key: 'endless_dungeon', defaultEnabled: true,  description: '무한 던전 (시간의 탑)' },
  { key: 'world_boss',     defaultEnabled: true,  description: '월드 보스' },
  { key: 'transcendence',  defaultEnabled: true,  description: '장비 초월/강화' },
  // P12 커뮤니티 확장
  { key: 'sns_share',      defaultEnabled: true,  description: 'SNS 공유 (P12-01)' },
  { key: 'discord_bot',    defaultEnabled: true,  description: 'Discord 봇 연동 (P12-02)' },
  { key: 'streamer_mode',  defaultEnabled: true,  description: '스트리머 모드 (P12-03)' },
  { key: 'referral',       defaultEnabled: true,  description: '레퍼럴 시스템 (P12-04)' },
  { key: 'ugc_gallery',    defaultEnabled: true,  description: 'UGC 갤러리 (P12-05)' },
  { key: 'community_event', defaultEnabled: true, description: '커뮤니티 이벤트 (P12-06)' },
  { key: 'social_profile', defaultEnabled: true,  description: '소셜 프로필 (P12-07)' },
];

// ── FeatureFlags 클래스 ───────────────────────────────────────

class FeatureFlags {
  private features: Map<FeatureKey, FeatureDefinition> = new Map();
  private overrides: Map<FeatureKey, boolean> = new Map();

  constructor() {
    for (const def of DEFAULT_FEATURES) {
      this.features.set(def.key, def);
    }
  }

  /**
   * 기능 활성 여부 확인
   *
   * 우선순위: 런타임 오버라이드 > 환경변수 > 기본값
   */
  isEnabled(key: FeatureKey): boolean {
    // 1) 런타임 오버라이드
    const override = this.overrides.get(key);
    if (override !== undefined) return override;

    // 2) 환경변수: FEATURE_PVP=true/false
    const envKey = `FEATURE_${key.toUpperCase()}`;
    const envValue = process.env[envKey];
    if (envValue !== undefined) {
      return envValue.toLowerCase() === 'true' || envValue === '1';
    }

    // 3) 기본값
    const def = this.features.get(key);
    return def?.defaultEnabled ?? true;
  }

  /**
   * 기능 비활성 여부 확인 (편의 메서드)
   */
  isDisabled(key: FeatureKey): boolean {
    return !this.isEnabled(key);
  }

  /**
   * 런타임 오버라이드 설정 (핫 토글)
   */
  setOverride(key: FeatureKey, enabled: boolean): void {
    this.overrides.set(key, enabled);
    console.log(`[FeatureFlags] '${key}' 오버라이드: ${enabled}`);
  }

  /**
   * 런타임 오버라이드 제거 (환경변수/기본값으로 복원)
   */
  clearOverride(key: FeatureKey): void {
    this.overrides.delete(key);
    console.log(`[FeatureFlags] '${key}' 오버라이드 제거`);
  }

  /**
   * 기능 정의 추가 (동적 등록)
   */
  registerFeature(def: FeatureDefinition): void {
    this.features.set(def.key, def);
  }

  /**
   * 전체 기능 상태 조회
   */
  getAllStatus(): FeatureStatus[] {
    const result: FeatureStatus[] = [];

    for (const def of this.features.values()) {
      const override = this.overrides.get(def.key);
      const envKey = `FEATURE_${def.key.toUpperCase()}`;
      const envValue = process.env[envKey];

      let enabled: boolean;
      let source: 'env' | 'config' | 'default';

      if (override !== undefined) {
        enabled = override;
        source = 'config';
      } else if (envValue !== undefined) {
        enabled = envValue.toLowerCase() === 'true' || envValue === '1';
        source = 'env';
      } else {
        enabled = def.defaultEnabled;
        source = 'default';
      }

      result.push({
        key: def.key,
        enabled,
        source,
        description: def.description,
      });
    }

    return result;
  }

  /**
   * 활성 기능 키 목록
   */
  getEnabledFeatures(): FeatureKey[] {
    return this.getAllStatus()
      .filter((s) => s.enabled)
      .map((s) => s.key);
  }

  /**
   * 비활성 기능 키 목록
   */
  getDisabledFeatures(): FeatureKey[] {
    return this.getAllStatus()
      .filter((s) => !s.enabled)
      .map((s) => s.key);
  }

  /**
   * 조건부 실행 헬퍼
   *
   * ```ts
   * featureFlags.whenEnabled('pvp', () => {
   *   fastify.register(pvpRoutes);
   * });
   * ```
   */
  whenEnabled(key: FeatureKey, fn: () => void | Promise<void>): void | Promise<void> {
    if (this.isEnabled(key)) {
      return fn();
    } else {
      console.log(`[FeatureFlags] '${key}' 비활성 — 스킵`);
    }
  }
}

// ── 싱글턴 인스턴스 ───────────────────────────────────────────

export const featureFlags = new FeatureFlags();
