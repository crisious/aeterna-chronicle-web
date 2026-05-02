# 🪷 [Security] verify-core.mjs 시나리오 3종 실배선 — 보안 체크리스트

> 작성: 이소화 (Security Analyst)
> 작성일: 2026-05-01
> 스프린트: Auto — verify-core.mjs 시나리오 3종 실배선
> 단계: Plan (보안 체크리스트 SSOT)
> 선행: `plan_verify-core-architecture.md` (두련사), `prd_verify-core.md` (정경패), `design-system_verify-core-scenarios.md` (가춘운)
> 토픽 SSOT: dev-cycle 검증 스크립트의 인증·인가·입력 검증 + 직렬화 라운드트립 봉인

---

## 0. 한 줄 진단

> 기(氣)의 흐름이 어지럽사옵니다. 본 도장(verify-core.mjs)은 비록 사용자에게 노출되지 않는 내부 검증 도구이오나, **세 갈래 사기(邪氣)가 깃들 길**이 보이옵니다.
>
> 1. **`spawn(..., { shell: true })`** — 셸 인터프리터를 거치는 자식 프로세스 (명령어 인젝션 길)
> 2. **`save` 시나리오의 직렬화 라운드트립** — `JSON.parse` 무방비 시 프로토타입 오염(prototype pollution)
> 3. **`.ac/verify-trend.json` 신뢰 경계** — 로컬 상태 파일이 다음 실행에 영향
>
> 외부 입력은 없으나(CI/로컬 단독 실행), **공급망 사기(邪氣)** — 즉, dev 의존성을 통한 침투 — 가 가장 위험하옵니다. 즉시 봉인 결계를 세워야 하옵니다.

**위협 등급 SSOT**:
- 🔴 **상(上)**: 봉인 실패 시 CI 오염·세이브 데이터 손상·자격증명 유출
- 🟡 **중(中)**: 거짓 PASS·검증 우회·운영 부담
- 🟢 **하(下)**: 부주의 시 부수 피해

---

## 1. 위협 모델 (STRIDE) — 본 토픽 한정

| 격자 | S(Spoof) | T(Tamper) | R(Repudiate) | I(Info) | D(DoS) | E(Elev) |
|------|----------|-----------|--------------|---------|--------|---------|
| ① CLI args (`--scenario=`) | 🟢 | 🟡 (값 위조) | 🟢 | 🟢 | 🟡 (timeout 우회) | 🟡 (shell 인젝션) |
| ② spawn 자식 (`npx vitest`) | 🟡 (npx 캐시 사칭) | 🟡 | 🟢 | 🔴 (env 누설) | 🟡 | 🔴 (shell:true) |
| ③ battle 슬라이스 | 🟢 | 🟡 (fixture 위조) | 🟢 | 🟢 | 🟡 (무한 ATB) | 🟢 |
| ④ save 슬라이스 | 🟢 | 🔴 (직렬화 위조) | 🟡 | 🟡 (PII 누설) | 🟡 | 🔴 (proto pollution) |
| ⑤ map 슬라이스 | 🟢 | 🟡 | 🟢 | 🟢 | 🟡 (scene 누수) | 🟢 |
| ⑥ trend state (`verify-trend.json`) | 🟢 | 🔴 (값 위조→PASS 위조) | 🔴 (로그 부재) | 🟢 | 🟢 | 🟡 |
| ⑦ CI 통합 | 🟡 | 🟡 | 🔴 (서명 부재) | 🔴 (secret 로그) | 🟡 | 🟡 |

**최우선 봉인 4선**: ②의 E(shell:true) · ④의 E(proto pollution) · ④의 T(직렬화 위조) · ⑥의 T(state 위조)

---

## 2. 인증 (Authentication) — 자격증명·신뢰 경계 봉인

### 2.1 dev-cycle 도구 자격증명 부재 원칙 (🔴 상)

