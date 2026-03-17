/**
 * BattleScene.ts — 실시간 반자동 전투 씬 (P5-05 → P25-05 전투 API 연동)
 *
 * - 좌측 아군 / 우측 적군 배치
 * - 공격 속도 기반 자동 기본 공격
 * - 스킬 슬롯 UI (하단 6칸, 클릭/단축키 1~6)
 * - 타겟팅 시스템 (클릭 선택 + TAB 순환)
 * - HP/MP 바 표시
 * - 데미지 텍스트 팝업 (EffectManager 연동)
 * - 전투 종료 판정 (승리/패배)
 * - 전리품 표시 팝업
 * - P25-05: NetworkManager 전투 API 연동
 *   (POST /api/combat/start, /action, 소켓 combat:tick, combat:result)
 */

import * as Phaser from 'phaser';
import { EffectManager } from '../effects/EffectManager';
import { SoundManager } from '../sound/SoundManager';
import { BattleUI } from '../ui/BattleUI';
import { CombatManager, CombatUnit, SkillSlot, LootItem } from '../combat/CombatManager';
import { StatusEffectRenderer } from '../combat/StatusEffectRenderer';
import { ComboUI } from '../ui/ComboUI';
import { networkManager, CombatResult } from '../network/NetworkManager';
import { playSfx, playRandomVoice, COMBAT_VOICE, UI_SFX } from '../utils/SFXHelper';
import monsterManifest from '../data/monsterManifest.json';

// ─── 전투 상태 ──────────────────────────────────────────────────

export type BattlePhase = 'intro' | 'fighting' | 'victory' | 'defeat';

/** 전투 씬 시작 시 전달받는 데이터 */
export interface BattleSceneData {
  /** 아군 유닛 목록 */
  allies: CombatUnit[];
  /** 적군 유닛 목록 */
  enemies: CombatUnit[];
  /** 장착된 스킬 슬롯 (최대 6) */
  skillSlots: SkillSlot[];
  /** 배경 타일맵 키 (선택) */
  bgKey?: string;
  /** 서버 전투 ID */
  battleId?: string;
  /** P25-05: 전투 시작을 위한 추가 데이터 */
  zoneId?: string;
  monsterId?: string;
  monsterName?: string;
  characterId?: string;
}

// ─── 상수 ──────────────────────────────────────────────────────

const ALLY_START_X = 200;
const ENEMY_START_X = 1080;
const UNIT_Y_START = 200;
const UNIT_Y_GAP = 120;
const BAR_WIDTH = 60;
const BAR_HEIGHT = 6;
const BAR_OFFSET_Y = -40;
const AUTO_ATTACK_BASE_DELAY = 1500; // ms (공격 속도 1.0 기준)

// ─── 유닛 스프라이트 래퍼 ─────────────────────────────────────

interface UnitSprite {
  unit: CombatUnit;
  sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
  hpBar: Phaser.GameObjects.Rectangle;
  hpBarBg: Phaser.GameObjects.Rectangle;
  mpBar: Phaser.GameObjects.Rectangle;
  mpBarBg: Phaser.GameObjects.Rectangle;
  nameText: Phaser.GameObjects.Text;
  autoAttackTimer: number; // 남은 ms
  isAlly: boolean;
}

// ─── BattleScene ────────────────────────────────────────────────

export class BattleScene extends Phaser.Scene {
  private phase: BattlePhase = 'intro';
  private effectManager!: EffectManager;
  private soundManager!: SoundManager;
  private battleUI!: BattleUI;
  private combatManager!: CombatManager;

  private allySprites: UnitSprite[] = [];
  private enemySprites: UnitSprite[] = [];
  private allSprites: UnitSprite[] = [];

  private selectedTarget: UnitSprite | null = null;
  private targetIndicator!: Phaser.GameObjects.Graphics;

  private skillSlots: SkillSlot[] = [];
  private skillKeys: Phaser.Input.Keyboard.Key[] = [];
  private tabKey!: Phaser.Input.Keyboard.Key;

  private battleId?: string;
  /** 현재 표시 중인 전리품 팝업 (파괴 시 참조) */
  public lootPopup: Phaser.GameObjects.Container | null = null;

  // P6-04/05: 상태이상 렌더러 + 콤보 UI
  private statusEffectRenderer!: StatusEffectRenderer;
  private comboUI!: ComboUI;

