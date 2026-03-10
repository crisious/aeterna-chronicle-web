# UE5 UMG 바인딩 가이드 (P1-03)

## 위젯 트리 권장 구조
- `WBP_HudOverlay`
  - `HudStatusBar` (`UHudStatusBarWidget`)
  - `HudQuickSlotBar` (`UHudQuickSlotBarWidget`)
  - `HudQuestTracker` (`UHudQuestTrackerWidget`)
  - `HudDialogueBox` (`UHudDialogueBoxWidget`)

## 이벤트 채널 매핑
- `ui.event.status.hp_critical` -> BP 디스패처 `OnHpCritical`
- `ui.event.quickslot.use` -> 입력 액션 `IA_QuickSlot1..12`
- `ui.event.questtracker.navigate` -> 퀘스트 핀/내비게이션
- `ui.event.dialogue.choice_confirm` -> Narrative Subsystem 전달

## 입력
- Enhanced Input + CommonUI
- 키보드: `1..0,-,=`
- 게임패드: `LB/RB + FaceButtons`

## 해상도
- 기준 1920x1080, DPI Curve 4K 대응 필수
- 콘솔 Safe Zone 90% 강제
