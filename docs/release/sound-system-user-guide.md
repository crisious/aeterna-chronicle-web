# 🎵 에테르나 크로니클 — 사운드 시스템 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스코프: BGM 씬 매핑 · 전투 SFX · UI 인터랙션 사운드 · 라이선스 안전성
> 1차 SSOT — 약속 수치 변경 시 본 문서 §1 흐름도 동시 갱신
> 메아리: `README.md §🎵 사운드 시스템` · `launch_checklist.md §2.19` · 인게임 [도움말 → 사운드]

---

## 목차

1. [한 손 흐름도](#1-한-손-흐름도)
2. [씬 BGM 매핑 표](#2-씬-bgm-매핑-표)
3. [전투 SFX 카탈로그](#3-전투-sfx-카탈로그)
4. [UI 인터랙션 사운드](#4-ui-인터랙션-사운드)
5. [라이선스 안전성 약속](#5-라이선스-안전성-약속)
6. [npm 명령어 표](#6-npm-명령어-표)
7. [디렉터리 구조](#7-디렉터리-구조)
8. [트러블슈팅](#8-트러블슈팅)
9. [FAQ 7건](#9-faq-7건)

---

## 1. 한 손 흐름도

```
[1] 씬 진입       → SoundManager.playBGM(sceneKey)        ≤ 200ms 페이드인
       ↓
[2] 전투 트리거   → SoundManager.playSFX(eventKey)        ≤  50ms 응답
       ↓
[3] UI 인터랙션   → SoundManager.playUI(actionKey)        ≤  30ms 응답
       ↓
[4] 씬 이탈       → SoundManager.fadeOut(800ms)           무음 구간 0
       ↓
[5] 라이선스 게이트 → npm run audio:license-check          🟢 위험 0건
```

**약속 수치 (5분 게이트)**
| 지표 | 약속 | 측정 도구 |
|------|------|-----------|
| BGM 페이드인 | ≤ 200ms | `audio:measure` |
| SFX 응답 지연 | ≤ 50ms | `audio:measure` |
| UI 사운드 응답 | ≤ 30ms | `audio:measure` |
| 라이선스 위험 | 0건 | `audio:license-check` |

---

## 2. 씬 BGM 매핑 표

| 씬 카테고리 | 키 prefix | 파일 수 | 평균 길이 | 라이선스 |
|-------------|-----------|---------|-----------|----------|
| 🌑 보스전 | `bgm_boss_*` | 12종 (지역×2 + 최종) | 3:30 | CC0 |
| 🌳 필드 | `bgm_fld_*` | 10종 (10지역) | 4:15 | CC0 |
| 🏘️ 마을 | `bgm_twn_*` | 6종 | 3:00 | CC0/CC-BY |
| ✨ 이벤트 | `bgm_evt_*` | 8종 (스토리 분기) | 2:30 | CC0 |
| 🎼 시즌 | `bgm_ssn_*` | 4종 (춘하추동) | 2:45 | CC0 |
| 🌀 심연 | `bgm_aby_*` | 5종 (Ch.7) | 4:00 | CC0 |
| 🏆 시스템 | `bgm_sys_*` | 5종 (승리/패배/타이틀) | 1:30 | CC0 |

**커버리지 목표**: 모든 씬 진입점 BGM 매핑 100% — `audio:coverage-bgm` 검증

---

## 3. 전투 SFX 카탈로그

| 이벤트 군 | 키 prefix | 슬롯 수 | 응답 약속 |
|-----------|-----------|---------|-----------|
| 스킬 발동 | `sfx_skill_*` | 30개 (6클래스 × 5종) | ≤ 50ms |
| 타격 | `sfx_hit_*` | 8개 (속성×2 + 무기×4) | ≤ 30ms |
| 회피 | `sfx_dodge_*` | 4개 | ≤ 30ms |
| 크리티컬 | `sfx_crit_*` | 3개 (소/중/대) | ≤ 30ms |
| 상태이상 | `sfx_status_*` | 12개 (독/마비/수면 등) | ≤ 50ms |

**커버리지 목표**: 전투 핵심 이벤트 SFX 100% 커버 — `audio:coverage-sfx` 검증

---

## 4. UI 인터랙션 사운드

| 액션 | 키 | 길이 | 음량 정규화 |
|------|-----|------|-------------|
| 메뉴 열기 | `ui_menu_open` | 200ms | -18 LUFS |
| 메뉴 닫기 | `ui_menu_close` | 150ms | -18 LUFS |
| 커서 이동 | `ui_cursor_move` | 50ms | -22 LUFS |
| 선택 확정 | `ui_select_confirm` | 120ms | -16 LUFS |
| 취소 | `ui_select_cancel` | 100ms | -20 LUFS |
| 아이템 획득 | `ui_item_get` | 400ms | -14 LUFS |
| 레벨업 | `ui_level_up` | 1.2s | -12 LUFS |
| 퀘스트 완료 | `ui_quest_clear` | 1.8s | -12 LUFS |
| 에러 알림 | `ui_error` | 250ms | -18 LUFS |

---

## 5. 라이선스 안전성 약속

**허용 라이선스 (3종)**: CC0 / CC-BY 4.0 / OFL 1.1

**금지 라이선스**: CC-BY-NC, CC-BY-SA(상업), Royalty-Free 모호 표기, 출처 미상

**증빙 의무**
- 모든 자산은 `audio/_licenses/<file>.license.yaml`에 출처·라이선스·작자·URL 4필드 기재
- 라이선스 게이트 `npm run audio:license-check` — 누락 시 `🔴 BLOCK`
- CC-BY 자산은 `docs/legal/audio-credits.md`에 자동 등재

---

## 6. npm 명령어 표

| 명령어 | 역할 | 예상 소요 |
|--------|------|-----------|
| `npm run audio:measure` | 페이드인/응답 지연 측정 | ~10s |
| `npm run audio:coverage-bgm` | 씬 BGM 매핑 커버리지 | ~5s |
| `npm run audio:coverage-sfx` | 전투 SFX 커버리지 | ~5s |
| `npm run audio:license-check` | 라이선스 안전성 검증 | ~3s |
| `npm run audio:normalize` | LUFS 음량 정규화 | ~30s |
| `npm run audio:gate` | 4종 게이트 합본 (PR 게이트) | ~60s |

---

## 7. 디렉터리 구조

```
audio/
├── bgm/                    # 배경음 (40+ 파일, .ogg)
├── sfx/
│   ├── skill/              # 스킬 발동음
│   ├── combat/             # 타격/회피/크리티컬
│   └── status/             # 상태이상
├── ui/                     # UI 인터랙션
├── _licenses/              # 라이선스 메타 (.license.yaml)
└── _normalized/            # 정규화 산출물 (gitignore)
```

---

## 8. 트러블슈팅

| 증상 | 원인 후보 | 처방 |
|------|-----------|------|
| BGM이 끊김 | 압축 비트레이트 너무 높음 | 192kbps로 재인코딩 |
| SFX 지연 | 디코드 캐시 미스 | `SoundManager.preload()` 호출 확인 |
| 음량 들쭉날쭉 | LUFS 미정규화 | `npm run audio:normalize` 실행 |
| 라이선스 게이트 실패 | `.license.yaml` 누락 | §5 4필드 채워 등재 |

---

## 9. FAQ 7건

**Q1. CC-BY 자산은 어떻게 크레딧을 표기하옵니까?**
A. `audio/_licenses/<file>.license.yaml`만 채우면 됩니다. `npm run audio:license-check`가 `docs/legal/audio-credits.md`에 자동 등재합니다.

**Q2. BGM 길이 권장 범위는?**
A. 필드 4분, 보스 3분 30초, 마을 3분, 이벤트 2분 30초 — 루프 포인트가 자연스러운지 확인.

**Q3. 모바일 브라우저에서 자동 재생이 막힙니다.**
A. 첫 사용자 입력 후 `SoundManager.unlock()` 호출이 필요합니다 — `BootScene`에서 처리됨.

**Q4. SFX는 .ogg가 좋습니까 .wav가 좋습니까?**
A. 1초 미만 SFX는 `.wav`(무압축, 응답 빠름), 1초 이상은 `.ogg`(용량 절감).

**Q5. 동일 SFX가 동시 재생되면 음량이 폭발합니다.**
A. `SoundManager.playSFX(key, { maxConcurrent: 3 })`로 동시 재생 슬롯 제한.

**Q6. 라이선스 게이트가 `🟡 WARN`을 띄웁니다.**
A. 누적 5건까지는 통과, 6건부터 `🔴 BLOCK`. `audio:license-check --verbose`로 누락 자산 목록 확인.

**Q7. BGM 크로스페이드는 어떻게 하옵니까?**
A. `SoundManager.crossfadeBGM(newKey, 1500)` — 권장 1500ms, 보스전 진입은 800ms.

---

> 본 가이드는 1차 SSOT입니다. 약속 수치(페이드인 200ms · SFX 50ms · 라이선스 0건) 변경 시 백능파(Strategy) 승인 후 §1 흐름도와 §2~§5 표를 동시 갱신하옵소서.
