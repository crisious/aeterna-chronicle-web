# 🪷 [Security Test] 몬스터 아트 파이프라인 — 보안 테스트 결과

> 작성: 이소화 (Security Analyst)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화 (QA 단계)
> 선행: `security-checklist_monster-art-pipeline.md` (V1~V19 / Z1~Z10 / A1~A10 SSOT)
> 동행: `qa-plan_monster-art-pipeline.md` (적경홍)
> 대상 코드: `scripts/monster-pipeline/**` · `client/public/assets/monsters/**` (없음) · CI 워크플로우(예정)

---

## 0. 한 줄 진단

> 다섯 격자 중 **③ generate**, **⑤ gate(미구현)** 두 곳에 사기(邪氣)가 깃들었사옵니다. 특히 `monsterId`로 **path traversal이 실증**되었고, **공급망에 critical RCE 1건(protobufjs)**과 **high 1건(fastify)**이 봉인 대기 중이옵니다. 즉시 봉인해야 하옵니다.

| 항목 | 결과 | 등급 |
|------|------|------|
| Path Traversal (V7) | 🔴 **PoC 성공** — workspace 밖으로 탈출 | **상(上)** |
| Prompt Injection (V1·V2·V3) | 🔴 **무방어** — 블랙리스트·NFKC 정규화 부재 | **상(上)** |
| EXIF/Magic Bytes (V9·V10) | 🔴 **미구현** — `copyFile` 그대로 통과 | **상(上)** |
| Provider Whitelist (V17·S3) | 🟡 **부분** — CLI에서 type-cast로 우회 가능 | **중(中)** |
| 라이선스 메타 강제 (V14·V18) | 🟡 **선언적** — 게이트 미구현으로 BLOCK 미작동 | **중(中)** |
| npm audit (S2) | 🔴 **5건** (1 critical · 1 high · 3 moderate) | **상(上)** |
| XSS / CSRF / SQLi 표면 | 🟢 **표면 없음** — 본 파이프라인은 빌드타임 CLI | **하(下)** |
| Secret 평문 노출 (A1) | 🟢 **0건** — 평문 키 미발견 | **하(下)** |

**🔴 BLOCK 5건 / 🟡 WARN 2건 / 🟢 PASS 2건 — Build 단계 머지 게이트 진입 전 5건 모두 봉인 필요.**

---

## 1. Path Traversal — V7 봉인 검증 (🔴 상)

### 1.1 PoC 결과

`scripts/monster-pipeline/helpers.ts::resolveRawArtifactPath()` 는 `monsterId` 를 그대로 `path.join` 에 흘립니다. CLI의 `--id=` 인자는 `cli.ts:152` 에서 `rawArg.slice('--id='.length)` 로만 분리될 뿐, **`^[a-z0-9_]+(__v\d{2})?$` 정규식(V7) 검증이 코드에 존재하지 않사옵니다.**

**실증 출력** (`node --input-type=module` 직접 호출):

| 입력 monsterId | 산출 경로 | 탈출 여부 |
|---------------|-----------|----------|
| `../../../etc/passwd` | `C:\workspace\assets\etc\passwd.png` | 🔴 **workspace `generated/monster-pipeline/ai_raw` 밖** |
| `normal_/etc/passwd` | `C:\workspace\assets\generated\monster-pipeline\ai_raw\normal_\etc\passwd.png` | 🟡 sub-path 작성 |
| `..\..\..\Windows\System32\evil` | (백슬래시 보존) workspace 내부 | 🟢 무해화 |

POSIX 환경에서 `..` 분절은 그대로 통과하므로 **CI(우분투 러너) 기준 임의 디렉토리 PNG/메타 작성 가능**. attacker는 `assetId="../../.github/workflows/owned"` 로 워크플로우 파일을 `.png` 로 덮어쓰지는 못하지만 **`<id>.meta.json`은 임의 경로 작성** — 빌드 캐시·아티팩트 오염 가능.

### 1.2 봉인 패치(권고)

`helpers.ts` 최상단에 게이트 함수 신설:

```ts
const MONSTER_ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*(?:__v\d{2})?$/u;
export function assertMonsterId(value: string): asserts value is string {
  if (!MONSTER_ID_PATTERN.test(value)) {
    throw new TypeError(`monsterId rejected: ${JSON.stringify(value)}`);
  }
}
```

