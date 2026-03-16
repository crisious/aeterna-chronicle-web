/**
 * auctionSocketHandler.ts — 거래소 실시간 소켓 이벤트 (P5-06)
 *
 * - auction:listed — 새 매물 등록 알림
 * - auction:bid    — 입찰 알림
 * - auction:sold   — 낙찰/즉시구매 완료 알림
 *
 * 글로벌 브로드캐스트 방식 (거래소 구독 채널)
 */
import { Server } from 'socket.io';
import { auctionManager } from '../auction/auctionManager';

// ─── 소켓 채널 ─────────────────────────────────────────────────

const AUCTION_ROOM = 'auction:feed';

// ─── 핸들러 등록 ────────────────────────────────────────────────

export function setupAuctionSocketHandlers(io: Server): void {
  // 매니저 콜백 등록 — 이벤트 발생 시 구독자에게 브로드캐스트
  auctionManager.setOnListed((listing: unknown) => {
    io.to(AUCTION_ROOM).emit('auction:listed', listing);
  });

  auctionManager.setOnBid((listingId: string, bidderId: string, amount: number) => {
    io.to(AUCTION_ROOM).emit('auction:bid', { listingId, bidderId, amount });
  });

  auctionManager.setOnSold((listingId: string, buyerId: string, sellerId: string, price: number) => {
    io.to(AUCTION_ROOM).emit('auction:sold', { listingId, buyerId, sellerId, price });
    // 관련 유저에게 개인 알림
    io.to(`user:${sellerId}`).emit('auction:my_item_sold', { listingId, price });
    io.to(`user:${buyerId}`).emit('auction:purchase_complete', { listingId, price });
  });

  io.on('connection', (socket) => {
    // 거래소 피드 구독
    socket.on('auction:subscribe', async () => {
      await socket.join(AUCTION_ROOM);
    });

    // 거래소 피드 구독 해제
    socket.on('auction:unsubscribe', async () => {
      await socket.leave(AUCTION_ROOM);
    });
  });
}
