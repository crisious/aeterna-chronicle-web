import { readdir } from 'node:fs/promises';
import path from 'node:path';

import {
  getCatalogSourceDirectories,
  inferMonsterRegion,
  inferSilhouetteClass,
  inferVariantNamespace,
  normalizeTierFromDirectory,
  resolveCatalogOutputPath,
  resolveCatalogSourceRoot,
  resolveWorkspaceRoot,
  toRelativePosixPath,
  writeJsonFile,
} from './helpers.ts';
import type { MonsterCatalogEntry } from './types.ts';

export interface BuildMonsterCatalogOptions {
  readonly sourcePath?: string;
  readonly outputPath?: string;
  readonly dryRun?: boolean;
  readonly workspaceRoot?: string;
}

export async function buildMonsterCatalog(options: BuildMonsterCatalogOptions = {}): Promise<MonsterCatalogEntry[]> {
  const workspaceRoot = resolveWorkspaceRoot(options.workspaceRoot);
  const sourceRoot = options.sourcePath ?? resolveCatalogSourceRoot(workspaceRoot);
  const outputPath = options.outputPath ?? resolveCatalogOutputPath(workspaceRoot);
  const entryMap = new Map<string, MonsterCatalogEntry>();

  for (const directoryName of getCatalogSourceDirectories()) {
    const directoryPath = path.join(sourceRoot, directoryName);

    let fileNames: string[];
    try {
      fileNames = await readdir(directoryPath);
    } catch {
      continue;
    }

    for (const fileName of fileNames) {
      if (!fileName.endsWith('.png')) {
        continue;
      }

      const monsterId = fileName.replace(/\.png$/u, '');
      if (entryMap.has(monsterId)) {
        throw new TypeError(`duplicate monster id detected in catalog build: ${monsterId}`);
      }

      const absoluteSourcePath = path.join(directoryPath, fileName);
      entryMap.set(monsterId, {
        id: monsterId,
        nameKo: monsterId,
        tier: normalizeTierFromDirectory(directoryName, monsterId),
        region: inferMonsterRegion(monsterId),
        silhouetteClass: inferSilhouetteClass(monsterId),
        variantNamespace: inferVariantNamespace(monsterId),
        sourceDocPath: toRelativePosixPath(workspaceRoot, absoluteSourcePath),
      });
    }
  }

  const entries = [...entryMap.values()].sort((left, right) => left.id.localeCompare(right.id));

  if (!options.dryRun) {
    await writeJsonFile(outputPath, entries);
  }

  return entries;
}
