import type { A11yLocale, A11ySceneDescriptor, A11ySceneId, ProbeId } from './types';

const FULL_PROBE_SET: ProbeId[] = ['axe', 'contrast', 'colorblind', 'keyboard', 'screen-reader'];
const VISUAL_PROBE_SET: ProbeId[] = ['axe', 'contrast', 'colorblind'];
const DEFAULT_LOCALES: A11yLocale[] = ['ko', 'en', 'ja'];

export const A11Y_AUDIT_SCENES: A11ySceneDescriptor[] = [
  {
    id: 'title',
    label: '타이틀 화면',
    route: '/?scene=title',
    criticalPath: false,
    requiresCanvasMirror: false,
    probes: VISUAL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['entry', 'branding'],
    notes: ['axe landmark 점검용 배너/메인 구조 필요'],
  },
  {
    id: 'main_menu',
    label: '메인 메뉴',
    route: '/?scene=main-menu',
    sourceScreenId: 'main_menu',
    criticalPath: true,
    requiresCanvasMirror: false,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['core-loop', 'navigation'],
  },
  {
    id: 'character_select',
    label: '캐릭터 생성',
    route: '/?scene=character-select',
    sourceScreenId: 'character_select',
    criticalPath: true,
    requiresCanvasMirror: false,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['form', 'radio-group'],
  },
  {
    id: 'world_map',
    label: '월드 맵',
    route: '/?scene=world-map',
    sourceScreenId: 'world_map',
    criticalPath: true,
    requiresCanvasMirror: true,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['canvas', 'travel'],
    notes: ['CanvasA11yLayer PoC 선행 필요'],
  },
  {
    id: 'battle',
    label: 'ATB 전투',
    route: '/?scene=battle',
    sourceScreenId: 'battle',
    criticalPath: true,
    requiresCanvasMirror: true,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['combat', 'canvas', 'live-region'],
    notes: ['전투 로그 aria-live와 게이지 대비 동시 검증'],
  },
  {
    id: 'inventory',
    label: '인벤토리',
    route: '/?scene=inventory',
    sourceScreenId: 'inventory',
    criticalPath: true,
    requiresCanvasMirror: false,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['modal', 'grid'],
  },
  {
    id: 'dialogue',
    label: 'NPC 대화',
    route: '/?scene=dialogue',
    sourceScreenId: 'dialogue',
    criticalPath: true,
    requiresCanvasMirror: false,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['dialog', 'live-region'],
  },
  {
    id: 'save_load',
    label: '세이브/로드',
    route: '/?scene=save-load',
    criticalPath: true,
    requiresCanvasMirror: false,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['modal', 'persistence'],
    notes: ['screen_reader SSOT 추가 시 sourceScreenId 연결'],
  },
  {
    id: 'skill_tree',
    label: '스킬 트리',
    route: '/?scene=skill-tree',
    criticalPath: false,
    requiresCanvasMirror: true,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['canvas', 'progression'],
    notes: ['노드 포커스 순서 설계 필요'],
  },
  {
    id: 'settings',
    label: '옵션',
    route: '/?scene=settings',
    sourceScreenId: 'settings',
    criticalPath: true,
    requiresCanvasMirror: false,
    probes: FULL_PROBE_SET,
    locales: DEFAULT_LOCALES,
    tags: ['settings', 'accessibility'],
  },
];

export function getA11ySceneDescriptor(sceneId: A11ySceneId): A11ySceneDescriptor | undefined {
  return A11Y_AUDIT_SCENES.find((scene) => scene.id === sceneId);
}

export function listCriticalA11yScenes(): A11ySceneDescriptor[] {
  return A11Y_AUDIT_SCENES.filter((scene) => scene.criticalPath);
}

export function collectScenesForProbe(probeId: ProbeId): A11ySceneDescriptor[] {
  return A11Y_AUDIT_SCENES.filter((scene) => scene.probes.includes(probeId));
}
