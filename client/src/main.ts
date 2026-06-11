import 'phaser';
import { MainMenuScene } from './scenes/MainMenuScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LobbyScene, type LobbySceneData } from './scenes/LobbyScene';
import { WorldScene } from './scenes/WorldScene';
import { GameScene } from './scenes/GameScene';
import { BattleScene } from './scenes/BattleScene';
import { DungeonScene } from './scenes/DungeonScene';
import { EndingScene } from './scenes/EndingScene';
import { SettingsScene } from './scenes/SettingsScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { FeedbackForm } from './ui/FeedbackForm';
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
import { loadingProgress } from './ui/LoadingProgress';
import {
    detectAndApply,
    attachContextLossHandler,
    logCapabilities,
    getRendererOverride,
    choosePhaserRenderer,
} from './utils/RendererDetector';
import type { ChronoEraId } from './time/ChronoTimeline';

declare global {
    interface Window {
        __aeternaGame?: Phaser.Game;
        render_game_to_text?: () => string;
        advanceTime?: (ms: number) => Promise<void> | void;
    }
}

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
// 렌더러 타입: 명시적 ?renderer=canvas 일 때만 Canvas 강제. 그 외에는 Phaser.AUTO 가
// 실제 게임 캔버스에서 WebGL 가용성을 직접 검사하도록 위임한다.
// (detectWebGL 의 throwaway-canvas probe 가 일부 브라우저에서 false-negative 를 내
//  Canvas 모드로 떨어뜨리면, Safari 2D 캔버스 메모리 고갈 → CanvasTexture.draw null
//  context drawImage 크래시가 났다. AUTO 는 실제 캔버스 기준이라 이를 회피한다.)
const phaserRendererType =
    choosePhaserRenderer(getRendererOverride()) === 'canvas-forced'
        ? Phaser.CANVAS
        : Phaser.AUTO;

