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

const GROUPS = {
  elite: {
    variant: 'elite',
    category: 'monsterEliteBossPortrait',
    sourceRoot: 'assets/source/aseprite/monsterEliteBossPortrait',
    runtimeDir: 'client/public/assets/generated/monsters/elite_boss',
    runtimeKeyPrefix: 'monster_elite_boss',
    idField: 'monsterEliteBossId',
    size: 384,
  },
  raid: {
    variant: 'raid',
    category: 'monsterRaidBossPortrait',
    sourceRoot: 'assets/source/aseprite/monsterRaidBossPortrait',
    runtimeDir: 'client/public/assets/generated/monsters/raid_boss',
    runtimeKeyPrefix: 'monster_raid_boss',
    idField: 'monsterRaidBossId',
    size: 512,
  },
};

export const BUILD_MONSTER_BOSS_IMAGE_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-monster-boss-image-library.mjs [--groups elite,raid] [--ids <comma-separated-ids>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function readRuntimeIds(runtimeDir) {
  return readdirSync(resolveRepoPath(runtimeDir))
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName.replace(/\.png$/u, ''))
    .sort((a, b) => a.localeCompare(b));
}

function contains(value, needle) {
  return value.includes(needle);
}

function resolveRegion(assetId) {
  const lowerId = assetId.toLowerCase();

  if (contains(lowerId, 'boss-tem') || contains(lowerId, 'tmp-') || contains(lowerId, 'temporal') || contains(lowerId, 'chrono') || contains(lowerId, 'time_')) return 'temporal';
  if (contains(lowerId, 'fog_sea') || contains(lowerId, 'boss-fog')) return 'fog_sea';
  if (contains(lowerId, 'argentium') || contains(lowerId, 'boss-arg')) return 'argentium';
  if (contains(lowerId, 'britalia')) return 'britalia';
  if (contains(lowerId, 'northland') || contains(lowerId, 'boss-nor')) return 'northland';
  if (contains(lowerId, 'silvanhime') || contains(lowerId, 'boss-syl')) return 'silvanhime';
  if (contains(lowerId, 'solaris') || contains(lowerId, 'boss-sol')) return 'solaris';
  if (contains(lowerId, 'oblivion') || contains(lowerId, 'void') || contains(lowerId, 'nebulos')) return 'oblivion';
  if (contains(lowerId, 'abyss') || contains(lowerId, 'boss-aby')) return 'abyss';
  if (contains(lowerId, 'erebos') || contains(lowerId, 'boss-erb')) return 'erebos';

  return 'erebos';
}

function deriveRawJsonPath(generatedJson) {
  return generatedJson.endsWith('.json')
    ? generatedJson.replace(/\.json$/u, '.aseprite.json')
    : `${generatedJson}.aseprite.json`;
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
      `monster=${target.assetId}`,
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
    throw new Error(`Aseprite boss source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
  }
}

function createBuildTarget(assetId, groupConfig) {
  const region = resolveRegion(assetId);
  const source = toPosixPath(path.join(groupConfig.sourceRoot, region, `${assetId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', groupConfig.category, `${assetId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', groupConfig.category, `${assetId}.json`));
  const runtimePng = toPosixPath(path.join(groupConfig.runtimeDir, `${assetId}.png`));

  return {
    id: `${groupConfig.runtimeKeyPrefix}_${assetId}`,
    assetId,
    region,
    variant: groupConfig.variant,
    category: groupConfig.category,
    source,
    generatedPng,
    rawJson: deriveRawJsonPath(generatedJson),
    generatedJson,
    runtimePng,
    runtimeKey: `${groupConfig.runtimeKeyPrefix}_${assetId}`,
    idField: groupConfig.idField,
    size: groupConfig.size,
  };
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
    [target.idField]: target.assetId,
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

export function parseBuildMonsterBossImageLibraryArgs(args) {
  let explicitGroups = null;
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--groups') {
      if (explicitGroups) {
        throw new Error('Duplicate option: --groups');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated group list after --groups.');
      }

      explicitGroups = value.split(',').map((group) => group.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated asset id list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return {
    groups: explicitGroups ?? Object.keys(GROUPS),
    ids: explicitIds,
  };
}

export function buildMonsterBossImageLibrary({ groups = Object.keys(GROUPS), ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  const selectedGroups = groups.map((group) => {
    const groupConfig = GROUPS[group];

    if (!groupConfig) {
      throw new Error(`Unknown monster boss image group: ${group}`);
    }

    if (!config.categories?.[groupConfig.category]) {
      throw new Error(`Aseprite config is missing ${groupConfig.category}.`);
    }

    return groupConfig;
  });
  const targets = [];

  for (const groupConfig of selectedGroups) {
    const assetIds = ids?.length ? [...new Set(ids)].sort((a, b) => a.localeCompare(b)) : readRuntimeIds(groupConfig.runtimeDir);

    if (assetIds.length === 0) {
      throw new Error(`No monster boss image ids found for ${groupConfig.variant}.`);
    }

    for (const assetId of assetIds) {
      const target = createBuildTarget(assetId, groupConfig);

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
        target.assetId,
        path.basename(target.generatedPng),
      );
      validateBuildTarget({ target, config });
      publishBuildTarget(target);
      targets.push(target);
    }
  }

  const roster = updateSpriteRoster(targets);

  return {
    groupCount: selectedGroups.length,
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
    parsedArgs = parseBuildMonsterBossImageLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_MONSTER_BOSS_IMAGE_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildMonsterBossImageLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
