# Aseprite Graphics Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aseprite 원본 파일을 에테르나 크로니클의 그래픽 리소스 SSOT로 연결해 `.aseprite` → PNG sprite sheet → JSON atlas → Phaser client asset까지 반복 가능한 제작 파이프라인을 만든다.

**Architecture:** Aseprite는 원본 편집 도구로 고정하고, 리포에는 `.aseprite` 원본과 검증된 export 산출물을 함께 관리한다. Node 기반 CLI 래퍼가 Aseprite batch export를 실행하고, 기존 Python art pipeline은 후처리/QA/아틀라스 보조 도구로 유지한다.

**Tech Stack:** Aseprite CLI, Node.js 20, Vitest, existing `tools/art-pipeline` Python tools, Phaser/Vite public assets, Git LFS.

---

## Implementation Status — 2026-05-25

- Tasks 1-6 are implemented and reviewed: source/export roots, CLI discovery, export runner, JSON normalizer, PNG/atlas validator, and production documentation.
- Aseprite is available through the Steam install at `C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe`.
- `ASEPRITE_EXE` is registered at the user environment level for this Windows machine.
- Task 7 pilot asset generation is still waiting on a Gorodi `.ase`/`.aseprite` source under `assets/source/aseprite/npc/erebos`.
- To resume Task 7, create `assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite`, then run export, normalize, validate, and browser smoke in that order.

---

## Current Context

- Aseprite 실행 파일은 현재 PATH에서 감지되지 않았다. Windows 기본 설치 경로 탐색과 `ASEPRITE_EXE` 환경변수를 모두 지원해야 한다.
- `.aseprite`/`.ase`는 이미 `docs/art-production/asset-versioning.md`에서 Git LFS 대상으로 정의되어 있다.
- 현재 atlas 산출물은 `client/public/assets/atlas/*.png` + `*.json`에 존재하며 JSON은 `{ atlas, size, sprites, count }` 구조를 쓴다.
- 기존 아트 도구는 `tools/art-pipeline/`과 `tools/asset-pipeline/spritesheet_generator.py`, `tools/p21_atlas_packer.py`에 있다.
- Aseprite 공식 CLI는 `-b/--batch`, `--sheet`, `--data`, `--format json-array|json-hash`, `--list-tags`, `--list-layers`, `--sheet-type`, `--sheet-pack`을 제공한다.

## File Structure

Create:
- `tools/aseprite-pipeline/aseprite.config.json` — 카테고리별 source/export/publish 경로와 프레임 규격.
- `tools/aseprite-pipeline/find-aseprite.mjs` — Windows/macOS/Linux Aseprite 실행 파일 탐색.
- `tools/aseprite-pipeline/export-aseprite.mjs` — `.aseprite` 파일을 PNG/JSON으로 batch export.
- `tools/aseprite-pipeline/normalize-aseprite-json.mjs` — Aseprite JSON을 현재 atlas JSON 구조로 변환.
- `tools/aseprite-pipeline/validate-aseprite-export.mjs` — PNG/JSON/태그/프레임 크기 검증.
- `tools/aseprite-pipeline/README.md` — 아티스트/개발자 사용법.
- `tests/unit/asepritePipeline.test.ts` — config/path/JSON normalize/PNG header 검증.
- `assets/source/aseprite/.gitkeep` — Aseprite 원본 루트.
- `assets/generated/aseprite/.gitkeep` — export 중간 산출물 루트.

Modify:
- `package.json` — `art:aseprite:*` scripts 추가.
- `docs/art-production/production-guide.md` — Aseprite 수동 편집 루프 연결.
- `docs/art-production/sprite-spec.md` — Aseprite tag/layer 규칙 추가.
- `docs/art-production/qa-checklist.md` — Aseprite export QA 항목 추가.

Do not modify in this plan:
- Runtime asset loader. 첫 단계는 기존 `client/public/assets/atlas` 파일 배치 규칙에 맞춰 산출물을 만드는 것까지만 한다.
- 대량 에셋 교체. 첫 파일럿은 NPC 1종 또는 VFX 1종으로 제한한다.

