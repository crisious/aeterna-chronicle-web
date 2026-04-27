// ─── 전투 재접속/고아 인스턴스 관리 ───────────────────────────
// 소켓 수명은 전투 수명보다 짧다. 둘을 분리하지 않으면 탭 종료가 고아 전투를 만든다.

export interface CombatSocketSession {
  combatId: string;
  participantId: string;
  socketId: string;
  connected: boolean;
  disconnectedAt?: number;
  expiresAt?: number;
}

export interface RegisterCombatSocketResult {
  session: CombatSocketSession;
  previousSocketId?: string;
  reconnected: boolean;
}

export interface CombatPresenceSummary {
  total: number;
  connectedCount: number;
  recoveringCount: number;
  expiredCount: number;
}

export class CombatReconnectManager {
  private sessionsByKey = new Map<string, CombatSocketSession>();
  private keysBySocket = new Map<string, Set<string>>();

  constructor(private readonly recoveryGraceMs = 30_000) {}

  getGraceMs(): number {
    return this.recoveryGraceMs;
  }

  register(
    combatId: string,
    participantId: string,
    socketId: string,
    now = Date.now(),
  ): RegisterCombatSocketResult {
    this.assertId(combatId, 'combatId');
    this.assertId(participantId, 'participantId');
    this.assertId(socketId, 'socketId');

    const key = this.key(combatId, participantId);
    const previous = this.sessionsByKey.get(key);
    if (previous) {
      this.detachSocketKey(previous.socketId, key);
    }

    const session: CombatSocketSession = {
      combatId,
      participantId,
      socketId,
      connected: true,
    };

    this.sessionsByKey.set(key, session);
    this.attachSocketKey(socketId, key);

    return {
      session,
      previousSocketId: previous && previous.socketId !== socketId ? previous.socketId : undefined,
      reconnected: Boolean(
        previous &&
        !previous.connected &&
        (previous.expiresAt ?? 0) > now,
      ),
    };
  }

  canControl(combatId: string, participantId: string, socketId: string): boolean {
    const session = this.sessionsByKey.get(this.key(combatId, participantId));
    return Boolean(session?.connected && session.socketId === socketId);
  }

  markSocketDisconnected(socketId: string, now = Date.now()): CombatSocketSession[] {
    const keys = this.keysBySocket.get(socketId);
    if (!keys) return [];

    const changed: CombatSocketSession[] = [];
    for (const key of [...keys]) {
      const session = this.sessionsByKey.get(key);
      if (!session || session.socketId !== socketId) continue;
      changed.push(this.markDisconnected(key, session, now));
    }
    this.keysBySocket.delete(socketId);
    return changed;
  }

  markCombatSocketDisconnected(combatId: string, socketId: string, now = Date.now()): CombatSocketSession[] {
    const keys = this.keysBySocket.get(socketId);
    if (!keys) return [];

    const changed: CombatSocketSession[] = [];
    for (const key of [...keys]) {
      const session = this.sessionsByKey.get(key);
      if (!session || session.combatId !== combatId || session.socketId !== socketId) continue;
      changed.push(this.markDisconnected(key, session, now));
    }
    return changed;
  }

  getPresence(combatId: string, now = Date.now()): CombatPresenceSummary {
    const summary: CombatPresenceSummary = {
      total: 0,
      connectedCount: 0,
      recoveringCount: 0,
      expiredCount: 0,
    };

    for (const session of this.sessionsByKey.values()) {
      if (session.combatId !== combatId) continue;
      summary.total++;
      if (session.connected) {
        summary.connectedCount++;
      } else if ((session.expiresAt ?? 0) > now) {
        summary.recoveringCount++;
      } else {
        summary.expiredCount++;
      }
    }

    return summary;
  }

  isAbandoned(combatId: string, now = Date.now()): boolean {
    const presence = this.getPresence(combatId, now);
    return presence.total > 0 &&
      presence.connectedCount === 0 &&
      presence.recoveringCount === 0;
  }

  pruneExpired(now = Date.now()): CombatSocketSession[] {
    const removed: CombatSocketSession[] = [];

    for (const [key, session] of this.sessionsByKey) {
      if (session.connected || (session.expiresAt ?? 0) > now) continue;
      this.sessionsByKey.delete(key);
      this.detachSocketKey(session.socketId, key);
      removed.push(session);
    }

    return removed;
  }

  removeCombat(combatId: string): number {
    let removed = 0;
    for (const [key, session] of [...this.sessionsByKey]) {
      if (session.combatId !== combatId) continue;
      this.sessionsByKey.delete(key);
      this.detachSocketKey(session.socketId, key);
      removed++;
    }
    return removed;
  }

  reset(): void {
    this.sessionsByKey.clear();
    this.keysBySocket.clear();
  }

  private markDisconnected(key: string, session: CombatSocketSession, now: number): CombatSocketSession {
    const next: CombatSocketSession = {
      ...session,
      connected: false,
      disconnectedAt: now,
      expiresAt: now + this.recoveryGraceMs,
    };
    this.sessionsByKey.set(key, next);
    this.detachSocketKey(session.socketId, key);
    return next;
  }

  private key(combatId: string, participantId: string): string {
    return `${combatId}:${participantId}`;
  }

  private attachSocketKey(socketId: string, key: string): void {
    const keys = this.keysBySocket.get(socketId) ?? new Set<string>();
    keys.add(key);
    this.keysBySocket.set(socketId, keys);
  }

  private detachSocketKey(socketId: string, key: string): void {
    const keys = this.keysBySocket.get(socketId);
    if (!keys) return;
    keys.delete(key);
    if (keys.size === 0) this.keysBySocket.delete(socketId);
  }

  private assertId(value: string, name: string): void {
    if (!value.trim()) {
      throw new Error(`${name}가 비어 있습니다.`);
    }
  }
}

export const combatReconnectManager = new CombatReconnectManager();
