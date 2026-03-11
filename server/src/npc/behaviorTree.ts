/**
 * behaviorTree.ts — NPC 행동 트리 엔진
 *
 * 노드 타입: Selector, Sequence, Condition, Action, Decorator
 * 틱 기반 실행 (2Hz — tickManager.ts logic 틱과 연동)
 */

// ── 상태 열거 ─────────────────────────────────────────────────

/** 행동 트리 노드 실행 결과 */
export enum BtStatus {
  SUCCESS = 'success',
  FAILURE = 'failure',
  RUNNING = 'running',
}

// ── 노드 정의 (JSON 직렬화 가능) ──────────────────────────────

/** 행동 트리 노드 직렬화 형태 (Prisma JSON 컬럼에 저장) */
export type BtNodeDef =
  | { type: 'selector'; children: BtNodeDef[] }
  | { type: 'sequence'; children: BtNodeDef[] }
  | { type: 'condition'; condition: ConditionType }
  | { type: 'action'; action: ActionType }
  | { type: 'decorator'; decorator: DecoratorType; child: BtNodeDef };

/** 기본 조건 타입 */
export type ConditionType =
  | 'isPlayerNear'
  | 'isNight'
  | 'isHealthLow'
  | 'isHostile';

/** 기본 액션 타입 */
export type ActionType =
  | 'patrol'
  | 'idle'
  | 'chase'
  | 'flee'
  | 'trade'
  | 'dialogue'
  | 'sleep';

/** 데코레이터 타입 */
export type DecoratorType =
  | 'inverter'    // 결과 반전
  | 'repeater'    // 성공 시 반복
  | 'succeeder';  // 항상 성공

// ── NPC 월드 컨텍스트 ─────────────────────────────────────────

/** 행동 트리 실행 시 NPC에게 주입되는 월드 상태 */
export interface BtContext {
  npcId: string;
  /** 현재 NPC HP 비율 (0.0 ~ 1.0) */
  healthRatio: number;
  /** 가장 가까운 플레이어까지 거리 (유닛) */
  nearestPlayerDistance: number;
  /** 서버 시각 기준 시(hour, 0~23) */
  currentHour: number;
  /** NPC 적대 상태 여부 */
  hostile: boolean;
  /** 현재 실행 중인 액션 (RUNNING 상태 추적용) */
  runningAction?: ActionType;
}

// ── 조건 평가 맵 ──────────────────────────────────────────────

/** 조건별 평가 함수 — true면 SUCCESS, false면 FAILURE */
const conditionEvaluators: Record<ConditionType, (ctx: BtContext) => boolean> = {
  isPlayerNear: (ctx) => ctx.nearestPlayerDistance < 10,
  isNight: (ctx) => ctx.currentHour >= 21 || ctx.currentHour < 6,
  isHealthLow: (ctx) => ctx.healthRatio < 0.3,
  isHostile: (ctx) => ctx.hostile,
};

// ── 액션 실행 맵 ──────────────────────────────────────────────

/**
 * 액션 핸들러 — BtStatus 반환
 * RUNNING: 다음 틱에서도 이 액션 계속 실행
 * SUCCESS/FAILURE: 완료
 */
const actionHandlers: Record<ActionType, (ctx: BtContext) => BtStatus> = {
  patrol: (_ctx) => {
    // 순찰 경로 이동 — 실제 구현 시 위치 업데이트
    return BtStatus.SUCCESS;
  },
  idle: (_ctx) => {
    // 대기 상태
    return BtStatus.SUCCESS;
  },
  chase: (ctx) => {
    // 플레이어 추격 — 거리가 가까우면 성공
    if (ctx.nearestPlayerDistance < 2) return BtStatus.SUCCESS;
    return BtStatus.RUNNING;
  },
  flee: (ctx) => {
    // 도주 — 충분히 멀어지면 성공
    if (ctx.nearestPlayerDistance > 20) return BtStatus.SUCCESS;
    return BtStatus.RUNNING;
  },
  trade: (_ctx) => {
    // 거래 대기 상태 진입
    return BtStatus.SUCCESS;
  },
  dialogue: (_ctx) => {
    // 대화 대기 상태 진입
    return BtStatus.SUCCESS;
  },
  sleep: (_ctx) => {
    // 수면 상태
    return BtStatus.SUCCESS;
  },
};

// ── 트리 실행 엔진 ────────────────────────────────────────────

/**
 * 행동 트리 노드 단일 틱 실행
 * @param node JSON으로 정의된 노드
 * @param ctx NPC 월드 컨텍스트
 * @returns 실행 결과 상태
 */
