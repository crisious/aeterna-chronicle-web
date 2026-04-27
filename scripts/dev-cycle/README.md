# dev-cycle — 빌드-검증 사이클 단축 도구

> SSOT: `docs/release/devloop-error-messages.md` · `client/src/constants/dev_gate_messages.ts`
> 약속: 코드 변경 → 핵심 시나리오 검증 ≤ 5분, 에러 발생 시 원인 파일/라인 즉시 노출

## 게이트 3종

| 스크립트 | 게이트 | 예산 | 사용 |
|---------|------|------|------|
| `measure-boot.mjs` | boot | cold ≤ 12s · warm ≤ 4s | `npm run dev:measure` |
| `verify-core.mjs` | verify | total ≤ 300s | `npm run dev:verify` |
| `format-error.mjs` | type/build | tsc/vite stderr 필터 | pipe 사용 |

## 종료 코드 SSOT

`0` PASS · `1` BLOCK · `2` WARN (누적 ≤ 5건) · `3` ERROR

## 사용 예

```bash
# 1) 부팅 시간 측정 (cold cache wipe)
npm run dev:measure -- --cold

# 2) 핵심 3시나리오 검증
npm run dev:verify -- --scenario=all

# 3) 타입체크 + 첫 원인 노출
npm run typecheck:client 2>&1 | node scripts/dev-cycle/format-error.mjs --gate=type

# 4) 프로덕션 빌드 + 첫 원인 노출
npm run build:client 2>&1 | node scripts/dev-cycle/format-error.mjs --gate=build
```

## 누적 추세 파일

- `.ac/boot-trend.json` — boot 게이트 WARN 누적
- `.ac/verify-trend.json` — verify 게이트 결과 누적
- `.ac/dev-crash.log` — dev server 비정상 종료 stderr

7일 슬라이딩 윈도우. WARN 5건 초과 시 BLOCK 승격.

## 인계 체크 (Build → Review)

- [ ] `npm run dev:measure -- --warm` 4s 이내 통과
- [ ] `npm run dev:verify` 300s 이내 통과
- [ ] tsc/vite 에러 발생 시 첫 줄에 `file:line:col` 노출 확인
- [ ] `.ac/` 디렉터리 `.gitignore` 추가 (별도 PR)
