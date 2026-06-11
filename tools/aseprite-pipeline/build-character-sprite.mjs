import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportAseprite } from './export-aseprite.mjs';
import { normalizeFile } from './normalize-aseprite-json.mjs';
import { loadConfig, readPngSize, validateAtlas } from './validate-aseprite-export.mjs';
import { loadCharacterSpriteRoster, validateCharacterSpriteRoster } from './validate-character-sprite-roster.mjs';

export const BUILD_CHARACTER_SPRITE_USAGE =
  'Usage: node tools/aseprite-pipeline/build-character-sprite.mjs <character-id> [--publish]';

function findCharacterEntry(roster, id) {
  return roster?.characters?.find((candidate) => candidate?.id === id);
}

function deriveRawJsonPath(generatedJson) {
  const filePath = String(generatedJson);

  return filePath.endsWith('.json') ? filePath.replace(/\.json$/u, '.aseprite.json') : `${filePath}.aseprite.json`;
}

export function resolveCharacterBuildTarget(roster, id) {
  const entry = findCharacterEntry(roster, id);

  if (!entry) {
    throw new Error(`Unknown character sprite id: ${id}`);
  }

  return {
    id: entry.id,
    category: 'character',
    atlasName: entry.id,
    source: entry.source,
    generatedPng: entry.generatedPng,
    rawJson: deriveRawJsonPath(entry.generatedJson),
    generatedJson: entry.generatedJson,
    runtimePng: entry.runtimePng,
    runtimeJson: entry.runtimeJson,
  };
}

function createCharacterCategoryConfig(config, entry) {
  const characterConfig = config?.categories?.character;

  if (!characterConfig) {
    throw new Error('Aseprite config is missing categories.character.');
  }

  return {
    ...characterConfig,
    requiredTags: Array.isArray(entry?.requiredTags) ? [...entry.requiredTags] : characterConfig.requiredTags,
  };
}

function readAtlasJson(filePath, readText) {
  const content = readText ? readText(filePath) : readFileSync(filePath, 'utf8');

  return JSON.parse(content);
}

function createRuntimeDirectories(target, mkdir) {
  const directories = new Set([path.dirname(target.runtimePng), path.dirname(target.runtimeJson)]);

  for (const directory of directories) {
    mkdir(directory, { recursive: true });
  }
}

function normalizeForCompare(filePath) {
  return path.normalize(String(filePath ?? ''));
}

function assertExportTargetMatches(exportTarget, target) {
  const expectedSheetFile = normalizeForCompare(target.generatedPng);
  const expectedDataFile = normalizeForCompare(target.rawJson);
  const actualSheetFile = normalizeForCompare(exportTarget?.sheetFile);
  const actualDataFile = normalizeForCompare(exportTarget?.dataFile);
  const errors = [];

  if (actualSheetFile !== expectedSheetFile) {
    errors.push(`sheetFile expected ${target.generatedPng}, got ${exportTarget?.sheetFile ?? '<missing>'}.`);
  }

  if (actualDataFile !== expectedDataFile) {
    errors.push(`dataFile expected ${target.rawJson}, got ${exportTarget?.dataFile ?? '<missing>'}.`);
  }

  if (errors.length > 0) {
    throw new Error(`Aseprite export target mismatch:\n${errors.join('\n')}`);
  }
}

export function parseBuildCharacterSpriteArgs(args) {
  let id = null;
  let publish = false;

  for (const arg of args) {
    if (arg === '--publish') {
      if (publish) {
        throw new Error('Duplicate option: --publish');
      }

      publish = true;
      continue;
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (id) {
      throw new Error('Expected exactly one character id.');
    }

    id = arg;
  }

  if (!id) {
    throw new Error('Expected exactly one character id.');
  }

  return { id, publish };
}

export function buildCharacterSprite({ id, publish = false, dependencies = {} }) {
  const loadRoster = dependencies.loadRoster ?? loadCharacterSpriteRoster;
  const validateRoster = dependencies.validateRoster ?? validateCharacterSpriteRoster;
  const runExport = dependencies.runExport ?? exportAseprite;
  const normalize = dependencies.normalize ?? normalizeFile;
  const loadAsepriteConfig = dependencies.loadAsepriteConfig ?? dependencies.loadConfig ?? loadConfig;
  const readSize = dependencies.readSize ?? readPngSize;
  const validateAtlasDependency = dependencies.validateAtlas ?? validateAtlas;
  const mkdir = dependencies.mkdir ?? mkdirSync;
  const copyFile = dependencies.copyFile ?? copyFileSync;

  const roster = loadRoster();
  const rosterValidation = validateRoster(roster);

  if (!rosterValidation.ok) {
    throw new Error(`Character roster is invalid:\n${rosterValidation.errors.join('\n')}`);
  }

  const entry = findCharacterEntry(roster, id);
  const target = resolveCharacterBuildTarget(roster, id);

  const exportTarget = runExport({ category: target.category, sourceFile: target.source });
  assertExportTargetMatches(exportTarget, target);
  normalize(target.rawJson, target.generatedJson, target.atlasName, path.basename(target.generatedPng));

  const config = loadAsepriteConfig();
  const atlas = readAtlasJson(target.generatedJson, dependencies.readText);
  const categoryConfig = createCharacterCategoryConfig(config, entry);
  const validation = validateAtlasDependency({
    atlas,
    categoryConfig,
    pngSize: readSize(target.generatedPng),
  });

  if (!validation.ok) {
    throw new Error(`Character sprite validation failed:\n${validation.errors.join('\n')}`);
  }

  if (publish) {
    createRuntimeDirectories(target, mkdir);
    copyFile(target.generatedPng, target.runtimePng);
    copyFile(target.generatedJson, target.runtimeJson);
  }

  return { target, validation };
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
    parsedArgs = parseBuildCharacterSpriteArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(BUILD_CHARACTER_SPRITE_USAGE);
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(buildCharacterSprite(parsedArgs), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
