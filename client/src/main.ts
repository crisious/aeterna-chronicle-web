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

// 게임 인스턴스 초기화
const game = new Phaser.Game(config);

// 글로벌 시스템 초기화
sceneManager.initialize(game);
errorBoundary.initialize(game);

// WebGL 컨텍스트 손실 → 사용자 안내 + 폴백 모드
game.events.once(Phaser.Core.Events.READY, () => {
    const canvas = game.canvas;
    accessibilityManager.init(canvas instanceof HTMLCanvasElement ? canvas : undefined);

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
