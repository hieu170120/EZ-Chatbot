import React from "react";
import { Avatar } from "antd";
import {
  RobotOutlined,
  UserOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useVisitorChatStore,
  type AppearanceSettings,
  type BookingChipItem,
  type ChatMessage,
} from "../store";
import { BookingConfirmationCard } from "./booking/BookingConfirmationCard";
import { BookingChips } from "./booking/BookingChips";
import { InlinePhoneInput } from "./booking/InlinePhoneInput";
import { InlineSlotServiceAssigner } from "./booking/InlineSlotServiceAssigner";
import { MessageFeedback } from "./MessageFeedback";
import {
  chipOptions,
  extractSlotSelectionData,
  formatMessageTime,
  isAssignSlotServicesMessage,
  isPhoneQuestion,
  isTextInputChipMessage,
  isTimeChipMessage,
  visibleMessageText,
} from "../utils/chat-message.parser";
import i18n from "../i18n";

export interface ChatMessageItemProps {
  message: ChatMessage;
  index: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  isLastBotMessage: boolean;
  isBotResponding?: boolean;
  isAgentTyping?: boolean;
  status?: "OPEN" | "PAUSED" | "CLOSED";
  appearanceSettings?: AppearanceSettings | null;
  cancelledBookingCodes: string[];
  messages?: ChatMessage[];
  onSendMessage?: (text: string) => void;
  onPreviewImage?: (src: string) => void;
  onRetryMessage?: (message: ChatMessage) => void;
}

function getSenderInfo(
  role: string,
  senderName?: string | null,
  chatWindowTitle?: string | null,
): {
  icon: React.ReactNode;
  label: string;
  avatarColor: string;
} {
  if (role === "bot")
    return {
      icon: <RobotOutlined />,
      label: chatWindowTitle || "AI Assistant",
      avatarColor: "#06b6d4",
    };
  if (role === "agent")
    return {
      icon: <CustomerServiceOutlined />,
      label: senderName || "Support Agent",
      avatarColor: "#6366f1",
    };
  return { icon: <UserOutlined />, label: "You", avatarColor: "#e2e8f0" };
}

