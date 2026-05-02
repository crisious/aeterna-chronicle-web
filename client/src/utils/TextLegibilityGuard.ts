/**
 * 텍스트 가독성 가드 — 에셋 단계 stub (계섬월 Staff Engineer)
 *
 * 토픽: 텍스트 가독성 (최소 폰트 14px)
 * 정합: DESIGN.md §3 타이포그래피 + design-tokens.ts 미러.
 *
 * 봉인: MIN_LEGIBLE_FONT_PX(14) 이하 폰트는 자동 클램프 + 경고 로그.
 * 검의 날이 무뎌지면 사람이 다칩니다.
 */

import { MIN_LEGIBLE_FONT_PX, type MobileViewportSpec } from '../config/mobile-viewport';
import { FONT } from '../config/design-tokens';

/** 폰트 적용 컨텍스트 — UI 영역별 분기 */
export type FontContext =
  | 'hud-stat'        // HP/MP/스태미나 숫자
  | 'hud-label'       // 키 힌트
  | 'dialogue-body'   // NPC 대화 본문
  | 'dialogue-name'   // NPC 이름
  | 'menu-item'       // 메뉴 항목
  | 'menu-title'      // 메뉴 타이틀
  | 'battle-damage'   // 데미지 floating
  | 'tooltip';

/** 컨텍스트별 데스크탑 기준 폰트 (px) — DESIGN.md §3 미러 */
export const DESKTOP_FONT_PX: Readonly<Record<FontContext, number>> = {
  'hud-stat': 18,
  'hud-label': 14,
  'dialogue-body': 20,
  'dialogue-name': 18,
  'menu-item': 16,
  'menu-title': 24,
  'battle-damage': 28,
  tooltip: 14,
} as const;

/** 클램프 결과 — 적용 폰트 + 메타 */
export interface ClampedFont {
  readonly contextId: FontContext;
  readonly requestedPx: number;
  readonly appliedPx: number;
  /** 14px 봉인에 의해 강제 인상되었는지 */
  readonly clamped: boolean;
  readonly viewportId: MobileViewportSpec['id'];
}

/** 컨텍스트별 폰트 패밀리 매핑 — 한글 본문 / 픽셀 / 모노 */
const CONTEXT_FONT_FAMILY: Readonly<Record<FontContext, string>> = {
  'hud-stat': FONT.MONO,
  'hud-label': FONT.BODY_KO,
  'dialogue-body': FONT.BODY_KO,
  'dialogue-name': FONT.TITLE_KO,
  'menu-item': FONT.BODY_KO,
  'menu-title': FONT.TITLE_KO,
  'battle-damage': FONT.MONO,
  tooltip: FONT.BODY_KO,
} as const;

/**
 * viewport에 맞는 폰트 크기 계산 — fontScale 적용 후 14px 봉인.
 *
 * 알고리즘:
 *   1. base = DESKTOP_FONT_PX[context]
 *   2. scaled = round(base * viewport.fontScale)
 *   3. applied = max(scaled, MIN_LEGIBLE_FONT_PX)
 *   4. clamped = applied !== scaled
 */
export function clampFontPx(
  context: FontContext,
  viewport: MobileViewportSpec,
): ClampedFont {
  const base = DESKTOP_FONT_PX[context];
  const scaled = Math.round(base * viewport.fontScale);
  const applied = Math.max(scaled, MIN_LEGIBLE_FONT_PX);
  return {
    contextId: context,
    requestedPx: scaled,
    appliedPx: applied,
    clamped: applied !== scaled,
    viewportId: viewport.id,
  };
}

/**
 * Phaser Text 스타일 객체 생성 — design-tokens.ts FONT 미러.
 */
export function createPhaserTextStyle(
  context: FontContext,
  viewport: MobileViewportSpec,
): Phaser.Types.GameObjects.Text.TextStyle {
  const clamped = clampFontPx(context, viewport);
  return {
    fontFamily: CONTEXT_FONT_FAMILY[context],
    fontSize: `${clamped.appliedPx}px`,
    color: '#FFFFFF',
    resolution: 1,
  };
}

/** 14px 봉인 위반 감사 — Test 단계에서 호출 */
export function auditLegibilityViolations(
  scene: Phaser.Scene,
): ReadonlyArray<{ objectName: string; appliedPx: number }> {
  const violations: Array<{ objectName: string; appliedPx: number }> = [];
  if (!scene || !scene.children) return violations;

  const visit = (obj: Phaser.GameObjects.GameObject): void => {
    const asText = obj as Phaser.GameObjects.Text;
    if (asText && typeof (asText as unknown as { style?: unknown }).style === 'object' && asText.style) {
      const sizeRaw = (asText.style as { fontSize?: string | number }).fontSize;
      const sizePx =
        typeof sizeRaw === 'number'
          ? sizeRaw
          : typeof sizeRaw === 'string'
            ? parseFloat(sizeRaw)
            : Number.NaN;
      if (Number.isFinite(sizePx) && sizePx < MIN_LEGIBLE_FONT_PX) {
        violations.push({
          objectName: asText.name || obj.type || 'unnamed',
          appliedPx: sizePx,
        });
      }
    }
    const container = obj as Phaser.GameObjects.Container;
    if (container && typeof container.iterate === 'function' && Array.isArray(container.list)) {
      for (const child of container.list) visit(child);
    }
  };

  for (const child of scene.children.list) visit(child);
  return violations;
}

export { MIN_LEGIBLE_FONT_PX };
