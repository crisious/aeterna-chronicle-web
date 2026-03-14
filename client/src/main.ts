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

/**
 * 씬 등록 순서 (P5-18):
 * MainMenu → CharacterSelect → Lobby → World → Game → Battle → Dungeon → Ending
 *
 * GDD Phase 1 스펙: 1280x720 픽셀 (최소 해상도), 탑다운 RPG.
 */
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#16213E',
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
