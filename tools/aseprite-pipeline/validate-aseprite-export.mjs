import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(TOOL_DIR, 'aseprite.config.json');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_IHDR_DATA_BYTES = 13;
const PNG_CHUNK_HEADER_BYTES = 8;
const PNG_CHUNK_CRC_BYTES = 4;

export function readPngSize(filePath) {
  const buffer = readFileSync(filePath);

  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error(`Invalid PNG signature: ${filePath}`);
  }

  const firstChunk = readPngChunk(buffer, PNG_SIGNATURE.length, filePath);

  if (firstChunk.length !== PNG_IHDR_DATA_BYTES || firstChunk.type !== 'IHDR') {
    throw new Error(`Malformed PNG: first chunk must be IHDR in ${filePath}`);
  }

  const width = buffer.readUInt32BE(firstChunk.dataStart);
  const height = buffer.readUInt32BE(firstChunk.dataStart + 4);

  if (width === 0 || height === 0) {
    throw new Error(`Malformed PNG: IHDR dimensions must be positive in ${filePath}`);
  }

  let hasIdat = false;
  let hasIend = false;
  let offset = firstChunk.nextOffset;

  while (offset < buffer.length) {
    const chunk = readPngChunk(buffer, offset, filePath);

    if (chunk.type === 'IDAT') {
      hasIdat = true;
    } else if (chunk.type === 'IEND') {
      hasIend = true;
      break;
    }

    offset = chunk.nextOffset;
  }

  if (!hasIdat) {
    throw new Error(`Malformed PNG: missing IDAT chunk in ${filePath}`);
  }

  if (!hasIend) {
    throw new Error(`Malformed PNG: missing IEND chunk in ${filePath}`);
  }

  return { w: width, h: height };
}

export function loadConfig(configPath = CONFIG_PATH) {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

function readPngChunk(buffer, offset, filePath) {
  if (offset + PNG_CHUNK_HEADER_BYTES > buffer.length) {
    throw new Error(`Malformed or truncated PNG: missing chunk header in ${filePath}`);
  }

  const length = buffer.readUInt32BE(offset);
  const type = buffer.toString('ascii', offset + 4, offset + 8);
  const dataStart = offset + PNG_CHUNK_HEADER_BYTES;
  const nextOffset = dataStart + length + PNG_CHUNK_CRC_BYTES;

  if (nextOffset > buffer.length) {
    throw new Error(`Malformed or truncated PNG: truncated ${type} chunk in ${filePath}`);
  }

  return { length, type, dataStart, nextOffset };
}

function readSize(value) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const width = value.w ?? value.width;
  const height = value.h ?? value.height;

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null;
  }

  return { w: width, h: height };
}

function readSpriteName(sprite, index) {
  return typeof sprite?.name === 'string' && sprite.name.length > 0 ? sprite.name : `#${index}`;
}

function readTagMap(tags) {
  const tagMap = new Map();

  if (!Array.isArray(tags)) {
    return tagMap;
  }

  for (const tag of tags) {
    if (typeof tag === 'string') {
      tagMap.set(tag, { name: tag });
    } else if (tag && typeof tag === 'object' && typeof tag.name === 'string' && tag.name.length > 0) {
      tagMap.set(tag.name, tag);
    }
  }

  return tagMap;
}

function validateAtlasSize(atlas, pngSize, errors) {
  const atlasSize = readSize(atlas?.size ?? atlas?.meta?.size);

  if (!atlasSize) {
    errors.push('Atlas meta size is missing or invalid.');
    return;
  }

  if (atlasSize.w !== pngSize.w || atlasSize.h !== pngSize.h) {
    errors.push(`Atlas meta size ${atlasSize.w}x${atlasSize.h} does not match PNG size ${pngSize.w}x${pngSize.h}.`);
  }
}

function validateSpriteFrame(sprite, index, pngSize, categoryConfig, errors) {
  const name = readSpriteName(sprite, index);
  const { x, y, w, h } = sprite ?? {};

  if (![x, y, w, h].every(Number.isInteger)) {
    errors.push(`Sprite "${name}" has an invalid frame rectangle.`);
    return;
  }

  if (x < 0 || y < 0 || w <= 0 || h <= 0 || x + w > pngSize.w || y + h > pngSize.h) {
    errors.push(`Sprite "${name}" frame ${x},${y},${w}x${h} is outside PNG bounds ${pngSize.w}x${pngSize.h}.`);
  }

  const expectedWidth = categoryConfig?.frameWidth;
  const expectedHeight = categoryConfig?.frameHeight;

  if (Number.isFinite(expectedWidth) && Number.isFinite(expectedHeight) && (w !== expectedWidth || h !== expectedHeight)) {
    errors.push(`Sprite "${name}" has size ${w}x${h}, expected ${expectedWidth}x${expectedHeight}.`);
  } else if (Number.isFinite(expectedWidth) && w !== expectedWidth) {
    errors.push(`Sprite "${name}" has width ${w}, expected ${expectedWidth}.`);
  } else if (Number.isFinite(expectedHeight) && h !== expectedHeight) {
    errors.push(`Sprite "${name}" has height ${h}, expected ${expectedHeight}.`);
  }
}

