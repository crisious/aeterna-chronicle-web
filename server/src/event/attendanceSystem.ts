import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 출석 보상 */
interface AttendanceReward {
  type: 'gold' | 'diamond' | 'item' | 'event_coin';
  itemId?: string;
  amount: number;
}

/** 연속 출석 특별 보상 테이블 */
interface StreakMilestone {
  day: number;
  reward: AttendanceReward;
  label: string;
}

/** 누적 출석 보상 테이블 */
interface CumulativeMilestone {
  totalDays: number;
  reward: AttendanceReward;
  label: string;
}

/** 출석 체크 결과 */
interface AttendanceCheckResult {
  date: string;
  consecutiveDay: number;
  dailyReward: AttendanceReward;
  streakBonus: StreakMilestone | null;
  cumulativeBonus: CumulativeMilestone | null;
  alreadyChecked: boolean;
}

/** 출석 현황 */
interface AttendanceStatus {
  consecutiveDays: number;
  totalDays: number;
  thisMonthDays: number;
  lastCheckDate: string | null;
  recentRecords: Array<{
    date: string;
    day: number;
    reward: AttendanceReward;
  }>;
  nextStreakMilestone: StreakMilestone | null;
  nextCumulativeMilestone: CumulativeMilestone | null;
}

// ─── 상수 ───────────────────────────────────────────────────────

/** 일일 기본 보상 */
const DAILY_REWARDS: AttendanceReward[] = [
  { type: 'gold', amount: 100 },   // 1~6일
  { type: 'gold', amount: 150 },   // 7~13일
  { type: 'gold', amount: 200 },   // 14~27일
  { type: 'gold', amount: 300 },   // 28일+
];

/** 연속 출석 특별 보상 (7/14/28일) */
const STREAK_MILESTONES: StreakMilestone[] = [
  { day: 7,  reward: { type: 'diamond', amount: 50 },  label: '7일 연속 출석' },
  { day: 14, reward: { type: 'diamond', amount: 100 }, label: '14일 연속 출석' },
  { day: 28, reward: { type: 'diamond', amount: 200 }, label: '28일 연속 출석' },
];

/** 누적 출석 보상 (30/60/90일) */
const CUMULATIVE_MILESTONES: CumulativeMilestone[] = [
  { totalDays: 30, reward: { type: 'diamond', amount: 300 },    label: '누적 30일 출석' },
  { totalDays: 60, reward: { type: 'diamond', amount: 500 },    label: '누적 60일 출석' },
  { totalDays: 90, reward: { type: 'diamond', amount: 1000 },   label: '누적 90일 출석' },
];

// ─── KST 날짜 유틸 ──────────────────────────────────────────────

/** 현재 KST 날짜 (00:00 기준) */
function getTodayKST(): Date {
  const now = new Date();
  // KST = UTC + 9
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstTime = new Date(now.getTime() + kstOffset);
  const dateStr = kstTime.toISOString().split('T')[0];
  return new Date(dateStr + 'T00:00:00.000Z');
}

/** 어제 KST 날짜 */
function getYesterdayKST(): Date {
  const today = getTodayKST();
  today.setDate(today.getDate() - 1);
  return today;
}

/** 일일 기본 보상 결정 (연속일 기반) */
function getDailyReward(consecutiveDay: number): AttendanceReward {
  if (consecutiveDay >= 28) return DAILY_REWARDS[3];
  if (consecutiveDay >= 14) return DAILY_REWARDS[2];
  if (consecutiveDay >= 7) return DAILY_REWARDS[1];
  return DAILY_REWARDS[0];
}

// ═══════════════════════════════════════════════════════════════
//  출석 체크
// ═══════════════════════════════════════════════════════════════

/** 일일 출석 체크 (00:00 KST 기준) */
export async function checkAttendance(userId: string): Promise<AttendanceCheckResult> {
  const today = getTodayKST();
  const yesterday = getYesterdayKST();
  const todayStr = today.toISOString().split('T')[0];

  // 중복 체크
  const existing = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId, date: today } },
  });

  if (existing) {
    return {
      date: todayStr,
      consecutiveDay: existing.day,
      dailyReward: existing.reward as unknown as AttendanceReward,
      streakBonus: null,
      cumulativeBonus: null,
      alreadyChecked: true,
    };
  }

  // 어제 출석 기록 확인 → 연속일 계산
  const yesterdayRecord = await prisma.attendanceRecord.findUnique({
    where: { userId_date: { userId, date: yesterday } },
  });

  const consecutiveDay = yesterdayRecord ? yesterdayRecord.day + 1 : 1;
  const dailyReward = getDailyReward(consecutiveDay);

  // 출석 기록 생성
  await prisma.attendanceRecord.create({
    data: {
      userId,
      date: today,
      day: consecutiveDay,
      reward: dailyReward as object,
    },
  });

  // 연속 출석 마일스톤 확인
  const streakBonus = STREAK_MILESTONES.find((m) => m.day === consecutiveDay) ?? null;

  // 누적 출석일 계산
  const totalDays = await prisma.attendanceRecord.count({ where: { userId } });
  const cumulativeBonus = CUMULATIVE_MILESTONES.find((m) => m.totalDays === totalDays) ?? null;

  return {
    date: todayStr,
    consecutiveDay,
    dailyReward,
    streakBonus,
    cumulativeBonus,
    alreadyChecked: false,
  };
}

// ═══════════════════════════════════════════════════════════════
//  출석 현황 조회
// ═══════════════════════════════════════════════════════════════

/** 유저 출석 현황 */
export async function getAttendanceStatus(userId: string): Promise<AttendanceStatus> {
  // 최근 30일 기록
  const recentRecords = await prisma.attendanceRecord.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 30,
  });

  // 총 출석일
  const totalDays = await prisma.attendanceRecord.count({ where: { userId } });

  // 이번 달 출석일
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now.getTime() + kstOffset);
  const monthStart = new Date(`${kstNow.getFullYear()}-${String(kstNow.getMonth() + 1).padStart(2, '0')}-01T00:00:00.000Z`);
  const thisMonthDays = await prisma.attendanceRecord.count({
    where: { userId, date: { gte: monthStart } },
  });

  // 현재 연속일
  const consecutiveDays = recentRecords.length > 0 ? recentRecords[0].day : 0;
  const lastCheckDate = recentRecords.length > 0
    ? recentRecords[0].date.toISOString().split('T')[0]
    : null;

  // 다음 마일스톤
  const nextStreakMilestone = STREAK_MILESTONES.find((m) => m.day > consecutiveDays) ?? null;
  const nextCumulativeMilestone = CUMULATIVE_MILESTONES.find((m) => m.totalDays > totalDays) ?? null;

  return {
    consecutiveDays,
    totalDays,
    thisMonthDays,
    lastCheckDate,
    recentRecords: recentRecords.map((r) => ({
      date: r.date.toISOString().split('T')[0],
      day: r.day,
      reward: r.reward as unknown as AttendanceReward,
    })),
    nextStreakMilestone,
    nextCumulativeMilestone,
  };
}
