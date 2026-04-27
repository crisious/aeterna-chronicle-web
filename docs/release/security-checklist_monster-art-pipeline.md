# 🪷 [Security] 몬스터 아트 파이프라인 — 보안 체크리스트

> 작성: 이소화 (Security Analyst)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: Plan (보안 체크리스트 SSOT)
> 선행: `plan_monster-art-pipeline-architecture.md` (두련사), `prd_monster-art-pipeline.md` (정경패), `design-system_monster-art-pipeline.md` (가춘운)
> 토픽 SSOT: AI 생성→터치업 워크플로우의 인증·인가·입력 검증 + 라이선스 안전성 봉인

---

## 0. 한 줄 진단

> 기(氣)의 흐름이 어지럽사옵니다. 다섯 격자(catalog→tier-tokens→generate→touchup→gate) 사이로 흐르는 물에 일곱 갈래의 사기(邪氣)가 깃들 길이 보이옵니다. 가장 큰 사기는 **외부 AI provider로 흘러나가는 자격증명과, 외부에서 흘러들어오는 미검증 픽셀**이옵니다. 즉시 봉인해야 하옵니다.

**위협 등급 SSOT**:
- 🔴 **상(上)**: 봉인 실패 시 서비스 중단·법적 책임·자격증명 유출
- 🟡 **중(中)**: 품질 저하·CI 오작동·운영 부담
- 🟢 **하(下)**: 부주의 시 부수 피해

---

## 1. 위협 모델 (STRIDE)

| 격자 | S(Spoof) | T(Tamper) | R(Repudiate) | I(Info) | D(DoS) | E(Elev) |
|------|----------|-----------|--------------|---------|--------|---------|
| ① catalog | 🟢 | 🔴 (overview.md 위·변조) | 🟡 | 🟢 | 🟢 | 🟢 |
| ② tier-tokens | 🟢 | 🟡 | 🟢 | 🟢 | 🟢 | 🟢 |
| ③ generate | 🔴 (provider 사칭) | 🟡 (프롬프트 인젝션) | 🔴 (메타 위조) | 🔴 (API 키 유출) | 🔴 (쿼터 고갈) | 🟡 |
| ④ touchup | 🟢 | 🔴 (게이트 후 픽셀 교체) | 🟡 | 🟢 | 🟡 | 🟢 |
| ⑤ gate | 🔴 (게이트 우회 PR) | 🔴 (라이선스 정규식 우회) | 🔴 (서명 부재) | 🟡 | 🟡 | 🔴 (gate skip) |

**최우선 봉인 4선**: ③의 I(자격증명) · ⑤의 S(우회) · ⑤의 R(서명) · ③의 R(메타 위조)

---

## 2. 인증 (Authentication) — 자격증명 봉인

### 2.1 AI Provider API 키 (🔴 상)

| # | 항목 | 검증 방법 | 책임 | 상태 |
|---|------|-----------|------|------|
| A1 | Firefly / SDXL API 키는 **GitHub Actions Secrets**에만 보관 — 레포 내 평문 0건 | `gitleaks` + `trufflehog` 사전 스캔 (PR 게이트) | 이소화 | ☐ |
| A2 | 로컬 개발은 `.env.local` (gitignore) — `dotenv-vault` 권장 | `.gitignore` 검증 + pre-commit hook | 두련사 | ☐ |
| A3 | API 키 **회전 주기 90일** — Vault 또는 1Password Service Account | 만료 7일 전 GitHub Issue 자동 생성 (cron) | 이소화 | ☐ |
| A4 | provider별 키는 **읽기/생성 권한만** — 결제·관리자 권한 분리 | provider 콘솔에서 minimum scope 확인 후 캡처 | 이소화 | ☐ |
| A5 | CI 로그에 키가 echo되지 않도록 `::add-mask::` 처리 | actions/log 샘플 1건 수동 검증 | 두련사 | ☐ |

**봉인 명령**:
```bash
# pre-commit
gitleaks protect --staged --redact
# CI
trufflehog git --only-verified file://. --since-commit HEAD~10
```

