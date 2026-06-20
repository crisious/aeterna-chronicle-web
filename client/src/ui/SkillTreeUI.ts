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
import { formatPassiveEffect, STATUS_COLOR } from '../skills/passiveEffectFormatter';
import { bindEscClose } from '../utils/uiEsc';
import { KeyboardFocusRing } from '../accessibility/KeyboardFocusRing';
import { pushUiModal, popUiModal } from '../accessibility/uiModalLock';
import { getCombosUsingSkill } from '../skills/comboMirror';
import { formatBranchLabel, getBranchGroupClient, getBranchSiblingsClient } from '../skills/branchMirror';
import { playSfx, UI_SFX } from '../utils/SFXHelper';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';
import { getSkillTreeIconId } from '../data/skillTreeIcons';

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
  /** P55-S4: 패시브 효과 데이터 (서버 Skill.effect 와 동일 shape) */
  effect?: { type: string; value: number; duration?: number } | null;
  /** P55-S4: 스킬 종류 — active / passive / ultimate */
  type?: 'active' | 'passive' | 'ultimate' | string;
}

export type ClassId = 'ether_knight' | 'memory_weaver' | 'shadow_weaver' | 'memory_breaker' | 'time_guardian' | 'void_wanderer';

// 서버 계약 shape (skillEngine.getSkillTree / getUserSkills). Skill 은 code(고유키)·mpCost·cooldown(초)·
// requiredLevel 을 쓰며, 보유는 PlayerSkill(level) + 중첩 skill. SkillDef 로 매핑해 렌더한다.
interface ServerSkill {
  id: string; code: string; name: string; description: string; class: string;
  tier: number; type: string; mpCost: number; cooldown: number; maxLevel: number;
  requiredLevel: number; icon: string | null;
  effect?: { type: string; value: number; duration?: number } | null;
}
interface ServerPlayerSkill { skillId: string; level: number; isEquipped?: boolean; skill: ServerSkill | null; }

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

export const SKILL_TREE_UI_FRAME_TEXTURES = {
  mainPanel: {
    key: 'ui_frame_skill_tree_main_panel',
    path: 'assets/generated/ui/frames/UI-SET-002-DEF.png',
  },
  detailPanel: {
    key: 'ui_frame_skill_tree_detail_panel',
    path: 'assets/generated/ui/frames/UI-SET-003-DEF.png',
  },
  actionButton: {
    key: 'ui_frame_skill_tree_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

export const SKILL_TREE_ADVANCED_ILLUSTRATION_COUNT = 3;
const SKILL_TREE_ADVANCED_ILLUSTRATION_SIZE = { width: 52, height: 68 } as const;

export interface SkillTreeAdvancedIllustrationResource {
  advancement: number;
  key: string;
  path: string;
}

export function getSkillTreeAdvancedIllustrationResource(
  classId: ClassId,
  advancement: number,
): SkillTreeAdvancedIllustrationResource | null {
  if (!Number.isInteger(advancement) || advancement < 1 || advancement > SKILL_TREE_ADVANCED_ILLUSTRATION_COUNT) {
    return null;
  }

  return {
    advancement,
    key: `char_${classId}_adv${advancement}`,
    path: `assets/generated/characters/class_advanced/char_illust_${classId}_adv${advancement}_front.png`,
  };
}

export function getSkillTreeAdvancedIllustrationResources(classId: ClassId): SkillTreeAdvancedIllustrationResource[] {
  const resources: SkillTreeAdvancedIllustrationResource[] = [];
  for (let advancement = 1; advancement <= SKILL_TREE_ADVANCED_ILLUSTRATION_COUNT; advancement++) {
    const resource = getSkillTreeAdvancedIllustrationResource(classId, advancement);
    if (resource) {
      resources.push(resource);
    }
  }
  return resources;
}

const SKILL_TREE_EXPECTED_MAIN_PANEL_FRAME_COUNT = 1;
const SKILL_TREE_EXPECTED_DETAIL_PANEL_FRAME_COUNT = 1;
const SKILL_TREE_EXPECTED_MAIN_ACTION_BUTTON_FRAME_COUNT = 2;
const SKILL_TREE_EXPECTED_NODE_ICON_COUNT = 5;
const SKILL_TREE_TITLE_ICON_TIER = 1;
const SKILL_TREE_RESET_ACTION_ICON_ID = 'skill_tg_reverse';
const SKILL_TREE_CLOSE_ACTION_ICON_ID = 'skill_tg_reverse';
const SKILL_TREE_BRANCH_DETAIL_ICON_ID = 'skill_mw_storm';
const SKILL_TREE_LOCKED_DETAIL_ICON_ID = 'skill_tg_stop';

export function preloadSkillTreeUiFrameTextures(
  scene: Phaser.Scene,
  options: { cacheBuster?: string; forceReload?: boolean } = {},
): void {
  for (const texture of Object.values(SKILL_TREE_UI_FRAME_TEXTURES)) {
    if (options.forceReload === true && scene.textures.exists(texture.key)) {
      scene.textures.remove(texture.key);
    }

    if (!scene.textures.exists(texture.key)) {
      const path = options.cacheBuster ? `${texture.path}?${options.cacheBuster}` : texture.path;
      scene.load.image(texture.key, path);
    }
  }

  const resetActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_RESET_ACTION_ICON_ID);
  if (resetActionIconResource) {
    if (options.forceReload === true && scene.textures.exists(resetActionIconResource.key)) {
      scene.textures.remove(resetActionIconResource.key);
    }

    if (!scene.textures.exists(resetActionIconResource.key)) {
      const path = options.cacheBuster ? `${resetActionIconResource.path}?${options.cacheBuster}` : resetActionIconResource.path;
      scene.load.image(resetActionIconResource.key, path);
    }
  }

  const closeActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_CLOSE_ACTION_ICON_ID);
  if (closeActionIconResource && closeActionIconResource.key !== resetActionIconResource?.key) {
    if (options.forceReload === true && scene.textures.exists(closeActionIconResource.key)) {
      scene.textures.remove(closeActionIconResource.key);
    }

    if (!scene.textures.exists(closeActionIconResource.key)) {
      const path = options.cacheBuster ? `${closeActionIconResource.path}?${options.cacheBuster}` : closeActionIconResource.path;
      scene.load.image(closeActionIconResource.key, path);
    }
  }

  for (const detailIconId of [SKILL_TREE_BRANCH_DETAIL_ICON_ID, SKILL_TREE_LOCKED_DETAIL_ICON_ID]) {
    const detailIconResource = getSpriteResourceForSkillIcon(detailIconId);
    if (!detailIconResource) continue;

    if (options.forceReload === true && scene.textures.exists(detailIconResource.key)) {
      scene.textures.remove(detailIconResource.key);
    }

    if (!scene.textures.exists(detailIconResource.key)) {
      const path = options.cacheBuster ? `${detailIconResource.path}?${options.cacheBuster}` : detailIconResource.path;
      scene.load.image(detailIconResource.key, path);
    }
  }
}

