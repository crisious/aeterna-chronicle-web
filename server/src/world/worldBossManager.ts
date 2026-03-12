/**
 * worldBossManager.ts — P11-05 월드 보스 시스템
 *
 * 서버 전체 참여 주간 보스
 * - 실시간 HP 공유 (Redis pub/sub)
 * - 참여 기여도 기반 보상 분배
 * - 보스 3종 (주별 로테이션)
 * - 주간 리셋: 매주 토요일 20:00 KST
 */

import { prisma } from '../db';
import { redisClient } from '../redis';
import { Server as SocketServer } from 'socket.io';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface WorldBossDefinition {
  id: string;
  name: string;
  description: string;
  maxHp: number;
  attack: number;
  defense: number;
  skills: WorldBossSkill[];
  phases: WorldBossPhase[];
  lootTable: WorldBossLoot[];
  requiredLevel: number;
  weeklySchedule: number;   // 0=일, 1=월, ..., 6=토 (로테이션 기준)
}

export interface WorldBossSkill {
  id: string;
  name: string;
  description: string;
  damage: number;
  cooldown: number;
  aoeRadius: number;
  effect?: Record<string, unknown>;
}

export interface WorldBossPhase {
  hpThreshold: number;    // 이 HP% 이하에서 발동
  name: string;
  description: string;
  buffs: { stat: string; value: number }[];
  newSkills?: string[];
}

export interface WorldBossLoot {
  itemId: string;
  name: string;
  type: string;
  dropRate: number;          // 0~1
  minContribution: number;   // 최소 기여도 요구치
}

export interface ParticipantRecord {
  playerId: string;
  playerName: string;
  totalDamage: number;
  healingDone: number;
  deathCount: number;
  joinTime: Date;
  contribution: number;     // 계산된 기여도 (0~1)
}

// ─── 상수 ───────────────────────────────────────────────────────

const REDIS_BOSS_HP_KEY = 'world_boss:current_hp';
const REDIS_BOSS_PARTICIPANTS = 'world_boss:participants';
const REDIS_BOSS_STATUS = 'world_boss:status';
const BOSS_CHANNEL = 'world_boss:events';
const MIN_LEVEL = 40;

// ─── 보스 정의 (3종 로테이션) ───────────────────────────────────

