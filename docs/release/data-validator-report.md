# data-validator 리포트 — `report`

- 실행: 2026-04-27T23:49:42.141Z → 2026-04-27T23:49:42.171Z (30ms)
- 결과: **✅ PASS** (errors=0, warns=5)
- 파일=3 · 레코드=9

## 도메인 요약

| 도메인 | 파일 | 레코드 | 에러 | 경고 |
|---|---:|---:|---:|---:|
| skill | 1 | 3 | 0 | 3 |
| item | 0 | 0 | 0 | 0 |
| monster | 1 | 4 | 0 | 0 |
| encounter | 1 | 2 | 0 | 2 |
| scenario | 0 | 0 | 0 | 0 |

## Findings

### reference (8)

- **[INFO] REF_UNKNOWN_TARGET_DOMAIN** `C:\fork\aeterna-chronicle-web2\data\skills\sample.json:6:17  /0/effectId`
  - [skill→effect] 타겟 도메인 미정의 — schema/auditor 확장 필요 (id=eff_phys_basic)
  - 힌트: 계섬월 인계 메모: effect/category 도메인 분리 또는 임베드 결정 필요
- **[INFO] REF_UNKNOWN_TARGET_DOMAIN** `C:\fork\aeterna-chronicle-web2\data\skills\sample.json:14:17  /1/effectId`
  - [skill→effect] 타겟 도메인 미정의 — schema/auditor 확장 필요 (id=eff_mem_arrow)
  - 힌트: 계섬월 인계 메모: effect/category 도메인 분리 또는 임베드 결정 필요
- **[INFO] REF_UNKNOWN_TARGET_DOMAIN** `C:\fork\aeterna-chronicle-web2\data\skills\sample.json:22:17  /2/effectId`
  - [skill→effect] 타겟 도메인 미정의 — schema/auditor 확장 필요 (id=eff_shadow_step)
  - 힌트: 계섬월 인계 메모: effect/category 도메인 분리 또는 임베드 결정 필요
- **[WARN] REF_UNUSED_TARGET** `<skill>  /skl_basic_slash`
  - [skill] 미참조 ID: skl_basic_slash
  - 힌트: 실제로 사용 예정이면 무시. 의도치 않게 고립된 콘텐츠라면 시나리오/인카운터에 연결.
- **[WARN] REF_UNUSED_TARGET** `<skill>  /skl_memory_arrow`
  - [skill] 미참조 ID: skl_memory_arrow
  - 힌트: 실제로 사용 예정이면 무시. 의도치 않게 고립된 콘텐츠라면 시나리오/인카운터에 연결.
- **[WARN] REF_UNUSED_TARGET** `<skill>  /skl_shadow_step`
  - [skill] 미참조 ID: skl_shadow_step
  - 힌트: 실제로 사용 예정이면 무시. 의도치 않게 고립된 콘텐츠라면 시나리오/인카운터에 연결.
- **[WARN] REF_UNUSED_TARGET** `<encounter>  /enc_erebos_field`
  - [encounter] 미참조 ID: enc_erebos_field
  - 힌트: 실제로 사용 예정이면 무시. 의도치 않게 고립된 콘텐츠라면 시나리오/인카운터에 연결.
- **[WARN] REF_UNUSED_TARGET** `<encounter>  /enc_silvan_path`
  - [encounter] 미참조 ID: enc_silvan_path
  - 힌트: 실제로 사용 예정이면 무시. 의도치 않게 고립된 콘텐츠라면 시나리오/인카운터에 연결.
