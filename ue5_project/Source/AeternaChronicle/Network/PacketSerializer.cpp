// PacketSerializer.cpp
// 에테르나 크로니클 — 패킷 직렬화 구현

#include "PacketSerializer.h"
#include "AeternaChronicle/AeternaChronicle.h"
#include "Json.h"

// ═══════════════════════════════════════
// 내부 바이너리 유틸
// ═══════════════════════════════════════

void FAeternaPacketSerializer::WriteString(TArray<uint8>& Buffer, const FString& Str)
{
    // 길이 프리픽스 (2바이트) + UTF-8 바이트열
    FTCHARToUTF8 Converter(*Str);
    const int32 Length = Converter.Length();
    
    // 길이 (리틀 엔디안)
    Buffer.Add(static_cast<uint8>(Length & 0xFF));
    Buffer.Add(static_cast<uint8>((Length >> 8) & 0xFF));
    
    // 문자열 데이터
    Buffer.Append(reinterpret_cast<const uint8*>(Converter.Get()), Length);
}

void FAeternaPacketSerializer::WriteFloat(TArray<uint8>& Buffer, float Value)
{
    const uint8* Bytes = reinterpret_cast<const uint8*>(&Value);
    Buffer.Append(Bytes, sizeof(float));
}

void FAeternaPacketSerializer::WriteInt32(TArray<uint8>& Buffer, int32 Value)
{
    const uint8* Bytes = reinterpret_cast<const uint8*>(&Value);
    Buffer.Append(Bytes, sizeof(int32));
}

bool FAeternaPacketSerializer::ReadString(const TArray<uint8>& Buffer, int32& Offset, FString& OutStr)
{
    if (Offset + 2 > Buffer.Num()) return false;

    const int32 Length = Buffer[Offset] | (Buffer[Offset + 1] << 8);
    Offset += 2;

    if (Offset + Length > Buffer.Num()) return false;

    FUTF8ToTCHAR Converter(reinterpret_cast<const ANSICHAR*>(&Buffer[Offset]), Length);
    OutStr = FString(Converter.Length(), Converter.Get());
    Offset += Length;
    return true;
}

bool FAeternaPacketSerializer::ReadFloat(const TArray<uint8>& Buffer, int32& Offset, float& OutValue)
{
    if (Offset + sizeof(float) > Buffer.Num()) return false;

    FMemory::Memcpy(&OutValue, &Buffer[Offset], sizeof(float));
    Offset += sizeof(float);
    return true;
}

bool FAeternaPacketSerializer::ReadInt32(const TArray<uint8>& Buffer, int32& Offset, int32& OutValue)
{
    if (Offset + sizeof(int32) > Buffer.Num()) return false;

    FMemory::Memcpy(&OutValue, &Buffer[Offset], sizeof(int32));
    Offset += sizeof(int32);
    return true;
}

// ═══════════════════════════════════════
// 직렬화
// ═══════════════════════════════════════

TArray<uint8> FAeternaPacketSerializer::SerializePlayerMove(
    const FString& CharacterId, float X, float Y, const FString& State)
{
    TArray<uint8> Buffer;
    Buffer.Reserve(64);

    // 패킷 타입 헤더
    Buffer.Add(static_cast<uint8>(EPacketType::PlayerMove));

    // 필드 직렬화
    WriteString(Buffer, CharacterId);
    WriteFloat(Buffer, X);
    WriteFloat(Buffer, Y);
    WriteString(Buffer, State);

    return Buffer;
}

TArray<uint8> FAeternaPacketSerializer::SerializePlayerAction(
    const FString& CharacterId, const FString& ActionType, const FString& TargetId)
{
    TArray<uint8> Buffer;
    Buffer.Reserve(64);

    Buffer.Add(static_cast<uint8>(EPacketType::PlayerAction));
    WriteString(Buffer, CharacterId);
    WriteString(Buffer, ActionType);
    WriteString(Buffer, TargetId);

    return Buffer;
}

