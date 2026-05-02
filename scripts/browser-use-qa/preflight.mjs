import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';

const repoRoot = process.cwd();
const scenarioPath = path.join(repoRoot, 'scripts/browser-use-qa/scenarios.json');
const config = JSON.parse(await readFile(scenarioPath, 'utf8'));
const reportDir = path.resolve(repoRoot, config.reportDir);
const serverTimeoutMs = 45_000;

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 3_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function canFetch(url) {
  try {
    const response = await fetchWithTimeout(url, { method: 'GET' });
    await response.arrayBuffer();
    return response.ok;
  } catch {
    return false;
  }
}

function startDevServer() {
  const isWindows = process.platform === 'win32';
  const command = isWindows ? (process.env.ComSpec ?? 'cmd.exe') : 'npm';
  const args = isWindows
    ? ['/d', '/s', '/c', 'npm --prefix client run dev -- --host 127.0.0.1 --port 5173']
    : ['--prefix', 'client', 'run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'];

  const child = spawn(
    command,
    args,
    {
      cwd: repoRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    if (text.includes('Local:') || text.includes('ready')) {
      process.stdout.write(`[browser-qa:server] ${text}`);
    }
  });
  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[browser-qa:server] ${chunk.toString()}`);
  });

  return child;
}

async function stopDevServer(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.on('exit', resolve);
      killer.on('error', resolve);
    });
    return;
  }

  child.kill('SIGTERM');
}

async function waitForServer(baseUrl) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < serverTimeoutMs) {
    if (await canFetch(baseUrl)) return;
    await sleep(500);
  }
  throw new Error(`[browser-qa] dev server 응답 없음: ${baseUrl}`);
}

function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1] : '';
}

async function checkScenario(baseUrl, scenario) {
  const url = new URL(scenario.path, baseUrl).href;
  const response = await fetchWithTimeout(url, { method: 'GET' }, 5_000);
  const html = await response.text();
  const failures = [];

  if (!response.ok) {
    failures.push(`HTTP ${response.status}`);
  }

  const title = extractTitle(html);
  if (!title.includes(scenario.expectedTitle)) {
    failures.push(`title 불일치: expected "${scenario.expectedTitle}", got "${title}"`);
  }

  for (const needle of scenario.htmlIncludes) {
    if (!html.includes(needle)) {
      failures.push(`HTML 누락: ${needle}`);
    }
  }

  return {
    id: scenario.id,
    name: scenario.name,
    url,
    ok: failures.length === 0,
    failures,
  };
}

let server = null;
let startedServer = false;

try {
  await mkdir(reportDir, { recursive: true });

  if (!(await canFetch(config.baseUrl))) {
    server = startDevServer();
    startedServer = true;
    await waitForServer(config.baseUrl);
  }

  const results = [];
  for (const scenario of config.scenarios) {
    const result = await checkScenario(config.baseUrl, scenario);
    results.push(result);
    const marker = result.ok ? 'PASS' : 'BLOCK';
    console.log(`[browser-qa] ${marker} ${scenario.id} ${result.url}`);
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }

  const report = {
    generatedAt: nowIso(),
    baseUrl: config.baseUrl,
    startedServer,
    pass: results.every((result) => result.ok),
    results,
  };

  const reportPath = path.join(reportDir, 'preflight-report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`[browser-qa] report: ${reportPath}`);

  if (!report.pass) {
    process.exitCode = 1;
  }
} finally {
  if (server) {
    await stopDevServer(server);
  }
}
