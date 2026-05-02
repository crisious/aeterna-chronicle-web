/**
 * 터치 입력 매퍼 — 에셋 단계 stub (계섬월 Staff Engineer)
 *
 * 토픽: 터치 입력 매핑 (탭→클릭 / 드래그→이동 / 롱프레스→메뉴)
 * 지표: 터치 인식 지연 ≤ 100ms
 *
 * 실제 인식 로직은 Build 단계. 여기는 인터페이스와 시그니처만.
 * 검의 날이 무뎌지면 사람이 다칩니다 — 100ms 봉인은 비협상.
 */

/** 추상 제스처 — 마우스/터치 통합 입력 표현 */
export type GestureKind = 'tap' | 'drag' | 'longpress' | 'pinch' | 'swipe';

/** 게임 의미 액션 — 페르소나 입력 도메인 */
export type GameInputAction =
  | 'click'      // 탭 → 클릭 (UI 버튼/NPC 상호작용)
  | 'move'       // 드래그 → 이동 (월드 panning / 캐릭터 이동)
  | 'menu'       // 롱프레스 → 컨텍스트 메뉴
  | 'zoom'       // 핀치 → 줌 (월드맵)
  | 'cancel';    // 스와이프 다운 → 취소

/** 제스처 임계값 SSOT — Build 단계에서 튜닝 */
export interface GestureThresholds {
  /** 탭 최대 지속 시간 (ms) — 이상은 longpress 후보 */
  readonly tapMaxDurationMs: 200;
  /** 롱프레스 발화 시간 (ms) */
  readonly longpressTriggerMs: 500;
  /** 드래그 인식 최소 이동 (px) — 이하는 탭 jitter */
  readonly dragMinDistancePx: 8;
  /** 인식 응답 최대 지연 — 토픽 지표 2 */
  readonly recognitionMaxLatencyMs: 100;
}

export const DEFAULT_GESTURE_THRESHOLDS: GestureThresholds = {
  tapMaxDurationMs: 200,
  longpressTriggerMs: 500,
  dragMinDistancePx: 8,
  recognitionMaxLatencyMs: 100,
};

/** 정규화된 터치 이벤트 — Phaser/DOM 양쪽 어댑터 입력 */
export interface NormalizedPointerEvent {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly timestampMs: number;
  readonly phase: 'start' | 'move' | 'end' | 'cancel';
}

/** 매핑 결과 — 게임 액션 + 메타 */
export interface MappedAction {
  readonly action: GameInputAction;
  readonly gesture: GestureKind;
  /** 인식까지 걸린 시간 (ms) — 100ms 봉인 검증용 */
  readonly recognitionLatencyMs: number;
  readonly origin: { x: number; y: number };
  readonly delta?: { dx: number; dy: number };
}

/** 매퍼 인터페이스 — Build 단계에서 구현체 작성 */
export interface ITouchInputMapper {
  /** 정규화 이벤트 1건 흡수 — 매핑 가능 시 결과 emit */
  ingest(event: NormalizedPointerEvent): MappedAction | null;
  /** 진행 중 제스처 강제 종료 (씬 전환 시 호출) */
  reset(): void;
  /** 매핑 결과 구독 — Build 단계에서 EventEmitter 연결 */
  on(action: GameInputAction, handler: (mapped: MappedAction) => void): void;
  off(action: GameInputAction, handler: (mapped: MappedAction) => void): void;
}

/** 내부 한정 — 리터럴 타입 봉인 우회용 일반 number 임계값 */
interface NumericThresholds {
  readonly tapMaxDurationMs: number;
  readonly longpressTriggerMs: number;
  readonly dragMinDistancePx: number;
  readonly recognitionMaxLatencyMs: number;
}

interface PointerTrack {
  readonly id: number;
  readonly startX: number;
  readonly startY: number;
  readonly startMs: number;
  lastX: number;
  lastY: number;
  emitted: boolean;
  longpressTimer: ReturnType<typeof setTimeout> | null;
  isDragging: boolean;
}