export function tickNode(node: BtNodeDef, ctx: BtContext): BtStatus {
  switch (node.type) {
    // ── Selector: 자식 중 하나라도 SUCCESS/RUNNING이면 반환 ──
    case 'selector': {
      for (const child of node.children) {
        const status = tickNode(child, ctx);
        if (status !== BtStatus.FAILURE) return status;
      }
      return BtStatus.FAILURE;
    }

    // ── Sequence: 모든 자식이 SUCCESS여야 SUCCESS ──
    case 'sequence': {
      for (const child of node.children) {
        const status = tickNode(child, ctx);
        if (status !== BtStatus.SUCCESS) return status;
      }
      return BtStatus.SUCCESS;
    }

    // ── Condition: 조건 평가 ──
    case 'condition': {
      const evaluator = conditionEvaluators[node.condition];
      if (!evaluator) {
        console.warn(`[BehaviorTree] 알 수 없는 조건: ${node.condition}`);
        return BtStatus.FAILURE;
      }
      return evaluator(ctx) ? BtStatus.SUCCESS : BtStatus.FAILURE;
    }

    // ── Action: 액션 실행 ──
    case 'action': {
      const handler = actionHandlers[node.action];
      if (!handler) {
        console.warn(`[BehaviorTree] 알 수 없는 액션: ${node.action}`);
        return BtStatus.FAILURE;
      }
      const result = handler(ctx);
      if (result === BtStatus.RUNNING) {
        ctx.runningAction = node.action;
      }
      return result;
    }

    // ── Decorator: 자식 결과 변환 ──
    case 'decorator': {
      const childStatus = tickNode(node.child, ctx);

      switch (node.decorator) {
        case 'inverter':
          if (childStatus === BtStatus.SUCCESS) return BtStatus.FAILURE;
          if (childStatus === BtStatus.FAILURE) return BtStatus.SUCCESS;
          return BtStatus.RUNNING;

        case 'succeeder':
          return childStatus === BtStatus.RUNNING
            ? BtStatus.RUNNING
            : BtStatus.SUCCESS;

        case 'repeater':
          // 성공하면 다시 실행 (한 틱에 1회만)
          return childStatus === BtStatus.SUCCESS
            ? BtStatus.RUNNING
            : childStatus;

        default:
          console.warn(`[BehaviorTree] 알 수 없는 데코레이터: ${node.decorator}`);
          return childStatus;
      }
    }

    default:
      console.warn(`[BehaviorTree] 알 수 없는 노드 타입: ${(node as BtNodeDef).type}`);
      return BtStatus.FAILURE;
  }
}

// ── NPC 매니저: 틱 매니저 연동 ────────────────────────────────

/** NPC 런타임 상태 (메모리 캐시) */
export interface NpcRuntimeState {
  npcId: string;
  behaviorTree: BtNodeDef;
  context: BtContext;
  lastStatus: BtStatus;
}

/** 활성 NPC 런타임 상태 맵 */
const activeNpcs = new Map<string, NpcRuntimeState>();

/**
 * NPC를 행동 트리 틱 시스템에 등록
 */
export function registerNpc(
  npcId: string,
  behaviorTree: BtNodeDef,
  initialContext: Omit<BtContext, 'npcId'>
): void {
  activeNpcs.set(npcId, {
    npcId,
    behaviorTree,
    context: { ...initialContext, npcId },
    lastStatus: BtStatus.SUCCESS,
  });
}

/**
 * NPC를 행동 트리 틱 시스템에서 제거
 */
export function unregisterNpc(npcId: string): void {
  activeNpcs.delete(npcId);
}

/**
 * NPC 컨텍스트 업데이트 (외부에서 월드 상태 반영)
 */
export function updateNpcContext(
  npcId: string,
  partial: Partial<BtContext>
): void {
  const state = activeNpcs.get(npcId);
  if (state) {
    Object.assign(state.context, partial);
  }
}

/**
 * 모든 활성 NPC의 행동 트리를 1틱 실행
 * tickManager.on('logic', tickAllNpcs) 로 연동
 */
export function tickAllNpcs(_deltaMs: number): void {
  for (const state of activeNpcs.values()) {
    try {
      state.context.runningAction = undefined;
      state.lastStatus = tickNode(state.behaviorTree, state.context);
    } catch (err) {
      console.error(`[BehaviorTree] NPC ${state.npcId} 틱 에러:`, err);
    }
  }
}

/**
 * 특정 NPC의 마지막 실행 상태 조회
 */
export function getNpcState(npcId: string): NpcRuntimeState | undefined {
  return activeNpcs.get(npcId);
}

/**
 * 전체 활성 NPC 수
 */
export function getActiveNpcCount(): number {
  return activeNpcs.size;
}
