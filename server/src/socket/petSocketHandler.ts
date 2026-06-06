/**
 * 펫 시스템 소켓 이벤트 핸들러
 * - pet:summon, pet:dismiss, pet:attack, pet:levelup
 */
import type { Server, Socket } from 'socket.io';
import { summonPet, dismissPet, calculatePetAttack, grantExp } from '../pet/petEngine';
import { prisma } from '../db';
import { clampValue } from '../security/valueGuard';

// ─── 이벤트 페이로드 타입 ───────────────────────────────────────
// SECURITY-IDOR: 소유자(ownerId)는 payload 가 아니라 socket.data.userId(핸드셰이크 인증)를 쓴다.

interface PetSummonPayload  { petId: string; }
interface PetDismissPayload { petId: string; }
interface PetAttackPayload  { petId: string; skillIndex: number; targetId?: string; }
interface PetLevelUpPayload { petId: string; expAmount: number; }

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupPetSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    // ── 펫 소환 ──
    socket.on('pet:summon', async (payload: PetSummonPayload, callback?: (res: unknown) => void) => {
      try {
        const ownerId = socket.data.userId; // SECURITY-IDOR: 소유자 = 인증 사용자
        if (!ownerId) return callback?.({ success: false, error: '인증이 필요합니다.' });
        const pet = await summonPet(ownerId, payload.petId);
        // 같은 방(룸)에 브로드캐스트
        socket.broadcast.emit('pet:summoned', { ownerId, pet });
        callback?.({ success: true, data: pet });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // ── 펫 해제 ──
    socket.on('pet:dismiss', async (payload: PetDismissPayload, callback?: (res: unknown) => void) => {
      try {
        const ownerId = socket.data.userId; // SECURITY-IDOR: 소유자 = 인증 사용자
        if (!ownerId) return callback?.({ success: false, error: '인증이 필요합니다.' });
        const pet = await dismissPet(ownerId, payload.petId);
        socket.broadcast.emit('pet:dismissed', { ownerId, petId: payload.petId });
        callback?.({ success: true, data: pet });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // ── 펫 공격 ──
    socket.on('pet:attack', async (payload: PetAttackPayload, callback?: (res: unknown) => void) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return callback?.({ success: false, error: '인증이 필요합니다.' });
        if (!Number.isInteger(payload.skillIndex) || payload.skillIndex < 0) {
          return callback?.({ success: false, error: '유효하지 않은 skillIndex 입니다.' });
        }
        const pet = await prisma.pet.findUnique({ where: { id: payload.petId } });
        if (!pet || !pet.isActive) {
          callback?.({ success: false, error: '소환 중인 펫이 아닙니다.' });
          return;
        }
        // SECURITY-IDOR: 본인 소유 펫만 공격 트리거(타인 펫 공격/유대감 조작 차단)
        if (pet.ownerId !== userId) {
          return callback?.({ success: false, error: '소유하지 않은 펫입니다.' });
        }
        // SECURITY-TODO: targetId 는 전투세션 참가자인지 구조검증 필요(현 핸들러에 세션 컨텍스트 없음).

        const result = calculatePetAttack(pet, payload.skillIndex);

        // 공격 결과 브로드캐스트
        io.emit('pet:attacked', {
          petId: payload.petId,
          ownerId: pet.ownerId,
          targetId: payload.targetId,
          ...result,
        });

        // 전투 참여 유대감 증가 (+1)
        await prisma.pet.update({
          where: { id: payload.petId },
          data: { bond: Math.min(100, pet.bond + 1) },
        });

        callback?.({ success: true, data: result });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // ── 펫 레벨업 (경험치 부여) ──
    // SECURITY: 이전에는 actor 바인딩이 전혀 없어 임의 소켓이 아무 펫에 무한 expAmount 를 부여(무한
    // 레벨업/스탯)할 수 있었다. 본인 소유 펫만 + expAmount 위생처리(NaN/음수 거부 + per-call 1레벨분 캡으로
    // while 다중레벨업 폭주 차단). SECURITY-TODO: 진짜 보상은 서버 전투결과에서 grantExp 를 호출하도록 재설계.
    socket.on('pet:levelup', async (payload: PetLevelUpPayload, callback?: (res: unknown) => void) => {
      try {
        const userId = socket.data.userId;
        if (!userId) return callback?.({ success: false, error: '인증이 필요합니다.' });
        const pet = await prisma.pet.findUnique({ where: { id: payload.petId } });
        if (!pet || pet.ownerId !== userId) {
          return callback?.({ success: false, error: '소유하지 않은 펫입니다.' });
        }
        // per-call 캡 = 현재 레벨 1레벨분(level*100). 음수/NaN/Infinity 는 거부.
        const safeExp = clampValue(payload.expAmount, pet.level * 100);
        if (safeExp === null) {
          return callback?.({ success: false, error: '유효하지 않은 expAmount 입니다.' });
        }
        const result = await grantExp(payload.petId, safeExp);

        if (result.leveled) {
          // 레벨업 이벤트 브로드캐스트
          io.emit('pet:leveled', {
            petId: payload.petId,
            newLevel: result.pet.level,
            levelGain: result.levelGain,
          });
        }

        callback?.({ success: true, data: result });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });
  });
}
