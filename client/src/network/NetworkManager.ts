/**
 * NetworkManager — 클라이언트 네트워크 레이어 단일 진입점 (P10-12 → P25-01 확장)
 *
 * Socket + REST 통합 관리.
 * P25: 전투 API, 캐릭터 API, 퀘스트 API, 인벤토리 API, Auth API 메서드 추가.
 * JWT 토큰 관리 + 자동 헤더 세팅 + 재접속 + 에러 핸들링.
 */

import { io, Socket } from 'socket.io-client';

import type { QuestGuide, QuestObjectiveInput } from '../../../shared/types/scenarioRegistry';
import { rawQuestRowToQuestData, type RawQuestRow } from './questTransforms';

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
  // 서버 실제 응답 필드
  accessToken?: string;
  userId?: string;
  email?: string;
  role?: string;
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
  /** 서버 계약: 파티 캐릭터 DB id 배열. */
  partyCharacterIds: string[];
  /** zone id — monsterIds 미지정 시 서버가 이 zone 의 DB 몬스터로 전투를 구성한다. */
  zoneId?: string;
  /** 명시적 DB 몬스터 id 배열(선택). 없으면 서버가 zoneId 로 해결. */
  monsterIds?: string[];
  /** CHRONO-S8: 현재 시대 (ancient/present/ruined_future) — 서버 ATB tier 적용 */
  eraId?: string;
  autoMode?: boolean;
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
  /** CHRONO-S94: chain 4+ 보너스 +20% 적용 여부 */
  chainBonusApplied?: boolean;
}

/**
 * 서버 POST /combat/:combatId/end 의 실제 응답 형태.
 * combat:result 소켓 이벤트(CombatResult — victory/expGained 등)와는 다른 형태이며,
 * end 라우트는 강제 종료 후 { success, combatId, statistics } 만 반환한다.
 * (보상/승패는 combat:tick·combat:result·/tick 결과가 정식 소스 — end 응답을 보상에 쓰지 말 것.)
 */
