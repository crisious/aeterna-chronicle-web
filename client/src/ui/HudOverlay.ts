import * as Phaser from 'phaser';

import {
  getSpriteResourceForSkillIcon,
  getSpriteResourceForWorldZoneIcon,
} from '../assets/spriteResourceManifest';
import { getItemIconResource } from '../data/itemIconResources';
import { buildQuestRowHtml, type QuestItem } from './questRowView';
import { deriveQuestGuideFields } from './questGuide';

// 하위 호환: 기존 `import { QuestItem } from './HudOverlay'` 경로 유지.
// 실제 정의/렌더 로직은 phaser-free 모듈 questRowView 에 있다(node 테스트 가능).
export type { QuestItem };

type InputMode = 'keyboard' | 'gamepad';

export interface HudStatusProps {
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
  level: number;
  expRatio: number;
  avatarImageKey?: string;
  avatarUrl?: string;
  characterName: string;
  dangerHpThreshold?: number;
}

export interface QuickSlotData {
  slotIndex: number;
  icon: string;
  iconImageKey?: string;
  iconImagePath?: string;
  label: string;
  cooldownMs: number;
  remainingCooldownMs: number;
  stackCount: number;
  isUsable: boolean;
  hotkey: string;
}

export interface DialogueChoice {
  choiceId: string;
  text: string;
  disabled: boolean;
  hint?: string;
}

export interface DialogueData {
  speakerName: string;
  speakerPortrait?: string;
  bodyText: string;
  choices?: DialogueChoice[];
  canSkip?: boolean;
  autoAdvanceMs?: number;
}

export const HUD_OVERLAY_UI_FRAME_ASSETS = {
  statusPanel: {
    key: 'ui_frame_UI-HUD-007-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-007-DEF.png',
    elementSelector: '#hud-status',
  },
  quickSlotPanel: {
    key: 'ui_frame_UI-HUD-001-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-001-DEF.png',
    elementSelector: '#hud-quickslot-wrap',
  },
  questTracker: {
    key: 'ui_frame_UI-HUD-008-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-008-DEF.png',
    elementSelector: '#hud-quest-wrap',
  },
  dialoguePanel: {
    key: 'ui_frame_UI-HUD-006-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-006-DEF.png',
    elementSelector: '#hud-dialogue',
  },
} as const;

export const HUD_OVERLAY_UI_BUTTON_FRAME_ASSET = {
  key: 'ui_frame_hud_dom_button',
  path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  elementSelector: '.hud-slot, .hud-dialogue-choice, .hud-quest-map-btn',
} as const;

export class HudOverlay {
  private readonly scene: Phaser.Scene;
  private readonly dom: Phaser.GameObjects.DOMElement;

  private status: HudStatusProps = {
    hpCurrent: 100,
    hpMax: 100,
    mpCurrent: 100,
    mpMax: 100,
    level: 1,
    expRatio: 0,
    characterName: 'Erien',
    dangerHpThreshold: 0.2
  };

  private quickSlots: QuickSlotData[] = [];
  private quests: QuestItem[] = [];

  /** Dirty flags for partial DOM updates */
  // dirtyStatus는 개별 필드 dirty check로 대체 (lastHpPercent 등)
  private dirtyQuickSlots = true;
  // dirtyQuests는 questHash 기반 변경 감지로 대체

  /** Cached values for dirty checking */
  private lastHpPercent = -1;
  private lastMpPercent = -1;
  private lastExpPercent = -1;
  private lastHpText = '';
  private lastMpText = '';
  private lastCharName = '';
  private lastLevel = -1;
  private lastHpDanger = false;
  private lastAvatarUrl = '';

  /** Quest hash for change detection */
  private lastQuestHash = '';

  private readonly root: HTMLDivElement;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.dom = this.scene.add.dom(0, 0).createFromHTML(this.template());
    this.dom.setOrigin(0, 0).setScrollFactor(0).setDepth(9999);

    this.root = this.dom.node as HTMLDivElement;

