/**
 * CombatRewardFlow — P26-10: 전투 → 보상 → 레벨업 플로우
 *
 * 플로우:
 * 1. 전투 승리 → 보상 팝업 (EXP/골드/아이템)
 * 2. 레벨업 감지 → 스탯 분배 팝업
 * 3. 스킬 해금 알림
 *
 * NetworkManager 전투 결과 + 소켓 이벤트 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager, CombatResult, CharacterData } from '../network/NetworkManager';
import { GameHUD } from '../ui/GameHUD';
import { QuestFlowManager } from './QuestFlowManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface RewardData {
  exp: number;
  gold: number;
  items: Array<{ name: string; quantity: number; rarity: string }>;
}

export interface LevelUpData {
  newLevel: number;
  statPoints: number;
  skillPoints: number;
  unlockedSkills: string[];
}

export interface StatAllocation {
  atk: number;
  def: number;
  hp: number;
  mp: number;
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class CombatRewardFlow {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private hud: GameHUD;
  private questFlow: QuestFlowManager;
  private characterId = '';

  // 팝업
  private rewardPopup: Phaser.GameObjects.Container | null = null;
  private levelUpPopup: Phaser.GameObjects.Container | null = null;
  private pendingStatPoints = 0;

  constructor(scene: Phaser.Scene, net: NetworkManager, hud: GameHUD, questFlow: QuestFlowManager) {
    this.scene = scene;
    this.net = net;
    this.hud = hud;
    this.questFlow = questFlow;
    this._bindEvents();
  }

  init(characterId: string): void {
    this.characterId = characterId;
  }

  // ── 전투 결과 처리 ────────────────────────────────────────

  async processCombatResult(result: CombatResult): Promise<void> {
    if (!result.victory) return; // 패배 시 사망 시스템에서 처리

    const prevChar = await this.net.getCharacter(this.characterId);
    const prevLevel = prevChar.level;

    // 보상 데이터 가져오기
    const rewards: RewardData = {
      exp: result.expGained ?? 0,
      gold: result.goldGained ?? 0,
      items: (result.loot ?? []).map(l => ({ name: l.name, quantity: l.quantity, rarity: 'common' })),
    };

    // 보상 팝업 표시
    this._showRewardPopup(rewards);

    // HUD 업데이트
    await this.hud.refreshCharacter();

    // 레벨업 체크
    const newChar = await this.net.getCharacter(this.characterId);
    if (newChar.level > prevLevel) {
      const levelUpData: LevelUpData = {
        newLevel: newChar.level,
        statPoints: (newChar.level - prevLevel) * 3,
        skillPoints: (newChar.level - prevLevel),
        unlockedSkills: [],
      };

      // 보상 팝업 닫힌 후 레벨업 팝업
      this.scene.time.delayedCall(1500, () => {
        this._showLevelUpPopup(levelUpData);
      });
    }

    // 퀘스트 킬 이벤트: loot의 itemId를 몬스터 킬로 간주
    if (result.loot) {
      result.loot.forEach(l => {
        this.questFlow.onMonsterKill(l.itemId);
      });
    }
  }

  // ── 보상 팝업 ────────────────────────────────────────────

  private _showRewardPopup(rewards: RewardData): void {
    this._closeRewardPopup();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.rewardPopup = this.scene.add.container(0, 0).setDepth(940);

    const bg = this.scene.add.rectangle(cx, cy, 340, 260, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xffaa00);
    this.rewardPopup.add(bg);

    let y = cy - 100;
    const line = (text: string, color = '#e0e0ff', size = '13px') => {
      const t = this.scene.add.text(cx, y, text, { fontSize: size, color }).setOrigin(0.5);
      this.rewardPopup!.add(t);
      y += parseInt(size) + 8;
    };

    line('⚔️ 전투 승리!', '#ffaa00', '20px');
    y += 10;
    line(`EXP +${rewards.exp}`, '#88cc88', '14px');
    line(`Gold +${rewards.gold}`, '#ffcc00', '14px');

    if (rewards.items.length > 0) {
      y += 6;
      line('획득 아이템:', '#aaaacc', '12px');
      const RARITY_COLORS: Record<string, string> = {
        common: '#aaaaaa', uncommon: '#55cc55', rare: '#5599ff',
        epic: '#bb55ff', legendary: '#ffaa00',
      };
      rewards.items.forEach(item => {
        line(`  📦 ${item.name} x${item.quantity}`, RARITY_COLORS[item.rarity] ?? '#aaaaaa', '12px');
      });
    }

    // 자동 닫기 + 수동 닫기
    const closeBtn = this.scene.add.text(cx, cy + 100, '[ 확인 ]', {
      fontSize: '14px', color: '#aaaacc', backgroundColor: '#2a2a4e', padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeRewardPopup());
    this.rewardPopup.add(closeBtn);

    // 5초 후 자동 닫기
    this.scene.time.delayedCall(5000, () => this._closeRewardPopup());
  }

  private _closeRewardPopup(): void {
    if (this.rewardPopup) { this.rewardPopup.destroy(); this.rewardPopup = null; }
  }

  // ── 레벨업 팝업 + 스탯 분배 ──────────────────────────────

  private _showLevelUpPopup(data: LevelUpData): void {
    this._closeLevelUpPopup();
    this.pendingStatPoints = data.statPoints;

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const pw = 360;
    const ph = 340;

    this.levelUpPopup = this.scene.add.container(0, 0).setDepth(950);

    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.98)
      .setStrokeStyle(3, 0xffcc00);
    this.levelUpPopup.add(bg);

    let y = cy - ph / 2 + 20;
    const line = (text: string, color = '#e0e0ff', size = '13px') => {
      const t = this.scene.add.text(cx, y, text, { fontSize: size, color }).setOrigin(0.5);
      this.levelUpPopup!.add(t);
      y += parseInt(size) + 8;
    };

    line('🎊 레벨 업!', '#ffcc00', '22px');
    line(`Lv.${data.newLevel}`, '#ffffff', '18px');
    y += 10;
    line(`스탯 포인트: ${data.statPoints}`, '#88cc88');
    line(`스킬 포인트: ${data.skillPoints}`, '#88aaff');

    // 스탯 분배 UI
    const allocation: StatAllocation = { atk: 0, def: 0, hp: 0, mp: 0 };
    const stats: Array<{ key: keyof StatAllocation; label: string; icon: string }> = [
      { key: 'atk', label: '공격력', icon: '⚔️' },
      { key: 'def', label: '방어력', icon: '🛡️' },
      { key: 'hp',  label: 'HP',     icon: '❤️' },
      { key: 'mp',  label: 'MP',     icon: '💙' },
    ];

    y += 10;
    const pointsLabel = this.scene.add.text(cx, y, `남은 포인트: ${this.pendingStatPoints}`, {
      fontSize: '12px', color: '#ffcc00',
    }).setOrigin(0.5);
    this.levelUpPopup.add(pointsLabel);
    y += 24;

    stats.forEach(stat => {
      const rowY = y;
      const label = this.scene.add.text(cx - 80, rowY, `${stat.icon} ${stat.label}`, {
        fontSize: '13px', color: '#ccccee',
      }).setOrigin(0, 0.5);

      const valText = this.scene.add.text(cx + 20, rowY, '0', {
        fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5);

      const minus = this.scene.add.text(cx - 10, rowY, '-', {
        fontSize: '16px', color: '#ff6666', backgroundColor: '#2a2a4e', padding: { x: 4, y: 1 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (allocation[stat.key] > 0) {
            allocation[stat.key]--;
            this.pendingStatPoints++;
            valText.setText(`${allocation[stat.key]}`);
            pointsLabel.setText(`남은 포인트: ${this.pendingStatPoints}`);
          }
        });

      const plus = this.scene.add.text(cx + 50, rowY, '+', {
        fontSize: '16px', color: '#55cc55', backgroundColor: '#2a2a4e', padding: { x: 4, y: 1 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          if (this.pendingStatPoints > 0) {
            allocation[stat.key]++;
            this.pendingStatPoints--;
            valText.setText(`${allocation[stat.key]}`);
            pointsLabel.setText(`남은 포인트: ${this.pendingStatPoints}`);
          }
        });

      this.levelUpPopup!.add([label, valText, minus, plus]);
      y += 30;
    });

    // 확인 버튼
    const confirmBtn = this.scene.add.text(cx, cy + ph / 2 - 35, '[ 확인 ]', {
      fontSize: '14px', color: '#55cc55', backgroundColor: '#2a2a4e', padding: { x: 16, y: 6 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        await this._applyStatAllocation(allocation);
        this._closeLevelUpPopup();
      });
    this.levelUpPopup.add(confirmBtn);
  }

  private async _applyStatAllocation(alloc: StatAllocation): Promise<void> {
    try {
      await this.net.post('/api/characters/stats', {
        characterId: this.characterId,
        allocation: alloc,
      });
      await this.hud.refreshCharacter();
    } catch (e) {
      console.error('[CombatRewardFlow] stat allocation failed', e);
    }
  }

  private _closeLevelUpPopup(): void {
    if (this.levelUpPopup) { this.levelUpPopup.destroy(); this.levelUpPopup = null; }
  }

  // ── 이벤트 바인딩 ─────────────────────────────────────────

  private _bindEvents(): void {
    this.net.on('combat:result', (raw: unknown) => {
      this.processCombatResult(raw as CombatResult);
    });
  }

  destroy(): void {
    this._closeRewardPopup();
    this._closeLevelUpPopup();
  }
}
