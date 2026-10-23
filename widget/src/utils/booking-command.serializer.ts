/**
 * Booking Command Serializer
 * Provides standard serializers for bot command messages sent over the socket.
 */

import { calculateSlotEndTime } from "./booking-time.utils";

export interface SelectedSlotItem {
  date?: string;
  timeSlot?: string;
  resourceId?: string;
  resourceName?: string;
  serviceId?: string;
  serviceName?: string;
}

export function serializeSelectMultipleSlotsCommand({
  selectedSlots,
  fallbackResourceId,
  fallbackResourceName,
  slotDuration,
  isVi,
}: {
  selectedSlots: SelectedSlotItem[];
  fallbackResourceId?: string;
  fallbackResourceName?: string;
  slotDuration?: number | null;
  isVi: boolean;
}): string {
  if (!selectedSlots || selectedSlots.length === 0) return "";

  const sortedSlots = [...selectedSlots].sort((a, b) => {
    const dc = (a.date || "").localeCompare(b.date || "");
    if (dc !== 0) return dc;
    return (a.timeSlot || "").localeCompare(b.timeSlot || "");
  });

  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const calculatedLastEnd = lastSlot.timeSlot
    ? calculateSlotEndTime(lastSlot.timeSlot, slotDuration)
    : "";

  const resourceNames = Array.from(
    new Set(
      sortedSlots
        .map((s) => s.resourceName || fallbackResourceName)
        .filter(Boolean),
    ),
  );
  const resourceNamesText = resourceNames.join(", ");

  let text =
    sortedSlots.length === 1
      ? isVi
        ? `Tôi chọn ${firstSlot.timeSlot}`
        : `I choose ${firstSlot.timeSlot}`
      : isVi
        ? `Tôi chọn ${firstSlot.timeSlot} - ${calculatedLastEnd} (${sortedSlots.length} khung giờ)`
        : `I choose ${firstSlot.timeSlot} - ${calculatedLastEnd} (${sortedSlots.length} slots)`;

  if (resourceNamesText) {
    text += isVi ? ` với ${resourceNamesText}` : ` with ${resourceNamesText}`;
  }

  const payload = {
    date: firstSlot.date,
    timeSlot: firstSlot.timeSlot,
    endTimeSlot: calculatedLastEnd,
    slotCount: sortedSlots.length,
    slots: sortedSlots.map((s) => ({
      resourceId: s.resourceId || fallbackResourceId,
      resourceName: s.resourceName || fallbackResourceName,
      date: s.date,
      timeSlot: s.timeSlot,
    })),
    resourceId: firstSlot.resourceId || fallbackResourceId,
    resourceName: firstSlot.resourceName || fallbackResourceName,
    partySize: sortedSlots.length,
    locale: isVi ? "vi" : "en",
  };

  return `/select-booking-slot ${JSON.stringify(payload)} :: ${text}`;
}

export function serializeOptionChipCommand(
  action: string,
  value: string,
  label: string,
  locale = "en",
): string {
  const payload = JSON.stringify({ action, value, label, locale });
  return `/select-booking-option ${payload} :: ${label}`;
}

export function serializeTextChipCommand(
  action: string,
  value: string,
  label: string,
  locale = "en",
): string {
  const payload = JSON.stringify({ action, value, label, locale });
  return `/submit-booking-text ${payload} :: ${label}`;
}
