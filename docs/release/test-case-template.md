# 테스트 케이스 템플릿 v1.0

> **작성**: 진채봉 Editor
> **용도**: 신규 테스트 케이스 작성 시 복붙용 골격
> **참조**: `e2e-test-guide.md`

---

## 1. 케이스 메타데이터

```yaml
id: TC-INV-007                    # TC-<UI|INV|SAV>-<3자리>
title: 신화 세트 6/6 착용 시 세트 옵션 합산
scope: inventory                  # ui | inventory | save
priority: P0                      # P0 | P1 | P2
type: integration                 # unit | integration | e2e
author: 적경홍
created: 2026-04-26
related:
  - launch_checklist.md §3.2
  - cross-browser-issues.md BUG-CB-???
```

---

## 2. Given-When-Then

```
Given (전제):
  - 플레이어 레벨 80 이상
  - 신화 세트 "여명의 증언" 6종을 인벤토리에 보유

When (행위):
  - 모든 6종을 차례로 착용한다

Then (기대):
  - 6/6 효과 표시줄이 활성화된다
  - 합산 공격력이 base + 240 이상이 된다
  - 시각 이펙트(`mythic-aura`)가 캐릭터에 부착된다
  - 사운드 `sfx_mythic_complete`가 1회 재생된다
```

---

## 3. Vitest 단위·통합 골격

```ts
// client/src/inventory/__tests__/MythicSet.integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createInventoryStore } from '../store';
import { mythicSetOf } from './fixtures/items';

describe('TC-INV-007: 신화 세트 6/6 착용', () => {
  let store: ReturnType<typeof createInventoryStore>;

  beforeEach(() => {
    store = createInventoryStore({ playerLevel: 80 });
  });

  it('6종 모두 착용 시 세트 옵션이 합산된다', () => {
    // Given
    const set = mythicSetOf('dawn-witness'); // 6종
    set.forEach((item) => store.dispatch({ type: 'PICKUP', item }));

    // When
    set.forEach((item) => store.dispatch({ type: 'EQUIP', itemId: item.id }));

    // Then
    expect(store.state.activeSetBonuses).toContain('dawn-witness-6pc');
    expect(store.state.totalAtk).toBeGreaterThanOrEqual(store.state.baseAtk + 240);
  });
});
```

---

## 4. Playwright E2E 골격

```ts
// client/e2e/inventory-mythic.spec.ts
import { test, expect } from '@playwright/test';
import { GamePage } from './pages/GamePage';

test.describe('@inventory @mythic', () => {
  test('TC-INV-007: 신화 세트 6/6 착용 시 시각 효과 부착', async ({ page }) => {
    const game = new GamePage(page);
    await game.bootWithSeed('mythic-set-ready');
    await game.openInventory();

    for (const slot of ['head', 'chest', 'hands', 'legs', 'feet', 'accessory']) {
      await game.equip(`mythic-dawn-${slot}`);
    }

    await expect(page.locator('[data-testid="set-bonus-6pc"]')).toBeVisible();
    await expect(page.locator('[data-testid="char-aura-mythic"]')).toHaveClass(/active/);
  });
});
```

---

## 5. 체크리스트 (PR 머지 전)

- [ ] 케이스 ID가 유일한가
- [ ] Given-When-Then이 한 화면에 수렴하는가
- [ ] 외부 의존(시간·랜덤·네트워크)이 모킹됐는가
- [ ] 실패 시 메시지가 `test-error-messages.md` §4 패턴을 따르는가
- [ ] 시각 회귀 스냅샷은 OS 폰트 차이를 허용하는 임계치(3%)인가
- [ ] `cross-browser-issues.md`에 연결된 BUG-CB가 있다면 `related`에 적었는가
