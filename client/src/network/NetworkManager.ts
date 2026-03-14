/**
 * NetworkManager — 클라이언트 네트워크 레이어 단일 진입점 (P10-12 → P25-01 확장)
 *
 * Socket + REST 통합 관리.
 * P25: 전투 API, 캐릭터 API, 퀘스트 API, 인벤토리 API, Auth API 메서드 추가.
 * JWT 토큰 관리 + 자동 헤더 세팅 + 재접속 + 에러 핸들링.
 */

import { io, Socket } from 'socket.io-client';

// ── 타입 정의 ─────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface NetworkConfig {
  serverUrl: string;
  maxReconnectAttempts: number;
  reconnectIntervalMs: number;
  restTimeoutMs: number;
}

export type ConnectionChangeHandler = (state: ConnectionState) => void;
export type EventHandler = (data: unknown) => void;

// ── Auth 타입 ─────────────────────────────────────────────────

export interface AuthCredentials {
  username: string;
  password: string;
  email?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  refreshToken?: string;
  user?: { id: string; username: string };
  error?: string;
}

// ── 캐릭터 타입 ───────────────────────────────────────────────

export interface CharacterData {
  id: string;
  name: string;
  classId: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  exp: number;
  gold: number;
  zoneId?: string;
}

export interface CreateCharacterRequest {
  name: string;
  classId: string;
}

// ── 전투 타입 ─────────────────────────────────────────────────

export interface CombatStartRequest {
  characterId: string;
  zoneId?: string;
  dungeonId?: string;
  monsterId?: string;
}

export interface CombatActionRequest {
  combatId: string;
  actionType: 'attack' | 'skill' | 'item' | 'defend' | 'flee';
  targetId?: string;
  skillId?: string;
  itemId?: string;
}

export interface CombatState {
  combatId: string;
  turn: number;
  allies: CombatUnitState[];
  enemies: CombatUnitState[];
  phase: string;
  log: string[];
}

export interface CombatUnitState {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  effects: string[];
  isAlive: boolean;
}

export interface CombatResult {
  combatId: string;
  victory: boolean;
  expGained: number;
  goldGained: number;
  loot: Array<{ itemId: string; name: string; quantity: number }>;
  levelUp?: { newLevel: number; statGains: Record<string, number> };
}

// ── 퀘스트 타입 ───────────────────────────────────────────────

export interface QuestData {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'active' | 'complete' | 'turned_in';
  objectives: Array<{ desc: string; current: number; target: number }>;
  rewards: { exp: number; gold: number; items?: string[] };
}

// ── 인벤토리 타입 ─────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  quantity: number;
  rarity: string;
  stats?: Record<string, number>;
}

// ── 존 / NPC 타입 ─────────────────────────────────────────────

export interface ZoneInfo {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  monsters: Array<{ id: string; name: string; level: number }>;
  npcs: Array<{ id: string; name: string; role: string }>;
}

// ── 소켓 이벤트 타입 ──────────────────────────────────────────

export interface SocketEvents {
  // 월드 이벤트
  'world:move': { characterId: string; x: number; y: number; state: string };
  'world:teleport': { characterId: string; zoneId: string };
  'world:playerJoined': { characterId: string; name: string; x: number; y: number };
  'world:playerLeft': { characterId: string };
  'world:monsterSpawn': { monsterId: string; name: string; x: number; y: number; level: number };
  'world:monsterDespawn': { monsterId: string };
  // 전투 이벤트
  'combat:tick': { combatId: string; turn: number; actions: unknown[] };
  'combat:result': CombatResult;
  'combat:effectApplied': { combatId: string; targetId: string; effectId: string; value: number };
  // 채팅
  'chat:message': { senderId: string; senderName: string; message: string; channel: string };
  // 시스템
  'system:notification': { type: string; message: string };
  'system:error': { code: string; message: string };
}

// ── 기본 설정 ─────────────────────────────────────────────────

