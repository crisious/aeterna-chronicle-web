// ServerConnection.h
// 에테르나 크로니클 — WebSocket 서버 연동 컴포넌트

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "IWebSocket.h"
#include "ServerConnection.generated.h"

/**
 * UAeternaServerConnection
 * 
 * WebSocket 기반 실시간 서버 연결 컴포넌트.
 * 에테르나 공통 서버(Node.js + Socket.io)와 통신.
 * 
 * 연결 URL은 DefaultEngine.ini의 [/Script/AeternaChronicle.ServerSettings] 참조.
 */
UCLASS(ClassGroup=(Network), meta=(BlueprintSpawnableComponent))
class AETERNACHRONICLE_API UAeternaServerConnection : public UActorComponent
{
    GENERATED_BODY()

public:
    UAeternaServerConnection();

    // ─── 연결 관리 ───

    /** 서버에 연결 */
    UFUNCTION(BlueprintCallable, Category = "네트워크")
    void Connect();

    /** 서버 연결 해제 */
    UFUNCTION(BlueprintCallable, Category = "네트워크")
    void Disconnect();

    /** 재연결 시도 */
    UFUNCTION(BlueprintCallable, Category = "네트워크")
    void Reconnect();

    /** 연결 상태 확인 */
    UFUNCTION(BlueprintCallable, Category = "네트워크")
    bool IsConnected() const;

    // ─── 메시지 송신 ───

    /** 원시 문자열 메시지 전송 */
    UFUNCTION(BlueprintCallable, Category = "네트워크")
    void SendMessage(const FString& Message);

    /** PlayerMove 메시지 전송 (Protobuf 직렬화) */
    void SendPlayerMove(const FString& CharacterId, float X, float Y, const FString& State);

    /** PlayerAction 메시지 전송 */
    void SendPlayerAction(const FString& CharacterId, const FString& ActionType, const FString& TargetId);

    /** JoinRoom 메시지 전송 */
    void SendJoinRoom(const FString& RoomId, const FString& CharacterId);

    // ─── 이벤트 델리게이트 ───

    /** 연결 성공 */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnConnected);
    UPROPERTY(BlueprintAssignable, Category = "네트워크|이벤트")
    FOnConnected OnConnected;

    /** 연결 해제 */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnDisconnected, int32, StatusCode, const FString&, Reason);
    UPROPERTY(BlueprintAssignable, Category = "네트워크|이벤트")
    FOnDisconnected OnDisconnected;

    /** 메시지 수신 */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnMessageReceived, const FString&, Message);
    UPROPERTY(BlueprintAssignable, Category = "네트워크|이벤트")
    FOnMessageReceived OnMessageReceived;

    /** 연결 오류 */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnConnectionError, const FString&, Error);
    UPROPERTY(BlueprintAssignable, Category = "네트워크|이벤트")
    FOnConnectionError OnConnectionError;

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    // ─── WebSocket 인스턴스 ───
    TSharedPtr<IWebSocket> WebSocket;

    // ─── 설정 ───
    
    /** 서버 URL (DefaultEngine.ini에서 읽어옴) */
    FString ServerURL;

    /** 재연결 간격 (초) */
    float ReconnectInterval = 5.0f;

    /** 최대 재연결 시도 횟수 */
    int32 MaxReconnectRetries = 10;

    /** 현재 재연결 시도 횟수 */
    int32 CurrentRetryCount = 0;

    /** 재연결 타이머 핸들 */
    FTimerHandle ReconnectTimerHandle;

    // ─── 내부 핸들러 ───
    void OnWebSocketConnected();
    void OnWebSocketConnectionError(const FString& Error);
    void OnWebSocketClosed(int32 StatusCode, const FString& Reason, bool bWasClean);
    void OnWebSocketMessageReceived(const FString& Message);

    /** 설정 파일에서 서버 URL 로드 */
    void LoadServerSettings();

    /** 수신 메시지 처리 (JSON 파싱 → 이벤트 디스패치) */
    void ProcessIncomingMessage(const FString& Message);
};
