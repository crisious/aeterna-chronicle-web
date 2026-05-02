import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const scenarioPath = path.join(scriptDir, 'scenarios.json');

async function loadConfig() {
  return JSON.parse(await readFile(scenarioPath, 'utf8'));
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

async function writeReport(reportDir, report) {
  const outputDir = path.resolve(repoRoot, reportDir);
  await mkdir(outputDir, { recursive: true });
  const reportPath = path.join(outputDir, 'browser-use-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return reportPath;
}

async function countSelector(tab, selector) {
  const locator = tab.playwright.locator(selector);
  return locator.count();
}

export async function runAeternaBrowserQa(options = {}) {
  const config = await loadConfig();
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? config.baseUrl);
  const agent = options.agent ?? globalThis.agent;
  const display = options.display ?? globalThis.display;

  if (!agent?.browser) {
    throw new Error('[browser-qa] Browser Use agent가 없습니다. browser-client 런타임을 먼저 초기화하십시오.');
  }

  await agent.browser.nameSession('Aeterna Browser QA');
  const tab = await agent.browser.tabs.new();
  const results = [];

  for (const scenario of config.scenarios) {
    const url = new URL(scenario.path, baseUrl).href;
    const result = {
      id: scenario.id,
      name: scenario.name,
      url,
      ok: true,
      failures: [],
      consoleErrors: [],
      selectorCounts: {},
    };

    await tab.goto(url);
    await tab.playwright.waitForLoadState({ state: 'domcontentloaded', timeoutMs: 15_000 });

    const title = (await tab.title()) ?? '';
    if (!title.includes(scenario.expectedTitle)) {
      result.failures.push(`title 불일치: expected "${scenario.expectedTitle}", got "${title}"`);
    }

    const snapshot = await tab.playwright.domSnapshot();
    for (const needle of scenario.browserIncludes) {
      if (!snapshot.includes(needle)) {
        result.failures.push(`DOM 누락: ${needle}`);
      }
    }

    for (const selector of scenario.browserSelectors) {
      const count = await countSelector(tab, selector);
      result.selectorCounts[selector] = count;
      if (count < 1) {
        result.failures.push(`selector 누락: ${selector}`);
      }
    }

    const logs = await tab.dev.logs({
      levels: ['error'],
      limit: 20,
    });
    result.consoleErrors = logs.map((entry) => ({
      level: entry.level,
      message: entry.message,
      url: entry.url,
    }));
    if (result.consoleErrors.length > 0) {
      result.failures.push(`console error ${result.consoleErrors.length}건`);
    }

    if (options.showScreenshots && typeof display === 'function') {
      await display(await tab.playwright.screenshot({ fullPage: false }));
    }

    result.ok = result.failures.length === 0;
    results.push(result);
  }

  if (!options.keepTab) {
    await tab.close();
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    pass: results.every((result) => result.ok),
    results,
  };

  const reportPath = await writeReport(config.reportDir, report);
  console.log(`[browser-qa] report: ${reportPath}`);
  console.log(`[browser-qa] ${report.pass ? 'PASS' : 'BLOCK'} ${results.filter((r) => r.ok).length}/${results.length}`);

  if (!report.pass) {
    throw new Error('[browser-qa] Browser Use QA 실패. report를 확인하십시오.');
  }

  return report;
}