---

### Task 1: Source Directory And Naming Contract

**Files:**
- Create: `assets/source/aseprite/.gitkeep`
- Create: `assets/generated/aseprite/.gitkeep`
- Modify: `docs/art-production/sprite-spec.md`
- Modify: `docs/art-production/asset-versioning.md`

- [ ] **Step 1: Create source/export roots**

Use `apply_patch` to add empty keep files:

```text
assets/source/aseprite/.gitkeep
assets/generated/aseprite/.gitkeep
```

- [ ] **Step 2: Add Aseprite source layout to `sprite-spec.md`**

Append this section after `## 5) 통합 폴더 구조`:

```markdown
## 5.1 Aseprite 원본 구조

`assets/source/aseprite/`는 사람이 편집하는 그래픽 원본의 SSOT다. AI 생성 원본은 seed/reference로만 쓰고, 게임 반영 기준은 `.aseprite`에서 export된 PNG/JSON이다.

| 카테고리 | 원본 경로 | Export 경로 | Publish 경로 |
|---|---|---|---|
| 캐릭터 | `assets/source/aseprite/character/{class}/{asset}.aseprite` | `assets/generated/aseprite/character/` | `client/public/assets/atlas/` |
| NPC | `assets/source/aseprite/npc/{region}/{npc_id}.aseprite` | `assets/generated/aseprite/npc/` | `client/public/assets/atlas/` |
| 몬스터 | `assets/source/aseprite/monster/{region}/{monster_id}.aseprite` | `assets/generated/aseprite/monster/` | `client/public/assets/atlas/` |
| VFX | `assets/source/aseprite/vfx/{class_or_common}/{vfx_id}.aseprite` | `assets/generated/aseprite/vfx/` | `client/public/assets/atlas/` |
| UI/아이콘 | `assets/source/aseprite/ui/{group}/{asset}.aseprite` | `assets/generated/aseprite/ui/` | `client/public/assets/atlas/` |
| 타일 | `assets/source/aseprite/tile/{region}/{tileset}.aseprite` | `assets/generated/aseprite/tile/` | `client/public/assets/atlas/` |

Aseprite tag는 `{motion}_{direction}` 형식으로 작성한다. 예: `idle_D`, `walk_L`, `attack_melee_U`. NPC 단일 방향은 `idle_D`, `talk_D`만 사용한다.
```

- [ ] **Step 3: Confirm LFS policy**

Run:

```powershell
rg -n "\*.aseprite|\*.ase" .gitattributes docs/art-production/asset-versioning.md
```

Expected: `.aseprite` and `.ase` are tracked by LFS policy in docs and ideally `.gitattributes`.

- [ ] **Step 4: Commit**

```powershell
git add assets/source/aseprite/.gitkeep assets/generated/aseprite/.gitkeep docs/art-production/sprite-spec.md docs/art-production/asset-versioning.md
git commit -m "docs(art): define aseprite source asset contract"
```

---

### Task 2: Aseprite CLI Configuration

**Files:**
- Create: `tools/aseprite-pipeline/aseprite.config.json`
- Create: `tools/aseprite-pipeline/find-aseprite.mjs`
- Test: `tests/unit/asepritePipeline.test.ts`

- [ ] **Step 1: Write config**

Create `tools/aseprite-pipeline/aseprite.config.json`:

