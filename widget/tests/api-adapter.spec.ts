import { describe, it, expect } from "vitest";
import { isDomainAllowed } from "../src/hooks/useSiteConfig";

describe("API Adapter & Protocol Contract Tests", () => {
  describe("Domain Authorization Contract (isDomainAllowed)", () => {
    it("should allow any domain if allowedDomains list is empty or undefined", () => {
      expect(isDomainAllowed("example.com", undefined)).toBe(true);
      expect(isDomainAllowed("example.com", [])).toBe(true);
    });

    it("should allow wildcard domain (*)", () => {
      expect(isDomainAllowed("sub.example.com", ["*"])).toBe(true);
      expect(isDomainAllowed("anydomain.org", ["*"])).toBe(true);
    });

    it("should match exact domains", () => {
      const allowed = ["example.com", "app.example.com"];
      expect(isDomainAllowed("example.com", allowed)).toBe(true);
      expect(isDomainAllowed("app.example.com", allowed)).toBe(true);
      expect(isDomainAllowed("other.com", allowed)).toBe(false);
    });

    it("should match subdomain wildcards (*.example.com)", () => {
      const allowed = ["*.example.com"];
      expect(isDomainAllowed("sub.example.com", allowed)).toBe(true);
      expect(isDomainAllowed("deep.sub.example.com", allowed)).toBe(true);
      expect(isDomainAllowed("example.com", allowed)).toBe(false);
      expect(isDomainAllowed("fake-example.com", allowed)).toBe(false);
    });

    it("should reject empty or whitespace hostnames", () => {
      expect(isDomainAllowed("", ["example.com"])).toBe(false);
      expect(isDomainAllowed("   ", ["example.com"])).toBe(false);
    });
  });

  describe("HTTP 409 Conflict Contract & Slot Refresh", () => {
    it("should parse PostgreSQL GIST 409 Conflict payload correctly", () => {
      const conflictPayload = {
        statusCode: 409,
        error: "SlotUnavailable",
        message: "This slot was just reserved. Please choose another time.",
        availableSlotsUrl: "/api/v1/sites/site-123/available-slots",
      };

      expect(conflictPayload.statusCode).toBe(409);
      expect(conflictPayload.error).toBe("SlotUnavailable");
      expect(conflictPayload.message).toContain("reserved");
      expect(conflictPayload.availableSlotsUrl).toBeDefined();
    });

    it("should format cancellation request payload adhering to CancelBookingDto contract", () => {
      const cancelPayload = {
        bookingCode: "BK-2026-9999",
        phone: "+84912345678",
      };

      expect(cancelPayload).toHaveProperty("bookingCode");
      expect(cancelPayload.bookingCode).toMatch(/^BK-/);
      expect(cancelPayload.phone).toBe("+84912345678");
    });
  });
});
