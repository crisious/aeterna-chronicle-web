export type ProbeId = 'axe' | 'contrast' | 'colorblind' | 'keyboard' | 'screen-reader';
export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
export type A11yLocale = 'ko' | 'en' | 'ja';
export type ProbeExecutionMode = 'static' | 'e2e' | 'snapshot';
export type A11ySceneId =
  | 'title'
  | 'main_menu'
  | 'character_select'
  | 'world_map'
  | 'battle'
  | 'inventory'
  | 'dialogue'
  | 'save_load'
  | 'skill_tree'
  | 'settings';

export interface A11ySceneDescriptor {
  id: A11ySceneId;
  label: string;
  route: string;
  sourceScreenId?: string;
  criticalPath: boolean;
  requiresCanvasMirror: boolean;
  probes: ProbeId[];
  locales: A11yLocale[];
  tags: string[];
  notes?: string[];
}

export interface A11yRuntimeLiveRegionDescriptor {
  selector: string;
  politeness: 'off' | 'polite' | 'assertive';
  purpose: string;
}

export interface A11yRuntimeSnapshot {
  sceneId: string;
  timestamp: string;
  activeElementSelector?: string;
  registeredSelectors: string[];
  liveRegions: A11yRuntimeLiveRegionDescriptor[];
}

export interface AuditViolation {
  code: string;
  severity: Severity;
  message: string;
  screenId?: string;
  selector?: string;
  meta?: Record<string, unknown>;
}

export interface ProbeResult {
  id: ProbeId;
  passed: boolean;
  violations: AuditViolation[];
  summary?: Record<string, unknown>;
  pendingImplementation?: boolean;
}

export interface StaticAuditSummary {
  timestamp: string;
  wcagLevel: 'AAA';
  passed: boolean;
  failedProbes: number;
  colorBlindModes: string[];
  probes: ProbeResult[];
  manualChecksPending: string[];
  contractVersion?: string;
  targetScenes?: A11ySceneId[];
  supportedLocales?: A11yLocale[];
}
