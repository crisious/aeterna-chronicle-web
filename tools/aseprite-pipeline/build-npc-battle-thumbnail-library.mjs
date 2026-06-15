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
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-npc-battle-thumbnail.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const CATEGORY = 'npcBattleThumbnail';
const SOURCE_ROOT = 'assets/source/aseprite/npcBattleThumbnail';
const RUNTIME_DIR = 'client/public/assets/generated/characters/npc_battle';

const RUNTIME_KEYS_BY_NPC_ID = new Map([
  ['01_cryo', 'npc_merchant_sprite'],
  ['04_mateus', 'npc_guide_sprite'],
]);

export const BUILD_NPC_BATTLE_THUMBNAIL_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-npc-battle-thumbnail-library.mjs [--ids <comma-separated-npc-ids-or-thumbnail-ids>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function deriveRawJsonPath(generatedJson) {
  return generatedJson.endsWith('.json')
    ? generatedJson.replace(/\.json$/u, '.aseprite.json')
    : `${generatedJson}.aseprite.json`;
}

function ensureDirectoryFor(filePath) {
  mkdirSync(path.dirname(resolveRepoPath(filePath)), { recursive: true });
}

function parseNpcId(thumbnailId) {
  const match = /^(.+)_sprite$/u.exec(thumbnailId);

  if (!match) {
    throw new Error(`NPC battle thumbnail id must match <npc-id>_sprite: ${thumbnailId}`);
  }

  return match[1];
}

function readRuntimeThumbnailIds(runtimeDir = RUNTIME_DIR) {
  return readdirSync(resolveRepoPath(runtimeDir))
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName.replace(/\.png$/u, ''))
    .filter((thumbnailId) => /^[0-9]{2}_.+_sprite$/u.test(thumbnailId))
    .sort((a, b) => a.localeCompare(b));
}

function normalizeExplicitId(value) {
  const id = value.trim().replaceAll('\\', '/').split('/').at(-1)?.replace(/\.png$/u, '') ?? '';

  if (id.length === 0) {
    throw new Error(`Invalid NPC battle thumbnail selector: ${value}`);
  }

  return id.endsWith('_sprite') ? id : `${id}_sprite`;
}

function resolveRuntimeKey(npcId, thumbnailId) {
  return RUNTIME_KEYS_BY_NPC_ID.get(npcId) ?? `npc_battle_${thumbnailId}`;
}

function createBuildTarget(thumbnailId) {
  const npcId = parseNpcId(thumbnailId);
  const source = toPosixPath(path.join(SOURCE_ROOT, npcId, `${thumbnailId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${thumbnailId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${thumbnailId}.json`));
  const runtimePng = toPosixPath(path.join(RUNTIME_DIR, `${thumbnailId}.png`));
  const runtimeKey = resolveRuntimeKey(npcId, thumbnailId);

  return {
    id: `npc_battle_thumbnail_${npcId}`,
    thumbnailId,
    npcId,
    category: CATEGORY,
    source,
    generatedPng,
    rawJson: deriveRawJsonPath(generatedJson),
    generatedJson,
    runtimePng,
    runtimeKey,
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
      `npc=${target.npcId}`,
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
    throw new Error(`Aseprite NPC battle thumbnail source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
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
    npcBattleThumbnailId: target.thumbnailId,
    npcId: target.npcId,
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

export function parseBuildNpcBattleThumbnailLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated NPC battle thumbnail id list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildNpcBattleThumbnailLibrary({ ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  if (!config.categories?.[CATEGORY]) {
    throw new Error(`Aseprite config is missing ${CATEGORY}.`);
  }

  const runtimeIds = readRuntimeThumbnailIds();
  const knownIds = new Set(runtimeIds);
  const selectedIds = ids?.length
    ? [...new Set(ids.map(normalizeExplicitId))].sort((a, b) => a.localeCompare(b))
    : runtimeIds;
  const missingIds = selectedIds.filter((id) => !knownIds.has(id));

  if (missingIds.length > 0) {
    throw new Error(`Unknown NPC battle thumbnail ids: ${missingIds.join(', ')}`);
  }

  if (selectedIds.length === 0) {
    throw new Error('No NPC battle thumbnail runtime PNGs found.');
  }

  const targets = selectedIds.map(createBuildTarget);

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
      target.thumbnailId,
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
    parsedArgs = parseBuildNpcBattleThumbnailLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_NPC_BATTLE_THUMBNAIL_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildNpcBattleThumbnailLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
