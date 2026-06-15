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
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-character-illustration.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const CATEGORY = 'characterIllustration';
const SOURCE_ROOT = 'assets/source/aseprite/characterIllustration';

const GROUPS = [
  {
    group: 'class_main',
    runtimeDir: 'client/public/assets/generated/characters/class_main',
    parseFile(fileName) {
      const match = /^char_illust_(.+)_(front|side|back)\.png$/u.exec(fileName);
      if (!match) {
        return null;
      }

      return {
        classId: match[1],
        view: match[2],
        advancement: 0,
      };
    },
  },
  {
    group: 'class_advanced',
    runtimeDir: 'client/public/assets/generated/characters/class_advanced',
    parseFile(fileName) {
      const match = /^char_illust_(.+)_adv([1-9][0-9]*)_front\.png$/u.exec(fileName);
      if (!match) {
        return null;
      }

      return {
        classId: match[1],
        view: 'front',
        advancement: Number.parseInt(match[2], 10),
      };
    },
  },
];

export const BUILD_CHARACTER_ILLUSTRATION_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-character-illustration-library.mjs [--ids <comma-separated-ids-or-group/id>]';

function toPosixPath(filePath) {
  return String(filePath).replaceAll(path.sep, '/').replaceAll('\\', '/');
}

function resolveRepoPath(filePath) {
  return path.resolve(REPO_ROOT, toPosixPath(filePath));
}

function normalizeExplicitId(value) {
  return toPosixPath(value.trim()).replace(/\.png$/u, '');
}

function readRuntimeTargets() {
  const targets = [];

  for (const groupConfig of GROUPS) {
    const runtimeDir = resolveRepoPath(groupConfig.runtimeDir);
    const fileNames = readdirSync(runtimeDir)
      .filter((fileName) => fileName.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of fileNames) {
      const parsed = groupConfig.parseFile(fileName);
      if (!parsed) {
        continue;
      }

      const illustrationId = fileName.replace(/\.png$/u, '');
      targets.push(createBuildTarget({
        ...parsed,
        group: groupConfig.group,
        illustrationId,
        runtimeDir: groupConfig.runtimeDir,
      }));
    }
  }

  return targets.sort((a, b) => a.relativeId.localeCompare(b.relativeId));
}

function filterTargetsByIds(targets, ids) {
  if (!ids?.length) {
    return targets;
  }

  const byId = new Map();
  const byRelativeId = new Map();

  for (const target of targets) {
    byId.set(target.illustrationId, target);
    byRelativeId.set(target.relativeId, target);
  }

  const explicitIds = [...new Set(ids.map(normalizeExplicitId))].sort((a, b) => a.localeCompare(b));
  const selectedTargets = [];
  const missingIds = [];

  for (const id of explicitIds) {
    const target = byRelativeId.get(id) ?? byId.get(id);
    if (!target) {
      missingIds.push(id);
      continue;
    }

    selectedTargets.push(target);
  }

  if (missingIds.length > 0) {
    throw new Error(`Unknown character illustration ids: ${missingIds.join(', ')}`);
  }

  return selectedTargets;
}

function deriveRawJsonPath(generatedJson) {
  return generatedJson.endsWith('.json')
    ? generatedJson.replace(/\.json$/u, '.aseprite.json')
    : `${generatedJson}.aseprite.json`;
}

function ensureDirectoryFor(filePath) {
  mkdirSync(path.dirname(resolveRepoPath(filePath)), { recursive: true });
}

function resolveRuntimeKey({ group, classId, view, advancement, illustrationId }) {
  if (group === 'class_advanced') {
    return `char_${classId}_adv${advancement}`;
  }

  if (view === 'front') {
    return `char_${classId}`;
  }

  if (view === 'side') {
    return `char_illust_${classId}_side`;
  }

  return illustrationId;
}

function createBuildTarget({ group, classId, view, advancement, illustrationId, runtimeDir }) {
  const source = toPosixPath(path.join(SOURCE_ROOT, group, classId, `${illustrationId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${illustrationId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${illustrationId}.json`));
  const runtimePng = toPosixPath(path.join(runtimeDir, `${illustrationId}.png`));
  const relativeId = `${group}/${illustrationId}`;
  const runtimeKey = resolveRuntimeKey({ group, classId, view, advancement, illustrationId });

  return {
    id: `character_illustration_${illustrationId}`,
    illustrationId,
    relativeId,
    classId,
    view,
    advancement,
    group,
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
      `class=${target.classId}`,
      '--script-param',
      `view=${target.view}`,
      '--script-param',
      `advancement=${target.advancement}`,
      '--script-param',
      `group=${target.group}`,
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
    throw new Error(`Aseprite character illustration source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
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
  const entry = {
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
    characterIllustrationId: target.illustrationId,
    characterClassId: target.classId,
    characterIllustrationView: target.view,
  };

  if (target.advancement > 0) {
    entry.characterAdvancement = target.advancement;
  }

  return entry;
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

export function parseBuildCharacterIllustrationLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated character illustration id list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildCharacterIllustrationLibrary({ ids = null, dependencies = {} } = {}) {
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
    throw new Error('No character illustration runtime PNGs found.');
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
      target.illustrationId,
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
    parsedArgs = parseBuildCharacterIllustrationLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_CHARACTER_ILLUSTRATION_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildCharacterIllustrationLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
