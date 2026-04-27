# 테스트·런타임 에러 메시지 카피 v1.0

> **작성**: 진채봉 Editor
> **스프린트**: E2E·통합 테스트 작성
> **목적**: 인벤토리·세이브 실패 케이스 사용자 메시지 SSOT
> **로케일**: ko · en · ja (i18n 동시 추가 권고)

---

## 1. 인벤토리 (`inventory.*`)

| 키 | ko | en | ja |
|----|----|----|----|
| `inventory.full` | 가방이 가득 찼사옵니다. 자리를 비우고 다시 시도하소서. | Your bag is full. Make room and try again. | 鞄がいっぱいです。空きを作ってからもう一度お試しください。 |
| `inventory.weightExceeded` | 짐의 무게가 한도를 넘었사옵니다. | Your load exceeds the weight limit. | 荷物の重さが上限を超えています。 |
| `inventory.itemLocked` | 잠긴 아이템은 사용할 수 없사옵니다. | Locked items cannot be used. | ロックされたアイテムは使用できません。 |
| `inventory.invalidStack` | 이 아이템은 합칠 수 없는 종류이옵니다. | This item type cannot be stacked. | このアイテムは重ねることができません。 |
| `inventory.dataCorrupted` | 인벤토리 데이터에 흠이 있사옵니다. 자동 복구를 시도하옵니다. | Inventory data is corrupted. Attempting auto-recovery. | インベントリデータが破損しています。自動復旧を試みます。 |

## 2. 세이브 (`save.*`)

| 키 | ko | en | ja |
|----|----|----|----|
| `save.success` | 기억이 잘 새겨졌사옵니다. | Save complete. | セーブが完了しました。 |
| `save.failed` | 기록을 남기지 못하였사옵니다. 잠시 후 다시 시도하소서. | Save failed. Please try again shortly. | セーブに失敗しました。しばらくしてからお試しください。 |
| `save.quotaExceeded` | 저장 공간이 부족하옵니다. 옛 기록을 정리하소서. | Storage quota exceeded. Please clear old saves. | 保存容量が不足しています。古いセーブを整理してください。 |
| `save.indexedDBBlocked` | 사파리 프라이빗 모드에선 이야기를 새길 수 없사옵니다. 일반 창으로 옮겨주소서. | Saving is unavailable in Safari Private mode. Please use a regular window. | Safariプライベートモードではセーブできません。通常ウィンドウをご利用ください。 |
| `save.itpExpired` | 7일간 방문이 없어 기록이 옅어졌사옵니다. 백업을 복원하옵니다. | Save data has expired due to 7 days of inactivity. Restoring from backup. | 7日間アクセスがなかったため記録が消えました。バックアップから復元します。 |
| `save.versionMismatch` | 옛 버전의 기록이옵니다. 새 형식으로 옮기겠사옵니다. | Older save version detected. Migrating to current format. | 古いバージョンのセーブデータです。新しい形式に変換します。 |
| `save.checksumFailed` | 기록의 봉인이 깨졌사옵니다. 백업으로 되돌리옵니다. | Save checksum failed. Reverting to backup. | セーブの整合性チェックに失敗しました。バックアップに戻します。 |
| `save.slotEmpty` | 빈 슬롯이옵니다. | Empty slot. | 空のスロットです。 |
| `save.confirmOverwrite` | 이 자리의 기록 위에 새 기억을 새기시겠사옵니까? | Overwrite the existing save in this slot? | このスロットのセーブを上書きしますか？ |

## 3. UI·입력 (`ui.*`)

| 키 | ko | en | ja |
|----|----|----|----|
| `ui.loadingTimeout` | 불러오기가 더디옵니다. 망토를 가다듬고 잠시만 기다리소서. | Loading is taking longer than expected. Please wait. | 読み込みに時間がかかっています。お待ちください。 |
| `ui.networkLost` | 에테르의 흐름이 끊겼사옵니다. 다시 연결을 시도하옵니다. | Network connection lost. Reconnecting. | ネットワーク接続が切れました。再接続中です。 |
| `ui.gamepadDisconnected` | 게임패드의 연이 끊겼사옵니다. | Gamepad disconnected. | ゲームパッドが切断されました。 |

## 4. 테스트 단언(assertion) 메시지 — 개발자용

> 한국어 단일. 사용자에게 노출되지 않습니다.

| 패턴 | 예시 |
|------|------|
| `expect.toEqual` 실패 | `[TC-INV-007] 신화 세트 합산 스탯이 기댓값과 어긋나옵니다 (expected: 1240, received: 1180)` |
| 타임아웃 | `[TC-SAV-001] 슬롯1 저장 응답이 5초를 넘기었사옵니다` |
| 시각 회귀 | `[TC-UI-005] ATB 게이지 ready 상태 스냅샷이 어긋나옵니다 (diff: 3.2%)` |
| 플레이키 의심 | `[TC-INV-014] 같은 시나리오에서 합부가 갈리오니 격리하소서` |

---

## 적용 가이드

1. `client/src/i18n/{ko,en,ja}.json`에 위 키를 동일 경로로 삽입
2. 테스트는 키 자체를 검증 (문자열 직접 비교 금지)
3. 새 키 추가 시 본 문서를 먼저 갱신 후 i18n에 반영 (SSOT 원칙)
