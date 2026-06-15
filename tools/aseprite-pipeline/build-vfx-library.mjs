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
const CREATE_SCRIPT = path.join(TOOL_DIR, 'scripts', 'create-vfx-strip.lua');
const PALETTE_PATH = 'assets/source/aseprite/palettes/aeterna-core.gpl';
const CATEGORY = 'vfx';
const SOURCE_ROOT = 'assets/source/aseprite/vfx/library';
const RUNTIME_ROOT = 'client/public/assets/generated/vfx';
const SKILLS_DIR = 'skills';

export const BUILD_VFX_LIBRARY_USAGE =
  'Usage: node tools/aseprite-pipeline/build-vfx-library.mjs [--ids <common/VFX-CMN-001,skills/ether_knight/VFX-ETH-001,...>]';

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

function readRuntimeTargets() {
  const targets = [];

  for (const fileName of readdirSync(resolveRepoPath(path.join(RUNTIME_ROOT, 'common')))) {
    if (!fileName.endsWith('.png')) {
      continue;
    }

    targets.push({
      groupId: 'common',
      sourceGroupPath: 'common',
      runtimeSubdir: 'common',
      vfxId: fileName.replace(/\.png$/u, ''),
    });
  }

  const skillsRoot = resolveRepoPath(path.join(RUNTIME_ROOT, SKILLS_DIR));
  for (const classId of readdirSync(skillsRoot)) {
    const classRuntimeSubdir = toPosixPath(path.join(SKILLS_DIR, classId));
    for (const fileName of readdirSync(resolveRepoPath(path.join(RUNTIME_ROOT, classRuntimeSubdir)))) {
      if (!fileName.endsWith('.png')) {
        continue;
      }

      targets.push({
        groupId: classId,
        sourceGroupPath: classRuntimeSubdir,
        runtimeSubdir: classRuntimeSubdir,
        vfxId: fileName.replace(/\.png$/u, ''),
      });
    }
  }

  return targets.sort((a, b) => a.runtimeSubdir.localeCompare(b.runtimeSubdir) || a.vfxId.localeCompare(b.vfxId));
}

function parseTargetSelector(selector) {
  const normalized = selector.trim().replaceAll('\\', '/').replace(/\.png$/u, '');

  if (normalized.startsWith('common/')) {
    const vfxId = normalized.slice('common/'.length);
    if (vfxId.length === 0) {
      throw new Error(`Invalid VFX selector: ${selector}`);
    }

    return {
      groupId: 'common',
      sourceGroupPath: 'common',
      runtimeSubdir: 'common',
      vfxId,
    };
  }

  const skillMatch = /^skills\/([^/]+)\/(.+)$/u.exec(normalized);
  if (!skillMatch) {
    throw new Error(`VFX selector must be common/<id> or skills/<class-id>/<id>: ${selector}`);
  }

  return {
    groupId: skillMatch[1],
    sourceGroupPath: `skills/${skillMatch[1]}`,
    runtimeSubdir: `skills/${skillMatch[1]}`,
    vfxId: skillMatch[2],
  };
}

function parseVfxNumber(vfxId) {
  const match = /-(\d{3})$/u.exec(vfxId);
  if (!match) {
    throw new Error(`VFX id must end with -###: ${vfxId}`);
  }

  return match[1];
}

function createRuntimeKey(target) {
  const number = parseVfxNumber(target.vfxId);

  if (target.groupId === 'common') {
    return `vfx_common_${number}`;
  }

  return `vfx_${target.groupId}_${number}`;
}

function createBuildTarget(runtimeTarget) {
  const source = toPosixPath(path.join(SOURCE_ROOT, runtimeTarget.sourceGroupPath, `${runtimeTarget.vfxId}.aseprite`));
  const generatedPng = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${runtimeTarget.vfxId}.png`));
  const generatedJson = toPosixPath(path.join('assets/generated/aseprite', CATEGORY, `${runtimeTarget.vfxId}.json`));
  const runtimePng = toPosixPath(path.join(RUNTIME_ROOT, runtimeTarget.runtimeSubdir, `${runtimeTarget.vfxId}.png`));
  const runtimeKey = createRuntimeKey(runtimeTarget);

  return {
    id: runtimeKey,
    category: CATEGORY,
    groupId: runtimeTarget.groupId,
    vfxId: runtimeTarget.vfxId,
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
      `vfx=${target.vfxId}`,
      '--script-param',
      `group=${target.groupId}`,
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
    throw new Error(`Aseprite VFX source generation failed for ${target.id} with status ${result.status}.${stderr}${stdout}`);
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
    requiredTags: ['start', 'loop', 'end'],
    vfxId: target.vfxId,
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

export function parseBuildVfxLibraryArgs(args) {
  let explicitIds = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--ids') {
      if (explicitIds) {
        throw new Error('Duplicate option: --ids');
      }

      const value = args[index + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('Expected a comma-separated VFX selector list after --ids.');
      }

      explicitIds = value.split(',').map((id) => id.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return { ids: explicitIds };
}

export function buildVfxLibrary({ ids = null, dependencies = {} } = {}) {
  const config = dependencies.loadConfig ? dependencies.loadConfig() : loadConfig();
  const asepriteExe = dependencies.findAsepriteExecutable ? dependencies.findAsepriteExecutable() : findAsepriteExecutable();

  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Run npm run art:aseprite:check or set ASEPRITE_EXE.');
  }

  if (!config.categories?.[CATEGORY]) {
    throw new Error(`Aseprite config is missing ${CATEGORY}.`);
  }

  const runtimeTargets = ids?.length ? ids.map(parseTargetSelector) : readRuntimeTargets();

  if (runtimeTargets.length === 0) {
    throw new Error('No VFX runtime PNGs found.');
  }

  const seenSelectors = new Set();
  const targets = [];

  for (const runtimeTarget of runtimeTargets) {
    const selector = `${runtimeTarget.runtimeSubdir}/${runtimeTarget.vfxId}`;
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
      target.vfxId,
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
    parsedArgs = parseBuildVfxLibraryArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_VFX_LIBRARY_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildVfxLibrary(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
