import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildMonsterCatalog } from './catalog.ts';
import { MonsterPipelineNotImplementedError, failMonsterPipelineNotImplemented } from './errors.ts';
import { generateMonsterAsset } from './generate.ts';
import { inferMonsterRegion, inferMonsterTier, resolveRawArtifactPath, resolveTouchupRoot, resolveWorkspaceRoot } from './helpers.ts';
import { runMonsterTouchupPipeline } from './touchup/index.ts';
import { MONSTER_PIPELINE_COMMAND_IDS } from './types.ts';
import type { MonsterPipelineCommandDescriptor, MonsterPipelineCommandId, MonsterPipelineCommandRequest } from './types.ts';

export { MonsterPipelineNotImplementedError };

async function runGateCommand(request: MonsterPipelineCommandRequest): Promise<unknown> {
  return failMonsterPipelineNotImplemented(
    'gate',
    'runMonsterGate',
    { owner: '이소화', monsterId: request.monsterId },
  );
}

async function runAllCommand(request: MonsterPipelineCommandRequest): Promise<unknown> {
  if (!request.monsterId) {
    throw new TypeError('monsterId is required for all');
  }

  const generationArtifact = await generateMonsterAsset({
    monsterId: request.monsterId,
    tier: request.tier,
    region: request.region,
    providerId: request.providerId,
    dryRun: request.dryRun,
    workspaceRoot: request.workspaceRoot,
  });

  const touchupResults = await runMonsterTouchupPipeline({
    assetId: request.monsterId,
    tier: generationArtifact.meta.tier,
    region: generationArtifact.meta.region,
    inputPath: generationArtifact.imagePath,
    outputPath: request.outputPath ?? resolveTouchupRoot(resolveWorkspaceRoot(request.workspaceRoot)),
    meta: generationArtifact.meta,
  });

  return {
    assetId: request.monsterId,
    generationArtifact,
    touchupResults,
    nextAction: 'manual_review_required',
  };
}

export const MONSTER_PIPELINE_COMMANDS: Record<MonsterPipelineCommandId, MonsterPipelineCommandDescriptor> = {
  catalog: {
    id: 'catalog',
    labelKo: '카탈로그 빌드',
    requiresMonsterId: false,
    run: (request) => buildMonsterCatalog({
      sourcePath: request.inputPath,
      outputPath: request.outputPath,
      dryRun: request.dryRun,
      workspaceRoot: request.workspaceRoot,
    }),
  },
  generate: {
    id: 'generate',
    labelKo: 'AI 생성',
    requiresMonsterId: true,
    run: (request) => generateMonsterAsset({
      monsterId: request.monsterId ?? '',
      tier: request.tier,
      region: request.region,
      providerId: request.providerId,
      dryRun: request.dryRun,
      workspaceRoot: request.workspaceRoot,
    }),
  },
  touchup: {
    id: 'touchup',
    labelKo: '자동 후처리',
    requiresMonsterId: true,
    run: async (request) => {
      const workspaceRoot = resolveWorkspaceRoot(request.workspaceRoot);
      const monsterId = request.monsterId ?? '';
      const tier = inferMonsterTier(monsterId, request.tier);
      const region = inferMonsterRegion(monsterId, request.region);
      const inputPath = request.inputPath ?? resolveRawArtifactPath(workspaceRoot, monsterId);
      const outputPath = request.outputPath ?? resolveTouchupRoot(workspaceRoot);

      return runMonsterTouchupPipeline({
        assetId: monsterId,
        tier,
        region,
        inputPath,
        outputPath,
        meta: {
          assetId: monsterId,
          tier,
          region,
          providerId: request.providerId ?? 'firefly',
        },
      });
    },
  },
  gate: {
    id: 'gate',
    labelKo: '게이트 검증',
    requiresMonsterId: true,
    run: runGateCommand,
  },
  all: {
    id: 'all',
    labelKo: '전체 파이프라인',
    requiresMonsterId: true,
    run: runAllCommand,
  },
};

export function getMonsterPipelineCommand(commandId: MonsterPipelineCommandId): MonsterPipelineCommandDescriptor {
  return MONSTER_PIPELINE_COMMANDS[commandId];
}

export async function runMonsterPipelineCommand(request: MonsterPipelineCommandRequest): Promise<unknown> {
  const command = getMonsterPipelineCommand(request.command);
  if (command.requiresMonsterId && !request.monsterId?.trim()) {
    throw new TypeError(`monsterId is required for ${request.command}`);
  }
  return command.run(request);
}

function parseCliArgs(argv: string[]): MonsterPipelineCommandRequest {
  const command = (argv[0] ?? 'all') as MonsterPipelineCommandId;
  if (!MONSTER_PIPELINE_COMMAND_IDS.includes(command)) {
    throw new TypeError(`unknown monster pipeline command: ${command}`);
  }

  let monsterId: string | undefined;
  let providerId: MonsterPipelineCommandRequest['providerId'];
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let workspaceRoot: string | undefined;
  let tier: MonsterPipelineCommandRequest['tier'];
  let region: MonsterPipelineCommandRequest['region'];
  let dryRun = false;

  for (const rawArg of argv.slice(1)) {
    if (rawArg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (rawArg.startsWith('--id=')) {
      monsterId = rawArg.slice('--id='.length);
      continue;
    }
    if (rawArg.startsWith('--provider=')) {
      providerId = rawArg.slice('--provider='.length) as MonsterPipelineCommandRequest['providerId'];
      continue;
    }
    if (rawArg.startsWith('--input=')) {
      inputPath = rawArg.slice('--input='.length);
      continue;
    }
    if (rawArg.startsWith('--output=')) {
      outputPath = rawArg.slice('--output='.length);
      continue;
    }
    if (rawArg.startsWith('--workspace=')) {
      workspaceRoot = rawArg.slice('--workspace='.length);
      continue;
    }
    if (rawArg.startsWith('--tier=')) {
      tier = rawArg.slice('--tier='.length) as MonsterPipelineCommandRequest['tier'];
      continue;
    }
    if (rawArg.startsWith('--region=')) {
      region = rawArg.slice('--region='.length) as MonsterPipelineCommandRequest['region'];
    }
  }

  return {
    command,
    monsterId,
    providerId,
    dryRun,
    inputPath,
    outputPath,
    workspaceRoot,
    tier,
    region,
  };
}

async function main(): Promise<void> {
  const request = parseCliArgs(process.argv.slice(2));
  await runMonsterPipelineCommand(request);
}

const entryPoint = process.argv[1];
if (entryPoint && path.resolve(entryPoint) === fileURLToPath(import.meta.url)) {
  void main().catch((error: unknown) => {
    if (error instanceof Error) {
      process.stderr.write(`${error.name}: ${error.message}\n`);
    } else {
      process.stderr.write(`UnknownError: ${String(error)}\n`);
    }
    process.exitCode = 1;
  });
}
