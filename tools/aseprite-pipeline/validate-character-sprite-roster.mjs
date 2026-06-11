import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_DIR, '..', '..');

export const DEFAULT_CHARACTER_SPRITE_ROSTER_PATH = path.join(
  REPO_ROOT,
  'assets/source/aseprite/character/character-sprite-roster.json',
);

const SOURCE_ROOT = 'assets/source/aseprite/character';
const GENERATED_ROOT = 'assets/generated/aseprite/character';
const RUNTIME_ROOT = 'client/public/assets/generated/characters/sprites';
const FRAME_WIDTH = 64;
const FRAME_HEIGHT = 64;

const ALLOWED_DIRECTIONS = new Set(['D', 'DL', 'L', 'UL', 'U']);
const ALLOWED_MOTIONS = new Set(['idle', 'walk', 'attack_melee', 'attack_ranged', 'cast', 'hit', 'death']);
const ALLOWED_PHASES = new Set(['pilot', 'full', 'production', 'full-production']);
const ALLOWED_STATUSES = new Set(['planned', 'source-ready', 'exported', 'validated', 'published', 'in-game-verified']);
const PILOT_REQUIRED_TAGS = ['idle_D', 'walk_D'];
const FULL_REQUIRED_TAGS = ['idle_D', 'walk_D', 'attack_melee_D', 'cast_D', 'hit_D', 'death_D'];
const PHASE_REQUIRED_TAGS = {
  pilot: PILOT_REQUIRED_TAGS,
  full: FULL_REQUIRED_TAGS,
  production: FULL_REQUIRED_TAGS,
  'full-production': FULL_REQUIRED_TAGS,
};

const PATH_ROOTS = {
  source: SOURCE_ROOT,
  generatedPng: GENERATED_ROOT,
  generatedJson: GENERATED_ROOT,
  runtimePng: RUNTIME_ROOT,
  runtimeJson: RUNTIME_ROOT,
};
const PATH_EXTENSIONS = {
  source: ['.ase', '.aseprite'],
  generatedPng: ['.png'],
  generatedJson: ['.json'],
  runtimePng: ['.png'],
  runtimeJson: ['.json'],
};

export function loadCharacterSpriteRoster(rosterPath = DEFAULT_CHARACTER_SPRITE_ROSTER_PATH) {
  return JSON.parse(readFileSync(rosterPath, 'utf8'));
}

function toDisplayPath(value) {
  return String(value).replaceAll('\\', '/');
}

function resolveContractPath(value) {
  return path.resolve(REPO_ROOT, toDisplayPath(value));
}

function isSubPath(rootPath, candidatePath) {
  const relativePath = path.relative(rootPath, candidatePath);

  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function readCharacterId(character, index) {
  return typeof character?.id === 'string' && character.id.length > 0 ? character.id : `#${index}`;
}

function pushStringFieldError(characterId, fieldName, value, errors) {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`Character "${characterId}" ${fieldName} must be a non-empty string.`);
    return true;
  }

  return false;
}

function validateUniqueField(characters, fieldName, errors) {
  const seen = new Map();

  characters.forEach((character, index) => {
    const value = character?.[fieldName];

    if (typeof value !== 'string' || value.length === 0) {
      return;
    }

    if (seen.has(value)) {
      errors.push(`Duplicate character ${fieldName} "${value}" at characters[${seen.get(value)}] and characters[${index}].`);
      return;
    }

    seen.set(value, index);
  });
}

function validatePathField(character, index, fieldName, root, errors) {
  const characterId = readCharacterId(character, index);
  const value = character?.[fieldName];

  if (pushStringFieldError(characterId, fieldName, value, errors)) {
    return;
  }

  const rootPath = resolveContractPath(root);
  const candidatePath = resolveContractPath(value);

  if (!isSubPath(rootPath, candidatePath)) {
    errors.push(`Character "${characterId}" ${fieldName} must be inside ${root}: ${toDisplayPath(value)}.`);
  }
}

function formatExtensionList(extensions) {
  return extensions.length === 1 ? extensions[0] : `${extensions.slice(0, -1).join(', ')} or ${extensions.at(-1)}`;
}

function validatePathExtensionField(character, index, fieldName, errors) {
  const characterId = readCharacterId(character, index);
  const value = character?.[fieldName];

  if (typeof value !== 'string' || value.length === 0) {
    return;
  }

  const expectedExtensions = PATH_EXTENSIONS[fieldName];

  if (!expectedExtensions) {
    return;
  }

  const extension = path.extname(toDisplayPath(value)).toLowerCase();

  if (!expectedExtensions.includes(extension)) {
    errors.push(
      `Character "${characterId}" ${fieldName} must use ${formatExtensionList(expectedExtensions)} extension: ${toDisplayPath(value)}.`,
    );
  }
}

