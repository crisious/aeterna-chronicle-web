# Sprite Resource Development Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에테르나 크로니클의 주요 NPC, 플레이어, 몬스터, VFX, UI 스프라이트를 Aseprite 원본 중심으로 제작하고 검증된 런타임 리소스로 연결한다.

**Architecture:** `.aseprite` 원본은 `assets/source/aseprite`의 SSOT로 관리하고, `tools/aseprite-pipeline`이 PNG/JSON export, JSON normalize, atlas validation을 담당한다. 초기 런타임 반영은 기존 `client/public/assets/generated` 개별 이미지 경로와 `client/public/assets/atlas` atlas 경로를 모두 고려하되, 첫 파일럿에서는 고로디 NPC 1종으로 export/검증/게임 표시 루프를 증명한다.

**Tech Stack:** Aseprite 1.3.17.2, Node.js/Vitest, Phaser 3, TypeScript, existing Aseprite pipeline, existing asset integrity tests.

---

## Current Context

- Aseprite 실행 파일은 `C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe`에서 확인됐다.
- 사용자 환경변수 `ASEPRITE_EXE`는 위 경로로 등록되어 있다.
- `npm run art:aseprite:check`는 Steam 설치 경로 자동 탐지 상태에서 통과한다.
- Aseprite 기본 팔레트는 `assets/source/aseprite/palettes/aeterna-core.gpl`이다.
- 브러쉬 작업 기준은 `assets/source/aseprite/brushes/README.md`이다.
- 기존 런타임은 `GameScene`에서 일부 NPC를 개별 이미지로 로딩하고, `client/public/assets/atlas/atlas_*.png/json`도 이미 다수 존재한다.
- `AssetManager`의 core atlas 경로는 `assets/atlas/characters.png`, `assets/atlas/effects.png`, `assets/atlas/ui.png`지만 실제 public atlas 파일은 `assets/atlas/atlas_char_*.png`, `atlas_monster_*.png`, `atlas_tile_*.png` 패턴이 많다.

## File Structure

Create:
- `assets/source/aseprite/sprite-production-roster.json` — 제작 우선순위, 원본/산출물/런타임 대상 경로, 상태.
- `tools/aseprite-pipeline/sprite-roster.schema.json` — roster 검증 스키마.
- `tools/aseprite-pipeline/validate-sprite-roster.mjs` — roster 경로/카테고리/필수 필드 검증.
- `assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite` — 고로디 파일럿 원본.
- `client/src/assets/spriteResourceManifest.ts` — 런타임에서 사용할 스프라이트 key/path/atlas metadata SSOT.
- `tests/unit/spriteResourceManifest.test.ts` — manifest key/path 검증.
- `docs/art-production/sprite-production-roadmap.md` — 제작 순서와 QA 정책.

Modify:
- `package.json` — `art:sprite:roster` script 추가.
- `tools/aseprite-pipeline/README.md` — roster/roadmap 사용법 링크 추가.
- `docs/art-production/production-guide.md` — 스프라이트 제작 roadmap 링크 추가.
- `client/src/scenes/GameScene.ts` — 고로디 파일럿 스프라이트 로딩과 texture key 사용.
- `tests/integration/asset-integrity.test.ts` — 신규 manifest 경로가 public 파일 존재 검증에 포함되도록 확장.

Do not modify in this plan:
- 기존 대량 `client/public/assets/atlas` 파일 교체.
- 전투/스킬 밸런스 데이터.
- NPC 대화 로직. 고로디 대화 버그 수정은 별도 작업으로 이미 처리된 상태를 유지한다.

---

### Task 1: Sprite Production Roster

**Files:**
- Create: `assets/source/aseprite/sprite-production-roster.json`
- Create: `tools/aseprite-pipeline/sprite-roster.schema.json`
- Create: `tools/aseprite-pipeline/validate-sprite-roster.mjs`
- Modify: `package.json`
- Test: `tests/unit/asepritePipeline.test.ts`

- [ ] **Step 1: Write the failing roster validation tests**

Append this block to `tests/unit/asepritePipeline.test.ts`:

