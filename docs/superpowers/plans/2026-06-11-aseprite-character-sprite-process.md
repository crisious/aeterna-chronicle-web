# Aseprite Character Sprite Process Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aseprite로 캐릭터 스프라이트 원본을 제작하고, 검증된 PNG/JSON 산출물을 Phaser 런타임에 안전하게 연결하는 개발 프로세스를 구축한다.

**Architecture:** `.aseprite` 파일은 `assets/source/aseprite/character`의 SSOT로 관리한다. 기존 `tools/aseprite-pipeline`의 export, normalize, validate 기능 위에 character 전용 roster와 build wrapper를 추가하고, 런타임은 `characterSpriteManifest`를 통해 texture key와 animation frame 계약을 읽는다. 첫 파일럿은 `ether_knight` 1방향 idle/walk로 적용한 뒤 full motion과 5방향 제작으로 확장한다.

**Tech Stack:** Aseprite 1.3.17.2, Node.js, Vitest, Phaser 3, TypeScript, existing `tools/aseprite-pipeline`.

---

## Current Context

- Aseprite 연결은 정상이다. `npm run art:aseprite:check`가 `C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe`를 반환한다.
- `tools/aseprite-pipeline/aseprite.config.json`의 `character` 규격은 64x64, `sheetType: rows`, 필수 tag `idle_D`, `walk_D`, `attack_melee_D`, `cast_D`, `hit_D`, `death_D`다.
- `docs/art-production/sprite-spec.md`는 full character production 기준을 5방향, 35프레임 per 방향, 실제 제작 175프레임으로 정의한다.
- 현재 `GameScene`은 `player_sprite`를 `assets/generated/characters/class_main/char_illust_ether_knight_front.png`로 로드한다.
- 현재 `BattleScene`은 `char_battle_${classId}`를 `assets/generated/characters/class_main/char_illust_${classId}_side.png`로 로드한다.
- Aseprite 팔레트는 `assets/source/aseprite/palettes/aeterna-core.gpl`, 브러쉬 기준은 `assets/source/aseprite/brushes/README.md`다.

## File Structure

Create:
- `assets/source/aseprite/character/character-sprite-roster.json` — 캐릭터별 source/export/runtime 경로와 제작 상태.
- `tools/aseprite-pipeline/validate-character-sprite-roster.mjs` — 캐릭터 roster 검증.
- `tools/aseprite-pipeline/build-character-sprite.mjs` — export, normalize, validate, optional publish를 한 번에 실행하는 wrapper.
- `client/src/assets/characterSpriteManifest.ts` — 런타임 캐릭터 스프라이트 key/path/frame 계약.
- `tests/unit/characterSpriteManifest.test.ts` — manifest 계약 검증.
- `assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite` — 에테르 기사 파일럿 원본.
- `docs/art-production/character-sprite-production.md` — 아티스트용 캐릭터 스프라이트 제작 절차.

Modify:
- `package.json` — `art:character:roster`, `art:character:build` script 추가.
- `tests/unit/asepritePipeline.test.ts` — character roster/build wrapper 단위 테스트 추가.
- `client/src/scenes/GameScene.ts` — field player sprite 로딩을 manifest 기반으로 전환.
- `client/src/scenes/BattleScene.ts` — battle player sprite 로딩을 manifest 기반으로 전환.
- `tests/integration/asset-integrity.test.ts` — character sprite manifest 경로 검증 추가.
- `tools/aseprite-pipeline/README.md` — character sprite workflow 링크 추가.

Do not modify in this plan:
- 기존 클래스 일러스트 PNG 파일 삭제.
- 전체 캐릭터 6종 일괄 교체.
- 스킬/전투 밸런스 데이터.
- 기존 atlas 파일 대량 병합 자동화. 첫 단계는 파일럿 단일 character sheet publish까지만 한다.

---

### Task 1: Character Sprite Roster Contract