```json
{
  "sourceRoot": "assets/source/aseprite",
  "exportRoot": "assets/generated/aseprite",
  "publishRoot": "client/public/assets/atlas",
  "categories": {
    "character": {
      "frameWidth": 64,
      "frameHeight": 64,
      "padding": 2,
      "sheetType": "rows",
      "requiredTags": ["idle_D", "walk_D", "attack_melee_D", "cast_D", "hit_D", "death_D"]
    },
    "npc": {
      "frameWidth": 64,
      "frameHeight": 64,
      "padding": 2,
      "sheetType": "rows",
      "requiredTags": ["idle_D", "talk_D"]
    },
    "monster": {
      "frameWidth": 64,
      "frameHeight": 64,
      "padding": 2,
      "sheetType": "rows",
      "requiredTags": ["idle", "attack", "hit", "death"]
    },
    "vfx": {
      "frameWidth": 64,
      "frameHeight": 64,
      "padding": 2,
      "sheetType": "horizontal",
      "requiredTags": ["start", "loop", "end"]
    },
    "ui": {
      "frameWidth": 32,
      "frameHeight": 32,
      "padding": 1,
      "sheetType": "packed",
      "requiredTags": []
    },
    "tile": {
      "frameWidth": 32,
      "frameHeight": 32,
      "padding": 0,
      "sheetType": "rows",
      "requiredTags": []
    }
  }
}
```

- [ ] **Step 2: Implement Aseprite executable detection**

Create `tools/aseprite-pipeline/find-aseprite.mjs`:

```js
import { existsSync } from 'node:fs';
import { delimiter } from 'node:path';
import { spawnSync } from 'node:child_process';

const WINDOWS_CANDIDATES = [
  'C:\\Program Files\\Aseprite\\Aseprite.exe',
  'C:\\Program Files\\Aseprite\\aseprite.exe',
  'C:\\Program Files (x86)\\Aseprite\\Aseprite.exe',
  'C:\\Program Files (x86)\\Aseprite\\aseprite.exe'
];

const UNIX_CANDIDATES = [
  '/Applications/Aseprite.app/Contents/MacOS/aseprite',
  '/usr/local/bin/aseprite',
  '/opt/homebrew/bin/aseprite'
];

function canRun(candidate) {
  const result = spawnSync(candidate, ['--version'], { encoding: 'utf8' });
  return result.status === 0;
}

export function findAsepriteExecutable(env = process.env) {
  if (env.ASEPRITE_EXE && existsSync(env.ASEPRITE_EXE) && canRun(env.ASEPRITE_EXE)) {
    return env.ASEPRITE_EXE;
  }

  const pathCandidates = (env.PATH ?? '')
    .split(delimiter)
    .filter(Boolean)
    .flatMap((dir) => [`${dir}\\aseprite.exe`, `${dir}\\Aseprite.exe`, `${dir}/aseprite`]);

  for (const candidate of [...pathCandidates, ...WINDOWS_CANDIDATES, ...UNIX_CANDIDATES]) {
    if (existsSync(candidate) && canRun(candidate)) {
      return candidate;
    }
  }

  return null;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const exe = findAsepriteExecutable();
  if (!exe) {
    console.error('Aseprite executable not found. Set ASEPRITE_EXE to Aseprite.exe.');
    process.exit(1);
  }
  console.log(exe);
}
```

- [ ] **Step 3: Add test for config integrity**

Create `tests/unit/asepritePipeline.test.ts` with the first test block:

```ts
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const configPath = path.resolve(__dirname, '../../tools/aseprite-pipeline/aseprite.config.json');

describe('aseprite pipeline config', () => {
  test('all categories define positive frame sizes and publish roots', () => {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    expect(config.sourceRoot).toBe('assets/source/aseprite');
    expect(config.exportRoot).toBe('assets/generated/aseprite');
    expect(config.publishRoot).toBe('client/public/assets/atlas');

    for (const category of Object.values<any>(config.categories)) {
      expect(category.frameWidth).toBeGreaterThan(0);
      expect(category.frameHeight).toBeGreaterThan(0);
      expect(category.padding).toBeGreaterThanOrEqual(0);
      expect(['rows', 'horizontal', 'vertical', 'packed']).toContain(category.sheetType);
      expect(Array.isArray(category.requiredTags)).toBe(true);
    }
  });
});
```

- [ ] **Step 4: Run the config test**

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tools/aseprite-pipeline/aseprite.config.json tools/aseprite-pipeline/find-aseprite.mjs tests/unit/asepritePipeline.test.ts
git commit -m "feat(art): add aseprite cli configuration"
```

---

### Task 3: Batch Export Tool

**Files:**
- Create: `tools/aseprite-pipeline/export-aseprite.mjs`
- Modify: `package.json`
- Test: `tests/unit/asepritePipeline.test.ts`

- [ ] **Step 1: Implement export command builder**

Create `tools/aseprite-pipeline/export-aseprite.mjs`:

```js
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findAsepriteExecutable } from './find-aseprite.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const configPath = path.join(__dirname, 'aseprite.config.json');

