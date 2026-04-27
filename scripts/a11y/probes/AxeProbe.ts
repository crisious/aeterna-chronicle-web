import type { AuditViolation, ProbeResult, Severity } from '../types';

export type AxeRuleTag =
  | 'wcag2a'
  | 'wcag2aa'
  | 'wcag2aaa'
  | 'wcag21a'
  | 'wcag21aa'
  | 'wcag21aaa'
  | 'best-practice';

export interface AxeProbeTarget {
  sceneId: string;
  route: string;
  locale: string;
  rootSelector?: string;
}

export interface AxeNodeViolation {
  target?: string[];
  html?: string;
  failureSummary?: string;
}

export interface AxeEngineViolation {
  id: string;
  help: string;
  impact?: string;
  tags?: string[];
  nodes?: AxeNodeViolation[];
}

export interface AxeScanResult {
  violations: AxeEngineViolation[];
  incomplete?: AxeEngineViolation[];
  passes?: Array<{ id: string }>;
}

export interface AxeProbeOptions {
  tags?: AxeRuleTag[];
  includeIncomplete?: boolean;
}

export interface AxeProbeEngine {
  scan(target: AxeProbeTarget, options: AxeProbeOptions): Promise<AxeScanResult>;
}

export interface AxeProbeResult extends ProbeResult {
  id: 'axe';
  scannedTargets: number;
  executedTags: AxeRuleTag[];
}

const DEFAULT_TAGS: AxeRuleTag[] = ['wcag2aaa', 'wcag21aaa', 'best-practice'];

function normalizeSeverity(impact?: string): Severity {
  switch (impact) {
    case 'critical':
      return 'critical';
    case 'serious':
      return 'serious';
    case 'minor':
      return 'minor';
    default:
      return 'moderate';
  }
}

function toViolation(target: AxeProbeTarget, issue: AxeEngineViolation): AuditViolation {
  const primaryNode = issue.nodes?.[0];
  const selector = primaryNode?.target?.[0];

  return {
    code: issue.id,
    severity: normalizeSeverity(issue.impact),
    message: `${target.sceneId}(${target.locale}) - ${issue.help}`,
    screenId: target.sceneId,
    selector,
    meta: {
      route: target.route,
      tags: issue.tags ?? [],
      failureSummary: primaryNode?.failureSummary,
      html: primaryNode?.html,
    },
  };
}

export async function runAxeProbe(
  targets: AxeProbeTarget[],
  options: AxeProbeOptions = {},
  engine?: AxeProbeEngine,
): Promise<AxeProbeResult> {
  const executedTags = options.tags ?? DEFAULT_TAGS;

  if (!engine) {
    return {
      id: 'axe',
      passed: false,
      pendingImplementation: true,
      violations: [
        {
          code: 'AXE_ENGINE_MISSING',
          severity: 'moderate',
          message: 'AxeProbe 엔진 어댑터가 아직 연결되지 않았습니다. Development 단계에서 axe-core 주입이 필요합니다.',
        },
      ],
      scannedTargets: 0,
      executedTags,
      summary: {
        targetCount: targets.length,
        scaffoldOnly: true,
      },
    };
  }

  const violations: AuditViolation[] = [];

  for (const target of targets) {
    const result = await engine.scan(target, options);
    violations.push(...result.violations.map((issue) => toViolation(target, issue)));

    if (options.includeIncomplete) {
      violations.push(...(result.incomplete ?? []).map((issue) => toViolation(target, issue)));
    }
  }

  return {
    id: 'axe',
    passed: violations.length === 0,
    violations,
    scannedTargets: targets.length,
    executedTags,
    summary: {
      targetCount: targets.length,
      includeIncomplete: options.includeIncomplete ?? false,
    },
  };
}
