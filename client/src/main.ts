import 'phaser';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LobbyScene } from './scenes/LobbyScene';
import { WorldScene } from './scenes/WorldScene';
import { GameScene } from './scenes/GameScene';
import { BattleScene } from './scenes/BattleScene';
import { DungeonScene } from './scenes/DungeonScene';
import { EndingScene } from './scenes/EndingScene';
import { SettingsScene } from './scenes/SettingsScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { sceneManager } from './scenes/SceneManager';
import { errorBoundary } from './error/ErrorBoundary';
import { accessibilityManager } from './accessibility/AccessibilityManager';
import { focusManager } from './accessibility/screen_reader/FocusManager';
import { applyColorblindMode } from './scenes/SettingsScene';
import {
    createA11yProbeBridgeFromAriaMaps,
    installA11yProbeBridge,
} from './accessibility/A11yProbeBridge';
import {
    ARIA_CONTRACT_VERSION,
    getAllAriaMaps,
} from './accessibility/screen_reader/AriaLabelMap';
import {
    detectAndApply,
    attachContextLossHandler,
    logCapabilities,
} from './utils/RendererDetector';

// 크로스브라우저 호환성 검출 — Phaser 인스턴스 전 가장 먼저 실행
// body[data-renderer], [data-compat-mode] 부여 → CSS 폴백 활성화
const caps = detectAndApply();
// import.meta.env는 Vite 빌드 시 주입되며, 타입 누락 시에도 안전하게 동작
if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) logCapabilities(caps);

/**
 * 씬 등록 순서 (P5-18):
 * MainMenu → CharacterSelect → Lobby → World → Game → Battle → Dungeon → Ending
 *
 * GDD Phase 1 스펙: 1280x720 픽셀 (최소 해상도), 탑다운 RPG.
 */
// WebGL 미지원 시 Canvas2D 강제 — 크래시 방지
const phaserRendererType = caps.renderer === 'canvas' ? Phaser.CANVAS : Phaser.AUTO;

const config: Phaser.Types.Core.GameConfig = {
    type: phaserRendererType,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#16213E',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
        keyboard: true,
        mouse: true,
        touch: true,
    },
    dom: {
        createContainer: true,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 },
            debug: false,
        },
    },
    scene: [
        MainMenuScene,
        CharacterSelectScene,
        LobbyScene,
        WorldScene,
        GameScene,
        BattleScene,
        DungeonScene,
        EndingScene,
        SettingsScene,
        CutsceneScene,
    ],
    pixelArt: true,
};

// FINDING-A4 ext10: 부팅 시 localStorage 의 색약 모드 즉시 적용
// (SettingsScene 진입 전이라도 메인 메뉴부터 SVG 필터 작동)
try {
    const raw = localStorage.getItem('aeterna_settings');
    if (raw) {
        const parsed = JSON.parse(raw) as { colorblindMode?: string };
        applyColorblindMode(parsed.colorblindMode ?? 'off');
    }
} catch { /* localStorage 비활성/파싱 실패 무시 */ }

// 게임 인스턴스 초기화
const game = new Phaser.Game(config);

// 글로벌 시스템 초기화
sceneManager.initialize(game);
errorBoundary.initialize(game);

// WebGL 컨텍스트 손실 → 사용자 안내 + 폴백 모드
game.events.once(Phaser.Core.Events.READY, () => {
    const canvas = game.canvas;
    accessibilityManager.init(canvas instanceof HTMLCanvasElement ? canvas : undefined);

    // FINDING-A4 fix part 1: WCAG 2.1.1 Keyboard — 캔버스 키보드 focus 가능하게.
    // Phaser 기본 tabIndex=-1 이라 Tab/Arrow/Enter 가 캔버스에 도달 못 함.
    if (canvas instanceof HTMLCanvasElement) {
        canvas.tabIndex = 0;
        canvas.focus();
    }

    // FINDING-A4 fix part 3: WCAG 2.4.7 Focus Visible — focus-visible ring 스타일 주입 + Tab 순환 핸들러.
    // FocusManager singleton 이 정의돼 있었으나 init() wiring 누락 상태.
    focusManager.init();

    if (canvas instanceof HTMLCanvasElement && caps.renderer === 'webgl') {
        attachContextLossHandler(canvas);
    }

    if (shouldInstallA11yProbeBridge()) {
        installA11yProbeBridge(
            createA11yProbeBridgeFromAriaMaps(getAllAriaMaps(), ARIA_CONTRACT_VERSION),
        );
    }
});

function shouldInstallA11yProbeBridge(): boolean {
    const meta = import.meta as { env?: { DEV?: boolean } };
    if (meta.env?.DEV) {
        return true;
    }

    if (typeof window === 'undefined') {
        return false;
    }

    return new URLSearchParams(window.location.search).get('a11yAudit') === '1';
}