export function preloadSkillTreeAdvancedIllustrations(
  scene: Phaser.Scene,
  classId: ClassId,
  options: { cacheBuster?: string; forceReload?: boolean } = {},
): void {
  for (const resource of getSkillTreeAdvancedIllustrationResources(classId)) {
    if (options.forceReload === true && scene.textures.exists(resource.key)) {
      scene.textures.remove(resource.key);
    }

    if (!scene.textures.exists(resource.key)) {
      const path = options.cacheBuster ? `${resource.path}?${options.cacheBuster}` : resource.path;
      scene.load.image(resource.key, path);
    }
  }
}

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
      { name: '에테르 슬래시', icon: 'skill_ek_slash', mana: 15, cd: 3000, tier: 1 },
      { name: '빛의 방패', icon: 'skill_ek_shield', mana: 20, cd: 8000, tier: 2 },
      { name: '에테르 돌진', icon: 'skill_ek_charge', mana: 25, cd: 10000, tier: 3 },
      { name: '결정화 참격', icon: 'skill_ek_explode', mana: 35, cd: 15000, tier: 4 },
      { name: '에테르 폭풍', icon: 'skill_ek_ultimate', mana: 50, cd: 30000, tier: 5 },
    ]),
    memory_weaver: make('memory_weaver', [
      { name: '기억 실타래', icon: 'skill_mw_arrow', mana: 12, cd: 2500, tier: 1 },
      { name: '회상의 치유', icon: 'skill_mw_heal', mana: 25, cd: 6000, tier: 2 },
      { name: '기억 왜곡', icon: 'skill_mw_storm', mana: 30, cd: 10000, tier: 3 },
      { name: '시간 되감기', icon: 'skill_mw_passive', mana: 40, cd: 20000, tier: 4 },
      { name: '완전한 기억', icon: 'skill_mw_ultimate', mana: 55, cd: 35000, tier: 5 },
    ]),
    shadow_weaver: make('shadow_weaver', [
      { name: '그림자 단도', icon: 'skill_sw_stab', mana: 10, cd: 2000, tier: 1 },
      { name: '암흑 은신', icon: 'skill_sw_smoke', mana: 20, cd: 8000, tier: 2 },
      { name: '그림자 분신', icon: 'skill_sw_vital', mana: 30, cd: 12000, tier: 3 },
      { name: '암살 일격', icon: 'skill_sw_explosion', mana: 40, cd: 18000, tier: 4 },
      { name: '심연의 포옹', icon: 'skill_sw_ultimate', mana: 55, cd: 30000, tier: 5 },
    ]),
    memory_breaker: make('memory_breaker', [
      { name: '기억 파쇄', icon: 'skill_mb_shatter', mana: 15, cd: 3000, tier: 1 },
      { name: '망각의 일격', icon: 'skill_mb_ground', mana: 22, cd: 7000, tier: 2 },
      { name: '정신 파괴', icon: 'skill_mb_rage', mana: 30, cd: 10000, tier: 3 },
      { name: '기억 흡수', icon: 'skill_mb_storm', mana: 38, cd: 16000, tier: 4 },
      { name: '완전 소거', icon: 'skill_mb_ultimate', mana: 50, cd: 28000, tier: 5 },
    ]),
    time_guardian: make('time_guardian', [
      { name: '시간 정지', icon: 'skill_tg_stop', mana: 18, cd: 5000, tier: 1 },
      { name: '감속 영역', icon: 'skill_tg_slow', mana: 22, cd: 8000, tier: 2 },
      { name: '시간 가속', icon: 'skill_tg_haste', mana: 28, cd: 10000, tier: 3 },
      { name: '역행의 방벽', icon: 'skill_tg_reverse', mana: 40, cd: 20000, tier: 4 },
      { name: '영겁의 시간', icon: 'skill_tg_eternity', mana: 60, cd: 40000, tier: 5 },
    ]),
    void_wanderer: make('void_wanderer', [
      { name: '공허 탄환', icon: 'skill_vw_bullet', mana: 12, cd: 2500, tier: 1 },
      { name: '차원 도약', icon: 'skill_vw_warp', mana: 20, cd: 6000, tier: 2 },
      { name: '공허 올가미', icon: 'skill_vw_tether', mana: 28, cd: 10000, tier: 3 },
      { name: '차원 균열', icon: 'skill_vw_rift', mana: 40, cd: 18000, tier: 4 },
      { name: '공허 폭발', icon: 'skill_vw_explosion', mana: 55, cd: 32000, tier: 5 },
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
  private resetBtn!: Phaser.GameObjects.Text;
  private _resetArmed = false; // 2-press 확인(전 스킬 삭제이므로)
  private mainPanelFrame: Phaser.GameObjects.Image | null = null;
  private detailPanelFrame: Phaser.GameObjects.Image | null = null;
  private skillTreeActionButtonFrames: Phaser.GameObjects.Image[] = [];
  private skillTreeNodeIcons: Phaser.GameObjects.Image[] = [];
  private fallbackSkillNodeIconIds: string[] = [];
  private titleIcon: Phaser.GameObjects.Image | null = null;
  private titleIconFallback: Phaser.GameObjects.Text | null = null;
  private titleIconX = 0;
  private titleIconY = 0;
  private resetActionIcon: Phaser.GameObjects.Image | null = null;
  private resetActionIconFallbackRendered = false;
  private closeActionIcons: Phaser.GameObjects.Image[] = [];
  private closeActionIconFallbackIds: string[] = [];
  private detailLineIcons: Phaser.GameObjects.Image[] = [];
  private detailLineIconFallbackIds: string[] = [];
  private expectedDetailLineIconCount = 0;
  private expectedDetailLineIconKeys: string[] = [];
  private advancedIllustrationImages: Phaser.GameObjects.Image[] = [];
  private fallbackAdvancedIllustrationIds: string[] = [];

  // 전키보드 UI: 포커스 링(메인=스킬 노드 ↔ detail=업그레이드/닫기) + 모달락 + 노드 추적.
  private focusRing?: KeyboardFocusRing;
  private _modalPushed = false;
  private _skillNodes: Array<{ bg: Phaser.GameObjects.Rectangle; skill: SkillDef }> = [];
  private _mainRingIndex = 0; // detail 진입 전 메인 링 포커스 인덱스(복귀 시 복원)

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
    playSfx(this.scene, UI_SFX.OPEN);
    await this._loadSkills();
    this._renderTree();
    if (this._isSkillTreeFrameQaRoute() && this.skills.length > 0) {
      this.skillPoints = Math.max(this.skillPoints, 1);
      this.pointsText.setText(`스킬 포인트: ${this.skillPoints}`);
      this._showSkillDetail(this.skills[0]);
    }
    this._writeSkillTreeFrameQaProbe('ready');

    // FINDING-A4 ext16/ext24: ESC 닫기 (bindEscClose helper)
    this._escUnbind?.();
    this._escUnbind = bindEscClose(this.scene, () => this.close());

    // 전키보드 UI: 모달락 + 포커스 링(스킬 노드). detail 열리면 업그레이드/닫기로 전환.
    if (!this._modalPushed) {
      pushUiModal();
      this._modalPushed = true;
    }
    this.focusRing?.destroy();
    this.focusRing = new KeyboardFocusRing(this.scene, { columns: 1 });
    this._syncMainRing();
  }

  close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.container.setVisible(false);
    this._closeDetail();
    this._writeSkillTreeFrameQaProbe('hidden');
    playSfx(this.scene, UI_SFX.CLOSE);
    this._escUnbind?.();
    this._escUnbind = null;
    this.focusRing?.destroy();
    this.focusRing = undefined;
    if (this._modalPushed) {
      popUiModal();
      this._modalPushed = false;
    }
  }

  /** 메인 포커스 그룹(스킬 노드)으로 링 동기화. */
  private _syncMainRing(restoreIndex = -1): void {
    if (!this.focusRing) return;
    // 재sync(렌더/detail 닫힘) 시 리셋 확인 상태 해제
    this._resetArmed = false;
    if (this.resetBtn) this._setResetButtonLabel('ready');
    const items: Array<{ target: Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle }; activate: () => void; label: string }> =
      this._skillNodes.map((n) => ({
        target: n.bg,
        activate: () => this._showSkillDetail(n.skill),
        label: n.skill.name,
      }));
    // 리셋 버튼을 링 마지막에 — 키보드로 도달 가능하게
    if (this.resetBtn) {
      items.push({ target: this.resetBtn, activate: () => this._onResetButton(), label: '스킬 리셋' });
    }
    this.focusRing.setItems(items, false); // 자동 첫포커스 끄고 아래에서 복원
    if (items.length > 0) {
      const i = restoreIndex >= 0 && restoreIndex < items.length ? restoreIndex : 0;
      this.focusRing.focus(i);
    }
  }

  // FINDING-A4 ext24: bindEscClose unbind 참조
  private _escUnbind: (() => void) | null = null;

  isOpen(): boolean { return this.visible; }

  private _setSkillTreeTitle(): void {
    this.titleText.setText(`${CLASS_NAMES[this.classId]} 스킬 트리`);
    this._renderSkillTreeTitleIcon();
  }

  private _renderSkillTreeTitleIcon(): void {
    this.titleIcon?.destroy();
    this.titleIcon = null;
    this.titleIconFallback?.destroy();
    this.titleIconFallback = null;

    const titleIconId = getSkillTreeIconId(this.classId, SKILL_TREE_TITLE_ICON_TIER);
    const titleIconResource = titleIconId ? getSpriteResourceForSkillIcon(titleIconId) : undefined;
    if (titleIconResource && this.scene.textures.exists(titleIconResource.key)) {
      this.titleIcon = this.scene.add.image(this.titleIconX, this.titleIconY, titleIconResource.key)
        .setName('skill_tree_title_icon');
      this.titleIcon.setDisplaySize(20, 20);
      this.titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.container.add(this.titleIcon);
      return;
    }

    this.titleIconFallback = this.scene.add.text(this.titleIconX, this.titleIconY, '>', {
      fontSize: '16px',
      color: '#e0e0ff',
      fontStyle: 'bold',
      stroke: '#09111e',
      strokeThickness: 2,
    })
      .setName('skill_tree_title_icon_fallback')
      .setOrigin(0.5);
    this.container.add(this.titleIconFallback);
  }

  private _getSkillTreeFrameQaSkills(): SkillDef[] {
    const skills = DEFAULT_SKILLS[this.classId].map((skill) => ({ ...skill }));
    if (this.classId !== 'ether_knight' || skills.length < 2) {
      return skills;
    }

    skills[0] = {
      ...skills[0],
      id: 'ek_ether_explode_sword',
      name: '에테르 폭발검',
      description: '분기 상세 아이콘 QA용 에테르 나이트 스킬',
      icon: 'skill_ek_explode',
      tier: 2,
      currentLevel: 1,
      unlocked: true,
      unlockLevel: 10,
    };
    skills[1] = {
      ...skills[1],
      id: 'ek_combo_strike',
      name: '연속 타격',
      description: '분기 잠김 아이콘 QA용 해금된 대안 스킬',
      icon: 'skill_ek_slash',
      tier: 2,
      currentLevel: 1,
      unlocked: true,
      unlockLevel: 10,
    };
    return skills;
  }

  // ── 내부: 스킬 로드 ──────────────────────────────────────

  private async _loadSkills(): Promise<void> {
    if (this._isSkillTreeFrameQaRoute()) {
      this.skills = this._getSkillTreeFrameQaSkills();
      this._setSkillTreeTitle();
      this.pointsText.setText(`스킬 포인트: ${this.skillPoints}`);
      return;
    }

    // 클래스 전체 트리(tier1~4 그룹) + 보유 스킬(level) 을 합쳐 SkillDef 로 매핑.
    // 서버 PlayerSkill/Skill shape 을 평탄 SkillDef 로 변환하지 않으면 tier=undefined → NaN 좌표가 된다.
    try {
      const [treeResp, ownedResp] = await Promise.all([
        this.net.get<{ tree?: Record<string, ServerSkill[]> }>(`/api/skills/tree/${this.classId}`),
        this.net.get<{ skills: ServerPlayerSkill[] }>(`/api/skills/${this.characterId}`),
      ]);
      const t = treeResp?.tree ?? {};
      const allTree = [...(t.tier1 ?? []), ...(t.tier2 ?? []), ...(t.tier3 ?? []), ...(t.tier4 ?? [])];
      const owned = new Map(
        (ownedResp?.skills ?? []).filter((ps) => ps.skill).map((ps) => [ps.skill!.code, ps]),
      );
      const mapped: SkillDef[] = allTree.map((s) => {
        const ps = owned.get(s.code);
        return {
          id: s.code, // 서버 unlock/levelup 의 skillCode = code, 브랜치/콤보 lookup 도 code 키
          name: s.name,
          description: s.description,
          icon: s.icon ?? '✨',
          manaCost: s.mpCost,
          cooldownMs: (s.cooldown ?? 0) * 1000, // 서버 cooldown 단위 = 초
          maxLevel: s.maxLevel,
          currentLevel: ps?.level ?? 0,
          unlocked: !!ps,
          unlockLevel: s.requiredLevel,
          tier: s.tier,
          classId: s.class,
          type: s.type,
          effect: (s.effect ?? null) as SkillDef['effect'],
        };
      });
      // 트리 데이터가 비면(미시드 등) 클래스 기본 트리로 fallback.
      this.skills = mapped.length > 0 ? mapped : [...DEFAULT_SKILLS[this.classId]];
    } catch {
      this.skills = [...DEFAULT_SKILLS[this.classId]];
    }
    this._setSkillTreeTitle();
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

    this._addSkillTreeFrame(this.container, cx, cy, pw, ph, SKILL_TREE_UI_FRAME_TEXTURES.mainPanel, 0x4a4a6a, 0x1a1a2e, 0.95);

    this.titleIconX = cx - pw / 2 + 30;
    this.titleIconY = cy - ph / 2 + 23;
    this.titleText = this.scene.add.text(cx - pw / 2 + 50, cy - ph / 2 + 12, '스킬 트리', {
      fontSize: '18px', color: '#e0e0ff', fontStyle: 'bold',
    });
    this.container.add(this.titleText);
    this._setSkillTreeTitle();

    this.pointsText = this.scene.add.text(cx + pw / 2 - 180, cy - ph / 2 + 14, '스킬 포인트: 0', {
      fontSize: '13px', color: '#ffcc00',
    });
    this.container.add(this.pointsText);

    this.treeContainer = this.scene.add.container(cx - pw / 2 + 40, cy - ph / 2 + 60);
    this.container.add(this.treeContainer);

    const hasCloseActionIcon = this._hasSkillTreeCloseActionIcon();
    const closeBtn = this._addSkillTreeActionButton(
      this.container,
      cx + pw / 2 - 28,
      cy - ph / 2 + 18,
      34,
      30,
      hasCloseActionIcon ? '' : 'x',
      '#ff8b8b',
      '#ffd6d6',
      () => this.close(),
      'skill_tree_close_action_button',
      'main',
    );
    this.container.add(closeBtn);
    this._addSkillTreeCloseActionIcon(
      this.container,
      cx + pw / 2 - 28,
      cy - ph / 2 + 18,
      () => this.close(),
      'skill_tree_close_action_icon',
      'main',
    );

    // 스킬 리셋(respec) — 전 스킬 삭제 + 골드 차감(서버 권위). 2-press 확인.
    const resetActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_RESET_ACTION_ICON_ID);
    const hasResetActionIcon = resetActionIconResource !== undefined && this.scene.textures.exists(resetActionIconResource.key);
    this.resetBtn = this._addSkillTreeActionButton(
      this.container,
      cx,
      cy + ph / 2 - 22,
      142,
      34,
      hasResetActionIcon ? '스킬 리셋' : '🔄 스킬 리셋',
      '#ffaa66',
      '#ffe1a6',
      () => this._onResetButton(),
      'skill_tree_reset_action_button',
      'main',
      hasResetActionIcon ? 12 : 0,
    );
    if (resetActionIconResource && hasResetActionIcon) {
      this.resetActionIcon = this.scene.add.image(cx - 48, cy + ph / 2 - 22, resetActionIconResource.key)
        .setName('skill_tree_reset_action_icon')
        .setInteractive({ useHandCursor: true });
      this.resetActionIcon.setDisplaySize(18, 18);
      this.resetActionIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.resetActionIcon.on('pointerdown', () => this._onResetButton());
      this.container.add(this.resetActionIcon);
    } else {
      this.resetActionIconFallbackRendered = true;
    }
    this.container.add(this.resetBtn);
  }

  // ── 스킬 리셋(respec) ────────────────────────────────────
  private _onResetButton(): void {
    if (!this._resetArmed) {
      this._resetArmed = true;
      this._setResetButtonLabel('confirm');
      return;
    }
    void this._doReset();
  }

  private async _doReset(): Promise<void> {
    this._resetArmed = false;
    this._setResetButtonLabel('ready');
    try {
      // characterLevel/currentGold 는 서버가 무시(DB 권위값 사용)하나 라우트가 존재를 요구한다.
      await this.net.post('/api/skills/reset', { characterLevel: this.characterLevel, currentGold: 0 });
      playSfx(this.scene, UI_SFX.CONFIRM);
      // 리셋 후 보유 스킬·포인트 재조회
      await this._loadSkills();
      try {
        const pts = await this.net.get<{ remainingPoints?: number }>(`/api/skills/points/${this.characterId}?characterLevel=${this.characterLevel}`);
        if (typeof pts?.remainingPoints === 'number') this.skillPoints = pts.remainingPoints;
      } catch { /* 유지 */ }
      this.pointsText.setText(`스킬 포인트: ${this.skillPoints}`);
      this._renderTree();
    } catch (e) {
      console.error('[SkillTreeUI] reset failed', e);
      this._setResetButtonLabel('failed');
    }
  }

  private _setResetButtonLabel(state: 'ready' | 'confirm' | 'failed'): void {
    const hasIcon = this.resetActionIcon !== null;
    const labelByState: Record<typeof state, string> = {
      ready: hasIcon ? '스킬 리셋' : '🔄 스킬 리셋',
      confirm: hasIcon ? '정말 리셋? (다시 선택)' : '⚠ 정말 리셋? (다시 선택)',
      failed: hasIcon ? '리셋 실패' : '🔄 리셋 실패',
    };
    const colorByState: Record<typeof state, string> = {
      ready: '#ffaa66',
      confirm: '#ff5555',
      failed: '#ff5555',
    };
    this.resetBtn.setText(labelByState[state]).setColor(colorByState[state]);
  }

  // ── 내부: 트리 렌더 ──────────────────────────────────────

  private _renderTree(): void {
    this.treeContainer.removeAll(true);
    this._skillNodes = [];
    this.skillTreeNodeIcons = [];
    this.fallbackSkillNodeIconIds = [];
    this.advancedIllustrationImages = [];
    this.fallbackAdvancedIllustrationIds = [];

    const nodeSize = 60;
    const gapY = 80;
    const centerX = 210;

    const advancedIllustrationResources = getSkillTreeAdvancedIllustrationResources(this.classId);
    for (const resource of advancedIllustrationResources) {
      const x = centerX + (resource.advancement - 2) * 80;
      if (this.scene.textures.exists(resource.key)) {
        const advImg = this.scene.add.image(x, -20, resource.key)
          .setName(`skill_tree_advanced_illustration_${this.classId}_${resource.advancement}`)
          .setDisplaySize(SKILL_TREE_ADVANCED_ILLUSTRATION_SIZE.width, SKILL_TREE_ADVANCED_ILLUSTRATION_SIZE.height)
          .setAlpha(0.7);
        advImg.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.advancedIllustrationImages.push(advImg);
        const advLabel = this.scene.add.text(x, 20, `${resource.advancement}차 전직`, {
          fontSize: '8px', color: '#aaaacc',
        }).setOrigin(0.5);
        this.treeContainer.add([advImg, advLabel]);
      } else {
        this.fallbackAdvancedIllustrationIds.push(`${this.classId}_adv${resource.advancement}`);
      }
    }

    // 티어별 연결선
    for (let tier = 1; tier <= 4; tier++) {
      const line = this.scene.add.rectangle(centerX, tier * gapY + nodeSize / 2 + 10, 2, gapY - nodeSize, 0x3a3a5e);
      this.treeContainer.add(line);
    }

    // 스킬 노드 — 같은 tier 에 여러 스킬(분기)이 있으면 가로로 분산해 겹침 방지.
    this.skills.forEach((skill) => {
      const tierSkills = this.skills.filter((s) => s.tier === skill.tier);
      const within = tierSkills.indexOf(skill);
      const x = centerX + (within - (tierSkills.length - 1) / 2) * (nodeSize + 14);
      const y = skill.tier * gapY;
      const canUnlock = this.characterLevel >= skill.unlockLevel;
      const bgColor = skill.unlocked ? CLASS_COLORS[this.classId] : (canUnlock ? 0x3a3a5e : 0x1a1a2e);
      const alpha = skill.unlocked ? 1.0 : (canUnlock ? 0.7 : 0.3);

      const nodeBg = this.scene.add.rectangle(x, y, nodeSize, nodeSize, bgColor, alpha)
        .setStrokeStyle(2, skill.unlocked ? 0xffffff : 0x4a4a6a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          playSfx(this.scene, UI_SFX.CLICK);
          this._showSkillDetail(skill);
        });

      const skillIconId = getSkillTreeIconId(skill.classId, skill.tier, skill.icon);
      const iconResource = skillIconId ? getSpriteResourceForSkillIcon(skillIconId) : undefined;
      let icon: Phaser.GameObjects.Image | Phaser.GameObjects.Text;
      if (iconResource && this.scene.textures.exists(iconResource.key)) {
        icon = this.scene.add.image(x, y - 2, iconResource.key)
          .setName(`skill_tree_node_icon_${skill.id}`)
          .setDisplaySize(nodeSize - 12, nodeSize - 12)
          .setOrigin(0.5)
          .setAlpha(alpha);
        icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
        this.skillTreeNodeIcons.push(icon);
      } else {
        this.fallbackSkillNodeIconIds.push(skill.id);
        // Aseprite skill tree node icon 로드 실패 시에만 사용하는 안전 fallback.
        icon = this.scene.add.text(x, y - 6, skill.icon, {
          fontSize: '22px',
        })
          .setName(`skill_tree_node_icon_fallback_${skill.id}`)
          .setOrigin(0.5)
          .setAlpha(alpha);
      }

      const label = this.scene.add.text(x, y + 18, `Lv.${skill.currentLevel}/${skill.maxLevel}`, {
        fontSize: '9px', color: '#cccccc',
      }).setOrigin(0.5).setAlpha(alpha);

      const nameT = this.scene.add.text(x, y + 30, skill.name, {
        fontSize: '10px', color: '#aaaacc',
      }).setOrigin(0.5).setAlpha(alpha);

      this.treeContainer.add([nodeBg, icon, label, nameT]);
      this._skillNodes.push({ bg: nodeBg, skill });
    });

    // 동적 재생성된 노드를 링에 반영(detail 미열림 시).
    if (this.focusRing && !this.detailPanel) this._syncMainRing();
  }

  // ── 내부: 스킬 상세 ──────────────────────────────────────

  private _showSkillDetail(skill: SkillDef): void {
    // detail 진입 전 메인 링 포커스 위치 저장(키보드·마우스 모두 해당 스킬 노드 인덱스로).
    const nodeIdx = this._skillNodes.findIndex((n) => n.skill === skill);
    if (nodeIdx >= 0) this._mainRingIndex = nodeIdx;
    this._closeDetail();

    const cx = this.scene.scale.width / 2 + 260;
    const cy = this.scene.scale.height / 2;
    const pw = 220;
    const ph = 280;

    this.detailPanel = this.scene.add.container(0, 0).setDepth(910);

    this._addSkillTreeFrame(this.detailPanel, cx, cy, pw, ph, SKILL_TREE_UI_FRAME_TEXTURES.detailPanel, CLASS_COLORS[this.classId], 0x1a1a2e, 0.98);

    let y = cy - ph / 2 + 16;
    const line = (text: string, color = '#e0e0ff', size = '12px') => {
      const t = this.scene.add.text(cx - pw / 2 + 14, y, text, {
        fontSize: size, color, wordWrap: { width: pw - 28 },
      });
      this.detailPanel!.add(t);
      y += parseInt(size) + 6;
    };

    line(skill.name, '#ffffff', '15px');
    line(`Lv.${skill.currentLevel} / ${skill.maxLevel}`, '#aaaacc');
    line(skill.description, '#cccccc', '11px');
    line(`마나: ${skill.manaCost}`, '#5599ff');
    line(`쿨다운: ${(skill.cooldownMs / 1000).toFixed(1)}초`, '#aaaacc');
    line(`해금 레벨: ${skill.unlockLevel}`, '#88cc88');

    // P55-S4: 패시브 효과 표시
    if (skill.type === 'passive' && skill.effect && typeof skill.effect.value === 'number') {
      const lvl = Math.max(1, skill.currentLevel || 1);
      const fmt = formatPassiveEffect(skill.effect.type, skill.effect.value, lvl);
      line(`패시브: ${fmt.text}`, STATUS_COLOR[fmt.status], '11px');
    }

    // D-S3: 분기 그룹 표시 (있으면)
    const branchGroup = getBranchGroupClient(skill.id);
    if (branchGroup) {
      this._addSkillTreeDetailIconLine(
        this.detailPanel,
        SKILL_TREE_BRANCH_DETAIL_ICON_ID,
        'skill_tree_branch_detail_icon',
        'branch',
        `분기: ${formatBranchLabel(branchGroup)}`,
        cx - pw / 2 + 14,
        y,
        '#ff8855',
        '11px',
        pw - 28,
      );
      y += 17;
      const siblings = getBranchSiblingsClient(skill.id);
      // 같은 그룹 다른 skill 중 이미 unlock 된 게 있으면 lock 경고
      const lockedSibling = siblings.find((sk) =>
        this.skills.some((s) => s.id === sk && s.unlocked)
      );
      if (lockedSibling) {
        this._addSkillTreeDetailIconLine(
          this.detailPanel,
          SKILL_TREE_LOCKED_DETAIL_ICON_ID,
          'skill_tree_locked_detail_icon',
          'locked',
          `잠김: ${lockedSibling} 이미 해금`,
          cx - pw / 2 + 14,
          y,
          '#ff5555',
          '10px',
          pw - 28,
          8,
        );
        y += 16;
      } else {
        line(`  대안: ${siblings.join(', ')}`, '#bb6655', '10px');
      }
    }

    // E-S3: 이 스킬을 사용하는 콤보 목록 (있으면)
    const combos = getCombosUsingSkill(skill.id);
    if (combos.length > 0) {
      line(`콤보 (${combos.length}):`, '#ffaa44', '11px');
      for (const combo of combos.slice(0, 3)) {
        line(`  • ${combo.name} (+${combo.damageBonus}%)`, '#ffcc88', '10px');
      }
      if (combos.length > 3) {
        line(`  ... 외 ${combos.length - 3}개`, '#aa8866', '10px');
      }
    }

    // 업그레이드 버튼
    const canUpgrade = skill.unlocked && skill.currentLevel < skill.maxLevel && this.skillPoints > 0;
    const canUnlock = !skill.unlocked && this.characterLevel >= skill.unlockLevel && this.skillPoints > 0;

    const detailItems: Array<{ target: Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle }; activate: () => void; label: string }> = [];

    if (canUpgrade || canUnlock) {
      const label = canUnlock ? '[ 해금 ]' : '[ 업그레이드 ]';
      const btn = this._addSkillTreeActionButton(
        this.detailPanel,
        cx,
        cy + ph / 2 - 40,
        128,
        34,
        label,
        '#66dd66',
        '#b8ffb8',
        () => this._upgradeSkill(skill),
        'skill_tree_upgrade_action_button',
        'detail',
      );
      this.detailPanel.add(btn);
      detailItems.push({ target: btn, activate: () => void this._upgradeSkill(skill), label: canUnlock ? '해금' : '업그레이드' });
    }

    const hasCloseActionIcon = this._hasSkillTreeCloseActionIcon();
    const closeBtn = this._addSkillTreeActionButton(
      this.detailPanel,
      cx + pw / 2 - 20,
      cy - ph / 2 + 18,
      30,
      28,
      hasCloseActionIcon ? '' : 'x',
      '#ff8b8b',
      '#ffd6d6',
      () => this._closeDetail(),
      'skill_tree_detail_close_action_button',
      'detail',
    );
    this.detailPanel.add(closeBtn);
    const detailCloseIcon = this._addSkillTreeCloseActionIcon(
      this.detailPanel,
      cx + pw / 2 - 20,
      cy - ph / 2 + 18,
      () => this._closeDetail(),
      'skill_tree_detail_close_action_icon',
      'detail',
    );
    detailItems.push({ target: detailCloseIcon ?? closeBtn, activate: () => this._closeDetail(), label: '상세 닫기' });

    this.container.add(this.detailPanel);

    // 키보드: detail 동안 링을 업그레이드/닫기로 전환.
    this.focusRing?.setItems(detailItems);
  }

  private async _upgradeSkill(skill: SkillDef): Promise<void> {
    try {
      // 해금(아직 미보유)과 레벨업(보유 중)은 서버 엔드포인트가 다르다.
      if (!skill.unlocked) {
        // POST /api/skills/unlock { userId, skillCode, characterLevel, characterClass }
        await this.net.post('/api/skills/unlock', {
          userId: this.characterId,
          skillCode: skill.id,
          characterLevel: this.characterLevel,
          characterClass: this.classId,
        });
        skill.unlocked = true;
        skill.currentLevel = Math.max(1, skill.currentLevel);
      } else {
        // POST /api/skills/levelup { userId, skillCode, characterLevel }
        await this.net.post('/api/skills/levelup', {
          userId: this.characterId,
          skillCode: skill.id,
          characterLevel: this.characterLevel,
        });
        skill.currentLevel++;
      }
      this.skillPoints--;
      this.pointsText.setText(`스킬 포인트: ${this.skillPoints}`);
      playSfx(this.scene, UI_SFX.LEVEL_UP);
      this._renderTree();
      this._closeDetail();
    } catch (e) {
      console.error('[SkillTreeUI] upgrade failed', e);
    }
  }

  private _closeDetail(): void {
    if (this.detailPanel) { this.detailPanel.destroy(); this.detailPanel = null; }
    this.detailPanelFrame = null;
    this.skillTreeActionButtonFrames = this.skillTreeActionButtonFrames.filter((frame) => frame.active);
    this.closeActionIcons = this.closeActionIcons.filter((icon) => icon.active);
    this.detailLineIcons = this.detailLineIcons.filter((icon) => icon.active);
    this.detailLineIconFallbackIds = [];
    this.expectedDetailLineIconCount = 0;
    this.expectedDetailLineIconKeys = [];
    // detail 닫히면 메인(스킬 노드) 링으로 복귀 — 진입 전 포커스 위치 복원.
    if (this.visible) this._syncMainRing(this._mainRingIndex);
    this._writeSkillTreeFrameQaProbe('ready');
  }

  private _addSkillTreeFrame(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof SKILL_TREE_UI_FRAME_TEXTURES[keyof typeof SKILL_TREE_UI_FRAME_TEXTURES],
    strokeColor: number,
    fallbackColor: number,
    fallbackAlpha: number,
  ): void {
    if (this.scene.textures.exists(texture.key)) {
      const frame = this.scene.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(0.94);
      if (texture.key === SKILL_TREE_UI_FRAME_TEXTURES.mainPanel.key) {
        this.mainPanelFrame = frame;
      }
      if (texture.key === SKILL_TREE_UI_FRAME_TEXTURES.detailPanel.key) {
        this.detailPanelFrame = frame;
      }
      const stroke = this.scene.add.rectangle(x, y, width, height, 0x000000, 0)
        .setStrokeStyle(2, strokeColor);
      container.add([frame, stroke]);
      return;
    }

    // Aseprite skill tree UI frame 로드 실패 시에만 사용하는 안전 fallback.
    container.add(this.scene.add.rectangle(x, y, width, height, fallbackColor, fallbackAlpha)
      .setStrokeStyle(2, strokeColor));
  }

  private _addSkillTreeActionButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: string,
    hoverColor: string,
    onClick: () => void,
    name: string,
    frameScope: 'main' | 'detail',
    labelOffsetX = 0,
  ): Phaser.GameObjects.Text {
    const texture = SKILL_TREE_UI_FRAME_TEXTURES.actionButton;
    let frame: Phaser.GameObjects.Image | null = null;
    let fallback: Phaser.GameObjects.Rectangle | null = null;

    if (this.scene.textures.exists(texture.key)) {
      frame = this.scene.add.image(x, y, texture.key)
        .setName(`${name}_frame`)
        .setDisplaySize(width, height)
        .setAlpha(frameScope === 'main' ? 0.84 : 0.88)
        .setInteractive({ useHandCursor: true });
      this.skillTreeActionButtonFrames.push(frame);
      container.add(frame);
    } else {
      // Aseprite skill tree action button frame 로드 실패 시에만 사용하는 안전 fallback.
      fallback = this.scene.add.rectangle(x, y, width, height, 0x2a2a4e, 0.86)
        .setName(`${name}_fallback_frame`)
        .setStrokeStyle(1, 0x5b6f9f, 0.75)
        .setInteractive({ useHandCursor: true });
      container.add(fallback);
    }

    const text = this.scene.add.text(x + labelOffsetX, y, label, {
      fontSize: width <= 40 ? '15px' : '13px',
      color,
      fontStyle: 'bold',
      stroke: '#09111e',
      strokeThickness: 2,
    })
      .setName(`${name}_label`)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const setHoverState = (isHover: boolean): void => {
      text.setColor(isHover ? hoverColor : color);
      if (frame) {
        if (isHover) {
          frame.setTint(frameScope === 'detail' ? 0xd6ffd6 : 0xffe3b8);
        } else {
          frame.clearTint();
        }
      }
      if (fallback) {
        fallback.setFillStyle(isHover ? 0x34456b : 0x2a2a4e, isHover ? 0.96 : 0.86);
      }
    };

    frame?.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));
    fallback?.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));
    text.on('pointerdown', onClick)
      .on('pointerover', () => setHoverState(true))
      .on('pointerout', () => setHoverState(false));

    return text;
  }

  private _hasSkillTreeCloseActionIcon(): boolean {
    const closeActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_CLOSE_ACTION_ICON_ID);
    return closeActionIconResource !== undefined && this.scene.textures.exists(closeActionIconResource.key);
  }

  private _addSkillTreeCloseActionIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    onClick: () => void,
    name: string,
    fallbackId: string,
  ): Phaser.GameObjects.Image | null {
    const closeActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_CLOSE_ACTION_ICON_ID);
    if (closeActionIconResource && this.scene.textures.exists(closeActionIconResource.key)) {
      const icon = this.scene.add.image(x, y, closeActionIconResource.key)
        .setName(name)
        .setDisplaySize(16, 16)
        .setInteractive({ useHandCursor: true });
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      icon.on('pointerdown', onClick)
        .on('pointerover', () => icon.setTint(0xffe3b8))
        .on('pointerout', () => icon.clearTint());
      this.closeActionIcons.push(icon);
      container.add(icon);
      return icon;
    }

    if (!this.closeActionIconFallbackIds.includes(fallbackId)) {
      this.closeActionIconFallbackIds.push(fallbackId);
    }
    return null;
  }

  private _addSkillTreeDetailIconLine(
    container: Phaser.GameObjects.Container,
    iconId: string,
    iconName: 'skill_tree_branch_detail_icon' | 'skill_tree_locked_detail_icon',
    fallbackId: string,
    text: string,
    x: number,
    y: number,
    color: string,
    size: string,
    wordWrapWidth: number,
    indentX = 0,
  ): Phaser.GameObjects.Text {
    const detailIconResource = getSpriteResourceForSkillIcon(iconId);
    this.expectedDetailLineIconCount += 1;
    if (detailIconResource) {
      this.expectedDetailLineIconKeys.push(detailIconResource.key);
    }

    const fontSize = Number.parseInt(size, 10);
    const iconX = x + indentX + 7;
    const iconY = y + Math.max(7, fontSize / 2);
    if (detailIconResource && this.scene.textures.exists(detailIconResource.key)) {
      let icon: Phaser.GameObjects.Image;
      if (iconName === 'skill_tree_branch_detail_icon') {
        icon = this.scene.add.image(iconX, iconY, detailIconResource.key)
          .setName('skill_tree_branch_detail_icon')
          .setDisplaySize(14, 14);
      } else {
        icon = this.scene.add.image(iconX, iconY, detailIconResource.key)
          .setName('skill_tree_locked_detail_icon')
          .setDisplaySize(14, 14);
      }
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.detailLineIcons.push(icon);
      container.add(icon);
    } else {
      const fallback = this.scene.add.text(iconX, iconY, fallbackId === 'locked' ? 'x' : '>', {
        fontSize: '11px',
        color,
        fontStyle: 'bold',
        stroke: '#09111e',
        strokeThickness: 2,
      })
        .setName(`${iconName}_fallback`)
        .setOrigin(0.5);
      this.detailLineIconFallbackIds.push(fallbackId);
      container.add(fallback);
    }

    const lineText = this.scene.add.text(x + indentX + 22, y, text, {
      fontSize: size,
      color,
      wordWrap: { width: wordWrapWidth - indentX - 22 },
    });
    container.add(lineText);
    return lineText;
  }

  private _isSkillTreeFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;

    return new URLSearchParams(window.location.search).get('skillTreeQa') === '1';
  }

  private _writeSkillTreeFrameQaProbe(status: 'ready' | 'hidden'): void {
    if (!this._isSkillTreeFrameQaRoute() || typeof document === 'undefined') return;

    const activeActionFrames = this.skillTreeActionButtonFrames.filter((frame) => frame.active);
    const activeSkillNodeIcons = this.skillTreeNodeIcons.filter((icon) => icon.active);
    const activeTitleIcon = this.titleIcon?.active === true ? this.titleIcon : null;
    const activeCloseActionIcons = this.closeActionIcons.filter((icon) => icon.active);
    const activeDetailLineIcons = this.detailLineIcons.filter((icon) => icon.active);
    const activeAdvancedIllustrations = this.advancedIllustrationImages.filter((icon) => icon.active);
    const expectedAdvancedIllustrationKeys = getSkillTreeAdvancedIllustrationResources(this.classId)
      .map((resource) => resource.key);
    const titleIconId = getSkillTreeIconId(this.classId, SKILL_TREE_TITLE_ICON_TIER);
    const titleIconResource = titleIconId ? getSpriteResourceForSkillIcon(titleIconId) : undefined;
    const missingTitleIconKeys = titleIconResource && !activeTitleIcon
      ? [titleIconResource.key]
      : [];
    const resetActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_RESET_ACTION_ICON_ID);
    const activeResetActionIcon = this.resetActionIcon?.active === true ? this.resetActionIcon : null;
    const missingResetActionIconKeys = resetActionIconResource && !activeResetActionIcon
      ? [resetActionIconResource.key]
      : [];
    const closeActionIconResource = getSpriteResourceForSkillIcon(SKILL_TREE_CLOSE_ACTION_ICON_ID);
    const expectedDetailPanelCount = this.detailPanel ? SKILL_TREE_EXPECTED_DETAIL_PANEL_FRAME_COUNT : 0;
    const renderedDetailActionButtonCount = this.detailPanel
      ? activeActionFrames.filter((frame) => frame.parentContainer === this.detailPanel).length
      : 0;
    const mainActionButtonRenderedCount = activeActionFrames.filter((frame) => frame.parentContainer === this.container).length;
    const expectedActionButtonCount = SKILL_TREE_EXPECTED_MAIN_ACTION_BUTTON_FRAME_COUNT + renderedDetailActionButtonCount;
    const expectedCloseActionIconCount = 1 + (this.detailPanel ? 1 : 0);
    const missingCloseActionIconKeys = closeActionIconResource && activeCloseActionIcons.length < expectedCloseActionIconCount
      ? [closeActionIconResource.key]
      : [];
    const expectedSkillNodeIconCount = Math.min(SKILL_TREE_EXPECTED_NODE_ICON_COUNT, this.skills.length);
    const expectedSkillNodeIconKeys = this.skills.slice(0, expectedSkillNodeIconCount)
      .map((skill) => {
        const skillIconId = getSkillTreeIconId(skill.classId, skill.tier, skill.icon);
        return skillIconId ? getSpriteResourceForSkillIcon(skillIconId)?.key : undefined;
      })
      .filter((key): key is string => typeof key === 'string');
    const missingFrameKeys = Object.values(SKILL_TREE_UI_FRAME_TEXTURES)
      .filter((texture) => !this.scene.textures.exists(texture.key))
      .map((texture) => texture.key);
    const missingSkillNodeIconKeys = expectedSkillNodeIconKeys
      .filter((key) => !this.scene.textures.exists(key));
    const missingDetailLineIconKeys = this.expectedDetailLineIconKeys
      .filter((key) => !this.scene.textures.exists(key) || !activeDetailLineIcons.some((icon) => icon.texture.key === key));
    const missingAdvancedIllustrationKeys = expectedAdvancedIllustrationKeys
      .filter((key) => !this.scene.textures.exists(key) || !activeAdvancedIllustrations.some((icon) => icon.texture.key === key));
    const effectiveStatus = status === 'ready'
      && (
        missingFrameKeys.length > 0
        || missingAdvancedIllustrationKeys.length > 0
        || missingTitleIconKeys.length > 0
        || missingSkillNodeIconKeys.length > 0
        || missingResetActionIconKeys.length > 0
        || missingCloseActionIconKeys.length > 0
        || missingDetailLineIconKeys.length > 0
        || this.titleIconFallback?.active === true
        || this.resetActionIconFallbackRendered
        || this.closeActionIconFallbackIds.length > 0
        || this.detailLineIconFallbackIds.length > 0
        || this.fallbackAdvancedIllustrationIds.length > 0
        || this.fallbackSkillNodeIconIds.length > 0
        || activeAdvancedIllustrations.length < SKILL_TREE_ADVANCED_ILLUSTRATION_COUNT
        || activeSkillNodeIcons.length < expectedSkillNodeIconCount
        || activeCloseActionIcons.length < expectedCloseActionIconCount
        || activeDetailLineIcons.length < this.expectedDetailLineIconCount
      )
      ? 'missing-frame'
      : status;

    document.body.dataset.aeternaSkillTreeFrameQa = JSON.stringify({
      status: effectiveStatus,
      active: this.visible,
      classId: this.classId,
      skillCount: this.skills.length,
      currentDetailOpen: this.detailPanel !== null,
      advancedIllustration: {
        renderedCount: activeAdvancedIllustrations.length,
        expectedCount: SKILL_TREE_ADVANCED_ILLUSTRATION_COUNT,
        expectedKeys: expectedAdvancedIllustrationKeys,
        renderedKeys: activeAdvancedIllustrations.map((icon) => icon.texture.key),
        displaySizes: activeAdvancedIllustrations.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
          visible: icon.visible,
        })),
        fallbackAdvancedIllustrationIds: this.fallbackAdvancedIllustrationIds,
        missingIllustrationKeys: missingAdvancedIllustrationKeys,
      },
      mainPanelFrame: {
        key: SKILL_TREE_UI_FRAME_TEXTURES.mainPanel.key,
        path: SKILL_TREE_UI_FRAME_TEXTURES.mainPanel.path,
        renderedCount: this.mainPanelFrame?.active ? 1 : 0,
        expectedCount: SKILL_TREE_EXPECTED_MAIN_PANEL_FRAME_COUNT,
        displayWidth: this.mainPanelFrame?.displayWidth ?? 0,
        displayHeight: this.mainPanelFrame?.displayHeight ?? 0,
      },
      detailPanelFrame: {
        key: SKILL_TREE_UI_FRAME_TEXTURES.detailPanel.key,
        path: SKILL_TREE_UI_FRAME_TEXTURES.detailPanel.path,
        renderedCount: this.detailPanelFrame?.active ? 1 : 0,
        expectedCount: expectedDetailPanelCount,
        displayWidth: this.detailPanelFrame?.displayWidth ?? 0,
        displayHeight: this.detailPanelFrame?.displayHeight ?? 0,
      },
      actionButtonFrame: {
        key: SKILL_TREE_UI_FRAME_TEXTURES.actionButton.key,
        path: SKILL_TREE_UI_FRAME_TEXTURES.actionButton.path,
        renderedCount: activeActionFrames.length,
        expectedCount: expectedActionButtonCount,
        expectedMainCount: SKILL_TREE_EXPECTED_MAIN_ACTION_BUTTON_FRAME_COUNT,
        renderedMainCount: mainActionButtonRenderedCount,
        renderedDetailCount: renderedDetailActionButtonCount,
        displaySizes: activeActionFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      titleIcon: {
        iconId: titleIconId ?? null,
        key: titleIconResource?.key ?? null,
        path: titleIconResource?.path ?? null,
        renderedCount: activeTitleIcon ? 1 : 0,
        expectedCount: titleIconResource ? 1 : 0,
        displayWidth: activeTitleIcon?.displayWidth ?? 0,
        displayHeight: activeTitleIcon?.displayHeight ?? 0,
        visible: activeTitleIcon?.visible ?? false,
        fallbackTitleIconRendered: this.titleIconFallback?.active === true,
        missingIconKeys: missingTitleIconKeys,
      },
      skillNodeIcon: {
        renderedCount: activeSkillNodeIcons.length,
        expectedCount: Math.min(SKILL_TREE_EXPECTED_NODE_ICON_COUNT, this.skills.length),
        expectedKeys: expectedSkillNodeIconKeys,
        renderedKeys: activeSkillNodeIcons.map((icon) => icon.texture.key),
        fallbackSkillNodeIconIds: this.fallbackSkillNodeIconIds,
        displaySizes: activeSkillNodeIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
          visible: icon.visible,
        })),
      },
      resetActionIcon: {
        iconId: SKILL_TREE_RESET_ACTION_ICON_ID,
        key: resetActionIconResource?.key ?? null,
        path: resetActionIconResource?.path ?? null,
        renderedCount: activeResetActionIcon ? 1 : 0,
        expectedCount: 1,
        displayWidth: activeResetActionIcon?.displayWidth ?? 0,
        displayHeight: activeResetActionIcon?.displayHeight ?? 0,
        visible: activeResetActionIcon?.visible ?? false,
        fallbackRendered: this.resetActionIconFallbackRendered,
        missingIconKeys: missingResetActionIconKeys,
      },
      closeActionIcon: {
        iconId: SKILL_TREE_CLOSE_ACTION_ICON_ID,
        key: closeActionIconResource?.key ?? null,
        path: closeActionIconResource?.path ?? null,
        renderedCount: activeCloseActionIcons.length,
        expectedCount: expectedCloseActionIconCount,
        displaySizes: activeCloseActionIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
          visible: icon.visible,
        })),
        fallbackCloseActionIconIds: this.closeActionIconFallbackIds,
        missingIconKeys: missingCloseActionIconKeys,
      },
      detailLineIcon: {
        renderedCount: activeDetailLineIcons.length,
        expectedCount: this.expectedDetailLineIconCount,
        expectedKeys: this.expectedDetailLineIconKeys,
        renderedKeys: activeDetailLineIcons.map((icon) => icon.texture.key),
        displaySizes: activeDetailLineIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
          visible: icon.visible,
        })),
        fallbackDetailLineIconIds: this.detailLineIconFallbackIds,
        missingIconKeys: missingDetailLineIconKeys,
      },
      missingFrameKeys,
      missingAdvancedIllustrationKeys,
      missingTitleIconKeys,
      missingSkillNodeIconKeys,
      missingCloseActionIconKeys,
      missingDetailLineIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  destroy(): void { this._closeDetail(); this.container.destroy(); }
}
