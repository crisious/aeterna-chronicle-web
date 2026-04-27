import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getMonsterTierToken, MONSTER_TIER_ORDER } from '../../client/src/design_tokens/monster_tier.ts';
import type {
  MonsterArtifactStage,
  MonsterGenerationArtifact,
  MonsterGenerationRequest,
  MonsterMetaSidecar,
  MonsterProviderId,
  MonsterRegionId,
  MonsterSilhouetteClass,
  MonsterTierId,
  MonsterTouchupContext,
  MonsterTouchupResult,
  MonsterTouchupStepId,
} from './types.ts';

const EMPTY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
  'base64',
);

const REGION_ALIASES: Record<string, MonsterRegionId> = {
  erebos: 'erebos',
  silvanheim: 'silvanheim',
  silvanhime: 'silvanheim',
  solaris: 'solaris',
  argentium: 'argentium',
  northland: 'northland',
  eternal_ice: 'eternal_ice',
  britalia: 'britalia',
  fog_sea: 'fog_sea',
  abyss: 'abyss',
  oblivion: 'oblivion',
};

const SILHOUETTE_KEYWORDS: ReadonlyArray<readonly [MonsterSilhouetteClass, readonly string[]]> = [
  ['mechanical', ['gear', 'clockwork', 'automaton', 'tesla', 'piston', 'pipe', 'cog', 'brass', 'scrap', 'tin', 'furnace', 'drone']],
  ['insect', ['spider', 'beetle', 'scarab', 'scorpion', 'wasp', 'moth', 'worm']],
  ['elemental', ['elemental', 'wisp', 'slime', 'sprite', 'orb', 'shade', 'phantom', 'mist', 'core', 'echo']],
  ['humanoid', ['soldier', 'warrior', 'ghost', 'knight', 'sailor', 'skeleton', 'imp', 'phantom']],
  ['beast', ['wolf', 'hound', 'serpent', 'bird', 'bat', 'bear', 'hare', 'rat', 'lizard', 'crab', 'fish', 'eel', 'gull', 'vulture']],
];

interface ProviderArtifactOptions {
  readonly providerId: MonsterProviderId;
  readonly modelName: string;
  readonly licenseId: string;
  readonly licenseUrl: string;
  readonly licenseVersion: string;
  readonly loraName?: string;
}

interface AnimationDescriptor {
  readonly frames: number;
  readonly fps: number;
}

function getRepoRoot(): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(currentDir, '..', '..');
}

export function resolveWorkspaceRoot(workspaceRoot?: string): string {
  return workspaceRoot?.trim() || process.env.MONSTER_PIPELINE_ROOT || getRepoRoot();
}

export function resolveCatalogSourceRoot(workspaceRoot?: string): string {
  return path.join(resolveWorkspaceRoot(workspaceRoot), 'assets', 'generated', 'monsters');
}

export function resolveCatalogOutputPath(workspaceRoot?: string): string {
  return path.join(resolveWorkspaceRoot(workspaceRoot), 'assets', 'generated', 'monster-pipeline', 'catalog', 'monster_catalog.json');
}

export function resolveRawArtifactPath(workspaceRoot: string, assetId: string): string {
  return path.join(workspaceRoot, 'assets', 'generated', 'monster-pipeline', 'ai_raw', `${assetId}.png`);
}

export function resolveTouchupRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, 'assets', 'generated', 'monster-pipeline', 'touchup');
}

export function resolveTouchupStagePath(outputRoot: string, stepId: MonsterTouchupStepId, assetId: string): string {
  const stageDirectory = stepId === 'frame_split' ? 'atlas' : stepId;
  return path.join(outputRoot, stageDirectory, `${assetId}.png`);
}

export function resolveMetaPath(imagePath: string): string {
  return imagePath.replace(/\.png$/u, '.meta.json');
}

export function resolveAtlasManifestPath(imagePath: string): string {
  return imagePath.replace(/\.png$/u, '.json');
}

