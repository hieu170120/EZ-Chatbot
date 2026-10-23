import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";
import { io, Socket } from "socket.io-client";
import {
  useVisitorChatStore,
  type ChatMessage,
  type ChatMessageComponent,
  type HandlingStatus,
  type AppearanceSettings,
  type TimeoutSettings,
  type BookingSlot,
  type BookingSummaryPayload,
  type BookingSuccessPayload,
  type BookingCancellationPayload,
} from "../store";
import { isDomainAllowed } from "./useSiteConfig";
import { visitorDisplayText } from "../utils/chat-message.utils";
import {
  collectCurrentPageContext,
  type PageContextPayload,
} from "../utils/page-context.utils";
import { bookingSummaryPatchFromText } from "../utils/booking-parser.utils";
import {
  startConversationApi,
  getConversationStatusApi,
  getConversationMessagesApi,
  callAgentApi,
} from "../api/chat.api";

const parseJsonText = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const bookingSlotsPayload = (payload: unknown): BookingSlot[] | null => {
  const parsed = parseJsonText(payload);
  if (Array.isArray(parsed)) return parsed as BookingSlot[];
  if (!parsed || typeof parsed !== "object") return null;

  const record = parsed as Record<string, unknown>;
  const rawSlots =
    record.slots ?? record.output ?? record.data ?? record.result;
  if (Array.isArray(rawSlots)) return rawSlots as BookingSlot[];
  if (typeof rawSlots === "string") {
    const nested = bookingSlotsPayload(rawSlots);
    if (nested) return nested;
  }

  const content = record.content;
  if (Array.isArray(content)) {
    const text = content.find(
      (item): item is { text: string } =>
        !!item && typeof item === "object" && typeof item.text === "string",
    )?.text;
    return bookingSlotsPayload(text);
  }

  return null;
};

export interface UseChatSocketOptions {
  backendUrl: string;
  siteId: string;
  isChatEnabled: boolean;
  isOpen: boolean;
  isTestMode?: boolean;
  onConversationClosed: () => void;
  onConversationWarning: (seconds: number, message?: string) => void;
  onConversationTimerReset: () => void;
  onChatDisabled: () => void;
}

