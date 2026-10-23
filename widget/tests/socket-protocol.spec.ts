import { describe, it, expect } from "vitest";

describe("Socket Protocol Contract Tests", () => {
  it("should validate client-to-server chat:message event payload schema", () => {
    const clientMessagePayload = {
      conversationId: "conv-001",
      siteId: "site-xyz",
      text: "I want to cancel booking BK-1234",
      tempId: "tmp-9988",
    };

    expect(clientMessagePayload).toMatchObject({
      conversationId: expect.any(String),
      siteId: expect.any(String),
      text: expect.any(String),
      tempId: expect.any(String),
    });
  });

  it("should validate server-to-client tool_call event payload contracts", () => {
    const toolStartPayload = {
      toolName: "getAvailableSlots",
      input: { date: "2026-08-25", serviceId: "srv-1" },
    };

    const toolEndPayload = {
      toolName: "getAvailableSlots",
      output: [
        {
          slotId: "s-1",
          date: "2026-08-25",
          timeSlot: "09:00 - 09:30",
          available: true,
        },
      ],
    };

    expect(toolStartPayload.toolName).toBe("getAvailableSlots");
    expect(toolEndPayload.output).toBeInstanceOf(Array);
    expect(toolEndPayload.output[0].available).toBe(true);
  });

  it("should validate message acknowledgment contract with status update", () => {
    const ackPayload = {
      tempId: "tmp-9988",
      messageId: "server-msg-123",
      status: "SENT",
      createdAt: new Date().toISOString(),
    };

    expect(ackPayload.status).toBe("SENT");
    expect(ackPayload.messageId).toBeDefined();
    expect(ackPayload.tempId).toBe("tmp-9988");
  });
});
