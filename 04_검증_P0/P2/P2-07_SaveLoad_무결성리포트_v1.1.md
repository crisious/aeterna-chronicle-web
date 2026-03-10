# 에테르나 크로니클 — P2-07 Save/Load 무결성 리포트 v1.1

> 작성일: 2026-03-07
> 상태: Done

---

## 1) 실행 정보

- 실행 스크립트: `tools/regression/saveload_integrity_runner.py`
- 결과 파일: `04_검증_P0/P2/P2-07_saveload_result.json`
- 반복 횟수: 20
- 결과: **PASS 20 / FAIL 0**

---

## 2) 검증 항목

- `story.fragment_count`
- `story.party_alive`
- `story.betrayal_score`
- `story.artifact_count`
- `story.seal_visited`
- `story.ending_a_score`
- `story.emperor_saved`
- `story.lethe_understood`

검증 방식:
- save -> load -> compare -> save 라운드트립 20회 반복
- 키별 값 동일성 비교(diff key 검사)

---

## 3) 결과 요약

- 라운드트립 반복 중 diff key 발생 0건
- bitmask 필드(`party_alive`, `seal_visited`) 손실/변형 0건
- 누적값(`fragment_count`, `ending_a_score`) 비정상 증가 0건

---

## 4) 판정

- **P2-07 Done**

---

## 5) 후속

1. 실제 런타임 save blob 포맷과 1:1 매핑 검증(P2-10 연계)
2. 챕터 경계 세이브 샘플(3종) 추가한 v1.2 확장 가능
