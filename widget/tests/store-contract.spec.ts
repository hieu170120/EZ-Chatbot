import { describe, it, expect, beforeEach } from "vitest";
import { useVisitorChatStore, type ChatMessage } from "../src/store";

describe("VisitorChatStore Contract Tests", () => {
  beforeEach(() => {
    useVisitorChatStore.getState().clearStore();
  });

  it("should initialize with default state after clearStore", () => {
    const state = useVisitorChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.conversationId).toBeNull();
    expect(state.isAgentTyping).toBe(false);
    expect(state.status).toBe("OPEN");
  });

  it("should add messages adhering to ChatMessage contract", () => {
    const testMsg: ChatMessage = {
      id: "msg-1",
      role: "user",
      text: "Hello, I want to book an appointment",
      status: "SENT",
      createdAt: new Date().toISOString(),
    };

    useVisitorChatStore.getState().addMessage(testMsg);

    const state = useVisitorChatStore.getState();
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      id: "msg-1",
      role: "user",
      text: "Hello, I want to book an appointment",
      status: "SENT",
    });
  });

  it("should update message status through lifecycle: queued -> SENT -> DELIVERED -> READ", () => {
    const testMsg: ChatMessage = {
      id: "msg-lifecycle",
      role: "user",
      text: "Testing status lifecycle",
      status: "queued",
    };

    useVisitorChatStore.getState().addMessage(testMsg);
    expect(useVisitorChatStore.getState().messages[0].status).toBe("queued");

    useVisitorChatStore.getState().updateMessageStatus("msg-lifecycle", "SENT");
    expect(useVisitorChatStore.getState().messages[0].status).toBe("SENT");

    useVisitorChatStore
      .getState()
      .updateMessageStatus("msg-lifecycle", "DELIVERED");
    expect(useVisitorChatStore.getState().messages[0].status).toBe("DELIVERED");

    useVisitorChatStore.getState().updateMessageStatus("msg-lifecycle", "READ");
    expect(useVisitorChatStore.getState().messages[0].status).toBe("READ");
  });

  it("should handle streaming chunks via appendMessageChunk contract", () => {
    useVisitorChatStore.getState().appendMessageChunk("chunk-1", "Hello ");
    useVisitorChatStore.getState().appendMessageChunk("chunk-1", "there!");

    const messages = useVisitorChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("chunk-1");
    expect(messages[0].text).toBe("Hello there!");
    expect(messages[0].role).toBe("bot");
  });

  it("should update and persist conversation session details", () => {
    useVisitorChatStore.getState().setConversationId("conv-12345");
    useVisitorChatStore
      .getState()
      .setVisitorInfo("John Doe", "john@example.com");
    useVisitorChatStore.getState().setSiteName("My Test Site");

    const state = useVisitorChatStore.getState();
    expect(state.conversationId).toBe("conv-12345");
    expect(state.visitorName).toBe("John Doe");
    expect(state.visitorEmail).toBe("john@example.com");
    expect(state.siteName).toBe("My Test Site");
  });

  it("should clear conversation on clearStore", () => {
    useVisitorChatStore.getState().addMessage({
      id: "m-1",
      role: "user",
      text: "Some text",
    });
    useVisitorChatStore.getState().setConversationId("conv-abc");

    useVisitorChatStore.getState().clearStore();

    const state = useVisitorChatStore.getState();
    expect(state.messages).toEqual([]);
    expect(state.conversationId).toBeNull();
  });
});
