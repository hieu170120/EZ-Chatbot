import { describe, it, expect } from "vitest";
import {
  DEFAULT_SLOT_DURATION,
  getEffectiveSlotDuration,
  addMinutesToTime,
  calculateSlotEndTime,
  calculateMultiSlotEndTime,
  buildSequentialSlotTimes,
  formatSlotRanges,
} from "../src/utils/booking-time.utils";

describe("booking-time.utils Unit Tests", () => {
  describe("getEffectiveSlotDuration", () => {
    it("should return default 30 when slotDuration is undefined, null, or invalid", () => {
      expect(getEffectiveSlotDuration()).toBe(DEFAULT_SLOT_DURATION);
      expect(getEffectiveSlotDuration(null)).toBe(DEFAULT_SLOT_DURATION);
      expect(getEffectiveSlotDuration(0)).toBe(DEFAULT_SLOT_DURATION);
      expect(getEffectiveSlotDuration(-15)).toBe(DEFAULT_SLOT_DURATION);
      expect(getEffectiveSlotDuration(NaN)).toBe(DEFAULT_SLOT_DURATION);
    });

    it("should return configured positive slot duration", () => {
      expect(getEffectiveSlotDuration(15)).toBe(15);
      expect(getEffectiveSlotDuration(45)).toBe(45);
      expect(getEffectiveSlotDuration(60)).toBe(60);
      expect(getEffectiveSlotDuration(90)).toBe(90);
    });
  });

  describe("addMinutesToTime", () => {
    it("should add minutes correctly within the same hour", () => {
      expect(addMinutesToTime("09:00", 15)).toBe("09:15");
      expect(addMinutesToTime("09:15", 30)).toBe("09:45");
    });

    it("should roll over to next hour correctly", () => {
      expect(addMinutesToTime("09:45", 15)).toBe("10:00");
      expect(addMinutesToTime("09:45", 30)).toBe("10:15");
      expect(addMinutesToTime("09:45", 45)).toBe("10:30");
      expect(addMinutesToTime("09:30", 90)).toBe("11:00");
    });

    it("should handle midnight cross-over", () => {
      expect(addMinutesToTime("23:30", 45)).toBe("00:15");
    });

    it("should return empty string for empty input", () => {
      expect(addMinutesToTime("", 15)).toBe("");
    });
  });

  describe("calculateSlotEndTime with custom durations", () => {
    it("should calculate end time for 15-minute duration", () => {
      expect(calculateSlotEndTime("09:00", 15)).toBe("09:15");
      expect(calculateSlotEndTime("09:45", 15)).toBe("10:00");
    });

    it("should calculate end time for 30-minute duration (default)", () => {
      expect(calculateSlotEndTime("09:00")).toBe("09:30");
      expect(calculateSlotEndTime("09:30", 30)).toBe("10:00");
    });

    it("should calculate end time for 45-minute duration", () => {
      expect(calculateSlotEndTime("09:00", 45)).toBe("09:45");
      expect(calculateSlotEndTime("10:30", 45)).toBe("11:15");
    });

    it("should calculate end time for 60-minute duration", () => {
      expect(calculateSlotEndTime("09:00", 60)).toBe("10:00");
      expect(calculateSlotEndTime("14:30", 60)).toBe("15:30");
    });
  });

  describe("calculateMultiSlotEndTime", () => {
    it("should calculate multi-slot end time for 15-minute slots", () => {
      // 3 slots x 15m = 45m -> 09:00 to 09:45
      expect(calculateMultiSlotEndTime("09:00", 3, 15)).toBe("09:45");
    });

    it("should calculate multi-slot end time for 45-minute slots", () => {
      // 2 slots x 45m = 90m -> 09:00 to 10:30
      expect(calculateMultiSlotEndTime("09:00", 2, 45)).toBe("10:30");
    });

    it("should calculate multi-slot end time for 60-minute slots", () => {
      // 3 slots x 60m = 180m -> 10:00 to 13:00
      expect(calculateMultiSlotEndTime("10:00", 3, 60)).toBe("13:00");
    });

    it("should handle count <= 1 gracefully", () => {
      expect(calculateMultiSlotEndTime("09:00", 1, 30)).toBe("09:30");
      expect(calculateMultiSlotEndTime("09:00", 0, 30)).toBe("09:30");
    });
  });

  describe("buildSequentialSlotTimes", () => {
    it("should generate sequential slots for 15-minute duration", () => {
      expect(buildSequentialSlotTimes("09:00", 3, 15)).toEqual([
        "09:00",
        "09:15",
        "09:30",
      ]);
    });

    it("should generate sequential slots for 45-minute duration", () => {
      expect(buildSequentialSlotTimes("09:00", 2, 45)).toEqual([
        "09:00",
        "09:45",
      ]);
    });

    it("should generate sequential slots for 60-minute duration", () => {
      expect(buildSequentialSlotTimes("09:00", 3, 60)).toEqual([
        "09:00",
        "10:00",
        "11:00",
      ]);
    });
  });

  describe("formatSlotRanges", () => {
    it("should format single slot with 15-minute duration", () => {
      expect(formatSlotRanges([{ timeSlot: "09:00" }], 15)).toBe(
        "09:00 - 09:15",
      );
    });

    it("should merge contiguous slots with 15-minute duration", () => {
      const slots = [
        { timeSlot: "09:00" },
        { timeSlot: "09:15" },
        { timeSlot: "09:30" },
      ];
      expect(formatSlotRanges(slots, 15)).toBe("09:00 - 09:45");
    });

    it("should merge contiguous slots with 45-minute duration", () => {
      const slots = [{ timeSlot: "09:00" }, { timeSlot: "09:45" }];
      expect(formatSlotRanges(slots, 45)).toBe("09:00 - 10:30");
    });

    it("should merge contiguous slots with 60-minute duration", () => {
      const slots = [
        { timeSlot: "09:00" },
        { timeSlot: "10:00" },
        { timeSlot: "11:00" },
      ];
      expect(formatSlotRanges(slots, 60)).toBe("09:00 - 12:00");
    });

    it("should format separate non-contiguous ranges with 15-minute duration", () => {
      const slots = [
        { timeSlot: "09:00" },
        { timeSlot: "09:15" },
        { timeSlot: "11:00" },
        { timeSlot: "11:15" },
      ];
      expect(formatSlotRanges(slots, 15)).toBe("09:00 - 09:30, 11:00 - 11:30");
    });

    it("should sort unsorted slots before merging", () => {
      const slots = [{ timeSlot: "09:30" }, { timeSlot: "09:00" }];
      expect(formatSlotRanges(slots, 30)).toBe("09:00 - 10:00");
    });

    it("should handle multi-date slots separately", () => {
      const slots = [
        { date: "2026-08-28", timeSlot: "09:00" },
        { date: "2026-08-28", timeSlot: "09:30" },
        { date: "2026-08-29", timeSlot: "09:00" },
      ];
      expect(formatSlotRanges(slots, 30)).toBe("09:00 - 10:00, 09:00 - 09:30");
    });

    it("should return empty string for null or empty slots", () => {
      expect(formatSlotRanges([])).toBe("");
      expect(formatSlotRanges(null)).toBe("");
    });
  });
});