export interface CombatEndResult {
  success: boolean;
  combatId: string;
  statistics?: Record<string, unknown> | null;
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

/** GET /api/quests/:userId/active 응답의 진행 중 퀘스트 1건(서버가 guide 부착). */
export interface ActiveQuestData {
  questId: string;
  status: string;
  progress: Array<{ objectiveIndex: number; current: number; target: number; completed: boolean }>;
  quest: {
    id: string;
    code: string;
    name: string;
    type: string;
    objectives: QuestObjectiveInput[];
  } | null;
  /** 서버가 progress-aware 로 계산해 부착한 진행 가이드(SYNC-258). */
  guide?: QuestGuide;
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

interface ServerZoneDetailResponse {
  ok?: boolean;
  zone?: {
    id?: string;
    code?: string;
    name?: string;
    description?: string;
    levelRange?: { min?: number; max?: number };
  };
  monsters?: Array<{
    id?: string;
    monsterId?: string;
    name?: string;
    level?: number;
  }>;
  npcs?: Array<{
    id?: string;
    npcId?: string;
    name?: string;
    role?: string;
  }>;
}

const CLIENT_ZONE_API_CODE_MAP: Record<string, string> = {
  aether_plains: 'erebos_outskirts',
  memory_forest: 'silvanhome_entrance',
  malatus_sanctuary: 'silvanhome_sanctum',
  shadow_gorge: 'abyss_gate',
  crystal_cave: 'silvanhome_crystal',
};

/**
 * 클라이언트 zoneId(예: 'aether_plains')를 서버 존 코드(예: 'erebos_outskirts')로 변환한다.
 * 매핑에 없는 id 는 그대로 통과(이미 서버 코드이거나 던전 코드인 경우).
 * 존 상세/인카운터/전투 시작 등 **모든** 서버 호출이 이 변환을 거쳐야 코드 분열로 인한 404/400 을 막는다.
 */
function toApiZoneCode(zoneId: string): string {
  return CLIENT_ZONE_API_CODE_MAP[zoneId] ?? zoneId;
}

const CLIENT_ZONE_FALLBACKS: Record<string, ZoneInfo> = {
  aether_plains: {
    id: 'aether_plains',
    name: '에테르 평원',
    description: '에테르나의 시작 지대. 시간대 투영에 따라 몬스터와 보상이 변한다.',
    minLevel: 1,
    monsters: [
      { id: 'mon_erebos_fog_rat', name: '기억 침식쥐', level: 5 },
      { id: 'mon_erebos_memory_beetle', name: '공허 박쥐', level: 7 },
      { id: 'mon_erebos_memory_dust', name: '망각 슬라임', level: 8 },
    ],
    npcs: [
      { id: 'npc_guide', name: '수호자단 안내원', role: 'quest' },
      { id: 'npc_merchant', name: '상인', role: 'shop' },
    ],
  },
  memory_forest: {
    id: 'memory_forest',
    name: '기억의 숲',
    description: '실반헤임으로 향하는 숲 입구. 말라투스 성소로 이어지는 봉인 흔적이 남아 있다.',
    minLevel: 10,
    monsters: [
      { id: 'mob_corrupt_sprite', name: '오염된 숲정령', level: 12 },
      { id: 'mob_swamp_treant', name: '안개 고목', level: 15 },
      { id: 'mob_crystal_bat', name: '기억 박쥐', level: 16 },
    ],
    npcs: [
      { id: 'npc_elf_guard', name: '엘프 경비대장 세라핀', role: 'quest' },
      { id: 'npc_healer', name: '숲의 치유사 에밀리아', role: 'shop' },
    ],
  },
  malatus_sanctuary: {
    id: 'malatus_sanctuary',
    name: '말라투스 성소',
    description: '실반헤임 심층부에 봉인된 말라투스의 성소. 고대 마법의 잔향이 전장을 왜곡한다.',
    minLevel: 20,
    monsters: [
      { id: 'mob_sanctum_guardian', name: '성소 수호정령', level: 20 },
      { id: 'mob_memory_vine', name: '기억 덩굴', level: 23 },
      { id: 'boss_malatus_echo', name: '말라투스의 잔향', level: 28 },
    ],
    npcs: [
      { id: 'npc_elf_queen', name: '엘프 여왕 아리안나', role: 'dialogue' },
    ],
  },
  shadow_gorge: {
    id: 'shadow_gorge',
    name: '그림자 협곡',
    description: '그림자 세력이 기억의 심연으로 향하는 협곡에 거점을 세운 위험 지대.',
    minLevel: 20,
    monsters: [
      { id: 'mob_shadow_stalker', name: '그림자 추적자', level: 20 },
      { id: 'mob_void_hound', name: '공허 사냥개', level: 24 },
      { id: 'boss_gorge_shade', name: '협곡의 흑영', level: 30 },
    ],
    npcs: [
      { id: 'npc_shadow_scout', name: '협곡 정찰병', role: 'quest' },
    ],
  },
  crystal_cave: {
    id: 'crystal_cave',
    name: '결정 동굴',
    description: '실반헤임의 수정 광맥이 드러난 동굴. 에테르 결정 몬스터가 배회한다.',
    minLevel: 30,
    monsters: [
      { id: 'mob_crystal_crawler', name: '결정 포복자', level: 30 },
      { id: 'mob_aether_geode', name: '에테르 정동', level: 34 },
      { id: 'boss_prism_guardian', name: '프리즘 수호자', level: 40 },
    ],
    npcs: [
      { id: 'npc_miner_analyst', name: '광맥 조사관', role: 'dialogue' },
    ],
  },
};

function normalizeZoneInfo(requestedZoneId: string, raw: ZoneInfo | ServerZoneDetailResponse): ZoneInfo {
  const fallback = CLIENT_ZONE_FALLBACKS[requestedZoneId];
  const detail = raw as ServerZoneDetailResponse;
  const direct = raw as ZoneInfo;

  if (!detail.zone && typeof direct.id === 'string' && typeof direct.name === 'string') {
    return {
      id: requestedZoneId,
      name: direct.name,
      description: direct.description ?? fallback?.description ?? '',
      minLevel: direct.minLevel ?? fallback?.minLevel ?? 1,
      monsters: direct.monsters?.length ? direct.monsters : (fallback?.monsters ?? []),
      npcs: direct.npcs?.length ? direct.npcs : (fallback?.npcs ?? []),
    };
  }

  const zone = detail.zone;
  const minLevel = zone?.levelRange?.min ?? fallback?.minLevel ?? 1;
  const monsters = (detail.monsters ?? [])
    .map((monster, index) => {
      const id = monster.id ?? monster.monsterId;
      if (!id) return null;
      return {
        id,
        name: monster.name ?? fallback?.monsters[index]?.name ?? id,
        level: monster.level ?? fallback?.monsters[index]?.level ?? minLevel,
      };
    })
    .filter((monster): monster is { id: string; name: string; level: number } => monster !== null);

  const npcs = (detail.npcs ?? [])
    .map((npc, index) => {
      const id = npc.id ?? npc.npcId ?? fallback?.npcs[index]?.id;
      if (!id) return null;
      return {
        id,
        name: npc.name ?? fallback?.npcs[index]?.name ?? id,
        role: npc.role ?? fallback?.npcs[index]?.role ?? 'dialogue',
      };
    })
    .filter((npc): npc is { id: string; name: string; role: string } => npc !== null);

  return {
    id: requestedZoneId,
    name: fallback?.name ?? zone?.name ?? requestedZoneId,
    description: fallback?.description ?? zone?.description ?? '',
    minLevel,
    monsters: monsters.length > 0 ? monsters : (fallback?.monsters ?? []),
    npcs: npcs.length > 0 ? npcs : (fallback?.npcs ?? []),
  };
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
    || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'),
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
  /** 현재 플레이 중인 캐릭터의 DB id(서버 전투/존 API 의 파티 식별자). 캐릭터 선택/생성 시 설정. */
  private _activeCharacterId: string | null = null;

  constructor(config?: Partial<NetworkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._loadTokens();
  }

  // ── 토큰 관리 ───────────────────────────────────────────────

  private _loadTokens(): void {
    try {
      this._token = localStorage.getItem(TOKEN_KEY);
      this._refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      this._userId = localStorage.getItem('aeterna_user_id');
      this._username = localStorage.getItem('aeterna_username');
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
    this._userId = null;
    this._username = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem('aeterna_user_id');
      localStorage.removeItem('aeterna_username');
    } catch { /* noop */ }
  }

  get token(): string | null { return this._token; }
  get isAuthenticated(): boolean { return !!this._token; }
  get userId(): string | null { return this._userId; }
  get username(): string | null { return this._username; }
  /** 현재 플레이 캐릭터 DB id. 서버 전투 partyCharacterIds 등에 사용. */
  get activeCharacterId(): string | null { return this._activeCharacterId; }
  setActiveCharacter(characterId: string | null): void { this._activeCharacterId = characterId; }

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
    const body = { email: creds.email ?? creds.username, password: creds.password, username: creds.username };
    const res = await this.post<AuthResponse>('/api/auth/register', body);
    // 서버 응답: { userId, email, role, accessToken, refreshToken }
    const token = res.token ?? res.accessToken;
    if (token) {
      this._saveTokens(token, res.refreshToken);
      this._userId = res.user?.id ?? res.userId ?? null;
      this._username = res.user?.username ?? creds.username ?? null;
      try {
        if (this._userId) localStorage.setItem('aeterna_user_id', this._userId);
        if (this._username) localStorage.setItem('aeterna_username', this._username);
      } catch { /* noop */ }
      res.success = true;
      res.token = token;
    }
    return res;
  }