호출부 4곳: `cli.ts::parseCliArgs`, `generate.ts::generateMonsterAsset`, `runMonsterPipelineCommand`, `helpers.ts::resolveRawArtifactPath`.

### 1.3 회귀 케이스 (적경홍 인계)

| 케이스 | 입력 | 기대 |
|-------|------|------|
| T-PT-01 | `../../../etc/passwd` | `TypeError` throw, 종료코드 1 |
| T-PT-02 | `normal_/etc/passwd` | `TypeError` throw |
| T-PT-03 | `mon_solaris_serpent_normal__v01` | PASS |
| T-PT-04 | `Mon_Solaris_Serpent` (대문자) | `TypeError` throw |
| T-PT-05 | `_normal` (빈 ID 우회) | `TypeError` throw |
| T-PT-06 | (1만자) 폭탄 ID | 길이 64 cap → reject |

---

## 2. Prompt Injection — V1·V2·V3 검증 (🔴 상)

### 2.1 무방어 실증

`helpers.ts::createProviderArtifact()`:

```ts
promptText: request.promptOverride?.trim() || buildPromptText(...)
```

**`promptOverride`는 `.trim()`만** 적용되옵니다. V1(블랙리스트), V2(NFKC), V3(`in the style of` 정규식 5종) 어느 것도 코드에 없사옵니다. 작가 `monster-design/<id>.md` 가 추후 빌더로 들어오면 즉시 우회됩니다.

### 2.2 우회 PoC (이론)

| 위장 패턴 | 현재 차단? |
|----------|----------|
| `in the style of Studio Ghibli` | ❌ 통과 |
| `i​n the style of Hayao Miyazaki` (zero-width space) | ❌ 통과 — NFKC 미적용 |
| `inthe style of` (공백 제거) | ❌ 통과 |
| `풍의 미야자키` (한국어 우회) | ❌ 통과 |
| `スタジオジブリ風` (일본어) | ❌ 통과 |

### 2.3 봉인 패치(권고)

`scripts/monster-pipeline/license_check.ts` 신설:

```ts
const STYLE_PATTERNS: readonly RegExp[] = [
  /(?:in|after|by|à la)\s+(?:the\s+)?style\s+of/iu,
  /풍(?:의|으로|에)/u,
  /スタイル|風(?:に|の)?/u,
  /模仿|风格/u,
  /(?:ghibli|disney|pixar|miyazaki|kim\s*jung\s*gi)/iu,
];
const BLOCKLIST_DICT_YML = '<repo>/scripts/monster-pipeline/license_check.dictionary.yml';

export function assertLicenseSafe(prompt: string): void {
  const normalized = prompt.normalize('NFKC').toLowerCase();
  for (const re of STYLE_PATTERNS) {
    if (re.test(normalized)) {
      throw new LicenseViolationError('style-clone pattern detected', re.source);
    }
  }
  // dictionary.yml 작가명 1,200건 매칭...
}
```

**fuzz 1,000건 차단율 100% 단언**(체크리스트 V2)을 회귀 테스트에 등재하옵니다.

---

## 3. EXIF / Magic Bytes — V9·V10 (🔴 상)

`copyOrCreatePng()` 는 `node:fs/promises::copyFile` 만 호출하옵니다. **EXIF strip(`sharp().withMetadata({exif: {}})`) 없음**, **PNG magic bytes(`89 50 4E 47 0D 0A 1A 0A`) 검증 없음**, **이미지 폭탄 차원 cap 없음**.

### 봉인 패치(권고)

`helpers.ts`에서 `copyFile` 대신 `sharp` 파이프 도입:

```ts
import sharp from 'sharp';
const FOUR_K = 4096;
const MAX_BYTES = 10 * 1024 * 1024;

export async function safeCopyPng(target: string, source: string): Promise<void> {
  const stat = await fs.stat(source);
  if (stat.size > MAX_BYTES) throw new Error('image bomb: byte cap');
  const head = Buffer.alloc(8);
  const fh = await fs.open(source);
  await fh.read(head, 0, 8, 0); await fh.close();
  if (!head.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    throw new Error('not PNG: magic bytes mismatch');
  }
  const meta = await sharp(source).metadata();
  if ((meta.width ?? 0) > FOUR_K || (meta.height ?? 0) > FOUR_K) {
    throw new Error('image bomb: dimension cap');
  }
  await sharp(source).withMetadata({ exif: {} }).png({ compressionLevel: 9 }).toFile(target);
}
```

