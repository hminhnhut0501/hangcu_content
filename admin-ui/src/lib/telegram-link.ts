export type TelegramLinkKind = 'channel' | 'group' | 'topic' | 'message' | 'private-message' | 'username' | 'invite' | 'unknown';

export type TelegramLinkParse = {
  raw: string;
  normalized: string;
  kind: TelegramLinkKind;
  ok: boolean;
  label: string;
  detail: string;
  chatSlug?: string;
  messageId?: string;
  topicId?: string;
  issues: string[];
  suggestions: string[];
};

export type TelegramLinkIntent = 'source' | 'target' | 'topic-seed' | 'unknown';

const TG_LINK_RE = /^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/(.+)$/i;

const make = (value: Partial<TelegramLinkParse> & Pick<TelegramLinkParse, 'raw' | 'normalized' | 'kind' | 'ok' | 'label' | 'detail'>): TelegramLinkParse => ({
  issues: [],
  suggestions: [],
  ...value,
});

export function parseTelegramLink(input: string): TelegramLinkParse {
  const raw = input.trim();
  const normalized = raw.replace(/\s+/g, '');

  if (!normalized) {
    return make({
      raw,
      normalized,
      kind: 'unknown',
      ok: false,
      label: 'Chưa có link',
      detail: 'Dán link Telegram để parser tự nhận diện.',
    });
  }

  if (normalized.startsWith('@')) {
    const slug = normalized.slice(1);
    return make({
      raw,
      normalized,
      kind: 'username',
      ok: true,
      label: `@${slug}`,
      detail: 'Username Telegram. Có thể là channel hoặc supergroup.',
      chatSlug: slug,
      suggestions: ['Dán link đầy đủ để nhận diện rõ hơn.'],
    });
  }

  if (normalized.startsWith('tg://')) {
    return make({
      raw,
      normalized,
      kind: 'invite',
      ok: false,
      label: 'TG scheme',
      detail: 'tg:// cần mở trong app, không phù hợp để map campaign.',
      issues: ['Không nên dùng tg:// cho nguồn/đích campaign.'],
      suggestions: ['Đổi sang https://t.me/...'],
    });
  }

  const match = normalized.match(TG_LINK_RE);
  if (!match) {
    return make({
      raw,
      normalized,
      kind: 'unknown',
      ok: false,
      label: 'Không phải link Telegram',
      detail: 'Chỉ hỗ trợ t.me / telegram.me / @username.',
      issues: ['Link không đúng host Telegram.'],
      suggestions: ['Dán link từ t.me hoặc @username.'],
    });
  }

  const path = match[1].replace(/^\/+/, '').replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  const slug = parts[0] || '';

  if (!slug) {
    return make({
      raw,
      normalized,
      kind: 'unknown',
      ok: false,
      label: 'Link rỗng',
      detail: 'Không thấy username / chat id.',
      issues: ['Thiếu thành phần nhận diện.'],
      suggestions: ['Ví dụ: https://t.me/your_channel/123'],
    });
  }

  if (slug === 'c') {
    const chatId = parts[1];
    const messageId = parts[2];
    if (!chatId && !messageId) {
      return make({
        raw,
        normalized,
        kind: 'unknown',
        ok: false,
        label: 'Private link',
        detail: 'Link private /c/ cần chat id và message id.',
        issues: ['Link private thiếu chat id và message id.'],
        suggestions: ['Ví dụ: https://t.me/c/123456789/42'],
      });
    }
    if (!messageId) {
      return make({
        raw,
        normalized,
        kind: 'unknown',
        ok: false,
        label: 'Private link',
        detail: 'Private link thiếu message id.',
        issues: ['Thiếu message id để map đúng bài viết.'],
        suggestions: ['Ví dụ: https://t.me/c/123456789/42'],
      });
    }
    return make({
      raw,
      normalized,
      kind: 'private-message',
      ok: true,
      label: 'Private message',
      detail: `Private bài viết #${messageId}.`,
      chatSlug: chatId,
      messageId,
    });
  }

  if (parts.length >= 3 && /^\d+$/.test(parts[1])) {
    return make({
      raw,
      normalized,
      kind: 'topic',
      ok: true,
      label: 'Topic / thread',
      detail: `Topic #${parts[1]} với message #${parts[2]}.`,
      chatSlug: slug,
      topicId: parts[1],
      messageId: parts[2],
      suggestions: ['Nếu đây là group thường, hãy kiểm tra lại path có phải topic không.'],
    });
  }

  if (parts.length >= 2 && /^\d+$/.test(parts[1])) {
    return make({
      raw,
      normalized,
      kind: 'message',
      ok: true,
      label: 'Message',
      detail: `Message #${parts[1]} thuộc ${slug}.`,
      chatSlug: slug,
      messageId: parts[1],
      suggestions: ['Dùng link này cho source start/end hoặc target message.'],
    });
  }

  return make({
    raw,
    normalized,
    kind: 'channel',
    ok: true,
    label: 'Channel / group',
    detail: `Root link của ${slug}.`,
    chatSlug: slug,
    suggestions: ['Nếu cần đúng bài viết, dán link có message id.'],
  });
}

export function detectTelegramIntent(parse: TelegramLinkParse): TelegramLinkIntent {
  if (!parse.ok) return 'unknown';
  if (parse.kind === 'topic') return 'topic-seed';
  if (parse.kind === 'message' || parse.kind === 'private-message') return 'source';
  if (parse.kind === 'channel' || parse.kind === 'group' || parse.kind === 'username') return 'target';
  return 'unknown';
}

export function suggestTelegramTitle(parse: TelegramLinkParse, prefix = 'Campaign'): string {
  if (!parse.ok || !parse.chatSlug) return '';
  const suffix = parse.topicId ? `${parse.chatSlug}-${parse.topicId}` : parse.chatSlug;
  return `${prefix} ${suffix}`;
}