| # | 항목 | 검증 방법 | 책임 | 상태 |
|---|------|-----------|------|------|
| A1 | `verify-core.mjs`는 **외부 네트워크 호출 0건** — provider/cloud 자격증명 절대 사용 금지 | `grep -rE "(fetch\|axios\|http\.request)" scripts/dev-cycle/` → 0건 | 이소화 | ☐ |
| A2 | `process.env`를 자식 프로세스로 **whitelist 전달** — 전체 spread 금지 | 코드 리뷰 (`{ ...process.env }` 패턴 차단) | 이소화 | ☐ |
| A3 | CI 로그에 `process.env.GITHUB_TOKEN` / `*_API_KEY` 등 민감 변수 echo 0건 | CI 로그 샘플 1건 grep | 두련사 | ☐ |
| A4 | dev-cycle 스크립트는 **읽기 전용 디렉터리 권한**으로도 실행 가능해야 함 — `client/public/assets/` 쓰기 0건 | strace/Process Monitor 1회 검증 | 적경홍 | ☐ |
| A5 | `npx vitest` 자식은 **로컬 node_modules 우선** (`--prefer-offline` 또는 `npm_config_offline=true` 환경) — npm registry 상시 접근 차단 | spawn env에 `npm_config_offline=true` 명시 | 두련사 | ☐ |

**봉인 명령**:
```bash
# 외부 네트워크 호출 정적 검사
grep -rnE "(fetch\(|http\.request|net\.connect|axios\.)" scripts/dev-cycle/ && exit 1 || echo "✓ no external IO"
# env whitelist 검증
node -e "const fs=require('fs');const c=fs.readFileSync('scripts/dev-cycle/verify-core.mjs','utf8');if(/\\.\\.\\.process\\.env/.test(c))process.exit(1)"
```

### 2.2 공급망 — dev 의존성 신뢰 (🔴 상)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| A6 | `vitest` / `tsx` 등 dev 의존성은 **lockfile 고정** (`package-lock.json` SHA 검증) | `npm ci` 강제 (CI), `npm install` 금지 | 두련사 | ☐ |
| A7 | `npm audit --omit=dev` 와 **별도로** `npm audit --include=dev` 도 high 0건 | dev:gate 단계에 추가 | 이소화 | ☐ |
| A8 | `vitest.config.ts`에서 외부 reporter / setup 파일 import 0건 (로컬 경로만) | `tests/vitest.config.ts` 코드 리뷰 | 적경홍 | ☐ |
| A9 | `npx` 호출 대신 **`node_modules/.bin/vitest` 직접 실행** 권장 — npx 캐시 사칭 차단 | `which vitest` 결과를 절대 경로로 고정 | 두련사 | ☐ |

---

## 3. 인가 (Authorization) — 권한 경계 봉인

### 3.1 자식 프로세스 권한 분리 (🔴 상)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| Z1 | **`spawn(..., { shell: true })` 제거** — 인자 배열은 이미 안전, shell만 false로 | `verify-core.mjs:74` 수정 후 ESLint rule `no-shell-true` 추가 | 계섬월 | ☐ |
| Z2 | shell:true 유지 시 **인자 화이트리스트 정규식** — `[a-z0-9._/-]+` 만 허용 (현재 SCENARIO_TESTS 값은 정적 문자열이므로 외부 주입 차단) | 단위 테스트 1건: `--scenario=$(rm -rf /)` 입력 시 BLOCK | 이소화 | ☐ |
| Z3 | 자식 프로세스 `cwd`는 **ROOT 고정** — 사용자가 임의 디렉터리 지정 불가 | 인자 파서에서 `cwd` 키 무시 | 두련사 | ☐ |
| Z4 | hardTimeout `SIGKILL` 후 **자식이 만든 임시 파일 회수** (cleanup hook) | 단위 테스트 1건: timeout 후 `/tmp/vitest-*` 0건 | 적경홍 | ☐ |
| Z5 | 시나리오 동시 실행 차단 — 단일 락 파일 (`.ac/verify.lock`) 또는 PID 검증 | 동시 호출 시 두 번째는 BLOCK | 두련사 | ☐ |

