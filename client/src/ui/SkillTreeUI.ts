/**
 * SkillTreeUI — P26-03: 스킬 트리 UI
 *
 * 기능:
 * - 6클래스별 5스킬 표시
 * - 스킬 해금/업그레이드
 * - 쿨다운/마나 비용 표시
 * - NetworkManager 연동
 *
 * SSOT 클래스: ether_knight, memory_weaver, shadow_weaver, memory_breaker, time_guardian, void_wanderer
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  manaCost: number;
  cooldownMs: number;
  maxLevel: number;
  currentLevel: number;
  unlocked: boolean;
  unlockLevel: number; // 캐릭터 레벨 요구
  tier: number; // 1~5 (스킬 트리 행)
  classId: string;
  damageMultiplier?: number;
  effectType?: string;
}

export type ClassId = 'ether_knight' | 'memory_weaver' | 'shadow_weaver' | 'memory_breaker' | 'time_guardian' | 'void_wanderer';

const CLASS_NAMES: Record<ClassId, string> = {
  ether_knight: '에테르 나이트',
  memory_weaver: '메모리 위버',
  shadow_weaver: '섀도우 위버',
  memory_breaker: '메모리 브레이커',
  time_guardian: '타임 가디언',
  void_wanderer: '보이드 원더러',
};

const CLASS_COLORS: Record<ClassId, number> = {
  ether_knight:   0x4488ff,
  memory_weaver:  0xaa55ff,
  shadow_weaver:  0x555577,
  memory_breaker: 0xff5544,
  time_guardian:  0x44ccaa,
  void_wanderer:  0x8855cc,
};

// ── 기본 스킬 데이터 (서버 동기화 전 fallback) ──────────────

const DEFAULT_SKILLS: Record<ClassId, SkillDef[]> = (() => {
  const make = (classId: ClassId, skills: Array<{ name: string; icon: string; mana: number; cd: number; tier: number }>): SkillDef[] =>
    skills.map((s, i) => ({
      id: `${classId}_skill_${i + 1}`,
      name: s.name,
      description: `${CLASS_NAMES[classId]}의 ${s.tier}티어 스킬`,
      icon: s.icon,
      manaCost: s.mana,
      cooldownMs: s.cd,
      maxLevel: 5,
      currentLevel: 0,
      unlocked: false,
      unlockLevel: s.tier * 5,
      tier: s.tier,
      classId,
    }));

  return {
    ether_knight: make('ether_knight', [
      { name: '에테르 슬래시', icon: '⚔️', mana: 15, cd: 3000, tier: 1 },
      { name: '빛의 방패', icon: '🛡️', mana: 20, cd: 8000, tier: 2 },
      { name: '에테르 돌진', icon: '💨', mana: 25, cd: 10000, tier: 3 },
      { name: '결정화 참격', icon: '💎', mana: 35, cd: 15000, tier: 4 },
      { name: '에테르 폭풍', icon: '🌪️', mana: 50, cd: 30000, tier: 5 },
    ]),
    memory_weaver: make('memory_weaver', [
      { name: '기억 실타래', icon: '🧵', mana: 12, cd: 2500, tier: 1 },
      { name: '회상의 치유', icon: '💚', mana: 25, cd: 6000, tier: 2 },
      { name: '기억 왜곡', icon: '🌀', mana: 30, cd: 10000, tier: 3 },
      { name: '시간 되감기', icon: '⏪', mana: 40, cd: 20000, tier: 4 },
      { name: '완전한 기억', icon: '📖', mana: 55, cd: 35000, tier: 5 },
    ]),
    shadow_weaver: make('shadow_weaver', [
      { name: '그림자 단도', icon: '🗡️', mana: 10, cd: 2000, tier: 1 },
      { name: '암흑 은신', icon: '🌑', mana: 20, cd: 8000, tier: 2 },
      { name: '그림자 분신', icon: '👤', mana: 30, cd: 12000, tier: 3 },
      { name: '암살 일격', icon: '💀', mana: 40, cd: 18000, tier: 4 },
      { name: '심연의 포옹', icon: '🕳️', mana: 55, cd: 30000, tier: 5 },
    ]),
    memory_breaker: make('memory_breaker', [
      { name: '기억 파쇄', icon: '💥', mana: 15, cd: 3000, tier: 1 },
      { name: '망각의 일격', icon: '🔨', mana: 22, cd: 7000, tier: 2 },
      { name: '정신 파괴', icon: '🧠', mana: 30, cd: 10000, tier: 3 },
      { name: '기억 흡수', icon: '🔮', mana: 38, cd: 16000, tier: 4 },
      { name: '완전 소거', icon: '⚡', mana: 50, cd: 28000, tier: 5 },
    ]),
    time_guardian: make('time_guardian', [
      { name: '시간 정지', icon: '⏸️', mana: 18, cd: 5000, tier: 1 },
      { name: '감속 영역', icon: '🐌', mana: 22, cd: 8000, tier: 2 },
      { name: '시간 가속', icon: '⚡', mana: 28, cd: 10000, tier: 3 },
      { name: '역행의 방벽', icon: '🔄', mana: 40, cd: 20000, tier: 4 },
      { name: '영겁의 시간', icon: '♾️', mana: 60, cd: 40000, tier: 5 },
    ]),
    void_wanderer: make('void_wanderer', [
      { name: '공허 탄환', icon: '💜', mana: 12, cd: 2500, tier: 1 },
      { name: '차원 도약', icon: '🌌', mana: 20, cd: 6000, tier: 2 },
      { name: '공허 올가미', icon: '🪢', mana: 28, cd: 10000, tier: 3 },
      { name: '차원 균열', icon: '🌀', mana: 40, cd: 18000, tier: 4 },
      { name: '공허 폭발', icon: '🕳️', mana: 55, cd: 32000, tier: 5 },
    ]),
  };
})();

// ── 메인 클래스 ───────────────────────────────────────────────

export class SkillTreeUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  private classId: ClassId = 'ether_knight';
  private skills: SkillDef[] = [];
  private characterLevel = 1;
  private skillPoints = 0;
  private characterId = '';

  // UI
  private titleText!: Phaser.GameObjects.Text;
  private pointsText!: Phaser.GameObjects.Text;
  private treeContainer!: Phaser.GameObjects.Container;
  private detailPanel: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
    this._buildUI();
  }

  // ── 공개 API ──────────────────────────────────────────────

  async open(characterId: string, classId: ClassId, level: number, skillPoints: number): Promise<void> {
    this.characterId = characterId;
    this.classId = classId;
    this.characterLevel = level;
    this.skillPoints = skillPoints;
    this.visible = true;
    this.container.setVisible(true);
    await this._loadSkills();
    this._renderTree();
  }

  close(): void {
    this.visible = false;
    this.container.setVisible(false);
    this._closeDetail();
  }

  isOpen(): boolean { return this.visible; }

  // ── 내부: 스킬 로드 ──────────────────────────────────────

  private async _loadSkills(): Promise<void> {
    // 서버에서 스킬 상태 fetch (미구현 시 default fallback)
    try {
      const resp = await this.net.get<{ skills: SkillDef[] }>(`/api/skills/${this.characterId}`);
      this.skills = resp.skills ?? DEFAULT_SKILLS[this.classId];
    } catch {
      this.skills = [...DEFAULT_SKILLS[this.classId]];
    }
    this.titleText.setText(`🌳 ${CLASS_NAMES[this.classId]} 스킬 트리`);
    this.pointsText.setText(`스킬 포인트: ${this.skillPoints}`);
  }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const pw = 500;
    const ph = 520;

    const dimmer = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setInteractive().on('pointerdown', () => this.close());
    this.container.add(dimmer);

    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.95).setStrokeStyle(2, 0x4a4a6a);
    this.container.add(bg);

    this.titleText = this.scene.add.text(cx - pw / 2 + 20, cy - ph / 2 + 12, '🌳 스킬 트리', {
      fontSize: '18px', color: '#e0e0ff', fontStyle: 'bold',
    });
    this.container.add(this.titleText);

    this.pointsText = this.scene.add.text(cx + pw / 2 - 180, cy - ph / 2 + 14, '스킬 포인트: 0', {
      fontSize: '13px', color: '#ffcc00',
    });
    this.container.add(this.pointsText);

    this.treeContainer = this.scene.add.container(cx - pw / 2 + 40, cy - ph / 2 + 60);
    this.container.add(this.treeContainer);

    const closeBtn = this.scene.add.text(cx + pw / 2 - 28, cy - ph / 2 + 8, '✕', {
      fontSize: '18px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  // ── 내부: 트리 렌더 ──────────────────────────────────────

  private _renderTree(): void {
    this.treeContainer.removeAll(true);

    const nodeSize = 60;
    const gapY = 80;
    const centerX = 210;

    // 티어별 연결선
    for (let tier = 1; tier <= 4; tier++) {
      const line = this.scene.add.rectangle(centerX, tier * gapY + nodeSize / 2 + 10, 2, gapY - nodeSize, 0x3a3a5e);
      this.treeContainer.add(line);
    }

    // 스킬 노드
    this.skills.forEach((skill) => {
      const y = skill.tier * gapY;
      const canUnlock = this.characterLevel >= skill.unlockLevel;
      const bgColor = skill.unlocked ? CLASS_COLORS[this.classId] : (canUnlock ? 0x3a3a5e : 0x1a1a2e);
      const alpha = skill.unlocked ? 1.0 : (canUnlock ? 0.7 : 0.3);

      const nodeBg = this.scene.add.rectangle(centerX, y, nodeSize, nodeSize, bgColor, alpha)
        .setStrokeStyle(2, skill.unlocked ? 0xffffff : 0x4a4a6a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._showSkillDetail(skill));

      const icon = this.scene.add.text(centerX, y - 6, skill.icon, {
        fontSize: '22px',
      }).setOrigin(0.5).setAlpha(alpha);

      const label = this.scene.add.text(centerX, y + 18, `Lv.${skill.currentLevel}/${skill.maxLevel}`, {
        fontSize: '9px', color: '#cccccc',
      }).setOrigin(0.5).setAlpha(alpha);

      const nameT = this.scene.add.text(centerX + nodeSize / 2 + 10, y, skill.name, {
        fontSize: '11px', color: '#aaaacc',
      }).setOrigin(0, 0.5).setAlpha(alpha);

      this.treeContainer.add([nodeBg, icon, label, nameT]);
    });
  }

  // ── 내부: 스킬 상세 ──────────────────────────────────────

  private _showSkillDetail(skill: SkillDef): void {
    this._closeDetail();

    const cx = this.scene.scale.width / 2 + 260;
    const cy = this.scene.scale.height / 2;
    const pw = 220;
    const ph = 280;

    this.detailPanel = this.scene.add.container(0, 0).setDepth(910);

    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.98)
      .setStrokeStyle(2, CLASS_COLORS[this.classId]);
    this.detailPanel.add(bg);

    let y = cy - ph / 2 + 16;
    const line = (text: string, color = '#e0e0ff', size = '12px') => {
      const t = this.scene.add.text(cx - pw / 2 + 14, y, text, {
        fontSize: size, color, wordWrap: { width: pw - 28 },
      });
      this.detailPanel!.add(t);
      y += parseInt(size) + 6;
    };

    line(`${skill.icon} ${skill.name}`, '#ffffff', '15px');
    line(`Lv.${skill.currentLevel} / ${skill.maxLevel}`, '#aaaacc');
    line(skill.description, '#cccccc', '11px');
    line(`마나: ${skill.manaCost}`, '#5599ff');
    line(`쿨다운: ${(skill.cooldownMs / 1000).toFixed(1)}초`, '#aaaacc');
    line(`해금 레벨: ${skill.unlockLevel}`, '#88cc88');

    // 업그레이드 버튼
    const canUpgrade = skill.unlocked && skill.currentLevel < skill.maxLevel && this.skillPoints > 0;
    const canUnlock = !skill.unlocked && this.characterLevel >= skill.unlockLevel && this.skillPoints > 0;

    if (canUpgrade || canUnlock) {
      const label = canUnlock ? '[ 해금 ]' : '[ 업그레이드 ]';
      const btn = this.scene.add.text(cx, cy + ph / 2 - 40, label, {
        fontSize: '14px', color: '#55cc55', backgroundColor: '#2a2a4e', padding: { x: 10, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._upgradeSkill(skill));
      this.detailPanel.add(btn);
    }

    const closeBtn = this.scene.add.text(cx + pw / 2 - 20, cy - ph / 2 + 6, '✕', {
      fontSize: '14px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this._closeDetail());
    this.detailPanel.add(closeBtn);

    this.container.add(this.detailPanel);
  }

  private async _upgradeSkill(skill: SkillDef): Promise<void> {
    try {
      // 서버 엔드포인트: POST /api/skills/levelup { userId, skillCode, characterLevel }
      await this.net.post('/api/skills/levelup', {
        userId: this.characterId,
        skillCode: skill.id,
        characterLevel: this.characterLevel,
      });
      if (!skill.unlocked) skill.unlocked = true;
      else skill.currentLevel++;
      this.skillPoints--;
      this.pointsText.setText(`스킬 포인트: ${this.skillPoints}`);
      this._renderTree();
      this._closeDetail();
    } catch (e) {
      console.error('[SkillTreeUI] upgrade failed', e);
    }
  }

  private _closeDetail(): void {
    if (this.detailPanel) { this.detailPanel.destroy(); this.detailPanel = null; }
  }

  destroy(): void { this._closeDetail(); this.container.destroy(); }
}
