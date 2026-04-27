import type { AriaElementDef, ScreenAriaMap } from './screen_reader/AriaLabelMap';

export type A11yProbeCapability =
  | 'scene-manifest'
  | 'aria-contract'
  | 'focus-order'
  | 'live-region';

export type A11yProbePoliteness = 'off' | 'polite' | 'assertive';

export interface A11yProbeLiveRegion {
  selector: string;
  politeness: A11yProbePoliteness;
  purpose: string;
}

export interface A11yProbeSceneRegistration {
  sceneId: string;
  rootSelector: string;
  focusTrapSelector?: string;
  registeredSelectors: string[];
  liveRegions: A11yProbeLiveRegion[];
  metadata?: Record<string, string>;
}

export interface A11yProbeSnapshot {
  sceneId: string;
  timestamp: string;
  activeElementSelector?: string;
  registeredSelectors: string[];
  liveRegions: A11yProbeLiveRegion[];
}

export interface A11yProbeLiveMessage {
  sceneId: string;
  selector: string;
  politeness: A11yProbePoliteness;
  message: string;
}

export interface A11yProbeBridge {
  version: string;
  capabilities: A11yProbeCapability[];
  listScenes(): string[];
  getScene(sceneId: string): A11yProbeSceneRegistration | undefined;
  snapshot(sceneId: string): Promise<A11yProbeSnapshot>;
  emitLiveMessage(payload: A11yProbeLiveMessage): void;
}

export interface A11yProbeBridgeSeed {
  version: string;
  scenes: A11yProbeSceneRegistration[];
  capabilities?: A11yProbeCapability[];
  liveMessageSink?: (payload: A11yProbeLiveMessage) => void;
  selectorResolver?: (element: Element | null) => string | undefined;
}

export const A11Y_PROBE_GLOBAL_KEY = '__A11Y_PROBE__' as const;

function defaultSelectorResolver(element: Element | null): string | undefined {
  if (!element) {
    return undefined;
  }

  const ariaId = element.getAttribute?.('data-aria-id');
  if (ariaId) {
    return `[data-aria-id="${ariaId}"]`;
  }

  if ('id' in element && typeof element.id === 'string' && element.id.length > 0) {
    return `#${element.id}`;
  }

  return element.tagName?.toLowerCase();
}

function isSceneSelectorMatch(
  scene: A11yProbeSceneRegistration,
  selector: string | undefined,
): boolean {
  if (!selector) {
    return false;
  }

  return selector === scene.rootSelector
    || selector === scene.focusTrapSelector
    || scene.registeredSelectors.includes(selector)
    || scene.liveRegions.some((region) => region.selector === selector);
}

export function createA11yProbeBridge(seed: A11yProbeBridgeSeed): A11yProbeBridge {
  const sceneMap = new Map(seed.scenes.map((scene) => [scene.sceneId, scene]));
  const resolveSelector = seed.selectorResolver ?? defaultSelectorResolver;

  return {
    version: seed.version,
    capabilities: seed.capabilities ?? ['scene-manifest', 'aria-contract', 'focus-order', 'live-region'],
    listScenes(): string[] {
      return [...sceneMap.keys()];
    },
    getScene(sceneId: string): A11yProbeSceneRegistration | undefined {
      return sceneMap.get(sceneId);
    },
    async snapshot(sceneId: string): Promise<A11yProbeSnapshot> {
      const scene = sceneMap.get(sceneId);
      if (!scene) {
        return {
          sceneId,
          timestamp: new Date().toISOString(),
          registeredSelectors: [],
          liveRegions: [],
        };
      }

      const activeElementSelector = resolveSelector(typeof document === 'undefined' ? null : document.activeElement);

      return {
        sceneId,
        timestamp: new Date().toISOString(),
        activeElementSelector: isSceneSelectorMatch(scene, activeElementSelector)
          ? activeElementSelector
          : undefined,
        registeredSelectors: [...scene.registeredSelectors],
        liveRegions: [...scene.liveRegions],
      };
    },
    emitLiveMessage(payload: A11yProbeLiveMessage): void {
      seed.liveMessageSink?.(payload);
    },
  };
}

export function installA11yProbeBridge(
  bridge: A11yProbeBridge,
  target: Window | undefined = typeof window === 'undefined' ? undefined : window,
): void {
  if (!target) {
    return;
  }

  target[A11Y_PROBE_GLOBAL_KEY] = bridge;
}

function resolveLiveRegionPurpose(element: AriaElementDef): string {
  return element.label ?? element.labelFn ?? element.role;
}

function inferRootSelector(screen: ScreenAriaMap): string {
  return screen.elements.find((element) => element.role === 'dialog')?.selector
    ?? screen.elements.find((element) => element.role === 'application')?.selector
    ?? screen.elements[0]?.selector
    ?? 'body';
}

function inferFocusTrapSelector(screen: ScreenAriaMap): string | undefined {
  if (!screen.focusTrap) {
    return undefined;
  }

  return screen.elements.find((element) => element.role === 'dialog')?.selector
    ?? screen.elements.find((element) => element.tabindex >= 0)?.selector
    ?? screen.elements[0]?.selector;
}

export function createA11yProbeSceneRegistration(
  screen: ScreenAriaMap,
): A11yProbeSceneRegistration {
  const registeredSelectors = [...new Set(screen.elements.map((element) => element.selector))];

  return {
    sceneId: screen.screenId,
    rootSelector: inferRootSelector(screen),
    focusTrapSelector: inferFocusTrapSelector(screen),
    registeredSelectors,
    liveRegions: screen.elements
      .filter((element) => element.live && element.live !== 'off')
      .map((element) => ({
        selector: element.selector,
        politeness: element.live ?? 'off',
        purpose: resolveLiveRegionPurpose(element),
      })),
    metadata: {
      labelKo: screen.label_ko,
      labelEn: screen.label_en,
      focusTrap: screen.focusTrap ? 'true' : 'false',
      elementCount: String(screen.elements.length),
    },
  };
}

export function createA11yProbeBridgeFromAriaMaps(
  screens: ScreenAriaMap[],
  version: string,
  seed: Omit<A11yProbeBridgeSeed, 'version' | 'scenes'> = {},
): A11yProbeBridge {
  return createA11yProbeBridge({
    ...seed,
    version,
    scenes: screens.map((screen) => createA11yProbeSceneRegistration(screen)),
  });
}

declare global {
  interface Window {
    __A11Y_PROBE__?: A11yProbeBridge;
  }
}