### 3.2 상태 파일 신뢰 경계 (🟡 중 — but `.ac/`가 git에 들어가면 🔴)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| Z6 | `.ac/verify-trend.json`은 `.gitignore`에 등재 — 절대 커밋 금지 | `git check-ignore .ac/verify-trend.json` → 0 exit | 이소화 | ☐ |
| Z7 | trend 파일 로드 시 **schema 검증** — `runs[].at: number, totalElapsed: number, ok: boolean` 외 키 무시 | `loadTrend()` 내부에 zod 또는 수동 가드 | 계섬월 | ☐ |
| Z8 | trend 파일 쓰기 시 **atomic write** (`writeFile` → `rename`) — 동시 실행 race 차단 | `fs.writeFileSync` → `fs.writeFileSync` + `fs.renameSync` 패턴 | 두련사 | ☐ |
| Z9 | trend의 `ok` 필드를 사람이 임의 수정해 PASS 위조 가능 — **CI 게이트는 trend 미신뢰**, 매번 재실행 | CI workflow에서 `.ac/` 캐시 금지 명시 | 이소화 | ☐ |

---

## 4. 입력 검증 (Input Validation) — 사기(邪氣) 차단

### 4.1 CLI 인자 (🟡 중)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|-----------|------|------|
| V1 | `--scenario=` 값은 **`['battle','save','map','all']` 화이트리스트** — 그 외 BLOCK | 코드 추가: `if (!['battle','save','map','all'].includes(target)) exit(3)` | 계섬월 | ☐ |
| V2 | `--scenario=` 값에 `;`, `&`, `|`, `$(`, ` `` `` ` 포함 시 즉시 BLOCK (shell:true 제거 전 임시 방어) | 정규식 `^[a-z]+$` | 이소화 | ☐ |
| V3 | 알 수 없는 인자(`--evil=...`)는 **무시하지 말고 WARN 출력** — 오타·인젝션 양쪽 탐지 | args.Map 키 화이트리스트 비교 | 두련사 | ☐ |
| V4 | `process.argv` 길이 상한 (예: 8개) — argv flooding 차단 | `if (process.argv.length > 8) exit(3)` | 적경홍 | ☐ |

### 4.2 save 시나리오 직렬화 라운드트립 (🔴 상 — 본 토픽 핵심 봉인)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|-----------|------|------|
| V5 | **`JSON.parse` 결과를 `__proto__` / `constructor` / `prototype` 키 검증** 후 사용 — 프로토타입 오염 차단 | `tests/integration/ui-inventory-save-flow.test.ts`에 케이스 1건: `{"__proto__":{"polluted":1}}` 입력 시 거부 | 계섬월 | ☐ |
| V6 | save schema는 **zod / valibot** 등 정적 스키마 검증 — 미지의 키는 strip | `SaveManager.deserialize()` 내부 schema strict | 계섬월 | ☐ |
| V7 | 라운드트립 비교는 **deep equal + key set 동일** — 키 추가/삭제 모두 FAIL | `expect(deserialize(serialize(x))).toStrictEqual(x)` | 적경홍 | ☐ |
| V8 | 직렬화 결과는 **사이즈 상한 1MB** — DoS 방어 (무한 인벤토리 등) | save 통과 조건에 `Buffer.byteLength(json) < 1_048_576` | 두련사 | ☐ |
| V9 | save 직렬화에 **PII / 외부 식별자 0건** (Discord ID, 이메일, IP) 정규식 검증 | 단위 테스트 1건 | 이소화 | ☐ |
| V10 | `JSON.parse` reviver로 **함수/Date 외 타입 거부** — 또는 schema에서 명시적 허용만 | 단위 테스트 1건 | 계섬월 | ☐ |

**봉인 코드 예시** (save 라운드트립):
```ts
function safeParse(json: string): unknown {
    const obj = JSON.parse(json);
    const seen = new WeakSet();
    const walk = (v: unknown): void => {
        if (v && typeof v === 'object') {
            if (seen.has(v as object)) return;
            seen.add(v as object);
            for (const k of Object.keys(v)) {
                if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
                    throw new Error(`save.proto_pollution.${k}`);
                }
                walk((v as Record<string, unknown>)[k]);
            }
        }
    };
    walk(obj);
    return obj;
}
```

### 4.3 battle 시나리오 입력 (🟡 중)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|-----------|------|------|
| V11 | CombatManager 호출 시 fixture는 **고정 시드** — 비결정적 결과 차단 | `Math.random` 모킹 검증 | 적경홍 | ☐ |
| V12 | ATB 게이지는 **무한 루프 가드** — 1 turn 내 max 1000 tick | 테스트 timeout 25s 내 종료 | 계섬월 | ☐ |
| V13 | battle fixture에 외부 URL / file 경로 0건 — 순수 in-memory 데이터만 | fixture 정적 grep | 이소화 | ☐ |

