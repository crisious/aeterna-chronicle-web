export interface StatusIconSpec {
  readonly iconId: string;
  readonly runtimeKey: string;
  readonly runtimePath: string;
  readonly group: 'battle' | 'legacy_buff' | 'legacy_debuff';
}

export const STATUS_EFFECT_ICON_IDS = [
  'poison',
  'burn',
  'freeze',
  'stun',
  'silence',
  'slow',
  'blind',
  'bleed',
  'curse',
  'charm',
  'attack_up',
  'defense_up',
  'haste',
  'regen',
  'shield',
] as const;

const LEGACY_BUFF_STATUS_ICON_IDS = Array.from({ length: 5 }, (_, index) => {
  const padded = String(index + 1).padStart(3, '0');

  return `STS-BUF-${padded}`;
});

const LEGACY_DEBUFF_STATUS_ICON_IDS = Array.from({ length: 20 }, (_, index) => {
  const padded = String(index + 1).padStart(3, '0');

  return `STS-DBF-${padded}`;
});

function createRuntimeKey(iconId: string): string {
  if (STATUS_EFFECT_ICON_IDS.includes(iconId as typeof STATUS_EFFECT_ICON_IDS[number])) {
    return `status_${iconId}_icon`;
  }

  return `status_${iconId.replace(/[^A-Za-z0-9]+/g, '_')}_icon`;
}

function createRuntimePath(iconId: string): string {
  if (STATUS_EFFECT_ICON_IDS.includes(iconId as typeof STATUS_EFFECT_ICON_IDS[number])) {
    return `assets/generated/ui/icons/status/status_${iconId}.png`;
  }

  return `assets/generated/ui/icons/status/${iconId}.png`;
}

const BATTLE_STATUS_ICON_SPECS: readonly StatusIconSpec[] = STATUS_EFFECT_ICON_IDS.map((iconId) => ({
  iconId,
  runtimeKey: createRuntimeKey(iconId),
  runtimePath: createRuntimePath(iconId),
  group: 'battle',
}));

const LEGACY_STATUS_ICON_SPECS: readonly StatusIconSpec[] = [
  ...LEGACY_BUFF_STATUS_ICON_IDS.map((iconId) => ({
    iconId,
    runtimeKey: createRuntimeKey(iconId),
    runtimePath: createRuntimePath(iconId),
    group: 'legacy_buff' as const,
  })),
  ...LEGACY_DEBUFF_STATUS_ICON_IDS.map((iconId) => ({
    iconId,
    runtimeKey: createRuntimeKey(iconId),
    runtimePath: createRuntimePath(iconId),
    group: 'legacy_debuff' as const,
  })),
];

const STATUS_ICON_SPECS: readonly StatusIconSpec[] = [
  ...BATTLE_STATUS_ICON_SPECS,
  ...LEGACY_STATUS_ICON_SPECS,
];

const STATUS_ICON_SPEC_BY_ID: ReadonlyMap<string, StatusIconSpec> = new Map(
  STATUS_ICON_SPECS.map((spec) => [spec.iconId, spec] as const),
);

export function getAllStatusIconSpecs(): readonly StatusIconSpec[] {
  return STATUS_ICON_SPECS;
}

export function getStatusIconSpec(iconId: string): StatusIconSpec | undefined {
  return STATUS_ICON_SPEC_BY_ID.get(iconId);
}
