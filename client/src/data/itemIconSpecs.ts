export type ItemIconGroupKey = 'weapon' | 'armor' | 'accessory' | 'consumable' | 'material' | 'quest';

export interface ItemIconGroup {
  readonly group: ItemIconGroupKey;
  readonly prefix: string;
  readonly count: number;
  readonly sourceGroup: string;
}

export interface ItemIconSpec {
  readonly iconId: string;
  readonly group: ItemIconGroupKey;
  readonly sourceGroup: string;
  readonly prefix: string;
  readonly index: number;
  readonly padded: string;
  readonly runtimeKey: string;
  readonly runtimePath: string;
}

export const ITEM_ICON_GROUPS: readonly ItemIconGroup[] = [
  { group: 'weapon', prefix: 'ITM-WPN', count: 20, sourceGroup: 'weapon' },
  { group: 'armor', prefix: 'ITM-ARM', count: 20, sourceGroup: 'armor' },
  { group: 'accessory', prefix: 'ITM-ACC', count: 15, sourceGroup: 'accessory' },
  { group: 'consumable', prefix: 'ITM-CON', count: 20, sourceGroup: 'consumable' },
  { group: 'material', prefix: 'ITM-MAT', count: 15, sourceGroup: 'material' },
  { group: 'quest', prefix: 'ITM-QST', count: 10, sourceGroup: 'quest' },
] as const;

export function getAllItemIconSpecs(): readonly ItemIconSpec[] {
  return ITEM_ICON_GROUPS.flatMap((group) =>
    Array.from({ length: group.count }, (_, offset) => {
      const index = offset + 1;
      const padded = String(index).padStart(3, '0');
      const iconId = `${group.prefix}-${padded}`;

      return {
        iconId,
        group: group.group,
        sourceGroup: group.sourceGroup,
        prefix: group.prefix,
        index,
        padded,
        runtimeKey: `icon_item_${group.prefix}_${padded}`,
        runtimePath: `assets/generated/ui/icons/items/${iconId}.png`,
      };
    }),
  );
}
