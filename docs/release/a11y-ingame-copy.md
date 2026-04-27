# 🌸 인게임 접근성 옵션 카피 SSOT v1.0

> 작성: 진채봉 (Editor) · 화면에 흘러갈 한 글자도 가지런히 다듬었사옵니다
> 스프린트: Auto — WCAG 2.1 AAA 자동 접근성 감사
> 단계: 에셋 (인게임 노출 텍스트 SSOT — 라벨 / 툴팁 / 접근성 도움말)
> 연계: `a11y-error-messages.md` (이벤트 메시지) · `a11y-user-guide.md` (외부 가이드) · `DESIGN.md §7` (테마·접근성)
> 노출 위치: 인게임 [옵션 → 접근성] 패널 · `client/public/help/accessibility.html`
> i18n 키 규약: `ui.options.a11y.<scope>.<element>` (라벨/툴팁/플레이스홀더 구분)

---

## 0. 작성 원칙

| 원칙 | 실천 |
|------|------|
| **명사 위주 라벨, 동사 위주 툴팁** | 라벨은 12자 이내, 툴팁은 80자 이내 |
| **공손하되 군더더기 없이** | "~하옵소서" 는 사용 가이드에만 / 인게임은 평문 존대 |
| **상태 표기 통일** | 켜짐 / 꺼짐 / 자동 (Auto) — 3종 외 금지 |
| **단축키 병기** | 라벨 끝에 `(Ctrl+Alt+A)` 형식, 키 리바인딩 시 자동 갱신 |
| **i18n 우선** | 본 문서 갱신 → 단일 PR 로 ko/en/ja 동시 반영 |

> 🪧 본 문서는 **인게임 라벨/툴팁** 만 다룹니다. 알림·에러는 `a11y-error-messages.md` 가 SSOT.

---

## 1. 옵션 패널 — 최상위 항목

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.title` | "접근성" | "Accessibility" | "アクセシビリティ" |
| `ui.options.a11y.subtitle` | "WCAG 2.1 AAA 기준 자동 검증 적용" | "Verified to WCAG 2.1 AAA" | "WCAG 2.1 AAA に基づき自動検証済み" |
| `ui.options.a11y.cta.help` | "도움말 열기" | "Open Help" | "ヘルプを開く" |
| `ui.options.a11y.cta.audit` | "지금 자가진단" | "Run self-check" | "セルフチェックを実行" |
| `ui.options.a11y.cta.reset` | "기본값으로" | "Reset to defaults" | "既定に戻す" |

---

## 2. 시각 — 색맹 모드 / 고대비 / UI 스케일

### 2.1 라벨

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.colorblind.label` | "색맹 모드" | "Color-blind mode" | "色覚モード" |
| `ui.options.a11y.colorblind.option.off` | "끄기" | "Off" | "オフ" |
| `ui.options.a11y.colorblind.option.protan` | "적색맹 (Protanopia)" | "Protanopia" | "1型色覚 (Protan)" |
| `ui.options.a11y.colorblind.option.deutan` | "녹색맹 (Deuteranopia)" | "Deuteranopia" | "2型色覚 (Deutan)" |
| `ui.options.a11y.colorblind.option.tritan` | "청색맹 (Tritanopia)" | "Tritanopia" | "3型色覚 (Tritan)" |
| `ui.options.a11y.colorblind.option.achroma` | "전색맹 (Achromatopsia)" | "Achromatopsia" | "全色盲 (Achroma)" |
| `ui.options.a11y.contrast.label` | "고대비 모드" | "High contrast" | "ハイコントラスト" |
| `ui.options.a11y.contrast.option.aa` | "AA (4.5:1)" | "AA (4.5:1)" | "AA (4.5:1)" |
| `ui.options.a11y.contrast.option.aaa` | "AAA (7:1)" | "AAA (7:1)" | "AAA (7:1)" |
| `ui.options.a11y.scale.label` | "UI 크기" | "UI scale" | "UI スケール" |
| `ui.options.a11y.scale.unit` | "{value}%" | "{value}%" | "{value}%" |

### 2.2 툴팁 (80자 이내)

| 키 | ko |
|----|------|
| `ui.options.a11y.colorblind.tip` | "주요 4종 색각 차이를 게임 화면 전체에 적용합니다. 아이콘·형태 보조와 병행됩니다." |
| `ui.options.a11y.contrast.tip` | "텍스트와 배경 명도 차를 강화합니다. AAA(7:1)는 본문, AA(4.5:1)는 보조 텍스트 기준입니다." |
| `ui.options.a11y.scale.tip` | "100% ~ 200% 까지 1% 단위로 조절. 레이아웃이 끊기지 않도록 설계되었습니다." |

