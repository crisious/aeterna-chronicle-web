/**
 * PatternOverlay — 색상 외 구분자 관리 (P17-11)
 *
 * 색약 모드 활성 시 색상 대신 형태/아이콘/패턴으로 정보를 전달:
 *   - 미니맵 마커 형태 구분 (▲●◆★○)
 *   - 데미지 텍스트 아이콘 접두사 (⚔️🔮🧪⚡💀✨)
 *   - 아이템 등급 테두리 패턴 (실선/점선/이중선…)
 *   - HP 바 수치 + 틱마크
 *   - 스킬 쿨다운 ✓/✗ 오버레이
 */

import type { ColorBlindMode } from '../AccessibilityManager';
import palettes from './colorblind_palettes.json';

// ─── 타입 ───────────────────────────────────────────────────────

export type MarkerType = 'enemy' | 'ally' | 'npc' | 'quest' | 'neutral';
export type ElementType = 'physical' | 'magic' | 'poison' | 'lightning' | 'dark' | 'light';
export type StatusType = 'buff' | 'debuff' | 'cooldown' | 'warning';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface MinimapMarkerConfig {
  type: MarkerType;
  shape: string;    // SVG path 또는 유니코드
  size: number;     // px
}

// ─── 구분자 매핑 (palettes.json에서 로드) ────────────────────────

const MINIMAP_SHAPES = palettes.patterns.minimap_shapes as Record<MarkerType, string>;
const DAMAGE_ICONS = palettes.patterns.damage_icons as Record<ElementType, string>;
const STATUS_INDICATORS = palettes.patterns.status_indicators as Record<StatusType, string>;

/** 미니맵 형태 → SVG 심볼 매핑 */
const SHAPE_PATHS: Record<string, string> = {
  'triangle-up': 'M 0 -8 L 7 6 L -7 6 Z',
  'circle': '',    // SVG <circle> 사용
  'diamond': 'M 0 -8 L 8 0 L 0 8 L -8 0 Z',
  'star': 'M 0 -8 L 2 -3 L 8 -3 L 3 1 L 5 7 L 0 3 L -5 7 L -3 1 L -8 -3 L -2 -3 Z',
  'ring': '',      // SVG <circle> + stroke-only
};

// ─── PatternOverlay 클래스 ──────────────────────────────────────

export class PatternOverlay {
  private active = false;
  private currentMode: ColorBlindMode = 'none';

  /** 색약 모드에 따라 패턴 자동 적용 */
  applyForMode(mode: ColorBlindMode): void {
    this.currentMode = mode;
    this.active = mode !== 'none';

    if (this.active) {
      this.enablePatterns();
    } else {
      this.disablePatterns();
    }
  }

  /** 패턴 활성 여부 */
  isActive(): boolean {
    return this.active;
  }

  // ── 미니맵 마커 ─────────────────────────────────────────────

  /** 미니맵 마커 형태 반환 (캔버스 렌더링용) */
  getMinimapShape(type: MarkerType): MinimapMarkerConfig {
    const shapeName = MINIMAP_SHAPES[type] ?? 'circle';
    return {
      type,
      shape: shapeName,
      size: 8,
    };
  }

  /** SVG path 데이터 반환 */
  getShapePath(type: MarkerType): string {
    const shapeName = MINIMAP_SHAPES[type] ?? 'circle';
    return SHAPE_PATHS[shapeName] ?? '';
  }

  /** 미니맵 렌더링: 캔버스에 형태 그리기 */
  drawMinimapMarker(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: MarkerType,
    color: string,
  ): void {
    const config = this.getMinimapShape(type);
    const shapeName = MINIMAP_SHAPES[type] ?? 'circle';

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    if (shapeName === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, config.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (shapeName === 'ring') {
      ctx.beginPath();
      ctx.arc(0, 0, config.size, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      const path = SHAPE_PATHS[shapeName];
      if (path) {
        const p = new Path2D(path);
        ctx.fill(p);
        ctx.stroke(p);
      }
    }

    ctx.restore();
  }

  // ── 데미지 텍스트 ──────────────────────────────────────────

  /** 데미지 텍스트 아이콘 접두사 반환 */
  getDamageIcon(element: ElementType): string {
    if (!this.active) return '';
    return DAMAGE_ICONS[element] ?? '';
  }

  /** 데미지 텍스트 포맷 */
  formatDamageText(amount: number, element: ElementType): string {
    const icon = this.getDamageIcon(element);
    return icon ? `${icon} ${amount}` : `${amount}`;
  }

  // ── 상태 아이콘 ────────────────────────────────────────────

  /** 상태 표시 접두사 반환 */
  getStatusIndicator(status: StatusType): string {
    if (!this.active) return '';
    return STATUS_INDICATORS[status] ?? '';
  }

  // ── HP 바 보조 ─────────────────────────────────────────────

  /** HP 바 틱마크 위치 계산 (25%, 50%, 75%) */
  getHpTickMarks(barWidth: number): number[] {
    if (!this.active) return [];
    return [
      barWidth * 0.25,
      barWidth * 0.50,
      barWidth * 0.75,
    ];
  }

  /** HP 바에 틱마크 + 수치 렌더링 */
  drawHpBarOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    currentHp: number,
    maxHp: number,
  ): void {
    if (!this.active) return;

    ctx.save();

    // 틱마크
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    for (const tickX of this.getHpTickMarks(width)) {
      ctx.beginPath();
      ctx.moveTo(x + tickX, y);
      ctx.lineTo(x + tickX, y + height);
      ctx.stroke();
    }

    // 수치 텍스트
    const percent = Math.round((currentHp / maxHp) * 100);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.max(10, height - 2)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${percent}%`, x + width / 2, y + height / 2);

    ctx.restore();
  }

  // ── 스킬 쿨다운 오버레이 ──────────────────────────────────

  /** 스킬 사용 가능 여부 오버레이 */
  drawSkillReadyOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    ready: boolean,
  ): void {
    if (!this.active) return;

    ctx.save();
    ctx.font = `bold ${size * 0.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ready ? '#00FF00' : '#FF4444';
    ctx.fillText(ready ? '✓' : '✗', x + size / 2, y + size / 2);
    ctx.restore();
  }

  // ── DOM 패턴 활성화 ────────────────────────────────────────

  /** DOM data-* 속성 기반 패턴 자동 활성화 */
  private enablePatterns(): void {
    document.documentElement.classList.add('cb-patterns-active');
    document.documentElement.dataset.cbMode = this.currentMode;
  }

  /** 패턴 비활성화 */
  private disablePatterns(): void {
    document.documentElement.classList.remove('cb-patterns-active');
    delete document.documentElement.dataset.cbMode;
  }

  /** 개별 HTML 요소에 패턴 데이터 바인딩 */
  bindElement(element: HTMLElement, type: string, value: string): void {
    element.dataset[type] = value;
  }
}

/** 싱글톤 인스턴스 */
export const patternOverlay = new PatternOverlay();
