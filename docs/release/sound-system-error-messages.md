# 🎵 사운드 시스템 — 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-27
> 스코프: 4종 게이트(coverage-bgm · coverage-sfx · license · normalize) × 4 상태(PASS/BLOCK/WARN/ERROR)
> 톤 5계명: ① 원인→처방 ② 수치는 사실 ③ 경로 절단 금지 ④ 시(詩)는 hint만 ⑤ 도메인 키 규약
> 키 규약: `audio.gate.<gate>.<state>.<reason>`

---

## 1. 매트릭스 개요

| 게이트 | PASS | BLOCK | WARN | ERROR | 슬롯 합계 |
|--------|:----:|:-----:|:----:|:-----:|:---------:|
| coverage-bgm | 1 | 1 | 1 | 1 | 4 |
| coverage-sfx | 1 | 1 | 1 | 1 | 4 |
| license      | 1 | 1 | 1 | 1 | 4 |
| normalize    | 1 | 1 | 1 | 1 | 4 |
| **합계**     | **4** | **4** | **4** | **4** | **16** |

ko/en 동시 정의 = 32줄.

---

## 2. coverage-bgm (씬 BGM 매핑)

### 2.1 PASS
- **key**: `audio.gate.coverage-bgm.pass.all-mapped`
- **ko**: `🟢 BGM 매핑 100%. {count}개 씬 모두 BGM 키 등재 완료.`
- **en**: `🟢 BGM mapping 100%. All {count} scenes have BGM keys.`
- **hint**: (없음 — 통과 시 시는 다음 게이트로)

### 2.2 BLOCK
- **key**: `audio.gate.coverage-bgm.block.missing-mapping`
- **ko**: `🔴 BGM 미매핑 씬 {count}개. 누락 씬: {scenes}. → audio/bgm-map.yaml 등재 후 재실행.`
- **en**: `🔴 {count} scenes without BGM mapping. Missing: {scenes}. → Add to audio/bgm-map.yaml then retry.`

### 2.3 WARN
- **key**: `audio.gate.coverage-bgm.warn.placeholder-key`
- **ko**: `🟡 플레이스홀더 BGM 키 {count}개 사용 중. 본곡 교체 권장. (누적 ≤ 3건 통과)`
- **en**: `🟡 {count} placeholder BGM keys in use. Replace with final tracks. (≤3 allowed)`

### 2.4 ERROR
- **key**: `audio.gate.coverage-bgm.error.file-not-found`
- **ko**: `🟠 BGM 파일 부재: {key} → {path}. 파일 누락 또는 경로 오타 확인.`
- **en**: `🟠 BGM file not found: {key} → {path}. Check missing file or path typo.`

---

## 3. coverage-sfx (전투 SFX)

### 3.1 PASS
- **key**: `audio.gate.coverage-sfx.pass.all-events`
- **ko**: `🟢 핵심 전투 SFX 100%. 스킬 {skill}/타격 {hit}/회피 {dodge}/크리티컬 {crit} 모두 등재.`
- **en**: `🟢 Combat SFX 100%. Skill {skill}/Hit {hit}/Dodge {dodge}/Crit {crit} all covered.`

### 3.2 BLOCK
- **key**: `audio.gate.coverage-sfx.block.skill-missing`
- **ko**: `🔴 스킬 SFX {count}개 누락. 누락 키: {keys}. → audio/sfx/skill/ 추가 후 sfx-map.yaml 갱신.`
- **en**: `🔴 {count} skill SFX missing. Keys: {keys}. → Add to audio/sfx/skill/ and update sfx-map.yaml.`

### 3.3 WARN
- **key**: `audio.gate.coverage-sfx.warn.duplicate-source`
- **ko**: `🟡 동일 음원 재사용 {count}건. 클래스 식별성 저하 우려. (감사 권장)`
- **en**: `🟡 {count} SFX reused across slots. May reduce class identity. (Review suggested)`

### 3.4 ERROR
- **key**: `audio.gate.coverage-sfx.error.latency-exceeded`
- **ko**: `🟠 SFX 응답 지연 초과: {key} {actual}ms (약속 ≤ 50ms). → 디코드 캐시 또는 파일 크기 확인.`
- **en**: `🟠 SFX latency exceeded: {key} {actual}ms (target ≤50ms). → Check decode cache or file size.`

---

## 4. license (라이선스 안전성)

