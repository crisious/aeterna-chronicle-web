# 에테르나 크로니클 — 데이터 검증 시스템 사용자 가이드 v1.0

> 작성: 진채봉 (Editor) 🪶
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Asset 단계)
> SSOT 위계: **본 문서 = 1차 SSOT (사람이 읽는 정본)**
> 메아리 대상: `README.md §🛡️ 데이터 검증` (신설 예정), `CHANGELOG.md §1.0.0-rc.4 Added`
> 연관 SSOT:
> - 디자인: 가춘운 — `design-system_data-validation.md`
> - 아키텍처: 두련사 *선禪 4계* (Schema → Load → Audit → Report)
> - PRD: 정경패 — 데이터 검증 시스템 v1.0
> - 게이트: 백능파 **REDUCTION** — `monster_data.json` 단일 ajv 검증 PASS + 1커밋 머지

---

## 0. 이 문서가 보장하는 것 — 한 손에 잡히는 4지표 🎯

콘텐츠 1건을 추가할 때, 검증 시스템은 다음을 약속하옵니다.

| 약속 | 측정 | 목표 | 측정 명령 |
|---|---|---|---|
| **Schema 통과** | ajv 검증 PASS율 | **100%** (전 데이터 파일) | `npm run data:validate` |
| **참조 무결성** | 끊긴 참조 수 | **0건** (skill→effect, item→category, encounter→monster) | `npm run data:audit:refs` |
| **밸런스 정합** | outlier (HP/데미지/EXP) | **±2σ 내** | `npm run data:audit:balance` |
| **실패 노출** | path:line:field 표기율 | **100%** | (모든 ERROR 출력에 자동) |

> 본 4지표는 *비협상* 약속이옵니다 — 하향 갱신 시 백능파(Strategy) 승인 필수.

---

## 1. 한 손 흐름도 — 검증의 결 흐름 🌊

```
신규 콘텐츠 추가
    ↓
[1] Schema 게이트 (ajv)
    ├─ PASS → [2]로
    └─ FAIL → ❌ path:line:field + 기대값 노출 → 머지 차단
    ↓
[2] Load 게이트 (실제 적재)
    ├─ PASS → [3]으로
    └─ FAIL → ❌ 적재 시 던진 예외 + 어느 필드에서 났는지 노출
    ↓
[3] Audit 게이트 (참조 무결성)
    ├─ skill.effects[*] → effect_data.json
    ├─ item.category → item_categories.json
    ├─ encounter.monsters[*] → monster_data.json
    ├─ PASS → [4]로
    └─ FAIL → ❌ 끊긴 참조 path + 가리키던 ID 노출 → 머지 차단
    ↓
[4] Report 게이트 (밸런스 outlier ±2σ)
    ├─ PASS → ✅ 카운트 요약 + 다음 액션 1줄
    └─ WARN → ⚠️ outlier path + μ/σ/z 노출 (머지 차단 X, 리뷰 필수)
```

> 두련사 *선禪 4계* 와 1:1 미러 — 본 흐름이 곧 명령 순서이옵니다.

---

## 2. 빠른 시작 — 3명령 ⚡

콘텐츠 추가 직후, 다음 세 명만 외워두시면 충분하옵니다.

```bash
# 0. 한 번에 4 게이트 모두 (CI 동일)
npm run data:validate

# 1. 특정 도메인만 빠르게 (개발 중)
npm run data:validate:monster        # monster_data.json만
npm run data:validate:item           # item_data.json만
npm run data:validate:skill          # skill_data.json만

# 2. 변경 감지 watch 모드 (가장 흔한 워크플로)
npm run data:validate -- --watch
```

| 상황 | 권장 명령 |
|---|---|
| 콘텐츠 1건 추가 직후 | `npm run data:validate:<domain>` |
| 커밋 직전 | `npm run data:validate` (4 게이트 풀) |
| PR 푸시 직전 | `npm run data:validate -- --json > .ac/data-validate.json` |
| 디버깅 중 | `npm run data:validate -- --watch` |

---

## 3. Schema 약속 — 도메인별 정본 표 🛡️

