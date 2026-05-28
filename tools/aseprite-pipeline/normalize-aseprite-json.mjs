import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

function toFrameEntries(frames) {
  if (Array.isArray(frames)) {
    return frames.map((frameData) => [frameData?.filename, frameData]);
  }

  if (frames && typeof frames === 'object') {
    return Object.entries(frames);
  }

  return [];
}

function normalizeSprite([filename, frameData]) {
  const frame = frameData?.frame;

  if (!filename || !frame || typeof frame !== 'object') {
    return null;
  }

  return {
    name: filename,
    x: Number.isFinite(frame.x) ? frame.x : 0,
    y: Number.isFinite(frame.y) ? frame.y : 0,
    w: Number.isFinite(frame.w) ? frame.w : 0,
    h: Number.isFinite(frame.h) ? frame.h : 0,
  };
}

function normalizeSize(size) {
  if (!size || typeof size !== 'object') {
    return { w: 0, h: 0 };
  }

  return {
    w: Number.isFinite(size.w) ? size.w : 0,
    h: Number.isFinite(size.h) ? size.h : 0,
  };
}

export function normalizeAsepriteJson({ atlasName, sheetFileName, asepriteJson }) {
  const meta = asepriteJson?.meta ?? {};
  const sprites = toFrameEntries(asepriteJson?.frames)
    .map(normalizeSprite)
    .filter(Boolean);

  return {
    atlas: atlasName,
    image: sheetFileName,
    size: normalizeSize(meta.size),
    sprites,
    tags: Array.isArray(meta.frameTags) ? meta.frameTags : [],
    layers: Array.isArray(meta.layers) ? meta.layers : [],
    count: sprites.length,
  };
}

export function normalizeFile(inputFile, outputFile, atlasName, sheetFileName) {
  const asepriteJson = JSON.parse(readFileSync(inputFile, 'utf8'));
  const normalized = normalizeAsepriteJson({ atlasName, sheetFileName, asepriteJson });

  writeFileSync(outputFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

  return normalized;
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
  const [, , inputFile, outputFile, atlasName, sheetFileName] = process.argv;

  if (!inputFile || !outputFile || !atlasName || !sheetFileName) {
    console.error('Usage: node normalize-aseprite-json.mjs <input-json> <output-json> <atlas-name> <sheet-file-name>');
    process.exit(1);
  }

  try {
    console.log(JSON.stringify(normalizeFile(inputFile, outputFile, atlasName, sheetFileName), null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
