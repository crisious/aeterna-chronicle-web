/**
 * uiModalLock — 모달 UI 패널이 열린 동안 하부 씬의 키보드 이동을 정지시키는 공유 잠금.
 *
 * 전키보드 UI(목표)에서 패널을 키보드로 조작하려면 화살표가 패널 포커스 이동에 쓰여야 하는데,
 * 하부 이동 씬(GameScene WASD/화살표)이 같은 키를 폴링(cursors.isDown)해 캐릭터를 움직인다.
 * 패널 open 시 push, close 시 pop 하고, 이동 씬은 update 에서 isUiModalOpen() 으로 이동을 양보한다.
 * 카운터(스택)라 중첩 모달도 안전하다.
 */
let depth = 0;

/** 모달 진입(패널 open). */
export function pushUiModal(): void {
  depth += 1;
}

/** 모달 이탈(패널 close). 0 미만으로 내려가지 않는다. */
export function popUiModal(): void {
  depth = Math.max(0, depth - 1);
}

/** 현재 열린 모달이 있는가(이동 씬이 입력을 양보해야 하는가). */
export function isUiModalOpen(): boolean {
  return depth > 0;
}

/** 중첩 깊이(디버그/테스트용). */
export function uiModalDepth(): number {
  return depth;
}

/** 안전망 — 씬 강제 전환 등으로 pop 이 누락될 때 초기화(soft-lock 방지). */
export function resetUiModalLock(): void {
  depth = 0;
}