**Files:**
- Create: `assets/source/aseprite/character/character-sprite-roster.json`
- Create: `tools/aseprite-pipeline/validate-character-sprite-roster.mjs`
- Modify: `tests/unit/asepritePipeline.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing roster tests**

Append this block to `tests/unit/asepritePipeline.test.ts`:

```ts
describe('character sprite roster', () => {
  test('validates the Ether Knight pilot roster entry', async () => {
    const { validateCharacterSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs');
    const roster = {
      version: 1,
      characters: [
        {
          id: 'char_ether_knight_base',
          classId: 'ether_knight',
          phase: 'pilot',
          source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
          generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
          generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
          runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
          runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
          textureKey: 'char_sprite_ether_knight_base',
          frameWidth: 64,
          frameHeight: 64,
          directions: ['D'],
          motions: ['idle', 'walk'],
          requiredTags: ['idle_D', 'walk_D'],
          status: 'planned',
        },
      ],
    };

    expect(validateCharacterSpriteRoster(roster).errors).toEqual([]);
  });

  test('rejects character entries outside source/export/runtime roots', async () => {
    const { validateCharacterSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs');
    const result = validateCharacterSpriteRoster({
      version: 1,
      characters: [
        {
          id: 'bad_character',
          classId: 'bad',
          phase: 'pilot',
          source: '../bad.aseprite',
          generatedPng: 'tmp/bad.png',
          generatedJson: 'tmp/bad.json',
          runtimePng: 'tmp/bad.png',
          runtimeJson: 'tmp/bad.json',
          textureKey: '',
          frameWidth: 64,
          frameHeight: 64,
          directions: [],
          motions: [],
          requiredTags: [],
          status: 'planned',
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'bad_character: source must be inside assets/source/aseprite/character',
        'bad_character: generatedPng must be inside assets/generated/aseprite/character',
        'bad_character: generatedJson must be inside assets/generated/aseprite/character',
        'bad_character: runtimePng must be inside client/public/assets/generated/characters/sprites',
        'bad_character: runtimeJson must be inside client/public/assets/generated/characters/sprites',
        'bad_character: textureKey is required',
        'bad_character: directions must include at least one direction',
        'bad_character: motions must include at least one motion',
      ]),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
```

Expected: FAIL with an import error for `validate-character-sprite-roster.mjs`.

- [ ] **Step 3: Create the roster validator**

Create `tools/aseprite-pipeline/validate-character-sprite-roster.mjs`:

```js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROSTER_PATH = path.resolve('assets/source/aseprite/character/character-sprite-roster.json');
const SOURCE_ROOT = 'assets/source/aseprite/character';
const GENERATED_ROOT = 'assets/generated/aseprite/character';
const RUNTIME_ROOT = 'client/public/assets/generated/characters/sprites';
const VALID_STATUSES = new Set(['planned', 'source-ready', 'exported', 'validated', 'published', 'in-game-verified']);
const VALID_DIRECTIONS = new Set(['D', 'DL', 'L', 'UL', 'U']);
const VALID_MOTIONS = new Set(['idle', 'walk', 'attack_melee', 'attack_ranged', 'cast', 'hit', 'death']);

export function loadCharacterSpriteRoster(rosterPath = ROSTER_PATH) {
  return JSON.parse(readFileSync(rosterPath, 'utf8'));
}

function isInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateEntry(entry, errors) {
  const id = typeof entry?.id === 'string' && entry.id.length > 0 ? entry.id : '<missing-id>';

  if (!isInside(SOURCE_ROOT, entry.source)) {
    errors.push(`${id}: source must be inside ${SOURCE_ROOT}`);
  }

  if (!isInside(GENERATED_ROOT, entry.generatedPng)) {
    errors.push(`${id}: generatedPng must be inside ${GENERATED_ROOT}`);
  }

  if (!isInside(GENERATED_ROOT, entry.generatedJson)) {
    errors.push(`${id}: generatedJson must be inside ${GENERATED_ROOT}`);
  }

  if (!isInside(RUNTIME_ROOT, entry.runtimePng)) {
    errors.push(`${id}: runtimePng must be inside ${RUNTIME_ROOT}`);
  }

  if (!isInside(RUNTIME_ROOT, entry.runtimeJson)) {
    errors.push(`${id}: runtimeJson must be inside ${RUNTIME_ROOT}`);
  }

  if (typeof entry.textureKey !== 'string' || entry.textureKey.length === 0) {
    errors.push(`${id}: textureKey is required`);
  }

  if (entry.frameWidth !== 64 || entry.frameHeight !== 64) {
    errors.push(`${id}: frame size must be 64x64`);
  }

  if (!Array.isArray(entry.directions) || entry.directions.length === 0) {
    errors.push(`${id}: directions must include at least one direction`);
  } else {
    for (const direction of entry.directions) {
      if (!VALID_DIRECTIONS.has(direction)) {
        errors.push(`${id}: unsupported direction ${direction}`);
      }
    }
  }

  if (!Array.isArray(entry.motions) || entry.motions.length === 0) {
    errors.push(`${id}: motions must include at least one motion`);
  } else {
    for (const motion of entry.motions) {
      if (!VALID_MOTIONS.has(motion)) {
        errors.push(`${id}: unsupported motion ${motion}`);
      }
    }
  }

  if (!Array.isArray(entry.requiredTags)) {
    errors.push(`${id}: requiredTags must be an array`);
  }

  if (!VALID_STATUSES.has(entry.status)) {
    errors.push(`${id}: invalid status ${entry.status}`);
  }
}

export function validateCharacterSpriteRoster(roster) {
  const errors = [];

  if (roster?.version !== 1) {
    errors.push('version must be 1');
  }

  if (!Array.isArray(roster?.characters)) {
    errors.push('characters must be an array');
    return { ok: false, errors };
  }

  const ids = new Set();
  const textureKeys = new Set();
  for (const entry of roster.characters) {
    if (ids.has(entry.id)) errors.push(`${entry.id}: duplicate id`);
    if (textureKeys.has(entry.textureKey)) errors.push(`${entry.id}: duplicate textureKey ${entry.textureKey}`);
    ids.add(entry.id);
    textureKeys.add(entry.textureKey);
    validateEntry(entry, errors);
  }

  return { ok: errors.length === 0, errors };
}

function isCliEntrypoint(argvPath = process.argv[1], moduleUrl = import.meta.url) {
  if (!argvPath) return false;
  return path.resolve(argvPath) === path.resolve(fileURLToPath(moduleUrl));
}

if (isCliEntrypoint()) {
  const result = validateCharacterSpriteRoster(loadCharacterSpriteRoster());
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
```

- [ ] **Step 4: Create the pilot roster**

Create `assets/source/aseprite/character/character-sprite-roster.json`:

```json
{
  "version": 1,
  "characters": [
    {
      "id": "char_ether_knight_base",
      "classId": "ether_knight",
      "phase": "pilot",
      "source": "assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite",
      "generatedPng": "assets/generated/aseprite/character/char_ether_knight_base.png",
      "generatedJson": "assets/generated/aseprite/character/char_ether_knight_base.json",
      "runtimePng": "client/public/assets/generated/characters/sprites/char_ether_knight_base.png",
      "runtimeJson": "client/public/assets/generated/characters/sprites/char_ether_knight_base.json",
      "textureKey": "char_sprite_ether_knight_base",
      "frameWidth": 64,
      "frameHeight": 64,
      "directions": ["D"],
      "motions": ["idle", "walk"],
      "requiredTags": ["idle_D", "walk_D"],
      "status": "planned"
    }
  ]
}
```

- [ ] **Step 5: Add package script**

Modify `package.json` scripts:

```json
"art:character:roster": "node tools/aseprite-pipeline/validate-character-sprite-roster.mjs"
```

- [ ] **Step 6: Run tests and roster validation**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
npm run art:character:roster
git diff --check -- assets/source/aseprite/character/character-sprite-roster.json tools/aseprite-pipeline/validate-character-sprite-roster.mjs tests/unit/asepritePipeline.test.ts package.json
```

Expected: Vitest PASS, roster validation prints `"ok": true`, diff check exit 0.

- [ ] **Step 7: Commit**

```powershell
git add assets/source/aseprite/character/character-sprite-roster.json tools/aseprite-pipeline/validate-character-sprite-roster.mjs tests/unit/asepritePipeline.test.ts package.json
git commit -m "feat(art): add character sprite production roster"
```

---

### Task 2: Character Build Wrapper

**Files:**
- Create: `tools/aseprite-pipeline/build-character-sprite.mjs`
- Modify: `tests/unit/asepritePipeline.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing build wrapper tests**

Append this block to `tests/unit/asepritePipeline.test.ts`:

```ts
describe('character sprite build wrapper', () => {
  test('resolveCharacterBuildTarget reads roster entry and derives normalized output names', async () => {
    const { resolveCharacterBuildTarget } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');
    const roster = {
      version: 1,
      characters: [
        {
          id: 'char_ether_knight_base',
          classId: 'ether_knight',
          source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
          generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
          generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
          runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
          runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
          textureKey: 'char_sprite_ether_knight_base',
          requiredTags: ['idle_D', 'walk_D'],
        },
      ],
    };

    expect(resolveCharacterBuildTarget(roster, 'char_ether_knight_base')).toEqual({
      id: 'char_ether_knight_base',
      category: 'character',
      atlasName: 'char_ether_knight_base',
      source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
      generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
      rawJson: 'assets/generated/aseprite/character/char_ether_knight_base.aseprite.json',
      generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
      runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
      runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
    });
  });

  test('resolveCharacterBuildTarget rejects unknown ids', async () => {
    const { resolveCharacterBuildTarget } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');

    expect(() => resolveCharacterBuildTarget({ version: 1, characters: [] }, 'missing')).toThrow('Unknown character sprite id: missing');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
```

Expected: FAIL with an import error for `build-character-sprite.mjs`.

- [ ] **Step 3: Create build wrapper**

Create `tools/aseprite-pipeline/build-character-sprite.mjs`:

```js
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exportAseprite } from './export-aseprite.mjs';
import { normalizeFile } from './normalize-aseprite-json.mjs';
import { loadConfig, readPngSize, validateAtlas } from './validate-aseprite-export.mjs';
import { loadCharacterSpriteRoster, validateCharacterSpriteRoster } from './validate-character-sprite-roster.mjs';

export function resolveCharacterBuildTarget(roster, id) {
  const entry = roster.characters?.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error(`Unknown character sprite id: ${id}`);
  }

  return {
    id: entry.id,
    category: 'character',
    atlasName: entry.id,
    source: entry.source,
    generatedPng: entry.generatedPng,
    rawJson: entry.generatedJson.replace(/\.json$/u, '.aseprite.json'),
    generatedJson: entry.generatedJson,
    runtimePng: entry.runtimePng,
    runtimeJson: entry.runtimeJson,
  };
}

export function buildCharacterSprite({ id, publish = false, dependencies = {} }) {
  const {
    loadRoster = loadCharacterSpriteRoster,
    validateRoster = validateCharacterSpriteRoster,
    runExport = exportAseprite,
    normalize = normalizeFile,
    readSize = readPngSize,
    loadAsepriteConfig = loadConfig,
    copyFile = copyFileSync,
    mkdir = mkdirSync,
  } = dependencies;

  const roster = loadRoster();
  const rosterResult = validateRoster(roster);
  if (!rosterResult.ok) {
    throw new Error(`Character roster is invalid:\n${rosterResult.errors.join('\n')}`);
  }

  const target = resolveCharacterBuildTarget(roster, id);
  const entry = roster.characters.find((candidate) => candidate.id === id);
  runExport({ category: target.category, sourceFile: target.source });
  normalize(target.rawJson, target.generatedJson, target.atlasName, path.basename(target.generatedPng));

  const config = loadAsepriteConfig();
  const atlas = JSON.parse(dependencies.readText?.(target.generatedJson) ?? readFileSync(target.generatedJson, 'utf8'));
  const categoryConfig = {
    ...config.categories.character,
    requiredTags: Array.isArray(entry?.requiredTags) ? entry.requiredTags : config.categories.character.requiredTags,
  };
  const validation = validateAtlas({
    atlas,
    categoryConfig,
    pngSize: readSize(target.generatedPng),
  });

  if (!validation.ok) {
    throw new Error(`Character sprite validation failed:\n${validation.errors.join('\n')}`);
  }

  if (publish) {
    mkdir(path.dirname(target.runtimePng), { recursive: true });
    copyFile(target.generatedPng, target.runtimePng);
    copyFile(target.generatedJson, target.runtimeJson);
  }

  return { target, validation };
}

function isCliEntrypoint(argvPath = process.argv[1], moduleUrl = import.meta.url) {
  if (!argvPath) return false;
  return path.resolve(argvPath) === path.resolve(fileURLToPath(moduleUrl));
}

if (isCliEntrypoint()) {
  const [, , id, maybePublish] = process.argv;
  if (!id) {
    console.error('Usage: node tools/aseprite-pipeline/build-character-sprite.mjs <character-id> [--publish]');
    process.exit(1);
  }

  try {
    const result = buildCharacterSprite({ id, publish: maybePublish === '--publish' });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

- [ ] **Step 4: Add package script**

Modify `package.json` scripts:

```json
"art:character:build": "node tools/aseprite-pipeline/build-character-sprite.mjs"
```

- [ ] **Step 5: Run tests**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
git diff --check -- tools/aseprite-pipeline/build-character-sprite.mjs tests/unit/asepritePipeline.test.ts package.json
```

Expected: PASS and diff check exit 0.

- [ ] **Step 6: Commit**

```powershell
git add tools/aseprite-pipeline/build-character-sprite.mjs tests/unit/asepritePipeline.test.ts package.json
git commit -m "feat(art): add character sprite build wrapper"
```

---

### Task 3: Runtime Character Sprite Manifest

**Files:**
- Create: `client/src/assets/characterSpriteManifest.ts`
- Create: `tests/unit/characterSpriteManifest.test.ts`

- [ ] **Step 1: Write manifest tests**

Create `tests/unit/characterSpriteManifest.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  CHARACTER_SPRITE_MANIFEST,
  getCharacterSpriteResource,
  getCharacterSpriteAnimationKey,
} from '../../client/src/assets/characterSpriteManifest';

describe('character sprite manifest', () => {
  test('defines Ether Knight pilot runtime paths', () => {
    expect(getCharacterSpriteResource('ether_knight')).toEqual({
      classId: 'ether_knight',
      textureKey: 'char_sprite_ether_knight_base',
      imagePath: 'assets/generated/characters/sprites/char_ether_knight_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_ether_knight_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: ['D'],
      motions: ['idle', 'walk'],
    });
  });

  test('animation keys are stable and class-scoped', () => {
    expect(getCharacterSpriteAnimationKey('ether_knight', 'idle', 'D')).toBe('char_sprite_ether_knight_idle_D');
    expect(getCharacterSpriteAnimationKey('ether_knight', 'walk', 'D')).toBe('char_sprite_ether_knight_walk_D');
  });

  test('texture keys are unique', () => {
    const keys = new Set<string>();
    for (const entry of CHARACTER_SPRITE_MANIFEST) {
      expect(keys.has(entry.textureKey)).toBe(false);
      keys.add(entry.textureKey);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/characterSpriteManifest.test.ts
```

Expected: FAIL because `characterSpriteManifest.ts` does not exist.

- [ ] **Step 3: Create manifest**

Create `client/src/assets/characterSpriteManifest.ts`:

```ts
export type CharacterMotion = 'idle' | 'walk' | 'attack_melee' | 'attack_ranged' | 'cast' | 'hit' | 'death';
export type CharacterDirection = 'D' | 'DL' | 'L' | 'UL' | 'U';

export interface CharacterSpriteResource {
  classId: string;
  textureKey: string;
  imagePath: string;
  jsonPath: string;
  frameWidth: number;
  frameHeight: number;
  directions: CharacterDirection[];
  motions: CharacterMotion[];
}

export const CHARACTER_SPRITE_MANIFEST: CharacterSpriteResource[] = [
  {
    classId: 'ether_knight',
    textureKey: 'char_sprite_ether_knight_base',
    imagePath: 'assets/generated/characters/sprites/char_ether_knight_base.png',
    jsonPath: 'assets/generated/characters/sprites/char_ether_knight_base.json',
    frameWidth: 64,
    frameHeight: 64,
    directions: ['D'],
    motions: ['idle', 'walk'],
  },
];

export function getCharacterSpriteResource(classId: string): CharacterSpriteResource | undefined {
  return CHARACTER_SPRITE_MANIFEST.find((entry) => entry.classId === classId);
}

export function getCharacterSpriteAnimationKey(classId: string, motion: CharacterMotion, direction: CharacterDirection): string {
  return `char_sprite_${classId}_${motion}_${direction}`;
}
```

- [ ] **Step 4: Run manifest tests**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/characterSpriteManifest.test.ts
git diff --check -- client/src/assets/characterSpriteManifest.ts tests/unit/characterSpriteManifest.test.ts
```

Expected: PASS and diff check exit 0.

- [ ] **Step 5: Commit**

```powershell
git add client/src/assets/characterSpriteManifest.ts tests/unit/characterSpriteManifest.test.ts
git commit -m "feat(client): add character sprite manifest"
```

---

### Task 4: Ether Knight Aseprite Pilot Source

**Files:**
- Create: `assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite`
- Modify: `assets/source/aseprite/character/character-sprite-roster.json`
- Create: `docs/art-production/character-sprite-production.md`

- [ ] **Step 1: Create artist workflow document**

Create `docs/art-production/character-sprite-production.md`:

```markdown
# Character Sprite Production

## Pilot Target

첫 캐릭터 파일럿은 `char_ether_knight_base`다.

## Aseprite Document Settings

| Setting | Value |
|---------|-------|
| Source Canvas | 64x64 |
| Exported Sheet | 640x64 for the 10-frame pilot |
| Frame Size | 64x64 |
| Frames | 10 |
| Direction | `D` only |
| Motions | `idle` 4 frames, `walk` 6 frames |
| Color Mode | RGB Color or Indexed Color |
| Background | Transparent |
| Palette | `assets/source/aseprite/palettes/aeterna-core.gpl` |
| Layers | `shadow`, `body`, `armor`, `weapon`, `accent`, hidden `reference` |

## Required Tags

| Tag | Frames |
|-----|--------|
| `idle_D` | 0-3 |
| `walk_D` | 4-9 |

## Visual Rules

- 2px black outline.
- No anti-aliasing.
- Bottom-center anchor: feet near x=32, y=58±2 in every frame.
- Use `Memory Cyan`, `Silver`, `Steel`, `Gold Accent`, and `Deep Navy` from `aeterna-core.gpl`.
- Frame 0 must read as the base idle pose at 64x64 and 32x32 preview scale.

## Promotion Rule

The pilot can move from `source-ready` to `published` only after:

1. `npm run art:character:build -- char_ether_knight_base --publish` exits 0.
2. `tests/unit/characterSpriteManifest.test.ts` passes.
3. Field and battle scenes load without missing texture errors.
```

- [ ] **Step 2: Create source directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path assets/source/aseprite/character/ether_knight
```

Expected: directory exists.

- [ ] **Step 3: Create Aseprite source manually**

Open Aseprite and save this file:

```text
assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite
```

Use exact settings:

| Setting | Value |
|---------|-------|
| Source Canvas | 64x64 |
| Exported Sheet | 640x64 after export |
| Frames | 10 |
| Tags | `idle_D` frames 0-3, `walk_D` frames 4-9 |
| Layers | `shadow`, `body`, `armor`, `weapon`, `accent`, hidden `reference` |
| Palette | `assets/source/aseprite/palettes/aeterna-core.gpl` |

- [ ] **Step 4: Verify source exists**

Run:

```powershell
Test-Path assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite
```

Expected: `True`.

- [ ] **Step 5: Update roster status**

In `assets/source/aseprite/character/character-sprite-roster.json`, update:

```json
"status": "source-ready"
```

- [ ] **Step 6: Validate roster and docs**

Run:

```powershell
npm run art:character:roster
git diff --check -- assets/source/aseprite/character/character-sprite-roster.json docs/art-production/character-sprite-production.md
```

Expected: PASS and diff check exit 0.

- [ ] **Step 7: Commit**

```powershell
git add assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite assets/source/aseprite/character/character-sprite-roster.json docs/art-production/character-sprite-production.md
git commit -m "art(character): add ether knight aseprite pilot source"
```

---

### Task 5: Build And Publish Ether Knight Pilot

**Files:**
- Generated: `assets/generated/aseprite/character/char_ether_knight_base.png`
- Generated: `assets/generated/aseprite/character/char_ether_knight_base.aseprite.json`
- Generated: `assets/generated/aseprite/character/char_ether_knight_base.json`
- Create: `client/public/assets/generated/characters/sprites/char_ether_knight_base.png`
- Create: `client/public/assets/generated/characters/sprites/char_ether_knight_base.json`
- Modify: `assets/source/aseprite/character/character-sprite-roster.json`
- Modify: `tests/integration/asset-integrity.test.ts`

- [ ] **Step 1: Build and publish pilot**

Run:

```powershell
npm run art:character:build -- char_ether_knight_base --publish
```

Expected:

```text
assets/generated/aseprite/character/char_ether_knight_base.png
assets/generated/aseprite/character/char_ether_knight_base.aseprite.json
assets/generated/aseprite/character/char_ether_knight_base.json
client/public/assets/generated/characters/sprites/char_ether_knight_base.png
client/public/assets/generated/characters/sprites/char_ether_knight_base.json
```

- [ ] **Step 2: Update roster status**

In `assets/source/aseprite/character/character-sprite-roster.json`, update:

```json
"status": "published"
```

- [ ] **Step 3: Extend asset integrity test for character sprite manifest**

In `tests/integration/asset-integrity.test.ts`, add this helper after `extractAssetPaths`:

```ts
function extractCharacterSpriteManifestPaths(): { file: string; assetPath: string; type: string }[] {
  const manifestPath = path.join(CLIENT_SRC, 'assets/characterSpriteManifest.ts');
  if (!fs.existsSync(manifestPath)) return [];

  const content = fs.readFileSync(manifestPath, 'utf-8');
  const results: { file: string; assetPath: string; type: string }[] = [];
  const pathRegex = /\b(?:imagePath|jsonPath):\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = pathRegex.exec(content)) !== null) {
    results.push({
      file: path.relative(ROOT, manifestPath),
      assetPath: match[1],
      type: match[1].endsWith('.json') ? 'character_sprite_json' : 'character_sprite_image',
    });
  }

  return results;
}
```

Then replace:

```ts
const assetRefs = extractAssetPaths(tsFiles);
```

with:

```ts
const assetRefs = [...extractAssetPaths(tsFiles), ...extractCharacterSpriteManifestPaths()];
```

- [ ] **Step 4: Verify published files**

Run:

```powershell
npm run art:character:roster
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts tests/unit/characterSpriteManifest.test.ts
npx vitest run --config tests/vitest.config.ts tests/integration/asset-integrity.test.ts
git diff --check -- assets/generated/aseprite/character client/public/assets/generated/characters/sprites assets/source/aseprite/character/character-sprite-roster.json tests/integration/asset-integrity.test.ts
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add assets/generated/aseprite/character client/public/assets/generated/characters/sprites assets/source/aseprite/character/character-sprite-roster.json tests/integration/asset-integrity.test.ts
git commit -m "art(character): build and publish ether knight sprite pilot"
```

---

### Task 6: Field And Battle Runtime Integration

**Files:**
- Modify: `client/src/scenes/GameScene.ts`
- Modify: `client/src/scenes/BattleScene.ts`
- Modify: `tests/unit/characterSpriteManifest.test.ts`

- [ ] **Step 1: Add manifest assertion for published paths**

Append this test to `tests/unit/characterSpriteManifest.test.ts`:

```ts
test('published Ether Knight paths target client public generated sprite directory', () => {
  const resource = getCharacterSpriteResource('ether_knight');

  expect(resource?.imagePath).toBe('assets/generated/characters/sprites/char_ether_knight_base.png');
  expect(resource?.jsonPath).toBe('assets/generated/characters/sprites/char_ether_knight_base.json');
});
```

- [ ] **Step 2: Import manifest in GameScene**

In `client/src/scenes/GameScene.ts`, add:

```ts
import { getCharacterSpriteResource } from '../assets/characterSpriteManifest';
```

- [ ] **Step 3: Preload field character sprite with fallback**

In `GameScene.preload()`, replace:

```ts
this.load.image('player_sprite', 'assets/generated/characters/class_main/char_illust_ether_knight_front.png');
```

with:

```ts
const playerSpriteResource = getCharacterSpriteResource(this.currentCharacterClassId);
if (playerSpriteResource && !this.textures.exists(playerSpriteResource.textureKey)) {
  this.load.spritesheet(playerSpriteResource.textureKey, playerSpriteResource.imagePath, {
    frameWidth: playerSpriteResource.frameWidth,
    frameHeight: playerSpriteResource.frameHeight,
  });
}
this.load.image('player_sprite', 'assets/generated/characters/class_main/char_illust_ether_knight_front.png');
```

Also persist the incoming `characterClass` scene data on the scene, defaulting to `ether_knight`. Return paths from `GameScene` to `WorldScene` must forward that value.

```ts
this.currentCharacterClassId = data?.characterClass?.trim() || 'ether_knight';
```

- [ ] **Step 4: Use field sprite texture when available**

In `GameScene._ensureFallbackTextures()`, keep the existing `player_sprite` fallback unchanged.

In the code that creates `this.player`, replace:

```ts
this.player = this.physics.add.sprite(640, 360, 'player_sprite');
```

with:

```ts
const playerSpriteResource = getCharacterSpriteResource(this.currentCharacterClassId);
const playerTextureKey = playerSpriteResource && this.textures.exists(playerSpriteResource.textureKey)
  ? playerSpriteResource.textureKey
  : 'player_sprite';
this.player = this.physics.add.sprite(640, 360, playerTextureKey, 0);
if (playerSpriteResource && playerTextureKey === playerSpriteResource.textureKey) {
  this.player.setFrame(0);
  this.player.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}
```

- [ ] **Step 5: Import manifest in BattleScene**

In `client/src/scenes/BattleScene.ts`, add:

```ts
import { getCharacterSpriteResource } from '../assets/characterSpriteManifest';
```

- [ ] **Step 6: Preload battle character pilot**

In `BattleScene.preload()`, after the existing `classIds` loop that loads `char_battle_${cid}`, add:

```ts
for (const cid of classIds) {
  const spriteResource = getCharacterSpriteResource(cid);
  if (spriteResource && !this.textures.exists(spriteResource.textureKey)) {
    this.load.spritesheet(spriteResource.textureKey, spriteResource.imagePath, {
      frameWidth: spriteResource.frameWidth,
      frameHeight: spriteResource.frameHeight,
    });
  }
}
```

- [ ] **Step 7: Prefer pilot sprite for Ether Knight battle actor**

In the battle actor creation path where `texKey` is currently `char_battle_${classId}`, replace the texture choice with:

```ts
const pilotSprite = getCharacterSpriteResource(classId);
const texKey = pilotSprite && this.textures.exists(pilotSprite.textureKey)
  ? pilotSprite.textureKey
  : `char_battle_${classId}`;
```

When the manifest texture is selected, create the actor with frame `0`, call `setFrame(0)`, and keep `Phaser.Textures.FilterMode.NEAREST`. Keep the existing static PNG and rectangle fallback behavior for missing textures.

- [ ] **Step 8: Run focused tests**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/characterSpriteManifest.test.ts
npx vitest run --config tests/vitest.config.ts tests/integration/asset-integrity.test.ts
git diff --check -- client/src/scenes/GameScene.ts client/src/scenes/BattleScene.ts tests/unit/characterSpriteManifest.test.ts
```

Expected: PASS and diff check exit 0.

- [ ] **Step 9: Browser QA**

Run:

```powershell
npm run qa:browser
```

Expected:

- Field scene loads without missing texture error for `char_sprite_ether_knight_base`.
- Player remains visible in field as a 64x64 frame, not a 640x64 strip.
- Battle scene loads an Ether Knight actor as a 64x64 frame without missing texture error.
- Existing static PNG fallback still works when the pilot texture is absent.
- `?debugScene=world&class=ether_knight&era=present` preserves `characterClass`.
- `?debugScene=battle&class=ether_knight&era=present` renders `char_sprite_ether_knight_base` frame `0`.

- [ ] **Step 10: Commit**

```powershell
git add client/src/scenes/GameScene.ts client/src/scenes/BattleScene.ts tests/unit/characterSpriteManifest.test.ts
git commit -m "feat(client): load ether knight aseprite sprite pilot"
```

---

### Task 7: Production Documentation And Expansion Gate

**Status:** 2026-06-11 문서 내용 갱신 및 검증 완료. Commit step은 사용자가 별도로 요청할 때 진행한다.

**Files:**
- Modify: `tools/aseprite-pipeline/README.md`
- Modify: `docs/art-production/production-guide.md`
- Modify: `docs/art-production/character-sprite-production.md`

- [x] **Step 1: Add character workflow to Aseprite README**

Append to `tools/aseprite-pipeline/README.md`:

```markdown
## Character Sprite Workflow

캐릭터 스프라이트는 `character-sprite-roster.json`을 기준으로 제작한다.

```powershell
npm run art:character:roster
npm run art:character:build -- char_ether_knight_base
npm run art:character:build -- char_ether_knight_base --publish
```

첫 파일럿은 `char_ether_knight_base`이며, 64x64 프레임, `idle_D`, `walk_D`만 런타임에 먼저 연결한다. 런타임은 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`와 `setFrame(0)`로 640x64 strip 전체 렌더링을 방지한다. full motion 제작은 파일럿이 field/battle browser QA를 통과한 뒤 `attack_melee_D`, `cast_D`, `hit_D`, `death_D`를 추가한다.

Browser QA:

```text
?debugScene=world&class=ether_knight&era=present
?debugScene=battle&class=ether_knight&era=present
```
```

- [x] **Step 2: Add guide link to production guide**

In `docs/art-production/production-guide.md`, add this paragraph after the Aseprite manual correction loop:

```markdown
캐릭터 스프라이트는 [Character Sprite Production](character-sprite-production.md)을 기준으로 제작한다. `char_ether_knight_base` 파일럿이 field/battle 런타임 QA를 통과하기 전에는 다른 클래스의 full motion 제작을 시작하지 않는다.
```

- [x] **Step 3: Add expansion table**

Append to `docs/art-production/character-sprite-production.md`:

```markdown
## Expansion Order

| Order | Class ID | Scope |
|-------|----------|-------|
| 1 | `ether_knight` | `idle_D`, `walk_D` pilot |
| 2 | `ether_knight` | full D direction motions |
| 3 | `ether_knight` | 5 produced directions: D, DL, L, UL, U |
| 4 | `memory_weaver` | `idle_D`, `walk_D` pilot |
| 5 | `shadow_weaver` | `idle_D`, `walk_D` pilot |
| 6 | `memory_breaker` | `idle_D`, `walk_D` pilot |
| 7 | `time_guardian` | `idle_D`, `walk_D` pilot |
| 8 | `void_wanderer` | `idle_D`, `walk_D` pilot |

## Runtime Acceptance

- `npx vitest run --config tests/vitest.config.ts tests/unit/characterSpriteManifest.test.ts` passes.
- `npx vitest run --config tests/vitest.config.ts tests/integration/asset-integrity.test.ts` passes.
- Browser QA shows field and battle actors without missing texture errors at `?debugScene=world&class=ether_knight&era=present` and `?debugScene=battle&class=ether_knight&era=present`.
- Static PNG fallback remains available until every class has a validated Aseprite pilot.
```

- [x] **Step 4: Run doc checks**

Run:

```powershell
git diff --check -- tools/aseprite-pipeline/README.md docs/art-production/production-guide.md docs/art-production/character-sprite-production.md
```

Expected: diff check exit 0.

- [ ] **Step 5: Commit**

```powershell
git add tools/aseprite-pipeline/README.md docs/art-production/production-guide.md docs/art-production/character-sprite-production.md
git commit -m "docs(art): document character sprite production process"
```

---

## Rollout Order

1. Build character roster and validation.
2. Build character export/normalize/validate/publish wrapper.
3. Add runtime manifest.
4. Create `char_ether_knight_base.aseprite` manually in Aseprite.
5. Publish the pilot sheet and normalized JSON.
6. Connect `GameScene` and `BattleScene` to the pilot texture with static PNG fallback.
7. Expand `ether_knight` from idle/walk D direction to full D direction.
8. Expand `ether_knight` to 5 produced directions.
9. Apply Tasks 4-6 to `memory_weaver`, `shadow_weaver`, `memory_breaker`, `time_guardian`, and `void_wanderer`, one class at a time with the same publish and Browser QA gates.

## Quality Gates

- Aseprite source exists under `assets/source/aseprite/character/{classId}`.
- Source uses `aeterna-core.gpl` or an approved class palette.
- Source uses hard-edge brushes with no anti-aliasing.
- Frame size is exactly 64x64.
- `idle_D` and `walk_D` exist before runtime pilot.
- Full production requires `idle_D`, `walk_D`, `attack_melee_D`, `cast_D`, `hit_D`, `death_D`.
- `npm run art:character:roster` returns ok.
- `npm run art:character:build -- char_ether_knight_base --publish` exits 0.
- `npx vitest run --config tests/vitest.config.ts tests/unit/characterSpriteManifest.test.ts` passes.
- `npx vitest run --config tests/vitest.config.ts tests/integration/asset-integrity.test.ts` passes.
- Browser QA shows no missing texture error for `char_sprite_ether_knight_base`.

## Risks

- Full character production is much larger than the first pilot. Do not start 175-frame production until the 10-frame pilot is verified in field and battle.
- Current runtime uses static class illustration PNGs. Keep fallback paths until every class has validated Aseprite sprite sheets.
- Aseprite files are binary; they must remain covered by Git LFS policy.
- Browser QA may report unrelated legacy missing assets. Treat missing `char_sprite_ether_knight_base` as blocking and report unrelated failures separately.

## References

- `tools/aseprite-pipeline/README.md`
- `tools/aseprite-pipeline/aseprite.config.json`
- `assets/source/aseprite/palettes/aeterna-core.gpl`
- `assets/source/aseprite/brushes/README.md`
- `docs/art-production/sprite-spec.md`
- `docs/art-production/qa-checklist.md`
- `client/src/scenes/GameScene.ts`
- `client/src/scenes/BattleScene.ts`
- `client/src/assets/AssetManager.ts`