### 2.3 영문/일문 툴팁

| 키 | en | ja |
|----|------|------|
| `ui.options.a11y.colorblind.tip` | "Applies four common color-vision simulations across the entire UI. Always paired with icon/shape cues." | "主要4種の色覚タイプをUI全体に適用します。アイコンや形状による補助も併用します。" |
| `ui.options.a11y.contrast.tip` | "Boosts text-to-background luminance ratio. AAA (7:1) for body, AA (4.5:1) for supplementary text." | "テキストと背景の明度差を強調します。AAA (7:1) は本文、AA (4.5:1) は補助文に適用します。" |
| `ui.options.a11y.scale.tip` | "Scale UI from 100% to 200% in 1% steps. Layout remains intact at every step." | "UI を 100% ～ 200% まで 1% 刻みで拡大できます。どの値でもレイアウトは崩れません。" |

---

## 3. 입력 — 키보드 / 게임패드 / 리바인딩

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.keyboard.label` | "키보드 전용 조작" | "Keyboard-only" | "キーボード操作" |
| `ui.options.a11y.gamepad.label` | "게임패드 보조" | "Gamepad assist" | "ゲームパッド補助" |
| `ui.options.a11y.rebind.label` | "키 리바인딩" | "Key rebinding" | "キー割り当て" |
| `ui.options.a11y.rebind.cta` | "키 변경..." | "Rebind..." | "変更..." |
| `ui.options.a11y.rebind.conflict` | "{key} 키가 이미 {action}에 사용 중입니다." | "{key} is already bound to {action}." | "{key} は既に {action} に割り当てられています。" |
| `ui.options.a11y.focusRing.label` | "포커스 링 강조" | "Focus ring boost" | "フォーカスリング強化" |
| `ui.options.a11y.skipLink.label` | "스킵 링크 표시" | "Show skip links" | "スキップリンクを表示" |

### 툴팁

| 키 | ko |
|----|------|
| `ui.options.a11y.keyboard.tip` | "마우스 없이 모든 화면을 조작할 수 있습니다. Tab/Shift+Tab/Enter/Esc 만으로 완주 가능합니다." |
| `ui.options.a11y.gamepad.tip` | "Xbox / DualSense 표준 매핑 + ATB 큐 햅틱. 핫스왑(USB/Bluetooth) 지원." |
| `ui.options.a11y.focusRing.tip` | "포커스 링 두께 2px → 3px 강화, 명도 대비 7:1 보장." |
| `ui.options.a11y.skipLink.tip` | "Tab 첫 누름 시 '본문으로 가기' 링크가 등장합니다 (인벤토리 17→3 탭 단축)." |

---

## 4. 청각 — 자막 / 시각화 큐 / 사운드 별칭

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.caption.label` | "자막" | "Captions" | "字幕" |
| `ui.options.a11y.caption.size.label` | "자막 크기" | "Caption size" | "字幕サイズ" |
| `ui.options.a11y.caption.bg.label` | "자막 배경" | "Caption background" | "字幕背景" |
| `ui.options.a11y.audioCue.label` | "시각화 큐" | "Visual audio cue" | "視覚化キュー" |
| `ui.options.a11y.soundAlias.label` | "사운드 별칭" | "Sound captions" | "サウンドキャプション" |

### 툴팁

| 키 | ko |
|----|------|
| `ui.options.a11y.caption.tip` | "대사·내레이션·효과음을 화면에 표기합니다. 화자 색상 4종은 색맹 모드에서도 구분 가능합니다." |
| `ui.options.a11y.audioCue.tip` | "ATB 게이지 만료, 적 등장 등 핵심 사운드를 화면 가장자리 펄스로 시각화합니다." |
| `ui.options.a11y.soundAlias.tip` | "효과음에 짧은 텍스트 별칭을 붙입니다. 예: '🗡️ 일격(크리티컬)', '🛡️ 차단'." |

---

