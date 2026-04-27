import { fireflyProvider } from './firefly.ts';
import { sdxlProvider } from './sdxl.ts';
import type { MonsterGeneratorProvider, MonsterProviderId } from '../types.ts';
import { MONSTER_PROVIDER_IDS } from '../types.ts';

export { MONSTER_PROVIDER_IDS };

export const MONSTER_PROVIDERS: Record<MonsterProviderId, MonsterGeneratorProvider> = {
  firefly: fireflyProvider,
  sdxl: sdxlProvider,
};

export function getMonsterProvider(providerId: MonsterProviderId): MonsterGeneratorProvider {
  return MONSTER_PROVIDERS[providerId];
}
