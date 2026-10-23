import React, { useEffect, useLayoutEffect, useRef } from "react";
import { Avatar } from "antd";
import {
  RobotOutlined,
  CustomerServiceOutlined,
  DownOutlined,
  LoadingOutlined,
} from "@ant-design/icons";
import { useVisitorChatStore } from "../store";
import type { ChatMessage } from "../store";
import { ChatMessageItem } from "./ChatMessageItem";
import { InlineSlotPicker } from "./booking/InlineSlotPicker";
import { BookingSummaryCard } from "./booking/BookingSummaryCard";
import { BookingCancellationCard } from "./booking/BookingCancellationCard";
import { senderKey } from "../utils/chat-message.parser";
import { serializeSelectMultipleSlotsCommand } from "../utils/booking-command.serializer";
import { useWidgetConfig } from "../context/WidgetContext";
import i18n from "../i18n";

type MessageListProps = {
  messages: ChatMessage[];
  isAgentTyping: boolean;
  isOpen: boolean;
  isBotResponding?: boolean;
  status?: "OPEN" | "PAUSED" | "CLOSED";
  onSendMessage?: (text: string) => void;
  onLoadMore?: () => Promise<boolean | void>;
};

const isBookingSummaryBubble = (text?: string): boolean => {
  if (!text) return false;
  return (
    text.includes("Xác nhận thông tin đặt lịch") ||
    text.includes("Booking Summary") ||
    text.includes("Thông tin đặt lịch của bạn") ||
    text.includes("Vui lòng kiểm tra lại thông tin đặt hẹn") ||
    text.includes("Please review your booking details") ||
    text.includes("以下の内容でよろしいですか") ||
    /<booking-step>\s*summary\s*<\/booking-step>/i.test(text)
  );
};

