# 🌸 접근성 에러 / 안내 메시지 카피 SSOT v1.0

> 작성: 진채봉 (Editor) · 한 글자도 허투루 흘리지 않겠사옵니다
> 스프린트: Auto — WCAG 2.1 AAA 자동 접근성 감사
> 단계: 에셋 (텍스트 SSOT — i18n 키 SSOT)
> 연계: `client/src/i18n/{ko,en,ja}.json` · `a11y-user-guide.md` · `prd_a11y-aaa-audit.md`
> 원칙: **본 문서가 1차 SSOT**. i18n JSON 반영은 Build 단계에서 키 단위 동기화.

---

## 0. 키 네이밍 규약

```
a11y.<scope>.<event>
  scope ∈ { colorblind | contrast | scale | keyboard | gamepad | screenReader | motion | caption | audit }
  event = camelCase
```

> 예: `a11y.colorblind.simEnabled`, `a11y.keyboard.bindConflict`, `a11y.audit.aaaViolation`

> 메시지 본문은 **3로케일 동시 작성**. 본 문서가 갱신되면 Build 단계 PR에서 `client/src/i18n/{ko,en,ja}.json` 동시 반영 (단일 PR 원칙).

---

## 1. 색맹 모드 (colorblind) — 4종

| 키 | ko | en | ja |
|----|------|------|------|
| `a11y.colorblind.simEnabled` | "{mode} 시뮬레이션이 켜졌사옵니다." | "{mode} simulation enabled." | "{mode}シミュレーションを有効にしました。" |
| `a11y.colorblind.simDisabled` | "색맹 시뮬레이션이 꺼졌사옵니다." | "Color-blind simulation disabled." | "色覚シミュレーションを無効にしました。" |
| `a11y.colorblind.patternOn` | "패턴 오버레이를 켜 게이지를 강조합니다." | "Pattern overlay enabled to reinforce gauges." | "パターンオーバーレイでゲージを強調します。" |
| `a11y.colorblind.patternOff` | "패턴 오버레이를 끄옵니다." | "Pattern overlay disabled." | "パターンオーバーレイを無効にしました。" |

> `{mode}` ∈ `{ Protanopia | Deuteranopia | Tritanopia | Achromatopsia }` (로케일별 번역은 `a11y.colorblind.mode.*` 하위 키로 분리)

---

## 2. 고대비 / UI 스케일 (contrast / scale)

| 키 | ko | en | ja |
|----|------|------|------|
| `a11y.contrast.enabled` | "고대비 모드 — 본문 대비 7:1 적용." | "High-contrast mode — 7:1 body contrast applied." | "ハイコントラストモード — 本文コントラスト7:1を適用。" |
| `a11y.contrast.disabled` | "고대비 모드를 해제하옵니다." | "High-contrast mode disabled." | "ハイコントラストモードを解除しました。" |
| `a11y.scale.changed` | "UI 배율이 {percent}% 로 조정되었사옵니다." | "UI scale set to {percent}%." | "UIスケールを{percent}%に変更しました。" |
| `a11y.scale.maxReached` | "최대 배율(200%)에 도달하였사옵니다." | "Maximum scale (200%) reached." | "最大スケール(200%)に達しました。" |
| `a11y.scale.layoutWarning` | "이 화면은 {percent}% 에서 일부 요소가 가려질 수 있사옵니다." | "Some elements may overflow at {percent}% on this screen." | "この画面では{percent}%で一部要素が見切れる可能性があります。" |

---

## 3. 키보드 / 게임패드 (keyboard / gamepad)