  // P25-05: 소켓 이벤트 클린업
  private socketCleanups: Array<() => void> = [];
  private serverCombatId: string | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  // ─── 라이프사이클 ─────────────────────────────────────────────

  preload(): void {
    // P33-A: 전투 배경 (zoneId 기반 동적 선택)
    const zoneId = this._initData?.zoneId ?? 'ERB';
    const zoneCode = zoneId.substring(0, 3).toUpperCase();
    this.load.image('battle_bg', `assets/generated/environment/backgrounds/${zoneCode}-BG-FAR-DAY.png`);

    // P36: 몬스터 이미지 — monsterManifest 기반 동적 프리로드
    // _initData.enemies에서 필요한 몬스터만 로드
    const manifest = monsterManifest as Record<string, string>;
    const manifestKeys = Object.keys(manifest);
    const loadedKeys = new Set<string>();

    // 1) _initData.enemies 기반 동적 매칭
    const enemies = this._initData?.enemies ?? [];
    for (const enemy of enemies) {
      const matched = this._findMonsterKey(enemy.id, enemy.name, manifestKeys);
      if (matched && !loadedKeys.has(matched)) {
        this.load.image(matched, manifest[matched]);
        loadedKeys.add(matched);
      }
    }

    // 2) monsterId 단일 매칭 (폴백)
    if (this._initData?.monsterId) {
      const mid = this._initData.monsterId;
      const matched = this._findMonsterKey(mid, this._initData.monsterName ?? '', manifestKeys);
      if (matched && !loadedKeys.has(matched)) {
        this.load.image(matched, manifest[matched]);
        loadedKeys.add(matched);
      }
    }

    // 3) 아무것도 매칭 안 되면 기본 3종 로드 (최소 폴백)
    if (loadedKeys.size === 0) {
      const fallbacks = ['mon_abyss_void_beetle', 'mon_abyss_null_slime', 'mon_boss_erb_shadow'];
      for (const fb of fallbacks) {
        if (manifest[fb]) {
          this.load.image(fb, manifest[fb]);
          loadedKeys.add(fb);
        }
      }
    }

    // P33-A: 캐릭터 일러스트 (전투 아군용)
    const classIds = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'time_guardian', 'void_wanderer'];
    for (const cid of classIds) {
      this.load.image(`char_battle_${cid}`, `assets/generated/characters/class_main/char_illust_${cid}_side.png`);
    }

