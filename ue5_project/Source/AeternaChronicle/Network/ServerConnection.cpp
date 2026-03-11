// ServerConnection.cpp
// 에테르나 크로니클 — WebSocket 서버 연동 구현

#include "ServerConnection.h"
#include "PacketSerializer.h"
#include "AeternaChronicle/AeternaChronicle.h"

#include "WebSocketsModule.h"
#include "IWebSocket.h"
#include "Json.h"
#include "JsonUtilities.h"
#include "Misc/ConfigCacheIni.h"
#include "TimerManager.h"

UAeternaServerConnection::UAeternaServerConnection()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UAeternaServerConnection::BeginPlay()
{
    Super::BeginPlay();

    // WebSockets 모듈 로드
    FModuleManager::Get().LoadModuleChecked<FWebSocketsModule>("WebSockets");

    // 설정 로드
    LoadServerSettings();
}

void UAeternaServerConnection::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    Disconnect();
    Super::EndPlay(EndPlayReason);
}

void UAeternaServerConnection::LoadServerSettings()
{
    // DefaultEngine.ini에서 서버 URL 읽기
    if (!GConfig->GetString(
        TEXT("/Script/AeternaChronicle.ServerSettings"),
        TEXT("WebSocketURL"),
        ServerURL,
        GEngineIni))
    {
        ServerURL = TEXT("ws://localhost:3001");
        UE_LOG(LogAeternaNetwork, Warning, TEXT("서버 URL 설정 누락 — 기본값 사용: %s"), *ServerURL);
    }

    GConfig->GetFloat(
        TEXT("/Script/AeternaChronicle.ServerSettings"),
        TEXT("WebSocketReconnectInterval"),
        ReconnectInterval,
        GEngineIni);

    int32 MaxRetries = 10;
    GConfig->GetInt(
        TEXT("/Script/AeternaChronicle.ServerSettings"),
        TEXT("WebSocketMaxRetries"),
        MaxRetries,
        GEngineIni);
    MaxReconnectRetries = MaxRetries;

    UE_LOG(LogAeternaNetwork, Log, TEXT("서버 설정 로드: URL=%s, 재연결 간격=%.1fs, 최대 재시도=%d"),
        *ServerURL, ReconnectInterval, MaxReconnectRetries);
}

void UAeternaServerConnection::Connect()
{
    if (WebSocket.IsValid() && WebSocket->IsConnected())
    {
        UE_LOG(LogAeternaNetwork, Warning, TEXT("이미 연결됨"));
        return;
    }

    // WebSocket 생성
    const FString Protocol = TEXT("ws");
    TMap<FString, FString> Headers;
    Headers.Add(TEXT("client_type"), TEXT("unreal")); // 클라이언트 타입 헤더

    WebSocket = FWebSocketsModule::Get().CreateWebSocket(ServerURL, Protocol, Headers);

    // ─── 이벤트 바인딩 ───
    WebSocket->OnConnected().AddUObject(this, &UAeternaServerConnection::OnWebSocketConnected);
    WebSocket->OnConnectionError().AddUObject(this, &UAeternaServerConnection::OnWebSocketConnectionError);
    WebSocket->OnClosed().AddUObject(this, &UAeternaServerConnection::OnWebSocketClosed);
    WebSocket->OnMessage().AddUObject(this, &UAeternaServerConnection::OnWebSocketMessageReceived);

    // 연결 시작
    UE_LOG(LogAeternaNetwork, Log, TEXT("서버 연결 시도: %s"), *ServerURL);
    WebSocket->Connect();
}

void UAeternaServerConnection::Disconnect()
{
    // 재연결 타이머 해제
    if (GetWorld())
    {
        GetWorld()->GetTimerManager().ClearTimer(ReconnectTimerHandle);
    }

    if (WebSocket.IsValid())
    {
        WebSocket->Close();
        WebSocket.Reset();
    }

    CurrentRetryCount = 0;
    UE_LOG(LogAeternaNetwork, Log, TEXT("서버 연결 해제"));
}

void UAeternaServerConnection::Reconnect()
{
    if (CurrentRetryCount >= MaxReconnectRetries)
    {
        UE_LOG(LogAeternaNetwork, Error, TEXT("최대 재연결 시도 횟수 초과 (%d회)"), MaxReconnectRetries);
        OnConnectionError.Broadcast(TEXT("최대 재연결 시도 초과"));
        return;
    }

    CurrentRetryCount++;
    UE_LOG(LogAeternaNetwork, Log, TEXT("재연결 시도 %d/%d (%.1f초 후)"),
        CurrentRetryCount, MaxReconnectRetries, ReconnectInterval);

    // 기존 연결 정리
    if (WebSocket.IsValid())
    {
        WebSocket->Close();
        WebSocket.Reset();
    }

    // 타이머로 재연결
    if (GetWorld())
    {
        GetWorld()->GetTimerManager().SetTimer(
            ReconnectTimerHandle,
            this,
            &UAeternaServerConnection::Connect,
            ReconnectInterval,
            false);
    }
}

