import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const scenarioPath = path.join(repoRoot, 'scripts/browser-use-qa/scenarios.json');
const runnerPath = path.join(repoRoot, 'scripts/browser-use-qa/browser-use-session.mjs');

function assertString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`[browser-qa] ${label} 값이 비어 있습니다.`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`[browser-qa] ${label} 배열이 올바르지 않습니다.`);
  }
}

function validateConfig(config) {
  if (config.schemaVersion !== 1) {
    throw new Error(`[browser-qa] 지원하지 않는 schemaVersion: ${config.schemaVersion}`);
  }
  assertString(config.baseUrl, 'baseUrl');
  assertString(config.reportDir, 'reportDir');
  if (!Array.isArray(config.scenarios) || config.scenarios.length === 0) {
    throw new Error('[browser-qa] scenarios가 비어 있습니다.');
  }

  const seen = new Set();
  for (const scenario of config.scenarios) {
    assertString(scenario.id, 'scenario.id');
    assertString(scenario.name, `${scenario.id}.name`);
    assertString(scenario.path, `${scenario.id}.path`);
    assertString(scenario.expectedTitle, `${scenario.id}.expectedTitle`);
    assertStringArray(scenario.htmlIncludes, `${scenario.id}.htmlIncludes`);
    assertStringArray(scenario.browserIncludes, `${scenario.id}.browserIncludes`);
    assertStringArray(scenario.browserSelectors, `${scenario.id}.browserSelectors`);
    if (seen.has(scenario.id)) {
      throw new Error(`[browser-qa] 중복 scenario id: ${scenario.id}`);
    }
    seen.add(scenario.id);
  }
}

const config = JSON.parse(await readFile(scenarioPath, 'utf8'));
validateConfig(config);

const reportDir = path.resolve(repoRoot, config.reportDir);
await mkdir(reportDir, { recursive: true });

const manifest = {
  generatedAt: new Date().toISOString(),
  repoRoot,
  scenarioPath,
  runnerPath,
  runnerFileUrl: pathToFileURL(runnerPath).href,
  baseUrl: config.baseUrl,
  scenarioCount: config.scenarios.length,
  scenarios: config.scenarios.map((scenario) => ({
    id: scenario.id,
    name: scenario.name,
    url: new URL(scenario.path, config.baseUrl).href,
  })),
};

const manifestPath = path.join(reportDir, 'manifest.json');
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`[browser-qa] manifest: ${manifestPath}`);
console.log('[browser-qa] Browser Use 세션에서 아래 runnerFileUrl을 import 하십시오.');
console.log(manifest.runnerFileUrl);
