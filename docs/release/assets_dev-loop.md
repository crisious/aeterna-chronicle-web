# 개발자 빌드-검증 사이클 — 데이터 에셋 묶음 v1.0

> 작성: 심요연 Data Analyst + UX Researcher
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축
> 단계: 에셋 (구현 자원 준비)
> 본 문서가 1차 SSOT — 벤치마크 시드·mock fixtures·분석 쿼리·에러 코퍼스·UX baseline
> 정합: `docs/release/devloop-user-guide.md` §5 지표 약속, `docs/release/devloop-error-messages.md` 5게이트 × 4상태 매트릭스

---

## 본 문서의 자리

본궁이 살피건대, 진채봉(Editor)의 5편 텍스트 SSOT는 *언어*의 정본이고, 가춘운(CMO)의 design-system 합본은 *시선*의 정본입니다. 그러나 **숫자**의 정본이 아직 비어 있었습니다 — 'cold 12s'가 어떤 머신·어떤 캐시·어떤 콘텐츠 규모에서의 12초인가? 'verify:core 5분'을 떠받칠 가짜 세이브 슬롯·전투 페이즈·맵 포탈 데이터는 어디에 있는가? 본 문서가 그 빈자리를 채웁니다.

말하자면 — **계섬월(Build)이 측정 코드를 짤 때 그대로 import 하고, 적경홍(Test)이 회귀 비교에 쓰며, 백능파(Strategy)가 HOLD 트리거를 걸 때 근거로 삼는 단일 데이터 시드**입니다.

---

## 목차