    this.bindEvents();
    this.layout();
    this.writeHudFrameQaProbe();
    this.scene.scale.on('resize', this.layout, this);
  }

  destroy(): void {
    this.scene.scale.off('resize', this.layout, this);
    this.dom.destroy();
  }

  setStatus(props: HudStatusProps): void {
    this.status = {
      ...props,
      dangerHpThreshold: props.dangerHpThreshold ?? 0.2
    };
    this.renderStatus();
    this.writeHudFrameQaProbe();
  }

  setQuickSlots(slots: QuickSlotData[], inputMode: InputMode): void {
    this.quickSlots = slots;
    this.dirtyQuickSlots = true;
    this.renderQuickSlots(inputMode);
    this.writeHudFrameQaProbe();
  }

  setQuests(quests: QuestItem[]): void {
    this.quests = quests;
    this.renderQuests();
    this.writeHudFrameQaProbe();
  }

  showDialogue(data: DialogueData): void {
    const panel = this.query<HTMLElement>('#hud-dialogue');
    const speaker = this.query<HTMLElement>('#hud-dialogue-speaker');
    const body = this.query<HTMLElement>('#hud-dialogue-body');
    const choices = this.query<HTMLElement>('#hud-dialogue-choices');

    speaker.textContent = data.speakerName;
    body.textContent = data.bodyText;

    choices.innerHTML = '';
    if ((data.choices ?? []).length > 0) {
      for (const choice of data.choices ?? []) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hud-dialogue-choice';
        button.textContent = choice.text;
        button.disabled = choice.disabled;
        button.dataset.choiceId = choice.choiceId;
        if (choice.hint) {
          button.title = choice.hint;
        }
        choices.appendChild(button);
      }
    }

    panel.style.display = 'block';
    this.writeHudFrameQaProbe();
  }

  hideDialogue(): void {
    this.query<HTMLElement>('#hud-dialogue').style.display = 'none';
    this.writeHudFrameQaProbe();
  }

  update(deltaMs: number): void {
    if (deltaMs <= 0) {
      return;
    }

    let changed = false;
    const nextSlots = this.quickSlots.map((slot) => {
      if (slot.remainingCooldownMs <= 0) {
        return slot;
      }

      changed = true;
      return {
        ...slot,
        remainingCooldownMs: Math.max(0, slot.remainingCooldownMs - deltaMs)
      };
    });

    if (changed) {
      this.quickSlots = nextSlots;
      this.updateCooldowns();
    }
  }

  private updateCooldowns(): void {
    const container = this.query<HTMLElement>('#hud-quickslots');
    const buttons = container.querySelectorAll<HTMLButtonElement>('[data-slot-index]');

    for (const button of buttons) {
      const slotIndex = Number(button.dataset.slotIndex);
      const slot = this.quickSlots.find((s) => s.slotIndex === slotIndex);
      if (!slot) continue;

      const cdEl = button.querySelector<HTMLElement>('.slot-cd');
      if (cdEl) {
        const remainingSec = Math.ceil(slot.remainingCooldownMs / 1000);
        cdEl.textContent = slot.remainingCooldownMs > 0 ? `${remainingSec}s` : 'Ready';
      }

      if (slot.remainingCooldownMs > 0) {
        button.classList.add('slot-cooldown');
      } else {
        button.classList.remove('slot-cooldown');
      }
    }
  }

  triggerSlotByHotkey(hotkey: string): void {
    const slot = this.quickSlots.find((item) => item.hotkey === hotkey);
    if (!slot) {
      return;
    }

    if (!slot.isUsable || slot.remainingCooldownMs > 0) {
      this.scene.events.emit('ui.event.quickslot.invalid_use', { slotIndex: slot.slotIndex });
      return;
    }

    this.scene.events.emit('ui.event.quickslot.use', { slotIndex: slot.slotIndex });

    this.quickSlots = this.quickSlots.map((item) => {
      if (item.slotIndex !== slot.slotIndex) {
        return item;
      }
      return {
        ...item,
        remainingCooldownMs: item.cooldownMs
      };
    });

    this.renderQuickSlots('keyboard');
  }

  private layout(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.dom.setPosition(0, 0);
    this.root.style.width = `${width}px`;
    this.root.style.height = `${height}px`;

    this.renderStatus();
    this.renderQuickSlots('keyboard');
    this.renderQuests();
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;

      if (target.closest('#hud-avatar')) {
        this.scene.events.emit('ui.event.status.avatar_click');
      }

      const slot = target.closest<HTMLButtonElement>('[data-slot-index]');
      if (slot) {
        const slotIndex = Number(slot.dataset.slotIndex);
        this.scene.events.emit('ui.event.quickslot.select', { slotIndex });
      }

      const choice = target.closest<HTMLButtonElement>('[data-choice-id]');
      if (choice) {
        const choiceId = choice.dataset.choiceId ?? '';
        this.scene.events.emit('ui.event.dialogue.choice_confirm', { choiceId });
      }

      // 퀘스트 "월드맵 열기" 버튼 → GameScene 이 수신해 WorldScene 진입.
      const mapBtn = target.closest<HTMLButtonElement>('[data-map-zone-id]');
      if (mapBtn) {
        const zoneId = mapBtn.dataset.mapZoneId ?? '';
        this.scene.events.emit('ui.event.quest.open_map', { zoneId });
      }
    });
  }

  private renderStatus(): void {
    const hpRatio = this.safeRatio(this.status.hpCurrent, this.status.hpMax);
    const mpRatio = this.safeRatio(this.status.mpCurrent, this.status.mpMax);
    const expRatio = Phaser.Math.Clamp(this.status.expRatio, 0, 1);

    const hpPercent = Math.floor(hpRatio * 100);
    const mpPercent = Math.floor(mpRatio * 100);
    const expPercent = Math.floor(expRatio * 100);

    const hpText = `${this.status.hpCurrent}/${this.status.hpMax}`;
    const mpText = `${this.status.mpCurrent}/${this.status.mpMax}`;
    const hpDanger = hpRatio <= (this.status.dangerHpThreshold ?? 0.2);

    this.renderAvatar();

    // Dirty check: 실제 변경된 DOM 요소만 업데이트
    if (hpPercent !== this.lastHpPercent) {
      this.query<HTMLElement>('#hud-hp-fill').style.width = `${hpPercent}%`;
      this.lastHpPercent = hpPercent;
    }

    if (mpPercent !== this.lastMpPercent) {
      this.query<HTMLElement>('#hud-mp-fill').style.width = `${mpPercent}%`;
      this.lastMpPercent = mpPercent;
    }

    if (expPercent !== this.lastExpPercent) {
      this.query<HTMLElement>('#hud-exp-fill').style.width = `${expPercent}%`;
      this.lastExpPercent = expPercent;
    }

    if (hpText !== this.lastHpText) {
      this.query<HTMLElement>('#hud-hp-text').textContent = hpText;
      this.lastHpText = hpText;
    }

    if (mpText !== this.lastMpText) {
      this.query<HTMLElement>('#hud-mp-text').textContent = mpText;
      this.lastMpText = mpText;
    }

    if (this.status.characterName !== this.lastCharName) {
      this.query<HTMLElement>('#hud-name').textContent = this.status.characterName;
      this.lastCharName = this.status.characterName;
    }

    if (this.status.level !== this.lastLevel) {
      this.query<HTMLElement>('#hud-level').textContent = `Lv.${this.status.level}`;
      this.lastLevel = this.status.level;
    }

    if (hpDanger !== this.lastHpDanger) {
      this.query<HTMLElement>('#hud-hp-fill').style.filter = hpDanger ? 'brightness(1.35)' : 'none';
      this.lastHpDanger = hpDanger;
    }

    if (hpDanger) {
      this.scene.events.emit('ui.event.status.hp_critical');
    }
  }

  private renderQuickSlots(inputMode: InputMode): void {
    const container = this.query<HTMLElement>('#hud-quickslots');

    if (this.dirtyQuickSlots) {
      // Full rebuild only when slot data structurally changed
      container.innerHTML = '';

      for (const slot of this.quickSlots) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'hud-slot';
        button.dataset.slotIndex = String(slot.slotIndex);
        button.setAttribute('aria-label', `${slot.label} ${slot.hotkey}`);

        const remainingSec = Math.ceil(slot.remainingCooldownMs / 1000);
        const cooldownText = slot.remainingCooldownMs > 0 ? `${remainingSec}s` : 'Ready';
        const stackText = slot.stackCount > 0 ? `x${slot.stackCount}` : '-';

        button.appendChild(this.createTextSpan('slot-hotkey', slot.hotkey));
        button.appendChild(this.createQuickSlotIconElement(slot));
        button.appendChild(this.createTextSpan('slot-label', slot.label));
        button.appendChild(this.createTextSpan('slot-cd', cooldownText));
        button.appendChild(this.createTextSpan('slot-stack', stackText));

        if (!slot.isUsable) {
          button.classList.add('slot-disabled');
        }

        if (slot.remainingCooldownMs > 0) {
          button.classList.add('slot-cooldown');
        }

        container.appendChild(button);
      }

      this.dirtyQuickSlots = false;
    } else {
      // Partial update: cooldowns and state only via updateCooldowns()
      this.updateCooldowns();
    }

    this.query<HTMLElement>('#hud-input-mode').textContent = `Input: ${inputMode}`;
  }

  private renderQuests(): void {
    // Quest hash: 변경 감지용. 퀘스트 데이터가 동일하면 DOM 재생성 skip
    const questHash = this.quests
      .slice(0, 3)
      .map((q) => `${q.questId}:${q.progressCurrent}/${q.progressTarget}:${q.isCompleted}:${q.distanceMeters ?? ''}:${q.actionHint ?? ''}:${q.mapZoneId ?? ''}`)
      .join('|');

    if (questHash === this.lastQuestHash) {
      return;
    }
    this.lastQuestHash = questHash;

    const container = this.query<HTMLElement>('#hud-quests');
    container.innerHTML = '';

    for (const quest of this.quests.slice(0, 3)) {
      const row = document.createElement('div');
      row.className = 'hud-quest-row';

      // 행 내부 HTML 은 phaser-free 순수 빌더가 생성(questRowView, 단위 테스트 대상).
      row.innerHTML = buildQuestRowHtml(quest);

      if (quest.isCompleted) {
        row.classList.add('hud-quest-complete');
      }

      container.appendChild(row);
    }
  }

  private safeRatio(current: number, max: number): number {
    if (max <= 0) {
      return 0;
    }
    return Phaser.Math.Clamp(current / max, 0, 1);
  }

  private query<T extends HTMLElement>(selector: string): T {
    const node = this.root.querySelector(selector);
    if (!node) {
      throw new Error(`HUD selector not found: ${selector}`);
    }
    return node as T;
  }

  private createTextSpan(className: string, text: string): HTMLSpanElement {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    return span;
  }

  private createQuickSlotIconElement(slot: QuickSlotData): HTMLSpanElement {
    const iconWrap = document.createElement('span');
    iconWrap.className = 'slot-icon';

    if (!slot.iconImagePath) {
      iconWrap.textContent = slot.icon;
      return iconWrap;
    }

    const iconImage = document.createElement('img');
    iconImage.className = 'slot-icon-image';
    iconImage.alt = '';
    iconImage.decoding = 'async';
    iconImage.dataset.aeternaIconKey = slot.iconImageKey ?? '';
    iconImage.dataset.aeternaIconPath = slot.iconImagePath;

    const fallback = document.createElement('span');
    fallback.className = 'slot-icon-fallback';
    fallback.textContent = slot.icon;
    fallback.hidden = true;

    iconImage.addEventListener('load', () => {
      fallback.hidden = true;
      this.writeHudFrameQaProbe();
    }, { once: true });
    iconImage.addEventListener('error', () => {
      iconImage.hidden = true;
      fallback.hidden = false;
      this.writeHudFrameQaProbe();
    }, { once: true });
    iconImage.src = `/${slot.iconImagePath}`;

    iconWrap.appendChild(iconImage);
    iconWrap.appendChild(fallback);
    return iconWrap;
  }

  private renderAvatar(): void {
    const avatarImage = this.query<HTMLImageElement>('#hud-avatar-image');
    const avatarUrl = this.status.avatarUrl ?? '';

    if (!avatarUrl) {
      if (this.lastAvatarUrl !== '') {
        avatarImage.hidden = true;
        avatarImage.removeAttribute('src');
        delete avatarImage.dataset.aeternaAvatarKey;
        delete avatarImage.dataset.aeternaAvatarPath;
        this.lastAvatarUrl = '';
        this.writeHudFrameQaProbe();
      }
      return;
    }

    if (avatarUrl === this.lastAvatarUrl) {
      return;
    }

    this.lastAvatarUrl = avatarUrl;
    avatarImage.hidden = false;
    avatarImage.dataset.aeternaAvatarKey = this.status.avatarImageKey ?? '';
    avatarImage.dataset.aeternaAvatarPath = avatarUrl;
    avatarImage.onload = () => {
      avatarImage.hidden = false;
      this.writeHudFrameQaProbe();
    };
    avatarImage.onerror = () => {
      avatarImage.hidden = true;
      this.writeHudFrameQaProbe();
    };
    avatarImage.src = `/${this.status.avatarUrl}`;
    this.writeHudFrameQaProbe();
  }

  private hudFrameCssUrl(asset: typeof HUD_OVERLAY_UI_FRAME_ASSETS[keyof typeof HUD_OVERLAY_UI_FRAME_ASSETS]): string {
    return `url('/${asset.path}')`;
  }

  private hudButtonFrameCssUrl(): string {
    return `url('/${HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.path}')`;
  }

  private isHudFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;

    try {
      return new URLSearchParams(window.location.search).get('hudFrameQa') === '1';
    } catch {
      return false;
    }
  }

  private writeHudFrameQaProbe(): void {
    if (!this.isHudFrameQaRoute() || typeof document === 'undefined') return;

    const frameStates = Object.entries(HUD_OVERLAY_UI_FRAME_ASSETS).map(([slot, asset]) => {
      const element = this.root.querySelector<HTMLElement>(asset.elementSelector);
      const style = element ? window.getComputedStyle(element) : null;
      const backgroundImage = style?.backgroundImage ?? '';
      const visible = Boolean(
        element
        && style
        && style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.offsetWidth > 0
        && element.offsetHeight > 0,
      );
      const hasFrameBackground = backgroundImage.includes(asset.path);

      return {
        slot,
        key: asset.key,
        path: asset.path,
        elementSelector: asset.elementSelector,
        visible,
        hasFrameBackground,
      };
    });
    const missingFrameKeys = frameStates
      .filter((frame) => !frame.hasFrameBackground)
      .map((frame) => frame.key);
    const buttonElements = Array.from(this.root.querySelectorAll<HTMLElement>(HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.elementSelector));
    const buttonStates = buttonElements.map((element, index) => {
      const style = window.getComputedStyle(element);
      const backgroundImage = style.backgroundImage ?? '';
      const visible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && element.offsetWidth > 0
        && element.offsetHeight > 0;

      return {
        index,
        className: element.className,
        visible,
        hasFrameBackground: backgroundImage.includes(HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.path),
      };
    });
    const visibleButtonStates = buttonStates.filter((button) => button.visible);
    const missingButtonFrame = visibleButtonStates.length === 0
      || visibleButtonStates.some((button) => !button.hasFrameBackground);
    const allMissingFrameKeys = [
      ...missingFrameKeys,
      missingButtonFrame ? HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.key : null,
    ].filter((key): key is NonNullable<typeof key> => key !== null);
    const quickSlotIconImages = Array.from(this.root.querySelectorAll<HTMLImageElement>('.slot-icon-image'));
    const quickSlotIconStates = quickSlotIconImages.map((element, index) => {
      const visible = !element.hidden
        && element.offsetWidth > 0
        && element.offsetHeight > 0;
      const rendered = visible && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;

      return {
        index,
        key: element.dataset.aeternaIconKey ?? '',
        path: element.dataset.aeternaIconPath ?? element.getAttribute('src') ?? '',
        visible,
        rendered,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
      };
    });
    const expectedQuickSlotIconCount = this.quickSlots.filter((slot) => Boolean(slot.iconImagePath)).length;
    const missingIconKeys = quickSlotIconStates
      .filter((icon) => !icon.rendered)
      .map((icon) => icon.key || icon.path);
    const renderedQuickSlotIconCount = quickSlotIconStates.filter((icon) => icon.rendered).length;
    const quickSlotIconReady = renderedQuickSlotIconCount === expectedQuickSlotIconCount;
    const questMapIconImages = Array.from(this.root.querySelectorAll<HTMLImageElement>('.hud-quest-map-icon'));
    const questMapIconStates = questMapIconImages.map((element, index) => {
      const visible = !element.hidden
        && element.offsetWidth > 0
        && element.offsetHeight > 0;
      const rendered = visible && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;

      return {
        index,
        key: element.dataset.aeternaIconKey ?? '',
        path: element.dataset.aeternaIconPath ?? element.getAttribute('src') ?? '',
        visible,
        rendered,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
      };
    });
    const expectedQuestMapIconResources = this.quests
      .filter((quest) => Boolean(quest.mapZoneId) && !quest.isCompleted)
      .map((quest) => getSpriteResourceForWorldZoneIcon(quest.mapZoneId ?? ''))
      .filter((resource): resource is NonNullable<typeof resource> => resource !== undefined);
    const expectedQuestMapIconCount = expectedQuestMapIconResources.length;
    const missingQuestMapIconKeys = expectedQuestMapIconResources
      .filter((resource, index) => {
        const renderedCountForKey = questMapIconStates
          .filter((icon) => icon.rendered && icon.key === resource.key)
          .length;
        const expectedCountForKey = expectedQuestMapIconResources
          .slice(0, index + 1)
          .filter((item) => item.key === resource.key)
          .length;
        return renderedCountForKey < expectedCountForKey;
      })
      .map((resource) => resource.key);
    const renderedQuestMapIconCount = questMapIconStates.filter((icon) => icon.rendered).length;
    const questMapIconReady = renderedQuestMapIconCount === expectedQuestMapIconCount && missingQuestMapIconKeys.length === 0;
    const questActionIconImages = Array.from(this.root.querySelectorAll<HTMLImageElement>('.hud-quest-action-icon'));
    const questActionIconStates = questActionIconImages.map((element, index) => {
      const visible = !element.hidden
        && element.offsetWidth > 0
        && element.offsetHeight > 0;
      const rendered = visible && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0;

      return {
        index,
        key: element.dataset.aeternaIconKey ?? '',
        path: element.dataset.aeternaIconPath ?? element.getAttribute('src') ?? '',
        visible,
        rendered,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
      };
    });
    const expectedQuestActionIconResources = this.quests
      .filter((quest) => quest.actionHint && !quest.isCompleted)
      .map((quest) => {
        if (quest.actionIconImageKey && quest.actionIconImagePath) {
          return {
            key: quest.actionIconImageKey,
            path: quest.actionIconImagePath,
          };
        }

        return getSpriteResourceForSkillIcon('skill_mw_arrow');
      })
      .filter((resource): resource is { key: string; path: string } => resource !== undefined);
    const expectedQuestActionIconCount = expectedQuestActionIconResources.length;
    const missingQuestActionIconKeys = expectedQuestActionIconResources
      .filter((resource, index) => {
        const renderedCountForKey = questActionIconStates
          .filter((icon) => icon.rendered && icon.key === resource.key)
          .length;
        const expectedCountForKey = expectedQuestActionIconResources
          .slice(0, index + 1)
          .filter((item) => item.key === resource.key)
          .length;
        return renderedCountForKey < expectedCountForKey;
      })
      .map((resource) => resource.key);
    const renderedQuestActionIconCount = questActionIconStates.filter((icon) => icon.rendered).length;
    const questActionIconReady = renderedQuestActionIconCount === expectedQuestActionIconCount
      && missingQuestActionIconKeys.length === 0;
    const avatarImage = this.root.querySelector<HTMLImageElement>('#hud-avatar-image');
    const expectedAvatarImage = Boolean(this.status.avatarUrl);
    const avatarVisible = Boolean(
      avatarImage
      && !avatarImage.hidden
      && avatarImage.offsetWidth > 0
      && avatarImage.offsetHeight > 0,
    );
    const avatarRendered = Boolean(
      expectedAvatarImage
      && avatarImage
      && avatarVisible
      && avatarImage.complete
      && avatarImage.naturalWidth > 0
      && avatarImage.naturalHeight > 0,
    );
    const avatarReady = !expectedAvatarImage || avatarRendered;

    document.body.dataset.aeternaHudFrameQa = JSON.stringify({
      status: allMissingFrameKeys.length === 0 && missingIconKeys.length === 0 && quickSlotIconReady && questMapIconReady && questActionIconReady && avatarReady ? 'ready' : 'missing',
      renderedFrameKeys: frameStates
        .filter((frame) => frame.visible && frame.hasFrameBackground)
        .map((frame) => frame.key),
      renderedButtonFrameKey: missingButtonFrame ? null : HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.key,
      missingFrameKeys: allMissingFrameKeys,
      frames: frameStates,
      buttonFrame: {
        key: HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.key,
        path: HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.path,
        elementSelector: HUD_OVERLAY_UI_BUTTON_FRAME_ASSET.elementSelector,
        visibleButtonCount: visibleButtonStates.length,
        framedButtonCount: visibleButtonStates.filter((button) => button.hasFrameBackground).length,
        buttons: buttonStates,
      },
      quickSlotIcon: {
        renderedImageCount: renderedQuickSlotIconCount,
        expectedImageCount: expectedQuickSlotIconCount,
        missingIconKeys,
        icons: quickSlotIconStates,
      },
      questMapIcon: {
        renderedImageCount: renderedQuestMapIconCount,
        expectedImageCount: expectedQuestMapIconCount,
        missingQuestMapIconKeys,
        icons: questMapIconStates,
      },
      questActionIcon: {
        renderedImageCount: renderedQuestActionIconCount,
        expectedImageCount: expectedQuestActionIconCount,
        missingQuestActionIconKeys,
        icons: questActionIconStates,
      },
      hudAvatar: {
        key: avatarImage?.dataset.aeternaAvatarKey ?? this.status.avatarImageKey ?? '',
        path: avatarImage?.dataset.aeternaAvatarPath ?? this.status.avatarUrl ?? '',
        expectedAvatarImage,
        visible: avatarVisible,
        rendered: avatarRendered,
        missingKey: expectedAvatarImage && !avatarRendered
          ? (this.status.avatarImageKey ?? this.status.avatarUrl ?? 'hud_avatar')
          : null,
        naturalWidth: avatarImage?.naturalWidth ?? 0,
        naturalHeight: avatarImage?.naturalHeight ?? 0,
      },
    });
  }

  private template(): string {
    return `
<div id="hud-root" style="position:relative; width:100%; height:100%; pointer-events:none; font-family:Arial, sans-serif; color:#E8EDF2;">
  <style>
    #hud-root .hud-panel { background-color: rgba(10, 16, 28, 0.78); background-repeat:no-repeat; background-position:center; background-size:100% 100%; border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; box-shadow: 0 2px 12px rgba(0,0,0,0.35); }
    #hud-status { position:absolute; left:16px; bottom:16px; width:320px; padding:10px; pointer-events:auto; background-image:linear-gradient(rgba(8,14,24,0.70), rgba(8,14,24,0.70)), ${this.hudFrameCssUrl(HUD_OVERLAY_UI_FRAME_ASSETS.statusPanel)}; }
    #hud-avatar { width:46px; height:46px; border-radius:50%; background:#102033; display:inline-block; margin-right:8px; cursor:pointer; overflow:hidden; padding:0; border:1px solid rgba(255,255,255,0.18); vertical-align:middle; }
    .hud-avatar-image { width:100%; height:100%; object-fit:cover; image-rendering:pixelated; display:block; }
    #hud-status-head { display:flex; align-items:center; margin-bottom:8px; }
    .bar-wrap { margin-top:6px; }
    .bar-track { height:12px; border-radius:999px; background:#1d2a3d; overflow:hidden; }
    #hud-hp-fill { height:100%; background:#d64545; width:0%; transition:width 120ms linear; }
    #hud-mp-fill { height:100%; background:#3a7bff; width:0%; transition:width 120ms linear; }
    #hud-exp-fill { height:100%; background:#c89b3c; width:0%; transition:width 120ms linear; }
    .bar-text { font-size:12px; opacity:0.95; margin-top:2px; }
    #hud-quickslot-wrap { position:absolute; left:50%; transform:translateX(-50%); bottom:16px; width:760px; padding:10px; pointer-events:auto; background-image:linear-gradient(rgba(8,14,24,0.66), rgba(8,14,24,0.66)), ${this.hudFrameCssUrl(HUD_OVERLAY_UI_FRAME_ASSETS.quickSlotPanel)}; }
    #hud-quickslots { display:grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap:8px; }
    .hud-slot { background-color:#1a2536; background-image:linear-gradient(rgba(14,22,34,0.58), rgba(14,22,34,0.58)), ${this.hudButtonFrameCssUrl()}; background-repeat:no-repeat; background-position:center; background-size:100% 100%; border:1px solid #2c3f5a; border-radius:8px; color:#e8edf2; text-align:left; padding:6px; min-height:72px; cursor:pointer; }
    .hud-slot:hover:not(:disabled) { background-image:linear-gradient(rgba(26,38,56,0.48), rgba(26,38,56,0.48)), ${this.hudButtonFrameCssUrl()}; }
    .hud-slot.slot-disabled { opacity:0.5; }
    .hud-slot.slot-cooldown { border-color:#8d5c2a; }
    .slot-hotkey { display:block; font-size:11px; opacity:0.8; }
    .slot-icon { display:flex; align-items:center; gap:4px; height:22px; margin-top:2px; }
    .slot-icon-image { width:20px; height:20px; object-fit:contain; image-rendering:pixelated; flex:0 0 20px; }
    .slot-icon-fallback { font-size:14px; line-height:20px; opacity:0.78; }
    .slot-label { display:block; font-size:12px; margin-top:2px; }
    .slot-cd, .slot-stack { display:inline-block; font-size:11px; margin-top:2px; margin-right:6px; }
    #hud-quest-wrap { position:absolute; right:16px; top:16px; width:320px; padding:10px; pointer-events:auto; background-image:linear-gradient(rgba(8,14,24,0.68), rgba(8,14,24,0.68)), ${this.hudFrameCssUrl(HUD_OVERLAY_UI_FRAME_ASSETS.questTracker)}; }
    .hud-quest-row { border-top:1px solid rgba(255,255,255,0.08); padding:6px 0; }
    .hud-quest-row:first-child { border-top:none; }
    .hud-quest-title { font-size:12px; font-weight:700; }
    .hud-quest-body, .hud-quest-progress { font-size:12px; opacity:0.92; }
    .hud-quest-complete { opacity:0.7; }
    .hud-quest-action { display:flex; align-items:flex-start; gap:5px; font-size:12px; margin-top:4px; color:#ffd27f; font-weight:600; line-height:1.35; }
    .hud-quest-action-icon { width:14px; height:14px; object-fit:contain; image-rendering:pixelated; flex:0 0 14px; margin-top:1px; }
    .hud-quest-action-icon-fallback { flex:0 0 14px; text-align:center; line-height:14px; opacity:0.88; margin-top:1px; }
    .hud-quest-action-text { min-width:0; }
    .hud-quest-map-btn { margin-top:6px; padding:5px 10px; display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:700; color:#fff4d2; background-color:#7a4e13; background-image:linear-gradient(rgba(112,74,22,0.46), rgba(58,34,10,0.52)), ${this.hudButtonFrameCssUrl()}; background-repeat:no-repeat; background-position:center; background-size:100% 100%; border:1px solid rgba(255,210,127,0.56); border-radius:6px; cursor:pointer; pointer-events:auto; text-shadow:0 1px 2px rgba(0,0,0,0.72); }
    .hud-quest-map-icon { width:16px; height:16px; object-fit:contain; image-rendering:pixelated; flex:0 0 16px; }
    .hud-quest-map-btn:hover { background-image:linear-gradient(rgba(152,100,28,0.38), rgba(70,42,12,0.46)), ${this.hudButtonFrameCssUrl()}; }
    .hud-quest-map-btn:focus-visible { outline:2px solid #fff; outline-offset:2px; }
    #hud-dialogue { position:absolute; left:50%; transform:translateX(-50%); bottom:122px; width:820px; padding:12px; display:none; pointer-events:auto; background-image:linear-gradient(rgba(8,14,24,0.70), rgba(8,14,24,0.70)), ${this.hudFrameCssUrl(HUD_OVERLAY_UI_FRAME_ASSETS.dialoguePanel)}; }
    #hud-dialogue-speaker { font-size:14px; font-weight:700; margin-bottom:6px; }
    #hud-dialogue-body { font-size:18px; line-height:1.45; min-height:56px; }
    #hud-dialogue-choices { margin-top:8px; display:flex; flex-direction:column; gap:6px; }
    .hud-dialogue-choice { text-align:left; font-size:14px; padding:8px; border-radius:8px; border:1px solid #2c3f5a; background-color:#1a2536; background-image:linear-gradient(rgba(14,22,34,0.58), rgba(14,22,34,0.58)), ${this.hudButtonFrameCssUrl()}; background-repeat:no-repeat; background-position:center; background-size:100% 100%; color:#fff; cursor:pointer; }
    .hud-dialogue-choice:hover:not(:disabled) { background-image:linear-gradient(rgba(30,43,62,0.48), rgba(16,24,36,0.50)), ${this.hudButtonFrameCssUrl()}; }
    /* 전키보드 UI: HUD 의 네이티브 버튼(퀵슬롯·대화선택지·아바타)은 Tab 포커스+Enter 로 이미
       작동하나 포커스 표시가 없었다. 키보드 사용자가 현재 포커스를 보도록 outline 부여(맵버튼과 동일). */
    .hud-slot:focus-visible, .hud-dialogue-choice:focus-visible, #hud-avatar:focus-visible { outline:2px solid #fff; outline-offset:2px; }
  </style>

  <div id="hud-status" class="hud-panel" role="group" aria-label="Status">
    <div id="hud-status-head">
      <button id="hud-avatar" aria-label="Avatar"><img id="hud-avatar-image" class="hud-avatar-image" alt="" decoding="async" hidden /></button>
      <div>
        <div id="hud-name">Erien</div>
        <div id="hud-level">Lv.1</div>
      </div>
    </div>

    <div class="bar-wrap">
      <div class="bar-track"><div id="hud-hp-fill"></div></div>
      <div id="hud-hp-text" class="bar-text">100/100</div>
    </div>
    <div class="bar-wrap">
      <div class="bar-track"><div id="hud-mp-fill"></div></div>
      <div id="hud-mp-text" class="bar-text">100/100</div>
    </div>
    <div class="bar-wrap">
      <div class="bar-track"><div id="hud-exp-fill"></div></div>
    </div>
  </div>

  <div id="hud-quickslot-wrap" class="hud-panel" role="group" aria-label="Quick slots">
    <div id="hud-input-mode" style="font-size:12px; opacity:0.85; margin-bottom:6px;">Input: keyboard</div>
    <div id="hud-quickslots"></div>
  </div>

  <div id="hud-quest-wrap" class="hud-panel" role="group" aria-label="Quest tracker">
    <div style="font-weight:700; margin-bottom:4px;">Quest Tracker</div>
    <div id="hud-quests"></div>
  </div>

  <div id="hud-dialogue" class="hud-panel" role="dialog" aria-label="Dialogue">
    <div id="hud-dialogue-speaker">Speaker</div>
    <div id="hud-dialogue-body">...</div>
    <div id="hud-dialogue-choices"></div>
  </div>
</div>`;
  }
}