const renderMessageStatus = (status?: string) => {
  if (!status) return null;
  if (status === "queued")
    return (
      <span
        className="ez-widget-status"
        style={{ fontStyle: "italic", color: "#6b7280" }}
      >
        queued
      </span>
    );
  if (status === "SENT")
    return (
      <span
        className="ez-widget-status"
        style={{ fontStyle: "italic", color: "#6b7280" }}
      >
        sent
      </span>
    );
  if (status === "DELIVERED")
    return (
      <span
        className="ez-widget-status"
        style={{ fontStyle: "italic", color: "#6b7280" }}
      >
        delivered
      </span>
    );
  if (status === "READ")
    return (
      <span
        className="ez-widget-status"
        style={{ fontStyle: "italic", color: "#6b7280" }}
      >
        read
      </span>
    );
  return null;
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(
  function ChatMessageItem({
    message,
    isFirstInGroup,
    isLastInGroup,
    isLastBotMessage,
    isBotResponding,
    isAgentTyping,
    status,
    appearanceSettings,
    cancelledBookingCodes,
    messages = [],
    onSendMessage,
    onPreviewImage,
    onRetryMessage,
  }) {
    const industryTemplate = useVisitorChatStore(
      (state) => state.industryTemplate,
    );
    const isSalon = industryTemplate === "salon";
    const storeBookingType = useVisitorChatStore((state) => state.bookingType);
    const setBookingType = useVisitorChatStore((state) => state.setBookingType);
    const setPartySize = useVisitorChatStore((state) => state.setPartySize);
    const setBookingCancellation = useVisitorChatStore(
      (state) => state.setBookingCancellation,
    );
    const bookingServices = useVisitorChatStore(
      (state) => state.bookingServices,
    );
    const selectedBookingSlots = useVisitorChatStore(
      (state) => state.selectedBookingSlots,
    );
    const selectedBookingServiceIds = useVisitorChatStore(
      (state) => state.selectedBookingServiceIds,
    );

    const detectedBookingType: "single" | "multiple" = !isSalon
      ? "multiple"
      : storeBookingType || "single";

    if (message.role === "system") {
      return (
        <div style={{ textAlign: "center", margin: "8px 0" }}>
          <span
            style={{
              background: "#f3f4f6",
              borderRadius: 12,
              fontSize: 12,
              padding: "2px 12px",
              color: "#6b7280",
              border: "1px solid #e5e7eb",
              display: "inline-block",
            }}
          >
            {message.text}
          </span>
        </div>
      );
    }

    if (
      message.bookingSuccess &&
      typeof message.bookingSuccess.bookingCode === "string" &&
      message.bookingSuccess.bookingCode.trim() &&
      message.bookingSuccess.bookingCode !== "N/A"
    ) {
      return (
        <div className="ez-widget-message bot is-last">
          <Avatar
            size={36}
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
            style={{
              background:
                appearanceSettings?.showAvatar !== false &&
                appearanceSettings?.botAvatar
                  ? "transparent"
                  : "#06b6d4",
              color: "#fff",
              flexShrink: 0,
            }}
          />
          <div className="ez-widget-message-content">
            <BookingConfirmationCard
              result={message.bookingSuccess}
              cancelled={
                message.bookingSuccess.status === "cancelled" ||
                (Boolean(message.bookingSuccess.bookingCode) &&
                  cancelledBookingCodes.includes(
                    message.bookingSuccess.bookingCode,
                  ))
              }
              onCancel={
                message.bookingSuccess.bookingCode && status !== "CLOSED"
                  ? () => {
                      const code = message.bookingSuccess?.bookingCode;
                      if (code && onSendMessage) {
                        const locale = message.bookingSuccess?.locale || "en";
                        const t = i18n.getFixedT(locale, "booking");
                        onSendMessage(
                          `/cancel-booking ${code} :: ${t("action.cancelBooking")}`,
                        );
                      }
                    }
                  : undefined
              }
              primaryColor={appearanceSettings?.primaryColor || undefined}
            />
            <div className="ez-widget-time">
              {message.createdAt ? formatMessageTime(message.createdAt) : ""}
            </div>
          </div>
        </div>
      );
    }

    const isUser = message.role === "user";
    const sender = getSenderInfo(
      message.role,
      message.senderName,
      appearanceSettings?.chatWindowTitle,
    );
    const options = chipOptions(message.text);
    const structuredItems = message.components?.find(
      (component) => component.type === "chips",
    )?.items;
    const chipItems: BookingChipItem[] =
      structuredItems ??
      options.map((option) => {
        if (option.startsWith("/keep-booking:")) {
          const label = option.replace("/keep-booking:", "").trim();
          return {
            action: "keep_booking" as const,
            value: "/keep-booking",
            label,
          };
        }
        return {
          action: "submit_text" as const,
          value: option,
          label: option,
        };
      });
    const hasStructuredChips = Boolean(structuredItems?.length);

    return (
      <div
        className={`ez-widget-message ${message.role} ${
          isLastInGroup ? "is-last" : "is-stacked"
        }`}
      >
        {isLastInGroup ? (
          <Avatar
            size={36}
            src={
              message.role === "bot" && appearanceSettings?.showAvatar !== false
                ? appearanceSettings?.botAvatar
                : undefined
            }
            icon={
              message.role === "bot" && appearanceSettings?.botAvatar
                ? undefined
                : sender.icon
            }
            style={{
              background:
                message.role === "bot" && appearanceSettings?.botAvatar
                  ? "transparent"
                  : sender.avatarColor,
              color: isUser ? "#374151" : "#fff",
              flexShrink: 0,
            }}
          />
        ) : (
          <span className="ez-widget-avatar-spacer" aria-hidden="true" />
        )}
        <div className="ez-widget-message-content">
          {isFirstInGroup && sender.label && (
            <div className="ez-widget-sender-name">{sender.label}</div>
          )}
          <div
            className="ez-widget-bubble"
            style={{
              backgroundColor:
                isUser && appearanceSettings?.primaryColor
                  ? appearanceSettings.primaryColor
                  : undefined,
            }}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a({ ...props }) {
                  const isMailto = props.href?.startsWith("mailto:");
                  return (
                    <a
                      {...props}
                      target={isMailto ? undefined : "_blank"}
                      rel={isMailto ? undefined : "noopener noreferrer"}
                    />
                  );
                },
                table({ children }) {
                  return (
                    <div className="ez-widget-table-container">
                      <table className="ez-widget-table">{children}</table>
                    </div>
                  );
                },
                img({ ...props }) {
                  return (
                    <div style={{ marginTop: 8, marginBottom: 8 }}>
                      <img
                        src={props.src}
                        alt={props.alt}
                        style={{
                          maxWidth: "100%",
                          borderRadius: 8,
                          display: "block",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          if (props.src && onPreviewImage) {
                            onPreviewImage(props.src);
                          }
                        }}
                      />
                    </div>
                  );
                },
              }}
            >
              {visibleMessageText(message.text)
                .replace(/<chips>.*?<\/chips>/g, "")
                .trim()}
            </ReactMarkdown>

            {message.role === "bot" &&
              chipItems.length > 0 &&
              !isTextInputChipMessage(message.text) &&
              !isTimeChipMessage(message.text) &&
              !isAssignSlotServicesMessage(message.text) && (
                <BookingChips
                  items={chipItems}
                  locale={message.locale}
                  bookingType={detectedBookingType}
                  disabled={
                    status === "CLOSED" ||
                    !isLastBotMessage ||
                    Boolean(isBotResponding || isAgentTyping)
                  }
                  primaryColor={appearanceSettings?.primaryColor || undefined}
                  onCancel={() => {
                    if (!onSendMessage) return;
                    const locale = message.locale || "en";
                    const t = i18n.getFixedT(locale, "booking");
                    onSendMessage(
                      `/abandon-booking ${JSON.stringify({ locale })} :: ${t("action.cancel")}`,
                    );
                  }}
                  onSelect={(item) => {
                    const label = item.label || item.value || "";
                    const cancelMatch = label.match(
                      /cancel\s+booking\s*([a-z0-9]{8})/i,
                    );
                    const bookingCode =
                      item.action === "cancel_booking"
                        ? item.value
                        : cancelMatch?.[1];
                    const isKeepBooking =
                      item.action === "keep_booking" ||
                      /^\/keep-booking\b/i.test(item.value || "") ||
                      /^\/keep-booking\b/i.test(label) ||
                      /(?:thôi|không|đừng)\s*hủy/i.test(label) ||
                      /keep\s*booking/i.test(label);

                    if (isKeepBooking && onSendMessage) {
                      const displayLabel =
                        label.replace(/^\/keep-booking:?/i, "").trim() ||
                        "Không hủy nữa";
                      onSendMessage(`/keep-booking :: ${displayLabel}`);
                      setBookingCancellation(null);
                    } else if (bookingCode && onSendMessage) {
                      onSendMessage(
                        `/cancel-booking ${bookingCode} :: ${label}`,
                      );
                    } else if (hasStructuredChips && onSendMessage) {
                      if (item.action === "select_booking_type") {
                        setBookingType(
                          (item.value as "single" | "multiple") || "single",
                        );
                      } else if (item.action === "select_party_size") {
                        setPartySize(
                          item.value ? parseInt(item.value, 10) : null,
                        );
                      }
                      onSendMessage(
                        `/select-booking-option ${JSON.stringify({
                          action: item.action,
                          value: item.value,
                          label,
                          locale: message.locale || "en",
                        })} :: ${label}`,
                      );
                    } else if (onSendMessage) {
                      onSendMessage(
                        item.action === "select_date" && item.value
                          ? `${item.value.slice(8, 10)}/${item.value.slice(5, 7)}/${item.value.slice(0, 4)}`
                          : label,
                      );
                    }
                  }}
                />
              )}
          </div>

          {message.role === "bot" &&
            isAssignSlotServicesMessage(message.text) &&
            isLastBotMessage &&
            (() => {
              const extracted = extractSlotSelectionData(messages);
              const finalSlots =
                selectedBookingSlots && selectedBookingSlots.length > 0
                  ? selectedBookingSlots
                  : extracted.selectedSlots;
              const finalServiceIds =
                selectedBookingServiceIds &&
                selectedBookingServiceIds.length > 0
                  ? selectedBookingServiceIds
                  : extracted.selectedServiceIds;
              const assignedServiceItems = bookingServices.filter((s) =>
                finalServiceIds.includes(s.id),
              );
              return (
                <InlineSlotServiceAssigner
                  slots={finalSlots}
                  availableServices={bookingServices}
                  selectedServices={
                    assignedServiceItems.length > 0
                      ? assignedServiceItems
                      : bookingServices
                  }
                  locale={message.locale || "vi"}
                  primaryColor={appearanceSettings?.primaryColor || undefined}
                  disabled={
                    status === "CLOSED" ||
                    !isLastBotMessage ||
                    Boolean(isBotResponding || isAgentTyping)
                  }
                  onConfirm={(assignments) => {
                    if (!onSendMessage) return;
                    const textSummary = assignments
                      .map(
                        (a, i) =>
                          `Khung ${i + 1} (${a.timeSlot}): ${a.serviceName}`,
                      )
                      .join(", ");
                    onSendMessage(
                      `/assign-slot-services ${JSON.stringify({
                        assignments,
                        locale: message.locale || "vi",
                      })} :: Phân bổ dịch vụ: ${textSummary}`,
                    );
                  }}
                />
              );
            })()}

          {message.role === "bot" &&
            isPhoneQuestion(message.text) &&
            isLastBotMessage &&
            status !== "CLOSED" && (
              <div style={{ marginTop: 8 }}>
                <InlinePhoneInput
                  locale={message.locale}
                  disabled={
                    !isLastBotMessage ||
                    Boolean(isBotResponding || isAgentTyping)
                  }
                  primaryColor={appearanceSettings?.primaryColor || undefined}
                  onSend={(phone) => {
                    if (onSendMessage) onSendMessage(phone);
                  }}
                />
              </div>
            )}

          <div className="ez-widget-time">
            {message.createdAt ? formatMessageTime(message.createdAt) : ""}
            {renderMessageStatus(message.status)}
            {(String(message.status) === "error" ||
              String(message.status) === "FAILED") &&
              onRetryMessage && (
                <button
                  type="button"
                  className="ez-widget-retry-btn"
                  onClick={() => onRetryMessage(message)}
                >
                  Retry
                </button>
              )}
          </div>

          {message.role === "bot" && !message.id.startsWith("ai-stream-") && (
            <MessageFeedback
              messageId={message.id}
              feedbackRating={message.feedbackRating}
              isBotResponding={isBotResponding}
            />
          )}
        </div>
      </div>
    );
  },
);