export function useChatSocket(
  backendUrl: string,
  siteId: string,
  isChatEnabled: boolean,
  isOpen: boolean,
  onConversationClosed: () => void,
  onConversationWarning: (seconds: number, message?: string) => void,
  onConversationTimerReset: () => void,
  onChatDisabled: () => void,
  isTestMode = false,
  shouldCollectPageContext = true,
) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [handlingStatus, setHandlingStatus] =
    useState<HandlingStatus>("AI_HANDLING");
  const [isBotResponding, setIsBotResponding] = useState(false);
  const [isCallingAgent, setIsCallingAgent] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  const pendingBookingSlotsRef = useRef<BookingSlot[] | null>(null);
  const pendingBookingSummaryRef = useRef<BookingSummaryPayload | null>(null);
  const pendingBookingCancellationRef =
    useRef<BookingCancellationPayload | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingFirstMessageRef = useRef<{
    conversationId: string;
    content: string;
    localId: string;
    pageContext?: PageContextPayload;
  } | null>(null);

  const onConversationClosedRef = useRef(onConversationClosed);
  const onConversationWarningRef = useRef(onConversationWarning);
  const onConversationTimerResetRef = useRef(onConversationTimerReset);
  const onChatDisabledRef = useRef(onChatDisabled);

  useEffect(() => {
    onConversationClosedRef.current = onConversationClosed;
    onConversationWarningRef.current = onConversationWarning;
    onConversationTimerResetRef.current = onConversationTimerReset;
    onChatDisabledRef.current = onChatDisabled;
  });

  const {
    conversationId,
    visitorToken,
    setConversationId,
    setVisitorToken,
    setVisitorInfo,
    setMessages,
    addMessage,
    updateMessageStatus,
    updateMessagesStatusByRole,
    setAgentTyping,
    setStatus,
    status,
    appendMessageChunk,
    updateLastActivityAt,
    setIsUserAtBottom,
    setSiteName,
    setTimeoutSettings,
    setAppearanceSettings,
    appearanceSettings,
    setBookingSlots,
    setBookingSummary,
    addBookingSuccess,
    setBookingCancellation,
    markBookingCancelled,
    setFeatureFlags,
    clearStore,
    beginBookingSummaryEdit,
    activeBookingSummary,
    draftBookingSummary,
    incrementUnreadCount,
    setHasMoreMessages,
  } = useVisitorChatStore();

  const MESSAGES_PAGE_LIMIT = 20;
  const restoringConvIdRef = useRef<string | null>(null);

  // Restore conversation if ID exists but socket is not active
  useEffect(() => {
    if (!isChatEnabled) return;
    if (
      conversationId &&
      !socket &&
      restoringConvIdRef.current !== conversationId
    ) {
      restoringConvIdRef.current = conversationId;

      const restoreConversation = async () => {
        try {
          if (conversationId.startsWith("admin-test-")) {
            const newSocket = io(backendUrl, {
              query: {
                conversationId,
                siteId,
                isTestMode: true,
              },
            });
            setSocket(newSocket);
            return;
          }

          if (!visitorToken) {
            clearStore();
            return;
          }

          const [statusData, history] = await Promise.all([
            getConversationStatusApi(
              backendUrl,
              conversationId,
              visitorToken,
            ).catch((err: Error) => {
              if (
                err.message.includes("401") ||
                err.message.includes("403") ||
                err.message.includes("404")
              ) {
                clearStore();
              }
              return null;
            }),
            getConversationMessagesApi(
              backendUrl,
              conversationId,
              visitorToken,
              { limit: MESSAGES_PAGE_LIMIT },
            ).catch((err: Error) => {
              if (
                err.message.includes("401") ||
                err.message.includes("403") ||
                err.message.includes("404")
              ) {
                clearStore();
              }
              return null;
            }),
          ]);

          if (!statusData) return;

          if (history) {
            setMessages(history);
            setHasMoreMessages(history.length >= MESSAGES_PAGE_LIMIT);
          }

          if (statusData.status === "CLOSED") {
            onConversationClosed();
          } else {
            setStatus(statusData.status || "OPEN");
            setHandlingStatus(statusData.handlingStatus || "AI_HANDLING");
            setIsBotResponding(false);

            const newSocket = io(backendUrl, {
              auth: { token: visitorToken },
              query: { siteId },
            });
            setSocket(newSocket);
          }
        } catch (err) {
          console.error("Failed to restore conversation", err);
        } finally {
          restoringConvIdRef.current = null;
        }
      };

      restoreConversation();
    }
  }, [
    isChatEnabled,
    conversationId,
    socket,
    backendUrl,
    siteId,
    visitorToken,
    clearStore,
    onConversationClosed,
    setStatus,
    setHandlingStatus,
    setIsBotResponding,
    setMessages,
    setHasMoreMessages,
  ]);

  // Anonymous socket connection when no conversation exists
  useEffect(() => {
    if (!isChatEnabled || !siteId || conversationId) return;

    let isMounted = true;
    const anonSocket = io(backendUrl, { query: { siteId } });

    anonSocket.on("connect", () => {
      if (isMounted) {
        setSocket(anonSocket);
      }
    });

    return () => {
      isMounted = false;
      anonSocket.disconnect();
      setSocket((prev) => (prev === anonSocket ? null : prev));
    };
  }, [isChatEnabled, siteId, backendUrl, conversationId]);

  // Main socket event listener lifecycle
  useEffect(() => {
    if (!socket) return;

    const flushPendingFirstMessage = () => {
      if (pendingFirstMessageRef.current) {
        const pending = pendingFirstMessageRef.current;
        pendingFirstMessageRef.current = null;
        if (handlingStatus === "AI_HANDLING") setIsBotResponding(true);
        updateLastActivityAt();
        socket.emit("sendMessage", {
          conversationId: pending.conversationId,
          content: pending.content,
          senderType: "VISITOR",
          localId: pending.localId,
          ...(pending.pageContext ?? {}),
        });
      }
    };

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setIsReconnecting(false);
      flushPendingFirstMessage();
    });

    if (socket.connected) {
      flushPendingFirstMessage();
    }

    const triggerReconnecting = () => {
      const currentStatus = useVisitorChatStore.getState().status;
      const currentConvId = useVisitorChatStore.getState().conversationId;
      if (currentStatus === "CLOSED" || !currentConvId) return;

      setIsReconnecting(true);
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          setIsReconnecting(false);
          setStatus("CLOSED");
          setIsBotResponding(false);
          addMessage({
            id: Date.now().toString(),
            role: "system",
            text: "Chat ended due to server connection timeout.",
            createdAt: new Date().toISOString(),
          });
          socket.disconnect();
        }, 120000);
      }
    };

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      if (reason === "io client disconnect") return;
      triggerReconnecting();
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket connect_error:", error);
      triggerReconnecting();
    });

    const handleOffline = () => {
      console.warn("Browser detected network offline");
      triggerReconnecting();
    };

    const handleOnline = () => {
      console.log("Browser detected network online");
      if (socket && !socket.connected) {
        socket.connect();
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    socket.on("ai-stream-start", (data: { conversationId: string }) => {
      const activeId =
        conversationId || useVisitorChatStore.getState().conversationId;
      if (data.conversationId === activeId) {
        setIsBotResponding(true);
      }
    });

    socket.on("ai-stream-end", (data: { conversationId: string }) => {
      const activeId =
        conversationId || useVisitorChatStore.getState().conversationId;
      if (data.conversationId === activeId) {
        setIsBotResponding(false);
      }
    });

    socket.on(
      "newMessage",
      (data: {
        id: string;
        content: string;
        senderType: string;
        createdAt: string;
        localId?: string;
        senderName?: string;
        locale?: string;
        components?: ChatMessageComponent[];
      }) => {
        if (
          data.senderType === "AI" ||
          data.senderType === "AGENT" ||
          data.senderType === "SYSTEM"
        ) {
          setIsBotResponding(false);
          setAgentTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
        const role = (
          data.senderType === "VISITOR"
            ? "user"
            : data.senderType === "SYSTEM"
              ? "system"
              : data.senderType === "AI"
                ? "bot"
                : "agent"
        ) as ChatMessage["role"];

        if (data.localId && role === "user") {
          updateMessageStatus(data.localId, "SENT");
          return;
        }

        if (role === "bot" || role === "agent") {
          updateLastActivityAt();
        }

        addMessage({
          id: data.id,
          role,
          text:
            role === "user" ? visitorDisplayText(data.content) : data.content,
          createdAt: data.createdAt,
          status: "DELIVERED",
          senderName: data.senderName,
          locale: data.locale,
          components: data.components,
        });

        if (role === "agent" || role === "bot") {
          const { isUserAtBottom } = useVisitorChatStore.getState();
          if (isOpen && document.hasFocus() && isUserAtBottom) {
            socket.emit("conversation-read", { conversationId });
          } else {
            incrementUnreadCount();
          }
        }
      },
    );

    socket.on(
      "aiChunk",
      (data: { token: string; conversationId: string; messageId?: string }) => {
        const activeId =
          conversationId || useVisitorChatStore.getState().conversationId;
        if (data.conversationId === activeId) {
          if (
            handlingStatus !== "WAITING_FOR_AGENT" &&
            handlingStatus !== "AGENT_HANDLING"
          ) {
            setIsBotResponding(true);
          }
          updateLastActivityAt();
          appendMessageChunk(
            data.messageId || `ai-stream-${data.conversationId}`,
            data.token,
          );
        }
      },
    );

    socket.on(
      "messageSaved",
      (data: {
        id: string;
        content: string;
        senderType: string;
        createdAt: string;
        localId?: string;
        senderName?: string;
        locale?: string;
        components?: ChatMessageComponent[];
      }) => {
        const role = (
          data.senderType === "VISITOR"
            ? "user"
            : data.senderType === "SYSTEM"
              ? "system"
              : data.senderType === "AI"
                ? "bot"
                : "agent"
        ) as ChatMessage["role"];

        if (data.localId && role === "user") {
          updateMessageStatus(data.localId, "SENT");
          return;
        }

        addMessage({
          id: data.id,
          role,
          text:
            role === "user" ? visitorDisplayText(data.content) : data.content,
          createdAt: data.createdAt,
          status: "DELIVERED",
          senderName: data.senderName,
          locale: data.locale,
          components: data.components,
        });
      },
    );

    socket.on(
      "aiMessageComplete",
      (data: { conversationId: string; messageId?: string }) => {
        const activeId =
          conversationId || useVisitorChatStore.getState().conversationId;
        if (data.conversationId === activeId) {
          setIsBotResponding(false);
          updateLastActivityAt();
        }
      },
    );

    socket.on("ai-stream-end", (data: { conversationId: string }) => {
      const activeId =
        conversationId || useVisitorChatStore.getState().conversationId;
      if (data?.conversationId === activeId) {
        setIsBotResponding(false);
      }
    });

    socket.on("conversation-delivered", () => {
      updateMessagesStatusByRole("user", "DELIVERED");
    });

    socket.on("conversation-read", () => {
      updateMessagesStatusByRole("user", "READ");
    });

    socket.on(
      "conversation-typing",
      (data: {
        conversationId?: string;
        senderType: string;
        isTyping?: boolean;
      }) => {
        if (data.senderType === "AGENT") {
          const isTyping = data.isTyping !== false;
          useVisitorChatStore.getState().setAgentTyping(isTyping);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              useVisitorChatStore.getState().setAgentTyping(false);
              typingTimeoutRef.current = null;
            }, 3000);
          }
        }
      },
    );

    socket.on(
      "conversationStatusChanged",
      (data: {
        status: "OPEN" | "CLOSED" | "PAUSED";
        handlingStatus?: HandlingStatus;
      }) => {
        setStatus(data.status);
        if (data.handlingStatus) {
          setHandlingStatus(data.handlingStatus);
        }
        if (data.status === "CLOSED") {
          onConversationClosedRef.current?.();
        }
      },
    );

    socket.on(
      "conversationWarning",
      (data: { secondsRemaining: number; message?: string }) => {
        onConversationWarningRef.current?.(data.secondsRemaining, data.message);
      },
    );

    socket.on("conversationTimerReset", () => {
      onConversationTimerResetRef.current?.();
    });

    socket.on(
      "aiToggled",
      (data: { isAiActive: boolean; handlingStatus: HandlingStatus }) => {
        setHandlingStatus(data.handlingStatus);
        if (
          data.handlingStatus === "WAITING_FOR_AGENT" ||
          data.handlingStatus === "AGENT_HANDLING" ||
          data.isAiActive === false
        ) {
          setIsBotResponding(false);
        }
      },
    );

    socket.on(
      "handlingStatusUpdated",
      (data: { conversationId: string; handlingStatus: HandlingStatus }) => {
        const activeId =
          conversationId || useVisitorChatStore.getState().conversationId;
        if (data.conversationId === activeId) {
          setHandlingStatus(data.handlingStatus);
          if (
            data.handlingStatus === "WAITING_FOR_AGENT" ||
            data.handlingStatus === "AGENT_HANDLING"
          ) {
            setIsBotResponding(false);
          }
        }
      },
    );

    socket.on("conversationClosed", () => {
      setStatus("CLOSED");
      setIsBotResponding(false);
      useVisitorChatStore.getState().setAgentTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      onConversationClosedRef.current?.();
    });

    socket.on("siteSettingsUpdated", (rawPayload: Record<string, unknown>) => {
      const payload = rawPayload as {
        name?: string;
        isEnabled?: boolean;
        isAiActive?: boolean;
        enabled?: boolean;
        humanHandoff?: boolean;
        emailTranscript?: boolean;
        useCurrentPageContent?: boolean;
        allowedDomains?: string[];
      } & AppearanceSettings &
        TimeoutSettings;

      if (payload.name) setSiteName(payload.name);

      const isEnabled =
        payload.isEnabled ?? payload.isAiActive ?? payload.enabled;
      if (isEnabled !== undefined || payload.allowedDomains !== undefined) {
        const checkEnabled = isEnabled !== false;
        const checkDomains = Array.isArray(payload.allowedDomains)
          ? payload.allowedDomains
          : undefined;
        if (checkDomains !== undefined) {
          const isAllowed = isDomainAllowed(
            window.location.hostname,
            checkDomains,
          );
          if (!checkEnabled || !isAllowed) {
            onChatDisabledRef.current?.();
            return;
          }
        } else if (!checkEnabled) {
          onChatDisabledRef.current?.();
          return;
        }
      }

      setFeatureFlags({
        isAiActive: payload.isAiActive,
        humanHandoff: payload.humanHandoff,
        emailTranscript: payload.emailTranscript,
        useCurrentPageContent: payload.useCurrentPageContent,
      });

      if (payload.enableConversationTimeout !== undefined) {
        if (!payload.enableConversationTimeout) {
          onConversationTimerReset();
        }
        setTimeoutSettings({
          enableConversationTimeout: payload.enableConversationTimeout,
          inactivityTimeoutMinutes: payload.inactivityTimeoutMinutes,
          warningTimeMinutes: payload.warningTimeMinutes,
          inactivityWarningMessage: payload.inactivityWarningMessage,
          timeoutMessage: payload.timeoutMessage,
          resetTimerOnBotResponse: payload.resetTimerOnBotResponse,
          pauseTimerForAgentChats: payload.pauseTimerForAgentChats,
        });
      }

      setAppearanceSettings({
        primaryColor: payload.primaryColor,
        backgroundColor: payload.backgroundColor,
        botAvatar: payload.botAvatar,
        launcherIcon: payload.launcherIcon,
        defaultGreetingMessage: payload.defaultGreetingMessage,
        chatButtonPosition: payload.chatButtonPosition,
        chatWindowTitle: payload.chatWindowTitle,
        chatButtonText: payload.chatButtonText,
        showAvatar: payload.showAvatar,
      });
    });

    socket.on("bookingSlots", (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (
        typeof record.conversationId === "string" &&
        record.conversationId !== conversationId
      ) {
        return;
      }
      const slots =
        (Array.isArray(record.slots)
          ? (record.slots as BookingSlot[])
          : null) ?? bookingSlotsPayload(record.payload ?? data);
      if (slots && slots.length > 0) {
        pendingBookingSlotsRef.current = slots;
        setBookingSlots(slots);
      }
    });

    socket.on("bookingSummary", (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (
        typeof record.conversationId === "string" &&
        record.conversationId !== conversationId
      ) {
        return;
      }
      const payload = (record.payload ?? record) as BookingSummaryPayload;
      pendingBookingSummaryRef.current = payload;
      setBookingSummary(payload);
    });

    socket.on("bookingSuccess", (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (
        typeof record.conversationId === "string" &&
        record.conversationId !== conversationId
      ) {
        return;
      }
      const payload = (record.payload ?? record) as BookingSuccessPayload;
      addBookingSuccess(payload);
    });

    socket.on("bookingCancellation", (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (
        typeof record.conversationId === "string" &&
        record.conversationId !== conversationId
      ) {
        return;
      }
      const payload = (record.payload ?? record) as BookingCancellationPayload;
      pendingBookingCancellationRef.current = payload;
      setBookingCancellation(payload);
    });

    socket.on("bookingCancelled", (data: unknown) => {
      if (!data || typeof data !== "object") return;
      const record = data as Record<string, unknown>;
      if (
        typeof record.conversationId === "string" &&
        record.conversationId !== conversationId
      ) {
        return;
      }
      const payload = (record.payload ?? record) as BookingCancellationPayload;
      markBookingCancelled(payload);
    });

    socket.on("messageError", (data: unknown) => {
      const record = (data && typeof data === "object" ? data : {}) as Record<
        string,
        unknown
      >;
      const errorMsg =
        typeof record.message === "string"
          ? record.message
          : "Message error. Please try again.";
      setIsBotResponding(false);
      message.warning(errorMsg);
      addMessage({
        id: `err-${Date.now()}`,
        role: "system",
        text: `⚠️ ${errorMsg}`,
        createdAt: new Date().toISOString(),
      });
    });

    const handleFocus = () => {
      if (isOpen && conversationId) {
        const { isUserAtBottom } = useVisitorChatStore.getState();
        if (isUserAtBottom) {
          useVisitorChatStore.getState().resetUnreadCount();
        }
        socket.emit("conversation-read", { conversationId });
      }
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("ai-stream-start");
      socket.off("ai-stream-end");
      socket.off("newMessage");
      socket.off("aiChunk");
      socket.off("messageSaved");
      socket.off("aiMessageComplete");
      socket.off("conversation-delivered");
      socket.off("conversation-read");
      socket.off("conversation-typing");
      socket.off("conversationStatusChanged");
      socket.off("conversationWarning");
      socket.off("conversationTimerReset");
      socket.off("aiToggled");
      socket.off("handlingStatusUpdated");
      socket.off("conversationClosed");
      socket.off("siteSettingsUpdated");
      socket.off("bookingSlots");
      socket.off("bookingSummary");
      socket.off("bookingSuccess");
      socket.off("bookingCancellation");
      socket.off("bookingCancelled");
      socket.off("messageError");
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      useVisitorChatStore.getState().setAgentTyping(false);
    };
  }, [
    socket,
    siteId,
    backendUrl,
    isChatEnabled,
    isOpen,
    conversationId,
    handlingStatus,
    addMessage,
    appendMessageChunk,
    incrementUnreadCount,
    markBookingCancelled,
    addBookingSuccess,
    setAppearanceSettings,
    setBookingCancellation,
    setBookingSlots,
    setBookingSummary,
    setMessages,
    setSiteName,
    setStatus,
    setTimeoutSettings,
    setFeatureFlags,
    updateLastActivityAt,
    updateMessageStatus,
    updateMessagesStatusByRole,
    onConversationTimerReset,
    setAgentTyping,
  ]);

  const emitTyping = useCallback(() => {
    if (socket && conversationId) {
      socket.emit("conversation-typing", { conversationId });
    }
  }, [socket, conversationId]);

  const emitRead = useCallback(() => {
    if (socket && conversationId) {
      socket.emit("conversation-read", { conversationId });
    }
  }, [socket, conversationId]);

  const startConversation = useCallback(
    async (values?: {
      name?: string;
      email?: string;
      firstMessage?: string;
    }) => {
      try {
        const visitorName = values?.name?.trim() || undefined;
        const visitorEmail = values?.email?.trim() || undefined;
        const firstMessage = values?.firstMessage?.trim() || "";

        const data = await startConversationApi(backendUrl, {
          siteId,
          visitorName,
          visitorEmail,
        });

        clearStore();
        setVisitorInfo(visitorName || "", visitorEmail || "");

        setConversationId(data.conversationId);
        setVisitorToken(data.visitorToken || null);
        setStatus(data.status || "OPEN");
        setHandlingStatus(data.handlingStatus || "AI_HANDLING");
        setIsBotResponding(false);

        const hasFirstMessage = Boolean(firstMessage);
        const firstMessageLocalId = hasFirstMessage
          ? Date.now().toString()
          : null;

        const pageContext =
          shouldCollectPageContext && !isTestMode
            ? collectCurrentPageContext()
            : undefined;

        if (hasFirstMessage && firstMessageLocalId) {
          pendingFirstMessageRef.current = {
            conversationId: data.conversationId,
            content: firstMessage,
            localId: firstMessageLocalId,
            pageContext,
          };
          setMessages([
            {
              id: firstMessageLocalId,
              role: "user",
              text: visitorDisplayText(firstMessage),
              createdAt: new Date().toISOString(),
              status: "queued",
            },
          ]);
        } else {
          pendingFirstMessageRef.current = null;
          const greetingText =
            appearanceSettings?.defaultGreetingMessage ||
            "Hi there! I'm your AI assistant. How can I help you today?";
          setMessages([
            {
              id: `msg-greeting-${Date.now()}`,
              role: "bot",
              text: greetingText,
              createdAt: new Date().toISOString(),
            },
          ]);
        }

        if (socket) socket.disconnect();
        const newSocket = io(backendUrl, {
          auth: { token: data.visitorToken },
          query: { siteId },
        });
        setSocket(newSocket);
      } catch (err) {
        console.error("startConversation error:", err);
        const errMsg =
          err instanceof Error
            ? err.message
            : "Server error: Unable to start chat. Please try again.";
        message.error(errMsg);
      }
    },
    [
      backendUrl,
      siteId,
      socket,
      clearStore,
      setVisitorInfo,
      setConversationId,
      setVisitorToken,
      setStatus,
      setHandlingStatus,
      setIsBotResponding,
      setMessages,
      appearanceSettings,
      shouldCollectPageContext,
      isTestMode,
    ],
  );

  const sendMessage = useCallback(
    (text: string) => {
      if (!conversationId || status === "CLOSED") return;
      if (!socket || !socket.connected) {
        message.error("Server connection lost. Unable to send message.");
        return;
      }
      onConversationTimerReset();
      setBookingSlots(null);

      const summaryDraft = activeBookingSummary ?? draftBookingSummary;
      const bookingPatch = summaryDraft
        ? bookingSummaryPatchFromText(text)
        : null;
      if (bookingPatch) {
        pendingBookingSummaryRef.current = {
          ...summaryDraft,
          ...bookingPatch,
        } as BookingSummaryPayload;
        beginBookingSummaryEdit();
      }

      const localId = Date.now().toString();
      if (handlingStatus === "AI_HANDLING") setIsBotResponding(true);
      updateLastActivityAt();
      setIsUserAtBottom(true);

      if (/^\/select-booking-option\s+/i.test(text)) {
        try {
          const jsonMatch = text.match(
            /^\/select-booking-option\s+(.+?)\s+::/i,
          )?.[1];
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch);
            if (parsed.action === "select_booking_type") {
              useVisitorChatStore
                .getState()
                .setBookingType(parsed.value as "single" | "multiple");
            } else if (parsed.action === "select_party_size" && parsed.value) {
              useVisitorChatStore
                .getState()
                .setPartySize(parseInt(parsed.value, 10));
            } else if (parsed.action === "select_service" && parsed.value) {
              useVisitorChatStore.getState().setSelectedBookingServiceIds(
                parsed.value
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
              );
            }
          }
        } catch (_err) {
          void _err;
        }
      }

      if (/^\/select-booking-slot\s+/i.test(text)) {
        try {
          const jsonMatch = text.match(
            /^\/select-booking-slot\s+(.+?)\s+::/i,
          )?.[1];
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch);
            if (Array.isArray(parsed.slots) && parsed.slots.length > 0) {
              useVisitorChatStore
                .getState()
                .setSelectedBookingSlots(parsed.slots);
            } else if (parsed.timeSlot) {
              useVisitorChatStore.getState().setSelectedBookingSlots([
                {
                  timeSlot: parsed.timeSlot,
                  date: parsed.date,
                  resourceId: parsed.resourceId,
                  resourceName: parsed.resourceName,
                },
              ]);
            }
          }
        } catch (_err) {
          void _err;
        }
      }
      addMessage({
        id: localId,
        role: "user",
        text: visitorDisplayText(text),
        createdAt: new Date().toISOString(),
        status: "queued",
      });
      if (socket) {
        const pageContext =
          shouldCollectPageContext && !isTestMode
            ? collectCurrentPageContext()
            : undefined;
        socket.emit("sendMessage", {
          conversationId,
          content: text,
          senderType: "VISITOR",
          localId,
          ...(pageContext ?? {}),
        });
      }
    },
    [
      conversationId,
      status,
      handlingStatus,
      activeBookingSummary,
      draftBookingSummary,
      socket,
      onConversationTimerReset,
      setBookingSlots,
      beginBookingSummaryEdit,
      setIsBotResponding,
      updateLastActivityAt,
      setIsUserAtBottom,
      addMessage,
      shouldCollectPageContext,
      isTestMode,
    ],
  );

  const callAgent = useCallback(async () => {
    if (!conversationId || isCallingAgent) return;
    if (isTestMode) {
      setHandlingStatus("WAITING_FOR_AGENT");
      setIsBotResponding(false);
      return;
    }
    setIsCallingAgent(true);
    try {
      await callAgentApi(backendUrl, conversationId, visitorToken);
      setHandlingStatus("WAITING_FOR_AGENT");
      setIsBotResponding(false);
    } catch (err) {
      console.error("callAgent error:", err);
      message.error(
        "Server error: Failed to connect with an agent. Please try again.",
      );
    } finally {
      setIsCallingAgent(false);
    }
  }, [conversationId, isCallingAgent, isTestMode, backendUrl, visitorToken]);

  const initTestConversation = useCallback(() => {
    const newConvId = `admin-test-${siteId}-${Date.now()}`;
    setConversationId(newConvId);
    setVisitorInfo("Admin Tester", "admin@test.local");
    setMessages([
      {
        id: `msg-test-greeting-${Date.now()}`,
        role: "bot",
        text:
          appearanceSettings?.defaultGreetingMessage ||
          "Hi there! I'm your AI assistant. How can I help you today?",
        createdAt: new Date().toISOString(),
      },
    ]);
    if (socket) socket.disconnect();
    const newSocket = io(backendUrl, {
      query: {
        conversationId: newConvId,
        siteId,
        isTestMode: true,
      },
    });
    setSocket(newSocket);
  }, [
    backendUrl,
    siteId,
    socket,
    appearanceSettings,
    setConversationId,
    setVisitorInfo,
    setMessages,
  ]);

  const loadMoreMessages = useCallback(async (): Promise<boolean> => {
    const state = useVisitorChatStore.getState();
    if (
      !state.hasMoreMessages ||
      state.isLoadingMoreMessages ||
      !state.conversationId ||
      state.messages.length === 0
    ) {
      return false;
    }

    const oldestWithDate = state.messages.find((m) => Boolean(m.createdAt));
    const cursor = oldestWithDate?.createdAt;
    if (!cursor) {
      state.setHasMoreMessages(false);
      return false;
    }

    state.setIsLoadingMoreMessages(true);
    try {
      const olderMessages = await getConversationMessagesApi(
        backendUrl,
        state.conversationId,
        state.visitorToken,
        { cursor, limit: MESSAGES_PAGE_LIMIT },
      );

      if (olderMessages.length > 0) {
        state.prependMessages(olderMessages);
      }
      state.setHasMoreMessages(olderMessages.length >= MESSAGES_PAGE_LIMIT);
      return olderMessages.length > 0;
    } catch (err) {
      console.error("Failed to load more messages:", err);
      return false;
    } finally {
      state.setIsLoadingMoreMessages(false);
    }
  }, [backendUrl]);

  return {
    socket,
    handlingStatus,
    isBotResponding,
    isCallingAgent,
    isReconnecting,
    emitTyping,
    emitRead,
    startConversation,
    sendMessage,
    callAgent,
    initTestConversation,
    loadMoreMessages,
    pendingBookingSummaryRef,
  };
}
