import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportAseprite } from './export-aseprite.mjs';
import { findAsepriteExecutable } from './find-aseprite.mjs';
import { normalizeFile } from './normalize-aseprite-json.mjs';
import { loadConfig, readPngSize, validateAtlas } from './validate-aseprite-export.mjs';
import {
  DEFAULT_SPRITE_ROSTER_PATH,
  loadSpriteRoster,
  validateSpriteRoster,
} from './validate-sprite-roster.mjs';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_DIR, '..', '..');
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-status-effect-icon.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const CATEGORY = 'statusIcon';
const SOURCE_ROOT = 'assets/source/aseprite/statusIcon';
const RUNTIME_ROOT = 'client/public/assets/generated/ui/icons/status';

const BATTLE_STATUS_GROUPS = new Map([
  ['poison', 'debuff'],
  ['burn', 'debuff'],
  ['silence', 'debuff'],
  ['slow', 'debuff'],
  ['blind', 'debuff'],
  ['bleed', 'debuff'],
  ['curse', 'debuff'],
  ['charm', 'debuff'],
  ['freeze', 'control'],
  ['stun', 'control'],
  ['attack_up', 'buff'],
  ['defense_up', 'buff'],
  ['haste', 'buff'],
  ['regen', 'buff'],
  ['shield', 'buff'],
]);

export const BUILD_STATUS_ICON_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-status-icon-library.mjs [--ids <comma-separated-status-icon-ids>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function normalizeSelector(value) {
  return value.trim().replace(/\.png$/u, '');
}

function deriveRawJsonPath(generatedJson) {
  return generatedJson.endsWith('.json')
    ? generatedJson.replace(/\.json$/u, '.aseprite.json')
    : `${generatedJson}.aseprite.json`;
}

function ensureDirectoryFor(filePath) {
  mkdirSync(path.dirname(resolveRepoPath(filePath)), { recursive: true });
}

function createRuntimeKey(statusIconId) {
  if (BATTLE_STATUS_GROUPS.has(statusIconId)) {
    return `status_${statusIconId}_icon`;
  }

  return `status_${statusIconId.replace(/[^A-Za-z0-9]+/gu, '_')}_icon`;
}

function parseRuntimeFile(fileName) {
  if (!fileName.endsWith('.png')) {
    return null;
  }

  const baseName = fileName.replace(/\.png$/u, '');
  const battleMatch = /^status_(.+)$/u.exec(baseName);
  if (battleMatch && BATTLE_STATUS_GROUPS.has(battleMatch[1])) {
    const statusIconId = battleMatch[1];

    return {
      fileName,
      sourceName: baseName,
      statusIconId,
      statusParam: statusIconId,
      group: BATTLE_STATUS_GROUPS.get(statusIconId),
    };
  }

  const legacyBuffMatch = /^STS-BUF-\d{3}$/u.exec(baseName);
  if (legacyBuffMatch) {
    return {
      fileName,
      sourceName: baseName,
      statusIconId: baseName,
      statusParam: baseName,
      group: 'legacy_buff',
    };
  }

  const legacyDebuffMatch = /^STS-DBF-\d{3}$/u.exec(baseName);
  if (legacyDebuffMatch) {
    return {
      fileName,
      sourceName: baseName,
      statusIconId: baseName,
      statusParam: baseName,
      group: 'legacy_debuff',
    };
  }

  return null;
}

function createBuildTarget(parsed) {
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${parsed.sourceName}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${parsed.sourceName}.json`));
  const runtimePng = toPosixPath(path.join(RUNTIME_ROOT, parsed.fileName));
  const runtimeKey = createRuntimeKey(parsed.statusIconId);

  return {
    id: runtimeKey,
    category: CATEGORY,
    source: toPosixPath(path.join(SOURCE_ROOT, parsed.group, `${parsed.sourceName}.aseprite`)),
    generatedPng,
    rawJson: deriveRawJsonPath(generatedJson),
    generatedJson,
    runtimePng,
    runtimeKey,
    statusIconId: parsed.statusIconId,
    statusParam: parsed.statusParam,
    group: parsed.group,
  };
}

function readRuntimeTargets() {
  return readdirSync(resolveRepoPath(RUNTIME_ROOT))
    .map(parseRuntimeFile)
    .filter(Boolean)
    .map(createBuildTarget)
    .sort((a, b) => a.statusIconId.localeCompare(b.statusIconId));
}

function filterTargetsByIds(targets, ids) {
  if (!ids?.length) {
    return targets;
  }

  const bySelector = new Map();
  for (const target of targets) {
    const sourceBase = path.basename(target.source, '.aseprite');
    bySelector.set(target.statusIconId, target);
    bySelector.set(sourceBase, target);
    bySelector.set(target.runtimeKey, target);
  }

  const explicitIds = [...new Set(ids.map(normalizeSelector))].sort((a, b) => a.localeCompare(b));
  const selectedTargets = [];
  const missingIds = [];

  for (const id of explicitIds) {
    const normalized = id.startsWith('status_') && id.endsWith('_icon')
      ? id.slice('status_'.length, -'_icon'.length).replace(/_/gu, '-')
      : id;
    const target = bySelector.get(id) ?? bySelector.get(normalized);

    if (!target) {
      missingIds.push(id);
      continue;
    }

    selectedTargets.push(target);
  }

  if (missingIds.length > 0) {
    throw new Error(`Unknown status icon ids: ${missingIds.join(', ')}`);
  }

  return selectedTargets;
}

function runAsepriteCreate({ asepriteExe, target }) {
  ensureDirectoryFor(target.source);

  const result = spawnSync(
    asepriteExe,
    [
      '-b',
      '--script-param',
      `output=${target.source}`,
      '--script-param',
      `palette=${PALETTE_PATH}`,
      '--script-param',
      `status=${target.statusParam}`,
      '--script',
      CREATE_SCRIPT,
    ],
    {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      windowsHide: true,
    },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr ? `\n${result.stderr}` : '';
    const stdout = result.stdout ? `\n${result.stdout}` : '';
    throw new Error(`Aseprite status icon source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
  }
}

