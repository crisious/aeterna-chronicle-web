/**
 * ATBGaugeRenderer.ts — FF6 스타일 ATB 게이지 렌더러 (Phaser)
 *
 * 책임:
 * - 각 참가자의 ATB 게이지를 파티 윈도우 우측에 막대로 그린다.
 * - 4상태 시각 분기 (Phase 54): charging / ready / disconnected / replaced
 *   상세 명세는 DESIGN.md §5.4 참조.
 * - 캐스팅 중일 때는 별도 캐스트 바(보라색)를 상단에 덧그림.
 * - 서버 스냅샷 수신 → applySnapshots() 호출. 누락된 actorId는 페이드 아웃.
 *
 * 계섬월 Build 단계 — stub 제거, Phaser Graphics 기반 실구현.
 */

import type Phaser from 'phaser';
import type { ATBMode, ATBSnapshot, CastReservation } from '../../../shared/types/atb';

// ─── 연결 상태 (Phase 54 — DESIGN.md §5.4 SSOT) ───────────────

/**
 * ATB row의 4상태 시각 구분 — 멀티플레이어 재접속 피드백.
 *  - charging:     게이지 충전 중 (0~99%, 정상 연결)
 *  - ready:        게이지 100%, 행동 가능
 *  - disconnected: 소켓 끊김, grace 윈도우 내 재접속 대기
 *  - replaced:     세션 탈취 또는 grace 만료
 *
 * SSOT: DESIGN.md §5.4. 코드 변경 시 반드시 §5.4 갱신.
 */
export type ATBConnectionState = 'charging' | 'ready' | 'disconnected' | 'replaced';

// ─── 설정 토큰 (DESIGN.md §5.4 준수) ─────────────────────────────

export const ATB_GAUGE_TOKENS = {
  width: 96,
  height: 6,
  radius: 2,
  colors: {
    fill: 0x89cfb0,       // --ac-ether (에테르 블루)
    fillReady: 0xffd700,  // 금색 강조
    fillDisconnected: 0x606060, // --text-muted 회색 (Phase 54)
    fillReplaced: 0xff4444,     // --accent-warn 어두운 적 (Phase 54)
    border: 0x2a2a3a,
    background: 0x0d0d1a,
    cast: 0xb084ff,       // 캐스팅 보라
    castEnd: 0xe0c2ff,    // 캐스팅 거의 완료 밝은 보라
  },
  /** 4상태별 alpha (Phase 54 — DESIGN.md §5.4) */
  alpha: {
    charging: 1.0,
    ready: 1.0,
    disconnected: 0.55,
    replaced: 0.4,
  },
  /** 깜빡임 주기 (ms). */
  readyPulseMs: 600,
  /** disconnected dashed border 깜빡임 주기 (ms) — 모션 감소 시 0. */
  disconnectedPulseMs: 800,
  /** 누락된 액터가 사라지는 페이드 아웃 시간 (ms). */
  fadeOutMs: 220,
  /** 게이지 보간 속도 (값/초). 서버 tick 사이 보간. */
  interpSpeed: 120,
  /** WAIT 모드 톤 어둡기 계수. */
  waitToneAlpha: 0.7,
} as const;

// ─── 인터페이스 ────────────────────────────────────────────────

export interface ATBGaugeRendererOptions {
  scene: Phaser.Scene;
  /** 파티 윈도우 앵커 좌표 (우측 상단). */
  anchor: { x: number; y: number };
  /** 참가자 간 세로 간격 (px). */
  rowHeight: number;
  /** 최대 참가자 수(아군 + 적군 합계, 풀링 크기). */
  maxSlots: number;
}

export interface ATBRowHandle {
  actorId: string;
  destroy(): void;
}

// ─── 내부 상태 ─────────────────────────────────────────────────

interface GaugeRow {
  actorId: string;
  slotIndex: number;
  /** 서버 기준 목표 게이지값. */
  targetGauge: number;
  /** 렌더링 보간 게이지값. */
  displayGauge: number;
  ready: boolean;
  cast: CastReservation | null;
  /** Phase 54 — 4상태 시각 분기. ready와 별개로 disconnected/replaced 우선. */
  connState: ATBConnectionState;
  /** ready 펄스 누적 시간. */
  pulseAccum: number;
  /** 페이드 아웃 중이면 남은 ms, 아니면 -1. */
  fadingMs: number;
  graphics: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}

