import 'phaser';
import { MainMenuScene } from './scenes/MainMenuScene';
import { LoadingScene } from './scenes/LoadingScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';
import { LobbyScene, type LobbySceneData } from './scenes/LobbyScene';
import { WorldScene } from './scenes/WorldScene';
import { GameScene } from './scenes/GameScene';
import { BattleScene } from './scenes/BattleScene';
import { DungeonScene } from './scenes/DungeonScene';
import { EndingScene, type EndingSceneData, type EndingType } from './scenes/EndingScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ChatUiQaScene } from './scenes/ChatUiQaScene';
import { ComboUiQaScene } from './scenes/ComboUiQaScene';
import { CutsceneScene } from './scenes/CutsceneScene';
import { DialogueBoxQaScene } from './scenes/DialogueBoxQaScene';
import { MinimapQaScene } from './scenes/MinimapQaScene';
import { MinimapOverlayQaScene } from './scenes/MinimapOverlayQaScene';
import { NavigationArrowQaScene } from './scenes/NavigationArrowQaScene';
import { TutorialFlowQaScene } from './scenes/TutorialFlowQaScene';
import { TutorialManagerQaScene } from './scenes/TutorialManagerQaScene';
import { TransitionLoadingQaScene } from './scenes/TransitionLoadingQaScene';
import { CoachmarkQaScene } from './scenes/CoachmarkQaScene';
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
        LoadingScene,
        CharacterSelectScene,
        LobbyScene,
        WorldScene,
        GameScene,
        BattleScene,
        DungeonScene,
        EndingScene,
        SettingsScene,
        ChatUiQaScene,
        ComboUiQaScene,
        CutsceneScene,
        DialogueBoxQaScene,
        MinimapQaScene,
        MinimapOverlayQaScene,
        NavigationArrowQaScene,
        TutorialFlowQaScene,
        TutorialManagerQaScene,
        TransitionLoadingQaScene,
        CoachmarkQaScene,
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

    if (debugScene === 'loading') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('LoadingScene', {
            nextScene: 'MainMenuScene',
            zoneId,
            qaHold: true,
        });
        return;
    }

    if (debugScene === 'settings') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('SettingsScene', { frameQa: true });
        return;
    }

    if (debugScene === 'lobby') {
        if (params.get('skillTreeQa') === '1') {
            installSkillTreeFrameQaPreloads(params);
        }

        const itemIconQaParam = params.get('itemIconQa');
        const lobbyData: LobbySceneData = {
            characterId: params.get('characterId') ?? 'debug-chrono-hero',
            characterName: params.get('name') ?? '크로노 테스터',
            characterClass: params.get('class') ?? 'time_knight',
            className: params.get('className') ?? '시간 기사',
            baseStats: { hp: 420, mp: 120, atk: 34, def: 22 },
            level: parseDebugLevel(params.get('level')),
            offlineQa: true,
            openSkillTreeQa: params.get('skillTreeQa') === '1',
            itemIconQa: itemIconQaParam === 'shop' || itemIconQaParam === 'inventory' ? itemIconQaParam : undefined,
            dialogueTitleIconQa: params.get('dialogueTitleIconQa') === '1',
            dialogueChoiceButtonFrameQa: params.get('dialogueChoiceButtonFrameQa') === '1',
            dialogueChoiceFocusIconQa: params.get('dialogueChoiceFocusIconQa') === '1',
            lobbyNavFocusIconQa: params.get('lobbyNavFocusIconQa') === '1',
            inventoryTitleIconQa: params.get('inventoryTitleIconQa') === '1',
            inventoryActionFocusIconQa: params.get('inventoryActionFocusIconQa') === '1',
            partyRecruitIconQa: params.get('partyRecruitIconQa') === '1',
            partyActionFocusIconQa: params.get('partyActionFocusIconQa') === '1',
            shopTitleIconQa: params.get('shopTitleIconQa') === '1',
            shopActionFocusIconQa: params.get('shopActionFocusIconQa') === '1',
            enhanceTitleIconQa: params.get('enhanceTitleIconQa') === '1',
            enhanceActionFocusIconQa: params.get('enhanceActionFocusIconQa') === '1',
            storyTitleIconQa: params.get('storyTitleIconQa') === '1',
            storyActionFocusIconQa: params.get('storyActionFocusIconQa') === '1',
            questTitleIconQa: params.get('questTitleIconQa') === '1',
            questActionFocusIconQa: params.get('questActionFocusIconQa') === '1',
            goldIconQa: params.get('goldIconQa') === '1',
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

    if (debugScene === 'game') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('GameScene', {
            zoneId,
            zoneName: params.get('zoneName') ?? '에테르 평원',
            eraId,
            characterId: params.get('characterId') ?? 'debug-chrono-hero',
            characterName: params.get('name') ?? '크로노 테스터',
            characterClass,
            className: params.get('className') ?? '디버그 클래스',
            baseStats: { hp: 420, mp: 120, atk: 34, def: 22 },
            offlineQa: true,
            hudFrameQa: params.get('hudFrameQa') === '1',
            zoneTeleportFrameQa: params.get('zoneTeleportFrameQa') === '1',
            envObjectQa: params.get('envObjectQa') === '1',
            bossLabelIconQa: params.get('bossLabelIconQa') === '1',
            zoneLabelIconQa: params.get('zoneLabelIconQa') === '1',
            gameErrorIconQa: params.get('gameErrorIconQa') === '1',
        });
        return;
    }

    if (debugScene === 'dungeon') {
        const dungeonFrameQaParam = params.get('dungeonFrameQa');
        const dungeonFrameQa = dungeonFrameQaParam === 'ready' || dungeonFrameQaParam === 'clear' || dungeonFrameQaParam === 'boss'
            ? dungeonFrameQaParam
            : undefined;
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('DungeonScene', {
            characterId: params.get('characterId') ?? 'debug-chrono-hero',
            characterName: params.get('name') ?? '크로노 테스터',
            characterClass,
            className: params.get('className') ?? '디버그 클래스',
            baseStats: { hp: 420, mp: 120, atk: 34, def: 22 },
            dungeonFrameQa,
        });
        return;
    }

    if (debugScene === 'ending') {
        const endingTypes: readonly EndingType[] = [
            'DIVINE_RETURN',
            'BETRAYAL',
            'TRUE_GUARDIAN',
            'LAST_WITNESS',
            'DEFEAT',
        ];
        const endingTypeParam = params.get('endingType') as EndingType | null;
        const endingType = endingTypeParam && endingTypes.includes(endingTypeParam)
            ? endingTypeParam
            : 'TRUE_GUARDIAN';
        const playthrough = Number(params.get('playthrough') ?? '1');
        const endingData: EndingSceneData = {
            endingType,
            endingName: params.get('endingName') ?? '시간의 수호자',
            endingDescription: params.get('endingDescription') ?? '시간의 균열을 봉인하고 세계의 평화를 지켜냈다.',
            playthrough: Number.isFinite(playthrough) && playthrough >= 1 ? Math.min(99, Math.floor(playthrough)) : 1,
            frameQa: params.get('endingFrameQa') === '1',
        };
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('EndingScene', endingData);
        return;
    }

    if (debugScene === 'characterSelect') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('CharacterSelectScene', {
            offlineQa: true,
            offlineExistingQa: params.get('characterSelectExistingQa') === '1',
        });
        return;
    }

    if (debugScene === 'cutscene') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('CutsceneScene', {
            id: 'debug-cutscene-frame',
            title: '컷씬 프레임 QA',
            background: '__debug_missing_cutscene_bg',
            bgm: '',
            characters: [],
            dialogue: [
                {
                    speaker: '내레이터',
                    text: 'Aseprite HUD frame이 하단 대화 박스에 먼저 렌더되는지 확인합니다.',
                    delay: 999999,
                },
            ],
            returnScene: 'MainMenuScene',
        });
        return;
    }

    if (debugScene === 'minimapOverlay') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('MinimapOverlayQaScene');
        return;
    }

    if (debugScene === 'navigationArrow') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('NavigationArrowQaScene');
        return;
    }

    if (debugScene === 'minimap') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('MinimapQaScene');
        return;
    }

    if (debugScene === 'dialogueBox') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('DialogueBoxQaScene');
        return;
    }

    if (debugScene === 'chat') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('ChatUiQaScene');
        return;
    }

    if (debugScene === 'combo') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('ComboUiQaScene');
        return;
    }

    if (debugScene === 'tutorialFlow') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('TutorialFlowQaScene');
        return;
    }

    if (debugScene === 'tutorialManager') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('TutorialManagerQaScene');
        return;
    }

    if (debugScene === 'transitionLoading') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('TransitionLoadingQaScene');
        return;
    }

    if (debugScene === 'coachmark') {
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('CoachmarkQaScene');
        return;
    }

    if (debugScene === 'feedback') {
        const env = (import.meta as { env?: Record<string, string> }).env;
        phaserGame.scene.stop('MainMenuScene');
        phaserGame.scene.start('FeedbackForm', {
            apiUrl: env?.VITE_API_URL ?? 'http://localhost:3000',
            userId: params.get('userId') ?? 'debug-feedback-user',
            gameVersion: env?.VITE_GAME_VERSION ?? '1.0.0',
            frameQa: true,
        });
        return;
    }

    if (debugScene === 'battle') {
        const battleResultFrameQaParam = params.get('battleResultFrameQa');
        const battleResultFrameQa = battleResultFrameQaParam === 'victory' || battleResultFrameQaParam === 'defeat'
            ? battleResultFrameQaParam
            : undefined;
        const battleResultLeadQaParam = params.get('battleResultLeadQa');
        const battleResultLeadQa = battleResultLeadQaParam === 'victory' || battleResultLeadQaParam === 'defeat'
            ? battleResultLeadQaParam
            : undefined;
        const battleSubMenuFocusIconQaParam = params.get('battleSubMenuFocusIconQa');
        const battleChainLabelIconQaParam = params.get('battleChainLabelIconQa');
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
            battleResultFrameQa,
            battleResultLeadQa,
            battlePaceFrameQa: params.get('battlePaceFrameQa') === '1',
            battleComboTechFrameQa: params.get('battleComboTechFrameQa') === '1',
            battleAmbientLineQa: params.get('battleAmbientLineQa') === '1',
            battleIntroIconQa: params.get('battleIntroIconQa') === '1',
            battleCommandFocusIconQa: params.get('battleCommandFocusIconQa') === '1',
            battleComboPopupIconQa: params.get('battleComboPopupIconQa') === '1',
            battleEchoPopupIconQa: params.get('battleEchoPopupIconQa') === '1',
            battleReflectPopupIconQa: params.get('battleReflectPopupIconQa') === '1',
            battleCriticalPopupIconQa: params.get('battleCriticalPopupIconQa') === '1',
            battleChainLabelIconQa: battleChainLabelIconQaParam === 'chain' || battleChainLabelIconQaParam === 'max'
                ? battleChainLabelIconQaParam
                : undefined,
            battleSubMenuFocusIconQa: battleSubMenuFocusIconQaParam === 'magic' || battleSubMenuFocusIconQaParam === 'item'
                ? battleSubMenuFocusIconQaParam
                : undefined,
        });
    }
}

function installSkillTreeFrameQaPreloads(params: URLSearchParams): void {
    if (typeof document === 'undefined') {
        return;
    }

    const qaRun = params.get('qaRun');
    const cacheBuster = qaRun ? `skillTreeQa=1&qaRun=${encodeURIComponent(qaRun)}` : 'skillTreeQa=1';
    const frames = [
        {
            id: 'skill-tree-main-panel',
            path: 'assets/generated/ui/frames/UI-SET-002-DEF.png',
            probe: 'main',
        },
        {
            id: 'skill-tree-detail-panel',
            path: 'assets/generated/ui/frames/UI-SET-003-DEF.png',
            probe: 'detail',
        },
        {
            id: 'skill-tree-action-button',
            path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
            probe: 'action',
        },
    ] as const;

    for (const frame of frames) {
        const href = `/${frame.path}?${cacheBuster}&preload=${frame.probe}`;
        if (document.head.querySelector(`link[data-qa-asset="${frame.id}"][href="${href}"]`)) {
            continue;
        }

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = href;
        link.dataset.qaAsset = frame.id;
        document.head.appendChild(link);
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
