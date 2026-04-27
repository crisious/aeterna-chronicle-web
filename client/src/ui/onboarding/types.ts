/**
 * 온보딩(첫 30분 경험) 타입 SSOT — Stub
 *
 * 토픽: 신규 플레이어 이탈 방지 — 오프닝 시네마틱 → 첫 전투 → 첫 보스 흐름.
 * 핵심 시스템 5종(이동/대화/전투/스킬/세이브) 100% 학습 보장 + 길이 ≤ 30분.
 *
 * 본 파일은 인터페이스/타입 SSOT. 로직은 development 단계에서 채운다.
 * 검의 칼집만 만든다. 날은 다음 단계.
 */

// ─── 핵심 학습 시스템 5종 ──────────────────────────────────────
// 지표: 첫 30분 안에 5종 모두 100% 노출·학습 보장.

export type CoreSystemId =
  | 'movement' // 이동 (WASD/방향키)
  | 'dialogue' // NPC 대화 (Space/Enter, 선택지)
  | 'combat' // ATB 전투 (게이지·기본공격)
  | 'skill' // 스킬 (우선순위·MP 관리)
  | 'save'; // 세이브 (자동/수동)

export const CORE_SYSTEMS: readonly CoreSystemId[] = [
  'movement',
  'dialogue',
  'combat',
  'skill',
  'save',
] as const;

// ─── 첫 30분 흐름 단계 ─────────────────────────────────────────

export type OnboardingPhaseId =
  | 'opening_cinematic' // 오프닝 시네마틱 (스킵 가능)
  | 'awakening_movement' // 각성 — 이동 학습
  | 'first_dialogue' // 첫 NPC 대화
  | 'first_battle' // 첫 전투 — ATB 게이지 학습
  | 'skill_unlock' // 스킬 해금 — 우선순위 학습
  | 'item_use' // 아이템 사용
  | 'first_save' // 세이브 포인트
  | 'first_boss' // 첫 보스 — 종합 응용
  | 'completion'; // 완료 — 자유 플레이 진입

export const ONBOARDING_PHASES: readonly OnboardingPhaseId[] = [
  'opening_cinematic',
  'awakening_movement',
  'first_dialogue',
  'first_battle',
  'skill_unlock',
  'item_use',
  'first_save',
  'first_boss',
  'completion',
] as const;

// ─── 코치마크(한 화면 1개념) ───────────────────────────────────

/**
 * 한 화면에는 한 개의 코치마크만 노출한다.
 * 동시 노출은 인지 부담 — 큐(queue)로 직렬화.
 */
export interface CoachmarkSpec {
  /** 코치마크 식별자 (재시청·텔레메트리 키) */
  id: string;
  /** 학습 대상 시스템 — 진행 게이지에 가산 */
  system: CoreSystemId;
  /** 속한 단계 */
  phase: OnboardingPhaseId;
  /** 헤드라인 — 한 줄, ≤ 24자 권장 */
  title: string;
  /** 본문 — 1개념만, ≤ 80자 권장 */
  body: string;
  /** 하이라이트 영역 (정규화 0~1, undefined=중앙 안내) */
  highlight?: { x: number; y: number; w: number; h: number };
  /** 진행 트리거 */
  advanceOn:
    | { kind: 'click' }
    | { kind: 'key'; key: string }
    | { kind: 'event'; event: string }
    | { kind: 'auto'; delayMs: number };
  /** 스킵 허용 여부 (필수 학습은 false) */
  skippable: boolean;
  /** 재시청 가능 여부 (메뉴 → 도움말에서 다시 열기) */
  replayable: boolean;
}

// ─── 진행 상태 ────────────────────────────────────────────────

export interface OnboardingProgressState {
  /** 현재 단계 */
  currentPhase: OnboardingPhaseId;
  /** 완료된 단계 집합 */
  completedPhases: ReadonlySet<OnboardingPhaseId>;
  /** 시스템별 학습 완료 여부 — 5종 모두 true가 되어야 100% */
  systemsLearned: Record<CoreSystemId, boolean>;
  /** 시작 시각 (epoch ms) — 30분 ≤ 보장 측정용 */
  startedAtMs: number;
  /** 누적 활동 시간 (ms) — 일시정지/메뉴 제외 */
  elapsedActiveMs: number;
  /** 전체 스킵 여부 (재진입 플레이어용) */
  skippedAll: boolean;
}

// ─── 텔레메트리 이벤트 ────────────────────────────────────────

export type OnboardingEvent =
  | { type: 'phase_enter'; phase: OnboardingPhaseId; tMs: number }
  | { type: 'phase_complete'; phase: OnboardingPhaseId; tMs: number }
  | { type: 'coachmark_shown'; coachmarkId: string; tMs: number }
  | { type: 'coachmark_advanced'; coachmarkId: string; latencyMs: number }
  | { type: 'system_learned'; system: CoreSystemId; tMs: number }
  | { type: 'skip_requested'; phase: OnboardingPhaseId; reason?: string }
  | { type: 'replay_requested'; coachmarkId: string }
  | { type: 'onboarding_complete'; totalMs: number; coverage: number }
  | { type: 'onboarding_dropout'; phase: OnboardingPhaseId; tMs: number };

// ─── 게이트 결과 ──────────────────────────────────────────────
// launch_checklist에 등록될 ship-gate 후보.

export interface OnboardingGateResult {
  /** 5종 시스템 학습 커버리지 (0.0 ~ 1.0) */
  systemCoverage: number;
  /** 첫 30분 내 완료한 플레이어 비율 (0.0 ~ 1.0) — 측정 후 채움 */
  within30minRate: number;
  /** 단계별 dropout 비율 */
  dropoutByPhase: Record<OnboardingPhaseId, number>;
  /** 게이트 통과 여부 — 두 지표 모두 100% 필요 */
  pass: boolean;
}