// ─── 렌더러 ────────────────────────────────────────────────────

export class ATBGaugeRenderer {
  private readonly scene: Phaser.Scene;
  private readonly anchor: { x: number; y: number };
  private readonly rowHeight: number;
  private readonly maxSlots: number;

  private rows: Map<string, GaugeRow> = new Map();
  private nextSlot = 0;
  private mode: ATBMode = 'ACTIVE';
  private destroyed = false;

  private readonly updateListener: (_t: number, dt: number) => void;

  constructor(opts: ATBGaugeRendererOptions) {
    this.scene = opts.scene;
    this.anchor = { ...opts.anchor };
    this.rowHeight = opts.rowHeight;
    this.maxSlots = opts.maxSlots;

    // 프레임 루프에 참여 — 보간/펄스/페이드 업데이트.
    this.updateListener = (_t: number, dt: number) => this._tick(dt);
    this.scene.events.on('update', this.updateListener, this);
    this.scene.events.once('shutdown', () => this.destroy(), this);
    this.scene.events.once('destroy', () => this.destroy(), this);
  }

  /** 서버 스냅샷 수신 시 호출. 누락된 actorId는 페이드 아웃. */
  applySnapshots(snapshots: ATBSnapshot[], casts: CastReservation[]): void {
    if (this.destroyed) return;

    const seen = new Set<string>();
    const castMap = new Map<string, CastReservation>();
    for (const c of casts) castMap.set(c.actorId, c);

    for (const snap of snapshots) {
      seen.add(snap.actorId);
      let row = this.rows.get(snap.actorId);
      if (!row) {
        const created = this._createRow(snap.actorId);
        if (!created) continue; // slot 풀 초과
        row = created;
      }
      // 페이드 아웃 중이었다면 복구.
      row.fadingMs = -1;
      row.graphics.setAlpha(1);
      row.label.setAlpha(1);

      row.targetGauge = Math.max(0, Math.min(100, snap.gauge));
      row.ready = snap.ready;
      row.cast = castMap.get(snap.actorId) ?? null;
    }

    // 누락된 액터 페이드 아웃.
    for (const [actorId, row] of this.rows) {
      if (!seen.has(actorId) && row.fadingMs < 0) {
        row.fadingMs = ATB_GAUGE_TOKENS.fadeOutMs;
      }
    }
  }

  /** ready 상태 애니메이션 (금색 펄스) — 외부 트리거용. */
  playReadyPulse(actorId: string): void {
    const row = this.rows.get(actorId);
    if (!row) return;
    row.ready = true;
    row.pulseAccum = 0;
  }

  /**
   * Phase 54 — 4상태 시각 변경 (DESIGN.md §5.4 SSOT).
   *
   * 외부 호출 (combatSocketHandler 이벤트):
   *   - 'combat:participant_disconnected' → setConnectionState(actorId, 'disconnected')
   *   - 'combat:session_replaced'        → setConnectionState(actorId, 'replaced')
   *   - 'combat:participant_reconnected' → setConnectionState(actorId, 'charging' | 'ready')
   */
  setConnectionState(actorId: string, state: ATBConnectionState): void {
    const row = this.rows.get(actorId);
    if (!row) return;
    row.connState = state;
    if (state === 'replaced') {
      row.ready = false;
      row.cast = null;
    }
  }

  /** 모드 변경 시 게이지 색조 톤 전환. */
  setModeTone(mode: ATBMode): void {
    this.mode = mode;
  }

