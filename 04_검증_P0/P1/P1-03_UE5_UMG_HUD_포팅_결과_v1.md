# 에테르나 크로니클 — P1-03 UE5 UMG HUD 4컴포넌트 포팅 결과 v1

> 작성일: 2026-03-06  
> 기준 계약서: `P0-08_HUD_4컴포넌트_계약서_v1.md`  
> 대상: Unreal Engine 5 (UMG + CommonUI + Enhanced Input)

---

## 1) 산출물 경로

`ue5_umg/HUD/`

- C++ 스켈레톤 (10)
  - `Cpp/HudContracts.h`
  - `Cpp/HudOverlayWidget.h/.cpp`
  - `Cpp/HudStatusBarWidget.h/.cpp`
  - `Cpp/HudQuickSlotBarWidget.h/.cpp`
  - `Cpp/HudQuestTrackerWidget.h/.cpp`
  - `Cpp/HudDialogueBoxWidget.h/.cpp`
- Blueprint 바인딩 가이드 (1)
  - `Blueprint/WBP_Binding_Guide.md`
- 데이터 샘플 (1)
  - `Data/HUD_Defaults.json`

총 13개 파일.

---

## 2) 포팅 범위

### HudStatusBar
- `FHudStatusProps` 구조체 반영
- 위험 HP 임계치 판정 + critical 진입 처리 지점 확보

### HudQuickSlotBar
- `FQuickSlotData` 배열 바인딩
- `TickCooldown(int32 DeltaMs)` 구현

### HudQuestTracker
- 퀘스트 가시 목록(기본 3개) 절단/렌더 이벤트 제공

### HudDialogueBox
- Show/Hide + 선택지 데이터 전달 인터페이스 제공

### Overlay Root
- 4컴포넌트 집계 컨테이너 `UHudOverlayWidget` 작성

---

## 3) 계약서 대비 매핑

- Props/State/Event 인터페이스: 반영
- UE5 바인딩 규약(UMG/CommonUI/Enhanced Input): `WBP_Binding_Guide.md`에 반영
- 샘플 데이터: `HUD_Defaults.json` 제공

---

## 4) 다음 단계(UE 프로젝트 내)

- [ ] 실제 UE5 프로젝트 `Source/`로 C++ 파일 이관 및 빌드
- [ ] `WBP_HudOverlay` 생성 후 BindWidget 연결
- [ ] CommonUI 액션 라우터/Enhanced Input 액션 매핑
- [ ] 1080p/4K + Safe Zone 캡처(DoD 잔여)

---

## 5) 판정

**P1-03 1차 포팅 완료 (문서/코드 산출물 기준 통과)**
- 계약서 기반 UMG 구현 골격과 BP 연결 규약 확보 완료.
