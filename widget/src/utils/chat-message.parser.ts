/**
 * Chat Message Parser Utilities
 * Handles parsing custom tags, chips, phone questions, and metadata from chat messages.
 */
import type { ChatMessageComponent } from "../store";

export const formatMessageTime = (iso?: string): string =>
  iso
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const visibleMessageText = (text: string): string =>
  text
    .replace(
      /<booking-(?:code|cancelled|step)>.*?<\/booking-(?:code|cancelled|step)>/g,
      "",
    )
    .replace(/<booking-input>.*?<\/booking-input>/g, "");

export const chipOptions = (text: string): string[] =>
  (text.match(/<chips>(.*?)<\/chips>/)?.[1] ?? "")
    .split("|")
    .map((option) => option.trim())
    .filter(Boolean);

export const isTimeChipMessage = (text: string): boolean => {
  const options = chipOptions(text);
  return (
    options.length > 0 &&
    options.every((option) => /^\d{1,2}:\d{2}$/.test(option))
  );
};

export const isPhoneQuestion = (text: string): boolean => {
  if (!text || typeof text !== "string") return false;
  return /<booking-input>phone<\/booking-input>/i.test(text);
};

export const isTextInputChipMessage = (text: string): boolean =>
  isPhoneQuestion(text);

export const isDateQuestion = (
  messageOrText:
    string | { text?: string; components?: ChatMessageComponent[] },
): boolean => {
  if (!messageOrText) return false;
  const text =
    typeof messageOrText === "string"
      ? messageOrText
      : (messageOrText.text ?? "");
  if (
    /<booking-step>\s*(?:date|choose_date|schedule)\s*<\/booking-step>/i.test(
      text,
    )
  ) {
    return true;
  }
  if (typeof messageOrText === "object" && messageOrText.components) {
    return messageOrText.components.some(
      (c) =>
        c.type === "chips" &&
        c.items?.some(
          (item) =>
            item.action === "select_date" || item.action === "choose_date",
        ),
    );
  }
  return false;
};

export const isAssignSlotServicesMessage = (text: string): boolean =>
  /<booking-step>\s*(?:assign_slot_services|assign_remaining_service)\s*<\/booking-step>/i.test(
    text,
  );

export const senderKey = (message: {
  role: string;
  senderName?: string | null;
}): string => `${message.role}:${message.senderName ?? ""}`;

export const extractSlotSelectionData = (
  messages: Array<{ text?: string }>,
) => {
  let selectedSlots: Array<{
    date?: string;
    timeSlot: string;
    resourceId?: string;
    resourceName?: string;
  }> = [];
  let selectedServiceIds: string[] = [];

  for (let i = messages.length - 1; i >= 0; i--) {
    const raw = messages[i]?.text || "";
    if (selectedSlots.length === 0 && /^\/select-booking-slot\s+/i.test(raw)) {
      try {
        const jsonStr = raw.match(/^\/select-booking-slot\s+(.+?)\s+::/i)?.[1];
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed.slots)) {
            selectedSlots = parsed.slots;
          } else if (parsed.timeSlot) {
            selectedSlots = [
              {
                date: parsed.date,
                timeSlot: parsed.timeSlot,
                resourceId: parsed.resourceId,
                resourceName: parsed.resourceName,
              },
            ];
          }
        }
      } catch (_err) {
        void _err;
      }
    }
    if (
      selectedServiceIds.length === 0 &&
      /^\/select-booking-option\s+/i.test(raw)
    ) {
      try {
        const jsonStr = raw.match(
          /^\/select-booking-option\s+(.+?)\s+::/i,
        )?.[1];
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr);
          if (parsed.action === "select_service" && parsed.value) {
            selectedServiceIds = parsed.value
              .split(",")
              .map((s: string) => s.trim())
              .filter(Boolean);
          }
        }
      } catch (_err) {
        void _err;
      }
    }
  }

  return { selectedSlots, selectedServiceIds };
};
