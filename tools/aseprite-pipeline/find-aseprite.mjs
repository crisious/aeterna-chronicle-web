import { existsSync } from 'node:fs';
import path, { delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\Aseprite\\Aseprite.exe',
  'C:\\Program Files\\Aseprite\\aseprite.exe',
  'C:\\Program Files (x86)\\Aseprite\\Aseprite.exe',
  'C:\\Program Files (x86)\\Aseprite\\aseprite.exe',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe',
  'C:\\Program Files\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe',
];

const UNIX_CANDIDATES = [
  '/Applications/Aseprite.app/Contents/MacOS/aseprite',
  '/usr/local/bin/aseprite',
  '/opt/homebrew/bin/aseprite',
  '/usr/bin/aseprite',
];

function defaultCanRun(candidate) {
  const result = spawnSync(candidate, ['--version'], {
    encoding: 'utf8',
    windowsHide: true,
  });

  return result.status === 0;
}

function getPathValue(env) {
  return env.PATH ?? env.Path ?? env.path ?? '';
}

function buildPathCandidates(env) {
  return getPathValue(env)
    .split(delimiter)
    .filter(Boolean)
    .flatMap((dir) => [
      `${dir}\\aseprite.exe`,
      `${dir}\\Aseprite.exe`,
      `${dir}/aseprite`,
    ]);
}

export function findAsepriteExecutable(env = process.env, options = {}) {
  const canRun = options.canRun ?? defaultCanRun;
  const pathExists = options.existsSync ?? existsSync;

  if (env.ASEPRITE_EXE && pathExists(env.ASEPRITE_EXE) && canRun(env.ASEPRITE_EXE)) {
    return env.ASEPRITE_EXE;
  }

  const candidates = [
    ...buildPathCandidates(env),
    ...WINDOWS_CANDIDATES,
    ...UNIX_CANDIDATES,
  ];

  for (const candidate of candidates) {
    if (pathExists(candidate) && canRun(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeEntrypointPath(candidate, platform) {
  const normalized = path.normalize(path.resolve(candidate));

  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function isCliEntrypoint(argvPath = process.argv[1], moduleUrl = import.meta.url, platform = process.platform) {
  if (!argvPath) {
    return false;
  }

  const modulePath = fileURLToPath(moduleUrl);

  return normalizeEntrypointPath(modulePath, platform) === normalizeEntrypointPath(argvPath, platform);
}

if (isCliEntrypoint()) {
  const exe = findAsepriteExecutable();

  if (!exe) {
    console.error('Aseprite executable not found. Set ASEPRITE_EXE to the Aseprite executable path, or add aseprite to PATH.');
    process.exit(1);
  }

  console.log(exe);
}