export function makeDefaultSlots(): QuickSlotData[] {
  const hotkeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='];
  const labels = ['Slash', 'Ice', 'Shield', 'Heal', 'Potion', 'Buff', 'Dash', 'Stun', 'Summon', 'Warp', 'Item', 'Mount'];
  const iconResources = [
    getSpriteResourceForSkillIcon('skill_ek_slash'),
    getSpriteResourceForSkillIcon('skill_mw_storm'),
    getSpriteResourceForSkillIcon('skill_ek_shield'),
    getSpriteResourceForSkillIcon('skill_mw_heal'),
    getItemIconResource({ itemIconId: 'ITM-CON-001' }),
    getSpriteResourceForSkillIcon('skill_tg_haste'),
    getSpriteResourceForSkillIcon('skill_ek_charge'),
    getSpriteResourceForSkillIcon('skill_tg_stop'),
    getSpriteResourceForSkillIcon('skill_mw_ultimate'),
    getSpriteResourceForSkillIcon('skill_vw_warp'),
    getItemIconResource({ itemIconId: 'ITM-MAT-001' }),
    getSpriteResourceForSkillIcon('skill_vw_tether'),
  ];

  return hotkeys.map((hotkey, index) => {
    const iconResource = iconResources[index];

    return {
      slotIndex: index,
      icon: '◆',
      iconImageKey: iconResource?.key,
      iconImagePath: iconResource?.path,
      label: labels[index] ?? `Skill ${index + 1}`,
      cooldownMs: index % 3 === 0 ? 4000 : 2500,
      remainingCooldownMs: 0,
      stackCount: index === 4 ? 12 : 0,
      isUsable: true,
      hotkey
    };
  });
}

