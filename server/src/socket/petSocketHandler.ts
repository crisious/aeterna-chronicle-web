/**
 * 펫 시스템 소켓 이벤트 핸들러
 * - pet:summon, pet:dismiss, pet:attack, pet:levelup
 */
import { Server, Socket } from 'socket.io';
import { summonPet, dismissPet, calculatePetAttack, grantExp } from '../pet/petEngine';
import { prisma } from '../db';

// ─── 이벤트 페이로드 타입 ───────────────────────────────────────

interface PetSummonPayload  { ownerId: string; petId: string; }
interface PetDismissPayload { ownerId: string; petId: string; }
interface PetAttackPayload  { petId: string; skillIndex: number; targetId?: string; }
interface PetLevelUpPayload { petId: string; expAmount: number; }

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupPetSocketHandlers(io: Server): void {
  io.on('connection', (socket: Socket) => {

    // ── 펫 소환 ──
    socket.on('pet:summon', async (payload: PetSummonPayload, callback?: (res: unknown) => void) => {
      try {
        const pet = await summonPet(payload.ownerId, payload.petId);
        // 같은 방(룸)에 브로드캐스트
        socket.broadcast.emit('pet:summoned', {
          ownerId: payload.ownerId,
          pet,
        });
        callback?.({ success: true, data: pet });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // ── 펫 해제 ──
    socket.on('pet:dismiss', async (payload: PetDismissPayload, callback?: (res: unknown) => void) => {
      try {
        const pet = await dismissPet(payload.ownerId, payload.petId);
        socket.broadcast.emit('pet:dismissed', {
          ownerId: payload.ownerId,
          petId: payload.petId,
        });
        callback?.({ success: true, data: pet });
      } catch (err) {
        callback?.({ success: false, error: (err as Error).message });
      }
    });

    // ── 펫 공격 ──
    socket.on('pet:attack', async (payload: PetAttackPayload, callback?: (res: unknown) => void) => {
      try {
        const pet = await prisma.pet.findUnique({ where: { id: payload.petId } });
        if (!pet || !pet.isActive) {
          callback?.({ success: false, error: '소환 중인 펫이 아닙니다.' });
          return;
        }

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
    socket.on('pet:levelup', async (payload: PetLevelUpPayload, callback?: (res: unknown) => void) => {
      try {
        const result = await grantExp(payload.petId, payload.expAmount);

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
