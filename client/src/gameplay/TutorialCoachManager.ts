/**
 * TutorialCoachManager — 첫 30분 온보딩 코칭 컨트롤러
 *
 * 책임:
 * - 5종 게이트(이동/대화/전투/스킬/세이브)의 진행 상태 관리
 * - 게이트 시간초과/재시도/통과 판정 → coach.<gate>.<state> 메시지 emit
 * - 30분 한도 초과 시 자동 조정(다음 회차 보스 HP -5%) 트리거
 * - 스킵·재시청 옵션 (시네마틱/튜토리얼 전체)
 * - 상태 머신: idle → active → passed → completed
 *
 * 의존:
 * - constants/tutorial_coach_messages.ts (24슬롯 SSOT)
 * - telemetry/tutorialTelemetry.ts (학습 100% 지표 추적)
 *
 * 검의 날이 무뎌지면 사람이 다칩니다 — 게이트 미통과 시 다음 비트 진입 BLOCK.
 */

import {
  COACH_GATES,
  COACH_GATE_BUDGET,
  COACH_MESSAGES,
  TUTORIAL_OVERTIME_THRESHOLD_SEC,
  TUTORIAL_TOTAL_BUDGET_SEC,
  formatCoachMessage,
  type CoachGate,
  type CoachMessage,
  type CoachState,
} from '../constants/tutorial_coach_messages';
import {
  buildTutorialEvent,
  type TutorialGateEvent,
  type TutorialTelemetrySink,
  type TutorialSessionSummary,
} from '../telemetry/tutorialTelemetry';

// ─── 타입 ─────────────────────────────────────────────────────

export type GateStatus = 'idle' | 'active' | 'passed' | 'blocked';

export interface GateRuntime {
  gate: CoachGate;
  status: GateStatus;
  /** 게이트가 active 로 전환된 시각 (performance.now ms) */
  enteredAtMs: number | null;
  /** 통과 시각 — passed 일 때 set */
  passedAtMs: number | null;
  retries: number;
  lastMessageKey: string | null;
}

export interface CoachUiPayload {
  key: string;
  text: string;
  hint: string;
  state: CoachState;
  gate: CoachGate | null;
}

export interface CoachUiSink {
  show(payload: CoachUiPayload): void;
  hide(): void;
}

export interface TutorialCoachManagerOptions {
  sessionId: string;
  playerId: string;
  buildVersion: string;
  platform?: TutorialGateEvent['platform'];
  locale?: 'ko' | 'en';
  telemetry?: TutorialTelemetrySink;
  ui?: CoachUiSink;
  /** 시간 측정 — 테스트에서 주입 가능 (기본: performance.now) */
  now?: () => number;
}

// ─── 메인 클래스 ─────────────────────────────────────────────

export class TutorialCoachManager {
  private readonly opts: Required<
    Omit<TutorialCoachManagerOptions, 'telemetry' | 'ui'>
  > & {
    telemetry?: TutorialTelemetrySink;
    ui?: CoachUiSink;
  };

  private readonly runtime: Record<CoachGate, GateRuntime>;
  private readonly tutorialStartedAtMs: number;
  private overtimeTriggered = false;
  private completed = false;

  constructor(options: TutorialCoachManagerOptions) {
    this.opts = {
      sessionId: options.sessionId,
      playerId: options.playerId,
      buildVersion: options.buildVersion,
      platform: options.platform ?? 'web',
      locale: options.locale ?? 'ko',
      now: options.now ?? (() => performance.now()),
      telemetry: options.telemetry,
      ui: options.ui,
    };

    this.tutorialStartedAtMs = this.opts.now();
    this.runtime = COACH_GATES.reduce(
      (acc, gate) => {
        acc[gate] = {
          gate,
          status: 'idle',
          enteredAtMs: null,
          passedAtMs: null,
          retries: 0,
          lastMessageKey: null,
        };
        return acc;
      },
      {} as Record<CoachGate, GateRuntime>,
    );
  }

  // ─── public: 게이트 라이프사이클 ────────────────────────

  /** 게이트 진입 — 비트 진행 시 호출 (예: 첫 슬라임 조우 시 enterGate('battle')) */
  enterGate(gate: CoachGate): void {
    const r = this.runtime[gate];
    if (r.status === 'passed') return; // 이미 통과
    r.status = 'active';
    r.enteredAtMs = this.opts.now();
  }

