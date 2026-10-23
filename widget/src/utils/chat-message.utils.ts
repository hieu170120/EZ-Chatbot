import i18n from "../i18n";

/**
 * Parses booking commands or structured action chip payloads into human-readable visitor text.
 * E.g. `/confirm-booking :: Confirm` -> `Confirm`
 * E.g. `/update-draft-booking` -> `Save changes` (or localized version)
 */
export const visitorDisplayText = (text: string): string => {
  const commandDisplay = text.match(
    /^\/(?:select-booking-option|select-booking-slot|assign-slot-services|update-draft-booking|confirm-booking|keep-booking|abandon-booking|(?:confirm-)?cancel-booking)\s*.*?\s*::\s*(.+)$/i,
  )?.[1];
  if (commandDisplay) return commandDisplay.trim();

  const locale = text.match(/"(?:locale|language)"\s*:\s*"([^"]+)"/i)?.[1];
  const t = i18n.getFixedT(locale || "en", "booking");

  if (/^\/keep-booking\b/i.test(text)) return t("cancellation.keep");
  if (/^\/update-draft-booking\b/i.test(text)) return t("action.saveChanges");
  if (/^\/confirm-booking\b/i.test(text)) return t("action.confirmBooking");
  if (/^\/confirm-cancel-booking\b/i.test(text))
    return t("action.confirmCancellation");
  if (/^\/cancel-booking\b/i.test(text)) return t("action.cancelBooking");
  if (/^\/abandon-booking\b/i.test(text)) return t("action.cancel");

  return text.trim();
};
