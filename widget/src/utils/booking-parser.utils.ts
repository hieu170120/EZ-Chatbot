import type { BookingSummaryPayload } from "../store";

export const cleanBookingValue = (value: string): string =>
  value.replace(/[.!?]+$/g, "").trim();

/**
 * Parses conversational edit intents (e.g. "change my name to John Doe")
 * to patch the active or draft booking summary.
 */
export const bookingSummaryPatchFromText = (
  text: string,
): Partial<BookingSummaryPayload> | null => {
  const patterns: Array<[keyof BookingSummaryPayload, RegExp]> = [
    [
      "customerName",
      /(?:change|update|set).*(?:name|tên).*?(?:to|thành|là)\s+(.+)/i,
    ],
    [
      "phone",
      /(?:change|update|set).*(?:phone|số điện thoại).*?(?:to|thành|là)\s+([\d\s+().-]+)/i,
    ],
    [
      "customerEmail",
      /(?:change|update|set).*(?:email).*?(?:to|thành|là)\s+([^\s]+@[^\s]+)/i,
    ],
  ];

  for (const [key, pattern] of patterns) {
    const value = text.match(pattern)?.[1];
    if (value) {
      return {
        [key]: cleanBookingValue(value),
      } as Partial<BookingSummaryPayload>;
    }
  }

  return null;
};