  async login(creds: AuthCredentials): Promise<AuthResponse> {
    const body = { email: creds.email ?? creds.username, password: creds.password };
    const res = await this.post<AuthResponse>('/api/auth/login', body);
    // 서버 응답: { userId, email, role, accessToken, refreshToken }
    const token = res.token ?? res.accessToken;
    if (token) {
      this._saveTokens(token, res.refreshToken);
      this._userId = res.user?.id ?? res.userId ?? null;
      this._username = res.user?.username ?? creds.username ?? null;
      try {
        if (this._userId) localStorage.setItem('aeterna_user_id', this._userId);
        if (this._username) localStorage.setItem('aeterna_username', this._username);
      } catch { /* noop */ }
      res.success = true;
      res.token = token;
    }
    return res;
  }

  async refreshAuth(): Promise<boolean> {
    if (!this._refreshToken) return false;
    try {
      const res = await this.post<AuthResponse>('/api/auth/refresh', { refreshToken: this._refreshToken });
      const token = res.token ?? res.accessToken;
      if (token) {
        this._saveTokens(token, res.refreshToken);
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
    const classes = await this.get<Array<{ baseClass: string; baseClassName: string }>>('/api/class/tree');
    return (Array.isArray(classes) ? classes : []).map(c => ({
      id: c.baseClass,
      name: c.baseClassName,
      nameEn: c.baseClass,
      description: '',
      stats: {},
    }));
  }

  // ── 전투 API (P25-05) ──────────────────────────────────────

  async combatStart(req: CombatStartRequest): Promise<CombatState> {
    // 서버는 zoneId 로 DB 몬스터(monster.location = zoneId)를 해결한다. 클라 zoneId(예: 'aether_plains')는
    // 서버 코드(예: 'erebos_outskirts')로 매핑해야 한다. 미매핑 전송 시 "몬스터를 찾을 수 없습니다" 400 으로
    // 서버 권위 전투가 시작되지 못한다(getZoneInfo/fetchZoneEncounter 와 동일한 변환을 적용).
    const mapped = req.zoneId ? { ...req, zoneId: toApiZoneCode(req.zoneId) } : req;
    return this.post<CombatState>('/combat/start', mapped);
  }

  async combatAction(req: CombatActionRequest): Promise<CombatState> {
    return this.post<CombatState>('/combat/action', req);
  }

  // CHRONO-S19: 2인 협공 (Dual Tech)
  async combatDualTech(req: {
    combatId: string;
    actorIdA: string;
    actorIdB: string;
    techId: string;
    targetId: string;
  }): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/combat/dual_tech', req);
  }

  // CHRONO-S62: 3인 협공 (Triple Tech)
  async combatTripleTech(req: {
    combatId: string;
    actorIds: [string, string, string];
    techId: string;
    targetId: string;
  }): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>('/combat/triple_tech', req);
  }

