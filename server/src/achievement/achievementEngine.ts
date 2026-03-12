import { EventEmitter } from 'events';
import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';
import type { Server } from 'socket.io';

// ─── 타입 정의 ──────────────────────────────────────────────

/** 업적 달성 조건 타입 */
export type ConditionType = 'count' | 'threshold' | 'flag' | 'combo';

/** 업적 조건 정의 */
export interface AchievementCondition {
  type: ConditionType;
  target: string;       // 이벤트/지표 식별자 (예: "monster_kill", "zone_discover")
  count?: number;       // count/threshold 타입 시 필요 횟수/값
  flags?: string[];     // combo 타입 시 필요 플래그 목록
}

/** 업적 체크 이벤트 페이로드 */
export interface AchievementEvent {
  userId: string;
  type: string;         // 이벤트 타입 (target과 매칭)
  value?: number;       // 증가 값 또는 현재 값
  flag?: string;        // flag 타입 시 설정할 플래그명
}

/** 업적 달성 결과 */
export interface UnlockResult {
  achievementId: string;
  code: string;
  name: string;
  tier: string;
  points: number;
  category: string;
}

// ─── Redis 키 헬퍼 ──────────────────────────────────────────

/** 진행도 카운터 키 */
function progressKey(userId: string, target: string): string {
  return `ach:progress:${userId}:${target}`;
}

/** 유저 플래그 세트 키 */
function flagSetKey(userId: string): string {
  return `ach:flags:${userId}`;
}

// ─── 업적 엔진 ──────────────────────────────────────────────

class AchievementEngine extends EventEmitter {
  private io: Server | null = null;

  /** Socket.io 인스턴스 바인딩 (서버 시작 시 호출) */
  setIo(io: Server): void {
    this.io = io;
  }

  /**
   * 이벤트 기반 업적 체크
   * - 게임 이벤트 발생 시 호출
   * - Redis에 진행도 기록 → 조건 충족 시 DB unlock + 소켓 알림
   */
  async check(event: AchievementEvent): Promise<UnlockResult[]> {
    const { userId, type, value = 1, flag } = event;
    const results: UnlockResult[] = [];

    // 1) Redis 진행도 업데이트
    if (redisConnected) {
      await redisClient.incrBy(progressKey(userId, type), value);
      if (flag) {
        await redisClient.sAdd(flagSetKey(userId), flag);
      }
    }

    // 2) 해당 target과 관련된 업적 목록 조회
    const achievements = await prisma.achievement.findMany({
      where: {
        unlocks: {
          none: { userId },  // 아직 미달성인 것만
        },
      },
    });

    for (const ach of achievements) {
      const condition = ach.condition as unknown as AchievementCondition;

      // target이 일치하지 않으면 스킵 (combo 제외)
      if (condition.type !== 'combo' && condition.target !== type) continue;

      const met = await this.evaluateCondition(userId, condition);
      if (!met) continue;

      // 3) 달성 처리 — 중복 방지 (unique constraint)
      try {
        await prisma.achievementUnlock.create({
          data: { userId, achievementId: ach.id },
        });

        const unlockResult: UnlockResult = {
          achievementId: ach.id,
          code: ach.code,
          name: ach.name,
          tier: ach.tier,
          points: ach.points,
          category: ach.category,
        };
        results.push(unlockResult);

        // 4) 소켓 알림 브로드캐스트
        if (this.io) {
          this.io.to(`user:${userId}`).emit('achievement:unlocked', unlockResult);
        }

        // 5) 이벤트 발행 (외부 리스너용)
        this.emit('unlocked', { userId, achievement: unlockResult });

        // 6) 연동 칭호 자동 부여 (Title 테이블에 achievementId 매칭)
        await this.grantLinkedTitle(userId, ach.id);

      } catch {
        // unique constraint 위반 → 이미 달성됨, 무시
      }
    }

    return results;
  }

  /**
   * 조건 평가
   */
  private async evaluateCondition(
    userId: string,
    condition: AchievementCondition
  ): Promise<boolean> {
    switch (condition.type) {
      case 'count': {
        // Redis 카운터 확인
        if (!redisConnected) return false;
        const current = parseInt(
          (await redisClient.get(progressKey(userId, condition.target))) || '0',
          10
        );
        return current >= (condition.count ?? 1);
      }

      case 'threshold': {
        // 임계값 — count와 동일 로직이지만 의미가 다름 (누적이 아닌 최고 기록 등)
        if (!redisConnected) return false;
        const val = parseInt(
          (await redisClient.get(progressKey(userId, condition.target))) || '0',
          10
        );
        return val >= (condition.count ?? 1);
      }

      case 'flag': {
        // 특정 플래그가 설정되어 있는지 확인
        if (!redisConnected) return false;
        return await redisClient.sIsMember(flagSetKey(userId), condition.target);
      }

      case 'combo': {
        // 복합 조건 — 모든 플래그가 설정되어 있어야 함
        if (!redisConnected || !condition.flags) return false;
        for (const f of condition.flags) {
          const has = await redisClient.sIsMember(flagSetKey(userId), f);
          if (!has) return false;
        }
        return true;
      }

      default:
        return false;
    }
  }

  /**
   * 연동 칭호 자동 부여
   * - Title 테이블에서 achievementId가 매칭되는 칭호 확인
   * - UserTitle 중간 테이블에 실제 부여 기록
   */
  private async grantLinkedTitle(userId: string, achievementId: string): Promise<void> {
    const title = await prisma.title.findFirst({
      where: { achievementId },
    });

    if (!title) return;

    // UserTitle에 부여 (중복 방지 — unique constraint)
    try {
      await prisma.userTitle.create({
        data: {
          userId,
          titleId: title.id,
        },
      });

      // Redis 캐시에도 기록 (빠른 조회용)
      if (redisConnected) {
        await redisClient.sAdd(`user:titles:${userId}`, title.id);
      }

      this.emit('title_granted', { userId, title });
    } catch {
      // unique constraint 위반 → 이미 보유한 칭호, 무시
    }
  }

  /**
   * 유저 진행도 조회
   * - Redis 기반으로 현재 진행 상태 반환
   */
  async getProgress(
    userId: string
  ): Promise<Array<{ code: string; name: string; category: string; tier: string; progress: number; required: number; completed: boolean }>> {
    const achievements = await prisma.achievement.findMany({
      include: { unlocks: { where: { userId } } },
    });

    const result = [];
    for (const ach of achievements) {
      const condition = ach.condition as unknown as AchievementCondition;
      const completed = ach.unlocks.length > 0;

      let progress = 0;
      if (redisConnected && !completed) {
        if (condition.type === 'count' || condition.type === 'threshold') {
          progress = parseInt(
            (await redisClient.get(progressKey(userId, condition.target))) || '0',
            10
          );
        } else if (condition.type === 'flag') {
          const has = await redisClient.sIsMember(flagSetKey(userId), condition.target);
          progress = has ? 1 : 0;
        } else if (condition.type === 'combo' && condition.flags) {
          let count = 0;
          for (const f of condition.flags) {
            if (await redisClient.sIsMember(flagSetKey(userId), f)) count++;
          }
          progress = count;
        }
      }
      if (completed) progress = condition.count ?? 1;

      result.push({
        code: ach.code,
        name: ach.name,
        category: ach.category,
        tier: ach.tier,
        progress,
        required: condition.type === 'combo'
          ? (condition.flags?.length ?? 1)
          : (condition.count ?? 1),
        completed,
      });
    }

    return result;
  }
}

// 싱글턴 인스턴스
export const achievementEngine = new AchievementEngine();
