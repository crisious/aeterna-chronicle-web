/**
 * discordBot.ts — Discord 봇 연동 (P12-02)
 *
 * 게임 내 이벤트(월드보스/길드전/시즌 리셋) → Discord 웹훅 알림.
 * 웹훅 기반으로 봇 토큰 없이도 동작. 큐 기반 rate limit 준수.
 */

// ─── 타입 정의 ──────────────────────────────────────────────────

export type DiscordEventType =
  | 'world_boss_spawn'
  | 'world_boss_defeat'
  | 'guild_war_start'
  | 'guild_war_end'
  | 'season_reset'
  | 'maintenance'
  | 'community_event'
  | 'server_announcement';

export interface DiscordWebhookConfig {
  url: string;
  guildId: string;        // Discord 서버 ID (관리용)
  channelName: string;    // 표시용
  events: DiscordEventType[]; // 수신할 이벤트 타입
  enabled: boolean;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  thumbnail?: { url: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string };
  timestamp?: string;
}

interface WebhookPayload {
  username: string;
  avatar_url?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}

interface QueueItem {
  webhookUrl: string;
  payload: WebhookPayload;
  retries: number;
  addedAt: number;
}

// ─── 상수 ───────────────────────────────────────────────────────

const BOT_USERNAME = '에테르나 크로니클';
const BOT_AVATAR = process.env.DISCORD_BOT_AVATAR || 'https://aeterna.game/assets/bot-avatar.png';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const QUEUE_INTERVAL_MS = 1000; // 1초 간격 발송 (rate limit 준수)

// ─── 색상 매핑 ──────────────────────────────────────────────────

const EVENT_COLORS: Record<DiscordEventType, number> = {
  world_boss_spawn:    0xFF4444, // 빨강
  world_boss_defeat:   0x44FF44, // 초록
  guild_war_start:     0xFF8800, // 주황
  guild_war_end:       0x4488FF, // 파랑
  season_reset:        0xFFDD00, // 노랑
  maintenance:         0x888888, // 회색
  community_event:     0xAA44FF, // 보라
  server_announcement: 0x00DDFF, // 하늘
};

// ─── 웹훅 레지스트리 (인메모리 + DB) ────────────────────────────

const webhookRegistry: Map<string, DiscordWebhookConfig> = new Map();

/** 웹훅 등록 */
export function registerWebhook(id: string, config: DiscordWebhookConfig): void {
  webhookRegistry.set(id, config);
  console.log(`[DiscordBot] 웹훅 등록: ${id} (${config.channelName})`);
}

/** 웹훅 제거 */
export function unregisterWebhook(id: string): boolean {
  const result = webhookRegistry.delete(id);
  if (result) console.log(`[DiscordBot] 웹훅 제거: ${id}`);
  return result;
}

/** 등록된 웹훅 목록 */
export function getWebhooks(): Array<{ id: string } & DiscordWebhookConfig> {
  return Array.from(webhookRegistry.entries()).map(([id, config]) => ({ id, ...config }));
}

// ─── 발송 큐 ────────────────────────────────────────────────────

const sendQueue: QueueItem[] = [];
let queueRunning = false;