각 데이터 파일은 `data/schemas/<domain>.schema.json` (JSON Schema draft-2020-12) 을 1차 SSOT로 따르옵니다.

| 도메인 | 데이터 파일 | Schema 파일 | 핵심 키 |
|---|---|---|---|
| **monster** | `client/src/data/monsterManifest.json` | `data/schemas/monster.schema.json` | `id, name, hp, atk, def, exp, drops[]` |
| **item** | `data/items/item_data.json` (예정) | `data/schemas/item.schema.json` | `id, name, category, rarity, effects[]` |
| **skill** | `data/skills/skill_data.json` (예정) | `data/schemas/skill.schema.json` | `id, name, class, effects[], cost` |
| **encounter** | `data/encounters/<chapter>.json` (예정) | `data/schemas/encounter.schema.json` | `id, zone, monsters[], conditions` |
| **scenario** | `data/scenarios/<chapter>/*.json` (예정) | `data/schemas/scenario.schema.json` | `id, beats[], choices[], next` |

> **REDUCTION 스코프** (본 스프린트): `monster.schema.json` 1편만 우선 정의 + `monsterManifest.json` 검증 PASS. 나머지는 후속 스프린트.

### 3.1 Schema 변경 절차 (위에서 아래로만)

1. `data/schemas/<domain>.schema.json` 갱신 (1차 SSOT)
2. 본 문서 §3 표 갱신
3. `scripts/validate-data.ts` 도메인 등록 갱신
4. 변경 PR에 *Schema 파괴 변경* 라벨 + 사전 마이그레이션 스크립트 첨부
5. 백능파 승인 → 머지

---

## 4. 참조 무결성 약속 — 끊김 0건 🔗

검증기는 다음 3종 참조를 추적하옵니다.

| 참조 | From → To | 위반 시 |
|---|---|---|
| **skill→effect** | `skill.effects[*].id` → `effect_data.json` | ❌ ERROR (머지 차단) |
| **item→category** | `item.category` → `item_categories.json` | ❌ ERROR (머지 차단) |
| **encounter→monster** | `encounter.monsters[*]` → `monsterManifest.json` | ❌ ERROR (머지 차단) |

### 4.1 끊긴 참조 진단 규약

```
  ❌ data/encounters/ch4_boss.json:42
    └─ encounters[1].monsters[3] = `mon_void_lord_v2` (참조 대상 없음: monsterManifest.json)
    💡 후보: `mon_void_lord` (Levenshtein 1) — 오타 의심
```

> 후보 제안은 Levenshtein ≤ 2 일 때만 동반. 그 이상은 *없음* 으로 표기 — 거짓 권유 금지.

---

## 5. 밸런스 outlier 약속 — ±2σ 내 📊

도메인별 핵심 수치의 분포를 통계로 모은 뒤, 신규 항목이 ±2σ를 벗어나면 ⚠️ WARN.

| 도메인 | 추적 수치 | 기준 |
|---|---|---|
| **monster** | `hp`, `atk`, `def`, `exp` | 챕터별 분포 ±2σ |
| **item** | `effects[*].magnitude` | 카테고리별 분포 ±2σ |
| **skill** | `cost`, `damage_coeff` | 클래스별 분포 ±2σ |

### 5.1 outlier 처리 정책

| 결과 | 머지 | 리뷰 |
|---|---|---|
| ±1σ 내 | ✅ 자동 통과 | 불필요 |
| ±1σ ~ ±2σ | ✅ 통과, ⚠️ WARN 출력 | 정경패 리뷰 권장 |
| ±2σ 초과 | ⚠️ WARN, 머지 차단 X | **정경패 + 백능파 승인 필수** |

> outlier가 *의도된 보스 스파이크* 인 경우, `// @balance-exempt: <근거>` 주석으로 면제 — 면제 사유는 PR에 동봉.

---

## 6. 실패 노출 규약 — path:line:field 100% 🎯

모든 ERROR/WARN 줄은 다음 3정보를 *반드시* 포함하옵니다.