export function makeDefaultQuests(): QuestItem[] {
  // actionHint/mapZoneId 는 더 이상 퀘스트별로 하드코딩하지 않는다(SYNC-258).
  // 각 퀘스트의 현재 objective {type,description,target} 로부터 buildQuestGuide 가 일관되게 파생한다 →
  // 어떤 퀘스트를 추가해도 objective 만 있으면 자동으로 진행 안내가 붙는다("모든 퀘스트에 가이드").
  const rows: Array<QuestItem & { objective: { type: string; description: string; target?: string } }> = [
    {
      questId: 'Q-MAIN-2-01',
      title: '말라투스 성소 진입',
      objectiveText: '실반헤임 심층부에서 봉인 유적을 찾는다.',
      progressCurrent: 1,
      progressTarget: 3,
      isMainQuest: true,
      isCompleted: false,
      distanceMeters: 340,
      objective: { type: 'explore', description: '«말라투스 성소» 지역에 진입', target: 'malatus_sanctuary' },
    },
    {
      questId: 'Q-SUB-2-02',
      title: '서리이끼 수액 수집',
      objectiveText: '누아리엘 처방 재료 3병을 모은다.',
      progressCurrent: 1,
      progressTarget: 3,
      isMainQuest: false,
      isCompleted: false,
      distanceMeters: 120,
      objective: { type: 'collect', description: '서리이끼 수액 3병 수집', target: 'frostmoss_sap' },
    },
    {
      questId: 'Q-SUB-2-03',
      title: '카이엘 경계 지원',
      objectiveText: '경계 초소에 위협 보고를 전달한다.',
      progressCurrent: 1,
      progressTarget: 1,
      isMainQuest: false,
      isCompleted: true,
      objective: { type: 'talk', description: '경계 초소에 위협 보고 전달', target: 'npc_kaiel' },
    },
  ];
  return rows.map(({ objective, ...item }) => ({ ...item, ...deriveQuestGuideFields([objective]) }));
}