/** 매퍼 팩토리 — state machine 기반 제스처 인식. 100ms 봉인 비협상. */
export function createTouchInputMapper(
  thresholds?: Partial<GestureThresholds>,
): ITouchInputMapper {
  const t: NumericThresholds = {
    tapMaxDurationMs: thresholds?.tapMaxDurationMs ?? DEFAULT_GESTURE_THRESHOLDS.tapMaxDurationMs,
    longpressTriggerMs:
      thresholds?.longpressTriggerMs ?? DEFAULT_GESTURE_THRESHOLDS.longpressTriggerMs,
    dragMinDistancePx: thresholds?.dragMinDistancePx ?? DEFAULT_GESTURE_THRESHOLDS.dragMinDistancePx,
    recognitionMaxLatencyMs:
      thresholds?.recognitionMaxLatencyMs ?? DEFAULT_GESTURE_THRESHOLDS.recognitionMaxLatencyMs,
  };

  const tracks = new Map<number, PointerTrack>();
  const handlers = new Map<GameInputAction, Set<(m: MappedAction) => void>>();

  const emit = (mapped: MappedAction): void => {
    const set = handlers.get(mapped.action);
    if (!set) return;
    for (const h of set) {
      try {
        h(mapped);
      } catch {
        // 핸들러 단일 실패가 매퍼 상태를 오염시키지 않게 격리
      }
    }
  };

  const clearTimer = (track: PointerTrack): void => {
    if (track.longpressTimer !== null) {
      clearTimeout(track.longpressTimer);
      track.longpressTimer = null;
    }
  };

  const buildLongpressEmitter = (track: PointerTrack) => (): void => {
    if (track.emitted || track.isDragging) return;
    track.emitted = true;
    track.longpressTimer = null;
    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const mapped: MappedAction = {
      action: 'menu',
      gesture: 'longpress',
      recognitionLatencyMs: Math.max(0, now - track.startMs),
      origin: { x: track.startX, y: track.startY },
    };
    emit(mapped);
  };

  return {
    ingest(event: NormalizedPointerEvent): MappedAction | null {
      if (event.phase === 'start') {
        const track: PointerTrack = {
          id: event.id,
          startX: event.x,
          startY: event.y,
          startMs: event.timestampMs,
          lastX: event.x,
          lastY: event.y,
          emitted: false,
          longpressTimer: null,
          isDragging: false,
        };
        tracks.set(event.id, track);
        track.longpressTimer = setTimeout(buildLongpressEmitter(track), t.longpressTriggerMs);
        return null;
      }

      const track = tracks.get(event.id);
      if (!track) return null;

      if (event.phase === 'move') {
        track.lastX = event.x;
        track.lastY = event.y;
        const dx = event.x - track.startX;
        const dy = event.y - track.startY;
        const dist = Math.hypot(dx, dy);
        if (!track.isDragging && dist >= t.dragMinDistancePx) {
          track.isDragging = true;
          clearTimer(track);
        }
        if (track.isDragging && !track.emitted) {
          const latency = event.timestampMs - track.startMs;
          const mapped: MappedAction = {
            action: 'move',
            gesture: 'drag',
            recognitionLatencyMs: Math.max(0, latency),
            origin: { x: track.startX, y: track.startY },
            delta: { dx, dy },
          };
          // drag는 첫 인식만 emit으로 통지, 이후 좌표는 핸들러에서 직접 추적
          track.emitted = true;
          emit(mapped);
          return mapped;
        }
        return null;
      }

      if (event.phase === 'cancel') {
        clearTimer(track);
        tracks.delete(event.id);
        return null;
      }

      // end
      clearTimer(track);
      tracks.delete(event.id);
      if (track.emitted) return null; // 이미 drag/longpress 인식됨

      const duration = event.timestampMs - track.startMs;
      if (duration <= t.tapMaxDurationMs && !track.isDragging) {
        const mapped: MappedAction = {
          action: 'click',
          gesture: 'tap',
          recognitionLatencyMs: Math.max(0, duration),
          origin: { x: track.startX, y: track.startY },
        };
        emit(mapped);
        return mapped;
      }

      return null;
    },

    reset(): void {
      for (const track of tracks.values()) clearTimer(track);
      tracks.clear();
    },

    on(action: GameInputAction, handler: (mapped: MappedAction) => void): void {
      let set = handlers.get(action);
      if (!set) {
        set = new Set();
        handlers.set(action, set);
      }
      set.add(handler);
    },

    off(action: GameInputAction, handler: (mapped: MappedAction) => void): void {
      const set = handlers.get(action);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) handlers.delete(action);
    },
  };
}