export const WORLD_BOSSES: WorldBossDefinition[] = [
  {
    id: 'wb_lethe_abyssal',
    name: '레테 대심연체',
    description: '심연에서 각성한 레테의 잔류 의지. 3,200년의 봉인 에너지가 폭주한 형태.',
    maxHp: 500_000_000,
    attack: 8500,
    defense: 3200,
    requiredLevel: 60,
    weeklySchedule: 0,
    skills: [
      { id: 'wb_ls1', name: '기억 소멸파', description: '전방 60도 범위에 대미지 + 버프 해제', damage: 12000, cooldown: 15, aoeRadius: 12 },
      { id: 'wb_ls2', name: '심연의 부름', description: '랜덤 5인 대상 끌어당김 + DoT', damage: 8000, cooldown: 25, aoeRadius: 20, effect: { pull: true, dot: { damage: 2000, duration: 5 } } },
      { id: 'wb_ls3', name: '시간 균열', description: '바닥 장판 3개 생성 (10초 지속)', damage: 15000, cooldown: 30, aoeRadius: 5 },
      { id: 'wb_ls4', name: '대망각 재현', description: '전체 범위 피해 + 3초 시야 차단', damage: 20000, cooldown: 60, aoeRadius: 30, effect: { blind: 3 } },
    ],
    phases: [
      { hpThreshold: 70, name: '각성', description: '공격력 20% 증가', buffs: [{ stat: 'attack', value: 0.2 }] },
      { hpThreshold: 40, name: '폭주', description: '공격속도 30% 증가, 방어력 20% 감소', buffs: [{ stat: 'attackSpeed', value: 0.3 }, { stat: 'defense', value: -0.2 }] },
      { hpThreshold: 15, name: '최후의 발악', description: '모든 스킬 쿨다운 50% 감소', buffs: [{ stat: 'cooldownReduction', value: 0.5 }], newSkills: ['wb_ls4'] },
    ],
    lootTable: [
      { itemId: 'abyss_weapon_mat', name: '심연 무기 재료', type: 'material', dropRate: 1.0, minContribution: 0.001 },
      { itemId: 'abyss_armor_mat', name: '심연 방어구 재료', type: 'material', dropRate: 0.8, minContribution: 0.005 },
      { itemId: 'transcendence_stone_epic', name: '에픽 초월석', type: 'material', dropRate: 0.3, minContribution: 0.01 },
      { itemId: 'lethe_essence', name: '레테의 정수', type: 'rare_material', dropRate: 0.05, minContribution: 0.05 },
      { itemId: 'COS_LETHE_WING', name: '심연의 날개 (코스메틱)', type: 'cosmetic', dropRate: 0.01, minContribution: 0.1 },
    ],
  },
  {
    id: 'wb_chrono_titan',
    name: '시간의 거인 크로노스',
    description: '봉인 12인이 남긴 시간 에너지가 결집한 거대 골렘. 시간을 왜곡하는 힘을 가졌다.',
    maxHp: 400_000_000,
    attack: 7200,
    defense: 4500,
    requiredLevel: 55,
    weeklySchedule: 1,
    skills: [
      { id: 'wb_cs1', name: '시간 충격파', description: '전방위 충격파 + 2초 스턴', damage: 10000, cooldown: 12, aoeRadius: 15, effect: { stun: 2 } },
      { id: 'wb_cs2', name: '시간 역전장', description: '범위 내 아군 힐 효과 역전 (힐→대미지) 8초', damage: 0, cooldown: 40, aoeRadius: 10, effect: { healReverse: 8 } },
      { id: 'wb_cs3', name: '봉인 해방', description: '자가 버프: 5초간 무적 + HP 2% 회복', damage: 0, cooldown: 90, aoeRadius: 0, effect: { invincible: 5, selfHeal: 0.02 } },
    ],
    phases: [
      { hpThreshold: 60, name: '봉인 균열', description: '방어력 30% 감소, 공격력 25% 증가', buffs: [{ stat: 'defense', value: -0.3 }, { stat: 'attack', value: 0.25 }] },
      { hpThreshold: 25, name: '시간 폭주', description: '이동속도 50% 증가', buffs: [{ stat: 'moveSpeed', value: 0.5 }] },
    ],
    lootTable: [
      { itemId: 'chrono_gear_mat', name: '시간 톱니 재료', type: 'material', dropRate: 1.0, minContribution: 0.001 },
      { itemId: 'chrono_core', name: '크로노스의 핵', type: 'rare_material', dropRate: 0.1, minContribution: 0.03 },
      { itemId: 'transcendence_stone_rare', name: '레어 초월석', type: 'material', dropRate: 0.5, minContribution: 0.005 },
    ],
  },
  {
    id: 'wb_memory_hydra',
    name: '기억의 히드라',
    description: '에테르니아 대서고의 잊혀진 지식이 실체화한 다두 괴물. 머리마다 다른 원소 속성.',
    maxHp: 450_000_000,
    attack: 7800,
    defense: 3800,
    requiredLevel: 58,
    weeklySchedule: 2,
    skills: [
      { id: 'wb_hs1', name: '다원소 브레스', description: '3방향 원소 브레스 동시 발사', damage: 9000, cooldown: 10, aoeRadius: 8 },
      { id: 'wb_hs2', name: '머리 재생', description: '절단된 머리 재생 + 소환수 2체', damage: 0, cooldown: 45, aoeRadius: 0, effect: { summon: 2 } },
      { id: 'wb_hs3', name: '기억 폭류', description: '전체 플레이어 UI 3초 왜곡 + 대미지', damage: 11000, cooldown: 35, aoeRadius: 25, effect: { uiDistortion: 3 } },
    ],
    phases: [
      { hpThreshold: 50, name: '분열', description: '머리 2개 추가 (소환수 스펙 강화)', buffs: [{ stat: 'attack', value: 0.15 }], newSkills: ['wb_hs2'] },
      { hpThreshold: 20, name: '최종 형태', description: '모든 브레스 피해 40% 증가', buffs: [{ stat: 'skillDamage', value: 0.4 }] },
    ],
    lootTable: [
      { itemId: 'hydra_scale', name: '히드라 비늘', type: 'material', dropRate: 1.0, minContribution: 0.001 },
      { itemId: 'hydra_fang', name: '히드라의 독아', type: 'rare_material', dropRate: 0.08, minContribution: 0.04 },
      { itemId: 'COS_HYDRA_PET', name: '미니 히드라 (펫 스킨)', type: 'cosmetic', dropRate: 0.02, minContribution: 0.08 },
    ],
  },
];

// ─── 보스 로테이션 ──────────────────────────────────────────────

export function getCurrentBoss(date: Date = new Date()): WorldBossDefinition {
  const weekNum = Math.ceil(
    (date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 86400000)
  );
  const bossIndex = weekNum % WORLD_BOSSES.length;
  return WORLD_BOSSES[bossIndex];
}

// ─── HP 관리 (Redis) ────────────────────────────────────────────

export class WorldBossHPPool {
  private bossId: string;

  constructor(bossId: string) {
    this.bossId = bossId;
  }

