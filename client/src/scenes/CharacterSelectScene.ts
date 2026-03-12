/**
 * CharacterSelectScene.ts — 캐릭터 생성/선택 씬 (P5-18)
 *
 * - 5클래스 선택: 에테르 기사 / 기억술사 / 그림자 직조사 / 기억 파괴자 / 시간 수호자
 * - 캐릭터명 입력 (DOM 기반 input)
 * - 생성 버튼 → LobbyScene 전환
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';

// ── 클래스 정의 ─────────────────────────────────────────────

interface CharacterClass {
  id: string;
  name: string;
  nameEn: string;
  color: number;
  description: string;
  stats: { hp: number; mp: number; atk: number; def: number };
}

const CLASSES: CharacterClass[] = [
  {
    id: 'ether_knight',
    name: '에테르 기사',
    nameEn: 'Ether Knight',
    color: 0x4488ff,
    description: '에테르를 갑옷과 검에 주입하여 싸우는 근접 전사. 높은 HP와 방어력.',
    stats: { hp: 500, mp: 150, atk: 45, def: 35 },
  },
  {
    id: 'memory_weaver',
    name: '기억술사',
    nameEn: 'Memory Weaver',
    color: 0xaa44ff,
    description: '잃어버린 기억의 파편을 마법으로 구현하는 원거리 마법사. 높은 MP와 공격력.',
    stats: { hp: 300, mp: 400, atk: 55, def: 15 },
  },
  {
    id: 'shadow_weaver',
    name: '그림자 직조사',
    nameEn: 'Shadow Weaver',
    color: 0x44cc88,
    description: '그림자 실을 직조하여 함정과 디버프를 거는 전략형 클래스. 균형잡힌 스탯.',
    stats: { hp: 380, mp: 280, atk: 40, def: 25 },
  },
  {
    id: 'memory_breaker',
    name: '기억 파괴자',
    nameEn: 'Memory Breaker',
    color: 0xff6644,
    description: '기억을 파괴하는 힘을 무기에 담아 싸우는 근접 딜러. 높은 공격력.',
    stats: { hp: 450, mp: 180, atk: 60, def: 20 },
  },
  {
    id: 'time_guardian',
    name: '시간 수호자',
    nameEn: 'Time Guardian',
    color: 0xffcc44,
    description: '시간의 흐름을 조작하여 아군을 보호하는 지원형 클래스. 균형잡힌 스탯.',
    stats: { hp: 400, mp: 350, atk: 35, def: 30 },
  },
];

// ── 상수 ────────────────────────────────────────────────────

const CARD_WIDTH = 220;
const CARD_HEIGHT = 320;
const CARD_GAP = 40;

// ── CharacterSelectScene ────────────────────────────────────

export class CharacterSelectScene extends Phaser.Scene {
  private selectedClass: CharacterClass | null = null;
  private cards: Phaser.GameObjects.Container[] = [];
  private nameInput: HTMLInputElement | null = null;
  private errorText!: Phaser.GameObjects.Text;
  private previewContainer!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'CharacterSelectScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0d1117');

    // 타이틀
    this.add.text(width / 2, 40, '캐릭터 생성', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#c8a2ff',
    }).setOrigin(0.5);

    // 클래스 카드 배치
    const totalWidth = CLASSES.length * CARD_WIDTH + (CLASSES.length - 1) * CARD_GAP;
    const startX = (width - totalWidth) / 2 + CARD_WIDTH / 2;

    CLASSES.forEach((cls, i) => {
      const x = startX + i * (CARD_WIDTH + CARD_GAP);
      const card = this._createClassCard(x, height * 0.38, cls);
      this.cards.push(card);
    });

    // 하단 영역: 이름 입력 + 생성 버튼
    this._createNameInput(width, height);

    // 에러 메시지
    this.errorText = this.add.text(width / 2, height - 60, '', {
      fontSize: '13px',
      color: '#ff6666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 미리보기 컨테이너 (선택 시 스탯 표시)
    this.previewContainer = this.add.container(width / 2, height * 0.72);

    // 뒤로가기 버튼
    this.add.text(20, 20, '← 돌아가기', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('MainMenuScene'));

    // 페이드 인
    SceneManager.fadeIn(this, 300);
  }

  shutdown(): void {
    // DOM input 정리
    if (this.nameInput) {
      this.nameInput.remove();
      this.nameInput = null;
    }
  }

  // ── 클래스 카드 ──────────────────────────────────────────

  private _createClassCard(x: number, y: number, cls: CharacterClass): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 카드 배경
    const bg = this.add.rectangle(0, 0, CARD_WIDTH, CARD_HEIGHT, 0x1a1a2e, 0.9)
      .setStrokeStyle(2, 0x333366)
      .setInteractive({ useHandCursor: true });

    // 클래스 아이콘 (색상 원)
    const icon = this.add.circle(0, -90, 30, cls.color);

    // 이름
    const name = this.add.text(0, -40, cls.name, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    }).setOrigin(0.5);

    // 영문명
    const nameEn = this.add.text(0, -18, cls.nameEn, {
      fontSize: '11px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 설명
    const desc = this.add.text(0, 30, cls.description, {
      fontSize: '11px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
      wordWrap: { width: CARD_WIDTH - 30 },
      align: 'center',
    }).setOrigin(0.5);

    // 스탯 요약
    const statStr = `HP ${cls.stats.hp}  MP ${cls.stats.mp}\nATK ${cls.stats.atk}  DEF ${cls.stats.def}`;
    const stats = this.add.text(0, 100, statStr, {
      fontSize: '12px',
      color: '#cccccc',
      fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5);

    container.add([bg, icon, name, nameEn, desc, stats]);

    // 클릭 → 선택
    bg.on('pointerdown', () => this._selectClass(cls, container));
    bg.on('pointerover', () => bg.setStrokeStyle(2, 0x6644aa));
    bg.on('pointerout', () => {
      const isSelected = this.selectedClass?.id === cls.id;
      bg.setStrokeStyle(2, isSelected ? 0xc8a2ff : 0x333366);
    });

    return container;
  }

  private _selectClass(cls: CharacterClass, _container: Phaser.GameObjects.Container): void {
    this.selectedClass = cls;

    // 카드 테두리 갱신
    this.cards.forEach((card, i) => {
      const bg = card.getAt(0) as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, CLASSES[i].id === cls.id ? 0xc8a2ff : 0x333366);
    });

    // 미리보기 업데이트
    this.previewContainer.removeAll(true);
    const txt = this.add.text(0, 0, `선택: ${cls.name} — ${cls.nameEn}`, {
      fontSize: '14px',
      color: '#c8a2ff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.previewContainer.add(txt);

    this.errorText.setText('');
  }

  // ── 이름 입력 (DOM) ──────────────────────────────────────

  private _createNameInput(sceneW: number, sceneH: number): void {
    // Phaser DOM Element 대신 직접 HTML input 생성 (심플)
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
      width: 240px;
      padding: 8px 12px;
      font-size: 14px;
      font-family: monospace;
      background: #1a1a2e;
      color: #ffffff;
      border: 1px solid #6644aa;
      border-radius: 4px;
      text-align: center;
      outline: none;
      z-index: 100;
    `;
    document.body.appendChild(this.nameInput);

    // 생성 버튼
    this.add.text(sceneW / 2, sceneH * 0.9, '[ 캐릭터 생성 ]', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#88ff88',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._onCreate());
  }

  private _onCreate(): void {
    const name = this.nameInput?.value.trim() ?? '';

    // 유효성 검증
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

    // DOM 정리
    if (this.nameInput) {
      this.nameInput.remove();
      this.nameInput = null;
    }

    // LobbyScene으로 전환 (캐릭터 데이터 전달)
    this.scene.start('LobbyScene', {
      characterName: name,
      characterClass: this.selectedClass.id,
      className: this.selectedClass.name,
      baseStats: this.selectedClass.stats,
    });
  }
}
