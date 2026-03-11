/**
 * E2E 테스트 — 경매장 시스템 (5 tests)
 * 등록, 검색, 입찰, 즉시구매, 만료
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Auction E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  const auctions: Record<string, { itemId: string; sellerId: string; startPrice: number; buyoutPrice: number; currentBid: number; bidderId: string | null; status: string }> = {};

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.post('/api/auction/register', async (req) => {
      const { sellerId, itemId, startPrice, buyoutPrice } = req.body as Record<string, any>;
      const id = `auc_${Date.now()}`;
      auctions[id] = { itemId, sellerId, startPrice, buyoutPrice, currentBid: startPrice, bidderId: null, status: 'active' };
      return { auctionId: id };
    });

    app.get('/api/auction/search', async (req) => {
      const { keyword } = req.query as Record<string, string>;
      const items = Object.entries(auctions)
        .filter(([, a]) => a.status === 'active' && a.itemId.includes(keyword ?? ''))
        .map(([id, a]) => ({ auctionId: id, ...a }));
      return { results: items, total: items.length };
    });

    app.post('/api/auction/bid', async (req, reply) => {
      const { auctionId, bidderId, amount } = req.body as Record<string, any>;
      const auc = auctions[auctionId];
      if (!auc) return reply.status(404).send({ error: 'NOT_FOUND' });
      if (amount <= auc.currentBid) return reply.status(400).send({ error: 'BID_TOO_LOW' });
      auc.currentBid = amount;
      auc.bidderId = bidderId;
      return { currentBid: amount, bidderId };
    });

    app.post('/api/auction/buyout', async (req, reply) => {
      const { auctionId, buyerId } = req.body as Record<string, any>;
      const auc = auctions[auctionId];
      if (!auc) return reply.status(404).send({ error: 'NOT_FOUND' });
      auc.status = 'sold';
      auc.bidderId = buyerId;
      return { status: 'sold', price: auc.buyoutPrice };
    });

    app.post('/api/auction/expire', async (req) => {
      const { auctionId } = req.body as Record<string, string>;
      const auc = auctions[auctionId];
      if (auc) auc.status = 'expired';
      return { status: 'expired' };
    });

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  let aucId = '';

  test('1. 경매 등록', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auction/register', payload: { sellerId: 'u1', itemId: 'wpn_iron_sword', startPrice: 500, buyoutPrice: 2000 } });
    aucId = JSON.parse(res.body).auctionId;
    expect(aucId).toBeTruthy();
  });

  test('2. 경매 검색', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auction/search?keyword=wpn' });
    expect(JSON.parse(res.body).total).toBeGreaterThanOrEqual(1);
  });

  test('3. 입찰 → 현재가 갱신', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auction/bid', payload: { auctionId: aucId, bidderId: 'u2', amount: 800 } });
    expect(JSON.parse(res.body).currentBid).toBe(800);
  });

  test('4. 즉시 구매 → sold', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auction/buyout', payload: { auctionId: aucId, buyerId: 'u3' } });
    expect(JSON.parse(res.body).status).toBe('sold');
  });

  test('5. 만료 처리', async () => {
    // 새 경매 등록 후 만료
    const reg = await app.inject({ method: 'POST', url: '/api/auction/register', payload: { sellerId: 'u1', itemId: 'mat_iron', startPrice: 100, buyoutPrice: 500 } });
    const id2 = JSON.parse(reg.body).auctionId;
    const res = await app.inject({ method: 'POST', url: '/api/auction/expire', payload: { auctionId: id2 } });
    expect(JSON.parse(res.body).status).toBe('expired');
  });
});