    // P34-A: 전투 VFX 이미지 (공통 히트 이펙트)
    for (let i = 1; i <= 10; i++) {
      const padded = String(i).padStart(3, '0');
      this.load.image(`vfx_common_${padded}`, `assets/generated/vfx/common/VFX-CMN-${padded}.png`);
    }

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Battle] 이미지 로드 실패: ${file.key}`);
    });

    // 로드된 몬스터 키 저장 (create에서 참조)
    this._loadedMonsterKeys = Array.from(loadedKeys);
  }

  /** P36: 몬스터 ID/이름으로 매니페스트 키 찾기 */
  private _findMonsterKey(id: string, name: string, manifestKeys: string[]): string | null {
    const idLower = (id ?? '').toLowerCase().replace(/[-\s]/g, '_');
    const nameLower = (name ?? '').toLowerCase().replace(/[-\s]/g, '_');

    // 정확한 키 매칭
    if (manifestKeys.includes(`mon_${idLower}`)) return `mon_${idLower}`;

    // ID 부분 매칭 (region prefix 포함된 키에서 검색)
    for (const mk of manifestKeys) {
      const mkBody = mk.replace('mon_', '');
      if (idLower && mkBody.includes(idLower)) return mk;
      if (nameLower && mkBody.includes(nameLower)) return mk;
    }

    // 보스 매칭
    if (id?.toUpperCase().startsWith('BOSS')) {
      for (const mk of manifestKeys) {
        if (mk.startsWith('mon_boss_') && mk.includes(idLower.replace('boss-', '').replace('boss_', ''))) return mk;
      }
    }

    return null;
  }

  private _loadedMonsterKeys: string[] = [];

  init(data: BattleSceneData): void {
    this.phase = 'intro';
    this.allySprites = [];
    this.enemySprites = [];
    this.allSprites = [];
    this.selectedTarget = null;
    this.lootPopup = null;

    this.skillSlots = data.skillSlots ?? [];
    this.battleId = data.battleId;

    // 유닛 배치 데이터 저장
    this._initData = data;
  }

  private _initData!: BattleSceneData;

  create(): void {
    // 배경
    this.cameras.main.setBackgroundColor('#1a1a2e');

    // P33-A: 전투 배경 이미지
    const { width: scW, height: scH } = this.cameras.main;
    if (this.textures.exists('battle_bg')) {
      this.add.image(scW / 2, scH / 2, 'battle_bg')
        .setDisplaySize(scW, scH)
        .setAlpha(0.6);
      // 어두운 오버레이 (전투 분위기)
      this.add.rectangle(scW / 2, scH / 2, scW, scH, 0x0a0a1e, 0.5);
    }

    // 이펙트 & 사운드 매니저
    this.effectManager = new EffectManager(this);
    this.soundManager = new SoundManager(this);

    // 전투 매니저 (서버 동기화)
    this.combatManager = new CombatManager(this.battleId);

    // P35: allies/enemies가 없으면 기본 유닛 생성
    const allies = this._initData.allies ?? this._createDefaultAllies();
    const enemies = this._initData.enemies ?? this._createDefaultEnemies();

    // 유닛 스프라이트 생성
    this._spawnUnits(allies, true, ALLY_START_X);
    this._spawnUnits(enemies, false, ENEMY_START_X);
    this.allSprites = [...this.allySprites, ...this.enemySprites];

    // 타겟 인디케이터
    this.targetIndicator = this.add.graphics();

    // 기본 타겟 설정 (첫 번째 적)
    if (this.enemySprites.length > 0) {
      this._selectTarget(this.enemySprites[0]);
    }

    // 키 바인딩 (1~6 스킬, TAB 타겟 순환)
    // Phaser 3.60+: keyboard가 null이면 createCursorKeys()로 활성화 시도
    if (!this.input.keyboard) {
      (this.input as any).keyboard = (this.input as any).keyboard ?? this.input.keyboard;
      console.warn('[Battle] this.input.keyboard is null — keyboard disabled in config?');
    }
    if (this.input.keyboard) {
      for (let i = 0; i < 6; i++) {
        this.skillKeys.push(
          this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE + i)
        );
      }
      this.tabKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
    }

    // 마우스/터치 전투 액션 버튼 (키보드 대체)
    this._createActionButtons();

    // 전투 UI (하단 스킬바, 로그, 상태창)
    this.battleUI = new BattleUI(this, this.skillSlots);

    // P6-04: 상태이상 렌더러 초기화
    this.statusEffectRenderer = new StatusEffectRenderer(this);
    for (const us of this.allSprites) {
      this.statusEffectRenderer.registerUnit(us.unit.id);
    }

    // P6-05: 콤보 UI 초기화
    this.comboUI = new ComboUI(this);

    // P25-05: 서버 전투 시작 + 소켓 이벤트 바인딩
    this._startServerCombat();
    this._setupCombatSocket();

    // 인트로 연출 (0.5초 후 전투 시작)
    this.time.delayedCall(500, () => {
      this.phase = 'fighting';
      this.battleUI.addLog('⚔️ 전투 시작!');
      this.soundManager.playSfx('battle_start');
    });
  }

  // ─── P25-05: 서버 전투 시작 ───────────────────────────────────

  private async _startServerCombat(): Promise<void> {
    try {
      const result = await networkManager.combatStart({
        characterId: this._initData.characterId ?? networkManager.userId ?? '',
        zoneId: this._initData.zoneId,
        monsterId: this._initData.monsterId,
      });
      this.serverCombatId = result.combatId;
      this.battleUI.addLog(`[서버] 전투 ID: ${result.combatId}`);
    } catch (err) {
      console.warn('[BattleScene] 서버 전투 시작 실패 (로컬 모드):', err);
    }
  }

  private _setupCombatSocket(): void {
    const unsub1 = networkManager.on('combat:tick', (data) => {
      const d = data as { combatId: string; turn: number; actions: unknown[] };
      if (d.combatId === this.serverCombatId) {
        this.battleUI.addLog(`[서버] 턴 ${d.turn}`);
      }
    });

    const unsub2 = networkManager.on('combat:result', (data) => {
      const result = data as CombatResult;
      if (result.combatId === this.serverCombatId) {
        if (result.victory) {
          this.phase = 'victory';
          this.battleUI.addLog(`🎉 서버 승리 확인! EXP +${result.expGained}, 골드 +${result.goldGained}`);
          if (result.levelUp) {
            this.battleUI.addLog(`🆙 레벨 업! Lv.${result.levelUp.newLevel}`);
          }
        }
      }
    });

    const unsub3 = networkManager.on('combat:effectApplied', (data) => {
      const d = data as { combatId: string; targetId: string; effectId: string; value: number };
      if (d.combatId === this.serverCombatId) {
        (this.statusEffectRenderer as any).applyEffect?.(d.targetId, d.effectId, d.value);
      }
    });

    this.socketCleanups = [unsub1, unsub2, unsub3];
  }

  update(_time: number, delta: number): void {
    if (!this.phase || this.phase !== 'fighting') return;

    // 자동 기본 공격 처리
    this._processAutoAttacks(delta);

    // 스킬 쿨다운 업데이트
    this._updateSkillCooldowns(delta);

    // 키 입력 처리
    this._handleInput();

    // HP/MP 바 갱신
    this._updateBars();

    // 전투 종료 판정
    this._checkBattleEnd();

    // 이펙트 업데이트
    this.effectManager?.update(delta);

    // P6-04: 상태이상 렌더러 업데이트
    this.statusEffectRenderer?.update(delta);

    // P6-05: 콤보 UI 업데이트
    this.comboUI?.update(delta);

    // UI 업데이트
    this.battleUI?.update(delta);
  }

  // ─── P35: 기본 유닛 생성 (데이터 미전달 시 폴백) ────────────────

  private _createDefaultAllies(): CombatUnit[] {
    // 로컬 스토리지 또는 _initData에서 캐릭터 정보 추출
    const classId = (this._initData as any)?.characterClass ?? 'ether_knight';
    const charName = (this._initData as any)?.characterName ?? '모험자';
    const level = (this._initData as any)?.level ?? 1;
    return [{
      id: this._initData.characterId ?? 'player_1',
      name: charName,
      hp: 500, maxHp: 500,
      mp: 150, maxMp: 150,
      attack: 30,
      defense: 10,
      attackSpeed: 1.0,
      level,
      isAlly: true,
      classId,
    }];
  }

  private _createDefaultEnemies(): CombatUnit[] {
    const monsterName = this._initData.monsterName ?? '공허 딱정벌레';
    return [{
      id: this._initData.monsterId ?? 'enemy_1',
      name: monsterName,
      hp: 300, maxHp: 300,
      mp: 0, maxMp: 0,
      attack: 15,
      defense: 5,
      attackSpeed: 0.8,
      level: 1,
      isAlly: false,
    }];
  }

  // ─── 유닛 스폰 ───────────────────────────────────────────────

  private _spawnUnits(units: CombatUnit[], isAlly: boolean, baseX: number): void {
    const list = isAlly ? this.allySprites : this.enemySprites;

    // P36: 동적 로드된 몬스터 키 사용 (매니페스트 기반)
    const monsterTexKeys = this._loadedMonsterKeys.length > 0
      ? this._loadedMonsterKeys
      : Object.keys(monsterManifest as Record<string, string>).slice(0, 12);

    units.forEach((unit, idx) => {
      const x = baseX;
      const y = UNIT_Y_START + idx * UNIT_Y_GAP;
      const color = isAlly ? 0x4488ff : 0xff4444;

      // P33-A: 실제 이미지 사용 (fallback: 사각형)
      let sprite: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image;
      let usedImage = false;

      if (isAlly) {
        // 아군: classId 기반 side 일러스트
        const classId = unit.classId ?? '';
        const allyTexKey = `char_battle_${classId}`;
        if (classId && this.textures.exists(allyTexKey)) {
          sprite = this.add.image(x, y, allyTexKey)
            .setDisplaySize(56, 72)
            .setInteractive({ useHandCursor: true });
          usedImage = true;
        } else {
          sprite = this.add.rectangle(x, y, 48, 48, color)
            .setInteractive({ useHandCursor: true });
        }
      } else {
        // 적: 몬스터 이미지 (이름 기반 매칭 또는 순환 할당)
        let monTexKey = '';

        // P36: 매니페스트 기반 매칭 (ID → 이름 → 인덱스 폴백)
        const allManifestKeys = Object.keys(monsterManifest as Record<string, string>);
        const matched = this._findMonsterKey(unit.id, unit.name ?? '', allManifestKeys);
        if (matched && this.textures.exists(matched)) {
          monTexKey = matched;
        }

        // 로드된 키 중 이름 유사도 매칭
        if (!monTexKey) {
          const unitNameLower = (unit.name ?? '').toLowerCase().replace(/[\s-]/g, '_');
          for (const mk of monsterTexKeys) {
            const mkNorm = mk.replace('mon_', '').replace(/_/g, '_');
            if (this.textures.exists(mk) && (mkNorm.includes(unitNameLower) || unitNameLower.includes(mkNorm.split('_').slice(1).join('_')))) {
              monTexKey = mk;
              break;
            }
          }
        }

        // 매칭 안 되면 로드된 키 중 인덱스 기반 할당
        if (!monTexKey) {
          const availableKeys = monsterTexKeys.filter(k => this.textures.exists(k));
          monTexKey = availableKeys.length > 0 ? availableKeys[idx % availableKeys.length] : '';
        }

        if (this.textures.exists(monTexKey)) {
          sprite = this.add.image(x, y, monTexKey)
            .setDisplaySize(64, 64)
            .setInteractive({ useHandCursor: true });
          usedImage = true;
        } else {
          sprite = this.add.rectangle(x, y, 48, 48, color)
            .setInteractive({ useHandCursor: true });
        }
      }

      // 클릭 타겟팅
      sprite.on('pointerdown', () => {
        const us = list.find(s => s.sprite === sprite);
        if (us && us.unit.hp > 0) {
          this._selectTarget(us);
        }
      });

      // HP 바
      const hpBarBg = this.add.rectangle(x, y + BAR_OFFSET_Y, BAR_WIDTH, BAR_HEIGHT, 0x333333);
      const hpBar = this.add.rectangle(x, y + BAR_OFFSET_Y, BAR_WIDTH, BAR_HEIGHT, 0x44ff44);

      // MP 바
      const mpBarBg = this.add.rectangle(x, y + BAR_OFFSET_Y + 8, BAR_WIDTH, BAR_HEIGHT, 0x333333);
      const mpBar = this.add.rectangle(x, y + BAR_OFFSET_Y + 8, BAR_WIDTH, BAR_HEIGHT, 0x4488ff);

      // 이름
      const nameText = this.add.text(x, y + BAR_OFFSET_Y - 14, unit.name, {
        fontSize: '11px',
        color: isAlly ? '#88ccff' : '#ff8888',
      }).setOrigin(0.5);

      const unitSprite: UnitSprite = {
        unit,
        sprite,
        hpBar, hpBarBg,
        mpBar, mpBarBg,
        nameText,
        autoAttackTimer: AUTO_ATTACK_BASE_DELAY / (unit.attackSpeed ?? 1),
        isAlly,
      };

      list.push(unitSprite);
    });
  }

  // ─── 타겟팅 ──────────────────────────────────────────────────

  private _selectTarget(us: UnitSprite): void {
    this.selectedTarget = us;
    this._drawTargetIndicator(us);
    this.battleUI.addLog(`🎯 타겟: ${us.unit.name}`);
  }

  private _drawTargetIndicator(us: UnitSprite): void {
    this.targetIndicator.clear();
    this.targetIndicator.lineStyle(2, 0xffff00, 1);
    this.targetIndicator.strokeCircle(us.sprite.x, us.sprite.y, 32);
  }

  private _cycleTarget(): void {
    const livingEnemies = this.enemySprites.filter(e => e.unit.hp > 0);
    if (livingEnemies.length === 0) return;

    const currentIdx = this.selectedTarget
      ? livingEnemies.indexOf(this.selectedTarget)
      : -1;
    const nextIdx = (currentIdx + 1) % livingEnemies.length;
    this._selectTarget(livingEnemies[nextIdx]);
  }

  // ─── 자동 기본 공격 ──────────────────────────────────────────

  private _processAutoAttacks(delta: number): void {
    for (const us of this.allySprites) {
      if (us.unit.hp <= 0) continue;
      us.autoAttackTimer -= delta;

      if (us.autoAttackTimer <= 0) {
        // 타겟이 죽었으면 자동 전환
        if (!this.selectedTarget || this.selectedTarget.unit.hp <= 0) {
          const living = this.enemySprites.filter(e => e.unit.hp > 0);
          if (living.length > 0) this._selectTarget(living[0]);
          else continue;
        }

        this._executeAutoAttack(us, this.selectedTarget!);
        us.autoAttackTimer = AUTO_ATTACK_BASE_DELAY / (us.unit.attackSpeed ?? 1);
      }
    }

    // 적 자동 공격 (랜덤 아군 대상)
    for (const es of this.enemySprites) {
      if (es.unit.hp <= 0) continue;
      es.autoAttackTimer -= delta;

      if (es.autoAttackTimer <= 0) {
        const livingAllies = this.allySprites.filter(a => a.unit.hp > 0);
        if (livingAllies.length === 0) continue;
        const target = livingAllies[Math.floor(Math.random() * livingAllies.length)];
        this._executeAutoAttack(es, target);
        es.autoAttackTimer = AUTO_ATTACK_BASE_DELAY / (es.unit.attackSpeed ?? 1);
      }
    }
  }

  private _executeAutoAttack(attacker: UnitSprite, target: UnitSprite): void {
    const rawDmg = Math.max(1, attacker.unit.attack - (target.unit.defense ?? 0));
    const isCritical = Math.random() < 0.15;
    const variance = 0.85 + Math.random() * 0.3;
    const dmg = Math.round(rawDmg * variance * (isCritical ? 1.8 : 1));

    // 서버 동기화 요청
    this.combatManager.requestAttack(attacker.unit.id, target.unit.id, dmg);

    // 로컬 즉시 적용 (낙관적 업데이트)
    target.unit.hp = Math.max(0, target.unit.hp - dmg);

    // 이펙트
    this.effectManager.spawnDamageText(target.sprite.x, target.sprite.y, dmg, isCritical);
    this.soundManager.playHitSound('flesh');

    // P34-A: VFX 히트 이펙트 (랜덤 common VFX)
    this._showHitVFX(target.sprite.x, target.sprite.y);

    // P34-A: Voice 연결
    if (attacker.isAlly) {
      if (isCritical) {
        playSfx(this, COMBAT_VOICE.CRITICAL, 0.7);
      } else {
        playRandomVoice(this, [...COMBAT_VOICE.ATTACK], 0.5);
      }
    }
    if (!target.isAlly) {
      // 적 피격 — 무음 (적 보이스 없음)
    } else {
      // 아군 피격
      playRandomVoice(this, [...COMBAT_VOICE.HIT], 0.4);
    }

    // 로그
    const critLabel = isCritical ? ' 💥크리티컬!' : '';
    this.battleUI.addLog(`${attacker.unit.name} → ${target.unit.name} : ${dmg} 데미지${critLabel}`);

    // 사망 처리
    if (target.unit.hp <= 0) {
      target.sprite.setAlpha(0.3);
      this.battleUI.addLog(`💀 ${target.unit.name} 쓰러짐!`);
      if (target.isAlly) {
        playSfx(this, COMBAT_VOICE.DEATH, 0.7);
      }
    }
  }

  /** P34-A: 히트 지점에 VFX 이미지 표시 (페이드 + 스케일) */
  private _showHitVFX(x: number, y: number): void {
    const idx = Phaser.Math.Between(1, 10);
    const padded = String(idx).padStart(3, '0');
    const key = `vfx_common_${padded}`;
    if (!this.textures.exists(key)) return;

    const vfx = this.add.image(x, y, key)
      .setDisplaySize(48, 48)
      .setAlpha(0.9)
      .setDepth(8000);

    this.tweens.add({
      targets: vfx,
      scaleX: 1.5, scaleY: 1.5,
      alpha: 0,
      duration: 350,
      ease: 'Sine.easeOut',
      onComplete: () => vfx.destroy(),
    });
  }

  // ─── 마우스/터치 전투 액션 버튼 ────────────────────────────────

  private _createActionButtons(): void {
    const btnY = 620;
    const btnStyle = {
      fontSize: '13px',
      color: '#ffffff',
      backgroundColor: '#333355',
      padding: { x: 12, y: 6 },
    };

    const actions = [
      { label: '⚔️ 공격', x: 540, action: () => this._forceAutoAttack() },
      { label: '🎯 타겟', x: 640, action: () => this._cycleTarget() },
      { label: '⏸ 일시정지', x: 740, action: () => this.scene.isPaused() ? this.scene.resume() : this.scene.pause() },
    ];

    for (const btn of actions) {
      const text = this.add.text(btn.x, btnY, btn.label, btnStyle)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(9000);
      text.on('pointerdown', btn.action);
    }
  }

  /** 수동 즉시 공격 (버튼 클릭용) */
  private _forceAutoAttack(): void {
    if (this.phase !== 'fighting') return;
    const player = this.allySprites[0];
    if (!player || player.unit.hp <= 0) return;
    if (!this.selectedTarget || this.selectedTarget.unit.hp <= 0) {
      const living = this.enemySprites.filter(e => e.unit.hp > 0);
      if (living.length > 0) this._selectTarget(living[0]);
      else return;
    }
    this._executeAutoAttack(player, this.selectedTarget!);
    player.autoAttackTimer = AUTO_ATTACK_BASE_DELAY / (player.unit.attackSpeed ?? 1);
  }

  // ─── 스킬 사용 ────────────────────────────────────────────────

  private _handleInput(): void {
    // 키보드가 없으면 스킵 (마우스 버튼으로 대체)
    if (!this.input.keyboard) return;

    // TAB 타겟 순환
    if (this.tabKey && Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      this._cycleTarget();
    }

    // 스킬 단축키 (1~6)
    for (let i = 0; i < this.skillKeys.length; i++) {
      if (this.skillKeys[i] && Phaser.Input.Keyboard.JustDown(this.skillKeys[i])) {
        this._useSkill(i);
      }
    }
  }

  private _useSkill(slotIndex: number): void {
    const slot = this.skillSlots[slotIndex];
    if (!slot || slot.currentCooldown > 0) return;

    // MP 체크
    const player = this.allySprites[0];
    if (!player || player.unit.hp <= 0) return;
    if (player.unit.mp < slot.mpCost) {
      this.battleUI.addLog('❌ MP 부족!');
      return;
    }

    // 타겟 확인
    if (!this.selectedTarget || this.selectedTarget.unit.hp <= 0) {
      this.battleUI.addLog('❌ 유효한 타겟 없음');
      return;
    }

    // MP 차감 + 쿨다운 시작
    player.unit.mp -= slot.mpCost;
    slot.currentCooldown = slot.cooldown;

    // 스킬 데미지 계산
    const baseDmg = slot.damage + (player.unit.attack * (slot.damageScale ?? 1));
    const variance = 0.9 + Math.random() * 0.2;
    const dmg = Math.round(baseDmg * variance);

    // 서버 동기화
    this.combatManager.requestSkill(
      player.unit.id,
      this.selectedTarget.unit.id,
      slot.skillId,
      dmg,
    );

    // 로컬 즉시 적용
    this.selectedTarget.unit.hp = Math.max(0, this.selectedTarget.unit.hp - dmg);

    // 이펙트
    this.effectManager.spawnDamageText(
      this.selectedTarget.sprite.x, this.selectedTarget.sprite.y,
      dmg, false,
    );
    this.soundManager.playSfx(slot.sfxKey ?? 'sfx_skill_activate');

    // P34-A: 스킬 VFX + Voice
    this._showHitVFX(this.selectedTarget.sprite.x, this.selectedTarget.sprite.y);
    if (slotIndex === 4) {
      // 궁극기 (5번 슬롯)
      playSfx(this, COMBAT_VOICE.ULTIMATE, 0.8);
    } else {
      playSfx(this, COMBAT_VOICE.SKILL_CAST, 0.6);
    }

    // 로그
    this.battleUI.addLog(`⚡ ${slot.name} → ${this.selectedTarget.unit.name} : ${dmg}`);

    // UI 쿨다운 표시 갱신
    this.battleUI.onSkillUsed(slotIndex, slot.cooldown);

    // 사망 처리
    if (this.selectedTarget.unit.hp <= 0) {
      this.selectedTarget.sprite.setAlpha(0.3);
      this.battleUI.addLog(`💀 ${this.selectedTarget.unit.name} 쓰러짐!`);
    }
  }

  // ─── 쿨다운 갱신 ─────────────────────────────────────────────

  private _updateSkillCooldowns(delta: number): void {
    const dt = delta / 1000;
    for (const slot of this.skillSlots) {
      if (slot.currentCooldown > 0) {
        slot.currentCooldown = Math.max(0, slot.currentCooldown - dt);
      }
    }
  }

  // ─── HP/MP 바 갱신 ────────────────────────────────────────────

  private _updateBars(): void {
    for (const us of this.allSprites) {
      const hpRatio = Math.max(0, us.unit.hp / us.unit.maxHp);
      us.hpBar.setScale(hpRatio, 1);
      us.hpBar.setPosition(
        us.hpBarBg.x - (BAR_WIDTH * (1 - hpRatio)) / 2,
        us.hpBarBg.y,
      );

      const mpRatio = us.unit.maxMp > 0
        ? Math.max(0, us.unit.mp / us.unit.maxMp)
        : 0;
      us.mpBar.setScale(mpRatio, 1);
      us.mpBar.setPosition(
        us.mpBarBg.x - (BAR_WIDTH * (1 - mpRatio)) / 2,
        us.mpBarBg.y,
      );
    }
  }

  // ─── 전투 종료 판정 ──────────────────────────────────────────

  private _checkBattleEnd(): void {
    const allEnemiesDead = this.enemySprites.every(e => e.unit.hp <= 0);
    const allAlliesDead = this.allySprites.every(a => a.unit.hp <= 0);

    if (allEnemiesDead) {
      this.phase = 'victory';
      this.battleUI.addLog('🎉 승리!');
      this.soundManager.playSfx('sfx_enemy_death');
      playSfx(this, COMBAT_VOICE.VICTORY, 0.8);
      this._showLootPopup();
    } else if (allAlliesDead) {
      this.phase = 'defeat';
      this.battleUI.addLog('💔 패배...');
      this.soundManager.playSfx('sfx_player_death');
      this._showDefeatPopup();
    }
  }

  // ─── 전리품 팝업 ─────────────────────────────────────────────

  private _showLootPopup(): void {
    const loot = this.combatManager.getLoot();
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const container = this.add.container(cx, cy);

    // 반투명 배경
    const bg = this.add.rectangle(0, 0, 320, 240, 0x000000, 0.85)
      .setStrokeStyle(2, 0xffcc00);
    container.add(bg);

    const title = this.add.text(0, -90, '🏆 전리품', {
      fontSize: '20px', color: '#ffcc00',
    }).setOrigin(0.5);
    container.add(title);

    loot.forEach((item: LootItem, i: number) => {
      const txt = this.add.text(-120, -50 + i * 24, `• ${item.name} x${item.quantity}`, {
        fontSize: '14px', color: '#ffffff',
      });
      container.add(txt);
    });

    // 닫기 버튼
    const closeBtn = this.add.text(0, 90, '[ 확인 ]', {
      fontSize: '16px', color: '#88ff88',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this._exitBattle();
    });
    container.add(closeBtn);

    this.lootPopup = container;
  }

  private _showDefeatPopup(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const container = this.add.container(cx, cy);
    const bg = this.add.rectangle(0, 0, 280, 140, 0x000000, 0.85)
      .setStrokeStyle(2, 0xff4444);
    container.add(bg);

    const title = this.add.text(0, -30, '💔 패배', {
      fontSize: '20px', color: '#ff4444',
    }).setOrigin(0.5);
    container.add(title);

    const closeBtn = this.add.text(0, 30, '[ 돌아가기 ]', {
      fontSize: '16px', color: '#aaaaaa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      this._exitBattle();
    });
    container.add(closeBtn);
  }

  private async _exitBattle(): Promise<void> {
    // P25-05: 서버 전투 종료
    if (this.serverCombatId) {
      try {
        await networkManager.combatEnd(this.serverCombatId);
      } catch { /* 이미 종료되었을 수 있음 */ }
    }

    // 소켓 이벤트 클린업
    this.socketCleanups.forEach((fn) => fn());
    this.socketCleanups = [];

    // GameScene으로 복귀
    this.scene.start('GameScene');
  }
}
