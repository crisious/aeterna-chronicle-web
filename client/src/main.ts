import 'phaser';
import { GameScene } from './scenes/GameScene';

// GDD Phase 1 스펙: 1280x720 픽셀 (최소 해상도), 탑다운 RPG.
const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#16213E', // UI 다크 블루 컬러를 배경으로 사용 (로딩 중)
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0, x: 0 }, // 탑다운 RPG이므로 중력 비활성화
            debug: false             // 배포 시에는 false 처리 (물리 콜라이더 표시)
        }
    },
    scene: [GameScene],
    pixelArt: true, // 픽셀 아트 스타일 적용을 위해 안티앨리어싱 제거 
};

// 게임 인스턴스 초기화
new Phaser.Game(config);