  /** 씬 종료 시 호출. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.off('update', this.updateListener, this);
    for (const row of this.rows.values()) {
      row.graphics.destroy();
      row.label.destroy();
    }
    this.rows.clear();
  }

  // ─── 내부 ────────────────────────────────────────────────────

  private _createRow(actorId: string): GaugeRow | null {
    if (this.rows.size >= this.maxSlots) return null;
    const slotIndex = this.nextSlot++;
    const y = this.anchor.y + slotIndex * this.rowHeight;

    const graphics = this.scene.add.graphics();
    graphics.setDepth(50);

    const label = this.scene.add.text(
      this.anchor.x + ATB_GAUGE_TOKENS.width + 6,
      y - 4,
      '',
      { fontSize: '9px', color: '#ffd700', fontStyle: 'bold' },
    );
    label.setDepth(51);

    const row: GaugeRow = {
      actorId,
      slotIndex,
      targetGauge: 0,
      displayGauge: 0,
      ready: false,
      cast: null,
      connState: 'charging',
      pulseAccum: 0,
      fadingMs: -1,
      graphics,
      label,
    };
    this.rows.set(actorId, row);
    return row;
  }

  private _tick(dt: number): void {
    if (this.destroyed) return;

    const dtSec = dt / 1000;
    const toRemove: string[] = [];

    for (const [actorId, row] of this.rows) {
      // 페이드 처리.
      if (row.fadingMs >= 0) {
        row.fadingMs -= dt;
        const a = Math.max(0, row.fadingMs / ATB_GAUGE_TOKENS.fadeOutMs);
        row.graphics.setAlpha(a);
        row.label.setAlpha(a);
        if (row.fadingMs <= 0) {
          toRemove.push(actorId);
          continue;
        }
      }

      // 보간 — 서버 tick 사이 부드럽게.
      const diff = row.targetGauge - row.displayGauge;
      if (Math.abs(diff) > 0.01) {
        const step = Math.sign(diff) * Math.min(Math.abs(diff), ATB_GAUGE_TOKENS.interpSpeed * dtSec);
        row.displayGauge += step;
      } else {
        row.displayGauge = row.targetGauge;
      }

      row.pulseAccum = (row.pulseAccum + dt) % (ATB_GAUGE_TOKENS.readyPulseMs * 2);

      this._drawRow(row);
    }

    for (const id of toRemove) {
      const row = this.rows.get(id);
      if (row) {
        row.graphics.destroy();
        row.label.destroy();
        this.rows.delete(id);
      }
    }
  }

  private _drawRow(row: GaugeRow): void {
    const g = row.graphics;
    const x = this.anchor.x;
    const y = this.anchor.y + row.slotIndex * this.rowHeight;
    const w = ATB_GAUGE_TOKENS.width;
    const h = ATB_GAUGE_TOKENS.height;
    const r = ATB_GAUGE_TOKENS.radius;
    const C = ATB_GAUGE_TOKENS.colors;
    const A = ATB_GAUGE_TOKENS.alpha;

    g.clear();

    // 배경 + 테두리 (4상태별 분기).
    g.fillStyle(C.background, 0.85);
    g.fillRoundedRect(x, y, w, h, r);

    // disconnected 상태: dashed border (Phase 54 — DESIGN.md §5.4)
    if (row.connState === 'disconnected') {
      this._drawDashedBorder(g, x, y, w, h, r, C.fillDisconnected);
    } else if (row.connState === 'replaced') {
      g.lineStyle(1, C.fillReplaced, 1);
      g.strokeRoundedRect(x, y, w, h, r);
    } else {
      g.lineStyle(1, C.border, 1);
      g.strokeRoundedRect(x, y, w, h, r);
    }

    // 게이지 채움 — 4상태 우선순위: replaced > disconnected > ready > charging
    const filled = (row.displayGauge / 100) * (w - 2);
    if (filled > 0.5 || row.connState === 'replaced') {
      let fillColor: number;
      let stateAlpha: number;

      if (row.connState === 'replaced') {
        // 사선 패턴 시각 단서로 색맹 대응 (DESIGN.md §5.4)
        fillColor = C.fillReplaced;
        stateAlpha = A.replaced;
        g.fillStyle(fillColor, stateAlpha);
        g.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, r - 1);
        this._drawDiagonalPattern(g, x + 1, y + 1, w - 2, h - 2, C.background);
      } else if (row.connState === 'disconnected') {
        fillColor = C.fillDisconnected;
        stateAlpha = A.disconnected;
        g.fillStyle(fillColor, stateAlpha);
        g.fillRoundedRect(x + 1, y + 1, filled, h - 2, r - 1);
      } else if (row.ready) {
        // 펄스 보간 — 에테르블루 ↔ 금색.
        const half = ATB_GAUGE_TOKENS.readyPulseMs;
        const phase = row.pulseAccum < half
          ? row.pulseAccum / half
          : 1 - (row.pulseAccum - half) / half;
        fillColor = this._lerpColor(C.fill, C.fillReady, phase);
        const toneAlpha = this.mode === 'WAIT' ? ATB_GAUGE_TOKENS.waitToneAlpha : A.ready;
        g.fillStyle(fillColor, toneAlpha);
        g.fillRoundedRect(x + 1, y + 1, filled, h - 2, r - 1);
      } else {
        // charging — 기본 동작 보존.
        fillColor = C.fill;
        const toneAlpha = this.mode === 'WAIT' ? ATB_GAUGE_TOKENS.waitToneAlpha : A.charging;
        g.fillStyle(fillColor, toneAlpha);
        g.fillRoundedRect(x + 1, y + 1, filled, h - 2, r - 1);
      }
    }

    // 캐스트 바 — 상단 덧그림 (replaced 상태는 차단)
    if (row.cast && row.connState !== 'replaced' && row.connState !== 'disconnected') {
      const total = Math.max(1, row.cast.completesAtTick - row.cast.startedAtTick);
      const castRatio = Math.max(0, Math.min(1, 1 - (row.cast.completesAtTick - Date.now() / 16) / total));
      const castColor = this._lerpColor(C.cast, C.castEnd, castRatio);
      g.fillStyle(castColor, 0.9);
      g.fillRoundedRect(x, y - (h + 2), w * castRatio, h, r);
      g.lineStyle(1, C.border, 1);
      g.strokeRoundedRect(x, y - (h + 2), w, h, r);
    }

    // 라벨 — 4상태별 분기 (DESIGN.md §5.4 라벨 SSOT)
    if (row.connState === 'replaced') {
      row.label.setText('×');
      row.label.setColor('#ff4444');
      row.label.setAlpha(1);
    } else if (row.connState === 'disconnected') {
      row.label.setText('WAIT');
      row.label.setColor('#a0a0a0');
      row.label.setAlpha(0.85);
    } else if (row.ready && !row.cast) {
      const blink = row.pulseAccum < ATB_GAUGE_TOKENS.readyPulseMs;
      row.label.setText('READY');
      row.label.setColor('#ffd700');
      row.label.setAlpha(blink ? 1 : 0.4);
    } else if (row.cast) {
      row.label.setText('CAST');
      row.label.setColor('#ffd700');
      row.label.setAlpha(0.9);
    } else {
      row.label.setText('');
    }
    row.label.setPosition(x + w + 6, y - 4);
  }

  /** Phase 54 — disconnected 상태 dashed border (DESIGN.md §5.4). */
  private _drawDashedBorder(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    _r: number,
    color: number,
  ): void {
    g.lineStyle(1, color, 1);
    const dashLen = 3;
    const gapLen = 2;
    // 위/아래 라인
    for (let dx = 0; dx < w; dx += dashLen + gapLen) {
      g.beginPath();
      g.moveTo(x + dx, y);
      g.lineTo(x + Math.min(dx + dashLen, w), y);
      g.strokePath();
      g.beginPath();
      g.moveTo(x + dx, y + h);
      g.lineTo(x + Math.min(dx + dashLen, w), y + h);
      g.strokePath();
    }
    // 좌/우 라인
    for (let dy = 0; dy < h; dy += dashLen + gapLen) {
      g.beginPath();
      g.moveTo(x, y + dy);
      g.lineTo(x, y + Math.min(dy + dashLen, h));
      g.strokePath();
      g.beginPath();
      g.moveTo(x + w, y + dy);
      g.lineTo(x + w, y + Math.min(dy + dashLen, h));
      g.strokePath();
    }
  }

  /** Phase 54 — replaced 상태 사선 패턴 (색맹 대응). */
  private _drawDiagonalPattern(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    color: number,
  ): void {
    g.lineStyle(1, color, 0.6);
    const stepPx = 4;
    for (let dx = -h; dx < w; dx += stepPx) {
      g.beginPath();
      g.moveTo(x + dx, y);
      g.lineTo(x + dx + h, y + h);
      g.strokePath();
    }
  }

  private _lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const gg = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (gg << 8) | bl;
  }
}