export function loadConfig() {
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

export function buildExportArgs({ sourceFile, sheetFile, dataFile, categoryConfig }) {
  const sheetType = categoryConfig.sheetType === 'packed' ? 'packed' : categoryConfig.sheetType;
  const args = [
    '-b',
    sourceFile,
    '--list-tags',
    '--list-layers',
    '--format',
    'json-array',
    '--sheet-type',
    sheetType,
    '--sheet',
    sheetFile,
    '--data',
    dataFile
  ];

  if (categoryConfig.sheetType === 'packed') {
    args.splice(1, 0, '--sheet-pack');
  }

  return args;
}

export function resolveExportTarget(config, category, sourceFile) {
  const parsed = path.parse(sourceFile);
  const exportDir = path.resolve(root, config.exportRoot, category);
  return {
    exportDir,
    sheetFile: path.join(exportDir, `${parsed.name}.png`),
    dataFile: path.join(exportDir, `${parsed.name}.aseprite.json`)
  };
}

export function exportAseprite({ category, sourceFile, asepriteExe = findAsepriteExecutable() }) {
  const config = loadConfig();
  const categoryConfig = config.categories[category];
  if (!categoryConfig) {
    throw new Error(`Unknown Aseprite category: ${category}`);
  }
  if (!asepriteExe) {
    throw new Error('Aseprite executable not found. Set ASEPRITE_EXE.');
  }

  const absSource = path.resolve(root, sourceFile);
  const target = resolveExportTarget(config, category, absSource);
  mkdirSync(target.exportDir, { recursive: true });

  const args = buildExportArgs({
    sourceFile: absSource,
    sheetFile: target.sheetFile,
    dataFile: target.dataFile,
    categoryConfig
  });

  const result = spawnSync(asepriteExe, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Aseprite export failed: ${result.stderr || result.stdout}`);
  }

  return target;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const [, , category, sourceFile] = process.argv;
  if (!category || !sourceFile) {
    console.error('Usage: node tools/aseprite-pipeline/export-aseprite.mjs <category> <source-file>');
    process.exit(1);
  }
  const result = exportAseprite({ category, sourceFile });
  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 2: Add unit tests for command construction**

Append to `tests/unit/asepritePipeline.test.ts`:

```ts
describe('aseprite export command', () => {
  test('character export includes tags, layers, sheet, and json-array data', async () => {
    const mod = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');
    const args = mod.buildExportArgs({
      sourceFile: 'assets/source/aseprite/npc/erebos/npc_ghost_merchant.aseprite',
      sheetFile: 'assets/generated/aseprite/npc/npc_ghost_merchant.png',
      dataFile: 'assets/generated/aseprite/npc/npc_ghost_merchant.aseprite.json',
      categoryConfig: { sheetType: 'rows' },
    });

    expect(args).toContain('-b');
    expect(args).toContain('--list-tags');
    expect(args).toContain('--list-layers');
    expect(args).toContain('--format');
    expect(args).toContain('json-array');
    expect(args).toContain('--sheet-type');
    expect(args).toContain('rows');
    expect(args).toContain('--sheet');
    expect(args).toContain('--data');
  });
});
```

- [ ] **Step 3: Add package scripts**

Modify `package.json` scripts:

```json
"art:aseprite:check": "node tools/aseprite-pipeline/find-aseprite.mjs",
"art:aseprite:export": "node tools/aseprite-pipeline/export-aseprite.mjs"
```

- [ ] **Step 4: Run tests**

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add tools/aseprite-pipeline/export-aseprite.mjs package.json tests/unit/asepritePipeline.test.ts
git commit -m "feat(art): add aseprite batch export tool"
```

---

### Task 4: Normalize Aseprite JSON To Project Atlas Schema

**Files:**
- Create: `tools/aseprite-pipeline/normalize-aseprite-json.mjs`
- Test: `tests/unit/asepritePipeline.test.ts`

- [ ] **Step 1: Implement normalizer**

Create `tools/aseprite-pipeline/normalize-aseprite-json.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function normalizeAsepriteJson({ atlasName, sheetFileName, asepriteJson }) {
  const frames = Array.isArray(asepriteJson.frames)
    ? asepriteJson.frames
    : Object.entries(asepriteJson.frames ?? {}).map(([filename, value]) => ({ filename, ...value }));

  const sprites = frames.map((entry) => {
    const source = entry.frame ?? entry;
    const file = entry.filename ?? entry.name ?? `${atlasName}_${source.x}_${source.y}.png`;
    return {
      file,
      x: source.x,
      y: source.y,
      w: source.w,
      h: source.h
    };
  });

  const size = asepriteJson.meta?.size ?? { w: 0, h: 0 };
  return {
    atlas: atlasName,
    image: sheetFileName,
    size: { w: size.w, h: size.h },
    sprites,
    tags: asepriteJson.meta?.frameTags ?? [],
    layers: asepriteJson.meta?.layers ?? [],
    count: sprites.length
  };
}

export function normalizeFile(inputFile, outputFile, atlasName, sheetFileName) {
  const raw = JSON.parse(readFileSync(inputFile, 'utf8'));
  const normalized = normalizeAsepriteJson({ atlasName, sheetFileName, asepriteJson: raw });
  writeFileSync(outputFile, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return normalized;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const [, , inputFile, outputFile, atlasName, sheetFileName] = process.argv;
  if (!inputFile || !outputFile || !atlasName || !sheetFileName) {
    console.error('Usage: node normalize-aseprite-json.mjs <input-json> <output-json> <atlas-name> <sheet-file-name>');
    process.exit(1);
  }
  normalizeFile(path.resolve(inputFile), path.resolve(outputFile), atlasName, sheetFileName);
}
```

- [ ] **Step 2: Add normalizer test**

Append:

```ts
describe('aseprite json normalize', () => {
  test('converts json-array frames to project atlas schema', async () => {
    const mod = await import('../../tools/aseprite-pipeline/normalize-aseprite-json.mjs');
    const result = mod.normalizeAsepriteJson({
      atlasName: 'atlas_npc_erebos',
      sheetFileName: 'atlas_npc_erebos.png',
      asepriteJson: {
        frames: [
          { filename: 'npc_ghost_merchant_idle_D_0', frame: { x: 0, y: 0, w: 64, h: 64 } },
          { filename: 'npc_ghost_merchant_idle_D_1', frame: { x: 66, y: 0, w: 64, h: 64 } }
        ],
        meta: {
          size: { w: 130, h: 64 },
          frameTags: [{ name: 'idle_D', from: 0, to: 1, direction: 'forward' }],
          layers: [{ name: 'body' }]
        }
      }
    });

    expect(result.atlas).toBe('atlas_npc_erebos');
    expect(result.size).toEqual({ w: 130, h: 64 });
    expect(result.count).toBe(2);
    expect(result.sprites[0]).toEqual({ file: 'npc_ghost_merchant_idle_D_0', x: 0, y: 0, w: 64, h: 64 });
    expect(result.tags[0].name).toBe('idle_D');
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```powershell
git add tools/aseprite-pipeline/normalize-aseprite-json.mjs tests/unit/asepritePipeline.test.ts
git commit -m "feat(art): normalize aseprite json atlas metadata"
```

---

### Task 5: Export Validation Gate

**Files:**
- Create: `tools/aseprite-pipeline/validate-aseprite-export.mjs`
- Test: `tests/unit/asepritePipeline.test.ts`

- [ ] **Step 1: Implement PNG header and metadata validation**

Create:

```js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function readPngSize(filePath) {
  const buf = readFileSync(filePath);
  const signature = buf.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Not a PNG file: ${filePath}`);
  }
  return {
    w: buf.readUInt32BE(16),
    h: buf.readUInt32BE(20)
  };
}

export function validateAtlas({ atlas, categoryConfig, pngSize }) {
  const errors = [];
  if (atlas.size.w !== pngSize.w || atlas.size.h !== pngSize.h) {
    errors.push(`JSON size ${atlas.size.w}x${atlas.size.h} != PNG size ${pngSize.w}x${pngSize.h}`);
  }

  for (const sprite of atlas.sprites ?? []) {
    if (sprite.w !== categoryConfig.frameWidth || sprite.h !== categoryConfig.frameHeight) {
      errors.push(`${sprite.file} size ${sprite.w}x${sprite.h} != expected ${categoryConfig.frameWidth}x${categoryConfig.frameHeight}`);
    }
  }

  const tagNames = new Set((atlas.tags ?? []).map((tag) => tag.name));
  for (const required of categoryConfig.requiredTags ?? []) {
    if (!tagNames.has(required)) {
      errors.push(`Missing required tag: ${required}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function loadConfig() {
  const configPath = path.join(__dirname, 'aseprite.config.json');
  return JSON.parse(readFileSync(configPath, 'utf8'));
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const [, , category, pngFile, atlasJsonFile] = process.argv;
  if (!category || !pngFile || !atlasJsonFile) {
    console.error('Usage: node validate-aseprite-export.mjs <category> <png-file> <normalized-atlas-json>');
    process.exit(1);
  }

  const config = loadConfig();
  const categoryConfig = config.categories[category];
  if (!categoryConfig) {
    console.error(`Unknown category: ${category}`);
    process.exit(1);
  }

  const atlas = JSON.parse(readFileSync(path.resolve(atlasJsonFile), 'utf8'));
  const result = validateAtlas({
    atlas,
    categoryConfig,
    pngSize: readPngSize(path.resolve(pngFile))
  });

  if (!result.ok) {
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(result, null, 2));
}
```

- [ ] **Step 2: Add validation tests**

Append:

```ts
describe('aseprite export validation', () => {
  test('validates frame size and required tags', async () => {
    const mod = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const result = mod.validateAtlas({
      pngSize: { w: 130, h: 64 },
      categoryConfig: {
        frameWidth: 64,
        frameHeight: 64,
        requiredTags: ['idle_D']
      },
      atlas: {
        size: { w: 130, h: 64 },
        sprites: [{ file: 'a', x: 0, y: 0, w: 64, h: 64 }],
        tags: [{ name: 'idle_D' }]
      }
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  test('reports mismatched frame size and missing tags', async () => {
    const mod = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const result = mod.validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: {
        frameWidth: 64,
        frameHeight: 64,
        requiredTags: ['talk_D']
      },
      atlas: {
        size: { w: 128, h: 64 },
        sprites: [{ file: 'bad', x: 0, y: 0, w: 63, h: 64 }],
        tags: [{ name: 'idle_D' }]
      }
    });

    expect(result.ok).toBe(false);
    expect(result.errors.join('\n')).toContain('bad size 63x64');
    expect(result.errors.join('\n')).toContain('Missing required tag: talk_D');
  });
});
```

- [ ] **Step 3: Run tests**

```powershell
npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts
```

Expected: PASS.

- [ ] **Step 4: Add validation package script**

Modify `package.json` scripts:

```json
"art:aseprite:validate": "node tools/aseprite-pipeline/validate-aseprite-export.mjs"
```

- [ ] **Step 5: Commit**

```powershell
git add tools/aseprite-pipeline/validate-aseprite-export.mjs tests/unit/asepritePipeline.test.ts package.json
git commit -m "feat(art): validate aseprite atlas exports"
```

---

### Task 6: Publish Workflow And Documentation

**Files:**
- Create: `tools/aseprite-pipeline/README.md`
- Modify: `docs/art-production/production-guide.md`
- Modify: `docs/art-production/qa-checklist.md`
- Modify: `package.json`

- [ ] **Step 1: Write pipeline README**

Create `tools/aseprite-pipeline/README.md`:

```markdown
# Aseprite Pipeline

## 목적

`.aseprite` 원본을 batch export하여 에테르나 크로니클의 PNG sprite sheet와 JSON atlas로 변환한다.

## 설치 확인

```powershell
$env:ASEPRITE_EXE="C:\Program Files\Aseprite\Aseprite.exe"
npm run art:aseprite:check
```

## NPC 파일럿 export

```powershell
npm run art:aseprite:export -- npc assets/source/aseprite/npc/erebos/npc_ghost_merchant.aseprite
```

산출물:

- `assets/generated/aseprite/npc/npc_ghost_merchant.png`
- `assets/generated/aseprite/npc/npc_ghost_merchant.aseprite.json`

## 제작 규칙

- 원본은 `.aseprite`로 저장한다.
- 캐릭터/NPC/몬스터/VFX는 tag 이름으로 애니메이션 범위를 정의한다.
- UI/아이콘은 slice 또는 layer 이름을 asset id와 맞춘다.
- export 후 `art:aseprite:validate`와 기존 `tools/art-pipeline/qa_checker.py`를 모두 통과해야 publish한다.
```

- [ ] **Step 2: Add production-guide reference**

In `docs/art-production/production-guide.md`, add after the workflow overview:

```markdown
### 4.4 Aseprite 수동 보정 루프

AI 생성 이미지가 QA를 통과하지 못하거나 애니메이션 일관성이 필요한 경우 Aseprite 원본을 SSOT로 승격한다.

```
AI seed/reference
  → Aseprite 원본 편집 (`assets/source/aseprite`)
  → Aseprite CLI export (`tools/aseprite-pipeline`)
  → 자동 QA (`qa_checker.py` + `validate-aseprite-export.mjs`)
  → client atlas publish (`client/public/assets/atlas`)
```

원본 `.aseprite`는 Git LFS로 관리하고, WIP 레이어는 커밋 전 숨김 처리한다. 게임 반영은 PNG/JSON export 산출물 기준으로만 진행한다.
```

- [ ] **Step 3: Add QA checklist**

In `docs/art-production/qa-checklist.md`, add under `## 2) 자동 QA 항목`:

```markdown
### 2.6 Aseprite Export 검증

- [ ] `.aseprite` 원본이 `assets/source/aseprite/` 아래에 있다.
- [ ] export PNG와 JSON이 같은 basename을 사용한다.
- [ ] JSON `meta.frameTags`가 필수 tag를 모두 포함한다.
- [ ] PNG IHDR 크기와 JSON `meta.size`가 일치한다.
- [ ] 모든 frame `w/h`가 카테고리 규격과 일치한다.
- [ ] 숨김 reference/background layer가 export에 포함되지 않는다.
- [ ] publish 전 `npx vitest run --config tests/vitest.config.ts tests/unit/asepritePipeline.test.ts`가 통과한다.
```

- [ ] **Step 4: Document manual publish rule**

Add this paragraph to `tools/aseprite-pipeline/README.md` after the validation section:

```markdown
## Publish 규칙

이 스프린트는 자동 publish를 만들지 않는다. 검증된 PNG/JSON만 기존 런타임 경로에 수동 배치한다. 새 publish 자동화는 런타임 asset loader가 NPC/캐릭터/VFX atlas를 어떤 key로 읽는지 확인한 뒤 별도 작업으로 추가한다.
```

- [ ] **Step 5: Commit**

```powershell
git add tools/aseprite-pipeline/README.md docs/art-production/production-guide.md docs/art-production/qa-checklist.md package.json
git commit -m "docs(art): document aseprite production workflow"
```

---

### Task 7: Pilot Asset And In-Game Verification

**Files:**
- Create: `assets/source/aseprite/npc/erebos/npc_ghost_merchant.aseprite`
- Generated: `assets/generated/aseprite/npc/npc_ghost_merchant.png`
- Generated: `assets/generated/aseprite/npc/npc_ghost_merchant.aseprite.json`
- Publish: `client/public/assets/atlas/atlas_npc_erebos.png`
- Publish: `client/public/assets/atlas/atlas_npc_erebos.json`

- [ ] **Step 1: Create the pilot source**

Create `npc_ghost_merchant.aseprite` in Aseprite with:

| Rule | Value |
|---|---|
| Canvas | 64×64 |
| Color mode | RGB or Indexed with transparent background |
| Layers | `body`, `accent`, `shadow`; hidden `reference` allowed but not exported |
| Tags | `idle_D` frames 0-3, `talk_D` frames 4-5 |
| Pivot convention | bottom center, visual feet at y 58±2 |

- [ ] **Step 2: Export pilot**

```powershell
$env:ASEPRITE_EXE="C:\Program Files\Aseprite\Aseprite.exe"
npm run art:aseprite:export -- npc assets/source/aseprite/npc/erebos/npc_ghost_merchant.aseprite
```

Expected:

```text
assets/generated/aseprite/npc/npc_ghost_merchant.png
assets/generated/aseprite/npc/npc_ghost_merchant.aseprite.json
```

- [ ] **Step 3: Normalize and validate**

```powershell
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/npc/npc_ghost_merchant.aseprite.json `
  assets/generated/aseprite/npc/npc_ghost_merchant.json `
  atlas_npc_erebos `
  npc_ghost_merchant.png

npm run art:aseprite:validate -- npc assets/generated/aseprite/npc/npc_ghost_merchant.png assets/generated/aseprite/npc/npc_ghost_merchant.json
```

Expected: validation reports `ok: true`.

- [ ] **Step 4: Publish only after validation**

Copy the validated PNG/JSON into the target atlas path only if the runtime asset loader expects that atlas. If the runtime currently uses individual NPC sprites, publish into the existing NPC asset location instead of inventing a new runtime path.

- [ ] **Step 5: Browser smoke test**

Run:

```powershell
npm run qa:browser
```

Then open the field scene and confirm:

- 유령 상인 고로디 sprite is visible.
- No console error from missing atlas/texture key.
- NPC dialogue still opens with speaker `유령 상인 고로디`.

- [ ] **Step 6: Commit**

```powershell
git add assets/source/aseprite/npc/erebos/npc_ghost_merchant.aseprite assets/generated/aseprite/npc client/public/assets/atlas
git commit -m "art(npc): add aseprite pilot sprite for ghost merchant gorodi"
```

---

## Rollout Order

1. Pilot: NPC 1종 (`npc_ghost_merchant`) because frame count is small and recent QA has known interaction coverage.
2. VFX common 1종 because horizontal strips are straightforward and visual drift is easy to detect.
3. Player class 1종 idle/walk only.
4. Full character motion set.
5. Monster region batch.
6. UI icon batch.

## Quality Gates

- Aseprite source exists under `assets/source/aseprite`.
- Export PNG/JSON generated through CLI, not manual save.
- JSON has required tags for the category.
- PNG IHDR size matches JSON metadata.
- Every frame size equals category spec.
- Existing `tools/art-pipeline/qa_checker.py` passes alpha/naming/resolution checks.
- Browser smoke has no missing texture or console error.

## Risks

- Aseprite is a paid desktop tool, so CI may not have it. CI should validate committed PNG/JSON and skip live export unless `ASEPRITE_EXE` is configured.
- Existing `tools/p21_atlas_packer.py` contains an absolute macOS path. Do not reuse it directly for Windows automation until the base path is parameterized.
- Current atlas JSON schema differs from Aseprite native JSON. Keep `normalize-aseprite-json.mjs` as the compatibility boundary.
- Large `.aseprite` files must stay in Git LFS; otherwise clone/pull performance will degrade.

## References

- Aseprite CLI documentation: https://www.aseprite.org/docs/cli/
- Aseprite sprite sheet documentation: https://www.aseprite.org/docs/sprite-sheet/
- Project sprite spec: `docs/art-production/sprite-spec.md`
- Project atlas spec: `docs/art-production/atlas-spec.md`
- Project QA checklist: `docs/art-production/qa-checklist.md`
