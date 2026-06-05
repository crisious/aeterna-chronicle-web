/**
 * focusRingNav — 키보드 포커스 링의 인덱스 이동 계산 (순수 함수, Phaser/DOM 비의존).
 *
 * KeyboardFocusRing(Phaser 컨트롤러)의 이동 로직 핵심. 선형 리스트(메뉴)와 그리드(인벤토리 6×5)
 * 모두 지원한다. 순수 함수라 단위 테스트로 회귀를 박제하고, 컨트롤러는 이 위에 입력/하이라이트
 * 글루만 얹는다.
 */

export type FocusDirection = 'next' | 'prev' | 'up' | 'down' | 'left' | 'right';

export interface FocusNavOptions {
  /** 그리드 열 수. 1(기본)이면 선형 리스트로 동작(모든 방향 ±1). */
  columns?: number;
  /** 끝에서 반대편으로 순환할지. 기본 true. */
  wrap?: boolean;
}

/** 같은 열(column)의 마지막(가장 아래) 인덱스를 찾는다(ragged 마지막 행 대응). */
function bottomOfColumn(col: number, count: number, columns: number): number {
  let idx = col;
  while (idx + columns < count) idx += columns;
  return idx;
}

/**
 * 포커스 인덱스 이동 계산.
 * - count<=0 → -1.
 * - current 가 범위 밖(-1 포함)이면 0 에서 시작하는 것으로 본다.
 * - columns===1: 모든 방향이 ±1(선형). next/down/right=+1, prev/up/left=-1.
 * - columns>1: left/right/next/prev=±1(선형 순회), up/down=±columns(행 이동, 열 보존 wrap).
 */
export function computeNextFocusIndex(
  current: number,
  count: number,
  dir: FocusDirection,
  opts: FocusNavOptions = {},
): number {
  if (count <= 0) return -1;
  const columns = Math.max(1, Math.floor(opts.columns ?? 1));
  const wrap = opts.wrap ?? true;
  const cur = current < 0 || current >= count ? 0 : current;

  // 선형 ±1 (wrap 또는 clamp)
  const linear = (delta: number): number => {
    const n = cur + delta;
    if (wrap) return ((n % count) + count) % count;
    return Math.max(0, Math.min(count - 1, n));
  };

  if (columns === 1) {
    const back = dir === 'prev' || dir === 'up' || dir === 'left';
    return linear(back ? -1 : 1);
  }

  switch (dir) {
    case 'next':
    case 'right':
      return linear(1);
    case 'prev':
    case 'left':
      return linear(-1);
    case 'down': {
      const n = cur + columns;
      if (n < count) return n;
      // 마지막 행 아래로 → 같은 열 맨 위로 wrap(또는 clamp)
      return wrap ? cur % columns : cur;
    }
    case 'up': {
      const n = cur - columns;
      if (n >= 0) return n;
      // 첫 행 위로 → 같은 열 맨 아래로 wrap(또는 clamp)
      return wrap ? bottomOfColumn(cur % columns, count, columns) : cur;
    }
    default:
      return cur;
  }
}
