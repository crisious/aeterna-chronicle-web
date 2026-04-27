import type { AuditViolation, ProbeResult, Severity } from '../types';

type RequiredMode = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

interface PaletteMode {
  palette?: Record<string, string>;
}

interface ColorBlindPaletteData {
  modes?: Record<string, PaletteMode>;
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

function isGreyscale(value: string): boolean {
  const normalized = expandHex(value).replace('#', '').toLowerCase();
  return normalized.slice(0, 2) === normalized.slice(2, 4)
    && normalized.slice(2, 4) === normalized.slice(4, 6);
}

const REQUIRED_MODES: RequiredMode[] = [
  'protanopia',
  'deuteranopia',
  'tritanopia',
  'achromatopsia',
];

const CRITICAL_SEMANTIC_PAIRS: Array<[string, string]> = [
  ['marker_enemy', 'marker_ally'],
  ['hp_high', 'hp_low'],
  ['status_buff', 'status_debuff'],
  ['team_ally', 'team_enemy'],
];

export interface ColorBlindProbeResult extends ProbeResult {
  modes: string[];
}

export function runColorBlindProbe(data: ColorBlindPaletteData): ColorBlindProbeResult {
  const violations: AuditViolation[] = [];
  const modes = data.modes ?? {};
  const basePalette = modes.none?.palette ?? {};
  const baseKeys = Object.keys(basePalette).sort();
  const detectedModes: string[] = [];

  if (baseKeys.length === 0) {
    pushViolation(violations, 'critical', 'BASE_PALETTE_MISSING', '기본 색맹 팔레트(none)가 비어 있습니다.');
  }

  for (const mode of REQUIRED_MODES) {
    const palette = modes[mode]?.palette;
    if (!palette) {
      pushViolation(violations, 'critical', 'COLORBLIND_MODE_MISSING', `${mode} 모드 팔레트가 없습니다.`, { meta: { mode } });
      continue;
    }

    detectedModes.push(mode);

    const keys = Object.keys(palette).sort();
    const missingKeys = baseKeys.filter((key) => !keys.includes(key));
    const extraKeys = keys.filter((key) => !baseKeys.includes(key));
    if (missingKeys.length > 0 || extraKeys.length > 0) {
      pushViolation(
        violations,
        'serious',
        'PALETTE_KEY_MISMATCH',
        `${mode} 모드 팔레트 키가 기본 모드와 일치하지 않습니다.`,
        { meta: { mode, missingKeys, extraKeys } },
      );
    }

    for (const [leftKey, rightKey] of CRITICAL_SEMANTIC_PAIRS) {
      if (palette[leftKey] === palette[rightKey]) {
        pushViolation(
          violations,
          'serious',
          'SEMANTIC_COLOR_COLLISION',
          `${mode} 모드에서 ${leftKey} 와 ${rightKey} 가 동일 색으로 충돌합니다.`,
          { meta: { mode, leftKey, rightKey, value: palette[leftKey] } },
        );
      }
    }

    if (mode === 'achromatopsia') {
      for (const [token, value] of Object.entries(palette)) {
        if (!isHexColor(value)) {
          pushViolation(
            violations,
            'moderate',
            'ACHROMATOPSIA_NON_HEX',
            `achromatopsia 모드의 ${token} 이 hex 색상이 아닙니다.`,
            { meta: { token, value } },
          );
          continue;
        }

        if (!isGreyscale(value)) {
          pushViolation(
            violations,
            'serious',
            'ACHROMATOPSIA_NOT_GREYSCALE',
            `achromatopsia 모드의 ${token}=${value} 는 회색조가 아닙니다.`,
            { meta: { token, value } },
          );
        }
      }
    }
  }

  return {
    id: 'colorblind',
    passed: violations.length === 0,
    violations,
    modes: detectedModes,
    summary: {
      requiredModes: REQUIRED_MODES,
      detectedModeCount: detectedModes.length,
    },
  };
}
