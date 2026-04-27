import { getMonsterProvider } from './providers/index.ts';
import type { MonsterGenerationArtifact, MonsterGenerationRequest } from './types.ts';

export async function generateMonsterAsset(request: MonsterGenerationRequest): Promise<MonsterGenerationArtifact> {
  if (!request.monsterId.trim()) {
    throw new TypeError('monsterId is required');
  }

  const provider = getMonsterProvider(request.providerId ?? 'firefly');
  return provider.generate(request);
}