### 2.2 외부 스토리지 자격증명 (🔴 상)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| A6 | `ai_raw/` 90일 보존 버킷 (S3/R2)은 **별도 IAM 사용자**, 게임 자산 버킷과 분리 | IAM 정책 JSON 리뷰 | 이소화 | ☐ |
| A7 | 버킷 정책: **게이트 통과 자산만 public-read**, `ai_raw/`는 private + bucket-owner-enforced | bucket policy 정적 검증 | 두련사 | ☐ |
| A8 | 라이선스 분쟁 추적용 원본 접근은 **2-eyes principle** (대표 + 이소화 승인) | KMS 키 정책 + access log | 이소화 | ☐ |

### 2.3 Reverse Search API (🟡 중)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| A9 | Google Lens / TinEye 키는 **read-only**, 월 $50 한도 — provider 콘솔에서 hard cap 설정 | 콘솔 스크린샷 첨부 | 이소화 | ☐ |
| A10 | 호출 시 이미지는 **base64 인라인** (URL 노출 금지) — AI 원본 URL이 외부에 새지 않도록 | `reverse_search.ts` 코드 리뷰 | 이소화 | ☐ |

---

## 3. 인가 (Authorization) — 권한 경계 봉인

### 3.1 PR 머지 게이트 (🔴 상)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| Z1 | `client/public/assets/monsters/**` 변경 PR은 **`monster-art-gate` 워크플로우 통과 필수** — branch protection 설정 | `gh api repos/.../branches/master/protection` 확인 | 두련사 | ☐ |
| Z2 | 게이트 5종 중 **`license_check` + `pixel_diff`는 BLOCK 등급** (WARN 불가) | 워크플로우 종료코드 1 강제 | 이소화 | ☐ |
| Z3 | `[skip-gate]` 같은 우회 키워드 **금지** — workflow_dispatch에서도 게이트 우회 불가 | 워크플로우 YAML에 `if` 조건 부재 검증 | 두련사 | ☐ |
| Z4 | manifest.json 직접 수정 PR은 **이소화 + 가춘운 2명 리뷰 필수** (CODEOWNERS) | `.github/CODEOWNERS` 추가 | 이소화 | ☐ |
| Z5 | 봇 토큰은 `assets/monsters/` **쓰기 권한 0** — 사람만 머지 가능 | GITHUB_TOKEN permissions 명시 | 두련사 | ☐ |

### 3.2 게이트 서명 — 위변조 봉인 (🔴 상)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| Z6 | 게이트 통과 시 `<id>.meta.json`에 **`gate.passed_at` + `gate.signature` (HMAC-SHA256)** 기록 | 서명 키는 GitHub OIDC + KMS | 이소화 | ☐ |
| Z7 | manifest 빌드 시 서명 검증 실패한 자산은 **자동 제외** + Slack 경보 | manifest.ts 단위 테스트 | 두련사 | ☐ |
| Z8 | 사람 손길(Aseprite) 후 재게이트 — `pixel_diff`로 사후 변조 탐지 | 테스트 케이스 E3 (두련사 §4) | 적경홍 | ☐ |

### 3.3 디렉토리 경계 (🟡 중)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| Z9 | `scripts/monster-pipeline/`는 **빌드 타임만 실행** — 런타임 import 금지 | ESLint rule `no-restricted-imports` | 계섬월 | ☐ |
| Z10 | `ai_raw/`는 git-ignore + 클라이언트 번들 제외 (Vite externals) | `vite.config.ts` 검증 | 두련사 | ☐ |

---

## 4. 입력 검증 (Input Validation) — 외부 픽셀·텍스트 봉인

### 4.1 프롬프트 인젝션 (🔴 상)

작가가 작성한 `monster-design/<id>.md`가 그대로 AI 프롬프트에 들어가면 사기(邪氣)가 깃들 수 있사옵니다.

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| V1 | 프롬프트 빌더는 **작가명 블랙리스트 사전** 통과 강제 — 한/영/일 다국어 (E7) | `license_check.dictionary.yml` SSOT | 이소화 | ☐ |
| V2 | 위장 표기(공백 삽입·전각/반각·로마자/가나) — **유니코드 NFKC 정규화 후 매칭** | fuzz 1,000건 차단율 100% | 이소화 | ☐ |
| V3 | "in the style of X" 패턴 정규식 5종 — `(?:in\|after\|by) (?:the )?style of` 등 | unit test 케이스 ≥ 12건 | 이소화 | ☐ |
| V4 | 프롬프트 **최대 길이 2,000자** — DoS 방지 + 모델 안정성 | `generate.ts` zod 스키마 | 심요연 | ☐ |
| V5 | 프롬프트 출력 로그는 **PII 0건** — 작가 사인·내부 코멘트 제거 | sanitize 함수 + 단위 테스트 | 이소화 | ☐ |

