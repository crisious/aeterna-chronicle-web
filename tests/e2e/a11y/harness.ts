import {
  getA11ySceneDescriptor,
  listCriticalA11yScenes,
} from '../../../scripts/a11y/scenes.config';
import type {
  A11yLocale,
  A11ySceneDescriptor,
  A11ySceneId,
  ProbeId,
} from '../../../scripts/a11y/types';

export interface DeferredA11yScenario {
  scene: A11ySceneDescriptor;
  locale: A11yLocale;
  probes: ProbeId[];
}

export function createDeferredA11yScenario(
  sceneId: A11ySceneId,
  locale: A11yLocale = 'ko',
): DeferredA11yScenario {
  const scene = getA11ySceneDescriptor(sceneId);
  if (!scene) {
    throw new Error(`Unknown a11y scene: ${sceneId}`);
  }

  return {
    scene,
    locale,
    probes: [...scene.probes],
  };
}

export function buildCriticalScenarioMatrix(
  locales: readonly A11yLocale[] = ['ko'],
): DeferredA11yScenario[] {
  return listCriticalA11yScenes().flatMap((scene) => (
    locales.map((locale) => ({
      scene,
      locale,
      probes: [...scene.probes],
    }))
  ));
}

export function pickScenesForProbe(probeId: ProbeId): DeferredA11yScenario[] {
  return listCriticalA11yScenes()
    .filter((scene) => scene.probes.includes(probeId))
    .map((scene) => ({
      scene,
      locale: scene.locales[0] ?? 'ko',
      probes: [...scene.probes],
    }));
}