function validateStringArray(character, index, fieldName, allowedValues, errors) {
  const characterId = readCharacterId(character, index);
  const value = character?.[fieldName];

  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`Character "${characterId}" ${fieldName} must be a non-empty array.`);
    return;
  }

  value.forEach((entry, entryIndex) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      errors.push(`Character "${characterId}" ${fieldName}[${entryIndex}] must be a non-empty string.`);
      return;
    }

    if (allowedValues && !allowedValues.has(entry)) {
      errors.push(`Character "${characterId}" ${fieldName}[${entryIndex}] has unsupported value "${entry}".`);
    }
  });
}

function validateFrameSize(character, index, errors) {
  const characterId = readCharacterId(character, index);

  if (character?.frameWidth !== FRAME_WIDTH || character?.frameHeight !== FRAME_HEIGHT) {
    errors.push(
      `Character "${characterId}" frame size must be ${FRAME_WIDTH}x${FRAME_HEIGHT}, got ${character?.frameWidth}x${character?.frameHeight}.`,
    );
  }
}

function validatePhase(character, index, errors) {
  const characterId = readCharacterId(character, index);
  const phase = character?.phase;

  if (pushStringFieldError(characterId, 'phase', phase, errors)) {
    return false;
  }

  if (!ALLOWED_PHASES.has(phase)) {
    errors.push(`Character "${characterId}" phase must be one of ${Array.from(ALLOWED_PHASES).join(', ')}.`);
    return false;
  }

  return true;
}

function validateRequiredTagsForPhase(character, index, errors) {
  const characterId = readCharacterId(character, index);
  const phase = character?.phase;
  const requiredTags = character?.requiredTags;

  if (!ALLOWED_PHASES.has(phase) || !Array.isArray(requiredTags)) {
    return;
  }

  const tagSet = new Set(requiredTags);

  for (const requiredTag of PHASE_REQUIRED_TAGS[phase]) {
    if (!tagSet.has(requiredTag)) {
      errors.push(`Character "${characterId}" phase "${phase}" requiredTags must include "${requiredTag}".`);
    }
  }
}

function validateStatus(character, index, errors) {
  const characterId = readCharacterId(character, index);
  const status = character?.status;

  if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
    errors.push(`Character "${characterId}" status must be one of ${Array.from(ALLOWED_STATUSES).join(', ')}.`);
  }
}

function validateCharacter(character, index, errors) {
  const characterId = readCharacterId(character, index);

  for (const fieldName of ['id', 'classId', 'textureKey']) {
    pushStringFieldError(characterId, fieldName, character?.[fieldName], errors);
  }

  validatePhase(character, index, errors);

  for (const [fieldName, root] of Object.entries(PATH_ROOTS)) {
    validatePathField(character, index, fieldName, root, errors);
    validatePathExtensionField(character, index, fieldName, errors);
  }

  validateFrameSize(character, index, errors);
  validateStringArray(character, index, 'directions', ALLOWED_DIRECTIONS, errors);
  validateStringArray(character, index, 'motions', ALLOWED_MOTIONS, errors);
  validateStringArray(character, index, 'requiredTags', null, errors);
  validateRequiredTagsForPhase(character, index, errors);
  validateStatus(character, index, errors);
}

export function validateCharacterSpriteRoster(roster) {
  const errors = [];

  if (!roster || typeof roster !== 'object') {
    return { ok: false, errors: ['Character sprite roster must be an object.'] };
  }

  if (roster.version !== 1) {
    errors.push(`Character sprite roster version must be 1, got ${roster.version}.`);
  }

  if (!Array.isArray(roster.characters)) {
    errors.push('Character sprite roster characters must be an array.');
    return { ok: false, errors };
  }

  validateUniqueField(roster.characters, 'id', errors);
  validateUniqueField(roster.characters, 'textureKey', errors);
  roster.characters.forEach((character, index) => validateCharacter(character, index, errors));

  return { ok: errors.length === 0, errors };
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
  const [, , rosterPath] = process.argv;

  try {
    const roster = loadCharacterSpriteRoster(rosterPath || DEFAULT_CHARACTER_SPRITE_ROSTER_PATH);
    const result = validateCharacterSpriteRoster(roster);

    console.log(JSON.stringify(result));
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    console.log(
      JSON.stringify({
        ok: false,
        errors: [error instanceof Error ? error.message : String(error)],
      }),
    );
    process.exit(1);
  }
}
