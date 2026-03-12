# 기능 토글 (Feature Flags) 가이드

> P10-11에서 도입된 서버 기능 토글 시스템 (P10-15)

## 개요

`server/src/core/featureFlags.ts`는 환경변수/런타임 기반 기능 on/off를 제공한다.  
선택적 부트스트랩, 환경별 조합, 핫 토글을 지원한다.

## 사용법

### 기본 사용

```typescript
import { featureFlags } from '../core/featureFlags';

if (featureFlags.isEnabled('pvp')) {
  await fastify.register(pvpRoutes);
}
```

### 조건부 실행 헬퍼

```typescript
featureFlags.whenEnabled('housing', () => {
  fastify.register(housingRoutes);
});
```

### 전체 상태 조회

```typescript
const statuses = featureFlags.getAllStatus();
// [{ key: 'pvp', enabled: true, source: 'env', description: 'PvP 시스템' }, ...]
```

## 우선순위

```
1. 런타임 오버라이드 (setOverride)  ← 최우선
2. 환경변수 (FEATURE_PVP=true)
3. 기본값 (DEFAULT_FEATURES 정의)   ← 최하위
```

## 환경변수

```bash
# .env 또는 시스템 환경변수
FEATURE_PVP=true
FEATURE_HOUSING=false
FEATURE_BETA=true
```

형식: `FEATURE_{KEY_UPPERCASE}=true|false|1|0`

## 등록된 기능 (20개)

| 키 | 기본값 | 설명 |
|----|--------|------|
| `pvp` | ✅ | PvP 시스템 (아레나/매칭) |
| `housing` | ✅ | 하우징 시스템 |
| `guild_war` | ✅ | 길드전 (거점 점령) |
| `auction` | ✅ | 거래소/경매장 |
| `cosmetic_shop` | ✅ | 코스메틱 상점 |
| `season_pass` | ✅ | 시즌 패스 |
| `matchmaking` | ✅ | 파티 매칭 큐 |
| `raid` | ✅ | 레이드 보스 |
| `pet` | ✅ | 펫 시스템 |
| `craft` | ✅ | 제작 시스템 |
| `codex` | ✅ | 도감/컬렉션 |
| `ranking` | ✅ | 통합 랭킹 |
| `social` | ✅ | 소셜 (친구/파티/우편) |
| `chat` | ✅ | 채팅 시스템 |
| `notification` | ✅ | 알림 시스템 |
| `tutorial` | ✅ | 튜토리얼 |
| `analytics` | ✅ | KPI/BI 분석 |
| `beta` | ❌ | 오픈 베타 기능 |
| `payment` | ✅ | 결제/프리미엄 화폐 |
| `story` | ✅ | 스토리 챕터 |

## 런타임 핫 토글

관리자 API 또는 내부 커맨드로 런타임 오버라이드:

```typescript
// 기능 비활성화 (서버 재시작 없이)
featureFlags.setOverride('beta', true);

// 오버라이드 제거 → 환경변수/기본값으로 복원
featureFlags.clearOverride('beta');
```

## 새 기능 추가

1. `featureFlags.ts`의 `DEFAULT_FEATURES` 배열에 정의 추가
2. `FeatureKey` 타입에 키 추가 (선택 — `string` 확장으로 동적 등록도 가능)
3. 부트스트랩/라우트 등록 시 `featureFlags.isEnabled('new_key')` 체크
4. `.env.example`에 환경변수 예시 추가
