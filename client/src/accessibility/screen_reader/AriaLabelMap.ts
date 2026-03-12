/**
 * AriaLabelMap — 주요 화면 10개의 ARIA 매핑 정의 (P17-13)
 *
 * 각 화면의 인터랙티브/정보성 요소에 대한
 * role, aria-label, tabindex, aria-live 매핑을 선언적으로 정의.
 *
 * AccessibilityManager / ScreenReaderBridge 에서 참조.
 */

// ─── 타입 ───────────────────────────────────────────────────────

export type AriaRole =
  | 'application' | 'button' | 'checkbox' | 'combobox'
  | 'complementary' | 'contentinfo' | 'dialog' | 'grid'
  | 'gridcell' | 'group' | 'img' | 'list' | 'listbox'
  | 'log' | 'navigation' | 'option' | 'progressbar'
  | 'radio' | 'radiogroup' | 'region' | 'slider'
  | 'status' | 'switch' | 'tab' | 'tablist' | 'textbox';

export type AriaLive = 'off' | 'polite' | 'assertive';

export interface AriaElementDef {
  /** DOM 선택자 또는 data-aria-id */
  selector: string;
  /** ARIA role */
  role: AriaRole;
  /** 정적 aria-label (동적인 경우 labelFn 사용) */
  label?: string;
  /** 동적 라벨 생성 함수명 (ScreenReaderBridge에서 해석) */
  labelFn?: string;
  /** tabindex — 포커스 가능 여부 */
  tabindex: number;
  /** aria-live 설정 */
  live?: AriaLive;
  /** 추가 ARIA 속성 */
  extra?: Record<string, string>;
  /** 포커스 그룹 (포커스 순서 관리용) */
  focusGroup?: string;
  /** 포커스 순서 (그룹 내) */
  focusOrder?: number;
}

export interface ScreenAriaMap {
  /** 화면 식별자 */
  screenId: string;
  /** 화면 표시명 */
  label_ko: string;
  label_en: string;
  /** 포커스 트랩 여부 (모달) */
  focusTrap: boolean;
  /** 요소 목록 */
  elements: AriaElementDef[];
}

// ─── 매핑 정의 ──────────────────────────────────────────────────

