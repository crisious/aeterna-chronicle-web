# ⚔️ QA 작전 계획 — 몬스터 아트 파이프라인 표준화

> 작성: 적경홍 (QA Lead / SRE) · 붉은 전의(戰衣) 차림으로 보고드립니다
> 작성일: 2026-04-27
> 스프린트: Auto — 보스/엘리트/일반 비주얼 위계 + AI→터치업 + 라이선스 게이트
> 단계: **Plan (테스트 케이스·QA 체크리스트 준비)** → Build·Test 인계용 작전 명령서
> SSOT 인용: `plan_monster-art-pipeline-architecture.md` (두련사 5격자) · `prd_monster-art-pipeline.md` (정경패 MVP 60종) · `design-system_monster-art-pipeline.md` (가춘운 Tier 토큰 5축) · `security-checklist_monster-art-pipeline.md` (이소화 47항목) · 백능파 HOLD 결정문 (MVP 60종 / 도감 UI 분리 / 90일 보존)
> 게이트 대상: `launch_checklist.md §몬스터 다양성` · MVP 60종 (챕터 1·2)

---

## 0. 한 줄 작전 개요

> **현황 보고드립니다.** 5 격자 진형(catalog → tier-tokens → generate → touchup → gate)은 청사진까지 섰사오나, 회귀 방어선은 아직 빈 항아리.
> **판정.** 격자 5개 × 회귀 카테고리 7종 × Tier 3계급 = **63 케이스 작전 매트릭스 + 라이선스 회차 12 + MVP 60종 통과율 게이트**로 적군(불량 에셋·라이선스 침해)을 봉쇄.
> **조치.** P0 38 / P1 19 / P2 6. Build Day 3 PoC 게이트 통과 → Build Day 14 MVP 60종 100% 통과 → Test Day 18 Ship 게이트 발효. 전선 이상 무를 목표로 진을 굳히겠나이다.

---

## 1. 작전 목표 (Definition of Done)

QA 관점 Ship 가능 판정 조건 — **단 하나라도 미달 시 Ship 불가, 백능파 CEO 보고 후 HOLD**.

| # | 항목 | 임계치 | 검증 방법 |
|---|------|--------|----------|
| D1 | 카탈로그 정합성 | MVP 60종 100% 적재 (id 중복 0) | `monster_catalog.json` schema 검증 |
| D2 | Tier 토큰 SSOT 일치 | DESIGN.md §10 ⇄ `monster_tier.ts` diff 0 | 단위 테스트 `tier-tokens.spec.ts` |
| D3 | 라이선스 게이트 | 침해 의심 **0건** (5종 정규식 + 유사도 ≥80% 0건) | `gate/license_check`·`reverse_search` |
| D4 | 팔레트 통과율 | 16/24/32색 위반 **0건** | `palette_audit.ts` |
| D5 | Pixel diff (AI 원본 vs 최종) | **≥ 60% 변경** 100% 통과 | `pixel_diff.ts` |
| D6 | 실루엣 식별성 | 16×16 축소 시 카테고리 정답률 **≥ 90%** | `silhouette.ts` (휴먼 4명 더블블라인드) |
| D7 | 애니메이션 시트 | idle/attack/hit/death 4 프레임 누락 0건 | `frame_split` 검사 |
| D8 | MVP 60종 종합 통과율 | **100%** (통과한 자만 client 배포) | CI artifact `gate_summary.json` |
| D9 | 보안 47항목 🔴 상 24건 | **0건 잔존** | 이소화 체크리스트 cross-ref |
| D10 | 회귀 스냅샷 SSIM | 기준 대비 **≥ 0.95** (의도 변경 외) | 시각 회귀 테스트 |

---

## 2. 테스트 매트릭스 (5 격자 × 7 카테고리)

```
              ┌ catalog ─┬ tier-tokens ─┬ generate ─┬ touchup ─┬ gate ─┐
정합성        │ T-CAT-S  │ T-TKN-S      │ T-GEN-S   │ T-TUP-S  │ T-GAT-S│
경계값        │ T-CAT-B  │ T-TKN-B      │ T-GEN-B   │ T-TUP-B  │ T-GAT-B│
오류 처리     │ T-CAT-E  │ T-TKN-E      │ T-GEN-E   │ T-TUP-E  │ T-GAT-E│
성능          │   ─      │   ─          │ T-GEN-P   │ T-TUP-P  │ T-GAT-P│
보안          │ T-CAT-X  │   ─          │ T-GEN-X   │   ─      │ T-GAT-X│
시각 회귀     │   ─      │ T-TKN-V      │   ─       │ T-TUP-V  │ T-GAT-V│
인계 계약     │ T-CAT-C  │ T-TKN-C      │ T-GEN-C   │ T-TUP-C  │ T-GAT-C│
                                                + 라이선스 회차 12 + MVP 60종 통과율 1
```

