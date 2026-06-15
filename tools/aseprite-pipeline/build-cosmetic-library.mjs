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
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-cosmetic.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const CATEGORY = 'cosmetic';
const SOURCE_ROOT = 'assets/source/aseprite/cosmetic';
const RUNTIME_ROOT = 'client/public/assets/generated/cosmetics';
const RUNTIME_KEY_PREFIX = 'cosmetic';

export const BUILD_COSMETIC_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-cosmetic-library.mjs [--ids <season1/COS-ID,season2/COS-ID,...>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function createRuntimeKey(season, cosmeticId) {
  return `${RUNTIME_KEY_PREFIX}_s${season}_${cosmeticId.replace(/[^A-Za-z0-9]+/gu, '_')}`;
}

function parseSeasonDirectory(seasonDirectory) {
  const match = /^season([1-9]\d*)$/u.exec(seasonDirectory);
  if (!match) {
    return null;
  }

  return Number.parseInt(match[1], 10);
}

function parseCosmeticKind(cosmeticId) {
  const match = /^COS-([A-Z]+)(?:_|-)/u.exec(cosmeticId);
  if (!match) {
    throw new Error(`Cosmetic id must start with COS-<KIND>: ${cosmeticId}`);
  }

  return match[1].toLowerCase();
}

function deriveRawJsonPath(generatedJson) {
  return generatedJson.endsWith('.json')
    ? generatedJson.replace(/\.json$/u, '.aseprite.json')
    : `${generatedJson}.aseprite.json`;
}

function ensureDirectoryFor(filePath) {
  mkdirSync(path.dirname(resolveRepoPath(filePath)), { recursive: true });
}

function readRuntimeTargets(runtimeRoot = RUNTIME_ROOT) {
  const rootPath = resolveRepoPath(runtimeRoot);
  const targets = [];

  for (const seasonDirectory of readdirSync(rootPath)) {
    const season = parseSeasonDirectory(seasonDirectory);
    if (!season) {
      continue;
    }

    const seasonRuntimeDir = path.join(runtimeRoot, seasonDirectory);
    for (const fileName of readdirSync(resolveRepoPath(seasonRuntimeDir))) {
      if (!fileName.endsWith('.png')) {
        continue;
      }

      targets.push({
        season,
        seasonDirectory,
        cosmeticId: fileName.replace(/\.png$/u, ''),
      });
    }
  }

  return targets.sort((a, b) => a.season - b.season || a.cosmeticId.localeCompare(b.cosmeticId));
}

function parseTargetSelector(selector) {
  const normalized = selector.trim().replaceAll('\\', '/');
  const match = /^(season[1-9]\d*)\/(.+)$/u.exec(normalized);
  if (!match) {
    throw new Error(`Cosmetic selector must be seasonN/COS-ID: ${selector}`);
  }

  const season = parseSeasonDirectory(match[1]);
  const cosmeticId = match[2].replace(/\.png$/u, '');

  if (!season || cosmeticId.length === 0) {
    throw new Error(`Invalid cosmetic selector: ${selector}`);
  }

  return {
    season,
    seasonDirectory: match[1],
    cosmeticId,
  };
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
      `cosmetic=${target.cosmeticId}`,
      '--script-param',
      `season=${target.season}`,
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
    throw new Error(`Aseprite cosmetic source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
  }
}

function createBuildTarget({ season, seasonDirectory, cosmeticId }) {
  const kind = parseCosmeticKind(cosmeticId);
  const source = toPosixPath(path.join(SOURCE_ROOT, seasonDirectory, kind, `${cosmeticId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${cosmeticId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${cosmeticId}.json`));
  const runtimePng = toPosixPath(path.join(RUNTIME_ROOT, seasonDirectory, `${cosmeticId}.png`));
  const runtimeKey = createRuntimeKey(season, cosmeticId);

  return {
    id: runtimeKey,
    season,
    seasonDirectory,
    cosmeticId,
    category: CATEGORY,
    source,
    generatedPng,
    rawJson: deriveRawJsonPath(generatedJson),
    generatedJson,
    runtimePng,
    runtimeKey,
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
    cosmeticId: target.cosmeticId,
    cosmeticSeason: target.season,
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

export function parseBuildCosmeticLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated cosmetic selector list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildCosmeticLibrary({ ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  if (!config.categories?.[CATEGORY]) {
    throw new Error(`Aseprite config is missing ${CATEGORY}.`);
  }

  const runtimeTargets = ids?.length
    ? ids.map(parseTargetSelector)
    : readRuntimeTargets();

  if (runtimeTargets.length === 0) {
    throw new Error('No cosmetic runtime PNGs found.');
  }

  const seenSelectors = new Set();
  const targets = [];

  for (const runtimeTarget of runtimeTargets) {
    const selector = `${runtimeTarget.seasonDirectory}/${runtimeTarget.cosmeticId}`;
    if (seenSelectors.has(selector)) {
      continue;
    }
    seenSelectors.add(selector);

    const target = createBuildTarget(runtimeTarget);

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
      `${target.seasonDirectory}_${target.cosmeticId}`,
      path.basename(target.generatedPng),
    );
    validateBuildTarget({ target, config });
    publishBuildTarget(target);
    targets.push(target);
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
    parsedArgs = parseBuildCosmeticLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_COSMETIC_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildCosmeticLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