**의존성**: `sharp ≥ 0.33.x` (체크리스트 V12 — CVE-2023-* 패치 버전).

---

## 4. Provider Whitelist — V17·S3 (🟡 중)

`cli.ts:156`:

```ts
providerId = rawArg.slice('--provider='.length) as MonsterPipelineCommandRequest['providerId'];
```

**type cast 만으로 검증을 우회**하옵니다. `getMonsterProvider('evil')` 은 `MONSTER_PROVIDERS['evil']` → `undefined` 반환 → `provider.generate is not a function` runtime crash. DoS급이며 잠재적으로 prototype pollution(provider name이 `__proto__`).

### 봉인 패치

```ts
import { MONSTER_PROVIDER_IDS } from './types.ts';
function assertProviderId(value: string): asserts value is MonsterProviderId {
  if (!MONSTER_PROVIDER_IDS.includes(value as MonsterProviderId)) {
    throw new TypeError(`unknown providerId: ${value}`);
  }
}
```

`getMonsterProvider` 진입에 `Object.hasOwn(MONSTER_PROVIDERS, id)` 가드 추가 — prototype pollution 봉인.

---

## 5. 공급망 — npm audit (🔴 상 / S2)

`npm audit --omit=dev` 결과 (CWD: `C:/fork/aeterna-chronicle-web2`):

| 패키지 | 심각도 | 권고 | 영향 |
|-------|-------|------|------|
| **protobufjs** `< 7.5.5` | 🔴 **critical** (RCE) | `npm audit fix` (자동 가능) | GHSA-xq3m-2v4x-88gg — Arbitrary code execution |
| **fastify** `≤ 5.7.2` | 🟠 **high** | `npm audit fix` | Content-Type tab bypass + DoS sendWebStream |
| **axios** `1.0.0–1.14.0` | 🟡 moderate ×2 | `npm audit fix` | NO_PROXY SSRF + Cloud-metadata header injection |
| **uuid** `< 14.0.0` | 🟡 moderate | `npm audit fix --force` (breaking) | Buffer bounds check |

**총 5건**. 이 중 4건은 비파괴 자동 수정 가능. `uuid@14`는 메이저 점프이오니 백능파/정경패 결재 후 별도 PR 권고.

### 5.1 봉인 명령

```bash
# Build Week 1 — 비파괴 4건
npm audit fix
# Build Week 1 — 파괴 1건 (별도 PR + 회귀 테스트)
npm audit fix --force  # uuid 14 breaking
```

### 5.2 게이트 등재

`monster-art-gate` 워크플로우에 **`npm audit --omit=dev --audit-level=high`** BLOCK 단계 추가 권고. critical/high 1건이라도 발견 시 종료코드 1.

---

## 6. XSS / CSRF / SQL Injection — 표면 분석 (🟢 하)

| 표면 | 결과 | 근거 |
|------|------|------|
| **XSS** | 🟢 표면 없음 | 파이프라인은 빌드 타임 CLI · 런타임 import 금지(Z9) · 인게임 노출은 `monster-bestiary-ingame-copy.md` i18n 키만 사용 (HTML innerHTML 경로 부재) |
| **CSRF** | 🟢 표면 없음 | HTTP 엔드포인트 0건 — 파이프라인은 `node` CLI + GitHub Actions 만 호출 |
| **SQL Injection** | 🟢 표면 없음 | DB 쿼리 0건 — `monster_catalog.json` 파일 IO만, 사용자 입력은 zod 스키마(V6 권고) 통과 |

**다만 사후 표면 진입 시점**(Bestiary 검색·관리자 패널·DB 적재) 도래하면 본 결과 무효 — 그 시점에 재감사 필수.

---

## 7. Secret / 자격증명 (🟢 하 / A1·A2)

`scripts/monster-pipeline/**` 정적 grep 결과 평문 키 **0건**. provider 모듈은 license URL/version 만 보유, API 키는 추후 Build 단계에서 `process.env.FIREFLY_API_KEY` 형태로 주입 예정 — 그 시점에 `gitleaks` + `trufflehog` 사전 스캔(체크리스트 §2.1) 게이트 필수.