**우선순위 분포**: P0 38 (라이선스·게이트·MVP 통과율 핵심) · P1 19 (성능·시각 회귀) · P2 6 (인계 보조).

---

## 3. 테스트 케이스 카탈로그

### 3.1 ① catalog — `monster_catalog.json` (5 케이스)

| ID | 우선 | Given-When-Then 요약 | 단언 |
|----|------|---------------------|------|
| T-CAT-S-01 | P0 | 챕터 1·2 monster-design `*.md` 파싱 → JSON 빌드 | id 60건 / 누락 0 / 중복 0 |
| T-CAT-S-02 | P0 | tier 필드 enum (`normal`·`elite`·`boss`) 외 값 주입 | schema 위반 → 빌드 실패 |
| T-CAT-B-01 | P1 | silhouette_class 16종 분포 검사 | 한 클래스 ≤ 12종 (편중 방지) |
| T-CAT-E-01 | P0 | base_or_variant 부모 id 미존재 시 | 명시적 에러 + line 번호 출력 |
| T-CAT-X-01 | P0 | 외부 PR이 catalog에 신규 id 추가 | CODEOWNERS `@art` 승인 필수 (이소화 §A2) |

### 3.2 ② tier-tokens — `design_tokens/monster_tier.ts` (5 케이스)

| ID | 우선 | Given-When-Then 요약 | 단언 |
|----|------|---------------------|------|
| T-TKN-S-01 | P0 | DESIGN.md §10 토큰 표 ⇄ TS 상수 비교 | size/outline/rim/palette/idle 5축 diff 0 |
| T-TKN-B-01 | P1 | normal 32px / elite 48px / boss 64px 외 값 | 컴파일 타임 거부 (`as const` 유니언) |
| T-TKN-V-01 | P0 | Storybook 스냅샷 (Tier 3계급 × 7지역 = 21) | SSIM ≥ 0.95 vs baseline |
| T-TKN-E-01 | P1 | rim color 미정의 tier 호출 | 런타임 throw + Sentry 보고 |
| T-TKN-C-01 | P2 | 가춘운 디자인 → 두련사 코드 인계 시 | 21 토큰 매핑 표 PR 첨부 강제 |

### 3.3 ③ generate — AI 호출 + 메타 sidecar (10 케이스)

| ID | 우선 | Given-When-Then 요약 | 단언 |
|----|------|---------------------|------|
| T-GEN-S-01 | P0 | Firefly 1순위 호출 → 실패 시 SDXL 폴백 | provider 메타에 폴백 사실 기록 |
| T-GEN-S-02 | P0 | `<id>.meta.json` 6필드 (model/lora/prompt/seed/provider/ts) | 누락 0 / 위조 불가 (해시 서명) |
| T-GEN-B-01 | P1 | prompts 템플릿 normal/elite/boss 별 토큰 길이 한계 | provider 한계 95% 이내 |
| T-GEN-E-01 | P0 | provider 5xx → 자동 재시도 3회 → DLQ | 재시도 로그 + 휴먼 알림 |
| T-GEN-P-01 | P1 | 1종 생성 평균 wall-clock | ≤ 90초 (Firefly), ≤ 180초 (SDXL) |
| T-GEN-P-02 | P1 | 60종 배치 총 시간 | ≤ 4시간 (PRD §5 KPI) |
| T-GEN-X-01 | P0 | API 키 노출 (코드/로그/sidecar) | 정규식 9종 0매치 (이소화 §A1~A10) |
| T-GEN-X-02 | P0 | LoRA 출처 미기재 PR | 머지 차단 (이소화 §B3) |
| T-GEN-E-02 | P1 | 동일 seed 재호출 결정성 | 픽셀 동일 OR 시드 무시 명시 |
| T-GEN-C-01 | P2 | 가춘운 프롬프트 변경 시 | 버전 태그 + CHANGELOG 1줄 |

### 3.4 ④ touchup — 자동 4단 (15 케이스)