TArray<uint8> FAeternaPacketSerializer::SerializeJoinRoom(
    const FString& RoomId, const FString& CharacterId)
{
    TArray<uint8> Buffer;
    Buffer.Reserve(32);

    Buffer.Add(static_cast<uint8>(EPacketType::JoinRoom));
    WriteString(Buffer, RoomId);
    WriteString(Buffer, CharacterId);

    return Buffer;
}

TArray<uint8> FAeternaPacketSerializer::SerializePvpAction(
    const FString& CharacterId, const FString& ActionType,
    const FString& TargetId, int32 Damage, const FString& SkillId)
{
    TArray<uint8> Buffer;
    Buffer.Reserve(96);

    Buffer.Add(static_cast<uint8>(EPacketType::PvpAction));
    WriteString(Buffer, CharacterId);
    WriteString(Buffer, ActionType);
    WriteString(Buffer, TargetId);
    WriteInt32(Buffer, Damage);
    WriteString(Buffer, SkillId);

    return Buffer;
}

// ═══════════════════════════════════════
// 역직렬화
// ═══════════════════════════════════════

FAeternaPacketSerializer::EPacketType FAeternaPacketSerializer::GetPacketType(const TArray<uint8>& Data)
{
    if (Data.Num() == 0)
    {
        return EPacketType::PlayerMove; // 기본값
    }
    return static_cast<EPacketType>(Data[0]);
}

bool FAeternaPacketSerializer::DeserializePlayerMove(
    const TArray<uint8>& Data,
    FString& OutCharacterId, float& OutX, float& OutY, FString& OutState)
{
    if (Data.Num() < 2 || Data[0] != static_cast<uint8>(EPacketType::PlayerMove))
    {
        return false;
    }

    int32 Offset = 1; // 패킷 타입 건너뜀
    return ReadString(Data, Offset, OutCharacterId)
        && ReadFloat(Data, Offset, OutX)
        && ReadFloat(Data, Offset, OutY)
        && ReadString(Data, Offset, OutState);
}

bool FAeternaPacketSerializer::DeserializePvpResult(
    const TArray<uint8>& Data,
    FString& OutMatchId, FString& OutWinnerId,
    int32& OutPlayer1Score, int32& OutPlayer2Score, int32& OutRatingChange)
{
    if (Data.Num() < 2 || Data[0] != static_cast<uint8>(EPacketType::PvpResult))
    {
        return false;
    }

    int32 Offset = 1;
    return ReadString(Data, Offset, OutMatchId)
        && ReadString(Data, Offset, OutWinnerId)
        && ReadInt32(Data, Offset, OutPlayer1Score)
        && ReadInt32(Data, Offset, OutPlayer2Score)
        && ReadInt32(Data, Offset, OutRatingChange);
}

// ═══════════════════════════════════════
// JSON 폴백
// ═══════════════════════════════════════

FString FAeternaPacketSerializer::SerializePlayerMoveAsJson(
    const FString& CharacterId, float X, float Y, const FString& State)
{
    TSharedPtr<FJsonObject> JsonObj = MakeShared<FJsonObject>();
    JsonObj->SetStringField(TEXT("type"), TEXT("player_move"));
    JsonObj->SetStringField(TEXT("character_id"), CharacterId);
    JsonObj->SetNumberField(TEXT("x"), X);
    JsonObj->SetNumberField(TEXT("y"), Y);
    JsonObj->SetStringField(TEXT("state"), State);

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(JsonObj.ToSharedRef(), Writer);
    return Output;
}

FString FAeternaPacketSerializer::SerializePlayerActionAsJson(
    const FString& CharacterId, const FString& ActionType, const FString& TargetId)
{
    TSharedPtr<FJsonObject> JsonObj = MakeShared<FJsonObject>();
    JsonObj->SetStringField(TEXT("type"), TEXT("player_action"));
    JsonObj->SetStringField(TEXT("character_id"), CharacterId);
    JsonObj->SetStringField(TEXT("action_type"), ActionType);
    JsonObj->SetStringField(TEXT("target_id"), TargetId);

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(JsonObj.ToSharedRef(), Writer);
    return Output;
}
