import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ARIA_CONTRACT_VERSION, getAllAriaMaps } from '../../client/src/accessibility/screen_reader/AriaLabelMap.ts';
import { writeAuditArtifacts } from './Reporter.ts';
import { runAriaContractProbe } from './probes/AriaContractChecker.ts';
import { runColorBlindProbe } from './probes/ColorBlindSimulator.ts';
import { runColorContrastProbe } from './probes/ColorContrastProbe.ts';
import { runKeyboardProbe } from './probes/KeyboardTraverser.ts';
import { listCriticalA11yScenes } from './scenes.config.ts';
import type { StaticAuditSummary } from './types';
import { applyA11yChecklistStatus } from './updateChecklist.ts';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(MODULE_DIR, '../..');

interface AuditOptions {
  rootDir?: string;
  writeFiles?: boolean;
}

function readJson<T>(absolutePath: string): T {
  return JSON.parse(fs.readFileSync(absolutePath, 'utf-8')) as T;
}

export async function runStaticAccessibilityAudit(options: AuditOptions = {}): Promise<StaticAuditSummary> {
  const rootDir = options.rootDir ?? DEFAULT_ROOT;
  const shouldWriteFiles = options.writeFiles ?? true;
  const colorBlindData = readJson<Record<string, unknown>>(path.join(rootDir, 'client/src/accessibility/colorblind/colorblind_palettes.json'));
  const highContrastData = readJson<Record<string, unknown>>(path.join(rootDir, 'client/src/accessibility/display/high_contrast_palette.json'));
  const criticalScenes = listCriticalA11yScenes();
  const supportedLocales = [...new Set(criticalScenes.flatMap((scene) => scene.locales))];

  const probes = [
    runColorBlindProbe(colorBlindData),
    runColorContrastProbe(highContrastData),
    runKeyboardProbe(getAllAriaMaps()),
    runAriaContractProbe(getAllAriaMaps(), ARIA_CONTRACT_VERSION),
  ];

  const colorBlindProbe = probes.find((probe) => probe.id === 'colorblind');
  const failedProbes = probes.filter((probe) => !probe.passed).length;
  const summary: StaticAuditSummary = {
    timestamp: new Date().toISOString(),
    wcagLevel: 'AAA',
    passed: failedProbes === 0,
    failedProbes,
    probes,
    colorBlindModes: colorBlindProbe && 'modes' in colorBlindProbe
      ? [...(colorBlindProbe.modes as string[])]
      : [],
    manualChecksPending: ['screen-reader-scenarios', 'vpat-2.4-pipeline'],
    contractVersion: ARIA_CONTRACT_VERSION,
    targetScenes: criticalScenes.map((scene) => scene.id),
    supportedLocales,
  };

  if (shouldWriteFiles) {
    writeAuditArtifacts(rootDir, summary);

    const checklistPath = path.join(rootDir, 'docs/release/launch_checklist.md');
    if (fs.existsSync(checklistPath)) {
      const checklist = fs.readFileSync(checklistPath, 'utf-8');
      const nextChecklist = applyA11yChecklistStatus(checklist, summary);
      if (nextChecklist !== checklist) {
        fs.writeFileSync(checklistPath, nextChecklist, 'utf-8');
      }
    }
  }

  return summary;
}

async function main(): Promise<void> {
  const summary = await runStaticAccessibilityAudit({ writeFiles: true });
  process.stdout.write(JSON.stringify(summary, null, 2));
  process.stdout.write('\n');
  process.exitCode = summary.failedProbes === 0 ? 0 : 1;
}

const entryPoint = process.argv[1];
if (entryPoint && path.resolve(entryPoint) === fileURLToPath(import.meta.url)) {
  void main();
}