| 키 | ko | en | ja |
|----|------|------|------|
| `a11y.keyboard.bindConflict` | "'{key}' 는 이미 '{action}' 에 배정되어 있사옵니다. 덮어쓰시겠습니까?" | "'{key}' is already bound to '{action}'. Overwrite?" | "'{key}'はすでに'{action}'に割り当てられています。上書きしますか？" |
| `a11y.keyboard.bindSaved` | "키 배정이 저장되었사옵니다." | "Key binding saved." | "キー割り当てを保存しました。" |
| `a11y.keyboard.focusLost` | "포커스가 화면 밖으로 벗어났사옵니다. Tab 으로 복귀합니다." | "Focus left the viewport. Press Tab to recover." | "フォーカスが画面外に出ました。Tabで復帰します。" |
| `a11y.gamepad.connected` | "{name} 게임패드가 연결되었사옵니다." | "{name} gamepad connected." | "{name}ゲームパッドが接続されました。" |
| `a11y.gamepad.disconnected` | "게임패드 연결이 끊겼사옵니다. 키보드로 전환합니다." | "Gamepad disconnected. Switching to keyboard." | "ゲームパッドが切断されました。キーボードに切り替えます。" |
| `a11y.gamepad.navJump` | "알려진 이슈: 인벤토리 격자에서 포커스가 점프할 수 있사옵니다 (BUG-A11Y-007)." | "Known issue: focus may jump in inventory grid (BUG-A11Y-007)." | "既知の問題：インベントリでフォーカスがジャンプする場合があります(BUG-A11Y-007)。" |

---

## 4. 스크린 리더 (screenReader)

| 키 | ko | en | ja |
|----|------|------|------|
| `a11y.screenReader.detected` | "스크린 리더 ({name}) 가 감지되었사옵니다. 음성 안내 모드로 전환합니다." | "Screen reader ({name}) detected. Switching to assistive narration." | "スクリーンリーダー({name})を検出しました。音声案内モードに切り替えます。" |
| `a11y.screenReader.regionLive` | "전투 로그를 음성으로 안내합니다." | "Combat log is being announced." | "戦闘ログを音声で案内します。" |
| `a11y.screenReader.unsupported` | "현재 화면은 스크린 리더 검증이 진행 중이옵니다 ({progress}%)." | "This screen is still being validated for screen readers ({progress}%)." | "この画面はスクリーンリーダー検証中です({progress}%)。" |

> 어조 원칙: **공손하되 군더더기 없이.** 긴급 경고는 `aria-live="assertive"` 로 송출되므로 첫 문장에 핵심을 둡니다.

---

## 5. 모션 / 자막 (motion / caption)

| 키 | ko | en | ja |
|----|------|------|------|
| `a11y.motion.reducedOn` | "모션 감소 — 화면 흔들림과 파티클이 줄어듭니다." | "Reduced motion — screen shake and particles are minimized." | "モーション抑制 — 画面の揺れとパーティクルを抑えます。" |
| `a11y.motion.reducedOff` | "모션 감소를 해제하옵니다." | "Reduced motion disabled." | "モーション抑制を解除しました。" |
| `a11y.motion.osPreferred` | "OS 설정에 따라 모션 감소가 자동 적용되었사옵니다." | "Reduced motion auto-applied from OS setting." | "OS設定に基づきモーション抑制を自動適用しました。" |
| `a11y.caption.toggled` | "자막을 {state}." | "Captions {state}." | "字幕を{state}しました。" |
| `a11y.caption.langChanged` | "자막 언어가 {lang} 로 변경되었사옵니다." | "Caption language set to {lang}." | "字幕言語を{lang}に変更しました。" |

> `{state}` ∈ `{ 켜옵니다 / 끕니다 } / { enabled / disabled } / { 有効化 / 無効化 }`

---

## 6. 자동 감사 결과 (audit) — 개발자·리뷰어용