const DEFAULT_CONFIG: NetworkConfig = {
  serverUrl: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SERVER_URL)
    || 'http://localhost:3000',
  maxReconnectAttempts: 10,
  reconnectIntervalMs: 3000,
  restTimeoutMs: 15_000,
};

const TOKEN_KEY = 'aeterna_jwt';
const REFRESH_TOKEN_KEY = 'aeterna_refresh_jwt';

// ── NetworkManager 클래스 ─────────────────────────────────────

class NetworkManager {
  private socket: Socket | null = null;
  private config: NetworkConfig;
  private _state: ConnectionState = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private connectionChangeHandlers: ConnectionChangeHandler[] = [];
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  private _token: string | null = null;
  private _refreshToken: string | null = null;
  private _userId: string | null = null;
  private _username: string | null = null;

  constructor(config?: Partial<NetworkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._loadTokens();
  }

  // ── 토큰 관리 ───────────────────────────────────────────────

  private _loadTokens(): void {
    try {
      this._token = localStorage.getItem(TOKEN_KEY);
      this._refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      // SSR / 테스트 환경에서 무시
    }
  }

  private _saveTokens(token: string, refreshToken?: string): void {
    this._token = token;
    if (refreshToken) this._refreshToken = refreshToken;
    try {
      localStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } catch { /* noop */ }
  }

  private _clearTokens(): void {
    this._token = null;
    this._refreshToken = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch { /* noop */ }
  }

  get token(): string | null { return this._token; }
  get isAuthenticated(): boolean { return !!this._token; }
  get userId(): string | null { return this._userId; }
  get username(): string | null { return this._username; }

  // ── 연결 상태 ───────────────────────────────────────────────

  get state(): ConnectionState { return this._state; }
  get isConnected(): boolean { return this._state === 'connected' && (this.socket?.connected ?? false); }
  get socketId(): string | undefined { return this.socket?.id; }

  onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionChangeHandlers.push(handler);
    return () => {
      this.connectionChangeHandlers = this.connectionChangeHandlers.filter((h) => h !== handler);
    };
  }

  // ── Auth API (P25-03) ───────────────────────────────────────

  async register(creds: AuthCredentials): Promise<AuthResponse> {
    const res = await this.post<AuthResponse>('/auth/register', creds);
    if (res.token) {
      this._saveTokens(res.token, res.refreshToken);
      this._userId = res.user?.id ?? null;
      this._username = res.user?.username ?? null;
    }
    return res;
  }

  async login(creds: AuthCredentials): Promise<AuthResponse> {
    const res = await this.post<AuthResponse>('/auth/login', creds);
    if (res.token) {
      this._saveTokens(res.token, res.refreshToken);
      this._userId = res.user?.id ?? null;
      this._username = res.user?.username ?? null;
    }
    return res;
  }

  async refreshAuth(): Promise<boolean> {
    if (!this._refreshToken) return false;
    try {
      const res = await this.post<AuthResponse>('/auth/refresh', { refreshToken: this._refreshToken });
      if (res.token) {
        this._saveTokens(res.token, res.refreshToken);
        return true;
      }
    } catch {
      console.warn('[NetworkManager] 토큰 갱신 실패');
    }
    this._clearTokens();
    return false;
  }

  logout(): void {
    this._clearTokens();
    this._userId = null;
    this._username = null;
    this.disconnect();
  }

  // ── 캐릭터 API (P25-02) ────────────────────────────────────

  async getCharacters(): Promise<CharacterData[]> {
    return this.get<CharacterData[]>('/api/characters');
  }

  async createCharacter(req: CreateCharacterRequest): Promise<CharacterData> {
    return this.post<CharacterData>('/api/characters', req);
  }

  async getCharacter(id: string): Promise<CharacterData> {
    return this.get<CharacterData>(`/api/characters/${id}`);
  }

  async getClasses(): Promise<Array<{ id: string; name: string; nameEn: string; description: string; stats: Record<string, number> }>> {
    return this.get('/api/class');
  }

  // ── 전투 API (P25-05) ──────────────────────────────────────

  async combatStart(req: CombatStartRequest): Promise<CombatState> {
    return this.post<CombatState>('/api/combat/start', req);
  }

  async combatAction(req: CombatActionRequest): Promise<CombatState> {
    return this.post<CombatState>('/api/combat/action', req);
  }

  async combatTick(combatId: string): Promise<CombatState> {
    return this.post<CombatState>('/api/combat/tick', { combatId });
  }

  async combatGetState(combatId: string): Promise<CombatState> {
    return this.get<CombatState>(`/api/combat/state/${combatId}`);
  }

  async combatEnd(combatId: string): Promise<CombatResult> {
    return this.post<CombatResult>('/api/combat/end', { combatId });
  }

  async combatLog(combatId: string): Promise<{ log: string[] }> {
    return this.get<{ log: string[] }>(`/api/combat/log/${combatId}`);
  }

  async combatReplay(combatId: string): Promise<{ actions: unknown[] }> {
    return this.get<{ actions: unknown[] }>(`/api/combat/replay/${combatId}`);
  }

  async combatActive(): Promise<{ combats: CombatState[] }> {
    return this.get<{ combats: CombatState[] }>('/api/combat/active');
  }

  // ── 퀘스트 API (P25-04) ────────────────────────────────────

  async getQuests(characterId: string): Promise<QuestData[]> {
    return this.get<QuestData[]>(`/api/quests`, { characterId });
  }

  async acceptQuest(questId: string, characterId: string): Promise<QuestData> {
    return this.post<QuestData>(`/api/quests/${questId}/accept`, { characterId });
  }

  async completeQuest(questId: string, characterId: string): Promise<{ quest: QuestData; rewards: unknown }> {
    return this.post(`/api/quests/${questId}/complete`, { characterId });
  }

  // ── 인벤토리 API (P25-04) ──────────────────────────────────

  async getInventory(characterId: string): Promise<InventoryItem[]> {
    return this.get<InventoryItem[]>(`/api/inventory/${characterId}`);
  }

  async equipItem(characterId: string, itemId: string): Promise<{ success: boolean }> {
    return this.post(`/api/inventory/${characterId}/equip`, { itemId });
  }

  async useItem(characterId: string, itemId: string): Promise<{ success: boolean; effect?: unknown }> {
    return this.post(`/api/inventory/${characterId}/use`, { itemId });
  }

  // ── 존 / NPC API (P25-04) ──────────────────────────────────

  async getZoneInfo(zoneId: string): Promise<ZoneInfo> {
    return this.get<ZoneInfo>(`/api/world/zones/${zoneId}`);
  }

  async getZones(): Promise<ZoneInfo[]> {
    return this.get<ZoneInfo[]>('/api/world/zones');
  }

  async getNpcs(zoneId: string): Promise<Array<{ id: string; name: string; role: string; dialogueId?: string }>> {
    return this.get(`/api/npc`, { zoneId });
  }

  // ── 던전 API (P25-06) ──────────────────────────────────────

  async getDungeons(zoneId?: string): Promise<Array<{ id: string; name: string; minLevel: number; waves: number }>> {
    return this.get('/api/dungeons', zoneId ? { zoneId } : undefined);
  }

  async enterDungeon(dungeonId: string, characterId: string): Promise<{ sessionId: string; waves: number }> {
    return this.post('/api/dungeons/enter', { dungeonId, characterId });
  }

  async clearDungeon(sessionId: string): Promise<CombatResult> {
    return this.post('/api/dungeons/clear', { sessionId });
  }

  // ── Socket 연결 (P25-07 강화) ───────────────────────────────

  connect(serverUrl?: string): void {
    if (this.socket?.connected) {
      console.warn('[NetworkManager] 이미 연결됨');
      return;
    }

    const url = serverUrl ?? this.config.serverUrl;
    this.setState('connecting');
    this.reconnectAttempt = 0;

    this.socket = io(url, {
      reconnection: false,
      auth: this._token ? { token: this._token } : undefined,
    });

    this.socket.on('connect', () => {
      this.reconnectAttempt = 0;
      this.setState('connected');
      console.log(`[NetworkManager] 연결 성공: ${this.socket?.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[NetworkManager] 연결 끊김: ${reason}`);
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      } else {
        this.setState('disconnected');
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[NetworkManager] 연결 오류: ${err.message}`);

      // JWT 만료 → 자동 갱신 시도 (P25-07)
      if (err.message.includes('jwt') || err.message.includes('unauthorized') || err.message.includes('401')) {
        this.refreshAuth().then((ok) => {
          if (ok) {
            console.log('[NetworkManager] 토큰 갱신 성공 → 재연결');
            this.disconnect();
            this.connect(url);
          } else {
            this.setState('error');
          }
        });
        return;
      }

      this.attemptReconnect();
    });

    // 서버 에러 이벤트 (P25-07)
    this.socket.on('system:error', (data: { code: string; message: string }) => {
      console.error(`[NetworkManager] 서버 에러: ${data.code} — ${data.message}`);
      if (data.code === 'TOKEN_EXPIRED') {
        this.refreshAuth().then((ok) => {
          if (!ok) this.setState('error');
        });
      }
    });

    // 등록된 이벤트 핸들러 재바인딩
    for (const [event, handlers] of this.eventHandlers) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.setState('disconnected');
  }

  // ── Socket 이벤트 ───────────────────────────────────────────

  emit(event: string, data: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[NetworkManager] 전송 실패 (미연결): ${event}`);
      return;
    }
    this.socket.emit(event, data);
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    this.socket?.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    this.socket?.off(event, handler);
  }

  // ── REST API (P25-07: 에러 핸들링 강화) ─────────────────────

  private _buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this._token) {
      headers['Authorization'] = `Bearer ${this._token}`;
    }
    return headers;
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.serverUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await this._fetchWithRetry(url.toString(), {
      method: 'GET',
      headers: this._buildHeaders(),
    });

    return response.json() as Promise<T>;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.config.serverUrl);

    const response = await this._fetchWithRetry(url.toString(), {
      method: 'POST',
      headers: this._buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json() as Promise<T>;
  }

  /**
   * fetch 래퍼: 401 시 토큰 갱신 + 재시도 (P25-07)
   */
  private async _fetchWithRetry(url: string, init: RequestInit, retried = false): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(this.config.restTimeoutMs),
    });

    if (response.status === 401 && !retried && this._refreshToken) {
      const refreshed = await this.refreshAuth();
      if (refreshed) {
        // 갱신된 토큰으로 재시도
        const newInit = { ...init, headers: this._buildHeaders() };
        return this._fetchWithRetry(url, newInit, true);
      }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new NetworkError(
        `[NetworkManager] ${init.method} ${url} failed: ${response.status}`,
        response.status,
        errText,
      );
    }

    return response;
  }

  // ── 재연결 로직 (P25-07 강화) ───────────────────────────────

  private attemptReconnect(): void {
    if (this.reconnectAttempt >= this.config.maxReconnectAttempts) {
      console.error(`[NetworkManager] 최대 재연결 시도 초과 (${this.config.maxReconnectAttempts}회)`);
      this.setState('error');
      return;
    }

    this.reconnectAttempt++;
    this.setState('reconnecting');

    // 지수 백오프 (P25-07)
    const delay = this.config.reconnectIntervalMs * Math.pow(1.5, Math.min(this.reconnectAttempt - 1, 6));
    console.log(`[NetworkManager] 재연결 시도 ${this.reconnectAttempt}/${this.config.maxReconnectAttempts} (${Math.round(delay)}ms 후)`);

    this.reconnectTimer = setTimeout(() => {
      this.socket?.connect();
    }, delay);
  }

  private setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    for (const handler of this.connectionChangeHandlers) {
      try { handler(state); } catch (err) { console.error('[NetworkManager] handler 오류:', err); }
    }
  }
}

// ── NetworkError 클래스 (P25-07) ──────────────────────────────

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ── 싱글턴 인스턴스 ───────────────────────────────────────────

export const networkManager = new NetworkManager();
export { NetworkManager };
