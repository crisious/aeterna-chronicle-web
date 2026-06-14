import type * as Phaser from 'phaser';
import { getAllItemIconSpecs, type ItemIconGroupKey } from './itemIconSpecs';

type ItemIconSource = {
  readonly code?: unknown;
  readonly iconId?: unknown;
  readonly itemCode?: unknown;
  readonly itemIconId?: unknown;
  readonly itemId?: unknown;
  readonly type?: unknown;
  readonly item?: {
    readonly code?: unknown;
    readonly iconId?: unknown;
    readonly itemCode?: unknown;
    readonly itemIconId?: unknown;
    readonly itemId?: unknown;
    readonly type?: unknown;
  } | null;
};

export interface ItemIconResource {
  readonly key: string;
  readonly path: string;
  readonly itemIconId: string;
  readonly frameWidth: 64;
  readonly frameHeight: 64;
  readonly frameCount: 1;
}

const ITEM_ICON_RESOURCES = getAllItemIconSpecs().map((spec): ItemIconResource => ({
  key: spec.runtimeKey,
  path: spec.runtimePath,
  itemIconId: spec.iconId,
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 1,
}));

const ITEM_ICON_RESOURCE_BY_ID = new Map(ITEM_ICON_RESOURCES.map((resource) => [resource.itemIconId, resource] as const));
const ITEM_ICON_IDS = new Set(ITEM_ICON_RESOURCE_BY_ID.keys());

const ITEM_ICON_GROUP_MAX: Record<ItemIconGroupKey, number> = {
  weapon: 20,
  armor: 20,
  accessory: 15,
  consumable: 20,
  material: 15,
  quest: 10,
};

const ITEM_ICON_PREFIX_BY_GROUP: Record<ItemIconGroupKey, string> = {
  weapon: 'ITM-WPN',
  armor: 'ITM-ARM',
  accessory: 'ITM-ACC',
  consumable: 'ITM-CON',
  material: 'ITM-MAT',
  quest: 'ITM-QST',
};

const SHOP_CONSUMABLE_ICON_IDS: Record<string, string> = {
  CON_HP_S: 'ITM-CON-001',
  CON_HP_M: 'ITM-CON-002',
  CON_MP_S: 'ITM-CON-003',
  CON_HP_L: 'ITM-CON-004',
  CON_MP_M: 'ITM-CON-005',
  CON_MP_L: 'ITM-CON-006',
};

function asCleanString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function getFirstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = asCleanString(value);
    if (text) return text;
  }

  return undefined;
}

function getGroupFromType(type: string | undefined): ItemIconGroupKey | undefined {
  const normalized = type?.toLowerCase();
  if (!normalized) return undefined;

  if (normalized.includes('weapon')) return 'weapon';
  if (normalized.includes('armor')) return 'armor';
  if (normalized.includes('accessory')) return 'accessory';
  if (normalized.includes('consumable') || normalized.includes('potion')) return 'consumable';
  if (normalized.includes('material')) return 'material';
  if (normalized.includes('quest')) return 'quest';

  return undefined;
}

function getGroupFromCode(code: string): ItemIconGroupKey | undefined {
  const normalized = code.toUpperCase();
  if (normalized.startsWith('ITM-WPN') || normalized.startsWith('WPN') || normalized.startsWith('WP-')) return 'weapon';
  if (normalized.startsWith('ITM-ARM') || normalized.startsWith('ARM') || normalized.startsWith('AM-')) return 'armor';
  if (normalized.startsWith('ITM-ACC') || normalized.startsWith('ACC')) return 'accessory';
  if (
    normalized.startsWith('ITM-CON')
    || normalized.startsWith('CON')
    || normalized.startsWith('CS-')
    || normalized.startsWith('POT')
    || normalized.includes('POTION')
    || normalized.includes('HP_')
    || normalized.includes('MP_')
  ) return 'consumable';
  if (normalized.startsWith('ITM-MAT') || normalized.startsWith('MAT')) return 'material';
  if (normalized.startsWith('ITM-QST') || normalized.startsWith('QST') || normalized.includes('QUEST')) return 'quest';

  return undefined;
}

function getIndexFromCode(code: string, group: ItemIconGroupKey): number {
  const match = code.match(/(\d{1,3})/u);
  if (!match) return 1;

  const rawIndex = Number.parseInt(match[1], 10);
  if (!Number.isFinite(rawIndex) || rawIndex <= 0) return 1;

  return Math.min(rawIndex, ITEM_ICON_GROUP_MAX[group]);
}

function toItemIconId(group: ItemIconGroupKey, index: number): string {
  return `${ITEM_ICON_PREFIX_BY_GROUP[group]}-${String(index).padStart(3, '0')}`;
}

function getExplicitItemIconId(source: ItemIconSource): string | undefined {
  const explicit = getFirstString(
    source.itemIconId,
    source.iconId,
    source.item?.itemIconId,
    source.item?.iconId,
  );

  return explicit && ITEM_ICON_IDS.has(explicit) ? explicit : undefined;
}

export function resolveAsepriteItemIconId(source: ItemIconSource): string | undefined {
  const explicit = getExplicitItemIconId(source);
  if (explicit) return explicit;

  const code = getFirstString(
    source.code,
    source.itemCode,
    source.itemId,
    source.item?.code,
    source.item?.itemCode,
    source.item?.itemId,
  );
  if (!code) return undefined;

  const normalizedCode = code.toUpperCase();
  if (ITEM_ICON_IDS.has(normalizedCode)) return normalizedCode;

  const shopIconId = SHOP_CONSUMABLE_ICON_IDS[normalizedCode];
  if (shopIconId) return shopIconId;

  const type = getFirstString(source.type, source.item?.type);
  const group = getGroupFromCode(code) ?? getGroupFromType(type);
  if (!group) return undefined;

  const iconId = toItemIconId(group, getIndexFromCode(code, group));
  return ITEM_ICON_IDS.has(iconId) ? iconId : toItemIconId(group, 1);
}

export function getItemIconResource(source: ItemIconSource): ItemIconResource | undefined {
  const iconId = resolveAsepriteItemIconId(source);
  return iconId ? ITEM_ICON_RESOURCE_BY_ID.get(iconId) : undefined;
}

export function preloadItemIconResources(scene: Phaser.Scene): void {
  for (const resource of ITEM_ICON_RESOURCES) {
    if (!scene.textures.exists(resource.key)) {
      scene.load.image(resource.key, resource.path);
    }
  }
}
