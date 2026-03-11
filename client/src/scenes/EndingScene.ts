/**
 * EndingScene — 엔딩 타입별 텍스트 기반 연출 씬
 *
 * 서버에서 엔딩 판정 결과를 수신한 뒤
 * GameScene → EndingScene 으로 전환하여 해당 엔딩을 연출한다.
 *
 * 텍스트 기반 연출 (이미지 없음):
 *   - 배경색 그라데이션
 *   - 엔딩 타이틀 + 본문 페이드인
 *   - 에필로그 텍스트 순차 표시
 */

import * as Phaser from 'phaser';

// ── 엔딩 타입 (서버와 동일) ─────────────────────────────────
type EndingType =
  | 'DIVINE_RETURN'
  | 'BETRAYAL'
  | 'TRUE_GUARDIAN'
  | 'LAST_WITNESS'
  | 'DEFEAT';

// ── 엔딩 씬 데이터 (scene.start 시 전달) ───────────────────
export interface EndingSceneData {
  endingType: EndingType;
  endingName: string;
  endingDescription: string;
  playthrough: number;
}

// ── 엔딩별 연출 설정 ────────────────────────────────────────
interface EndingPresentation {
  bgColor: number;
  titleColor: string;
  bodyColor: string;
  epilogueLines: string[];
}

const ENDING_PRESENTATIONS: Record<EndingType, EndingPresentation> = {
  DIVINE_RETURN: {
    bgColor: 0x1a0a3e,
    titleColor: '#FFD700',
    bodyColor: '#E0D0FF',
    epilogueLines: [
      '열두 신의 이름이 하늘에 새겨진다.',
      '레테가 처음으로 미소짓는다.',
      '"기억된다는 것이… 이런 느낌이었구나."',
      '',
      '에리언은 신과 인간의 중재자가 되었다.',
      '에테르나 크로니클은 새로운 장을 연다.',
    ],
  },
  BETRAYAL: {
    bgColor: 0x2a0a0a,
    titleColor: '#FF4444',
    bodyColor: '#FFCCCC',
    epilogueLines: [
      '50년 후. 에테르나에 전쟁이 없다.',
      '분쟁도 없다.',
      '그러나 음악도, 예술도, 오래된 우정도 사라졌다.',
      '',
      '레이나가 홀로 기억을 지우지 않고 버텨낸다.',
      '"기억이 고통이더라도…"',
    ],
  },
  TRUE_GUARDIAN: {
    bgColor: 0x0a2a1a,
    titleColor: '#44FF88',
    bodyColor: '#D0FFE0',
    epilogueLines: [
      '에레보스에 새 식물이 자라기 시작한다.',
      '세라핀이 실반헤임에서 처음으로 웃는다.',
      '벤자민이 아내의 이름을 기억한다.',
      '이그나의 아버지 이그리스가 딸의 이름을 부른다.',
      '',
      '기억은 지켜졌다. 모두가 살아남았다.',
    ],
  },
  LAST_WITNESS: {
    bgColor: 0x0a1a2a,
    titleColor: '#4488FF',
    bodyColor: '#D0E0FF',
    epilogueLines: [
      '에리언은 기억을 잃었다.',
      '하지만 세계는 구원되었다.',
      '',
      '동료들은 에리언을 기억한다.',
      '에리언은 동료들을 기억하지 못한다.',
      '',
      '"기억해줘서… 고마워."',
    ],
  },
  DEFEAT: {
    bgColor: 0x0a0a0a,
    titleColor: '#888888',
    bodyColor: '#AAAAAA',
    epilogueLines: [
      '기억의 파도가 밀려왔다.',
      '에리언은 레테를 저지하지 못했다.',
      '',
      '세계는 망각의 안개에 잠겼다.',
      '아무것도 기억되지 않는 세계.',
    ],
  },
};

