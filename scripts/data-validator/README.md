# scripts/data-validator — 데이터 검증 시스템 (Asset 골격)

> 작성: 계섬월 (Staff Engineer) · 단계: Asset (구현 자원 준비) · 2026-04-28
>
> 칼은 베어야 칼이다. 본 폴더는 Build 단계 진입 전 골격 — 모든 함수는 `DataValidatorNotImplementedError`를 던진다.

## 목적

Phase 52 누적 데이터(스킬·아이템·몬스터·시나리오 JSON 수백~수천 건) 위에 콘텐츠 1건 추가할 때마다 자동으로:

1. **스키마 검증** — `ajv` + 도메인별 JSON schema
2. **참조 무결성 audit** — `skill→effect`, `item→category`, `encounter→monster`, `scenario→{skill,item,encounter}`
3. **밸런스 outlier 탐지** — `damage / hp / exp / gold / cast_time` 분포 ±2σ
4. **즉시 위치 노출** — 모든 finding은 `LocationCue(filePath + jsonPointer + line/col)` 필수

## 디렉터리

```
scripts/data-validator/
├── README.md              # 본 파일
├── index.ts               # 배럴 export
├── cli.ts                 # CLI 진입점 (schema | refs | balance | report | all)
├── types.ts               # SSOT 타입 (DataDomainId, ValidationFinding, LocationCue 등)
├── errors.ts              # NotImplemented 가드 + assertLocation
├── helpers.ts             # 경로/로더 유틸
├── schemas/               # 도메인별 JSON Schema (5종, 모두 stub)
│   ├── skill.schema.json
│   ├── item.schema.json
│   ├── monster.schema.json
│   ├── encounter.schema.json
│   └── scenario.schema.json
├── validators/
│   ├── schema-validator.ts    # ajv 래퍼
│   ├── reference-auditor.ts   # 참조 그래프 + 끊김 탐지
│   └── balance-outlier.ts     # z-score 기반 outlier
└── reporters/
    └── error-reporter.ts      # console / json / md 출력
```

## Build 단계 작업 순서 (계섬월 인계 메모)

1. `npm i -D ajv ajv-formats ajv-errors json-source-map` (workspace root)
2. `helpers.ts::resolveDataGlob` — 도메인별 실제 데이터 디렉터리 합의 후 채우기
   - 현재 `client/src/data/` 에는 `monsterManifest.json` 외엔 .ts에 인라인 — 데이터 추출 또는 .ts → .json 마이그레이션 선결
3. `validators/schema-validator.ts` 본체 구현 — ErrorObject → ValidationFinding 변환 시 `assertLocation` 통과 강제
4. `validators/reference-auditor.ts` — `buildReferenceGraph` → `auditReferences`
5. `validators/balance-outlier.ts` — `auditBalance` (Welford 또는 2-pass)
6. `reporters/error-reporter.ts::emitReport` — console 색상 + json/md
7. `package.json` 스크립트 와이어업:
   ```json
   "data:validate":         "node --experimental-strip-types scripts/data-validator/cli.ts all",
   "data:validate:schema":  "... cli.ts schema",
   "data:validate:refs":    "... cli.ts refs",
   "data:validate:balance": "... cli.ts balance"
   ```
8. `npm run verify` 게이트에 `data:validate` 합산 (또는 별도 ship-gate)

## 비협상 (계섬월)

- 모든 finding은 `LocationCue` 없으면 throw — 어디가 부서졌는지 모르면 수정도 못한다.
- ajv `allErrors: true` 기본 — 첫 에러에서 멈추지 않는다.
- 참조 무결성 BROKEN_LINK는 항상 `error`, UNUSED_TARGET은 `warn`.
- Balance outlier ±2σ → `warn`, ±3σ → `error`.

## 확인 사항 (대표 컨펌 필요)

- 데이터 SSOT 위치: `client/src/data/*.ts` 인라인 vs 별도 `.json` — 후자로 마이그레이션 선결 여부?
- `effect`, `category` 도메인은 본 5종에 미포함 — 별도 도메인으로 격리할지, skill/item에 임베드할지?
- 챕터별 분포 분리 여부 (1차는 단일 그룹, 시끄러우면 chapter+tier 추가)