  /** 보스 HP 초기화 (주간 리셋 시) */
  async initialize(maxHp: number): Promise<void> {
    await redisClient.set(`${REDIS_BOSS_HP_KEY}:${this.bossId}`, maxHp.toString());
    await redisClient.set(`${REDIS_BOSS_STATUS}:${this.bossId}`, 'active');
  }

  /** 데미지 적용 (원자적) */
  async applyDamage(playerId: string, damage: number): Promise<{ remainingHp: number; defeated: boolean }> {
    const key = `${REDIS_BOSS_HP_KEY}:${this.bossId}`;
    const newHp = await redisClient.decrby(key, damage);
    const defeated = newHp <= 0;

    if (defeated) {
      await redisClient.set(`${REDIS_BOSS_STATUS}:${this.bossId}`, 'defeated');
    }

    // 기여도 기록
    await redisClient.hincrbyfloat(
      `${REDIS_BOSS_PARTICIPANTS}:${this.bossId}`,
      playerId,
      damage,
    );

    return { remainingHp: Math.max(0, newHp), defeated };
  }

  /** 현재 HP 조회 */
  async getCurrentHp(): Promise<number> {
    const hp = await redisClient.get(`${REDIS_BOSS_HP_KEY}:${this.bossId}`);
    return hp ? parseInt(hp, 10) : 0;
  }

  /** 보스 상태 조회 */
  async getStatus(): Promise<'active' | 'defeated' | 'inactive'> {
    const status = await redisClient.get(`${REDIS_BOSS_STATUS}:${this.bossId}`);
    return (status as 'active' | 'defeated' | 'inactive') ?? 'inactive';
  }
}

// ─── 기여도 계산 ────────────────────────────────────────────────

export async function calculateContributions(bossId: string): Promise<ParticipantRecord[]> {
  const key = `${REDIS_BOSS_PARTICIPANTS}:${bossId}`;
  const data = await redisClient.hgetall(key);

  if (!data || Object.keys(data).length === 0) return [];

  const totalDamage = Object.values(data).reduce((sum, val) => sum + parseFloat(val), 0);
  const participants: ParticipantRecord[] = [];

  for (const [playerId, damageStr] of Object.entries(data)) {
    const damage = parseFloat(damageStr);
    const player = await prisma.player.findUnique({ where: { id: playerId } });

    participants.push({
      playerId,
      playerName: player?.nickname ?? 'Unknown',
      totalDamage: damage,
      healingDone: 0,
      deathCount: 0,
      joinTime: new Date(),
      contribution: totalDamage > 0 ? damage / totalDamage : 0,
    });
  }

  return participants.sort((a, b) => b.contribution - a.contribution);
}

// ─── 보상 분배 ──────────────────────────────────────────────────

export function calculateLoot(
  boss: WorldBossDefinition,
  participant: ParticipantRecord,
): { itemId: string; name: string; amount: number }[] {
  const loot: { itemId: string; name: string; amount: number }[] = [];

  for (const item of boss.lootTable) {
    if (participant.contribution < item.minContribution) continue;

    // 기여도 비례 드랍 확률 보정
    const adjustedRate = item.dropRate * (1 + participant.contribution * 2);
    if (Math.random() < adjustedRate) {
      loot.push({ itemId: item.itemId, name: item.name, amount: 1 });
    }
  }

  // 기본 보상 (참여만으로 지급)
  const baseGold = Math.floor(5000 + participant.contribution * 50000);
  loot.push({ itemId: 'gold', name: `골드 ${baseGold.toLocaleString()}`, amount: baseGold });

  return loot;
}

// ─── Socket.io 실시간 이벤트 ────────────────────────────────────

export function setupWorldBossSocket(io: SocketServer): void {
  io.on('connection', (socket) => {
    socket.on('world_boss:join', async (data: { bossId: string }) => {
      socket.join(`world_boss:${data.bossId}`);
      const pool = new WorldBossHPPool(data.bossId);
      const hp = await pool.getCurrentHp();
      socket.emit('world_boss:state', { bossId: data.bossId, currentHp: hp });
    });

    socket.on('world_boss:damage', async (data: { bossId: string; playerId: string; damage: number }) => {
      const pool = new WorldBossHPPool(data.bossId);
      const result = await pool.applyDamage(data.playerId, data.damage);

      io.to(`world_boss:${data.bossId}`).emit('world_boss:hp_update', {
        bossId: data.bossId,
        remainingHp: result.remainingHp,
        defeated: result.defeated,
        lastAttacker: data.playerId,
      });

      if (result.defeated) {
        io.to(`world_boss:${data.bossId}`).emit('world_boss:defeated', {
          bossId: data.bossId,
        });
      }
    });

    socket.on('world_boss:leave', (data: { bossId: string }) => {
      socket.leave(`world_boss:${data.bossId}`);
    });
  });
}

console.log('[P11-05] WorldBossManager 모듈 로드 완료');