export class EndingScene extends Phaser.Scene {
  private endingData!: EndingSceneData;

  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data: EndingSceneData): void {
    this.endingData = data;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    const presentation = ENDING_PRESENTATIONS[this.endingData.endingType] ?? ENDING_PRESENTATIONS.DEFEAT;

    // ── 배경 ────────────────────────────────────────────────
    this.cameras.main.setBackgroundColor(presentation.bgColor);

    // ── 엔딩 타이틀 (페이드인) ──────────────────────────────
    const titleText = this.add.text(width / 2, height * 0.15, this.endingData.endingName, {
      fontSize: '48px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: presentation.titleColor,
      fontStyle: 'bold',
      align: 'center',
    });
    titleText.setOrigin(0.5);
    titleText.setAlpha(0);

    this.tweens.add({
      targets: titleText,
      alpha: 1,
      duration: 2000,
      ease: 'Power2',
    });

    // ── 엔딩 설명 (타이틀 이후 페이드인) ────────────────────
    const descText = this.add.text(width / 2, height * 0.28, this.endingData.endingDescription, {
      fontSize: '20px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: presentation.bodyColor,
      align: 'center',
      wordWrap: { width: width * 0.7 },
      lineSpacing: 8,
    });
    descText.setOrigin(0.5);
    descText.setAlpha(0);

    this.tweens.add({
      targets: descText,
      alpha: 1,
      duration: 1500,
      delay: 1500,
      ease: 'Power2',
    });

    // ── 에필로그 텍스트 순차 표시 ───────────────────────────
    const startY = height * 0.45;
    const lineHeight = 36;

    presentation.epilogueLines.forEach((line, i) => {
      const lineText = this.add.text(width / 2, startY + i * lineHeight, line, {
        fontSize: '18px',
        fontFamily: 'Noto Sans KR, sans-serif',
        color: presentation.bodyColor,
        align: 'center',
        wordWrap: { width: width * 0.65 },
      });
      lineText.setOrigin(0.5);
      lineText.setAlpha(0);

      this.tweens.add({
        targets: lineText,
        alpha: 1,
        duration: 1200,
        delay: 3000 + i * 800,
        ease: 'Power1',
      });
    });

    // ── 플레이스루 표시 ─────────────────────────────────────
    const playthroughText = this.add.text(
      width / 2,
      height * 0.92,
      `— Playthrough #${this.endingData.playthrough} —`,
      {
        fontSize: '14px',
        fontFamily: 'Noto Sans KR, sans-serif',
        color: '#666666',
        align: 'center',
      },
    );
    playthroughText.setOrigin(0.5);
    playthroughText.setAlpha(0);

    const totalEpilogueDelay = 3000 + presentation.epilogueLines.length * 800 + 1200;

    this.tweens.add({
      targets: playthroughText,
      alpha: 1,
      duration: 1000,
      delay: totalEpilogueDelay,
      ease: 'Power1',
    });

    // ── "아무 키나 누르면 타이틀로" 안내 ────────────────────
    const promptText = this.add.text(width / 2, height * 0.96, '아무 키나 누르면 타이틀로 돌아갑니다', {
      fontSize: '14px',
      fontFamily: 'Noto Sans KR, sans-serif',
      color: '#444444',
      align: 'center',
    });
    promptText.setOrigin(0.5);
    promptText.setAlpha(0);

    this.tweens.add({
      targets: promptText,
      alpha: { from: 0, to: 0.6 },
      duration: 800,
      delay: totalEpilogueDelay + 1500,
      ease: 'Power1',
      yoyo: true,
      repeat: -1,
      hold: 1500,
    });

    // ── 입력 대기 (에필로그 완료 후) ────────────────────────
    this.time.delayedCall(totalEpilogueDelay + 1500, () => {
      this.input.keyboard?.once('keydown', () => {
        this.returnToTitle();
      });
      this.input.once('pointerdown', () => {
        this.returnToTitle();
      });
    });
  }

  private returnToTitle(): void {
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      // GameScene 으로 복귀 (또는 별도 TitleScene 이 있으면 전환)
      this.scene.start('GameScene');
    });
  }
}