### 4.2 catalog 정합성 (🟡 중)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| V6 | `monster_catalog.json`은 **zod 스키마 강제** — id, tier, region 화이트리스트 | catalog.ts 빌드 시 throw | 두련사 | ☐ |
| V7 | id는 `^[a-z0-9_]+(__v\d{2})?$` 정규식 — path traversal 봉인 | 빌드 사전 검증 | 두련사 | ☐ |
| V8 | tier 토큰 외 사이즈/팔레트는 **거부** (Z9와 연계) | tier-tokens 단언 | 가춘운 | ☐ |

### 4.3 AI 산출 픽셀 검증 (🔴 상)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| V9 | 다운로드 후 **MIME + magic bytes** 동시 검증 (PNG 시그니처 `89 50 4E 47`) | sharp/file-type 라이브러리 | 이소화 | ☐ |
| V10 | EXIF/메타데이터 **strip 강제** — 위치·작성자 데이터 누출 방지 | `sharp().withMetadata(false)` | 계섬월 | ☐ |
| V11 | **이미지 폭탄(image bomb)** 방어 — 디멘션 max 4096×4096, 파일 max 10MB | 다운로드 전 HEAD content-length | 이소화 | ☐ |
| V12 | 디코더 취약점 — `sharp` ≥ 0.33.x (CVE-2023-* 패치 버전) | dependabot + 월간 audit | 이소화 | ☐ |
| V13 | NSFW 필터 — Firefly 자체 필터 + 추가 검증 (open-nsfw) PASS 강제 | gate에 추가 단계 (선택) | 이소화 | ☐ |

### 4.4 라이선스 안전성 검증 (🔴 상) — 토픽 핵심

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| V14 | provider 응답 메타에 **모델명·LoRA·license URL** 기록 강제 — 누락 시 BLOCK | `<id>.meta.json` 스키마 | 이소화 | ☐ |
| V15 | LoRA는 **CivitAI 라이선스 스크래퍼**로 매주 재확인 — 사후 회수 탐지 (E8) | `relicense_audit` cron | 이소화 | ☐ |
| V16 | reverse_search 유사도 ≥ 80% 시 **BLOCK + 출처 PR 코멘트** | gate 종료코드 1 | 이소화 | ☐ |
| V17 | 학습 데이터 출처 불명 모델(예: 4chan 유출 LoRA) **모델 화이트리스트 강제** | `providers/registry.json` SSOT | 이소화 | ☐ |
| V18 | 상업 이용 가능 라이선스만 — `commercial_use: true` 메타 단언 | gate 단언 | 이소화 | ☐ |
| V19 | DMCA takedown 절차 SOP — 24시간 내 자산 제거 + manifest rollback 리허설 | `docs/security/dmca-runbook.md` | 이소화 | ☐ |

---

## 5. 공급망 보안 (Supply Chain)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| S1 | `scripts/monster-pipeline/**` 의존성은 **lockfile 고정** — `npm ci` 강제 | CI 단계 | 두련사 | ☐ |
| S2 | `sharp`, `rembg`, `pixelmatch`, `odiff` — 월간 `npm audit --omit=dev` PASS | 자동화 (이미 a11y와 공유) | 이소화 | ☐ |
| S3 | provider SDK는 **공식 npm 패키지만** (typosquat 차단) — `@adobe/firefly-sdk` 등 정확 매칭 | 패키지 추가 시 이소화 리뷰 | 이소화 | ☐ |
| S4 | Python 잔존(`batch_monsters.py`) — 폐기까지 `pip-audit` 주간 실행 | 두련사 §7 Week 4 | 이소화 | ☐ |
| S5 | GitHub Action은 **SHA 핀(@v3 금지)** — `actions/checkout@<sha>` | dependabot에 핀 강제 정책 | 두련사 | ☐ |