```ts
describe('sprite production roster', () => {
  test('roster entries use known Aseprite categories and project roots', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');
    const roster = {
      version: 1,
      items: [
        {
          id: 'npc_ghost_merchant_gorodi',
          category: 'npc',
          priority: 1,
          source: 'assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite',
          generatedPng: 'assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png',
          generatedJson: 'assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json',
          runtimePng: 'client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
          runtimeKey: 'npc_ghost_merchant_gorodi_sprite',
          status: 'planned',
          requiredTags: ['idle_D', 'talk_D'],
        },
      ],
    };

    expect(validateSpriteRoster(roster).errors).toEqual([]);
  });

  test('roster rejects unknown categories and paths outside project roots', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');
    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'bad_entry',
          category: 'portrait',
          priority: 1,
          source: '../bad.aseprite',
          generatedPng: 'tmp/bad.png',
          generatedJson: 'tmp/bad.json',
          runtimePng: 'client/public/assets/generated/bad.png',
          runtimeKey: 'bad_entry',
          status: 'planned',
          requiredTags: [],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'bad_entry: unknown category portrait',
        'bad_entry: source must be inside assets/source/aseprite',
        'bad_entry: generatedPng must be inside assets/generated/aseprite',
        'bad_entry: generatedJson must be inside assets/generated/aseprite',
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

Expected: FAIL with an import error for `validate-sprite-roster.mjs`.

- [ ] **Step 3: Create the schema file**

Create `tools/aseprite-pipeline/sprite-roster.schema.json`:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["version", "items"],
  "properties": {
    "version": { "type": "integer", "const": 1 },
    "items": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "id",
          "category",
          "priority",
          "source",
          "generatedPng",
          "generatedJson",
          "runtimePng",
          "runtimeKey",
          "status",
          "requiredTags"
        ],
        "properties": {
          "id": { "type": "string" },
          "category": { "enum": ["character", "npc", "monster", "vfx", "ui", "tile"] },
          "priority": { "type": "integer", "minimum": 1 },
          "source": { "type": "string" },
          "generatedPng": { "type": "string" },
          "generatedJson": { "type": "string" },
          "runtimePng": { "type": "string" },
          "runtimeKey": { "type": "string" },
          "status": { "enum": ["planned", "source-ready", "exported", "validated", "published", "in-game-verified"] },
          "requiredTags": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

- [ ] **Step 4: Create the roster validator**

Create `tools/aseprite-pipeline/validate-sprite-roster.mjs`:

```js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(TOOL_DIR, 'aseprite.config.json');
const ROSTER_PATH = path.resolve('assets/source/aseprite/sprite-production-roster.json');

const VALID_STATUSES = new Set(['planned', 'source-ready', 'exported', 'validated', 'published', 'in-game-verified']);