const config: Phaser.Types.Core.GameConfig = {
    type: phaserRendererType,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#16213E',
    // FINDING-M1 fix: pixelArt 게임 명시 + NVIDIA NV_path_rendering 회피
    // antialias=false 강제 → strokePath 의 GL_CLOSE_PATH_NV stall 감소.
    // powerPreference='high-performance' → 외장 GPU 강제(노트북 dGPU/iGPU 분기).
    render: {
        antialias: false,
        antialiasGL: false,
        pixelArt: true,
        roundPixels: true,
        powerPreference: 'high-performance',
        batchSize: 4096,
    },
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
        FeedbackForm, // 오버레이 sub-scene — SettingsScene 에서 launch
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
window.__aeternaGame = game;

// 글로벌 시스템 초기화
sceneManager.initialize(game);
errorBoundary.initialize(game);

// WebGL 컨텍스트 손실 → 사용자 안내 + 폴백 모드
game.events.once(Phaser.Core.Events.READY, () => {
    const canvas = game.canvas;
    accessibilityManager.init(canvas instanceof HTMLCanvasElement ? canvas : undefined);

    // Phaser.AUTO 가 실제로 고른 렌더러로 body[data-renderer]/[data-compat-mode] 동기화.
    // detectWebGL 의 사전 추정과 Phaser 의 실제 선택이 어긋날 수 있으므로(특히 probe
    // false-negative), CSS 호환 시트가 잘못된 폴백을 켜지 않도록 실측값으로 바로잡는다.
    const actualRenderer: 'canvas' | 'webgl' =
        game.renderer && game.renderer.type === Phaser.CANVAS ? 'canvas' : 'webgl';
    if (typeof document !== 'undefined' && document.body) {
        document.body.setAttribute('data-renderer', actualRenderer);
        if (actualRenderer === 'webgl' && caps.compatMode === 'canvas') {
            // 사전엔 canvas 폴백으로 판단했으나 실제로 WebGL 을 쓰게 됐다 → 호환 모드 해제.
            document.body.setAttribute('data-compat-mode', 'normal');
        }
    }

    // FINDING-A4 fix part 1: WCAG 2.1.1 Keyboard — 캔버스 키보드 focus 가능하게.
    // Phaser 기본 tabIndex=-1 이라 Tab/Arrow/Enter 가 캔버스에 도달 못 함.
    if (canvas instanceof HTMLCanvasElement) {
        canvas.tabIndex = 0;
        canvas.focus();
    }

    // FINDING-A4 fix part 3: WCAG 2.4.7 Focus Visible — focus-visible ring 스타일 주입 + Tab 순환 핸들러.
    // FocusManager singleton 이 정의돼 있었으나 init() wiring 누락 상태.
    focusManager.init();

    if (canvas instanceof HTMLCanvasElement && actualRenderer === 'webgl') {
        attachContextLossHandler(canvas);
    }

    if (shouldInstallA11yProbeBridge()) {
        installA11yProbeBridge(
            createA11yProbeBridgeFromAriaMaps(getAllAriaMaps(), ARIA_CONTRACT_VERSION),
        );
    }

    installGameTestHooks(game);
    startDebugSceneIfRequested(game);
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

function installGameTestHooks(phaserGame: Phaser.Game): void {
    window.render_game_to_text = () => {
        const activeScenes = phaserGame.scene.getScenes(true).map((scene) => scene.scene.key);
        return JSON.stringify({
            coordinateSystem: 'canvas origin top-left, x right, y down',
            activeScenes,
            canvas: {
                width: phaserGame.canvas?.width ?? 0,
                height: phaserGame.canvas?.height ?? 0,
            },
            url: typeof window !== 'undefined' ? window.location.href : '',
        });
    };

    if (typeof window.advanceTime !== 'function') {
        window.advanceTime = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
    }
}

function startDebugSceneIfRequested(phaserGame: Phaser.Game): void {
    const meta = import.meta as { env?: { DEV?: boolean } };
    if (!meta.env?.DEV || typeof window === 'undefined') {
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const debugScene = params.get('debugScene');
    if (!debugScene) {
        return;
    }

    loadingProgress.complete();

    const eraId = parseChronoEraId(params.get('era') ?? 'present');
    const zoneId = params.get('zone') ?? 'aether_plains';
    const characterClass = params.get('class')?.trim() || 'ether_knight';

    if (debugScene === 'lobby') {
        const lobbyData: LobbySceneData = {
            characterId: params.get('characterId') ?? 'debug-chrono-hero',
            characterName: params.get('name') ?? '크로노 테스터',
            characterClass: params.get('class') ?? 'time_knight',
            className: params.get('className') ?? '시간 기사',
            baseStats: { hp: 420, mp: 120, atk: 34, def: 22 },
            level: parseDebugLevel(params.get('level')),
            offlineQa: true,
        };
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('LobbyScene', lobbyData);
        return;
    }

    if (debugScene === 'world') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('WorldScene', { eraId, characterClass });
        return;
    }

    if (debugScene === 'battle') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('BattleScene', {
            zoneId,
            eraId,
            monsterId: 'debug_chrono_wraith',
            monsterName: eraId === 'ruined_future' ? '붕괴미래 시간 망령' : '시간 망령',
            characterClass,
            enemyHpMultiplier: eraId === 'ruined_future' ? 1.25 : 1,
            enemyAttackSpeedMultiplier: eraId === 'ruined_future' ? 1.15 : 1,
            rewardMultiplier: eraId === 'ruined_future' ? 1.25 : 1,
            offlineQa: true,
        });
    }
}

function parseChronoEraId(value: string): ChronoEraId {
    if (value === 'ancient' || value === 'present' || value === 'ruined_future') {
        return value;
    }
    return 'present';
}

function parseDebugLevel(value: string | null): number {
    const parsed = Number(value ?? '12');
    if (!Number.isFinite(parsed) || parsed < 1) {
        return 12;
    }
    return Math.min(99, Math.floor(parsed));
}