export const ARIA_MAPS: ScreenAriaMap[] = [
  // ── 1. 메인 메뉴 ────────────────────────────────
  {
    screenId: 'main_menu',
    label_ko: '메인 메뉴',
    label_en: 'Main Menu',
    focusTrap: false,
    elements: [
      { selector: '[data-aria-id="menu-nav"]', role: 'navigation', label: '메인 메뉴', tabindex: -1 },
      { selector: '[data-aria-id="btn-new-game"]', role: 'button', label: '새 게임 시작', tabindex: 0, focusGroup: 'menu', focusOrder: 1 },
      { selector: '[data-aria-id="btn-continue"]', role: 'button', labelFn: 'getContinueLabel', tabindex: 0, focusGroup: 'menu', focusOrder: 2 },
      { selector: '[data-aria-id="btn-settings"]', role: 'button', label: '설정', tabindex: 0, focusGroup: 'menu', focusOrder: 3 },
      { selector: '[data-aria-id="btn-quit"]', role: 'button', label: '게임 종료', tabindex: 0, focusGroup: 'menu', focusOrder: 4 },
      { selector: '[data-aria-id="version"]', role: 'contentinfo', labelFn: 'getVersionLabel', tabindex: -1 },
    ],
  },

  // ── 2. 캐릭터 선택 ──────────────────────────────
  {
    screenId: 'character_select',
    label_ko: '캐릭터 선택',
    label_en: 'Character Select',
    focusTrap: false,
    elements: [
      { selector: '[data-aria-id="class-group"]', role: 'radiogroup', label: '클래스 선택', tabindex: -1 },
      { selector: '[data-aria-id="class-ether_knight"]', role: 'radio', label: '에테르 기사 — 근접 탱커/딜러', tabindex: 0, extra: { 'aria-checked': 'false' }, focusGroup: 'class', focusOrder: 1 },
      { selector: '[data-aria-id="class-memory_weaver"]', role: 'radio', label: '기억의 직조자 — 원거리 마법사', tabindex: 0, extra: { 'aria-checked': 'false' }, focusGroup: 'class', focusOrder: 2 },
      { selector: '[data-aria-id="class-shadow_weaver"]', role: 'radio', label: '그림자 직조자 — 은신 암살자', tabindex: 0, extra: { 'aria-checked': 'false' }, focusGroup: 'class', focusOrder: 3 },
      { selector: '[data-aria-id="class-memory_breaker"]', role: 'radio', label: '기억 파쇄자 — 근접 파괴자', tabindex: 0, extra: { 'aria-checked': 'false' }, focusGroup: 'class', focusOrder: 4 },
      { selector: '[data-aria-id="class-time_guardian"]', role: 'radio', label: '시간의 수호자 — 방어 전문가', tabindex: 0, extra: { 'aria-checked': 'false' }, focusGroup: 'class', focusOrder: 5 },
      { selector: '[data-aria-id="class-void_wanderer"]', role: 'radio', label: '공허의 방랑자 — 차원 조작자', tabindex: 0, extra: { 'aria-checked': 'false' }, focusGroup: 'class', focusOrder: 6 },
      { selector: '[data-aria-id="class-detail"]', role: 'region', label: '선택된 클래스 상세', tabindex: -1, live: 'polite' },
      { selector: '[data-aria-id="char-name-input"]', role: 'textbox', label: '캐릭터 이름 입력', tabindex: 0, focusGroup: 'class', focusOrder: 7 },
      { selector: '[data-aria-id="btn-create"]', role: 'button', label: '캐릭터 생성', tabindex: 0, focusGroup: 'class', focusOrder: 8 },
    ],
  },

  // ── 3. 게임 HUD ─────────────────────────────────
  {
    screenId: 'hud',
    label_ko: '게임 HUD',
    label_en: 'Game HUD',
    focusTrap: false,
    elements: [
      { selector: '[data-aria-id="hud-container"]', role: 'complementary', label: '게임 HUD', tabindex: -1 },
      { selector: '[data-aria-id="hp-bar"]', role: 'progressbar', labelFn: 'getHpLabel', tabindex: -1, extra: { 'aria-valuemin': '0' } },
      { selector: '[data-aria-id="mp-bar"]', role: 'progressbar', labelFn: 'getMpLabel', tabindex: -1, extra: { 'aria-valuemin': '0' } },
      { selector: '[data-aria-id="exp-bar"]', role: 'progressbar', labelFn: 'getExpLabel', tabindex: -1 },
      { selector: '[data-aria-id="skill-1"]', role: 'button', labelFn: 'getSkillLabel', tabindex: 0, focusGroup: 'hud', focusOrder: 1 },
      { selector: '[data-aria-id="skill-2"]', role: 'button', labelFn: 'getSkillLabel', tabindex: 0, focusGroup: 'hud', focusOrder: 2 },
      { selector: '[data-aria-id="skill-3"]', role: 'button', labelFn: 'getSkillLabel', tabindex: 0, focusGroup: 'hud', focusOrder: 3 },
      { selector: '[data-aria-id="skill-4"]', role: 'button', labelFn: 'getSkillLabel', tabindex: 0, focusGroup: 'hud', focusOrder: 4 },
      { selector: '[data-aria-id="potion-slot"]', role: 'button', labelFn: 'getPotionLabel', tabindex: 0, focusGroup: 'hud', focusOrder: 5 },
      { selector: '[data-aria-id="minimap"]', role: 'img', labelFn: 'getMinimapLabel', tabindex: -1 },
      { selector: '[data-aria-id="quest-tracker"]', role: 'list', label: '활성 퀘스트', tabindex: -1, live: 'polite' },
    ],
  },

  // ── 4. 인벤토리 ─────────────────────────────────
  {
    screenId: 'inventory',
    label_ko: '인벤토리',
    label_en: 'Inventory',
    focusTrap: true,
    elements: [
      { selector: '[data-aria-id="inventory-dialog"]', role: 'dialog', label: '인벤토리', tabindex: -1 },
      { selector: '[data-aria-id="inv-tablist"]', role: 'tablist', label: '인벤토리 카테고리', tabindex: -1 },
      { selector: '[data-aria-id="inv-tab-equip"]', role: 'tab', label: '장비', tabindex: 0, focusGroup: 'inv', focusOrder: 1 },
      { selector: '[data-aria-id="inv-tab-consumable"]', role: 'tab', label: '소비', tabindex: 0, focusGroup: 'inv', focusOrder: 2 },
      { selector: '[data-aria-id="inv-tab-material"]', role: 'tab', label: '재료', tabindex: 0, focusGroup: 'inv', focusOrder: 3 },
      { selector: '[data-aria-id="inv-tab-etc"]', role: 'tab', label: '기타', tabindex: 0, focusGroup: 'inv', focusOrder: 4 },
      { selector: '[data-aria-id="inv-grid"]', role: 'grid', label: '아이템 목록', tabindex: -1 },
      { selector: '[data-aria-id="inv-detail"]', role: 'region', label: '아이템 상세 정보', tabindex: -1, live: 'polite' },
      { selector: '[data-aria-id="inv-close"]', role: 'button', label: '인벤토리 닫기', tabindex: 0, focusGroup: 'inv', focusOrder: 99 },
    ],
  },

  // ── 5. 대화 상자 ────────────────────────────────
  {
    screenId: 'dialogue',
    label_ko: '대화',
    label_en: 'Dialogue',
    focusTrap: true,
    elements: [
      { selector: '[data-aria-id="dialogue-container"]', role: 'dialog', label: '대화', tabindex: -1 },
      { selector: '[data-aria-id="dialogue-text"]', role: 'log', label: '대사', tabindex: -1, live: 'polite' },
      { selector: '[data-aria-id="dialogue-choices"]', role: 'listbox', label: '대화 선택지', tabindex: 0, focusGroup: 'dialogue', focusOrder: 1 },
      { selector: '[data-aria-id="dialogue-next"]', role: 'button', label: '다음', tabindex: 0, focusGroup: 'dialogue', focusOrder: 2 },
    ],
  },

  // ── 6. 전투 화면 ────────────────────────────────
  {
    screenId: 'battle',
    label_ko: '전투',
    label_en: 'Battle',
    focusTrap: false,
    elements: [
      { selector: 'canvas', role: 'application', label: '전투 화면', tabindex: 0 },
      { selector: '[data-aria-id="combat-log"]', role: 'log', label: '전투 기록', tabindex: -1, live: 'assertive' },
      { selector: '[data-aria-id="target-info"]', role: 'status', labelFn: 'getTargetLabel', tabindex: -1, live: 'polite' },
      { selector: '[data-aria-id="boss-hp"]', role: 'progressbar', labelFn: 'getBossHpLabel', tabindex: -1 },
    ],
  },

  // ── 7. 설정 화면 ────────────────────────────────
  {
    screenId: 'settings',
    label_ko: '설정',
    label_en: 'Settings',
    focusTrap: true,
    elements: [
      { selector: '[data-aria-id="settings-dialog"]', role: 'dialog', label: '설정', tabindex: -1 },
      { selector: '[data-aria-id="settings-tablist"]', role: 'tablist', label: '설정 카테고리', tabindex: -1 },
      { selector: '[data-aria-id="settings-close"]', role: 'button', label: '설정 닫기', tabindex: 0, focusGroup: 'settings', focusOrder: 99 },
    ],
  },

  // ── 8. 월드 맵 ──────────────────────────────────
  {
    screenId: 'world_map',
    label_ko: '월드 맵',
    label_en: 'World Map',
    focusTrap: false,
    elements: [
      { selector: '[data-aria-id="world-map"]', role: 'application', label: '월드 맵', tabindex: 0 },
      { selector: '[data-aria-id="current-location"]', role: 'status', labelFn: 'getCurrentLocationLabel', tabindex: -1 },
    ],
  },

  // ── 9. 던전 선택 ────────────────────────────────
  {
    screenId: 'dungeon_select',
    label_ko: '던전 선택',
    label_en: 'Dungeon Select',
    focusTrap: false,
    elements: [
      { selector: '[data-aria-id="dungeon-list"]', role: 'listbox', labelFn: 'getDungeonListLabel', tabindex: -1 },
      { selector: '[data-aria-id="dungeon-detail"]', role: 'region', label: '던전 정보', tabindex: -1, live: 'polite' },
      { selector: '[data-aria-id="btn-enter-dungeon"]', role: 'button', labelFn: 'getEnterDungeonLabel', tabindex: 0, focusGroup: 'dungeon', focusOrder: 1 },
    ],
  },

  // ── 10. 채팅 ────────────────────────────────────
  {
    screenId: 'chat',
    label_ko: '채팅',
    label_en: 'Chat',
    focusTrap: false,
    elements: [
      { selector: '[data-aria-id="chat-panel"]', role: 'complementary', label: '채팅', tabindex: -1 },
      { selector: '[data-aria-id="chat-log"]', role: 'log', label: '채팅 기록', tabindex: -1, live: 'polite' },
      { selector: '[data-aria-id="chat-tablist"]', role: 'tablist', label: '채팅 채널', tabindex: -1 },
      { selector: '[data-aria-id="chat-tab-all"]', role: 'tab', label: '전체', tabindex: 0, focusGroup: 'chat', focusOrder: 1 },
      { selector: '[data-aria-id="chat-tab-party"]', role: 'tab', label: '파티', tabindex: 0, focusGroup: 'chat', focusOrder: 2 },
      { selector: '[data-aria-id="chat-tab-guild"]', role: 'tab', label: '길드', tabindex: 0, focusGroup: 'chat', focusOrder: 3 },
      { selector: '[data-aria-id="chat-tab-whisper"]', role: 'tab', label: '귓속말', tabindex: 0, focusGroup: 'chat', focusOrder: 4 },
      { selector: '[data-aria-id="chat-input"]', role: 'textbox', label: '메시지 입력', tabindex: 0, focusGroup: 'chat', focusOrder: 5 },
      { selector: '[data-aria-id="chat-send"]', role: 'button', label: '전송', tabindex: 0, focusGroup: 'chat', focusOrder: 6 },
    ],
  },
];

/** 화면 ID로 매핑 조회 */
export function getAriaMap(screenId: string): ScreenAriaMap | undefined {
  return ARIA_MAPS.find(m => m.screenId === screenId);
}

/** 전체 매핑 반환 */
export function getAllAriaMaps(): ScreenAriaMap[] {
  return ARIA_MAPS;
}