export function loadAsepriteConfig(configPath = CONFIG_PATH) {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

export function loadSpriteRoster(rosterPath = ROSTER_PATH) {
  return JSON.parse(readFileSync(rosterPath, 'utf8'));
}

function isInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function validateEntry(entry, config, errors) {
  const id = typeof entry?.id === 'string' && entry.id.length > 0 ? entry.id : '<missing-id>';

  if (!config.categories?.[entry.category]) {
    errors.push(`${id}: unknown category ${entry.category}`);
  }

  if (!Number.isInteger(entry.priority) || entry.priority < 1) {
    errors.push(`${id}: priority must be a positive integer`);
  }

  if (!isInside(config.sourceRoot, entry.source)) {
    errors.push(`${id}: source must be inside ${config.sourceRoot}`);
  }

  if (!isInside(config.exportRoot, entry.generatedPng)) {
    errors.push(`${id}: generatedPng must be inside ${config.exportRoot}`);
  }

  if (!isInside(config.exportRoot, entry.generatedJson)) {
    errors.push(`${id}: generatedJson must be inside ${config.exportRoot}`);
  }

  if (!isInside(config.publishRoot, entry.runtimePng) && !isInside('client/public/assets/generated', entry.runtimePng)) {
    errors.push(`${id}: runtimePng must be inside ${config.publishRoot} or client/public/assets/generated`);
  }

  if (typeof entry.runtimeKey !== 'string' || entry.runtimeKey.length === 0) {
    errors.push(`${id}: runtimeKey is required`);
  }

  if (!VALID_STATUSES.has(entry.status)) {
    errors.push(`${id}: invalid status ${entry.status}`);
  }

  if (!Array.isArray(entry.requiredTags)) {
    errors.push(`${id}: requiredTags must be an array`);
  }
}

export function validateSpriteRoster(roster, config = loadAsepriteConfig()) {
  const errors = [];

  if (roster?.version !== 1) {
    errors.push('version must be 1');
  }

  if (!Array.isArray(roster?.items)) {
    errors.push('items must be an array');
    return { ok: false, errors };
  }

  const ids = new Set();
  for (const entry of roster.items) {
    if (ids.has(entry.id)) {
      errors.push(`${entry.id}: duplicate id`);
    }
    ids.add(entry.id);
    validateEntry(entry, config, errors);
  }

  return { ok: errors.length === 0, errors };
}

function isCliEntrypoint(argvPath = process.argv[1], moduleUrl = import.meta.url) {
  if (!argvPath) return false;
  return path.resolve(argvPath) === path.resolve(fileURLToPath(moduleUrl));
}

if (isCliEntrypoint()) {
  const result = validateSpriteRoster(loadSpriteRoster());
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
```

- [ ] **Step 5: Create the initial production roster**

Create `assets/source/aseprite/sprite-production-roster.json`:

```json
{
  "version": 1,
  "items": [
    {
      "id": "npc_ghost_merchant_gorodi",
      "category": "npc",
      "priority": 1,
      "source": "assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite",
      "generatedPng": "assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png",
      "generatedJson": "assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json",
      "runtimePng": "client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png",
      "runtimeKey": "npc_ghost_merchant_gorodi_sprite",
      "status": "planned",
      "requiredTags": ["idle_D", "talk_D"]
    },
    {
      "id": "char_ether_knight_base",
      "category": "character",
      "priority": 2,
      "source": "assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite",
      "generatedPng": "assets/generated/aseprite/character/char_ether_knight_base.png",
      "generatedJson": "assets/generated/aseprite/character/char_ether_knight_base.json",
      "runtimePng": "client/public/assets/atlas/atlas_char_ether_knight.png",
      "runtimeKey": "atlas_char_ether_knight",
      "status": "planned",
      "requiredTags": ["idle_D", "walk_D", "attack_melee_D", "cast_D", "hit_D", "death_D"]
    },
    {
      "id": "mon_erebos_memory_dust_normal",
      "category": "monster",
      "priority": 3,
      "source": "assets/source/aseprite/monster/erebos/mon_erebos_memory_dust_normal.aseprite",
      "generatedPng": "assets/generated/aseprite/monster/mon_erebos_memory_dust_normal.png",
      "generatedJson": "assets/generated/aseprite/monster/mon_erebos_memory_dust_normal.json",
      "runtimePng": "client/public/assets/atlas/atlas_monster_erebos.png",
      "runtimeKey": "atlas_monster_erebos",
      "status": "planned",
      "requiredTags": ["idle", "attack", "hit", "death"]
    },
    {
      "id": "vfx_hit_slash",
      "category": "vfx",
      "priority": 4,
      "source": "assets/source/aseprite/vfx/common/vfx_hit_slash.aseprite",
      "generatedPng": "assets/generated/aseprite/vfx/common/vfx_hit_slash.png",
      "generatedJson": "assets/generated/aseprite/vfx/common/vfx_hit_slash.json",
      "runtimePng": "client/public/assets/generated/vfx/common/VFX-CMN-001.png",
      "runtimeKey": "vfx_common_001",
      "status": "planned",
      "requiredTags": ["start", "loop", "end"]
    }
  ]
}
```

- [ ] **Step 6: Add package script**

Modify `package.json` scripts:

```json
"art:sprite:roster": "node tools/aseprite-pipeline/validate-sprite-roster.mjs"
```

- [ ] **Step 7: Run tests and roster validation**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
npm run art:sprite:roster
git diff --check -- assets/source/aseprite/sprite-production-roster.json tools/aseprite-pipeline/sprite-roster.schema.json tools/aseprite-pipeline/validate-sprite-roster.mjs tests/unit/asepritePipeline.test.ts package.json
```

Expected: Vitest PASS, roster validation prints `{"ok":true,"errors":[]}`, diff check exit 0.

- [ ] **Step 8: Commit**

```powershell
git add assets/source/aseprite/sprite-production-roster.json tools/aseprite-pipeline/sprite-roster.schema.json tools/aseprite-pipeline/validate-sprite-roster.mjs tests/unit/asepritePipeline.test.ts package.json
git commit -m "feat(art): define sprite production roster"
```

---

### Task 2: Runtime Sprite Manifest Contract

**Files:**
- Create: `client/src/assets/spriteResourceManifest.ts`
- Create: `tests/unit/spriteResourceManifest.test.ts`
- Modify: `tests/integration/asset-integrity.test.ts`

- [ ] **Step 1: Write manifest unit test**

Create `tests/unit/spriteResourceManifest.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { SPRITE_RESOURCE_MANIFEST, getSpriteResource } from '../../client/src/assets/spriteResourceManifest';

describe('sprite resource manifest', () => {
  test('defines the Gorodi pilot sprite with stable runtime key and path', () => {
    expect(getSpriteResource('npc_ghost_merchant_gorodi')).toEqual({
      id: 'npc_ghost_merchant_gorodi',
      kind: 'image',
      key: 'npc_ghost_merchant_gorodi_sprite',
      path: 'assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
      frameWidth: 64,
      frameHeight: 64,
      tags: ['idle_D', 'talk_D'],
    });
  });

  test('all manifest ids and texture keys are unique', () => {
    const ids = new Set<string>();
    const keys = new Set<string>();

    for (const entry of SPRITE_RESOURCE_MANIFEST) {
      expect(ids.has(entry.id)).toBe(false);
      expect(keys.has(entry.key)).toBe(false);
      ids.add(entry.id);
      keys.add(entry.key);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts
```

Expected: FAIL because `spriteResourceManifest.ts` does not exist.

- [ ] **Step 3: Create runtime manifest**

Create `client/src/assets/spriteResourceManifest.ts`:

```ts
export type SpriteResourceKind = 'image' | 'atlas';

export interface SpriteResourceEntry {
  id: string;
  kind: SpriteResourceKind;
  key: string;
  path: string;
  jsonPath?: string;
  frameWidth: number;
  frameHeight: number;
  tags: string[];
}

export const SPRITE_RESOURCE_MANIFEST: SpriteResourceEntry[] = [
  {
    id: 'npc_ghost_merchant_gorodi',
    kind: 'image',
    key: 'npc_ghost_merchant_gorodi_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
    frameWidth: 64,
    frameHeight: 64,
    tags: ['idle_D', 'talk_D'],
  },
  {
    id: 'char_ether_knight_base',
    kind: 'atlas',
    key: 'atlas_char_ether_knight',
    path: 'assets/atlas/atlas_char_ether_knight.png',
    jsonPath: 'assets/atlas/atlas_char_ether_knight.json',
    frameWidth: 64,
    frameHeight: 64,
    tags: ['idle_D', 'walk_D', 'attack_melee_D', 'cast_D', 'hit_D', 'death_D'],
  },
  {
    id: 'mon_erebos_memory_dust_normal',
    kind: 'atlas',
    key: 'atlas_monster_erebos',
    path: 'assets/atlas/atlas_monster_erebos.png',
    jsonPath: 'assets/atlas/atlas_monster_erebos.json',
    frameWidth: 64,
    frameHeight: 64,
    tags: ['idle', 'attack', 'hit', 'death'],
  },
];

export function getSpriteResource(id: string): SpriteResourceEntry | undefined {
  return SPRITE_RESOURCE_MANIFEST.find((entry) => entry.id === id);
}
```

- [ ] **Step 4: Run manifest unit test**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts
git diff --check -- client/src/assets/spriteResourceManifest.ts tests/unit/spriteResourceManifest.test.ts
```

Expected: PASS. `tests/integration/asset-integrity.test.ts` is extended after Gorodi publishes in Task 4, so this task does not introduce a known missing-file failure.

- [ ] **Step 5: Commit**

```powershell
git add client/src/assets/spriteResourceManifest.ts tests/unit/spriteResourceManifest.test.ts
git commit -m "feat(assets): add sprite resource manifest contract"
```

---

### Task 3: Gorodi NPC Aseprite Pilot Source

**Files:**
- Create: `assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite`
- Modify: `assets/source/aseprite/sprite-production-roster.json`

- [ ] **Step 1: Create the source directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path assets/source/aseprite/npc/erebos
```

Expected: directory exists.

- [ ] **Step 2: Create the Aseprite file manually**

Open Aseprite and create:

```text
assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
```

Use these exact document settings:

| Setting | Value |
|---------|-------|
| Canvas | 384x64 |
| Frame size | 64x64 |
| Frames | 6 |
| Background | Transparent |
| Color mode | RGB Color or Indexed Color |
| Palette | `assets/source/aseprite/palettes/aeterna-core.gpl` |
| Layers | `shadow`, `body`, `accent`, hidden `reference` |
| Tags | `idle_D` frames 0-3, `talk_D` frames 4-5 |

Visual design:

| Element | Rule |
|---------|------|
| Silhouette | hooded ghost merchant, readable at 16x16 |
| Base colors | `Ghost White`, `Ghost Violet`, `Broken Violet` |
| Accent colors | `Memory Cyan`, `Gold Accent` |
| Outline | 2px black, no anti-aliasing |
| Pivot convention | feet/hover base centered near x=32, y=58±2 |
| Animation | idle: slight float; talk: chest/hood pulse and hand gesture |

- [ ] **Step 3: Verify source file exists**

Run:

```powershell
Test-Path assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
```

Expected: `True`.

- [ ] **Step 4: Update roster status**

In `assets/source/aseprite/sprite-production-roster.json`, change only Gorodi:

```json
"status": "source-ready"
```

- [ ] **Step 5: Validate roster**

Run:

```powershell
npm run art:sprite:roster
```

Expected: `ok` is `true`.

- [ ] **Step 6: Commit**

```powershell
git add assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite assets/source/aseprite/sprite-production-roster.json
git commit -m "art(npc): add gorodi aseprite source"
```

---

### Task 4: Gorodi Export Normalize Validate Publish

**Files:**
- Generated: `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png`
- Generated: `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json`
- Generated: `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json`
- Create: `client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png`
- Modify: `assets/source/aseprite/sprite-production-roster.json`
- Modify: `tests/integration/asset-integrity.test.ts`

- [ ] **Step 1: Export with Aseprite CLI**

Run:

```powershell
npm run art:aseprite:export -- npc assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
```

Expected:

```text
assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png
assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json
```

- [ ] **Step 2: Normalize JSON**

Run:

```powershell
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json `
  npc_ghost_merchant_gorodi `
  npc_ghost_merchant_gorodi.png
```

Expected: `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json` exists.

- [ ] **Step 3: Validate PNG and atlas JSON**

Run:

```powershell
npm run art:aseprite:validate -- npc `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json
```

Expected:

```json
{"ok":true,"errors":[]}
```

- [ ] **Step 4: Publish the pilot PNG to the current runtime NPC image path**

Run:

```powershell
New-Item -ItemType Directory -Force -Path client/public/assets/generated/characters/npc_sprites
Copy-Item `
  -LiteralPath assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png `
  -Destination client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png `
  -Force
```

Expected: runtime PNG exists.

- [ ] **Step 5: Update roster status**

In `assets/source/aseprite/sprite-production-roster.json`, change only Gorodi:

```json
"status": "published"
```

- [ ] **Step 6: Verify files**

Before running integration, modify `tests/integration/asset-integrity.test.ts` by adding this helper after `extractAssetPaths`:

```ts
function extractSpriteManifestPaths(): { file: string; assetPath: string; type: string }[] {
  const manifestPath = path.join(CLIENT_SRC, 'assets/spriteResourceManifest.ts');
  if (!fs.existsSync(manifestPath)) return [];

  const content = fs.readFileSync(manifestPath, 'utf-8');
  const results: { file: string; assetPath: string; type: string }[] = [];
  const pathRegex = /\b(?:path|jsonPath):\s*['"]([^'"]+)['"]/g;
  let match: RegExpExecArray | null;

  while ((match = pathRegex.exec(content)) !== null) {
    results.push({
      file: path.relative(ROOT, manifestPath),
      assetPath: match[1],
      type: match[1].endsWith('.json') ? 'sprite_manifest_json' : 'sprite_manifest_image',
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
const assetRefs = [...extractAssetPaths(tsFiles), ...extractSpriteManifestPaths()];
```

Run:

```powershell
npm run art:sprite:roster
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts tests/unit/spriteResourceManifest.test.ts
npx vitest run --config tests/vitest.config.ts tests/integration/asset-integrity.test.ts
git diff --check -- assets/generated/aseprite/npc client/public/assets/generated/characters/npc_sprites assets/source/aseprite/sprite-production-roster.json tests/integration/asset-integrity.test.ts
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add assets/generated/aseprite/npc client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png assets/source/aseprite/sprite-production-roster.json tests/integration/asset-integrity.test.ts
git commit -m "art(npc): export and publish gorodi pilot sprite"
```

---

### Task 5: Gorodi Runtime Connection

**Files:**
- Modify: `client/src/scenes/GameScene.ts`
- Test: `tests/unit/spriteResourceManifest.test.ts`
- Test: `tests/e2e/playflow-full.test.ts`

- [ ] **Step 1: Add GameScene import**

In `client/src/scenes/GameScene.ts`, add:

```ts
import { getSpriteResource } from '../assets/spriteResourceManifest';
```

- [ ] **Step 2: Load Gorodi texture when entering field scene**

In `preload()`, after existing NPC sprite loads, add:

```ts
const gorodiSprite = getSpriteResource('npc_ghost_merchant_gorodi');
if (gorodiSprite?.kind === 'image' && !this.textures.exists(gorodiSprite.key)) {
  this.load.image(gorodiSprite.key, gorodiSprite.path);
}
```

- [ ] **Step 3: Use the Gorodi texture for field NPC entity rendering**

In `client/src/scenes/GameScene.ts`, locate the field NPC creation branch that currently builds the remote `RemoteEntity` for server NPC data. Replace the texture selection expression in that branch with:

```ts
const gorodiSprite = getSpriteResource('npc_ghost_merchant_gorodi');
const textureKey = npc.npcId === 'npc_ghost_merchant' && gorodiSprite
  ? gorodiSprite.key
  : fallbackTextureKey;
```

Use the existing rectangle fallback when `this.textures.exists(textureKey)` is false. Do not remove the fallback path because browser QA still tolerates missing legacy assets.

- [ ] **Step 4: Add manifest coverage assertion**

Append to `tests/unit/spriteResourceManifest.test.ts`:

```ts
test('Gorodi runtime key is distinct from dialogue NPC id', () => {
  const gorodi = getSpriteResource('npc_ghost_merchant_gorodi');

  expect(gorodi?.key).toBe('npc_ghost_merchant_gorodi_sprite');
  expect(gorodi?.id).not.toBe('npc_ghost_merchant');
});
```

- [ ] **Step 5: Run focused tests**

Run:

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts
npx vitest run --config tests/vitest.config.ts tests/integration/asset-integrity.test.ts
```

Expected: PASS.

- [ ] **Step 6: Browser smoke**

Run the existing browser QA stack:

```powershell
npm run qa:browser
```

Expected:

- no missing texture error for `npc_ghost_merchant_gorodi_sprite`
- field NPC still opens dialogue as `유령 상인 고로디`
- choices `희귀 물건을 얻는다` and `거래한다` still produce response text

- [ ] **Step 7: Commit**

```powershell
git add client/src/scenes/GameScene.ts tests/unit/spriteResourceManifest.test.ts
git commit -m "feat(field): connect gorodi pilot sprite resource"
```

---

### Task 6: NPC Batch Production Track

**Files:**
- Modify: `assets/source/aseprite/sprite-production-roster.json`
- Create: `docs/art-production/sprite-production-roadmap.md`

- [ ] **Step 1: Create roadmap document**

Create `docs/art-production/sprite-production-roadmap.md`:

```markdown
# Sprite Production Roadmap

## Phase 1: Field NPC Pilot

| Priority | ID | Region | Source | Runtime |
|----------|----|--------|--------|---------|
| 1 | `npc_ghost_merchant_gorodi` | Erebos | `assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite` | `npc_ghost_merchant_gorodi_sprite` |

Exit criteria:

- Aseprite source exists.
- `idle_D` and `talk_D` tags validate.
- PNG/JSON export validation passes.
- Field scene shows the sprite.
- NPC dialogue remains functional.

## Phase 2: Core Town NPCs

| Priority | ID | Existing Concept | Runtime Key |
|----------|----|------------------|-------------|
| 2 | `npc_elder_mateus` | `04_mateus_sprite` | `npc_elder_mateus_sprite` |
| 3 | `npc_merchant_mira` | `20_mira_sprite` | `npc_merchant_mira_sprite` |
| 4 | `npc_blacksmith_kalen` | `19_kalen_sprite` | `npc_blacksmith_kalen_sprite` |
| 5 | `npc_memory_fragment_board` | `18_memory_fragment_sprite` | `npc_memory_fragment_board_sprite` |
| 6 | `npc_guild_hashir` | `13_hashir_sprite` | `npc_guild_hashir_sprite` |

Production rule:

- Each NPC uses a 384x64 sheet with six 64x64 frames.
- Tags are `idle_D` frames 0-3 and `talk_D` frames 4-5.
- Source files live under `assets/source/aseprite/npc/{region}`.

## Phase 3: Player Class Pilot

First player source:

- `char_ether_knight_base`

Exit criteria:

- `idle_D`, `walk_D`, `attack_melee_D`, `cast_D`, `hit_D`, `death_D` tags validate.
- First implementation may use one direction only for in-game pilot.
- Full 5-direction production starts after one-direction animation passes browser smoke.

## Phase 4: Monster And VFX Pilots

Monster pilot:

- `mon_erebos_memory_dust_normal`

VFX pilot:

- `vfx_hit_slash`

Exit criteria:

- Monster has `idle`, `attack`, `hit`, `death`.
- VFX has `start`, `loop`, `end`.
- Runtime frame naming matches Phaser animation config before publish.
```

- [ ] **Step 2: Add town NPC entries to roster**

Append these items to `assets/source/aseprite/sprite-production-roster.json` `items`:

```json
{
  "id": "npc_elder_mateus",
  "category": "npc",
  "priority": 2,
  "source": "assets/source/aseprite/npc/town/npc_elder_mateus.aseprite",
  "generatedPng": "assets/generated/aseprite/npc/npc_elder_mateus.png",
  "generatedJson": "assets/generated/aseprite/npc/npc_elder_mateus.json",
  "runtimePng": "client/public/assets/generated/characters/npc_sprites/npc_elder_mateus.png",
  "runtimeKey": "npc_elder_mateus_sprite",
  "status": "planned",
  "requiredTags": ["idle_D", "talk_D"]
}
```

Also append:

```json
{
  "id": "npc_merchant_mira",
  "category": "npc",
  "priority": 3,
  "source": "assets/source/aseprite/npc/town/npc_merchant_mira.aseprite",
  "generatedPng": "assets/generated/aseprite/npc/npc_merchant_mira.png",
  "generatedJson": "assets/generated/aseprite/npc/npc_merchant_mira.json",
  "runtimePng": "client/public/assets/generated/characters/npc_sprites/npc_merchant_mira.png",
  "runtimeKey": "npc_merchant_mira_sprite",
  "status": "planned",
  "requiredTags": ["idle_D", "talk_D"]
}
```

Also append:

```json
{
  "id": "npc_blacksmith_kalen",
  "category": "npc",
  "priority": 4,
  "source": "assets/source/aseprite/npc/town/npc_blacksmith_kalen.aseprite",
  "generatedPng": "assets/generated/aseprite/npc/npc_blacksmith_kalen.png",
  "generatedJson": "assets/generated/aseprite/npc/npc_blacksmith_kalen.json",
  "runtimePng": "client/public/assets/generated/characters/npc_sprites/npc_blacksmith_kalen.png",
  "runtimeKey": "npc_blacksmith_kalen_sprite",
  "status": "planned",
  "requiredTags": ["idle_D", "talk_D"]
}
```

Also append:

```json
{
  "id": "npc_memory_fragment_board",
  "category": "npc",
  "priority": 5,
  "source": "assets/source/aseprite/npc/town/npc_memory_fragment_board.aseprite",
  "generatedPng": "assets/generated/aseprite/npc/npc_memory_fragment_board.png",
  "generatedJson": "assets/generated/aseprite/npc/npc_memory_fragment_board.json",
  "runtimePng": "client/public/assets/generated/characters/npc_sprites/npc_memory_fragment_board.png",
  "runtimeKey": "npc_memory_fragment_board_sprite",
  "status": "planned",
  "requiredTags": ["idle_D", "talk_D"]
}
```

Also append:

```json
{
  "id": "npc_guild_hashir",
  "category": "npc",
  "priority": 6,
  "source": "assets/source/aseprite/npc/town/npc_guild_hashir.aseprite",
  "generatedPng": "assets/generated/aseprite/npc/npc_guild_hashir.png",
  "generatedJson": "assets/generated/aseprite/npc/npc_guild_hashir.json",
  "runtimePng": "client/public/assets/generated/characters/npc_sprites/npc_guild_hashir.png",
  "runtimeKey": "npc_guild_hashir_sprite",
  "status": "planned",
  "requiredTags": ["idle_D", "talk_D"]
}
```

- [ ] **Step 3: Validate roster**

Run:

```powershell
npm run art:sprite:roster
git diff --check -- docs/art-production/sprite-production-roadmap.md assets/source/aseprite/sprite-production-roster.json
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add docs/art-production/sprite-production-roadmap.md assets/source/aseprite/sprite-production-roster.json
git commit -m "docs(art): plan npc sprite production batch"
```

---

### Task 7: Player, Monster, VFX Expansion Gate

**Files:**
- Modify: `docs/art-production/sprite-production-roadmap.md`
- Modify: `assets/source/aseprite/sprite-production-roster.json`
- Modify: `tools/aseprite-pipeline/README.md`

- [ ] **Step 1: Add expansion acceptance rules to README**

Append to `tools/aseprite-pipeline/README.md`:

```markdown
## Expansion Gate

대량 제작은 파일럿 검증 이후에만 진행한다.

1. NPC 파일럿 `npc_ghost_merchant_gorodi`가 in-game verified 상태여야 한다.
2. 플레이어 클래스는 `char_ether_knight_base` 한 방향 파일럿을 먼저 만든다.
3. 몬스터는 `mon_erebos_memory_dust_normal` 한 종을 먼저 만든다.
4. VFX는 `vfx_hit_slash` 한 종을 먼저 만든다.
5. 각 파일럿은 source-ready → exported → validated → published → in-game-verified 순서로만 승격한다.
```

- [ ] **Step 2: Add status promotion policy to roadmap**

Append to `docs/art-production/sprite-production-roadmap.md`:

```markdown
## Status Promotion Policy

| Status | Required Evidence |
|--------|-------------------|
| `planned` | roster entry exists |
| `source-ready` | `.aseprite` source exists and opens in Aseprite |
| `exported` | PNG and raw Aseprite JSON exist under `assets/generated/aseprite` |
| `validated` | `npm run art:aseprite:validate` returns `ok: true` |
| `published` | runtime PNG/atlas files exist under `client/public/assets` |
| `in-game-verified` | browser smoke confirms visible sprite and no missing texture error |
```

- [ ] **Step 3: Run doc and roster checks**

Run:

```powershell
npm run art:sprite:roster
git diff --check -- tools/aseprite-pipeline/README.md docs/art-production/sprite-production-roadmap.md assets/source/aseprite/sprite-production-roster.json
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add tools/aseprite-pipeline/README.md docs/art-production/sprite-production-roadmap.md assets/source/aseprite/sprite-production-roster.json
git commit -m "docs(art): define sprite expansion gates"
```

---

## Rollout Order

1. `npc_ghost_merchant_gorodi` pilot source and export.
2. Field runtime connection for Gorodi.
3. Town NPC batch with existing concept sprites as reference.
4. `char_ether_knight_base` one-direction class pilot.
5. `mon_erebos_memory_dust_normal` monster pilot.
6. `vfx_hit_slash` VFX pilot.
7. Atlas merge automation after at least one image and one atlas-style resource are verified in-game.

## Quality Gates

- Aseprite source exists under `assets/source/aseprite/{category}`.
- Source uses project palette or an approved region palette.
- Source uses hard-edge pixel brushes and no anti-aliasing.
- Export is produced by `npm run art:aseprite:export`.
- Normalized JSON is produced by `normalize-aseprite-json.mjs`.
- `npm run art:aseprite:validate` returns `ok: true`.
- Runtime path is listed in `spriteResourceManifest.ts`.
- `tests/integration/asset-integrity.test.ts` passes.
- Browser smoke has no missing texture error.

## Risks

- Current runtime asset loading mixes individual generated images and atlas files. The pilot must not force a broad atlas migration.
- Aseprite source files are binary and must remain under Git LFS policy.
- Full 5-direction player class production is large. One-direction class pilot must pass before expanding to all directions.
- VFX naming must match Phaser animation frame prefixes before publish.
- Browser QA can fail from unrelated missing audio/assets. Treat missing texture errors for the new sprite as blocking; report unrelated pre-existing failures separately.

## References

- Aseprite pipeline: `tools/aseprite-pipeline/README.md`
- Brush settings: `assets/source/aseprite/brushes/README.md`
- Core palette: `assets/source/aseprite/palettes/aeterna-core.gpl`
- Sprite spec: `docs/art-production/sprite-spec.md`
- QA checklist: `docs/art-production/qa-checklist.md`
- Runtime loader: `client/src/assets/AssetManager.ts`
- Field scene: `client/src/scenes/GameScene.ts`
