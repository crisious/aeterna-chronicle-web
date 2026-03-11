// PacketSerializer.h
// 에테르나 크로니클 — Protobuf 직렬화 유틸리티

#pragma once

#include "CoreMinimal.h"

/**
 * FAeternaPacketSerializer
 * 
 * shared/proto/game.proto 정의에 맞춰 패킷 직렬화/역직렬화.
 * Protobuf 라이브러리가 없는 환경에서는 수동 바이너리 인코딩 사용.
 * 
 * Protobuf 메시지 정의 (game.proto):
 *   - PlayerMove: character_id, x, y, state
 *   - PlayerAction: character_id, action_type, target_id
 *   - JoinRoom: room_id, character_id
 *   - PvpAction: character_id, action_type, target_id, damage, skill_id
 *   - PvpResult: match_id, winner_id, player1_score, player2_score, rating_change
 */
struct AETERNACHRONICLE_API FAeternaPacketSerializer
{
    // ─── 패킷 타입 ID ───
    enum class EPacketType : uint8
    {
        PlayerMove    = 0x01,
        PlayerAction  = 0x02,
        JoinRoom      = 0x03,
        PlayerJoined  = 0x04,
        PvpAction     = 0x05,
        PvpResult     = 0x06,
    };

    // ═══════════════════════════════════════
    // 직렬화 (UE → 서버)
    // ═══════════════════════════════════════

    /** PlayerMove 직렬화 */
    static TArray<uint8> SerializePlayerMove(
        const FString& CharacterId,
        float X, float Y,
        const FString& State);

    /** PlayerAction 직렬화 */
    static TArray<uint8> SerializePlayerAction(
        const FString& CharacterId,
        const FString& ActionType,
        const FString& TargetId);

    /** JoinRoom 직렬화 */
    static TArray<uint8> SerializeJoinRoom(
        const FString& RoomId,
        const FString& CharacterId);

    /** PvpAction 직렬화 */
    static TArray<uint8> SerializePvpAction(
        const FString& CharacterId,
        const FString& ActionType,
        const FString& TargetId,
        int32 Damage,
        const FString& SkillId);

    // ═══════════════════════════════════════
    // 역직렬화 (서버 → UE)
    // ═══════════════════════════════════════

    /** 패킷 타입 추출 (첫 바이트) */
    static EPacketType GetPacketType(const TArray<uint8>& Data);

    /** PlayerMove 역직렬화 */
    static bool DeserializePlayerMove(
        const TArray<uint8>& Data,
        FString& OutCharacterId,
        float& OutX, float& OutY,
        FString& OutState);

    /** PvpResult 역직렬화 */
    static bool DeserializePvpResult(
        const TArray<uint8>& Data,
        FString& OutMatchId,
        FString& OutWinnerId,
        int32& OutPlayer1Score,
        int32& OutPlayer2Score,
        int32& OutRatingChange);

    // ═══════════════════════════════════════
    // JSON 폴백 (Protobuf 미사용 시)
    // ═══════════════════════════════════════

    /** JSON 형식으로 PlayerMove 직렬화 (디버그/폴백용) */
    static FString SerializePlayerMoveAsJson(
        const FString& CharacterId,
        float X, float Y,
        const FString& State);

    /** JSON 형식으로 PlayerAction 직렬화 */
    static FString SerializePlayerActionAsJson(
        const FString& CharacterId,
        const FString& ActionType,
        const FString& TargetId);

private:
    // ─── 내부 바이너리 유틸 ───
    static void WriteString(TArray<uint8>& Buffer, const FString& Str);
    static void WriteFloat(TArray<uint8>& Buffer, float Value);
    static void WriteInt32(TArray<uint8>& Buffer, int32 Value);
    static bool ReadString(const TArray<uint8>& Buffer, int32& Offset, FString& OutStr);
    static bool ReadFloat(const TArray<uint8>& Buffer, int32& Offset, float& OutValue);
    static bool ReadInt32(const TArray<uint8>& Buffer, int32& Offset, int32& OutValue);
};