  /** 게이트 통과 — 기본 공격 1회·선택지 클릭 등 명시적 학습 완료 시 호출 */
  passGate(gate: CoachGate, params?: Record<string, string | number>): CoachMessage {
    const r = this.runtime[gate];
    r.status = 'passed';
    r.passedAtMs = this.opts.now();

    const key = this.passKey(gate);
    return this.emit(gate, key, params);
  }

  /** 게이트 BLOCK — passSec 초과/입력 누락 등. 다음 비트 진입 차단. */
  blockGate(
    gate: CoachGate,
    params?: Record<string, string | number>,
  ): CoachMessage {
    const r = this.runtime[gate];
    r.status = 'blocked';
    r.retries += 1;

    // 3회 초과 시 WARN 으로 승격 (힌트 강도 ↑)
    if (r.retries >= COACH_GATE_BUDGET[gate].warnRetries) {
      return this.warnGate(gate, params);
    }

    const key = this.blockKey(gate);
    return this.emit(gate, key, params);
  }

  warnGate(gate: CoachGate, params?: Record<string, string | number>): CoachMessage {
    const key = this.warnKey(gate);
    return this.emit(gate, key, params);
  }

  errorGate(
    gate: CoachGate,
    code: string,
    params?: Record<string, string | number>,
  ): CoachMessage {
    const key = this.errorKey(gate);
    return this.emit(gate, key, { ...params, code });
  }

  // ─── public: 진행 상태/요약 ────────────────────────────

  /** tick — 매 프레임/초 호출. 게이트 시간초과 자동 BLOCK + 30분 한도 감시 */
  tick(): void {
    if (this.completed) return;

    const now = this.opts.now();
    const tutorialElapsedSec = (now - this.tutorialStartedAtMs) / 1000;

    // 30분 한도 — 자동 조정 1회만 트리거
    if (
      !this.overtimeTriggered &&
      tutorialElapsedSec >= TUTORIAL_OVERTIME_THRESHOLD_SEC
    ) {
      this.overtimeTriggered = true;
      this.emitRaw('coach.tutorial.overtime', null, undefined, true);
    }

    // 활성 게이트 — passSec 초과 시 BLOCK 발사
    for (const gate of COACH_GATES) {
      const r = this.runtime[gate];
      if (r.status !== 'active' || r.enteredAtMs === null) continue;

      const elapsedSec = (now - r.enteredAtMs) / 1000;
      const budget = COACH_GATE_BUDGET[gate].passSec;

      // 이미 BLOCK 메시지를 보낸 게이트는 재발사하지 않음 (지수 백오프 의도)
      const lastWasBlock = r.lastMessageKey === this.blockKey(gate);
      if (elapsedSec > budget && !lastWasBlock) {
        this.blockGate(gate);
      }
    }
  }

  isCompleted(): boolean {
    return COACH_GATES.every((g) => this.runtime[g].status === 'passed');
  }

  /** 5종 모두 통과 + 보스 처치 완료 시 호출 — 칭찬 카피 + summary emit */
  finalizeBossVictory(): TutorialSessionSummary {
    this.completed = true;
    this.emitRaw('coach.boss.victory', null);

    const totalMs = this.opts.now() - this.tutorialStartedAtMs;
    const summary: TutorialSessionSummary = {
      sessionId: this.opts.sessionId,
      totalDurationMs: totalMs,
      gatesCompleted: COACH_GATES.filter(
        (g) => this.runtime[g].status === 'passed',
      ),
      gatesBlocked: COACH_GATES.filter(
        (g) => this.runtime[g].status === 'blocked',
      ),
      fiveCorePassed: this.isCompleted(),
      overtime: totalMs / 1000 > TUTORIAL_TOTAL_BUDGET_SEC,
      nextSessionBossHpDelta: this.overtimeTriggered ? 0.05 : 0,
    };

    this.opts.telemetry?.finalize(summary);
    return summary;
  }

  /** 시네마틱 스킵 — Esc 또는 [Skip ▶▶] 버튼 핸들러 */
  skipCinematic(): void {
    this.emitRaw('coach.cinematic.skip.confirm', null);
  }

