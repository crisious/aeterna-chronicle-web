/**
 * data-testid 셀렉터 SSOT
 * 작성: 가춘운 (CMO/디자인) · 2026-04-26
 * 참조: docs/art-production/qa-test-assets-v1.md §8
 *
 * 목적
 *   - E2E·통합 테스트가 className/id/text에 의존하지 않도록 단일 진실 공급원 제공
 *   - i18n(한/영/일) 변경, 스타일 리팩토링, DOM 순서 변경에 회귀 면역
 *
 * 사용 패턴
 *   import { sel } from '@tests/helpers/selectors';
 *   await page.click(sel.inv.slot(3));
 *   await expect(page.locator(sel.save.card(2))).toHaveAttribute('data-state', 'loaded');
 *
 * 네이밍 규칙
 *   data-testid="<scope>-<component>-<element>[-<index|modifier>]"
 *   예: inv-slot-item-3, save-slot-card-2, ui-toast-error
 */

// ─────────────────────────────────────────────
// §1. 인벤토리
// ─────────────────────────────────────────────
const inv = {
  /** 인벤토리 루트 컨테이너 */
  root: '[data-testid="inv-root"]',
  /** 슬롯 i (0~max-1) */
  slot: (i: number) => `[data-testid="inv-slot-${i}"]`,
  /** 슬롯 안의 아이템 아이콘 */
  item: (i: number) => `[data-testid="inv-slot-item-${i}"]`,
  /** 슬롯 우하단 수량 텍스트 */
  count: (i: number) => `[data-testid="inv-slot-count-${i}"]`,
  /** 잠긴 슬롯 (확장 필요) */
  locked: (i: number) => `[data-testid="inv-slot-${i}"][data-state="locked"]`,
  /** 탭 (equipment / consumable / material / quest 등) */
  tab: (name: string) => `[data-testid="inv-tab-${name}"]`,
  /** 정렬 / 필터 / 버리기 버튼 */
  sortBtn: '[data-testid="inv-action-sort"]',
  filterBtn: '[data-testid="inv-action-filter"]',
  trashBtn: '[data-testid="inv-action-trash"]',
  /** 카운터 (0/24, 24/24, 24/40 …) */
  counter: '[data-testid="inv-counter"]',
  /** "가득 참" 토스트 */
  fullToast: '[data-testid="inv-toast-full"]',
  /** 슬롯 확장 모달 (잠금 슬롯 클릭 시) */
  expandModal: '[data-testid="inv-modal-expand"]',
} as const;

// ─────────────────────────────────────────────
// §2. 세이브
// ─────────────────────────────────────────────
const save = {
  root: '[data-testid="save-root"]',
  /** 슬롯 카드 (1~4) */
  card: (i: number) => `[data-testid="save-slot-card-${i}"]`,
  /** 슬롯 상태 attr 셀렉터 (empty / loaded / corrupt / migration) */
  cardState: (i: number, state: SaveSlotState) =>
    `[data-testid="save-slot-card-${i}"][data-state="${state}"]`,
  /** 액션 버튼 */
  newGameBtn: (i: number) => `[data-testid="save-slot-new-btn-${i}"]`,
  loadBtn: (i: number) => `[data-testid="save-slot-load-btn-${i}"]`,
  deleteBtn: (i: number) => `[data-testid="save-slot-delete-btn-${i}"]`,
  recoverBtn: (i: number) => `[data-testid="save-slot-recover-btn-${i}"]`,
  migrateBtn: (i: number) => `[data-testid="save-slot-migrate-btn-${i}"]`,
  /** 메타 정보 */
  meta: {
    name: (i: number) => `[data-testid="save-slot-name-${i}"]`,
    level: (i: number) => `[data-testid="save-slot-level-${i}"]`,
    location: (i: number) => `[data-testid="save-slot-location-${i}"]`,
    progress: (i: number) => `[data-testid="save-slot-progress-${i}"]`,
    playtime: (i: number) => `[data-testid="save-slot-playtime-${i}"]`,
    timestamp: (i: number) => `[data-testid="save-slot-timestamp-${i}"]`,
  },
} as const;

