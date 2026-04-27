import { createProviderArtifact } from '../helpers.ts';
import type { MonsterGenerationArtifact, MonsterGenerationRequest, MonsterGeneratorProvider } from '../types.ts';

async function generateWithSdxl(request: MonsterGenerationRequest): Promise<MonsterGenerationArtifact> {
  return createProviderArtifact(request, {
    providerId: 'sdxl',
    modelName: 'stabilityai/sdxl-turbo',
    licenseId: 'openrail++',
    licenseUrl: 'https://huggingface.co/stabilityai/sdxl-turbo',
    licenseVersion: 'OpenRAIL++-M',
    loraName: 'pixel-art-style-v1',
  });
}

export const sdxlProvider: MonsterGeneratorProvider = {
  id: 'sdxl',
  displayName: 'Stable Diffusion XL',
  commercialSafeDefault: false,
  supportsLora: true,
  requiresModelLicenseUrl: true,
  generate: generateWithSdxl,
};