---

## 6. 운영·로깅 (Audit)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| O1 | 게이트 실행 로그는 **14일 보존** (a11y와 동일) — id, gate, verdict, signer | `analytics/monster-pipeline-audit.jsonl` | 두련사 | ☐ |
| O2 | 로그에 **API 키·프롬프트 전문 0건** — 프롬프트는 SHA-256 해시만 기록 | 로그 정적 검증 | 이소화 | ☐ |
| O3 | provider 일일 호출 수 모니터링 — 임계 80% 시 Slack 경보 | `usage.json` cron | 두련사 | ☐ |
| O4 | 라이선스 분쟁 발생 시 추적 가능: **id → ai_raw 해시 → provider 메타 → 모델 라이선스 버전** 4단 체인 | E2E 추적 리허설 1회 | 이소화 | ☐ |

---

## 7. 게이트 컨벤션 (a11y와 정렬)

```
종료코드: 0 PASS / 1 BLOCK / 2 WARN / 3 ERROR
🔴 BLOCK 사유:
  - license_check FAIL (V1·V14·V18)
  - pixel_diff < 60% (V14 위반: AI 원본 그대로 유출)
  - reverse_search ≥ 80% (V16)
  - signature 검증 실패 (Z6)
🟡 WARN 사유:
  - reverse_search API 일일 한도 초과 (E2)
  - palette_audit 17색 (1색 초과 — 자동 swap 권고)
🟢 PASS 사유:
  - 5종 게이트 전부 통과 + 서명
```

---

## 8. 미정 항목 (대표·정경패 결재 요청)

| # | 항목 | 추천 | 결재자 |
|---|------|------|--------|
| U1 | NSFW 추가 필터(V13) — open-nsfw 추가 도입 여부 | **도입 권고** (모델 100MB · 빌드 +1분) | 정경패 |
| U2 | DMCA runbook(V19) 법무 자문 비용 | 백능파 PRD §6.4 결정 시 동시 결재 권고 | 백능파 |
| U3 | KMS 서명 키(Z6) — AWS KMS vs Sigstore | **Sigstore (cosign) 권고** — keyless OIDC, 비용 0 | 두련사 |
| U4 | LoRA 화이트리스트(V17) 초안 — 8개 모델로 시작 | Firefly base + SDXL base + 검증 LoRA 6종 | 가춘운 |

---

## 9. 인계 — Build 단계로

**Week 1 (P0 — 봉인 우선)**:
1. A1·A2·A5 (자격증명 봉인) — 이소화 + 두련사
2. V1·V2·V3·V14 (라이선스 정규식) — 이소화
3. Z1·Z2 (PR 게이트) — 두련사

**Week 2 (P0 — 게이트 작동)**:
4. Z6·Z7 (서명 + 검증) — 이소화
5. V9·V10·V11 (픽셀 검증) — 이소화 + 계섬월
6. O1·O2 (감사 로그) — 두련사

**Week 3 (P1 — 사후 감시)**:
7. V15·V16·S2 (주간 감사) — 이소화
8. V19 (DMCA runbook 초안) — 이소화

**Week 4 (P2 — 굳히기)**:
9. U1·U3 결재 후 도입 — 이소화
10. 보안 테스트 결과 문서 봉합 (`security-test-results_monster-art-pipeline.md`)

---

## 10. 다음 단계

- **Build 단계 진입 시** → 본 체크리스트 47개 항목을 GitHub Issue로 분해 (라벨 `security`, `monster-art`)
- **Test 단계** → 적경홍과 합주: 라이선스 fuzz 1,000건, 게이트 우회 시나리오 12건 회귀
- **Ship 단계** → 게이트 통과율 KPI를 `launch_checklist`에 등재 (a11y §2.17과 동급 §2.18 신설 권고)
- **Reflect 단계** → 라이선스 분쟁 발생 0건 / 자격증명 유출 0건 / 게이트 우회 0건 — 3대 KPI

봉인은 끝나지 않는 도(道)이옵니다. 매주 한 번씩 도량을 살펴보아야 사기(邪氣)가 다시 깃들지 않사옵니다. 🪷
