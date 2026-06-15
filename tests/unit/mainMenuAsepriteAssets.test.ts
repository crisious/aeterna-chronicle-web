import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  environmentBackgroundId?: string;
  environmentParticleTextureId?: string;
  uiFrameId?: string;
}

interface RuntimeAssetSpec {
  id: string;
  category: string;
  runtimePng: string;
  runtimeKey: string;
  width: number;
  height: number;
  rosterField: 'environmentBackgroundId' | 'environmentParticleTextureId' | 'uiFrameId';
}

const MAIN_MENU_BACKGROUND_SPECS: RuntimeAssetSpec[] = [
  {
    id: 'ERB-BG-SKY-DUSK',
    category: 'environmentBackground',
    runtimePng: 'client/public/assets/generated/environment/backgrounds/ERB-BG-SKY-DUSK.png',
    runtimeKey: 'env_bg_ERB_BG_SKY_DUSK',
    width: 1280,
    height: 720,
    rosterField: 'environmentBackgroundId',
  },
  {
    id: 'ERB-BG-MID-DUSK',
    category: 'environmentBackground',
    runtimePng: 'client/public/assets/generated/environment/backgrounds/ERB-BG-MID-DUSK.png',
    runtimeKey: 'env_bg_ERB_BG_MID_DUSK',
    width: 1280,
    height: 720,
    rosterField: 'environmentBackgroundId',
  },
];

const MAIN_MENU_PARTICLE_SPEC: RuntimeAssetSpec = {
  id: 'particle_ether_beam',
  category: 'environmentParticleEtherBeamTexture',
  runtimePng: 'client/public/assets/generated/vfx/particles/particle_ether_beam.png',
  runtimeKey: 'particle_ether_beam',
  width: 6,
  height: 16,
  rosterField: 'environmentParticleTextureId',
};

const MAIN_MENU_UI_FRAME_SPECS: RuntimeAssetSpec[] = [
  {
    id: 'UI-SET-001-DEF',
    category: 'uiFrame',
    runtimePng: 'client/public/assets/generated/ui/frames/UI-SET-001-DEF.png',
    runtimeKey: 'ui_frame_UI-SET-001-DEF',
    width: 512,
    height: 512,
    rosterField: 'uiFrameId',
  },
  {
    id: 'UI-HUD-005-DEF',
    category: 'uiFrame',
    runtimePng: 'client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png',
    runtimeKey: 'ui_frame_UI-HUD-005-DEF',
    width: 512,
    height: 512,
    rosterField: 'uiFrameId',
  },
  {
    id: 'UI-BTN-006-DEF',
    category: 'uiFrame',
    runtimePng: 'client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png',
    runtimeKey: 'ui_frame_UI-BTN-006-DEF',
    width: 512,
    height: 512,
    rosterField: 'uiFrameId',
  },
];

function readPngSize(filePath: string): { w: number; h: number } {
  const buffer = readFileSync(filePath);

  return {
    w: buffer.readUInt32BE(16),
    h: buffer.readUInt32BE(20),
  };
}

function readSpriteRoster(): SpriteRosterItem[] {
  const rosterPath = resolve(process.cwd(), 'assets/source/aseprite/sprite-production-roster.json');
  const roster = JSON.parse(readFileSync(rosterPath, 'utf8')) as { items: SpriteRosterItem[] };

  return roster.items;
}

function expectRosterEntry(roster: SpriteRosterItem[], spec: RuntimeAssetSpec): void {
  expect(
    roster.some((item) => (
      item.category === spec.category
      && item.runtimePng === spec.runtimePng
      && item.runtimeKey === spec.runtimeKey
      && item[spec.rosterField] === spec.id
    )),
    spec.id,
  ).toBe(true);
}

