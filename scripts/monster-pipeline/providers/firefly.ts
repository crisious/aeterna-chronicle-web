import { createProviderArtifact } from '../helpers.ts';
import type { MonsterGenerationArtifact, MonsterGenerationRequest, MonsterGeneratorProvider } from '../types.ts';

async function generateWithFirefly(request: MonsterGenerationRequest): Promise<MonsterGenerationArtifact> {
  return createProviderArtifact(request, {
    providerId: 'firefly',
    modelName: 'adobe-firefly-image-3',
    licenseId: 'adobe-firefly-commercial',
    licenseUrl: 'https://www.adobe.com/products/firefly.html',
    licenseVersion: '2026-04',
  });
}

export const fireflyProvider: MonsterGeneratorProvider = {
  id: 'firefly',
  displayName: 'Adobe Firefly',
  commercialSafeDefault: true,
  supportsLora: false,
  requiresModelLicenseUrl: true,
  generate: generateWithFirefly,
};