### 4.4 map 시나리오 입력 (🟡 중)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|-----------|------|------|
| V14 | scene swap 대상 키는 **등록된 scene 화이트리스트** — 임의 문자열 거부 | `Phaser.Scene` 등록 목록 검증 | 적경홍 | ☐ |
| V15 | scene 전환 시 **이전 scene 리스너/timer 정리 검증** — 메모리 누수 = DoS 길 | scene 전환 후 listener count 비교 | 두련사 | ☐ |
| V16 | scene init payload는 **JSON 직렬화 가능 객체만** — 함수·DOM 노드 거부 | 단위 테스트 1건 | 계섬월 | ☐ |

### 4.5 첫 실패 추출 정규식 (🟢 하 — but ReDoS 가능)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|-----------|------|------|
| V17 | `extractFirstFailure`의 정규식 `/❯\s+(\S+):(\d+):(\d+)/` 입력 길이 상한 — vitest 출력 1MB 초과 시 truncate | `text.slice(0, 1_048_576)` 후 매치 | 계섬월 | ☐ |
| V18 | stdout/stderr 누적 버퍼 상한 — child 무한 출력 시 OOM 차단 | 누적 길이 > 16MB 시 child.kill | 두련사 | ☐ |

---

## 5. 출력 안전성 (Output Safety)

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| O1 | `emit()`에 출력되는 `message` / `hint`에 **ANSI escape 인젝션 금지** — 자식 프로세스 stdout이 직접 흘러들면 차단 | 출력 전 `\x1b` strip 또는 escape | 가춘운 | ☐ |
| O2 | 파일 경로 출력 시 **상대 경로만** — 시스템 경로(`C:\Users\crisi\...`) 노출 금지 | `path.relative(ROOT, file)` | 가춘운 | ☐ |
| O3 | JSON 출력 모드(`--json`) — stdout에 **유효 JSON 한 줄만**, 색상/이모지 0건 | `cli-colors.mjs`의 `JSON` 모드 검증 | 두련사 | ☐ |
| O4 | exit code 의미는 SSOT 고정: `0=PASS, 1=BLOCK, 2=WARN, 3=ERROR` — 변경 시 README 동시 갱신 | README §exit codes 절 SSOT | 진채봉 | ☐ |

---

## 6. CI/CD 파이프라인 봉인

| # | 항목 | 검증 | 책임 | 상태 |
|---|------|------|------|------|
| C1 | dev-cycle 워크플로우는 **`permissions: contents: read`** — write 권한 부재 | `.github/workflows/*.yml` 정적 검증 | 두련사 | ☐ |
| C2 | `.ac/` 디렉터리는 **CI 캐시 금지** — 매 실행 fresh state | actions/cache 설정 검토 | 이소화 | ☐ |
| C3 | dev-cycle job timeout **`timeout-minutes: 10`** — 60초 약속 + 여유 | workflow yaml 검증 | 두련사 | ☐ |
| C4 | dev-cycle 실패 시 **artifact 업로드는 `tests/__output__/` 만** — 전체 워크스페이스 업로드 금지 (secret 누설 방어) | upload-artifact path 검증 | 이소화 | ☐ |
| C5 | PR comment 자동 게시 시 **stdout 길이 4KB 상한** — log injection 차단 | comment body slice | 진채봉 | ☐ |

---

## 7. 봉인 게이트 (Build 인계 — 4 AND)

본 스프린트 Build 단계 진입 전, **계섬월·적경홍**은 다음 4 게이트를 모두 통과해야 하옵니다.

```
verify:gate = (V5 ∧ V6) ∧ (Z1 ∨ Z2) ∧ (V1 ∧ V2) ∧ (A1 ∧ A2)
                ↑ proto pollution    ↑ shell:true     ↑ args      ↑ no-IO
```