export async function ensureParentDirectory(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await ensureParentDirectory(filePath);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export function inferMonsterTier(monsterId: string, explicitTier?: MonsterTierId): MonsterTierId {
  if (explicitTier) {
    return explicitTier;
  }

  const normalizedId = monsterId.toLowerCase();
  if (normalizedId.endsWith('_boss')) {
    return 'boss';
  }
  if (normalizedId.endsWith('_elite')) {
    return 'elite';
  }
  if (normalizedId.endsWith('_normal')) {
    return 'normal';
  }

  return 'normal';
}

export function inferMonsterRegion(monsterId: string, explicitRegion?: MonsterRegionId): MonsterRegionId {
  if (explicitRegion) {
    return explicitRegion;
  }

  const normalizedId = monsterId.toLowerCase();
  for (const [alias, region] of Object.entries(REGION_ALIASES)) {
    if (normalizedId.includes(`_${alias}_`) || normalizedId.startsWith(`${alias}_`) || normalizedId.includes(`${alias}`)) {
      return region;
    }
  }

  return 'erebos';
}

export function inferSilhouetteClass(monsterId: string): MonsterSilhouetteClass {
  const normalizedId = monsterId.toLowerCase();

  for (const [silhouetteClass, keywords] of SILHOUETTE_KEYWORDS) {
    if (keywords.some((keyword) => normalizedId.includes(keyword))) {
      return silhouetteClass;
    }
  }

  return 'beast';
}

export function inferVariantNamespace(monsterId: string): `__v${string}` {
  const match = monsterId.match(/(__v\d{2})$/u);
  return (match?.[1] ?? '__v00') as `__v${string}`;
}

export function humanizeMonsterId(monsterId: string): string {
  return monsterId
    .replace(/^mon_/u, '')
    .replace(/__v\d{2}$/u, '')
    .replace(/_(normal|elite|boss)$/u, '')
    .replace(/_/gu, ' ')
    .trim();
}

export function createDeterministicSeed(input: string): number {
  const hash = createHash('sha256').update(input).digest();
  return hash.readUInt32BE(0);
}

export async function copyOrCreatePng(targetPath: string, sourcePath?: string): Promise<void> {
  await ensureParentDirectory(targetPath);

  if (sourcePath && existsSync(sourcePath)) {
    await copyFile(sourcePath, targetPath);
    return;
  }

  await writeFile(targetPath, EMPTY_PNG_BUFFER);
}

export function findExistingMonsterImage(workspaceRoot: string, assetId: string): string | undefined {
  const candidates = [
    path.join(workspaceRoot, 'assets', 'generated', 'monsters', 'normal', `${assetId}.png`),
    path.join(workspaceRoot, 'assets', 'generated', 'monsters', 'elite_boss', `${assetId}.png`),
    path.join(workspaceRoot, 'assets', 'generated', 'monsters', 'raid_boss', `${assetId}.png`),
    path.join(workspaceRoot, 'assets', 'generated_pixel_art', 'monsters', 'normal', `${assetId}.png`),
    path.join(workspaceRoot, 'assets', 'generated_pixel_art', 'monsters', 'elite_boss', `${assetId}.png`),
    path.join(workspaceRoot, 'assets', 'generated_pixel_art', 'monsters', 'raid_boss', `${assetId}.png`),
  ];

  return candidates.find((candidatePath) => existsSync(candidatePath));
}

function buildPromptText(monsterId: string, tier: MonsterTierId, region: MonsterRegionId): string {
  const tierPromptMap: Record<MonsterTierId, string> = {
    normal: 'common but threatening',
    elite: 'enhanced mutation with glowing aura',
    boss: 'epic scale, dramatic lighting, unique silhouette',
  };

  return [
    '2D pixel art RPG monster sprite',
    humanizeMonsterId(monsterId),
    `${region} region`,
    tierPromptMap[tier],
    'transparent background',
    'top-left 45-degree lighting',
    'no anti-aliasing',
  ].join(', ');
}

export async function createProviderArtifact(
  request: MonsterGenerationRequest,
  options: ProviderArtifactOptions,
): Promise<MonsterGenerationArtifact> {
  const workspaceRoot = resolveWorkspaceRoot(request.workspaceRoot);
  const tier = inferMonsterTier(request.monsterId, request.tier);
  const region = inferMonsterRegion(request.monsterId, request.region);
  const imagePath = resolveRawArtifactPath(workspaceRoot, request.monsterId);
  const sourceImagePath = findExistingMonsterImage(workspaceRoot, request.monsterId);

  await copyOrCreatePng(imagePath, sourceImagePath);

  const meta: MonsterMetaSidecar = {
    assetId: request.monsterId,
    tier,
    region,
    providerId: options.providerId,
    modelName: options.modelName,
    loraName: options.loraName,
    promptText: request.promptOverride?.trim() || buildPromptText(request.monsterId, tier, region),
    negativePromptText: 'realistic, blurry, watermark, anti-aliasing, text overlay',
    seed: createDeterministicSeed(`${options.providerId}:${request.monsterId}`),
    licenseId: options.licenseId,
    licenseUrl: options.licenseUrl,
    licenseVersion: options.licenseVersion,
  };

  await writeJsonFile(resolveMetaPath(imagePath), meta);

  return {
    assetId: request.monsterId,
    imagePath,
    stage: 'ai_raw',
    meta,
  };
}

export async function writeTouchupStageResult(
  context: MonsterTouchupContext,
  stepId: MonsterTouchupStepId,
  stage: MonsterArtifactStage,
  extraPayload?: Record<string, unknown>,
): Promise<MonsterTouchupResult> {
  const targetPath = resolveTouchupStagePath(context.outputPath, stepId, context.assetId);
  const sourcePath = existsSync(context.inputPath) ? context.inputPath : findExistingMonsterImage(resolveWorkspaceRoot(), context.assetId);

  await copyOrCreatePng(targetPath, sourcePath);
  await writeJsonFile(resolveMetaPath(targetPath), {
    ...context.meta,
    stepId,
    stage,
    inputPath: context.inputPath,
    outputPath: targetPath,
    reviewed: stepId === 'frame_split',
    ...extraPayload,
  });

  return {
    assetId: context.assetId,
    stepId,
    outputPath: targetPath,
    stage,
  };
}

function getAttackAnimation(tier: MonsterTierId): AnimationDescriptor {
  if (tier === 'normal') {
    return { frames: 4, fps: 12 };
  }
  if (tier === 'elite') {
    return { frames: 6, fps: 12 };
  }
  return { frames: 6, fps: 12 };
}

function getDeathAnimation(tier: MonsterTierId): AnimationDescriptor {
  if (tier === 'boss') {
    return { frames: 6, fps: 8 };
  }
  return { frames: 4, fps: 8 };
}

export async function writeAtlasManifest(context: MonsterTouchupContext, atlasPath: string): Promise<void> {
  const tierToken = getMonsterTierToken(context.tier);
  const idleFrames = tierToken.idle.frames;
  const frameWidth = tierToken.sprite.widthPx;
  const frameHeight = tierToken.sprite.heightPx;
  const atlasManifest = {
    meta: {
      assetId: context.assetId,
      tier: context.tier,
      region: context.region,
    },
    frameSize: {
      width: frameWidth,
      height: frameHeight,
    },
    animations: {
      idle: {
        frames: idleFrames,
        fps: tierToken.idle.fps,
      },
      attack: getAttackAnimation(context.tier),
      hit: {
        frames: 2,
        fps: 12,
      },
      death: getDeathAnimation(context.tier),
    },
  };

  await writeJsonFile(resolveAtlasManifestPath(atlasPath), atlasManifest);
}

export function getCatalogSourceDirectories(): readonly string[] {
  return ['normal', 'elite_boss', 'raid_boss'];
}

export function normalizeTierFromDirectory(directoryName: string, monsterId: string): MonsterTierId {
  if (directoryName === 'elite_boss') {
    return monsterId.endsWith('_boss') ? 'boss' : 'elite';
  }
  if (directoryName === 'raid_boss') {
    return 'boss';
  }
  return inferMonsterTier(monsterId);
}

export function toRelativePosixPath(workspaceRoot: string, targetPath: string): string {
  return path.relative(workspaceRoot, targetPath).split(path.sep).join('/');
}

export async function readImageBuffer(sourcePath: string): Promise<Buffer> {
  return readFile(sourcePath);
}

export function isMonsterTierId(value: string): value is MonsterTierId {
  return MONSTER_TIER_ORDER.includes(value as MonsterTierId);
}