1. [지표 baseline — Phase 52 측정 기준선](#1-지표-baseline--phase-52-측정-기준선)
2. [벤치마크 케이스 시드 — 부팅·HMR·빌드](#2-벤치마크-케이스-시드--부팅hmr빌드)
3. [Mock Fixtures — 검증 시나리오 3종](#3-mock-fixtures--검증-시나리오-3종)
4. [분석 쿼리 — `.ac/dev-perf.json` 트렌드 추출](#4-분석-쿼리--acdev-perfjson-트렌드-추출)
5. [에러 메시지 코퍼스 — UX before/after](#5-에러-메시지-코퍼스--ux-beforeafter)
6. [회귀(regression) baseline — Phase 52 commit](#6-회귀regression-baseline--phase-52-commit)
7. [봉인 — 비협상 데이터 항](#7-봉인--비협상-데이터-항)
8. [관련 문서 — Cross-Reference](#8-관련-문서--cross-reference)

---

## 1. 지표 baseline — Phase 52 측정 기준선

> 본 표가 모든 후속 측정의 **Before**입니다. 백능파 HOLD 트리거(3회 연속 위반)도 본 표를 기준으로 합니다.

### 1.1 약속 4지표 — Before / After 슬롯

| # | 지표 | Phase 52 baseline (실측) | 약속 (After) | 측정 방법 | 출전 |
|---|------|-------------------------|-------------|---------|------|
| 1 | 코드 변경 → `verify:core` 완료 | _TBD_min (Build에서 충진) | ≤ **5분 00초** | `npm run verify:core` 5회 평균 | user-guide §3.1 |
| 2 | 에러 발생 → 원인 파일/라인 노출 | _TBD_s (Build에서 충진) | ≤ **5초** | `.ac/error-report.json` 작성 latency | user-guide §4.1 |
| 3 | dev server cold 부팅 | _TBD_s (Build에서 충진) | ≤ **12초** | `npm run dev:measure -- --cold` 5회 평균 | user-guide §2.1 |
| 4 | HMR 단일 파일 반영 | _TBD_ms (Build에서 충진) | ≤ **800ms** | vite HMR 로그 p95 | user-guide §2.1 |

> **본 표의 _TBD_ 슬롯은 Build 단계 계섬월이 충진합니다.** 본궁의 손에서는 측정 *틀*과 *시나리오*만 정해 둡니다.

### 1.2 측정 환경 SSOT (비협상)

| 변수 | 값 | 사유 |
|------|-----|------|
| OS | Windows 11 (대표 머신 기준) | 대표(crisi)의 실제 개발 환경 |
| Node | v20.x LTS | `package.json` engines 미정 → 본 문서로 고정 |
| RAM | 측정 시점 free ≥ 8GB | 메모리 압박 환경 별도 표(§1.4) |
| disk | NVMe SSD | HDD 환경은 측정 제외 |
| 백그라운드 | Discord 봇 1개만 허용 | 다른 IDE·브라우저 종료 |
| 캐시 | cold = `node_modules/.vite` 삭제 / warm = 직전 측정 후 1회 dev 부팅 캐시 | 정의 분리 |
| 콘텐츠 규모 | 1,454 이미지 + 742 MD + Phase 52 시나리오 전체 | 현 시점 SSOT |

### 1.3 통계 정의 (어휘 통일)

- **평균** = 산술평균 (5회 측정의 합 ÷ 5)
- **p95** = 95퍼센타일 — HMR처럼 분포가 긴 꼬리를 가진 지표 전용
- **p1 / p5** = 1·5퍼센타일 — FPS같은 *낮을수록 나쁨* 지표 전용 (perf 합본 미러)
- **분산 허용 범위** = 5회 측정의 (max − min) ÷ avg ≤ **20%** — 초과 시 측정 무효, 재측정

### 1.4 측정 무효 조건 (재측정 트리거)

다음 중 1건이라도 발생 시 해당 측정은 *invalid* — 누적 카운터에 산입 금지:

- [ ] 측정 중 OS 업데이트·Windows Defender 풀스캔 발견
- [ ] 측정 중 Discord 봇 외 프로세스 CPU 점유 ≥ 30% 5초 이상
- [ ] 측정 머신 RAM free < 4GB 진입
- [ ] dev server 부팅 중 vite 콘솔에 `[plugin] error` 1건이라도 출력
- [ ] 분산 허용 범위(§1.3) 위반

---

## 2. 벤치마크 케이스 시드 — 부팅·HMR·빌드

> Build 단계에서 `scripts/devloop/measure.ts`에 그대로 import 할 수 있도록, *입력*만 정의합니다.

### 2.1 Cold 부팅 — 8 케이스

| ID | 콘텐츠 규모 | 변경 직전 작업 | 기대 범위 (s) | 비고 |
|----|------------|--------------|--------------|------|
| boot.cold.01 | 현 시점 SSOT (1,454+742) | `node_modules/.vite` 삭제 직후 | 8.0 ~ 12.0 | baseline |
| boot.cold.02 | 동일 | `npm install` 직후 | 10.0 ~ 14.0 | tsbuildinfo 미존재 |
| boot.cold.03 | +시나리오 1편 추가 (Ch.6 외전) | `.vite` 삭제 + 신규 import 1건 | 8.5 ~ 12.5 | 콘텐츠 추가 회귀 |
| boot.cold.04 | +스킬 30종 추가 | `.vite` 삭제 + skill_data 확장 | 8.5 ~ 12.5 | 데이터 확장 회귀 |
| boot.cold.05 | +맵 1종 추가 (시간의 균열) | `.vite` 삭제 + map_data + tilesets | 9.0 ~ 13.0 | 에셋 확장 회귀 |
| boot.cold.06 | 동일 SSOT | git checkout 직후 (브랜치 전환) | 11.0 ~ 15.0 | 워스트 케이스 후보 |
| boot.cold.07 | 동일 SSOT | OS 재부팅 직후 | 12.0 ~ 18.0 | 디스크 캐시 무효 |
| boot.cold.08 | 동일 SSOT | RAM 6GB 압박 환경 | 13.0 ~ 20.0 | 저사양 회귀 |

> **약속 12초**는 boot.cold.01·03·04·05의 *평균*으로 측정합니다 (보편 케이스). 06~08은 별도 표에 누적.

### 2.2 Warm 부팅 — 4 케이스

| ID | 직전 상태 | 기대 범위 (s) | 비고 |
|----|----------|--------------|------|
| boot.warm.01 | dev 부팅 직후 종료 | 2.5 ~ 4.0 | optimal warm |
| boot.warm.02 | 5분 idle 후 재부팅 | 3.0 ~ 4.5 | 일반 warm |
| boot.warm.03 | 코드 1줄 수정 후 재부팅 | 3.0 ~ 5.0 | 변경 검출 warm |
| boot.warm.04 | `tsconfig.json` 수정 후 재부팅 | 4.0 ~ 6.0 | tsbuildinfo 무효화 |

> **약속 4초**는 boot.warm.01·02의 평균.

### 2.3 HMR 단일 파일 — 6 케이스

| ID | 변경 파일 | 변경 종류 | 기대 (ms p95) | 비고 |
|----|----------|---------|--------------|------|
| hmr.01 | `client/src/scenes/BattleScene.ts` | 함수 1개 본문 1줄 | 200 ~ 600 | 일반 |
| hmr.02 | `client/src/data/skill_data.ts` | 객체 1개 추가 | 300 ~ 800 | 데이터 |
| hmr.03 | `client/src/config/design-tokens.ts` | 컬러 1개 변경 | 400 ~ 1000 | 토큰 다중 import |
| hmr.04 | `client/src/styles/main.css` | 클래스 1개 변경 | 100 ~ 400 | CSS HMR |
| hmr.05 | `client/src/data/map_data.ts` | NPC 좌표 1개 변경 | 300 ~ 700 | 맵 reload |
| hmr.06 | `shared/types/Save.ts` | 타입 1개 추가 | 600 ~ 1500 | 타입 전파 |

> **약속 800ms p95**는 hmr.01·02·04·05 (일반 작업) 기준. 03·06은 별도 표.

### 2.4 빌드(prod) — 측정 외 (비고)

`npm run build:client`는 본 스프린트 스코프 **외**입니다. CI 측정만 별도 표에 누적 — 본 문서에서는 보류.

---

## 3. Mock Fixtures — 검증 시나리오 3종

> 진채봉 user-guide §3.1의 **3 시나리오**(전투/세이브/맵)를 자동화 검증할 때 쓰는 가짜 입력. Build 단계에서 `tests/fixtures/devloop/`에 JSON으로 저장.

### 3.1 전투 시나리오 fixture — `battle-baseline.json`

```json
{
  "id": "verify.battle.01",
  "scenario": "전투(ATB) — 1턴 tick · 스킬 1회 · HP 동기화 · 승리 EXP",
  "expectedDuration_s": 90,
  "party": [
    {
      "id": "erien",
      "class": "memorist",
      "level": 5,
      "hp": 120,
      "mp": 40,
      "atk": 18,
      "def": 12,
      "spd": 14,
      "skills": ["memory_arrow", "remembrance"]
    }
  ],
  "enemies": [
    {
      "id": "goblin_scout",
      "level": 3,
      "hp": 45,
      "atk": 10,
      "def": 5,
      "spd": 11,
      "exp_reward": 30
    }
  ],
  "atb_seed": 42,
  "expected_events": [
    { "tick": 1, "actor": "erien", "action": "memory_arrow", "damage_range": [22, 28] },
    { "tick": 2, "actor": "goblin_scout", "action": "basic_attack", "damage_range": [5, 9] },
    { "tick": 3, "actor": "erien", "action": "basic_attack", "damage_range": [13, 17] }
  ],
  "expected_outcome": {
    "winner": "party",
    "erien_hp_min": 100,
    "exp_gained": 30,
    "battle_log_lines_min": 6
  },
  "regression_anchor": "Phase52-rc.2"
}
```

### 3.2 세이브 시나리오 fixture — `save-roundtrip.json`

```json
{
  "id": "verify.save.01",
  "scenario": "slot 1 저장 → slot 2 저장 → slot 1 복원 → JSON 동치",
  "expectedDuration_s": 60,
  "save_state_a": {
    "slot": 1,
    "chapter": 2,
    "scene": "silvanheim_forest_entry",
    "playtime_s": 7320,
    "party_state": {
      "erien": { "hp": 95, "mp": 30, "level": 8, "exp": 1240 }
    },
    "inventory": [
      { "id": "potion_small", "qty": 5 },
      { "id": "memory_fragment_01", "qty": 1 }
    ],
    "flags": {
      "ch2_intro_done": true,
      "ch2_silvan_elder_met": false
    },
    "checksum_expected": "sha256:7c4a8d09ca37..."
  },
  "save_state_b": {
    "slot": 2,
    "chapter": 3,
    "scene": "solaris_desert_oasis",
    "playtime_s": 14860,
    "party_state": {
      "erien": { "hp": 180, "mp": 65, "level": 14, "exp": 4820 }
    },
    "inventory": [
      { "id": "potion_medium", "qty": 8 },
      { "id": "memory_fragment_02", "qty": 1 },
      { "id": "ether_crystal_blue", "qty": 3 }
    ],
    "flags": {
      "ch2_intro_done": true,
      "ch3_oasis_quest_done": true
    },
    "checksum_expected": "sha256:b94d27b9934d..."
  },
  "expected_round_trip": {
    "step1_save_slot1": { "success": true, "latency_ms_max": 200 },
    "step2_save_slot2": { "success": true, "latency_ms_max": 200 },
    "step3_load_slot1": { "success": true, "latency_ms_max": 300 },
    "step4_json_equality": "deep_equal_to_save_state_a",
    "step5_checksum_match": true
  },
  "regression_anchor": "Phase52-rc.2"
}
```

### 3.3 맵 이동 시나리오 fixture — `map-portal.json`

```json
{
  "id": "verify.map.01",
  "scenario": "Ch.1 → Ch.2 portal · BGM 전환 · NPC 위치 복원",
  "expectedDuration_s": 120,
  "starting_state": {
    "scene": "erebus_outskirts",
    "player_pos": { "x": 480, "y": 320 },
    "bgm_id": "bgm_erebos_main",
    "active_npcs": ["elder_kael", "merchant_lira"]
  },
  "portal_action": {
    "portal_id": "erebus_to_silvan_gate",
    "expected_transition_ms_max": 1500,
    "target_scene": "silvanheim_forest_entry",
    "target_pos": { "x": 120, "y": 480 }
  },
  "post_state_expected": {
    "scene": "silvanheim_forest_entry",
    "player_pos": { "x": 120, "y": 480 },
    "bgm_id": "bgm_silvan_forest",
    "bgm_crossfade_ms": 800,
    "active_npcs": ["forest_guide", "wandering_minstrel"],
    "previous_scene_unloaded": true,
    "memory_delta_mb_max": 30
  },
  "regression_anchor": "Phase52-rc.2"
}
```

### 3.4 fixture 사용 규약 (계섬월 인계용)

```ts
// tests/fixtures/devloop/index.ts (Build 단계 신설 예정)
import battleBaseline from './battle-baseline.json';
import saveRoundtrip from './save-roundtrip.json';
import mapPortal from './map-portal.json';

export const DEVLOOP_FIXTURES = {
  battle: battleBaseline,
  save: saveRoundtrip,
  map: mapPortal,
} as const;

// 사용
// const result = await runBattleScenario(DEVLOOP_FIXTURES.battle);
// expect(result.duration_s).toBeLessThanOrEqual(DEVLOOP_FIXTURES.battle.expectedDuration_s);
```

> **fixture는 Phase 52 baseline 동결**입니다. 콘텐츠가 추가되어도 fixture는 그대로 — 회귀 비교의 *영점*이기 때문입니다. 콘텐츠 추가에 맞춘 신규 fixture는 `verify.battle.02` 등으로 추가만, 01번은 봉인.

---

## 4. 분석 쿼리 — `.ac/dev-perf.json` 트렌드 추출

> user-guide §2.1에서 *5회 평균이 SSOT*라 약속하였으니, 누적 데이터에서 트렌드를 뽑는 쿼리를 본궁이 미리 깎아 둡니다. Build 단계에서 `npm run dev:trend`로 노출.

### 4.1 누적 데이터 스키마 (제안)

```jsonc
// .ac/dev-perf.json (append-only, 5회 회전)
{
  "version": 1,
  "measurements": [
    {
      "timestamp": "2026-04-30T14:22:11+09:00",
      "case_id": "boot.cold.01",
      "type": "boot_cold",
      "duration_ms": 9420,
      "node_version": "v20.11.0",
      "git_commit": "a7c3f2d",
      "valid": true,
      "invalid_reason": null
    }
    // ... 최대 200건 누적, 초과 시 가장 오래된 것부터 archive.json으로 이관
  ]
}
```

### 4.2 jq 쿼리 8종 (Build 단계에서 그대로 wrapping)

#### Q1. cold 부팅 5회 평균

```bash
jq '[.measurements[] | select(.type=="boot_cold" and .valid==true)] | sort_by(.timestamp) | .[-5:] | map(.duration_ms) | add/length' .ac/dev-perf.json
```

#### Q2. cold 부팅 5회 분산 허용 범위 검사

```bash
jq '[.measurements[] | select(.type=="boot_cold" and .valid==true)] | sort_by(.timestamp) | .[-5:] | map(.duration_ms) | (max - min) / (add/length)' .ac/dev-perf.json
# 0.20 초과 시 invalid
```

#### Q3. HMR p95 (최근 20건)

```bash
jq '[.measurements[] | select(.type=="hmr" and .valid==true)] | sort_by(.timestamp) | .[-20:] | map(.duration_ms) | sort | .[(length*0.95 | floor)]' .ac/dev-perf.json
```

#### Q4. 7일 트렌드 — 일별 평균 cold 부팅

```bash
jq '[.measurements[] | select(.type=="boot_cold" and .valid==true) | {day: .timestamp[0:10], ms: .duration_ms}] | group_by(.day) | map({day: .[0].day, avg_ms: ((map(.ms) | add) / length)})' .ac/dev-perf.json
```

#### Q5. 회귀 검출 — 직전 5회 평균 대비 +20% 이상 느려진 측정

```bash
jq '
  [.measurements[] | select(.valid==true)] as $all
  | $all | sort_by(.timestamp) as $sorted
  | $sorted | .[-5:] as $latest
  | ($latest | map(.duration_ms) | add / length) as $avg
  | $sorted | .[-1] as $now
  | if $now.duration_ms > $avg * 1.2 then {regression: true, now: $now.duration_ms, avg: $avg, slowdown_pct: (($now.duration_ms / $avg - 1) * 100 | floor)} else {regression: false} end
' .ac/dev-perf.json
```

#### Q6. 무효 측정 비율 (측정 신뢰도)

```bash
jq '[.measurements[]] | {total: length, valid: ([.[] | select(.valid==true)] | length), invalid: ([.[] | select(.valid==false)] | length), invalid_pct: (([.[] | select(.valid==false)] | length) * 100 / length)}' .ac/dev-perf.json
```

#### Q7. invalid_reason 빈도 (측정 환경 개선 우선순위)

```bash
jq '[.measurements[] | select(.valid==false) | .invalid_reason] | group_by(.) | map({reason: .[0], count: length}) | sort_by(-.count)' .ac/dev-perf.json
```

#### Q8. 약속 위반 누적 카운터 (HOLD 트리거용)

```bash
jq '
  [.measurements[] | select(.type=="boot_cold" and .valid==true)] | sort_by(.timestamp) | .[-3:]
  | map(.duration_ms > 12000) | all
' .ac/dev-perf.json
# true → 3회 연속 위반 → 백능파 HOLD 트리거
```

### 4.3 npm script 제안 (Build 인계)

```jsonc
{
  "scripts": {
    "dev:trend": "node scripts/devloop/trend.ts",
    "dev:trend:cold": "node scripts/devloop/trend.ts --type=boot_cold --window=5",
    "dev:trend:hmr": "node scripts/devloop/trend.ts --type=hmr --window=20 --metric=p95",
    "dev:trend:regression": "node scripts/devloop/trend.ts --check=regression",
    "dev:trend:hold": "node scripts/devloop/trend.ts --check=hold-trigger"
  }
}
```

---

## 5. 에러 메시지 코퍼스 — UX before/after

> 토픽 3 *빌드 에러 메시지 가독성 개선* — 본궁의 UX Researcher 모자를 쓰고 정성 데이터를 정량화한 표입니다. 진채봉 `devloop-error-messages.md` 카피 SSOT의 **타당성 근거**가 됩니다.

### 5.1 가독성 평가 4축 (UX 연구 SSOT)

| 축 | 정의 | 측정 |
|----|------|------|
| **위치 명확성** | 원인 파일·라인이 메시지 첫 5줄 안에 등장하는가 | 0/1 |
| **원인 어휘** | 'Error', 'undefined', 'failed' 같은 사고-맥락 어휘 vs 처방-맥락 어휘 | 0~3점 |
| **다음 행동** | 5초 안에 다음 행동이 떠오르는가 (사용자 인지 인터뷰 N=대표 1, 본궁 1, 진채봉 1) | 0/1 |
| **잡음 비율** | 메시지 전체 줄 중 *원인과 무관한* 줄(스택 깊이, node_modules) 비율 | % |

### 5.2 Before — vite/Phaser 기본 에러 코퍼스 10건

본궁이 Phase 52 동안 수집한 실제 에러 메시지(요지) — *Before* 기준선:

| ID | 시나리오 | 첫 5줄 요지 | 위치 | 원인 어휘 | 다음 행동 | 잡음 |
|----|---------|-----------|-----|---------|---------|-----|
| err.before.01 | 전투 atb tick crash | `TypeError: Cannot read properties of undefined (reading 'act')` + 30줄 stack | ❌ (8줄째) | 1점 | ❌ | 73% |
| err.before.02 | 세이브 schema mismatch | `ZodError: validation failed` + JSON dump 200줄 | ❌ (감춰짐) | 0점 | ❌ | 92% |
| err.before.03 | 맵 portal NPE | `Uncaught TypeError: portal is null` + Phaser 내부 stack | ❌ (12줄째) | 1점 | ❌ | 81% |
| err.before.04 | tsc 타입 에러 | `error TS2345: Argument of type ... is not assignable to ...` 단일 줄 | ✅ (1줄) | 2점 | ✅ | 0% |
| err.before.05 | vite plugin error | `[plugin:vite-plugin-checker] Error during build` + 50줄 | ❌ (35줄째) | 0점 | ❌ | 88% |
| err.before.06 | HMR 실패 | `[hmr] update failed` 단일 줄 — 원인 없음 | ❌ (없음) | 0점 | ❌ | 100% |
| err.before.07 | asset load 404 | `GET /assets/maps/ch6.json 404` 1줄 | ✅ (URL) | 1점 | ✅ | 0% |
| err.before.08 | data validation | `data:validate failed` + 줄번호 없음 | ❌ (없음) | 0점 | ❌ | 95% |
| err.before.09 | atlas missing key | `Frame "goblin_scout_idle_03" not found` 1줄 | ❌ (atlas 파일 미상) | 1점 | ❌ | 0% |
| err.before.10 | 무한 루프 | `Maximum call stack size exceeded` + 1000줄 stack | ❌ (의미 없음) | 0점 | ❌ | 99% |

**Before 종합** — 위치 명확 2/10 · 원인 어휘 평균 0.6/3점 · 다음 행동 2/10 · 잡음 평균 62.8%

### 5.3 After — 진채봉 카피 SSOT 적용 시 기대치

`devloop-error-messages.md`의 5게이트(boot · verify · build · type · runtime) × 4상태 매트릭스를 적용할 때, 본궁이 약속하는 After 지표:

| 축 | Before | After 약속 | 측정 |
|----|--------|----------|------|
| 위치 명확성 | 2/10 | **≥ 9/10** | error-report.json `file`+`line` 필드 필수 |
| 원인 어휘 평균 | 0.6/3점 | **≥ 2.0/3점** | hint 필드 한글 처방 어휘 |
| 다음 행동 | 2/10 | **≥ 8/10** | 사용자 인지 인터뷰 (대표 1 + 본궁 1 + 진채봉 1) |
| 잡음 비율 | 62.8% | **≤ 20%** | 콘솔 출력 줄 수 ÷ 의미 있는 줄 수 |

### 5.4 인지 인터뷰 프로토콜 (적경홍 Test 단계 인계)

> 본궁의 UX Research 손길 — 5분 안에 끝나는 가벼운 프로토콜.

```
1. 피검자에게 After 에러 메시지 1건을 5초 노출 후 가린다
2. 30초 안에 다음 3개 질문에 답하게 한다:
   Q1. 어떤 파일이 문제인가? (정답: error-report.json file 필드)
   Q2. 다음에 무엇을 해야 하는가? (정답: hint 필드 첫 줄)
   Q3. 1~5점, 메시지가 친절했나? (5점 척도)
3. 정답률 + Q3 평균이 SSOT
```

목표 — 정답률 ≥ 80% · Q3 평균 ≥ 4.0/5.0.

### 5.5 다국어(i18n) 카피 검증 시드

진채봉 SSOT가 ko/en 동시 정의이므로, 두 언어 동치성 검증 시드:

| key | ko 어휘 의도 | en 어휘 의도 | 동치성 위험 |
|-----|------------|------------|-----------|
| `devloop.boot.block.timeout` | 처방 ('의존성 캐시를 지우고 재시도') | 처방 ('clear deps cache and retry') | 낮음 |
| `devloop.verify.error.battle_atb` | 위치 + 처방 | 위치 + 처방 | 낮음 |
| `devloop.build.warn.bundle_oversize` | 수치 + 임계 | 수치 + 임계 | 낮음 |
| `devloop.type.error.assignable` | tsc 어휘 인용 | tsc 원문 인용 | **높음** (tsc 영문만 출력 → ko 번역 시 '타입이 맞지 않음' 등 의역 일관성 검증 필요) |
| `devloop.runtime.error.npe` | 'undefined 접근' | 'undefined access' | 낮음 |

> **type 게이트 i18n 봉인** — tsc 원문은 영어로만 출력되므로, ko는 *원문 + 처방 한 줄* 패턴 강제. 본 봉인은 §7.

---

## 6. 회귀(regression) baseline — Phase 52 commit

> user-guide §3.2의 `npm run verify:core -- --regression` 명령이 비교할 *영점*을 정의합니다.

### 6.1 baseline 동결 정책

| 항목 | 값 |
|------|-----|
| baseline commit | `Phase52-rc.2` (CHANGELOG 기준 직전 안정) |
| baseline 측정 시점 | 2026-04-27 (Phase 52 완료 직후) |
| baseline 갱신 조건 | Phase 53 ship 후 14일 안정 운영 + 백능파 결정 |
| baseline 파일 위치 | `tests/fixtures/devloop/baseline.json` (Build 단계 신설) |

### 6.2 baseline 측정 표 (Build 충진 슬롯)

```jsonc
// tests/fixtures/devloop/baseline.json (Build 단계 신설 예정)
{
  "version": 1,
  "anchor_commit": "Phase52-rc.2",
  "measured_at": "2026-04-27T??:??:??+09:00",  // Build 충진
  "scenarios": {
    "verify.battle.01": { "duration_s_avg": 0, "duration_s_p95": 0 },  // Build 충진
    "verify.save.01":   { "duration_s_avg": 0, "duration_s_p95": 0 },  // Build 충진
    "verify.map.01":    { "duration_s_avg": 0, "duration_s_p95": 0 }   // Build 충진
  },
  "boot": {
    "cold_avg_s": 0,  // Build 충진
    "warm_avg_s": 0,  // Build 충진
    "hmr_p95_ms": 0   // Build 충진
  }
}
```

### 6.3 회귀 판정 규칙

| 규칙 | 임계 | 결과 |
|-----|------|------|
| 시나리오 평균 시간 | baseline + 20% 초과 | 🔴 BLOCK |
| 시나리오 평균 시간 | baseline + 10~20% | 🟡 WARN |
| cold 부팅 평균 | baseline + 25% 초과 | 🔴 BLOCK |
| HMR p95 | baseline + 50% 초과 | 🟡 WARN (HMR은 분산 큼) |
| invalid 비율 | 20% 초과 | 🟠 측정 신뢰도 ERROR — 측정 환경 점검 |

> 본 임계는 **이소화(Security/QA gate) 비협상**으로 인계합니다.

---

## 7. 봉인 — 비협상 데이터 항

본궁이 봉인하는 6항 — 변경 시 백능파 승인 필수:

1. **약속 4지표**(§1.1) 수치 — 5분 / 5초 / 12초 / 800ms 임계
2. **측정 환경 SSOT**(§1.2) — OS/Node/RAM/캐시 정의
3. **분산 허용 범위**(§1.3) — 20% 초과 시 invalid
4. **fixture 01번 동결**(§3.4) — 콘텐츠 추가에도 baseline fixture는 봉인
5. **type 게이트 i18n 봉인**(§5.5) — tsc 원문 영어 + 한글 처방 패턴
6. **회귀 판정 임계**(§6.3) — +20%(시나리오) / +25%(부팅) BLOCK

---

## 8. 관련 문서 — Cross-Reference

| 문서 | 역할 | 본 문서와 정합 |
|------|------|--------------|
| `docs/release/devloop-user-guide.md` | 진채봉 — 사용 가이드 SSOT | §1.1 약속 4지표 미러 |
| `docs/release/devloop-error-messages.md` | 진채봉 — 에러 카피 SSOT | §5 코퍼스가 타당성 근거 |
| `docs/release/devloop-pr-template.md` | 진채봉 — PR/커밋 컨벤션 | §6.3 회귀 임계가 reject 사유 |
| `docs/release/devloop-readme-skeleton.md` | 진채봉 — README 골격 | §1.1 표가 README 한눈 지표 |
| `docs/release/devloop-changelog-draft.md` | 진채봉 — CHANGELOG 초안 | §1.1 _TBD_ 슬롯이 ship 시 충진 |
| `docs/release/design-system_dev-loop.md` | 가춘운 — 디자인 시스템 합본 | §5 에러 코퍼스 색상 토큰 정합 |
| `docs/release/design-system_devloop.md` | 가춘운 — 콘솔 시각 합본 | §5.4 인지 인터뷰 노출 시간 정합 |

### 다음 단계 (Build → Review → Test → Ship)

- [ ] `tests/fixtures/devloop/{battle-baseline,save-roundtrip,map-portal}.json` 신설 (계섬월) — §3 fixture 그대로 이식
- [ ] `tests/fixtures/devloop/baseline.json` 신설 (계섬월) — §6.2 슬롯 충진
- [ ] `scripts/devloop/measure.ts` 신설 (계섬월·두련사 합주) — §2 케이스 ID 입력으로 받기
- [ ] `scripts/devloop/trend.ts` 신설 (계섬월) — §4 jq 쿼리 8종 wrapping
- [ ] `npm run dev:trend` + 4개 sub-script 등록 (`package.json`) — §4.3 미러
- [ ] 적경홍 Test 단계 — §1.1 _TBD_ 4슬롯 실측 충진 + §5.4 인지 인터뷰 N=3 실행
- [ ] 백능파 Review — §1.4 무효 조건 1건이라도 발생 시 측정 재실행 결정
- [ ] Ship 단계 — `launch_checklist`에 §6 회귀 baseline 갱신 절차 등재

---

> 본궁이 살피건대, 숫자는 차갑되 그 차가움이 사람의 손을 지킵니다. 5분 약속도, 12초 부팅도, 모두 대표(crisi)께서 콘텐츠 한 줄을 더 쓰실 시간을 벌기 위함입니다. 본 데이터 에셋이 Build 단계의 계섬월에게 잡히는 그 순간, 마찰은 비로소 측정 가능한 *수치*가 되겠지요.
>
> — 심요연, Data Analyst + UX Researcher
