/**
 * SceneManager.ts — 씬 전환 관리 시스템 (P5-18)
 *
 * 기능:
 * - 씬 전환 (페이드 인/아웃 트랜지션)
 * - 씬 스택 (push/pop 기반 내비게이션)
 * - 씬 간 데이터 전달
 */

// ── 타입 정의 ──────────────────────────────────────────────

/** 씬 전환 옵션 */
export interface TransitionOptions {
  /** 페이드 아웃 지속 시간 ms (기본: 500) */
  fadeOutDuration?: number;
  /** 페이드 인 지속 시간 ms (기본: 500) */
  fadeInDuration?: number;
  /** 페이드 색상 (기본: 0x000000) */
  fadeColor?: number;
  /** 전환 시 전달할 데이터 */
  data?: Record<string, unknown>;
  /** 이전 씬 유지 여부 (기본: false → stop) */
  keepPrevious?: boolean;
}

/** 씬 스택 엔트리 */
interface SceneStackEntry {
  key: string;
  data?: Record<string, unknown>;
}

// ── SceneManager 클래스 ─────────────────────────────────────

export class SceneManager {
  private sceneStack: SceneStackEntry[] = [];
  private isTransitioning = false;
  public game: Phaser.Game | null = null;

  /**
   * 초기화
   * @param game Phaser.Game 인스턴스
   */
  initialize(game: Phaser.Game): void {
    this.game = game;
    console.info('[SceneManager] 초기화 완료');
  }

  /**
   * 씬 전환 (교체)
   * 현재 씬을 종료하고 새 씬을 시작한다.
   *
   * @param fromScene 현재 씬 인스턴스
   * @param targetKey 전환할 씬 키
   * @param options 전환 옵션
   */
  async changeTo(
    fromScene: Phaser.Scene,
    targetKey: string,
    options: TransitionOptions = {},
  ): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const {
      fadeOutDuration = 500,
      fadeInDuration = 500,
      fadeColor = 0x000000,
      data,
      keepPrevious = false,
    } = options;

    try {
      // 페이드 아웃
      await this._fadeOut(fromScene, fadeOutDuration, fadeColor);

      // 스택 업데이트
      this.sceneStack = [{ key: targetKey, data }];

      // 이전 씬 정리
      if (!keepPrevious) {
        fromScene.scene.stop();
      } else {
        fromScene.scene.sleep();
      }

      // 새 씬 시작 + 페이드 인
      fromScene.scene.start(targetKey, { ...data, _fadeInDuration: fadeInDuration, _fadeColor: fadeColor });
    } catch (err) {
      console.error('[SceneManager] 씬 전환 오류:', err);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * 씬 푸시 (스택에 추가, 이전 씬은 sleep)
   * 설정 화면, 인벤토리 팝업 등에 사용.
   *
   * @param fromScene 현재 씬 인스턴스
   * @param targetKey 추가할 씬 키
   * @param options 전환 옵션
   */
  async pushScene(
    fromScene: Phaser.Scene,
    targetKey: string,
    options: TransitionOptions = {},
  ): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    const { fadeOutDuration = 300, fadeInDuration = 300, fadeColor = 0x000000, data } = options;

    try {
      await this._fadeOut(fromScene, fadeOutDuration, fadeColor);

      // 현재 씬을 스택에 보존
      this.sceneStack.push({ key: targetKey, data });
      fromScene.scene.sleep();

      // 새 씬 시작
      fromScene.scene.start(targetKey, { ...data, _fadeInDuration: fadeInDuration, _fadeColor: fadeColor });
    } catch (err) {
      console.error('[SceneManager] 씬 push 오류:', err);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * 씬 팝 (스택에서 제거, 이전 씬 wake)
   *
   * @param currentScene 현재 씬 인스턴스
   * @param returnData 이전 씬에 전달할 데이터
   */
  async popScene(
    currentScene: Phaser.Scene,
    returnData?: Record<string, unknown>,
  ): Promise<void> {
    if (this.isTransitioning) return;
    if (this.sceneStack.length <= 1) {
      console.warn('[SceneManager] 스택이 비어 있어 pop 불가');
      return;
    }

    this.isTransitioning = true;

    try {
      await this._fadeOut(currentScene, 300, 0x000000);

      // 현재 씬 제거
      this.sceneStack.pop();
      currentScene.scene.stop();

      // 이전 씬 복구
      const previous = this.sceneStack[this.sceneStack.length - 1];
      if (previous) {
        currentScene.scene.wake(previous.key, { _returnData: returnData });
      }
    } catch (err) {
      console.error('[SceneManager] 씬 pop 오류:', err);
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * 현재 씬 스택 조회 (디버그용)
   */
  getStack(): ReadonlyArray<SceneStackEntry> {
    return [...this.sceneStack];
  }

  /**
   * 전환 중 여부
   */
  get transitioning(): boolean {
    return this.isTransitioning;
  }

  /**
   * 씬에서 페이드 인 실행 (씬의 create()에서 호출)
   */
  static fadeIn(scene: Phaser.Scene, duration = 500, color = 0x000000): void {
    const cam = scene.cameras.main;
    cam.setAlpha(0);
    scene.tweens.add({
      targets: cam,
      alpha: 1,
      duration,
      ease: 'Power2',
    });

    // 컬러 오버레이 페이드
    cam.fadeIn(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }

  // ── private ──

  /** 페이드 아웃 (Promise) */
  private _fadeOut(scene: Phaser.Scene, duration: number, color: number): Promise<void> {
    return new Promise<void>(resolve => {
      const cam = scene.cameras.main;
      cam.fadeOut(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        resolve();
      });

      // 타임아웃 보호 (카메라 이벤트 미발생 대비)
      setTimeout(() => resolve(), duration + 100);
    });
  }
}

// ── 싱글턴 인스턴스 ─────────────────────────────────────────

/** 전역 SceneManager 인스턴스 */
export const sceneManager = new SceneManager();

export default sceneManager;
