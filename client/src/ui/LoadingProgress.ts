// ── 로딩 진행률 트래커 ──────────────────────────────────────
// HTML 로딩 화면의 퍼센트 표시를 업데이트하고, 완료 시 페이드아웃 처리

export class LoadingProgress {
    private progressEl: HTMLElement | null;
    private screenEl: HTMLElement | null;
    private currentPercent = 0;

    constructor() {
        this.progressEl = document.getElementById('loading-progress');
        this.screenEl = document.getElementById('loading-screen');
    }

    /** 에셋 로딩 퍼센트 업데이트 (0–100) */
    update(percent: number): void {
        this.currentPercent = Math.min(100, Math.max(0, Math.round(percent)));
        if (this.progressEl) {
            this.progressEl.textContent = `${this.currentPercent}%`;
        }
    }

    /** Phaser 씬의 preload()에서 로더 이벤트에 바인딩 */
    bindToLoader(loader: Phaser.Loader.LoaderPlugin): void {
        loader.on('progress', (value: number) => {
            this.update(value * 100);
        });
        loader.on('complete', () => {
            this.complete();
        });
    }

    /** 로딩 완료 — 페이드아웃 후 DOM에서 제거 */
    complete(): void {
        this.update(100);
        if (!this.screenEl) return;

        const screenEl = this.screenEl;
        let removed = false;
        const removeScreen = () => {
            if (removed) return;
            removed = true;
            screenEl.remove();
            if (this.screenEl === screenEl) {
                this.screenEl = null;
                this.progressEl = null;
            }
        };

        screenEl.classList.add('fade-out');
        screenEl.addEventListener('transitionend', removeScreen, { once: true });
        window.setTimeout(removeScreen, 700);
    }
}

/** 싱글턴 인스턴스 */
export const loadingProgress = new LoadingProgress();
