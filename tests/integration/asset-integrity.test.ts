/**
 * Asset Reference Integrity Test — RT-03
 *
 * 1. client/src/ 의 .ts 파일에서 load.image / load.atlas / load.audio 호출을 스캔
 * 2. 추출된 파일 경로가 client/public/ 에 실제 존재하는지 검증
 * 3. 역방향: audio/ 의 .ogg 파일이 soundManifest에 참조되는지 확인
 * 4. 역방향: cg/ 의 .png 파일이 소스 코드 어딘가에 참조되는지 확인
 * 5. 누락 파일 + 고아 에셋 리포트
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CHARACTER_SPRITE_MANIFEST } from '../../client/src/assets/characterSpriteManifest';

const ROOT = path.resolve(__dirname, '../..');
const CLIENT_SRC = path.join(ROOT, 'client/src');
const CLIENT_PUBLIC = path.join(ROOT, 'client/public');

interface CharacterSpriteRuntimeAtlas {
  atlas: string;
  image: string;
  size: { w: number; h: number };
  sprites: Array<{ w: number; h: number }>;
}

// ── 유틸리티 ──────────────────────────────────────────────────────

/** 디렉토리를 재귀 탐색하여 매칭되는 파일 경로를 반환 */
function walkDir(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }
  return results;
}

/** .ts 파일에서 load.image / load.atlas / load.audio 호출의 경로 인자를 추출 */
function extractAssetPaths(tsFiles: string[]): { file: string; assetPath: string; type: string }[] {
  const results: { file: string; assetPath: string; type: string }[] = [];

  // load.image('key', 'path') / load.atlas('key', 'png', 'json') / load.audio('key', 'path')
  const loadImageRegex = /\.load\.image\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  const loadAtlasRegex = /\.load\.atlas\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;
  const loadAudioRegex = /\.load\.audio\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g;

  for (const filePath of tsFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relFile = path.relative(ROOT, filePath);

    let match: RegExpExecArray | null;

    // load.image
    loadImageRegex.lastIndex = 0;
    while ((match = loadImageRegex.exec(content)) !== null) {
      results.push({ file: relFile, assetPath: match[2], type: 'image' });
    }

    // load.atlas (png + json)
    loadAtlasRegex.lastIndex = 0;
    while ((match = loadAtlasRegex.exec(content)) !== null) {
      results.push({ file: relFile, assetPath: match[2], type: 'atlas_png' });
      results.push({ file: relFile, assetPath: match[3], type: 'atlas_json' });
    }

    // load.audio
    loadAudioRegex.lastIndex = 0;
    while ((match = loadAudioRegex.exec(content)) !== null) {
      results.push({ file: relFile, assetPath: match[2], type: 'audio' });
    }
  }

  return results;
}

// ── 테스트 ────────────────────────────────────────────────────────

