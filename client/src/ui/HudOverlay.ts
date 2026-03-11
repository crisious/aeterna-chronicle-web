import * as Phaser from 'phaser';

type InputMode = 'keyboard' | 'gamepad';

export interface HudStatusProps {
  hpCurrent: number;
  hpMax: number;
  mpCurrent: number;
  mpMax: number;
  level: number;
  expRatio: number;
  avatarUrl?: string;
  characterName: string;
  dangerHpThreshold?: number;
}

export interface QuickSlotData {
  slotIndex: number;
  icon: string;
  label: string;
  cooldownMs: number;
  remainingCooldownMs: number;
  stackCount: number;
  isUsable: boolean;
  hotkey: string;
}

export interface QuestItem {
  questId: string;
  title: string;
  objectiveText: string;
  progressCurrent: number;
  progressTarget: number;
  isMainQuest: boolean;
  isCompleted: boolean;
  distanceMeters?: number;
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
  }

  setQuickSlots(slots: QuickSlotData[], inputMode: InputMode): void {
    this.quickSlots = slots;
    this.dirtyQuickSlots = true;
    this.renderQuickSlots(inputMode);
  }

  setQuests(quests: QuestItem[]): void {
    this.quests = quests;
    this.renderQuests();
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
  }

  hideDialogue(): void {
    this.query<HTMLElement>('#hud-dialogue').style.display = 'none';
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

        button.innerHTML = `
          <span class="slot-hotkey">${slot.hotkey}</span>
          <span class="slot-icon">${slot.icon}</span>
          <span class="slot-label">${slot.label}</span>
          <span class="slot-cd">${cooldownText}</span>
          <span class="slot-stack">${stackText}</span>
        `;

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
      .map((q) => `${q.questId}:${q.progressCurrent}/${q.progressTarget}:${q.isCompleted}:${q.distanceMeters ?? ''}`)
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

      const progress = `${quest.progressCurrent}/${quest.progressTarget}`;
      const typeBadge = quest.isMainQuest ? 'MAIN' : 'SUB';
      const distance = quest.distanceMeters !== undefined ? ` · ${quest.distanceMeters}m` : '';

      row.innerHTML = `
        <div class="hud-quest-title">[${typeBadge}] ${quest.title}</div>
        <div class="hud-quest-body">${quest.objectiveText}</div>
        <div class="hud-quest-progress">${progress}${distance}</div>
      `;

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

  private template(): string {
    return `
<div id="hud-root" style="position:relative; width:100%; height:100%; pointer-events:none; font-family:Arial, sans-serif; color:#E8EDF2;">
  <style>
    #hud-root .hud-panel { background: rgba(10, 16, 28, 0.78); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; box-shadow: 0 2px 12px rgba(0,0,0,0.35); }
    #hud-status { position:absolute; left:16px; bottom:16px; width:320px; padding:10px; pointer-events:auto; }
    #hud-avatar { width:46px; height:46px; border-radius:50%; background:#f5a623; display:inline-block; margin-right:8px; cursor:pointer; }
    #hud-status-head { display:flex; align-items:center; margin-bottom:8px; }
    .bar-wrap { margin-top:6px; }
    .bar-track { height:12px; border-radius:999px; background:#1d2a3d; overflow:hidden; }
    #hud-hp-fill { height:100%; background:#d64545; width:0%; transition:width 120ms linear; }
    #hud-mp-fill { height:100%; background:#3a7bff; width:0%; transition:width 120ms linear; }
    #hud-exp-fill { height:100%; background:#c89b3c; width:0%; transition:width 120ms linear; }
    .bar-text { font-size:12px; opacity:0.95; margin-top:2px; }
    #hud-quickslot-wrap { position:absolute; left:50%; transform:translateX(-50%); bottom:16px; width:760px; padding:10px; pointer-events:auto; }
    #hud-quickslots { display:grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap:8px; }
    .hud-slot { background:#1a2536; border:1px solid #2c3f5a; border-radius:8px; color:#e8edf2; text-align:left; padding:6px; min-height:72px; cursor:pointer; }
    .hud-slot.slot-disabled { opacity:0.5; }
    .hud-slot.slot-cooldown { border-color:#8d5c2a; }
    .slot-hotkey { display:block; font-size:11px; opacity:0.8; }
    .slot-icon { display:block; font-size:16px; margin-top:2px; }
    .slot-label { display:block; font-size:12px; margin-top:2px; }
    .slot-cd, .slot-stack { display:inline-block; font-size:11px; margin-top:2px; margin-right:6px; }
    #hud-quest-wrap { position:absolute; right:16px; top:16px; width:320px; padding:10px; pointer-events:auto; }
    .hud-quest-row { border-top:1px solid rgba(255,255,255,0.08); padding:6px 0; }
    .hud-quest-row:first-child { border-top:none; }
    .hud-quest-title { font-size:12px; font-weight:700; }
    .hud-quest-body, .hud-quest-progress { font-size:12px; opacity:0.92; }
    .hud-quest-complete { opacity:0.7; }
    #hud-dialogue { position:absolute; left:50%; transform:translateX(-50%); bottom:122px; width:820px; padding:12px; display:none; pointer-events:auto; }
    #hud-dialogue-speaker { font-size:14px; font-weight:700; margin-bottom:6px; }
    #hud-dialogue-body { font-size:18px; line-height:1.45; min-height:56px; }
    #hud-dialogue-choices { margin-top:8px; display:flex; flex-direction:column; gap:6px; }
    .hud-dialogue-choice { text-align:left; font-size:14px; padding:8px; border-radius:8px; border:1px solid #2c3f5a; background:#1a2536; color:#fff; cursor:pointer; }
  </style>

  <div id="hud-status" class="hud-panel" role="group" aria-label="Status">
    <div id="hud-status-head">
      <button id="hud-avatar" aria-label="Avatar"></button>
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

  return hotkeys.map((hotkey, index) => ({
    slotIndex: index,
    icon: '◆',
    label: labels[index] ?? `Skill ${index + 1}`,
    cooldownMs: index % 3 === 0 ? 4000 : 2500,
    remainingCooldownMs: 0,
    stackCount: index === 4 ? 12 : 0,
    isUsable: true,
    hotkey
  }));
}

export function makeDefaultQuests(): QuestItem[] {
  return [
    {
      questId: 'Q-MAIN-2-01',
      title: '말라투스 성소 진입',
      objectiveText: '실반헤임 심층부에서 봉인 유적을 찾는다.',
      progressCurrent: 1,
      progressTarget: 3,
      isMainQuest: true,
      isCompleted: false,
      distanceMeters: 340
    },
    {
      questId: 'Q-SUB-2-02',
      title: '서리이끼 수액 수집',
      objectiveText: '누아리엘 처방 재료 3병을 모은다.',
      progressCurrent: 1,
      progressTarget: 3,
      isMainQuest: false,
      isCompleted: false,
      distanceMeters: 120
    },
    {
      questId: 'Q-SUB-2-03',
      title: '카이엘 경계 지원',
      objectiveText: '경계 초소에 위협 보고를 전달한다.',
      progressCurrent: 1,
      progressTarget: 1,
      isMainQuest: false,
      isCompleted: true
    }
  ];
}