bool UAeternaServerConnection::IsConnected() const
{
    return WebSocket.IsValid() && WebSocket->IsConnected();
}

void UAeternaServerConnection::SendMessage(const FString& Message)
{
    if (!IsConnected())
    {
        UE_LOG(LogAeternaNetwork, Warning, TEXT("메시지 전송 실패: 미연결 상태"));
        return;
    }

    WebSocket->Send(Message);
}

void UAeternaServerConnection::SendPlayerMove(
    const FString& CharacterId, float X, float Y, const FString& State)
{
    // Protobuf 직렬화 → 바이너리 전송
    TArray<uint8> Payload = FAeternaPacketSerializer::SerializePlayerMove(CharacterId, X, Y, State);
    
    if (Payload.Num() > 0 && IsConnected())
    {
        // 바이너리 메시지 전송
        WebSocket->Send(Payload.GetData(), Payload.Num(), true);
    }
}

void UAeternaServerConnection::SendPlayerAction(
    const FString& CharacterId, const FString& ActionType, const FString& TargetId)
{
    TArray<uint8> Payload = FAeternaPacketSerializer::SerializePlayerAction(
        CharacterId, ActionType, TargetId);

    if (Payload.Num() > 0 && IsConnected())
    {
        WebSocket->Send(Payload.GetData(), Payload.Num(), true);
    }
}

void UAeternaServerConnection::SendJoinRoom(const FString& RoomId, const FString& CharacterId)
{
    TArray<uint8> Payload = FAeternaPacketSerializer::SerializeJoinRoom(RoomId, CharacterId);

    if (Payload.Num() > 0 && IsConnected())
    {
        WebSocket->Send(Payload.GetData(), Payload.Num(), true);
    }
}

// ─── WebSocket 이벤트 핸들러 ───

void UAeternaServerConnection::OnWebSocketConnected()
{
    CurrentRetryCount = 0;
    UE_LOG(LogAeternaNetwork, Log, TEXT("서버 연결 성공: %s"), *ServerURL);
    OnConnected.Broadcast();
}

void UAeternaServerConnection::OnWebSocketConnectionError(const FString& Error)
{
    UE_LOG(LogAeternaNetwork, Error, TEXT("서버 연결 오류: %s"), *Error);
    OnConnectionError.Broadcast(Error);

    // 자동 재연결
    Reconnect();
}

void UAeternaServerConnection::OnWebSocketClosed(int32 StatusCode, const FString& Reason, bool bWasClean)
{
    UE_LOG(LogAeternaNetwork, Log, TEXT("서버 연결 종료: StatusCode=%d, Reason=%s, Clean=%s"),
        StatusCode, *Reason, bWasClean ? TEXT("Yes") : TEXT("No"));

    OnDisconnected.Broadcast(StatusCode, Reason);

    // 비정상 종료 시 재연결
    if (!bWasClean)
    {
        Reconnect();
    }
}

void UAeternaServerConnection::OnWebSocketMessageReceived(const FString& Message)
{
    OnMessageReceived.Broadcast(Message);
    ProcessIncomingMessage(Message);
}

void UAeternaServerConnection::ProcessIncomingMessage(const FString& Message)
{
    // JSON 파싱
    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);

    if (!FJsonSerializer::Deserialize(Reader, JsonObject) || !JsonObject.IsValid())
    {
        UE_LOG(LogAeternaNetwork, Warning, TEXT("JSON 파싱 실패: %s"), *Message);
        return;
    }

    // 메시지 타입 기반 디스패치
    FString MessageType;
    if (JsonObject->TryGetStringField(TEXT("type"), MessageType))
    {
        if (MessageType == TEXT("player_joined"))
        {
            FString CharacterId = JsonObject->GetStringField(TEXT("character_id"));
            UE_LOG(LogAeternaNetwork, Log, TEXT("플레이어 입장: %s"), *CharacterId);
            // TODO: 다른 플레이어 스폰
        }
        else if (MessageType == TEXT("player_move"))
        {
            // TODO: 다른 플레이어 위치 동기화
        }
        else if (MessageType == TEXT("combat_result"))
        {
            // TODO: 전투 결과 처리
        }
        else
        {
            UE_LOG(LogAeternaNetwork, Verbose, TEXT("알 수 없는 메시지 타입: %s"), *MessageType);
        }
    }
}