| ID | 우선 | Given-When-Then 요약 | 단언 |
|----|------|---------------------|------|
| T-TUP-S-01 | P0 | rembg 배경 제거 → 알파 채널 보존 | edge alpha < 5% 잔존 |
| T-TUP-S-02 | P0 | quantize 16/24/32색 강제 | tier별 팔레트 위반 0 |
| T-TUP-S-03 | P0 | outline 2px 재작업 | 외곽선 픽셀 비율 ±10% 이내 |
| T-TUP-S-04 | P0 | frame_split idle/attack/hit/death | 4 프레임 누락 0 / 크기 동일 |
| T-TUP-B-01 | P1 | 32×32 ~ 128×128 입력 범위 | 비율 보존 / 보간 모드 nearest |
| T-TUP-B-02 | P1 | 알파 0 100% 입력 (전부 투명) | 명시적 에러 (작가 회수) |
| T-TUP-E-01 | P0 | 양자화 후 색 수 33 이상 | 게이트로 회수 + 로그 |
| T-TUP-E-02 | P1 | frame_split 시 atlas json 좌표 오프셋 | 단위 테스트 16 케이스 |
| T-TUP-P-01 | P1 | 1종 처리 wall-clock | ≤ 30초 (touchup 4단 합) |
| T-TUP-V-01 | P0 | 양자화 전후 시각 회귀 | SSIM ≥ 0.92 (의도 손실 허용) |
| T-TUP-V-02 | P0 | outline 전후 16×16 축소 비교 | 실루엣 정답률 ≥ 90% |
| T-TUP-V-03 | P1 | Aseprite 수동 정정 후 자동 재실행 시 | idempotent (2회 실행 결과 동일) |
| T-TUP-C-01 | P1 | touchup_auto → 휴먼 → touchup_final 인계 | 디렉토리 구조 SSOT 준수 |
| T-TUP-S-05 | P1 | 팔레트 JSON sidecar 작성 | 색 hex 16/24/32 정렬 / 중복 0 |
| T-TUP-E-03 | P2 | 의존 모듈(rembg) 버전 핀 미일치 | CI 차단 + 버전 표시 |

### 3.5 ⑤ gate — 라이선스·품질 검증 (15 케이스, **최우선**)

| ID | 우선 | Given-When-Then 요약 | 단언 |
|----|------|---------------------|------|
| T-GAT-S-01 | P0 | license_check 5종 정규식 통과 | 침해 의심 0 / 정규식 5/5 적용 |
| T-GAT-S-02 | P0 | palette_audit | tier별 색 수 위반 0 |
| T-GAT-S-03 | P0 | pixel_diff (AI 원본 vs 최종) | 변경 ≥ 60% (가공 의무) |
| T-GAT-S-04 | P0 | silhouette 16×16 축소 식별 | 휴먼 4명 정답률 ≥ 90% |
| T-GAT-S-05 | P0 | reverse_search Google Lens | 유사도 ≥ 80% **0건** |
| T-GAT-B-01 | P1 | pixel_diff 59% 경계값 | 차단 + 메시지 명시 |
| T-GAT-B-02 | P1 | reverse_search 79.9% / 80.0% 경계 | 80.0%부터 차단 |
| T-GAT-E-01 | P0 | gate 우회 시도 (메타 위조) | 해시 서명 검증 실패 → 차단 (이소화 🔴 4선) |
| T-GAT-E-02 | P0 | reverse_search API 다운 | **fail-closed** (정책: 차단 / 통과 X) |
| T-GAT-P-01 | P1 | 60종 배치 게이트 총 시간 | ≤ 60분 (reverse_search 월 $50 한도 内) |
| T-GAT-X-01 | P0 | 게이트 산출 `gate_summary.json` | 서명 + immutable / 변조 시 CI 차단 |
| T-GAT-X-02 | P0 | gate 통과 없이 client/public 직접 push | 차단 (CODEOWNERS + Husky) |
| T-GAT-V-01 | P1 | 게이트 통과 60종 시각 회귀 | SSIM ≥ 0.95 baseline |
| T-GAT-C-01 | P1 | gate 결과 → 정경패 PRD KPI 자동 갱신 | `prd_*.md §5` 표 자동 PR |
| T-GAT-S-06 | P0 | MVP 60종 종합 통과율 | **100%** — 1건 실패 시 Ship 불가 |

---

## 4. 라이선스 안전성 검증 (특별 회차 — 토픽 핵심)

> 본 스프린트의 명운이 달린 전선이옵니다. **모델·LoRA·프롬프트·산출물·역추적** 다섯 축을 모두 봉쇄.

