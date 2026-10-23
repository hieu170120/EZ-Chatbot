/**
 * Centralized Booking Time Utilities
 * Handles dynamic slot duration calculations (e.g. 15m, 30m, 45m, 60m),
 * range formatting, sequential slot time generation, and schedule breakdowns.
 */

export const DEFAULT_SLOT_DURATION = 30;

/**
 * Returns a valid, positive slot duration in minutes, defaulting to DEFAULT_SLOT_DURATION (30).
 */
export function getEffectiveSlotDuration(slotDuration?: number | null): number {
  if (
    typeof slotDuration === "number" &&
    !isNaN(slotDuration) &&
    slotDuration > 0
  ) {
    return Math.floor(slotDuration);
  }
  return DEFAULT_SLOT_DURATION;
}

/**
 * Adds a given number of minutes to a "HH:mm" time string, returning a formatted "HH:mm" string.
 */
export function addMinutesToTime(
  timeStr: string,
  minutesToAdd: number,
): string {
  if (!timeStr || typeof timeStr !== "string") return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = Number(hStr) || 0;
  const m = Number(mStr) || 0;
  const totalMins = Math.max(0, h * 60 + m + minutesToAdd);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

/**
 * Calculates the end time for a single slot starting at `timeSlot` with duration `slotDuration`.
 */
export function calculateSlotEndTime(
  timeSlot: string,
  slotDuration?: number | null,
): string {
  const duration = getEffectiveSlotDuration(slotDuration);
  return addMinutesToTime(timeSlot, duration);
}

/**
 * Calculates the end time for a sequence of `slotCount` consecutive slots starting at `startTimeSlot`.
 */
export function calculateMultiSlotEndTime(
  startTimeSlot: string,
  slotCount: number,
  slotDuration?: number | null,
): string {
  const duration = getEffectiveSlotDuration(slotDuration);
  const count = Math.max(1, slotCount || 1);
  return addMinutesToTime(startTimeSlot, count * duration);
}

export type BasicSlotItem = {
  timeSlot?: string;
  date?: string;
};

/**
 * Formats a list of slots into formatted time ranges (e.g. "09:00 - 10:00" or "09:00 - 09:30, 14:00 - 14:30").
 * Contiguous slots on the same date are automatically merged.
 */
export function formatSlotRanges(
  slots?: BasicSlotItem[] | null,
  slotDuration?: number | null,
): string {
  if (!slots || slots.length === 0) return "";
  const duration = getEffectiveSlotDuration(slotDuration);

  const sortedSlots = [...slots]
    .filter((s): s is BasicSlotItem & { timeSlot: string } =>
      Boolean(s && s.timeSlot),
    )
    .sort((a, b) => {
      const dc = (a.date || "").localeCompare(b.date || "");
      if (dc !== 0) return dc;
      return (a.timeSlot || "").localeCompare(b.timeSlot || "");
    });

  if (sortedSlots.length === 0) return "";

  const ranges: string[] = [];
  let curStart = "";
  let curEnd = "";
  let curDate = "";

  sortedSlots.forEach((s) => {
    const start = s.timeSlot;
    const date = s.date || "";
    const end = calculateSlotEndTime(start, duration);

    if (!curStart) {
      curStart = start;
      curEnd = end;
      curDate = date;
    } else if (curDate === date && curEnd === start) {
      curEnd = end;
    } else {
      ranges.push(`${curStart} - ${curEnd}`);
      curStart = start;
      curEnd = end;
      curDate = date;
    }
  });

  if (curStart && curEnd) {
    ranges.push(`${curStart} - ${curEnd}`);
  }

  return ranges.join(", ");
}

/**
 * Generates an array of sequential slot start time strings starting at `baseTime`.
 * e.g. ("09:00", 3, 15) -> ["09:00", "09:15", "09:30"]
 */
export function buildSequentialSlotTimes(
  baseTime: string,
  count: number,
  slotDuration?: number | null,
): string[] {
  const duration = getEffectiveSlotDuration(slotDuration);
  const total = Math.max(1, count || 1);
  const result: string[] = [];
  for (let i = 0; i < total; i++) {
    result.push(addMinutesToTime(baseTime, i * duration));
  }
  return result;
}
