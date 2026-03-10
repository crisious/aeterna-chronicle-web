# 에테르나 크로니클 — P1-02 Unity UI Toolkit HUD 4컴포넌트 포팅 결과 v1

> 작성일: 2026-03-06  
> 기준 계약서: `P0-08_HUD_4컴포넌트_계약서_v1.md`  
> 목적: Phaser 기준 HUD 계약을 Unity UI Toolkit(UXML/USS/C#)으로 1차 포팅

---

## 1) 산출물 경로

`unity_ui_toolkit/HUD/`

- UXML
  - `UXML/HudOverlayRoot.uxml`
  - `UXML/HudStatusBar.uxml`
  - `UXML/HudQuickSlotBar.uxml`
  - `UXML/HudQuestTracker.uxml`
  - `UXML/HudDialogueBox.uxml`
- USS
  - `USS/HudStyles.uss`
- C# Scripts
  - `Scripts/HudContracts.cs`
  - `Scripts/HudController.cs`
  - `Scripts/HudStatusBarController.cs`
  - `Scripts/HudQuickSlotController.cs`
  - `Scripts/HudQuestTrackerController.cs`
  - `Scripts/HudDialogueController.cs`

---

## 2) 포팅 범위

### HudStatusBar
- HP/MP/EXP fill 바인딩
- 캐릭터명/레벨/수치 텍스트 갱신

### HudQuickSlotBar
- 슬롯 리스트 렌더링
- 쿨다운 Tick 감소 반영
- 입력 모드 라벨 표시

### HudQuestTracker
- 메인/서브 퀘스트 3개까지 추적 표시
- 진행도/거리 표시

### HudDialogueBox
- 화자/본문/선택지 렌더링
- Show/Hide 제어

---

## 3) 계약서 대비 상태

- Props 구조: 반영 (`HudContracts.cs`)
- State/렌더링 루프: 반영 (각 Controller)
- Event 시스템: UI 이벤트 훅 위치 확보(버튼 클릭 핸들러 확장 가능)
- 접근성: 텍스트 병기/구분 라벨 기본 반영 (세부 WCAG 대비는 차기 보강)

---

## 4) 후속 필요 작업

- [ ] 실제 Unity 프로젝트(Assets/UI)로 파일 이관 후 UIDocument 연결
- [ ] Input System(Enhanced Input)과 슬롯 사용 이벤트 연결
- [ ] 대화 선택지 클릭 시 게임플레이 이벤트 버스 연동
- [ ] 해상도별(1080p/4K) 레이아웃 미세 조정

---

## 5) 판정

**P1-02 1차 포팅 완료 (문서/코드 산출물 기준 통과)**
- 즉시 Unity 프로젝트에 붙일 수 있는 UXML/USS/C# 골격 확보.
