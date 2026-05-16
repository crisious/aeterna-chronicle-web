// ─── ATB 공유 타입 (FF6 레퍼런스 개선) ───────────────────────────
// 서버/클라이언트/언리얼/유니티가 공유하는 ATB 프로토콜 타입.
// 실제 로직은 server/src/combat/atb, client/src/combat/*Renderer 에서 구현.

/**
 * ATB 게이지 진행 모드.
 * - ACTIVE: 메뉴 열려도 시간이 흐른다 (FF6 Active).
 * - WAIT:   메뉴/타겟 선택 중 시간 정지 (FF6 Wait).
 * - SEMI:   타겟 선택만 정지. 메뉴 열람은 흐름 유지.
 */
export type ATBMode = 'ACTIVE' | 'WAIT' | 'SEMI';

/**
 * ATB 배속. FF6 원작의 1~6 스위치를 0.5~2.0 스칼라로 매핑.
 */
export type ATBSpeedTier = 1 | 2 | 3 | 4 | 5 | 6;

/** 0~100 정수 게이지. 100 도달 시 ready=true. */
export type ATBGaugeValue = number;

/** 참가자별 ATB 상태 스냅샷. 네트워크 전송용 최소 필드. */
export interface ATBSnapshot {
  actorId: string;
  gauge: ATBGaugeValue;
  ready: boolean;
  /** 행동 예약 순서. ready인 유닛 중 먼저 100 도달한 순. */
  queueIndex: number | null;
  /** 현재 CAST(영창) 중이면 남은 ms. 아니면 null. */
  castingRemainMs: number | null;
}

/** 캐스트(영창) 기반 스킬을 위한 예약. */
export interface CastReservation {
  actorId: string;
  skillId: string;
  targetId: string;
  /** 캐스트 시작 tick. */
  startedAtTick: number;
  /** 완료 목표 tick. */
  completesAtTick: number;
  /** 피격 시 해제 여부 (물리 영창 false, 마법 영창 true). */
  interruptible: boolean;
}

/** 서버→클라 ATB 브로드캐스트 페이로드. */
export interface ATBBroadcastPayload {
  combatId: string;
  mode: ATBMode;
  speedTier: ATBSpeedTier;
  tick: number;
  snapshots: ATBSnapshot[];
  casts: CastReservation[];
}

/** 클라→서버 ATB 커맨드 입력. */
export interface ATBCommandInput {
  combatId: string;
  actorId: string;
  /** 커맨드 선택 시점의 클라 tick (서버 대조용). */
  clientTick: number;
  command:
    | { kind: 'attack'; targetId: string }
    | { kind: 'skill'; skillId: string; targetId: string }
    | { kind: 'item'; itemId: string; targetId: string }
    | { kind: 'defend' }
    | { kind: 'row'; row: 'front' | 'back' }
    | { kind: 'flee' }
    // CHRONO-S29: 2인 협공 — actorId 가 A 측, partnerActorId 가 B 측. techId 는 shared/types/dualTech.
    | { kind: 'dual_tech'; partnerActorId: string; techId: string; targetId: string };
}