function validateAtlasCount(atlas, spriteCount, errors) {
  if (!atlas || typeof atlas !== 'object' || !Object.prototype.hasOwnProperty.call(atlas, 'count')) {
    return;
  }

  if (!Number.isInteger(atlas.count)) {
    errors.push('Atlas count must be an integer when present.');
    return;
  }

  if (Number.isInteger(spriteCount) && atlas.count !== spriteCount) {
    errors.push(`Atlas count ${atlas.count} does not match sprite count ${spriteCount}.`);
  }
}

function validateTagFrameRange(tag, spriteCount, errors) {
  if (!tag || typeof tag !== 'object') {
    return;
  }

  const hasFrom = Object.prototype.hasOwnProperty.call(tag, 'from');
  const hasTo = Object.prototype.hasOwnProperty.call(tag, 'to');

  if (!hasFrom && !hasTo) {
    return;
  }

  if (!Number.isInteger(tag.from) || !Number.isInteger(tag.to)) {
    errors.push(`Tag "${tag.name}" frame range must use integer from/to values.`);
    return;
  }

  if (tag.from > tag.to) {
    errors.push(`Tag "${tag.name}" frame range ${tag.from}..${tag.to} is invalid.`);
    return;
  }

  if (!Number.isInteger(spriteCount)) {
    return;
  }

  if (tag.from < 0 || tag.to < 0 || tag.from >= spriteCount || tag.to >= spriteCount) {
    const maxIndex = spriteCount - 1;
    errors.push(`Tag "${tag.name}" frame range ${tag.from}..${tag.to} is outside sprite index range 0..${maxIndex}.`);
  }
}

function validateRequiredTags(atlas, categoryConfig, spriteCount, errors) {
  const requiredTags = Array.isArray(categoryConfig?.requiredTags) ? categoryConfig.requiredTags : [];

  if (requiredTags.length === 0) {
    return;
  }

  const tags = readTagMap(atlas?.tags ?? atlas?.meta?.frameTags);

  for (const requiredTag of requiredTags) {
    const tag = tags.get(requiredTag);

    if (!tag) {
      errors.push(`Missing required tag "${requiredTag}".`);
      continue;
    }

    validateTagFrameRange(tag, spriteCount, errors);
  }
}

export function validateAtlas({ atlas, categoryConfig, pngSize }) {
  const errors = [];
  const normalizedPngSize = readSize(pngSize);

  if (!normalizedPngSize) {
    return { ok: false, errors: ['PNG size is missing or invalid.'] };
  }

  validateAtlasSize(atlas, normalizedPngSize, errors);

  if (!Array.isArray(atlas?.sprites)) {
    errors.push('Atlas sprites must be an array.');
  } else {
    atlas.sprites.forEach((sprite, index) => validateSpriteFrame(sprite, index, normalizedPngSize, categoryConfig, errors));
  }

  validateAtlasCount(atlas, Array.isArray(atlas?.sprites) ? atlas.sprites.length : null, errors);
  validateRequiredTags(atlas, categoryConfig, Array.isArray(atlas?.sprites) ? atlas.sprites.length : null, errors);

  return { ok: errors.length === 0, errors };
}

function normalizeEntrypointPath(candidate, platform) {
  const normalized = path.normalize(path.resolve(candidate));

  return platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isCliEntrypoint(argvPath = process.argv[1], moduleUrl = import.meta.url, platform = process.platform) {
  if (!argvPath) {
    return false;
  }

  const modulePath = fileURLToPath(moduleUrl);

  return normalizeEntrypointPath(modulePath, platform) === normalizeEntrypointPath(argvPath, platform);
}

if (isCliEntrypoint()) {
  const [, , category, pngFile, atlasFile] = process.argv;

  if (!category || !pngFile || !atlasFile) {
    console.error('Usage: node tools/aseprite-pipeline/validate-aseprite-export.mjs <category> <png-file> <normalized-atlas-json>');
    process.exit(1);
  }

  try {
    const config = loadConfig();
    const categoryConfig = config.categories?.[category];

    if (!categoryConfig) {
      throw new Error(`Unknown Aseprite category: ${category}`);
    }

    const atlas = JSON.parse(readFileSync(atlasFile, 'utf8'));
    const result = validateAtlas({
      atlas,
      categoryConfig,
      pngSize: readPngSize(pngFile),
    });

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
