import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const reportDir = path.join(repoRoot, '.ac/browser-use-qa');
const envPath = path.join(repoRoot, '.env');
const envExamplePath = path.join(repoRoot, '.env.example');
const testResultsPath = path.join(repoRoot, 'test-results.json');
const dockerDesktopPath = 'C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe';

const args = new Set(process.argv.slice(2));
const shouldRunVerify = args.has('--verify');
const shouldSkipBrowser = args.has('--skip-browser');
const shouldSkipE2e = args.has('--skip-e2e');
const shouldSkipDbRestart = args.has('--skip-db-restart');

const defaultEnv = {
  POSTGRES_DB: 'aeterna',
  POSTGRES_USER: 'aeterna',
  POSTGRES_PASSWORD: 'changeme',
  PORT: '3000',
  DATABASE_URL: 'postgresql://aeterna:changeme@localhost:5432/aeterna',
  REDIS_URL: 'redis://localhost:6379',
  ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000',
  JWT_SECRET: 'aeterna-qa-jwt-secret',
  JWT_REFRESH_SECRET: 'aeterna-qa-refresh-secret',
  JWT_ADMIN_SECRET: 'aeterna-qa-admin-secret',
  NODE_ENV: 'test',
};

function nowIso() {
  return new Date().toISOString();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function exists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

function parseEnv(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function ensureRootEnv() {
  if (!(await exists(envPath))) {
    if (await exists(envExamplePath)) {
      await copyFile(envExamplePath, envPath);
      console.log(`[qa:auto] .env 생성: ${envPath}`);
    } else {
      const minimalEnv = Object.entries(defaultEnv)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await writeFile(envPath, `${minimalEnv}\n`, 'utf8');
      console.log(`[qa:auto] 최소 .env 생성: ${envPath}`);
    }
  }

  return parseEnv(await readFile(envPath, 'utf8'));
}

function buildQaEnv(rootEnv) {
  const postgresDb = rootEnv.POSTGRES_DB || defaultEnv.POSTGRES_DB;
  const postgresUser = rootEnv.POSTGRES_USER || defaultEnv.POSTGRES_USER;
  const postgresPassword = rootEnv.POSTGRES_PASSWORD || defaultEnv.POSTGRES_PASSWORD;
  const databaseUrl = rootEnv.DATABASE_URL
    || `postgresql://${postgresUser}:${postgresPassword}@localhost:5432/${postgresDb}`;

  return {
    ...process.env,
    ...rootEnv,
    POSTGRES_DB: postgresDb,
    POSTGRES_USER: postgresUser,
    POSTGRES_PASSWORD: postgresPassword,
    PORT: '3000',
    DATABASE_URL: databaseUrl,
    REDIS_URL: rootEnv.REDIS_URL || defaultEnv.REDIS_URL,
    ALLOWED_ORIGINS: rootEnv.ALLOWED_ORIGINS || defaultEnv.ALLOWED_ORIGINS,
    JWT_SECRET: rootEnv.JWT_SECRET || defaultEnv.JWT_SECRET,
    JWT_REFRESH_SECRET: rootEnv.JWT_REFRESH_SECRET || defaultEnv.JWT_REFRESH_SECRET,
    JWT_ADMIN_SECRET: rootEnv.JWT_ADMIN_SECRET || defaultEnv.JWT_ADMIN_SECRET,
    NODE_ENV: 'test',
  };
}

function commandFor(command, commandArgs) {
  if (process.platform === 'win32' && (command === 'npm' || command === 'npx')) {
    return {
      command: process.env.ComSpec ?? 'cmd.exe',
      args: ['/d', '/s', '/c', [command, ...commandArgs].join(' ')],
    };
  }
  return { command, args: commandArgs };
}

function printableCommand(command, commandArgs) {
  return [command, ...commandArgs].join(' ');
}

async function runCommand(command, commandArgs, options = {}) {
  const invocation = commandFor(command, commandArgs);
  const env = options.env ? { ...process.env, ...options.env } : process.env;
  const stdio = options.stdio ?? 'inherit';

  if (options.label) {
    console.log(`[qa:auto] ${options.label}`);
  }
  console.log(`[qa:auto] $ ${printableCommand(command, commandArgs)}`);

  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      env,
      stdio,
      windowsHide: true,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${printableCommand(command, commandArgs)} 실패 (code=${code}, signal=${signal ?? 'none'})`));
    });
  });
}

async function captureCommand(command, commandArgs, options = {}) {
  const invocation = commandFor(command, commandArgs);
  const env = options.env ? { ...process.env, ...options.env } : process.env;

  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      resolve({ code: 1, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('exit', (code, signal) => {
      resolve({ code: code ?? 1, signal, stdout, stderr });
    });
  });
}

async function waitForPort(host, port, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const canConnect = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port });
      const timer = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 1_000);

      socket.once('connect', () => {
        clearTimeout(timer);
        socket.end();
        resolve(true);
      });
      socket.once('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
    });

    if (canConnect) return;
    await sleep(1_000);
  }
  throw new Error(`${label} 포트 대기 시간 초과: ${host}:${port}`);
}

async function fetchOk(url, timeoutMs = 3_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    await response.arrayBuffer();
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function ensureDockerDaemon() {
  let info = await captureCommand('docker', ['info', '--format', '{{.ServerVersion}}']);
  if (info.code === 0) return;

  if (process.platform === 'win32' && await exists(dockerDesktopPath)) {
    console.log('[qa:auto] Docker daemon 미실행. Docker Desktop 자동 기동 시도...');
    const child = spawn(dockerDesktopPath, [], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    const startedAt = Date.now();
    while (Date.now() - startedAt < 180_000) {
      await sleep(3_000);
      info = await captureCommand('docker', ['info', '--format', '{{.ServerVersion}}']);
      if (info.code === 0) return;
    }
  }

  const detail = `${info.stderr}${info.stdout}`.trim();
  throw new Error(`Docker daemon 연결 실패. Docker Desktop 실행 상태를 확인하세요.${detail ? `\n${detail}` : ''}`);
}

async function restartDatabaseStack(qaEnv) {
  await ensureDockerDaemon();
  await runCommand('docker', ['compose', 'up', '-d', 'postgres', 'redis'], {
    env: qaEnv,
    label: 'PostgreSQL/Redis 컨테이너 기동',
  });
  await waitForComposeHealth('postgres', 120_000);
  await waitForComposeHealth('redis', 60_000);

  await runCommand('docker', ['compose', 'restart', 'postgres', 'redis'], {
    env: qaEnv,
    label: 'PostgreSQL/Redis 컨테이너 재시작',
  });
  await waitForComposeHealth('postgres', 120_000);
  await waitForComposeHealth('redis', 60_000);
  await waitForPort('127.0.0.1', 5432, 90_000, 'PostgreSQL');
  await waitForPort('127.0.0.1', 6379, 60_000, 'Redis');
  await ensurePostgresDatabase(qaEnv);
}

async function waitForComposeHealth(service, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const containerId = await captureCommand('docker', ['compose', 'ps', '-q', service]);
    const id = containerId.stdout.trim();
    if (containerId.code === 0 && id) {
      const status = await captureCommand('docker', [
        'inspect',
        '--format',
        '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}',
        id,
      ]);
      const health = status.stdout.trim();
      if (status.code === 0 && (health === 'healthy' || health === 'running')) return;
    }
    await sleep(1_000);
  }
  throw new Error(`Docker service health 대기 시간 초과: ${service}`);
}

async function ensurePostgresDatabase(qaEnv) {
  const script = [
    'set -e',
    'db="${POSTGRES_DB:-aeterna}"',
    'user="${POSTGRES_USER:-aeterna}"',
    'hba="$PGDATA/pg_hba.conf"',
    'if ! grep -Eq "^host[[:space:]]+all[[:space:]]+all[[:space:]]+all[[:space:]]+" "$hba"; then echo "host all all all scram-sha-256" >> "$hba"; psql -U "$user" -d postgres -c "SELECT pg_reload_conf()" >/dev/null; fi',
    'if ! psql -U "$user" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = \'$db\'" | grep -qx 1; then createdb -U "$user" "$db"; fi',
  ].join('; ');

  await runCommand('docker', ['compose', 'exec', '-T', 'postgres', 'sh', '-lc', script], {
    env: qaEnv,
    label: 'PostgreSQL QA 데이터베이스 확인',
  });
}

async function getListeningPids(port) {
  if (process.platform === 'win32') {
    const script = `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique`;
    const result = await captureCommand('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
    if (result.code !== 0) return [];
    return result.stdout
      .split(/\s+/)
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
  }

  const result = await captureCommand('lsof', ['-ti', `tcp:${port}`]);
  if (result.code !== 0) return [];
  return result.stdout
    .split(/\s+/)
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
}

async function getProcessInfo(pids) {
  if (pids.length === 0) return [];

  if (process.platform === 'win32') {
    const ids = pids.join(',');
    const script = `$ids=@(${ids}); Get-CimInstance Win32_Process | Where-Object { $ids -contains $_.ProcessId } | ForEach-Object { "$($_.ProcessId)\t$($_.Name)\t$($_.CommandLine)" }`;
    const result = await captureCommand('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script]);
    if (result.code !== 0) return [];
    return result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [pid, name, ...commandLineParts] = line.split('\t');
        return {
          pid: Number(pid),
          name,
          commandLine: commandLineParts.join('\t'),
        };
      })
      .filter((entry) => Number.isInteger(entry.pid));
  }

  return pids.map((pid) => ({ pid, name: 'unknown', commandLine: '' }));
}

function isSafeLocalServerProcess(processInfo) {
  const commandLine = (processInfo.commandLine || '').toLowerCase();
  const processName = (processInfo.name || '').toLowerCase();
  const normalizedRepoRoot = repoRoot.toLowerCase().replace(/\//g, '\\');
  const hasRepoPath = commandLine.replace(/\//g, '\\').includes(normalizedRepoRoot);
  const looksLikeNodeServer = processName.includes('node')
    || commandLine.includes('ts-node-dev')
    || commandLine.includes('src/server.ts')
    || commandLine.includes('server\\src\\server');

  return hasRepoPath && looksLikeNodeServer;
}

async function stopProcessTree(pid) {
  if (process.platform === 'win32') {
    await captureCommand('taskkill', ['/PID', String(pid), '/T', '/F']);
    return;
  }
  await captureCommand('kill', ['-TERM', String(pid)]);
}

async function stopExistingLocalServer() {
  const pids = await getListeningPids(3000);
  if (pids.length === 0) return;

  const processInfos = await getProcessInfo(pids);
  if (processInfos.length === 0) {
    throw new Error(`3000 포트 점유 프로세스를 조회하지 못했습니다. PID: ${pids.join(', ')}`);
  }
  const unsafeProcesses = processInfos.filter((entry) => !isSafeLocalServerProcess(entry));
  if (unsafeProcesses.length > 0) {
    const descriptions = unsafeProcesses
      .map((entry) => `PID ${entry.pid} ${entry.name}: ${entry.commandLine || '(command line unavailable)'}`)
      .join('\n');
    throw new Error(`3000 포트가 QA 스크립트가 안전하게 재시작할 수 없는 프로세스에 의해 사용 중입니다.\n${descriptions}`);
  }

  for (const processInfo of processInfos) {
    console.log(`[qa:auto] 기존 로컬 API 서버 종료: PID ${processInfo.pid}`);
    await stopProcessTree(processInfo.pid);
  }
  await sleep(1_000);
}

function startLocalApiServer(qaEnv) {
  const invocation = commandFor('npm', ['--prefix', 'server', 'run', 'dev']);
  const child = spawn(invocation.command, invocation.args, {
    cwd: repoRoot,
    env: { ...process.env, ...qaEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  child.qaExit = null;
  child.qaLogs = [];

  const pushLog = (streamName, chunk) => {
    const text = chunk.toString();
    child.qaLogs.push(`[${streamName}] ${text}`);
    if (child.qaLogs.length > 80) child.qaLogs.shift();
    process[streamName].write(`[qa:auto:server] ${text}`);
  };

  child.stdout.on('data', (chunk) => pushLog('stdout', chunk));
  child.stderr.on('data', (chunk) => pushLog('stderr', chunk));
  child.on('exit', (code, signal) => {
    child.qaExit = { code, signal };
  });

  return child;
}

async function waitForApiServer(child) {
  const healthUrl = 'http://127.0.0.1:3000/api/health';
  const startedAt = Date.now();
  while (Date.now() - startedAt < 90_000) {
    if (child.qaExit) {
      const recentLogs = child.qaLogs.join('').trim();
      throw new Error(`API 서버가 준비 전에 종료되었습니다. code=${child.qaExit.code}, signal=${child.qaExit.signal ?? 'none'}${recentLogs ? `\n${recentLogs}` : ''}`);
    }
    if (await fetchOk(healthUrl)) return;
    await sleep(1_000);
  }
  throw new Error(`API 서버 헬스 체크 대기 시간 초과: ${healthUrl}`);
}

async function stopLocalApiServer(child) {
  if (!child || child.exitCode !== null) return;

  if (process.platform === 'win32') {
    await captureCommand('taskkill', ['/PID', String(child.pid), '/T', '/F']);
    return;
  }

  child.kill('SIGTERM');
}

async function runStep(results, name, callback) {
  const startedAt = nowIso();
  try {
    await callback();
    results.push({ name, ok: true, startedAt, endedAt: nowIso() });
  } catch (error) {
    results.push({
      name,
      ok: false,
      startedAt,
      endedAt: nowIso(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function snapshotFile(filePath) {
  if (!(await exists(filePath))) {
    return { existed: false, content: '' };
  }
  return {
    existed: true,
    content: await readFile(filePath, 'utf8'),
  };
}

async function preserveGeneratedTestResults(snapshot) {
  if (await exists(testResultsPath)) {
    await copyFile(testResultsPath, path.join(reportDir, 'e2e-test-results.json'));
  }

  if (snapshot.existed) {
    await writeFile(testResultsPath, snapshot.content, 'utf8');
  } else if (await exists(testResultsPath)) {
    await unlink(testResultsPath);
  }
}

async function main() {
  await mkdir(reportDir, { recursive: true });

  const rootEnv = await ensureRootEnv();
  const qaEnv = buildQaEnv(rootEnv);
  const results = [];
  const testResultsSnapshot = await snapshotFile(testResultsPath);
  let apiServer = null;

  try {
    if (!shouldSkipDbRestart) {
      await runStep(results, 'restart-db', () => restartDatabaseStack(qaEnv));
    }

    await runStep(results, 'prisma-sync', async () => {
      await runCommand('npm', ['--prefix', 'server', 'run', 'prisma:generate'], { env: qaEnv });
      await runCommand('npm', ['--prefix', 'server', 'run', 'prisma:push'], { env: qaEnv });
    });

    await runStep(results, 'qa-seed', () => runCommand('node', ['scripts/browser-use-qa/seed-live-e2e.mjs'], { env: qaEnv }));

    await runStep(results, 'restart-api-server', async () => {
      await stopExistingLocalServer();
      apiServer = startLocalApiServer(qaEnv);
      await waitForApiServer(apiServer);
    });

    if (!shouldSkipBrowser) {
      await runStep(results, 'browser-use-preflight', () => runCommand('npm', ['run', 'qa:browser'], { env: qaEnv }));
    }

    if (!shouldSkipE2e) {
      await runStep(results, 'e2e', () => runCommand('npm', ['run', 'test:e2e'], { env: qaEnv }));
    }

    if (shouldRunVerify) {
      await runStep(results, 'verify', () => runCommand('npm', ['run', 'verify'], { env: qaEnv }));
    }
  } finally {
    await stopLocalApiServer(apiServer);
    await preserveGeneratedTestResults(testResultsSnapshot);

    const report = {
      generatedAt: nowIso(),
      pass: results.every((result) => result.ok),
      dockerDbRestarted: !shouldSkipDbRestart,
      apiServerPort: 3000,
      results,
    };
    const reportPath = path.join(reportDir, 'auto-report.json');
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(`[qa:auto] report: ${reportPath}`);
  }
}

main().catch((error) => {
  console.error(`[qa:auto] 실패: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
