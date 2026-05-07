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

  // FINDING-A4 ext: select 모드 키보드 nav state
  private selectables: Array<{ focus: () => void; blur: () => void; activate: () => void }> = [];
  private selectIndex = 0;
  private _selectKeyboardCleanup: (() => void) | null = null;

  // FINDING-A4 ext2: create 모드(클래스 그리드) 키보드 nav state
  private classCardIndex = 0;
  private _createKeyboardCleanup: (() => void) | null = null;

  // P33-A: 클래스 일러스트 키 매핑
  private static readonly CLASS_IDS = [
    'ether_knight', 'memory_weaver', 'shadow_weaver',
    'memory_breaker', 'time_guardian', 'void_wanderer',
  ];

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  preload(): void {
    // P33-A: 6클래스 front 일러스트 로드
    for (const classId of CharacterSelectScene.CLASS_IDS) {
      this.load.image(
        `char_${classId}`,
        `assets/generated/characters/class_main/char_illust_${classId}_front.png`,
      );
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[CharSelect] 이미지 로드 실패: ${file.key}`);
    });
  }

  async create(): Promise<void> {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0d1117');

    // 타이틀
    this.add.text(width / 2, 40, '캐릭터 선택', {
      fontSize: '28px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#c8a2ff',
    }).setOrigin(0.5);

    // 에러 메시지
    this.errorText = this.add.text(width / 2, height - 40, '', {
      fontSize: '13px', color: '#ff6666', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
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
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        networkManager.logout();
        this.scene.start('MainMenuScene');
      });

    SceneManager.fadeIn(this, 300);
  }

  shutdown(): void {
    if (this.nameInput) { this.nameInput.remove(); this.nameInput = null; }
    // FINDING-A4 ext: scene 종료 시 keyboard listener 정리
    this._selectKeyboardCleanup?.();
    this._selectKeyboardCleanup = null;
    this._createKeyboardCleanup?.();
    this._createKeyboardCleanup = null;
  }

  // ── P25-02: 서버 데이터 로딩 ────────────────────────────

  private async _loadServerData(): Promise<void> {
    // 클래스 목록 조회
    try {
      const serverClasses = await networkManager.getClasses();
      if (serverClasses && serverClasses.length > 0) {
        // 서버 응답과 로컬 fallback 병합 — 서버에 description/stats 없으면 fallback 사용
        const fallbackMap = new Map(FALLBACK_CLASSES.map(c => [c.id, c]));
        this.classes = serverClasses.map((c) => {
          const fb = fallbackMap.get(c.id);
          return {
            id: c.id,
            name: c.name || fb?.name || c.id,
            nameEn: c.nameEn || fb?.nameEn || c.id,
            color: CLASS_COLORS[c.id] ?? fb?.color ?? 0x888888,
            description: c.description || fb?.description || '',
            stats: (c.stats && c.stats.hp) ? c.stats as { hp: number; mp: number; atk: number; def: number } : (fb?.stats ?? { hp: 400, mp: 200, atk: 40, def: 25 }),
          };
        });
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
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);

    // FINDING-A4 ext: 키보드 nav 가능한 항목 추적
    this.selectables = [];

    this.existingCharacters.forEach((char, i) => {
      const y = 140 + i * 80;
      const card = this.add.container(w / 2, y);

      const bg = this.add.rectangle(0, 0, 500, 65, 0x1a1a2e, 0.9)
        .setStrokeStyle(1, 0x333366)
        .setInteractive({ useHandCursor: true });

      const classColor = CLASS_COLORS[char.classId] ?? 0x888888;
      // P33-A: 캐릭터 목록에도 일러스트 사용
      const charTexKey = `char_${char.classId}`;
      let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (this.textures.exists(charTexKey)) {
        icon = this.add.image(-210, 0, charTexKey).setScale(0.15);
      } else {
        icon = this.add.circle(-210, 0, 18, classColor);
      }
      const nameText = this.add.text(-170, -12, `${char.name} (Lv.${char.level})`, {
        fontSize: '16px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      });
      const classText = this.add.text(-170, 10, char.classId.replace(/_/g, ' '), {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      });
      const statsText = this.add.text(120, -5, `HP ${char.hp}/${char.maxHp}  MP ${char.mp}/${char.maxMp}`, {
        fontSize: '11px', color: '#aaaaaa', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      });

      card.add([bg, icon, nameText, classText, statsText]);

      const cardIndex = i;
      const focusFn = () => bg.setStrokeStyle(2, 0xc8a2ff);
      const blurFn = () => bg.setStrokeStyle(1, 0x333366);
      const activateFn = () => this._selectExistingCharacter(char);

      bg.on('pointerdown', activateFn);
      bg.on('pointerover', () => this._setSelectIndex(cardIndex));

      this.selectables.push({ focus: focusFn, blur: blurFn, activate: activateFn });
      this.charListContainer!.add(card);
    });

    // 새 캐릭터 생성 버튼
    const createY = 140 + this.existingCharacters.length * 80 + 20;
    const createBtn = this.add.text(w / 2, createY, '+ 새 캐릭터 생성', {
      fontSize: '16px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const createBtnIndex = this.existingCharacters.length;
    const createFocus = () => createBtn.setColor('#ffffff').setFontStyle('bold');
    const createBlur = () => createBtn.setColor('#88ccff').setFontStyle('normal');
    const createActivate = () => {
      this._selectKeyboardCleanup?.();
      this._selectKeyboardCleanup = null;
      this.charListContainer?.destroy();
      this.charListContainer = null;
      this._showCreateMode(w, h);
    };

    createBtn.on('pointerdown', createActivate);
    createBtn.on('pointerover', () => this._setSelectIndex(createBtnIndex));
    this.selectables.push({ focus: createFocus, blur: createBlur, activate: createActivate });

    this.charListContainer.add(createBtn);

    // FINDING-A4 ext: 키보드 nav 활성화 — Arrow Up/Down + Enter/Space
    // WCAG 2.1.1 — 캐릭터 선택 화면 키보드 진입 가능.
    if (this.selectables.length > 0) {
      this.selectIndex = 0;
      this.selectables[0].focus();
    }

    const onUp = () => {
      const next = (this.selectIndex + this.selectables.length - 1) % this.selectables.length;
      this._setSelectIndex(next);
    };
    const onDown = () => {
      const next = (this.selectIndex + 1) % this.selectables.length;
      this._setSelectIndex(next);
    };
    const onActivate = () => {
      this.selectables[this.selectIndex]?.activate();
    };
    const onEsc = () => {
      networkManager.logout();
      this.scene.start('MainMenuScene');
    };

    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    this.input.keyboard?.on('keydown-ESC', onEsc);

    this._selectKeyboardCleanup = () => {
      this.input.keyboard?.off('keydown-UP', onUp);
      this.input.keyboard?.off('keydown-DOWN', onDown);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
      this.input.keyboard?.off('keydown-ESC', onEsc);
      this.selectables = [];
    };
  }

  // FINDING-A4 ext: select 모드 키보드 highlight 동기화
  private _setSelectIndex(i: number): void {
    if (i === this.selectIndex || !this.selectables[i]) return;
    this.selectables[this.selectIndex]?.blur();
    this.selectIndex = i;
    this.selectables[this.selectIndex]?.focus();
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

    // FINDING-A4 ext: select 모드 keyboard listener 잔존 방지 (이미 createActivate 에서
    // 호출되지만 직접 진입(existingCharacters.length===0) 경로 안전망)
    this._selectKeyboardCleanup?.();
    this._selectKeyboardCleanup = null;

    // 클래스 카드 배치
    const totalWidth = this.classes.length * CARD_WIDTH + (this.classes.length - 1) * CARD_GAP;
    const startX = (w - totalWidth) / 2 + CARD_WIDTH / 2;

    this.classes.forEach((cls, i) => {
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      const card = this._createClassCard(x, h * 0.38, cls);
      this.cards.push(card);
      // FINDING-A4 ext2: pointer hover 시 키보드 highlight 동기화
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.on('pointerover', () => this._setClassCardIndex(i));
    });

    // 미리보기 컨테이너
    this.previewContainer = this.add.container(w / 2, h * 0.72);

    this._createNameInput(w, h);

    // FINDING-A4 ext2: create 모드 키보드 nav (Arrow Left/Right + Enter/Space + ESC)
    // WCAG 2.1.1 — 클래스 선택 키보드 진입 가능. 한 줄 수평 그리드라 LEFT/RIGHT 만.
    if (this.cards.length > 0) {
      this.classCardIndex = 0;
      this._setClassCardIndex(0);
    }

    const onLeft = () => {
      const next = (this.classCardIndex + this.cards.length - 1) % this.cards.length;
      this._setClassCardIndex(next);
    };
    const onRight = () => {
      const next = (this.classCardIndex + 1) % this.cards.length;
      this._setClassCardIndex(next);
    };
    const onSelectKey = () => {
      const cls = this.classes[this.classCardIndex];
      if (cls) this._selectClass(cls);
    };
    const onEsc = () => {
      this._createKeyboardCleanup?.();
      this._createKeyboardCleanup = null;
      if (this.existingCharacters.length > 0) {
        // 캐릭터 있으면 select 화면 재구성 (scene restart 가 가장 안전 — 임시 DOM cleanup 포함)
        this.scene.restart();
      } else {
        networkManager.logout();
        this.scene.start('MainMenuScene');
      }
    };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-ENTER', onSelectKey);
    this.input.keyboard?.on('keydown-SPACE', onSelectKey);
    this.input.keyboard?.on('keydown-ESC', onEsc);

    this._createKeyboardCleanup = () => {
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-ENTER', onSelectKey);
      this.input.keyboard?.off('keydown-SPACE', onSelectKey);
      this.input.keyboard?.off('keydown-ESC', onEsc);
    };
  }

  // FINDING-A4 ext2: create 모드 클래스 그리드 키보드 highlight 동기화
  private _setClassCardIndex(idx: number): void {
    if (!this.cards[idx]) return;
    this.classCardIndex = idx;
    this.cards.forEach((card, i) => {
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
      if (i === idx) {
        bg.setStrokeStyle(2, 0x6644aa);
      } else if (this.selectedClass?.id === this.classes[i].id) {
        bg.setStrokeStyle(2, 0xc8a2ff);
      } else {
        bg.setStrokeStyle(2, 0x333366);
      }
    });
  }

  // ── 클래스 카드 ──────────────────────────────────────────

  private _createClassCard(x: number, y: number, cls: CharacterClass): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x1a1a2e, 0.9)
      .setStrokeStyle(2, 0x333366).setInteractive({ useHandCursor: true });

    // P33-A: 실제 일러스트 사용 (텍스처 없으면 fallback 원형)
    const texKey = `char_${cls.id}`;
    let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
    if (this.textures.exists(texKey)) {
      const img = this.add.image(0, -70, texKey);
      // 카드 내 영역에 맞게 리사이즈
      // 카드 내부에 맞춤 (카드 180x280, 이미지 영역 상단 ~160x200)
      const scaleX = 140 / img.width;
      const scaleY = 160 / img.height;
      img.setScale(Math.min(scaleX, scaleY));
      icon = img;
    } else {
      icon = this.add.circle(0, -80, 24, cls.color);
    }
    const name = this.add.text(0, -40, cls.name, {
      fontSize: '15px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffffff',
    }).setOrigin(0.5);
    const nameEn = this.add.text(0, -22, cls.nameEn, {
      fontSize: '10px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    const desc = this.add.text(0, 20, cls.description, {
      fontSize: '10px', color: '#aaaaaa', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      wordWrap: { width: CARD_WIDTH - 20 }, align: 'center',
    }).setOrigin(0.5);
    const statStr = `HP ${cls.stats.hp}  MP ${cls.stats.mp}\nATK ${cls.stats.atk}  DEF ${cls.stats.def}`;
    const stats = this.add.text(0, 90, statStr, {
      fontSize: '11px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', align: 'center',
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

    // FINDING-A4 ext2: 키보드 highlight + selected 색상 통합 처리
    // (_setClassCardIndex 가 highlight idx 우선 → selectedClass → default 순으로 결정)
    this._setClassCardIndex(this.classCardIndex);

    this.previewContainer.removeAll(true);

    // P33-A: 선택 시 큰 미리보기 이미지
    const previewTexKey = `char_${cls.id}`;
    if (this.textures.exists(previewTexKey)) {
      const previewImg = this.add.image(-100, 0, previewTexKey)
        .setScale(0.8);
      this.previewContainer.add(previewImg);
    }

    const txt = this.add.text(40, -20, `선택: ${cls.name}`, {
      fontSize: '16px', color: '#c8a2ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0, 0.5);
    const subTxt = this.add.text(40, 10, cls.nameEn, {
      fontSize: '12px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0, 0.5);
    this.previewContainer.add([txt, subTxt]);
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
      fontSize: '18px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#88ff88',
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
    } catch (err: any) {
      console.error('[CharSelect] 캐릭터 생성 실패:', err);
      let msg = '캐릭터 생성 실패';
      try {
        const body = err?.responseBody ?? '';
        const parsed = typeof body === 'string' && body.startsWith('{') ? JSON.parse(body) : null;
        if (parsed?.error) msg = parsed.error;
      } catch { /* 무시 */ }
      this.errorText.setText(msg);
    }
  }
}