| ID | 우선 | 검증 항목 | 합격 기준 | 도구 |
|----|------|----------|----------|------|
| T-LIC-01 | P0 | Firefly 상업 이용 약관 명시 메타 기록 | `meta.license = "adobe-firefly-commercial"` | sidecar 검사 |
| T-LIC-02 | P0 | SDXL 모델 체크포인트 라이선스 (CreativeML OpenRAIL-M) | 허용 + LoRA 출처 URL | 정규식 |
| T-LIC-03 | P0 | LoRA 출처 — Civitai/HuggingFace 메타 부착 | URL + 작성자 + 라이선스 3축 | 정규식 |
| T-LIC-04 | P0 | 프롬프트에 작가명 직접 호명 (`by <artist>`) | **0매치** | 정규식 (이소화 §C7) |
| T-LIC-05 | P0 | 프롬프트에 IP 캐릭터명 (Pokemon/디즈니/스튜디오 지브리 등) | **0매치** | 사전 100단어 |
| T-LIC-06 | P0 | reverse_search 유사도 ≥ 80% (Google Lens) | **0건** | reverse_search.ts |
| T-LIC-07 | P1 | reverse_search 유사도 60~79% (수동 검토 큐) | 큐 ≤ 5건 / 100종 | 휴먼 |
| T-LIC-08 | P0 | AI 원본 90일 보존 (정경패 §6.4) | S3 라이프사이클 정책 + Glacier 1년 | 운영 검증 |
| T-LIC-09 | P0 | gate 우회/메타 위조 (이소화 🔴 4선) | 해시 서명 실패 시 차단 | gate 자체 |
| T-LIC-10 | P1 | 외부 PR 신규 LoRA 추가 | `@security` 승인 필수 | CODEOWNERS |
| T-LIC-11 | P1 | 분기별 라이선스 재감사 (90일) | 자동 cron 트리거 | 운영 |
| T-LIC-12 | P0 | VPAT/법무 자문 로그 백업 | 90일 보존 + WORM | 운영 |

> **합격선**: 12 케이스 100% 통과. 단 1건이라도 P0 실패 시 백능파·이소화 동시 보고 후 HOLD.

---

## 5. AI 생성 → 터치업 워크플로우 회귀 (E2E)

| 단계 | 입력 | 자동 검증 | 휴먼 검증 |
|------|------|----------|----------|
| ①→② catalog → tier-tokens | id 1건 | 토큰 5축 매핑 | — |
| ②→③ tier-tokens → generate | tier + region | 프롬프트 합성 정합 | — |
| ③ generate | provider 호출 | meta sidecar 6필드 | 1차 시각 검수 (가춘운) |
| ③→④ generate → touchup | ai_raw png | rembg/quantize/outline/frame_split | Aseprite 수동 정정 |
| ④→⑤ touchup → gate | touchup_final | 5 게이트 전수 | — |
| ⑤→client | gate 통과 | 디렉토리 배포 | 인게임 스폰 회귀 (E2E 6 씬) |

**E2E 시나리오**:
1. T-E2E-01 (P0): 일반 몬스터 1종 신규 생성 → 인게임 ATB 전투에서 정상 스폰
2. T-E2E-02 (P0): 엘리트 1종 → 회피·발광 rim 적용 확인
3. T-E2E-03 (P0): 보스 1종 → 64px + 파티클 idle 적용 확인
4. T-E2E-04 (P0): 라이선스 침해 의심 1종 의도 주입 → 게이트가 차단하는지
5. T-E2E-05 (P1): 60종 배치 — 1종 실패 시 나머지 진행 + 실패 보고
6. T-E2E-06 (P1): 90일 경과 AI 원본 자동 Glacier 이관 검증

---

## 6. MVP 60종 통과율 & 헬스 스코어

| 단계 | 통과율 임계 | 헬스 점수 환산 |
|------|------------|---------------|
| Build Day 3 PoC | ≥ 5종 통과 | 50/100 (착수 OK) |
| Build Day 7 | ≥ 30종 통과 | 70/100 (절반 돌파) |
| Build Day 14 | **60종 100%** | **90/100** (Ship 게이트 진입) |
| Test Day 18 | 60종 100% + E2E 6 PASS | **95/100** (Ship 가능) |

**헬스 스코어 산식** (10항 가중 평균):
```
score = 0.20·D1 + 0.10·D2 + 0.15·D3 + 0.10·D4 + 0.10·D5
      + 0.10·D6 + 0.05·D7 + 0.10·D8 + 0.05·D9 + 0.05·D10
```
> ≥ 90 → Ship 권장 / 80~89 → 조건부 Ship (잔존 P1 명시) / < 80 → HOLD.

---

## 7. 자동화 vs 수동 분담

| 영역 | 자동 | 수동 |
|------|------|------|
| catalog 정합성 | ✅ 100% (schema) | — |
| tier 토큰 회귀 | ✅ 90% | 가춘운 1차 시각 검수 |
| generate provider | ✅ 80% | 가춘운 프롬프트 튜닝 |
| touchup 4단 | ✅ 70% | Aseprite 픽셀 정정 (작가 시간 ≤ 15분/종) |
| 라이선스 게이트 | ✅ 95% | 이소화 분기별 재감사 |
| 시각 회귀 | ✅ SSIM | 휴먼 4명 더블블라인드 (실루엣 1회) |
| E2E 인게임 | ✅ Playwright | — |

