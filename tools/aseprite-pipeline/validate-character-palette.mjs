import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodePng } from './decode-png.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULT_ROSTER = 'assets/source/aseprite/character/character-sprite-roster.json';

// Post-composite unique-color ceiling per character sheet.
//
// CT/FF6 sprites used a 15-color (4bpp) palette per sprite. Our procedural
// Aseprite sprites are multi-layer with intentional alpha-blended accents
// (e.g. translucent shadow/veil layers), so the *flattened* PNG legitimately
// contains more unique colors than the source palette: each semi-transparent
// pixel composites into a new RGB value. We therefore gate a regression
// ceiling (no sheet may balloon past this) rather than the literal 15, and
// report every count so the source-palette discipline stays visible. Reducing
// toward 15 is a separate art pass (de-alpha / palette merge) with visual
// trade-offs.
export const DEFAULT_MAX_COLORS = 32;

function countOpaqueColors(image) {
  const seen = new Set();
  const { data } = image;
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha === 0) continue;
    seen.add((data[i] << 24) | (data[i + 1] << 16) | (data[i + 2] << 8) | alpha);
  }
  return seen.size;
}

export function validateCharacterPalette({
  rosterPath = DEFAULT_ROSTER,
  repoRoot = REPO_ROOT,
  maxColors = DEFAULT_MAX_COLORS,
} = {}) {
  const errors = [];
  const results = [];

  let roster;
  try {
    roster = JSON.parse(readFileSync(path.resolve(repoRoot, rosterPath), 'utf8'));
  } catch (error) {
    return { ok: false, errors: [`Unable to read roster: ${error.message}`], results };
  }

  for (const character of roster.characters ?? []) {
    const pngPath = path.resolve(repoRoot, character.generatedPng);
    let colors;
    try {
      colors = countOpaqueColors(decodePng(pngPath));
    } catch (error) {
      errors.push(`Character "${character.id}" palette unreadable: ${error.message}`);
      results.push({ id: character.id, colors: null, ok: false });
      continue;
    }
    const ok = colors <= maxColors;
    results.push({ id: character.id, colors, ok });
    if (!ok) {
      errors.push(
        `Character "${character.id}" uses ${colors} colors, exceeding the ceiling of ${maxColors}.`,
      );
    }
  }

  return { ok: errors.length === 0, errors, results };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = validateCharacterPalette();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(result.ok ? 0 : 1);
}
