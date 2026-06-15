import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-story-cg.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const CATEGORY = 'storyCg';
const SOURCE_ROOT = 'assets/source/aseprite/storyCg';
const RUNTIME_ROOT = 'client/public/assets/cg';
const RUNTIME_KEY_PREFIX = 'story_cg';

export const BUILD_STORY_CG_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-story-cg-library.mjs [--ids <comma-separated-story-cg-ids>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function walkPngFiles(dirPath, relativePrefix = '') {
  const results = [];
  const absoluteDir = resolveRepoPath(dirPath);

  for (const entry of readdirSync(absoluteDir)) {
    const absolutePath = path.join(absoluteDir, entry);
    const relativePath = relativePrefix ? path.join(relativePrefix, entry) : entry;

    if (statSync(absolutePath).isDirectory()) {
      results.push(...walkPngFiles(path.join(dirPath, entry), relativePath));
      continue;
    }

    if (entry.endsWith('.png')) {
      results.push(toPosixPath(relativePath));
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

function readRuntimeTargets(runtimeRoot = RUNTIME_ROOT) {
  return walkPngFiles(runtimeRoot).map((relativePath) => ({
    relativePath,
    storyCgId: path.basename(relativePath, '.png'),
  }));
}

function sourceGroupFor(target) {
  if (target.relativePath.startsWith('chapters/')) {
    return 'chapters';
  }

  if (target.storyCgId.startsWith('ending_') || target.storyCgId.startsWith('defeat_')) {
    return 'ending';
  }

  return 'misc';
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
      `story=${target.storyCgId}`,
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
    throw new Error(`Aseprite story CG source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
  }
}

function createBuildTarget(runtimeTarget) {
  const sourceGroup = sourceGroupFor(runtimeTarget);
  const source = toPosixPath(path.join(SOURCE_ROOT, sourceGroup, `${runtimeTarget.storyCgId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${runtimeTarget.storyCgId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${runtimeTarget.storyCgId}.json`));
  const runtimePng = toPosixPath(path.join(RUNTIME_ROOT, runtimeTarget.relativePath));
  const runtimeKey = `${RUNTIME_KEY_PREFIX}_${runtimeTarget.storyCgId}`;

  return {
    id: runtimeKey,
    storyCgId: runtimeTarget.storyCgId,
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
    storyCgId: target.storyCgId,
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

export function parseBuildStoryCgLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated story CG id list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildStoryCgLibrary({ ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  if (!config.categories?.[CATEGORY]) {
    throw new Error(`Aseprite config is missing ${CATEGORY}.`);
  }

  const runtimeTargets = readRuntimeTargets();
  const targetById = new Map(runtimeTargets.map((target) => [target.storyCgId, target]));
  const selectedRuntimeTargets = ids?.length
    ? [...new Set(ids)].sort((a, b) => a.localeCompare(b)).map((id) => {
      const target = targetById.get(id);
      if (!target) {
        throw new Error(`Unknown story CG id: ${id}`);
      }
      return target;
    })
    : runtimeTargets;

  if (selectedRuntimeTargets.length === 0) {
    throw new Error('No story CG ids found.');
  }

  const targets = [];

  for (const runtimeTarget of selectedRuntimeTargets) {
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
      target.storyCgId,
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
    parsedArgs = parseBuildStoryCgLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_STORY_CG_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildStoryCgLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