describe('Asset Reference Integrity', () => {
  const tsFiles = walkDir(CLIENT_SRC, '.ts');

  it('client/src 에 .ts 파일이 존재해야 한다', () => {
    expect(tsFiles.length).toBeGreaterThan(0);
  });

  describe('소스 코드 → 디스크 (정방향)', () => {
    const assetRefs = extractAssetPaths(tsFiles);

    it('load.* 호출에서 에셋 경로를 추출할 수 있어야 한다', () => {
      expect(assetRefs.length).toBeGreaterThan(0);
    });

    it('load.image / load.atlas / load.audio 참조 파일이 client/public/ 에 존재해야 한다', () => {
      const missing: { file: string; assetPath: string; type: string }[] = [];

      for (const ref of assetRefs) {
        const diskPath = path.join(CLIENT_PUBLIC, ref.assetPath);
        if (!fs.existsSync(diskPath)) {
          missing.push(ref);
        }
      }

      if (missing.length > 0) {
        console.warn('\n⚠️  누락된 에셋 파일:');
        for (const m of missing) {
          console.warn(`  [${m.type}] ${m.assetPath}  ← ${m.file}`);
        }
      }

      // 누락 에셋이 없으면 통과, 있으면 경고 + 실패
      expect(missing, `${missing.length}개 에셋 파일이 디스크에 없습니다`).toHaveLength(0);
    });

    it('characterSpriteManifest imagePath / jsonPath 참조 파일이 client/public/ 에 존재해야 한다', () => {
      const manifestRefs = CHARACTER_SPRITE_MANIFEST.flatMap((entry) => [
        {
          classId: entry.classId,
          assetPath: entry.imagePath,
          type: 'character_manifest_image',
        },
        {
          classId: entry.classId,
          assetPath: entry.jsonPath,
          type: 'character_manifest_json',
        },
      ]);
      const missing: { classId: string; assetPath: string; type: string }[] = [];

      expect(manifestRefs.length).toBeGreaterThan(0);

      for (const ref of manifestRefs) {
        const diskPath = path.join(CLIENT_PUBLIC, ref.assetPath);
        if (!fs.existsSync(diskPath)) {
          missing.push(ref);
        }
      }

      if (missing.length > 0) {
        console.warn('\n⚠️  누락된 캐릭터 스프라이트 매니페스트 파일:');
        for (const m of missing) {
          console.warn(`  [${m.type}] ${m.assetPath}  ← ${m.classId}`);
        }
      }

      expect(missing, `${missing.length}개 캐릭터 스프라이트 파일이 디스크에 없습니다`).toHaveLength(0);
    });

    it('characterSpriteManifest runtime JSON 이 client/public/ 에서도 프레임 계약과 일치해야 한다', () => {
      expect(CHARACTER_SPRITE_MANIFEST.length).toBeGreaterThan(0);

      for (const entry of CHARACTER_SPRITE_MANIFEST) {
        const sourceJsonPath = path.join(ROOT, entry.jsonPath);
        const runtimeJsonPath = path.join(CLIENT_PUBLIC, entry.jsonPath);
        const runtimeAtlas = JSON.parse(
          fs.readFileSync(runtimeJsonPath, 'utf-8'),
        ) as CharacterSpriteRuntimeAtlas;
        const sourceAtlas = JSON.parse(
          fs.readFileSync(sourceJsonPath, 'utf-8'),
        ) as CharacterSpriteRuntimeAtlas;

        expect(runtimeAtlas, `${entry.classId} runtime JSON differs from generated JSON`).toEqual(sourceAtlas);
        expect(runtimeAtlas.image).toBe(path.basename(entry.imagePath));
        expect(runtimeAtlas.sprites.length).toBeGreaterThan(0);
        expect(runtimeAtlas.size.w).toBeGreaterThanOrEqual(entry.frameWidth);
        expect(runtimeAtlas.size.h).toBeGreaterThanOrEqual(entry.frameHeight);

        for (const frame of runtimeAtlas.sprites) {
          expect(frame.w).toBe(entry.frameWidth);
          expect(frame.h).toBe(entry.frameHeight);
        }
      }
    });
  });

  describe('디스크 → 소스 코드 (역방향: 고아 에셋)', () => {
    it('audio/ 의 .ogg 파일이 soundManifest 에 참조되어야 한다', () => {
      const audioDir = path.join(CLIENT_PUBLIC, 'assets/audio');
      const oggFiles = walkDir(audioDir, '.ogg');

      // soundManifest.ts 내용 읽기
      const manifestPath = path.join(CLIENT_SRC, 'sound/soundManifest.ts');
      const manifestContent = fs.existsSync(manifestPath)
        ? fs.readFileSync(manifestPath, 'utf-8')
        : '';

      // client/public/audio/ 도 확인 (루트 레벨 audio 참조)
      const rootAudioDir = path.join(CLIENT_PUBLIC, 'audio');
      const rootOggFiles = walkDir(rootAudioDir, '.ogg');

      const allOggFiles = [...oggFiles, ...rootOggFiles];
      const orphans: string[] = [];

      for (const oggPath of allOggFiles) {
        // 파일명 기준으로 매니페스트에서 검색
        const relativePath = path.relative(CLIENT_PUBLIC, oggPath);
        const fileName = path.basename(oggPath, '.ogg');

        if (!manifestContent.includes(relativePath) && !manifestContent.includes(fileName)) {
          orphans.push(relativePath);
        }
      }

      if (orphans.length > 0) {
        console.warn('\n⚠️  soundManifest 에 참조되지 않는 .ogg 파일 (고아):');
        for (const o of orphans) {
          console.warn(`  ${o}`);
        }
      }

      // 고아 파일 수를 리포트 (경고 레벨 — 0이면 통과)
      expect(orphans, `${orphans.length}개 .ogg 파일이 soundManifest에 미참조`).toHaveLength(0);
    });

    it('cg/ 의 .png 파일이 소스 코드에 참조되어야 한다', () => {
      const cgDir = path.join(CLIENT_PUBLIC, 'assets/cg');
      const cgFiles = walkDir(cgDir, '.png');

      // 전체 소스 코드를 하나의 문자열로 결합
      const allSource = tsFiles
        .map((f) => fs.readFileSync(f, 'utf-8'))
        .join('\n');

      const orphans: string[] = [];

      for (const cgPath of cgFiles) {
        const relativePath = path.relative(CLIENT_PUBLIC, cgPath);
        const fileName = path.basename(cgPath, '.png');

        // 소스 코드에서 경로 또는 파일명 참조 확인
        if (!allSource.includes(relativePath) && !allSource.includes(fileName)) {
          orphans.push(relativePath);
        }
      }

      if (orphans.length > 0) {
        console.warn('\n⚠️  소스 코드에 참조되지 않는 CG 파일 (고아):');
        for (const o of orphans) {
          console.warn(`  ${o}`);
        }
      }

      expect(orphans, `${orphans.length}개 CG .png 파일이 소스 코드에 미참조`).toHaveLength(0);
    });
  });
});