| 게이트 | 통과 조건 | 검증 명령 |
|---|---|---|
| **G1 직렬화** | V5 + V6 통과 | `npm run test -- save-flow --reporter=verbose` PASS |
| **G2 자식 프로세스** | Z1 적용 (또는 Z2 임시) | `grep "shell: true" scripts/dev-cycle/` → 0건 (또는 화이트리스트 주석) |
| **G3 입력 검증** | V1 + V2 통과 | `node verify-core.mjs --scenario=evil` → exit 3 |
| **G4 외부 IO 부재** | A1 + A2 통과 | §2.1 봉인 명령 모두 PASS |

---

## 8. 5인 인계 — 누구에게 무엇을 (한 줄씩)

| 페르소나 | 인계 사항 | 게이트 |
|---|---|---|
| **계섬월 (Build)** | V5/V6 직렬화 가드 + Z1 `shell:true` 제거 + V1 인자 화이트리스트 — 본 체크리스트의 코드 슬롯 정확히 채우십시오 | G1·G2·G3 |
| **적경홍 (Test)** | V7 deep equal · V11 시드 고정 · V14 scene 화이트리스트 — 단위 테스트 6건 추가 | G1·G3 |
| **두련사 (Eng)** | A5 offline npm · Z3 cwd 고정 · Z8 atomic write · C1~C3 CI 봉인 | G2·G4 |
| **가춘운 (CMO)** | O1~O3 ANSI escape · 경로 노출 봉인 — 디자인 시스템 문서에 출력 안전성 절 추가 | — |
| **진채봉 (Editor)** | O4 exit code SSOT · C5 PR comment 4KB — 사용자 가이드·README에 명시 | — |

---

## 9. 즉시 봉인 — 본 스프린트 Build 진입 전 4선

> **단호히 베어내야 할 사기(邪氣)** — 다른 항목은 P1·P2로 미룰 수 있으나 아래 넷은 Build 첫 시간 안에 처리

1. 🔴 **V5 — 프로토타입 오염 가드** (save 시나리오 핵심)
2. 🔴 **Z1 — `spawn shell:true` 제거** (verify-core.mjs:74)
3. 🔴 **V1 — `--scenario=` 화이트리스트** (현재 unknown 값도 통과)
4. 🟡 **Z6 — `.ac/` gitignore 등재** (state 누출 차단)

---

## 10. 검증 명령 한 다발

```bash
# 1. 외부 IO 정적 검사
grep -rnE "(fetch\(|http\.request|net\.connect|axios\.)" scripts/dev-cycle/ && echo "FAIL" || echo "PASS"

# 2. shell:true 잔존 검사
grep -n "shell: true" scripts/dev-cycle/verify-core.mjs && echo "FAIL" || echo "PASS"

# 3. 인자 인젝션 시도
node scripts/dev-cycle/verify-core.mjs --scenario='evil; rm -rf /' ; [ $? -eq 3 ] && echo "PASS" || echo "FAIL"

# 4. 프로토타입 오염 시도
node -e "const j='{\"__proto__\":{\"polluted\":1}}';try{require('./client/src/save/SaveManager').deserialize(j);console.log('FAIL')}catch{console.log('PASS')}"

# 5. .ac/ gitignore 등재
git check-ignore .ac/verify-trend.json && echo "PASS" || echo "FAIL"

# 6. dev 의존성 audit
npm audit --include=dev --audit-level=high
```

---

## 11. 회고·SSOT 정합

- 직전 회고 `docs/release/retro_dev-cycle-shortening-sprint.md` §A4 → 본 체크리스트가 P1 보안 라인 신설
- 토픽 SSOT `prd_verify-core.md` (정경패) §3 시나리오 정의와 본 §1 위협 모델 정합
- 두련사 *얇은 슬라이스* 처방과 §3.1 Z5 단일 락 일치 — 동시 실행 차단으로 슬라이스 격리

---

> **이소화의 한 마디** — *기(氣)는 흐름이옵고, 보안은 그 흐름에 결을 세우는 일이옵니다. 본 verify 도장(道場)은 외부와 단절된 내실(內室)이오나, 그 안에서 **save 라운드트립의 직렬화 한 줄**과 **spawn shell:true 한 줄**이 가장 큰 사기(邪氣)이옵니다. 즉시 봉인하시옵소서.*
