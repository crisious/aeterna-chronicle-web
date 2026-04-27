import type { MonsterTierId } from '../../client/src/design_tokens/monster_tier.ts';

export const MONSTER_REGION_ORDER = [
  'erebos',
  'silvanheim',
  'solaris',
  'argentium',
  'northland',
  'eternal_ice',
  'britalia',
  'fog_sea',
  'abyss',
  'oblivion',
] as const;

export const MONSTER_PROVIDER_IDS = ['firefly', 'sdxl'] as const;
export const MONSTER_TOUCHUP_STEP_ORDER = [
  'rembg',
  'quantize',
  'outline',
  'frame_split',
] as const;
export const MONSTER_PIPELINE_COMMAND_IDS = [
  'catalog',
  'generate',
  'touchup',
  'gate',
  'all',
] as const;

export type MonsterRegionId = typeof MONSTER_REGION_ORDER[number];
export type MonsterProviderId = typeof MONSTER_PROVIDER_IDS[number];
export type MonsterTouchupStepId = typeof MONSTER_TOUCHUP_STEP_ORDER[number];
export type MonsterPipelineCommandId = typeof MONSTER_PIPELINE_COMMAND_IDS[number];
export type MonsterArtifactStage = 'catalog' | 'ai_raw' | 'touchup_auto' | 'touchup_final' | 'atlas' | 'manifest';
export type MonsterSilhouetteClass = 'humanoid' | 'beast' | 'insect' | 'mechanical' | 'elemental';

export interface MonsterCatalogEntry {
  readonly id: string;
  readonly nameKo: string;
  readonly tier: MonsterTierId;
  readonly region: MonsterRegionId;
  readonly silhouetteClass: MonsterSilhouetteClass;
  readonly variantNamespace: `__v${string}`;
  readonly sourceDocPath?: string;
}

export interface MonsterMetaSidecar {
  readonly assetId: string;
  readonly tier: MonsterTierId;
  readonly region: MonsterRegionId;
  readonly providerId: MonsterProviderId;
  readonly modelName?: string;
  readonly loraName?: string;
  readonly promptText?: string;
  readonly negativePromptText?: string;
  readonly seed?: number;
  readonly licenseId?: string;
  readonly licenseUrl?: string;
  readonly licenseVersion?: string;
}

export interface MonsterGenerationRequest {
  readonly monsterId: string;
  readonly tier?: MonsterTierId;
  readonly region?: MonsterRegionId;
  readonly providerId?: MonsterProviderId;
  readonly promptOverride?: string;
  readonly dryRun?: boolean;
  readonly workspaceRoot?: string;
}

export interface MonsterGenerationArtifact {
  readonly assetId: string;
  readonly imagePath: string;
  readonly stage: 'ai_raw';
  readonly meta: MonsterMetaSidecar;
}

export interface MonsterTouchupContext {
  readonly assetId: string;
  readonly tier: MonsterTierId;
  readonly region: MonsterRegionId;
  readonly inputPath: string;
  readonly outputPath: string;
  readonly meta: MonsterMetaSidecar;
}

export interface MonsterTouchupResult {
  readonly assetId: string;
  readonly stepId: MonsterTouchupStepId;
  readonly outputPath: string;
  readonly stage: MonsterArtifactStage;
}

export interface MonsterTouchupStepDescriptor {
  readonly id: MonsterTouchupStepId;
  readonly labelKo: string;
  readonly consumes: MonsterArtifactStage;
  readonly produces: MonsterArtifactStage;
  readonly requiresManualReview: boolean;
  run(context: MonsterTouchupContext): Promise<MonsterTouchupResult>;
}

export interface MonsterGeneratorProvider {
  readonly id: MonsterProviderId;
  readonly displayName: string;
  readonly commercialSafeDefault: boolean;
  readonly supportsLora: boolean;
  readonly requiresModelLicenseUrl: boolean;
  generate(request: MonsterGenerationRequest): Promise<MonsterGenerationArtifact>;
}

export interface MonsterPipelineCommandRequest {
  readonly command: MonsterPipelineCommandId;
  readonly monsterId?: string;
  readonly providerId?: MonsterProviderId;
  readonly dryRun?: boolean;
  readonly workspaceRoot?: string;
  readonly inputPath?: string;
  readonly outputPath?: string;
  readonly tier?: MonsterTierId;
  readonly region?: MonsterRegionId;
}

export interface MonsterPipelineCommandDescriptor {
  readonly id: MonsterPipelineCommandId;
  readonly labelKo: string;
  readonly requiresMonsterId: boolean;
  run(request: MonsterPipelineCommandRequest): Promise<unknown>;
}