| 키 | ko | en | ja |
|----|------|------|------|
| `a11y.audit.passed` | "WCAG 2.1 AAA 자동 감사 통과 ({violations}건 감지·자동 해소)." | "WCAG 2.1 AAA audit passed ({violations} found, auto-resolved)." | "WCAG 2.1 AAA監査に合格({violations}件検出・自動解決)。" |
| `a11y.audit.aaaViolation` | "AAA 위반 {count}건 — {firstRule} 외 {extra}건. 상세는 리포트를 확인하옵소서." | "{count} AAA violation(s) — {firstRule} and {extra} more. See report for details." | "AAA違反{count}件 — {firstRule}ほか{extra}件。詳細はレポートをご確認ください。" |
| `a11y.audit.aaBlocking` | "머지 차단: AA 위반 {count}건 ({firstRule})." | "Merge blocked: {count} AA violation(s) ({firstRule})." | "マージブロック：AA違反{count}件({firstRule})。" |
| `a11y.audit.contractMissing` | "ARIA 라벨 누락: {selector}. AriaLabelMap.ts 등록 필요." | "Missing ARIA label: {selector}. Register in AriaLabelMap.ts." | "ARIAラベル不足：{selector}。AriaLabelMap.tsへの登録が必要です。" |
| `a11y.audit.colorContrastFail` | "색 대비 미달: {ratio}:1 < 7:1 (AAA). 위치 {selector}." | "Contrast {ratio}:1 below AAA 7:1 at {selector}." | "コントラスト{ratio}:1がAAA 7:1未満。位置 {selector}。" |
| `a11y.audit.keyboardTrap` | "키보드 트랩: {selector} 에서 Tab 탈출 불가." | "Keyboard trap: cannot escape {selector} via Tab." | "キーボードトラップ：{selector}からTabで脱出不可。" |

---

## 7. CHANGELOG 항목 초안

> 본 항목은 Build 단계 종료 시 `CHANGELOG.md` 의 `[1.0.0-rc.3] — Unreleased` 절에 추가될 초안이옵니다. 진채봉 Editor 가 Ship 단계에서 최종 다듬겠사옵니다.

```markdown
- **WCAG 2.1 AAA 자동 접근성 감사 게이트** (`scripts/a11y/audit.ts`, `tests/reports/a11y/`) — 두련사 + 적경홍
  - 5종 Probe 통합: Axe · ColorContrast · ColorBlindSim · KeyboardTraverser · AriaContract
  - CI 머지 게이트로 승격 — AA 위반 1건 이상 시 차단, AAA 위반은 경고
  - `tests/reports/a11y/summary.json` SSOT 생성 → VPAT 2.4 자동 갱신 파이프라인 연결
  - `launch_checklist.md §2.17` 자동 토글 — 운영 부담 감소
- **접근성 사용자 가이드 v1.0** (`docs/release/a11y-user-guide.md`) — 진채봉 Editor
  - 9개 절 + FAQ + VPAT 2.4 요약 — 색맹 4종·키 리바인딩·스크린 리더 3종 검증 시나리오
  - 인게임 [옵션 → 도움말] 패널 + `client/public/help/accessibility.html` 동시 노출 (Build 단계)
- **a11y i18n 키 21종** (`client/src/i18n/{ko,en,ja}.json`) — 진채봉 Editor
  - `a11y-error-messages.md` SSOT 기반 ko/en/ja 동시 추가
  - 색맹 4 · 고대비 5 · 키보드 6 · 스크린 리더 3 · 모션 5 · 감사 6 = 21종 키
- **VPAT 2.4 요약 표** (`docs/legal/vpat-2.4.md` 초안) — 진채봉 Editor
  - WCAG 2.1 4원칙 × 준수 수준 매트릭스 — `summary.json` 트리거 자동 갱신
```

---

## 변경 이력

| 버전 | 날짜 | 변경 | 작성 |
|------|------|------|------|
| 1.0 | 2026-04-26 | 초안 — 21종 메시지 ko/en/ja 동시 정의 + CHANGELOG 초안 | 진채봉 |

> Build 단계 인계 시 체크리스트:
> - [ ] 본 문서 21종 키 ↔ `client/src/i18n/{ko,en,ja}.json` 단일 PR로 동기화
> - [ ] `{변수}` 보간 위치 e2e 검증 (`tests/e2e/a11y/i18n.test.ts`)
> - [ ] 문장 길이 32자 이내 검증 (스크린 리더 낭독 끊김 방지)
