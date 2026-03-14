/**
 * CharacterSelectScene.ts — 캐릭터 생성/선택 씬 (P5-18 → P25-02 API 연결)
 *
 * - 6클래스 선택: 에테르 기사 / 기억술사 / 그림자 직조사 / 기억 파괴자 / 시간 수호자 / 공허 방랑자
 * - 기존 캐릭터 목록 조회 (GET /api/characters)
 * - 새 캐릭터 생성 (POST /api/characters)
 * - 클래스 목록 조회 (GET /api/class)
 * - 캐릭터명 입력 (DOM 기반 input)
 * - 생성/선택 → LobbyScene 전환
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { networkManager, CharacterData } from '../network/NetworkManager';

// ── 클래스 정의 (로컬 폴백) ─────────────────────────────────

interface CharacterClass {
  id: string;
  name: string;
  nameEn: string;
  color: number;
  description: string;
  stats: { hp: number; mp: number; atk: number; def: number };
}

const FALLBACK_CLASSES: CharacterClass[] = [
  {
    id: 'ether_knight', name: '에테르 기사', nameEn: 'Ether Knight', color: 0x4488ff,
    description: '에테르를 갑옷과 검에 주입하여 싸우는 근접 전사. 높은 HP와 방어력.',
    stats: { hp: 500, mp: 150, atk: 45, def: 35 },
  },
  {
    id: 'memory_weaver', name: '기억술사', nameEn: 'Memory Weaver', color: 0xaa44ff,
    description: '잃어버린 기억의 파편을 마법으로 구현하는 원거리 마법사. 높은 MP와 공격력.',
    stats: { hp: 300, mp: 400, atk: 55, def: 15 },
  },
  {
    id: 'shadow_weaver', name: '그림자 직조사', nameEn: 'Shadow Weaver', color: 0x44cc88,
    description: '그림자 실을 직조하여 함정과 디버프를 거는 전략형 클래스. 균형잡힌 스탯.',
    stats: { hp: 380, mp: 280, atk: 40, def: 25 },
  },
  {
    id: 'memory_breaker', name: '기억 파괴자', nameEn: 'Memory Breaker', color: 0xff6644,
    description: '기억을 파괴하는 힘을 무기에 담아 싸우는 근접 딜러. 높은 공격력.',
    stats: { hp: 450, mp: 180, atk: 60, def: 20 },
  },
  {
    id: 'time_guardian', name: '시간 수호자', nameEn: 'Time Guardian', color: 0xffcc44,
    description: '시간의 흐름을 조작하여 아군을 보호하는 지원형 클래스. 균형잡힌 스탯.',
    stats: { hp: 400, mp: 350, atk: 35, def: 30 },
  },
  {
    id: 'void_wanderer', name: '공허 방랑자', nameEn: 'Void Wanderer', color: 0x8844cc,
    description: '공허의 차원을 넘나드는 방랑자. 차원 이동과 디버프에 특화.',
    stats: { hp: 360, mp: 320, atk: 50, def: 22 },
  },
];

const CLASS_COLORS: Record<string, number> = {
  ether_knight: 0x4488ff, memory_weaver: 0xaa44ff, shadow_weaver: 0x44cc88,
  memory_breaker: 0xff6644, time_guardian: 0xffcc44, void_wanderer: 0x8844cc,
};

// ── 상수 ────────────────────────────────────────────────────

const CARD_WIDTH = 180;
const CARD_HEIGHT = 280;
const CARD_GAP = 20;

// ── CharacterSelectScene ────────────────────────────────────

export class CharacterSelectScene extends Phaser.Scene {
  private classes: CharacterClass[] = FALLBACK_CLASSES;
  private selectedClass: CharacterClass | null = null;
  private cards: Phaser.GameObjects.Container[] = [];
  private nameInput: HTMLInputElement | null = null;
  private errorText!: Phaser.GameObjects.Text;
  private previewContainer!: Phaser.GameObjects.Container;

  // P25-02: 기존 캐릭터 목록
  private existingCharacters: CharacterData[] = [];
  private charListContainer: Phaser.GameObjects.Container | null = null;
  private mode: 'select' | 'create' = 'select';

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  async create(): Promise<void> {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0d1117');

    // 타이틀
    this.add.text(width / 2, 40, '캐릭터 선택', {
      fontSize: '28px', fontFamily: 'monospace', color: '#c8a2ff',
    }).setOrigin(0.5);

    // 에러 메시지
    this.errorText = this.add.text(width / 2, height - 40, '', {
      fontSize: '13px', color: '#ff6666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // P25-02: 서버에서 데이터 로딩
    await this._loadServerData();

    if (this.existingCharacters.length > 0) {
      this._showCharacterList(width, height);
    } else {
      this._showCreateMode(width, height);
    }

    // 뒤로가기 버튼
    this.add.text(20, 20, '← 로그아웃', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        networkManager.logout();
        this.scene.start('MainMenuScene');
      });

    SceneManager.fadeIn(this, 300);
  }

  shutdown(): void {
    if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }
  }

  // ── P25-02: 서버 데이터 로딩 ────────────────────────────

  private async _loadServerData(): Promise<void> {
    // 클래스 목록 조회
    try {
      const serverClasses = await networkManager.getClasses();
      if (serverClasses && serverClasses.length > 0) {
        this.classes = serverClasses.map((c) => ({
          id: c.id,
          name: c.name,
          nameEn: c.nameEn,
          color: CLASS_COLORS[c.id] ?? 0x888888,
          description: c.description,
          stats: c.stats as { hp: number; mp: number; atk: number; def: number },
        }));
      }
    } catch (err) {
      console.warn('[CharSelect] 클래스 목록 로드 실패 (로컬 폴백):', err);
    }

    // 기존 캐릭터 목록 조회
    try {
      this.existingCharacters = await networkManager.getCharacters();
    } catch (err) {
      console.warn('[CharSelect] 캐릭터 목록 로드 실패:', err);
      this.existingCharacters = [];
    }
  }

  // ── 기존 캐릭터 선택 UI ────────────────────────────────

  private _showCharacterList(w: number, h: number): void {
    this.mode = 'select';
    this.charListContainer = this.add.container(0, 0);

    this.add.text(w / 2, 80, '기존 캐릭터를 선택하거나 새로 생성하세요', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.existingCharacters.forEach((char, i) => {
      const y = 140 + i * 80;
      const card = this.add.container(w / 2, y);

      const bg = this.add.rectangle(0, 0, 500, 65, 0x1a1a2e, 0.9)
        .setStrokeStyle(1, 0x333366)
        .setInteractive({ useHandCursor: true });

      const classColor = CLASS_COLORS[char.classId] ?? 0x888888;
      const icon = this.add.circle(-210, 0, 18, classColor);
      const nameText = this.add.text(-170, -12, `${char.name} (Lv.${char.level})`, {
        fontSize: '16px', color: '#ffffff', fontFamily: 'monospace',
      });
      const classText = this.add.text(-170, 10, char.classId.replace(/_/g, ' '), {
        fontSize: '11px', color: '#888888', fontFamily: 'monospace',
      });
      const statsText = this.add.text(120, -5, `HP ${char.hp}/${char.maxHp}  MP ${char.mp}/${char.maxMp}`, {
        fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace',
      });

      card.add([bg, icon, nameText, classText, statsText]);

      bg.on('pointerdown', () => this._selectExistingCharacter(char));
      bg.on('pointerover', () => bg.setStrokeStyle(1, 0xc8a2ff));
      bg.on('pointerout', () => bg.setStrokeStyle(1, 0x333366));

      this.charListContainer!.add(card);
    });

    // 새 캐릭터 생성 버튼
    const createY = 140 + this.existingCharacters.length * 80 + 20;
    const createBtn = this.add.text(w / 2, createY, '+ 새 캐릭터 생성', {
      fontSize: '16px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.charListContainer?.destroy();
        this.charListContainer = null;
        this._showCreateMode(w, h);
      });
    this.charListContainer.add(createBtn);
  }

  private _selectExistingCharacter(char: CharacterData): void {
    this.scene.start('LobbyScene', {
      characterId: char.id,
      characterName: char.name,
      characterClass: char.classId,
      className: char.classId.replace(/_/g, ' '),
      baseStats: { hp: char.maxHp, mp: char.maxMp, atk: char.atk, def: char.def },
      level: char.level,
    });
  }

  // ── 캐릭터 생성 모드 ────────────────────────────────────

  private _showCreateMode(w: number, h: number): void {
    this.mode = 'create';

    // 클래스 카드 배치
    const totalWidth = this.classes.length * CARD_WIDTH + (this.classes.length - 1) * CARD_GAP;
    const startX = (w - totalWidth) / 2 + CARD_WIDTH / 2;

    this.classes.forEach((cls, i) => {
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      const card = this._createClassCard(x, h * 0.38, cls);
      this.cards.push(card);
    });

    // 미리보기 컨테이너
    this.previewContainer = this.add.container(w / 2, h * 0.72);

    this._createNameInput(w, h);
  }

  // ── 클래스 카드 ──────────────────────────────────────────

  private _createClassCard(x: number, y: number, cls: CharacterClass): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x1a1a2e, 0.9)
      .setStrokeStyle(2, 0x333366).setInteractive({ useHandCursor: true });
    const icon = this.add.circle(0, -80, 24, cls.color);
    const name = this.add.text(0, -40, cls.name, {
      fontSize: '15px', fontFamily: 'monospace', color: '#ffffff',
    }).setOrigin(0.5);
    const nameEn = this.add.text(0, -22, cls.nameEn, {
      fontSize: '10px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const desc = this.add.text(0, 20, cls.description, {
      fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: CARD_WIDTH - 20 }, align: 'center',
    }).setOrigin(0.5);
    const statStr = `HP ${cls.stats.hp}  MP ${cls.stats.mp}\nATK ${cls.stats.atk}  DEF ${cls.stats.def}`;
    const stats = this.add.text(0, 90, statStr, {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace', align: 'center',
    }).setOrigin(0.5);

    container.add([bg, icon, name, nameEn, desc, stats]);

    bg.on('pointerdown', () => this._selectClass(cls));
    bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6644aa));
    bg.on('pointerout', () => {
      bg.setStrokeStyle(2, this.selectedClass?.id === cls.id ? 0xc8a2ff : 0x333366);
    });

    return container;
  }

  private _selectClass(cls: CharacterClass): void {
    this.selectedClass = cls;

    this.cards.forEach((card, i) => {
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, this.classes[i].id === cls.id ? 0xc8a2ff : 0x333366);
    });

    this.previewContainer.removeAll(true);
    const txt = this.add.text(0, 0, `선택: ${cls.name} — ${cls.nameEn}`, {
      fontSize: '14px', color: '#c8a2ff', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.previewContainer.add(txt);
    this.errorText.setText('');
  }

  // ── 이름 입력 (DOM) ──────────────────────────────────────

  private _createNameInput(sceneW: number, sceneH: number): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();

    this.nameInput = document.createElement('input');
    this.nameInput.type = 'text';
    this.nameInput.placeholder = '캐릭터 이름 입력 (2~12자)';
    this.nameInput.maxLength = 12;
    this.nameInput.style.cssText = `
      position: absolute;
      left: ${rect.left + sceneW / 2 - 120}px;
      top: ${rect.top + sceneH * 0.82}px;
      width: 240px; padding: 8px 12px; font-size: 14px; font-family: monospace;
      background: #1a1a2e; color: #ffffff; border: 1px solid #6644aa;
      border-radius: 4px; text-align: center; outline: none; z-index: 100;
    `;
    document.body.appendChild(this.nameInput);

    this.add.text(sceneW / 2, sceneH * 0.9, '[ 캐릭터 생성 ]', {
      fontSize: '18px', fontFamily: 'monospace', color: '#88ff88',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._onCreate());
  }

  private async _onCreate(): Promise<void> {
    const name = this.nameInput?.value.trim() ?? '';

    if (!this.selectedClass) {
      this.errorText.setText('클래스를 선택해 주세요.');
      return;
    }
    if (name.length < 2 || name.length > 12) {
      this.errorText.setText('이름은 2~12자로 입력해 주세요.');
      return;
    }
    if (!/^[가-힣a-zA-Z0-9_]+$/.test(name)) {
      this.errorText.setText('한글, 영문, 숫자, _만 사용 가능합니다.');
      return;
    }

    this.errorText.setText('생성 중...');

    // P25-02: 서버에 캐릭터 생성 요청
    try {
      const char = await networkManager.createCharacter({
        name,
        classId: this.selectedClass.id,
      });

      if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }

      this.scene.start('LobbyScene', {
        characterId: char.id,
        characterName: char.name,
        characterClass: char.classId,
        className: this.selectedClass.name,
        baseStats: this.selectedClass.stats,
        level: char.level ?? 1,
      });
    } catch (err) {
      console.error('[CharSelect] 캐릭터 생성 실패:', err);

      // 서버 미연결 시 로컬 폴백
      if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }

      this.scene.start('LobbyScene', {
        characterName: name,
        characterClass: this.selectedClass.id,
        className: this.selectedClass.name,
        baseStats: this.selectedClass.stats,
      });
    }
  }
}
