/**
 * 반응형 HUD 변형 인터페이스 — 에셋 단계 stub (계섬월 Staff Engineer)
 *
 * 토픽: HUD·메뉴·전투 UI 모바일 변형
 * 정합: 기존 GameHUD.ts / BattleUI.ts / DialogueUI.ts 어댑터로 작용 — 침투 최소화.
 *
 * 4종 변형 슬롯: hud / battle / menu / dialogue.
 * 각 변형은 데스크탑 레이아웃을 변환만 함 — 별도 신규 컴포넌트 신설 금지(이중 SSOT 회피).
 */

import type { MobileViewportSpec } from '../config/mobile-viewport';
import type { ResolvedSafeArea } from '../utils/SafeAreaResolver';

/** HUD 변형 슬롯 식별자 */
export type HudVariantSlot = 'hud' | 'battle' | 'menu' | 'dialogue';

/** 레이아웃 변환 명령 — 데스크탑 → 모바일 차분 */
export interface HudLayoutDelta {
  readonly slot: HudVariantSlot;
  /** 데스크탑 대비 위치 오프셋 (px) */
  readonly translate: { dx: number; dy: number };
  /** 스케일 (0~1, 모바일은 보통 < 1) */
  readonly scale: number;
  /** safe area 클램프 적용 여부 */
  readonly clampToSafeArea: boolean;
  /** 숨길 자식 요소 ID 목록 — 모바일에서 생략 */
  readonly hiddenChildIds: ReadonlyArray<string>;
  /** 재배치할 자식 — 가상 키패드/액션 버튼 위치 */
  readonly relocatedChildren: ReadonlyArray<{
    childId: string;
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  }>;
}

/** 변형 적용 컨텍스트 — Build 단계에서 inject */
export interface HudVariantContext {
  readonly viewport: MobileViewportSpec;
  readonly safeArea: ResolvedSafeArea;
  readonly orientation: 'portrait' | 'landscape';
}

/** 변형 어댑터 — 슬롯별 1개씩 구현 */
export interface IHudVariantAdapter {
  readonly slot: HudVariantSlot;
  /** 컨텍스트 기반 레이아웃 차분 계산 (순수 함수) */
  computeDelta(ctx: HudVariantContext): HudLayoutDelta;
  /** 차분을 실제 Phaser/DOM 컨테이너에 적용 */
  apply(target: Phaser.GameObjects.Container | HTMLElement, delta: HudLayoutDelta): void;
  /** 데스크탑 레이아웃 복귀 — 회전/리사이즈 시 호출 */
  revert(target: Phaser.GameObjects.Container | HTMLElement): void;
}

/** 변형 레지스트리 — Build 단계에서 4개 어댑터 등록 */
export interface IResponsiveHudRegistry {
  register(adapter: IHudVariantAdapter): void;
  resolve(slot: HudVariantSlot): IHudVariantAdapter | null;
  /** 전체 슬롯 일괄 적용 — 씬 mount / orientation change 시 */
  applyAll(ctx: HudVariantContext): void;
  /** 전체 복귀 — 데스크탑 모드 복귀 시 */
  revertAll(): void;
}

/** 레지스트리 팩토리 — 4슬롯 어댑터 보관/조회/일괄 적용 */
export function createResponsiveHudRegistry(): IResponsiveHudRegistry {
  const adapters = new Map<HudVariantSlot, IHudVariantAdapter>();
  const lastTargets = new Map<HudVariantSlot, Phaser.GameObjects.Container | HTMLElement>();

  return {
    register(adapter: IHudVariantAdapter): void {
      adapters.set(adapter.slot, adapter);
    },
    resolve(slot: HudVariantSlot): IHudVariantAdapter | null {
      return adapters.get(slot) ?? null;
    },
    applyAll(ctx: HudVariantContext): void {
      for (const adapter of adapters.values()) {
        const delta = adapter.computeDelta(ctx);
        const target = lastTargets.get(adapter.slot);
        if (target) adapter.apply(target, delta);
      }
    },
    revertAll(): void {
      for (const adapter of adapters.values()) {
        const target = lastTargets.get(adapter.slot);
        if (target) adapter.revert(target);
      }
    },
  };
}