export type SaveSlotState = 'empty' | 'loaded' | 'corrupt' | 'migration';

// ─────────────────────────────────────────────
// §3. UI 공통 (모달 / 토스트 / 버튼)
// ─────────────────────────────────────────────
const ui = {
  modal: {
    root: '[data-testid="ui-modal"]',
    confirm: '[data-testid="ui-modal-confirm"]',
    cancel: '[data-testid="ui-modal-cancel"]',
    title: '[data-testid="ui-modal-title"]',
    body: '[data-testid="ui-modal-body"]',
    close: '[data-testid="ui-modal-close"]',
  },
  toast: (kind: ToastKind) => `[data-testid="ui-toast-${kind}"]`,
  /** 메뉴 / HUD */
  hud: {
    menu: '[data-testid="ui-hud-menu"]',
    inventoryEntry: '[data-testid="ui-hud-inventory-entry"]',
    saveEntry: '[data-testid="ui-hud-save-entry"]',
    settingsEntry: '[data-testid="ui-hud-settings-entry"]',
  },
  /** 다이얼로그(NPC 대사) */
  dialog: {
    box: '[data-testid="ui-dialog-box"]',
    next: '[data-testid="ui-dialog-next"]',
    choice: (i: number) => `[data-testid="ui-dialog-choice-${i}"]`,
  },
} as const;

export type ToastKind = 'success' | 'error' | 'warn' | 'info';

// ─────────────────────────────────────────────
// §4. 전투 (회귀 테스트용 — combat 모듈과 공유)
// ─────────────────────────────────────────────
const combat = {
  atb: {
    gauge: (charIdx: number) => `[data-testid="combat-atb-gauge-${charIdx}"]`,
    ready: (charIdx: number) =>
      `[data-testid="combat-atb-gauge-${charIdx}"][data-state="ready"]`,
  },
  cmd: {
    menu: '[data-testid="combat-cmd-menu"]',
    attack: '[data-testid="combat-cmd-attack-btn"]',
    skill: '[data-testid="combat-cmd-skill-btn"]',
    item: '[data-testid="combat-cmd-item-btn"]',
    defend: '[data-testid="combat-cmd-defend-btn"]',
  },
  target: (idx: number) => `[data-testid="combat-target-${idx}"]`,
  damagePopup: '[data-testid="combat-damage-popup"]',
} as const;

// ─────────────────────────────────────────────
// §5. QA 대시보드 (tests/reports/index.html)
// ─────────────────────────────────────────────
const dashboard = {
  summary: '[data-testid="qa-summary"]',
  coverage: '[data-testid="qa-coverage"]',
  byModule: '[data-testid="qa-by-module"]',
  failingTop5: '[data-testid="qa-failing-top5"]',
  trend: '[data-testid="qa-trend"]',
  /** 배지 (PASS/FAIL/SKIP/PENDING/FLAKY) */
  badge: (kind: BadgeKind) => `[data-testid="qa-badge-${kind}"]`,
} as const;

export type BadgeKind = 'pass' | 'fail' | 'skip' | 'pending' | 'flaky';

// ─────────────────────────────────────────────
// §6. 통합 export
// ─────────────────────────────────────────────
export const sel = {
  inv,
  save,
  ui,
  combat,
  dashboard,
} as const;

/**
 * 안티패턴 가드 — 테스트가 금지 패턴을 쓰면 lint 에러로 잡고 싶을 때
 * (eslint 룰은 별도 프로젝트에서)
 */
export const FORBIDDEN_PATTERNS = [
  /\.button\.primary/,
  /#save-slot-\d+/,
  /text=확인|text=취소|text=Confirm/,
  /:nth-child\(\d+\)/,
] as const;