  async combatTick(combatId: string): Promise<CombatState> {
    return this.post<CombatState>(`/combat/${combatId}/tick`, { combatId });
  }

  async combatGetState(combatId: string): Promise<CombatState> {
    return this.get<CombatState>(`/combat/${combatId}/state`);
  }

  async combatEnd(combatId: string): Promise<CombatEndResult> {
    // 서버 end 라우트는 { success, combatId, statistics } 를 반환한다(CombatResult 아님).
    return this.post<CombatEndResult>(`/combat/${combatId}/end`, { combatId });
  }

  async combatLog(combatId: string): Promise<{ log: string[] }> {
    return this.get<{ log: string[] }>(`/combat/${combatId}/log`);
  }

  async combatReplay(combatId: string): Promise<{ actions: unknown[] }> {
    return this.get<{ actions: unknown[] }>(`/combat/${combatId}/replay`);
  }

  async combatActive(): Promise<{ combats: CombatState[] }> {
    return this.get<{ combats: CombatState[] }>('/combat/active');
  }

  // ── 퀘스트 API (P25-04) ────────────────────────────────────

  async getQuests(characterId: string): Promise<QuestData[]> {
    // 서버 GET /api/quests 는 { quests, pagination } 봉투로 가공 전 DB 행을 반환한다.
    // 봉투를 풀고 각 행을 QuestData 계약(objectives:{desc,current,target}, rewards:{exp,gold,items})으로
    // 정직하게 매핑한다 — 안 하면 LobbyScene 퀘스트 보드가 undefined 필드로 깨진다(타입 거짓말 제거).
    const res = await this.get<{ quests?: RawQuestRow[] } | RawQuestRow[]>('/api/quests', { characterId });
    const rows = Array.isArray(res) ? res : (res?.quests ?? []);
    return rows.map(rawQuestRowToQuestData);
  }

  /**
   * 진행 중(active) 퀘스트 목록 + 서버 부착 가이드.
   * 서버 /active 는 경로의 userId 를 무시하고 인증 행위자 본인 진행만 반환하므로,
   * 경로 param 은 보유 userId(없으면 'me')를 채워 보낸다(IDOR 안전).
   */
  async getActiveQuests(): Promise<ActiveQuestData[]> {
    const uid = this.userId ?? 'me';
    const res = await this.get<{ active?: ActiveQuestData[] } | ActiveQuestData[]>(`/api/quests/${encodeURIComponent(uid)}/active`);
    if (Array.isArray(res)) return res;
    return (res as { active?: ActiveQuestData[] })?.active ?? [];
  }

  /**
   * 완료(turned_in)된 퀘스트의 quest id 목록. 로비 보드가 이미 끝낸 퀘스트를 '완료됨'으로 표시.
   * /active 와 동일하게 경로 userId 는 무시되고 authUserId 본인 완료만 반환(IDOR 안전).
   */
  async getCompletedQuestIds(): Promise<string[]> {
    const uid = this.userId ?? 'me';
    const res = await this.get<{ completed?: string[] } | string[]>(`/api/quests/${encodeURIComponent(uid)}/completed`);
    if (Array.isArray(res)) return res;
    return (res as { completed?: string[] })?.completed ?? [];
  }