---

## 8. 리스크 & 엣지 케이스

| # | 리스크 | 대응 |
|---|-------|------|
| R1 | reverse_search API 한도 초과 ($50/월) | fail-closed + 큐잉 + 대표 승인 후 한도 증액 |
| R2 | Firefly 정책 변경 (상업 이용 제한) | SDXL 폴백 / 즉시 백능파 보고 |
| R3 | Aseprite 휴먼 작업 병목 (60종 × 15분 = 15시간) | 병렬 2인 + 우선순위 보스/엘리트 우선 |
| R4 | Tier 토큰 코드 ⇄ 디자인 표 드리프트 | 단위 테스트 D2 + CI 차단 |
| R5 | gate 우회 PR (메타 위조) | 해시 서명 + CODEOWNERS 이중 |
| R6 | 60종 일정 지연 시 100% 게이트 | MVP 30종 부분 출시 검토 (백능파 결정) |
| R7 | 색맹 4모드 호환 누락 | 가춘운 §10 토큰이 a11y palette 자동 상속하는지 회귀 |
| R8 | 보존 정책 위반 (90일 초과 잔존) | 운영 cron + 알람 |

---

## 9. 인계 체크리스트 (Build·Test 단계)

**Build 단계 (계섬월 시니어 엔지니어 인계)**:
- [ ] 5 격자 스켈레톤 17 신설 파일 PR (두련사 §3.2 목록)
- [ ] T-TKN/T-CAT 단위 테스트 PoC Day 3
- [ ] gate 5종 mock 통과 Day 7
- [ ] MVP 60종 배치 Day 14
- [ ] CI 워크플로우 `monster-art-pipeline.yml` 등록

**Test 단계 (적경홍 직접 지휘)**:
- [ ] T-LIC 12 케이스 전수 회차 (라이선스 특별)
- [ ] T-E2E 6 시나리오 자동화 + Playwright 비디오 보존
- [ ] 휴먼 실루엣 더블블라인드 (가춘운/진채봉/이소화/대표)
- [ ] `gate_summary.json` 첨부 PR 발행
- [ ] 헬스 스코어 ≥ 90 → 진채봉(릴리스 노트) 인계

**Ship 단계 (백능파 결재)**:
- [ ] 헬스 스코어 95 보고
- [ ] 잔존 P1/P2 5건 이내 명시
- [ ] /canary 60종 1차 배포 + /benchmark
- [ ] 24시간 모니터링 후 잔여 100종 후속 스프린트 진입

---

## 10. 부록 A — 게이트 통과 보고 양식

```
[몬스터 아트 파이프라인 / Test 게이트 보고]
일자: 2026-MM-DD
대상: MVP 60종 (챕터 1·2)

D1 카탈로그       : ✅ 60/60
D2 토큰 SSOT      : ✅ diff 0
D3 라이선스       : ✅ 침해 0 / reverse 0
D4 팔레트         : ✅ 위반 0
D5 픽셀 diff      : ✅ 60/60 ≥60%
D6 실루엣         : ✅ 정답률 92.3%
D7 애니 시트      : ✅ 240/240 프레임
D8 종합 통과율    : ✅ 60/60 (100%)
D9 보안 🔴 잔존   : ✅ 0건
D10 SSIM          : ✅ 평균 0.961

헬스 스코어: 95.4 / 100
판정: SHIP 가능 (조건 없음)
잔존: P1 3건 (성능 튜닝 후속), P2 2건 (인계 문서)
```

---

## 부록 B — 인용 SSOT

- 두련사 5격자: `plan_monster-art-pipeline-architecture.md`
- 정경패 PRD: `prd_monster-art-pipeline.md` (MVP 60종 / KPI / 미정 4건 결정)
- 가춘운 디자인: `design-system_monster-art-pipeline.md` (Tier 토큰 5축 / DESIGN.md §10)
- 이소화 보안: `security-checklist_monster-art-pipeline.md` (47항목 / 🔴 24건)
- 백능파 결정: HOLD — MVP 60종 / 도감 UI 분리 / 90일 보존
- 토픽 SSOT: `launch_checklist.md §몬스터 다양성`

---

> **보고드립니다.** 작전 명령서 봉인 완료. 진(陣)이 굳었으니 Build 단계로 돌격을 명하셔도 무방하옵니다. 전선 이상 무!
> — 적경홍 拜
