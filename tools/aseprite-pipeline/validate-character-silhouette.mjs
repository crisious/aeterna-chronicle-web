import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng } from './decode-png.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_ROSTER = 'assets/source/aseprite/character/character-sprite-roster.json';

// Minimum number of differing silhouette pixels required between any two
// classes' idle (frame 0) pose. Encodes CT's "form-first" principle: every
// class must be distinguishable by black-on-white silhouette alone, not by
// color. Frame 0 is idle_D for every full character. Current roster's closest
// pair differs by ~384 px, so 256 leaves margin while still catching a future
// class that is a near silhouette-clone of an existing one.
export const DEFAULT_MIN_DISTANCE = 256;

function frameSilhouette(image, frameWidth, frameHeight) {
  // Frame 0 occupies the top-left frameWidth x frameHeight region of the sheet.
  const sil = new Uint8Array(frameWidth * frameHeight);
  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];
      sil[y * frameWidth + x] = alpha > 0 ? 1 : 0;
    }
  }
  return sil;
}

function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) d += 1;
  }
  return d;
}

export function validateCharacterSilhouette({
  rosterPath = DEFAULT_ROSTER,
  repoRoot = REPO_ROOT,
  minDistance = DEFAULT_MIN_DISTANCE,
} = {}) {
  const errors = [];

  let roster;
  try {
    roster = JSON.parse(readFileSync(path.resolve(repoRoot, rosterPath), 'utf8'));
  } catch (error) {
    return { ok: false, errors: [`Unable to read roster: ${error.message}`], minPair: null };
  }

  const sils = [];
  for (const character of roster.characters ?? []) {
    try {
      const image = decodePng(path.resolve(repoRoot, character.generatedPng));
      sils.push({ id: character.id, sil: frameSilhouette(image, character.frameWidth, character.frameHeight) });
    } catch (error) {
      errors.push(`Character "${character.id}" silhouette unreadable: ${error.message}`);
    }
  }

  let minPair = null;
  for (let i = 0; i < sils.length; i += 1) {
    for (let j = i + 1; j < sils.length; j += 1) {
      const distance = hamming(sils[i].sil, sils[j].sil);
      if (minPair === null || distance < minPair.distance) {
        minPair = { a: sils[i].id, b: sils[j].id, distance };
      }
      if (distance < minDistance) {
        errors.push(
          `Silhouettes of "${sils[i].id}" and "${sils[j].id}" differ by only ${distance} px (min ${minDistance}).`,
        );
      }
    }
  }

  return { ok: errors.length === 0, errors, minPair, minDistance };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = validateCharacterSilhouette();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}
