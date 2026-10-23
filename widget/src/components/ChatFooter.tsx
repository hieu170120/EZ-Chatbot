import { useState } from "react";
import { Button, Input, Upload, message } from "antd";
import {
  SendOutlined,
  PictureOutlined,
  LoadingOutlined,
  CloseCircleFilled,
  CheckCircleFilled,
  PlusOutlined,
} from "@ant-design/icons";
import { useVisitorChatStore } from "../store";
import type { HandlingStatus } from "../store";
import { useChatApiClient } from "../context/WidgetContext";
import { isDateQuestion, isPhoneQuestion } from "../utils/chat-message.parser";

type ChatFooterProps = {
  onSendMessage: (text: string) => void;
  onTyping: () => void;
  status: "OPEN" | "PAUSED" | "CLOSED";
  handlingStatus: HandlingStatus;
  isBotResponding: boolean;
  onResetConversation: () => void;
  isReconnecting?: boolean;
};

export function ChatFooter({
  onSendMessage,
  onTyping,
  status,
  handlingStatus,
  isBotResponding,
  onResetConversation,
  isReconnecting,
}: ChatFooterProps) {
  const apiClient = useChatApiClient();
  const conversationId = useVisitorChatStore((state) => state.conversationId);
  const visitorToken = useVisitorChatStore((state) => state.visitorToken);
  const [draft, setDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{ file: File; previewUrl: string }>
  >([]);
  const setPreview = useVisitorChatStore((state) => state.setPreview);

  const handleFileSelect = (file: File) => {
    setAttachments((prev) => [
      ...prev,
      { file, previewUrl: URL.createObjectURL(file) },
    ]);
    return false; // Prevent auto upload
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleFileSelect(file);
        }
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text && attachments.length === 0) return;

    let finalMessage = text;

    if (attachments.length > 0) {
      if (!conversationId) {
        message.error("No conversation");
        return;
      }

      setIsUploading(true);
      try {
        const uploadPromises = attachments.map(async ({ file }) => {
          const data = await apiClient.uploadAttachment(
            conversationId,
            file,
            visitorToken,
          );
          return `![image](${data.url})`;
        });

        const uploadedMarkdowns = await Promise.all(uploadPromises);
        const imagesText = uploadedMarkdowns.join("\n\n");
        finalMessage = text ? `${text}\n\n${imagesText}` : imagesText;
      } catch {
        message.error("Failed to upload image");
        setIsUploading(false);
        return;
      }
    }

    onSendMessage(finalMessage);
    setDraft("");
    attachments.forEach((a) => URL.revokeObjectURL(a.previewUrl));
    setAttachments([]);
    setIsUploading(false);
  };

  const appearanceSettings = useVisitorChatStore(
    (state) => state.appearanceSettings,
  );
  const messages = useVisitorChatStore((state) => state.messages);
  const activeBookingSlots = useVisitorChatStore(
    (state) => state.activeBookingSlots,
  );
  const activeBookingSummary = useVisitorChatStore(
    (state) => state.activeBookingSummary,
  );
  const activeBookingCancellation = useVisitorChatStore(
    (state) => state.activeBookingCancellation,
  );

  const lastMessage = messages[messages.length - 1];
  const isPhoneQuestionActive =
    lastMessage &&
    lastMessage.role === "bot" &&
    isPhoneQuestion(lastMessage.text);
  const isDateQuestionActive =
    lastMessage && lastMessage.role === "bot" && isDateQuestion(lastMessage);
  const bookingSlots = Array.isArray(activeBookingSlots)
    ? activeBookingSlots
    : activeBookingSlots?.slots;
  const isBookingCardActive = Boolean(
    activeBookingSummary ||
    activeBookingCancellation ||
    bookingSlots?.some((slot) => slot.available),
  );
  const isWaitingForAgent = handlingStatus === "WAITING_FOR_AGENT";
  const isPaused = status === "PAUSED";
  const isDisabled =
    status === "CLOSED" ||
    isPaused ||
    isBotResponding ||
    Boolean(isPhoneQuestionActive) ||
    Boolean(isDateQuestionActive) ||
    isBookingCardActive ||
    Boolean(isReconnecting);

  if (status === "CLOSED") {
    const primaryColor = appearanceSettings?.primaryColor || "#6366f1";
    return (
      <footer
        className="ez-widget-footer ez-closed-footer"
        style={{
          backgroundColor: appearanceSettings?.backgroundColor || undefined,
        }}
      >
        <div className="ez-closed-badge">
          <CheckCircleFilled
            className="ez-closed-badge-icon"
            style={{ color: "#10b981" }}
          />
          <span>This conversation has ended</span>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onResetConversation}
          className="ez-btn-new-chat"
          style={{
            backgroundColor: primaryColor,
            borderColor: primaryColor,
          }}
        >
          New Conversation
        </Button>
      </footer>
    );
  }

  const placeholder = isReconnecting
    ? "Connecting to server..."
    : isPaused
      ? "Conversation is paused..."
      : isBotResponding
        ? "Chatbot is replying..."
        : isBookingCardActive
          ? "Please complete the booking card above..."
          : isPhoneQuestionActive
            ? "Please enter phone number above 👆"
            : isDateQuestionActive
              ? "Please select a date above 👆"
              : isWaitingForAgent
                ? "Type a message to support..."
                : "Type a message...";

  return (
    <footer
      className="ez-widget-footer"
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "8px",
        background: appearanceSettings?.backgroundColor || "#ffffff",
      }}
    >
      {attachments.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "8px",
            marginLeft: "40px",
            flexWrap: "wrap",
          }}
        >
          {attachments.map((att, index) => (
            <div
              key={index}
              style={{ position: "relative", width: "60px", height: "60px" }}
            >
              <img
                src={att.previewUrl}
                style={{
                  width: 60,
                  height: 60,
                  objectFit: "cover",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                onClick={() =>
                  setPreview(
                    attachments.map((a) => a.previewUrl),
                    index,
                  )
                }
              />
              <CloseCircleFilled
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  color: "#ff4d4f",
                  cursor: "pointer",
                  fontSize: "16px",
                  background: "white",
                  borderRadius: "50%",
                }}
                onClick={() => removeAttachment(index)}
              />
            </div>
          ))}
        </div>
      )}
      <div
        className="ez-widget-composer"
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          width: "100%",
          background: "#ffffff",
          padding: "5px 8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.08)",
        }}
      >
        <Upload
          beforeUpload={handleFileSelect}
          showUploadList={false}
          accept="image/*"
          disabled={isDisabled || isUploading}
        >
          <Button
            type="text"
            icon={
              isUploading ? (
                <LoadingOutlined style={{ fontSize: "20px" }} />
              ) : (
                <PictureOutlined style={{ fontSize: "20px" }} />
              )
            }
            disabled={isDisabled || isUploading}
            style={{
              width: "36px",
              height: "36px",
              minWidth: "36px",
              padding: 0,
              color: appearanceSettings?.primaryColor || "#6b7280",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          />
        </Upload>
        <Input.TextArea
          className="ez-chat-input ez-chat-input-textarea"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          onPaste={handlePaste}
          placeholder={placeholder}
          autoSize={{ minRows: 1, maxRows: 5 }}
          bordered={false}
          variant="borderless"
          disabled={isDisabled || isUploading}
          style={{
            flex: 1,
            padding: "8px 4px",
            background: "transparent",
            boxShadow: "none",
            outline: "none",
            border: "none",
            resize: "none",
            fontSize: "14px",
            lineHeight: "20px",
          }}
        />
        <Button
          type="primary"
          shape="circle"
          icon={
            <SendOutlined
              style={{
                color: "#ffffff",
                fontSize: "16px",
                transform: "translateX(1px)",
              }}
            />
          }
          onClick={handleSend}
          aria-label="Send message"
          disabled={
            isDisabled ||
            (!draft.trim() && attachments.length === 0) ||
            isUploading
          }
          style={{
            backgroundColor: appearanceSettings?.primaryColor || "#1677ff",
            borderColor: appearanceSettings?.primaryColor || "#1677ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "36px",
            height: "36px",
            minWidth: "36px",
          }}
        />
      </div>
    </footer>
  );
}