/** 슬롯별 기본 변형 정책 — 데스크탑 → 모바일 차분 SSOT */
const SLOT_DEFAULT_SCALE: Readonly<Record<HudVariantSlot, number>> = {
  hud: 0.85,
  battle: 0.9,
  menu: 0.95,
  dialogue: 1.0,
} as const;

const SLOT_HIDDEN_CHILDREN: Readonly<Record<HudVariantSlot, ReadonlyArray<string>>> = {
  hud: ['minimap-decoration', 'keyhint-row'],
  battle: ['atb-decoration', 'desktop-tooltip'],
  menu: ['breadcrumb', 'desktop-helptext'],
  dialogue: [],
} as const;

const SLOT_RELOCATIONS: Readonly<
  Record<HudVariantSlot, ReadonlyArray<{ childId: string; anchor: HudLayoutDelta['relocatedChildren'][number]['anchor'] }>>
> = {
  hud: [
    { childId: 'hp-bar', anchor: 'top-left' },
    { childId: 'mp-bar', anchor: 'top-left' },
    { childId: 'minimap', anchor: 'top-right' },
    { childId: 'action-button', anchor: 'bottom-right' },
  ],
  battle: [
    { childId: 'attack-button', anchor: 'bottom-right' },
    { childId: 'skill-tray', anchor: 'bottom-left' },
    { childId: 'turn-order', anchor: 'top-right' },
  ],
  menu: [{ childId: 'close-button', anchor: 'top-right' }],
  dialogue: [{ childId: 'next-button', anchor: 'bottom-right' }],
} as const;

function isHTMLElement(obj: unknown): obj is HTMLElement {
  return typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement;
}

/** 슬롯별 어댑터 생성 — 4슬롯 공통 차분 정책. 슬롯별 override는 register 단계에서 교체. */
export function createHudAdapterStub(slot: HudVariantSlot): IHudVariantAdapter {
  const baselines = new WeakMap<
    Phaser.GameObjects.Container | HTMLElement,
    { x?: number; y?: number; scale?: number; transform?: string }
  >();

  return {
    slot,
    computeDelta(ctx: HudVariantContext): HudLayoutDelta {
      const isLandscape = ctx.orientation === 'landscape';
      const baseScale = SLOT_DEFAULT_SCALE[slot];
      const scale = isLandscape ? Math.min(1, baseScale + 0.05) : baseScale;
      return {
        slot,
        translate: { dx: ctx.safeArea.inset.left, dy: ctx.safeArea.inset.top },
        scale,
        clampToSafeArea: true,
        hiddenChildIds: SLOT_HIDDEN_CHILDREN[slot],
        relocatedChildren: SLOT_RELOCATIONS[slot],
      };
    },
    apply(target, delta): void {
      if (isHTMLElement(target)) {
        if (!baselines.has(target)) baselines.set(target, { transform: target.style.transform });
        target.style.transformOrigin = 'top left';
        target.style.transform = `translate(${delta.translate.dx}px, ${delta.translate.dy}px) scale(${delta.scale})`;
        for (const id of delta.hiddenChildIds) {
          const el = target.querySelector<HTMLElement>(`[data-child-id="${id}"]`);
          if (el) el.style.display = 'none';
        }
        return;
      }
      // Phaser Container
      const container = target as Phaser.GameObjects.Container;
      if (!baselines.has(container)) {
        baselines.set(container, { x: container.x, y: container.y, scale: container.scale });
      }
      container.setPosition(delta.translate.dx, delta.translate.dy);
      container.setScale(delta.scale);
    },
    revert(target): void {
      const baseline = baselines.get(target);
      if (!baseline) return;
      if (isHTMLElement(target)) {
        target.style.transform = baseline.transform ?? '';
        return;
      }
      const container = target as Phaser.GameObjects.Container;
      if (typeof baseline.x === 'number' && typeof baseline.y === 'number') {
        container.setPosition(baseline.x, baseline.y);
      }
      if (typeof baseline.scale === 'number') {
        container.setScale(baseline.scale);
      }
    },
  };
}
