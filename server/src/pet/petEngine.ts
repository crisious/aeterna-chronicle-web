/**
 * 펫 엔진 — 소환/해제, 경험치/레벨업, 스킬 해금, 유대감, 진화, 스탯 성장
 */
import { prisma } from '../db';
import { PET_SPECIES, PET_SKILLS } from './petSeeds';

// ─── 등급 정의 ──────────────────────────────────────────────────
const GRADES = ['common', 'rare', 'epic', 'legendary'] as const;
type Grade = (typeof GRADES)[number];

/** 등급별 스탯 배율 (레벨업 시 적용) */
const GRADE_MULTIPLIER: Record<Grade, number> = {
  common: 1.0,
  rare: 1.3,
  epic: 1.6,
  legendary: 2.0,
};

// ─── 스킬 타입 ──────────────────────────────────────────────────
interface PetSkillSlot {
  skillId: string;
  name: string;
  damage: number;
  cooldown: number;
  level: number;
}

// ─── 소환 / 해제 ────────────────────────────────────────────────

/** 펫 소환 — 동시 소환 1마리 제한 */
export async function summonPet(ownerId: string, petId: string) {
  // 기존 소환 중인 펫 해제
  await prisma.pet.updateMany({
    where: { ownerId, isActive: true },
    data: { isActive: false },
  });

  const pet = await prisma.pet.update({
    where: { id: petId },
    data: { isActive: true },
  });

  // 소유자 검증
  if (pet.ownerId !== ownerId) {
    // 되돌리기
    await prisma.pet.update({ where: { id: petId }, data: { isActive: false } });
    throw new Error('소유하지 않은 펫은 소환할 수 없습니다.');
  }

  return pet;
}

/** 펫 해제 */
export async function dismissPet(ownerId: string, petId: string) {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.ownerId !== ownerId) throw new Error('소유하지 않은 펫입니다.');
  if (!pet.isActive) throw new Error('이미 해제된 펫입니다.');

  return prisma.pet.update({
    where: { id: petId },
    data: { isActive: false },
  });
}

// ─── 경험치 & 레벨업 ───────────────────────────────────────────

/** 필요 경험치 계산: 현재 레벨 × 100 */
function requiredExp(level: number): number {
  return level * 100;
}

/** 경험치 부여 + 자동 레벨업 + 스킬 해금 */
export async function grantExp(petId: string, amount: number) {
  let pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) throw new Error('펫을 찾을 수 없습니다.');

  let { level, exp } = pet;
  exp += amount;
  let maxExp = requiredExp(level);
  let leveled = false;

  // 다중 레벨업 처리
  while (exp >= maxExp) {
    exp -= maxExp;
    level += 1;
    maxExp = requiredExp(level);
    leveled = true;
  }

  // 스탯 성장 (레벨업 횟수만큼 적용)
  const grade = pet.grade as Grade;
  const mult = GRADE_MULTIPLIER[grade] ?? 1.0;
  const levelGain = level - pet.level;
  const hpGain = Math.floor(10 * mult * levelGain);
  const atkGain = Math.floor(2 * mult * levelGain);
  const defGain = Math.floor(1 * mult * levelGain);

  // 스킬 해금 체크
  const skills = (pet.skills as unknown as PetSkillSlot[]) ?? [];
  const speciesData = PET_SPECIES.find((s) => s.species === pet!.species);
  if (speciesData) {
    for (const skillId of speciesData.learnableSkills) {
      const skillDef = PET_SKILLS.find((s) => s.id === skillId);
      if (skillDef && skillDef.unlockLevel <= level) {
        if (!skills.some((s) => s.skillId === skillId)) {
          skills.push({
            skillId,
            name: skillDef.name,
            damage: skillDef.damage,
            cooldown: skillDef.cooldown,
            level: 1,
          });
        }
      }
    }
  }

  pet = await prisma.pet.update({
    where: { id: petId },
    data: {
      level,
      exp,
      maxExp,
      hp: pet.hp + hpGain,
      attack: pet.attack + atkGain,
      defense: pet.defense + defGain,
      skills: JSON.parse(JSON.stringify(skills)),
    },
  });

  return { pet, leveled, levelGain };
}

// ─── 유대감 시스템 ──────────────────────────────────────────────

/** 유대감 증가 (먹이 주기, 전투 참여 등) */
export async function increaseBond(petId: string, amount: number) {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet) throw new Error('펫을 찾을 수 없습니다.');

  const newBond = Math.min(100, pet.bond + amount);
  return prisma.pet.update({
    where: { id: petId },
    data: { bond: newBond },
  });
}

/** 먹이 주기 — 유대감 +5 */
export async function feedPet(ownerId: string, petId: string) {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.ownerId !== ownerId) throw new Error('소유하지 않은 펫입니다.');

  return increaseBond(petId, 5);
}

// ─── 등급 진화 ──────────────────────────────────────────────────

/** 진화 가능 여부 확인 */
export function canEvolve(pet: { grade: string; bond: number }): boolean {
  const idx = GRADES.indexOf(pet.grade as Grade);
  if (idx < 0 || idx >= GRADES.length - 1) return false; // legendary는 진화 불가
  return pet.bond >= 100;
}

/** 등급 진화 실행 (유대감 100 + 재료 검증은 호출측에서 처리) */
export async function evolvePet(ownerId: string, petId: string) {
  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.ownerId !== ownerId) throw new Error('소유하지 않은 펫입니다.');
  if (!canEvolve(pet)) throw new Error('진화 조건을 충족하지 못했습니다.');

  const currentIdx = GRADES.indexOf(pet.grade as Grade);
  const nextGrade = GRADES[currentIdx + 1];

  // 진화 시 유대감 초기화, 스탯 보너스
  const mult = GRADE_MULTIPLIER[nextGrade];
  return prisma.pet.update({
    where: { id: petId },
    data: {
      grade: nextGrade,
      bond: 0,
      hp: Math.floor(pet.hp * 1.2),
      attack: Math.floor(pet.attack * 1.15),
      defense: Math.floor(pet.defense * 1.15),
    },
  });
}

// ─── 펫 공격 (전투용) ───────────────────────────────────────────

/** 펫 스킬 공격 — 데미지 계산 후 반환 */
export function calculatePetAttack(
  pet: { attack: number; grade: string; skills: unknown },
  skillIndex: number
): { damage: number; skillName: string } {
  const skills = (pet.skills as unknown as PetSkillSlot[]) ?? [];
  const skill = skills[skillIndex];
  if (!skill) throw new Error('스킬 슬롯이 비어 있습니다.');

  const grade = pet.grade as Grade;
  const mult = GRADE_MULTIPLIER[grade] ?? 1.0;
  const baseDamage = pet.attack + skill.damage;
  const finalDamage = Math.floor(baseDamage * mult);

  return { damage: finalDamage, skillName: skill.name };
}