**경고**: 현재 `axios` 가 직접 의존성으로 존재하므로 SSRF 사슬(공급망 §5)이 메타데이터 엔드포인트(`http://169.254.169.254/`)로 흐를 가능성 있음. provider 모듈에 **`baseURL` 화이트리스트 강제**(`^https://(firefly\.adobe\.io|api\.stability\.ai)/`)를 권고.

---

## 8. 게이트 컨벤션 적용 결과

`security-checklist §7` 컨벤션 기준:

```
종료코드: 0 PASS / 1 BLOCK / 2 WARN / 3 ERROR

🔴 BLOCK (5):
  - V7  path traversal (PoC 성공)
  - V1·V2·V3 prompt injection 무방어
  - V9·V10 magic bytes/EXIF 부재
  - V14·V18 라이선스 메타 강제 게이트 미구현
  - S2 npm audit critical 1 + high 1

🟡 WARN (2):
  - V17·S3 provider 화이트리스트 type-cast 우회
  - axios SSRF 의존성 (게이트 통과 PR 봉인 대기)

🟢 PASS (2):
  - 자격증명 평문 0건 (현재 스코프)
  - XSS/CSRF/SQLi 표면 없음 (현재 스코프)
```

**현 상태로는 `monster-art-gate` BLOCK 종료** — Build 단계 P0 체크리스트(W1·W2·W3) 9개 항목 봉인 후 재게이트 권고.

---

## 9. 인계 — 다음 단계

### 9.1 Build (계섬월·두련사·이소화 합주)

| # | 항목 | 책임 | 우선 |
|---|------|------|------|
| 1 | `assertMonsterId` 신설 + 4 호출부 적용 | 이소화 → 계섬월 PR | W1 |
| 2 | `assertProviderId` + `Object.hasOwn` 가드 | 계섬월 | W1 |
| 3 | `license_check.ts` + `dictionary.yml` (작가 1,200건) | 이소화 | W1 |
| 4 | `safeCopyPng` (sharp + magic bytes + EXIF strip) | 이소화 → 계섬월 | W2 |
| 5 | `npm audit fix` (4건) + 별도 PR `uuid@14` | 두련사 | W1 |
| 6 | `monster-art-gate` 워크플로우 + `npm audit --audit-level=high` | 두련사 | W2 |
| 7 | provider `baseURL` 화이트리스트 | 이소화 | W2 |
| 8 | `gitleaks` + `trufflehog` pre-commit · CI | 이소화 | W2 |

### 9.2 Test (적경홍 합주)

- T-PT-01 ~ 06 (path traversal 회귀)
- 프롬프트 인젝션 fuzz 1,000건 차단율 100% 단언
- magic bytes 우회(JPEG-as-PNG·SVG-as-PNG·zip-bomb) 12건
- npm audit 게이트 회귀 — high 1건 추가 시 종료코드 1 단언

### 9.3 Ship (백능파 결재)

- `launch_checklist §2.18` 신설 — 본 보고서의 BLOCK 5건 + WARN 2건 모두 PASS 시점에만 머지

### 9.4 Reflect

- 3대 KPI(체크리스트 §10) — 라이선스 분쟁 0건 / 자격증명 유출 0건 / 게이트 우회 0건
- 본 보고서의 PoC 케이스를 **연 1회 회귀** (도(道)는 끝나지 않는 봉인이옵니다)

---

## 10. 부록 — 실증 명령

```bash
# Path traversal PoC (재현 가능)
cd C:/fork/aeterna-chronicle-web2
node --input-type=module -e "
import('./scripts/monster-pipeline/helpers.ts').then(({resolveRawArtifactPath}) => {
  console.log(resolveRawArtifactPath('C:/workspace', '../../../etc/passwd'));
});
"
# 출력: C:\workspace\assets\etc\passwd.png  (🔴 탈출 성공)

# npm audit 재현
npm audit --omit=dev
# 출력: 5 vulnerabilities (3 moderate, 1 high, 1 critical)
```

---

봉인은 끝나지 않는 도(道)이옵니다. Build 단계로 8건의 봉인 패치를 인계하오니, 매주 도량을 살펴 사기(邪氣)가 다시 깃들지 않도록 하시옵소서. 🪷
