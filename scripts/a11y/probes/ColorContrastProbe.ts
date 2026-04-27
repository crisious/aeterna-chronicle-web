import type { AuditViolation, ProbeResult, Severity } from '../types';

interface ThemeDefinition {
  tokens?: Record<string, string>;
}

interface HighContrastPaletteData {
  themes?: {
    high_contrast?: ThemeDefinition;
  };
}

function pushViolation(
  violations: AuditViolation[],
  severity: Severity,
  code: string,
  message: string,
  meta?: Record<string, unknown>,
): void {
  violations.push({ severity, code, message, ...meta });
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function expandHex(value: string): string {
  const hex = value.replace('#', '');
  if (hex.length === 3) {
    return `#${hex.split('').map((char) => `${char}${char}`).join('')}`;
  }
  return `#${hex}`;
}

function channelToLinear(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const normalized = expandHex(hex).replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);

  return (
    (0.2126 * channelToLinear(r))
    + (0.7152 * channelToLinear(g))
    + (0.0722 * channelToLinear(b))
  );
}

function calculateContrastRatio(foreground: string, background: string): number {
  const fgLuminance = relativeLuminance(foreground);
  const bgLuminance = relativeLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function runColorContrastProbe(data: HighContrastPaletteData): ProbeResult {
  const violations: AuditViolation[] = [];
  const tokens = data.themes?.high_contrast?.tokens ?? {};
  const background = tokens['bg-primary'];
  let evaluatedTokenCount = 0;

  if (!background || !isHexColor(background)) {
    pushViolation(
      violations,
      'critical',
      'HC_BACKGROUND_MISSING',
      '고대비 테마의 bg-primary 가 없거나 hex 형식이 아닙니다.',
    );
    return {
      id: 'contrast',
      passed: false,
      violations,
    };
  }

  for (const [token, value] of Object.entries(tokens)) {
    if (!isHexColor(value)) {
      continue;
    }

    let threshold: number | null = null;
    if (token.startsWith('text-')) {
      threshold = 7;
    } else if (token.startsWith('border-')) {
      threshold = 3;
    }

    if (threshold === null) {
      continue;
    }

    evaluatedTokenCount += 1;
    const ratio = calculateContrastRatio(value, background);
    if (ratio < threshold) {
      pushViolation(
        violations,
        threshold >= 7 ? 'serious' : 'moderate',
        'CONTRAST_RATIO_TOO_LOW',
        `토큰 ${token} 의 대비비 ${ratio.toFixed(2)}:1 이 기준 ${threshold}:1 미만입니다.`,
        { meta: { token, foreground: value, background, ratio, threshold } },
      );
    }
  }

  return {
    id: 'contrast',
    passed: violations.length === 0,
    violations,
    summary: {
      background,
      evaluatedTokenCount,
      minTextRatio: 7,
      minNonTextRatio: 3,
    },
  };
}
