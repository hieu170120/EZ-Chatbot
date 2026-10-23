import { describe, it, expect } from "vitest";
import {
  isValidVietnamesePhoneNumber,
  validateAndFormatPhoneNumber,
} from "../src/utils/phone-validator.utils";

describe("Phone Number Validation & Formatting", () => {
  describe("isValidVietnamesePhoneNumber", () => {
    it("should accept valid 10-digit mobile numbers with leading 0", () => {
      expect(isValidVietnamesePhoneNumber("0912345678")).toBe(true);
      expect(isValidVietnamesePhoneNumber("0387654321")).toBe(true);
      expect(isValidVietnamesePhoneNumber("0701234567")).toBe(true);
      expect(isValidVietnamesePhoneNumber("0812345678")).toBe(true);
      expect(isValidVietnamesePhoneNumber("0587654321")).toBe(true);
    });

    it("should accept valid international format (+84)", () => {
      expect(isValidVietnamesePhoneNumber("+84912345678")).toBe(true);
      expect(isValidVietnamesePhoneNumber("+84 38 765 4321")).toBe(true);
      expect(isValidVietnamesePhoneNumber("+84701234567")).toBe(true);
      expect(isValidVietnamesePhoneNumber("+84812345678")).toBe(true);
    });

    it("should accept valid 9-digit input without leading zero", () => {
      expect(isValidVietnamesePhoneNumber("912345678")).toBe(true);
      expect(isValidVietnamesePhoneNumber("387654321")).toBe(true);
      expect(isValidVietnamesePhoneNumber("701234567")).toBe(true);
    });

    it("should accept valid 11-digit landline numbers (02x)", () => {
      expect(isValidVietnamesePhoneNumber("02438123456")).toBe(true);
      expect(isValidVietnamesePhoneNumber("02838123456")).toBe(true);
      expect(isValidVietnamesePhoneNumber("+842438123456")).toBe(true);
    });

    it("should reject short numbers (such as legacy 7-digit fixed lines)", () => {
      expect(isValidVietnamesePhoneNumber("7123456")).toBe(false);
      expect(isValidVietnamesePhoneNumber("7012345")).toBe(false);
      expect(isValidVietnamesePhoneNumber("5123456")).toBe(false);
      expect(isValidVietnamesePhoneNumber("+847123456")).toBe(false);
      expect(isValidVietnamesePhoneNumber("07123456")).toBe(false);
      expect(isValidVietnamesePhoneNumber("0912345")).toBe(false);
    });

    it("should reject invalid prefixes or numbers with wrong length", () => {
      expect(isValidVietnamesePhoneNumber("0112345678")).toBe(false);
      expect(isValidVietnamesePhoneNumber("091234567890")).toBe(false);
      expect(isValidVietnamesePhoneNumber("")).toBe(false);
      expect(isValidVietnamesePhoneNumber("abc")).toBe(false);
    });
  });

  describe("validateAndFormatPhoneNumber", () => {
    it("should validate and format Vietnamese mobile numbers to standard 10-digit national format", () => {
      const res1 = validateAndFormatPhoneNumber("0912345678", "VN");
      expect(res1.isValid).toBe(true);
      expect(res1.formattedNumber).toBe("0912345678");

      const res2 = validateAndFormatPhoneNumber("+84 912 345 678", "VN");
      expect(res2.isValid).toBe(true);
      expect(res2.formattedNumber).toBe("0912345678");

      const res3 = validateAndFormatPhoneNumber("912 345 678", "VN");
      expect(res3.isValid).toBe(true);
      expect(res3.formattedNumber).toBe("0912345678");
    });

    it("should reject 7-digit inputs for Vietnam even if libphonenumber metadata has legacy match", () => {
      const res1 = validateAndFormatPhoneNumber("7123456", "VN");
      expect(res1.isValid).toBe(false);

      const res2 = validateAndFormatPhoneNumber("7012345", "VN");
      expect(res2.isValid).toBe(false);

      const res3 = validateAndFormatPhoneNumber("+847123456", "VN");
      expect(res3.isValid).toBe(false);

      const res4 = validateAndFormatPhoneNumber("5123456", "VN");
      expect(res4.isValid).toBe(false);
    });

    it("should validate foreign numbers correctly", () => {
      const usRes = validateAndFormatPhoneNumber("2025550125", "US");
      expect(usRes.isValid).toBe(true);
      expect(usRes.formattedNumber).toContain("+1");

      const jpRes = validateAndFormatPhoneNumber("09012345678", "JP");
      expect(jpRes.isValid).toBe(true);
      expect(jpRes.formattedNumber).toContain("+81");

      const invalidUs = validateAndFormatPhoneNumber("12345", "US");
      expect(invalidUs.isValid).toBe(false);
    });
  });
});