describe('MainMenuScene Aseprite runtime assets', () => {
  it('메인 메뉴 배경, 타이틀 입자, 모달/버튼 frame은 Aseprite 자산 우선 렌더 경로를 가진다', () => {
    const roster = readSpriteRoster();
    const mainMenuSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/MainMenuScene.ts'), 'utf8');

    for (const spec of [...MAIN_MENU_BACKGROUND_SPECS, MAIN_MENU_PARTICLE_SPEC, ...MAIN_MENU_UI_FRAME_SPECS]) {
      const diskPath = resolve(process.cwd(), spec.runtimePng);
      expect(existsSync(diskPath), spec.id).toBe(true);
      expect(readPngSize(diskPath), spec.id).toEqual({ w: spec.width, h: spec.height });
      expectRosterEntry(roster, spec);
    }

    expect(mainMenuSource).toContain('MAIN_MENU_BACKGROUND_TEXTURES');
    expect(mainMenuSource).toContain("path: 'assets/generated/environment/backgrounds/ERB-BG-SKY-DUSK.png'");
    expect(mainMenuSource).toContain("path: 'assets/generated/environment/backgrounds/ERB-BG-MID-DUSK.png'");
    expect(mainMenuSource).toContain('MAIN_MENU_AETHER_PARTICLE_TEXTURE = ENVIRONMENT_PARTICLE_TEXTURES.ether_beam');
    expect(mainMenuSource).toContain("import { getSpriteResourceForItemIcon, getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';");
    expect(mainMenuSource).toContain('_shouldSkipVisualPreloadForDebugRedirect');
    expect(mainMenuSource).toContain("debugScene !== null && debugScene !== 'mainMenu'");
    expect(mainMenuSource).toContain('this.load.image(texture.key, texture.path)');
    expect(mainMenuSource).toContain('this.load.image(MAIN_MENU_AETHER_PARTICLE_TEXTURE.key, MAIN_MENU_AETHER_PARTICLE_TEXTURE.path)');
    expect(mainMenuSource).toContain('const MAIN_MENU_BUTTON_ICON_SPECS = [');
    expect(mainMenuSource).toContain("{ kind: 'skill', iconId: 'skill_mw_arrow' }");
    expect(mainMenuSource).toContain("{ kind: 'skill', iconId: 'skill_tg_reverse' }");
    expect(mainMenuSource).toContain("{ kind: 'item', itemIconId: 'ITM-QST-004' }");
    expect(mainMenuSource).toContain("const MAIN_MENU_MODAL_CLOSE_ICON_ID = 'skill_tg_reverse'");
    expect(mainMenuSource).toContain('MAIN_MENU_EXPECTED_MENU_BUTTON_ICON_COUNT = 3');
    expect(mainMenuSource).toContain('MAIN_MENU_EXPECTED_MODAL_CLOSE_ICON_COUNT = 1');
    expect(mainMenuSource).toContain('this._resolveMenuButtonIconResource(index)');
    expect(mainMenuSource).toContain('this.load.image(iconResource.key, iconResource.path)');
    expect(mainMenuSource).toContain('const modalCloseIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_MODAL_CLOSE_ICON_ID)');
    expect(mainMenuSource).toContain('this.load.image(modalCloseIconResource.key, modalCloseIconResource.path)');
    expect(mainMenuSource).toContain('this.textures.exists(MAIN_MENU_BACKGROUND_TEXTURES.sky.key)');
    expect(mainMenuSource).toContain('this.add.image(width / 2, height / 2, MAIN_MENU_BACKGROUND_TEXTURES.sky.key)');
    expect(mainMenuSource).toContain('Aseprite title background 로드 실패 시에만 사용하는 안전 fallback');
    expect(mainMenuSource).toContain('this.add.image(x, y, particleTexture.key)');
    expect(mainMenuSource).toContain('setDisplaySize(size * 2, size * 5)');
    expect(mainMenuSource).toContain('Aseprite particle texture 로드 실패 시에만 사용하는 안전 fallback');
    expect(mainMenuSource).toContain('MAIN_MENU_UI_FRAME_TEXTURES');
    expect(mainMenuSource).toContain("key: 'ui_frame_UI-SET-001-DEF'");
    expect(mainMenuSource).toContain("path: 'assets/generated/ui/frames/UI-SET-001-DEF.png'");
    expect(mainMenuSource).toContain("key: 'ui_frame_UI-HUD-005-DEF'");
    expect(mainMenuSource).toContain("path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png'");
    expect(mainMenuSource).toContain("key: 'ui_frame_main_menu_button'");
    expect(mainMenuSource).toContain("path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png'");
    expect(mainMenuSource).toContain("key: 'ui_frame_main_menu_modal_button'");
    expect(mainMenuSource).toContain("path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png'");
    expect(mainMenuSource).toContain("key: 'ui_frame_main_menu_modal_input'");
    expect(mainMenuSource).toContain("path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png'");
    expect(mainMenuSource).toContain('MAIN_MENU_EXPECTED_MENU_BUTTON_FRAME_COUNT = 3');
    expect(mainMenuSource).toContain('MAIN_MENU_EXPECTED_LOGIN_BUTTON_FRAME_COUNT = 3');
    expect(mainMenuSource).toContain('MAIN_MENU_EXPECTED_CREDITS_BUTTON_FRAME_COUNT = 1');
    expect(mainMenuSource).toContain('MAIN_MENU_EXPECTED_LOGIN_INPUT_FRAME_COUNT = 2');
    expect(mainMenuSource).toContain('private menuButtonFrames: Phaser.GameObjects.Image[] = []');
    expect(mainMenuSource).toContain('private menuButtonIcons: Phaser.GameObjects.Image[] = []');
    expect(mainMenuSource).toContain('private menuButtonIconFallbackIndexes: number[] = []');
    expect(mainMenuSource).toContain('private modalButtonFrames: Phaser.GameObjects.Image[] = []');
    expect(mainMenuSource).toContain('private modalCloseIcons: Phaser.GameObjects.Image[] = []');
    expect(mainMenuSource).toContain('private fallbackModalCloseIconIds: string[] = []');
    expect(mainMenuSource).toContain('this._addMenuButtonFrame(width / 2, menuStartY + i * menuGap, i, def.action)');
    expect(mainMenuSource).toContain('this._addMenuButtonIcon(width / 2, menuStartY + i * menuGap, i, def.action)');
    expect(mainMenuSource).toContain("{ label: '설정',  action: () => this._onSettings() }");
    expect(mainMenuSource).toContain("{ label: '크레딧', action: () => this._onCredits() }");
    expect(mainMenuSource).toContain('setName(`main_menu_button_frame_${index}`)');
    expect(mainMenuSource).toContain('setName(`main_menu_button_icon_${index}`)');
    expect(mainMenuSource).toContain('setDisplaySize(260, 38)');
    expect(mainMenuSource).toContain('icon.setDisplaySize(20, 20)');
    expect(mainMenuSource).toContain('icon.setDisplaySize(16, 16)');
    expect(mainMenuSource).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(mainMenuSource).toContain('this.menuButtonIcons[index] = icon');
    expect(mainMenuSource).toContain('this.menuButtonIconFallbackIndexes.push(index)');
    expect(mainMenuSource).toContain('private _addMainMenuModalCloseIcon(');
    expect(mainMenuSource).toContain('this.add.image(x, y, modalCloseIconResource.key)');
    expect(mainMenuSource).toContain('setName(name)');
    expect(mainMenuSource).toContain('this.modalCloseIcons.push(icon)');
    expect(mainMenuSource).toContain('this.fallbackModalCloseIconIds.push(fallbackId)');
    expect(mainMenuSource).toContain('return this._hasMenuButtonIcon(i) ? label : (i === this.menuHighlightIndex ? `▶  ${label}` : `   ${label}`)');
    expect(mainMenuSource).toContain("this._addMainMenuModalButtonFrame(this.loginContainer, -60, 40, 112, 30, 'main_menu_login_button_frame'");
    expect(mainMenuSource).toContain("this._addMainMenuModalButtonFrame(this.loginContainer, 60, 40, 92, 30, 'main_menu_register_button_frame'");
    expect(mainMenuSource).toContain("this._addMainMenuModalButtonFrame(this.loginContainer, 160, -120, 34, 28, 'main_menu_login_close_button_frame'");
    expect(mainMenuSource).toContain("this._addMainMenuModalButtonFrame(container, 0, -100 + i * 28, 154, 30, 'main_menu_credits_close_button_frame'");
    expect(mainMenuSource).toContain("this._addMainMenuModalCloseIcon(this.loginContainer, 160, -120, closeAction, 'main_menu_login_close_icon', 'login')");
    expect(mainMenuSource).toContain("this._addMainMenuModalCloseIcon(container, -56, -100 + i * 28, closeCredits, 'main_menu_credits_close_icon', 'credits')");
    expect(mainMenuSource).toContain("const loginBtn = this.add.text(-60, 40, '로그인'");
    expect(mainMenuSource).toContain("const registerBtn = this.add.text(60, 40, '가입'");
    expect(mainMenuSource).not.toContain("this.add.text(160, -120, '✕'");
    expect(mainMenuSource).toContain('input.dataset.aeternaFrameKey = MAIN_MENU_UI_FRAME_TEXTURES.modalInput.key');
    expect(mainMenuSource).toContain('input.dataset.aeternaFramePath = MAIN_MENU_UI_FRAME_TEXTURES.modalInput.path');
    expect(mainMenuSource).toContain('background-image: url("/${MAIN_MENU_UI_FRAME_TEXTURES.modalInput.path}")');
    expect(mainMenuSource).toContain('background-size: 100% 100%');
    expect(mainMenuSource).toContain('this.menuButtonFrames.forEach((frame, i) =>');
    expect(mainMenuSource).toContain('this._syncMenuButtonFrames()');
    expect(mainMenuSource).toContain('document.body.dataset.aeternaMainMenuFrameQa = JSON.stringify');
    expect(mainMenuSource).toContain('expectedFrameCount: MAIN_MENU_EXPECTED_MENU_BUTTON_FRAME_COUNT');
    expect(mainMenuSource).toContain('menuButtonIcon: {');
    expect(mainMenuSource).toContain('expectedCount: MAIN_MENU_EXPECTED_MENU_BUTTON_ICON_COUNT');
    expect(mainMenuSource).toContain('fallbackIndexes: this.menuButtonIconFallbackIndexes');
    expect(mainMenuSource).toContain('missingMenuButtonIconKeys');
    expect(mainMenuSource).toContain('modalCloseIcon: {');
    expect(mainMenuSource).toContain('expectedCount: expectedModalCloseIconCount');
    expect(mainMenuSource).toContain('fallbackModalCloseIconIds: this.fallbackModalCloseIconIds');
    expect(mainMenuSource).toContain('missingModalCloseIconKeys');
    expect(mainMenuSource).toContain('activeMenuIndex: this.menuHighlightIndex');
    expect(mainMenuSource).toContain('activeModal');
    expect(mainMenuSource).toContain('modalButtonFrame');
    expect(mainMenuSource).toContain('modalInputFrame');
    expect(mainMenuSource).toContain('expectedCount: expectedModalButtonFrameCount');
    expect(mainMenuSource).toContain('expectedCount: expectedModalInputFrameCount');
    expect(mainMenuSource).toContain('cssBackgrounds: loginInputs.map((input) => input.style.backgroundImage)');
    expect(mainMenuSource).toContain('this.add.image(0, 0, loginFrame.key)');
    expect(mainMenuSource).toContain('setDisplaySize(360, 280)');
    expect(mainMenuSource).toContain('this.add.image(0, 0, creditsFrame.key)');
    expect(mainMenuSource).toContain('setDisplaySize(400, 300)');
    expect(mainMenuSource).toContain('Aseprite login UI frame 로드 실패 시에만 사용하는 안전 fallback');
    expect(mainMenuSource).toContain('Aseprite credits UI frame 로드 실패 시에만 사용하는 안전 fallback');
  });
});
