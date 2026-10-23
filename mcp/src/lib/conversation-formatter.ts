const MAX_CONVERSATION_RESULT_CHARS = 7_000;
const MAX_SUMMARY_CHARS = 1_500;
const MAX_MESSAGES = 10;
const MAX_ROLE_CHARS = 32;
const MAX_TIMESTAMP_CHARS = 64;
const MAX_MESSAGE_CHARS = 500;
const MAX_DISPLAY_NAME_CHARS = 200;
const MAX_STATUS_CHARS = 50;
const MAX_HANDOFF_STATE_CHARS = 100;

export type ConversationRecord = {
  visitorDisplayName?: unknown;
  status?: unknown;
  handoffState?: unknown;
  summary?: unknown;
  Summary?: unknown;
  messages?: Array<{ role?: unknown; timestamp?: unknown; content?: unknown }>;
};

const boundedText = (value: unknown, maxLength: number) =>
  String(value ?? '').slice(0, maxLength);

const formatTimestamp = (value: unknown) => {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    !(value instanceof Date)
  ) {
    return '';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? boundedText(value, MAX_TIMESTAMP_CHARS)
    : date.toISOString();
};

export const buildConversationResult = (record: ConversationRecord) => {
  let summary = boundedText(
    record.summary ?? record.Summary,
    MAX_SUMMARY_CHARS,
  );
  let messages = (Array.isArray(record.messages) ? record.messages : [])
    .slice(-MAX_MESSAGES)
    .map(({ role, timestamp, content }) => ({
      role: boundedText(role, MAX_ROLE_CHARS),
      timestamp: formatTimestamp(timestamp),
      content: boundedText(content, MAX_MESSAGE_CHARS),
    }));

  const payload = () => ({
    visitorDisplayName: boundedText(
      record.visitorDisplayName,
      MAX_DISPLAY_NAME_CHARS,
    ),
    status: boundedText(record.status, MAX_STATUS_CHARS),
    handoffState: boundedText(record.handoffState, MAX_HANDOFF_STATE_CHARS),
    summary,
    messages,
  });

  let text = JSON.stringify(payload());
  while (text.length > MAX_CONVERSATION_RESULT_CHARS) {
    const lengths = [
      summary.length,
      ...messages.map((message) => message.content.length),
    ];
    const longestIndex = lengths.indexOf(Math.max(...lengths));
    const removeCount = text.length - MAX_CONVERSATION_RESULT_CHARS;

    if (longestIndex === 0) {
      summary = summary.slice(0, Math.max(0, summary.length - removeCount));
    } else {
      messages = messages.map((message, index) =>
        index === longestIndex - 1
          ? {
              ...message,
              content: message.content.slice(
                0,
                Math.max(0, message.content.length - removeCount),
              ),
            }
          : message,
      );
    }

    text = JSON.stringify(payload());
  }

  return {
    content: [{ type: 'text' as const, text }],
  };
};