### 4.1 PASS
- **key**: `audio.gate.license.pass.all-safe`
- **ko**: `🟢 라이선스 위험 0건. {total}개 자산 모두 CC0/CC-BY 4.0/OFL 1.1 안전 영역.`
- **en**: `🟢 Zero license risks. All {total} assets in CC0/CC-BY 4.0/OFL 1.1 safe zone.`

### 4.2 BLOCK
- **key**: `audio.gate.license.block.forbidden-license`
- **ko**: `🔴 금지 라이선스 자산 {count}건: {files}. → 교체 또는 권리자 동의 서면 첨부.`
- **en**: `🔴 {count} assets with forbidden license: {files}. → Replace or attach written permission.`

### 4.3 WARN
- **key**: `audio.gate.license.warn.attribution-missing`
- **ko**: `🟡 CC-BY 자산 {count}건 크레딧 누락. docs/legal/audio-credits.md 자동 등재 예정. (≤ 5건 통과)`
- **en**: `🟡 {count} CC-BY assets missing credit. Will auto-register to docs/legal/audio-credits.md. (≤5 allowed)`

### 4.4 ERROR
- **key**: `audio.gate.license.error.metadata-malformed`
- **ko**: `🟠 라이선스 메타 형식 오류: {file}.license.yaml — 4필드(source/license/author/url) 누락.`
- **en**: `🟠 License metadata malformed: {file}.license.yaml — missing 4 required fields (source/license/author/url).`

---

## 5. normalize (LUFS 음량 정규화)

### 5.1 PASS
- **key**: `audio.gate.normalize.pass.all-normalized`
- **ko**: `🟢 음량 정규화 완료. BGM -16 LUFS · SFX -14 LUFS · UI 가변 — 모두 ±1 LU 이내.`
- **en**: `🟢 Loudness normalized. BGM -16 LUFS · SFX -14 LUFS · UI variable — all within ±1 LU.`

### 5.2 BLOCK
- **key**: `audio.gate.normalize.block.peak-clipping`
- **ko**: `🔴 피크 클리핑 감지 {count}건: {files}. True Peak > -1 dBTP. → -1 dBTP로 리미팅.`
- **en**: `🔴 Peak clipping in {count} files: {files}. True Peak > -1 dBTP. → Limit to -1 dBTP.`

### 5.3 WARN
- **key**: `audio.gate.normalize.warn.lufs-drift`
- **ko**: `🟡 LUFS 편차 ±1 LU 초과 {count}건. (누적 ≤ 8건 통과 — 다음 스프린트에 정규화 권장)`
- **en**: `🟡 {count} files exceed ±1 LU drift. (≤8 allowed — schedule normalization)`

### 5.4 ERROR
- **key**: `audio.gate.normalize.error.codec-unsupported`
- **ko**: `🟠 미지원 코덱: {file} ({codec}). → .ogg(BGM/긴 SFX) 또는 .wav(짧은 SFX)로 변환.`
- **en**: `🟠 Unsupported codec: {file} ({codec}). → Convert to .ogg (BGM/long SFX) or .wav (short SFX).`

---

## 6. 코드 상수 매핑 (계섬월 인계)

```typescript
// src/constants/audio_gate_messages.ts
export const AUDIO_GATE_MESSAGES = {
  'coverage-bgm': {
    pass:  'audio.gate.coverage-bgm.pass.all-mapped',
    block: 'audio.gate.coverage-bgm.block.missing-mapping',
    warn:  'audio.gate.coverage-bgm.warn.placeholder-key',
    error: 'audio.gate.coverage-bgm.error.file-not-found',
  },
  'coverage-sfx': {
    pass:  'audio.gate.coverage-sfx.pass.all-events',
    block: 'audio.gate.coverage-sfx.block.skill-missing',
    warn:  'audio.gate.coverage-sfx.warn.duplicate-source',
    error: 'audio.gate.coverage-sfx.error.latency-exceeded',
  },
  license: {
    pass:  'audio.gate.license.pass.all-safe',
    block: 'audio.gate.license.block.forbidden-license',
    warn:  'audio.gate.license.warn.attribution-missing',
    error: 'audio.gate.license.error.metadata-malformed',
  },
  normalize: {
    pass:  'audio.gate.normalize.pass.all-normalized',
    block: 'audio.gate.normalize.block.peak-clipping',
    warn:  'audio.gate.normalize.warn.lufs-drift',
    error: 'audio.gate.normalize.error.codec-unsupported',
  },
} as const;
```

---

> 본 SSOT는 16개 슬롯 × ko/en 동시 정의(32줄)입니다. 카피 변경 시 톤 5계명 준수, 키 변경은 코드 상수와 동시 PR로 갱신.
