/**
 * Discord/Slack 웹훅 범용 발송기 (P6-18)
 * 운영 알림을 Discord embed / Slack Block Kit 포맷으로 발송
 */

// ─── 타입 정의 ──────────────────────────────────────────────────
export interface WebhookPayload {
  title: string;
  description: string;
  color: 'critical' | 'warning' | 'info' | 'success';
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: Array<{ name: string; value: string; inline: boolean }>;
  timestamp: string;
  footer: { text: string };
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  fields?: Array<{ type: string; text: string }>;
}

// 색상 매핑 (Discord embed hex)
const COLOR_MAP: Record<string, number> = {
  critical: 0xff0000,   // 빨강
  warning: 0xffa500,    // 주황
  info: 0x3498db,       // 파랑
  success: 0x2ecc71,    // 초록
};

// 색상 이모지 매핑 (Slack)
const EMOJI_MAP: Record<string, string> = {
  critical: '🔴',
  warning: '🟠',
  info: '🔵',
  success: '🟢',
};

// ─── Discord 웹훅 발송 ─────────────────────────────────────────
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<boolean> {
  if (!webhookUrl) return false;

  const embed: DiscordEmbed = {
    title: payload.title,
    description: payload.description,
    color: COLOR_MAP[payload.color] ?? COLOR_MAP.info,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    footer: { text: 'Etherna Ops Alert' },
  };

  if (payload.fields) {
    embed.fields = payload.fields.map((f) => ({
      name: f.name,
      value: f.value,
      inline: f.inline ?? true,
    }));
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
  } catch (err) {
    console.error('[WebhookSender] Discord 발송 실패:', err);
    return false;
  }
}

// ─── Slack 웹훅 발송 ────────────────────────────────────────────
export async function sendSlackWebhook(
  webhookUrl: string,
  payload: WebhookPayload
): Promise<boolean> {
  if (!webhookUrl) return false;

  const emoji = EMOJI_MAP[payload.color] ?? EMOJI_MAP.info;
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ${payload.title}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: payload.description },
    },
  ];

  if (payload.fields && payload.fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: payload.fields.map((f) => ({
        type: 'mrkdwn',
        text: `*${f.name}*\n${f.value}`,
      })),
    });
  }

  blocks.push({
    type: 'context',
    fields: [
      {
        type: 'mrkdwn',
        text: `Etherna Ops | ${payload.timestamp ?? new Date().toISOString()}`,
      },
    ],
  });

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });
    return res.ok;
  } catch (err) {
    console.error('[WebhookSender] Slack 발송 실패:', err);
    return false;
  }
}

// ─── 통합 발송 (Discord + Slack 동시) ──────────────────────────
export async function sendOpsAlert(
  payload: WebhookPayload,
  channels: { discord?: boolean; slack?: boolean }
): Promise<{ discord: boolean; slack: boolean }> {
  const discordUrl = process.env.DISCORD_OPS_WEBHOOK_URL ?? '';
  const slackUrl = process.env.SLACK_OPS_WEBHOOK_URL ?? '';

  const results = await Promise.all([
    channels.discord ? sendDiscordWebhook(discordUrl, payload) : Promise.resolve(false),
    channels.slack ? sendSlackWebhook(slackUrl, payload) : Promise.resolve(false),
  ]);

  return { discord: results[0], slack: results[1] };
}