async function processQueue(): Promise<void> {
  if (queueRunning) return;
  queueRunning = true;

  while (sendQueue.length > 0) {
    const item = sendQueue.shift()!;
    try {
      const response = await fetch(item.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (response.status === 429) {
        // Rate limited — 큐 앞에 다시 넣고 대기
        const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
        console.warn(`[DiscordBot] Rate limited, ${retryAfter}s 후 재시도`);
        sendQueue.unshift(item);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok && item.retries < MAX_RETRIES) {
        item.retries++;
        sendQueue.push(item);
        console.warn(`[DiscordBot] 발송 실패 (${response.status}), 재시도 ${item.retries}/${MAX_RETRIES}`);
      } else if (!response.ok) {
        console.error(`[DiscordBot] 발송 최종 실패 (${response.status}): ${item.webhookUrl}`);
      }
    } catch (err) {
      if (item.retries < MAX_RETRIES) {
        item.retries++;
        sendQueue.push(item);
      } else {
        console.error(`[DiscordBot] 네트워크 오류 최종 실패:`, err);
      }
    }

    await sleep(QUEUE_INTERVAL_MS);
  }

  queueRunning = false;
}

function enqueue(webhookUrl: string, payload: WebhookPayload): void {
  sendQueue.push({ webhookUrl, payload, retries: 0, addedAt: Date.now() });
  processQueue().catch(console.error);
}

// ─── 이벤트 알림 빌더 ───────────────────────────────────────────

function buildEmbed(eventType: DiscordEventType, data: Record<string, any>): DiscordEmbed {
  const embed: DiscordEmbed = {
    title: '',
    description: '',
    color: EVENT_COLORS[eventType],
    timestamp: new Date().toISOString(),
    footer: { text: SITE_NAME },
  };

  switch (eventType) {
    case 'world_boss_spawn':
      embed.title = `🐉 월드 보스 출현: ${data.bossName || '???'}`;
      embed.description = `**${data.zoneName || '미지의 영역'}**에 월드 보스가 나타났습니다!\n제한 시간: ${data.timeLimit || '30'}분`;
      if (data.level) embed.fields = [{ name: '레벨', value: `Lv.${data.level}`, inline: true }];
      break;

    case 'world_boss_defeat':
      embed.title = `⚔️ 월드 보스 처치: ${data.bossName || '???'}`;
      embed.description = `참여자 ${data.participantCount || 0}명이 힘을 합쳐 월드 보스를 처치했습니다!`;
      embed.fields = [
        { name: 'MVP', value: data.mvpName || '-', inline: true },
        { name: '총 데미지', value: (data.totalDamage || 0).toLocaleString(), inline: true },
      ];
      break;

    case 'guild_war_start':
      embed.title = `⚔️ 길드전 시작!`;
      embed.description = `**${data.guildA || '???'}** vs **${data.guildB || '???'}**\n맵: ${data.mapName || '거점'}`;
      break;

    case 'guild_war_end':
      embed.title = `🏆 길드전 종료!`;
      embed.description = `승리: **${data.winnerGuild || '???'}**\n점수: ${data.scoreA || 0} vs ${data.scoreB || 0}`;
      break;

    case 'season_reset':
      embed.title = `🔄 시즌 리셋: ${data.seasonName || '새 시즌'}`;
      embed.description = `새 시즌이 시작되었습니다! 랭킹이 초기화됩니다.`;
      if (data.rewards) embed.fields = [{ name: '시즌 보상', value: data.rewards, inline: false }];
      break;

    case 'maintenance':
      embed.title = `🔧 서버 점검 안내`;
      embed.description = data.message || '서버 점검이 예정되어 있습니다.';
      embed.fields = [
        { name: '시작', value: data.startTime || '-', inline: true },
        { name: '종료 예정', value: data.endTime || '-', inline: true },
      ];
      break;

    case 'community_event':
      embed.title = `🎉 커뮤니티 이벤트: ${data.eventName || '???'}`;
      embed.description = data.description || '새로운 이벤트가 시작됩니다!';
      break;

    case 'server_announcement':
      embed.title = `📢 공지사항`;
      embed.description = data.message || '';
      break;
  }

  return embed;
}

const SITE_NAME = '에테르나 크로니클';

// ═══════════════════════════════════════════════════════════════
//  공개 API
// ═══════════════════════════════════════════════════════════════

/** 이벤트 브로드캐스트 — 등록된 모든 웹훅에 발송 */
export function broadcastEvent(
  eventType: DiscordEventType,
  data: Record<string, any>,
): { sent: number; skipped: number } {
  const embed = buildEmbed(eventType, data);
  const payload: WebhookPayload = {
    username: BOT_USERNAME,
    avatar_url: BOT_AVATAR,
    embeds: [embed],
  };

  let sent = 0;
  let skipped = 0;

  for (const [, config] of webhookRegistry) {
    if (!config.enabled) { skipped++; continue; }
    if (!config.events.includes(eventType)) { skipped++; continue; }
    enqueue(config.url, payload);
    sent++;
  }

  console.log(`[DiscordBot] ${eventType} 브로드캐스트: ${sent} 발송, ${skipped} 스킵`);
  return { sent, skipped };
}

/** 특정 웹훅에 커스텀 메시지 발송 */
export function sendCustomMessage(webhookId: string, content: string, embed?: DiscordEmbed): boolean {
  const config = webhookRegistry.get(webhookId);
  if (!config || !config.enabled) return false;

  const payload: WebhookPayload = {
    username: BOT_USERNAME,
    avatar_url: BOT_AVATAR,
    content,
    embeds: embed ? [embed] : undefined,
  };

  enqueue(config.url, payload);
  return true;
}

/** 큐 상태 조회 */
export function getQueueStatus(): { pending: number; processing: boolean } {
  return { pending: sendQueue.length, processing: queueRunning };
}

// ─── 유틸 ───────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
