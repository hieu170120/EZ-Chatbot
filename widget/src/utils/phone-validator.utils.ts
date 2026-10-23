import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Checks if a string is a valid modern Vietnamese phone number:
 * - Mobile: 10 digits in national format (starting with 03, 05, 07, 08, 09), exactly 9 digits without leading 0.
 * - Landline (Fixed-line): 11 digits in national format (starting with 02), exactly 10 digits without leading 0.
 */
export const isValidVietnamesePhoneNumber = (rawPhone: string): boolean => {
  if (!rawPhone) return false;
  const clean = rawPhone.replace(/\D/g, "");
  if (!clean) return false;

  // Extract national digits without country code 84 or leading 0
  let nationalDigits = clean;
  if (clean.startsWith("84") && clean.length > 2) {
    nationalDigits = clean.slice(2);
  } else if (clean.startsWith("0") && clean.length > 1) {
    nationalDigits = clean.slice(1);
  }

  // Mobile: 9 digits starting with 3, 5, 7, 8, 9
  // Landline: 10 digits starting with 2
  return /^(?:[35789]\d{8}|2\d{9})$/.test(nationalDigits);
};

export interface PhoneValidationResult {
  isValid: boolean;
  formattedNumber: string;
}

/**
 * Validates and formats a phone number according to country rules.
 * For Vietnam (VN / +84), enforces modern 10-digit mobile (or 11-digit landline) rules
 * to prevent false positives from legacy metadata in libphonenumber-js.
 */
export const validateAndFormatPhoneNumber = (
  rawPhone: string,
  country: CountryCode = "VN",
): PhoneValidationResult => {
  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { isValid: false, formattedNumber: "" };
  }

  try {
    const parsed = parsePhoneNumberFromString(trimmed, country);
    if (!parsed || !parsed.isValid()) {
      return { isValid: false, formattedNumber: "" };
    }

    if (country === "VN") {
      if (!isValidVietnamesePhoneNumber(trimmed)) {
        return { isValid: false, formattedNumber: "" };
      }
      const national = parsed.formatNational().replace(/\s+/g, "");
      const formatted = national.startsWith("0") ? national : `0${national}`;
      return { isValid: true, formattedNumber: formatted };
    }

    return {
      isValid: true,
      formattedNumber: parsed.formatInternational(),
    };
  } catch {
    return { isValid: false, formattedNumber: "" };
  }
};