```
  ❌ [path]:[line]
    └─ [field] = `[value]` (expected: [rule])
```

> 가춘운 디자인 §4 *2줄 ERROR* 와 1:1 일치. 한 화면에 5건 떠도 위계가 무너지지 않도록 설계.

### 6.1 출력 모드 3종

| 모드 | 트리거 | 용도 |
|---|---|---|
| **TTY 컬러** | 터미널 + `NO_COLOR` 미설정 | 사람이 읽는 기본 모드 |
| **NO_COLOR** | `NO_COLOR=1` 또는 비-TTY | CI 로그, 파이프 |
| **JSON** | `--json` 플래그 | 기계가 읽는 모드 (autofix 도구 입력) |

---

## 7. 자주 묻는 질문 (FAQ) ❓

### Q1. 신규 도메인을 추가하고 싶사옵니다. 무엇부터 손대야 하옵니까?
A. `data/schemas/<new>.schema.json` 작성 → 본 문서 §3 표 갱신 → `scripts/validate-data.ts`에 도메인 등록. 위에서 아래로만 흐르는 결을 지키소서.

### Q2. outlier가 떴는데 의도된 수치이옵니다. 어찌하옵니까?
A. 해당 항목에 `// @balance-exempt: <근거>` 주석을 첨부하시고, PR 본문 §밸런스 메모에 근거를 적어주옵소서. 정경패와 백능파 승인 후 머지 가능하옵니다.

### Q3. CI에서만 ANSI가 깨지옵니다.
A. 본 시스템은 `NO_COLOR=1` 환경변수와 비-TTY를 자동 감지하옵니다. 그래도 깨지면 `--no-color` 명시 플래그를 사용하소서.

### Q4. Schema 파일을 수정해도 검증이 같은 에러를 내옵니다.
A. ajv 컴파일 캐시이옵니다. `node_modules/.cache/ajv` 를 비우시거나, `npm run data:validate -- --no-cache` 로 갱신하소서.

### Q5. 끊긴 참조의 *후보* 제안이 잘못 떴사옵니다.
A. Levenshtein ≤ 2 휴리스틱이옵니다. 거짓 양성이 잦다면 `--no-suggest` 로 비활성화하소서. 다음 스프린트에서 fuzzy 매칭 임계 재조정 예정.

### Q6. 밸런스 분포 통계는 어디에 캐시되옵니까?
A. `.ac/data-balance-stats.json` 에 (μ, σ, n) 만 저장. 5분 TTL 메모리 캐시 + 파일 캐시 동시. `--rebuild-stats` 로 강제 재계산 가능.

### Q7. 본 시스템이 *블록체인* 처럼 머지를 막는 듯하옵니다…
A. 약속이옵니다. ❌ ERROR 4종(schema, ref, load, balance ±3σ 초과)만 막고, ⚠️ WARN(±2σ 초과)은 *리뷰 권유* 일 뿐 차단하지 않사옵니다.

---

## 8. 봉인 (이소화 비협상) 🔒

본 가이드의 다음 4항은 *임의 변경 금지* 이옵니다.

1. **4지표 약속** (§0) — 100% / 0건 / ±2σ / 100%
2. **2줄 ERROR 포맷** (§6) — path 1줄 + reason 1줄
3. **NO_COLOR 자동 감지** (§6.1) — 옵션 아닌 필수
4. **outlier 면제 절차** (§5.1) — 정경패 + 백능파 승인 없이 통과 ❌

---

## 9. 다음 단계 — 인계 체크 (Build → 계섬월) ✅

- [ ] `data/schemas/monster.schema.json` 작성 (REDUCTION 스코프)
- [ ] `scripts/validate-data.ts` 4 게이트 골격 (Schema/Load/Audit/Report)
- [ ] `src/constants/data_validation_messages.ts` 3슬롯 카피 (가춘운 §5.1 미러)
- [ ] `npm run data:validate*` 5종 npm scripts 등록
- [ ] CI workflow에 `data:validate` 게이트 추가 (적경홍 QA 단계)
- [ ] `launch_checklist §2.22` SSOT 신설 (정경패 합의 후)