  async acceptQuest(questId: string, playerLevel: number): Promise<QuestData> {
    // 서버는 인증된 actor 를 사용하고 본문에서 { playerLevel } 만 받는다(characterId 미사용).
    // playerLevel 을 보내지 않으면 400 'playerLevel 필수' 로 수주가 항상 실패한다.
    return this.post<QuestData>(`/api/quests/${questId}/accept`, { playerLevel });
  }

  async completeQuest(questId: string, characterId: string): Promise<{ quest: QuestData; rewards: unknown }> {
    return this.post(`/api/quests/${questId}/complete`, { characterId });
  }

  // ── 인벤토리 API (P25-04) ──────────────────────────────────

  async getInventory(characterId: string): Promise<InventoryItem[]> {
    const res = await this.get<unknown>(`/api/inventory/${characterId}`);
    const rows = Array.isArray(res)
      ? res
      : ((res as { items?: unknown[]; slots?: unknown[] })?.items ?? (res as { slots?: unknown[] })?.slots ?? []);
    // 서버는 { ...slot, item: { name, type, grade, stats } } 중첩 형태로 반환한다.
    // 클라 InventoryItem(평탄: name/type/rarity/stats)으로 정규화한다(rarity ← item.grade).
    // 정규화하지 않으면 InventoryUI 가 item.rarity(undefined).toUpperCase() 로 크래시한다.
    return (rows as Array<Record<string, any>>).map((row) => {
      const it = row?.item as Record<string, any> | undefined | null;
      return {
        id: String(row?.id ?? ''),
        itemId: String(row?.itemId ?? ''),
        name: String(it?.name ?? row?.name ?? row?.itemCode ?? row?.itemId ?? '???'),
        type: String(it?.type ?? row?.type ?? ''),
        quantity: Number(row?.quantity ?? 1),
        rarity: String(it?.grade ?? row?.rarity ?? 'common'),
        stats: (it?.stats ?? row?.stats ?? undefined) as Record<string, number> | undefined,
      };
    });
  }

  async equipItem(characterId: string, slotId: string): Promise<{ success: boolean }> {
    return this.post('/api/inventory/equip', { slotId, equipSlot: 'weapon', userId: characterId });
  }

  async useItem(characterId: string, slotId: string): Promise<{ success: boolean; effect?: unknown }> {
    return this.post('/api/inventory/use', { slotId, userId: characterId });
  }

  // ── 존 / NPC API (P25-04) ──────────────────────────────────

  async getZoneInfo(zoneId: string): Promise<ZoneInfo> {
    const apiCode = toApiZoneCode(zoneId);
    const raw = await this.get<ZoneInfo | ServerZoneDetailResponse>(`/api/world/zones/${apiCode}`);
    return normalizeZoneInfo(zoneId, raw);
  }

  async getZones(): Promise<ZoneInfo[]> {
    // 서버 GET /api/world/zones 는 { ok, zones } 봉투로 응답한다(배열 아님).
    // 봉투를 풀지 않으면 호출부(WorldMapUI._loadZones)의 .find() 가 TypeError 로 throw → 서버 존 병합 실패.
    const res = await this.get<{ ok?: boolean; zones?: ZoneInfo[] } | ZoneInfo[]>('/api/world/zones');
    return Array.isArray(res) ? res : (res?.zones ?? []);
  }

  // CHRONO-S107/S114: 시대별 필드 encounter 조회 (bgmTrack/ambientEffect 포함)
  async fetchZoneEncounter(zoneId: string, eraId: 'ancient' | 'present' | 'ruined_future'): Promise<{
    ok: boolean;
    encounter?: {
      zoneId: string;
      eraId: string;
      monsterPool: Array<{ monsterId: string; name: string; weight: number; isBoss?: boolean }>;
      maxSpawn: number;
      hasBossSlot: boolean;
      ambientLine: string;
      bgmTrack?: string;
      ambientEffect?: 'mist' | 'dust' | 'glow' | 'void' | 'none';
    };
    error?: string;
  }> {
    const apiCode = toApiZoneCode(zoneId);
    return this.get(`/api/world/zones/${apiCode}/encounter`, { eraId });
  }

  async getNpcs(zoneId: string): Promise<Array<{ id: string; name: string; role: string; dialogueId?: string }>> {
    return this.get('/api/npcs', { zoneId });
  }

  // ── 던전 API (P25-06) ──────────────────────────────────────