## 5. 인지 — 모션 감소 / 자동 진행 / 난이도 보조

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.motion.label` | "모션 감소" | "Reduced motion" | "モーション低減" |
| `ui.options.a11y.autoAdvance.label` | "대사 자동 진행" | "Auto-advance dialogue" | "セリフ自動送り" |
| `ui.options.a11y.difficulty.label` | "전투 보조" | "Combat assist" | "戦闘補助" |
| `ui.options.a11y.difficulty.option.off` | "끄기" | "Off" | "オフ" |
| `ui.options.a11y.difficulty.option.timing` | "타이밍 보조" | "Timing assist" | "タイミング補助" |
| `ui.options.a11y.difficulty.option.full` | "스토리 우선" | "Story focus" | "ストーリー優先" |

### 툴팁

| 키 | ko |
|----|------|
| `ui.options.a11y.motion.tip` | "화면 흔들림·플래시·시차 스크롤을 비활성화합니다. WCAG 2.3.3 정합." |
| `ui.options.a11y.autoAdvance.tip` | "대사 길이에 비례한 시간 후 자동 진행. 1.0× ~ 3.0× 속도 조절 가능." |
| `ui.options.a11y.difficulty.tip` | "ATB 정지·자동 가드 등 보조 기능. 도전과제·엔딩 분기에는 영향 없음." |

---

## 6. 스크린 리더 호환성

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.screenReader.label` | "스크린 리더 모드" | "Screen reader mode" | "スクリーンリーダーモード" |
| `ui.options.a11y.screenReader.detect` | "{name} 자동 감지됨" | "{name} detected" | "{name} を検出しました" |
| `ui.options.a11y.screenReader.verbosity.label` | "안내 상세도" | "Verbosity" | "詳細度" |
| `ui.options.a11y.screenReader.verbosity.option.brief` | "간결" | "Brief" | "簡潔" |
| `ui.options.a11y.screenReader.verbosity.option.normal` | "보통" | "Normal" | "標準" |
| `ui.options.a11y.screenReader.verbosity.option.verbose` | "상세" | "Verbose" | "詳細" |

### 툴팁

| 키 | ko |
|----|------|
| `ui.options.a11y.screenReader.tip` | "NVDA / JAWS / VoiceOver / Narrator 4종 검증 완료. 라이브 리전으로 전투 상태를 즉시 안내합니다." |

---

## 7. 자가진단 결과 표시

| 키 | ko | en | ja |
|----|------|------|------|
| `ui.options.a11y.audit.cta` | "지금 자가진단" | "Run self-check" | "セルフチェックを実行" |
| `ui.options.a11y.audit.running` | "검증 중..." | "Running checks..." | "チェック中..." |
| `ui.options.a11y.audit.pass` | "🟢 모든 항목 통과" | "🟢 All checks passed" | "🟢 すべて合格" |
| `ui.options.a11y.audit.warn` | "🟡 AAA {count}건 추세 감시" | "🟡 {count} AAA findings — monitoring" | "🟡 AAA 違反 {count} 件 — 監視中" |
| `ui.options.a11y.audit.fail` | "🔴 AA {count}건 — 도움말 열기" | "🔴 {count} AA findings — open Help" | "🔴 AA 違反 {count} 件 — ヘルプを開く" |
| `ui.options.a11y.audit.lastRun` | "마지막 검증: {time}" | "Last run: {time}" | "前回の実行: {time}" |

> 🪧 본 6.7 절의 `pass/warn/fail` 메시지는 `a11y-error-messages.md` 의 `a11y.audit.*` 키와 **숫자가 같아야** 합니다. Build 단계에서 정합성 단언 1건 추가하옵소서.

---

## 8. 도움말 패널 — 본문 헤더

| 키 | ko |
|----|------|
| `ui.options.a11y.help.title` | "접근성 도움말" |
| `ui.options.a11y.help.intro` | "이 패널의 모든 기능은 키보드만으로 완주 가능합니다. 자세한 사용법은 도움말 문서를 열어 보세요." |
| `ui.options.a11y.help.openExternal` | "전체 가이드 열기 (브라우저)" |
| `ui.options.a11y.help.versionLine` | "WCAG 2.1 AAA · VPAT 2.4 · 빌드 {version}" |

---

## 9. 톤 점검 체크리스트 (Build 단계 PR 시)

- [ ] 라벨 12자 이내, 툴팁 80자 이내
- [ ] "켜짐 / 꺼짐 / 자동" 외 상태어 사용 0건
- [ ] 단축키 병기 시 라벨 끝에 `(Key)` 형식 통일
- [ ] ko/en/ja 3로케일 동시 반영
- [ ] `a11y-error-messages.md` 의 알림 메시지와 어휘 충돌 0건
- [ ] DESIGN.md §7 (테마·접근성) 와 색·아이콘 약속 일치

> 본 문서가 1차 SSOT 이옵니다. `client/src/i18n/{ko,en,ja}.json` 에 본 키들을 동기화한 뒤 인게임 패널 코드에서 참조하소서.
