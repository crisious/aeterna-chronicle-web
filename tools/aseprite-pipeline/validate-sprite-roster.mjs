import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './export-aseprite.mjs';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TOOL_DIR, '..', '..');

export const DEFAULT_SPRITE_ROSTER_PATH = path.join(
  REPO_ROOT,
  'assets/source/aseprite/sprite-production-roster.json',
);

const SOURCE_ROOT = 'assets/source/aseprite';
const GENERATED_ROOT = 'assets/generated/aseprite';
const RUNTIME_ROOT = 'client/public/assets';
const ALLOWED_STATUSES = new Set(['planned', 'source-ready', 'exported', 'validated', 'published', 'in-game-verified']);

const PATH_ROOTS = {
  source: SOURCE_ROOT,
  generatedPng: GENERATED_ROOT,
  generatedJson: GENERATED_ROOT,
  runtimePng: RUNTIME_ROOT,
};

const PATH_EXTENSIONS = {
  source: ['.ase', '.aseprite'],
  generatedPng: ['.png'],
  generatedJson: ['.json'],
  runtimePng: ['.png'],
};

export function loadSpriteRoster(rosterPath = DEFAULT_SPRITE_ROSTER_PATH) {
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

function readItemId(item, index) {
  return typeof item?.id === 'string' && item.id.length > 0 ? item.id : `#${index}`;
}

function pushStringFieldError(itemId, fieldName, value, errors) {
  if (typeof value !== 'string' || value.length === 0) {
    errors.push(`${itemId}: ${fieldName} must be a non-empty string`);
    return true;
  }

  return false;
}

function validateUniqueField(items, fieldName, errors) {
  const seen = new Map();

  items.forEach((item, index) => {
    const value = item?.[fieldName];

    if (typeof value !== 'string' || value.length === 0) {
      return;
    }

    if (seen.has(value)) {
      errors.push(`Duplicate ${fieldName} "${value}" at items[${seen.get(value)}] and items[${index}]`);
      return;
    }

    seen.set(value, index);
  });
}

function formatExtensionList(extensions) {
  return extensions.length === 1 ? extensions[0] : `${extensions.slice(0, -1).join(', ')} or ${extensions.at(-1)}`;
}

function validatePathField(item, index, fieldName, root, errors) {
  const itemId = readItemId(item, index);
  const value = item?.[fieldName];

  if (pushStringFieldError(itemId, fieldName, value, errors)) {
    return;
  }

  const rootPath = resolveContractPath(root);
  const candidatePath = resolveContractPath(value);

  if (!isSubPath(rootPath, candidatePath)) {
    errors.push(`${itemId}: ${fieldName} must be inside ${root}`);
  }
}

function validatePathExtensionField(item, index, fieldName, errors) {
  const itemId = readItemId(item, index);
  const value = item?.[fieldName];

  if (typeof value !== 'string' || value.length === 0) {
    return;
  }

  const expectedExtensions = PATH_EXTENSIONS[fieldName];

  if (!expectedExtensions) {
    return;
  }

  const extension = path.extname(toDisplayPath(value)).toLowerCase();

  if (!expectedExtensions.includes(extension)) {
    errors.push(`${itemId}: ${fieldName} must use ${formatExtensionList(expectedExtensions)} extension`);
  }
}

function validateRequiredTags(item, index, categoryConfig, errors) {
  const itemId = readItemId(item, index);
  const requiredTags = item?.requiredTags;

  if (!Array.isArray(requiredTags)) {
    errors.push(`${itemId}: requiredTags must be an array`);
    return;
  }

  requiredTags.forEach((tag, tagIndex) => {
    if (typeof tag !== 'string' || tag.length === 0) {
      errors.push(`${itemId}: requiredTags[${tagIndex}] must be a non-empty string`);
    }
  });

  const categoryRequiredTags = categoryConfig?.requiredTags ?? [];
  if (!categoryConfig && requiredTags.length === 0) {
    errors.push(`${itemId}: requiredTags must be a non-empty array`);
    return;
  }

  if (categoryRequiredTags.length > 0 && requiredTags.length === 0) {
    errors.push(`${itemId}: requiredTags must be a non-empty array`);
    return;
  }

  for (const tag of categoryRequiredTags) {
    if (!requiredTags.includes(tag)) {
      errors.push(`${itemId}: requiredTags must include "${tag}"`);
    }
  }
}

function validateItem(item, index, categories, errors) {
  const itemId = readItemId(item, index);

  pushStringFieldError(itemId, 'id', item?.id, errors);
  pushStringFieldError(itemId, 'runtimeKey', item?.runtimeKey, errors);

  if (!Number.isInteger(item?.priority) || item.priority < 1) {
    errors.push(`${itemId}: priority must be a positive integer`);
  }

  const category = item?.category;
  if (pushStringFieldError(itemId, 'category', category, errors)) {
    return;
  }

  const categoryConfig = categories?.[category];
  if (!categoryConfig) {
    errors.push(`${itemId}: unknown category ${category}`);
  }

  for (const [fieldName, root] of Object.entries(PATH_ROOTS)) {
    validatePathField(item, index, fieldName, root, errors);
    validatePathExtensionField(item, index, fieldName, errors);
  }

  validateRequiredTags(item, index, categoryConfig, errors);

  const status = item?.status;
  if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
    errors.push(`${itemId}: status must be one of ${Array.from(ALLOWED_STATUSES).join(', ')}`);
  }
}

export function validateSpriteRoster(roster, config = loadConfig()) {
  const errors = [];

  if (!roster || typeof roster !== 'object') {
    return { ok: false, errors: ['Sprite roster must be an object'] };
  }

  if (roster.version !== 1) {
    errors.push(`Sprite roster version must be 1, got ${roster.version}`);
  }

  if (!Array.isArray(roster.items)) {
    errors.push('Sprite roster items must be an array');
    return { ok: false, errors };
  }

  validateUniqueField(roster.items, 'id', errors);
  validateUniqueField(roster.items, 'runtimeKey', errors);
  roster.items.forEach((item, index) => validateItem(item, index, config.categories, errors));

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
    const roster = loadSpriteRoster(rosterPath || DEFAULT_SPRITE_ROSTER_PATH);
    const result = validateSpriteRoster(roster);

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
