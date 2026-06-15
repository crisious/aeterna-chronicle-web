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
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-monster-image.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const NORMAL_RUNTIME_DIR = 'client/public/assets/generated/monsters/normal';
const BATTLE_RUNTIME_DIR = 'client/public/assets/generated/monsters/battle';

const VARIANTS = [
  {
    variant: 'normal',
    category: 'monsterPortrait',
    sourceRoot: 'assets/source/aseprite/monsterPortrait',
    runtimeDir: NORMAL_RUNTIME_DIR,
    runtimeKeyPrefix: 'monster_portrait',
    idField: 'monsterPortraitId',
    size: 256,
  },
  {
    variant: 'battle',
    category: 'monsterBattleIcon',
    sourceRoot: 'assets/source/aseprite/monsterBattleIcon',
    runtimeDir: BATTLE_RUNTIME_DIR,
    runtimeKeyPrefix: 'monster_battle_icon',
    idField: 'monsterBattleIconId',
    size: 64,
  },
];

export const BUILD_MONSTER_IMAGE_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-monster-image-library.mjs [--ids <comma-separated-monster-ids>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function readRuntimeMonsterIds(runtimeDir = NORMAL_RUNTIME_DIR) {
  return readdirSync(resolveRepoPath(runtimeDir))
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName.replace(/\.png$/u, ''))
    .sort((a, b) => a.localeCompare(b));
}

function contains(value, needle) {
  return value.includes(needle);
}

function resolveRegion(monsterId) {
  if (contains(monsterId, 'fog_sea')) return 'fog_sea';
  if (contains(monsterId, 'argentium')) return 'argentium';
  if (contains(monsterId, 'britalia')) return 'britalia';
  if (contains(monsterId, 'northland')) return 'northland';
  if (contains(monsterId, 'silvanhime')) return 'silvanhime';
  if (contains(monsterId, 'solaris')) return 'solaris';
  if (contains(monsterId, 'abyss')) return 'abyss';
  if (contains(monsterId, 'erebos')) return 'erebos';

  return 'erebos';
}

function deriveRawJsonPath(generatedJson) {
  return generatedJson.endsWith('.json')
    ? generatedJson.replace(/\.json$/u, '.aseprite.json')
    : `${generatedJson}.aseprite.json`;
}

function readAtlasJson(filePath) {
  return JSON.parse(readFileSync(resolveRepoPath(filePath), 'utf8'));
}

function ensureDirectoryFor(filePath) {
  mkdirSync(path.dirname(resolveRepoPath(filePath)), { recursive: true });
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
      `monster=${target.monsterId}`,
      '--script-param',
      `variant=${target.variant}`,
      '--script-param',
      `size=${target.size}`,
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
    throw new Error(`Aseprite source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
  }
}

function createBuildTarget(monsterId, variantConfig) {
  const region = resolveRegion(monsterId);
  const source = toPosixPath(path.join(variantConfig.sourceRoot, region, `${monsterId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', variantConfig.category, `${monsterId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', variantConfig.category, `${monsterId}.json`));
  const runtimePng = toPosixPath(path.join(variantConfig.runtimeDir, `${monsterId}.png`));

  return {
    id: `${variantConfig.runtimeKeyPrefix}_${monsterId}`,
    monsterId,
    region,
    variant: variantConfig.variant,
    category: variantConfig.category,
    source,
    generatedPng,
    rawJson: deriveRawJsonPath(generatedJson),
    generatedJson,
    runtimePng,
    runtimeKey: `${variantConfig.runtimeKeyPrefix}_${monsterId}`,
    idField: variantConfig.idField,
    size: variantConfig.size,
  };
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

  return validation;
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
    [target.idField]: target.monsterId,
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

export function parseBuildMonsterImageLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated monster id list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildMonsterImageLibrary({ ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  for (const variantConfig of VARIANTS) {
    if (!config.categories?.[variantConfig.category]) {
      throw new Error(`Aseprite config is missing ${variantConfig.category}.`);
    }
  }

  const monsterIds = ids?.length ? [...new Set(ids)].sort((a, b) => a.localeCompare(b)) : readRuntimeMonsterIds();

  if (monsterIds.length === 0) {
    throw new Error('No monster image ids found.');
  }

  const targets = [];

  for (const monsterId of monsterIds) {
    for (const variantConfig of VARIANTS) {
      const target = createBuildTarget(monsterId, variantConfig);

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
        target.monsterId,
        path.basename(target.generatedPng),
      );
      validateBuildTarget({ target, config });
      publishBuildTarget(target);
      targets.push(target);
    }
  }

  const roster = updateSpriteRoster(targets);

  return {
    monsterCount: monsterIds.length,
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
    parsedArgs = parseBuildMonsterImageLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_MONSTER_IMAGE_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildMonsterImageLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