  /** 보스 P2 진입 코칭 — HP 50% 분기 */
  enterBossPhase2(): void {
    this.emitRaw('coach.boss.phase2.enter', null);
  }

  /** 디버그/UI 표시용 — 게이트 진행률 (0.0 ~ 1.0) */
  getProgress(): number {
    const passed = COACH_GATES.filter(
      (g) => this.runtime[g].status === 'passed',
    ).length;
    return passed / COACH_GATES.length;
  }

  getRuntimeSnapshot(): Readonly<Record<CoachGate, GateRuntime>> {
    return this.runtime;
  }

  // ─── private: 메시지 키 빌더 ─────────────────────────

  private passKey(gate: CoachGate): string {
    const map: Record<CoachGate, string> = {
      move: 'coach.move.pass.arrived',
      dialog: 'coach.dialog.pass.chosen',
      battle: 'coach.battle.pass.first_kill',
      skill: 'coach.skill.pass.first_use',
      save: 'coach.save.pass.slot_saved',
    };
    return map[gate];
  }

  private blockKey(gate: CoachGate): string {
    const map: Record<CoachGate, string> = {
      move: 'coach.move.block.idle',
      dialog: 'coach.dialog.block.no_choice',
      battle: 'coach.battle.block.atb_idle',
      skill: 'coach.skill.block.no_mp',
      save: 'coach.save.block.must_save_first',
    };
    return map[gate];
  }

  private warnKey(gate: CoachGate): string {
    const map: Record<CoachGate, string> = {
      move: 'coach.move.warn.retry',
      dialog: 'coach.dialog.warn.skipped',
      battle: 'coach.battle.warn.three_misses',
      skill: 'coach.skill.warn.idle',
      save: 'coach.save.warn.menu_dwell',
    };
    return map[gate];
  }

  private errorKey(gate: CoachGate): string {
    const map: Record<CoachGate, string> = {
      move: 'coach.move.error.input_dropped',
      dialog: 'coach.dialog.error.npc_missing',
      battle: 'coach.battle.error.atb_stuck',
      skill: 'coach.skill.error.mp_negative',
      save: 'coach.save.error.localstorage_full',
    };
    return map[gate];
  }

  // ─── private: 메시지/텔레메트리 발사 ─────────────────

  private emit(
    gate: CoachGate,
    key: string,
    params?: Record<string, string | number>,
  ): CoachMessage {
    const msg = COACH_MESSAGES[key];
    if (!msg) {
      throw new Error(`[coach] 미정의 키 ${key} — SSOT 누락 의심`);
    }
    this.runtime[gate].lastMessageKey = key;
    this.emitRaw(key, gate, params);
    return msg;
  }

  /** gate 가 null 인 보조 슬롯(시네마틱/보스/오버타임)도 동일 경로로 발사 */
  private emitRaw(
    key: string,
    gate: CoachGate | null,
    params?: Record<string, string | number>,
    triggeredOvertime?: boolean,
  ): void {
    const msg = COACH_MESSAGES[key];
    if (!msg) return; // 보조 키 누락은 silent — verify:tutorial-copy 가 빌드에서 검증

    // UI 노출
    this.opts.ui?.show({
      key,
      text: formatCoachMessage(key, this.opts.locale, params),
      hint: msg.hint
        ? formatCoachMessage(key, this.opts.locale, params).length > 0
          ? msg.hint[this.opts.locale] || ''
          : ''
        : '',
      state: msg.state,
      gate,
    });

    // Telemetry — 게이트 슬롯에 한해 발사 (보조 슬롯은 sessionId 만 추적)
    if (gate !== null) {
      const r = this.runtime[gate];
      const now = this.opts.now();
      const elapsedMs =
        r.enteredAtMs === null ? 0 : Math.max(0, now - r.enteredAtMs);
      const tutorialElapsedMs = now - this.tutorialStartedAtMs;

      const event = buildTutorialEvent({
        sessionId: this.opts.sessionId,
        playerId: this.opts.playerId,
        gate,
        state: msg.state,
        elapsedMs,
        retries: r.retries,
        tutorialElapsedMs,
        buildVersion: this.opts.buildVersion,
        platform: this.opts.platform,
        triggeredOvertime,
      });
      this.opts.telemetry?.emit(event);
    }
  }
}