function readAtlasJson(filePath) {
  return JSON.parse(readFileSync(resolveRepoPath(filePath), 'utf8'));
}

function validateBuildTarget({ target, config }) {
  const atlas = readAtlasJson(target.generatedJson);
  const validation = validateAtlas({
    atlas,
    categoryConfig: config.categories[target.category],
    pngSize: readPngSize(resolveRepoPath(target.generatedPng)),
  });

  if (!validation.ok) {
    throw new Error(`${target.id} validation failed:\n${validation.errors.join('\n')}`);
  }
}

function publishBuildTarget(target) {
  ensureDirectoryFor(target.runtimePng);
  copyFileSync(resolveRepoPath(target.generatedPng), resolveRepoPath(target.runtimePng));
}

function createRosterEntry(target, priority) {
  return {
    id: target.id,
    category: target.category,
    priority,
    source: target.source,
    generatedPng: target.generatedPng,
    generatedJson: target.generatedJson,
    runtimePng: target.runtimePng,
    runtimeKey: target.runtimeKey,
    status: 'in-game-verified',
    requiredTags: [],
    statusIconId: target.statusIconId,
  };
}

function updateSpriteRoster(targets) {
  const roster = loadSpriteRoster();
  const generatedIds = new Set(targets.map((target) => target.id));
  const generatedKeys = new Set(targets.map((target) => target.runtimeKey));
  const preservedItems = roster.items.filter((item) => !generatedIds.has(item.id) && !generatedKeys.has(item.runtimeKey));
  const basePriority = preservedItems.reduce((max, item) => Math.max(max, Number.isInteger(item.priority) ? item.priority : 0), 0);
  const generatedItems = targets.map((target, index) => createRosterEntry(target, basePriority + index + 1));
  const nextRoster = {
    version: 1,
    items: [...preservedItems, ...generatedItems],
  };
  const validation = validateSpriteRoster(nextRoster);

  if (!validation.ok) {
    throw new Error(`Sprite roster update is invalid:\n${validation.errors.join('\n')}`);
  }

  writeFileSync(DEFAULT_SPRITE_ROSTER_PATH, `${JSON.stringify(nextRoster, null, 2)}\n`, 'utf8');

  return {
    path: DEFAULT_SPRITE_ROSTER_PATH,
    count: nextRoster.items.length,
    added: generatedItems.length,
  };
}

export function parseBuildStatusIconLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated status icon id list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildStatusIconLibrary({ ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  if (!config.categories?.[CATEGORY]) {
    throw new Error(`Aseprite config is missing ${CATEGORY}.`);
  }

  const targets = filterTargetsByIds(readRuntimeTargets(), ids);
  if (targets.length === 0) {
    throw new Error('No status icon runtime PNGs found.');
  }

  for (const target of targets) {
    runAsepriteCreate({ asepriteExe, target });
    const exportTarget = exportAseprite({
      category: target.category,
      sourceFile: target.source,
      asepriteExe,
    });
    const exportedSheet = toPosixPath(exportTarget.sheetFile);
    const exportedData = toPosixPath(exportTarget.dataFile);

    if (exportedSheet !== target.generatedPng || exportedData !== target.rawJson) {
      throw new Error(
        `${target.id} export target mismatch: expected ${target.generatedPng}/${target.rawJson}, got ${exportedSheet}/${exportedData}.`,
      );
    }

    normalizeFile(
      resolveRepoPath(target.rawJson),
      resolveRepoPath(target.generatedJson),
      target.statusIconId,
      path.basename(target.generatedPng),
    );
    validateBuildTarget({ target, config });
    publishBuildTarget(target);
  }

  const roster = updateSpriteRoster(targets);

  return {
    assetCount: targets.length,
    roster,
  };
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
  let parsedArgs;

  try {
    parsedArgs = parseBuildStatusIconLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_STATUS_ICON_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildStatusIconLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