  async getDungeons(zoneId?: string): Promise<Array<{ id: string; name: string; minLevel: number; waves: number }>> {
    return this.get('/api/dungeons', zoneId ? { zoneId } : undefined);
  }

  async enterDungeon(dungeonId: string, characterId: string): Promise<{ sessionId: string; waves: number }> {
    return this.post('/api/dungeons/enter', { dungeonId, characterId });
  }

  async clearDungeon(sessionId: string): Promise<CombatResult> {
    return this.post(`/api/dungeons/runs/${sessionId}/clear`, {});
  }

  // ── HTTP 메서드 호환 레이어 (P29-16) ─────────────────────────
  // UI 컴포넌트(AuctionUI, ChatUI, GuildUI 등)가 사용하는 레거시 API 호환

  /** @deprecated use get() */
  async httpGet<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    return this.get<T>(path, params);
  }

  /** @deprecated use post() */
  async httpPost<T = unknown>(path: string, body?: unknown): Promise<T> {
    return this.post<T>(path, body);
  }

  /** PATCH 요청 + 자동 언래핑 */
  async httpPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this._buildUrl(path);
    const response = await this._fetchWithRetry(url, {
      method: 'PATCH',
      headers: this._buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    return this._unwrapResponse<T>(response);
  }

  /** DELETE 요청 + 자동 언래핑 */
  async httpDelete<T = unknown>(path: string): Promise<T> {
    const url = this._buildUrl(path);
    const response = await this._fetchWithRetry(url, {
      method: 'DELETE',
      headers: this._buildHeaders(),
    });
    return this._unwrapResponse<T>(response);
  }

  /** @deprecated use userId */
  getUserId(): string | null {
    return this._userId;
  }

  /** @deprecated use socketId */
  getCharacterId(): string | null {
    return this.socketId ?? null;
  }

  /** @deprecated — 직접 소켓 접근. 필요 시 on()/emit() 사용 권장 */
  getSocket(): Socket | null {
    return this.socket;
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
      // 재연결/토큰만료 견고화: 함수형 auth 로 매 핸드셰이크(재연결 포함)마다 최신 _token 을 재조회한다.
      // 정적 객체({token})는 소켓 인스턴스에 토큰을 동결해, 15분 만료 후 attemptReconnect 가 만료토큰을
      // 그대로 재전송하는 문제가 있었다. 서버 socketAuthGate 는 토큰 없으면 'unauthorized' 로 거부하고,
      // 그 메시지를 connect_error 가 잡아 refreshAuth → 새 소켓 재연결한다.
      auth: (cb: (data: { token?: string }) => void) => cb({ token: this._token ?? undefined }),
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

  private _buildUrl(path: string, params?: Record<string, string>): string {
    // 상대경로로 요청하여 Vite proxy 경유
    let url = path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }
    return url;
  }

  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this._buildUrl(path, params);

    const response = await this._fetchWithRetry(url, {
      method: 'GET',
      headers: this._buildHeaders(),
    });

    return this._unwrapResponse<T>(response);
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = this._buildUrl(path);

    const response = await this._fetchWithRetry(url, {
      method: 'POST',
      headers: this._buildHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });

    return this._unwrapResponse<T>(response);
  }

  /**
   * 서버 응답 자동 언래핑 (P29-01)
   * 서버가 { success: boolean, data: T } 형태로 래핑하는 경우 data를 추출.
   * Auth 응답처럼 래핑하지 않는 경우 원본 반환.
   */
  private async _unwrapResponse<T>(response: Response): Promise<T> {
    const json = await response.json();
    // { success: ..., data: ... } 래핑 패턴 감지 → data 추출
    if (json && typeof json === 'object' && 'success' in json && 'data' in json) {
      return json.data as T;
    }
    return json as T;
  }

  /**
   * fetch 래퍼: 401 시 토큰 갱신 + 재시도 (P25-07)
   */
  private async _fetchWithRetry(url: string, init: RequestInit, retried = false): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(this.config.restTimeoutMs),
    });

    // /api/auth/refresh 자신의 401 에는 토큰 갱신 재시도를 하지 않는다.
    // (그러지 않으면 refresh 401 → refreshAuth() → refresh 재요청(retried=false) → 401 → …
    //  무한 재귀가 발생해 MainMenuScene 이 "기존 세션 확인 중..." 상태에서 영영 멈춘다.)
    const isRefreshCall = url.includes('/api/auth/refresh');

    if (response.status === 401 && !retried && !isRefreshCall && this._refreshToken) {
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