export function MessageList({
  messages,
  isAgentTyping,
  isOpen,
  isBotResponding,
  status,
  onSendMessage,
  onLoadMore,
}: MessageListProps) {
  const {
    isUserAtBottom,
    setIsUserAtBottom,
    setPreview,
    appearanceSettings,
    resetUnreadCount,
    unreadCount,
    hasMoreMessages,
    isLoadingMoreMessages,
    activeBookingSlots,
    activeBookingSummary,
    activeBookingCancellation,
    bookingHours,
    bookingServices,
    bookingResources,
    cancelledBookingCodes,
    setBookingSlots,
    setBookingSummary,
    setBookingCancellation,
  } = useVisitorChatStore();

  const listRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);
  const isPrependRef = useRef<boolean>(false);

  const { siteId, backendUrl } = useWidgetConfig();
  const bookingSlots = Array.isArray(activeBookingSlots)
    ? activeBookingSlots
    : activeBookingSlots?.slots;
  const latestBotLocale =
    messages
      .slice()
      .reverse()
      .find((message) => message.role === "bot" && message.locale)?.locale ||
    "en";
  const shouldShowBookingSlots =
    Boolean(bookingSlots && bookingSlots.length > 0) &&
    !activeBookingSummary &&
    status !== "CLOSED";

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 50;

    if (isAtBottom !== isUserAtBottom) {
      setIsUserAtBottom(isAtBottom);
    }
    if (isOpen && isAtBottom) {
      resetUnreadCount();
    }

    if (
      target.scrollTop <= 40 &&
      hasMoreMessages &&
      !isLoadingMoreMessages &&
      onLoadMore
    ) {
      prevScrollHeightRef.current = target.scrollHeight;
      isPrependRef.current = true;
      onLoadMore();
    }
  };

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    if (isPrependRef.current) {
      const heightDifference = list.scrollHeight - prevScrollHeightRef.current;
      list.scrollTop = list.scrollTop + heightDifference;
      isPrependRef.current = false;
      return;
    }

    if (isOpen && isUserAtBottom) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, isOpen, isAgentTyping, isBotResponding, isUserAtBottom]);

  useEffect(() => {
    if (isOpen) {
      const list = listRef.current;
      if (list) {
        list.scrollTop = list.scrollHeight;
        setIsUserAtBottom(true);
        resetUnreadCount();
      }
    }
  }, [isOpen, setIsUserAtBottom, resetUnreadCount]);

  const industryTemplate = useVisitorChatStore(
    (state) => state.industryTemplate,
  );
  const isSalon = industryTemplate === "salon";
  const storeBookingType = useVisitorChatStore((state) => state.bookingType);

  const detectedBookingType: "single" | "multiple" = !isSalon
    ? "multiple"
    : storeBookingType ||
      messages
        .slice()
        .reverse()
        .map((m) => {
          const text = (m.text || "").toLowerCase();
          if (
            text.includes("đặt cho nhiều người") ||
            text.includes("nhiều người") ||
            text.includes("đặt nhiều chỗ") ||
            text.includes("nhiều chỗ") ||
            text.includes("nhiều slot") ||
            text.includes("multiple") ||
            text.includes("グループ") ||
            text.includes("複数名") ||
            text.includes("複数枠予約") ||
            text.includes('"value":"multiple"')
          ) {
            return "multiple";
          }
          if (
            text.includes("đặt cho 1 người") ||
            text.includes("1 người") ||
            text.includes("đặt 1 chỗ") ||
            text.includes("1 chỗ") ||
            text.includes("1 slot") ||
            text.includes("single") ||
            text.includes("1名様") ||
            text.includes("1枠予約") ||
            text.includes('"value":"single"')
          ) {
            return "single";
          }
          return null;
        })
        .find(Boolean) ||
      "single";

  const lastBotMessageIndex = messages.map((m) => m.role).lastIndexOf("bot");

  return (
    <>
      <div
        className="ez-widget-body"
        ref={listRef}
        onScroll={handleScroll}
        style={{
          backgroundColor: appearanceSettings?.backgroundColor || undefined,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            minHeight: "100%",
          }}
        >
          {hasMoreMessages && (
            <div className="ez-load-more-container">
              {isLoadingMoreMessages ? (
                <div className="ez-load-more-loading">
                  <LoadingOutlined
                    spin
                    style={{ fontSize: 12, marginRight: 6 }}
                  />
                  <span>Loading older messages...</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="ez-load-more-btn"
                  onClick={() => {
                    if (listRef.current) {
                      prevScrollHeightRef.current =
                        listRef.current.scrollHeight;
                      isPrependRef.current = true;
                    }
                    onLoadMore?.();
                  }}
                >
                  <DownOutlined
                    style={{
                      transform: "rotate(180deg)",
                      fontSize: 10,
                      marginRight: 5,
                    }}
                  />
                  <span>Load older messages</span>
                </button>
              )}
            </div>
          )}
          {messages.map((message, index) => {
            if (
              message.role === "bot" &&
              activeBookingSummary &&
              isBookingSummaryBubble(message.text)
            ) {
              return null;
            }

            const isFirstInGroup =
              index === 0 ||
              senderKey(messages[index - 1]) !== senderKey(message);
            const isLastInGroup =
              index === messages.length - 1 ||
              senderKey(messages[index + 1]) !== senderKey(message);
            const isLastBotMessage = index === lastBotMessageIndex;

            return (
              <ChatMessageItem
                key={message.id || index}
                message={message}
                index={index}
                isFirstInGroup={isFirstInGroup}
                isLastInGroup={isLastInGroup}
                isLastBotMessage={isLastBotMessage}
                isBotResponding={isBotResponding}
                isAgentTyping={isAgentTyping}
                status={status}
                appearanceSettings={appearanceSettings}
                cancelledBookingCodes={cancelledBookingCodes}
                messages={messages}
                onSendMessage={onSendMessage}
                onPreviewImage={(src) => setPreview([src], 0)}
                onRetryMessage={(msg) => onSendMessage?.(msg.text)}
              />
            );
          })}

          {isAgentTyping && (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                margin: "8px 0",
              }}
            >
              <Avatar
                size={36}
                icon={<CustomerServiceOutlined />}
                style={{ background: "#6366f1", color: "#fff", flexShrink: 0 }}
              />
              <div className="ez-widget-bubble ez-widget-typing">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}

          {isBotResponding &&
            !messages.some((m) => m.id.startsWith("ai-stream-")) && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  margin: "8px 0",
                }}
              >
                <Avatar
                  src={
                    appearanceSettings?.showAvatar !== false
                      ? appearanceSettings?.botAvatar
                      : undefined
                  }
                  icon={
                    appearanceSettings?.showAvatar !== false &&
                    appearanceSettings?.botAvatar ? undefined : (
                      <RobotOutlined />
                    )
                  }
                  size={36}
                  style={{
                    background:
                      appearanceSettings?.showAvatar !== false &&
                      appearanceSettings?.botAvatar
                        ? "transparent"
                        : "#06b6d4",
                    color: "#fff",
                    flexShrink: 0,
                    objectFit: "cover",
                  }}
                />
                <div className="ez-widget-bubble ez-widget-typing">
                  <span className="ez-widget-typing-text">
                    {appearanceSettings?.chatWindowTitle || "AI Assistant"} is
                    thinking...
                  </span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}

          {/* Booking Slots UI */}
          {shouldShowBookingSlots && (
            <InlineSlotPicker
              slots={bookingSlots || []}
              locale={latestBotLocale}
              bookingType={detectedBookingType}
              primaryColor={appearanceSettings?.primaryColor || undefined}
              disabled={isBotResponding || isAgentTyping}
              onSelectSlot={(slot, rId, rName) => {
                if (isBotResponding) return;
                if (onSendMessage) {
                  const t = i18n.getFixedT(latestBotLocale, "booking");
                  let text = t("slots.selected", { time: slot.timeSlot });
                  if (rName) text += ` ${rName}`;
                  onSendMessage(
                    `/select-booking-slot ${JSON.stringify({
                      date: slot.date,
                      timeSlot: slot.timeSlot,
                      slotCount: 1,
                      resourceId: rId ?? slot.resourceId,
                      language: latestBotLocale,
                    })} :: ${text}`,
                  );
                }
                setBookingSlots(null);
              }}
              onSelectMultipleSlots={(selectedSlots, rId, rName) => {
                if (isBotResponding) return;
                if (onSendMessage && selectedSlots.length > 0) {
                  const command = serializeSelectMultipleSlotsCommand({
                    selectedSlots,
                    fallbackResourceId: rId,
                    fallbackResourceName: rName,
                    slotDuration: bookingHours?.slotDuration,
                    isVi: latestBotLocale === "vi",
                  });
                  if (command) {
                    onSendMessage(command);
                  }
                }
                setBookingSlots(null);
              }}
              onCancel={() => {
                const locale = latestBotLocale || "en";
                const t = i18n.getFixedT(locale, "booking");
                onSendMessage?.(
                  `/abandon-booking ${JSON.stringify({ locale })} :: ${t("action.cancel")}`,
                );
                setBookingSlots(null);
              }}
            />
          )}

          {/* Booking Summary Card */}
          {activeBookingSummary && (
            <BookingSummaryCard
              payload={activeBookingSummary}
              primaryColor={appearanceSettings?.primaryColor || undefined}
              siteId={siteId}
              backendUrl={backendUrl}
              bookingServices={bookingServices}
              bookingResources={bookingResources}
              disabled={status === "CLOSED" || isBotResponding || isAgentTyping}
              onSave={(updatedDraft) => {
                if (isBotResponding) return;
                if (onSendMessage) {
                  const {
                    customerName,
                    customerEmail,
                    phone,
                    serviceId,
                    serviceIds,
                    serviceName,
                    serviceNames,
                    resourceId,
                    resourceName,
                    date,
                    timeSlot,
                    endTimeSlot,
                    slotCount,
                    slots,
                    previousSlot,
                    sessionId,
                  } = updatedDraft;
                  const cleanServiceId =
                    serviceId && serviceId.trim() ? serviceId : undefined;
                  const cleanServiceIds = Array.isArray(serviceIds)
                    ? (serviceIds as string[]).filter(
                        (id) => typeof id === "string" && id.trim().length > 0,
                      )
                    : undefined;
                  const cleanSlots = Array.isArray(slots)
                    ? slots.map((s) => ({
                        ...s,
                        serviceId:
                          s.serviceId && s.serviceId.trim()
                            ? s.serviceId
                            : undefined,
                      }))
                    : undefined;
                  const locale = activeBookingSummary.locale || "en";
                  const t = i18n.getFixedT(locale, "booking");
                  onSendMessage(
                    `/update-draft-booking ${JSON.stringify({
                      customerName,
                      customerEmail: customerEmail?.trim() || undefined,
                      phone,
                      serviceId: cleanServiceId,
                      serviceIds:
                        cleanServiceIds && cleanServiceIds.length > 0
                          ? cleanServiceIds
                          : undefined,
                      serviceName: serviceName || undefined,
                      serviceNames:
                        serviceNames && serviceNames.length > 0
                          ? serviceNames
                          : undefined,
                      resourceId,
                      resourceName,
                      date,
                      timeSlot,
                      endTimeSlot,
                      slotCount,
                      slots: cleanSlots,
                      previousSlot,
                      sessionId:
                        sessionId ||
                        (activeBookingSummary as { sessionId?: string })
                          ?.sessionId,
                      locale,
                    })} :: ${t("action.saveChanges")}`,
                  );
                  setBookingSummary(null);
                }
              }}
              onConfirm={() => {
                if (isBotResponding) return;
                if (onSendMessage) {
                  const {
                    customerName,
                    customerEmail,
                    phone,
                    serviceId,
                    serviceIds,
                    serviceName,
                    serviceNames,
                    slotCount,
                    slots,
                    resourceId,
                    resourceName,
                    date,
                    timeSlot,
                    endTimeSlot,
                    sessionId,
                  } = activeBookingSummary as typeof activeBookingSummary & {
                    sessionId?: string;
                    slots?: unknown;
                    serviceIds?: unknown;
                  };
                  let parsedSlots = slots;
                  if (typeof parsedSlots === "string") {
                    try {
                      parsedSlots = JSON.parse(parsedSlots);
                    } catch (_err) {
                      void _err;
                    }
                  }
                  let parsedServiceIds = serviceIds;
                  if (typeof parsedServiceIds === "string") {
                    try {
                      parsedServiceIds = JSON.parse(parsedServiceIds);
                    } catch (_err) {
                      void _err;
                    }
                  }
                  const cleanServiceId =
                    typeof serviceId === "string" && serviceId.trim()
                      ? serviceId
                      : undefined;
                  const cleanServiceIds = Array.isArray(parsedServiceIds)
                    ? (parsedServiceIds as string[]).filter(
                        (id) => typeof id === "string" && id.trim().length > 0,
                      )
                    : undefined;
                  const cleanSlots = Array.isArray(parsedSlots)
                    ? parsedSlots.map((s) => {
                        const slotObj = { ...(s as Record<string, unknown>) };
                        if (
                          typeof slotObj.serviceId === "string" &&
                          !slotObj.serviceId.trim()
                        ) {
                          delete slotObj.serviceId;
                        }
                        return slotObj;
                      })
                    : undefined;
                  const locale = activeBookingSummary.locale || "en";
                  const t = i18n.getFixedT(locale, "booking");
                  onSendMessage(
                    `/confirm-booking ${JSON.stringify({
                      customerName,
                      customerEmail: customerEmail?.trim() || undefined,
                      phone,
                      serviceId: cleanServiceId,
                      serviceIds:
                        cleanServiceIds && cleanServiceIds.length > 0
                          ? cleanServiceIds
                          : undefined,
                      serviceName: serviceName || undefined,
                      serviceNames:
                        serviceNames && serviceNames.length > 0
                          ? serviceNames
                          : undefined,
                      slotCount,
                      slots: cleanSlots,
                      resourceId,
                      resourceName,
                      date,
                      timeSlot,
                      endTimeSlot,
                      sessionId,
                      locale,
                    })} :: ${t("action.confirmBooking")}`,
                  );
                }
                setBookingSummary(null);
              }}
              onCancel={() => {
                const locale = activeBookingSummary.locale || "en";
                const t = i18n.getFixedT(locale, "booking");
                onSendMessage?.(
                  `/abandon-booking ${JSON.stringify({ locale })} :: ${t("action.cancel")}`,
                );
                setBookingSummary(null);
              }}
            />
          )}

          {/* Booking Cancellation Card */}
          {activeBookingCancellation && status !== "CLOSED" && (
            <BookingCancellationCard
              payload={activeBookingCancellation}
              disabled={isBotResponding || isAgentTyping}
              onKeep={() => {
                const t = i18n.getFixedT(
                  activeBookingCancellation.locale || "en",
                  "booking",
                );
                if (onSendMessage) {
                  onSendMessage(
                    `/keep-booking ${activeBookingCancellation.bookingCode} :: ${t("cancellation.keep")}`,
                  );
                }
                setBookingCancellation(null);
              }}
              onConfirm={() => {
                const code = activeBookingCancellation.bookingCode;
                if (onSendMessage) {
                  const t = i18n.getFixedT(
                    activeBookingCancellation.locale || "en",
                    "booking",
                  );
                  onSendMessage(
                    `/confirm-cancel-booking ${code} :: ${t("action.confirmCancellation")}`,
                  );
                }
                setBookingCancellation(null);
              }}
            />
          )}
        </div>
      </div>
      {unreadCount > 0 && !isUserAtBottom && isOpen && (
        <div
          className="ez-widget-scroll-down-btn"
          style={{
            backgroundColor: appearanceSettings?.primaryColor || undefined,
          }}
          onClick={() => {
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight;
            }
          }}
        >
          New message ({unreadCount}) <DownOutlined />
        </div>
      )}
    </>
  );
}
